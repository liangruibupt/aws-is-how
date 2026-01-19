Weekly newsletter

```
nohup python -u agents/system_agents/agent_build_workflow/agent_build_workflow.py -i '我需要一个能够自动化采集生命科学行业重要新闻的agent，该agent在采集完成后能够将内容上传到指定的s3，我会后续通过邮件将文件内容发送给指定群组，基本要求如下：
1）按照全面数据获取、内容分类、总结/摘要、报告生成、报告上传这几个步骤进行
2）数据获取，从以下数据源获取全面的数据：
  通用搜索引擎（我会提供API Key）：Google Search（https://serpapi.com/search?）
  综合医疗资讯
  - 丁香园 - https://www.dxy.cn/
  - 医学界 - https://www.yxj.org.cn/
  - 健康界 - https://www.cn-healthcare.com/
  - 医谷 - https://www.yigoonet.com/
 
  生物医药专业
  - 生物探索 - https://www.biodiscover.com/
  - 医药魔方 - https://www.yaozh.com/
  - 药智网 - https://www.yaozh.com/
  - 美柏医健 - https://www.marbridgeconsulting.com/
 
  学术科研
  - 科学网 - https://www.sciencenet.cn/
  - 中国生物技术网 - https://www.biotech.org.cn/
  - 生物谷 - https://www.bioon.com/
 
  行业动态
  - 动脉网 - https://www.vcbeat.net/
  - 亿欧大健康 - https://www.iyiou.com/
  - 36氪医疗 - https://36kr.com/
 
  政策法规
  - 国家药监局 - https://www.nmpa.gov.cn/
  - 国家卫健委 - http://www.nhc.gov.cn/
  注意：请尽可能全面获取内容和数据，必要时进行深度检索和遍历检索
3）数据分类，将获取到的内容和全文进行分类，如下示例：
  1. 政策法规类
    - 医疗数据合规（HIPAA、等保、数据安全法）
    - 药品审批政策
    - 医保支付政策
  2. 医疗数字化转型案例
    - 医院信息化/智慧医疗
    - 远程医疗/互联网医院
    - 医疗影像AI应用
  3. 药物研发与创新
    - 新药研发管线
    - AI制药/计算生物学
    - 临床试验数字化
  4. 医疗器械与产品
    - 新医疗设备/诊断产品
    - 可穿戴设备/IoT医疗
  5. 战略合作与并购
    - 医药企业合作
    - 科技公司进入医疗
    - 跨境合作
  6. 基因组学与精准医疗
    - 基因测序技术
    - 个性化治疗
  7. 医疗数据与AI
    - 大模型医疗应用
    - 医疗数据平台
    - 生成式AI相关
4）总结和摘要：总结所有文档的关键信息、动态，并对每篇文档生成摘要
5）生成HTML报告，根据总结和摘要信息、以及每篇文章的来源/超链接，生成完整的html报告
6）报告上传，最终生成的报告需要上传到s3桶，并按年月日分类，s3桶：s3://newletter-2026, region:us-west-2
7）生成presign url并告知客户
 
**重要信息**
1）允许指定配置文件，支持配置文件中定义数据源URL、API Key等信息
2）HTML模版参考：case/newsletter_template.html' &
```