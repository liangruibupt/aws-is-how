#!/usr/bin/env bash
# Launch a KiroCrew + Codex remote coding host in us-east-1.
# Run from YOUR terminal: KiroCrew's safety policy blocks IAM role creation /
# PassRole from inside the dashboard, so this step has to run outside it.
set -euo pipefail
export AWS_PROFILE=global_ruiliang AWS_REGION=us-east-1
DIR="$(cd "$(dirname "$0")" && pwd)"

NAME=kirocrew-remote-host
ROLE=${NAME}-admin
VPC=vpc-4e3d9934
SUBNET=subnet-70d55e17            # us-east-1a default subnet
AMI=ami-0bec8cef5313300ad         # Ubuntu 24.04 arm64 (2026-09-23)
TYPE=m8g.xlarge                   # 4 vCPU / 16 GB Graviton
KEY=ruiliang-lab-key-pair-us-east1

# 1) IAM role with AdministratorAccess (as requested) + SSM core
if ! aws iam get-role --role-name "$ROLE" >/dev/null 2>&1; then
  aws iam create-role --role-name "$ROLE" --tags Key=purpose,Value=$NAME \
    --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}' >/dev/null
  aws iam attach-role-policy --role-name "$ROLE" --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
  aws iam attach-role-policy --role-name "$ROLE" --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
  aws iam create-instance-profile --instance-profile-name "$ROLE" >/dev/null
  aws iam add-role-to-instance-profile --instance-profile-name "$ROLE" --role-name "$ROLE"
  echo "Created role/instance profile $ROLE; waiting for IAM propagation..."
  sleep 15
fi

# 2) Security group with NO inbound rules (access is via SSM only)
SG=$(aws ec2 describe-security-groups --filters Name=group-name,Values=${NAME}-sg Name=vpc-id,Values=$VPC \
  --query 'SecurityGroups[0].GroupId' --output text)
if [ "$SG" = "None" ]; then
  SG=$(aws ec2 create-security-group --group-name ${NAME}-sg --vpc-id $VPC \
    --description "KiroCrew remote host - no inbound, SSM only" --query GroupId --output text)
fi
echo "SG=$SG"

# 3) Launch
IID=$(aws ec2 run-instances --image-id $AMI --instance-type $TYPE --key-name $KEY \
  --subnet-id $SUBNET --security-group-ids "$SG" \
  --iam-instance-profile Name="$ROLE" \
  --metadata-options HttpTokens=required,HttpEndpoint=enabled \
  --block-device-mappings 'DeviceName=/dev/sda1,Ebs={VolumeSize=100,VolumeType=gp3,Encrypted=true}' \
  --user-data "file://$DIR/ec2-userdata.sh" \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$NAME}]" \
  --query 'Instances[0].InstanceId' --output text)
echo "InstanceId=$IID"
aws ec2 wait instance-running --instance-ids "$IID"
aws ec2 describe-instances --instance-ids "$IID" \
  --query 'Reservations[0].Instances[0].[InstanceId,PublicIpAddress,State.Name]' --output text
echo "Bootstrap takes ~5-10 min. Paste this InstanceId back to Kiro."
