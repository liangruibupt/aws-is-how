#!/usr/bin/env bash
# Deploy the lab app as a Lambda Web Function (HomeRegion endpoint "dev").
# Needs AWS CLI >= 2.38 (has `aws lambda-web`). Override with AWS=/path/to/aws.
set -euo pipefail
cd "$(dirname "$0")/.."
AWS="${AWS:-aws}"
REGION="${REGION:-us-east-1}"
NAME="${NAME:-wf-lab}"
VERSION="${APP_VERSION:-v1}"

# Key that guards the Bedrock route (it costs money). Kept locally, gitignored.
[ -f .lab-key ] || openssl rand -hex 12 > .lab-key
LAB_KEY="$(cat .lab-key)"

(cd app && npm ci --omit=dev --no-audit --no-fund >/dev/null)

"$AWS" lambda-web deploy --region "$REGION" --name "$NAME" --code ./app --create \
  --env "APP_VERSION=$VERSION" --env "LAB_KEY=$LAB_KEY" \
  --timeout-seconds 300 \
  --max-environments 20 \
  --tags project=wf-lab --tags owner=kirocrew \
  --revision-description "lab $VERSION" "$@"

# The CLI-created execution role is awscli-lambdaweb-<name>; let it call Bedrock.
ROLE="awscli-lambdaweb-$NAME"
if "$AWS" iam get-role --role-name "$ROLE" >/dev/null 2>&1; then
  "$AWS" iam put-role-policy --role-name "$ROLE" --policy-name bedrock-converse-stream \
    --policy-document file://infra/bedrock-policy.json
  echo "attached bedrock-converse-stream to $ROLE"
fi
