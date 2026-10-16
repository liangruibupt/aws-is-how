# EC2 Networking & Load Balancing

EC2 网络相关：ALB / NLB 转发与重定向、网络性能、IP 地址查询与保留。

## Docs

- [ALB-NLB-Route-Traffic-to-Peering-VPC](ALB-NLB-Route-Traffic-to-Peering-VPC.md)：ALB / NLB 用 IP 类型目标组把流量转发到对等 VPC 中的实例；Auto Scaling group 不支持跨 VPC 目标组的限制，以及公网 ALB + 私有 VPC NLB 通过 PrivateLink 打通的替代方案
- [ALB_Redirect_Domain](ALB_Redirect_Domain.md)：用 ALB 监听器规则把一个域名 301 / 302 重定向到另一个域名，以及需要 307 时的处理思路（Lambda@Edge，中国区用 Lambda / Nginx 作为目标）
- [EC2_Networking_performance](EC2_Networking_performance.md)：增强联网（SR-IOV / ENA）、延迟与 placement group、网络性能监控和吞吐测试的参考链接
- [Get-all-IP](Get-all-IP.md)：用 describe-network-interfaces / describe-instances CLI 列出账号下的私有和公网 IP
- [Keep_EC2_primary_private_IP](Keep_EC2_primary_private_IP.md)：“新”实例保留原主私有 IP 的两种方案（新建时指定主私有 IP / Replace root volume），附替换根卷的演示

## Scripts

- [scripts/ec2_operation.py](scripts/ec2_operation.py)：boto3 按名称查询安全组，并列出该安全组的规则

## Media

- [media/](media/)：ALB / NLB 跨 VPC 和 PrivateLink 配置截图
