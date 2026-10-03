#!/bin/bash
# Build the Kokoro TTS Lambda container image for arm64 (Graviton) and push to ECR.
# Run on an arm64 host with Docker (no cross-emulation needed) — e.g. a Graviton EC2.
#
#   ACCOUNT=123456789012 REGION=us-east-1 ./build-arm64.sh
#
# IMPORTANT: Lambda rejects OCI image manifests ("image manifest ... is not supported").
# buildx defaults to OCI, so we force the Docker v2 schema-2 manifest with
# `--provenance=false --output type=docker`. This is the only difference from build.sh
# besides the arm64 platform + Dockerfile.arm64.
set -euo pipefail

ACCOUNT=${ACCOUNT:-$(aws sts get-caller-identity --query Account --output text)}
REGION=${REGION:-us-east-1}
REPO_NAME=${REPO_NAME:-kokoro-tts}
REGISTRY=$ACCOUNT.dkr.ecr.$REGION.amazonaws.com
REPO=$REGISTRY/$REPO_NAME

aws ecr describe-repositories --region "$REGION" --repository-names "$REPO_NAME" >/dev/null 2>&1 || \
  aws ecr create-repository --region "$REGION" --repository-name "$REPO_NAME" --image-scanning-configuration scanOnPush=true >/dev/null

aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY"

# Build arm64, Docker v2 manifest (NOT OCI), load into the local docker image store.
docker buildx build --platform linux/arm64 --provenance=false \
  --output type=docker,name="$REPO_NAME:latest" -f Dockerfile.arm64 -t "$REPO_NAME:latest" .

docker tag "$REPO_NAME:latest" "$REPO:latest"
docker push "$REPO:latest"

DIGEST=$(aws ecr describe-images --region "$REGION" --repository-name "$REPO_NAME" --image-ids imageTag=latest --query 'imageDetails[0].imageDigest' --output text)
echo "IMAGE_URI=$REPO@$DIGEST"
