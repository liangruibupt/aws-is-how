#!/usr/bin/env bash
# Experiment: multi-Region from one deploy command.
#   - MultiRegion endpoint: ONE global domain, latency-based routing (best effort)
#   - PerRegion endpoint on the same function: one domain per Region, you route
# Region set and endpoint type are fixed at endpoint creation.
set -euo pipefail
cd "$(dirname "$0")/.."
AWS="${AWS:-aws}"; HOME_REGION="${REGION:-us-east-1}"; NAME="${NAME:-wf-lab-global}"
REGIONS="${REGIONS:-us-east-1,us-west-2,ap-northeast-1}"
wf() { "$AWS" lambda-web "$@" --region "$HOME_REGION" --function-name "$NAME"; }

NAME="$NAME" REGION="$HOME_REGION" AWS="$AWS" APP_VERSION=global-v1 ./scripts/deploy.sh \
  --endpoint-name global --endpoint-type MultiRegion --regions "$REGIONS" --auth-type ApplicationManaged

REV=$(wf list-web-function-revisions --query 'sort_by(revisions[?state==`Active`],&createdAt)[-1].revisionId' --output text)
if ! wf get-web-function-endpoint --endpoint-name regional >/dev/null 2>&1; then
  # shellcheck disable=SC2086  # the low-level API takes a space-separated list
  wf create-web-function-endpoint --endpoint-name regional --endpoint-type PerRegion --regions ${REGIONS//,/ } \
    --auth-type ApplicationManaged --auto-deployment-mode Disabled \
    --revision-weights "[{\"revisionId\":\"$REV\",\"weight\":100}]" >/dev/null
fi
for _ in $(seq 60); do [ "$(wf get-web-function-endpoint --endpoint-name regional --query state --output text)" = Active ] && break; sleep 5; done

GLOBAL="https://$(wf get-web-function-endpoint --endpoint-name global --query domainName --output text)"
echo "$GLOBAL" > .lab-global-url
echo "global endpoint: $GLOBAL"
wf get-web-function-endpoint --endpoint-name global --output json > .lab-state/global-endpoint.json
wf get-web-function-endpoint --endpoint-name regional --output json > .lab-state/regional-endpoint.json

echo "--- global domain from this host (latency-routed):"
node scripts/dist.mjs "$GLOBAL" 100 10 | tr -d '\n ' ; echo
echo "--- each PerRegion domain:"
node -e '
const ep = require("./.lab-state/regional-endpoint.json");
const list = Object.entries(ep.regionalEndpoints || {}).map(([region, v]) => ({ region, ...v }));
(async () => { for (const r of list) {
  const d = r.domainName || r.domain || ""; if (!d) { console.log(JSON.stringify(r)); continue; }
  const t0 = Date.now(); const res = await fetch("https://" + d + "/api/whoami"); const j = await res.json();
  console.log(r.region, d, "->", res.status, j.region, j.azId, (Date.now() - t0) + "ms");
}})();'
