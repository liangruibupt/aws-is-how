#!/usr/bin/env bash
# Experiment: canary with immutable revisions and weighted endpoint routing.
#   1. create a "prod" endpoint pinned (autoDeployment=Disabled) to the current revision
#   2. deploy new code as v2 -> "dev" (LatestRevision) picks it up immediately,
#      "prod" does not move
#   3. shift prod to 90/10, measure, then 0/100 (promote) -- or roll back.
set -euo pipefail
cd "$(dirname "$0")/.."
AWS="${AWS:-aws}"; REGION="${REGION:-us-east-1}"; NAME="${NAME:-wf-lab}"
wf() { "$AWS" lambda-web "$@" --region "$REGION" --function-name "$NAME"; }
latest_rev() { wf list-web-function-revisions --query 'sort_by(revisions[?state==`Active`],&createdAt)[-1].revisionId' --output text; }
# updateStatus flips InProgress -> Successful a few seconds after an update; measure only after that.
wait_ep() { sleep 3; for _ in $(seq 60); do s=$(wf get-web-function-endpoint --endpoint-name "$1" --query '[state,updateStatus]' --output text); [[ "$s" == Active*Successful* || "$s" == "Active	None" ]] && return; sleep 3; done; }

OLD=$(latest_rev); echo "current revision: $OLD"
if ! wf get-web-function-endpoint --endpoint-name prod >/dev/null 2>&1; then
  wf create-web-function-endpoint --endpoint-name prod --endpoint-type HomeRegion \
    --auth-type ApplicationManaged --auto-deployment-mode Disabled \
    --revision-weights "[{\"revisionId\":\"$OLD\",\"weight\":100}]" \
    --scaling-config '{"maxEnvironments":20}' --query domainName --output text
fi
wait_ep prod
PROD="https://$(wf get-web-function-endpoint --endpoint-name prod --query domainName --output text)"
echo "$PROD" > .lab-prod-url; echo "prod: $PROD"

APP_VERSION=v2 AWS="$AWS" ./scripts/deploy.sh --endpoint-name dev >/dev/null
NEW=$(latest_rev); echo "new revision: $NEW"
echo "--- dev (LatestRevision) after deploy:"; node scripts/dist.mjs "$(cat .lab-url)" 100 10 | grep -A3 '"version"'
echo "--- prod (Disabled) after deploy:";      node scripts/dist.mjs "$PROD" 100 10 | grep -A3 '"version"'

wf update-web-function-endpoint --endpoint-name prod \
  --revision-weights "[{\"revisionId\":\"$OLD\",\"weight\":90},{\"revisionId\":\"$NEW\",\"weight\":10}]" >/dev/null
wait_ep prod
echo "--- prod at 90/10:"; node scripts/dist.mjs "$PROD" 1000 25 | grep -A3 '"version"'

wf update-web-function-endpoint --endpoint-name prod --revision-weights "[{\"revisionId\":\"$NEW\",\"weight\":100}]" >/dev/null
wait_ep prod
echo "--- prod promoted to $NEW:"; node scripts/dist.mjs "$PROD" 200 20 | grep -A3 '"version"'
echo "rollback = update-web-function-endpoint --endpoint-name prod --revision-weights '[{\"revisionId\":\"$OLD\",\"weight\":100}]'"
