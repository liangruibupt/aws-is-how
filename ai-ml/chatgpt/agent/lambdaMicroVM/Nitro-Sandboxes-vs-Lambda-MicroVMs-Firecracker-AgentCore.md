# AWS Nitro Sandboxes 与 Lambda MicroVMs、Firecracker、AgentCore 的对比

> 发布：**AWS Nitro Sandboxes on Amazon EKS, ECS and EC2**（2026-11-09）
> 来源：[What's New 公告](https://aws.amazon.com/about-aws/whats-new/2026/11/nitro-sandboxes-eks-ecs-ec2/)、[EKS 深度博客（日文译版）](https://aws.amazon.com/jp/blogs/news/aws-nitro-sandboxes-hardware-enforced-workload-isolation-on-amazon-eks/)、[EKS 蓝图示例](https://github.com/aws-samples/sample-eks-nitro-sandbox)。
> 内容已改写，不是原文照录。

## 一句话定位

| 方案 | 一句话 |
|------|--------|
| **Nitro Sandboxes** | 在**你自己的 EC2 实例**里，由 Nitro Hypervisor 切出硬件隔离的 CPU/内存分区，跑轻量 VM；每个 EKS Pod / ECS Task / 自管 VM 一个。你管实例和编排，AWS 管隔离边界。 |
| **Lambda MicroVMs** | **托管的 serverless** 有状态沙箱：Lambda 帮你构建快照、启动、挂起/恢复、提供 HTTPS 端点，按运行时间计费，单个最长 8 小时。见 [Lambda-MicroVM-Use-Cases.md](Lambda-MicroVM-Use-Cases.md)。 |
| **Firecracker** | 开源 VMM（Lambda Functions/MicroVMs 的底层）。你自己在裸金属或支持嵌套虚拟化的实例上跑 KVM + Firecracker，一切自己运维。 |
| **AgentCore** | 托管的 **agent 平台服务集**：Runtime（每会话 microVM 隔离运行 agent）、Code Interpreter、Browser、Gateway、Identity、Memory、Policy、Observability 等。你只管 agent 代码。 |

## Nitro Sandboxes 解决什么问题

- **问题**：在一台 EC2 实例上运行不受信任、多租户或受监管的工作负载（例如执行 LLM 生成的代码）时，容器共享内核不够安全。过去只能"一个敏感负载一台机器"，资源大量闲置。
- **做法**：Nitro Hypervisor 从运行中的实例里切出硬件隔离的 CPU/内存切片（Nitro Partition），在里面起轻量 VM。每个 Pod/Task/VM 有自己的内核，宿主机和相邻工作负载都看不到它的内存和 CPU 状态。
- **两种模式**（EKS 博客）：
  - **Isolated**：每个 Pod 一个 VM，防的是容器内的东西逃逸到宿主机和邻居。
  - **Confidential**：把机器运维方也当作不可信。Nitro Security Module 度量启动内容并签发证明文档，KMS 只在证明文档符合镜像和 Cedar 策略时才解密，所以集群管理员也读不到 Pod 内存。
- **使用方式**：EKS/ECS 改一行配置。EKS 里是 `runtimeClassName: isolated-sandbox`（或 `confidential-sandbox`）。Pod Identity、VPC CNI、EBS/EFS/S3、CloudWatch、`kubectl exec/logs/port-forward` 都照常可用，并通过了 Kubernetes conformance 测试。
- **自管方式**：直接在 EC2 上用自己的 AMI、编排工具和 VMM，原生支持 Amazon Linux 和 Firecracker，其他 VMM 有补丁。
- **共享资源的保护**：网络带宽、磁盘 I/O、DNS、日志、conntrack 默认有可配置的限流，一个失控的 agent 不会拖垮邻居。
- **额外选项**：注解 `sandbox.amazonaws.com/network-isolated: "true"` 会让 VM 只有回环网卡。配合 Kubernetes SIG 的 agent-sandbox 项目可用预热池，约 2 秒拿到一个 VM。
- **可用性与价格**：多数 Nitro 实例（Intel/AMD/Graviton）、所有商业区域，**无额外费用**，只付 EC2 实例的钱。EKS 需要 Kubernetes 1.36+，EKS Auto Mode 自带 runtime class。

## 核心对比

| 维度 | Nitro Sandboxes | Lambda MicroVMs | 自建 Firecracker | AgentCore（Runtime / Code Interpreter） |
|------|-----------------|-----------------|------------------|------------------------------------------|
| 隔离技术 | Nitro Hypervisor 硬件分区 + 轻量 VM | Firecracker microVM（托管） | Firecracker microVM（KVM，自管） | 每会话 microVM（托管） |
| 隔离边界由谁保证 | AWS Nitro 硬件/固件 | AWS（Lambda 服务） | 你自己（宿主机内核、KVM、jailer 配置） | AWS（AgentCore 服务） |
| 跑在哪 | **你的 EC2 实例**（EKS 节点 / ECS 容器实例 / 自管 EC2） | AWS 托管的 Lambda 容量 | 你的裸金属或嵌套虚拟化实例 | AWS 托管 |
| 计算资源归属 | 你的实例，多个沙箱共享一台 | 无实例，按 MicroVM 运行时长计费 | 你的实例 | 无实例，按消耗计费 |
| 编排 | EKS / ECS / 你自己的编排器 | `run-microvm` API + 空闲策略 | 全部自建 | 服务托管（会话） |
| 工作负载形态 | 任意容器、Pod、Task、VM，**不限于 agent** | 任意 Dockerfile 打包的应用 | 任意 | agent 代码（任意框架）、工具调用 |
| 生命周期 | 跟随 Pod/Task 或你自管 | 秒级快照启动，挂起/恢复保留内存和磁盘，**最长 8 小时** | 自管（可自建快照） | 会话级，有最长会话时长 |
| 网络 | VPC CNI、你的安全组/网络策略；可完全断网 | 每个 MicroVM 有专属 HTTPS 端点；出站公网或 VPC connector | 自建（tap、iptables 等） | 托管端点；可配 VPC |
| 身份/凭证 | Pod Identity / ECS task role | 执行角色（经 IMDSv2） | 自建 | AgentCore Identity（OAuth、API Key、工作负载身份） |
| 机密计算 / 证明 | **有**（Confidential 模式：NSM 证明 + KMS 条件解密 + Cedar） | 无公开的证明能力 | 无（除非自己叠 Nitro Enclaves 等） | 无公开的证明能力 |
| 成本模型 | **无附加费**，只付 EC2；靠多个沙箱装箱提高利用率 | 按运行时间计费，挂起时接近零 | 只付 EC2，但运维成本高 | 按会话/资源消耗计费 |
| 运维量 | 中：要管节点和集群（Auto Mode 降低很多） | 低 | 高 | 最低 |
| 冷启动 | VM 启动（预热池约 2 秒） | 快照恢复，秒级 | 视实现而定 | 服务托管 |
| 已有生态 | Kubernetes 工具链、Helm、CI/CD 不用改 | Lambda API + 本仓库 [dsh-kimi-k3](dsh-kimi-k3/README.md) 示例 | KVM/Firecracker 社区 | Strands、LangGraph 等框架 + AgentCore 其他组件 |

## 关键差异解读

### 1. Nitro Sandboxes 与 Lambda MicroVMs：自己的实例 vs serverless

两者都给不受信任的代码一个 VM 级隔离环境，区别在于**谁拥有算力**：

- **Nitro Sandboxes 在你的 EC2 上跑**。适合已有 EKS/ECS 集群、负载比较稳定、想把很多隔离负载装进少量实例的团队。成本就是实例费用，没有附加费，可以叠加 Savings Plans / RI / Spot。
- **Lambda MicroVMs 没有实例可管**。适合突发的、用户驱动的会话（每个用户一个沙箱、经常空闲），挂起时几乎不花钱。代价是 8 小时上限，以及只能用 Lambda 的 API 和网络模型。

经验判断：用户会话量波动大、空闲时间长，选 Lambda MicroVMs；已有容器平台、负载持续、需要 Kubernetes 原生能力（网络策略、Pod Identity、CSI 存储、Helm），选 Nitro Sandboxes。

### 2. Nitro Sandboxes 与 Firecracker：互补，不是替代

- 公告明确说 Nitro Sandboxes **原生支持 Firecracker** 作为 VMM。可以理解为：Nitro Sandboxes 提供的是"在普通 EC2 实例里切出硬件隔离分区"的底座，Firecracker 可以运行在这个分区里。
- 以前要在 EC2 上跑 Firecracker，只能用裸金属实例，或者用支持嵌套虚拟化的实例（见 [sample-multi-tenant-openclaw-on-firecracker](https://github.com/aws-samples/sample-multi-tenant-openclaw-on-firecracker)），隔离强度取决于你的宿主机内核和 KVM 配置。
- 用 Nitro Sandboxes 之后，隔离边界由 Nitro Hypervisor 在硬件层面强制，宿主机（你的 EC2 实例 OS）也看不进沙箱。

### 3. Nitro Sandboxes 与 AgentCore：隔离原语 vs agent 平台

- **AgentCore 是一整套 agent 平台服务**（运行时、代码解释器、浏览器、网关、身份、记忆、策略、可观测性），重点是"让 agent 上生产"，隔离只是其中一项能力，而且完全托管。
- **Nitro Sandboxes 只是一个隔离原语**，不提供 agent 运行时、记忆、工具网关这些能力。agent 框架（Claude Code、Codex、Strands、OpenCode 等）打成容器后加一个 RuntimeClass 就能跑，代码不用改。
- 选择依据：要托管的全家桶、不想管集群，选 AgentCore；已有 Kubernetes 平台、要自己掌控网络/身份/数据，或需要 **Confidential 模式的密码学证明**，选 Nitro Sandboxes。两者也可以组合：agent 在 AgentCore Runtime 里跑，重型或受监管的工具执行放到 EKS 上的 Nitro Sandbox。

## 场景选型速查

| 场景 | 推荐 | 理由 |
|------|------|------|
| ChatGPT/Claude 类产品给每个用户一个代码执行沙箱，大量空闲 | **Lambda MicroVMs** | 挂起近零成本、快照秒级恢复、无需管实例 |
| 已有 EKS 平台，要给 AI 编码 agent / CI 构建任务加硬件隔离 | **Nitro Sandboxes (EKS)** | 一行 RuntimeClass，Helm/流水线不变，多个任务共享节点 |
| 多租户 SaaS，需要向客户/审计证明租户数据受硬件保护 | **Nitro Sandboxes Confidential 模式** | 证明文档 + KMS 条件解密，管理员也读不到内存 |
| 自研沙箱平台，要完全控制 VMM、镜像、调度 | **Nitro Sandboxes on EC2 + Firecracker** | 硬件隔离由 Nitro 提供，其余自己掌控；不再需要裸金属 |
| 学习 microVM 原理、研究 VMM 定制 | **自建 Firecracker** | 完全开放，但生产运维成本高 |
| 快速把 agent 上生产，要托管的记忆、工具网关、身份、观测 | **AgentCore** | 全托管平台，不用管基础设施 |
| Anthropic/OpenAI 托管 agent 循环，工具在自己环境执行（self-hosted sandbox） | **Lambda MicroVMs** 或 **Nitro Sandboxes** | 前者有官方示例 [sample-lambda-microvm-claude-managed-agents](https://github.com/aws-samples/sample-lambda-microvm-claude-managed-agents)；后者适合已有 EKS 的团队 |
| 长时间运行（超过 8 小时）的隔离任务 | **Nitro Sandboxes** | 生命周期跟随 Pod/Task，没有 8 小时上限 |

## 注意事项

- **共享资源只是限流，不是隔离**：CPU/内存由硬件分区隔离，但网络带宽、磁盘 I/O 等仍在节点内共享，靠限流保护，规划容量时要考虑。
- **成本取决于装箱率**：Nitro Sandboxes 没有附加费，但实例要一直开着；如果负载稀疏，实例闲置的成本可能高于 Lambda MicroVMs 的按需计费。
- **实例支持范围**：公告说的是"多数" Nitro 实例，具体以 EC2 用户指南为准。
- **出站流量需要自己管**：沙箱解决的是逃逸和邻居干扰；agent 能访问哪些外部地址，仍要靠网络策略（如 EKS Auto Mode 的 ApplicationNetworkPolicy）和最小权限 IAM 来控制。

## 参考链接

- [What's New：Introducing AWS Nitro Sandboxes on Amazon EKS, ECS and EC2](https://aws.amazon.com/about-aws/whats-new/2026/11/nitro-sandboxes-eks-ecs-ec2/)
- [AWS Nitro Sandboxes: Hardware-enforced workload isolation on Amazon EKS（日文译版）](https://aws.amazon.com/jp/blogs/news/aws-nitro-sandboxes-hardware-enforced-workload-isolation-on-amazon-eks/)
- [sample-eks-nitro-sandbox（EKS 蓝图示例）](https://github.com/aws-samples/sample-eks-nitro-sandbox)
- [The Security Design of the AWS Nitro System（白皮书）](https://docs.aws.amazon.com/whitepapers/latest/security-design-of-aws-nitro-system/security-design-of-aws-nitro-system.html)
- 本目录：[Lambda MicroVMs 适用场景与 Samples](Lambda-MicroVM-Use-Cases.md)、[DSH + Kimi K3 on Lambda MicroVMs](dsh-kimi-k3/README.md)
