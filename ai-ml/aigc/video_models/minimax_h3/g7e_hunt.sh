#!/usr/bin/env bash
# Hunt for g7e capacity across regions/AZs and launch the first one that succeeds.
#
# g7e (RTX PRO 6000 Blackwell) capacity is scarce and fleeting: an AZ that accepts a launch can be
# empty 60 s later. This script cycles every AZ that offers the type, trying spot first (cheaper)
# and on-demand second, until a RunInstances call returns an instance id.
#
# Per region it resolves the DLAMI via SSM, the default-for-AZ subnet, and creates (or reuses) a
# security group that only admits your current public IP on ssh + the app ports.
#
# Portable to macOS bash 3.2 (no associative arrays).
#
# Usage:
#   ./g7e_hunt.sh                                  # g7e.12xlarge, spot then on-demand
#   TYPE=g7e.4xlarge ./g7e_hunt.sh
#   MARKETS="ondemand" ./g7e_hunt.sh               # on-demand only
#   REGIONS="us-east-1 us-east-2" ./g7e_hunt.sh
#   MAX_ROUNDS=0 ./g7e_hunt.sh                     # loop forever
#
# Output: writes "<instance-id> <region> <az> <market>" to $STATE_FILE on success.
#
# Companion: g7e_probe.sh (read-only capacity survey, terminates what it launches).
set -uo pipefail

export AWS_PROFILE=${AWS_PROFILE:-global_ruiliang}
TYPE=${TYPE:-g7e.12xlarge}
MARKETS=${MARKETS:-"spot ondemand"}
REGIONS=${REGIONS:-"us-east-1 us-east-2 us-west-2 eu-central-1"}
ROOT_GB=${ROOT_GB:-150}
MAX_ROUNDS=${MAX_ROUNDS:-40}          # 0 = forever
SLEEP=${SLEEP:-30}
SG_NAME=${SG_NAME:-minimax-h3-g7e}
NAME_TAG=${NAME_TAG:-minimax-h3-g7e}
PORTS=${PORTS:-"22 7860 30010 30030"}
STATE_FILE=${STATE_FILE:-/tmp/h3_instance}
# DLAMI Ubuntu 24.04 Base OSS NVIDIA driver: docker + nvidia toolkit, python3.12, NVMe at /opt/dlami/nvme
AMI_PARAM=/aws/service/deeplearning/ami/x86_64/base-oss-nvidia-driver-gpu-ubuntu-24.04/latest/ami-id

# EC2 key pair name per region (edit for your account).
key_for() {
  case $1 in
    us-east-1)    echo ruiliang-lab-key-pair-us-east1 ;;
    us-east-2)    echo ruiliang-keypair-us-east-2 ;;
    us-west-2)    echo ruiliang-key-pair-uswest2 ;;
    eu-central-1) echo ruiliang-lab-key-pair-eu-central-1 ;;
    *) echo "" ;;
  esac
}

# Per-region facts are cached in a temp dir as files (bash 3.2 has no associative arrays).
CACHE=$(mktemp -d /tmp/g7e_hunt.XXXXXX); trap 'rm -rf "$CACHE"' EXIT
cget() { cat "$CACHE/$1.$2" 2>/dev/null; }          # cget <region> <key>
cset() { printf '%s' "$3" > "$CACHE/$1.$2"; }        # cset <region> <key> <value>

MYIP=$(curl -s https://checkip.amazonaws.com)/32
echo "== hunting $TYPE  markets=[$MARKETS]  regions=[$REGIONS]  my_ip=$MYIP"

ensure_sg() {  # region vpc -> sg id
  local r=$1 vpc=$2 sg p perms=()
  sg=$(aws ec2 describe-security-groups --region "$r" --filters Name=group-name,Values="$SG_NAME" Name=vpc-id,Values="$vpc" \
        --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null)
  if [[ "$sg" != sg-* ]]; then
    sg=$(aws ec2 create-security-group --region "$r" --group-name "$SG_NAME" --vpc-id "$vpc" \
          --description "MiniMax-H3 g7e: ssh + web ui + sglang, owner IP only" --query GroupId --output text)
    for p in $PORTS; do perms+=("IpProtocol=tcp,FromPort=$p,ToPort=$p,IpRanges=[{CidrIp=$MYIP}]"); done
    aws ec2 authorize-security-group-ingress --region "$r" --group-id "$sg" --ip-permissions "${perms[@]}" >/dev/null
    aws ec2 create-tags --region "$r" --resources "$sg" --tags Key=Name,Value="$SG_NAME" >/dev/null
    echo "   created $sg in $r" >&2
  fi
  echo "$sg"
}

# Resolve per-region static facts once.
ACTIVE=""
for r in $REGIONS; do
  key=$(key_for "$r")
  [ -z "$key" ] && { echo "   $r: no key pair configured, skipping"; continue; }
  azs=$(aws ec2 describe-instance-type-offerings --region "$r" --location-type availability-zone \
        --filters Name=instance-type,Values="$TYPE" --query 'InstanceTypeOfferings[].Location' --output text 2>/dev/null)
  [ -z "$azs" ] && { echo "   $r: $TYPE not offered, skipping"; continue; }
  ami=$(aws ssm get-parameter --region "$r" --name "$AMI_PARAM" --query Parameter.Value --output text)
  vpc=$(aws ec2 describe-vpcs --region "$r" --filters Name=is-default,Values=true --query 'Vpcs[0].VpcId' --output text)
  sg=$(ensure_sg "$r" "$vpc")
  cset "$r" azs "$azs"; cset "$r" ami "$ami"; cset "$r" sg "$sg"; cset "$r" key "$key"
  for az in $azs; do
    sn=$(aws ec2 describe-subnets --region "$r" --filters Name=availability-zone,Values="$az" Name=default-for-az,Values=true \
          --query 'Subnets[0].SubnetId' --output text 2>/dev/null)
    [[ "$sn" == subnet-* ]] && cset "$r" "subnet.$az" "$sn"
  done
  ACTIVE="$ACTIVE $r"
  echo "   $r: azs=[$(echo $azs)] ami=$ami sg=$sg key=$key"
done
[ -z "$ACTIVE" ] && { echo "no usable region"; exit 1; }

round=0
while :; do
  round=$((round+1))
  for r in $ACTIVE; do
    for az in $(cget "$r" azs); do
      sn=$(cget "$r" "subnet.$az"); [ -z "$sn" ] && continue
      for market in $MARKETS; do
        mkt=()
        [ "$market" = spot ] && mkt=(--instance-market-options 'MarketType=spot,SpotOptions={SpotInstanceType=one-time,InstanceInterruptionBehavior=terminate}')
        out=$(aws ec2 run-instances --region "$r" --image-id "$(cget "$r" ami)" --instance-type "$TYPE" \
              --key-name "$(cget "$r" key)" --subnet-id "$sn" --security-group-ids "$(cget "$r" sg)" --associate-public-ip-address \
              ${mkt[@]+"${mkt[@]}"} \
              --block-device-mappings "[{\"DeviceName\":\"/dev/sda1\",\"Ebs\":{\"VolumeSize\":$ROOT_GB,\"VolumeType\":\"gp3\",\"DeleteOnTermination\":true}}]" \
              --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$NAME_TAG},{Key=Project,Value=minimax-h3}]" \
                                   "ResourceType=volume,Tags=[{Key=Name,Value=$NAME_TAG-root}]" \
              --query 'Instances[0].InstanceId' --output text 2>&1)
        ts=$(date -u +%H:%M:%S)
        if [[ "$out" == i-* ]]; then
          echo "[$ts r$round] $r $az $market  LAUNCHED $out"
          echo "$out $r $az $market" > "$STATE_FILE"
          exit 0
        elif grep -q InsufficientInstanceCapacity <<<"$out"; then
          echo "[$ts r$round] $r $az $market  no capacity"
        elif grep -q MaxSpotInstanceCountExceeded <<<"$out"; then
          echo "[$ts r$round] $r $az $market  SPOT QUOTA (stale request? check describe-spot-instance-requests)"
        else
          echo "[$ts r$round] $r $az $market  $(tr '\n' ' ' <<<"$out" | cut -c1-140)"
        fi
      done
    done
  done
  [ "$MAX_ROUNDS" -gt 0 ] && [ "$round" -ge "$MAX_ROUNDS" ] && { echo "gave up after $round rounds"; exit 1; }
  sleep "$SLEEP"
done
