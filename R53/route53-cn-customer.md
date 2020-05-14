## Feature Availability and Implementation Differences
https://docs.amazonaws.cn/en_us/aws/latest/userguide/route53.html

You can't use Route 53 to register domains. However, you can create a hosted zone in one of the China Regions for DNS service

You can't create alias records that route traffic to AWS resources outside the China Regions.

You can't create records that use the geoproximity routing policy. 

You can't use Route 53 Resolver to forward DNS queries from your VPCs to your on-promise network or from your on-promise network to your VPCs. But you can setup DNS forward on EC2 to complete the similar function

When creating alias records for Amazon CloudFront distribution, use the following hosted zone ID: Z3RFFRIM2A3IF5.

## [Offical guide](https://docs.amazonaws.cn/Route53/latest/DeveloperGuide/index.html)

## [Offical API guide](https://docs.amazonaws.cn/Route53/latest/APIReference/Welcome.html)

## Public Zone
```bash
aws route53 create-hosted-zone --name 91aws.club --endpoint-url https://route53.amazonaws.com.cn --caller-reference "20191113" --region cn-northwest-1 --profile cn-north-1
```

## Private Zone
```bash
aws route53 create-hosted-zone --name ruiliang-bjs.com --caller-reference "20191113-private" \
--hosted-zone-config Comment="Private-Zone-Ray-General-VPC",PrivateZone=true --vpc VPCRegion="cn-north-1",VPCId="vpc-0112fabfb0ed6e43b" \
--endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1
```

## list-hosted-zones
```bash
aws route53 list-hosted-zones --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1
```

## change-resource-record-sets
```bash
aws route53 change-resource-record-sets --hosted-zone-id Z0807456FWSN21W2TRAZ --change-batch file://ray-demo-tools-bjs.json --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1
```


## list-resource-record-sets
```bash
aws route53 list-resource-record-sets --hosted-zone-id Z0807456FWSN21W2TRAZ --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1
```

## alias target Test
1. Before you proceed, locate the HostedZoneId for Elastic Load Balancing, AWS Elastic Beanstalk, Amazon Simple Storage Service (Amazon S3), and Amazon CloudFront endpoints for each region.
[Route53 - Alias - target](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-route53-aliastarget.html)
[Region Endpoint](https://docs.amazonaws.cn/en_us/general/latest/gr/rande.html#cnnorth_region)
[Values for alias Route53 records](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-alias.html)

- CloudFront
Alias records for CloudFront can't be created in a private zone. So you need public zone.
```bash
aws route53 change-resource-record-sets --hosted-zone-id Z2LUYG0HCUTETD --change-batch file://cn-cloudfront-alias.json --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1
```

- NLB
```bash
aws route53 change-resource-record-sets --hosted-zone-id Z0807456FWSN21W2TRAZ --change-batch file://nlb-alias.json --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1

aws route53 list-resource-record-sets --hosted-zone-id Z0807456FWSN21W2TRAZ --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1
```

- ALB
```bash
aws route53 change-resource-record-sets --hosted-zone-id Z0807456FWSN21W2TRAZ --change-batch file://alb-alias.json --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1

aws route53 list-resource-record-sets --hosted-zone-id Z0807456FWSN21W2TRAZ --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1
```

- API Gateway
```bash
# Create CNAME in private Zone point to API GW private api domain
aws route53 change-resource-record-sets --hosted-zone-id Z0807456FWSN21W2TRAZ --change-batch file://apigw-privateapi-cname-bjs.json --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1

# Create VPCE alias in private Zone point to APIGW VPCE which used by private API
aws route53 change-resource-record-sets --hosted-zone-id Z0807456FWSN21W2TRAZ --change-batch file://apigw-privateapi-vpce-alias-bjs.json --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1

# create CNAME in private Zone point to API GW regional API domain
aws route53 change-resource-record-sets --hosted-zone-id Z0807456FWSN21W2TRAZ --change-batch file://apigw-regionalpi-cname-bjs.json --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1

# Create APIGW alias in private Zone with regional API - Not support
aws route53 change-resource-record-sets --hosted-zone-id Z0807456FWSN21W2TRAZ --change-batch file://apigw-alias-bjs.json --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1
An error occurred (NoSuchHostedZone) when calling the ChangeResourceRecordSets operation: The specified hosted zone does not exist.

aws route53 list-resource-record-sets --hosted-zone-id Z0807456FWSN21W2TRAZ --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1
```


## Testing private zone
```
[ec2-user@ray-demo-tools ~]$ dig ray-demo-tools.ruiliang-bjs.com

[ec2-user@ray-demo-tools ~]$ dig mqtt-broker-nlb.ruiliang-bjs.com
```

## Management
aws route53 list-traffic-policies --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1

# Monitoring
```bash
aws cloudwatch list-metrics --namespace "AWS/Route53" --region cn-northwest-1 --profile cn-north-1
aws cloudwatch get-metric-data --metric-data-queries file://private-zone-metric.json --start-time 2019-11-20T04:01:00Z --end-time 2019-11-26T14:07:00Z \
--endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1
```

## Query logs
```bash
aws logs describe-log-groups --log-group-name-prefix /aws/route53/china-preview --region cn-northwest-1 --profile cn-north-1
```

# Migrating a hosted zone to a different AWS account
[migration guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zones-migrating.html#hosted-zones-migrating-install-cli)

[3rd party tool](https://github.com/barnybug/cli53)