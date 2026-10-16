# VPC Private Access: VPC Endpoints

私有子网在没有 NAT / 公网出口的情况下，通过 VPC Endpoint 访问 AWS 服务（示例以中国区 cn-north-1 为主）。

## Docs

- [Access-AWSCLI-Boto3API-In-PrivateSubnet-Without-NAT](Access-AWSCLI-Boto3API-In-PrivateSubnet-Without-NAT.md)：无 NAT 私有子网中使用 AWS CLI / Boto3：创建各服务的 Interface Endpoint、安全组放行 443、指定 region，附 EC2 / CloudFormation / DynamoDB 等测试命令
- [Access-S3-via-VPC-endpoint](Access-S3-via-VPC-endpoint.md)：用 traceroute 验证 EC2 访问 S3 是走 S3 Gateway Endpoint 还是 NAT Gateway，附路由表截图对比
- [SSM-VPC-Endpoint-In-China-Region](SSM-VPC-Endpoint-In-China-Region.md)：北京区无 NAT 私有子网配置 SSM 所需的 VPC Endpoint，实例注册到 Systems Manager 的步骤、排错日志位置和验证命令
