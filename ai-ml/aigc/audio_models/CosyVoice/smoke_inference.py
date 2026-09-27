"""GPU compatibility test against the same verified model weights; no production data."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import time

import numpy as np
import soundfile as sf
import torch

for module in ["lightning", "pytorch_lightning", "hydra", "modelscope", "onnx", "pyarrow", "gdown"]:
    if importlib.util.find_spec(module) is not None:
        raise RuntimeError(f"Unneeded package is present: {module}")
if not torch.cuda.is_available():
    raise RuntimeError("CUDA GPU unavailable")
torch.set_num_threads(2)
from cosyvoice.cli.cosyvoice import AutoModel

root = Path(os.environ.get("MODEL_DIR", "/models"))
manifest = json.loads((root/"manifest.json").read_text())
if manifest["revision"] != "29e01c4e8d000f4bcd70751be16fa94bf3d85a18":
    raise RuntimeError("Unexpected model revision")
for name, metadata in manifest["files"].items():
    digest = hashlib.sha256()
    with (root/name).open("rb") as handle:
        for block in iter(lambda: handle.read(1024*1024), b""):
            digest.update(block)
    if digest.hexdigest() != metadata["sha256"]:
        raise RuntimeError(f"Model checksum mismatch: {name}")
started = time.monotonic()
model = AutoModel(model_dir=str(root), load_trt=False, load_vllm=False, fp16=True)
if model.__class__.__name__ != "CosyVoice3":
    raise RuntimeError("Wrong model class")
providers = model.frontend.speech_tokenizer_session.get_providers()
if "CUDAExecutionProvider" not in providers:
    raise RuntimeError(f"ONNX CUDA provider not active: {providers}")
decoding = []
decode = model.model.llm.inference_wrapper


def measured_decode(lm_input, sampling, min_len, max_len, uuid):
    count = 0
    for token in decode(lm_input, sampling, min_len, max_len, uuid):
        count += 1
        yield token
    decoding.append({"tokens": count, "limit": max_len})


model.model.llm.inference_wrapper = measured_decode
loaded = time.monotonic()
prompt = "You are a helpful assistant.<|endofprompt|>希望你以后能够做的比我还好呦。"
with torch.inference_mode():
    chunks = [value["tts_speech"].cpu() for value in model.inference_zero_shot(
        "欢迎使用云端语音服务，这是安全更新后的测试。",
        prompt, "/app/source/asset/zero_shot_prompt.wav", stream=False, text_frontend=False)]
if not chunks:
    raise RuntimeError("No generated audio")
if not decoding or any(item["tokens"] >= item["limit"] for item in decoding):
    raise RuntimeError("Synthesis exhausted the token limit instead of reaching a stop token")
audio = torch.cat(chunks, dim=1).numpy().squeeze()
duration = len(audio)/model.sample_rate
if not np.isfinite(audio).all() or not 1 < duration < 30 or np.max(np.abs(audio)) < .001:
    raise RuntimeError("Invalid synthesized audio")
output = Path(os.environ.get("SMOKE_OUTPUT", "/tmp/smoke.wav"))
sf.write(output, audio, model.sample_rate, subtype="PCM_16")
print(json.dumps({"status": "PASS", "model": model.__class__.__name__, "torch": torch.__version__,
                  "gpu": torch.cuda.get_device_name(), "onnxProviders": providers,
                  "loadSeconds": loaded-started, "synthesisSeconds": time.monotonic()-loaded,
                  "audioSeconds": duration, "sampleRate": model.sample_rate,
                  "decoding": decoding}), flush=True)
