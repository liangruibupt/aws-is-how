#!/bin/bash
# Generate a voiceover with the deployed kokoro-tts Lambda and download it.
#
#   ./tts.sh <voice> <out.mp3|out.wav> "<text or path to a .txt script>"
#   ./tts.sh zm_yunjian intro.mp3 "大家好，欢迎观看本次演示。"
#   ./tts.sh am_michael intro.mp3 script_en.txt
#
# Voices: zm_yunjian zm_yunxi zm_yunxia zm_yunyang (zh) | am_michael am_fenrir am_puck am_adam am_onyx am_liam (en-US)
#         bm_george bm_fable bm_lewis bm_daniel (en-GB)
set -euo pipefail
VOICE=$1; OUT=$2; SRC=$3
REGION=${REGION:-us-east-1}
FUNC=${FUNC:-kokoro-tts:live}
FMT=${OUT##*.}

if [ -f "$SRC" ]; then TEXT=$(cat "$SRC"); else TEXT=$SRC; fi
PAYLOAD=$(python3 -c 'import json,sys; print(json.dumps({"text":sys.argv[1],"voice":sys.argv[2],"format":sys.argv[3],"speed":float(sys.argv[4])}))' "$TEXT" "$VOICE" "$FMT" "${SPEED:-1.0}")

RESP=$(mktemp)
aws lambda invoke --region "$REGION" --function-name "$FUNC" --cli-binary-format raw-in-base64-out \
  --cli-read-timeout 900 --payload "$PAYLOAD" "$RESP" >/dev/null
if grep -q errorMessage "$RESP"; then cat "$RESP"; rm -f "$RESP"; exit 1; fi

S3URI=$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print(d["s3_uri"]); print(d["duration_sec"], d["synth_sec"], file=sys.stderr)' "$RESP")
aws s3 cp "$S3URI" "$OUT" --quiet
rm -f "$RESP"
echo "$OUT"
