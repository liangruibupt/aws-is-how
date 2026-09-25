#!/usr/bin/env python3
"""MiniMax-H3 test console: a thin web UI over the sglang /v1/videos API.

Runs on the g7e box next to the sglang servers. It
  * accepts a prompt + optional condition files (first/last frame image, reference image /
    video / audio) from the browser,
  * turns files into `data:` URIs (the wire form the server accepts from a remote client),
  * routes by task to the right partition (t2va/fl2va -> FL2VA server, ref2va -> Ref2VA server),
  * exposes job status for polling and streams the finished mp4 (video + audio) back,
  * lists previously generated clips from the server's --output-path directory.

Env:
  H3_FL2VA_URL   default http://127.0.0.1:30010   (serves t2va + fl2va)
  H3_REF2VA_URL  default http://127.0.0.1:30030   (serves ref2va)
  H3_VIDEO_DIR   default /opt/dlami/nvme/out/videos  (where sglang persists mp4s)
  H3_JOB_DIR     default /opt/dlami/nvme/out/webui_jobs (request metadata for the gallery)
"""
from __future__ import annotations

import base64
import json
import os
import time
import uuid
from pathlib import Path
from typing import Optional

import httpx
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

FL2VA_URL = os.environ.get("H3_FL2VA_URL", "http://127.0.0.1:30010").rstrip("/")
REF2VA_URL = os.environ.get("H3_REF2VA_URL", "http://127.0.0.1:30030").rstrip("/")
VIDEO_DIR = Path(os.environ.get("H3_VIDEO_DIR", "/opt/dlami/nvme/out/videos"))
JOB_DIR = Path(os.environ.get("H3_JOB_DIR", "/opt/dlami/nvme/out/webui_jobs"))
JOB_DIR.mkdir(parents=True, exist_ok=True)

HERE = Path(__file__).resolve().parent
app = FastAPI(title="MiniMax-H3 console")
app.mount("/static", StaticFiles(directory=HERE / "static"), name="static")

# One long-lived client; generation takes minutes, so no read timeout on the polling side.
client = httpx.AsyncClient(timeout=httpx.Timeout(30.0, read=120.0))

MEDIA_TYPES = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
               ".webp": "image/webp", ".mp4": "video/mp4", ".mov": "video/quicktime",
               ".wav": "audio/wav", ".mp3": "audio/mpeg", ".flac": "audio/flac"}
MAX_UPLOAD = 200 * 1024 * 1024  # 200 MB per condition file


def base_for(task: str) -> str:
    return REF2VA_URL if task == "ref2va" else FL2VA_URL


async def to_data_uri(f: Optional[UploadFile]) -> Optional[str]:
    if f is None or not f.filename:
        return None
    raw = await f.read()
    if len(raw) > MAX_UPLOAD:
        raise HTTPException(413, f"{f.filename}: file larger than {MAX_UPLOAD // 2**20} MB")
    ext = os.path.splitext(f.filename)[1].lower()
    media = f.content_type or MEDIA_TYPES.get(ext, "application/octet-stream")
    return f"data:{media};base64,{base64.b64encode(raw).decode('ascii')}"


def job_path(job_id: str) -> Path:
    return JOB_DIR / f"{job_id}.json"


def save_job(job: dict) -> None:
    job_path(job["job_id"]).write_text(json.dumps(job, indent=2))


def load_job(job_id: str) -> dict:
    p = job_path(job_id)
    if not p.exists():
        raise HTTPException(404, "unknown job")
    return json.loads(p.read_text())


@app.get("/", response_class=HTMLResponse)
async def index():
    return (HERE / "static" / "index.html").read_text()


@app.get("/api/health")
async def health():
    """Which partitions are up. The UI greys out tabs whose server is down."""
    out = {}
    for name, url in (("fl2va", FL2VA_URL), ("ref2va", REF2VA_URL)):
        try:
            r = await client.get(f"{url}/health", timeout=3.0)
            out[name] = {"ok": r.status_code == 200, "url": url}
        except Exception as e:  # noqa: BLE001
            out[name] = {"ok": False, "url": url, "error": type(e).__name__}
    return out


@app.post("/api/generate")
async def generate(
    task: str = Form(...),
    prompt: str = Form(""),
    short_edge: int = Form(480),
    aspect_ratio: str = Form("16:9"),
    duration: float = Form(5.0),
    steps: int = Form(20),
    seed: int = Form(-1),
    flow_shift: float = Form(12.0),
    audio_flow_shift: float = Form(3.0),
    first_image: Optional[UploadFile] = File(None),
    last_image: Optional[UploadFile] = File(None),
    ref_image: Optional[UploadFile] = File(None),
    ref_video: Optional[UploadFile] = File(None),
    ref_audio: Optional[UploadFile] = File(None),
):
    if task not in ("t2va", "fl2va", "ref2va"):
        raise HTTPException(400, "task must be t2va | fl2va | ref2va")
    if not 4.0 <= duration <= 15.0:
        raise HTTPException(400, "duration must be 4..15 s")
    if seed < 0:
        seed = int.from_bytes(os.urandom(4), "big") % 2_000_000_000

    # Build the conditions list exactly the way h3gen.py does (order matters for fl2va).
    conds: list[dict] = []
    derive_duration = False
    if task == "fl2va":
        first = await to_data_uri(first_image)
        last = await to_data_uri(last_image)
        if not (first or last):
            raise HTTPException(400, "fl2va needs a first-frame and/or last-frame image")
        if first:
            conds.append({"type": "image", "role": "keyframe", "uri": first, "frame_index": 0})
        if last:
            conds.append({"type": "image", "role": "keyframe", "uri": last, "frame_index": -1})
    elif task == "ref2va":
        img = await to_data_uri(ref_image)
        vid = await to_data_uri(ref_video)
        aud = await to_data_uri(ref_audio)
        if img:
            conds.append({"type": "image", "role": "reference", "uri": img})
        if vid:
            conds.append({"type": "video", "role": "reference", "uri": vid})
        if aud:
            conds.append({"type": "audio", "role": "reference", "uri": aud})
        if not conds:
            raise HTTPException(400, "ref2va needs a reference image, video or audio")
        # With a video/audio reference and no image, the server derives duration from the reference.
        derive_duration = bool(vid or aud) and not img

    target: dict = {"short_edge": short_edge, "aspect_ratio": aspect_ratio}
    if not derive_duration:
        target["duration_seconds"] = duration

    payload = {
        "model": "MiniMax-H3",
        "prompt": prompt,
        "task": task,
        "conditions": conds,
        "target": target,
        "num_outputs_per_prompt": 1,
        "num_inference_steps": steps,
        "flow_shift": flow_shift,
        "audio_flow_shift": audio_flow_shift,
        "seed": seed,
    }
    if not derive_duration:
        payload["seconds"] = int(duration)

    base = base_for(task)
    try:
        r = await client.post(f"{base}/v1/videos", json=payload)
    except httpx.HTTPError as e:
        raise HTTPException(502, f"server for {task} unreachable at {base}: {e}") from e
    if r.status_code >= 400:
        raise HTTPException(r.status_code, r.text[:2000])
    vid_id = r.json()["id"]

    job = {
        "job_id": uuid.uuid4().hex[:12],
        "video_id": vid_id,
        "task": task,
        "prompt": prompt,
        "params": {"short_edge": short_edge, "aspect_ratio": aspect_ratio, "duration": duration,
                   "steps": steps, "seed": seed, "flow_shift": flow_shift,
                   "audio_flow_shift": audio_flow_shift,
                   "conditions": [{k: v for k, v in c.items() if k != "uri"} for c in conds]},
        "submitted_at": time.time(),
        "status": "queued",
    }
    save_job(job)
    return job


@app.get("/api/jobs/{job_id}")
async def job_status(job_id: str):
    job = load_job(job_id)
    if job["status"] in ("completed", "failed"):
        return job
    base = base_for(job["task"])
    try:
        r = await client.get(f"{base}/v1/videos/{job['video_id']}")
        st = r.json()
    except Exception as e:  # noqa: BLE001
        return {**job, "status": "unknown", "error": f"status poll failed: {e}"}
    status = st.get("status", "unknown")
    job["status"] = status
    job["elapsed"] = time.time() - job["submitted_at"]
    if status == "completed":
        job["completed_at"] = time.time()
        job["wall_s"] = job["completed_at"] - job["submitted_at"]
        # The server reports its own inference time when it has one; keep whatever it gives us.
        for k in ("inference_time_s", "inference_time", "metrics"):
            if k in st:
                job[k] = st[k]
        save_job(job)
    elif status == "failed":
        job["error"] = st.get("error") or st
        save_job(job)
    return job


@app.get("/api/jobs/{job_id}/video")
async def job_video(job_id: str):
    """Stream the mp4 from the sglang server (video+audio muxed)."""
    job = load_job(job_id)
    base = base_for(job["task"])
    url = f"{base}/v1/videos/{job['video_id']}/content"
    req = client.build_request("GET", url)
    resp = await client.send(req, stream=True)
    if resp.status_code >= 400:
        await resp.aclose()
        raise HTTPException(resp.status_code, "video not available")
    headers = {"Content-Disposition": f'inline; filename="h3_{job["task"]}_{job_id}.mp4"'}
    if "content-length" in resp.headers:
        headers["Content-Length"] = resp.headers["content-length"]
    return StreamingResponse(resp.aiter_bytes(), media_type="video/mp4", headers=headers,
                             background=None)


@app.get("/api/history")
async def history(limit: int = 30):
    jobs = []
    for p in sorted(JOB_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)[:limit]:
        try:
            jobs.append(json.loads(p.read_text()))
        except Exception:  # noqa: BLE001
            continue
    return jobs


@app.get("/api/files")
async def files(limit: int = 50):
    """Raw mp4s the server persisted, for anything generated outside this UI (e.g. h3gen.py)."""
    if not VIDEO_DIR.exists():
        return []
    out = []
    for p in sorted(VIDEO_DIR.glob("*.mp4"), key=lambda p: p.stat().st_mtime, reverse=True)[:limit]:
        out.append({"name": p.name, "size": p.stat().st_size, "mtime": p.stat().st_mtime})
    return out


@app.get("/api/files/{name}")
async def file_content(name: str):
    if "/" in name or ".." in name or not name.endswith(".mp4"):
        raise HTTPException(400, "bad name")
    p = VIDEO_DIR / name
    if not p.exists():
        raise HTTPException(404)
    return FileResponse(p, media_type="video/mp4")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host=os.environ.get("H3_UI_HOST", "0.0.0.0"),
                port=int(os.environ.get("H3_UI_PORT", "7860")), log_level="info")
