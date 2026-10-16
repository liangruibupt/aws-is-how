# Security: Identity and Access

IAM 授权、STS 临时凭证、Active Directory 对接、SSO 联合登录，以及给 Web 站点加登录和 Passkey 调研。

## Docs

- [IAM-Trust-Relationship-Policy](IAM-Trust-Relationship-Policy.md)：允许多个账号 `sts:AssumeRole` 的 IAM 角色信任策略 JSON 片段
- [Using-temporary-credentials-with-AWS-resources](Using-temporary-credentials-with-AWS-resources.md)：创建只用于 AssumeRole 的 IAM 用户、配置目标角色信任关系和 MaxSessionDuration，用 `aws sts assume-role` 获取临时凭证并配置成 CLI profile（含 Linux / Windows 示例）
- [Connect-to-Existing-AD-Infrastructure](Connect-to-Existing-AD-Infrastructure.md)：对接已有 AD 的两种方式：AWS Managed Microsoft AD 信任关系、AD Connector（控制台登录、EC2 加域、MFA）的官方文档摘要
- [Migrate_on-premises_domain_to_AWS_Managed_AD](Migrate_on-premises_domain_to_AWS_Managed_AD.md)：用 ADMT 把本地域迁移到 AWS Managed Microsoft AD、把 AD 用户迁移到 Simple AD 的参考链接

## Folders

- [sso/](sso/SSO-OnePage.md)：SSO 场景汇总：Windows AD + ADFS + SAML 2.0 联合登录控制台、自定义身份代理（custom identity broker）、Okta OIDC 浏览器访问 AWS、Okta 与中国区多账号集成，附 Python 脚本和 AD CloudFormation 模板
- [site-auth/](site-auth/README.md)：用一个 Cognito 用户池 + 共用的 Lambda@Edge 给多个 S3 + CloudFront 演示站点统一加登录（授权码 + PKCE，CDK 部署，管理员脚本建号）
- [passkey-ecommerce/](passkey-ecommerce/README.md)：主流电商 / 支付平台 Passkey（FIDO2/WebAuthn）落地姿势调研 HTML 报告，含中国 IFAA 路线对比、UX 最佳实践和 AWS 参考架构
