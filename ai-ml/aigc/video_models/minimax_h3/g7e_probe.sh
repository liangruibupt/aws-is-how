#!/usr/bin/env bash
# Probe real g7e.12xlarge capacity (spot + on-demand) by attempting a launch and terminating on success.
export AWS_PROFILE=global_ruiliang
TYPE=${TYPE:-g7e.12xlarge}
for r in us-east-1 us-west-2 eu-central-1 us-east-2 ap-northeast-1; do
  azs=$(aws ec2 describe-instance-type-offerings --region $r --location-type availability-zone \
        --filters Name=instance-type,Values=$TYPE --query 'InstanceTypeOfferings[].Location' --output text 2>/dev/null)
  [ -z "$azs" ] && { echo "$r: $TYPE not offered"; continue; }
  ami=$(aws ssm get-parameter --region $r --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 --query Parameter.Value --output text 2>/dev/null)
  for az in $azs; do
    sn=$(aws ec2 describe-subnets --region $r --filters Name=availability-zone,Values=$az Name=default-for-az,Values=true --query 'Subnets[0].SubnetId' --output text 2>/dev/null)
    [[ "$sn" != subnet-* ]] && { printf '%-14s %-16s %s\n' "$r" "$az" "no default subnet"; continue; }
    for market in spot ondemand; do
      mkt=(); [ $market = spot ] && mkt=(--instance-market-options 'MarketType=spot,SpotOptions={SpotInstanceType=one-time}')
      out=$(aws ec2 run-instances --region $r --image-id $ami --instance-type $TYPE --subnet-id $sn --count 1 "${mkt[@]}" \
            --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=g7e-capacity-probe}]' \
            --query 'Instances[0].InstanceId' --output text 2>&1)
      if [[ "$out" == i-* ]]; then
        printf '%-14s %-16s %-9s %s\n' "$r" "$az" "$market" "CAPACITY OK ($out) -> terminated"
        aws ec2 terminate-instances --region $r --instance-ids $out >/dev/null
      elif grep -q InsufficientInstanceCapacity <<<"$out"; then
        printf '%-14s %-16s %-9s %s\n' "$r" "$az" "$market" "no capacity"
      elif grep -qE 'MaxSpotInstanceCountExceeded|VcpuLimitExceeded' <<<"$out"; then
        printf '%-14s %-16s %-9s %s\n' "$r" "$az" "$market" "QUOTA (capacity exists)"
      else
        printf '%-14s %-16s %-9s %s\n' "$r" "$az" "$market" "$(tr '\n' ' ' <<<"$out" | cut -c1-120)"
      fi
    done
  done
done
