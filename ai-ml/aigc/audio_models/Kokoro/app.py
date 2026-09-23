"""Kokoro TTS on Lambda (SnapStart-ready).

Event:
{
  "text": "...",                 # required (or "text_s3_uri": "s3://bucket/key.txt")
  "voice": "zm_yunjian",         # default zm_yunjian; lang inferred from first letter (a/b/z)
  "speed": 1.0,                  # optional
  "format": "wav" | "mp3",       # default wav
  "output_key": "tts-out/x.wav"  # optional; default tts-out/<voice>-<timestamp>.<fmt>
}
Returns: {"s3_uri": ..., "presigned_url": ..., "duration_sec": ..., "synth_sec": ...}
"""
import os
import re
import subprocess
import time

import boto3
import numpy as np
import soundfile as sf
from kokoro import KModel, KPipeline

BUCKET = os.environ["OUTPUT_BUCKET"]
PREFIX = os.environ.get("OUTPUT_PREFIX", "tts-out/")
SR = 24000
REPO = "hexgrad/Kokoro-82M"

# --- Init phase (captured in the SnapStart snapshot) -------------------------
# One shared model, three language pipelines (US English, UK English, Chinese).
_model = KModel(repo_id=REPO).eval()
_pipelines = {lang: KPipeline(lang_code=lang, repo_id=REPO, model=_model) for lang in ("a", "b", "z")}
# Warm the g2p front-ends (jieba dict load, spaCy model) so it is also in the snapshot.
for _lang, _voice, _text in (("a", "am_michael", "warm up"), ("b", "bm_george", "warm up"), ("z", "zm_yunjian", "预热")):
    for _ in _pipelines[_lang](_text, voice=_voice):
        pass
# -----------------------------------------------------------------------------


def _read_text(s3, event):
    if event.get("text"):
        return event["text"]
    uri = event.get("text_s3_uri")
    if not uri:
        raise ValueError("Provide 'text' or 'text_s3_uri'")
    m = re.match(r"s3://([^/]+)/(.+)", uri)
    if not m:
        raise ValueError("Bad text_s3_uri")
    return s3.get_object(Bucket=m.group(1), Key=m.group(2))["Body"].read().decode("utf-8")


def handler(event, _context):
    # Create the client per-invocation so credentials are never frozen into the snapshot.
    s3 = boto3.client("s3")
    text = _read_text(s3, event)
    voice = event.get("voice", "zm_yunjian")
    speed = float(event.get("speed", 1.0))
    fmt = event.get("format", "wav").lower()
    if fmt not in ("wav", "mp3"):
        raise ValueError("format must be wav or mp3")
    lang = voice[0]
    if lang not in _pipelines:
        raise ValueError("voice must start with a (US), b (UK) or z (Chinese)")

    t0 = time.time()
    audio = np.concatenate([a for _, _, a in _pipelines[lang](text, voice=voice, speed=speed)])
    duration = len(audio) / SR

    wav_path = "/tmp/out.wav"
    sf.write(wav_path, audio, SR)
    out_path = wav_path
    if fmt == "mp3":
        out_path = "/tmp/out.mp3"
        subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-y", "-i", wav_path, "-codec:a", "libmp3lame", "-q:a", "2", out_path],
            check=True,
        )

    key = event.get("output_key") or f"{PREFIX}{voice}-{int(t0)}.{fmt}"
    s3.upload_file(out_path, BUCKET, key, ExtraArgs={"ContentType": f"audio/{'mpeg' if fmt == 'mp3' else 'wav'}"})
    url = s3.generate_presigned_url("get_object", Params={"Bucket": BUCKET, "Key": key}, ExpiresIn=86400)

    return {
        "s3_uri": f"s3://{BUCKET}/{key}",
        "presigned_url": url,
        "voice": voice,
        "duration_sec": round(duration, 1),
        "synth_sec": round(time.time() - t0, 1),
    }
