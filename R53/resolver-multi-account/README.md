# Route 53 Resolver & Multi-Account DNS

多账号 / 混合云场景下的 DNS 方案：用 Route 53 Resolver endpoint、转发规则和 RAM 共享做集中式 DNS，以及跨账号 Private Hosted Zone 的参考资料。

## Docs

- [R53-Resolver](R53-Resolver.md)：入门文章链接，多账号环境下用 Resolver inbound / outbound endpoint、条件转发规则和 RAM 共享实现集中 DNS 的架构图及分步说明（英文），附 outbound endpoint 配置参考
- [cross-account-dns](cross-account-dns.md)：两篇参考博客链接：多账号环境下用 Resolver 简化 DNS 管理；跨账号多区域架构中使用 Private Hosted Zone
