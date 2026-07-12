#!/usr/bin/env python3
"""
GPT-5.5 Streaming Repetition Bug Test Script

Tests whether the Bedrock GPT-5.5 Responses API streaming has the "cumulative
repetition" bug — where each delta contains all prior content (snowball pattern)
or adjacent chunks are duplicated.

Tests cover:
  1. stream=True parameter style (short + long output)
  2. client.responses.stream() context manager style
  3. Multi-turn conversation with Chinese output + reasoning replay

SETUP:
    export OPENAI_API_KEY="<YOUR_BEDROCK_API_KEY>"
    # or
    export AWS_BEARER_TOKEN_BEDROCK="<YOUR_TOKEN>"

USAGE:
    python gpt55_stream_repetition_test.py          # run all tests
    python gpt55_stream_repetition_test.py test1    # stream=True short
    python gpt55_stream_repetition_test.py test2    # context manager
    python gpt55_stream_repetition_test.py test3    # multi-turn + Chinese
"""

import os
import re
import sys

try:
    from openai import OpenAI
except ImportError:
    sys.exit("The 'openai' package is required. Install it with: pip install -U openai")


# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

REGION = os.getenv("AWS_REGION", "us-east-2")
MODEL_ID = os.getenv("BEDROCK_OPENAI_MODEL_ID", "openai.gpt-5.5")
BASE_URL = os.getenv(
    "OPENAI_BASE_URL",
    f"https://bedrock-mantle.{REGION}.api.aws/openai/v1",
).strip()
API_KEY = (
    os.getenv("OPENAI_API_KEY") or os.getenv("AWS_BEARER_TOKEN_BEDROCK") or ""
).strip()

if not API_KEY:
    sys.exit(
        "No API key found. Set OPENAI_API_KEY or AWS_BEARER_TOKEN_BEDROCK."
    )

client = OpenAI(base_url=BASE_URL, api_key=API_KEY)


# ─────────────────────────────────────────────────────────────────────────────
# Repetition detection helpers
# ─────────────────────────────────────────────────────────────────────────────

def check_repetition(chunks: list[str], full_text: str, test_name: str) -> bool:
    """Run repetition detection checks. Returns True if bug detected."""
    print(f"\n  [{test_name}] Total chunks: {len(chunks)}")
    print(f"  [{test_name}] Total chars: {len(full_text)}")

    issues = []

    # 1. Cumulative repetition: chunk N contains chunk N-1 (snowball)
    cumulative_repeats = 0
    for i in range(1, min(len(chunks), 100)):
        if len(chunks[i]) > 10 and len(chunks[i - 1]) > 10:
            if chunks[i - 1] in chunks[i]:
                cumulative_repeats += 1
    if cumulative_repeats > 2:
        issues.append(
            f"Cumulative repetition: {cumulative_repeats} chunks contain prior chunk"
        )

    # 2. Adjacent duplicate chunks
    dup_count = sum(
        1
        for i in range(1, len(chunks))
        if chunks[i] == chunks[i - 1] and len(chunks[i]) > 3
    )
    if dup_count > 3:
        issues.append(f"Adjacent duplicate chunks: {dup_count}")

    # 3. Regex: 50+ char substring repeated adjacently in final text
    repeated_50 = re.findall(r"(.{50,}?)\1", full_text)
    if repeated_50:
        issues.append(
            f"Regex repetition (50+ chars): {len(repeated_50)} segments"
        )

    # 4. Regex: 80+ char substring repeated
    repeated_80 = re.findall(r"(.{80,}?)\1", full_text)
    if repeated_80:
        issues.append(
            f"Regex repetition (80+ chars): {len(repeated_80)} segments"
        )

    if issues:
        print(f"  ⚠️  REPETITION BUG DETECTED in [{test_name}]!")
        for issue in issues:
            print(f"    - {issue}")
        if repeated_50:
            for r in repeated_50[:3]:
                print(f'    Repeated: "{r[:100]}..."')
        return True
    else:
        print(f"  ✅ [{test_name}] No repetition detected")
        return False


# ─────────────────────────────────────────────────────────────────────────────
# Test 1: stream=True parameter — long output
# ─────────────────────────────────────────────────────────────────────────────

def test1_stream_param() -> bool:
    """stream=True with a prompt that generates long output."""
    print("\n" + "=" * 70)
    print("TEST 1: stream=True parameter (long output)")
    print("=" * 70)

    chunks: list[str] = []
    stream = client.responses.create(
        model=MODEL_ID,
        input=[
            {
                "role": "user",
                "content": (
                    "Write a detailed 10-step guide for setting up a production "
                    "Kubernetes cluster on AWS EKS with security best practices."
                ),
            }
        ],
        reasoning={"effort": "high"},
        stream=True,
    )

    for event in stream:
        if event.type == "response.output_text.delta":
            chunks.append(event.delta)

    full_text = "".join(chunks)
    return check_repetition(chunks, full_text, "test1-stream-param")


# ─────────────────────────────────────────────────────────────────────────────
# Test 2: client.responses.stream() context manager
# ─────────────────────────────────────────────────────────────────────────────

def test2_context_manager() -> bool:
    """Context manager style streaming."""
    print("\n" + "=" * 70)
    print("TEST 2: client.responses.stream() context manager")
    print("=" * 70)

    chunks: list[str] = []

    with client.responses.stream(
        model=MODEL_ID,
        input=[
            {
                "role": "user",
                "content": "Explain the CAP theorem with real-world AWS examples. Be thorough.",
            }
        ],
        reasoning={"effort": "high"},
    ) as stream:
        for event in stream:
            if event.type == "response.output_text.delta":
                chunks.append(event.delta)
        final = stream.get_final_response()

    full_text = "".join(chunks)
    print(f"  Status: {final.status}, Output tokens: {final.usage.output_tokens}")
    return check_repetition(chunks, full_text, "test2-context-manager")


# ─────────────────────────────────────────────────────────────────────────────
# Test 3: Multi-turn + Chinese + reasoning replay
# ─────────────────────────────────────────────────────────────────────────────

def test3_multiturn_chinese() -> bool:
    """Multi-turn conversation with Chinese and encrypted reasoning replay."""
    print("\n" + "=" * 70)
    print("TEST 3: Multi-turn + Chinese + reasoning replay")
    print("=" * 70)

    # First turn (non-streaming to get reasoning content)
    resp1 = client.responses.create(
        model=MODEL_ID,
        input=[
            {
                "role": "user",
                "content": "用中文详细解释 Amazon Bedrock AgentCore 的架构设计和最佳实践",
            }
        ],
        reasoning={"effort": "high"},
        include=["reasoning.encrypted_content"],
    )
    print(f"  Turn 1 done: {len(resp1.output_text)} chars, status={resp1.status}")

    # Second turn: replay first response output + ask follow-up, streaming
    input_list = [
        {
            "role": "user",
            "content": "用中文详细解释 Amazon Bedrock AgentCore 的架构设计和最佳实践",
        },
    ]
    input_list += resp1.output  # includes encrypted reasoning
    input_list.append(
        {
            "role": "user",
            "content": "继续深入分析 Memory 和 Identity 模块的实现细节，给出代码示例",
        }
    )

    print("  Starting Turn 2 streaming...")
    chunks: list[str] = []
    stream = client.responses.create(
        model=MODEL_ID,
        input=input_list,
        reasoning={"effort": "high"},
        include=["reasoning.encrypted_content"],
        stream=True,
    )

    for event in stream:
        if event.type == "response.output_text.delta":
            chunks.append(event.delta)

    full_text = "".join(chunks)
    return check_repetition(chunks, full_text, "test3-multiturn-chinese")


# ─────────────────────────────────────────────────────────────────────────────
# Test 4: output_item.done message frame accumulation (THE REAL BUG PATH)
#
# Key insights for reproducing:
#   1. Listen to `response.output_item.done` where item.type == "message"
#      (NOT output_text.delta — deltas are incremental and always correct)
#   2. Each message frame is a FULL-TEXT SNAPSHOT, not a delta
#   3. Detection: check if frame[i] is a prefix of frame[i+1] (progressive snapshot)
#   4. Trigger: reasoning=high + long Chinese output (2000+ chars) + multi-turn
#   5. Filter out type=="reasoning" frames (they have empty text, don't count)
# ─────────────────────────────────────────────────────────────────────────────

def _extract_message_text(item) -> str:
    """Extract full text from an output_item.done message item."""
    text_content = ""
    content_parts = getattr(item, "content", [])
    for part in content_parts:
        part_type = getattr(part, "type", None)
        if part_type == "output_text":
            text_content += getattr(part, "text", "")
        elif part_type == "text":
            text_content += getattr(part, "text", "")
    return text_content


def test4_output_item_done_snapshots() -> bool:
    """
    Reproduce the "复读" bug via output_item.done message frame accumulation.

    Bug mechanism:
      - output_item.done with type="message" carries a FULL-TEXT SNAPSHOT
      - Long outputs produce multiple done frames: each is a progressive snapshot
        frame[0] = "AAAA"
        frame[1] = "AAAABBBB"         (includes frame[0])
        frame[2] = "AAAABBBBCCCC"     (includes frame[0]+[1])
      - Naive concatenation: "AAAA" + "AAAABBBB" + "AAAABBBBCCCC" => 复读!
      - Correct fix: _dedup_snapshot_messages or use only the LAST frame

    Trigger conditions:
      - reasoning={"effort": "high"} (more reasoning → more output items)
      - Long output (2000+ Chinese chars)
      - Multi-turn with reasoning replay maximizes frame count
    """
    print("\n" + "=" * 70)
    print("TEST 4: output_item.done message frames — SNAPSHOT BUG PATH")
    print("=" * 70)
    print("  Listening to: response.output_item.done (type='message' only)")
    print("  Filtering out: type='reasoning' empty frames")
    print("  Detection: inter-frame prefix relationship")
    print()

    # ─── Prompt designed to force long output ─────────────────────────────
    prompt = (
        "请用中文撰写一篇详细的技术文章（至少3000字），主题是：\n"
        "《基于 Amazon Bedrock AgentCore 构建企业级多 Agent 协作系统的完整架构设计》\n\n"
        "要求包含以下章节，每个章节都必须有具体的 Python/YAML 代码示例：\n"
        "1. 系统架构总览（含 ASCII 架构图）\n"
        "2. Agent 编排层设计（Strands SDK 代码示例）\n"
        "3. Memory 持久化方案（含 DynamoDB schema 和读写代码）\n"
        "4. Identity & 权限管理（OBO Token Exchange 流程代码）\n"
        "5. MCP Server 集成模式（AgentCore Gateway 配置）\n"
        "6. 可观测性与调试（OpenTelemetry 集成代码）\n"
        "7. 生产部署最佳实践（CDK/CloudFormation 模板片段）\n"
        "8. 成本优化策略（含计算公式和对比表格）\n\n"
        "文章要求信息密度高、代码完整可运行、中文表述专业。"
    )

    # ─── Phase 1: Single-turn long output ─────────────────────────────────
    print("  Phase 1: Single-turn, reasoning=high, long Chinese output")

    message_frames: list[str] = []   # ONLY type="message" frames with text
    all_done_events: list[dict] = []  # all events for debugging
    delta_texts: list[str] = []       # incremental deltas (correct baseline)

    stream = client.responses.create(
        model=MODEL_ID,
        input=[{"role": "user", "content": prompt}],
        reasoning={"effort": "high"},
        stream=True,
    )

    for event in stream:
        if event.type == "response.output_text.delta":
            delta_texts.append(event.delta)

        elif event.type == "response.output_item.done":
            item = event.item
            item_type = getattr(item, "type", None)

            # KEY: only collect type="message" frames, skip "reasoning" empty frames
            if item_type == "message":
                text = _extract_message_text(item)
                all_done_events.append({
                    "type": item_type,
                    "text_len": len(text),
                })
                if text:  # non-empty message frame
                    message_frames.append(text)
            else:
                # Log reasoning/other frames but don't include in analysis
                all_done_events.append({
                    "type": item_type,
                    "text_len": 0,
                    "note": "filtered out (not message type)",
                })

    # ─── Phase 1 results ──────────────────────────────────────────────────
    correct_text = "".join(delta_texts)
    naive_concat = "".join(message_frames)

    print(f"    output_item.done total events: {len(all_done_events)}")
    print(f"    message frames (with text):    {len(message_frames)}")
    print(f"    reasoning/other frames:        "
          f"{sum(1 for e in all_done_events if e['type'] != 'message')}")
    print(f"    Delta-based correct length:    {len(correct_text)} chars")
    print(f"    Naive concat length:           {len(naive_concat)} chars")
    print()

    # Frame size progression
    if message_frames:
        print("    Message frame sizes:")
        for i, frame in enumerate(message_frames):
            preview = frame[:80].replace("\n", "\\n")
            print(f"      frame[{i}]: {len(frame):>6} chars | \"{preview}...\"")
    print()

    # ─── Bug detection: inter-frame prefix relationship ───────────────────
    bug_detected = False

    if len(message_frames) > 1:
        # Core check: does frame[i+1].startswith(frame[i])?
        prefix_pairs = sum(
            1 for a, b in zip(message_frames, message_frames[1:])
            if a and b and len(b) > len(a) and b.startswith(a)
        )

        print(f"    Prefix pairs detected: {prefix_pairs} / {len(message_frames) - 1}")

        if prefix_pairs > 0:
            bug_detected = True
            print("    ⚠️  PROGRESSIVE SNAPSHOT CONFIRMED!")
            print("       Each frame is a full-text snapshot that includes prior frames.")
            print("       Naive concatenation will produce 复读 (repeated content).")
            print()

            # Show the damage
            ratio = len(naive_concat) / max(len(correct_text), 1)
            print(f"    Repetition ratio: {ratio:.2f}x")
            print(f"      naive_concat ({len(naive_concat)} chars) vs "
                  f"correct ({len(correct_text)} chars)")

            if ratio > 1.5:
                print(f"    🔥 Severe: {ratio:.1f}x bloat — unmistakable 复读 in UI")
            elif ratio > 1.1:
                print(f"    ⚠️  Moderate: {ratio:.1f}x bloat — visible repetition")
            else:
                print(f"    ℹ️  Mild: only 2-frame overlap, may look like minor stutter")

            # Show the fix
            print()
            print("    ─── FIX: use only the LAST message frame ───")
            last_frame = message_frames[-1]
            print(f"    Last frame length: {len(last_frame)} chars")
            matches_delta = last_frame == correct_text
            print(f"    Matches delta-based text: {matches_delta}")
            if not matches_delta:
                common = os.path.commonprefix([last_frame, correct_text])
                print(f"    Common prefix: {len(common)} chars "
                      f"(diverges at char {len(common)})")
        else:
            print("    ℹ️  Multiple frames but no prefix relationship — "
                  "frames may be independent output items (not progressive snapshots).")
    else:
        print("    ℹ️  Only 0–1 message frames — output fit in single frame.")
        print("       Bug requires multiple progressive frames to manifest.")
        print("       Try: even longer output, or multi-turn with reasoning replay.")

    # ─── Phase 2 (optional): multi-turn reasoning replay ──────────────────
    if not bug_detected and len(message_frames) <= 1:
        print()
        print("  Phase 2: Multi-turn with reasoning replay (escalate)")
        try:
            # First turn: get reasoning content
            resp1 = client.responses.create(
                model=MODEL_ID,
                input=[{"role": "user", "content": prompt}],
                reasoning={"effort": "high"},
                include=["reasoning.encrypted_content"],
            )

            # Second turn: replay reasoning + ask for continuation
            input_list = [{"role": "user", "content": prompt}]
            input_list += resp1.output
            input_list.append({
                "role": "user",
                "content": (
                    "继续补充第 6-8 章节的详细内容，每章至少800字，"
                    "包含完整的代码示例和部署配置。"
                ),
            })

            message_frames_t2: list[str] = []
            delta_texts_t2: list[str] = []

            stream2 = client.responses.create(
                model=MODEL_ID,
                input=input_list,
                reasoning={"effort": "high"},
                include=["reasoning.encrypted_content"],
                stream=True,
            )

            for event in stream2:
                if event.type == "response.output_text.delta":
                    delta_texts_t2.append(event.delta)
                elif event.type == "response.output_item.done":
                    item = event.item
                    if getattr(item, "type", None) == "message":
                        text = _extract_message_text(item)
                        if text:
                            message_frames_t2.append(text)

            correct_t2 = "".join(delta_texts_t2)
            naive_t2 = "".join(message_frames_t2)

            print(f"    Turn 2 message frames: {len(message_frames_t2)}")
            print(f"    Turn 2 correct length: {len(correct_t2)} chars")
            print(f"    Turn 2 naive concat:   {len(naive_t2)} chars")

            if len(message_frames_t2) > 1:
                prefix_pairs_t2 = sum(
                    1 for a, b in zip(message_frames_t2, message_frames_t2[1:])
                    if a and b and len(b) > len(a) and b.startswith(a)
                )
                if prefix_pairs_t2 > 0:
                    bug_detected = True
                    ratio = len(naive_t2) / max(len(correct_t2), 1)
                    print(f"    ⚠️  MULTI-TURN PROGRESSIVE SNAPSHOT CONFIRMED!")
                    print(f"    Prefix pairs: {prefix_pairs_t2}")
                    print(f"    Repetition ratio: {ratio:.2f}x")

        except Exception as e:
            print(f"    Phase 2 failed: {e}")

    # ─── Final verdict ────────────────────────────────────────────────────
    print()
    if bug_detected:
        print("  ⚠️  [test4] SNAPSHOT ACCUMULATION BUG CONFIRMED")
        print("     Root cause: output_item.done message frames are full-text")
        print("     snapshots, not incremental deltas.")
        print("     Fix options:")
        print("       a) Use output_text.delta for streaming (always correct)")
        print("       b) Only use the LAST output_item.done message frame")
        print("       c) _dedup_snapshot_messages: strip known prefix from each frame")
    elif len(message_frames) <= 1:
        print("  ⏸️  [test4] INCONCLUSIVE — output stayed in single frame.")
        print("     The bug requires multi-frame progressive snapshots.")
    else:
        print("  ✅ [test4] No snapshot accumulation — frames are independent.")

    return bug_detected


# ─────────────────────────────────────────────────────────────────────────────
# Test 5: Discriminating test — is delta path also bloated?
#
# The paradox from test4: if naive_concat == delta_joined == 1.3M, but
# last_frame == 50K, then EVEN the delta path is emitting cumulative snapshots
# rather than true incremental deltas. This is a MORE SEVERE bug than just
# output_item.done being misused.
#
# This test measures 4 lengths to disambiguate:
#   A) delta_joined = sum of all output_text.delta events
#   B) naive_concat = sum of all output_item.done message frames
#   C) final.output_text = SDK's official reconstruction
#   D) last_frame = last output_item.done message frame (expected true answer)
#
# Diagnosis:
#   - If A ≈ D ≈ 50K: delta path is correct, SDK dedupes properly
#   - If A ≈ B >> D:   delta path is ALSO bloated (severe endpoint bug)
# ─────────────────────────────────────────────────────────────────────────────

def test5_delta_path_bloat_discriminator() -> bool:
    """
    Discriminating test: does the output_text.delta path also emit cumulative
    snapshots (not true increments) under reasoning=high + long output?

    Compares 4 key measurements:
      A) delta_joined: all output_text.delta concatenated
      B) naive_concat: all output_item.done message frames concatenated
      C) final.output_text: SDK official reconstruction (get_final_response)
      D) last_frame: last message frame only (expected correct answer length)

    If A ≈ B >> D, the delta path itself is bloated — a severe endpoint-level bug.
    """
    print("\n" + "=" * 70)
    print("TEST 5: Delta path bloat discriminator")
    print("=" * 70)
    print("  Question: Is output_text.delta truly incremental, or also bloated?")
    print("  Method: compare delta sum vs last message frame vs SDK output_text")
    print()

    prompt = (
        "请用中文撰写一篇详细的技术文章（至少3000字），主题是：\n"
        "《基于 Amazon Bedrock AgentCore 构建企业级多 Agent 协作系统的完整架构设计》\n\n"
        "要求包含以下章节，每个章节都必须有具体的 Python/YAML 代码示例：\n"
        "1. 系统架构总览（含 ASCII 架构图）\n"
        "2. Agent 编排层设计（Strands SDK 代码示例）\n"
        "3. Memory 持久化方案（含 DynamoDB schema 和读写代码）\n"
        "4. Identity & 权限管理（OBO Token Exchange 流程代码）\n"
        "5. MCP Server 集成模式（AgentCore Gateway 配置）\n"
        "6. 可观测性与调试（OpenTelemetry 集成代码）\n"
        "7. 生产部署最佳实践（CDK/CloudFormation 模板片段）\n"
        "8. 成本优化策略（含计算公式和对比表格）\n\n"
        "文章要求信息密度高、代码完整可运行、中文表述专业。"
    )

    delta_texts: list[str] = []
    message_frames: list[str] = []

    # Use context manager to get both events AND final response
    with client.responses.stream(
        model=MODEL_ID,
        input=[{"role": "user", "content": prompt}],
        reasoning={"effort": "high"},
    ) as stream:
        for event in stream:
            if event.type == "response.output_text.delta":
                delta_texts.append(event.delta)
            elif event.type == "response.output_item.done":
                item = event.item
                if getattr(item, "type", None) == "message":
                    text = _extract_message_text(item)
                    if text:
                        message_frames.append(text)

        final = stream.get_final_response()

    # ─── The 4 key measurements ──────────────────────────────────────────
    delta_joined = "".join(delta_texts)
    naive_concat = "".join(message_frames)
    sdk_output_text = final.output_text
    last_frame = message_frames[-1] if message_frames else ""

    len_a = len(delta_joined)
    len_b = len(naive_concat)
    len_c = len(sdk_output_text)
    len_d = len(last_frame)

    print(f"  A) len(delta_joined):        {len_a:>12,} chars")
    print(f"  B) len(naive_concat frames): {len_b:>12,} chars")
    print(f"  C) len(final.output_text):   {len_c:>12,} chars")
    print(f"  D) len(last message frame):  {len_d:>12,} chars")
    print(f"  E) num message frames:       {len(message_frames):>12}")
    print(f"  F) num delta chunks:         {len(delta_texts):>12}")
    print()

    # ─── Ratios ───────────────────────────────────────────────────────────
    if len_d > 0:
        ratio_a = len_a / len_d
        ratio_b = len_b / len_d
        ratio_c = len_c / len_d
        print("  Ratios (vs last_frame = expected true answer):")
        print(f"    delta / last_frame:        {ratio_a:.2f}x")
        print(f"    naive_concat / last_frame:  {ratio_b:.2f}x")
        print(f"    sdk_output / last_frame:   {ratio_c:.2f}x")
    else:
        ratio_a = ratio_b = ratio_c = 0
        print("  ⚠️  last_frame is empty — cannot compute ratios")
    print()

    # ─── Diagnosis ────────────────────────────────────────────────────────
    print("  ─── DIAGNOSIS ───")
    print()

    bug_detected = False
    tolerance = max(len_d * 0.05, 200)  # 5% or 200 chars tolerance

    # Check: SDK output_text vs last_frame
    if abs(len_c - len_d) < tolerance:
        print("  ✅ final.output_text ≈ last_frame")
        print("     => SDK internally deduplicates message frames correctly.")
    else:
        print(f"  ⚠️  final.output_text ({len_c:,}) ≠ last_frame ({len_d:,})")
        print(f"     => SDK does NOT deduplicate! (ratio: {ratio_c:.1f}x)")

    # Check: delta path vs last_frame (the critical question)
    print()
    if abs(len_a - len_d) < tolerance:
        print("  ✅ delta_joined ≈ last_frame")
        print("     => Delta path is truly incremental. Safe to use for streaming.")
    elif abs(len_a - len_b) < tolerance:
        bug_detected = True
        print("  🔥 SEVERE: delta_joined ≈ naive_concat >> last_frame")
        print(f"     delta={len_a:,}  naive={len_b:,}  true_answer≈{len_d:,}")
        print(f"     Bloat ratio: {ratio_a:.1f}x")
        print()
        print("     CONCLUSION: output_text.delta is NOT truly incremental!")
        print("     The delta events are also emitting cumulative snapshots.")
        print("     This is a bedrock-mantle ENDPOINT BUG affecting ALL paths:")
        print("       - output_text.delta (bloated)")
        print("       - output_item.done message frames (bloated)")
        print("       - final.output_text / SDK reconstruction (bloated)")
        print()
        print("     ONLY SAFE PATH: take the LAST output_item.done message frame.")
    else:
        print(f"  🤔 delta_joined ({len_a:,}) is between")
        print(f"     last_frame ({len_d:,}) and naive_concat ({len_b:,})")
        print("     => Partial bloat or measurement anomaly.")

    # ─── Paradox check ────────────────────────────────────────────────────
    print()
    if abs(len_a - len_b) < tolerance and ratio_a > 2.0:
        print(f"  ⚡ PARADOX CONFIRMED: delta_joined ≈ naive_concat ≈ {len_a:,}")
        print(f"     but true answer (last_frame) is only {len_d:,} chars")
        print(f"     => {ratio_a:.0f}x bloat across ALL consumption paths")

    # ─── Verify last_frame is the correct answer ─────────────────────────
    if message_frames and len(message_frames) > 1:
        # Progressive snapshot check on message frames
        prefix_pairs = sum(
            1 for a, b in zip(message_frames, message_frames[1:])
            if a and b and len(b) > len(a) and b.startswith(a)
        )
        print()
        print(f"  Sanity check: message frame prefix pairs = "
              f"{prefix_pairs}/{len(message_frames)-1}")
        if prefix_pairs == len(message_frames) - 1:
            print("  ✅ All frames are strict progressive snapshots.")
            print(f"     Last frame ({len_d:,} chars) IS the complete correct answer.")

    # ─── Final verdict ────────────────────────────────────────────────────
    print()
    if bug_detected:
        print("  ⚠️  [test5] SEVERE ENDPOINT BUG CONFIRMED")
        print("     ALL streaming paths (delta, done, SDK) are bloated.")
        print("     Root cause: bedrock-mantle emits cumulative snapshots,")
        print("     not true incremental deltas, for long reasoning outputs.")
        print()
        print("     Workaround: consume output_item.done, keep only the LAST")
        print("     message frame as the true final answer.")
        print()
        print("     Trigger conditions:")
        print("       - reasoning={'effort': 'high'}")
        print("       - Long output (2000+ chars Chinese)")
        print("       - Multiple reasoning/message interleaving rounds")
    else:
        print("  ✅ [test5] Delta path is clean — no endpoint-level bloat.")

    return bug_detected


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    print(f"Model: {MODEL_ID}")
    print(f"Endpoint: {BASE_URL}")

    tests = {
        "test1": test1_stream_param,
        "test2": test2_context_manager,
        "test3": test3_multiturn_chinese,
        "test4": test4_output_item_done_snapshots,
        "test5": test5_delta_path_bloat_discriminator,
    }

    # Parse optional arg to run specific test
    if len(sys.argv) > 1 and sys.argv[1] in tests:
        bug_found = tests[sys.argv[1]]()
    else:
        # Run all
        results = []
        for name, fn in tests.items():
            try:
                results.append((name, fn()))
            except Exception as e:
                print(f"\n  ❌ [{name}] FAILED with exception: {e}")
                results.append((name, None))

        print("\n" + "=" * 70)
        print("SUMMARY")
        print("=" * 70)
        for name, bug_found in results:
            if bug_found is None:
                status = "❌ ERROR"
            elif bug_found:
                status = "⚠️  BUG DETECTED"
            else:
                status = "✅ PASS"
            print(f"  {name}: {status}")

        any_bug = any(r for _, r in results if r)
        if any_bug:
            print("\n⚠️  Repetition bug is REPRODUCIBLE in this run.")
        else:
            print("\n✅ No repetition bug detected in this run.")


if __name__ == "__main__":
    main()
