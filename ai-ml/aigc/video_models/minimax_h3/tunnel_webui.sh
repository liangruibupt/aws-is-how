#!/usr/bin/env bash
# Open (or reopen) an SSM port-forward so the MiniMax-H3 web console on the g7e box is reachable at
# http://localhost:7860 — needed because the corporate network blocks direct access to EC2 public IPs.
#
#   ./tunnel_webui.sh                 # uses instance id from /tmp/h3_instance (written by g7e_hunt.sh)
#   INSTANCE=i-0123... REGION=us-east-2 ./tunnel_webui.sh
#   ./tunnel_webui.sh stop
set -euo pipefail
export AWS_PROFILE=${AWS_PROFILE:-global_ruiliang}
REGION=${REGION:-us-east-2}
INSTANCE=${INSTANCE:-$(awk '{print $1}' /tmp/h3_instance 2>/dev/null || true)}
LPORT=${LPORT:-7860}
RPORT=${RPORT:-7860}
LOG=/tmp/h3_tunnel.log

pkill -f "AWS-StartPortForwardingSession.*$RPORT" 2>/dev/null || true
[ "${1:-}" = stop ] && { echo "tunnel closed"; exit 0; }
[ -z "$INSTANCE" ] && { echo "INSTANCE not set and /tmp/h3_instance missing" >&2; exit 1; }

nohup aws ssm start-session --region "$REGION" --target "$INSTANCE" \
  --document-name AWS-StartPortForwardingSession \
  --parameters "{\"portNumber\":[\"$RPORT\"],\"localPortNumber\":[\"$LPORT\"]}" > "$LOG" 2>&1 &
for _ in $(seq 1 15); do
  sleep 1
  curl -sf "http://localhost:$LPORT/api/health" >/dev/null 2>&1 && { echo "open: http://localhost:$LPORT  (instance $INSTANCE, $REGION)"; exit 0; }
done
echo "tunnel did not come up; log:" >&2; cat "$LOG" >&2; exit 1
