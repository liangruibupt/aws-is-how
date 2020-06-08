# Route 53 quick start

## Feature Availability and Implementation Differences

中国区和海外区Route53的功能区别

https://docs.amazonaws.cn/en_us/aws/latest/userguide/route53.html

You can't use Route 53 to register domains. However, you can create a hosted zone in one of the China Regions for DNS service

You can't create alias records that route traffic to AWS resources outside the China Regions.

You can't create records that use the geoproximity routing policy. 

You can't use Route 53 Resolver to forward DNS queries from your VPCs to your on-promise network or from your on-promise network to your VPCs. But you can setup DNS forward on EC2 to complete the similar function

When creating alias records for Amazon CloudFront distribution, use the following hosted zone ID: Z3RFFRIM2A3IF5.

[Offical guide](https://docs.amazonaws.cn/Route53/latest/DeveloperGuide/index.html)

[Offical API guide](https://docs.amazonaws.cn/Route53/latest/APIReference/Welcome.html)

## How to create Public Hosted Zone?
如何创建 Public Hosted Zone

```bash
aws route53 create-hosted-zone --name 91aws.club --endpoint-url https://route53.amazonaws.com.cn --caller-reference "20191113" --region cn-northwest-1 --profile cn-north-1
```

## How to create Private Hosted Zone?
如何创建 Private Hosted Zone

1. Create
```bash
aws route53 create-hosted-zone --name ruiliang-bjs.com --caller-reference "20191113-private" \
--hosted-zone-config Comment="Private-Zone-Ray-General-VPC",PrivateZone=true --vpc VPCRegion="cn-north-1",VPCId="vpc-0112fabfb0ed6e43b" \
--endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1
```

2. associate Private Zone to more VPCs in the same region
```bash
aws route53 associate-vpc-with-hosted-zone --hosted-zone-id $YOUR_ZONE_ID  \
--vpc VPCRegion=$AWS_REGION,VPCId=$vpc_2 \
--endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1
```

3. 测试 private zone
```
[ec2-user@ray-demo-tools ~]$ dig ray-demo-tools.ruiliang-bjs.com

[ec2-user@ray-demo-tools ~]$ dig mqtt-broker-nlb.ruiliang-bjs.com
```

## 如何列出 Hosted Zone？
list-hosted-zones
```bash
aws route53 list-hosted-zones --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1
```

## 如何添加解析记录？
How to create records
```bash
aws route53 change-resource-record-sets --hosted-zone-id Z0807456FWSN21W2TRAZ --change-batch file://ray-demo-tools-bjs.json --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1
```

## 如何列出解析记录
How to list resource record?
```bash
aws route53 list-resource-record-sets --hosted-zone-id Z0807456FWSN21W2TRAZ --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1
```

## 如何创建Alias?
[How-to-create-alias](How-to-create-alias.md)

## 常见管理任务
1. 使用流量路由DNS流量

  [Using traffic flow to route DNS traffic](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/traffic-flow.html)

```bash
aws route53 list-traffic-policies --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1
```

2. 如何监控？

Monitoring

You need first enable the Health Check on Route53

```bash
aws cloudwatch list-metrics --namespace "AWS/Route53" --region cn-northwest-1 --profile cn-north-1
aws cloudwatch get-metric-data --metric-data-queries file://private-zone-metric.json --start-time 2019-11-20T04:01:00Z --end-time 2019-11-26T14:07:00Z \
--endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1
```

3. 如何获取查询日志？

Query logs

```bash
aws logs describe-log-groups --log-group-name-prefix /aws/route53/china-preview --region cn-northwest-1 --profile cn-north-1
```

# 常见问题  FAQ 

[请访问 - Click me](route53-cn-FAQ.md)