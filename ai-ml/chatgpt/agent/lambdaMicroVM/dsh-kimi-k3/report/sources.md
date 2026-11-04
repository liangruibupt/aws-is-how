# 参考来源清单（sources.md）

抓取日期均为 2026-11-04。格式：`URL | 标题 | 抓取日期 | 一句话要点`

## 协议层

1. https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol | Powering AI commerce with the new Agent Payments Protocol (AP2)（Google Cloud Blog，2025-09-16） | 2026-11-04 | Google 发布开放协议 AP2，以加密签名的 Mandates（可验证凭证）证明用户授权，60+ 机构参与，可作为 A2A/MCP 扩展。
2. https://www.agenticcommerce.dev/ | Agentic Commerce Protocol 官方站 | 2026-11-04 | ACP 是买家、AI Agent 与商家之间的开放标准（Apache 2.0），商家保留 merchant of record 身份，支持 REST 与 MCP。
3. https://github.com/agentic-commerce-protocol/agentic-commerce-protocol | Agentic Commerce Protocol GitHub 仓库（OpenAI & Stripe 维护，Beta） | 2026-11-04 | ACP 规范由 OpenAI 与 Stripe 维护，版本从 2025-09-29 初版迭代至 2026-04-17（购物车、商品 Feed、订单、认证、MCP）。
4. https://stripe.com/blog/developing-an-open-standard-for-agentic-commerce | Developing an open standard for agentic commerce（Stripe Blog，2025-09-29） | 2026-11-04 | Stripe 阐述 ACP 设计动机：商家需确认购买、安全接收支付凭证、区分好/坏机器人，避免碎片化定制集成。
5. https://stripe.com/newsroom/news/stripe-openai-instant-checkout | Stripe powers Instant Checkout in ChatGPT（Stripe Newsroom，2025-09-29） | 2026-11-04 | ChatGPT 美国用户可在聊天中购买 Etsy 商家商品，超百万 Shopify 商户（Glossier、Vuori、Spanx、SKIMS 等）即将接入。
6. https://a2aprotocol.ai/blog/2026-universal-commerce-protocol | Universal Commerce Protocol (UCP): The Complete 2026 Guide（2026-01-12） | 2026-11-04 | UCP 由 Google、Shopify、Etsy、Wayfair、Target、Walmart 共同开发，60+ 机构背书（含 Adyen、Mastercard、PayPal、Stripe、Visa），覆盖发现到履约全旅程，内建 AP2/A2A 支持。
7. https://shopify.dev/docs/agents | Shopify Developer Docs: Agentic commerce（Agents/UCP） | 2026-11-04 | Shopify 提供 UCP 合规的 MCP 服务器与 CLI 工具链：搜索目录、建购物车、创建结账、订单追踪，Shop Pay 支持 UCP。
8. https://developers.openai.com/commerce/ | Agentic Commerce Protocol Documentation（OpenAI Developers） | 2026-11-04 | OpenAI 开发者文档中的 Commerce/ACP 入口，指导商家在 ChatGPT 内构建购买流程。

## 支付与信任基础设施

9. https://corporate.visa.com/en/products/intelligent-commerce.html | Visa Intelligent Commerce（Visa 官方产品页） | 2026-11-04 | Visa 的 agentic 商务组合：Trusted Agent Protocol 验证 agent、阻断恶意机器人；网络规模 4.8B 凭证、>1.75 亿受理点、年 300B+ 交易；与 OpenAI 合作。
10. https://blog.cloudflare.com/secure-agentic-commerce/ | Securing agentic commerce: helping AI Agents transact with Visa and Mastercard（Cloudflare Blog，2025-10-24） | 2026-11-04 | Visa Trusted Agent Protocol 与 Mastercard Agent Pay 均基于 Web Bot Auth 做 agent 身份认证，Cloudflare 协助验证 AI 购物 agent 流量。
11. https://www.pymnts.com/partnerships/2026/mastercard-forms-openai-and-tencent-partnerships-to-drive-agentic-commerce/ | Mastercard Forms OpenAI and Tencent Partnerships to Drive Agentic Commerce（PYMNTS，2026-11-02） | 2026-11-04 | Mastercard 与 OpenAI 达成广泛战略合作（含 Agent Pay），Agent Pay 基于令牌化，已被 Shopify Shop Pay 采用；CEO 强调消费者信任与"注册 agent"是关键。
12. https://fintechnews.sg/139360/ai/mastercard-agent-pay-2/ | Mastercard Shows How AI Agents Can Pay Multiple Providers With One Budget（Fintech News Singapore，2026-10） | 2026-11-04 | Mastercard 在 Cloudflare Connect 演示 Agent Pay for Machines：基于 x402，一个批准预算内跨两家服务商完成 9 笔支付；与 Coinbase、Base、BVNK 等试点，开放开发者早期接入。
13. https://thepaypers.com/payments/news/alchemy-adds-mastercard-agent-pay-to-agentcard | Alchemy adds Mastercard Agent Pay to AgentCard（The Paypers，2026-09-21） | 2026-11-04 | Alchemy 将 Agent Pay 集成进 AgentCard：一分钟内为 agent 配备邮箱、电话、稳定币钱包与一次性 Mastercard 令牌化凭证。
14. https://newsroom.paypal-corp.com/2025-10-28-OpenAI-and-PayPal-Team-Up-to-Power-Instant-Checkout-and-Agentic-Commerce-in-ChatGPT | OpenAI and PayPal Team Up to Power Instant Checkout and Agentic Commerce in ChatGPT（PayPal Newsroom，2025-10-28） | 2026-11-04 | PayPal 采用 ACP：数千万商户将进入 ChatGPT，4 亿+ PayPal 用户可在聊天内即时结账。
15. https://cloud.google.com/blog/topics/financial-services/introducing-an-agentic-commerce-solution-for-merchants-from-paypal-and-google-cloud | An agentic commerce solution for merchants from PayPal and Google Cloud（Google Cloud Blog，2025-10-27） | 2026-11-04 | Google Cloud 对话式商务 agent + PayPal 支付，商家可在自有渠道部署 agentic 购物，agent 间经 A2A 通信并集成 AP2。
16. https://aws.amazon.com/blogs/machine-learning/agents-that-transact-introducing-amazon-bedrock-agentcore-payments-built-with-coinbase-and-stripe/ | Agents that transact: Introducing Amazon Bedrock AgentCore payments（AWS，2026-05-07） | 2026-11-04 | AgentCore 支付能力：与 Coinbase/Stripe 共建 agent 钱包（稳定币或法币借记卡充值），多层护栏与显式用户授权；提及 x402/ACP/MPP/AP2 等早期协议。

## 平台与案例

17. https://www.aboutamazon.com/news/retail/amazon-shopping-app-buy-for-me-brands | Amazon's new 'Buy for Me' feature（About Amazon，2025-04） | 2026-11-04 | Buy for Me 在 Amazon App 内以 agentic AI 代顾客到其他品牌官网下单，面向部分美国用户 beta 测试。
18. https://www.modernretail.co/technology/brands-are-upset-that-buy-for-me-is-featuring-their-products-on-amazon-without-permission/ | Brands are upset that 'Buy For Me' is featuring their products on Amazon without permission（Modern Retail，2026-01-06） | 2026-11-04 | 多个品牌称未经同意被纳入 Buy for Me，收到 @buyforme.amazon 订单（含缺货商品），需发邮件才能退出，引发"opt-in vs opt-out"争议。
19. https://www.aboutamazon.com/news/retail/amazon-rufus | Amazon announces Rufus（About Amazon） | 2026-11-04 | Rufus 为基于商品目录与全网信息训练的对话式购物助手；页面注明 2026-05-13 Rufus 更名为 Alexa for Shopping。
20. https://corporate.walmart.com/news/2025/06/06/walmart-the-future-of-shopping-is-agentic-meet-sparky | Walmart: The Future of Shopping Is Agentic. Meet Sparky.（Walmart，2025-06-06） | 2026-11-04 | Walmart 发布 GenAI 助手 Sparky：评论综合、场景化推荐、餐单/派对策划自动加购，将扩展自动复购、服务预订与多模态输入。
21. https://www.cnbctv18.com/business/walmarts-shopping-assistant-sparky-lifts-basket-size-38-pc-as-ai-reshapes-retail-and-delivery-20001369.htm | Walmart says AI shopping assistant Sparky lifts average basket size by 38%（CNBC-TV18，2026-10-01） | 2026-11-04 | Walmart CTO Suresh Kumar 称使用 Sparky 的顾客平均购物篮较普通搜索用户大 38%，且 Sparky 被用于需求预测、配送改道与库存管理。
22. https://www.klarna.com/international/press/klarna-ai-assistant-handles-two-thirds-of-customer-service-chats-in-its-first-month/ | Klarna AI assistant handles two-thirds of customer service chats in its first month（Klarna，2024-02-27） | 2026-11-04 | OpenAI 支持的 Klarna AI 助手首月 230 万对话（占客服 2/3）、等同 700 名全职员工、重复咨询 -25%、解决时长 11→<2 分钟、23 市场 35+ 语言、预计 2024 年改善利润 4000 万美元。
23. https://www.cnbc.com/2025/10/16/alibaba-says-ai-spending-for-e-commerce-taobao-tmall-is-breaking-even.html | Alibaba says its AI spending in e-commerce is already breaking even（CNBC，2025-10-16） | 2026-11-04 | 阿里副总裁张凯夫称电商 AI 投入已回本，初步测试广告 ROI +12%；阿里三年 AI 投入 3800 亿元（530 亿美元），涵盖个性化搜索与虚拟试穿等。
24. https://www.geekwire.com/2026/judge-blocks-perplexitys-ai-bot-from-shopping-on-amazon-in-early-test-of-agentic-commerce/ | Judge blocks Perplexity's AI bot from shopping on Amazon（GeekWire，2026-03-10） | 2026-11-04 | 旧金山联邦法官批准 Amazon 初步禁令，禁止 Perplexity Comet agent 访问 Amazon 登录区下单；法官认为 Amazon 在 CFAA 主张上可能胜诉；Perplexity 称 Amazon 意在保护广告收入。
25. https://www.theregister.com/ai-and-ml/2026/09/21/amazon-shows-metas-muse-ai-shopping-agent-the-door/5297777 | Amazon shows Meta's Muse AI shopping agent the door（The Register，2026-09-21） | 2026-11-04 | Amazon 封禁 Meta Muse 个人 AI agent 访问其商店，要求用户侧的 agent 出示授权身份，否则违反使用条款。
26. https://aws.amazon.com/blogs/aws/introducing-amazon-bedrock-agentcore-securely-deploy-and-operate-ai-agents-at-any-scale/ | Introducing Amazon Bedrock AgentCore（AWS News Blog，2025-07-16，预览） | 2026-11-04 | AgentCore 预览：Runtime（会话隔离的 serverless 环境）、Memory、Identity（OAuth 凭证代理）、Gateway（API/Lambda 转 MCP 工具）、Browser 等组件。

## 行业数据

27. https://blog.adobe.com/en/publish/2025/03/17/adobe-analytics-traffic-to-us-retail-websites-from-generative-ai-sources-jumps-1200-percent | Adobe Analytics: Traffic to U.S. retail websites from Generative AI sources jumps 1,200 percent（Adobe Blog，2025-03-17） | 2026-11-04 | 基于超 1 万亿次美国零售站点访问：2025-02 生成式 AI 来源流量较 2024-07 增长 1200%；2024 假日季同比 +1300%，约每两个月翻倍。

## 检索入口（用于发现上述来源）

28. https://hn.algolia.com/api/v1/search?query=agentic%20commerce | Hacker News Algolia 搜索 API | 2026-11-04 | 用于按关键词发现 2025–2026 年 agentic commerce 相关报道与原始链接（含 UCP、x402、Perplexity 禁令等 2026 年条目）。
