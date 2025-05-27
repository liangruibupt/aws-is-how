# MCP on Amazon Bedrock

参考链接[demo_mcp_on_amazon_bedrock](https://github.com/aws-samples/demo_mcp_on_amazon_bedrock/tree/main)

## 环境架构
![architecture](arch.png)

## 安装步骤
1. SSH 到 EC2 服务器
2. NodeJS install
    ```bash
    sudo apt update
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt install -y nodejs
    node --version
    v22.14.0
    npm --version
    10.9.2
    ```

3. Python and uv install
    ```bash
    curl -LsSf https://astral.sh/uv/install.sh | sh
    ```

4. 环境配置
   
   4.1 创建 IAM permission
    ```json
    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "ec2:*",
                    "elasticloadbalancing:*",
                    "autoscaling:*",
                    "iam:*",
                    "cloudformation:*",
                    "bedrock:*",
                    "ssm:*"
                ],
                "Resource": "*"
            }
        ]
    }
    ```

    4.2 环境文件配置

    ```bash
    git clone https://github.com/aws-samples/demo_mcp_on_amazon_bedrock.git
    cd demo_mcp_on_amazon_bedrock
    uv sync
    source .venv/bin/activate
    
    cat env_dev >> .env
    # modify your configuration
    AWS_ACCESS_KEY_ID=
    AWS_SECRET_ACCESS_KEY=
    AWS_REGION=us-west-2
    LOG_DIR=./logs
    CHATBOT_SERVICE_PORT=8502
    MCP_SERVICE_HOST=127.0.0.1
    MCP_SERVICE_PORT=7002
    API_KEY=mcp_demo_123456
    MAX_TURNS=200
    ```

    4.3 Security Group
    - 为 CHATBOT_SERVICE_PORT and MCP_SERVICE_PORT 创建入站规则

5. Start environment
- Chat 接口服务（Bedrock+MCP），可对外提供 Chat 接口、同时托管多个 MCP server、支持历史多轮对话输入、响应内容附加了工具调用中间结果、暂不支持流式响应
- ChatBot UI，跟上述 Chat 接口服务通信，提供多轮对话、管理 MCP 的 Web UI 演示服务

    ```bash
    # start server
    bash start_all.sh
    tail -f logs/start_mcp.log
    tail -f logs/start_chatbot.log

    # stop Server
    bash stop_all.sh
    ```

6. 测试Chat 服务接口
    ```
    curl http://127.0.0.1:7002/v1/chat/completions \
      -H "Authorization: Bearer mcp_demo_123456" \
      -H "X-User-ID: user123" \
      -d '{
      -H "Content-Type: application/json" \
        "model": "us.amazon.nova-pro-v1:0",
        "mcp_server_ids":["local_fs"],
        "stream":true,
        "messages": [
          {
            "role": "user",
            "content": "list files in current dir"
          }
        ]
      }'
    ```

## 使用MCP Demo 环境
1. Chat 接口服务
- 在本地计算机上打开终端

    ```bash
    ssh -L {MCP_SERVICE_PORT}:127.0.0.1:{MCP_SERVICE_PORT} ubuntu@{EC2 IP} -i Your_SSH_Key.pem

    ssh -L {CHATBOT_SERVICE_PORT}:127.0.0.1:{CHATBOT_SERVICE_PORT} ubuntu@{EC2 IP} -i Your_SSH_Key.pem
    ```

- 可以通过http://localhost:{MCP_SERVICE_PORT}/docs#/ 查看接口文档。 注意点击 Authorize, 输入`Bearer mcp_demo_123456`

    ```bash
    curl -X 'GET' \
    'http://localhost:7002/v1/list/models' \
    -H 'accept: application/json' \
    -H 'Authorization: Bearer mcp_demo_123456'

    {
      "models": [
        {
          "model_id": "us.amazon.nova-pro-v1:0",
          "model_name": "Amazon Nova Pro v1"
        },
        {
          "model_id": "us.amazon.nova-lite-v1:0",
          "model_name": "Amazon Nova Lite v1"
        },
        {
          "model_id": "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
          "model_name": "Claude 3.5 Sonnet v2"
        },
        {
          "model_id": "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
          "model_name": "Claude 3.7 Sonnet"
        }
      ]
    }

    curl -X 'GET' \
    'http://localhost:7002/v1/list/mcp_server' \
    -H 'accept: application/json' \
    -H 'Authorization: Bearer mcp_demo_123456'

        {
          "servers": [
              {
                "server_id": "cot",
                "server_name": "cot"
              },
              {
                "server_id": "local_fs",
                "server_name": "Local File System I/O"
              }
            ]
        }
    ```

- 编辑配置文件 conf/config.json，该文件预设了要启动哪些 MCP server，可以编辑来添加或者修改 MCP server 参数。例如 sqllite db
    ```json
   "db_sqlite": {
        "command": "uvx",
        "args": ["mcp-server-sqlite", "--db-path", "./tmp/test.db"],
        "env": {},
        "description": "DB Sqlite CRUD - MCP Server",
        "status": 1
    }
    ```
    
    ```bash
    bash start_all.sh
    ```

2. ChatBot UI
- 遵循[按照步骤](https://github.com/aws-samples/demo_mcp_on_amazon_bedrock/blob/main/react_ui/README.md) 安装 Next.js UI
  这里采用了使用Node.js直接部署（开发模式）
  ```bash
  # Node.js 22.x 或更高版本, 安装参考：https://nodejs.org/en/download
  # Verify the Node.js version:
  node -v # Should print > "v22.14.0".
  # Verify npm version:
  npm -v # Should print > "10.9.2".

  #1. 进入react_ui 安装依赖
  cd demo_mcp_on_amazon_bedrock/react_ui
  npm install

  #2. 安装pm2工具
  sudo npm -g install pm2

  #3. 创建环境变量
  cp .env.example .env.local

  #4. 编辑.env.local文件
  NEXT_PUBLIC_API_KEY=mcp_demo_123456
  SERVER_MCP_BASE_URL=http://localhost:7002
  NEXT_PUBLIC_MCP_BASE_URL=/api
  NEXT_PUBLIC_API_BASE_URL=https://localhost:7002 

  #5. 启动 Chatbot 开发模式
  npm run dev
  ```

- 浏览器访问 http://localhost:3000/chat

3. 测试
- 测试提问：由于已内置了文件系统操作、SQLite 数据库等 MCP Server，可以尝试连续提问以下问题进行体验
    ```
    1. list all of files in the allowed directory
    
    2. create table named mcp_demo in test.db with columns id, product_name, amount
    3. create 10 rows dummy datahow many rows in that table

    4. show all of rows in that table mcp_demo
    5. save those rows record into a file, filename is rows.txt
    6. read the content of rows.txt file
    ```

- 创建 Web Search 供应商 [Exa](https://exa.ai/) MCP Server， 你需要申请Exa API的 API Key
  ```bash
  sudo npm install -g exa-mcp-server
  ```

  ```json
    {
      "mcpServers": {
        "exa": {
          "command": "npx",
          "args": ["-y","exa-mcp-server"],
          "env": {
            "EXA_API_KEY": "your-api-key-here"
          }
        }
      }
    }
  ```

- 创建 Web Browser MCP Server
    ```json
    { "mcpServers": 
    	{ "mcp-browser": 
    		{ "command": "uvx", "args": ["mcp-browser-use"] 
    		} 
    	} 
    }
    ```

4. 测试 Deep Research 和 网页生成
- 第一次运行可能需要额外安装一些软件，请跟进tool call 返回的信息提示安装即可
```
Error executing tool search_google: BrowserType.launch: Host system is missing dependencies to run browsers. Please install them with the following command:
sudo npm install -g playwright
sudo playwright install-deps
sudo npx playwright install
```

- 测试1
```
帮我整理一份关于小米SU7 ultra的介绍，包括性能，价格，特色功能，图文并茂，并制作成精美的HTML保存到本地目录中。如果引用了其他网站的图片，确保图片真实存在，并且可以访问。use headless is true to initialize the browser

{
  "toolUseId": "tooluse_RC5NpF61QseO_hdX2nzI6w",
  "content": [
    {
      "text": "Successfully wrote to /home/ubuntu/demo_mcp_on_amazon_bedrock/docs/xiaomi_su7_ultra.html"
    }
  ]
}

scp -i ~/.ssh/mykey.pem ubuntu@{ec2_ip}:/home/ubuntu/demo_mcp_on_amazon_bedrock/docs/xiaomi_su7_ultra.html ~/Downloads/
```

- 测试2
```
我想要一份特斯拉股票的全面分析，包括：概述：公司概况、关键指标、业绩数据和投资建议财务数据：收入趋势、利润率、资产负债表和现金流分析市场情绪：分析师评级、情绪指标和新闻影响技术分析：价格趋势、技术指标和支撑/阻力水平资产比较：市场份额和与主要竞争对手的财务指标对比价值投资者：内在价值、增长潜力和风险因素投资论点：SWOT 分析和针对不同类型投资者的建议。 并制作成精美的HTML保存到有写入权限的本地目录中。 你可以使用mcp-browser和exa search去获取尽可能丰富的实时数据和图片。如果引用了其他网站的图片，确保图片真实存在，并且可以访问。use headless is true to initialize the browser

scp -i ~/.ssh/mykey.pem ubuntu@{ec2_ip}:/home/ubuntu/demo_mcp_on_amazon_bedrock/docs/tesla_stock_analysis.html ~/Downloads/
```

- Thinking 测试
```
1. use search tool and sequential thinking to make comparison report between different agents frameworks such as autogen, langgraph, aws multi agents orchestrator
2. use sequential thinking and search tool to make me a travel plan to visit shanghai between 3/1/2025 to 3/5/2025. I will departure from Beijing
3. 搜索对比火山引擎，阿里百炼，硅基流动上的对外提供的deepseek r1 满血版的API 性能对比, 包括推理速度，TTFT， 最大context长度等。通过一个网页展示，对比结果为一个表格，并且高亮每个指标中最佳的提供商
```

5. 清理环境
```bash
# Stop Servers
bash stop_all.sh

# exist python virtual environment
deactivate
```

## Trouble Shooting
1. ERROR: Stream processing error: Expecting ',' delimiter: line 1 column 46 (char 45)
```
原因： 生成代码比较长，被截断了。 
解决： max output token需要设置长点，比如16k
```
