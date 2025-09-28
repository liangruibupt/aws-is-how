# Amazon Bedrock AgentCore Samples

## Quick Start
### Prepare IDE
```bash
# 默认采用 web based vscode IDE
1. 下载 CloudFormation 模板：code-editor.yaml
2. 创建堆栈
3. 在 CloudFormation 堆栈的 输出 选项卡中，找到 VS Code 访问 URL
4. 点击 URL 链接访问 Visual Studio Code IDE

# 如果你采用 MacBook 执行，install docker on your MacBook
https://docs.docker.com/desktop/setup/install/mac-install/

# 配置Pyhton 环境
uv venv --python 3.13
source .venv/bin/activate

# Set your AWS credential
aws configure
```

### Prepare IDE Option 2 - SageMaker AI Studio
Follow up the [SageMaker AI Studio guide](https://catalog.workshops.aws/agentcore-deep-dive/zh-CN/00-prerequisites/03-sagemaker-studio)

### clone repository
```bash
git clone https://github.com/awslabs/amazon-bedrock-agentcore-samples.git

cd amazon-bedrock-agentcore-samples

#每个实验都指定了运行实验所需的包，请使用以下命令安装requirements.txt：
pip install --force-reinstall -U -r requirements.txt
```

## Run the samples Notebook

后续文档均以 web based vscode IDE 为例

1. [runtime_with_strands_and_bedrock_models](amazon-bedrock-agentcore-workshop/01-AgentCore-runtime/01-hosting-agent/01-strands-with-bedrock-model/runtime_with_strands_and_bedrock_models.ipynb)
```bash
pip install -r requirements.txt
```

选择正确的 Kernel

![选择正确的 Kernel]()

2. 