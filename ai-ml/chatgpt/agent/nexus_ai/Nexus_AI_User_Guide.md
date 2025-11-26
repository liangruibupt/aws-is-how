# Nexus AI 使用指南

本文档介绍如何使用 Nexus AI 创建和使用 Agent，以及如何使用 html2pptx Agent 进行 HTML 到 PPTX 的转换。

## 目录

- [概述](#概述)
- [创建 Agent](#创建-agent)
- [使用生成的 Agent](#使用生成的-agent)
- [html2pptx Agent 使用示例](#html2pptx-agent-使用示例)
- [常见问题](#常见问题)

## 概述

Nexus AI 是一个基于自然语言的 Agent 构建平台，允许您通过简单的需求描述快速创建功能完整的 AI Agent。系统会自动完成需求分析、架构设计、代码开发等全流程工作。

## 创建 Agent

### 基本用法

使用 `agent_build_workflow.py` 脚本来创建新的 Agent。只需提供自然语言的需求描述，系统就会自动构建完整的 Agent。

#### 命令格式

```bash
python -u agents/system_agents/agent_build_workflow/agent_build_workflow.py -i "您的需求描述" | tee logs/temp.log
```

#### 示例 1: 创建 Excel 查询分析 Agent

```bash
python -u agents/system_agents/agent_build_workflow/agent_build_workflow.py -i "请创建一个agent能够读取excel表中的信息进行查询和分析，最终输出excel表格，基本要求如下
- 表格字段包含'Company-Name-ENG','Company-Name-CHN'两个字段
- 你需要能够通过搜索引擎逐一查询每个公司的公开信息，要求添加营业额、公司简介、相关链接以及其他必要信息到输出表格中
- 需要进行深度检索，尽最大努力查询到最全的信息进行汇总后进行输出
- 需要集成serpapi、http_request等不同搜索方法，按顺序或按用户指定的引擎进行调用，如遇报错或无信息，可使用其他搜索引擎
- 集成serpapi时应同时支持Google Search、Bing、Baidu Search、DuckDuckGo等不同搜索引擎，忽略搜索结果中的pdf、图片等内容，关注文字信息
- 搜索结果中如信息不全，可深度检索返回的链接的html内容获取
- 需要有缓存机制，每次执行时可指定任务id检查处理进度，让Agent按顺序处理其他公司信息
- 输出时先输出csv，完成所有查询后，调用工具合并成完整excel，避免加载大量数据到agent记忆中
- 结果信息应以最新的消息为准

**重要信息**
- 如使用商业搜索引擎，请提供参数输入API Key
- 给定的excel表中的公司信息可能非常多，可以分批输出或缓存，请保证最后都能够处理完成，避免token限制等问题
- 注意区分公司是全球的还是中国的" | tee logs/temp.log
```

#### 示例 2: 创建 html2pptx Agent

```bash
python -u agents/system_agents/agent_build_workflow/agent_build_workflow.py -i "请创建一个能够将HTML文档转换为pptx文档的Agent, 基本功能要求如下:
- 能够基于语义提取和识别关键和非关键信息，并思考PPT内容和故事主线
- PPT中出现的文字、段落内容应与HTML中内容一致
- 能够支持任意标签结构层级的HTML文档，能根据HTML标签结构定义PPT的结构
- 能够支持任意HTML标签的样式，能根据HTML标签样式定义PPT的样式
- PPT内容风格、模版样式应尽可能保持HTML原样式
- 对于HTML中图片内容，能尽可能保留，并以合理的布局展示在PPT中
- 能够使用用户指定的PPT模版
- 必要的文字内容和备注信息应尽可能保留，并存储在指定PPT页的备注中

**注意事项**
- 为避免Token超出限制,请避免使用base64编码方式进行输出
- PPT内容可分页输出
- 当通过模型解析到必要数据后,可缓存在本地.cache目录中,后续工具执行可通过传递缓存文件路径进行处理，避免token过长问题" | tee logs/temp.log
```

### 需求描述建议

在编写需求描述时，建议包含以下内容：

1. **核心功能描述**：明确说明 Agent 要实现的主要功能
2. **详细需求**：使用列表形式列出具体功能要求
3. **技术约束**：说明技术限制或注意事项（如 Token 限制、缓存机制等）
4. **重要信息**：标注需要特别注意的配置或参数（如 API Key、文件路径等）

### 构建流程

执行创建命令后，系统会自动执行以下流程：

1. **意图识别**：分析用户输入，识别创建 Agent 的意图
2. **需求分析**：深入理解和分析需求，明确功能点
3. **系统架构设计**：设计 Agent 的整体架构和技术方案
4. **Agent 设计**：设计 Agent 的具体实现细节
5. **代码开发**：自动生成 Agent 代码、工具和配置文件
6. **部署准备**：准备 Agent 运行所需的所有资源

构建完成后，生成的 Agent 将保存在 `agents/generated_agents/{agent_name}/` 目录下。

## 使用生成的 Agent

### Agent 文件位置

生成的 Agent 通常位于：
```
agents/generated_agents/{agent_name}/{agent_name}_agent.py
```

### 调用方式

大多数生成的 Agent 都支持命令行调用，基本格式为：

```bash
python agents/generated_agents/{agent_name}/{agent_name}_agent.py [命令] [参数]
```

不同 Agent 的命令和参数可能不同，请查看对应 Agent 的帮助信息：

```bash
python agents/generated_agents/{agent_name}/{agent_name}_agent.py --help
```

## html2pptx Agent 使用示例

html2pptx Agent 可以将 HTML 文档转换为 PPTX 格式的演示文稿。

### 基本用法

```bash
python agents/generated_agents/html2pptx/html2pptx_agent.py convert -i <HTML文件路径> -o <输出PPTX路径> [-t <PPT模板路径>]
```

### 参数说明

- `-i, --input`: 输入的 HTML 文件路径（必需）
- `-o, --output`: 输出的 PPTX 文件路径（必需）
- `-t, --template`: PPT 模板文件路径（可选）

### 使用示例

#### 示例 1: 基本转换

将 HTML 文件转换为 PPTX，不使用模板：

```bash
python agents/generated_agents/html2pptx/html2pptx_agent.py convert \
  -i "tests/html2ppt/new-1/Agentic AI基础设施实践经验系列（一）：Agent应用开发与落地实践思考 _ 亚马逊AWS官方博客.html" \
  -o "tests/html2ppt/new-1/Agentic AI基础设施实践经验系列(一).pptx"
```

#### 示例 2: 使用自定义模板

使用指定的 PPT 模板进行转换：

```bash
python agents/generated_agents/html2pptx/html2pptx_agent.py convert \
  -i "tests/html2ppt/new-1/Agentic AI基础设施实践经验系列（一）：Agent应用开发与落地实践思考 _ 亚马逊AWS官方博客.html" \
  -o "tests/html2ppt/new-1/Agentic AI基础设施实践经验系列(一).pptx" \
  -t tests/html2ppt/demo.pptx
```

### html2pptx Agent 特性

- **语义分析**：能够识别关键和非关键信息，智能构建 PPT 故事主线
- **样式保留**：尽可能保持 HTML 的原始样式和布局
- **图片支持**：保留 HTML 中的图片，并合理布局在 PPT 中
- **模板支持**：支持使用自定义 PPT 模板
- **备注保留**：将重要信息存储在 PPT 页面备注中
- **缓存机制**：使用本地缓存避免 Token 限制问题

### 转换说明

- Agent 会分析 HTML 的结构和语义，自动生成合适的 PPT 页面结构
- 支持任意复杂度的 HTML 文档，包括嵌套的标签结构
- 转换过程会自动优化布局，确保内容清晰可读
- 如果 HTML 内容过长，Agent 会自动分页处理

## 常见问题

### 1. Agent 构建失败怎么办？

- 检查需求描述是否清晰完整
- 查看日志文件 `logs/temp.log` 了解详细错误信息
- 确认 AWS 凭证配置正确
- 检查是否有足够的磁盘空间和权限

### 2. 如何查看已创建的 Agent？

所有生成的 Agent 都在 `agents/generated_agents/` 目录下，每个 Agent 都有自己的子目录。

### 3. 如何修改已创建的 Agent？

您可以通过以下方式修改 Agent：

- 直接编辑 Agent 代码文件
- 重新运行构建流程，提供改进的需求描述
- 使用 Agent 更新工作流（如果已实现）

### 4. html2pptx 转换质量不理想？

- 检查 HTML 文件是否完整，样式是否正常
- 尝试使用自定义模板改善视觉效果
- 确保 HTML 文件路径正确且可访问
- 查看转换日志了解具体问题

### 5. 如何使用其他 Agent？

每个 Agent 的使用方法可能不同，建议：

1. 查看 Agent 目录下的代码文件，了解支持的参数
2. 使用 `--help` 参数查看帮助信息
3. 查看项目的 README.md 或其他文档

## 更多资源

- 项目主文档：`README.md`
- 项目结构说明：查看项目目录结构
- API 文档：`api调用.md`（如果存在）

---

**提示**：如果您在使用过程中遇到问题，请查看日志文件或联系技术支持。

## 生成Agent
```
ssh -i your-key.pem -L 16686:localhost:16686 -L 7474:localhost:7474 -L 7687:localhost:7687 ec2-user@your-ec2-ip
```

```
nohup python -u agents/system_agents/agent_build_workflow/agent_build_workflow.py -i "创建一个AWS GPU 分析助手，建议名称为GPU_advisor_agent，能够提供GPU 选型，区域和价格建议，基本要求如下：
1、  能够基于客户给出的 Nvidia 的 GPU 型号和卡数（例如 1,2,4,8）找到对应的最合适的 AWS EC2 实例类型和大小。
2、  给出对应的 EC2 实例类型可选的 AWS Region 列表
3、  利用现有的aws_pricing_agent 获取对应EC2 实例在对应区域的 On demand, Spot, Saving Plan, Capacity Block(如果有)，SageMaker Hyperpod(如果有), SageMaker Hyperpod Flexible Training Plans(如果有)

**重要**
- agent所有计算结果必须基于工具或者代码计算得到，不能猜测
- agent对于分析报表等数据应缓存在本地

已完成部分项目Agent名称是GPU_advisor_agent" &
tail -f nohup.out
```

## 由于quota导致生成agent失败

1. 常见错误
``` bash
botocore.exceptions.EventStreamError: An error occurred (serviceUnavailableException) when calling the ConverseStream operation: Bedrock is unable to process your request.
└ Bedrock region: us-west-2
└ Model id: global.anthropic.claude-haiku-4-5-20251001-v1:0
```

2. 重新执行：已经重试过后的了，重新跑的话有两个办法，一个是原先的提示词里加一下“已完成部分项目Agent名称是<xxx>”，他会检查从断点继续，不过偶尔会出点小问题，二是删掉agents/tools/prompts/projects里对应目录重新跑，或者提示词里强制指定个名字 例如 
```
rm -rf projects/news_retrieval_agent
rm -rf agents/generated_agents/news_retrieval_agent
rm -rf tools/generated_tools/news_retrieval_agent
rm -rf prompts/generated_agents_prompts/news_retrieval_agent
```

3. 修改配置，构建 agent build workflow 不同 agent 采用不同模型
修改 `prompts/system_agents_prompts/agent_build_workflow` 里面每一个 agent 里面 `supported_models`
```yaml
supported_models:
          - "global.anthropic.claude-sonnet-4-5-20250929-v1:0"
          - "global.anthropic.claude-haiku-4-5-20251001-v1:0"
          - "global.anthropic.claude-sonnet-4-20250514-v1:0"
          - "qwen.qwen3-coder-30b-a3b-v1:0"

```

## 如何修改默认的 Agent 使用的模型

要修改prompts/generated_agents_prompts/<agent name>/<agent name>.yaml中的模版，里面有版本控制，默认用的latest版本，顺序加载到一个model，如果为空默认才会用 project_config.json 的

## 如何修改 create agent 时候使用的模型和 region

修改 config/default_config.yaml 中的 `bedrock_region_name` and `aws_region_name`

## 如何create agent的时候，每一个