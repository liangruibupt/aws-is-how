你是一名资深电商与 AI Agent 行业分析师，同时是前端工程师。今天是 2026-11-04。
请在当前工作目录产出一份**可交互的中文分析报告**：《电商 Agentic 方案、案例与发展前瞻》。

## 研究要求（最重要）

1. 你的训练数据可能过时。**每一条事实性陈述（公司、产品、协议、数字、日期）都必须来自你本次用 `web_fetch`（或 bash 里的 `curl`）实际抓取过的页面**，不允许凭记忆编造数字或案例。抓不到来源的内容，要么删掉，要么明确标注为「分析判断」。
2. 建议的检索入口（可自行扩展）：
   - Hacker News 搜索 API：`https://hn.algolia.com/api/v1/search?query=<关键词>&hitsPerPage=20`（拿到标题和原文 URL，再抓原文）
   - Wikipedia REST：`https://en.wikipedia.org/api/rest_v1/page/summary/<Title>`
   - 各公司官方博客/新闻稿/开发者文档（OpenAI、Stripe、Shopify、Google、Amazon、AWS、Visa、Mastercard、PayPal、Klarna、阿里巴巴、京东、Walmart 等）
   - 关键词示例：agentic commerce、Agentic Commerce Protocol、Agent Payments Protocol AP2、Universal Commerce Protocol、Instant Checkout、Buy for Me、Rufus、Visa Intelligent Commerce、Mastercard Agent Pay、AI shopping agent、Amazon Bedrock AgentCore
3. 每抓取一个有用的来源，把 `url | 标题 | 抓取日期 | 一句话要点` 追加到 `sources.md`。报告中引用的每个链接都必须出现在 `sources.md` 里。
4. 至少使用 15 个不同来源；至少 8 个真实案例。

## 报告内容结构

1. **执行摘要**：5 条核心结论。
2. **概念与分层**：电商 Agentic 的价值链分层（消费者侧购物 Agent / 平台与商家侧运营 Agent / 支付与信任基础设施 / 协议层），说明每层解决什么问题。
3. **方案（解决方案架构）**：至少 6 类方案，例如导购与比价、代理下单与结账、客服与售后、商品内容生成与目录治理、动态定价与营销、供应链与库存补货。每类给出：目标、关键能力（工具调用、记忆、多 Agent 协作、人工审批点）、所需数据、典型 KPI、主要风险。
   并给出**一套在 AWS 上落地的参考架构**：Agent Harness（如 DeepSeek Harness）运行在 AWS Lambda MicroVMs 的隔离沙箱中，模型调用走 Amazon Bedrock（Kimi K3 等），说明会话隔离、凭证边界（执行角色 + SigV4 代理、Agent 无 AWS 凭证）、挂起/恢复带来的成本特征。这部分是「分析判断」，可以基于本报告的实际运行环境描述。
4. **案例**：每个案例包含 公司、地区、类别（对应上面的方案类别）、上线/发布时间、做了什么、可得的效果数据（没有就写「未公开」）、来源链接。
5. **协议与支付基础设施**：对比主要的 Agent 商务/支付协议或框架（发起方、定位、关键机制、开放程度），用表格。
6. **发展前瞻**：2026–2030 时间线（分阶段），三种情景（保守/基准/激进），关键不确定性（信任与欺诈、责任归属、平台封闭 vs 开放协议、监管、广告模式被颠覆），以及给零售商、品牌、平台、支付机构的行动建议。
7. **方法论与局限**。

## 交互要求（单文件 HTML）

- 输出 `report.html`：**单个自包含文件**，不引用任何外部 JS/CSS/字体/CDN（纯 HTML + CSS + 原生 JS，图表用内联 SVG 或 Canvas 自己画）。
- 必须有的交互：
  1. 顶部导航 + 章节锚点，滚动时高亮当前章节；
  2. **案例库**：按「方案类别」「地区」筛选、关键词搜索，点击卡片展开详情和来源；
  3. **方案成熟度矩阵**：散点图（x=技术成熟度，y=商业价值，气泡=落地难度），悬停显示说明；数值是你的分析判断，要在图下注明；
  4. **时间线**：可点击的里程碑，事实类里程碑附来源，预测类里程碑明显区分样式；
  5. **情景模拟器**：滑块调节「Agent 渗透率」「转化率提升」「客单价变化」「每单模型推理成本」，实时计算一个示例商家（可调年 GMV）的增量收入与成本，公式写在页面上；
  6. 协议对比表支持列排序。
- 所有数据集中放在 HTML 里的一个 `const DATA = {...}` 对象中，同时导出一份 `data.json`。
- 视觉：干净的商务风格，深色/浅色切换，移动端可读。
- 页面上每个来源都是可点击链接，并在页脚列出全部参考来源。

## 收尾自检（必须做）

1. 用 bash 运行 `node -e` 解析 `data.json`，并检查 `report.html` 中 `DATA` 的 JSON 部分与 `data.json` 一致。
2. 用 bash 检查 `report.html` 不含 `http` 开头的 `<script src`、`<link href`。
3. 用 bash 统计：案例数、来源数，确认报告里引用的每个 URL 都在 `sources.md` 中。
4. 最后回复：生成的文件列表、案例数、来源数，以及你认为证据最薄弱、读者应谨慎看待的 3 处内容。
