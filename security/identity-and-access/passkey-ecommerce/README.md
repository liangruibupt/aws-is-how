# 主流电商 Passkey 使用姿势调研与最佳实践（含 AWS 服务映射与实现架构）

一份自包含的 HTML 调研报告，覆盖主流电商/支付平台的 Passkey（FIDO2/WebAuthn）落地姿势，产品 UX 与技术实现并重，并给出 Passkey 方案在 AWS 上的服务映射与两套参考实现架构。

## 报告

- [`passkey-ecommerce-report.html`](./passkey-ecommerce-report.html) — 单文件、内嵌 CSS、深色主题；本地直接用浏览器打开即可。

## 内容概览

- **全球两条技术路线对比**：国际标准 FIDO2/WebAuthn passkey vs 中国 IFAA/IIFAA + TEE/SE 本地生物识别授权 + 服务端风控 + 实名。
- **国际电商平台使用姿势**：Amazon、eBay、PayPal、Shopify(Shop Pay)、Best Buy、Target 的注册引导、登录 UX、降级/恢复与公开效果数据；含 PayPal 采用漏斗（88% × 48% × 20% ≈ 8% 端到端使用率，+10% 登录成功率，−70% ATO）。
- **中国及亚太**：支付宝、微信支付、淘宝/天猫、京东、拼多多、银联云闪付，以及日本/东南亚，附对出海电商的启示。
- **产品/UX 最佳实践**：注册时机、渐进式引导、Conditional UI（autofill）、跨设备 hybrid、企业/共享设备。
- **技术实现**：WebAuthn 关键参数决策（`rp.id`、userVerification、residentKey、attestation、pubKeyCredParams、excludeCredentials）、synced vs device-bound passkey、AAGUID、后端持久化数据模型。
- **账户恢复**：为何恢复通道是最容易被忽视的最弱环节，及推荐设计。
- **常见坑 / 反模式**：8 条（signCount 克隆检测、rp.id 主机名、恢复通道弱于 passkey 等）。
- **AWS 服务映射**：Passkey 各职责映射到 Amazon Cognito（托管 RP）vs 自建 RP（API Gateway + Lambda + DynamoDB + KMS），配 WAF / Fraud Detector 做服务端风控。
- **AWS 参考架构**：架构 A（Cognito 托管 RP）、架构 B（自建 RP），含 ASCII 架构图，以及生产推荐的混合方案。
- **落地检查清单** + 带链接的主要来源。

## 关键要点（生死线）

1. `rp.id` 用可注册域 **eTLD+1**（如 `shop.com`），不要用 `www.shop.com` —— 生产最常见的"登录突然坏掉"根因。
2. **账户恢复通道不能弱于 passkey**，否则抗钓鱼优势被恢复流绕过。
3. `signCount` **不能再用于克隆检测**（synced passkey 恒为 0）；存下但不据此拒登。
4. **AAGUID 仅在注册时出现**，必须当场抓取存下。
5. 战场从"注册"转移到"**使用率**"：每次登录默认优先呈现 passkey，别藏进设置页。

## 说明

- PayPal 的采用漏斗与安全指标为其官方公开披露（高置信度）；Amazon/eBay 等平台的部分运营数字来自厂商博客/行业调查（中置信度，正文已标注）。对外使用前建议补一轮官方来源交叉验证。
- AWS 架构为参考实现，落地前请结合具体合规要求与流量规模评审。
