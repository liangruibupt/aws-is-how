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


Read the quip <URL>, summary the <AWS Region Names> <Industry Name> migration items,  catelog results as Migration Driver, then industry, <customer name><description>. Save result to migration_insights.md under current folder.

Read the quip <URL>, summary the <Industry Name> items under "Customer Highlights" section, catelog results as Tag, then industry, <customer name><description>. Exclude items under "Business Trends and Top Things Having Impact". Save result to highlight_insights.md under current folder.
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