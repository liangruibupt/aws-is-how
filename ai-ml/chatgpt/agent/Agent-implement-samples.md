[GitHub - aws-samples/sample-analytics-agent-progressive-disclosure](https://github.com/aws-samples/sample-analytics-agent-progressive-disclosure)
针对 Data Agent 的场景，构建了 35 个数据表，横跨 8 个业务域，超过 19 万行的 demo 数据集。参考了 Anthropic官方的Data Agent 设计思路，采取渐进式披露的方式处理数据格式和业务信息关联，通过关键指标工具化的方式提升搜索准确率，并且适配了复杂的统计学数据分析 Skill 模拟数据团队在真实环境的数据洞察挖掘能力，帮助客户大数据团队通过AI转型。作者 Odin Wang, SA Intern Zeng Yuhang

[GitHub - aws-samples/sample-claude-tag-in-lark](https://github.com/aws-samples/sample-claude-tag-in-lark)
Anthropic 发布 Claude Tag 服务，部分Web3客户AI团队很关注。但是 Claude Tag 只服务于 Anthropic 原厂订阅和 Slack 频道接入。针对 Web3 客户现状，搭建了基于 Lark 的复刻版。利用了Lark 自带的 Chatbot 功能，对接到 AWS 后端的 AgentCore Runtime 和 AgentCore Memory，实现了在 Lark 群里面直接@ 机器人启动对话，机器人长期记忆，记忆自动规整优化，自动聊天记录跟踪学习，Lark MCP 对接处理 Lark 文档，以及定时任务能力。作者 Odin Wang

[Github - aws-samples/sample-aws-resource-graph-cmdb](https://github.com/aws-samples/sample-aws-resource-graph-cmdb)
针对客户自建 CMDB 的场景，客户希望使用关系型数据库来处理 CMDB 当中 AWS 资源的互相联系。在这个sample-code 当中，实现了通过 AWS Config，Kubectl 和 AWS CLI 抽取 AWS 资源并构建知识图谱的能力。通过查询 Cloudtrail 和 VPC Flow Log 的真实交互数据来构建 AWS 资源之间的真实联系。构建泛化的展示过滤层，筛选掉大多数的无关资源，直接把 AWS 资源映射到相对清晰的架构图上。作者 Odin Wang

[GitHub - aws-samples/sample-litellm-bedrock-gateway-on-eks: Production-grade LiteLLM to Amazon Bedrock](https://github.com/aws-samples/sample-litellm-bedrock-gateway-on-eks)
LiteLLM 在实际的大规模生产环境的部署实践配置。从易到难分别解决了客户实际使用中遇到的配置细节 L1：通过 EKS Pod Identity 处理 LiteLLM 和 Bedrock 对接，解决 AKSK 分发带来的安全隐患。L2：通过 VPC Endpoint 对接 Bedrock，杜绝了 LiteLLM POD 潜在的公网访问。L3：通过Cross-region VPC Peering，解决客户不满足 Global Inference Profile 的性能问题，可以在不出公网的情况下跨 region 访问 US Inference Profile。L4：利用跨账号 Assume role访问其他账户的 Bedrock，实现用量分离和模型合规隔离。作者 Odin Wang, Neo Sun