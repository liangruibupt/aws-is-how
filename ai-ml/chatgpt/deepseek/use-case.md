# 目录 / Table of Contents

- [目录 / Table of Contents](#目录--table-of-contents)
  - [1. 生成 Mermaid 代码](#1-生成-mermaid-代码)
  - [2. 生成 draw.io 的图](#2-生成-drawio-的图)
  - [3. 解读周报和月报](#3-解读周报和月报)
  - [4. 阅读研究报告](#4-阅读研究报告)
  - [5. 竞对分析](#5-竞对分析)
  - [6. Image Generation](#6-image-generation)
  - [7. Excel 分析](#7-excel-分析)
  - [8. Email handing](#8-email-handing)
  - [9. 用 Q CLI 进行 AWS 文档查询](#9-用-q-cli-进行-aws-文档查询)
  - [10. HTML to PPT](#10-html-to-ppt)
  - [11. Prepare the customer visit flow and call plan](#11-prepare-the-customer-visit-flow-and-call-plan)
  - [12. Migration insights](#12-migration-insights)
  - [13. Knowledge check](#13-knowledge-check)
  - [14. reimbursement-helper](#14-reimbursement-helper)
  - [15. SFDC account management and Opp pipeline](#15-sfdc-account-management-and-opp-pipeline)
  - [16. Fetch url and give summary](#16-fetch-url-and-give-summary)
  - [17. Aurora Upgrade](#17-aurora-upgrade)
  - [18. Outlook Assistant](#18-outlook-assistant)
  - [19. Marketing session query and Business review](#19-marketing-session-query-and-business-review)
  - [20. Life Science Commerical query](#20-life-science-commerical-query)
  - [21. 研究一个行业，例如 Charging \& Power Storage Research](#21-研究一个行业例如-charging--power-storage-research)
  - [22. Asana WBR Assistant](#22-asana-wbr-assistant)
  - [23. Interview summary](#23-interview-summary)
  - [24. Trigger the Claude code Parallel work with sub-agent](#24-trigger-the-claude-code-parallel-work-with-sub-agent)
  - [25. Write the Amazon narrative](#25-write-the-amazon-narrative)
  - [26. NotebookLLM](#26-notebookllm)
  - [27. 投研助手](#27-投研助手)
  - [28. MBR / MMR / QBR Review doc 助手](#28-mbr--mmr--qbr-review-doc-助手)
  - [29. Agent Teams](#29-agent-teams)
  - [30. Interactive Discussion](#30-interactive-discussion)
  - [31. Dashboard Inisights](#31-dashboard-inisights)
  - [32. xiaohongshu](#32-xiaohongshu)
  - [33. Quick BMS Demo](#33-quick-bms-demo)
  - [34. Promotion Doc review](#34-promotion-doc-review)
  - [35. FSI stock exchange demo](#35-fsi-stock-exchange-demo)
  - [36. AI for SA tech sharing and weekly business review](#36-ai-for-sa-tech-sharing-and-weekly-business-review)
  - [37. SKILL backup](#37-skill-backup)
  - [38 guide to find your unknowns with Fable](#38-guide-to-find-your-unknowns-with-fable)
- [39 build-your-ai-context](#39-build-your-ai-context)

---

## 1. 生成 Mermaid 代码
```markdown
prompt: 帮我写一个普通用户注册和使用 deepseek 的流程指南，请将上面的 deepseek 注册和使用2个流程指南，分别转为 mermaid 代码，方便我在 mermaid平台使用
```

```
---
title: Mermaid 注册和使用流程图代码
---
flowchart TD
    Start[开始使用DeepSeek] --> reg[进入注册流程]
    
    subgraph registration[注册流程]
        reg --> B[访问 DeepSeek.ai 官网]
        B --> C[点击右上角 Sign up 按钮]
        C --> D[选择注册方式]
        D --> E1[邮箱注册]
        D --> E2[Google账号注册]
        E1 --> F1[填写邮箱和密码]
        E2 --> F2[授权Google账号]
        F1 --> G[验证邮箱]
        F2 --> H[完成注册]
        G --> H
        H --> I[登录DeepSeek]
    end
    
    subgraph usage[使用流程]
        I --> U1[选择对话模型]
        U1 --> U2[新建对话]
        U2 --> U3[输入问题或需求]
        U3 --> U4[等待AI响应]
        U4 --> U5{是否满意回答?}
        U5 -->|是| U6[继续对话或结束]
        U5 -->|否| U7[重新提问或优化问题]
        U7 --> U3
        U6 --> U8[导出对话记录]
    end
    
    U8 --> End[结束]
```

## 2. 生成 draw.io 的图
```
prompt: 根据提供的图片，帮忙生成使用 2023年之后最新版本的 AWS 服务官方图标的架构图代码，输出格式可以直接导入到draw.io

prompt: Follow up the AWS Well-Architected design guidance, generate an aws architecture diagram that uses the official icons of the latest version of AWS services after 2023. The architecture is 3-tier architecture built by serverless backend with API Gateway, Lambda, DynamoDB, and S3. The output format can be directly imported into draw.io.

按以下要求生成drawio(xml)格式，AWS风格的架构图：
1. 我有一个Aurora的测试环境在美东1区域；
2. 堡垒机在公网子网，开放22和3306端口，支持从外网访问；
3. Aurora集群有三个实例，实例配置为db.r6.2xlarge, db.r7.2xlarge和db.r8.2xlarge
4. 三个实例分布在三个私有子网，其中db.r6g.2xlarge为主实例；
```

## 3. 解读周报和月报
```markdown
Prompt:

Please analysis this document and summary the IDC and Data Center workloads. Output as below format
<IDC and Data Center migration workloads>:
<IDC and Data Center IT spending>:
<Business Challenge for IDC and Data Center migration>:
<Technical Challenge for IDC and Data Center migration>:


Please analysis this document and summary the cloud workloads. Output as below format
<Cloud Provider Name>:
<IT spending or usage on this Cloud Provider>:
<Workloads name running on this cloud provider>:
<IDC and Data Center IT spending>:
<Workloads name running on IDC and Data Center>:

List all the narrative tagged [CNR] and contains BJS or ZHY. Output as below format
<Select one Type>: Hightlight / Lowlight / Challenges / Risks / Issues
<Select one more more Patterns>: Compliance / G2C consistent architecture / IDC Migration / Cloud Migration / C2G2C / SAP up-selling / GenAI / Resilience and DR / Data analytics / Graviton
<Workloads>:
<MRR and ARR>:
<Summary>:


Read the quip <URL>, summary the migration items, catelog results as Migration Driver, then industry, <customer name><description><AWS Region Names><ARR or MRR><SA Name>. Save result to migration_insights.md under current folder.
Migration Driver list: 1. Compliance & Security, 2. Functionality and Performance Advantage, 3. Resilience, 4. Data & AI Agility, 5. Business Community Strength, 6. Cost Optimization by Tech driven, 7. CSP region EOL or IDC retirement, 8. Tech stack consistency for simplified operation, 9. Modernization


Read the quip <URL>, Please summary items tagged '[CNR]', 'BJS', 'ZHY', '[C2C', '[C2C', '[G2C,', 'China Region'. The result item output format is <customer name><description><AWS Region Names><ARR or MRR><SA Owner>. Save result to cnr_insights.md under current folder.
Here is the output example: NewCompany(C2C, L, ISV) migrated their CI/CD system from Azure China to AWS ZHY with $5K MRR, implementing Spot instances within EKS to achieve 50% cost savings compared to Azure. (SA Owner: John)

Convert the items in the attached file as table format. The table schema is Customer Name | Catalog (C2C, G2C, C2G2C) | Type (Migration, GenAI) | Description | AWS Region (BJS, ZHY) | ARR/MRR | SA Owner

阅读 quip link <Quip URL>, 
- 第一步，提取和分析打了'GenAI Opp', 'C2G Opp', 'G2C Opp', 'Migration Opp', 'ADAS Opp', 'SDV Opp', 'Compliance & Security Opp', 'Analytics Opp', 'CO Opp', 'Cockpit Opp' 的内容。
- 第二步，把结果按照指定格式<customer name><description><AWS Region Names><ARR or MRR><SA Name> 创建总结。这里有一个输出参考案例: ExampleCompany(XL) launched self-developed CMS platform test env (including TSP, SoC, PKI, OTA, etc.) in FRA with $20K MRR. SA is working on AWS security services integration (WAF, GuardDuty, Security Hub) to enhance platform security. SA Yang.
- 第三步，把结果保存到 ~/Downloads/mac_sync/migration_insights.md，一个条目一行.

Read the quip <URL>, summary the content from June 01 to June 30. Please summary items tagged 'GenAI Opp', 'C2G Opp', 'G2C Opp', 'Migration Opp', 'MIH Opp', 'HPC Opp', 'CO Opp', 'Security Opp', 'Analytics Opp'. The result item output format is <customer name><description><AWS Region Names><ARR or MRR><SA Name>. Save result to xxx_insights.md under current folder.
Here is the output example: MyCompany(L) deployed self-developed ERP system in Frankfurt region for its global business expansion with $70K ARR. SA Alex.

Read the quip link <URL>, please help me summarize the content marked in red font tagged with 2x2 or * Opp (For example, GenAI Opp, Migration Opp, Analytics Opp, c2G Opp, G2C Opp, Compliance Opp, CO Opp, etc). The result item output format is <customer name><description><AWS Region Names><ARR or MRR><SA Name>. Save result to xxx_insights.md under current folder. Please use the english for output.
Here is the output example: MyCompany(L) deployed self-developed ERP system in Frankfurt region for its global business expansion with $70K ARR. SA Alex.
```

## 4. 阅读研究报告
```markdown
Prompt:

阅读这篇论文，按照下面格式进行总结
<研究背景/context>: 背景信息，我为什么要做这个研究
<研究需求/goals>: 研究主题，研究目标，需要注意的地方；这个研究是什么，关注什么；
<功能实现与技术细节/Implementation>: 实现方法和实现细节是什么？
<性能评估与优势/Compare>: 对比与现有方法的优势和劣势
<应用场景/cases>: 这个技术或者方案可以主要应用与什么领域？
<通用要求/requirements> ：1、使用英文搜索，只采纳英文资料（因为互联网上英文资料在数量和质量上都是最好的），用中文撰写报告。2、解读要细致，至少 2000 字

Read this paper and summarize it in the following format
<Research context>: Background information, why I did this research
<Research goals>: research topic, research goals, areas that need attention; what is this research and what is the focus?
<Technical Details/Implementation>: What are the technical details and implementation method?
<Performance Evaluation>: Advantages and Disadvantages of Comparing with Existing Methods
<Use scenarios>: What fields can this technology or solution be mainly applied to? What are typical use cases?
<General requirements>: 1. Use English search, only English materials are accepted, and write reports in Chinese. 2. Interpretation should be meticulous, at least 2000 words
```

## 5. 竞对分析
```markdown
Prompt:
对比一下 
1. Azure 中国北部2 和 AWS 中国北京区域 V100 GPU 的价格。
2. 对比Azure 中国北部3 和 AWS 中国宁夏区域 T4 GPU 的价格。
3. 对比Azure 中国北部2 A10 GPU 和 AWS 中国北京区域 A10G GPU 的价格。
4. 对比Azure 中国北部3 A10 GPU 和 AWS 中国宁夏区域 A10G GPU 的价格。
```

## 6. Image Generation
```markdown
Prompt:
胶片摄影，日落余晖，青橙+黑金，泛朦，失焦，低调，高反差，对焦模糊，独特视角，双重曝光，即兴抓拍山顶云海日落少女人像及场景，极限颜值，潮时尚穿搭，动态时兴发型，既视感，现场感，朦胧氛围感拉满，暗朦，过曝，高噪点，胶片质感，层次丰富，写意，强烈视觉冲击力，朦胧美学，光的美学，深色加深，亮色增亮，HDR效果，lomo效果，高级感，杰作

Prompt:
A young Asian woman with fair skin and delicate facial features walks slowly along the outer red wall of an imperial palace. She wears a light apricot-colored sleeveless summer dress with a soft A-line silhouette, the hem swaying gently with each step. Her hair is loosely tied back, and she looks directly at the camera with a calm, slightly smiling expression. The scene is shot diagonally, allowing the palace wall to recede deeply into the frame. Horizontal composition, with the woman positioned in the left third. Captured in ultra-realistic 8K with soft morning light grazing the red wall.

中文对照：
一位皮肤白皙、五官清秀的亚洲年轻女性，缓缓走在中国故宫的殿外红墙旁。她身穿一条淡杏色无袖夏日长裙，裙摆自然摆动，剪裁清爽柔和。头发随意扎起，眼神平静微笑，直视镜头。摄影师采用斜角拍摄，红墙延伸至画面深处。横构图，人物位于左侧三分之一。8K 超写实画质，晨光斜洒，墙体与人物光影层次分明。
```

## 7. Excel 分析
```markdown
这个 Excel 文件的Summary Sheet 包含了 AUTO, ISV, LS_HC, ME_AD 四个行业的 Top 50 account 的 EC2 mix % rate 以及 Windows instance % rate。
第一步帮我分别总结 Summary Sheet 中每个行业的 All_Services_Rev 大于 100,000 的 account。第二步这些 account 中 EC2 mix rate 大于 30%的 account，按照All_Services_Rev 从高到低排序，取前 10 名。第三步在第二步的基础上，在过滤掉 Windows instance rate 大于 20%的 account。按照行业分开统计，用 table 方式输出 | account | Industry | All_Services_Rev | EC2 mix rate | Windows instance rate |

这个 Excel 文件的Summary Sheet 包含了 AUTO, ISV, LS_HC, ME_AD 四个行业的 Top 50 account 的 EC2 mix % rate 以及 Windows instance % rate。
帮我分别总结 Summary Sheet 中每个行业的All_Services_Rev 大于 100,000 的 account，在这些account 中 EC2 mix rate 大于 30%的 account，按照All_Services_Rev 从高到低排序，取前 10 名。以及Windows instance rate 大于 20%的 account，按照从高到低排序，取前 10 名。按照行业分开统计，用 table 方式输出 | account | Industry |  All_Services_Rev | Rate |
```

```markdown
你先检查一下你的读取 Excel 的 SKILL，如果没有，先去 Anthropic 官方 github 上面看一下有没有相关 SKILL，如果有安装使用，如果没有采用python code 的方式，无论是openpyxl还是 libreoffice 都可以。

下面分析 GenAI 这个目录下的 excel 文件，我希望总结出来 不同Segment和Category下面的典型 Use Case有哪些，有哪些Customer 已经实现了这些 use case, 采用了哪些 AWS 服务/Platform，这些Opportunity 的 Status 如何，Launch Date，MRR 的情况，已经这些 use case，有哪些经验Insights 总结或者 Call out?
```

## 8. Email handing
```markdown
I need write a email draft to remind SA mgr to notify each team China Region KPI, do not send email, just put the email in my draft folder

```

## 9. 用 Q CLI 进行 AWS 文档查询
```markdown
# 安装 Amazon Document MCP Server 
AWS中国区域的专线流量价格是每 GB 多少钱? 注意AWS中国区域价格计算器的地址：https://calculator.amazonaws.cn/ 和中国区文档地址 https://www.amazonaws.cn/?nc1=h_ls
```

## 10. HTML to PPT
```markdown
请创建一个能够将HTML文档转换为pptx文档的Agent, 基本要求如下:
- 能够基于语义提取和识别关键和非关键信息，并思考PPT内容和故事主线
- PPT中出现的文字、段落内容应与HTML中内容一致
- 能够支持任意标签结构层级的HTML文档，能根据HTML标签结构定义PPT的结构
- 能够支持任意HTML标签的样式，能根据HTML标签样式定义PPT的样式
- PPT内容风格、模版样式应尽可能保持HTML原样式
- 对于HTML中图片内容，能尽可能保留，并以合理的布局展示在PPT中
- 能够使用用户指定的PPT模版
- 必要的文字内容和备注信息应尽可能保留，并存储在指定PPT页的备注中
```

## 11. Prepare the customer visit flow and call plan
```markdown
I need visit customer CTO / Chief Scientist / Chief Architecture / CIO, I need do the comprehensive research for customer profile including recent news, recent sales performance, new launched products etc. I also need do the research for CTO / Chief Scientist / Chief Architecture / CIO including recent public speech, events announcement, recent blogs or publish, what's the recent focus. The flow allow me input the customer name before do the research. The flow can ask me the name of CTO / Chief Scientist / CIO, if I do not know, then flow can search their name then do the research. The generated result max up to 6 pages and summary the talking points for me. The output is Microsoft Word document contain above research contents and talking points.


我是 aws 架构师总监，我想要拜访朴朴超市 (官方网站: https://pupumall.com/)的 CTO， 帮我做一个 call plan，包括客户业务，最新的动态，2026 strategy， 我的 talking points。尤其需要深度探讨利用 Generative AI 实现新的业务模式，新的业务用例，提升用户粘性，获取新的用户，实现出海业务高速增长。需要你帮我进行目标企业分析，行业洞察，帮我生成一个客户拜访前的准备文档，包括可能的商机分析，AWS技术能力和Amazon 生态可以与客户业务想结合的相关建议，目的是进一步探索业务用例进行 PoC。
记住 Generative AI部分，你作为一个出色的 AI CTO，我觉得你需要有深度洞察，2026 年开始全行业都在研究 Agent 和 OpenClaw，所以你的给出的建议要非常有洞察力和先进性，避免建议太宽泛或者都是过去做过的AI场景。重新认真研究清楚了，尤其一下其他类似行业初创企业的灵感，而且结合 我让你研究的朴朴超市这样即时生鲜商品电商平台的特点，给出 initiative。

You are act as Director of AWS Solutions Architecture (SA) to support me to 1) prepare visiting customer CTO / Chief Scientist / Chief Architecture / CIO. 2) SA organization operation such as weekly review, monthly review, quartely review, drive migration, tracking team and SA KPI. 3) create / run SA organization and team level initiative with diverse team members. 4) Talent development and promotion.
```


## 12. Migration insights
```markdown
The top 3 migration driver in the attached file and give me summary from migration type like IDC2AWS, GCP2AWS, Ali2AWS etc;  Stage like Launched, Qualify, TV etc; Total Rev. You can also add your insights.

You have checked all the data in the file, give me the total revenue, total companies number and summary by table with details, sort with deal size and stage

根据我 inbox 的 4 个行业 Open Pipeline Report results (CMHK FY26 RCH, CMHK FY26 LS_HC, CMHK FY26 FSI, CMHK FY26 CI) 邮件，总结当前和 IDC Migration 相关的 Opp，输出格式如下
Account | Opp Nam | Opp ID | Description | ARR | Status

# Migration and Modernization in QBR
Based on MMR files
1. Summary the RCH, FSI, CI, LS_HC migration & modernization Initiatives from April to July, then catalog into (1) CSP migration, (2) IDC migration, (3) AI-driven modernization.
2. The outcome is narrative, not the table. DO Not just list the case, you should make the narrative concise with insights. Focus on Migration driver, why migration, why modernization.

Analyze this migration opportunity files
1. Aggregate data at least by stage, territory, GenAI vs Non-GenAI, penetration of GenAI in each industry, Top 10 Opps, and you may also conduct analysis from other dimensions. 
2. Create as html, I can present slide by slide. 


总结 April to July MMR 里面共性的Core Services and AI 服务 call-out，输出为 Markdown 文件。如果可以，也请总结，从 一线实践中获得的，GPT 5.6和Opus/Fable的对比，G7相比G6的性价比对比，AgentCore 的 win cases, Quick 推广的场景。注意总结的时候，不要只讲了发生了什么，需要总结为什么会发生，为什么这个时候发生？要有一定细节。

```

## 13. Knowledge check
```markdown
"awslabs.aws-documentation-mcp-server" : {
      "command" : "uvx",
      "args" : [ "awslabs.aws-documentation-mcp-server@latest" ],
      "env" : {
        "FASTMCP_LOG_LEVEL" : "ERROR"
      },
      "disabled" : false,
      "autoApprove" : [ "read_documentation", "search_documentation", "recommend", "get_available_services" ]
    }

查询 AWS 上面2024年之后发布的最新P系列和G系列的GPU数量小于8的实例，采用 mcp 查询文档，t通过 Table 格式输出。


把上面的实例类型，通过 aws-pricing-mcp-server 查询在 us-east-1 region的价格，包括 OD, ISP, Spot 单价，如果最后信息不足,在通过 aws cli 获取信息, 结果通过 table 列出。
```

```markdown
模型输出

**AWS 2024年后发布的P系列和G系列GPU实例（GPU数量<8）- 完整版**

| 实例系列 | 实例类型 | GPU型号 | GPU数量 | GPU内存 | 系统内存(GiB) | vCPUs | 处理器 | 网络带宽 | 主要用途 |
|---------|----------|---------|---------|---------|---------------|-------|--------|----------|----------|
| P6e-GB200 | p6e-gb200.36xlarge | NVIDIA GB200 | 4 | 740 GiB (4×185 GiB) | 960.00 | 144 | NVIDIA Grace CPU | - | AI训练/推理 |
| G6 | g6.xlarge | NVIDIA L4 | 1 | 22 GiB | 16.00 | 4 | AMD EPYC 7R13 | 2.5/10.0 Gbps | 图形工作站/推理 |
| G6 | g6.2xlarge | NVIDIA L4 | 1 | 22 GiB | 32.00 | 8 | AMD EPYC 7R13 | 5.0/10.0 Gbps | 图形工作站/推理 |
| G6 | g6.4xlarge | NVIDIA L4 | 1 | 22 GiB | 64.00 | 16 | AMD EPYC 7R13 | 10.0/25.0 Gbps | 图形工作站/推理 |
| G6 | g6.8xlarge | NVIDIA L4 | 1 | 22 GiB | 128.00 | 32 | AMD EPYC 7R13 | 25 Gbps | 图形工作站/推理 |
| G6 | g6.16xlarge | NVIDIA L4 | 1 | 22 GiB | 256.00 | 64 | AMD EPYC 7R13 | 25 Gbps | 图形工作站/推理 |
| G6 | g6.12xlarge | NVIDIA L4 | 4 | 89 GiB (4×22 GiB) | 192.00 | 48 | AMD EPYC 7R13 | 40 Gbps | 图形工作站/推理 |
| G6 | g6.24xlarge | NVIDIA L4 | 4 | 89 GiB (4×22 GiB) | 384.00 | 96 | AMD EPYC 7R13 | 50 Gbps | 图形工作站/推理 |
| G6e | g6e.xlarge | NVIDIA L40S | 1 | 44 GiB | 32.00 | 4 | AMD EPYC 7R13 | 2.5/10.0 Gbps | 图形工作站/推理 |
| G6e | g6e.2xlarge | NVIDIA L40S | 1 | 44 GiB | 64.00 | 8 | AMD EPYC 7R13 | 5.0/10.0 Gbps | 图形工作站/推理 |
| G6e | g6e.4xlarge | NVIDIA L40S | 1 | 44 GiB | 128.00 | 16 | AMD EPYC 7R13 | 10.0/25.0 Gbps | 图形工作站/推理 |
| G6e | g6e.8xlarge | NVIDIA L40S | 1 | 44 GiB | 256.00 | 32 | AMD EPYC 7R13 | 25 Gbps | 图形工作站/推理 |
| G6e | g6e.16xlarge | NVIDIA L40S | 1 | 44 GiB | 512.00 | 64 | AMD EPYC 7R13 | 25 Gbps | 图形工作站/推理 |
| G6e | g6e.12xlarge | NVIDIA L40S | 4 | 178 GiB (4×44 GiB) | 384.00 | 48 | AMD EPYC 7R13 | 40 Gbps | 图形工作站/推理 |
| G6e | g6e.24xlarge | NVIDIA L40S | 4 | 178 GiB (4×44 GiB) | 768.00 | 96 | AMD EPYC 7R13 | 50 Gbps | 图形工作站/推理 |
| G6f | g6f.large | NVIDIA L4 | 1 | 2 GiB | 8.00 | 2 | AMD EPYC 7R13 | - | 轻量级推理 |
| G6f | g6f.xlarge | NVIDIA L4 | 1 | 2 GiB | 16.00 | 4 | AMD EPYC 7R13 | - | 轻量级推理 |
| G6f | g6f.2xlarge | NVIDIA L4 | 1 | 5 GiB | 32.00 | 8 | AMD EPYC 7R13 | - | 轻量级推理 |
| G6f | g6f.4xlarge | NVIDIA L4 | 1 | 11 GiB | 64.00 | 16 | AMD EPYC 7R13 | - | 轻量级推理 |
| Gr6 | gr6.4xlarge | NVIDIA L4 | 1 | 22 GiB | 128.00 | 16 | AMD EPYC 7R13 | - | 图形工作站 |
| Gr6 | gr6.8xlarge | NVIDIA L4 | 1 | 22 GiB | 256.00 | 32 | AMD EPYC 7R13 | - | 图形工作站 |
| Gr6f | gr6f.4xlarge | NVIDIA L4 | 1 | 11 GiB | 128.00 | 16 | AMD EPYC 7R13 | - | 图形工作站 |
```

## 14. [reimbursement-helper](https://gitlab.aws.dev/kentpeng/reimbursement-helper)

## 15. SFDC account management and Opp pipeline
```markdown
The AWSentralMCP server provides 60 tools organized into 15 categories for comprehensive Salesforce operations. So use this MCP server to Help me analysis BMW China on AWS past 3 month usage summary and trending analysis. 

Give me the summary about 2025 Spend & Usage, then I need you further summary about 1. What's top deals by stage? 2. What the stalled opportunities? 3. What's the GenAI related opportunities?


根据我 china_bd/ops folder 的 4 个行业 Open Pipeline Report results (CMHK FY26 RCH, CMHK FY26 LS_HC, CMHK FY26 FSI, CMHK FY26 CI) 邮件，总结本周和上周 Opp 的差异性，输出格式如下
Account | Opp Nam | Opp ID | Description | ARR | Status
```

## 16. Fetch url and give summary
```markdown
Please read url https://www.aboutamazon.eu/news/aws/built-operated-controlled-and-secured-in-europe-aws-unveils-new-sovereign-controls-and-governance-structure-for-the-aws-european-sovereign-cloud, 总结关键信息，判断是否是当前行业值得我细致阅读的，然后给出我行号或者章节标题，你的总结以中文输出。
```

## 17. Aurora Upgrade
```markdown
我现有的 Aurora MySQL 集群有三个实例，包括 db.r6.2xlarge, db.r7.2xlarge和 db.r8.4xlarge， 对应 MySQL 版本为 MySQL 8.0 我需要将 Aurora 升级到 Graviton4。请给我推荐的 Aurora LTS 版本，以及提供蓝绿部署方式的升级详细步骤指南和测试流程图，结果通过 HTML 的方式输出，便于阅读。
```

## 18. Outlook Assistant
```markdown
检查我下周周一11.03和周二11.04的会议安排,如果我需要有一个 1 小时的客户会议,从 aws 办公室到客户办公室需要 30 分钟,帮我看看合适的时间,并且创建一个 Meeting RSVP
```

## 19. Marketing session query and Business review
```markdown
Please help me summary the 2025 reInvent Life Science and Healthcare session
Please help me narrow down session related to Life Science Commerical Line of Business

Help me list the top 10 YTD SRP Rev Account with YTD Attn beyond 100% and top 10 YTD SRP Rev Account with YTD Attn lower than 80% in 4 industry: RTL_CPG_H, FSI, LS_HC, Cross Industry. The output summary and insight generate the PPT with AWS 2025 version template
```

## 20. Life Science Commerical query
```markdown
I need create a Agent to answer Life Scienct company commerical department related question. Help me prepare the prompt for AWS Quick Suite

I want to join the BeiGene https://beonemedicines.com/ commerical department, I need do a research about BeiGene commerical business and prepare the interview questions to be a qualified staff in beonemedicines commerical department.

How would you approach building a territory plan for BRUKINSA in a competitive hematology market?

Explain how you would communicate BRUKINSA's clinical advantages over ibrutinib and acalabrutinib to skeptical oncologists.

Describe your approach to building relationships with multidisciplinary cancer care teams to further promote the Brukinsa.

To promote the Tevimbra, what digital channels would you prioritize for reaching oncology healthcare providers in 2026?

Analysis the BeOne Medicines 2025 YTD finance performance. Draw clear diagrams and each diagram with key message bulletpoints

Give me a briefing about best next engagement action solution
```

## 21. 研究一个行业，例如 Charging & Power Storage Research
```markdown
根据下面的提纲完成任务：
1、搜索星星充电（万邦）公司基本信息和出海战略概述
2、调研星星充电（万邦）出海的具体国家和地区分布
3、分析星星充电（万邦）在海外市场的产品线和业务模式
4、收集星星充电（万邦）海外销量数据和市场份额表现
5、研究星星充电（万邦）在海外市场的竞争优势和挑战
6、整理数据并创建可视化图表
7、生成符合视觉要求的HTML分析报告
```

## 22. Asana WBR Assistant
```markdown
# Agent prompt
您是一个专业的SA团队项目进展汇总助手，专门为SA Manager提供团队架构师客户项目跟进情况的结构化汇总。您熟悉Asana项目管理结构，能够从指定的Asana项目和指定的汇总周期中提取关键信息，不关注其他Asana中的信息。

仅仅关注Asana中制定项目的数据, 项目名称将通过用户输入 Project 来指定, 汇总周期将通过用户输入 Duration 来指定
其数据结构如下：Section代表客户，Task代表具体项目，Assignee是负责的架构师。从Task的Comments和Description中提取最新进展信息。
汇总的时间请根据 task的 last modified on 字段来判断，提取用户指令中指定时间段内所有的task。
汇总时按客户分组，突出显示项目状态变化、里程碑达成、风险问题等关键信息。
如果发现项目长时间未更新，请在报告中标注提醒。

# Chat Agent User prompt
从Asana Project = "RCH-NW 2026 Key Projects"中，汇总 Duration = "2026年1月19日 - 2026年1月25日" 所有 Assignee 的客户项目进展情况，从Task的Comments和Description中提取最新进展信息，尽可能的包含详细的信息，包括每一个 Assignee 负责的项目最新进展、遇到的问题和下一步计划。不要遗漏某个Assignee, 如果last modified on 不在指定Duration，可以忽略该 Task 更新。按照以下分类进行汇总：1. Retail and E-Commerce Industry Solutions, 2.Migration, 3. Generative AI, 4. Challenges / Risks / Issues, 5.Customer Highlights, 6.Customer Lowlights

Feb01 version
从Asana Project = "RCH East Ecommerce SA weekly update"中, 汇总 last modified on 在 "2026年2月2日 - 2026年2月9日" 的 tasks。新创建的 task 从 Description 和最新的Task Comments中提取最新进展信息；已有的 task，提取在"2026年2月2日 - 2026年2月9日" 添加的Task Comments 的作为最新进展信息。确保你检查了所有 Assignee 和 Section，不要遗漏。 如果last modified on 不在 "2026年2月2日 - 2026年2月9日" ，可以忽略该 Task 更新。按照以下分类进行汇总：1. Retail and E-Commerce Industry Solutions, 2.Migration, 3. Generative AI, 4. Challenges / Risks / Issues, 5.Customer Highlights, 6.Customer Lowlights

Project=‘RCH East Ecommerce SA weekly update’，Section=‘SkyScanner’，在2026年1月25日 - 2026年2月1日的更新总结。 新创建的 task 从 Description 中提取最新进展信息；已有的 task，提取添加和修改时间"2026年1月25日 - 2026年2月1日"之间的Task Comments作为最新进展信息，不要遗漏。

# Flow
我需要汇总指定时间段，Asana中指定项目中，所有SA的客户项目进展情况，有两个输入，输入一是Asana Project，输入二是汇总 Duration。调用 chat agent 'RCH SA项目进展汇总助手' 抓取信息和汇总，最后创建一个 Asana 指定Project的 Task，名称是Weekly Status Update，内容是编辑后的汇总信息，Assignee是我自己

## Flow Call Agent
使用RCH SA项目进展汇总助手来汇总 #输入Asana项目名称 项目中, #输入汇总时间段 时间段内所有 Assignee 和 Section 进展情况。新创建的 Task 从 Description 中提取最新进展信息；Existed 的 Task，提取添加和修改时间在 #输入汇总时间段 之间的Task Comments作为最新进展信息，不要遗漏。确保你检查了所有 Assignee 和 Section。 如果last modified on 不在 #输入汇总时间段，可以忽略该 Task 更新。

按照以下类进行汇总：1. Retail and E-Commerce Industry Solutions, 2.Migration, 3. Generative AI, 4. Challenges / Risks / Issues, 5.Customer Highlights, 6.Customer Lowlights

## Create Asana Task
在Asana的
#输入Asana项目名称
项目中创建一个新任务，任务名称为'Weekly Status Update - [Current Date]'，任务内容为 #生成SA项目进展汇总，Section为 'WBR', 并将任务分配给我自己作为Assignee。

## Project
RCH-NW 2026 Key Projects
RCH East Ecommerce SA weekly update

2026年1月1日 - 2026年1月11日

RCH-NW 2026 Key Projects

## Claude Code WBR
Using Agent Teams mode run in parallelly to generate ASANA 3 Projects separate report for duration '2026-04-20 to 2026-04-27', Check the SFDC Opp Link, fill the MRR(K) and enrich the report with SFDC Opportunity information. The output is Chinese, do not replace any existed report.

### Create SKILL of WBR
Each weekly I input the prompt for ASANA projects weekly report. Here is my prompt:
Using Agent Teams mode run in parallelly to generate ASANA 3 Projects separate report for duration '2026-04-20 to 2026-04-27', Check the SFDC Opp Link, fill the MRR(K) and enrich the report with SFDC Opportunity information. The output is Chinese, do not replace any existed report.

Now I need create the skill for above weekly task, the skill named wbr-data-collection. Next time, I only need call the skill and tell you the #WeekNumber current year, such as week 27, then you convert it to date range from 2026-06-29 to 2026-07-05, then execute the reports generation

将我通过'!!'标记的 items 总结之后，放到 ‘### 本周重点关注’ 下面，表格方式，表头信息：
｜ # ｜ 任务 | 客户 | SA | 状态 | 关键信息 |
|---|------|------|----|------|---------|

### Claude Code WBR + new added task
You have generated ASANA 3 Projects separate report for duration '2026-03-15 to 2026-03-22', Check the SFDC Opp Link, fill the MRR(K) and enrich the report with SFDC Opportunity information. I need you help extract the task create or modifed on 2026-03-23, then update the existed three 03-22 report with new section under '### 本周重点关注' with name '### 03-23新增'. Do not replace or update any existed content. Using Agent Teams mode run in parallelly. The output is Chinese.

## Claude Code WBR - mini MBR SKILL

By leveraging the Agent, I can Conduct weekly business reviews with monthly business review (MBR) format. It enables rapid decision-making. So I need you create a skill for me named mbr-report-per-week.

Here is workflow logic:
The first 2 steps are very like wbr-data-collection skill, then the third step used for generate the final review markdown file. 

Step 1: The skill accept my input: Week Number of current year, then convert Week to date range: ISO week, Monday–Sunday, e.g. week 27 → 2026-06-29 to
  2026-07-05)
Step 2: Using Agent Teams mode run in parallelly to generate ASANA 3 Projects separate report for date range of specified Week Number of current year. Check the SFDC Opp Link, fill the MRR(K) and enrich the report with SFDC Opportunity information. The output is Chinese, do not replace any existed report.
Step 3: Generate new review-report markdown file based on 3 projects weekly reports. The markdown content is English. The naming of markdown file is YYYYMMDD_wbr_RCH_ruiliang-xiangqua.md, date = next week Monday, for example, Week 27 report mardown file is 20260706_wbr_RCH_ruiliang-xiangqua.md.
Step 4: Help me create the html based on the content of [Doc_Path] # Executive Summary and # Technical Assets and Good Case Sharing, which used for presentation on Erik WBR meeting.

Here is markdown file content requirements:
1. The new review-report adopts a narrative approach instead of a tabular one. 

2. The new review-report format

# [Top Business Observations]

## [Migration and modernization observation, with Opportunity ID]
### [Migration]
### [Modernization]

## [Industry Solution]

## [GenAI]
### [AI Coding]
### [Agent]
### [Quick Suite]
### [GPU]

# [External Blockers, Major Risks and Challenges] 

# [Customer Highlights] 

# [Customer Lowlights] 

# [Technical assets and good case sharing]

3. You can summarize similar content together. For example, Kiro and Claude Code can both be categorized under [AI Coding], while Supply chain agent and Shop Assistant agent fall into [Industry Solution]. Other similar categories include [Migration], [Modernization], [Agent], and so on. Put the content into the corresponding Section in accordance with the monthly report format.

4. Each case must have an Opportunity ID, which can be obtained from the SFDC Opp Link, for example, the Opportunity ID of URL 'https://aws-crm.lightning.force.com/lightning/r/Opportunity/006RU00000QWjvtYAD/view' is [006RU00000QWjvtYAD]. You can get the MRR from the SFDC Opp Link or MRR(K) field of each Asana task

5. Below are reference example of narrative. 

_[AI Coding] 1) Trip (XL) has subscribed 188 Kiro Pro after AIDLC workshop and Roey visit, SA spend much time to promote Kiro as Claude code Supplementary, target for 40K MRR [006RU00000O5wAPYAZ]. 2) All SDE of Sinho (L) have subscribed to Kiro Pro, resulting in 92 paying users with an MRR of $4K. The integration of DevLake is being promoted for usage data display [006RU00000KBOLGYA5]. 3) Qunhe (L) plans to purchase 50-100 Claude Code and use Bedrock Claude with $7K MRR. [006RU00000NWPalYAH]. (SA: Xia Ning, Yu Tao, Wang Felix)._

We need to iterate the mbr-report-per-week SKILL to Make your output more readily usable and reduce my manual revisions. My ideas are as follows

1. Compare the file you generated document /Users/ruiliang/Documents/workspaces/asana-project-bot/reports/monthly/W28_2026_wbr_RCH_ruiliang-xiangqua.md with the RCH priority WBR file I filtered using !! mark: /Users/ruiliang/Library/CloudStorage/WorkDocsDrive-Documents/Mgr/2026/2x2/WBR/W28/RCH-TEAM-2026-W28.md. Figure out why I selected these items?

2. I found you just list the cases, you should make the narrative concise with insights, summary the common patterns and trending，and also give the recommendation of next actions. They are most valuable for WBR or MMR summary. For example, **Bedrock Sonnet 5 has 3 win cases**: Trip.com, Heguan and KPay，It should recommend to explore relevant use cases and actively promote Sonnet 5. Other example, you should summary cases 1/ **Nike (XL)** — Graviton adoption PR rose from 21% (Jan) to 27% (Jun), $20K/mo (Opp: 006RU00000OucO9YAJ). 2/ **司顺 Vevor (L)** — self-built database Graviton migration completed; Java application migration to follow, $5K/mo (Opp: 006RU00000R1t69YAB). 3/ **Huolala (XL) Graviton migration**: customer confirmed go-ahead, ~$30K/yr projected savings, $10K/mo `[006RU00000OpDjmYAF]`. From these cases, you should be able to conclude that **Graviton remains the modernization driver**. It is recommended to review other clients in similar sub-industries with comparable scale to promote Graviton, or identify the workloads that should be prioritized for promotion.

I would suggest you study the /Users/ruiliang/Library/CloudStorage/WorkDocsDrive-Documents/Mgr/2026/2x2/WBR/W28/CI-Team-WBR-2026-W28.md and /Users/ruiliang/Library/CloudStorage/WorkDocsDrive-Documents/Mgr/2026/2x2/WBR/W28/LS-Team-WBR-2026-W28.md. These 2 industry WBR doc are more valuable insights.

3. I have manually merged RCH, FSI, CI, LS_HC 4 industry WBR as one /Users/ruiliang/Library/CloudStorage/WorkDocsDrive-Documents/Mgr/2026/2x2/WBR/W28/20260713-WBR-W28-20260713-RuiLiang-RFHC.md to submit to Erik review. It is very important, there are only 5-6 mins for present, so I write down a executive summary for most important issue: common pattern of GenAI use cases or novel GenAI use cases, large migration deal (MRR >30K, or new service such as S3 vectors migration), modernization key update, challenge/risk with big impact and migration out (MRR >30K) call-out.

4. I also modifed the #Technical Assets and Good Case Sharing, you can see my format: 1) Title with Bold text, 2) followed by Why it is important for sharing 3) then the code github link, blog or feishu or sharepoint link, they can read by other colleagues 4) final is SA name with Bold text

mbr-report-per-week can support 1) RCH SA team WBR generation 2) merge the 4 industry team WBR into one with executive summary generation - I can provide the other 3 industry team WBR

AS SOTA LLM Model, you should keep human intentions aligned with the model's execution at all times. So I need you well further polish the mbr-report-per-week SKILL to make the outcome of this skill can generate well usable document for my presentation to Erik WBR. Code delivers determinism and guarantees accuracy, while LLMs/Agents bring critical thinking and insights. Therefore, the workflow of this skill should integrate both. Sometimes, you can give me suprise for the quality of document.

帮我把文档中的 /Users/ruiliang/Library/CloudStorage/WorkDocsDrive-Documents/Mgr/2026/2x2/WBR/W28/20260713-WBR-W28-20260713-RuiLiang-RFHC.md # Executive Summary and #Technical Assets and Good Case Sharing，做一个 html，markdown里面的 link 也需要包含在 html, Executive Summary里面的Migration Large Deals & Modernization 合并在一起。这样方便在 Erik WBR 会上做汇报. 
HTML move 到/Users/ruiliang/Library/CloudStorage/WorkDocsDrive-Documents/Mgr/2026/2x2/WBR/W28

1. 保持每周汇总
2. WBR in Chinese
3. Executive Summary 需要把 4 个行业重要项目进行汇总，但是各自团队 WBR 放到 Erik 建议的 2, Customer Updates里面。
保持现状。
- Erik 建议的1.1, Observations，重点挑选超过 50K MRR 或者 500K ARR Migration/Modernization的动态 和 重要的 Quick/Kiro/AgentCore 产品推广的汇总
- Erik 建议的1.2, Key Customer Updates，挑选4 个行业，重要的highlights & lowlights
- Erik 建议的1.3, Risks & Challenges & Blockers & Asks，Tighten Risk/Challenge/Blocker terminology，挑选 4 个团队中，影响超过 50K MRR 或者 500K ARR 的 Risks & Challenges & Blockers & Asks
4. Title line 是在汇总周报的开头写，Owener 就是 Liang Rui，但是各自团队 WBR的 title 还是保持现状这样
5. Erik 建议的 2, Customer Updates里面，把当前 4 个行业团队 WBR 汇总到这里
6. Others - 保持用# Technical Assets and Good Case Sharing
7. Add ETA / next milestone on key items， 
8. SA alias mapping: /Users/ruiliang/Library/CloudStorage/WorkDocsDrive-Documents/Mgr/2026/2x2/WBR/SA_Name_Alias.csv
9. 文件名格式: 日期_wbr_团队名.md e.g. 20260713_wbr_RFHC.md
10. 分享时间 10 分钟，目前看内容可以撑起 10 分钟
11. Exec Summary不是一句话，目前我们insight-first pattern already does this, context/background can be added if there is, but not mandatory. Such as Migration should have migration from where and what's the trigger. GenAI/Agentic AI should have the use case or workloads description
12. 重点项目，如果有 Next Step，那么下一个周报中最好有更新，以便闭环。

下面继续 mbr-report-per-week 这个 skill 的 mode2 merge FSI, LS_HC, CI, RCH 的报告为一个完成的用于我上交 Erik 的 WBR。 4 个行业的 WBR 在 /Users/ruiliang/Library/CloudStorage/WorkDocsDrive-Documents/Mgr/2026/2x2/WBR/W31，包括刚才你生产的 RCH 文件。注意有限挑选我用!!标注的条目，其他你觉得重要的条目也可以添加，但是注意我只有 10 分钟做汇报。
```

## 23. Interview summary
```markdown
Please summarize the feedback from the interview in the attachment, including the Strength area and growth area. Start with an overview, then each interviewer should have feedback points within three sentences. Please keep the summary concise.
```

## 24. Trigger the Claude code Parallel work with sub-agent
```markdown
Research these 5 API providers in parallel using separate subagents and summarize the differences.
```

## 25. Write the Amazon narrative
```markdown
In the style of Amazon Narrative writing, Please rewrite below content as a native English speaker and make it concise
can you modify sentences as a native speaker and make it concise?
can you modify sentences as a native speaker and enrich it with positive wording？
can you modify sentences as a native speaker and rewrite it into evaluation criteria for senior managers?

You are a Solution Architect Senior Manager, you need maximize the projects win ratio with limited SA resources. please help write a initiative for me within 1 sentence
Based on the data point in @fileName, I need write a promotion document for my direct report, a solutions architect manager, please help write paragraph about his ownership and delivery result 

You are a sales director, I need write a promotion feedback for my peer - Solutions Architect Senior Manager to his leadership in earn trust, ownership and delivery result. In the style of Amazon Narrative writing, Please write paragraph as a native English speaker and make it concise.
```

## 26. NotebookLLM
```markdown
**Role**: You are a professional Presentation Architect.
**Task**: Convert the provided transcript into presentation slides based on the Amazon AWS aesthetic. If no transcript provided but url link, you need first study the link and generate the transcript 
**CRITICAL CONTENT RULES (Must Follow)**:
1. SUMMARIZATION: Condense the content. I used for Keynote presentation, so convert detailed explanations into short summaries.
2. ONE-TO-ONE MAPPING: For every distinct topic or paragraph in the transcript, create a separate slide.
3. PRESERVE STRUCTURE: Follow the exact sequence of the transcript. If the transcript has 15 distinct points, generate exactly 15 slides.
4. DENSITY: It is better to have more slides with less text per slide, than fewer slides with crammed text.
**Visual Style (AWS Theme)**:
1. Colors: Deep Squid Ink (#232F3E) background, AWS Orange (#FF9900) and API Blue (#00A1C9) accents.
2. Graphics: Isometric 3D elements (cubes/servers), hexagonal grids, connecting lines.
3. Vibe: Technical, engineered, reliable, like a system architecture diagram.

阅读下面两个link，总结 Amazon 和 OpenAI 最新合作的要点，突出业务价值和行业影响，中文输出2 页 用在 keynotes presentation。
https://openai.com/index/amazon-partnership/
https://www.aboutamazon.com/news/aws/amazon-open-ai-strategic-partnership-investment
```

## 27. 投研助手
```
我需要你做一个投资助手程序，这个助手是一个股票和基金投资经理的角色，已经有超过 5 年的投资经验，是数据驱动的投资风格，能做长线投资的潜力股建议，同时有敏锐嗅觉发现会短期高速增长的红利的黑马。

每天基于市场信息和行业趋势，给我10 条股票投资建议，关注在中国 A 股，港股和美股， 每天北京时间 7 点给我邮件 48080251@qq.com 
你搜索信息的范围也要调整到截止发送时间前的发生重要事件和信息，10 条投资建议需要包括：3 个关注有潜力的行业，然后是具体公司。
投资建议需要有insights: 例如投资分析，除了PE值之外，能否增加PEG = PE ÷ 盈利增长率，也就是需要提供增长率做参考，然后如果每个推荐的股票，能提供所属行业和细分赛道的最低，平均和最高PE值，这样就可以看出推荐股票在行业的发展水平。

内容分成下面几个模块
第一部分：宏观面分析，从全球市场环境，三大市场走势，资金面情况，给出深刻见解
第二部分：行业洞察
第三部分：个股推荐
最后部分：今日值得关注的事件或者今日要闻

如果你需要SMTP 授权码，可以采用这个: xxxxx 
发件邮箱地址 48080251@qq.com

你搜集完信息，需要用claude Sonnet 4.6 inference profile id global.anthropic.claude-sonnet-4-6 来对你收集到的投资市场数据，进行分析，并且给出行业和个股推荐. 你所在的EC2 包含了调用bedrock Claude的IAM role，用instance profile 就可以获得权限

输出是HTML格式，要美观，符合主流AI Gemini 或者Claude 风格
```

## 28. MBR / MMR / QBR Review doc 助手
```
我需要写一个Q1 的 review word 文档，文档的格式需要严格遵守模板 MBR/APJC Tech Review Template.docx，其中’2.0 State of the Union‘ 这个章节可以忽略，其他章节都需要撰写。 注意文档是narrative 的方式，不是表格方式。word 总页数在 3 页以内。 文档的素材来自于 MBR 目录下的两个 markdown 文件，Migration/OP2_Migration_Summary.md, GenAI/RCH_GenAI_Analysis.md, GenAI/RCH_GenAI_Executive_Briefing.docx。如何生成 Word 文档，你可以参考 GenAI/gen_briefing.py

Rewrite in Amazon Writing Style

For Q2 QBR, I will need to prepare a 2-pager document for topic: Capture the Enterprise Agentic AI Transformation Wave. Please prepare a brief writeup on observation, initiative, opportunity, risk/challenge/blocker, and support need/asks. 
- Observation: How industry-line customers are changing; customer expectations  
- Initiative (key focus): What cards we hold and how we drive next (staged milestones + owner) 

The input as below files: 
1. /Users/ruiliang/Library/CloudStorage/WorkDocsDrive-Documents/Mgr/2026/2x2/QBR/RFHC_SA_Q1_Review.docx
2. '/Users/ruiliang/Library/CloudStorage/WorkDocsDrive-Documents/Mgr/2026/2x2/QBR/Tech trends doc for AGS Leadership - CMHK.docx' - You can check the main body part, for he appendix part only need focusing on LS_HC, CI (Cross Industry), FSI, RTL_CPG_H / 'Retail CPG H' 4 industries
3. /Users/ruiliang/Library/CloudStorage/WorkDocsDrive-Documents/Mgr/2026/2x2/MMR/Markdown/MMR-2026-RFHC-SA.md
4. /Users/ruiliang/Library/CloudStorage/WorkDocsDrive-Documents/Mgr/2026/2x2/OP1_OP2/GenAI
5. Agentic AI use case summary /Users/ruiliang/Library/CloudStorage/WorkDocsDrive-Documents/Mgr/2026/2x2/MMR/Markdown/MMR-2026-RFHC-SA-AgenticAI-UseCases.md

The output is a 2 page docx file.



I need write how to leverage AI to drive Cross Service core (Traditional Infrastructure services) revenue?
-Initiatives, such as 1) data gravity, 2) AI drive migration, 3) AI drive modernization to defense other competitors, the other good idea beyond these 3 Initiatives
For Initiatives, we need the input goals and output goals
-what success metics looks like?

The input as below files: 
1. /Users/ruiliang/Library/CloudStorage/WorkDocsDrive-Documents/Mgr/2026/2x2/OP1_OP2/Migration
2. /Users/ruiliang/Library/CloudStorage/WorkDocsDrive-Documents/Mgr/2026/2x2/QBR
3. /Users/ruiliang/Library/CloudStorage/WorkDocsDrive-Documents/Mgr/2026/2x2/MMR/Markdown/MMR-2026-RFHC-SA.md
4. /Users/ruiliang/Library/CloudStorage/WorkDocsDrive-Documents/Mgr/2026/2x2/OP1_OP2/GenAI

The output is a 1 page docx file

Initiatives is narrative + action + target customer or customer ratio + success metrics. 
The success metric example: 50%+ SDE AI coding on AWS at lighthouse accounts, 20+ account adopted AIPLC and data AIDLC seperately.

I listed the initiatives
1. Scale AI Coding. For AI Coding, we are not only replace the tools but focus on workflows are redesigned around AI technology stack and aligned with business outcomes. So we will extend to AIPLC and Data AIDLC.
2. Drive Frontier Agents scale at production. We have build strong pipeline, now need move to production.
3. Using Quick in no-tech persona to practice CDE engagement and Using Bedrock + AgentCore to reignite industry solutions in LoB
4. Build Agent Data Layer (memory / semantic / domain knowledge) in new Platform and Revisit customer existed agent workloads to enhance the Data Layer - Data Gravity。
5. Leverage AI to accelerate Core-services Migration and modernization

So write the initiatives part


Base on MMR reports and Erik QBR summary
1. First consolidate the QBR service-trends as markdown. Summary the common part as bullet points and presentation notes. DO Not just list the case, you should make the narrative concise with insights, focus on Why it happened and why it happened at this time？And also point out the conflict part cross 3 documents
2. Output as markdown file
3. Based on the markdown file, please refine the deck of qbr-product-trends/~$qbr-product-service-trends.pptx
```

## 29. Agent Teams
```bash
当你进行 implement 的时候，采用 tmux split pane 展示 sub agents coding的状态
~/.claude/settings.json
"env": {
  "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
},
"preference":{
    "tmuxSplitPanes": true
}

tmux new-session -s claude-work
```

## 30. Interactive Discussion
```
苏格拉底式追问 × 多源信息交叉验证 × 第一性原理推导
```

## 31. Dashboard Inisights
```bash
# Attrn >100% Account
Help me list the top 20 YTD SRP Rev Account with YTD Attn beyond 100%
# Attrn >100% Account
How about the top 20 YTD SRP Rev Account with YTD Attn lower than 80%
Analyze Shinho account in detail and create recovery action plan

# Summary inisghts for 4 industry and generate PPT
From[CMHK_REV_01] MBR Usage & Rev Dashboard → 1.Rev, help me list the top 10 YTD SRP Rev Account and top 10 YTD SRP Rev Account with YTD Attn lower than 80% in 4 industry: RTL_CPG_H, FSI, LS_HC, Cross Industry.You can filter the industry by SH_L4 Unit. The output summary and insight generate the PPT with AWS 2025 version template. Or Export the data as a Word document  

访问 [CMHK_REV_01] MBR Usage & Rev Dashboard，分析各个子行业 usage and rev 的月度 trending 同时给我每个行业 Top 10 usage account trending

# From
From [CMHK PPL 01] Pipeline & Inputs Management Dashboard → 1. Creation, help me list the ARR Top10 的 Open Opportunities in 4 industry: RTL_CPG_H, FSI, LS_HC, Cross. From [CMHK PPL 01] Pipeline & Inputs Management Dashboard →  2.Conversion help me list the ARR Top10 的 Launched Opportunities in 4 industry: RTL_CPG_H, FSI, LS_HC, Cross. You can filter the industry by SH_L4 Unit.
```

## 32. xiaohongshu
```
基于刚才总结的爆款模板，帮我生成 3 篇完整的小红书文案。每篇包含：
标题（给 A/B 两版，一版用情绪对比型，一版用数据对比型）
正文（按"情景设定 → 吸引眼球 → 总结要点"结构写）
标签（10 个，按大词+中词+长尾词组合）

3 篇的角度分别是：
第 1 篇：规划达人，一切安排井井有条
第 2 篇：喜欢惊喜，喜欢融入当地生活
第 3 篇：打卡族，照片党
请用可以直接复制使用的格式输出。
```

## 33. Quick BMS Demo
```
我要搭建一个BMS (Battery Management System) 专家 Agent，但是我缺少 domain knowledge，你帮我搭建出一个 prototype，包括前端页面，一个 chat window，sample dashboard, sample question 等

接入 LLM 后端实现真实对话, 添加故障诊断引擎, 导出为可分享的 HTML 文件, 对接真实 BMS 数据源的参考代码

Use HTML to create an animated diagram of the solar system's orbital motion for middle school classroom teaching.
```

## 34. Promotion Doc review
```
基于 SA Role Guideline (L6 expectations) + SA/CSM Promotion Toolkit Q2 2026，从SA Org Leadership视角，对候选人promotion doc 进行 L6 SA的评估， 进行L6 Data Point评估，区分好 "Business as Usual" vs "Strong L6 Data Point"。

基于 CSM Role Guideline (L6 expectations) + SA/CSM Promotion Toolkit Q2 2026，从SA Org Leadership视角，进行L6 Data Point评估，区分好 "Business as Usual" vs "Strong L6 Data Point"。
```

## 35. FSI stock exchange demo
```
根据/Users/ruiliang/Downloads/mac_sync/agent 包含的文档:
1. API 文档: '/Users/ruiliang/Downloads/mac_sync/agent/SimStock API - Swagger UI.pdf'
2. Agent接入指南: /Users/ruiliang/Downloads/mac_sync/agent/for_ai_agent.md
3. 交易规则：/Users/ruiliang/Downloads/mac_sync/agent/交易规则.md

创建
1. 主 agent 用于进行通盘考虑和协调，API Key: /Users/ruiliang/Downloads/mac_sync/agent/simstock-api-key-138-main-agent.txt，进行交易策略制定，协调 sub agent 进行干活。
2. 一个 sub-agent exchange agent 用于交易， API Key: /Users/ruiliang/Downloads/mac_sync/agent/simstock-api-key-155-exchange.txt
3. 一个 Sub-Agent 刷任务榜单：https://simstock.agentnumber47.com/ui/app.html#trophy, API Key: /Users/ruiliang/Downloads/mac_sync/agent/simstock-api-key-151-game-agent.txt
```

## 36. AI for SA tech sharing and weekly business review
```
Task: SA General Manager Erik 要求 SA Directors 讨论AI在我们SA 团队内如何去进一步推广，譬如说：
1）哪些是你看到的问题
2）哪些是你最先要去解决的问题
3）这些问题中，你准备怎么用AI去解决
4）哪些新的机制你觉得需要引入？
 
Erik 先表达自己的想法，看到的最重要的问题有四个
1.1）从我个人角度来看，我需要能访问所有一线员工每周的工作纪要，以便在需要的时候能访问这些原始数据，获得最完整的信息
1.2）我们应该把工作中的所有信息都能存下来让AI可以使用，然后AI来帮我们分析理解这些数据，在这个基础上，我希望做到每周做business review，并且能快速决策。而不是通过MMR/QBR。MMR/QBR的机制并不是因为它们是最合理的，而是受限于过往能力的限制。
1.3）通过AI去总结各个account里发生的最佳实践，并且最大限度的去分享和复制。这里首先要解决数据和业务脱敏的问题，但我认为这件事情的价值非常大。
1.4）每个人都在使用AI来改造自己的工作，如何建立一个机制去，认可那些做的好的实践，并且把这些好的实践去让其他人受益？

至于机制，除了需要去重新思考IC KPI setting，Erik 建议SA奖项也要朝AI practice去倾斜。

根据我的 Role 和过往我的工作 scope，你来帮我准备这个讨论，如果需要我补充信息，你可以让我提供。注意你需要给我建议同时也启发我思考。
```

## 37. SKILL backup
```
 What the archive contains — a single tarball with all four skill roots, symlinks preserved so it
  restores exactly as-is:
  - ~/.claude/skills — your custom skills (backup-config, mmr-prep, pdf2word, storm-research,
  sync-feishu-outlook, wbr-data-collection, frontend-slides) plus 52 symlinks
  - ~/.agents/skills — the shared skill targets those symlinks point to (docx, pptx, pdf, lark-*,
  frontend-design, etc.)
  - ~/.claude/plugins/cache + ~/.claude/plugins/marketplaces — the plugin skill bundles
  (superpowers, claude-for-financial-services, official plugins)

  Bucket security: created fresh with versioning enabled and all public access blocked — so
  re-running the backup keeps prior versions, and nothing is publicly readable.

  To restore:
  aws s3 cp s3://claudecode-skills-backup-710299592439/claude-skills-backup-20260706-232708.tar.gz
  .
  tar -xzf claude-skills-backup-20260706-232708.tar.gz -C ~
  The manifest in the bucket documents the full skill inventory and these same restore steps.
```

## 38 guide to find your unknowns with Fable
```
I'm working on adding a new auth provider but I know nothing about the auth modules in this codebase. Can you do a blind spot pass to help me figure out my relevant unknown unknowns and help me prompt you better.

I don’t know what color grading is but I need to grade this video. Can you teach me to understand my unknown unknowns about color grading, so that I can prompt better?

I want a dashboard for this data but I have no visual taste and don't know what's possible. Make me an HTML page with 4 wildly different design directions so I can react to them.

Before wiring anything up, make a single HTML file mocking the new editor toolbar with fake data. I want to react to the layout before you touch the real app.

Here's my rough problem: users churn after onboarding. Search the codebase and brainstorm 10 places we could intervene, from cheapest to most ambitious. I'll tell you which ones resonate.

Interview me one question at a time about anything ambiguous, prioritize questions where my answer would change the architecture.

This Rust crate in vendor/rate-limiter implements the exact backoff behavior I want. Read it and reimplement the same semantics in our TypeScript API client.

Write an implementation plan in HTML, but lead with the decisions I'm most likely to tweak with: data model changes, new type interfaces, and anything user-facing. Bury the mechanical refactoring at the bottom, I trust you on that part.

Keep an implementation-notes.md file. If you hit an edge case that forces you to deviate from the plan, pick the conservative option, log it under 'Deviations', and keep going.

Package the prototype, the spec, and the implementation notes into a single doc I can drop in Slack to get buy-in. Lead with the demo GIF.

I want to make sure I understand everything that's happened in this change. Give me a HTML report on the changes for me to read and understand with context, intuition, what was done, etc. and a quiz at the bottom on the changes that I must pass.
```

# 39 build-your-ai-context
```
Summarize the key risks in my OP1 and suggest mitigations I should raise with my VP.

Draft a 3-bullet status update for my skip-level based on my documents. Executive tone, under 100 words.

What are the gaps between my stated goals and what my documents actually show actual status?

Summarize Q4 for the SVP. Add inline citations to sources for every figure, and flag the one number you're least confident about.

Before I send this, list anything you couldn't verify from the documents, and any context you might be missing.

Here's a prompt I rely on and the output it produced.
Prompt: [paste your prompt]
Output: [paste the AI output]
Spot-check the output (verify the highest-stakes claim, flag what only I would know is missing), then rewrite my prompt so the AI self-checks next time: cite every figure's source, flag its least-confident claim, and list what it couldn't verify.
```