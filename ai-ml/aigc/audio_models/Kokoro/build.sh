#!/bin/bash
# Build the Kokoro TTS Lambda container image and push it to ECR.
# Run from this directory on any linux/amd64 host with Docker (an EC2 box is much faster than a laptop:
# the image pulls ~1GB of torch + model weights).
#
#   ACCOUNT=123456789012 REGION=us-east-1 ./build.sh
set -euo pipefail

ACCOUNT=${ACCOUNT:-$(aws sts get-caller-identity --query Account --output text)}
REGION=${REGION:-us-east-1}
REPO_NAME=${REPO_NAME:-kokoro-tts}
REGISTRY=$ACCOUNT.dkr.ecr.$REGION.amazonaws.com
REPO=$REGISTRY/$REPO_NAME

aws ecr describe-repositories --region "$REGION" --repository-names "$REPO_NAME" >/dev/null 2>&1 || \
  aws ecr create-repository --region "$REGION" --repository-name "$REPO_NAME" --image-scanning-configuration scanOnPush=true >/dev/null

aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY"
docker build --platform linux/amd64 -t "$REPO_NAME:latest" .
docker tag "$REPO_NAME:latest" "$REPO:latest"
docker push "$REPO:latest"

DIGEST=$(aws ecr describe-images --region "$REGION" --repository-name "$REPO_NAME" --image-ids imageTag=latest --query 'imageDetails[0].imageDigest' --output text)
echo "IMAGE_URI=$REPO@$DIGEST"
