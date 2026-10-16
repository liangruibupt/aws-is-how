# Lambda Web Functions 深度调研 + 实测 Lab

> 2026-10-12 发布的 **AWS Lambda Web Functions** 调研，并在 us-east-1 上真机实测（2026-10-16）。
> 文中标 **[文档]** 的结论来自 AWS 官方文档 / 定价页，标 **[实测]** 的是本仓库 Lab 真实跑出来的数据。

- 官方博客：[Announcing AWS Lambda Web Functions](https://aws.amazon.com/blogs/aws/announcing-aws-lambda-web-functions-for-fast-consistent-web-app-performance-anywhere/)
- 开发者指南：[Lambda Web Functions](https://docs.aws.amazon.com/lambda/latest/dg/web-functions.html) · [配额](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html#web-functions-quotas) · [扩缩容](https://docs.aws.amazon.com/lambda/latest/dg/web-functions-scaling.html) · [网络](https://docs.aws.amazon.com/lambda/latest/dg/web-functions-networking.html) · [访问控制/CloudFront OAC](https://docs.aws.amazon.com/lambda/latest/dg/web-functions-endpoint-access-control.html)
- 定价：[AWS Lambda Pricing](https://aws.amazon.com/lambda/pricing/) · MicroVMs：[Lambda MicroVMs 指南](https://docs.aws.amazon.com/lambda/latest/dg/lambda-microvms-guide.html)

---

## 1. 一句话定位

Web Functions = **"你的 HTTP Server 原样上 Lambda"**：代码 `listen()` 在 `AWS_LAMBDA_HTTP_ENDPOINT` 给的地址上，Lambda 负责 HTTPS 入口、扩缩容（含缩到 0）、多 Region、灰度。和老 Lambda 最本质的区别有三个：

1. **一个执行环境同时处理多个请求**（默认上限 64，最大 128），而不是 1 环境 = 1 请求；
2. **vCPU 只按"真正在跑的 CPU 时间"计费**，等待数据库 / LLM 的时间几乎不花钱；内存按环境存活时长 × 实际消耗内存计费；
3. **没有 event/handler**：Express / Hono / Fastify / Next.js 不需要 adapter（Lambda Web Adapter 也不需要了）。

---

## 2. 深度拆解（用户关心的点逐条回答）

### 2.1 计算规格与限制

| 项目 | Web Functions | 可调 | 实测 |
|---|---|---|---|
| 每环境 vCPU | **固定 2 vCPU**（Arm64/Graviton） | 否 | `os.cpus()=2`，CPU 型号 **Neoverse-V2（Graviton4）** |
| 每环境内存 | **固定 2 GB**（没有 128MB–10GB 的旋钮） | 否 | `totalmem=2402 MB`；V8 heap_size_limit 1408 MB（默认 old-space 1024 MB，可用 `NODE_OPTIONS=--max-old-space-size` 调） |
| 单请求最长时长 | `timeoutSeconds` 3–900 s，**默认 30 s** | 是（按 revision） | 设 300 s 后，40 s 的请求正常返回 |
| 环境寿命 | **无保证**，Lambda 随时可回收；没有 15 分钟的"调用"上限概念，环境可以服务成千上万个请求 | — | 同一环境跨 1h+ 实验持续存活 |
| 冷启动 | Server 必须 **10 s 内开始 listen** | 否 | 首个请求 ~0.67 s（含 TLS） |
| 缩容 | 停止路由 → 尽力等在途请求 → `SIGTERM` → **1 s** 后杀进程 | 否 | — |
| 每环境并发请求 | `maxConcurrencyPerEnvironment` 1–128，默认 64；Lambda 另有一个**动态上限**（按资源使用自适应，≤ 你设的值） | 是（按 revision） | 爬坡负载下单环境达到 **64 并发** |
| 每环境 fd / 进程线程 | 1024 / 1024 | 否 | `/proc/self/limits` 一致 |
| 代码包 | .zip，解压后 ≤ **512 MB**（Event Functions 是 250 MB）；**不支持容器镜像、Layers** | 否 | — |
| 运行时 | 仅 **Node.js 24（nodejs24.x）**，自动打补丁，不能锁 patch 版本 | — | `v24.21.0`，内核 `6.18 …amzn2023.aarch64.microvm` |
| 环境变量 | 合计 32 KB（Event Functions 4 KB） | 否 | — |
| 请求头 | 请求行+头 ≤ 128 KiB，超了 431 | 否 | — |
| 请求/响应体 | **流式，文档没有 6 MB 式的上限**，受 timeout 约束 | — | [实测] 上传 300 MB、下载 300 MB 都成功，sha256 校验一致 |
| 单连接带宽 | 文档未写 | — | [实测] **约 8 MB/s（~64 Mbps）/ 连接**；同一环境 4 条连接并行 ≈ 33 MB/s，线性叠加 |

账号级（每 Region）：100,000 RPS、**2,000 Arm vCPU（= 1,000 个环境）**、每 endpoint 10,000 RPS。**新账号会被调低**——本账号实测 `get-web-account-settings` 返回 `maxTotalArmVCpus=200`（= 100 个环境）、`maxTotalRateLimit=10000`，按使用量自动上调。

### 2.2 本地存储 vs 共享存储

- **本地：`/tmp` 固定 512 MB，不可调**（Event Functions 可到 10 GB）。[实测] `statfs` 显示 525 MB；`/var/task`（代码目录）和 `/` **只读**，进程 uid 993。
- **`/tmp` 被同一环境内所有并发请求共享**，且跨请求持久直到环境被回收 → 文件名必须唯一、用完即删（Lab 的 `/api/upload` 就是这么做的；并发两个 300 MB 上传会把 `/tmp` 写爆）。
- **内存里的全局状态也跨请求共享**：缓存、连接池、单飞（single-flight）去重都能用，但不能把"每请求状态"放全局变量。
- **共享存储：Web Functions 目前没有 EFS / S3 Files 挂载选项**（配置章节只有部署包、架构、超时、环境变量、标签、metadata；Event Functions 才有 EFS / S3 Files）。共享数据走网络服务：S3、DynamoDB、ElastiCache、Aurora/RDS 等。
- 访问 VPC 内资源（RDS、ElastiCache 等）要给 revision 挂 **egress network connector**（`aws lambda-core create-network-connector`，`AssociatedComputeResourceTypes=["WebFunction"]`）。**限制：只有 HomeRegion endpoint 能用 connector**，MultiRegion/PerRegion 不行；connector 只给出站，不提供公网（要 NAT）。
- 不挂 connector 时出站直连公网 IPv4，源 IP 不固定、不能用于白名单。

### 2.3 要不要 ALB？

**不需要。** 每个 endpoint 自带 Lambda 托管的 HTTPS 域名（`<id>.<shard>.lambda-web.<region>.on.aws`，MultiRegion 是 `<id>.lambda-web.global.on.aws`），TLS 由 Lambda 终止，只开 443。文档列出的"前门"是 **CloudFront 或 API Gateway**；ALB 的 Lambda target 是 Event Functions 的调用方式，文档没有把 ALB 列为 Web Functions 前门。

需要前门的典型原因：
- **自定义域名**：endpoint 本身**不支持 custom domain**；
- **AWS WAF**：endpoint 不能直接挂 WAF；
- 边缘缓存、viewer 侧 HTTP/2/HTTP/3、压缩。

协议边界（决定能不能"原样迁移"）：
- 到你应用的协议只有 **HTTP/1.1**；HTTP/1.0 返回 505；
- **不支持 WebSocket**（`Upgrade` 头被剥掉）→ 单向推送用 SSE；
- 请求通路是**半双工**：先收完 body 再发响应（不能边收边回）；
- 方法：GET/HEAD/POST/PUT/PATCH/OPTIONS/DELETE；
- Lambda **不加 CORS 头**，需应用或前门处理；
- 不支持 PrivateLink 访问 endpoint——**每个 endpoint 都是公网可达的**，`IamAuth` 只是鉴权不是网络隔离。

### 2.4 怎么和 CloudFront 集成（OAC）

推荐的生产形态（本 Lab `scripts/cloudfront.sh` 已实现并验证）：

```
Viewer ──HTTPS(h2/h3)──> CloudFront (+WAF, 自定义域名)
                           │  OAC: origin type = lambda, signing = always-amz-auth (SigV4)
                           ▼
                Web Function endpoint (AuthType = IamAuth)
                           │  resource policy: 只允许 cloudfront.amazonaws.com
                           │  且 aws:SourceArn = 这个 distribution
                           ▼
                     你的 Express server
```

要点：
1. endpoint 必须是 **`IamAuth`**；`ApplicationManaged` endpoint 放 CloudFront 后面照样能被直连绕过。
2. OAC 的 `OriginAccessControlOriginType=lambda`，`SigningBehavior=always-amz-auth`（其它签名行为会被拒）。这个模式下 CloudFront **不占用 `Authorization` 头**，你的 JWT/cookie 认证可以继续用。
3. **不能把 viewer 的 `Host` 头转发给 origin**（Lambda 按 Host 路由，否则 404）→ 动态路径用 `Managed-AllViewerExceptHostHeader` origin request policy。
4. 静态资源（`/assets/*`）用 `CachingOptimized`，应用侧返回 `immutable` 长缓存；SSR/API 用 `CachingDisabled`。
5. `X-Forwarded-For` 最后一个值会变成 CloudFront 的 IP。
6. 流式/长请求注意 CloudFront origin read timeout（默认 30 s，本 Lab 设 60 s；更长需提配额）。

[实测] 直连 IamAuth endpoint → **403**；经 CloudFront → **200**；`/assets/app.js` 第二次 **`x-cache: Hit from cloudfront`**；POST 20 MB 上传、SSE、Bedrock 流式经 CloudFront 全部正常。

### 2.5 鉴权

- `IamAuth`：调用方 SigV4（MultiRegion 用 **SigV4a**，region set `*`）签名，必须带 `X-Amz-Content-SHA256`（流式用 `UNSIGNED-PAYLOAD`），Lambda **不校验 body 与哈希是否一致**。IAM action：`lambda:InvokeWebFunctionEndpoint`，支持跨账号 resource policy、ABAC 标签条件。
- `ApplicationManaged`：Lambda 完全不鉴权（`deploy` 默认就是它！）。组织层可以用 SCP + `lambda:Request/WebFunctionAuthType` 条件键禁止创建公开 endpoint。

### 2.6 扩缩容与限流

- 两个维度：环境数（≤ `maxEnvironments` 2–10,000，且受账号 vCPU 配额）× 每环境动态并发（≤ `maxConcurrencyPerEnvironment`）。
- **没有 provisioned / 最小环境数**，总是从 0 起；Lambda 会**提前预留 headroom 环境**来吸收小幅上涨。
- 打满时**立即 429，不排队**（只有"有环境正在初始化"时才排队）。`rateLimit`（0 / 100–1,000 步长 100 / 2,000–10,000 步长 1,000）超了也是 429；`rateLimit=0` 返回 **503 `Platform.EndpointDisabled`**，等于一个"一键下线"开关。
- MultiRegion/PerRegion 的所有上限**按 Region 各算各的**。

### 2.7 发布、灰度、多 Region

- 资源模型：**Web Function → Revision（不可变：代码+配置）→ Endpoint（域名+鉴权+扩缩容+权重）**。一个函数最多 10 个 endpoint、自动清理保留约 50 个 revision；每个 endpoint 最多同时路由 **2 个 revision**（权重 1–100）。
- `autoDeploymentMode`：`LatestRevision`（新 revision 一激活就切）或 `Disabled`（按权重）。MultiRegion/PerRegion 只能 `Disabled`。
- endpoint 类型：`HomeRegion`；`MultiRegion`（一个全局域名，基于延迟、best-effort 路由）；`PerRegion`（每 Region 一个域名，你自己做 DNS/前门路由）。**类型和 Region 集合创建后不能改。**
- 上线区域：us-east-1、us-east-2、us-west-2、ap-northeast-1、eu-west-1。

### 2.8 计费（us-east-1，Arm）

| 维度 | 单价 |
|---|---|
| 请求 | $0.30 / 百万（Event Functions 是 $0.20） |
| 活跃 vCPU | $0.0000276944 / vCPU-秒（**只算真正跑 CPU 的时间**） |
| 内存 | $0.0000036667 / GB-秒（按**环境存活时长 × 实际消耗内存**，包括请求之间的空闲） |
| 数据传输 | 标准 EC2 数据传输费；与 VPC 之间也按同 Region 数据传输计费 |

**[实测]** 本 Lab 两小时的全部实验（2.1 万次成功请求、爬坡到 400 并发、300 MB 上下行、Bedrock 流式…）：CloudWatch `EnvironmentCPUTime` = **103.9 vCPU-s**，`EnvironmentActiveTime` = **18,311 s（5.09 环境小时）**，平均内存 209 MB → 估算总价 **≈ $0.023**。CPU 活跃时间只占环境存活时间的 **0.57%**——这就是 I/O 型负载上 active-CPU 计费的意义。另一面：Lambda 预热的 headroom 环境也在计内存（实测 5 个多环境小时里大部分是 headroom/空闲），只不过内存单价低。

---

## 3. Event Functions vs Web Functions vs MicroVMs

三者都跑在 Firecracker 上，"计算模型"不同。

| 维度 | **Lambda Event Functions**（老 Lambda） | **Lambda Web Functions** | **Lambda MicroVMs** |
|---|---|---|---|
| 发布 | 2014 | 2026-10-12 | 2026-06-22 GA |
| 编程模型 | `handler(event, context)`，事件驱动 | 标准 HTTP Server，listen 端口 | 任意 Linux 程序（Dockerfile 构建，从快照启动） |
| 并发模型 | **1 环境 = 1 个在途请求**（Managed Instances 除外） | **1 环境多请求**（1–128，默认 64，动态） | 1 MicroVM = 1 个会话/租户；每 VM 并发连接 8–128（随 vCPU） |
| 生命周期 | 平台管理；单次调用 ≤ 15 min | 平台管理；单请求 ≤ 15 min；环境寿命不保证；缩到 0 | **客户管理**：`run/suspend/resume/terminate`；单 VM 最长 **8 小时**；可挂起保留内存+磁盘 |
| 状态 | 无状态（环境复用只是优化） | 环境内共享内存/`/tmp`，但不保证 | **有状态**：挂起/恢复保留内存与磁盘 |
| 规格 | 内存 128 MB–10 GB，CPU 按比例（1,769 MB = 1 vCPU，最多 6 vCPU） | **固定 2 vCPU / 2 GB** | 基线 0.5 GB/0.25 vCPU – 8 GB/4 vCPU，**突发到 4×**（最大 32 GB/16 vCPU） |
| 本地磁盘 | `/tmp` 512 MB–10 GB | `/tmp` 固定 512 MB | 8–32 GB（随规格） |
| 共享存储 | EFS 或 S3 Files（二选一） | 无挂载，走 S3/DynamoDB/ElastiCache/RDS | 可在 VM 内挂文件系统（`additionalOsCapabilities=["ALL"]`） |
| 运行时 | Node/Python/Java/.NET/Ruby/自定义/容器镜像 | **仅 Node.js 24**，zip 包 | 任意（容器基础镜像，需快照兼容） |
| 架构 | x86_64 / arm64 | arm64 | arm64 |
| 入口 | API Invoke、事件源（SQS/Kinesis/Kafka/S3…）、Function URL、API Gateway、ALB | 自带 HTTPS endpoint；CloudFront/API Gateway 作前门 | 每个 VM 一个 HTTPS endpoint，JWE token（`X-aws-proxy-auth`）+ 端口路由 |
| 入站协议 | 视触发器；Function URL 为 HTTP | **HTTP/1.1，无 WebSocket**，SSE 可 | HTTP/1.1、**HTTP/2、WebSocket、gRPC**、SSE |
| 载荷 | 同步 6 MB；流式响应 200 MB | 流式，无 6 MB 上限 | 带宽随规格 1–16 MB/s |
| VPC | 函数级 VPC 配置 | egress connector（仅 HomeRegion endpoint） | egress connector；支持 PrivateLink 访问 VM |
| 多 Region | 自己做 | **内置**（MultiRegion 全局域名 / PerRegion） | 自己做 |
| 灰度 | 版本 + alias 权重 | revision + endpoint 权重（≤2 个） | image version |
| 冷启动优化 | SnapStart、Provisioned Concurrency | 预留 headroom（无 provisioned 选项） | 快照启动 + 挂起/恢复 |
| 计费 | 请求 $0.20/M + GB-秒（**墙钟时间**，等 I/O 也算） | 请求 $0.30/M + **活跃 vCPU 秒** + 消耗内存 GB-秒 | vCPU-秒 + GB-秒（基线持续计、突发按实际）+ 快照读写/存储 |
| 最适合 | 事件处理、队列消费、异步任务、AWS 服务集成 | 网站、SSR、REST/GraphQL API、BFF、LLM 流式代理 | 跑**不可信/AI 生成代码**的沙箱、云 IDE、Notebook、RL 环境、多租户 CI |

选型口诀：**事件来了处理一下 → Event；用户/客户端发 HTTP → Web；要给每个用户一台隔离的"小电脑" → MicroVM。** 一个产品里三者可以同时用（博客原话：Event 做异步后端、Web 做面向用户的 API/SSR、MicroVM 做交互式代码执行）。

几个容易误判的点：
- Web Functions **不是**"Event Functions + Function URL 的升级版"——它把内存旋钮、容器镜像、Python/Java、EFS、10 GB `/tmp` 都拿掉了，换来多并发 + active-CPU 计费 + 内置多 Region。CPU 密集型、大内存或非 Node 的 HTTP 服务现阶段仍要用 Event Functions（或 Fargate/App Runner/EC2）。
- 需要 **WebSocket / gRPC / HTTP/2 直达应用**的，Web Functions 做不了，MicroVM 可以（但 MicroVM 是按会话的"一人一台"，不是给海量匿名流量的 Web 前端用的）。
- Web Functions 的 30 s 默认超时很容易让 SSE/LLM 流被截断，务必显式设 `--timeout-seconds`。

---

## 4. Lab：比官方 Hello World 多走几步

一个**普通 Express 5 应用**（`app/`），没有任何 Lambda adapter，只读了 `AWS_LAMBDA_HTTP_ENDPOINT`。每个路由都是一个让 Web Functions 特性"现形"的实验；`scripts/` 里是对应的压测/部署脚本。

```
app/
  index.js        Express server：所有实验路由、worker_threads 池、单飞缓存、SIGTERM
  page.js         SSR 仪表盘（每次请求实时渲染当前环境状态）
  public/         静态资源（immutable 长缓存，给 CloudFront 用）
  worker.js cpu.js
scripts/
  deploy.sh       一条命令部署（aws lambda-web deploy）+ 给执行角色加 Bedrock 权限
  smoke.mjs       全路由冒烟
  packing.mjs     冷突发：N 个并发 I/O 请求落在几个环境上
  ramp.mjs        爬坡：闭环虚拟用户 10→400，观察动态并发上限爬升
  canary.sh       不可变 revision + prod endpoint 90/10 灰度 + 提升/回滚
  ratelimit.mjs   endpoint rateLimit 与 429
  multiregion.sh  MultiRegion 全局域名 + PerRegion 每区域名
  cloudfront.sh   CloudFront + OAC + IamAuth + resource policy + 静态缓存
  billing.mjs     从 CloudWatch 取 CPU/环境时长/请求数估算账单
  teardown.sh     清理全部资源（需你自己执行）
infra/bedrock-policy.json
```

| 路由 | 展示什么 |
|---|---|
| `GET /` | SSR 页面，显示"是哪个环境渲染的、它已服务多少请求" |
| `GET /api/whoami` | 环境 ID / revision / Region / AZ（metadata endpoint）/ 在途数 / 内存 / 事件循环延迟 |
| `GET /api/io?ms=` | 纯等待：多并发打包 + 几乎不耗 CPU |
| `GET /api/cpubench` | 同一环境内：主线程 vs `worker_threads`（2 vCPU） |
| `GET /api/cache?key=` | 进程内共享缓存 + 并发请求合并为一次上游调用 |
| `POST /api/upload` | 流式请求体落 `/tmp` + 边收边算 sha256（>6 MB） |
| `GET /api/download?mb=` | 流式大响应 |
| `GET /api/events` | SSE 长连接推送环境实时指标 |
| `GET /api/chat?q=` | Bedrock ConverseStream → SSE 逐 token 推送（需 `x-lab-key`） |
| `GET /api/probe` | 实测沙箱：CPU 型号、内存、heap、`/tmp`、可写目录、ulimit、环境变量名（值已脱敏） |

### 4.1 实测结果

**A. 多并发打包（核心差异）** — `node scripts/ramp.mjs <url> 10,25,50,100,200,400 20 1000`，每个请求等待 1 s：

| 虚拟用户 | 成功/429 | 服务它们的环境数 | 单环境最大并发 | 平均每环境并发 |
|---|---|---|---|---|
| 10 | 190 / 0 | 20（headroom） | 1 | 1.0 |
| 50 | 975 / 0 | 17 | 3 | 3.0 |
| 100 | 1,950 / 0 | 17 | 24 | 17.7 |
| 200 | 3,900 / 0 | **5** | 42 | 38.6 |
| 400 | 7,800 / 0 | **9** | **64** | 44.0 |

400 个并发长请求由 **9 个环境**扛下、零 429；Event Functions 需要 400 个并发执行环境（且每个都按 1 s 墙钟计费）。平台额外开销 p50 ≈ 5 ms。

**B. 冷突发是反面教材** — 同样 `maxEnvironments=20`，从静止**瞬间**打 200 个并发：只有 40 个成功，**160 个 `429 Platform.EndpointMaxEnvThrottle`**；1,000 并发时 ~90% 被拒。原因：动态每环境并发上限是**按观测到的资源使用逐步放开**的，冷的时候每环境只给 2–3 个，环境数又被 `maxEnvironments` 卡住，而打满后**不排队直接 429**。结论：要么别把 `maxEnvironments` 设太小，要么客户端做退避重试，要么流量爬坡。

**C. CPU** — `GET /api/cpubench?jobs=4&n=1500`（同一环境内）：

| | 墙钟 | 事件循环最长卡顿 |
|---|---|---|
| 主线程 | 527 ms | **131 ms**（这期间该环境上所有其它请求都被冻住） |
| worker_threads ×2 | 281 ms | **0–7 ms** |

加速 1.87×，证明确实有 2 个可用 vCPU；CPU 密集逻辑必须进 worker 或调低 `maxConcurrencyPerEnvironment`。

**D. 共享内存缓存** — 同一冷 key 的并发请求在同一环境里被合并成一次上游调用（`miss` + `coalesced`）；分散到不同环境的才各自 miss。Event Functions 下 N 个并发 = N 次上游调用。

**E. 大载荷** — 上传 300 MB（流式写 `/tmp`，服务端 sha256 与客户端一致，写完 `/tmp` 剩 213 MB）、下载 300 MB 均成功，单连接 ~8 MB/s，同环境 4 连接并行线性叠加到 ~33 MB/s。

**F. LLM 流式** — Bedrock `global.anthropic.claude-haiku-4-5` 经 SSE 推送，首 token ~0.86 s；一次请求进程 CPU ~80–107 ms，墙钟更长——正是 active-CPU 计费省钱的场景。

**G. 灰度** — `scripts/canary.sh`：`dev`（LatestRevision）部署后 100% 立即切到 v2；`prod`（Disabled）纹丝不动仍 100% v1；设 90/10 并等 `updateStatus=Successful` 后实测 1,000 次请求 **v1 900 / v2 100**；提升后 100% v2。注意：`update-web-function-endpoint` 返回后有几秒 `InProgress`，期间测量会偏（脚本里踩过：太早测得 98/2）。

**H. 限流** — `rateLimit=100` 下以 300 RPS 打 5 s：第 1 秒放行 189（文档说的"短时突发可能被接受"），之后稳定 ~50–90/s 成功，其余 `429 Platform.EndpointRequestThrottle`，另有少量无 error-type 的 503（文档：平台保护性卸载，应退避重试）。`rateLimit=0` → `503 Platform.EndpointDisabled`。

**I. 多 Region** — 一条 `deploy --endpoint-type MultiRegion --regions us-east-1,us-west-2,ap-northeast-1` 约 70 s 就绪，得到 `https://<id>.lambda-web.global.on.aws`；从 us-east-1 的主机访问 100% 落 us-east-1。同函数再建 PerRegion endpoint，三个区域域名分别返回 `us-east-1/use1-az2`、`us-west-2/usw2-az1`、`ap-northeast-1/apne1-az4`。（只能从一个地理位置测，没法在这里证明欧洲/亚洲用户会被路由到近区。）

**J. CloudFront + OAC** — 见 2.4：直连 403、经 CloudFront 200、静态资源边缘命中、POST/SSE/流式正常。

**K. 账单** — 见 2.8：全套实验 ≈ **$0.02**。

### 4.2 复现

```bash
# 需要 AWS CLI >= 2.38（带 lambda-web 命令），Node 20+
cd app && npm ci && AWS_LAMBDA_HTTP_ENDPOINT=127.0.0.1:3000 node index.js   # 本地就是普通 Express
cd .. && ./scripts/deploy.sh                       # 输出 https://<id>.<shard>.lambda-web.us-east-1.on.aws
node scripts/smoke.mjs "$URL" "$(cat .lab-key)"
node scripts/ramp.mjs  "$URL" 10,25,50,100,200,400 20 1000
node scripts/packing.mjs "$URL" 200 2000 3
curl "$URL/api/cpubench?jobs=4&n=1500"
./scripts/canary.sh
node scripts/ratelimit.mjs "$URL" 300 5           # 先用 update-web-function-endpoint --throttle-config '{"rateLimit":100}'
./scripts/multiregion.sh
./scripts/cloudfront.sh
node scripts/billing.mjs wf-lab 120
./scripts/teardown.sh                              # 删除全部 Lab 资源
```

安全说明：`dev`/`prod`/`global`/`regional` endpoint 是 `ApplicationManaged`（公网无鉴权，用于演示）；`/api/chat` 用 `LAB_KEY`（`.lab-key`，已 gitignore）保护以免被刷 Bedrock；`/api/probe` 只输出环境变量名，敏感值脱敏。`/api/upload`、`/api/probe` 加了 `express-rate-limit`（每环境每客户端 30 次/分钟），这只是单环境内的兜底；跨环境的总量控制靠 endpoint 的 `rateLimit`。生产请用 `IamAuth` + CloudFront OAC。

---

## 5. 结论

- Web Functions 把"HTTP 服务上 Lambda"从"适配"变成"原生"：多并发 + active-CPU 计费让 **I/O 型 Web/API/LLM 代理**在 Lambda 上第一次在成本模型上合理；内置 MultiRegion、revision 灰度、CloudFront OAC 私有源是实打实的运维减负。
- 代价是**规格被锁死**（2 vCPU / 2 GB / 512 MB `/tmp` / 仅 Node 24 / 无 WebSocket / 无 EFS / 无 provisioned），以及**冷突发 + 小 `maxEnvironments` 会直接 429**。
- Event Functions 继续负责事件和需要灵活规格的场景；MicroVMs 负责"每个用户/Agent 一台隔离、有状态的小电脑"。三者是互补关系，不是替代关系。
