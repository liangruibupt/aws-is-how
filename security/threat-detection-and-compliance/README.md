# Security: Threat Detection and Compliance

威胁检测、安全发现汇总和配置合规检查。

## Folders

- [guard-duty/](guard-duty/README.md)：GuardDuty 简介，用 amazon-guardduty-tester 模拟攻击生成 findings（附中国区 CloudFormation 模板），以及 findings 排查说明
- [security-hub/](security-hub/README.md)：Security Hub FAQ（安全标准、finding 工作流状态等）、跨账号管理；自定义 findings 导入参考（[securityhub_customer_findings](security-hub/securityhub_customer_findings.md)）；批量更新 findings、批量禁用标准控制项的 shell 脚本
- [aws-config/](aws-config/GetStartConfigRDS.md)：在中国区用 RDK 开发自定义 Config 规则；跨账号调用 Lambda 的 Config 规则（[Cross-Account-Lambda-Config-Rule](aws-config/Cross-Account-Lambda-Config-Rule.md)）；用 Config 高级查询和 IAM Access Analyzer 查找公网暴露资源（[How-to-get-public-resources](aws-config/How-to-get-public-resources.md)）
