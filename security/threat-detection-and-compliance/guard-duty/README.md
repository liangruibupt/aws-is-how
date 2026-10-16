# Guarduty

Amazon GuardDuty is a continuous security monitoring service that analyzes and processes the following Data sources: 

- VPC Flow Logs, 
- AWS CloudTrail management event logs, 
- Cloudtrail S3 data event logs, 
- NS logs.

It uses threat intelligence feeds, such as lists of malicious IP addresses and domains, and machine learning to identify unexpected and potentially unauthorized and malicious activity within your AWS environment. This can include issues like escalations of privileges, uses of exposed credentials, or communication with malicious IP addresses, or domains.

[Official Guide](https://docs.aws.amazon.com/guardduty/latest/ug/what-is-guardduty.html)

# Tester

Simulate attacks, and generate GuardDuty Findings. The [original github repo](https://github.com/awslabs/amazon-guardduty-tester)

1. Create a new CloudFormation stack using [China region guardduty tester template](scripts/guardduty-tester-cn.json) or [Global region guardduty tester template](https://github.com/awslabs/amazon-guardduty-tester/blob/master/guardduty-tester.template)

2. From CloudFormation Output get the BastionIp and RedTeamIp
- SSH to Bastion with BastionIp
```bash
ssh -A ec2-user@BastionIp
```
- SSH from Bastion to Tester with RedTeamIp
```bash
ssh RedTeamIp
```

3. Run guardduty_tester.sh 

The script initiate interaction between your tester and target EC2 instances, simulate attacks, and generate GuardDuty Findings.

```bash
./guardduty_tester.sh

Expected GuardDuty Findings

Test 1: Internal Port Scanning
Expected Finding: EC2 Instance  i-0e7429207648a432c  is performing outbound port scans against remote host. 172.16.0.20
Finding Type: Recon:EC2/Portscan

Test 2: SSH Brute Force with Compromised Keys
Expecting two findings - one for the outbound and one for the inbound detection
Outbound:  i-0e7429207648a432c  is performing SSH brute force attacks against  172.16.0.20
Inbound:  172.16.0.23  is performing SSH brute force attacks against  i-0d1ff33279f43d9a0
Finding Type: UnauthorizedAccess:EC2/SSHBruteForce

Test 3: RDP Brute Force with Password List
Expecting two findings - one for the outbound and one for the inbound detection
Outbound:  i-0e7429207648a432c  is performing RDP brute force attacks against  172.16.0.29
Inbound:  172.16.0.23  is performing RDP brute force attacks against  i-0bfe47df871898d7f
Finding Type : UnauthorizedAccess:EC2/RDPBruteForce

Test 4: Cryptocurrency Activity
Expected Finding: EC2 Instance  i-0e7429207648a432c  is querying a domain name that is associated with bitcoin activity
Finding Type : CryptoCurrency:EC2/BitcoinTool.B!DNS

Test 5: DNS Exfiltration
Expected Finding: EC2 instance  i-0e7429207648a432c  is attempting to query domain names that resemble exfiltrated data
Finding Type : Backdoor:EC2/DNSDataExfiltration

Test 6: C&C Activity
Expected Finding: EC2 instance  i-0e7429207648a432c  is querying a domain name associated with a known Command & Control server.
Finding Type : Backdoor:EC2/C&CActivity.B!DNS
```

4. Check the GuardDuty Findings

Waite 10 minutes to check the expected findings

5. cleanup

Delete the CloudFormation Stack

# Trouble Shooting for findings
1. UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration for my Amazon EC2 instance

Resolution link: https://aws.amazon.com/premiumsupport/knowledge-center/resolve-guardduty-credential-alerts/