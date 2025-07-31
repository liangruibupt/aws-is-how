# Amazon Bedrock AgentCore Samples

## Quick Start
### Prepare
```bash
git clone https://github.com/awslabs/amazon-bedrock-agentcore-samples.git

cd amazon-bedrock-agentcore-samples

python3 -m venv venv
source venv/bin/activate
pip install --upgrade uv strands-agents strands-agents-tools boto3 bedrock-agentcore bedrock-agentcore-starter-toolkit

# install docker on your MacBook
https://docs.docker.com/desktop/setup/install/mac-install/

# Set your AWS credential
aws configure
```

### Run the samples
1. Run the Notebook: 01-tutorials/01-AgentCore-runtime/01-hosting-agent/01-strands-with-bedrock-model/runtime_with_strands_and_bedrock_models.ipynb