#!/usr/bin/env bash
# Install deps into the host venv and (re)start the MiniMax-H3 web console detached on :7860.
#
#   ./run_webui.sh            # start / restart
#   ./run_webui.sh stop
#   ./run_webui.sh logs
#
# It talks to the sglang servers on 30010 (t2va+fl2va) and 30030 (ref2va); see app.py for env knobs.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
VENV=${VENV:-/opt/dlami/nvme/venv}
PORT=${H3_UI_PORT:-7860}
LOG=${LOG:-$HOME/webui.log}
PIDFILE=${PIDFILE:-$HOME/webui.pid}

stop() {
  if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
    kill "$(cat "$PIDFILE")" && echo "stopped $(cat "$PIDFILE")"
  fi
  rm -f "$PIDFILE"
}

case "${1:-start}" in
  stop) stop; exit 0 ;;
  logs) exec tail -f "$LOG" ;;
  start) ;;
  *) echo "usage: $0 [start|stop|logs]" >&2; exit 2 ;;
esac

[ -x "$VENV/bin/python" ] || python3 -m venv "$VENV"
"$VENV/bin/pip" install -q "fastapi==0.115.6" "uvicorn[standard]==0.34.0" "python-multipart==0.0.20" "httpx==0.28.1"

stop
cd "$HERE"
setsid nohup env H3_UI_PORT="$PORT" "$VENV/bin/python" app.py > "$LOG" 2>&1 < /dev/null &
echo $! > "$PIDFILE"
sleep 2
if curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null; then
  echo "web UI up on :$PORT (pid $(cat "$PIDFILE")), log $LOG"
else
  echo "web UI failed to start; last log:" >&2; tail -20 "$LOG" >&2; exit 1
fi
