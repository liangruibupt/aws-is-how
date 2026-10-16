# Route 53 FAQ: Private Hosted Zone & VPC DNS

中国区 Route 53 常见问题，集中在 Private Hosted Zone 与 VPC DNS / DHCP 设置、跨 VPC / 跨账号关联和私有子网的域名解析。

## Docs

- [route53-cn-FAQ](route53-cn-FAQ.md)：Hosted Zone 跨账号迁移（官方指南 + cli53）；Private Hosted Zone 能否替代自建 DNS（enableDnsHostnames / enableDnsSupport、DHCP Options、混合云 DNS 转发）；在代码中调用 Route 53 API；同一 Hosted Zone 关联多个 VPC 的测试；跨账号 VPC 关联 Private Hosted Zone 的 CLI 步骤；无 NAT / 代理的私有子网能否解析域名（含 API Gateway VPC Endpoint 的 nslookup 测试）

## Media

- `media/` 存放 FAQ 中的截图；其中 `custom-dhcp-optionset.png`、`ec2-resolver.png` 目前没有被文档引用。
