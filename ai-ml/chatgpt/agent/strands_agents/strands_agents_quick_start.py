from strands import Agent, tool
from strands_tools import calculator, file_write, file_read, http_request, python_repl
from strands.models import BedrockModel
from strands.tools.mcp import MCPClient
from mcp import stdio_client, StdioServerParameters
import boto3
import os

session = boto3.Session(profile_name="global_ruiliang", region_name='us-east-1')
# Multiple Model Providers
# Bedrock
bedrock_model = BedrockModel(
    model_id="us.amazon.nova-lite-v1:0",
    params={"max_tokens": 16000, "temperature": 0.7, "top_p":0.8}
)

def customerized_different_agent():
    # A technical expert agent
    tech_expert = Agent(
        model=bedrock_model,
        system_prompt="""You are a senior software engineer with deep expertise in computer science.
        You provide detailed, technically accurate explanations using precise terminology.
        When appropriate, you include code examples to illustrate concepts.
        You focus on best practices and modern approaches to software development."""
    )

    # An educational agent for beginners
    beginner_tutor = Agent(
        model=bedrock_model,
        system_prompt="""You are a patient and encouraging tutor for beginners.
        You explain complex topics using simple language and relatable analogies.
        You break down information into manageable chunks and avoid technical jargon.
        You focus on building confidence and understanding foundational concepts."""
    )

    # A creative storyteller agent
    storyteller = Agent(
        model=bedrock_model,
        system_prompt="""You are a creative storyteller with a vivid imagination.
        You transform ordinary topics into engaging narratives with colorful characters.
        You use descriptive language, metaphors, and narrative structures to make information memorable.
        You maintain a sense of wonder and curiosity in your responses."""
    )

    question = "How does the internet work?"

    # Get responses from each agent
    # Print the responses
    print("Technical Expert's Response:\n")
    tech_response = tech_expert(question)

    print("\n" + "-"*80 + "\n")

    print("Beginner Tutor's Response:\n")
    beginner_response = beginner_tutor(question)

    print("\n" + "-"*80 + "\n")

    print("Storyteller's Response:\n")
    story_response = storyteller(question)

# MCP
def mcp_agent():
    # Create an MCP client for AWS documentation
    aws_docs_client = MCPClient(
        lambda: stdio_client(StdioServerParameters(command="uvx", args=["awslabs.aws-documentation-mcp-server@latest"]))
    )

    with aws_docs_client:
        agent = Agent(model=bedrock_model, tools=aws_docs_client.list_tools_sync())
        response = agent("Tell me about Amazon Bedrock and just give me one example about how to use it with Python")

# Python-Based Tools
@tool
def word_count(text: str) -> int:
    """Count words in text.
    This docstring is used by the LLM to understand the tool's purpose.
    """
    return len(text.split())

def python_tool_agent():
    agent = Agent(model=bedrock_model, tools=[calculator, word_count],
                  system_prompt="""You are a helpful assistant that can perform calculations and check the current time.
                  Use the calculator tool for mathematical operations.
                  Use the word_count tool to Count words in text."""
    )
    response = agent("What is 1234 * 5678 and How many words are in this sentence?")


# Multi-turn Conversations
def conversation_agent():
    # Create an agent for conversation
    conversation_agent = Agent(
        model=bedrock_model,
        system_prompt="""You are a helpful assistant that remembers previous parts of the conversation.
        You respond appropriately to follow-up questions and references to earlier topics.
        You are concise but informative."""
    )
    
    # Start a conversation
    print("\nFirst turn:")
    response1 = conversation_agent("Tell me about three famous machine learning algorithms.")

    print("\n" + "-"*80 + "\n")
    print("Second turn (follow-up):")
    response2 = conversation_agent("Which of these is best for image classification?")

    print("\n" + "-"*80 + "\n")
    print("Third turn (follow-up):")
    response3 = conversation_agent("Can you provide an example use case for the first algorithm you mentioned?")

# File handling tools
def file_handling_agent():
    # Create an agent for file handling
    file_agent = Agent(
        model=bedrock_model,
        tools=[file_write, file_read, calculator],
        system_prompt="""You are a helpful assistant that can read and write files.
        You can summarize the contents of a file and answer questions about it."""
    )
    
    # Example usage
    # Ask the agent to create a file with a sales report
    response = file_agent("""
    Based on this data:
    - Product X: 120 units at $25 each
    - Product Y: 85 units at $42 each
    - Product Z: 200 units at $15 each

    Create a file named 'sales_report.md' in current folder, with a professional sales report that includes:
    1. A title and introduction
    2. A breakdown of each product's sales
    3. Total revenue
    4. Average price per unit
    5. Best-performing product
    """)
    
    response = file_agent("""
    Please read the file 'sales_report.md', answer these questions:
    1. What products are mentioned in the file?
    2. What was the total revenue from all products?
    3. What was the best saling product?
    """)
    
# Web and HTTP tools
def web_agent():
    # Create an agent for web scraping
    web_agent = Agent(
        model=bedrock_model,
        tools=[http_request, python_repl, calculator],
        system_prompt="""You are an network and information assistant that can make HTTP requests to gather information."""
    )
   
    response = web_agent("""
        1. Make a GET request to https://noc.org and show me the response
        2. Testing the Time taken for DNS resolution, Time until the first byte is received (TTFB) and Total time for the request when I access the https://noc.org, make 5 times call and calculate the average.
        3. Test the Total size of the downloaded content when I open https://noc.org
        4. Use Python to create a nicely formatted table of above performance measure information
        """)

# Self-owned MCP Server
def sample_weather_mcp_agent():
    # Get the absolute path of the current file
    current_file_path = os.path.abspath(__file__)
    # Get the abs directory of the current file
    current_directory = os.path.dirname(current_file_path)
    # Connect to an MCP server using stdio transport
    weather_mcp_filepath = os.path.join(current_directory, 'weather_mcp.py')
    print(f"current weather_mcp.py: {weather_mcp_filepath}")
    
    stdio_mcp_client = MCPClient(lambda: stdio_client(
        StdioServerParameters(command="python", args=[weather_mcp_filepath])
    ))

    # Create an agent with MCP tools
    with stdio_mcp_client:
        # Get the tools from the MCP server
        mcp_tools = stdio_mcp_client.list_tools_sync()
        
        # Create an agent with these tools
        weather_mcp_agent = Agent(
            model=bedrock_model,
            tools=mcp_tools
        )

        weather_mcp_agent("What’s the weather in  San Francisco City?")
        weather_mcp_agent("What are the Today weather alerts in Texas?")
        
# # liteLLM
# model = LiteLLMModel(
#     # **model_config
#     client_args={
#         "api_key": "<KEY>",  "base_url":"https://api.siliconflow.cn/"
#     },
#     model_id="openai/Qwen/Qwen3-235B-A22B",
#     params={"max_tokens": 16000, "temperature": 0.7}
# )

if __name__ == "__main__":
    # agent = Agent(model=bedrock_model)
    # response = agent("Tell me about Agentic AI")
    
    # print("\n" + "-"*80 + "\n")
    # conversation_agent()
    
    # print("\n" + "-"*80 + "\n")
    # python_tool_agent()
    
    # print("\n" + "-"*80 + "\n")
    # file_handling_agent()
    
    # print("\n" + "-"*80 + "\n")
    # web_agent()
    
    # print("\n" + "-"*80 + "\n")
    # mcp_agent()
    
    print("\n" + "-"*80 + "\n")
    sample_weather_mcp_agent()