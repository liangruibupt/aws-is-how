# Question: Access AWS CLI and Boto3 API In Private Subnet Without NAT

Solution: 
1. Create the VPC endpoint for your services
2. Check the Security Group of the vpc endpoint, Open required traffic port 443 pass in outbound and inbound
3. When use the AWS CLI and Boto3 API, please specify the region as the same EC2 running.
4. Testing

- EC2 endpoint cn.com.amazonaws.cn-north-1.ec2
```bash
aws ec2 describe-instances --filter Name=instance-state-name,Values=running \
--query "Reservations[*].Instances[*].{Instance:InstanceId,AZ:Placement.AvailabilityZone,Name:Tags[?Key=='Name']|[0].Value}" \
--output table --region cn-north-1
```

- Cloudformation endpoint: cn.com.amazonaws.cn-north-1.cloudformation
```bash
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE --region cn-north-1 --output table
```

- DynamoDB endpoint: com.amazonaws.cn-north-1.dynamodb
```bash
aws dynamodb list-tables --region cn-north-1
```

- S3 endpoint: com.amazonaws.cn-north-1.s3

- API Gateway endpoint: cn.com.amazonaws.cn-north-1.execute-api

- Screte Manager endpoint: com.amazonaws.cn-north-1.secretsmanager