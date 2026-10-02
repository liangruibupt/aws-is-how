#!/usr/bin/env python3
"""Probe Bedrock UltraFast APIs and benchmark paired, reasoning-heavy workloads.

Requires Python 3.10+, openai, boto3 (only for Converse probes).
Credentials: AWS_BEARER_TOKEN_BEDROCK, BEDROCK_API_KEY, or OPENAI_API_KEY.
See gpt6_astra_ultrafast_benchmark.md for methodology and examples.
"""

from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from contextlib import closing
from datetime import datetime, timezone
import hashlib
import importlib.metadata
import itertools
import json
import math
import os
from pathlib import Path
import statistics
import time
import uuid


ROUTES = {
    "runtime-us": ("bedrock-runtime", "us-east-1", "us.openai.gpt-6-astra"),
    "runtime-global": ("bedrock-runtime", "us-east-1", "global.openai.gpt-6-astra"),
    "mantle-east": ("bedrock-mantle", "us-east-1", "openai.gpt-6-astra"),
    "mantle-west": ("bedrock-mantle", "us-west-2", "openai.gpt-6-astra"),
}
TIERS = ("default", "ultrafast")
PROBE_PROMPT = "Compute 17 * 23. Reply with only the integer."
# id, capital cost, engineers, risk, benefit
PROJECTS = [
    ("A", 8, 3, 2, 18), ("B", 11, 4, 3, 27), ("C", 7, 2, 4, 19),
    ("D", 13, 5, 2, 32), ("E", 6, 2, 1, 14), ("F", 9, 3, 5, 24),
    ("G", 12, 4, 3, 29), ("H", 5, 2, 2, 12), ("I", 10, 3, 4, 25),
    ("J", 4, 1, 1, 9), ("K", 14, 5, 3, 34), ("L", 7, 2, 2, 17),
    ("M", 9, 4, 1, 22), ("N", 6, 2, 3, 16),
]


def feasible_portfolio(selected):
    selected = set(selected)
    if not selected <= {p[0] for p in PROJECTS}:
        return None
    rows = [p for p in PROJECTS if p[0] in selected]
    cost, engineers, risk, score = [sum(p[i] for p in rows) for i in range(1, 5)]
    if cost > 57 or engineers > 19 or risk > 18 or not 5 <= len(rows) <= 8:
        return None
    dependencies = {"D": {"A"}, "G": {"B"}, "K": {"E", "J"}, "M": {"H"}}
    if any(p in selected and not required <= selected for p, required in dependencies.items()):
        return None
    if {"C", "F"} <= selected or {"D", "K"} <= selected:
        return None
    if len(selected & {"B", "G", "K"}) < 1 or len(selected & {"C", "I", "N"}) < 2:
        return None
    for pair, bonus in [({"A", "I"}, 7), ({"E", "K"}, 9), ({"H", "M"}, 6), ({"B", "N"}, 5)]:
        if pair <= selected:
            score += bonus
    if {"I", "N"} <= selected:
        score -= 4
    return {"selected": sorted(selected), "score": score, "cost": cost,
            "engineers": engineers, "risk": risk}


def portfolio_oracle():
    candidates = []
    for bits in itertools.product((False, True), repeat=len(PROJECTS)):
        result = feasible_portfolio(p[0] for p, enabled in zip(PROJECTS, bits) if enabled)
        if result:
            candidates.append(result)
    return sorted(candidates, key=lambda p: (-p["score"], p["cost"], p["selected"]))


def workloads():
    table = "\n".join(" ".join(map(str, row)) for row in PROJECTS)
    return {
        "portfolio": f"""Solve this exact constrained project selection problem.
All numbers are synthetic. Do not call tools. Return a carefully checked answer.

ID capital_cost engineers risk base_benefit
{table}

Select 5 to 8 distinct projects. Total capital <= 57, engineers <= 19,
and risk <= 18. Dependencies: D requires A; G requires B; K requires
both E and J; M requires H. C and F cannot coexist; D and K cannot coexist.
Select at least one of B,G,K and at least two of C,I,N.
Objective = sum(base_benefit), plus these once-only pair bonuses:
A+I: 7; E+K: 9; H+M: 6; B+N: 5. Subtract 4 if I and N coexist.
Maximize objective; ties use lower capital cost, then lexicographically
smallest sorted list of IDs.

Provide: 1. A mathematical binary optimization formulation including pair
linearization. 2. The exact optimum and a resource/constraint audit.
3. At least three feasible alternative portfolios with recomputed totals.
4. Runnable standard-library Python exhaustive enumeration code with assertions
and deterministic tie-breaking. 5. Sensitivity analysis when capital changes
to 53 or 61, explaining how to recompute, without inventing unverified optima.
Aim for 1400-1800 words including code. Provide the final solution and a concise
justification, not private internal deliberation. End with one single-line
JSON object prefixed RESULT_JSON: containing exactly selected (sorted IDs),
score, cost, engineers, risk for the original problem.""",
        "scheduler": """Write a production-quality, standard-library-only Python 3.11
implementation and tests for a deterministic resource-constrained DAG scheduler.
Tasks have ID, positive integer duration, positive integer CPU and memory demands,
and zero or more dependency IDs. CPU capacity is 8 and memory capacity is 16.
The graph has up to 10000 tasks and 50000 edges. Reject duplicate IDs,
unknown dependencies, cycles, nonpositive quantities, and infeasible individual
demands. Do not mutate caller inputs.

At any event time, process ALL completions before dispatch. Among ready tasks,
prefer larger critical-path remaining duration (task duration plus maximum
successor path), then lexicographically smaller ID. Scan ready tasks in that
order, starting every task that fits, skipping temporarily oversized tasks.
After dispatch, jump to the next finish event. Handle simultaneous completions,
disconnected components, empty inputs, and adversarial resource fragmentation.
Return start/finish per task, makespan, and time-weighted CPU/memory utilization.
Explain that this is a deterministic heuristic, not an optimality guarantee.

Provide complete Python code, complexity analysis including the ready-list scan,
and at least 12 deterministic unittest cases with assertions for validation,
resource invariants, precedence, tie-breaking, and simultaneous completions.
Include a hand-checked trace for:
A(duration=4,cpu=4,mem=4,deps=[]),
B(3,4,8,[]), C(2,2,4,[A]), D(5,6,8,[A,B]),
E(1,2,4,[B]), F(3,4,8,[C,D,E]).
Aim for 1600-2200 words including code. Do not omit implementations with
ellipsis or pseudocode. Return the implementation and concise justification,
not private internal deliberation. Do not call external tools.""",
    }


def base_url(route):
    endpoint, region, _ = ROUTES[route]
    host = f"{endpoint}.{region}." + ("api.aws" if endpoint == "bedrock-mantle" else "amazonaws.com")
    return f"https://{host}/openai/v1"


def credential():
    for name in ("AWS_BEARER_TOKEN_BEDROCK", "BEDROCK_API_KEY", "OPENAI_API_KEY"):
        if os.environ.get(name, "").strip():
            return name, os.environ[name].strip()
    raise RuntimeError("Set AWS_BEARER_TOKEN_BEDROCK, BEDROCK_API_KEY, or OPENAI_API_KEY to a Bedrock API key.")


def as_dict(value):
    return value.model_dump(exclude_none=True) if hasattr(value, "model_dump") else value


def tier_state(requested, returned):
    if returned is None:
        return "unconfirmed"
    return "confirmed" if returned == requested else "mismatch"


def metrics(usage, elapsed, first_text=None, last_text=None):
    usage = usage or {}
    output = usage.get("output_tokens", usage.get("completion_tokens"))
    details = usage.get("output_tokens_details", usage.get("completion_tokens_details")) or {}
    reasoning = details.get("reasoning_tokens")
    visible = output - reasoning if output is not None and reasoning is not None else None
    window = last_text - first_text if first_text is not None and last_text is not None else None
    return {
        "elapsed_s": elapsed, "ttft_s": first_text,
        "text_window_s": window,
        "input_tokens": usage.get("input_tokens", usage.get("prompt_tokens")),
        "cached_input_tokens": (usage.get("input_tokens_details", usage.get("prompt_tokens_details")) or {}).get("cached_tokens"),
        "output_tokens": output, "reasoning_tokens": reasoning,
        "visible_tokens": visible,
        "effective_output_tps": output / elapsed if output is not None and elapsed > 0 else None,
        # First/last SSE chunks can contain multiple tokens: this is an estimate.
        "visible_decode_tps_approx": visible / window if visible is not None and window and window > 0 else None,
    }


def validate_portfolio(text):
    try:
        line = next(line for line in reversed(text.splitlines()) if line.startswith("RESULT_JSON:"))
        reported = json.loads(line.split(":", 1)[1].strip())
        selected = reported["selected"]
        actual = feasible_portfolio(selected)
        optimum = portfolio_oracle()[0]
        passed = len(selected) == len(set(selected)) and reported == actual == optimum
        return {"passed": passed, "reported": reported, "expected": optimum}
    except (StopIteration, ValueError, KeyError, TypeError):
        return {"passed": False, "reason": "Missing or malformed RESULT_JSON footer."}


def error_record(exc, secret):
    body = getattr(exc, "body", None)
    message = json.dumps(body, ensure_ascii=True) if body else str(exc)
    # Never persist headers or credentials; errors occasionally echo requests.
    return {"type": type(exc).__name__, "message": message.replace(secret, "[REDACTED]")[:4000],
            "http_status": getattr(exc, "status_code", None),
            "request_id": getattr(exc, "request_id", None)}


def invoke(client, route, api, tier, prompt, effort, max_tokens, secret):
    started = time.perf_counter()
    row = {"route": route, "model": ROUTES[route][2], "api": api,
           "requested_tier": tier, "reasoning_effort": effort,
           "max_output_tokens": max_tokens, "ok": False,
           "started_at": datetime.now(timezone.utc).isoformat(),
           "prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest()}
    chunks, events, observed_tiers = [], Counter(), []
    first_event = first_text = last_text = None
    final = {}
    stream = None
    try:
        if api.startswith("responses"):
            kwargs = dict(model=row["model"], service_tier=tier, input=prompt,
                          reasoning={"effort": effort}, max_output_tokens=max_tokens,
                          store=False)
            if api == "responses-stream":
                stream = client.responses.create(**kwargs, stream=True)
                row["http_status"] = stream.response.status_code
                row["request_id"] = stream.response.headers.get("x-request-id") or stream.response.headers.get("x-amzn-requestid")
                for event in stream:
                    now = time.perf_counter() - started
                    first_event = now if first_event is None else first_event
                    data = as_dict(event)
                    kind = data.get("type", "")
                    events[kind] += 1
                    response = data.get("response") or {}
                    if response.get("service_tier"):
                        observed_tiers.append(response["service_tier"])
                    if kind == "response.output_text.delta" and data.get("delta"):
                        first_text = now if first_text is None else first_text
                        last_text = now
                        chunks.append(data["delta"])
                    if kind in ("response.completed", "response.incomplete", "response.failed"):
                        final = response
                        break
                    if kind in ("error", "response.error"):
                        raise RuntimeError(json.dumps(data))
                if not final:
                    raise RuntimeError("Stream ended without a terminal response event.")
            else:
                raw = client.responses.with_raw_response.create(**kwargs)
                row["http_status"] = raw.status_code
                row["request_id"] = raw.headers.get("x-request-id") or raw.headers.get("x-amzn-requestid")
                final = as_dict(raw.parse())
            text = "".join(chunks) if api.endswith("stream") else "".join(
                part.get("text", "") for item in final.get("output", [])
                for part in item.get("content", []) if part.get("type") == "output_text")
            row["status"] = final.get("status")
            row["incomplete_details"] = final.get("incomplete_details")
            row["response_error"] = final.get("error")
            usage = final.get("usage")
            returned = final.get("service_tier")
            terminal_text = "".join(
                part.get("text", "") for item in final.get("output", [])
                for part in item.get("content", []) if part.get("type") == "output_text")
            if api.endswith("stream"):
                row["stream_text_matches_final"] = text == terminal_text
                if text != terminal_text:
                    row["status"] = "stream_text_mismatch"
        else:
            kwargs = dict(model=row["model"], service_tier=tier,
                          messages=[{"role": "user", "content": prompt}],
                          reasoning_effort=effort, max_completion_tokens=max_tokens)
            if api == "chat-stream":
                stream = client.chat.completions.create(**kwargs, stream=True, stream_options={"include_usage": True})
                row["http_status"] = stream.response.status_code
                row["request_id"] = stream.response.headers.get("x-request-id") or stream.response.headers.get("x-amzn-requestid")
                usage, returned, finish = None, None, None
                for event in stream:
                    now = time.perf_counter() - started
                    first_event = now if first_event is None else first_event
                    data = as_dict(event)
                    events["chat.completion.chunk"] += 1
                    if data.get("service_tier"):
                        returned = data["service_tier"]
                        observed_tiers.append(returned)
                    usage = data.get("usage") or usage
                    for choice in data.get("choices", []):
                        delta = choice.get("delta", {}).get("content")
                        if delta:
                            first_text = now if first_text is None else first_text
                            last_text = now
                            chunks.append(delta)
                        finish = choice.get("finish_reason") or finish
                if finish is None:
                    raise RuntimeError("Chat stream ended without finish_reason.")
                text = "".join(chunks)
            else:
                raw = client.chat.completions.with_raw_response.create(**kwargs)
                row["http_status"] = raw.status_code
                row["request_id"] = raw.headers.get("x-request-id") or raw.headers.get("x-amzn-requestid")
                final = as_dict(raw.parse())
                choice = final["choices"][0]
                text = choice["message"].get("content") or ""
                finish, usage = choice["finish_reason"], final.get("usage")
                returned = final.get("service_tier")
            row["status"] = "completed" if finish == "stop" else finish
        elapsed = time.perf_counter() - started
        row.update(metrics(usage, elapsed, first_text, last_text))
        row.update(returned_tier=returned, tier_state=tier_state(tier, returned),
                   usage=usage, response_id=final.get("id"), text=text,
                   text_chars=len(text), first_event_s=first_event,
                   event_counts=dict(events), observed_tiers=sorted(set(observed_tiers)),
                   ok=row["status"] == "completed" and bool(text.strip()))
    except Exception as exc:
        row.update(error=error_record(exc, secret), elapsed_s=time.perf_counter() - started)
    finally:
        if stream is not None:
            stream.close()
    return row


def converse_probe(route, tier, secret):
    import boto3
    from botocore import UNSIGNED
    from botocore.config import Config

    started = time.perf_counter()
    row = {"route": route, "api": "converse", "model": ROUTES[route][2],
           "requested_tier": tier, "ok": False}
    try:
        # Use the SAME bearer credential as the OpenAI-compatible API probes.
        session = boto3.Session(region_name=ROUTES[route][1])
        with closing(session.client("bedrock-runtime", config=Config(
                read_timeout=90, retries={"total_max_attempts": 1},
                signature_version=UNSIGNED))) as client:
            def auth(request, **kwargs):
                request.headers["Authorization"] = f"Bearer {secret}"
            client.meta.events.register("before-send.bedrock-runtime.Converse", auth)
            response = client.converse(
                modelId=row["model"], messages=[{"role": "user", "content": [{"text": PROBE_PROMPT}]}],
                inferenceConfig={"maxTokens": 512},
                additionalModelRequestFields={"reasoning": {"effort": "low"}},
                serviceTier={"type": tier})
        returned = (response.get("serviceTier") or {}).get("type")
        row.update(ok=response.get("stopReason") == "end_turn",
                   status=response.get("stopReason"), returned_tier=returned,
                   tier_state=tier_state(tier, returned), usage=response.get("usage"),
                   http_status=response["ResponseMetadata"]["HTTPStatusCode"],
                   request_id=response["ResponseMetadata"]["RequestId"],
                   text=json.dumps(response.get("output", {})))
    except Exception as exc:
        row["error"] = error_record(exc, secret)
        if hasattr(exc, "response"):
            row["error"]["http_status"] = exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
    row["elapsed_s"] = time.perf_counter() - started
    return row


def eligible(row):
    return (row.get("phase") == "benchmark" and row.get("ok") is True
            and row.get("tier_state") == "confirmed"
            and row.get("quality", {}).get("passed", True)
            and (row.get("visible_tokens") or 0) >= row.get("min_visible_tokens", 1000))


def summarize(rows):
    groups = defaultdict(dict)
    for row in rows:
        if eligible(row):
            groups[(row["route"], row["workload"], row["round"])][row["requested_tier"]] = row
    pairs = []
    for (route, workload, repeat), pair in groups.items():
        if not all(t in pair for t in TIERS):
            continue
        default, fast = pair["default"], pair["ultrafast"]
        item = {"route": route, "workload": workload, "round": repeat,
                "elapsed_speedup": default["elapsed_s"] / fast["elapsed_s"],
                "latency_reduction_pct": 100 * (1 - fast["elapsed_s"] / default["elapsed_s"])}
        for key in ("ttft_s", "effective_output_tps", "visible_decode_tps_approx"):
            a, b = default.get(key), fast.get(key)
            item[key + "_speedup"] = (a / b if key == "ttft_s" else b / a) if a and b else None
        item["visible_token_ratio_ultrafast_default"] = fast["visible_tokens"] / default["visible_tokens"]
        pairs.append(item)
    by_workload = {}
    for workload in sorted({p["workload"] for p in pairs}):
        matched = [p for p in pairs if p["workload"] == workload]
        by_workload[workload] = {"pairs": len(matched)}
        for field in ("elapsed_speedup", "latency_reduction_pct", "ttft_s_speedup",
                      "effective_output_tps_speedup", "visible_decode_tps_approx_speedup",
                      "visible_token_ratio_ultrafast_default"):
            values = [p[field] for p in matched if p.get(field) is not None]
            by_workload[workload]["median_" + field] = statistics.median(values) if values else None
    return {"pairs": pairs, "by_workload": by_workload,
            "benchmark_samples": sum(r.get("phase") == "benchmark" for r in rows),
            "eligible_samples": sum(eligible(r) for r in rows),
            "matched_pairs": len(pairs),
            "geomean_elapsed_speedup": math.exp(statistics.mean(math.log(p["elapsed_speedup"]) for p in pairs)) if pairs else None}


def fmt(value):
    return "-" if value is None else f"{value:.2f}"


def report(rows, config):
    summary = summarize(rows)
    lines = ["# Bedrock GPT-6 Astra UltraFast Benchmark", "",
             f"UTC start: {config['started_at']}", "",
             "## API Support", "",
             "| Route | API | Requested | HTTP | Returned | Result | Seconds |",
             "|---|---|---|---|---|---|---|"]
    for row in rows:
        if row["phase"] not in ("probe", "warmup"):
            continue
        state = row.get("tier_state", "error") if row["ok"] else row.get("status", "error")
        http = row.get("http_status") or row.get("error", {}).get("http_status", "-")
        lines.append(f"| {row['route']} | {row['api']} | {row['requested_tier']} | {http} | "
                     f"{row.get('returned_tier', '-')} | {state} | {fmt(row['elapsed_s'])} |")
    lines += ["", "## Benchmark Samples", "",
              "| Task | Round | Tier | Total s | TTFT s | Output | Reasoning | Visible | Approx visible tok/s | Eligible |",
              "|---|---|---|---|---|---|---|---|---|---|"]
    for row in rows:
        if row["phase"] == "benchmark":
            lines.append(f"| {row['workload']} | {row['round']} | {row['requested_tier']} | "
                         f"{fmt(row['elapsed_s'])} | {fmt(row.get('ttft_s'))} | {row.get('output_tokens', '-')} | "
                         f"{row.get('reasoning_tokens', '-')} | {row.get('visible_tokens', '-')} | "
                         f"{fmt(row.get('visible_decode_tps_approx'))} | {eligible(row)} |")
    lines += ["", "## Matched-Pair Results", "",
              "| Task | Pairs | Median total speedup | Median latency reduction | Median TTFT speedup | Median approx decode speedup |",
              "|---|---|---|---|---|---|"]
    for name, stats in summary["by_workload"].items():
        lines.append(f"| {name} | {stats['pairs']} | {fmt(stats['median_elapsed_speedup'])}x | "
                     f"{fmt(stats['median_latency_reduction_pct'])}% | {fmt(stats['median_ttft_s_speedup'])}x | "
                     f"{fmt(stats['median_visible_decode_tps_approx_speedup'])}x |")
    lines += ["", f"Matched pairs: {summary['matched_pairs']}; geometric mean total speedup: "
              f"{fmt(summary['geomean_elapsed_speedup'])}x.", "",
              "## Interpretation", "",
              "- HTTP success without a returned matching tier is unconfirmed, not proof of UltraFast.",
              "- TTFT measures first visible text, including reasoning, queueing and network time; not first SSE metadata.",
              "- Effective output tok/s includes reasoning tokens divided by wall time; it is not a pure decode rate.",
              "- Approximate visible decode tok/s excludes reasoning tokens and uses first-to-last text delta time. "
              "Chunk boundaries and network buffering introduce error.",
              "- Only completed, tier-confirmed, sufficiently long, quality-passing paired samples enter comparisons.",
              "- Portfolio answers are checked against exhaustive enumeration. Scheduler code is saved for review, NOT executed.",
              "- Repeats are sequential and counterbalanced. Each call starts with a unique nonce to reduce cache reuse; cached tokens are recorded.",
              "- Small samples are descriptive, not statistical proof. Different answer lengths and reasoning budgets remain confounders.",
              "- No automatic retries or tier fallback. Errors and truncated outputs stay in results.jsonl.",
              "- Measurements are client-observed HTTPS/SSE latency, not server-only inference timing.", ""]
    return "\n".join(lines), summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("probe", "benchmark", "all"), nargs="?", default="all")
    parser.add_argument("--route", choices=ROUTES, default="runtime-us", help="Benchmark route; both tiers use this exact route.")
    parser.add_argument("--probe-routes", nargs="+", choices=ROUTES, default=list(ROUTES))
    parser.add_argument("--probe-apis", nargs="+",
                        choices=("responses", "responses-stream", "chat", "chat-stream", "converse"),
                        default=["responses", "responses-stream", "chat", "chat-stream"])
    parser.add_argument("--workloads", nargs="+", choices=workloads(), default=list(workloads()))
    parser.add_argument("--repeats", type=int, default=2)
    parser.add_argument("--effort", choices=("low", "medium", "high", "xhigh", "max"), default="high")
    parser.add_argument("--max-output-tokens", type=int, default=24576)
    parser.add_argument("--min-visible-tokens", type=int, default=1000)
    parser.add_argument("--timeout", type=float, default=600)
    parser.add_argument("--cooldown", type=float, default=2)
    parser.add_argument("--converse", action="store_true", help="Also probe native Converse on runtime-us (or select it in --probe-apis).")
    parser.add_argument("--out", type=Path, default=Path("ultrafast-results") / datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"))
    args = parser.parse_args()
    if args.repeats < 1 or args.max_output_tokens < 512 or args.min_visible_tokens < 1 or args.timeout <= 0 or args.cooldown < 0:
        parser.error("Require repeats >= 1, max-output-tokens >= 512, min-visible-tokens >= 1, timeout > 0, cooldown >= 0.")
    if args.mode != "probe" and args.route == "mantle-west":
        parser.error("mantle-west is a documented negative control, not an UltraFast benchmark route.")
    from openai import OpenAI

    source, secret = credential()
    args.out.mkdir(parents=True, exist_ok=True)
    result_path = args.out / "results.jsonl"
    if result_path.exists():
        parser.error(f"Refusing to overwrite {result_path}; choose a fresh --out directory.")
    config = vars(args).copy()
    config.update(out=str(args.out), credential_source=source,
                  started_at=datetime.now(timezone.utc).isoformat(),
                  openai_version=importlib.metadata.version("openai"),
                  script_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                  routes={name: {"base_url": base_url(name), "model": spec[2]} for name, spec in ROUTES.items()})
    (args.out / "config.json").write_text(json.dumps(config, indent=2) + "\n")
    (args.out / "workloads.json").write_text(json.dumps(workloads(), indent=2) + "\n")
    rows, clients = [], {}

    def client(route):
        if route not in clients:
            clients[route] = OpenAI(api_key=secret, base_url=base_url(route),
                                    max_retries=0, timeout=args.timeout)
        return clients[route]

    def save(row, **tags):
        row.update(tags)
        rows.append(row)
        with result_path.open("a") as file:
            file.write(json.dumps(row, ensure_ascii=True) + "\n")
        markdown, summary = report(rows, config)
        (args.out / "report.md").write_text(markdown)
        (args.out / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
        print(f"{row['phase']:9} {row['route']:14} {row['api']:17} "
              f"{row['requested_tier']:9} {row.get('status', 'error'):12} "
              f"tier={row.get('returned_tier') or '?':9} {row['elapsed_s']:.2f}s "
              f"ttft={fmt(row.get('ttft_s'))} output={row.get('output_tokens', '-')} "
              f"quality={row.get('quality', {}).get('passed', '-')}", flush=True)
        if row.get("error"):
            print("  " + row["error"]["message"][:600], flush=True)
        time.sleep(args.cooldown)

    def call(route, api, tier, prompt, effort="low", limit=512):
        return invoke(client(route), route, api, tier, prompt, effort, limit, secret)

    exit_code = 0
    try:
        if args.mode in ("probe", "all"):
            for route in args.probe_routes:
                for api in args.probe_apis:
                    if api == "converse" and not route.startswith("runtime"):
                        continue
                    for tier in TIERS:
                        row = converse_probe(route, tier, secret) if api == "converse" else call(route, api, tier, PROBE_PROMPT)
                        save(row, phase="probe")
            # Invalid value control distinguishes enum validation from ignored parameters.
            save(call("runtime-us", "responses", "invalid-benchmark-tier", PROBE_PROMPT), phase="probe")
            if args.converse and "converse" not in args.probe_apis:
                for tier in TIERS:
                    save(converse_probe("runtime-us", tier, secret), phase="probe")
        if args.mode in ("benchmark", "all"):
            warmups = []
            for tier in TIERS:
                row = call(args.route, "responses-stream", tier, PROBE_PROMPT)
                save(row, phase="warmup")
                warmups.append(row)
            if not all(row["ok"] and row.get("tier_state") == "confirmed" for row in warmups):
                print("Benchmark skipped: both tiers must pass and be echoed by the server.", flush=True)
                return 2
            # Output-only ceiling: US CRIS short-context published rates; input charges extra.
            n = args.repeats * len(args.workloads)
            ceiling = n * args.max_output_tokens * (55 + 330) / 1_000_000
            print(f"Benchmark: {2*n} requests, effort={args.effort}, cap={args.max_output_tokens}/request. "
                  f"US CRIS output-only cost ceiling ~${ceiling:.2f}; input/probes extra.", flush=True)
            for repeat in range(1, args.repeats + 1):
                for index, name in enumerate(args.workloads):
                    order = TIERS if (repeat + index) % 2 else tuple(reversed(TIERS))
                    for tier in order:
                        nonce = uuid.uuid4().hex
                        prompt = f"Independent run ID: {nonce}. Ignore this ID in your answer.\n\n{workloads()[name]}"
                        row = call(args.route, "responses-stream", tier, prompt, args.effort, args.max_output_tokens)
                        if name == "portfolio" and row.get("text"):
                            row["quality"] = validate_portfolio(row["text"])
                        save(row, phase="benchmark", workload=name, round=repeat,
                             min_visible_tokens=args.min_visible_tokens, prompt_nonce=nonce)
            expected = args.repeats * len(args.workloads)
            if summarize(rows)["matched_pairs"] != expected:
                exit_code = 2
    except KeyboardInterrupt:
        print("\nInterrupted; completed samples are preserved.", flush=True)
        exit_code = 130
    finally:
        for connection in clients.values():
            connection.close()
    print(f"Results: {args.out.resolve() / 'report.md'}", flush=True)
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
