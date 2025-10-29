1. 生成 Mermaid 代码
```
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

2. 生成 draw.io 的图
```
prompt: 根据提供的图片，帮忙生成使用 2023年之后最新版本的 AWS 服务官方图标的架构图代码，输出格式可以直接导入到draw.io

prompt: Follow up the AWS Well-Architected design guidance, generate an aws architecture diagram that uses the official icons of the latest version of AWS services after 2023. The architecture is 3-tier architecture built by serverless backend with API Gateway, Lambda, DynamoDB, and S3. The output format can be directly imported into draw.io.
```

3. 解读周报和月报
```
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


Read the quip <URL>, Please summary items tagged '[CNR]', 'BJS', 'ZHY', '[C2C,', '[C2C', '[G2C,', 'China Region'. The result item output format is <customer name><description><AWS Region Names><ARR or MRR><SA Owner>. Save result to cnr_insights.md under current folder.
Here is the output example: NewCompany(C2C, L, ISV) migrated their CI/CD system from Azure China to AWS ZHY with $5K MRR, implementing Spot instances within EKS to achieve 50% cost savings compared to Azure. (SA Owner: John)

阅读 quip link <Quip URL>, 
- 第一步，提取和分析打了'GenAI Opp', 'C2G Opp', 'G2C Opp', 'Migration Opp', 'ADAS Opp', 'SDV Opp', 'Compliance & Security Opp', 'Analytics Opp', 'CO Opp', 'Cockpit Opp' 的内容。
- 第二步，把结果按照指定格式<customer name><description><AWS Region Names><ARR or MRR><SA Name> 创建总结。这里有一个输出参考案例: ExampleCompany(XL) launched self-developed CMS platform test env (including TSP, SoC, PKI, OTA, etc.) in FRA with $20K MRR. SA is working on AWS security services integration (WAF, GuardDuty, Security Hub) to enhance platform security. SA Yang.
- 第三步，把结果保存到 ~/Downloads/mac_sync/migration_insights.md，一个条目一行.

Read the quip <URL>, summary the content from June 01 to June 30. Please summary items tagged 'GenAI Opp', 'C2G Opp', 'G2C Opp', 'Migration Opp', 'MIH Opp', 'HPC Opp', 'CO Opp', 'Security Opp', 'Analytics Opp'. The result item output format is <customer name><description><AWS Region Names><ARR or MRR><SA Name>. Save result to xxx_insights.md under current folder.
Here is the output example: MyCompany(L) deployed self-developed ERP system in Frankfurt region for its global business expansion with $70K ARR. SA Alex.

```

4. 阅读研究报告
```
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

5. 竞对分析
```
Prompt:
对比一下 
1. Azure 中国北部2 和 AWS 中国北京区域 V100 GPU 的价格。
2. 对比Azure 中国北部3 和 AWS 中国宁夏区域 T4 GPU 的价格。
3. 对比Azure 中国北部2 A10 GPU 和 AWS 中国北京区域 A10G GPU 的价格。
4. 对比Azure 中国北部3 A10 GPU 和 AWS 中国宁夏区域 A10G GPU 的价格。
```

6. Image Generation
```
Prompt:
胶片摄影，日落余晖，青橙+黑金，泛朦，失焦，低调，高反差，对焦模糊，独特视角，双重曝光，即兴抓拍山顶云海日落少女人像及场景，极限颜值，潮时尚穿搭，动态时兴发型，既视感，现场感，朦胧氛围感拉满，暗朦，过曝，高噪点，胶片质感，层次丰富，写意，强烈视觉冲击力，朦胧美学，光的美学，深色加深，亮色增亮，HDR效果，lomo效果，高级感，杰作

Prompt:
A young Asian woman with fair skin and delicate facial features walks slowly along the outer red wall of an imperial palace. She wears a light apricot-colored sleeveless summer dress with a soft A-line silhouette, the hem swaying gently with each step. Her hair is loosely tied back, and she looks directly at the camera with a calm, slightly smiling expression. The scene is shot diagonally, allowing the palace wall to recede deeply into the frame. Horizontal composition, with the woman positioned in the left third. Captured in ultra-realistic 8K with soft morning light grazing the red wall.

中文对照：
一位皮肤白皙、五官清秀的亚洲年轻女性，缓缓走在中国故宫的殿外红墙旁。她身穿一条淡杏色无袖夏日长裙，裙摆自然摆动，剪裁清爽柔和。头发随意扎起，眼神平静微笑，直视镜头。摄影师采用斜角拍摄，红墙延伸至画面深处。横构图，人物位于左侧三分之一。8K 超写实画质，晨光斜洒，墙体与人物光影层次分明。
```

7. Excel 分析
```
这个 Excel 文件的Summary Sheet 包含了 AUTO, ISV, LS_HC, ME_AD 四个行业的 Top 50 account 的 EC2 mix % rate 以及 Windows instance % rate。
第一步帮我分别总结 Summary Sheet 中每个行业的 All_Services_Rev 大于 100,000 的 account。第二步这些 account 中 EC2 mix rate 大于 30%的 account，按照All_Services_Rev 从高到低排序，取前 10 名。第三步在第二步的基础上，在过滤掉 Windows instance rate 大于 20%的 account。按照行业分开统计，用 table 方式输出 | account | Industry | All_Services_Rev | EC2 mix rate | Windows instance rate |

这个 Excel 文件的Summary Sheet 包含了 AUTO, ISV, LS_HC, ME_AD 四个行业的 Top 50 account 的 EC2 mix % rate 以及 Windows instance % rate。
帮我分别总结 Summary Sheet 中每个行业的All_Services_Rev 大于 100,000 的 account，在这些account 中 EC2 mix rate 大于 30%的 account，按照All_Services_Rev 从高到低排序，取前 10 名。以及Windows instance rate 大于 20%的 account，按照从高到低排序，取前 10 名。按照行业分开统计，用 table 方式输出 | account | Industry |  All_Services_Rev | Rate |

这个 Excel 文件的Summary Sheet 包含了 AUTO, ISV, LS_HC, ME_AD 四个行业的 Top 50 account 的 EC2 mix % rate 以及 Windows instance % rate。
第一步帮我分别总结 Summary Sheet 中每个行业的 All_Services_Rev 大于 100,000 的 account。第二步这些 account 中 Windows instance rate 大于 20%的 account。按照All_Services_Rev 从高到低排序。 按照行业分开统计，用 table 方式输出 | account | Industry | All_Services_Rev | Windows instance rate |
```

8. Email handing
```
I need write a email draft to remind SA mgr to notify each team China Region KPI, do not send email, just put the email in my draft folder

```

9. 用 Q CLI 进行 AWS 文档查询
```
# 安装 Amazon Document MCP Server 
AWS中国区域的专线流量价格是每 GB 多少钱? 注意AWS中国区域价格计算器的地址：https://calculator.amazonaws.cn/ 和中国区文档地址 https://www.amazonaws.cn/?nc1=h_ls
```

10. HTML to PPT
```
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

11. Prepare the customer visit flow
```
I need visit customer CTO / Chief Scientist / Chief Architecture / CIO, I need do the comprehensive research for customer profile including recent news, recent sales performance, new launched products etc. I also need do the research for CTO / Chief Scientist / Chief Architecture / CIO including recent public speech, events announcement, recent blogs or publish, what's the recent focus. The flow allow me input the customer name before do the research. The flow can ask me the name of CTO / Chief Scientist / CIO, if I do not know, then flow can search their name then do the research. The generated result max up to 6 pages and summary the talking points for me. The output is Microsoft Word document contain above research contents and talking points.
```

12. Migration insights
```
The top 3 migration driver in the attached file and give me summary from migration type like IDC2AWS, GCP2AWS, Ali2AWS etc;  Stage like Launched, Qualify, TV etc; Total Rev. You can also add your insights.

You have checked all the data in the file, give me the total revenue, total companies number and summary by table with details, sort with deal size and stage
```

13. Knowledge check
```
查询 AWS 上面2024年之后发布的最新P系列和G系列的GPU数量小于8的实例，采用 mcp 查询文档，t通过 Table 格式输出。


把上面的实例类型，通过 aws-pricing-mcp-server 查询在 us-east-1 region的价格，包括 OD, ISP, Spot 单价，如果最后信息不足,在通过 aws cli 获取信息, 结果通过 table 列出。
```

## AWS 2024年后发布的P系列和G系列GPU实例（GPU数量<8）- 完整版

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


14. [reimbursement-helper](https://gitlab.aws.dev/kentpeng/reimbursement-helper)