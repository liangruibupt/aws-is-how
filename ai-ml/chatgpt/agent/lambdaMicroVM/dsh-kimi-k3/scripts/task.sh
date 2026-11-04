#!/usr/bin/env bash
# Run one headless dsh task inside the MicroVM, follow it, and download what it produced.
#
# Usage: ./scripts/task.sh "prompt text"        or   ./scripts/task.sh -f prompt.md
# Output: outputs/<task-id>/ (the task's working directory) + events.ndjson
# Polling also keeps the MicroVM from idling into SUSPENDED while the agent works:
# idle is measured by inbound proxy traffic only.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "${HERE}/.microvm.env"
export AWS_REGION
POLL="${POLL_SECONDS:-15}"

if [[ "${1:-}" == "-f" ]]; then PROMPT="$(cat "$2")"; else PROMPT="${1:?usage: task.sh \"prompt\" | -f file}"; fi

TOKEN=""; TOKEN_AT=0
token() {
  if [[ -z "${TOKEN}" || $(( $(date +%s) - TOKEN_AT )) -gt 3000 ]]; then
    TOKEN="$(aws lambda-microvms create-microvm-auth-token --microvm-identifier "${MICROVM_ID}" \
      --expiration-in-minutes 60 --allowed-ports '[{"port":8080}]' --query 'authToken."X-aws-proxy-auth"' --output text)"
    TOKEN_AT=$(date +%s)
  fi
}
# curl with the auth header passed via a file descriptor, so the token never appears in `ps`.
api() { token; curl -sS -m 120 -H @<(printf 'X-aws-proxy-auth: %s\n' "${TOKEN}") "$@"; }

token  # mint in the main shell; $(...) subshells below reuse it
BODY="$(python3 -c 'import json,sys;print(json.dumps({"prompt":sys.argv[1]}))' "${PROMPT}")"
ID="$(api -X POST -H 'content-type: application/json' --data-binary "${BODY}" "${MICROVM_ENDPOINT}/__sidecar/tasks" \
  | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d.get("id") or sys.exit("submit failed: "+json.dumps(d)))')"
echo "task ${ID} submitted to ${MICROVM_ID}"

while true; do
  sleep "${POLL}"
  token
  STATUS="$(api "${MICROVM_ENDPOINT}/__sidecar/tasks/${ID}" || echo '{}')"
  LINE="$(python3 -c '
import json,sys
try: d=json.loads(sys.argv[1])
except Exception: print("? (poll failed)"); sys.exit()
u=d.get("usage",{})
print(d.get("status","?"), "| events", d.get("events"), "| tool calls", d.get("toolCalls"),
      "| tokens in/out/cached", u.get("inputTokens"), u.get("outputTokens"), u.get("cacheReadTokens"))' "${STATUS}")"
  echo "$(date +%H:%M:%S) ${LINE}"
  case "${LINE}" in running*|\?*) continue ;; esac
  break
done

OUT="${HERE}/outputs/${ID}"; mkdir -p "${OUT}"
token
api "${MICROVM_ENDPOINT}/__sidecar/tasks/${ID}/events" -o "${OUT}/events.ndjson"
# Mirror the task directory (recursive listing via the sidecar files API).
fetch_dir() {
  local rel="$1"
  api "${MICROVM_ENDPOINT}/__sidecar/files/${rel}" | python3 -c '
import json,sys
for e in json.load(sys.stdin): print(("D " if e["dir"] else "F ")+e["name"])' | while read -r kind name; do
    if [[ "${kind}" == "D" ]]; then mkdir -p "${OUT}/${rel#tasks/${ID}}/${name}"; fetch_dir "${rel}/${name}"
    else api "${MICROVM_ENDPOINT}/__sidecar/files/${rel}/${name}" -o "${OUT}/${rel#tasks/${ID}}/${name}"; fi
  done
}
fetch_dir "tasks/${ID}"
python3 -c 'import json,sys;d=json.loads(sys.argv[1]);print("\n--- final answer ---\n"+(d.get("finalText") or "(none)"));print("error:",d["error"]) if d.get("error") else None' "${STATUS}"
echo "--- downloaded to ${OUT}"; ls -la "${OUT}"
