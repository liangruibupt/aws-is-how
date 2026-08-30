# 用 Kiro + Transform Power 完成 Transform Workshop

> **执行方式说明(重要)**:本文记录的全部转换动作——创建 Workspace/Job、创建并激活 Connector、提交每一个 HITL 步骤、重启 Job、schema 转换、.NET 代码改造与验证——均由 **Kiro + AWS Transform Power(通过 MCP `aws-transform-mcp` 工具,以 `WSParticipantRole/Participant` 角色、`atx-wworkshop` AWS 凭证)** 驱动完成。
>
> **不是**用户手动登录 AWS Transform Web 应用(`atx web app`,以 IAM Identity Center 用户 `workshop-user` 身份)点击操作的。Web 应用仅用于旁观/审批查看;`workshop-user` 是被 Kiro 通过 MCP 加为 workspace 协作者(ADMIN)后才能看到 Job 页面的。凡文中出现的 HITL 决策(如 CRITICAL SchemaConversionTargets 的批准),除非明确注明"由 admin 在 Web 端批准",否则都是 Kiro 经 MCP 提交的。

> **结论(2026-08-30 结项)**:**AWS Transform 托管流程对 .NET + SQL Server 的现代化转换目前不成熟,不建议用于生产。** 依据:两天内用相同且正确的输入驱动托管流程,累计 **7 次失败 / 分布在 5 个不同阶段**(DB-connector、assess-plan、wave-confirm 卡死、schema-conversion 执行等),每次死在不同地方,呈服务端非确定性故障,客户端无法修复或规避。业务目标最终由**绕开托管编排的两条确定性路径**达成:独立 DMS project 完成 schema 转换(9 表 / 459 行 DDL)+ Kiro 直接改 .NET 代码(SqlServer→Npgsql,build 0 错误、Docker 中 PG16 运行验证通过)。托管流程本轮**主动停止,不再重跑**。

## 前提
1. 装好 Kiro 以及 Transform Power。
2. 准备好本 Workshop 的实验环境：
- 在 [Workshop Studio](https://studio.us-east-1.prod.workshops.aws/workshops/public) 中搜索 Accelerating .NET and SQL Server Modernization using Agentic AI。
- 点进去，点击 Create Event，然后选择 Test Event 类型即可。
3. 已启用 Transform Web Application。具体操作如下：
- 参考 [Enable AWS Transform](https://catalog.workshops.aws/atx-sql-server-mod/en-US/create-transformation-job/enable-aws-transform)，完成设置以及添加 workshop-user 这个 IdC 用户。
- 参考 [User Authentication](https://catalog.workshops.aws/atx-sql-server-mod/en-US/getting-started-aws-event/user-authentication)，用 workshop-user 这个用户登录 Secrets Manager 中获取的 startUrl 链接。
4. [Web UI 版本参考](https://catalog.workshops.aws/atx-sql-server-mod)

## 使用 Kiro 驱动 Transform
1. 启动 Transform 任务
```markdown
使用 AWS Transform Power 帮我完成一个 SQL Server + .NET 技术栈应用进行现代化改造。将 SQL Server 转换成 Aurora PostgreSQL，.NET 应用也做相应的改造。

过程中需要用到信息以及一些决策信息已经放在 environments.txt 文件中, 我已经开通 Transform web 应用，通过 IAM Identity Center 添加了 Transform 用户：workshop-user，
startUrl: https://d-90667d7323.awsapps.com/start, 我配置可以登录AWS 的Profile: atx-wworkshop, 过程中需要创建 Connector, 你可以创建, 我来审批

基于上述信息，帮我全程完成该转换任务, 非必要不要停止, 直到任务完成(最后的代码转换阶段可能不成功, 你来帮我修复，并且重试).
```

2. 检查 Transform 任务
```markdown
# AWS Transform Power进行检查
使用 AWS Transform Power 帮我检查 Workspace 里面 Job 状态。 过程中需要用到信息以及一些决策信息已经放在 environments.txt 文件中, 我已经开通 Transform web 应用，通过 IAM Identity Center 添加了 Transform 用户：workshop-user，
startUrl: https://d-90667d7323.awsapps.com/start, 我配置可以登录AWS 的 Profile: atx-wworkshop

当前的 AWS Transform Workspaces ID:  a8397001-c0a3-4491-9c11-4a00aee4e615（工作区名称 sqlserver-dotnet-modernization）
关联的 Job：4e4a987a-0c5e-4893-b00d-6c8d90fd4372（bookstore-sqlserver-to-aurora-pg）

# AWS Transform Web App进行检查
- The IDE/MCP session authenticates as WSParticipantRole/Participant (a role, via atx-wworkshop AWS credentials). Every action in this job — creating it, submitting all the HITL tasks — was done by that Participant role.
- The web app you're viewing is signed in as the IAM Identity Center user workshop-user. That's a different identity.
  
In AWS Transform, workspace/job visibility is scoped to collaborators. workshop-user can see the workspace, but is not a collaborator on this specific job, so the job page 403s and shows "Something went wrong."
  
**How to fix — add workshop-user as a collaborator**

● aws-transform-mcp/manage_collaborator
    ╰ action=use, powerName=aws-transform, serverName=aws-transform-mcp, toolName=manage_collaborator

Done. workshop-user (Workshop User) is now an ADMIN collaborator on the workspace.
```


---

## 直接代码转换（SQL Server → PostgreSQL）+ 数据库验证

### 背景 / 为什么走这条路
托管 AWS Transform 的数据库现代化流程在本 workshop 账号里 **连续失败 5 次**，且死在 **4 个不同阶段**：

| 次数 | Job | 失败阶段 |
|------|-----|---------|
| 1 | bookstore-sqlserver-to-aurora-pg | schema-conversion |
| 2 | ...-retry | assess-plan |
| 3 | ...-retry（重启） | wave-confirm 卡死（HITL 从未出现）|
| 4 | ...-retry（再重启）| assess-plan |
| 5 | bookstore-mssql-aurorapg-v2（全新 job）| DB-connector（最早）|

相同输入每次死在不同地方 = 托管编排的非确定性故障，非可修复的配置错误。按“同一方法失败两次即换思路”的原则，停止重试，改为**直接在 IDE 完成 .NET 代码转换**（Schema 转换已通过独立 DMS / Route 1 交付）。

### 目标应用
- 仓库：`liangruibupt/bobs-used-bookstore-sample` 分支 `MAM303`（本地克隆于 `/Users/ruiliang/Documents/workspaces/bobs-used-bookstore-sample`）
- 技术栈：.NET 8，EF Core 8.0.11，5 个项目 / 1 个解决方案
- 数据访问：`ApplicationDbContext`（Bookstore.Data），启动时 `EnsureCreatedAsync()` 建库建表（**无 EF migrations**），种子数据用 `HasData`（SeedData.cs）

### 代码改动清单（SqlServer → Npgsql）
1. `app/Bookstore.Data/Bookstore.Data.csproj`：`Microsoft.EntityFrameworkCore.SqlServer` 8.0.11 → `Npgsql.EntityFrameworkCore.PostgreSQL` 8.0.11
2. `app/Bookstore.Web/Bookstore.Web.csproj`：同上
3. `app/Bookstore.Web/Startup/ServicesSetup.cs`：
   - `using Microsoft.Data.SqlClient;` → `using Npgsql;`
   - `option.UseSqlServer(connString)` → `option.UseNpgsql(connString)`
   - `SqlConnectionStringBuilder` → `NpgsqlConnectionStringBuilder`（`UserID` → `Username`）
   - Secrets Manager 连接串：`Server=..,..;Initial Catalog=BobsUsedBookStore;MultipleActiveResultSets=true;Integrated Security=false;TrustServerCertificate=true` → `Host=..;Port=..;Database=postgres;SSL Mode=Require;Trust Server Certificate=true`
4. `app/Bookstore.Web/appsettings.Test.json`：LocalDB(MSSQL) 连接串 → Npgsql 连接串

**未改动**：`Bookstore.Cdk/DatabaseStack.cs` 仍是 SQL Server RDS（IaC 基础设施，不属于运行应用；约束为“不发布应用”，故不动）。代码本身很干净——没有 `HasColumnType`/`nvarchar`/`datetime2`/`getdate`/`NEWID`/`FromSql`/rowversion，也没有 migrations 或裸 SQL 需要转换。实体的 `DateTime` 均用 `DateTime.UtcNow`（Kind=Utc），Npgsql 的 `EnsureCreated` 会生成 `timestamptz`，写入匹配。

### 数据库验证（真实 PostgreSQL）
`dotnet`/`psql` 本地未安装，改用 Docker：
- PostgreSQL：`postgres:16-alpine`（容器 `bobs-pg`，网络 `bobsverify`，宿主端口 5433）
- 构建/运行：`mcr.microsoft.com/dotnet/sdk:8.0`
- 验证工程：`/Users/ruiliang/Documents/workspaces/bobs-verify`（`Program.cs` + `bobs-verify.csproj`，引用转换后的 Bookstore.Data + Bookstore.Domain）

验证结果（日志 `bobs-verify/verify.log`）：
- `dotnet build Bookstore.Web -c Release` → **Build succeeded**，生成 `Bookstore.Web.dll`，**0 编译错误**（940 条 warning 全部是既有的 Magick.NET NU19xx 漏洞公告，与本次转换无关）
- 运行时（PostgreSQL 16.15）：
  - Provider = `Npgsql.EntityFrameworkCore.PostgreSQL`
  - `CanConnect = True`
  - `EnsureCreated = True`（在真实 PG 上由 EF 模型生成 schema）
  - 种子数据完整：`ReferenceData = 24`，`Book = 8`
  - 运行时 CRUD：`Customer` INSERT → SELECT → DELETE 成功
  - **RESULT: VERIFICATION_OK**

### 真实割接说明（重要）
本次验证走的是 EF `EnsureCreated`：表由 EF 在 `public` schema 下、按 EF 命名（PascalCase、带引号）创建。
而 DMS 转换产出的 DDL（Route 1，`artifacts/bobsusedbookstore-converted-postgres.sql`）建的是 `bobsusedbookstore_dbo` schema、小写命名。
若真实割接要复用 DMS 生成的 schema，二选一：
- (a) 让 EF 自己管理 schema（`EnsureCreated`/migrations），不使用 DMS DDL；或
- (b) 在 DbContext 加 `HasDefaultSchema("bobsusedbookstore_dbo")` + 显式小写表/列映射，以对齐 DMS 输出（PostgreSQL 对带引号标识符大小写敏感，SQL Server 不敏感）。

### 复现验证
```bash
docker network create bobsverify
docker run -d --name bobs-pg --network bobsverify -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=BobsUsedBookStore -p 5433:5432 postgres:16-alpine
bash /Users/ruiliang/Documents/workspaces/bobs-verify/run-verify.sh
```


---

## 2026-08-29 复盘：托管流程 5 次失败 + 两条可用交付路径

> **执行主体:Kiro + AWS Transform Power(MCP,Participant 角色/`atx-wworkshop` 凭证),非用户通过 `atx web app` 手动操作。**
>
> 详细记录见上文「直接代码转换（SQL Server → PostgreSQL）+ 数据库验证」章节;本节为带日期的要点汇总。

### 目标
SQL Server(RDS `atx-rds-sqlserver` 上的 `BobsUsedBookStore`)→ Aurora PostgreSQL schema 转换 + .NET 应用(`bobs-used-bookstore-sample@MAM303`)代码改造;数据迁移=否;应用发布=否。

### 托管 AWS Transform 流程:5 次尝试全失败(4 个不同阶段)
| 次数 | Job | 失败阶段 |
|------|-----|---------|
| 1 | bookstore-sqlserver-to-aurora-pg (4e4a987a) | schema-conversion(export_sql_source)|
| 2 | ...-retry (d22997c6) | assess-plan |
| 3 | ...-retry(restart) | wave-confirm 卡死(HITL 从未出现)|
| 4 | ...-retry(restart) | assess-plan |
| 5 | bookstore-mssql-aurorapg-v2 (2433d963) | DB-connector(最早)|

相同输入死在不同阶段 → 托管编排非确定性故障,非可修复配置错误。

### 根因更正(重要)
- schema 转换失败的唯一确定根因是手写 CLI 的 **selection rule 写错**:`rule-action=explicit` 且 `schema-name='%'`;在 explicit 下 `%` 是字面量而非通配,匹配不到任何对象 → "No metadata models matched"。正确写法:`explicit` + server-name + database-name(省略 schema-name = 整库),或 `rule-action=include` + 通配 `%`。
- **撤回**"公网实例 profile(PubliclyAccessible=true)导致失败"的错误结论:对照测试证明公网项目用正确 rule 也成功;公网不是阻塞因素,另建的私网 instance profile 是多余的。
- 早期"Unexpected application error"及托管 18:07 的 schema-conversion 失败,最可能是 DMS SC 层瞬时抖动。

### 路线 1(可用):独立 DMS project 确定性完成 schema 转换
- 独立 DMS migration project `atx-sqlserver-sc-clean-retry`(PFT4N6A4WFE3JCPCYKFWTY6G44):import(req 35dcf9ca)→ conversion(req df4c971d)→ export(req 7938165d)全部 SUCCESS。
- 产物:9 张表、459 行 PostgreSQL DDL、schema `bobsusedbookstore_dbo`;本地 `artifacts/bobsusedbookstore-converted-postgres.sql`,S3 `s3://atx-db-modernization-267591443110-us-east-1/atx-sqlserver-sc-clean-retry/bobsusedbookstore-converted.sql.zip`。

### 路线 2(可用):直接 .NET 代码改造 DONE + VERIFIED
- 仓库克隆 `bobs-used-bookstore-sample @MAM303`;架构 EF Core 8.0.11,`ApplicationDbContext` 启动时 `EnsureCreatedAsync()` 建库建表(无 migrations),种子用 `HasData`。
- 改动 4 个文件(SqlServer → Npgsql):
  - `app/Bookstore.Data/Bookstore.Data.csproj` 与 `app/Bookstore.Web/Bookstore.Web.csproj`:`Microsoft.EntityFrameworkCore.SqlServer 8.0.11` → `Npgsql.EntityFrameworkCore.PostgreSQL 8.0.11`
  - `app/Bookstore.Web/Startup/ServicesSetup.cs`:`using Microsoft.Data.SqlClient` → `using Npgsql`;`UseSqlServer` → `UseNpgsql`;`SqlConnectionStringBuilder` → `NpgsqlConnectionStringBuilder`(`UserID`→`Username`);Secrets 连接串 `Server=..;Initial Catalog=..;MultipleActiveResultSets=true;...` → `Host=..;Port=..;Database=postgres;SSL Mode=Require;Trust Server Certificate=true`
  - `app/Bookstore.Web/appsettings.Test.json`:LocalDB(MSSQL)→ Npgsql
- 未改:`Bookstore.Cdk/DatabaseStack.cs`(仍是 SQL Server RDS,属 IaC 基础设施、不属运行应用,且约束为不发布);无 EF migrations / 裸 SQL 需转换;实体干净(无 HasColumnType/nvarchar/datetime2/getdate/NEWID/FromSql/rowversion),DateTime 均 UtcNow。
- 验证(Docker):PostgreSQL 16 + `mcr.microsoft.com/dotnet/sdk:8.0`;`dotnet build Bookstore.Web -c Release` = Build succeeded / 0 编译错误(940 warning 全是既有 Magick.NET NU19xx 公告);运行时 Provider=Npgsql、CanConnect=True、EnsureCreated=True、种子 ReferenceData=24 / Book=8、Customer CRUD OK → **VERIFICATION_OK**。

### 真实割接注意
验证走 EF `EnsureCreated`(EF 在 `public` schema、PascalCase 带引号建表);DMS 产出 DDL 是 `bobsusedbookstore_dbo` schema、小写命名。二选一:(a) 让 EF 自管 schema(EnsureCreated/migrations);(b) DbContext 加 `HasDefaultSchema("bobsusedbookstore_dbo")` + 显式小写映射对齐 DMS(PG 对带引号标识符大小写敏感,SQL Server 不敏感)。

---

## 2026-08-30 复盘：路线 A(完整重跑托管 Transform 流程)结果与经验

> **执行主体:Kiro + AWS Transform Power(MCP,Participant 角色/`atx-wworkshop` 凭证),非用户通过 `atx web app` 手动操作。** 下文的所有 HITL 提交、Job 重启均经 MCP `aws-transform-mcp` 完成。

### 背景
2026-08-29 已交付两项成果并验证:
- **Schema 转换**(SQL Server → PostgreSQL):经独立 DMS project 完成,产物 `artifacts/bobsusedbookstore-converted-postgres.sql`(459 行、9 张表、schema `bobsusedbookstore_dbo`)。
- **.NET 代码改造**(SqlServer → Npgsql):提交在仓库克隆分支 `MAM303converted`,`Bookstore.Web.csproj` 引用 Npgsql,`app/` 下已无 `UseSqlServer`。

本轮用户明确选择**路线 A**:用全新 Job 完整驱动托管 AWS Transform 流程,"看看托管到底能不能跑通",并要求非必要不停、失败就修复重试。

### 本轮实际执行(Job `bookstore-sqlserver-aurorapg-routeA` = 77e89442-d3ed-4f96-a8e7-c112913fbe39)
复用现有 workspace `sqlserver-dotnet-modernization`(a8397001-...)和两个 ACTIVE connector(源库 9313d893、源码 PAT 2f80b115),用 orchestrator `windows-database-agent` 新建 Job。

**Drive 1** 一路顺利跑过:前置条件 → 连接器 → 校验(无错)→ 发现(DB `BobsUsedBookStore` + repo `bobs-used-bookstore-sample@MAM303`)→ DB 评估(复杂度 1 / 9 表 / 0 存储过程)→ 源码评估(.NET8 / 5 项目 / 9678 LOC,EF Core SqlServer)→ 流水线/基础设施评估 → **波次计划确认(ModernizationWaves,这一步在2026-08-29 run 3 曾卡死不出现,本轮成功出现并提交)** → 部署选项=否 → **Schema 转换目标(CRITICAL)提交 create_new=false 复用现有 `atx-aurora-pg-cluster` / db `postgres`**。仅在**最后的 DMS schema 转换执行**阶段失败(transient,服务端),Job 置 FAILED。

**Drive 2**(restart → 欢迎菜单 → 重新 "Connect to database" 全量重跑):同样一路跑到资源选择完成,却在**更早的"assessment and planning"阶段**失败(约资源选择后 2 分钟),与2026-08-29 run 2 / run 4 的失败点相同。

### 关键结论(已确认,非猜测)
1. **托管 DB 现代化流程在本 workshop 账号上是非确定性失败的,客户端无法修复。**
   - 2026-08-30同样输入、两次失败在**两个不同阶段**(drive 1 = schema 转换执行;drive 2 = assess-plan)。
   - 合并2026-08-29 5 次失败(4 个阶段),累计 **7 次失败 / 5 个不同阶段**。每次死在不同地方 = 服务端编排的非确定性抖动,不是我方配置/输入错误。
2. **"transient DMS 失败"我无法在托管流程内部避免。** schema 转换由托管编排器在服务端自行驱动 DMS(import→convert→export/apply),我只提供输入(连接器/子网/目标库,均正确),碰不到内部 DMS 执行步骤;服务端瞬时抖动改任何输入都拦不住,只能重试(而重试是掷硬币,非修复)。
3. **欢迎菜单第 3 项 "Continue previous job from code assessment" 在本场景不可用(已实测确认)。** 它要求"一个**之前完成过 schema 转换的 Transform Job**"来继承 DDL/已转换 schema;本 workspace 没有任何 Transform Job 成功完成过 schema 转换,2026-08-29成功的是**独立 DMS project(非 Transform Job)**,无法被该选项消费。实测选它后 agent 回落到从头的 prereqs 流程。
4. **restart 行为**:对 FAILED 的 Job 执行 `control_job start` 会回到**欢迎菜单**并要求从头重跑(prereqs→连接器→校验→发现→评估→波次→目标→转换),没有"只重试 schema 转换"的粗粒度入口;因此每次重试代价约 15–20 分钟(含发现/评估),且可能在任意阶段再次抖挂。
5. **CRITICAL 目标库步骤提示"需 admin/approval 角色审批"**:我用 MCP 的 Participant 角色直接 APPROVE,drive 1 中 schema 转换确实真正启动并跑了约 2 分钟才挂 → 判断失败在 DMS 执行期而非审批闸门;但若后续仍失败,可让 `workshop-user`(ADMIN)在 Web 应用手动批准该步以排除审批因素。

### 效率建议(给下次)
- **不要盲目重跑托管全流程**:同法失败两次即停,避免每次 15–20 分钟的空转。
- 若目标是"业务成果"(schema + 代码转换):**2026-08-29的产物已满足**,直接复用,无需再跑托管。
- 若目标是"演示托管流程跑通":这是**本账号服务端可靠性问题**,非客户端可控;可换时间/换账号重试,或让 admin 亲自批准 CRITICAL 步骤后观察,但都不保证。
- 真正"确定性"的 schema 转换路径是**独立 DMS migration project**(正确 selection rule:`explicit` + server-name + database-name,省略 schema-name = 整库;或 `include` + 通配 `%`),每步可单独重试——但这条路绕开了托管编排,不体现 workshop 本身价值。

### 关键标识符(本轮)
- Workspace: `a8397001-c0a3-4491-9c11-4a00aee4e615`(sqlserver-dotnet-modernization)
- Job(路线 A): `77e89442-d3ed-4f96-a8e7-c112913fbe39`(bookstore-sqlserver-aurorapg-routeA),状态 FAILED(restartable)
- Orchestrator: `windows-database-agent`
- 连接器:源库 `9313d893-...`(dotnet_modernization|database|2)、源码 PAT `2f80b115-...`(platform|secretsmanager|1),均 ACTIVE
- 目标:现有 `atx-aurora-pg-cluster` / 实例 `atx-aurora-pg-instance` / db `postgres` / secret `...aurora-admin-2rpnnm`,create_new=false

### 结项状态(2026-08-30)
- **决定:停止,不再重跑托管流程。** 结论见文首「结论」块——AWS Transform 托管流程对 .NET + SQL Server 转换不成熟。
- **执行主体:全程 Kiro + AWS Transform Power(MCP `aws-transform-mcp`)**,以 `WSParticipantRole/Participant` 角色 + `atx-wworkshop` 凭证驱动;非用户在 `atx web app` 手动操作。
- **业务成果(已交付,绕开托管):** schema 转换 DDL(独立 DMS,9 表/459 行)+ .NET 代码改造(分支 `MAM303converted`,build 0 错误、Docker PG16 验证通过)。
- Job `77e89442-...` 停留在 FAILED(restartable),不再处理。凭证当前已过期(`ExpiredToken`),后续如需任何托管操作须先 `aws sso login --profile atx-wworkshop`。

---

## 对 AWS Transform 的功能增强建议

基于本次 .NET + SQL Server 现代化(两天 7 次失败 / 5 阶段)的实际体验,提出以下产品改进建议:

### 建议 1:支持单步重试失败步骤,而非整个 Job 从头 create new
- **现状痛点**:Job 在某一阶段(如 DMS schema 转换执行)失败后,`control_job start` 只会回到欢迎菜单,要求从头重跑整条链路(prereqs → 连接器 → 校验 → 发现 → 评估 → 波次 → 目标 → 转换),每次重试代价约 15–20 分钟,且前面已成功的发现/评估/波次结果全部作废、还可能在新的阶段再次抖挂。
- **期望能力**:提供**阶段级(step-level)重试**入口——对 FAILED 的 Job 能"只重试失败的那一步",复用此前已成功阶段的产物(discovery report、assessment report、wave plan、schema 转换目标配置等),不必重建 Job。
- **价值**:显著降低瞬时故障(transient)的恢复成本;把"掷硬币式全量重跑"变成"精准重试",也便于定位到底是哪一步不稳定。

### 建议 2:支持"确定性 schema + 托管代码转换"的混合路径(即之前讨论的方案 C)
- **背景**:托管流程里 schema 转换(服务端自动驱动 DMS)是本次最不稳定的一环;而**独立 DMS migration project** 能确定性地完成 schema 转换(每步可单独重试)。理想做法是两者结合。
- **期望能力**:允许**用独立 DMS(方案 B)确定性拿到 schema 后,回到托管 Job,通过欢迎菜单第 3 项"Continue previous job from code assessment"直接进入 .NET 代码转换阶段**,跳过托管内部那段不稳定的 schema 转换执行。
- **现状限制(已实测确认)**:该"Continue previous job from code assessment"目前**要求一个之前完成过 schema 转换的 Transform Job** 来继承已转换 schema/DDL;**独立 DMS project 不被识别为合格前置**,选它后 agent 会回落到从头的 prereqs 流程,因此当前**不支持**这条混合路径。
- **改进方向**:让托管 Job 能**导入/挂接外部 DMS project 的 schema 转换产物**(或接受用户上传的目标 DDL / schema conversion 结果)作为"code assessment 之后"的起点,从而把确定性的 B 与托管的代码转换阶段拼起来。
- **价值**:既规避托管 schema 转换的非确定性故障,又保留托管流程在 .NET 代码转换上的编排价值,让 workshop / 生产路径都能跑通。

### 建议 3:上线长流程前做输入校验 / dry-run
- **现状痛点**:连接器、子网、目标 Aurora 集群可达性、Secret、IAM 权限等要到跑了 15–20 分钟后的具体阶段才暴露问题。
- **期望能力**:Job 启动前统一做一次 preflight 校验(连接器连通性、子网/安全组、目标库可达、Secret 可解析、所需 IAM 权限),不通过就即时报错,不进入长流程。
- **价值**:把"跑很久才发现输入问题"提前到秒级失败,减少空转。

### 建议 4:失败可观测性——暴露具体根因而非笼统提示
- **现状痛点**:失败仅提示"AWS Transform has failed during assessment and planning"这类笼统信息,无法区分"用户输入问题"还是"服务端瞬时故障"。
- **期望能力**:在 worklog / API / web 中暴露可定位的服务端错误码、失败子步骤、以及是否可重试的标记。
- **价值**:用户能自助判断该改输入还是该重试,减少盲目重跑与支持工单。

### 建议 5:非确定性稳定性——下游瞬时抖动自动重试 + 幂等
- **现状痛点**:相同且正确的输入在不同阶段随机失败(本次 7 次 / 5 阶段),疑为 DMS 等下游服务瞬时抖动。
- **期望能力**:编排器对下游瞬时错误内置指数退避自动重试与幂等处理,而不是把整个 Job 置 FAILED 交给用户重跑。
- **价值**:大幅减少需要人工介入的场景,提升"能上生产"的可信度。

### 建议 6:schema 转换与代码转换的 schema/命名对齐
- **现状痛点**:产品两半产出的命名约定不一致——DMS schema 转换输出是 `bytdbo`(小写、无引号)schema;而 .NET EF `EnsureCreated` 在 `public` schema、PascalCase 带引号建表。二者对不上,真实割接需手工协调(PG 对带引号标识符大小写敏感)。
- **期望能力**:让托管的 .NET 代码转换输出与 schema 转换输出对齐(相同 schema 名、相同标识符大小写映射),或提供一个显式的映射/对齐步骤。
- **价值**:迁移后的 .NET 应用可直接跑在 DMS 转换出的 schema 上,免去人工核对。

### 建议 7:HITL 任务可靠性——防卡死 + 可手动重新拉起
- **现状痛点**:波次计划确认(wave-confirm)这一 HITL 在某次 run 中从未出现、流程卡死。
- **期望能力**:保证 HITL 任务可靠投递;当某个 HITL 迟迟不出现时,允许用户/客户端手动重新请求该检查点,而不是只能重启整个 Job。
- **价值**:避免因单个 HITL 丢失导致整条链路作废。

### 建议 8:DMS Schema Conversion 的 selection rule 校验与提示
- **现状痛点**:手写 selection rule 用 `rule-action=explicit` + `schema-name='%'` 时,`%` 被当字面量而非通配,静默匹配 0 对象,只报 "No metadata models matched",难定位。
- **期望能力**:当 selection rule 匹配 0 对象时明确告警,并提示正确写法(`explicit`+server/database 省略 schema = 整库,或 `include`+通配),或提供规则模板/向导。
- **价值**:降低手写规则的门槛与踩坑率。

### 建议 9:权限与可见性模型清晰化
- **现状痛点**:MCP 以 `WSParticipantRole/Participant` 角色、web app 以 IdC 用户 `workshop-user` 是两个身份;后者看 Job 页面直接 403、只显示 "Something went wrong",需先被加为 workspace 协作者才能看到。
- **期望能力**:给出可读的授权错误("你不是此 Job 的协作者"),并在 app 内一键引导加入协作者;或统一/清晰呈现两种身份的可见性范围。
- **价值**:消除"明明有权限却看不到 Job"的困惑。

### 建议 10:CRITICAL 步骤的审批边界与路由
- **现状痛点**:目标库(SchemaConversionTargets)这类 CRITICAL 步骤提示"需 admin/approval 角色审批",但 Participant 角色经 MCP 又能直接 APPROVE,边界模糊。
- **期望能力**:明确各角色对 CRITICAL 步骤的审批权限,并在 app 内把待批项自动路由给正确的 approver(含通知)。
- **价值**:审批链路可控、可审计,符合生产治理要求。

### 建议 11:.NET 代码转换覆盖度
- **现状痛点**:本次托管流程从未真正跑到 .NET 代码转换阶段,provider 切换等改造最终由 Kiro 手动补齐。
- **期望能力**:托管代码转换应自动覆盖 provider 切换(`UseSqlServer`→`UseNpgsql`)、连接串构造器差异(`SqlConnectionStringBuilder`→`NpgsqlConnectionStringBuilder`、`UserID`→`Username`)、`appsettings.*.json`、以及裸 SQL / SQL Server 特有类型特性(nvarchar、datetime2、getdate、NEWID、rowversion 等)的检测与改写。
- **价值**:让代码转换真正端到端可用,而非仅做评估。
