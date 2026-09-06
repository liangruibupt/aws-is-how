# AWS Lambda MicroVMs 适用场景与 Samples

## Lambda MicroVMs 是什么

一个新的 serverless 计算原语(2026 年 6 月 GA),基于 **Firecracker 虚拟化**,给每个用户或会话一个隔离的、有状态的执行环境。它专门用来运行"由用户或 AI 生成、开发者本人没写"的不可信代码。

它填补了传统方案之间的空白:

| 方案 | 隔离性 | 启动速度 | 有状态长会话 |
|------|--------|----------|--------------|
| 虚拟机(VM) | 强 | 慢(分钟级) | 支持 |
| 容器 | 弱(共享内核,需自建加固) | 快(秒级) | 需自建 |
| Lambda Functions | 中 | 快 | 不适合(为事件驱动/请求-响应设计) |
| **Lambda MicroVMs** | **强(VM 级)** | **快(快照恢复,秒级)** | **支持(单个 MicroVM 最长 8 小时)** |

Lambda MicroVMs 底层用的正是支撑 Lambda Functions(每月 15 万亿+次调用)的 Firecracker 技术,因此继承了其规模化运营的成熟度。

## 核心特性

- **快速启动** — MicroVM 从预初始化的快照恢复,跳过应用初始化过程,秒级就绪。
- **生命周期控制** — 可通过 API 或自动空闲策略进行挂起(suspend)、恢复(resume)、终止(terminate)。
- **空闲近零成本** — 交互式场景中用户经常空闲(切换任务或等待 AI),MicroVM 可在空闲时挂起,保留内存和磁盘状态的同时降低成本;流量到达时秒级恢复。
- **完整 OS 能力** — 可安装系统包、挂载文件系统等。
- **灵活网络** — 入站支持可配置端口上的 HTTPS 流量(HTTP/2、gRPC、WebSocket),带服务端提供的 JWE 认证;出站可访问公网或 VPC;每个 MicroVM 有专属 HTTPS 端点,无需负载均衡器或入口基础设施。
- **灵活资源分配** — 按基线或平均用量配置,峰值时可垂直扩展到基线的 4 倍;运行时按基线计费,只为超出基线的活跃用量额外付费。

## 适合的场景

核心判断标准:**要执行由用户或 AI 生成的不可信代码,需要强隔离 + 快速启动/恢复 + 会话内保留状态**。

AWS 官方列出的典型场景:

1. **AI 代码执行沙箱** — 安全地运行 AI 生成的临时代码(最热门场景)。
2. **交互式代码/开发环境** — 用户实时编写并执行代码的 IDE 类环境。
3. **数据分析应用** — Jupyter notebook、执行用户脚本的临时数据处理工作负载。
4. **安全扫描** — 漏洞评估工具需要的隔离执行环境。
5. **强化学习环境** — AI agent 评估/训练,每次运行都启动全新隔离环境。
6. **多租户 CI/CD** — 租户间需要隔离的任务执行器(如 GitHub Actions Runner)。
7. **游戏服务器** — 运行用户提供脚本、需要强隔离的托管环境。
8. **AI Agent 沙箱** — 例如为 Claude Managed Agents 提供沙箱。

**不适合的场景**:

- 普通的事件驱动、请求-响应型无状态任务 —— 用普通 Lambda Function 更简单便宜。
- 纯长驻批处理 / 稳定高负载服务 —— 用 ECS / EC2 更划算。

## 工作流程

1. 将应用代码和 Dockerfile 打包成 zip 上传到 Amazon S3。
2. 调用 Lambda API 创建 MicroVM Image —— Lambda 执行 Dockerfile、启动应用,并对完全初始化后的环境拍摄快照。
3. 需要隔离环境时(用户会话、任务或沙箱),调用 `run-microvm`,Lambda 从快照秒级启动 MicroVM。
4. 客户端通过 MicroVM 的专属 HTTPS 端点连接,无需负载均衡器或入口基础设施。
5. 空闲时 MicroVM 挂起,保留内存和磁盘状态并降低成本;流量返回时恢复(可通过生命周期策略自动进行,或用 `suspend-microvm` / `resume-microvm` 手动触发)。
6. 会话结束时 `terminate-microvm` 释放所有资源。

## 最小上手示例(来自官方博客)

一个 Flask app + Dockerfile 打包成 zip 上传 S3:

```dockerfile
FROM public.ecr.aws/lambda/microvms:al2023-minimal
RUN dnf install -y python3 python3-pip && dnf clean all
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .
EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
```

创建 MicroVM Image:

```bash
aws lambda-microvms create-microvm-image \
  --code-artifact uri=<path/to/s3/artifact.zip> --name <VM_image_name> \
  --base-image-arn arn:aws:lambda:us-east-1:aws:microvm-image:al2023-1 \
  --build-role-arn <IAM role ARN>
```

> 注意:GA 区域有限(验证用的是 us-east-1);需要 AWS CLI v2 且带 `lambda-microvms` 子命令(部署前先执行 `aws lambda-microvms help` 确认子命令存在)。

## Samples

1. **[sample-multi-tenant-ai-agents-on-lambda-microvm](https://github.com/aws-samples/sample-multi-tenant-ai-agents-on-lambda-microvm)** — 最完整的端到端示例。每个租户一个 Firecracker MicroVM,状态持久化到 EFS,模型调用走 Amazon Bedrock,Telegram webhook 编排,支持自动挂起/恢复/回收。4 条命令即可部署(`deploy.sh` / `add-tenant.sh` / `chat.sh` / `teardown.sh`),`docs/` 里还记录了大量踩坑经验。核心价值:空闲近零成本、快照秒级恢复、自动生命周期管理、每租户硬隔离、零静态凭证(通过 IMDSv2 execution role 获取 AWS 访问权限)。

2. **[sample-lambda-microvm-claude-managed-agents](https://github.com/aws-samples/sample-lambda-microvm-claude-managed-agents)** — 用 Lambda MicroVMs 作为 Claude Managed Agents 的沙箱。每个 MicroVM 是 Firecracker 隔离的虚拟机,快照秒级启动,最长运行 8 小时,会话结束即终止,会话间不共享状态。

3. **[sample-multi-tenant-openclaw-on-firecracker](https://github.com/aws-samples/sample-multi-tenant-openclaw-on-firecracker)** — 用 EC2 嵌套虚拟化直接跑 KVM + Firecracker 的多租户 AI agent 平台(注意这是自建 Firecracker,不是托管的 Lambda MicroVMs,适合想了解底层原理的场景)。支持 Intel(c8i / m8i / r8i)和 Graviton(ARM64)实例。

## 参考链接

- [AWS Lambda MicroVMs 官方文档](https://docs.aws.amazon.com/lambda/latest/dg/lambda-microvms-guide.html)
- [How Lambda MicroVMs work](https://docs.aws.amazon.com/lambda/latest/dg/microvms-how-it-works.html)
- [Using Lambda MicroVMs as a sandbox for Claude Managed Agents](https://docs.aws.amazon.com/lambda/latest/dg/microvms-integrations-claude-managed-agents.html)
- [发布博客:Run isolated sandboxes with full lifecycle control](https://aws.amazon.com/blogs/aws/run-isolated-sandboxes-with-full-lifecycle-control-aws-lambda-introduces-microvms/)
- [Lambda MicroVMs 产品页](https://aws.amazon.com/lambda/lambda-microvms/)
