"""
Claude Fable 5 on the Amazon Bedrock `bedrock-runtime` endpoint.

Covers BOTH classic Bedrock APIs, non-streaming and streaming:
  1. InvokeModel / InvokeModelWithResponseStream  (Anthropic-native body)
  2. Converse      / ConverseStream               (unified, provider-agnostic shape)
  plus a Converse-based tool-use loop.

Model ID (bedrock-runtime): global.anthropic.claude-fable-5
  - "global." => global cross-region inference profile (no pricing premium).
    Swap to "us.anthropic.claude-fable-5" for the US regional endpoint (+10%).

Fable 5 facts that shape these requests (from the AWS model card):
  - Adaptive thinking is ALWAYS ON and cannot be disabled; effort is configurable.
  - Sampling: temperature must be 1.0 or unset; top_p must be >=0.99 and <1.0,
    or unset; top_k is NOT supported. So we simply omit all sampling params.
  - Max output: 128K tokens. 1M-token context window.

Usage:
  python fable5_bedrock_runtime.py            # basic (InvokeModel + Converse)
  python fable5_bedrock_runtime.py basic      # same as above
  python fable5_bedrock_runtime.py stream     # streaming (both surfaces)
  python fable5_bedrock_runtime.py tools      # Converse tool-use loop
  python fable5_bedrock_runtime.py "your question here"   # basic demo, your prompt

Prereqs:
  pip install "boto3>=1.28.59"
  Data sharing opt-in (provider_data_share) must already be set on the account,
  and the caller needs bedrock:InvokeModel* / bedrock:Converse* permissions plus
  marketplace access to anthropic.claude-fable-5.
"""

import argparse
import json

import boto3

REGION = "us-east-1"
MODEL_ID = "global.anthropic.claude-fable-5"

bedrock = boto3.client("bedrock-runtime", region_name=REGION)

DEFAULT_PROMPT = "In one sentence, what is Amazon Bedrock?"
STREAM_PROMPT = "Write a short haiku about distributed systems."


# ---------------------------------------------------------------------------
# basic #1: InvokeModel — Anthropic-native body
# ---------------------------------------------------------------------------
def invoke_model_example(prompt: str = DEFAULT_PROMPT) -> str:
    """Non-streaming InvokeModel call using the Anthropic Messages body shape."""
    body = json.dumps(
        {
            # On Bedrock InvokeModel, the model version is fixed by the header
            # below, not the top-level "model" field.
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1024,
            "system": "You are a concise assistant.",
            "messages": [{"role": "user", "content": prompt}],
            # No temperature / top_p / top_k: Fable 5 rejects unsupported sampling
            # values, and adaptive thinking is always on. Tune depth with effort:
            "output_config": {"effort": "high"},  # low | medium | high | max
        }
    )

    response = bedrock.invoke_model(modelId=MODEL_ID, body=body)
    payload = json.loads(response["body"].read())

    # payload["content"] is a list of blocks; collect the text blocks.
    text = "".join(
        block["text"] for block in payload["content"] if block.get("type") == "text"
    )
    print("[InvokeModel]", text)
    print("[InvokeModel] usage:", payload.get("usage"))
    return text


# ---------------------------------------------------------------------------
# basic #2: Converse — Bedrock's unified message API
# ---------------------------------------------------------------------------
def converse_example(prompt: str = DEFAULT_PROMPT) -> str:
    """Non-streaming Converse call (provider-agnostic message shape)."""
    response = bedrock.converse(
        modelId=MODEL_ID,
        system=[{"text": "You are a concise assistant."}],
        messages=[{"role": "user", "content": [{"text": prompt}]}],
        # Converse normalizes generation settings here. Keep it minimal for Fable 5:
        # set only maxTokens; omit temperature/topP so we never send a rejected value.
        inferenceConfig={"maxTokens": 1024},
    )

    # Converse returns content blocks under output.message.content
    blocks = response["output"]["message"]["content"]
    text = "".join(block["text"] for block in blocks if "text" in block)
    print("[Converse]", text)
    print("[Converse] usage:", response.get("usage"))
    print("[Converse] stopReason:", response.get("stopReason"))
    return text


# ---------------------------------------------------------------------------
# stream #1: InvokeModelWithResponseStream
# ---------------------------------------------------------------------------
def stream_invoke_model(prompt: str = STREAM_PROMPT) -> None:
    """Stream tokens via InvokeModelWithResponseStream (Anthropic-native body)."""
    body = json.dumps(
        {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 64000,  # half of Fable 5's 128K output ceiling
            "messages": [{"role": "user", "content": prompt}],
            "output_config": {"effort": "high"},
        }
    )

    response = bedrock.invoke_model_with_response_stream(modelId=MODEL_ID, body=body)

    print("[InvokeModelStream] ", end="", flush=True)
    for event in response["body"]:
        chunk = json.loads(event["chunk"]["bytes"])
        # The Bedrock stream mirrors the first-party SSE event types.
        if chunk["type"] == "content_block_delta":
            delta = chunk["delta"]
            if delta.get("type") == "text_delta":
                print(delta["text"], end="", flush=True)
        elif chunk["type"] == "message_delta":
            usage = chunk.get("usage")
            if usage:
                print(f"\n[InvokeModelStream] usage: {usage}")
    print()


# ---------------------------------------------------------------------------
# stream #2: ConverseStream
# ---------------------------------------------------------------------------
def stream_converse(prompt: str = STREAM_PROMPT) -> None:
    """Stream tokens via the unified ConverseStream API."""
    response = bedrock.converse_stream(
        modelId=MODEL_ID,
        messages=[{"role": "user", "content": [{"text": prompt}]}],
        inferenceConfig={"maxTokens": 64000},  # half of Fable 5's 128K ceiling
    )

    print("[ConverseStream]    ", end="", flush=True)
    for event in response["stream"]:
        if "contentBlockDelta" in event:
            delta = event["contentBlockDelta"]["delta"]
            if "text" in delta:
                print(delta["text"], end="", flush=True)
        elif "messageStop" in event:
            print(f"\n[ConverseStream] stopReason: "
                  f"{event['messageStop'].get('stopReason')}")
        elif "metadata" in event:
            usage = event["metadata"].get("usage")
            if usage:
                print(f"[ConverseStream] usage: {usage}")
    print()


# ---------------------------------------------------------------------------
# tools: tool use (function calling) via Converse — toolConfig + toolUse/result
# ---------------------------------------------------------------------------
# The model never runs your tool. The loop is: ask -> model requests a tool
# (stopReason == "tool_use") -> you run it -> send a toolResult block back ->
# repeat until the model returns a normal answer.

def get_weather(location: str, unit: str = "celsius") -> dict:
    """Stub tool implementation (your real code would call an API)."""
    fake = {
        "Tokyo": {"temp": 22, "condition": "clear"},
        "Paris": {"temp": 14, "condition": "rainy"},
    }
    data = fake.get(location, {"temp": 20, "condition": "unknown"})
    return {"location": location, "unit": unit, **data}


def tool_use_example() -> str:
    """Run a full tool-use loop using the Converse API."""
    tool_config = {
        "tools": [
            {
                "toolSpec": {
                    "name": "get_weather",
                    "description": "Get the current weather for a city.",
                    "inputSchema": {
                        "json": {
                            "type": "object",
                            "properties": {
                                "location": {
                                    "type": "string",
                                    "description": "City name, e.g. Tokyo",
                                },
                                "unit": {
                                    "type": "string",
                                    "enum": ["celsius", "fahrenheit"],
                                    "description": "Temperature unit",
                                },
                            },
                            "required": ["location"],
                        }
                    },
                }
            }
        ]
    }

    messages = [
        {
            "role": "user",
            "content": [
                {"text": "What's the weather in Tokyo and in Paris? Compare them in one sentence."}
            ],
        }
    ]

    while True:
        response = bedrock.converse(
            modelId=MODEL_ID,
            messages=messages,
            toolConfig=tool_config,
            inferenceConfig={"maxTokens": 1024},
        )

        out_msg = response["output"]["message"]
        messages.append(out_msg)  # echo assistant turn back into history

        if response["stopReason"] != "tool_use":
            text = "".join(b["text"] for b in out_msg["content"] if "text" in b)
            print("[ToolUse] final:", text)
            return text

        # Run each toolUse block; build toolResult content blocks.
        tool_results = []
        for block in out_msg["content"]:
            if "toolUse" in block:
                tu = block["toolUse"]
                print(f"[ToolUse] toolUse: {tu['name']}({tu['input']})")
                result = get_weather(**tu["input"])
                tool_results.append(
                    {
                        "toolResult": {
                            "toolUseId": tu["toolUseId"],
                            "content": [{"json": result}],
                        }
                    }
                )
        messages.append({"role": "user", "content": tool_results})


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Claude Fable 5 on the Amazon Bedrock bedrock-runtime endpoint."
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
        invoke_model_example()
        print("-" * 60)
        converse_example()
    elif mode == "stream":
        stream_invoke_model()
        print("-" * 60)
        stream_converse()
    elif mode == "tools":
        tool_use_example()
    else:
        # Treat the whole argument as a custom prompt for the basic demo.
        invoke_model_example(mode)
        print("-" * 60)
        converse_example(mode)


if __name__ == "__main__":
    main()
