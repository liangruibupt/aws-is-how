# Amazon Bedrock AgentCore Samples

## Quick Start
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
uv venv --python 3.13
source .venv/bin/activate
uv pip install --upgrade strands-agents strands-agents-tools boto3 bedrock-agentcore bedrock-agentcore-starter-toolkit ddgs mcp playwright

# Set your AWS credential
aws configure
```

### clone repository
```bash
git clone https://github.com/awslabs/amazon-bedrock-agentcore-samples.git

cd amazon-bedrock-agentcore-samples
```

### Run the samples
1. Run the Notebook: 01-tutorials/01-AgentCore-runtime/01-hosting-agent/01-strands-with-bedrock-model/runtime_with_strands_and_bedrock_models.ipynb