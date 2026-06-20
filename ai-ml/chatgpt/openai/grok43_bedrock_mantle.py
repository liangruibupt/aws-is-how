"""
xAI Grok 4.3 on the Amazon Bedrock `bedrock-mantle` endpoint via the
OpenAI-compatible Responses API.

Grok 4.3 is xAI's reasoning-first model. On Amazon Bedrock it is served by the
"Mantle" inference engine through an OpenAI-compatible surface — so you use the
official `openai` SDK (NOT the `anthropic` SDK), pointed at:
    https://bedrock-mantle.{region}.api.aws/openai/v1
The Responses API is reached at the `openai/v1/responses` path on this endpoint.

Model ID (bedrock-mantle): xai.grok-4.3
Region: us-west-2 (Oregon) only — In-Region inference; Geo / Global not supported.

Grok 4.3 facts that shape these requests (from the AWS model card, 2026-06-15):
  - Reasoning is ALWAYS ON; configure depth with reasoning={"effort": ...}:
        "none" (disables reasoning) | "low" (default) | "medium" | "high".
  - Reasoning content is ENCRYPTED. Only the Responses API can return it, via
    include=["reasoning.encrypted_content"]; you echo that content back on later
    turns to preserve reasoning context. (Chat Completions returns no reasoning.)
  - Defaults differ from the OpenAI spec: temperature=0.7, top_p=0.95,
    max_output_tokens (Responses) / max_completion_tokens=131072. Set explicitly
    if you need different behavior. We leave sampling at the Grok defaults.
  - Context window 1M tokens; max output 131072 tokens.

Auth (per the model card): generate a long-term Amazon Bedrock API key, then
expose it to the OpenAI SDK as a bearer token. The standard env vars are:
    export OPENAI_API_KEY="<your Bedrock API key>"
    export OPENAI_BASE_URL="https://bedrock-mantle.us-west-2.api.aws/openai/v1"
This script also accepts AWS_BEARER_TOKEN_BEDROCK and builds the base URL from
AWS_REGION, so a bare `OpenAI()` (env-only) setup works too.

Usage:
  python grok43_bedrock_mantle.py            # basic (non-streaming) Responses demo
  python grok43_bedrock_mantle.py basic      # same as above
  python grok43_bedrock_mantle.py stream     # streaming Responses demo
  python grok43_bedrock_mantle.py tools      # tool-use (function calling) loop demo
  python grok43_bedrock_mantle.py "your question here"   # basic demo, your prompt

Prereqs:
  pip install -U openai
"""

import argparse
import json
import os

from openai import OpenAI

REGION = os.getenv("AWS_REGION", "us-west-2")  # Grok 4.3 is us-west-2 only
MODEL_ID = "xai.grok-4.3"
BASE_URL = os.getenv(
    "OPENAI_BASE_URL", f"https://bedrock-mantle.{REGION}.api.aws/openai/v1"
)

# api_key resolves from OPENAI_API_KEY, falling back to a Bedrock bearer token.
# (A bare OpenAI() would read OPENAI_API_KEY/OPENAI_BASE_URL on its own; we pass
# them explicitly so REGION/MODEL_ID stay the single source of truth here.)
client = OpenAI(
    base_url=BASE_URL,
    api_key=os.getenv("OPENAI_API_KEY") or os.getenv("AWS_BEARER_TOKEN_BEDROCK"),
)

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
# basic: non-streaming Responses API call
# ---------------------------------------------------------------------------
def responses_example(prompt: str = DEFAULT_PROMPT) -> str:
    """Non-streaming Responses API call on the bedrock-mantle endpoint."""
    response = client.responses.create(
        model=MODEL_ID,
        instructions="You are a concise assistant.",  # Responses API "system" slot
        input=prompt,
        # Reasoning is always on; control depth via effort (none|low|medium|high).
        reasoning={"effort": "high"},
        # Ask for the encrypted reasoning so it can be replayed on later turns.
        include=["reasoning.encrypted_content"],
        # Grok 4.3 max output is 131072; use half here. Sampling left at Grok
        # defaults (temperature 0.7 / top_p 0.95) — set explicitly to override.
        max_output_tokens=64000,
    )

    # output_text is the SDK's convenience join of all output text blocks.
    print("[Responses]", response.output_text)
    print("[Responses] status:", response.status)
    print("[Responses] usage:", response.usage)
    return response.output_text


# ---------------------------------------------------------------------------
# stream: streaming Responses API call
# ---------------------------------------------------------------------------
def stream_responses_example(prompt: str = STREAM_PROMPT) -> None:
    """Stream output via the Responses API on the bedrock-mantle endpoint."""
    print("[ResponsesStream] ", end="", flush=True)
    # client.responses.stream(...) is a context manager that yields typed
    # events and accumulates the final Response object for you.
    with client.responses.stream(
        model=MODEL_ID,
        input=prompt,
        reasoning={"effort": "high"},
        max_output_tokens=64000,  # half of Grok 4.3's 131072 output ceiling
    ) as stream:
        for event in stream:
            # Text deltas are the simplest path for a UI. Grok's reasoning is
            # encrypted, so there are no readable reasoning deltas to print.
            if event.type == "response.output_text.delta":
                print(event.delta, end="", flush=True)
        final = stream.get_final_response()
    print(f"\n[ResponsesStream] status: {final.status}, "
          f"output_tokens: {final.usage.output_tokens}")


# ---------------------------------------------------------------------------
# tools: tool use (function calling) on the Responses API
# ---------------------------------------------------------------------------
# The model never runs your tool. The loop is: ask -> model emits a
# function_call item -> you run it -> send a function_call_output back ->
# repeat until the model returns a normal answer (no more function_call items).

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
    # Responses API function-tool shape is FLAT (name/description/parameters at
    # the top level) — unlike Chat Completions, which nests them under "function".
    tools = [
        {
            "type": "function",
            "name": "get_weather",
            "description": "Get the current weather for a city.",
            "parameters": {
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
                "additionalProperties": False,
            },
        }
    ]

    # The Responses API is driven by an input list of items; we carry full
    # context manually (stateless — no previous_response_id / server store).
    input_list = [
        {
            "role": "user",
            "content": "What's the weather in Tokyo and in Paris? Compare them in one sentence.",
        }
    ]

    while True:
        response = client.responses.create(
            model=MODEL_ID,
            tools=tools,
            input=input_list,
            reasoning={"effort": "high"},
            # Keep encrypted reasoning so the model retains its chain across
            # tool round-trips; appending response.output below replays it.
            include=["reasoning.encrypted_content"],
            max_output_tokens=1024,
        )

        # Append every output item (reasoning + function_call items) to history.
        input_list += response.output

        function_calls = [item for item in response.output if item.type == "function_call"]
        if not function_calls:
            print("[ToolUse] final:", response.output_text)
            return response.output_text

        # Run each requested tool; arguments is a JSON string — parse it.
        for call in function_calls:
            args = json.loads(call.arguments)
            print(f"[ToolUse] function_call: {call.name}({args})")
            result = get_weather(**args)
            input_list.append(
                {
                    "type": "function_call_output",
                    "call_id": call.call_id,  # match the function_call's call_id
                    "output": json.dumps(result),
                }
            )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="xAI Grok 4.3 on the Amazon Bedrock bedrock-mantle endpoint."
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
        responses_example()
    elif mode == "stream":
        stream_responses_example()
    elif mode == "tools":
        tool_use_example()
    else:
        # Treat the whole argument as a custom prompt for the basic demo.
        responses_example(mode)


if __name__ == "__main__":
    main()
