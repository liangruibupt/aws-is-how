# How to get the IP address under my account

## NetworkInterface - is included all the resources with IP address
1. [describe-network-interfaces](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-network-interfaces.html)
2. CLI sample
```bash
aws ec2 describe-network-interfaces \
    --query "NetworkInterfaces[*].{Vpc:VpcId,eni:NetworkInterfaceId,PrivateIp:PrivateIpAddresses[*].PrivateIpAddress,publicIP:PrivateIpAddresses[*].Association.PublicIp}" \
    --output table --region cn-north-1 --profile china_ruiliang
```

## EC2 - is specific only for EC2
1. [describe-instances](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html)
2. CLI sample
```bash
aws ec2 describe-instances \
    --query "Reservations[*].Instances[*].{Instance:InstanceId,PrivateIp:PrivateIpAddress,PublicIp:PublicIpAddress}" \
    --output table --region cn-north-1 --profile china_ruiliang
```
