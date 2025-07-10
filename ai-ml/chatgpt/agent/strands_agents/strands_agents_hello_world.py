from strands import Agent, tool
from strands_tools import calculator, current_time, python_repl, shell
from strands.models import BedrockModel
import asyncio
import logging
import boto3

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

agent = Agent(model=bedrock_model, 
              tools=[calculator, current_time, python_repl, letter_counter, shell],
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

# Ask the agent a question that uses the available tools
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
#agent(message)

# Print only the last response
# result = agent(message)
# print(result.message)

# Stream the response
asyncio.run(process_streaming_response(message))
