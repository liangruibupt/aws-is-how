#!/usr/bin/env python3
"""Qwen-Image-2.1 test console: FastAPI server that owns one QwenImage21Pipeline on a GPU.

One pipeline instance handles all three modes the model offers:
  * text-to-image            (prompt only)
  * image editing / multi-reference composition (prompt + 1..10 reference images)
  * transparent RGBA output  (prompt wrapped in the official RGBA phrasing)

Generation is serialized through a single worker thread because the GPU can only run one job at a
time; the HTTP layer stays responsive and clients poll /api/jobs/{id}.

Env:
  QI_MODEL_PATH   default /opt/dlami/nvme/qwen_image/Qwen-Image-2.1
  QI_OUT_DIR      default /opt/dlami/nvme/qwen_image/outputs
  QI_UI_HOST/PORT default 0.0.0.0 / 7861
  CUDA_VISIBLE_DEVICES  set by run_server.sh to pin the GPU
"""
from __future__ import annotations

import io
import json
import os
import queue
import threading
import time
import traceback
import uuid
from pathlib import Path
from typing import List, Optional

import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image

MODEL_PATH = os.environ.get("QI_MODEL_PATH", "/opt/dlami/nvme/qwen_image/Qwen-Image-2.1")
OUT_DIR = Path(os.environ.get("QI_OUT_DIR", "/opt/dlami/nvme/qwen_image/outputs"))
OUT_DIR.mkdir(parents=True, exist_ok=True)
HERE = Path(__file__).resolve().parent

# Official recommended 2K canvases (README "Supported Aspect Ratios"). The 1K tier halves them;
# every edge stays a multiple of 16 (VAE stride) — all of these already are.
ASPECTS_2K = {
    "1:1": (2048, 2048), "4:3": (2400, 1792), "3:4": (1792, 2400),
    "3:2": (2528, 1696), "2:3": (1696, 2528), "16:9": (2752, 1536), "9:16": (1536, 2752),
}
RGBA_PREFIX = "This is an RGBA image with transparency. "
RGBA_SUFFIX = " The image has alpha channel and the background is transparent."
MAX_REFS = 10
MAX_UPLOAD = 50 * 1024 * 1024

app = FastAPI(title="Qwen-Image-2.1 console")
app.mount("/static", StaticFiles(directory=HERE / "static"), name="static")

# ---- model -------------------------------------------------------------------------------------
pipe = None
load_info: dict = {"status": "loading"}


def load_model():
    global pipe, load_info
    from diffusers import QwenImage21Pipeline
    t = time.time()
    p = QwenImage21Pipeline.from_pretrained(MODEL_PATH, dtype=torch.bfloat16).to("cuda")
    pipe = p
    load_info = {"status": "ready", "load_s": round(time.time() - t, 1),
                 "vram_gib": round(torch.cuda.memory_allocated() / 2**30, 1),
                 "gpu": torch.cuda.get_device_name(0), "model_path": MODEL_PATH}
    print("model ready", load_info, flush=True)


# ---- jobs --------------------------------------------------------------------------------------
jobs: dict[str, dict] = {}
jobs_lock = threading.Lock()
work_q: "queue.Queue[str]" = queue.Queue()


def job_file(job_id: str) -> Path:
    return OUT_DIR / f"{job_id}.json"


def persist(job: dict) -> None:
    # Strip in-memory-only fields before writing.
    slim = {k: v for k, v in job.items() if k not in ("_refs",)}
    job_file(job["job_id"]).write_text(json.dumps(slim, indent=2))


def worker():
    while True:
        job_id = work_q.get()
        with jobs_lock:
            job = jobs.get(job_id)
        if not job:
            continue
        job["status"] = "running"
        job["started_at"] = time.time()
        try:
            run_job(job)
            job["status"] = "completed"
        except Exception as e:  # noqa: BLE001
            job["status"] = "failed"
            job["error"] = f"{type(e).__name__}: {e}"
            traceback.print_exc()
            if "out of memory" in str(e).lower():
                torch.cuda.empty_cache()
        finally:
            job["finished_at"] = time.time()
            job["wall_s"] = round(job["finished_at"] - job["submitted_at"], 2)
            job["gen_s"] = round(job["finished_at"] - job["started_at"], 2)
            job.pop("_refs", None)
            persist(job)
            work_q.task_done()


@torch.inference_mode()
def run_job(job: dict):
    p = job["params"]
    kwargs = dict(
        prompt=job["prompt_final"],
        num_inference_steps=p["steps"],
        true_cfg_scale=p["true_cfg_scale"],
        num_images_per_prompt=p["num_images"],
        generator=torch.Generator("cuda").manual_seed(p["seed"]),
    )
    if p.get("negative_prompt"):
        kwargs["negative_prompt"] = p["negative_prompt"]
    if p.get("width") and p.get("height"):
        kwargs["width"], kwargs["height"] = p["width"], p["height"]
    refs = job.get("_refs") or []
    if refs:
        kwargs["image"] = refs if len(refs) > 1 else refs[0]

    torch.cuda.reset_peak_memory_stats()
    out = pipe(**kwargs).images
    job["peak_vram_gib"] = round(torch.cuda.max_memory_allocated() / 2**30, 1)
    names = []
    for i, im in enumerate(out):
        # The VAE is RGBA-native so every output arrives as RGBA. Keep alpha only when the user
        # asked for transparency; otherwise flatten so downloads are ordinary opaque PNGs.
        if not p["transparent"] and im.mode == "RGBA":
            im = im.convert("RGB")
        name = f"{job['job_id']}_{i}.png"
        im.save(OUT_DIR / name, optimize=False)
        names.append(name)
        if i == 0:
            job["size"] = list(im.size)
            job["mode"] = im.mode
    job["images"] = names


# ---- helpers -----------------------------------------------------------------------------------
async def read_image(f: UploadFile) -> Image.Image:
    raw = await f.read()
    if len(raw) > MAX_UPLOAD:
        raise HTTPException(413, f"{f.filename}: larger than {MAX_UPLOAD // 2**20} MB")
    try:
        im = Image.open(io.BytesIO(raw))
        im.load()
    except Exception as e:  # noqa: BLE001
        raise HTTPException(400, f"{f.filename}: not a decodable image ({e})") from e
    # Keep alpha if present (the model can edit transparent layers); otherwise RGB.
    return im.convert("RGBA") if "A" in im.getbands() else im.convert("RGB")


def resolve_size(aspect: str, tier: str, width: Optional[int], height: Optional[int]):
    """Explicit width/height wins; else aspect preset at the chosen tier; 'auto' -> None (follow ref)."""
    if width and height:
        if width % 16 or height % 16:
            raise HTTPException(400, "width and height must be multiples of 16")
        return width, height
    if aspect == "auto":
        return None, None
    if aspect not in ASPECTS_2K:
        raise HTTPException(400, f"aspect must be one of {list(ASPECTS_2K)} or 'auto'")
    w, h = ASPECTS_2K[aspect]
    if tier == "1k":
        w, h = w // 2, h // 2
    return w, h


# ---- routes ------------------------------------------------------------------------------------
@app.on_event("startup")
def _startup():
    threading.Thread(target=worker, daemon=True, name="gpu-worker").start()
    threading.Thread(target=load_model, daemon=True, name="model-loader").start()


@app.get("/", response_class=HTMLResponse)
async def index():
    return (HERE / "static" / "index.html").read_text()


@app.get("/api/health")
async def health():
    return {**load_info, "queue": work_q.qsize(),
            "running": sum(1 for j in jobs.values() if j["status"] == "running"),
            "aspects": ASPECTS_2K}


@app.post("/api/generate")
async def generate(
    prompt: str = Form(...),
    negative_prompt: str = Form(""),
    transparent: bool = Form(False),
    aspect: str = Form("1:1"),
    tier: str = Form("1k"),
    width: Optional[int] = Form(None),
    height: Optional[int] = Form(None),
    steps: int = Form(40),
    seed: int = Form(-1),
    true_cfg_scale: float = Form(1.0),
    num_images: int = Form(1),
    ref_images: List[UploadFile] = File([]),
):
    if load_info.get("status") != "ready":
        raise HTTPException(503, "model still loading")
    if not 1 <= steps <= 100:
        raise HTTPException(400, "steps must be 1..100")
    if not 1 <= num_images <= 4:
        raise HTTPException(400, "num_images must be 1..4")
    refs = [await read_image(f) for f in ref_images if f and f.filename]
    if len(refs) > MAX_REFS:
        raise HTTPException(400, f"at most {MAX_REFS} reference images")
    if seed < 0:
        seed = int.from_bytes(os.urandom(4), "big") % 2_000_000_000
    w, h = resolve_size(aspect, tier, width, height)
    if not refs and w is None:
        w, h = resolve_size("1:1", tier, None, None)  # t2i needs a canvas

    prompt = prompt.strip()
    prompt_final = prompt
    if transparent and not prompt.lower().startswith("this is an rgba image"):
        prompt_final = RGBA_PREFIX + prompt.rstrip(".") + "." + RGBA_SUFFIX

    job = {
        "job_id": uuid.uuid4().hex[:12],
        "mode": "edit" if refs else "t2i",
        "prompt": prompt, "prompt_final": prompt_final,
        "params": {"negative_prompt": negative_prompt.strip(), "transparent": transparent,
                   "aspect": aspect, "tier": tier, "width": w, "height": h, "steps": steps,
                   "seed": seed, "true_cfg_scale": true_cfg_scale, "num_images": num_images,
                   "num_refs": len(refs)},
        "submitted_at": time.time(), "status": "queued", "_refs": refs,
    }
    with jobs_lock:
        jobs[job["job_id"]] = job
    persist(job)
    work_q.put(job["job_id"])
    return {k: v for k, v in job.items() if k != "_refs"}


@app.get("/api/jobs/{job_id}")
async def job_status(job_id: str):
    job = jobs.get(job_id)
    if job is None:
        p = job_file(job_id)
        if not p.exists():
            raise HTTPException(404, "unknown job")
        return json.loads(p.read_text())
    out = {k: v for k, v in job.items() if k != "_refs"}
    if job["status"] in ("queued", "running"):
        out["elapsed"] = round(time.time() - job["submitted_at"], 1)
        out["queue_position"] = sum(1 for j in jobs.values()
                                    if j["status"] == "queued" and j["submitted_at"] < job["submitted_at"])
    return out


@app.get("/api/images/{name}")
async def image_file(name: str):
    if "/" in name or ".." in name or not name.endswith(".png"):
        raise HTTPException(400, "bad name")
    p = OUT_DIR / name
    if not p.exists():
        raise HTTPException(404)
    return FileResponse(p, media_type="image/png")


@app.get("/api/history")
async def history(limit: int = 40):
    out = []
    for p in sorted(OUT_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)[:limit]:
        try:
            out.append(json.loads(p.read_text()))
        except Exception:  # noqa: BLE001
            continue
    return out


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host=os.environ.get("QI_UI_HOST", "0.0.0.0"),
                port=int(os.environ.get("QI_UI_PORT", "7861")), log_level="info")
