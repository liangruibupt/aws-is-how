#!/usr/bin/env bash
# Experiment: CloudFront in front of an IamAuth Web Function endpoint with OAC.
#   - new endpoint "cdn" (IamAuth): unsigned direct calls are refused
#   - OAC (origin type lambda, always-amz-auth) signs every origin request
#   - resource policy: only THIS distribution may invoke the endpoint
#   - /assets/* cached at the edge (CachingOptimized); everything else dynamic
#     (CachingDisabled + AllViewerExceptHostHeader -- Lambda routes on Host)
set -euo pipefail
cd "$(dirname "$0")/.."
AWS="${AWS:-aws}"; REGION="${REGION:-us-east-1}"; NAME="${NAME:-wf-lab}"
mkdir -p .lab-state
ACCOUNT=$("$AWS" sts get-caller-identity --query Account --output text)
wf() { "$AWS" lambda-web "$@" --region "$REGION" --function-name "$NAME"; }

# 1. IamAuth endpoint
if ! wf get-web-function-endpoint --endpoint-name cdn >/dev/null 2>&1; then
  wf create-web-function-endpoint --endpoint-name cdn --endpoint-type HomeRegion \
    --auth-type IamAuth --auto-deployment-mode LatestRevision \
    --scaling-config '{"maxEnvironments":20}' >/dev/null
  sleep 10
fi
ORIGIN=$(wf get-web-function-endpoint --endpoint-name cdn --query domainName --output text)
ENDPOINT_ARN=$(wf get-web-function-endpoint --endpoint-name cdn --query endpointArn --output text)
echo "IamAuth origin: $ORIGIN"

# 2. Origin access control for a Lambda origin
OAC_ID=$("$AWS" cloudfront list-origin-access-controls --query "OriginAccessControlList.Items[?Name=='$NAME-oac'].Id | [0]" --output text)
if [ "$OAC_ID" = "None" ] || [ -z "$OAC_ID" ]; then
  OAC_ID=$("$AWS" cloudfront create-origin-access-control --origin-access-control-config \
    "Name=$NAME-oac,Description=OAC for Lambda Web Function,SigningProtocol=sigv4,SigningBehavior=always-amz-auth,OriginAccessControlOriginType=lambda" \
    --query OriginAccessControl.Id --output text)
fi
echo "OAC: $OAC_ID"

# 3. Distribution
if [ ! -f .lab-state/distribution-id ]; then
  cat > .lab-state/dist.json <<JSON
{
  "CallerReference": "$NAME-$(date +%s)",
  "Comment": "$NAME: CloudFront + OAC in front of a Lambda Web Function",
  "Enabled": true,
  "HttpVersion": "http2and3",
  "PriceClass": "PriceClass_100",
  "Origins": { "Quantity": 1, "Items": [{
    "Id": "webfn", "DomainName": "$ORIGIN", "OriginAccessControlId": "$OAC_ID",
    "CustomOriginConfig": { "HTTPPort": 80, "HTTPSPort": 443, "OriginProtocolPolicy": "https-only",
      "OriginSslProtocols": { "Quantity": 1, "Items": ["TLSv1.2"] }, "OriginReadTimeout": 60, "OriginKeepaliveTimeout": 5 }
  }]},
  "DefaultCacheBehavior": {
    "TargetOriginId": "webfn", "ViewerProtocolPolicy": "redirect-to-https", "Compress": true,
    "AllowedMethods": { "Quantity": 7, "Items": ["GET","HEAD","OPTIONS","PUT","POST","PATCH","DELETE"],
      "CachedMethods": { "Quantity": 2, "Items": ["GET","HEAD"] } },
    "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
    "OriginRequestPolicyId": "b689b0a8-53d0-40ab-baf2-68738e2966ac"
  },
  "CacheBehaviors": { "Quantity": 1, "Items": [{
    "PathPattern": "/assets/*", "TargetOriginId": "webfn", "ViewerProtocolPolicy": "redirect-to-https", "Compress": true,
    "AllowedMethods": { "Quantity": 2, "Items": ["GET","HEAD"], "CachedMethods": { "Quantity": 2, "Items": ["GET","HEAD"] } },
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }]}
}
JSON
  read -r DIST_ID DIST_DOMAIN < <("$AWS" cloudfront create-distribution-with-tags \
    --distribution-config-with-tags "{\"DistributionConfig\": $(cat .lab-state/dist.json), \"Tags\": {\"Items\": [{\"Key\":\"project\",\"Value\":\"wf-lab\"}]}}" \
    --query 'Distribution.[Id,DomainName]' --output text)
  echo "$DIST_ID" > .lab-state/distribution-id; echo "$DIST_DOMAIN" > .lab-state/distribution-domain
fi
DIST_ID=$(cat .lab-state/distribution-id); DIST_DOMAIN=$(cat .lab-state/distribution-domain)
echo "distribution: $DIST_ID https://$DIST_DOMAIN"

# 4. Resource policy: only this distribution may invoke the cdn endpoint
cat > .lab-state/policy.json <<JSON
{ "Version": "2012-10-17", "Statement": [{
  "Sid": "AllowCloudFrontOAC", "Effect": "Allow",
  "Principal": { "Service": "cloudfront.amazonaws.com" },
  "Action": "lambda:InvokeWebFunctionEndpoint",
  "Resource": "$ENDPOINT_ARN",
  "Condition": { "StringEquals": { "aws:SourceArn": "arn:aws:cloudfront::$ACCOUNT:distribution/$DIST_ID" } }
}]}
JSON
REV=$("$AWS" lambda-web get-resource-policy --region "$REGION" --resource-arn "arn:aws:lambda:$REGION:$ACCOUNT:web-function/$NAME" --query revisionId --output text 2>/dev/null || true)
"$AWS" lambda-web put-resource-policy --region "$REGION" --resource-arn "arn:aws:lambda:$REGION:$ACCOUNT:web-function/$NAME" \
  --policy file://.lab-state/policy.json ${REV:+--revision-id "$REV"} >/dev/null
echo "resource policy set"

echo "waiting for distribution to deploy (several minutes)..."
"$AWS" cloudfront wait distribution-deployed --id "$DIST_ID"
echo "https://$DIST_DOMAIN" > .lab-cdn-url

echo "--- direct, unsigned call to IamAuth origin:"
curl -s -o /dev/null -w "%{http_code}\n" "https://$ORIGIN/api/whoami"
echo "--- via CloudFront (dynamic):"
curl -s -D - -o /dev/null "https://$DIST_DOMAIN/api/whoami" | grep -iE '^HTTP|x-lab-env|x-cache|lambda-web-request-id'
echo "--- via CloudFront (static asset, twice):"
for i in 1 2; do curl -s -D - -o /dev/null "https://$DIST_DOMAIN/assets/app.js" | grep -iE '^HTTP|x-cache|age:'; done
