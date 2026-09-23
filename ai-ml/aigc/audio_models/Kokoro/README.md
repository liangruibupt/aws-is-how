# Kokoro TTS on AWS Lambda (SnapStart) — free open-source voiceover for demo videos

[Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) is an Apache-2.0 text-to-speech model (82M params) that
runs comfortably on CPU and ships ready-made English and Chinese voices. This folder deploys it as a Lambda
container image so you pay nothing while idle and only a few cents per voiceover.

Tested voices (male):

| Language | Voice | Notes |
|---|---|---|
| Chinese | `zm_yunjian` | **recommended** — most natural of the four zh male voices |
| Chinese | `zm_yunxi`, `zm_yunxia`, `zm_yunyang` | alternatives |
| English (US) | `am_michael` | **recommended** — calm narrator |
| English (US) | `am_fenrir`, `am_puck`, `am_adam`, `am_onyx`, `am_liam` | |
| English (UK) | `bm_george` | **recommended** — broadcast style |
| English (UK) | `bm_fable`, `bm_lewis`, `bm_daniel` | |

Kokoro's Chinese is noticeably weaker than its English (occasional heteronym / prosody slips). If that matters,
swap the model for [CosyVoice 3](https://github.com/FunAudioLLM/CosyVoice) or Qwen3-TTS — same deployment shape.

## Files

| File | Purpose |
|---|---|
| `Dockerfile` | `public.ecr.aws/lambda/python:3.12` + CPU torch + kokoro + misaki[en,zh] + static ffmpeg. Model weights, all voices and the spaCy model are baked in at build time (`warmup.py`), so runtime needs no network (`HF_HUB_OFFLINE=1`). ~1.0 GB. |
| `warmup.py` | Build-time download + en/zh smoke test (fails the build if synthesis breaks). |
| `app.py` | Lambda handler. Loads one shared `KModel` and three `KPipeline`s (a/b/z) at **init** so SnapStart captures them. Writes wav/mp3 to S3 and returns a presigned URL. |
| `build.sh` | Build + push the image to ECR. |
| `deploy.sh` | Create/update the function, enable SnapStart, publish a version, point alias `live` at it, delete stale versions. |
| `tts.sh` | Client: text or `.txt` script in, `.mp3`/`.wav` out on your laptop. |
| `ec2_user_data.sh` | Alternative: a start/stop-on-demand EC2 with Kokoro installed (also the Docker build host). |

## Deploy

```bash
# 1. Build on a linux/amd64 host with Docker (an EC2 c7i.xlarge builds in ~7 min; a laptop is slow because of the 1 GB pull)
ACCOUNT=<acct> REGION=us-east-1 ./build.sh          # prints IMAGE_URI=...@sha256:...

# 2. Deploy the Lambda (6 GB memory, 900 s timeout, SnapStart on published versions, alias "live")
IMAGE_URI=<from step 1> BUCKET=<your-bucket> ./deploy.sh
```

`deploy.sh` grants the function `s3:PutObject/GetObject` only on `s3://BUCKET/tts-out/*` and `GetObject` on
`s3://BUCKET/tts-in/*`. Nothing is exposed publicly — invoke with IAM credentials.

## Use

The function has no public HTTP endpoint; call it with IAM credentials (`lambda:InvokeFunction` on the alias).
Always invoke the **`kokoro-tts:live` alias** — that is the SnapStart-enabled version. Invoking the bare function
name hits `$LATEST`, which has no snapshot and cold-starts in ~50 s.

### Option 1: `tts.sh` (text in, audio file out on your laptop)

```bash
export AWS_PROFILE=<profile> REGION=us-east-1
./tts.sh zm_yunjian intro.mp3 "大家好，欢迎观看本次演示。"
./tts.sh am_michael intro_en.mp3 script_en.txt          # long scripts from a .txt file
SPEED=1.1 ./tts.sh bm_george intro_uk.wav script_en.txt  # output format follows the file extension
```

The script invokes the Lambda, downloads the result from S3, prints `<duration_sec> <synth_sec>` on stderr and the
output path on stdout. Env vars: `REGION`, `FUNC` (default `kokoro-tts:live`), `SPEED`.

### Option 2: AWS CLI

```bash
aws lambda invoke --region us-east-1 --function-name kokoro-tts:live \
  --cli-binary-format raw-in-base64-out --cli-read-timeout 900 \
  --payload '{"text":"大家好，欢迎观看本次演示。","voice":"zm_yunjian","format":"mp3"}' \
  out.json

cat out.json
# {"s3_uri":"s3://<bucket>/tts-out/zm_yunjian-1790235000.mp3","presigned_url":"https://...","voice":"zm_yunjian","duration_sec":4.5,"synth_sec":1.9}

aws s3 cp s3://<bucket>/tts-out/zm_yunjian-1790235000.mp3 .
```

`--cli-read-timeout 900` stops the CLI from dropping the connection on multi-minute scripts. The `presigned_url`
is valid for 24 h and can be shared directly.

### Option 3: Python (boto3)

```python
import json
import boto3

lam = boto3.client("lambda", region_name="us-east-1")
resp = lam.invoke(
    FunctionName="kokoro-tts:live",
    Payload=json.dumps({
        "text": "大家好，欢迎观看本次演示。",
        "voice": "zm_yunjian",             # zm_* Chinese, am_* US English, bm_* UK English
        "speed": 1.0,
        "format": "mp3",                   # or "wav"
        "output_key": "tts-out/scene1.mp3",  # optional, defaults to tts-out/<voice>-<epoch>.<fmt>
    }),
)
result = json.loads(resp["Payload"].read())
print(result["s3_uri"], result["duration_sec"], "s")
```

### Request / response

Request (JSON event):

| Field | Required | Default | Notes |
|---|---|---|---|
| `text` | one of `text` / `text_s3_uri` | | Script to synthesize; a few minutes of narration fits in one call |
| `text_s3_uri` | | | `s3://<bucket>/tts-in/<file>.txt` for long scripts |
| `voice` | no | `zm_yunjian` | Language is inferred from the first letter: `a` US, `b` UK, `z` Chinese |
| `speed` | no | `1.0` | 0.8-1.2 is the usable range |
| `format` | no | `wav` | `wav` (24 kHz) or `mp3` (LAME `-q:a 2`) |
| `output_key` | no | `tts-out/<voice>-<epoch>.<fmt>` | Must stay under the `tts-out/` prefix the role can write to |

Response: `s3_uri`, `presigned_url` (24 h), `voice`, `duration_sec` (audio length), `synth_sec` (compute time).
Errors come back as a standard Lambda `errorMessage` payload (bad voice prefix, bad format, missing text).

Then mux the audio into your screen recording:

```bash
ffmpeg -i demo.mp4 -i intro.mp3 -c:v copy -c:a aac -shortest demo_with_voice.mp4
```

## Measured performance (us-east-1, x86_64)

| Configuration | Cold invoke (10 s of zh audio) | Warm invoke |
|---|---|---|
| 3 GB, no SnapStart, lazy model load | 217 s (first ever) / ~50 s | 7.7 s |
| 6 GB, no SnapStart | 51 s | ~5 s |
| **6 GB + SnapStart, model loaded at init** | **~9 s** (1.8 s restore + 4.9 s synth) | 4.1 s |

Throughput is roughly 2x real time on 6 GB (about 0.5 s of compute per second of audio).

## Cost notes

- Lambda compute: a 60 s voiceover ≈ 30 s × 6 GB ≈ $0.003. Free tier covers 400k GB-s/month.
- **SnapStart is not free for Python**: the snapshot cache is billed per GB-s for as long as the version exists
  (roughly $20+/month at 6 GB) plus a small restore fee per cold start. `deploy.sh` deletes old versions for this
  reason. If you'd rather have zero idle cost, remove `--snap-start`, invoke `$LATEST`, and accept the ~50 s cold
  start — for batch voiceover generation that is often fine.
- SnapStart constraints that shaped this design: ephemeral storage ≤ 512 MB, Python 3.12+ base image, no
  provisioned concurrency; create `boto3` clients inside the handler so credentials are never frozen in the snapshot.

## Alternative: on-demand EC2

Launch Ubuntu 24.04 with `ec2_user_data.sh`, an instance profile with `AmazonSSMManagedInstanceCore`, and no
inbound security-group rules; access via `aws ssm start-session`. Stop the instance when idle (EBS only, ~$2.4/month
for 30 GB gp3). Fargate also works but is a long-running task billed per second, so it only makes sense for a
shared always-on HTTP API.
