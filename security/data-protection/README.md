# Security: Data Protection

加密密钥、密钥/凭证托管、SSL/TLS 证书，以及避免在启动脚本里暴露敏感信息。

## Docs

- [How-to-bootstrap-sensitive-data-in-EC2-userdata](How-to-bootstrap-sensitive-data-in-EC2-userdata.md)：敏感信息不写进 EC2 User Data，改存 SSM Parameter Store 加密参数，实例角色授予 GetParameters 和 KMS 解密权限（附 User Data 示例）

## Folders

- [kms/](kms/Share-CMK-across-multiple-AWS-accounts.md)：KMS 笔记：通过 key policy 跨账号共享 CMK；中国区使用 SM2 非对称密钥和 SM4 数据密钥（[Using-SM-Key-Algorithm-in-China](kms/Using-SM-Key-Algorithm-in-China.md)）
- [secret-mgr/](secret-mgr/README.md)：Secrets Manager 快速上手：自定义 key/value secret、RDS / Redshift secret、跨账号访问 secret（含 KMS 共享）、CloudFormation 自动创建 secret，附 Python 示例脚本
- [acm/](acm/Upload-SSL-Certificate.md)：证书相关：导入证书到 ACM 或上传到 IAM 并关联 CLB/ALB/NLB、中国区 ACM 申请公有证书（[acm-china-get-start](acm/acm-china-get-start.md)）、用 OpenSSL 生成证书（[create-certificate-openssl](acm/create-certificate-openssl.md)）
