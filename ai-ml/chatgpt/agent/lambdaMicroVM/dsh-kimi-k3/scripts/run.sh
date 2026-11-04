#!/usr/bin/env bash
# Launch one MicroVM from the latest successful image version and wait until its
# sidecar answers through the HTTPS endpoint. Writes .microvm.env for the other scripts.
#
# Usage: AWS_PROFILE=... ./scripts/run.sh
# Env:   AWS_REGION (us-east-1)  STACK_NAME (dsh-kimi-microvm)  IMAGE_NAME (dsh-kimi-k3)
#        MAX_IDLE_SECONDS (900)  SUSPENDED_SECONDS (3600)  MAX_DURATION_SECONDS (28800)
set -euo pipefail

export AWS_REGION="${AWS_REGION:-us-east-1}"
STACK_NAME="${STACK_NAME:-dsh-kimi-microvm}"
IMAGE_NAME="${IMAGE_NAME:-dsh-kimi-k3}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

EXEC_ROLE_ARN="$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Outputs[?OutputKey=='ExecutionRoleArn'].OutputValue" --output text)"
IMAGE_ARN="$(aws lambda-microvms list-microvm-images --query "items[?name=='${IMAGE_NAME}'].imageArn | [0]" --output text)"
VERSION="$(aws lambda-microvms list-microvm-image-versions --image-identifier "${IMAGE_ARN}" \
  --query "sort_by(items[?state=='SUCCESSFUL'],&createdAt)[-1].imageVersion" --output text)"
[[ -n "${VERSION}" && "${VERSION}" != "None" ]] || { echo "no SUCCESSFUL version of ${IMAGE_NAME}; run deploy.sh" >&2; exit 1; }

# Idle is measured by inbound proxy traffic only. A long headless task with nobody polling
# would look idle, so task.sh polls; interactive users get MAX_IDLE_SECONDS of think time.
IDLE="{\"maxIdleDurationSeconds\":${MAX_IDLE_SECONDS:-900},\"suspendedDurationSeconds\":${SUSPENDED_SECONDS:-3600},\"autoResumeEnabled\":true}"

echo "==> run-microvm ${IMAGE_NAME}:${VERSION}"
read -r MICROVM_ID ENDPOINT <<<"$(aws lambda-microvms run-microvm \
  --image-identifier "${IMAGE_ARN}" --image-version "${VERSION}" \
  --execution-role-arn "${EXEC_ROLE_ARN}" \
  --idle-policy "${IDLE}" \
  --maximum-duration-in-seconds "${MAX_DURATION_SECONDS:-28800}" \
  --logging "{\"cloudWatch\":{\"logGroup\":\"/aws/lambda/microvms/${IMAGE_NAME}\"}}" \
  --query '[microvmId,endpoint]' --output text)"
ENDPOINT="https://${ENDPOINT#https://}"
echo "    ${MICROVM_ID}  ${ENDPOINT}"

cat > "${HERE}/.microvm.env" <<EOF
MICROVM_ID=${MICROVM_ID}
MICROVM_ENDPOINT=${ENDPOINT}
AWS_REGION=${AWS_REGION}
EOF

echo "==> waiting for the sidecar (readiness = a successful ingress, not get-microvm state)"
TOKEN="$(aws lambda-microvms create-microvm-auth-token --microvm-identifier "${MICROVM_ID}" \
  --expiration-in-minutes 10 --allowed-ports '[{"port":8080}]' --query 'authToken."X-aws-proxy-auth"' --output text)"
for i in $(seq 1 60); do
  # Pass the token through a header file so it never shows up in `ps`.
  if curl -sf -m 5 -H @<(printf 'X-aws-proxy-auth: %s\n' "${TOKEN}") "${ENDPOINT}/__sidecar/health" -o /tmp/dsh-health.json; then
    python3 -c 'import json;d=json.load(open("/tmp/dsh-health.json"));print("    dsh web:",d["dshWeb"]["status"],"| IMDS fence:",d["imdsFence"]["verified"],"|",d["imdsFence"]["detail"])'
    break
  fi
  sleep 2
done
echo "Ready. Browser: node scripts/connect.mjs   Batch: ./scripts/task.sh 'your task'"
