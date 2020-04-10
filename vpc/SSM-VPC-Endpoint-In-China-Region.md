# Question: The customer have a private subnet without NAT and want to use ssm vpc endpoint to connected to SSM service.

Following the below link to create the Systems Manager (SSM) VPC endpoint
[Create a VPC endpoint](https://docs.amazonaws.cn/systems-manager/latest/userguide/setup-create-vpc.html)
[Use Systems Manager to manage private EC2 instances without internet access](https://aws.amazon.com/premiumsupport/knowledge-center/ec2-systems-manager-vpc-endpoints/)

1. For Beijing region, here is 4 endpoint need to be created
    1. cn.com.amazonaws.cn-north-1.ec2
    2. com.amazonaws.cn-north-1.ec2messages
    3. com.amazonaws.cn-north-1.ssm
    4. com.amazonaws.cn-north-1.ssm

2. Check the Security Group of the vpc endpoint, open required traffic port 443 pass in outbound and inbound
3. Launch a instance in cn-north-1 with Full acess of SSM (IAM role) (I tested the official AMI of Amazon Linux and Windows AMI)
4. Wait 5-10 minutes for EC2 become available and check whether it could be find in the managed console of SSM
5. If Failed to found it. Please attach the volume to another instance and check the log /var/log/amazon/ssm/amazon-ssm-agent.log
6. Verify:
```bash
[ec2-user@ip-10-0-7-101 ~]$ curl www.baidu.com -m 5
curl: (28) Connection timed out after 5001 milliseconds

[ec2-user@ip-10-0-7-101 ~]$ aws ssm describe-instance-information --filters "Key=InstanceIds,Values=i-093bd00d9abb8b515" \
>     --region cn-north-1 --output table
-----------------------------------------------
|         DescribeInstanceInformation         |
+---------------------------------------------+
||          InstanceInformationList          ||
|+-------------------+-----------------------+|
||  AgentVersion     |  2.3.714.0            ||
||  ComputerName     |  ray-demo-tools       ||
||  IPAddress        |  10.0.1.91            ||
||  InstanceId       |  i-093bd00d9abb8b515  ||
||  IsLatestVersion  |  False                ||
||  LastPingDateTime |  1583899140.89        ||
||  PingStatus       |  Online               ||
||  PlatformName     |  Amazon Linux         ||
||  PlatformType     |  Linux                ||
||  PlatformVersion  |  2                    ||
||  ResourceType     |  EC2Instance          ||
|+-------------------+-----------------------+|
```