from strands import Agent, tool
from strands_tools import calculator, current_time, python_repl, shell
from strands.models import BedrockModel
from strands_tools import mem0_memory, use_llm
import asyncio
import logging
import boto3
import pprint

import base64
import os
from strands.telemetry import StrandsTelemetry

public_key = os.environ.get("LANGFUSE_PUBLIC_KEY")
secret_key = os.environ.get("LANGFUSE_SECRET_KEY")
langfuse_endpoint =  os.environ.get("LANGFUSE_HOST")
# Set up endpoint
if public_key and secret_key and langfuse_endpoint:
    otel_endpoint = langfuse_endpoint + "/api/public/otel"
    auth_token = base64.b64encode(f"{public_key}:{secret_key}".encode()).decode()
    os.environ["OTEL_EXPORTER_OTLP_ENDPOINT"] = otel_endpoint
    os.environ["OTEL_EXPORTER_OTLP_HEADERS"] = f"Authorization=Basic {auth_token}"
    strands_telemetry = StrandsTelemetry()
    strands_telemetry.setup_otlp_exporter()      # Send traces to OTLP endpoint
    
    
# Define a custom tool as a Python function using the @tool decorator
@tool
def letter_counter(word: str, letter: str) -> int:
    """
    Count occurrences of a specific letter in a word.

    Args:
        word (str): The input word to search in
        letter (str): The specific letter to count

    Returns:
        int: The number of occurrences of the letter in the word
    """
    if not isinstance(word, str) or not isinstance(letter, str):
        return 0

    if len(letter) != 1:
        raise ValueError("The 'letter' parameter must be a single character")

    return word.lower().count(letter.lower())

logger = logging.getLogger("my_agent")

# Define a simple callback handler that logs instead of printing
tool_use_ids = []
def callback_handler(**kwargs):
    if "data" in kwargs:
        # Log the streamed data chunks
        logger.info(kwargs["data"], end="")
    elif "current_tool_use" in kwargs:
        tool = kwargs["current_tool_use"]
        if tool["toolUseId"] not in tool_use_ids:
            # Log the tool use
            logger.info(f"\n[Using tool: {tool.get('name')}]")
            tool_use_ids.append(tool["toolUseId"])

# Create an agent with tools from the strands-tools example tools package
# as well as our custom letter_counter tool
# Create a BedrockModel
session = boto3.Session(profile_name="global_ruiliang", region_name='us-west-2')
bedrock_model = BedrockModel(
    model_id="us.anthropic.claude-3-7-sonnet-20250219-v1:0",
    boto_session=session,
    temperature=0.3,
)

# Create an agent with the callback handler
# agent = Agent(model=bedrock_model, 
#               tools=[calculator, current_time, python_repl, letter_counter, shell],
#               callback_handler=callback_handler)

# Create an agent without the callback handler
# agent = Agent(model=bedrock_model, 
#               tools=[calculator, current_time, python_repl, letter_counter, shell],
#               callback_handler=None  # Disable default callback handler
#               )

agent = Agent(model=bedrock_model, 
              tools=[calculator, current_time, python_repl, letter_counter, shell, mem0_memory],
              callback_handler=None  # Disable default callback handler
              )

print(agent.model.config)

# Async function that iterates over streamed agent events
async def process_streaming_response(query):
    # Get an async iterator for the agent's response stream
    agent_stream = agent.stream_async(query)

    # Process events as they arrive
    async for event in agent_stream:
        if "data" in event:
            # Print text chunks as they're generated
            print(event["data"], end="", flush=True)
        elif "current_tool_use" in event and event["current_tool_use"].get("name"):
            # Print tool usage information
            print(f"\n[Tool use delta for: {event['current_tool_use']['name']}]")


# Create a memory-enabled Strands agent
# Please run `pip install mem0ai` to use the mem0_memory tool
# Create an agent with Memory， This mem0_memory tool is for short-term memory

MEMORY_SYSTEM_PROMPT = "You are a helpful assistant that remembers user preferences."

# MEMORY_SYSTEM_PROMPT = f"""You are a personal assistant that maintains context by remembering user previous interaction.
# Capabilities:
# - Store new information using mem0_memory tool (action="store")
# - Retrieve relevant memories (action="retrieve")
# - List all memories (action="list")
# - Remove existing memories using memory IDs (action="delete")
# - Retrieve specific memories by memory ID (action="get")
# - Provide personalized responses

# Key Rules:
# - Always include user_id in tool calls
# - Be conversational and natural in responses
# - Format output clearly
# - Acknowledge stored information
# - Only share relevant information
# - Politely indicate when information is unavailable
# """

memory_agent = Agent(
    model=bedrock_model,
    system_prompt=MEMORY_SYSTEM_PROMPT,
    tools=[mem0_memory, current_time, use_llm],
    callback_handler=None  # Disable default callback handler
)

# Monitoring the agent usage
def monitoring_demo(message):
    simple_agent = Agent(
        model=bedrock_model,
        tools=[calculator, current_time, python_repl, letter_counter, shell],
        system_prompt="You are a helpful assistant that provides clear and informative responses.",
        callback_handler=None
    )

    result = simple_agent(message)
    pprint.pprint(result.metrics.get_summary())
    pprint.pprint(result.metrics.accumulated_usage)

if __name__ == "__main__":
    # Ask the agent a question that uses the available tools
    # Define user identity
    USER_ID = "mem0_user"

    message = """
    I have 6 requests:

    1. What is the time right now?
    2. Calculate 3111696 / 74088
    3. What is the square root of 1764?
    4. Tell me how many letter R's are in the word "strawberry" 🍓
    5. What operating system am I using?
    6. Output a script that does what we just spoke about!
    Use your python tools to confirm that the script works before outputting it
    """

    # Print all response
    # agent(message)
    # print("\n" + "-"*80 + "\n")

    # Print only the last response
    # result = agent(message)
    # print(result.message)
    # print("\n" + "-"*80 + "\n")

    # Stream the response
    # asyncio.run(process_streaming_response(message))
    # print("\n" + "-"*80 + "\n")
    
    # check if response from memory tool
    # asyncio.run(process_streaming_response("What is the time right now? \
    #                                     Then Tell me how many letter R's are in the word 'strawberry'? \
    #                                     Finally, What operating system am I using?"))
    
    # Test the memory-enabled agent, you need first run `aws sts get-session-token --duration-seconds 86400 --profile global_ruiliang`
    # export AWS_ACCESS_KEY_ID=...
    # export AWS_SECRET_ACCESS_KEY=...
    # export AWS_SESSION_TOKEN=...

    # Store a fact
    # memory_agent("I live in San Francisco.", user_id=USER_ID)
    # print("\n" + "-"*80 + "\n")

    # Ask a follow-up that uses memory
    # memory_agent("What's the weather like today?", user_id=USER_ID)
    # print("\n" + "-"*80 + "\n")

    # Ask another contextual question
    # memory_agent("What about tomorrow?", user_id=USER_ID)
    # print("\n" + "-"*80 + "\n")

    # Check what the agent remembers
    # memory_agent("What do you remember about me?", user_id=USER_ID)
    # print("\n" + "-"*80 + "\n")
    
    ## sample output
# ╭────────────────── Memory for user current_user ──────────────────╮
# │ User lives in San Francisco.                                     │
# ╰──────────────────────────────────────────────────────────────────╯
# ╭───────────────────────── Memory Stored ──────────────────────────╮
# │                          Memory Stored                           │
# │ ┏━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
# │ ┃ Operat… ┃ Content                                            ┃ │
# │ ┡━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┩ │
# │ │ ADD     │ Lives in San Francisco                             │ │
# │ └─────────┴────────────────────────────────────────────────────┘ │
# ╰──────────────────────────────────────────────────────────────────╯
# ╭────────────────────────────────────────────────────────── Memories List ───────────────────────────────────────────────────────────╮
# │                                                              Memories                                                              │
# │ ┏━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━┓ │
# │ ┃ ID                ┃ Memory                                             ┃ Created At         ┃ User ID      ┃ Metadata          ┃ │
# │ ┡━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━┩ │
# │ │ c901c88e-2da5-48… │ Lives in San Francisco                             │ 2025-07-09T22:47:… │ current_user │ {                 │ │
# │ │                   │                                                    │                    │              │   "location":     │ │
# │ │                   │                                                    │                    │              │ "San Francisco",  │ │
# │ │                   │                                                    │                    │              │   "type":         │ │
# │ │                   │                                                    │                    │              │ "user_location"   │ │
# │ │                   │                                                    │                    │              │ }                 │ │
# │ └───────────────────┴────────────────────────────────────────────────────┴────────────────────┴──────────────┴───────────────────┘ │
# ╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
# ╭────────────────────────────────────────────────────────── Search Results ──────────────────────────────────────────────────────────╮
# │                                                           Search Results                                                           │
# │ ┏━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━┓ │
# │ ┃ ID           ┃ Memory                                             ┃ Relevance    ┃ Created At   ┃ User ID      ┃ Metadata      ┃ │
# │ ┡━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━┩ │
# │ │ c901c88e-2d… │ Lives in San Francisco                             │ 1.822979569… │ 2025-07-09T… │ current_user │ {             │ │
# │ │              │                                                    │              │              │              │   "location": │ │
# │ │              │                                                    │              │              │              │ "San          │ │
# │ │              │                                                    │              │              │              │ Francisco",   │ │
# │ │              │                                                    │              │              │              │   "type":     │ │
# │ │              │                                                    │              │              │              │ "user_locati… │ │
# │ │              │                                                    │              │              │              │ }             │ │
# │ └──────────────┴────────────────────────────────────────────────────┴──────────────┴──────────────┴──────────────┴───────────────┘ │
# ╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯

    monitoring_demo(message)
    print("\n" + "-"*80 + "\n")