"""Single-user, authenticated asynchronous CosyVoice API behind private ALB."""
from contextlib import asynccontextmanager, contextmanager
import hashlib
import json
import logging
import os
from pathlib import Path
import queue
import secrets
import sqlite3
import subprocess
import threading
import time
import uuid

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

DATA = Path(os.environ.get("DATA_DIR", "/data"))
TOKEN = os.environ.get("API_TOKEN", "")
MAX_BODY = 10*1024*1024
JOBS = queue.Queue(maxsize=10)
MODEL = None
READY = False
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("cosyvoice-api")


@contextmanager
def database():
    db = sqlite3.connect(DATA/"jobs.sqlite", timeout=30)
    db.row_factory = sqlite3.Row
    try:
        with db:
            yield db
    finally:
        db.close()


def update_job(job_id, state, **fields):
    with database() as db:
        db.execute("UPDATE jobs SET state=?, detail=? WHERE id=?",
                   (state, json.dumps(fields), job_id))


def process_job(job_id, text, voice_id, speed, output_format):
    import soundfile as sf
    import torch

    reference = json.loads((DATA/"voices"/f"{voice_id}.json").read_text())
    started = time.monotonic()
    update_job(job_id, "running")
    prompt = "You are a helpful assistant.<|endofprompt|>"+reference["transcript"]
    with torch.inference_mode():
        chunks = [item["tts_speech"].detach().cpu() for item in MODEL.inference_zero_shot(
            text, prompt, str(DATA/"voices"/f"{voice_id}.wav"),
            stream=False, speed=speed, text_frontend=False)]
    if not chunks:
        raise RuntimeError("No audio returned")
    audio = torch.cat(chunks, dim=1).squeeze(0)
    if not torch.isfinite(audio).all() or audio.abs().max() < .001:
        raise RuntimeError("Invalid or silent audio")
    output = DATA/"audio"/f"{job_id}.wav"
    sf.write(output, audio.numpy(), MODEL.sample_rate, subtype="PCM_16")
    if output_format == "mp3":
        target = output.with_suffix(".mp3")
        subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error",
                        "-i", str(output), "-codec:a", "libmp3lame", "-b:a", "192k", str(target)],
                       check=True, timeout=120)
        output.unlink()
        output = target
    seconds = round(time.monotonic()-started, 3)
    update_job(job_id, "completed", file=output.name, seconds=seconds,
               duration=audio.numel()/MODEL.sample_rate, sample_rate=MODEL.sample_rate,
               sha256=hashlib.sha256(output.read_bytes()).hexdigest())
    log.info("Job %s completed in %.3fs", job_id, seconds)


def worker():
    while True:
        item = JOBS.get()
        try:
            process_job(*item)
        except Exception as error:
            log.exception("Job %s failed", item[0])
            update_job(item[0], "failed", error=type(error).__name__)
        finally:
            JOBS.task_done()


def cleanup():
    while True:
        time.sleep(600)
        cutoff = time.time()-86400
        with database() as db:
            rows = db.execute("SELECT id,detail FROM jobs WHERE created<? AND state IN ('completed','failed')",
                              (cutoff,)).fetchall()
            for row in rows:
                detail = json.loads(row["detail"])
                if "file" in detail:
                    (DATA/"audio"/detail["file"]).unlink(missing_ok=True)
                db.execute("UPDATE jobs SET state='expired',detail='{}' WHERE id=?", (row["id"],))


@asynccontextmanager
async def lifespan(app):
    global MODEL, READY
    if len(TOKEN) < 32:
        raise RuntimeError("API_TOKEN must be configured")
    import shutil
    import torch
    from cosyvoice.cli.cosyvoice import AutoModel

    torch.set_num_threads(2)
    if not torch.cuda.is_available():
        raise RuntimeError("CUDA GPU required for this deployment")
    for directory in [DATA/"voices", DATA/"audio"]:
        directory.mkdir(parents=True, exist_ok=True)
    with database() as db:
        db.execute("CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,state TEXT,created REAL,detail TEXT)")
        db.execute("UPDATE jobs SET state='failed',detail=? WHERE state IN ('queued','running')",
                   (json.dumps({"error": "Service restarted; resubmit job"}),))
    reference = DATA/"voices/upstream-demo.wav"
    if not reference.exists():
        shutil.copyfile("/app/source/asset/zero_shot_prompt.wav", reference)
        (DATA/"voices/upstream-demo.json").write_text(json.dumps({
            "name": "Official upstream installation demo", "transcript": "希望你以后能够做的比我还好呦。",
            "note": "Not a selected or commercially cleared male voice"}, ensure_ascii=False))
    MODEL = AutoModel(model_dir=os.environ["MODEL_DIR"], load_trt=False, load_vllm=False, fp16=True)
    assert MODEL.__class__.__name__ == "CosyVoice3"
    # Upstream logs synthesis text at INFO; do not retain narration in server logs.
    logging.getLogger().setLevel(logging.WARNING)
    log.setLevel(logging.INFO)
    threading.Thread(target=worker, daemon=True).start()
    threading.Thread(target=cleanup, daemon=True).start()
    READY = True
    log.info("CosyVoice3 ready on %s", torch.cuda.get_device_name())
    yield
    READY = False


app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)


@app.middleware("http")
async def guard(request: Request, call_next):
    if request.url.path != "/healthz":
        authorization = request.headers.get("authorization", "")
        if not secrets.compare_digest(authorization, "Bearer "+TOKEN):
            return JSONResponse({"error": "Unauthorized"}, status_code=401,
                                headers={"Cache-Control": "no-store"})
    if request.method == "POST":
        try:
            length = int(request.headers.get("content-length", "-1"))
        except ValueError:
            length = -1
        if length < 0:
            return JSONResponse({"error": "Content-Length required"}, status_code=411)
        if length > MAX_BODY:
            return JSONResponse({"error": "Request too large"}, status_code=413)
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.get("/healthz")
def health():
    return JSONResponse({"status": "ready" if READY else "loading"}, status_code=200 if READY else 503)


@app.get("/v1/voices")
def voices():
    return {"voices": [{"id": path.stem, "name": json.loads(path.read_text())["name"]}
                       for path in sorted((DATA/"voices").glob("*.json"))]}


class SynthesisRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1000)
    voice: str = Field(default="upstream-demo", pattern=r"^[a-zA-Z0-9_-]{1,64}$")
    speed: float = Field(default=1.0, ge=.75, le=1.25)
    format: str = Field(default="wav", pattern=r"^(wav|mp3)$")


@app.post("/v1/jobs", status_code=202)
def create_job(body: SynthesisRequest):
    if not (DATA/"voices"/f"{body.voice}.json").is_file():
        raise HTTPException(404, "Unknown voice")
    job_id = uuid.uuid4().hex
    with database() as db:
        db.execute("INSERT INTO jobs VALUES(?,?,?,?)", (job_id, "queued", time.time(), "{}"))
    try:
        JOBS.put_nowait((job_id, body.text, body.voice, body.speed, body.format))
    except queue.Full:
        update_job(job_id, "failed", error="Queue full")
        raise HTTPException(429, "Queue full; retry later")
    return {"id": job_id, "status": "queued"}


def get_job(job_id):
    with database() as db:
        row = db.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
    if row is None:
        raise HTTPException(404, "Job not found")
    return dict(row)


@app.get("/v1/jobs/{job_id}")
def job_status(job_id: str):
    row = get_job(job_id)
    detail = json.loads(row["detail"])
    detail.pop("file", None)
    return {"id": row["id"], "status": row["state"], **detail}


@app.get("/v1/jobs/{job_id}/audio")
def job_audio(job_id: str):
    row = get_job(job_id)
    if row["state"] != "completed":
        raise HTTPException(409, "Audio not available")
    path = DATA/"audio"/json.loads(row["detail"])["file"]
    if not path.exists():
        raise HTTPException(410, "Audio expired")
    return FileResponse(path, media_type="audio/wav" if path.suffix == ".wav" else "audio/mpeg",
                        filename=path.name)


@app.post("/v1/voices", status_code=201)
async def upload_voice(name: str = Form(..., max_length=80),
                       transcript: str = Form(..., min_length=1, max_length=1000),
                       rights_confirmed: bool = Form(...), audio: UploadFile = File(...)):
    if not rights_confirmed:
        raise HTTPException(400, "Permission to use the reference voice is required")
    raw = await audio.read(8*1024*1024+1)
    if len(raw) > 8*1024*1024:
        raise HTTPException(413, "Reference audio exceeds 8 MiB")
    import io
    import numpy as np
    import soundfile as sf
    try:
        samples, rate = sf.read(io.BytesIO(raw), dtype="float32", always_2d=True)
        duration = len(samples)/rate
        if not 3 <= duration <= 30 or rate < 16000 or not np.isfinite(samples).all():
            raise ValueError("Invalid reference")
    except Exception:
        raise HTTPException(400, "Use clean 3-30 second audio at 16 kHz or higher") from None
    voice_id = uuid.uuid4().hex
    sf.write(DATA/"voices"/f"{voice_id}.wav", samples.mean(axis=1), rate, subtype="PCM_16")
    (DATA/"voices"/f"{voice_id}.json").write_text(json.dumps(
        {"name": name, "transcript": transcript, "rights_confirmed": True}, ensure_ascii=False))
    return {"id": voice_id, "name": name, "duration": duration}
