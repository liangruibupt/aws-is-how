"""
xAI Grok 4.6 on Amazon Bedrock via the OpenAI-compatible Responses API.

Grok 4.6 is xAI's frontier model for coding, agentic tasks, and knowledge work,
with a focus on long-running agents. On Amazon Bedrock it is reached through an
OpenAI-compatible surface, so you use the official `openai` SDK (NOT the
`anthropic` SDK).

Model card (AWS, launched 2026-08-18):
  https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-xai-grok-4-6.html
Announcement:
  https://aws.amazon.com/about-aws/whats-new/2026/08/amazon-bedrock-grok-4-6/

KEY FACTS (verified against the model card):
  * Two endpoints:
      - bedrock-runtime (RECOMMENDED — this file's default):
          base_url = https://bedrock-runtime.{region}.amazonaws.com/openai/v1
          model    = a cross-Region inference (CRIS) profile:
                       us.xai.grok-4.6      (US Geo — data stays in the US)
                       global.xai.grok-4.6  (Global — broadest capacity, cheapest)
                     In-Region inference is NOT available on this endpoint.
      - bedrock-mantle (alternative):
          base_url = https://bedrock-mantle.{region}.api.aws/openai/v1
          model    = xai.grok-4.6   (us-west-2 only)
  * APIs: Responses, Chat Completions, Converse. This file uses Responses.
  * Context window: 500K tokens.
  * Image input: NOT documented in the card's usage notes, but VERIFIED working
    on the Responses API via a base64 data URL — see the `vision` demo below.
    There is no `detail` fidelity control.
  * Reasoning is ALWAYS ON; configure depth with reasoning={"effort": ...}:
        "low" (default) | "medium" | "high" | "xhigh".
    Reasoning content is ENCRYPTED — only the Responses API can return it via
    include=["reasoning.encrypted_content"]; echo it back on later turns to
    preserve reasoning context. (Chat Completions returns no reasoning tokens.)
  * Service tiers: Standard (default) | Priority (1.75x) | Flex (0.5x); set via
    service_tier. Left at Standard here.
  * IAM (bedrock-runtime): needs bedrock:InvokeModel on the account default
    project arn:aws:bedrock:{region}:{account-id}:project/default in addition to
    the inference profile.

Auth: generate a long-term Amazon Bedrock API key and expose it to the OpenAI
SDK as a bearer token. Standard env vars:
    export OPENAI_API_KEY="<your Bedrock API key>"
    export OPENAI_BASE_URL="https://bedrock-runtime.us-east-1.amazonaws.com/openai/v1"
    export BEDROCK_XAI_MODEL_ID="us.xai.grok-4.6"
This script also accepts AWS_BEARER_TOKEN_BEDROCK and builds the base URL from
AWS_REGION, so a bare `OpenAI()` (env-only) setup works too.

Usage:
  python grok46_bedrock.py            # basic (non-streaming) Responses demo
  python grok46_bedrock.py basic      # same as above
  python grok46_bedrock.py stream     # streaming Responses demo
  python grok46_bedrock.py tools      # tool-use (function calling) loop demo
  python grok46_bedrock.py vision IMAGE [QUESTION ...]   # image + text input
  python grok46_bedrock.py "your question here"   # basic demo, your prompt

Prereqs:
  pip install -U openai
"""

import argparse
import base64
import json
import mimetypes
import os
import sys

from openai import OpenAI

# Grok 4.6 on bedrock-runtime is served via cross-Region inference (CRIS); the
# model name must be a CRIS profile (us.* or global.*), NOT the bare model id.
REGION = os.getenv("AWS_REGION", "us-east-1")
MODEL_ID = os.getenv("BEDROCK_XAI_MODEL_ID", "us.xai.grok-4.6")
BASE_URL = os.getenv(
    "OPENAI_BASE_URL", f"https://bedrock-runtime.{REGION}.amazonaws.com/openai/v1"
)

# api_key resolves from OPENAI_API_KEY, falling back to a Bedrock bearer token.
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
    """Non-streaming Responses API call on the bedrock-runtime endpoint."""
    response = client.responses.create(
        model=MODEL_ID,
        instructions="You are a concise assistant.",  # Responses API "system" slot
        input=prompt,
        # Reasoning is always on; control depth via effort (low|medium|high|xhigh).
        reasoning={"effort": "high"},
        # Ask for the encrypted reasoning so it can be replayed on later turns.
        include=["reasoning.encrypted_content"],
        # No max_output_tokens set — let the service use its default ceiling.
        # Sampling left at Grok defaults; set temperature/top_p to override.
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
    """Stream output via the Responses API on the bedrock-runtime endpoint."""
    print("[ResponsesStream] ", end="", flush=True)
    # client.responses.stream(...) is a context manager that yields typed
    # events and accumulates the final Response object for you.
    with client.responses.stream(
        model=MODEL_ID,
        input=prompt,
        reasoning={"effort": "high"},
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
    """Run a full tool-use loop on the bedrock-runtime endpoint."""
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


# ---------------------------------------------------------------------------
# vision: image + text input on the Responses API
# ---------------------------------------------------------------------------
# NOTE ON SUPPORT: the Grok 4.6 model card lists Image among the input
# modalities, but the checkmark column does not survive text extraction, and
# unlike some other models the card's Usage Considerations say NOTHING about
# image handling (no ordering advice, no `detail` control, no note on video).
# So treat image support as empirically determined rather than documented —
# run this mode and see.
#
# VERIFIED BY RUNNING (2026-09, us.xai.grok-4.6, us-east-1): image input WORKS
# on the Responses API with a base64 data URL. Asked to transcribe a dense
# hand-drawn conference slide (dark background, sketch lettering, ~60 labels),
# it returned every year, the 1993 UDA -> 2003 CG -> 2006 CUDA chain, all five
# scale-curve library names, both nine-item text clusters, and the funnel's
# $100T plus four layers — scored 58/58 expected facts with zero invented
# items, and it even preserved the right-to-left arrow direction of the middle
# row. Cost 1,684 input / 2,112 output tokens, of which 1,904 were reasoning.
#
# Unlike Kimi K3, there is no documented `detail` control for image fidelity
# here, and the Responses API does not take one — so there is no low-detail
# mode to trade accuracy for cost.

VISION_QUESTION = (
    "Describe this image. If it contains a diagram, screenshot or scanned "
    "text, transcribe the key content and explain what it shows."
)


def _encode_image(image_path: str) -> str:
    """Read a local image and return it as an OpenAI-style data URL."""
    if not os.path.isfile(image_path):
        sys.exit(f"vision: no such image file: {image_path}")
    mime = mimetypes.guess_type(image_path)[0] or "image/png"
    with open(image_path, "rb") as handle:
        encoded = base64.b64encode(handle.read()).decode("utf-8")
    return f"data:{mime};base64,{encoded}"


def responses_vision_example(image_path: str, question: str | None = None) -> str:
    """Send a local image plus a question through the Responses API."""
    response = client.responses.create(
        model=MODEL_ID,
        input=[
            {
                "role": "user",
                # Image block first, then the text block.
                "content": [
                    {"type": "input_image", "image_url": _encode_image(image_path)},
                    {"type": "input_text", "text": question or VISION_QUESTION},
                ],
            }
        ],
        # Same reasoning setup as the other demos in this file.
        reasoning={"effort": "high"},
        include=["reasoning.encrypted_content"],
    )

    print("[ResponsesVision]", response.output_text)
    print("[ResponsesVision] status:", response.status)
    print("[ResponsesVision] usage:", response.usage)
    return response.output_text


def main() -> None:
    parser = argparse.ArgumentParser(
        description="xAI Grok 4.6 on Amazon Bedrock (bedrock-runtime, Responses API)."
    )
    parser.add_argument(
        "mode",
        nargs="?",
        default="basic",
        help="One of: basic | stream | tools | vision. "
             "Anything else is treated as a prompt for the 'basic' demo.",
    )
    parser.add_argument(
        "extra",
        nargs="*",
        help="For 'vision': IMAGE_PATH [QUESTION ...].",
    )
    args = parser.parse_args()
    mode = args.mode

    print(f"# model={MODEL_ID}  endpoint={BASE_URL}")

    if mode == "basic":
        responses_example()
    elif mode == "stream":
        stream_responses_example()
    elif mode == "tools":
        tool_use_example()
    elif mode == "vision":
        if not args.extra:
            sys.exit("vision: usage: grok46_bedrock.py vision IMAGE_PATH [QUESTION]")
        responses_vision_example(args.extra[0], " ".join(args.extra[1:]) or None)
    else:
        # Treat the whole argument as a custom prompt for the basic demo.
        responses_example(" ".join([mode, *args.extra]))


if __name__ == "__main__":
    main()
