#!/usr/bin/env bash
# Remove everything the lab created. Run it yourself: it deletes resources.
#   CloudFront distribution + OAC, Web Functions wf-lab and wf-lab-global
#   (all endpoints/revisions), CLI-created execution roles. The CLI-managed
#   S3 code bucket is listed but kept (other Web Functions may share it).
set -euo pipefail
cd "$(dirname "$0")/.."
AWS="${AWS:-aws}"; REGION="${REGION:-us-east-1}"
ACCOUNT=$("$AWS" sts get-caller-identity --query Account --output text)

if [ -f .lab-state/distribution-id ]; then
  ID=$(cat .lab-state/distribution-id)
  ETAG=$("$AWS" cloudfront get-distribution-config --id "$ID" --query ETag --output text)
  "$AWS" cloudfront get-distribution-config --id "$ID" --query DistributionConfig --output json \
    | python3 -c 'import json,sys; c=json.load(sys.stdin); c["Enabled"]=False; print(json.dumps(c))' > .lab-state/dist-disabled.json
  "$AWS" cloudfront update-distribution --id "$ID" --if-match "$ETAG" --distribution-config file://.lab-state/dist-disabled.json >/dev/null
  echo "disabling distribution $ID ..."; "$AWS" cloudfront wait distribution-deployed --id "$ID"
  ETAG=$("$AWS" cloudfront get-distribution --id "$ID" --query ETag --output text)
  "$AWS" cloudfront delete-distribution --id "$ID" --if-match "$ETAG"
  rm -f .lab-state/distribution-id .lab-state/distribution-domain .lab-cdn-url
fi
OAC=$("$AWS" cloudfront list-origin-access-controls --query "OriginAccessControlList.Items[?Name=='wf-lab-oac'].Id | [0]" --output text)
if [ "$OAC" != "None" ]; then
  "$AWS" cloudfront delete-origin-access-control --id "$OAC" --if-match "$("$AWS" cloudfront get-origin-access-control --id "$OAC" --query ETag --output text)"
fi

for FN in wf-lab wf-lab-global; do
  "$AWS" lambda-web get-web-function --region "$REGION" --function-name "$FN" >/dev/null 2>&1 || continue
  for EP in $("$AWS" lambda-web list-web-function-endpoints --region "$REGION" --function-name "$FN" --query 'endpoints[].endpointName' --output text); do
    "$AWS" lambda-web delete-web-function-endpoint --region "$REGION" --function-name "$FN" --endpoint-name "$EP" || true
  done
  sleep 20
  "$AWS" lambda-web delete-web-function --region "$REGION" --function-name "$FN" && echo "deleted $FN"
  ROLE="awscli-lambdaweb-$FN"
  for P in $("$AWS" iam list-role-policies --role-name "$ROLE" --query PolicyNames --output text 2>/dev/null); do
    "$AWS" iam delete-role-policy --role-name "$ROLE" --policy-name "$P"; done
  for P in $("$AWS" iam list-attached-role-policies --role-name "$ROLE" --query 'AttachedPolicies[].PolicyArn' --output text 2>/dev/null); do
    "$AWS" iam detach-role-policy --role-name "$ROLE" --policy-arn "$P"; done
  "$AWS" iam delete-role --role-name "$ROLE" 2>/dev/null && echo "deleted role $ROLE" || true
done
echo "kept CLI code bucket (delete manually if unused): s3://awscli-lambdaweb-$ACCOUNT-$REGION-an"
