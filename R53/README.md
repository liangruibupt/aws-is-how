# Amazon Route 53

Route 53 相关笔记、CLI 示例和解析记录文件（以中国区为主），按主题分类：

| Folder | 内容 |
|---|---|
| [hosted-zone-records](hosted-zone-records/README.md) | 中国区 Hosted Zone / 解析记录 CLI 快速上手，Alias 和 CNAME 记录示例（CloudFront / ALB / NLB / API Gateway），Go SDK 示例 |
| [faq](faq/README.md) | 常见问题：Hosted Zone 迁移、Private Hosted Zone 与 VPC DNS / DHCP 设置、跨 VPC / 跨账号关联、私有子网域名解析 |
| [resolver-multi-account](resolver-multi-account/README.md) | Route 53 Resolver 多账号集中 DNS 架构，以及跨账号 DNS 参考博客 |

## Feature Availability and Implementation Differences

中国区和海外区 Route53 的功能区别

https://docs.amazonaws.cn/en_us/aws/latest/userguide/route53.html

- You can't use Route 53 to register domains. However, you can create a hosted zone in one of the China Regions for DNS service
- You can't create alias records that route traffic to AWS resources outside the China Regions.
- You can't create records that use the geoproximity routing policy.
- You can't use Route 53 Resolver to forward DNS queries from your VPCs to your on-promise network or from your on-promise network to your VPCs. But you can setup DNS forward on EC2 to complete the similar function
- When creating alias records for Amazon CloudFront distribution, use the following hosted zone ID: Z3RFFRIM2A3IF5.

[Offical guide](https://docs.amazonaws.cn/Route53/latest/DeveloperGuide/index.html)

[Offical API guide](https://docs.amazonaws.cn/Route53/latest/APIReference/Welcome.html)

## Quick links

- 中国区 Hosted Zone / 解析记录 CLI 快速上手：[hosted-zone-records](hosted-zone-records/README.md#cli-quick-start)
- 如何创建 Alias：[How-to-create-alias](hosted-zone-records/How-to-create-alias.md)
- 常见问题 FAQ：[route53-cn-FAQ](faq/route53-cn-FAQ.md)
