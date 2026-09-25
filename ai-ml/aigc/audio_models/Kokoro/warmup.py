"""Build-time warmup: download Kokoro weights + all voices + spaCy model, and smoke-test en/zh."""
import numpy as np
from huggingface_hub import snapshot_download
from kokoro import KPipeline

snapshot_download("hexgrad/Kokoro-82M", allow_patterns=["*.json", "*.pth", "voices/*.pt"])

for lang, voice, text in [
    ("a", "am_michael", "Hello, this is a build-time smoke test."),
    ("b", "bm_george", "Hello, this is a build-time smoke test."),
    ("z", "zm_yunjian", "你好，这是一次构建时的冒烟测试。"),
]:
    p = KPipeline(lang_code=lang, repo_id="hexgrad/Kokoro-82M")
    audio = np.concatenate([a for _, _, a in p(text, voice=voice)])
    assert len(audio) > 24000, f"{voice} produced too little audio"
    print("ok", voice, round(len(audio) / 24000, 1), "s", flush=True)
