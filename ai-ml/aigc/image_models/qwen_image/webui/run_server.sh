#!/usr/bin/env bash
# Start / stop the Qwen-Image-2.1 console (FastAPI + one in-process diffusers pipeline).
#
#   ./run_server.sh            # start (or restart) on :7861, pinned to $GPU (default 1)
#   ./run_server.sh stop
#   ./run_server.sh logs
#
# Requires the venv from setup_env.sh. The LD_LIBRARY_PATH export below is NOT optional: the
# CUDA-13 pip wheels put libnvrtc in nvidia/cu13/lib, and cuDNN's runtime-compiled engine dlopens it
# during VAE decode. Without the path every generation fails at the very end with
#   CUDNN_STATUS_SUBLIBRARY_LOADING_FAILED
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
VENV=${VENV:-/opt/dlami/nvme/qi_venv}
GPU=${GPU:-1}
PORT=${QI_UI_PORT:-7861}
LOG=${LOG:-$HOME/qwen_image_server.log}
PIDFILE=${PIDFILE:-$HOME/qwen_image_server.pid}

stop() {
  if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
    kill "$(cat "$PIDFILE")" && echo "stopped $(cat "$PIDFILE")"; sleep 2
  fi
  rm -f "$PIDFILE"
}

case "${1:-start}" in
  stop) stop; exit 0 ;;
  logs) exec tail -f "$LOG" ;;
  start) ;;
  *) echo "usage: $0 [start|stop|logs]" >&2; exit 2 ;;
esac

[ -x "$VENV/bin/python" ] || { echo "venv missing at $VENV — run setup_env.sh first" >&2; exit 1; }
SP=$VENV/lib/python3.12/site-packages/nvidia
export LD_LIBRARY_PATH=$SP/cu13/lib:$SP/cudnn/lib:$SP/cusparselt/lib:$SP/nccl/lib:$SP/nvshmem/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}
export CUDA_VISIBLE_DEVICES=$GPU QI_UI_PORT=$PORT

stop
cd "$HERE"
setsid nohup "$VENV/bin/python" server.py > "$LOG" 2>&1 < /dev/null &
echo $! > "$PIDFILE"
for _ in $(seq 1 60); do
  sleep 2
  st=$(curl -sf "http://127.0.0.1:$PORT/api/health" 2>/dev/null | python3 -c 'import sys,json; print(json.load(sys.stdin).get("status",""))' 2>/dev/null || true)
  [ "$st" = "ready" ] && { echo "Qwen-Image-2.1 console ready on :$PORT (GPU $GPU, pid $(cat "$PIDFILE")), log $LOG"; exit 0; }
  kill -0 "$(cat "$PIDFILE")" 2>/dev/null || { echo "server died; last log:" >&2; tail -30 "$LOG" >&2; exit 1; }
done
echo "server up but model not ready after 120 s; check $LOG" >&2; exit 1
