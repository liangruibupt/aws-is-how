#!/bin/bash
# arm64 (Graviton) + NO SnapStart deploy of the kokoro-tts Lambda.
# Invoke the bare function name (= $LATEST). Near-zero idle cost; ~50 s (first-ever
# a few minutes while the ~1 GB image is pulled) cold start — fine for batch voiceover.
# For the ~9 s warm/SnapStart path and its ~$20+/month snapshot cost, use deploy.sh instead.
#
#   IMAGE_URI=<from build-arm64.sh> BUCKET=my-bucket ./deploy-arm64.sh
set -euo pipefail
: "${IMAGE_URI:?set IMAGE_URI (with @sha256 digest) from build-arm64.sh}"
: "${BUCKET:?set BUCKET to the S3 bucket that receives audio output}"
REGION=${REGION:-us-east-1}
FUNC=${FUNC:-kokoro-tts}
ROLE_NAME=${ROLE_NAME:-KokoroTTS-LambdaRole}
MEMORY=${MEMORY:-6144}
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
# NOTE: the caller principal needs iam:PassRole on this role to lambda.amazonaws.com.
aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name S3TtsInOut --policy-document "$(cat <<EOF
{"Version":"2012-10-17","Statement":[
 {"Effect":"Allow","Action":["s3:PutObject","s3:GetObject"],"Resource":"arn:aws:s3:::$BUCKET/$OUT_PREFIX*"},
 {"Effect":"Allow","Action":["s3:GetObject"],"Resource":"arn:aws:s3:::$BUCKET/$IN_PREFIX*"}]}
EOF
)"
ROLE_ARN=arn:aws:iam::$ACCOUNT:role/$ROLE_NAME

# --- function (arm64, no SnapStart) -------------------------------------------
ENV="Variables={OUTPUT_BUCKET=$BUCKET,OUTPUT_PREFIX=$OUT_PREFIX,HF_HOME=/opt/hf,HF_HUB_OFFLINE=1,TRANSFORMERS_OFFLINE=1}"
if aws lambda get-function --region "$REGION" --function-name "$FUNC" >/dev/null 2>&1; then
  aws lambda update-function-code --region "$REGION" --function-name "$FUNC" --image-uri "$IMAGE_URI" >/dev/null
  aws lambda wait function-updated-v2 --region "$REGION" --function-name "$FUNC"
  aws lambda update-function-configuration --region "$REGION" --function-name "$FUNC" \
    --memory-size "$MEMORY" --timeout 900 --ephemeral-storage Size=512 --environment "$ENV" >/dev/null
else
  aws lambda create-function --region "$REGION" --function-name "$FUNC" \
    --package-type Image --code ImageUri="$IMAGE_URI" --role "$ROLE_ARN" --architectures arm64 \
    --memory-size "$MEMORY" --timeout 900 --ephemeral-storage Size=512 --environment "$ENV" \
    --description "Kokoro-82M open-source TTS (en/zh), arm64, no SnapStart" >/dev/null
  aws lambda wait function-active-v2 --region "$REGION" --function-name "$FUNC"
fi
aws lambda wait function-updated-v2 --region "$REGION" --function-name "$FUNC"
echo "DEPLOYED $FUNC (arm64, \$LATEST, no SnapStart) in $REGION"
echo "Invoke with the bare function name (NOT :live):"
echo "  aws lambda invoke --region $REGION --function-name $FUNC --cli-binary-format raw-in-base64-out --cli-read-timeout 900 --payload '{\"text\":\"...\",\"voice\":\"zm_yunjian\",\"format\":\"mp3\"}' out.json"
