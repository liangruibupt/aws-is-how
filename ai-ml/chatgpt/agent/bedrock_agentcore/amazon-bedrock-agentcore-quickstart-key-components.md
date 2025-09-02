# AgentCore 组件化架构实验

## 难度: L100 (入门级)

深入了解 Amazon Bedrock AgentCore 组件化架构设计的综合实验。通过 4个实验，学习如何独立使用和组合 AgentCore 的核心组件，与 Strands Agents 框架集成，构建功能强大的企业级 AI 代理应用。

Lab 4-1-1: AgentCore Code Interpreter 集成
Lab 4-1-2: AgentCore Identity 安全凭证管理
Lab 4-1-3: AgentCore Runtime MCP 服务器部署
Lab 4-1-4: AgentCore Runtime & Observability 部署及监控 Agent

### Prepare
```bash
# you can run on web based vscode IDE
1. 下载 CloudFormation 模板：code-editor.yaml
2. 创建堆栈
3. 在 CloudFormation 堆栈的 输出 选项卡中，找到 VS Code 访问 URL
4. 点击 URL 链接访问 Visual Studio Code IDE

# 如果你采用 MacBook 执行，install docker on your MacBook
https://docs.docker.com/desktop/setup/install/mac-install/

# 配置Pyhton 环境
uv venv --python 3.11
source .venv/bin/activate
uv pip install --upgrade strands-agents strands-agents-tools boto3 bedrock-agentcore bedrock-agentcore-starter-toolkit ddgs mcp playwright

# Set your AWS credential
aws configure
```

### clone repository
```bash
git clone https://github.com/aws-samples/sample-strands-in-5-minutes
cd sample-strands-in-5-minutes/bedrock-agentcore-integration/workshop/cn
```

### Run the samples
1. Run the Notebook: ai-ml/chatgpt/agent/bedrock_agentcore/01-agentcore-code-interpreter.ipynb
```
在 Strands Agent 中使用自定义 AgentCore Code Interpreter 这一步可能会导致代码运行失败，是因为可能pip install之后，没有再次执行代码，所以可以添加一条提示词：Then retry execute code again after you install package successfully.
然后再次执行这个 block
```

2. 