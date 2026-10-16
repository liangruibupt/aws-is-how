# How can I use Systems Manager to manage private EC2 instances without internet access

## Setup
1. [Complete Session Manager prerequisites](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-prerequisites.html)

2. [Check IAM Role permission](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-instance-profile.html)

3. [Use AWS PrivateLink to set up a VPC endpoint for Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-privatelink.html)
More details please check [How do I create VPC endpoints so that I can use Systems Manager to manage private EC2 instances without internet access?](https://aws.amazon.com/premiumsupport/knowledge-center/ec2-systems-manager-vpc-endpoints/)
- allow HTTPS (port 443) in your security group to the following endpoints:
    - ec2messages.region.amazonaws.com
    - ssm.region.amazonaws.com
    - ssmmessages.region.amazonaws.com
- Setup the following endpoints:
    - ec2messages.region.amazonaws.com
    - ssm.region.amazonaws.com
    - ssmmessages.region.amazonaws.com

4. (Optional)[Advanced Setting up Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started.html)

## Case 1: Access from desktop which has public internent access
1. Test 1: without system manager VPC endpoints
```bash
aws ssm start-session --target i-05b2ebf1247a42411 \
    --region cn-north-1 --profile china_ruiliang
```

2. Test 2: with reginal system manager VPC endpoints
```bash
aws ssm start-session --target i-05b2ebf1247a42411 \
    --endpoint-url https://ssm.cn-north-1.amazonaws.com.cn \
    --region cn-north-1 --profile china_ruiliang
```

2. Test 3: with vpc specific system manager VPC endpoints
```bash
aws ssm start-session --target i-05b2ebf1247a42411 \
    --endpoint-url https://vpce-089232098842b279b-l8y4mfbc.ssm.cn-north-1.vpce.amazonaws.com.cn \
    --region cn-north-1 --profile china_ruiliang
```

## Case 2: Access from EC2 jump server which has public internent access (in public subnet or private subnet with NAT Gateway)
1. Test 1: without system manager VPC endpoints from EC2 in cn-north-1 to start session in the same region
```bash
aws ssm start-session --target i-05b2ebf1247a42411 \
    --region cn-north-1
```

2. Test 2: with reginal system manager VPC endpoints from EC2 in cn-north-1 to start session in the same region
```bash
aws ssm start-session --target i-05b2ebf1247a42411 \
    --endpoint-url https://ssm.cn-north-1.amazonaws.com.cn \
    --region cn-north-1
```

2. Test 3: with vpc specific system manager VPC endpoints from EC2 in cn-north-1 to start session in the same region
```bash
aws ssm start-session --target i-05b2ebf1247a42411 \
    --endpoint-url https://vpce-089232098842b279b-l8y4mfbc.ssm.cn-north-1.vpce.amazonaws.com.cn \
    --region cn-north-1
```


## Case 3: Access from EC2 jump server in other region which has public internent access (in public subnet or private subnet with NAT Gateway)
1. Setup the cross-region VPC peering

2. Test 1: with reginal system manager VPC endpoints from EC2 in cn-northwest-1 to start session in the cn-north-1
```bash
aws ssm start-session --target i-05b2ebf1247a42411 \
    --endpoint-url https://ssm.cn-north-1.amazonaws.com.cn \
    --region cn-north-1
```

3. Test 2: with vpc specific system manager VPC endpoints from EC2 in cn-northwest-1 to start session in the cn-north-1
```bash
aws ssm start-session --target i-05b2ebf1247a42411 \
    --endpoint-url https://vpce-089232098842b279b-l8y4mfbc.ssm.cn-north-1.vpce.amazonaws.com.cn \
    --region cn-north-1
```

## Case 3: Access from EC2 jump server in other region which has no public internect access (in private subnet without NAT Gateway)
1. Setup the cross-region VPC peering

2. Test 1: with reginal system manager VPC endpoints from EC2 in cn-northwest-1 to start session in the cn-north-1
```bash
aws ssm start-session --target i-05b2ebf1247a42411 \
    --endpoint-url https://ssm.cn-north-1.amazonaws.com.cn \
    --region cn-north-1

# ！！！ The Starting session with SessionId: i-085e0b5cb698035e5-009eec61ba3e991eb will be hang
```

3. Test 2: with vpc specific system manager VPC endpoints from EC2 in cn-northwest-1 to start session in the cn-north-1
```bash
aws ssm start-session --target i-05b2ebf1247a42411 \
    --endpoint-url https://vpce-089232098842b279b-l8y4mfbc.ssm.cn-north-1.vpce.amazonaws.com.cn \
    --region cn-north-1

# ！！！ The Starting session with SessionId: i-085e0b5cb698035e5-009eec61ba3e991eb will be hang
```

4. How to debug the issue of #2 and #3
```bash
#1 Check the VPC endpoint domain DNS resolution, we can find the  reginal system manager VPC endpoints is resolve to public IP address, 
# but there is no NAT for this subnet of testing EC2 
nslookup ssm.cn-north-1.amazonaws.com.cn
Server:		172.16.0.2
Address:	172.16.0.2#53

Non-authoritative answer:
Name:	ssm.cn-north-1.amazonaws.com.cn
Address: 54.222.20.96

#2 Check the VPC endpoint domain DNS resolution, we can find the VPC specific system manager VPC endpoints is resolve to private IP address in Beijing region
nslookup vpce-089232098842b279b-l8y4mfbc.ssm.cn-north-1.vpce.amazonaws.com.cn
Server:		172.16.0.2
Address:	172.16.0.2#53

Non-authoritative answer:
Name:	vpce-089232098842b279b-l8y4mfbc.ssm.cn-north-1.vpce.amazonaws.com.cn
Address: 172.31.73.162
Name:	vpce-089232098842b279b-l8y4mfbc.ssm.cn-north-1.vpce.amazonaws.com.cn
Address: 172.31.33.66
```

5. How to resolve the issue
- Setup the NAT or Setup the proxy with public internet access
- Setup the R53 resolver inbound endpoint in cn-north-1 and  R53 resolver outbound endpoint in cn-northwest-1. Resolve all cn-north-1.amazonaws.com.cn query from cn-northwest-1 to the R53 resolver outbound endpoint.