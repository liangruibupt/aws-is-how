#!/usr/bin/env bash
# Deploy the infrastructure stack and build (or rebuild) the MicroVM image.
#
#   1. CloudFormation: artifact bucket, build role, execution role (infra.yaml)
#   2. Zip microvm-image/ (Dockerfile at the archive root) and upload it to S3
#   3. create-microvm-image the first time, update-microvm-image (= new version) after that
#   4. Wait until the new image version is SUCCESSFUL
#
# Usage: AWS_PROFILE=... ./scripts/deploy.sh
# Env:   AWS_REGION (us-east-1)  STACK_NAME (dsh-kimi-microvm)  IMAGE_NAME (dsh-kimi-k3)
#        MEMORY_MIB (4096)
set -euo pipefail

export AWS_REGION="${AWS_REGION:-us-east-1}"
STACK_NAME="${STACK_NAME:-dsh-kimi-microvm}"
IMAGE_NAME="${IMAGE_NAME:-dsh-kimi-k3}"
MEMORY_MIB="${MEMORY_MIB:-4096}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

aws lambda-microvms help >/dev/null 2>&1 || { echo "AWS CLI has no lambda-microvms commands; upgrade AWS CLI v2." >&2; exit 1; }
echo "Account: $(aws sts get-caller-identity --query Account --output text)  Region: ${AWS_REGION}"

echo "==> [1/4] CloudFormation stack ${STACK_NAME}"
aws cloudformation deploy --stack-name "${STACK_NAME}" --template-file "${HERE}/infra.yaml" \
  --capabilities CAPABILITY_NAMED_IAM --parameter-overrides "ImageName=${IMAGE_NAME}" --no-fail-on-empty-changeset
out() { aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text; }
BUCKET="$(out ArtifactBucketName)"
BUILD_ROLE_ARN="$(out BuildRoleArn)"

echo "==> [2/4] Package and upload microvm-image/"
TS="$(date +%Y%m%d-%H%M%S)"
KEY="images/${IMAGE_NAME}-${TS}.zip"
TMP="$(mktemp -d)"; trap 'rm -rf "${TMP}"' EXIT
( cd "${HERE}/microvm-image" && zip -qr "${TMP}/app.zip" . -x 'sidecar/node_modules/*' '*.DS_Store' )
aws s3 cp "${TMP}/app.zip" "s3://${BUCKET}/${KEY}" --only-show-errors
echo "    s3://${BUCKET}/${KEY} ($(du -h "${TMP}/app.zip" | cut -f1))"

BASE_IMAGE_ARN="${BASE_IMAGE_ARN:-$(aws lambda-microvms list-managed-microvm-images --query 'items[0].imageArn' --output text)}"
# /ready answers 503 until `dsh web` has booted, so the snapshot holds a warm harness.
# /validate runs against the restored snapshot so Lambda can learn which pages to prefetch.
HOOKS='{"port":9000,
  "microvmImageHooks":{"ready":"ENABLED","readyTimeoutInSeconds":600,"validate":"ENABLED","validateTimeoutInSeconds":300},
  "microvmHooks":{"run":"ENABLED","runTimeoutInSeconds":30,"resume":"ENABLED","resumeTimeoutInSeconds":10,
                  "suspend":"ENABLED","suspendTimeoutInSeconds":10,"terminate":"ENABLED","terminateTimeoutInSeconds":10}}'
COMMON=(--base-image-arn "${BASE_IMAGE_ARN}" --build-role-arn "${BUILD_ROLE_ARN}"
  --code-artifact "{\"uri\":\"s3://${BUCKET}/${KEY}\"}"
  --cpu-configurations '[{"architecture":"ARM_64"}]'
  --resources "[{\"minimumMemoryInMiB\":${MEMORY_MIB}}]"
  # ALL: CAP_NET_ADMIN for the uid policy-routing rule that fences IMDS off from the agent.
  --additional-os-capabilities '["ALL"]'
  --hooks "${HOOKS}"
  --logging "{\"cloudWatch\":{\"logGroup\":\"/aws/lambda/microvms/${IMAGE_NAME}\"}}")

echo "==> [3/4] Build MicroVM image ${IMAGE_NAME} (base ${BASE_IMAGE_ARN})"
IMAGE_ARN="$(aws lambda-microvms list-microvm-images --query "items[?name=='${IMAGE_NAME}'].imageArn | [0]" --output text)"
if [[ -z "${IMAGE_ARN}" || "${IMAGE_ARN}" == "None" ]]; then
  IMAGE_ARN="$(aws lambda-microvms create-microvm-image --name "${IMAGE_NAME}" \
    --description "DeepSeek Harness + Kimi K3 on Bedrock" "${COMMON[@]}" --query imageArn --output text)"
else
  aws lambda-microvms update-microvm-image --image-identifier "${IMAGE_ARN}" "${COMMON[@]}" >/dev/null
fi
echo "    ${IMAGE_ARN}"

echo "==> [4/4] Waiting for the new version (logs: /aws/lambda/microvms/${IMAGE_NAME})"
sleep 15
while true; do
  read -r VERSION STATE <<<"$(aws lambda-microvms list-microvm-image-versions --image-identifier "${IMAGE_ARN}" \
    --query 'sort_by(items,&createdAt)[-1].[imageVersion,state]' --output text)"
  echo "    $(date +%H:%M:%S) version ${VERSION}: ${STATE}"
  case "${STATE}" in
    SUCCESSFUL) break ;;
    FAILED) aws lambda-microvms list-microvm-image-builds --image-identifier "${IMAGE_ARN}" --image-version "${VERSION}" \
              --query 'items[].[state,stateReason]' --output text >&2; exit 1 ;;
  esac
  sleep 30
done
echo "Image ready: ${IMAGE_ARN} version ${VERSION}"
echo "Next: ./scripts/run.sh"
