# Route 53 Hosted Zones & Records (China Region)

在中国区用 CLI / SDK 创建和管理 Public / Private Hosted Zone、解析记录、Alias 记录，以及流量策略、监控和查询日志等常见管理任务。

## Docs

- [How-to-create-alias](How-to-create-alias.md)：Alias 目标 HostedZoneId 的查找方法，用 CLI 创建 CloudFront / NLB / ALB / API Gateway 的 Alias 和 CNAME 记录，附北京 / 宁夏 API Gateway 的 Hosted Zone ID

## Records

`change-resource-record-sets --change-batch file://xxx.json` 用到的记录文件，和 How-to-create-alias.md 放在同一目录：

- [alb-alias.json](alb-alias.json)：A 记录 Alias，指向宁夏区 ALB（web-app-fargate-alb）
- [nlb-alias.json](nlb-alias.json)：A 记录 Alias，指向北京区 NLB（API Gateway VPC Link 用的私有 NLB）
- [apigw-privateapi-cname-bjs.json](apigw-privateapi-cname-bjs.json)：CNAME，指向北京区 API Gateway Private API 的 execute-api 域名
- [apigw-privateapi-vpce-alias-bjs.json](apigw-privateapi-vpce-alias-bjs.json)：A 记录 Alias，指向 Private API 使用的 API Gateway 接口 VPC Endpoint DNS 名
- [apigw-regionalpi-cname-bjs.json](apigw-regionalpi-cname-bjs.json)：UPSERT CNAME，指向 API Gateway 自定义域名的 regional 目标域名（d-xxx.execute-api）
- [apigw-alias-bjs.json](apigw-alias-bjs.json)：A 记录 Alias，指向 API Gateway Regional 自定义域名（北京区 Hosted Zone ID Z3N456W6CBMXJZ）

注：How-to-create-alias.md 中引用的 `cn-cloudfront-alias.json`，以及下文引用的 `ray-demo-tools-bjs.json`、`private-zone-metric.json` 不在仓库中，需要自行准备。

## Scripts

- [scripts/route53-demo.go](scripts/route53-demo.go)：Go SDK（aws-sdk-go v1）连接中国区 Route 53 endpoint，调用 GetHostedZone 并按错误码处理异常

## CLI Quick Start

### How to create Public Hosted Zone?
如何创建 Public Hosted Zone

```bash
aws route53 create-hosted-zone --name 91aws.club --endpoint-url https://route53.amazonaws.com.cn --caller-reference "20191113" --region cn-northwest-1 --profile cn-north-1
```

### How to create Private Hosted Zone?
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

### 如何列出 Hosted Zone？
list-hosted-zones
```bash
aws route53 list-hosted-zones --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1
```

### 如何添加解析记录？
How to create records
```bash
aws route53 change-resource-record-sets --hosted-zone-id Z0807456FWSN21W2TRAZ --change-batch file://ray-demo-tools-bjs.json --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1
```

### 如何列出解析记录
How to list resource record?
```bash
aws route53 list-resource-record-sets --hosted-zone-id Z0807456FWSN21W2TRAZ --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1
```

### 如何创建Alias?
[How-to-create-alias](How-to-create-alias.md)

### 常见管理任务
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

### 常见问题 FAQ

[请访问 - Click me](../faq/route53-cn-FAQ.md)
