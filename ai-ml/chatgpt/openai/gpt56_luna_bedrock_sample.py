#!/usr/bin/env python3
"""
OpenAI GPT-5.6 Luna on Amazon Bedrock — Python sample.

Based on the GPT-5.6 Luna Bedrock model card:
https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-openai-gpt-56-luna.html

KEY FACTS (verified against the GPT-5.6 Luna Bedrock model card):
  * GPT-5.6 Luna is OpenAI's fast, affordable model — good for high-volume
    classification, summarization, routing, and real-time apps where latency
    and cost per token matter most. Launched 2026-07-13.
  * Called through the OpenAI **Responses API** via the OpenAI Python SDK.
  * Two endpoints are supported:
      - bedrock-runtime (RECOMMENDED for new apps):
          base_url = https://bedrock-runtime.{region}.amazonaws.com/openai/v1
          model    = a cross-Region inference profile, e.g.
                     "us.openai.gpt-5.6-luna" or "global.openai.gpt-5.6-luna"
                     (in-Region inference is NOT available on this endpoint)
      - bedrock-mantle:
          base_url = https://bedrock-mantle.{region}.api.aws/openai/v1
          model    = "openai.gpt-5.6-luna"
          (served at /openai/v1/responses, not the default /v1/responses)
  * Context window : 1M tokens (short context 272K / long context 1M pricing).
  * Modalities     : text/image/audio/speech/video in; text/image/speech/
                     video/embedding out.
  * Auth           : a Bedrock API key, passed as the OpenAI api_key.
  * Service tiers  : Standard (default) | Priority | Flex — set via
                     `service_tier`. Priority/Flex not supported (Standard only)
                     per the model card pricing note; leave unset for Standard.
  * IAM (bedrock-runtime): needs bedrock:InvokeModel on the account default
    project arn:aws:bedrock:{region}:{account-id}:project/default in addition
    to the inference profile.

SETUP
    pip install -U openai

    # Create a Bedrock API key:
    #   https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html

    # Option A — bedrock-runtime (recommended):
    export OPENAI_BASE_URL="https://bedrock-runtime.us-east-1.amazonaws.com/openai/v1"
    export OPENAI_API_KEY="<YOUR_BEDROCK_API_KEY>"
    export BEDROCK_OPENAI_MODEL_ID="us.openai.gpt-5.6-luna"

    # Option B — bedrock-mantle:
    export OPENAI_BASE_URL="https://bedrock-mantle.us-east-1.api.aws/openai/v1"
    export OPENAI_API_KEY="<YOUR_BEDROCK_API_KEY>"
    export BEDROCK_OPENAI_MODEL_ID="openai.gpt-5.6-luna"

USAGE
    python gpt56_luna_bedrock_sample.py basic      # one-shot completion
    python gpt56_luna_bedrock_sample.py stream     # token-by-token streaming
    python gpt56_luna_bedrock_sample.py tools      # function / tool calling round-trip
    python gpt56_luna_bedrock_sample.py "your own prompt here"
"""

import argparse
import json
import os
import sys

try:
    from openai import OpenAI
except ImportError:
    sys.exit("The 'openai' package is required. Install it with: pip install -U openai")


# ─────────────────────────────────────────────────────────────────────────────
# Configuration (env-driven, with model-card defaults)
# ─────────────────────────────────────────────────────────────────────────────

def _env(name: str, default: str | None = None) -> str | None:
    """Read an env var, stripping surrounding whitespace/newlines.

    A trailing newline (common when an `export` line gets pasted with its line
    break) otherwise produces httpx.InvalidURL: "non-printable ASCII character".
    """
    val = os.environ.get(name, default)
    return val.strip() if isinstance(val, str) else val


# GPT-5.6 Luna GA region used in the model card examples (US East / N. Virginia).
DEFAULT_REGION = "us-east-1"
# Default to the recommended bedrock-runtime endpoint. Note the `openai/v1`
# path suffix and that the model must be a cross-Region inference profile here.
BASE_URL = _env(
    "OPENAI_BASE_URL",
    f"https://bedrock-runtime.{DEFAULT_REGION}.amazonaws.com/openai/v1",
)
# On bedrock-runtime, name the cross-Region inference profile as the model.
# On bedrock-mantle, use the plain model id "openai.gpt-5.6-luna" instead.
MODEL_ID = _env("BEDROCK_OPENAI_MODEL_ID", "us.openai.gpt-5.6-luna")
API_KEY = _env("OPENAI_API_KEY")


def make_client() -> OpenAI:
    """Build an OpenAI SDK client pointed at an Amazon Bedrock OpenAI endpoint."""
    if not API_KEY:
        sys.exit(
            "OPENAI_API_KEY is not set. Export your Amazon Bedrock API key first:\n"
            '  export OPENAI_API_KEY="<YOUR_BEDROCK_API_KEY>"'
        )
    # The OpenAI client speaks the Responses API; pointing base_url at a Bedrock
    # OpenAI endpoint (bedrock-runtime or bedrock-mantle) routes inference
    # through Amazon Bedrock.
    return OpenAI(base_url=BASE_URL, api_key=API_KEY)


# ─────────────────────────────────────────────────────────────────────────────
# 1) Basic completion — canonical Responses API example
# ─────────────────────────────────────────────────────────────────────────────

def demo_basic(client: OpenAI, prompt: str | None = None) -> None:
    """Single-turn request using the Responses API."""
    user_msg = prompt or (
        "Design a distributed architecture on AWS in Python that should support "
        "100k requests per second across multiple geographic regions."
    )

    response = client.responses.create(
        model=MODEL_ID,
        input=[
            {
                "role": "developer",  # Responses API uses 'developer' for system guidance
                "content": "You are a software engineer with excellent AWS cloud "
                           "knowledge. Be concise and practical.",
            },
            {"role": "user", "content": user_msg},
        ],
        reasoning={"effort": "medium"},
        text={"verbosity": "low"},
    )

    print(response.output_text)
    _print_usage(response)


# ─────────────────────────────────────────────────────────────────────────────
# 2) Streaming — print tokens as they arrive
# ─────────────────────────────────────────────────────────────────────────────

def demo_stream(client: OpenAI, prompt: str | None = None) -> None:
    """Stream the response incrementally via Responses API server-sent events."""
    user_msg = prompt or "Explain idempotency keys in a payments API in 4 bullet points."

    stream = client.responses.create(
        model=MODEL_ID,
        input=[{"role": "user", "content": user_msg}],
        reasoning={"effort": "medium"},
        stream=True,
    )

    for event in stream:
        # The Responses API emits typed events; we only render text deltas here.
        if event.type == "response.output_text.delta":
            print(event.delta, end="", flush=True)
        elif event.type == "response.error":
            print(f"\n[stream error] {event}", file=sys.stderr)
    print()  # final newline


# ─────────────────────────────────────────────────────────────────────────────
# 3) Tool / function calling — full request -> tool -> answer round-trip
# ─────────────────────────────────────────────────────────────────────────────

# A trivial local "tool" the model can ask us to run.
def get_current_weather(location: str, unit: str = "celsius") -> dict:
    """Stand-in for a real API call. Returns canned data."""
    return {"location": location, "unit": unit, "temperature": 21, "conditions": "Sunny"}


TOOLS = [
    {
        "type": "function",
        "name": "get_current_weather",
        "description": "Get the current weather for a city.",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {"type": "string", "description": "City name, e.g. 'Singapore'"},
                "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]},
            },
            "required": ["location"],
            "additionalProperties": False,
        },
    }
]

TOOL_IMPL = {"get_current_weather": get_current_weather}


def demo_tools(client: OpenAI, prompt: str | None = None) -> None:
    """Demonstrate the function-calling loop with the Responses API."""
    user_msg = prompt or "What's the weather in Singapore right now? Use the tool."

    # Maintain the running conversation as a list of input items.
    conversation = [{"role": "user", "content": user_msg}]

    first = client.responses.create(
        model=MODEL_ID,
        input=conversation,
        tools=TOOLS,
        reasoning={"effort": "medium"},
    )

    # Collect any function calls the model requested from the output items.
    function_calls = [item for item in first.output if item.type == "function_call"]

    if not function_calls:
        # Model answered directly without needing the tool.
        print(first.output_text)
        _print_usage(first)
        return

    # Echo the model's own output items back into the conversation, then append
    # one function_call_output per executed tool call.
    conversation += first.output
    for call in function_calls:
        args = json.loads(call.arguments)
        print(f"[model -> tool] {call.name}({args})")
        result = TOOL_IMPL[call.name](**args)
        conversation.append(
            {
                "type": "function_call_output",
                "call_id": call.call_id,
                "output": json.dumps(result),
            }
        )

    # Second call: model now has the tool results and produces the final answer.
    final = client.responses.create(
        model=MODEL_ID,
        input=conversation,
        tools=TOOLS,
        reasoning={"effort": "medium"},
    )
    print(final.output_text)
    _print_usage(final)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _print_usage(response) -> None:
    """Print token usage if the endpoint returned it."""
    usage = getattr(response, "usage", None)
    if usage:
        it = getattr(usage, "input_tokens", "?")
        ot = getattr(usage, "output_tokens", "?")
        print(f"\n— tokens: input={it}, output={ot} —", file=sys.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="OpenAI GPT-5.6 Luna on Amazon Bedrock (Responses API) sample.",
    )
    parser.add_argument(
        "command",
        nargs="?",
        default="basic",
        help="One of: basic | stream | tools. Anything else is treated as a prompt "
             "for the 'basic' demo.",
    )
    args = parser.parse_args()

    client = make_client()
    print(f"# model={MODEL_ID}  endpoint={BASE_URL}\n", file=sys.stderr)

    dispatch = {"basic": demo_basic, "stream": demo_stream, "tools": demo_tools}
    if args.command in dispatch:
        dispatch[args.command](client)
    else:
        # Treat the positional arg as a free-form prompt.
        demo_basic(client, prompt=args.command)


if __name__ == "__main__":
    main()
