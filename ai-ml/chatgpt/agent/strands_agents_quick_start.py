from strands import Agent, tool
from strands_tools import calculator
from strands.models import BedrockModel
from strands.models.litellm import LiteLLMModel

from strands.tools.mcp import MCPClient
from mcp import stdio_client, StdioServerParameters

# Quick Start, tools
agent = Agent(tools=[calculator])
agent("What is the square root of 1764")

# Python-Based Tools
@tool
def word_count(text: str) -> int:
    """Count words in text.

    This docstring is used by the LLM to understand the tool's purpose.
    """
    return len(text.split())

agent = Agent(tools=[word_count])
response = agent("How many words are in this sentence?")

# MCP
aws_docs_client = MCPClient(
    lambda: stdio_client(StdioServerParameters(command="uvx", args=["awslabs.aws-documentation-mcp-server@latest"]))
)

with aws_docs_client:
   agent = Agent(tools=aws_docs_client.list_tools_sync())
   response = agent("Tell me about Amazon Bedrock and how to use it with Python")

# Multiple Model Providers
# Bedrock
bedrock_model = BedrockModel(
    model_id="us.anthropic.claude-3-7-sonnet-20250219-v1:0",
    temperature=0.3, max_tokens=32000, top_p=0.8
)
agent = Agent(model=bedrock_model)
response = agent("Tell me about Agentic AI")

# liteLLM
model = LiteLLMModel(
    # **model_config
    client_args={
        "api_key": "<KEY>",
        "base_url":"https://api.siliconflow.cn/"
    },
    model_id="openai/Qwen/Qwen3-235B-A22B",
    params={
        "max_tokens": 16000,
        "temperature": 0.7,
    }
)

agent = Agent(model=model, tools=[calculator])
response = agent("What is the square root of 1764")


