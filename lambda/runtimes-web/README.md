# Lambda Runtimes & Web Functions

Lambda 自定义运行时，以及在 Lambda 上直接运行 Web 应用。

## Subprojects

- [lambda4php](lambda4php/README.md)：在 EC2 上编译 PHP 7.3 + Guzzle，编写 `bootstrap` 实现 Custom Runtime，把 runtime / vendor 发布为 Layer 并部署 hello / goodbye 示例函数
- [lambda-web-functions-lab](lambda-web-functions-lab/README.md)：AWS Lambda Web Functions（Node.js HTTP Server 原样上 Lambda，单环境多并发、按活跃 CPU 计费）调研文档 + us-east-1 实测 Lab（`app/` 示例应用，`scripts/` 部署 / 压测 / 灰度 / CloudFront / 多 Region / 计费 / 清理脚本）
