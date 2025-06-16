# Bedrock inline Agents 构建 MCP 应用

Reference link to read: 
- [Harness the power of MCP servers with Amazon Bedrock Agents](https://aws.amazon.com/blogs/machine-learning/harness-the-power-of-mcp-servers-with-amazon-bedrock-agents/)
- [AWS bedrock agent example](https://github.com/awslabs/amazon-bedrock-agent-samples)
- [AWS cloud-spend-mcp-server](https://github.com/aws-samples/sample-cloud-spend-mcp-server)
  
## 配置环境
1. 创建并激活环境
```bash
git clone https://github.com/awslabs/amazon-bedrock-agent-samples.git
cd amazon-bedrock-agent-samples/src/InlineAgent

sudo apt install -y python3.11
sudo apt install -y python3.11-venv
python3.11 -m venv .venv
source .venv/bin/activate
python --version

python -m pip install -e .
```

2. 运行示例
- 执行 InlineAgent_hello 检查是否可以正常运行
```bash
InlineAgent_hello us.anthropic.claude-3-5-haiku-20241022-v1:0

Running Hello world agent:                                                                                                       

                                                                                                                    
 from bedrock_agents.agent import InlineAgent                                                                                    
                                                                                                                                 
 InlineAgent(                                                                                                                    
     foundationModel="us.anthropic.claude-3-5-haiku-20241022-v1:0",                                                              
     instruction="You are a friendly assistant that is supposed to say hello to everything.",                                    
     userInput=True,                                                                                                             
     agentName="hello-world-agent",                                                                                              
 ).invoke("Hi how are you? What can you do for me?") 
```

## 配置MCP Server
1. 采用 cost_explorer_agent 样例
```bash
cd examples/mcp/cost_explorer_agent
cp .env.example .env

cat << EOF > .env
AWS_PROFILE=default
AWS_REGION=us-west-2
BEDROCK_LOG_GROUP_NAME=MCPAGENT
PERPLEXITY_API_KEY=
EOF

docker --version
```

2. 构建 aws-cost-explorer-mcp 服务器
```bash
cd ~
git clone https://github.com/aws-samples/sample-cloud-spend-mcp-server.git
cd sample-cloud-spend-mcp-server
docker build -t aws-cost-explorer-mcp .
docker run -v ~/.aws:/root/.aws aws-cost-explorer-mcp
```

3. 与 aws-cost-explorer-mcp Server 进行交互
```bash
cd ~/amazon-bedrock-agent-samples/src/InlineAgent/examples/mcp/cost_explorer_agent

python main.py

"Amazon Bedrock是什么？在过去7天里，我在哪些AWS服务上花费最多？请精确说明并创建条形图"
```

## 清理环境
```bash
# exist python virtual environment
deactivate
```