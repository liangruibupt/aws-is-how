# AWS App Mesh 下线迁移方案对比

> AWS App Mesh 将于 **2026 年 9 月 30 日**正式下线。本文整理了生产就绪的替代方案，包括各方案的优劣势和成本分析。

## 背景

- 2024 年 9 月 24 日起，新客户已无法接入 App Mesh
- 现有客户可正常使用至 2026 年 9 月 30 日，期间 AWS 继续提供安全和可用性更新
- AWS 官方推荐迁移路径：ECS 用户 → Service Connect，EKS 用户 → VPC Lattice

参考链接：
- [Migrating from AWS App Mesh to Amazon ECS Service Connect](https://aws.amazon.com/blogs/containers/migrating-from-aws-app-mesh-to-amazon-ecs-service-connect/)
- [Migrating from AWS App Mesh to Amazon VPC Lattice](https://aws.amazon.com/blogs/containers/migrating-from-aws-app-mesh-to-amazon-vpc-lattice/)
- [Migrate Amazon ECS workloads from AWS App Mesh to Amazon VPC Lattice](https://aws.amazon.com/blogs/containers/migrate-amazon-ecs-workloads-from-aws-app-mesh-to-amazon-vpc-lattice/)

---

## 方案一览

| 维度 | Amazon ECS Service Connect | Amazon VPC Lattice | Istio (开源) | Linkerd (开源) | ALB (Internal) |
|------|---------------------------|-------------------|-------------|---------------|----------------|
| 适用平台 | **仅 ECS** | ECS / EKS / EC2 / Lambda | **仅 Kubernetes** | **仅 Kubernetes** | 全部 |
| 成熟度 | GA (2022 re:Invent) | GA (2023) | CNCF 毕业项目 | CNCF 毕业项目 | AWS 最成熟的 L7 LB |
| AWS 推荐 | ✅ ECS 用户首选 | ✅ EKS 用户首选 | 社区方案 | 社区方案 | 通用方案 |
| Sidecar 代理 | AWS 托管 Envoy | **无需 sidecar** | Envoy sidecar（或 Ambient） | 自有轻量 proxy | **无需 sidecar** |

---

## 方案 1：Amazon ECS Service Connect

**AWS 官方推荐给 ECS 用户的迁移目标**

### 优势

- 无额外服务费用 — Service Connect 本身免费，仅按底层 Fargate/EC2 计费，Cloud Map 使用也免费
- AWS 全托管 Envoy proxy，无需自行管理 sidecar 生命周期
- 开箱即用的 CloudWatch 应用层指标（免费）
- 配置大幅简化，抽象层比 App Mesh 少很多
- 内置健康检查、异常检测、重试机制

### 劣势

- **仅限 ECS**，不支持 EKS / EC2 独立部署
- 不支持高级流量路由（如加权路由、金丝雀发布）
- 不支持 mTLS（双向认证），仅支持单向 TLS
- Cloud Map namespace 不能跨 AWS 账号共享
- 可调参数有限 — 仅超时可配置，重试/熔断等使用固定默认值

### 成本

**最低** — 无额外服务费，仅 sidecar 容器的少量 CPU/内存开销（约 256MB 内存 + 0.25 vCPU per task）

---

## 方案 2：Amazon VPC Lattice

**AWS 官方推荐给 EKS 用户的迁移目标，也是 App Mesh 的战略继任者**

### 优势

- **无需 sidecar proxy** — 完全托管的控制面和数据面，Pod 内无额外组件
- 跨 VPC、跨账号原生互通（通过 RAM 共享）
- 支持多种计算类型：ECS、EKS、EC2、Lambda
- 内置 CloudWatch 指标
- 支持 IAM 认证和 Auth Policy 实现粗粒度授权
- 支持 Kubernetes Gateway API
- 支持加权路由 / 金丝雀发布
- 支持 HTTP/HTTPS/gRPC/TCP 协议

### 劣势

- **按使用量收费**，大规模场景成本可观
- 功能集仍在演进中，部分高级 mesh 功能（如细粒度熔断、故障注入）尚不具备
- 相比 Istio 等成熟 mesh，可观测性和流量管理的精细度较低
- 需要通过 ELB 暴露外部流量入口

### 成本（以 us-east-1 为例）

- 每个 Service：**$0.025/小时**（约 $18.25/月）
- 数据处理：**$0.025/GB**
- HTTP 请求：前 300K 请求/小时免费，之后 $0.10/百万请求
- 示例：100 个 service，每个处理 100GB/月 → 约 **$2,075/月**

---

## 方案 3：Istio（开源）

**业界最广泛采用的 Kubernetes 服务网格**

### 优势

- 功能最全面：mTLS、细粒度流量管理、故障注入、熔断、速率限制
- CNCF 毕业项目，社区庞大，生态丰富
- Ambient Mesh 模式（无 sidecar）可降低约 90% 资源开销
- 完全可移植，不锁定云厂商
- 与 Prometheus/Grafana/Jaeger 等可观测性工具深度集成
- 支持多集群、多网络拓扑

### 劣势

- **运维复杂度高** — 控制面（istiod）需要自行部署、升级、监控
- Sidecar 模式下每个 Pod 额外消耗 **50-100m CPU + 50-100MB 内存**（100 个 Pod ≈ 10 核额外开销）
- 学习曲线陡峭，团队需要专业知识
- **仅支持 Kubernetes**，不适用于纯 ECS 或 EC2 场景
- 升级和版本兼容性管理是持续挑战

### 成本

- 软件本身免费
- 控制面：约 1-2 个节点的计算资源（istiod）
- Sidecar 开销：每 Pod 约 128MB 内存 + 100m CPU → **100 Pod 规模约增加 15-20% 计算成本**
- Ambient Mesh 可将此开销降至约 **2-3%**
- 可选商业支持（Solo.io Gloo Mesh 等）另计

---

## 方案 4：Linkerd（开源）

**轻量级 Kubernetes 服务网格**

### 优势

- 资源占用极低 — proxy 仅约 **10MB 内存 + 1ms p99 延迟**
- 安装和运维比 Istio 简单得多，5 分钟可上手
- CNCF 毕业项目，生产验证充分
- 自动 mTLS，零配置即可启用
- 控制面轻量，资源消耗小

### 劣势

- 功能不如 Istio 丰富（如无故障注入、有限的流量管理）
- 社区和生态规模小于 Istio
- **仅支持 Kubernetes**
- 2024 年起稳定版本需要商业许可（Buoyant Enterprise），开源版仅提供 edge release
- 不使用 Envoy，与 Envoy 生态工具不兼容

### 成本

- 开源 edge 版免费，稳定版需 Buoyant 商业许可
- 计算开销最低，每 Pod 约 **10MB 内存 + 1m CPU**

---

## 方案 5：ALB（Internal ALB）

**务实的轻量级选项，适合服务数量不多、不依赖 mesh 级别弹性能力的场景**

### ALB 能替代 App Mesh 的哪些能力？

| 能力 | App Mesh | ALB 能否替代 |
|------|----------|-------------|
| 服务发现 + 路由 | ✅ | ✅ 可以（Target Group + 路由规则） |
| 加权路由 / 金丝雀 | ✅ | ✅ 可以（Weighted Target Groups） |
| 负载均衡 | ✅ | ✅ 原生能力 |
| TLS 终止 | ✅ | ✅ 可以 |
| mTLS | ✅ | ✅ 可以（ALB 支持 mTLS） |
| 可观测性（指标/日志/追踪） | ✅ | ⚠️ 部分（访问日志 + CloudWatch 指标，但无应用级 tracing） |
| 熔断 / 重试 / 超时 | ✅ | ❌ 不支持（需要应用层自行实现） |
| 故障注入 | ✅ | ❌ 不支持 |
| 细粒度流量策略 | ✅ | ❌ 不支持 |

### 优势

- **成熟度极高** — AWS 最成熟的 L7 负载均衡器，生产验证无数
- **零运维复杂度** — 全托管，无 sidecar，无控制面
- **功能丰富的路由** — 基于 path / host / header / query string 的路由规则，加权 Target Group 实现金丝雀
- **原生集成** — WAF、Cognito 认证、Lambda target、gRPC 支持
- **mTLS 支持** — ALB 已支持双向 TLS 认证
- **团队熟悉度高** — 几乎所有 AWS 团队都有 ALB 使用经验，无学习成本

### 劣势

- **不是服务网格** — 没有 sidecar 级别的流量拦截，熔断/重试/超时/故障注入需要应用层实现
- **东西向流量成本** — 每对服务间通信都需要一个 ALB，服务数量多时 ALB 数量和成本线性增长
- **额外网络跳** — 流量经过 ALB 增加一跳延迟（通常 < 1ms，但存在）
- **无统一的 mesh 可观测性** — 没有跨服务的统一 tracing 视图，需要自行集成 X-Ray 或 OpenTelemetry
- **跨服务策略不一致** — 每个 ALB 独立配置，没有全局策略下发能力

### 成本

- ALB：**$0.0225/小时**（约 $16.43/月/个）+ LCU 费用（约 $0.008/LCU-hour）
- 10 个微服务间通信可能需要 5-8 个 internal ALB → **约 $80-130/月固定费 + 流量费**
- 对比：VPC Lattice 10 个 service 约 $182.50/月固定费，但无需管理多个 ALB

---

## ALB 替换 App Mesh 时是否需要修改应用代码？

### 大多数情况：不需要改代码

App Mesh 的工作方式是：应用代码调用一个服务名（如 `http://user-service:8080/api`），Envoy sidecar 透明拦截流量并根据 mesh 规则路由。应用本身并不感知 App Mesh 的存在。

迁移到 ALB 时，只需要把服务的 DNS 名称从 Cloud Map 的服务发现地址改为指向 internal ALB 的 DNS（可通过 Route 53 Private Hosted Zone 映射）。

```
迁移前：app → envoy sidecar → Cloud Map 解析 → 下游 envoy → 下游服务
迁移后：app → DNS 解析 → internal ALB → 下游服务
```

### 需要少量改动的情况

如果应用依赖了 App Mesh / Envoy sidecar 提供的以下能力：

| App Mesh 提供的能力 | 迁移到 ALB 后怎么办 | 是否改代码 |
|---|---|---|
| 自动重试（retry） | 应用层加 retry 逻辑（如 Python `tenacity`、Java `resilience4j`、Go `retry-go`） | ✅ 需要 |
| 熔断（circuit breaker） | 应用层加熔断库 | ✅ 需要 |
| 超时控制 | 应用层设置 HTTP client timeout（大多数应用本来就有） | ⚠️ 可能已有 |
| 故障注入测试 | 改用其他方式（如 AWS FIS） | ❌ 不需要 |
| mTLS 双向认证 | ALB 原生支持 mTLS，配置层面解决 | ❌ 不需要 |
| 分布式追踪（tracing） | 应用层集成 X-Ray SDK 或 OpenTelemetry SDK | ✅ 需要（如果之前依赖 Envoy 自动注入 trace header） |

### 典型迁移工作量

```
代码层面：
├── 服务 endpoint 地址更新（环境变量/配置文件）     → 配置变更，非代码修改
├── 补充 retry 逻辑（如果之前依赖 mesh）           → 每个服务 10-30 行代码
├── 补充 tracing 集成（如果需要）                   → 每个服务 50-100 行代码
└── HTTP client timeout 确认                       → 通常已有，检查即可

基础设施层面：
├── 创建 internal ALB + Target Group               → IaC 模板修改
├── 更新 ECS Task Definition（移除 Envoy sidecar）  → IaC 模板修改
├── 更新 DNS / 服务发现配置                         → IaC 模板修改
└── 移除 App Mesh 资源（Virtual Service/Node/Router）→ IaC 清理
```

---

## 决策建议

```
你的工作负载主要在哪里？
│
├── ECS (Fargate/EC2)
│   ├── 需要 mesh 能力（熔断/重试/可观测性）？
│   │   └── ✅ ECS Service Connect
│   └── 只需路由 + 负载均衡，服务数量少？
│       └── ✅ ALB（最简单，团队最熟悉）
│
├── EKS (Kubernetes)
│   ├── 需要跨 VPC/跨账号通信？
│   │   └── ✅ VPC Lattice（原生跨网络，无 sidecar）
│   ├── 需要高级流量管理（故障注入/熔断/细粒度路由）？
│   │   └── ✅ Istio（功能最全，但运维成本高）
│   ├── 追求简单轻量 + mTLS？
│   │   └── ✅ Linkerd（最轻量，但功能有限）
│   └── 简单路由，服务少？
│       └── ✅ ALB（通过 AWS LB Controller）
│
└── 混合（ECS + EKS + EC2 + Lambda）
    └── ✅ VPC Lattice（唯一支持全部计算类型的方案）
```

对于大多数从 App Mesh 迁移的场景，**AWS 官方推荐路径是：ECS 用户 → Service Connect，EKS 用户 → VPC Lattice**。这两个方案迁移路径最清晰，AWS 有详细的迁移指南和博客支持。ALB 是一个务实的轻量级选项，特别适合服务数量不多、团队不想引入新 mesh 概念、且应用层已有弹性处理逻辑的场景。
