#!/usr/bin/env bash
# Remove everything deploy.sh/run.sh created: running MicroVMs of the image, the image and
# all its versions, the artifact bucket contents and the CloudFormation stack.
#
# Usage: AWS_PROFILE=... ./scripts/teardown.sh --yes
set -euo pipefail
[[ "${1:-}" == "--yes" ]] || { echo "This deletes the MicroVM image, its MicroVMs, the bucket and the IAM roles. Re-run with --yes." >&2; exit 1; }

export AWS_REGION="${AWS_REGION:-us-east-1}"
STACK_NAME="${STACK_NAME:-dsh-kimi-microvm}"
IMAGE_NAME="${IMAGE_NAME:-dsh-kimi-k3}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

IMAGE_ARN="$(aws lambda-microvms list-microvm-images --query "items[?name=='${IMAGE_NAME}'].imageArn | [0]" --output text)"
if [[ -n "${IMAGE_ARN}" && "${IMAGE_ARN}" != "None" ]]; then
  for id in $(aws lambda-microvms list-microvms --query "items[?imageArn=='${IMAGE_ARN}' && state!='TERMINATED'].microvmId" --output text); do
    echo "terminate ${id}"; aws lambda-microvms terminate-microvm --microvm-identifier "${id}" >/dev/null || true
  done
  # delete-microvm-image removes every remaining version (the last version cannot be deleted on its own).
  echo "delete image ${IMAGE_ARN} (all versions)"; aws lambda-microvms delete-microvm-image --image-identifier "${IMAGE_ARN}" >/dev/null || true
fi

BUCKET="$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Outputs[?OutputKey=='ArtifactBucketName'].OutputValue" --output text 2>/dev/null || true)"
if [[ -n "${BUCKET}" && "${BUCKET}" != "None" ]]; then echo "empty s3://${BUCKET}"; aws s3 rm "s3://${BUCKET}" --recursive --only-show-errors; fi
echo "delete stack ${STACK_NAME}"
aws cloudformation delete-stack --stack-name "${STACK_NAME}"
aws cloudformation wait stack-delete-complete --stack-name "${STACK_NAME}"
rm -f "${HERE}/.microvm.env"
echo "done (CloudWatch log group /aws/lambda/microvms/${IMAGE_NAME} is kept; delete it by hand if unwanted)"
