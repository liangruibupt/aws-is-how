#!/bin/bash
# Create (or update) the kokoro-tts Lambda function with SnapStart and a "live" alias.
#
#   IMAGE_URI=<from build.sh> BUCKET=my-bucket ./deploy.sh
#
# Idempotent: re-running with a new IMAGE_URI publishes a new SnapStart version and moves the alias.
set -euo pipefail

: "${IMAGE_URI:?set IMAGE_URI to the ECR image URI (with @sha256 digest) printed by build.sh}"
: "${BUCKET:?set BUCKET to the S3 bucket that receives audio output}"
REGION=${REGION:-us-east-1}
FUNC=${FUNC:-kokoro-tts}
ROLE_NAME=${ROLE_NAME:-KokoroTTS-LambdaRole}
MEMORY=${MEMORY:-6144}          # more memory = more vCPU = faster synthesis
OUT_PREFIX=${OUT_PREFIX:-tts-out/}
IN_PREFIX=${IN_PREFIX:-tts-in/}
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)

# --- execution role -----------------------------------------------------------
if ! aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  aws iam create-role --role-name "$ROLE_NAME" --description "Kokoro TTS Lambda execution role" \
    --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}' >/dev/null
  aws iam attach-role-policy --role-name "$ROLE_NAME" --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  sleep 10  # IAM propagation
fi
aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name S3TtsInOut --policy-document "$(cat <<EOF
{"Version":"2012-10-17","Statement":[
 {"Effect":"Allow","Action":["s3:PutObject","s3:GetObject"],"Resource":"arn:aws:s3:::$BUCKET/$OUT_PREFIX*"},
 {"Effect":"Allow","Action":["s3:GetObject"],"Resource":"arn:aws:s3:::$BUCKET/$IN_PREFIX*"}]}
EOF
)"
ROLE_ARN=arn:aws:iam::$ACCOUNT:role/$ROLE_NAME

# --- function -----------------------------------------------------------------
ENV="Variables={OUTPUT_BUCKET=$BUCKET,OUTPUT_PREFIX=$OUT_PREFIX,HF_HOME=/opt/hf,HF_HUB_OFFLINE=1,TRANSFORMERS_OFFLINE=1}"
if aws lambda get-function --region "$REGION" --function-name "$FUNC" >/dev/null 2>&1; then
  aws lambda update-function-code --region "$REGION" --function-name "$FUNC" --image-uri "$IMAGE_URI" >/dev/null
  aws lambda wait function-updated-v2 --region "$REGION" --function-name "$FUNC"
  aws lambda update-function-configuration --region "$REGION" --function-name "$FUNC" \
    --memory-size "$MEMORY" --timeout 900 --ephemeral-storage Size=512 \
    --snap-start ApplyOn=PublishedVersions --environment "$ENV" >/dev/null
else
  aws lambda create-function --region "$REGION" --function-name "$FUNC" \
    --package-type Image --code ImageUri="$IMAGE_URI" --role "$ROLE_ARN" --architectures x86_64 \
    --memory-size "$MEMORY" --timeout 900 --ephemeral-storage Size=512 \
    --snap-start ApplyOn=PublishedVersions --environment "$ENV" \
    --description "Kokoro-82M open-source TTS (en/zh) for demo voiceovers" >/dev/null
  aws lambda wait function-active-v2 --region "$REGION" --function-name "$FUNC"
fi
aws lambda wait function-updated-v2 --region "$REGION" --function-name "$FUNC"

# --- SnapStart version + alias ------------------------------------------------
VERSION=$(aws lambda publish-version --region "$REGION" --function-name "$FUNC" --query Version --output text)
echo "published version $VERSION, waiting for SnapStart snapshot..."
aws lambda wait function-active-v2 --region "$REGION" --function-name "$FUNC:$VERSION"
until [ "$(aws lambda get-function-configuration --region "$REGION" --function-name "$FUNC:$VERSION" --query SnapStart.OptimizationStatus --output text)" = "On" ]; do sleep 15; done

if aws lambda get-alias --region "$REGION" --function-name "$FUNC" --name live >/dev/null 2>&1; then
  aws lambda update-alias --region "$REGION" --function-name "$FUNC" --name live --function-version "$VERSION" >/dev/null
else
  aws lambda create-alias --region "$REGION" --function-name "$FUNC" --name live --function-version "$VERSION" >/dev/null
fi
echo "alias live -> $FUNC:$VERSION (SnapStart On)"

# Old SnapStart versions keep incurring snapshot cache charges: delete all but the live one.
for v in $(aws lambda list-versions-by-function --region "$REGION" --function-name "$FUNC" --query 'Versions[?Version!=`$LATEST`].Version' --output text); do
  [ "$v" != "$VERSION" ] && aws lambda delete-function --region "$REGION" --function-name "$FUNC:$v" && echo "deleted old version $v"
done
