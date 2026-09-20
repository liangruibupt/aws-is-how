"""
Moonshot AI Kimi K3 on Amazon Bedrock via the OpenAI-compatible APIs.

Kimi K3 is Moonshot AI's most capable open-weight model and, per Moonshot, the
first open model to reach 2.8 trillion parameters (~2.5x the scaling efficiency
of Kimi K2). It pairs native vision with a 1M-token context window, which suits
long-running coding sessions over large repos, multi-document analysis including
scanned pages and screenshots, and extended agent workflows. On Amazon Bedrock it
is reached through an OpenAI-compatible surface, so you use the official `openai`
SDK (NOT the `anthropic` SDK).

Model card (AWS, launched 2026-09-18, GA):
  https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-moonshot-ai-kimi-k3.html
Announcement:
  https://aws.amazon.com/about-aws/whats-new/2026/09/moonshot-ai-kimi-k3-on-amazon-bedrock/
Launch blog:
  https://aws.amazon.com/blogs/machine-learning/introducing-kimi-k3-on-amazon-bedrock/
Prompt caching guide:
  https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html

KEY FACTS (verified against the model card):
  * Endpoint: bedrock-runtime (recommended for new applications)
        base_url = https://bedrock-runtime.{region}.amazonaws.com/openai/v1
    Model IDs — Kimi K3 is served via cross-Region inference (CRIS), so use a
    CRIS profile rather than the bare `moonshotai.kimi-k3` id:
        global.moonshotai.kimi-k3  (Global CRIS — routes to any supported
                                    commercial Region worldwide; ~10% cheaper;
                                    this file's default)
        us.moonshotai.kimi-k3      (US Geo CRIS — stays in the US geography for
                                    data residency)
    You pick the Region you send to; Bedrock routes the request. Available in
    all Regions where Bedrock is available, via cross-Region inferencing.
  * APIs: Responses, Chat Completions, Converse, Invoke. The model card
    recommends CHAT COMPLETIONS for Kimi K3; both OpenAI-compatible APIs are
    demonstrated below so you can compare them side by side.
    Prefer the OpenAI-compatible APIs over Converse: Converse has known
    limitations with this model — an InternalServerException when reasoning
    content from earlier turns is replayed in a multi-turn request (this hits
    LangChain and Strands Agents in their default configurations; strip prior
    reasoning blocks to work around it), and rejection of attached document
    inputs such as PDF and HTML.
  * Context window: 1M tokens. Input: text + image. Output: text.
    Video inputs are NOT supported.
  * Vision notes: for mixed inputs, put IMAGE blocks BEFORE text blocks — Kimi
    K3 can answer better that way (prompt-dependent, so test both). The image
    `detail` parameter (low | high) is honored only on Chat Completions; on the
    Responses API images are always processed at high detail.
  * Prompt caching: implicit is on by default. Kimi K3 is the FIRST open-weight
    model on Bedrock to also support EXPLICIT prompt caching (Responses and Chat
    Completions APIs only) — min 1,024 tokens per cache checkpoint, TTL at least
    30 minutes. Cache reads are discounted and do NOT count against your
    input-tokens-per-minute quota. See the `cache` scenarios below.
  * Also supported: response streaming, client-side tool calling, structured
    outputs, invocation logs. NOT supported: intelligent prompt routing,
    knowledge bases.
  * Service tiers (Responses / Chat Completions only): Standard (default) |
    Priority (1.75x) | Flex (0.5x), via service_tier. Left at Standard here.
    Converse and Invoke support Standard on-demand only.
  * Pricing per 1M tokens, Standard tier — Global CRIS: $3.00 in / $15.00 out,
    $0.30 cache read, $3.75 cache write (30 min). US CRIS: $3.30 / $16.50,
    $0.33 cache read, $4.125 cache write.
  * IAM: bedrock:InvokeModel, bedrock:InvokeModelWithResponseStream,
    bedrock:CreateInference.

Auth: either a long-term Amazon Bedrock API key exposed to the OpenAI SDK as a
bearer token, or short-term tokens from aws-bedrock-token-generator (which uses
your normal AWS credential chain). Env vars:
    export OPENAI_API_KEY="<your Bedrock API key>"     # or AWS_BEARER_TOKEN_BEDROCK
    export AWS_REGION="us-west-2"
    export BEDROCK_KIMI_MODEL_ID="global.moonshotai.kimi-k3"
If no key is set, this script falls back to aws_bedrock_token_generator.

Usage:
  # Chat Completions (the API the model card recommends)
  python kimi_k3_bedrock.py                       # basic, non-streaming
  python kimi_k3_bedrock.py basic
  python kimi_k3_bedrock.py stream                # streaming
  python kimi_k3_bedrock.py tools                 # function-calling loop
  python kimi_k3_bedrock.py vision IMAGE [Q...]   # image + text, detail honored

  # Responses API
  python kimi_k3_bedrock.py responses             # basic, non-streaming
  python kimi_k3_bedrock.py responses-stream      # streaming
  python kimi_k3_bedrock.py responses-tools       # function-calling loop
  python kimi_k3_bedrock.py responses-vision IMAGE [Q...]
  python kimi_k3_bedrock.py structured            # structured output (JSON schema)
  python kimi_k3_bedrock.py vision-eval [IMAGE]   # GRADE the vision output against
                                                  # hand-checked ground truth for
                                                  # media/GTC-2024.png; compares
                                                  # detail=low vs high vs Responses

  # Explicit prompt caching (Responses API)
  python kimi_k3_bedrock.py cache                 # same as: cache prefix
  python kimi_k3_bedrock.py cache prefix          # write a prefix, then reuse it
  python kimi_k3_bedrock.py cache layered         # two breakpoints + prompt_cache_key
  python kimi_k3_bedrock.py cache implicit        # implicit vs explicit mode
  python kimi_k3_bedrock.py cache miss            # how a changed prefix breaks the cache
  python kimi_k3_bedrock.py cache agent           # multi-turn agent loop + cost estimate

  python kimi_k3_bedrock.py "your question here"  # basic demo, your prompt

Prereqs:
  pip install -U openai
  pip install -U aws-bedrock-token-generator   # optional, for short-term tokens
"""

import argparse
import base64
import json
import mimetypes
import os
import re
import sys

from openai import OpenAI

# Kimi K3 is served through cross-Region inference; the model name must be a
# CRIS profile (global.* or us.*), not the bare `moonshotai.kimi-k3` id.
REGION = os.getenv("AWS_REGION", "us-west-2")
MODEL_ID = os.getenv("BEDROCK_KIMI_MODEL_ID", "global.moonshotai.kimi-k3")
BASE_URL = os.getenv(
    "OPENAI_BASE_URL", f"https://bedrock-runtime.{REGION}.amazonaws.com/openai/v1"
)

# Standard-tier list prices per 1M tokens, from the model card. Used only by the
# cost estimator in the caching demos.
PRICES = {
    "global": {"input": 3.00, "output": 15.00, "cache_read": 0.30, "cache_write": 3.75},
    "us": {"input": 3.30, "output": 16.50, "cache_read": 0.33, "cache_write": 4.125},
}


def _api_key() -> str:
    """Long-term Bedrock API key if present, else a short-term bearer token."""
    key = os.getenv("OPENAI_API_KEY") or os.getenv("AWS_BEARER_TOKEN_BEDROCK")
    if key:
        return key
    # Falls back to the normal AWS credential chain (profile, SSO, role, ...).
    from aws_bedrock_token_generator import provide_token

    return provide_token(region=REGION)


client = OpenAI(base_url=BASE_URL, api_key=_api_key())

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

# Shared tool schema body, reused by the Chat Completions and Responses demos.
WEATHER_PARAMETERS = {
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
}
WEATHER_QUESTION = "What's the weather in Tokyo and in Paris? Compare them in one sentence."


def get_weather(location: str, unit: str = "celsius") -> dict:
    """Stub tool implementation (your real code would call an API)."""
    fake = {
        "Tokyo": {"temp": 22, "condition": "clear"},
        "Paris": {"temp": 14, "condition": "rainy"},
    }
    data = fake.get(location, {"temp": 20, "condition": "unknown"})
    return {"location": location, "unit": unit, **data}


def _encode_image(image_path: str) -> str:
    """Read a local image and return it as an OpenAI-style data URL."""
    if not os.path.isfile(image_path):
        sys.exit(f"vision: no such image file: {image_path}")
    mime = mimetypes.guess_type(image_path)[0] or "image/png"
    with open(image_path, "rb") as handle:
        encoded = base64.b64encode(handle.read()).decode("utf-8")
    return f"data:{mime};base64,{encoded}"


VISION_QUESTION = (
    "Describe this image. If it contains a diagram, screenshot or scanned "
    "text, transcribe the key content and explain what it shows."
)


# ===========================================================================
# Chat Completions API — the API the Kimi K3 model card recommends
# ===========================================================================

def chat_example(prompt: str = DEFAULT_PROMPT) -> str:
    """Non-streaming Chat Completions call on the bedrock-runtime endpoint."""
    response = client.chat.completions.create(
        model=MODEL_ID,
        messages=[
            {"role": "system", "content": "You are a concise assistant."},
            {"role": "user", "content": prompt},
        ],
        # No max_completion_tokens set — let the service use its default ceiling.
        # Sampling left at model defaults; set temperature/top_p to override.
        # service_tier="flex",  # optional: "priority" (1.75x) | "flex" (0.5x)
    )

    text = response.choices[0].message.content
    print("[Chat]", text)
    print("[Chat] finish_reason:", response.choices[0].finish_reason)
    print("[Chat] usage:", response.usage)
    return text


def stream_chat_example(prompt: str = STREAM_PROMPT) -> None:
    """Stream output via Chat Completions on the bedrock-runtime endpoint."""
    print("[ChatStream] ", end="", flush=True)
    stream = client.chat.completions.create(
        model=MODEL_ID,
        messages=[{"role": "user", "content": prompt}],
        stream=True,
        # Ask for a usage record on the final (otherwise empty) chunk.
        stream_options={"include_usage": True},
    )
    usage = None
    for chunk in stream:
        if chunk.usage:  # final chunk carries usage, no choices
            usage = chunk.usage
        if chunk.choices and chunk.choices[0].delta.content:
            print(chunk.choices[0].delta.content, end="", flush=True)
    print(f"\n[ChatStream] usage: {usage}")


# Client-side tool use: the model never runs your tool. The loop is: ask ->
# model returns tool_calls -> you run them -> append one "tool" message per
# call -> repeat until the model answers with no tool_calls.
def tool_use_example() -> str:
    """Run a full tool-use loop on Chat Completions."""
    # Chat Completions nests the schema under "function" (the Responses API
    # instead takes name/description/parameters flat at the top level).
    tools = [
        {
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "Get the current weather for a city.",
                "parameters": WEATHER_PARAMETERS,
            },
        }
    ]
    messages = [{"role": "user", "content": WEATHER_QUESTION}]

    while True:
        response = client.chat.completions.create(
            model=MODEL_ID,
            messages=messages,
            tools=tools,
        )
        message = response.choices[0].message

        if not message.tool_calls:
            print("[ToolUse] final:", message.content)
            return message.content

        # Replay the assistant turn verbatim, then answer each tool call.
        messages.append(message.model_dump(exclude_none=True))
        for call in message.tool_calls:
            args = json.loads(call.function.arguments)  # arguments is a JSON string
            print(f"[ToolUse] tool_call: {call.function.name}({args})")
            result = get_weather(**args)
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": call.id,  # must match the tool_call's id
                    "content": json.dumps(result),
                }
            )


def _chat_vision(image_path: str, question: str, detail: str = "high") -> tuple[str, object]:
    """Chat Completions vision call. Image block goes BEFORE the text."""
    response = client.chat.completions.create(
        model=MODEL_ID,
        messages=[
            {
                "role": "user",
                # Images BEFORE text: recommended ordering for Kimi K3.
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": _encode_image(image_path),
                            # "detail" is honored only on Chat Completions:
                            # "low" is cheaper, "high" is higher fidelity.
                            # (On the Responses API images are always high.)
                            "detail": detail,
                        },
                    },
                    {"type": "text", "text": question},
                ],
            }
        ],
    )
    return response.choices[0].message.content, response.usage


def vision_example(image_path: str, question: str | None = None, detail: str = "high") -> str:
    """Local image + question on Chat Completions."""
    text, usage = _chat_vision(image_path, question or VISION_QUESTION, detail)
    print("[Vision]", text)
    print("[Vision] usage:", usage)
    return text


# ===========================================================================
# Responses API — the other OpenAI-compatible surface on bedrock-runtime
# ===========================================================================
# Differences from Chat Completions worth knowing for Kimi K3:
#   * `instructions` replaces the system message; `input` replaces `messages`.
#   * Function tools are FLAT (name/description/parameters at the top level).
#   * Tool results go back as `function_call_output` items, not "tool" messages.
#   * Image inputs are always processed at HIGH detail (no `detail` control).
#   * Convenience accessor `response.output_text` joins all output text blocks.
#   * Cache usage lands in usage.input_tokens_details (not prompt_tokens_details).

def responses_example(prompt: str = DEFAULT_PROMPT) -> str:
    """Non-streaming Responses API call on the bedrock-runtime endpoint."""
    response = client.responses.create(
        model=MODEL_ID,
        instructions="You are a concise assistant.",  # Responses API "system" slot
        input=prompt,
        # max_output_tokens / temperature left at service defaults.
    )

    print("[Responses]", response.output_text)
    print("[Responses] status:", response.status)
    print("[Responses] usage:", response.usage)
    return response.output_text


def stream_responses_example(prompt: str = STREAM_PROMPT) -> None:
    """Stream output via the Responses API."""
    print("[ResponsesStream] ", end="", flush=True)
    # client.responses.stream(...) is a context manager that yields typed
    # events and accumulates the final Response object for you.
    with client.responses.stream(model=MODEL_ID, input=prompt) as stream:
        for event in stream:
            if event.type == "response.output_text.delta":
                print(event.delta, end="", flush=True)
        final = stream.get_final_response()
    print(f"\n[ResponsesStream] status: {final.status}, "
          f"output_tokens: {final.usage.output_tokens}")


def responses_tool_use_example() -> str:
    """Run a full tool-use loop on the Responses API."""
    # Flat function-tool shape — contrast with the nested Chat Completions form.
    tools = [
        {
            "type": "function",
            "name": "get_weather",
            "description": "Get the current weather for a city.",
            "parameters": WEATHER_PARAMETERS,
        }
    ]
    # The Responses API is driven by an input list of items; we carry full
    # context manually (stateless — no previous_response_id / server store).
    input_list = [{"role": "user", "content": WEATHER_QUESTION}]

    while True:
        response = client.responses.create(
            model=MODEL_ID,
            tools=tools,
            input=input_list,
        )

        # Append every output item to history before answering tool calls.
        input_list += response.output

        function_calls = [item for item in response.output if item.type == "function_call"]
        if not function_calls:
            print("[ResponsesToolUse] final:", response.output_text)
            return response.output_text

        for call in function_calls:
            args = json.loads(call.arguments)  # arguments is a JSON string
            print(f"[ResponsesToolUse] function_call: {call.name}({args})")
            result = get_weather(**args)
            input_list.append(
                {
                    "type": "function_call_output",
                    "call_id": call.call_id,  # match the function_call's call_id
                    "output": json.dumps(result),
                }
            )


def _responses_vision(image_path: str, question: str) -> tuple[str, object]:
    """Responses API vision call (images always processed at high detail)."""
    response = client.responses.create(
        model=MODEL_ID,
        input=[
            {
                "role": "user",
                # Image first, then text — recommended ordering for Kimi K3.
                # No `detail` field here: the Responses API always uses high.
                "content": [
                    {"type": "input_image", "image_url": _encode_image(image_path)},
                    {"type": "input_text", "text": question},
                ],
            }
        ],
    )
    return response.output_text, response.usage


def responses_vision_example(image_path: str, question: str | None = None) -> str:
    """Local image + question on the Responses API (always high detail)."""
    text, usage = _responses_vision(image_path, question or VISION_QUESTION)
    print("[ResponsesVision]", text)
    print("[ResponsesVision] usage:", usage)
    return text


def structured_output_example() -> dict:
    """Structured outputs: constrain the answer to a JSON schema."""
    schema = {
        "type": "object",
        "properties": {
            "service": {"type": "string"},
            "purpose": {"type": "string"},
            "typical_use_cases": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Three short use cases",
            },
            "is_serverless": {"type": "boolean"},
        },
        "required": ["service", "purpose", "typical_use_cases", "is_serverless"],
        "additionalProperties": False,
    }

    response = client.responses.create(
        model=MODEL_ID,
        input="Summarize Amazon EventBridge for a new team member.",
        # On the Responses API the schema goes under text.format; strict=True
        # makes the model adhere to the schema exactly.
        text={
            "format": {
                "type": "json_schema",
                "name": "service_summary",
                "schema": schema,
                "strict": True,
            }
        },
    )

    parsed = json.loads(response.output_text)
    print("[Structured]", json.dumps(parsed, indent=2, ensure_ascii=False))
    return parsed


# ===========================================================================
# Vision evaluation — score the model's transcription against ground truth
# ===========================================================================
# The vision demos above only PRINT what Kimi K3 says, which proves the request
# works but says nothing about whether the answer is right. This harness grades
# the output against a hand-checked fact list for the bundled test image, and
# compares the two APIs plus both Chat Completions `detail` settings.
#
# What it measures: RECALL of expected facts (did the transcription mention
# each one) and HALLUCINATIONS (did it assert something that is not on the
# slide, drawn from a list of plausible wrong answers).
# What it does NOT measure: semantic correctness. A sentence containing the
# right keywords in a wrong claim still scores as a hit, and only the listed
# traps are detected — this is a regression check, not a grader.

DEFAULT_EVAL_IMAGE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                  "media", "GTC-2024.png")

# Ground truth for media/GTC-2024.png — NVIDIA's hand-drawn GTC 2024 timeline
# slide, read and transcribed by hand. Each entry is (label, regex) matched
# case-insensitively against the normalized answer.
GTC_SLIDE_FACTS = [
    # (section, label, pattern)
    ("timeline", "1964", r"\b1964\b"),
    ("timeline", "IBM S/360", r"ibm\s*s\s*/?\s*360"),
    ("timeline", "1995", r"\b1995\b"),
    ("timeline", "Windows 95", r"windows\s*95"),
    ("timeline", "Pentium", r"pentium"),
    ("timeline", "CPU vs DATA curves", r"\bcpu\b"),
    ("timeline", "accelerated computing", r"accelerated\s+computing"),
    ("timeline", "1993 UDA", r"1993|(?<![a-z])uda(?![a-z])"),
    ("timeline", "2003 CG", r"\b2003\b"),
    ("timeline", "2006 CUDA", r"\b2006\b"),
    ("timeline", "CUDA", r"cuda"),
    ("timeline", "2012", r"\b2012\b"),
    ("timeline", "AlexNet", r"alexnet"),
    ("timeline", "First Contact", r"first\s+contact"),
    ("timeline", "doubling every 6 months", r"doubling\s+every\s+6\s+months"),
    ("timeline", "2016", r"\b2016\b"),
    ("timeline", "DGX-1", r"dgx\s*-?\s*1\b"),
    ("timeline", "2017", r"\b2017\b"),
    ("timeline", "Transformer", r"transformer"),
    ("timeline", "2022", r"\b2022\b"),
    ("timeline", "OpenAI ChatGPT", r"open\s*ai|chatgpt"),
    ("timeline", "Generative AI", r"generative\s+ai"),
    ("timeline", "Startups", r"startups?"),
    ("timeline", "A New Industrial Revolution", r"new\s+industrial\s+revolution"),

    ("scale curve", "TensorRT", r"tensor\s*rt"),
    ("scale curve", "Megatron", r"megatron"),
    ("scale curve", "NCCL", r"nccl"),
    ("scale curve", "GPU-Direct", r"gpu\s*-?\s*direct"),
    ("scale curve", "cuDNN", r"cu\s*dnn"),
    ("scale curve", "RNN", r"\brnn\b"),
    ("scale curve", "GAN", r"\bgan\b"),
    ("scale curve", "CNN", r"\bcnn\b"),
    ("scale curve", "LSTM", r"\blstm\b"),
    ("scale curve", "VAE", r"\bvae\b"),

    ("learn everything", "learn everything", r"learn\s+everything"),
    ("learn everything", "protein", r"protein"),
    ("learn everything", "language", r"language"),
    ("learn everything", "sound", r"sound"),
    ("learn everything", "physics", r"physics"),
    ("learn everything", "3D", r"\b3\s*d\b"),
    ("learn everything", "video", r"video"),
    ("learn everything", "manipulation", r"manipulation"),
    ("learn everything", "images", r"images?"),
    ("learn everything", "gesture", r"gesture"),

    ("techniques", "fine tuning", r"fine\s*-?\s*tuning"),
    ("techniques", "guardrailing", r"guardrail"),
    ("techniques", "alignment", r"alignment"),
    ("techniques", "prompt engineering", r"prompt\s+engineering"),
    ("techniques", "vector DB", r"vector\s*db"),
    ("techniques", "RAG", r"\brag\b"),
    ("techniques", "multi-modal", r"multi\s*-?\s*modal"),
    ("techniques", "CoT & ToT", r"cot|chain\s+of\s+thought"),
    ("techniques", "agents", r"agents?"),

    ("funnel", "$100T", r"\$?\s*100\s*t\b"),
    ("funnel", "AI co-pilots", r"ai\s+co\s*-?\s*pilots?"),
    ("funnel", "AI factory", r"ai\s+factory"),
    ("funnel", "enterprise IT", r"enterprise\s+it"),
    ("funnel", "datacenters", r"data\s*centers?"),
]

# Plausible-but-absent items. Anything matched here was invented: none of these
# appear anywhere on the slide.
GTC_SLIDE_TRAPS = [
    ("H100", r"\bh100\b"),
    ("A100", r"\ba100\b"),
    ("Blackwell", r"blackwell"),
    ("Hopper", r"hopper"),
    ("Grace", r"\bgrace\b"),
    ("DGX-2", r"dgx\s*-?\s*2\b"),
    ("BERT", r"\bbert\b"),
    ("GPT-4", r"gpt\s*-?\s*4"),
    ("Volta", r"volta"),
    ("2020", r"\b2020\b"),
]

TRANSCRIBE_PROMPT = (
    "Transcribe this slide completely and literally. List every year label, "
    "every arrow step in order, every word in each text cluster, the labels on "
    "each chart, and the text inside the funnel. Do not add anything that is "
    "not written on the slide."
)


def _normalize(text: str) -> str:
    """Flatten the cosmetic variation a model puts in prose before matching."""
    lowered = text.lower()
    # Unicode dashes/quotes/non-breaking hyphens -> ASCII, markdown -> nothing.
    for src, dst in (("\u2011", "-"), ("\u2013", "-"), ("\u2014", "-"),
                     ("\u2212", "-"), ("\u2018", "'"), ("\u2019", "'"),
                     ("\u201c", '"'), ("\u201d", '"'), ("\u00a0", " ")):
        lowered = lowered.replace(src, dst)
    for ch in "*_`#":
        lowered = lowered.replace(ch, "")
    return re.sub(r"\s+", " ", lowered)


def _score(answer: str) -> dict:
    """Grade one transcription against the slide's fact list and traps."""
    norm = _normalize(answer)
    hits, misses = [], []
    for section, label, pattern in GTC_SLIDE_FACTS:
        (hits if re.search(pattern, norm) else misses).append((section, label))
    invented = [label for label, pattern in GTC_SLIDE_TRAPS if re.search(pattern, norm)]
    total = len(GTC_SLIDE_FACTS)
    return {
        "recall": len(hits) / total,
        "hits": len(hits),
        "total": total,
        "misses": misses,
        "hallucinations": invented,
        "chars": len(answer),
    }


def vision_eval_example(image_path: str | None = None) -> dict:
    """Run the same transcription three ways and grade each answer.

    Rows: Chat Completions at detail=low, Chat Completions at detail=high, and
    the Responses API (which ignores detail and always uses high). Comparing
    row 1 against row 2 is how you check whether `detail` is doing anything for
    your own workload.
    """
    image = image_path or DEFAULT_EVAL_IMAGE
    if os.path.abspath(image) != os.path.abspath(DEFAULT_EVAL_IMAGE):
        print("! The fact list is hand-written for media/GTC-2024.png. Scores "
              "against any other image are meaningless.\n")

    runs = []
    for label, call in (
        ("chat/detail=low", lambda: _chat_vision(image, TRANSCRIBE_PROMPT, "low")),
        ("chat/detail=high", lambda: _chat_vision(image, TRANSCRIBE_PROMPT, "high")),
        ("responses", lambda: _responses_vision(image, TRANSCRIBE_PROMPT)),
    ):
        answer, usage = call()
        result = _score(answer)
        result["label"] = label
        result["usage"] = usage
        runs.append(result)
        print(f"[{label}] recall {result['hits']}/{result['total']} "
              f"({result['recall'] * 100:.0f}%), "
              f"hallucinations {len(result['hallucinations'])}, "
              f"{result['chars']} chars")
        if result["misses"]:
            print(f"[{label}] missed: " +
                  ", ".join(f"{s}/{l}" for s, l in result["misses"]))
        if result["hallucinations"]:
            print(f"[{label}] INVENTED: " + ", ".join(result["hallucinations"]))

    best = max(runs, key=lambda r: (r["recall"], -len(r["hallucinations"])))
    print(f"\nbest: {best['label']} at {best['recall'] * 100:.0f}% recall")
    print("Reminder: this checks whether expected strings appear, not whether "
          "the surrounding claims are true.")
    return {"runs": runs, "best": best["label"]}


# ===========================================================================
# Explicit prompt caching (Responses API)
# ===========================================================================
# Kimi K3 is the first open-weight model on Bedrock to support EXPLICIT caching.
# Mechanics, per the model card and the prompt caching guide:
#   * Mark the end of a reusable prefix with
#         "prompt_cache_breakpoint": {"mode": "explicit"}
#     on an input_text / input_image / input_file content block.
#   * prompt_cache_options.mode:
#         "implicit" (default) — automatic breakpoint on the latest message,
#                                PLUS any explicit breakpoints you provide.
#         "explicit"           — automatic breakpoint disabled; only your
#                                breakpoints are used. With no breakpoints, the
#                                request does no caching and incurs no writes.
#   * Minimum 1,024 tokens, measured CUMULATIVELY over the whole prefix before
#     each breakpoint. A breakpoint placed before the minimum is reached still
#     returns a valid answer — it just doesn't cache. There is no minimum
#     distance between breakpoints.
#   * TTL is at least 30 minutes and RESETS on every cache hit.
#   * Caching never guarantees a hit — always read the usage fields.
#   * usage.input_tokens_details carries cached_tokens and cache_write_tokens.
#   * prompt_cache_key optionally scopes/namespaces a cache entry, e.g.
#     "my-app:system-prompt-v1".
# Note: the model card says explicit caching works on Responses AND Chat
# Completions, but AWS only documents the breakpoint syntax for Responses, so
# every scenario below uses Responses.

# Synthetic stand-in for the stable prefix a real agent would reuse. Repeated to
# clear the 1,024-token minimum (~3.9k tokens); real content would be genuine.
REVIEW_RULES = (
    "You are a senior AWS solutions architect reviewing an internal service.\n"
    "Standing review rules you must apply to every answer:\n"
    "- Prefer managed services over self-managed infrastructure.\n"
    "- Every data store must state its encryption-at-rest and backup posture.\n"
    "- Every cross-Region hop must state its latency and cost implication.\n"
    "- Call out any IAM policy broader than least privilege.\n"
    "- Reject designs with a single point of failure in the request path.\n"
) * 40

# A second stable block, used by the `layered` scenario as a reference document
# that sits between the rules and the (changing) question.
ARCHITECTURE_DOC = (
    "REFERENCE: current service topology.\n"
    "The order service runs on ECS Fargate behind an ALB in us-east-1.\n"
    "State lives in Aurora PostgreSQL with a single writer and no replica.\n"
    "Events are published to EventBridge and fan out to two Lambda consumers.\n"
    "Static assets are served from S3 via CloudFront with OAC enabled.\n"
    "Secrets are read from Secrets Manager at container start, not per request.\n"
) * 40


def _cache_stats(usage: object) -> tuple[int, int, int]:
    """Pull (input, cached, written) token counts out of a Responses usage."""
    details = getattr(usage, "input_tokens_details", None)
    cached = getattr(details, "cached_tokens", 0) or 0
    written = getattr(details, "cache_write_tokens", 0) or 0
    return usage.input_tokens, cached, written


def _report(label: str, response: object, show_text: bool = False) -> tuple[int, int, int]:
    """Print the cache accounting for one response."""
    total, cached, written = _cache_stats(response.usage)
    verdict = "HIT" if cached else ("WROTE CACHE" if written else "no caching")
    print(f"[{label}] input={total} cached={cached} written={written} -> {verdict}")
    if show_text:
        print(f"[{label}] {response.output_text[:300].strip()} ...")
    return total, cached, written


def _estimate_cost(total_in: int, cached: int, written: int, out: int) -> tuple[float, float]:
    """Return (actual_cost, no_cache_cost) in USD for one request.

    input_tokens is the TOTAL prompt size, with cached_tokens and
    cache_write_tokens as subsets of it — measured on a real call as
    input=3511 / cached=3478, the delta being the uncached tail.
    (Converse/Invoke differ: there, inputTokens EXCLUDES cache read/write
    tokens, so you must add the three together to get the true total.)
    """
    tier = PRICES["us"] if MODEL_ID.startswith("us.") else PRICES["global"]
    uncached = max(0, total_in - cached - written)
    actual = (
        uncached * tier["input"]
        + cached * tier["cache_read"]
        + written * tier["cache_write"]
        + out * tier["output"]
    ) / 1_000_000
    baseline = (total_in * tier["input"] + out * tier["output"]) / 1_000_000
    return actual, baseline


def _ask_cached(question: str, *, mode: str = "explicit", cache_key: str | None = None,
                rules: str = REVIEW_RULES, doc: str | None = None) -> object:
    """One Responses call whose stable prefix ends at an explicit breakpoint."""
    system_content = [
        {
            "type": "input_text",
            "text": rules,
            # End of the reusable prefix. Content AFTER this can change freely
            # without invalidating the cached prefix.
            "prompt_cache_breakpoint": {"mode": "explicit"},
        }
    ]
    if doc is not None:
        # A second breakpoint gives a LAYERED cache: requests that share only
        # the rules reuse layer 1; requests that also share the doc reuse both.
        system_content.append(
            {
                "type": "input_text",
                "text": doc,
                "prompt_cache_breakpoint": {"mode": "explicit"},
            }
        )

    body: dict = {"prompt_cache_options": {"mode": mode}}
    if cache_key:
        # Namespaces the cache entry, e.g. per app + prompt version.
        body["prompt_cache_key"] = cache_key

    return client.responses.create(
        model=MODEL_ID,
        extra_body=body,
        input=[
            {"type": "message", "role": "system", "content": system_content},
            {
                "type": "message",
                "role": "user",
                "content": [{"type": "input_text", "text": question}],
            },
        ],
    )


def cache_prefix_scenario() -> None:
    """Scenario 1 — write a reusable prefix, then hit it.

    The win comes from REUSING a stable prefix across calls: writes cost more
    than plain input, reads are ~90% cheaper. So call 1 pays, call 2 profits.
    """
    print("--- scenario: prefix (write once, reuse) ---")
    first = _ask_cached("Review plan A: one RDS instance in us-east-1, no read replica.")
    _report("call-1", first, show_text=True)

    # Same prefix, different tail -> expect a hit on the cached prefix.
    second = _ask_cached("Review plan B: Aurora Global Database across us-east-1 and eu-west-1.")
    _report("call-2", second, show_text=True)


def cache_layered_scenario() -> None:
    """Scenario 2 — two breakpoints (rules + reference doc) and a cache key.

    Layered breakpoints let different request shapes reuse different amounts of
    the prefix. Here every call shares the rules; calls that also send the same
    reference doc reuse that second layer too.
    """
    print("--- scenario: layered (two breakpoints + prompt_cache_key) ---")
    key = "kimi-k3-demo:review-prompt-v1"

    # Layer 1 only: rules cached, no reference doc in the request.
    _report("rules-only", _ask_cached(
        "List the three riskiest parts of any single-Region design.", cache_key=key))

    # Layers 1+2: rules + doc. The doc is new, so this call writes layer 2.
    _report("rules+doc/1", _ask_cached(
        "Given the reference topology, what is the top availability risk?",
        cache_key=key, doc=ARCHITECTURE_DOC))

    # Same two layers, new question -> both layers should be read from cache.
    _report("rules+doc/2", _ask_cached(
        "Given the reference topology, how would you add a read replica safely?",
        cache_key=key, doc=ARCHITECTURE_DOC))


def cache_implicit_scenario() -> None:
    """Scenario 3 — implicit mode vs explicit mode.

    implicit (the default) adds an automatic breakpoint on the latest message on
    top of yours, so a repeated FULL prompt (prefix + same question) can be
    served from cache. explicit uses only your breakpoints, which is what you
    want in an agent loop where the tail changes every turn and you don't want
    automatic writes consuming cache-write budget.

    Measured: implicit call 1 read the 3,478-token prefix and additionally WROTE
    24 tokens (the question, via the automatic breakpoint); call 2 then read
    3,502 = prefix + question. In explicit mode both calls read 3,478 and wrote
    nothing.
    """
    print("--- scenario: implicit vs explicit mode ---")
    question = "Review plan C: DynamoDB global tables with on-demand capacity."

    print("[implicit] automatic breakpoint on the latest message + explicit ones")
    _report("implicit/1", _ask_cached(question, mode="implicit"))
    # Identical full prompt: the automatic breakpoint makes the whole thing
    # eligible, so this can cache more than the prefix alone.
    _report("implicit/2", _ask_cached(question, mode="implicit"))

    print("[explicit] only the breakpoint after the rules is used")
    _report("explicit/1", _ask_cached(question, mode="explicit"))
    _report("explicit/2", _ask_cached(question, mode="explicit"))


def cache_miss_scenario() -> None:
    """Scenario 4 — changing content BEFORE the breakpoint destroys the cache.

    Cache lookup is prefix matching: one edited byte ahead of the breakpoint is
    a different prefix. This is why stable content (instructions, tool defs,
    reference docs) goes first and volatile content (user input, timestamps,
    session ids) goes after the breakpoint.
    """
    print("--- scenario: miss (mutated prefix) ---")
    question = "Review plan D: EKS with a single node group in one AZ."

    _report("baseline", _ask_cached(question))
    _report("same-prefix", _ask_cached(question))

    # Prepend one line to the cached prefix -> different prefix -> miss.
    mutated = "Session id: 7f3a-0b12 (changes every run!)\n" + REVIEW_RULES
    _report("mutated-prefix", _ask_cached(question, rules=mutated))
    print("Note: putting per-session data ahead of the breakpoint costs you "
          "every cache hit — keep it after the breakpoint instead.")


def cache_agent_scenario() -> None:
    """Scenario 5 — a multi-turn agent loop, with a cost estimate.

    This is the shape explicit caching is built for: a long stable brief plus a
    burst of turns inside the >=30 minute TTL window (which resets on each hit).
    """
    print("--- scenario: agent loop (cumulative savings) ---")
    turns = [
        "Turn 1: summarize the review rules you must apply, in one line.",
        "Turn 2: review an SQS consumer with no dead-letter queue.",
        "Turn 3: review an S3 bucket with public read enabled for a web app.",
        "Turn 4: review a Lambda that stores DB credentials in an env var.",
    ]

    actual_total = baseline_total = 0.0
    cached_total = written_total = 0
    for index, turn in enumerate(turns, start=1):
        response = _ask_cached(turn, cache_key="kimi-k3-demo:agent-v1")
        total_in, cached, written = _report(f"turn-{index}", response)
        cached_total += cached
        written_total += written
        actual, baseline = _estimate_cost(
            total_in, cached, written, response.usage.output_tokens)
        actual_total += actual
        baseline_total += baseline

    tier = "US CRIS" if MODEL_ID.startswith("us.") else "Global CRIS"
    print(f"\ncached_tokens total: {cached_total}, cache_write_tokens total: {written_total}")
    if baseline_total:
        saved_pct = (baseline_total - actual_total) / baseline_total * 100
        print(f"estimated cost ({tier} list price): ${actual_total:.6f} vs "
              f"${baseline_total:.6f} without caching ({saved_pct:.1f}% saved)")
    print("Cached input tokens also do NOT count against your "
          "input-tokens-per-minute quota.")


CACHE_SCENARIOS = {
    "prefix": cache_prefix_scenario,
    "layered": cache_layered_scenario,
    "implicit": cache_implicit_scenario,
    "miss": cache_miss_scenario,
    "agent": cache_agent_scenario,
}


def prompt_cache_example(scenario: str = "prefix") -> None:
    """Dispatch one of the explicit prompt caching scenarios."""
    if scenario not in CACHE_SCENARIOS:
        sys.exit(f"cache: unknown scenario {scenario!r}; "
                 f"choose from: {', '.join(CACHE_SCENARIOS)}")
    CACHE_SCENARIOS[scenario]()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Moonshot AI Kimi K3 on Amazon Bedrock (bedrock-runtime).",
    )
    parser.add_argument(
        "mode",
        nargs="?",
        default="basic",
        help="Chat Completions: basic | stream | tools | vision. "
             "Responses: responses | responses-stream | responses-tools | "
             "responses-vision | structured | vision-eval. Caching: cache. "
             "Anything else is treated as a prompt for the 'basic' demo.",
    )
    parser.add_argument(
        "extra",
        nargs="*",
        help="For vision modes: IMAGE_PATH [QUESTION ...]. "
             f"For 'cache': scenario name ({' | '.join(CACHE_SCENARIOS)}).",
    )
    args = parser.parse_args()

    print(f"# model={MODEL_ID}  endpoint={BASE_URL}")

    def _image_args() -> tuple[str, str | None]:
        if not args.extra:
            sys.exit(f"{args.mode}: usage: kimi_k3_bedrock.py {args.mode} "
                     "IMAGE_PATH [QUESTION]")
        return args.extra[0], " ".join(args.extra[1:]) or None

    if args.mode == "basic":
        chat_example()
    elif args.mode == "stream":
        stream_chat_example()
    elif args.mode == "tools":
        tool_use_example()
    elif args.mode == "vision":
        vision_example(*_image_args())
    elif args.mode == "responses":
        responses_example()
    elif args.mode == "responses-stream":
        stream_responses_example()
    elif args.mode == "responses-tools":
        responses_tool_use_example()
    elif args.mode == "responses-vision":
        responses_vision_example(*_image_args())
    elif args.mode == "structured":
        structured_output_example()
    elif args.mode == "vision-eval":
        vision_eval_example(args.extra[0] if args.extra else None)
    elif args.mode == "cache":
        prompt_cache_example(args.extra[0] if args.extra else "prefix")
    else:
        # Treat the whole argument as a custom prompt for the basic demo.
        chat_example(" ".join([args.mode, *args.extra]))


if __name__ == "__main__":
    main()
