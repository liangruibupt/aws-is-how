# Strands Agents workshop

- [实验地址](https://catalog.us-east-1.prod.workshops.aws/workshops/d674f40f-d636-4654-9322-04dafc7cc63e/zh-CN/30-lab-3)
- [Github - sample_agentic_ai_strands](https://github.com/aws-samples/sample_agentic_ai_strands)
- [中国区构建 Agentic AI 应用实践指南](https://aws.amazon.com/cn/blogs/china/practical-guide-to-building-agentic-ai-applications-for-aws-china-region/)

## 注意事项
1. Install package
```bash
source venv/bin/activate
pip install --upgrade strands-agents strands-agents-tools strands-agents-builder
```  
2. 配置在EC2上的 IAM Profile 需要有 ECS, ECR, IAM, S3, Bedrock, CloudFromation, Secrets Manager, System Manager, DynamoDB 的权限，否则运行
`bash cdk-build-and-deploy.sh` 会报告Permission Error

1. 绘制图片 MCP Server 使用了MiniMax-AI，注意需要充值才能让 API Key 正确工作。并且替换其他工具，需要修改 System Prompt `使用minimax绘图工具会返回一个公开访问的URL，在HTML用可以直接嵌入`

2. 用户提示词中，为了保证图片，动画视频等可以被加载可以修改提示词
```bash
# System Prompt
你是一位深度研究助手，请在单次回复中使用可用的最大计算能力，尽可能深入、批判性和创造性地思考，花费必要的时间和资源来得出最高质量的答案。
在收到工具结果后，仔细反思其质量并在继续之前确定最佳下一步。使用你的思考基于这些新信息进行规划和迭代，然后采取最佳的下一步行动。
## 你必须遵循以下指令:
– 每次先使用mem0_memory工具查看是否有与当前问题相关的历史记忆，如果有，提取记忆用于当前任务的内容生成。
– 请使用time 工具确定你现在的真实时间.
– 如果引用了其他网站的图片，确保图片真实存在，并且可以访问。
– 如果用户要求编写动画，请使用Canvas js编写，嵌入到HTML代码文件中。
– 可以使用s3-upload 进行文件上传，生成代码文件请直接上传到s3，并返回访问链接给用户
– 使用text_similarity_search工具去检索厄尔尼诺相关的知识
– 如有需要，也可以使用Web search去检索更多外部信息
– 使用minimax绘图工具会返回一个公开访问的URL，在HTML用可以直接嵌入
- 使用html render 制作精美的 HTML 文件

# User Prompt
你是一名大学地理教师，请为大学生设计一堂关于厄尔尼诺现象的互动课程，需要：1. 搜索最新气候数据和相关新闻事件；2. 搜索教学资源和真实图片，确保图片可以被加载；3. 使用工具绘制课程中的需要的演示插图；4. 生成完整课程方案，包括教学目标、活动设计、教学资源和评估方法；5. 设计一个展示厄尔尼诺现象的酷炫动画并和搜索到的相关信息一起集成到HTML课件中，确保动画视频可以被打开和加载。
```

## 生产环境 CDK 部署
- **代码修改之后，或者.env 修改，需要重新部署**
```bash
# 例如，修改了ENABLE_MEM0=false 为 ENABLE_MEM0=true
cd cdk
bash cdk-build-and-deploy.sh

# 类似于 指定 Stack 名称 部署
cdk deploy McpEcsFargateStack
```
- MCP Server 的修改: MCP Server 可以直接在界面上添加，会保存到dynamodb里
  
- China Region
  ```json
  // 中国区安装需要设置docker 镜像源
  // 使用 sudo vim /etc/docker/daemon.json,添加代理

  {
  "registry-mirrors":["https://mirror-docker.bosicloud.com"],
  "insecure-registries":["mirror-docker.bosicloud.com"]
  }
  ```

- 完全删除所有创建的资源：
```bash
# 删除 CDK Stack
cdk destroy

# 清理 ECR 仓库
aws ecr delete-repository --repository-name mcp-app-frontend --force
aws ecr delete-repository --repository-name mcp-app-backend --force

# 删除 CloudWatch 日志组
aws logs delete-log-group --log-group-name "/ecs/mcp-app-frontend"
aws logs delete-log-group --log-group-name "/ecs/mcp-app-backend"
注意：某些资源（如 DynamoDB 表）可能有删除保护，需要手动确认删除。
```

7. 更多测试场景
```bash
# System Prompt
你是一位旅游规划助手，请在单次回复中使用可用的最大计算能力，尽可能深入和创造性地思考，花费必要的时间和资源来制定出客户定制化的旅游计划
在收到工具结果后，仔细反思其质量并在继续之前确定最佳下一步。使用你的思考基于这些新信息进行规划和迭代，然后采取最佳的下一步行动。
## 你必须遵循以下指令:
– 每次先使用mem0_memory工具查看是否有与当前问题相关的历史记忆，如果有，提取记忆用于当前任务的内容生成。
– 请使用time 工具确定你现在的真实时间.
– 如果用户要求编写动画，请使用Canvas js编写，嵌入到HTML代码文件中。
- 使用html render 制作精美的 HTML 文件
– 生成代码文件请直接上传到s3，并返回访问链接给用户
– 如有需要，也可以使用Web search去检索更多外部信息
– 如果引用了其他网站的图片和视频，确保图片和视频真实存在，并且可以访问。

# User Prompt
请帮我制定从北京到上海的高铁5日游计划，2025年5月1日-5日，要求：
- 交通：往返高铁选早上出发（5.1）和晚上返程（5.5）
- 必去：迪士尼全天（推荐3个最值得玩的项目+看烟花）
- 推荐：3个上海经典景点（含外滩夜景）和1个特色街区
- 住宿：迪士尼住周边酒店，市区住地铁站附近
- 附：每日大致花费预估和景点预约提醒
需要制作成精美的 HTML
```

## 本地开发环境安装
1. 采用Ubuntu 22.04, NodeJS 下载安装，对 v22.12.0 版本测试通过

2. Python 环境
```bash
git clone https://github.com/aws-samples/sample_agentic_ai_strands

aws configure

cd sample_agentic_ai_strands
sudo apt install -y python3-pip
pip3 install uv

uv sync
source .venv/bin/activate
python --version Python 3.13.5
```

3. 启动后端
```bash
cd sample_agentic_ai_strands
cp env.example .env

# for Development mode - API Key for server authentication, if you deploy with CDK, it will create a Api key automatically
API_KEY=123456

# for Development mode - ddb for user config
ddb_table=mcp_user_config_table

#使用vim 打开.env文件编辑： ⚠️如果在x86服务器做编译，可以设置PLATFORM=linux/amd64，否则跨平台编译速度慢好几倍
#⚠️注意⚠️ mem0只在CDK部署有，本地开发模式下面，一般是禁用。因为CDK 部署会创建 Aurora PostgreSQL Serverless 数据库，但是本地环境不会进行创建，需要手工创建，并且设置若干环境变量POSTGRESQL_HOST 环境变量，才能生效，具体参考 sample_agentic_ai_strands/src/custom_tools/mem0_memory.py
ENABLE_MEM0=true
# 如果使用海外区
LLM_MODEL=anthropic.claude-3-7-sonnet-20250219-v1:0
EMBEDDING_MODEL=amazon.titan-embed-text-v2:0

# User MCP config file path
USER_MCP_CONFIG_FILE=conf/user_mcp_configs.json

# 创建 DynamoDB
aws dynamodb create-table \
    --table-name mcp_user_config_table \
    --attribute-definitions AttributeName=userId,AttributeType=S \
    --key-schema AttributeName=userId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST 

# 启动
bash start_all.sh
```

4. 启动前端
```bash
cd sample_agentic_ai_strands/react_ui

#修改 Dockerfile，如果是 Graviton 测试机，采用linux/arm64，X86 测试机采用linux/amd64
ARG PLATFORM=linux/amd64
# 根据测试机所在 Region，选择是否修改
ARG USE_CHINA_MIRROR=false

docker-compose up -d --build

# 查看容器日志
docker logs -f mcp-bedrock-ui
```

5. 访问：http://Your_Server_IP:3000/chat

6. 前端 Docker 命令
```bash
# 重启容器
docker-compose restart
# 停止容器
docker-compose down
# 重新构建并启动（代码更新后）
docker-compose up -d --build
```

## 添加 MCP Servers
### time
```json
{
    "mcpServers": 
    { "time": 
      { "command": "uvx", "args": ["mcp-server-time"]
      } 
    }
}
```

### exa_search
```json
{
  "mcpServers": {
    "exa-search": {
      "command": "npx",
      "args": ["-y","exa-mcp-server"],
      "env": {
        "EXA_API_KEY": "<替换成您自己申请的api key>"
      }
    }
  }
}
```

### HTML RENDER
```bash
git clone https://github.com/aws-samples/aws-mcp-servers-samples.git
cd aws-mcp-servers-samples/html_render_service/web
docker-compose up -d
curl http://127.0.0.1:5006/
```
```json
{
    "mcpServers": { 
        "html_render_service": { 
            "command": "uv", 
            "args": [
                "--directory","/home/ubuntu/aws-mcp-servers-samples/html_render_service/src",
                "run", "server.py"
                ]
		}
    }
}
```

### S3-Upload
```bash
cd aws-mcp-servers-samples/s3_upload_server
uv sync
```
```json
{
"mcpServers": {
    "s3-upload": {
        "command": "uv",
        "args": [
        "--directory", "/home/ubuntu/aws-mcp-servers-samples/s3_upload_server",
        "run", "src/server.py"
        ],
        "env": {
            "AWS_REGION":"us-west-2",
            "AWS_ACCESS_KEY_ID":"AWS_ACCESS_KEY_ID",
            "AWS_SECRET_ACCESS_KEY":"AWS_SECRET_ACCESS_KEY",
            "EXPIRE_HOURS":"168"
            }
        }   
    }
}
```

### OpenSearch向量知识库 Retrieve (可选)

1. Demo方案提供的MCP Server, 参考 [sample mcp servers guidance](https://github.com/aws-samples/aws-mcp-servers-samples) 进行安装。 
2. 目前有一个 issue [aos_serverless_mcp_setup.sh failed with Cannot find module '../lib/aos-public-setup-stack'](https://github.com/aws-samples/aws-mcp-servers-samples/issues/97)。  

```bash
cd aws-mcp-servers-samples/aos-mcp-serverless
bash aos_serverless_mcp_setup.sh --McpAuthToken xxxx --OpenSearchUsername xxxx --OpenSearchPassword xxxx --EmbeddingApiToken xxxx

# Testing
export API_ENDPOINT=https://xxxxx/Prod/mcp
export AUTH_TOKEN=xxxx
    
python strands_agent_test/similarity_search_demo.py
```

3. 注意关于参数 - EmbeddingApiToken
```
嵌入 API 令牌（需要从嵌入服务提供商获取），如果不用 中国区域 Silicon Flow BGE-M3 Embedding API，用 Bedrock 自带的 Embedding model，那么这里是不是填写Bedrock API keys就可以？代码会采用哪个Bedrock 上的Embedding model模型呢？
```

### MiniMax-AI draw picture

[参考的MiniMax Image Generation and Minimax MCP 文档](https://www.minimax.io/platform/document/wUkQTKNUuC8mJttAvXqCxG3D?key=67b7148bb74bdd7459f7b6ad#TefbP0tsj45CmK3zNUEdMAx5)

**注意： Warning**: The API key needs to match the host. If an error "API Error: invalid api key" occurs, please check your api host: Global Host：https://api.minimax.io； Mainland Host：https://api.minimaxi.com

```json
{
  "mcpServers": {
    "MiniMax": {
      "command": "uvx",
      "args": [
        "minimax-mcp",
        "-y"
      ],
      "env": {
        "MINIMAX_API_KEY":"更改成实际账号key",
        "MINIMAX_MCP_BASE_PATH": "/home/ubuntu/sample_agentic_ai_strands/tmp",
        "MINIMAX_API_HOST": "https://api.minimax.io",
        "MINIMAX_API_RESOURCE_MODE": "url"
      }
    }
  }
}
```

### Amazon Nova Canvas

[Seamless AI Image Generation with Nova Canvas & MCP](https://community.aws/content/2w2d61S13rTkNsIBaXB6aBfsDRo/seamless-ai-image-generation-with-nova-canvas-mcp?lang=en)

```json
{
  "mcpServers": {
    "awslabs.nova-canvas-mcp-server": {
      "command": "uvx",
      "args": ["awslabs.nova-canvas-mcp-server@latest"],
      "env": {
        "AWS_PROFILE": "bedrock_demo",
        "AWS_REGION": "us-east-1",
        "FASTMCP_LOG_LEVEL": "ERROR"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

测试：

  ```json
  我需要画一幅关于厄尔尼诺的图片,这里是提示词: "Educational diagram showing El Niño formation mechanism in the Pacific Ocean, with labeled arrows showing wind patterns, ocean currents, and temperature changes. Show normal conditions on top and El Niño conditions on bottom. Include thermocline changes, warm water pool movement, and atmospheric circulation. Scientific style with clear labels in English language. Make sure the text is clear and readable".
  ```

### Amazon Location Services MCP
- [aws-location-mcp-server](https://github.com/awslabs/mcp/tree/main/src/aws-location-mcp-server)
  ```json
  {
    "mcpServers": {
      "awslabs.aws-location-mcp-server": {
          "command": "uvx",
          "args": ["awslabs.aws-location-mcp-server@latest"],
          "env": {
            "AWS_PROFILE": "your-aws-profile",
            "AWS_REGION": "us-east-1",
            "FASTMCP_LOG_LEVEL": "ERROR"
          },
          "disabled": false,
          "autoApprove": []
      }
    }
  }   
  ```
- Testing: 
```bash
# 欧美地区回答率和正确率较高
Find me the location of the largest zoo in Seattle.
Find the largest shopping mall in New York City.
# 中国地区回答率较差
Find the top view restaurant in Shanghai.
```

### 高德 MCP

- 申请高德开放平台 API Key，以及[参考文档进行 MCP Server 配置](https://lbs.amap.com/api/mcp-server/summary)
- mcp 配置
```bash
npx -y @amap/amap-maps-mcp-server
```
```json
{
    "mcpServers": {
        "amap-maps": {
            "command": "npx",
            "args": [
                "-y",
                "@amap/amap-maps-mcp-server"
            ],
            "env": {
                "AMAP_MAPS_API_KEY": ""
            }
        }
    }
}

{
    "mcpServers": {
        "amap-maps": {
            "command": "uvx",
            "args": [
                "amap-mcp"
            ],
            "env": {
                "AMAP_KEY": ""
            }
        }
    }
}
```
- 测试
```bash
你是一名旅游行程规划助手，我五一计划去昆明游玩4天的旅行攻略。
帮我制作旅行攻略，考虑出行时间和路线，以及天气状况路线规划。需要覆盖昆明著名旅游景点，包括城市打卡点和风景名胜。
制作网页地图自定义绘制旅游路线和位置。
网页使用简约美观页面风格，景区图片以卡片展示。
同一天行程景区之间我想打车前往。
行程规划结果生成文件名 kmTravel.html。
```

### 修改 MCP Server 配置

修改 MCP Server 的配置，比如之前的 API Key 填错了之类的。当前 MCP 配置没有保存在 mcp.json 中，而是在 DynamoDB mcp_user_config_table ，因此需要直接修改 mcp_user_config_table table 对应user id 对应的 items

## 清理本地开发环境
```bash
# HTML RENDER MCP
cd aws-mcp-servers-samples/html_render_service/web
docker-compose down

# AOS MCP
cd aws-mcp-servers-samples/aos-mcp-serverless
bash cleanup_aos_mcp.sh

# Frontend
cd sample_agentic_ai_strands/react_ui
docker-compose down

# Backend
cd sample_agentic_ai_strands/
bash stop_all.sh

# Delete DynamoDB table mcp_user_config_table
aws dynamodb delete-table --table-name mcp_user_config_table
```