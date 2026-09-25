#!/bin/bash
REPO_NAMESPACE=${REPO_NAMESPACE:-"sagemaker_endpoint/llama.cpp"}
REPO_TAG="server-cuda"

# Get the ACCOUNT and REGION defined in the current configuration (default to us-west-2 if none defined)

ACCOUNT=${ACCOUNT:-$(aws sts get-caller-identity --query Account --output text)}
region=$(aws configure get region 2>/dev/null)
if [ -z "$region" ]; then
    region=$AWS_REGION
fi

if [ -z "$region" ]; then
    region=$AWS_DEFAULT_REGION
fi

if [ -z "$region" ]; then
    region=$(curl -s --connect-timeout 1 http://169.254.169.254/latest/meta-data/placement/region 2>/dev/null)
fi

echo $region

REGION=$region

# If the repository doesn't exist in ECR, create it.
aws ecr describe-repositories --repository-names "${REPO_NAMESPACE}" > /dev/null 2>&1
if [ $? -ne 0 ]
then
echo "create repository:" "${REPO_NAMESPACE}"
aws ecr create-repository --repository-name "${REPO_NAMESPACE}" > /dev/null
fi

# Log into Docker
if [[ "$REGION" = cn* ]]; then
    aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com.cn
    REPO_NAME="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com.cn/${REPO_NAMESPACE}:${REPO_TAG}"
else
    aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com
    REPO_NAME="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAMESPACE}:${REPO_TAG}"
fi

echo ${REPO_NAME}

# Build docker
docker build --network sagemaker -t ${REPO_NAMESPACE}:${REPO_TAG} .

# Push it
docker tag ${REPO_NAMESPACE}:${REPO_TAG} ${REPO_NAME}
docker push ${REPO_NAME}
