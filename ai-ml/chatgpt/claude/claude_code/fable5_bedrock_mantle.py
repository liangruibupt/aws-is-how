"""
Claude Fable 5 on the Amazon Bedrock `bedrock-mantle` endpoint via the
native Anthropic Messages API.

This is the OpenAI/Anthropic-style endpoint that serves the first-party
Messages API shape at:
    https://bedrock-mantle.{region}.api.aws/anthropic/v1/messages

Model ID (bedrock-mantle): anthropic.claude-fable-5   (no "global."/"us." prefix)

Client: AnthropicBedrockMantle  (SigV4-signed; resolves AWS creds + region from
the standard chain — constructor args, then env, then ~/.aws config/SSO/role/IMDS).

Fable 5 facts that shape these requests (from the AWS model card):
  - Adaptive thinking is ALWAYS ON; effort is configurable (low|medium|high|max).
  - Sampling: temperature must be 1.0 or unset; top_p in [0.99, 1.0) or unset;
    top_k unsupported. We omit all sampling params.
  - Max output 128K; 1M context window.

Usage:
  python fable5_bedrock_mantle.py            # basic (non-streaming) demo
  python fable5_bedrock_mantle.py basic      # same as above
  python fable5_bedrock_mantle.py stream     # streaming demo
  python fable5_bedrock_mantle.py tools      # tool-use loop demo
  python fable5_bedrock_mantle.py "your question here"   # basic demo, your prompt

Prereqs:
  pip install -U "anthropic[bedrock]"
  Data sharing opt-in (provider_data_share) must already be set on the account,
  and the IAM principal needs bedrock-mantle:CreateInference on the model ARN.
"""

import argparse
import json

from anthropic import AnthropicBedrockMantle

REGION = "us-east-1"
MODEL_ID = "anthropic.claude-fable-5"

client = AnthropicBedrockMantle(aws_region=REGION)

# Default prompts for the basic and stream demos (override basic via CLI).
DEFAULT_PROMPT = (
    "Design a distributed architecture on AWS in Python that should support "
    "100k requests per second across multiple geographic regions"
)
STREAM_PROMPT = """
    During our team meetings, team members rarely raise questions or engage in active Q&A sessions.
    Even when I pause and ask everyone if they have any questions, there is little response.
    In contrast, members of other teams discuss extensively and ask me numerous questions when faced with the same topics.
    What are the underlying reasons for this, and how can I improve the situation?
    Please provide a detailed analysis and actionable recommendations.
"""


# ---------------------------------------------------------------------------
# basic: non-streaming Messages API call
# ---------------------------------------------------------------------------
def messages_example(prompt: str = DEFAULT_PROMPT) -> str:
    """Non-streaming Messages API call on the bedrock-mantle endpoint."""
    message = client.messages.create(
        # Fable 5 supports 128K output tokens; use half here. The SDK refuses
        # large non-streaming requests it estimates will exceed ~10 min, so we
        # raise the per-request timeout to suppress that guard. (For routine
        # long outputs, prefer streaming — see stream_messages_example.)
        max_tokens=64000,
        model=MODEL_ID,
        system="You are a concise assistant.",
        messages=[{"role": "user", "content": prompt}],
        # Adaptive thinking is always on for Fable 5; control depth via effort.
        # No temperature/top_p/top_k — Fable 5 rejects unsupported sampling values.
        output_config={"effort": "high"},
        timeout=1800.0,  # 30 min; required so the SDK allows max_tokens this large
    )

    # message.content is a list of typed blocks; guard on .type before .text.
    text = "".join(block.text for block in message.content if block.type == "text")
    print("[Messages]", text)
    print("[Messages] stop_reason:", message.stop_reason)
    print("[Messages] usage:", message.usage)
    return text


# ---------------------------------------------------------------------------
# stream: streaming Messages API call
# ---------------------------------------------------------------------------
def stream_messages_example(prompt: str = STREAM_PROMPT) -> None:
    """Stream tokens via the Messages API on the bedrock-mantle endpoint."""
    print("[MessagesStream] ", end="", flush=True)
    with client.messages.stream(
        model=MODEL_ID,
        max_tokens=64000,  # half of Fable 5's 128K output ceiling
        messages=[{"role": "user", "content": prompt}],
        output_config={"effort": "high"},
    ) as stream:
        # text_stream yields only the text deltas — simplest path for a UI.
        for text in stream.text_stream:
            print(text, end="", flush=True)
        # Full Message object (usage, stop_reason, all blocks) once complete.
        final = stream.get_final_message()
    print(f"\n[MessagesStream] stop_reason: {final.stop_reason}, "
          f"output_tokens: {final.usage.output_tokens}")


# ---------------------------------------------------------------------------
# tools: tool use (function calling) — native Anthropic tools + tool_use/result
# ---------------------------------------------------------------------------
# The model never runs your tool. The loop is: ask -> model requests a tool
# (stop_reason == "tool_use") -> you run it -> send tool_result back -> repeat
# until the model returns a normal answer.

def get_weather(location: str, unit: str = "celsius") -> dict:
    """Stub tool implementation (your real code would call an API)."""
    fake = {
        "Tokyo": {"temp": 22, "condition": "clear"},
        "Paris": {"temp": 14, "condition": "rainy"},
    }
    data = fake.get(location, {"temp": 20, "condition": "unknown"})
    return {"location": location, "unit": unit, **data}


def tool_use_example() -> str:
    """Run a full tool-use loop on the bedrock-mantle endpoint."""
    tools = [
        {
            "name": "get_weather",
            "description": "Get the current weather for a city.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "location": {"type": "string", "description": "City name, e.g. Tokyo"},
                    "unit": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"],
                        "description": "Temperature unit",
                    },
                },
                "required": ["location"],
            },
        }
    ]

    messages = [
        {
            "role": "user",
            "content": "What's the weather in Tokyo and in Paris? Compare them in one sentence.",
        }
    ]

    while True:
        response = client.messages.create(
            model=MODEL_ID,
            max_tokens=1024,
            tools=tools,
            messages=messages,
            output_config={"effort": "high"},
        )

        if response.stop_reason != "tool_use":
            text = "".join(b.text for b in response.content if b.type == "text")
            print("[ToolUse] final:", text)
            return text

        # Echo the assistant turn (incl. tool_use blocks) back into history.
        messages.append({"role": "assistant", "content": response.content})

        # Run each requested tool; block.input is already a parsed dict.
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                print(f"[ToolUse] tool_use: {block.name}({block.input})")
                result = get_weather(**block.input)
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result),
                    }
                )
        messages.append({"role": "user", "content": tool_results})


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Claude Fable 5 on the Amazon Bedrock bedrock-mantle endpoint."
    )
    parser.add_argument(
        "mode",
        nargs="?",
        default="basic",
        help="One of: basic | stream | tools. "
             "Anything else is treated as a prompt for the 'basic' demo.",
    )
    mode = parser.parse_args().mode

    if mode == "basic":
        messages_example()
    elif mode == "stream":
        stream_messages_example()
    elif mode == "tools":
        tool_use_example()
    else:
        # Treat the whole argument as a custom prompt for the basic demo.
        messages_example(mode)


if __name__ == "__main__":
    main()
