"""Run public HTTPS and audio regression checks from an EC2-side container."""
import array
from datetime import datetime, timezone
import hashlib
import io
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import time
import wave

import httpx


def verify():
    endpoint = os.environ["VERIFY_ENDPOINT"]
    token = os.environ["API_TOKEN"]
    results = {}
    with httpx.Client(base_url=endpoint, timeout=60, follow_redirects=False) as api:
        deadline = time.monotonic() + 900
        while time.monotonic() < deadline:
            health = api.get("/healthz")
            if health.status_code == 200:
                break
            if health.status_code not in {502, 503, 504}:
                raise RuntimeError(f"Unexpected readiness status: {health.status_code}")
            time.sleep(15)
        else:
            raise TimeoutError("Model not ready after 15 minutes")
        assert health.json() == {"status": "ready"}
        assert health.headers.get("cache-control") == "no-store"
        unauthorized = api.get("/v1/voices")
        assert unauthorized.status_code == 401
        assert unauthorized.headers.get("cache-control") == "no-store"
        api.headers["Authorization"] = "Bearer " + token
        voices = api.get("/v1/voices")
        voices.raise_for_status()
        assert any(voice["id"] == "upstream-demo" for voice in voices.json()["voices"])
        for output_format in ("wav", "mp3"):
            request = api.post("/v1/jobs", json={
                "text": "This is a security update verification of the cloud voice service.",
                "voice": "upstream-demo", "format": output_format,
            })
            assert request.status_code == 202, request.status_code
            job_id = request.json()["id"]
            deadline = time.monotonic() + 900
            while time.monotonic() < deadline:
                response = api.get(f"/v1/jobs/{job_id}")
                response.raise_for_status()
                job = response.json()
                if job["status"] == "completed":
                    break
                if job["status"] == "failed":
                    raise RuntimeError(job)
                time.sleep(3)
            else:
                raise TimeoutError(job_id)
            response = api.get(f"/v1/jobs/{job_id}/audio")
            response.raise_for_status()
            audio = response.content
            assert hashlib.sha256(audio).hexdigest() == job["sha256"]
            path = Path("/tmp") / f"cloud-smoke.{output_format}"
            path.write_bytes(audio)
            if output_format == "wav":
                with wave.open(io.BytesIO(audio)) as wav:
                    assert wav.getsampwidth() == 2 and wav.getnchannels() == 1
                    rate, frames = wav.getframerate(), wav.getnframes()
                    samples = array.array("h", wav.readframes(frames))
                if sys.byteorder != "little":
                    samples.byteswap()
            else:
                rate = job["sample_rate"]
                decoded = subprocess.run([
                    "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error",
                    "-i", str(path), "-f", "s16le", "-ac", "1", "-ar", str(rate), "-",
                ], capture_output=True, check=True, timeout=120).stdout
                samples = array.array("h", decoded)
                if sys.byteorder != "little":
                    samples.byteswap()
                frames = len(samples)
            assert samples, "Empty audio"
            rms = math.sqrt(sum(float(x) * x for x in samples) / len(samples)) / 32768
            assert rate == job["sample_rate"] and 1 < frames / rate < 60 and rms > .001
            results[output_format] = {"job": job, "audioSeconds": frames / rate, "rms": rms}
    return {
        "status": "PASS", "checkedAtUTC": datetime.now(timezone.utc).isoformat(),
        "execution": "EC2", "endpoint": endpoint, "unauthorizedHTTP": 401,
        "audio": results,
    }


if __name__ == "__main__":
    print(json.dumps(verify()), flush=True)
