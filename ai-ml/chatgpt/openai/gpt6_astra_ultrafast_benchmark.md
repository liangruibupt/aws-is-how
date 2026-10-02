# GPT-6 Astra UltraFast on Amazon Bedrock

Probes actual API behavior and compares `service_tier="ultrafast"` against
`service_tier="default"` using the same model, endpoint, reasoning effort and
output limit. This is a billable experiment, not a load test.

The [2026-10-02 measured report](ultrafast_results_20261002/report.md) includes
the observed API support matrix, formal paired measurements, full synthetic
answers, and a separately retained truncated pilot.

## Setup

Python 3.10+:

```bash
pip install -U openai boto3
export AWS_BEARER_TOKEN_BEDROCK="<your Bedrock API key>"
```

`BEDROCK_API_KEY` and `OPENAI_API_KEY` are fallbacks, in that order. Supply a
**Bedrock** key, not an OpenAI-direct key. Keys are never written to results.
The script deliberately does not inherit `OPENAI_BASE_URL`: every target is
an explicit AWS HTTPS endpoint. Converse probes use the same bearer credential.

## Run

```bash
# API matrix, including the documented negative control in Oregon.
python gpt6_astra_ultrafast_benchmark.py probe --converse --out /tmp/astra-probe

# Native Converse only (plus invalid-tier control).
python gpt6_astra_ultrafast_benchmark.py probe --probe-routes runtime-us \
  --probe-apis converse --out /tmp/astra-converse

# 2 workloads x 2 repeats x 2 tiers, plus 2 short warm-ups.
python gpt6_astra_ultrafast_benchmark.py benchmark \
  --route runtime-us --repeats 2 --effort high \
  --max-output-tokens 24576 --out /tmp/astra-benchmark

# Both stages; choose a new output directory each run.
python gpt6_astra_ultrafast_benchmark.py all --converse --out /tmp/astra-all

# Offline tests, no AWS calls.
python -m unittest -v test_gpt6_astra_ultrafast_benchmark.py
```

The benchmark defaults to high reasoning effort. Astra rejects `none`; supported
efforts observed on Bedrock are `low`, `medium`, `high`, `xhigh`, and `max`.
Do not use low-output trivia to draw speed conclusions: short arithmetic is
used only for API compatibility checks and connection warm-up.

At the published short-context US CRIS prices, the default benchmark's maximum
**output-only** charge is approximately $37.85 if all 8 requests consume their
24576-token cap. Actual use is typically lower; inputs and probes cost extra.
The cap includes hidden reasoning tokens. UltraFast token prices are 6x
Standard, so 6x speed does not imply the same cost per task.
Use `--repeats 1 --workloads portfolio` for a smaller initial run.
An initial 12288-token pilot truncated both tiers on the portfolio task because
reasoning alone consumed about 10000 tokens. Those samples must not be counted
as successful completions; the larger default cap leaves room for the answer.

## Coverage

| Route | Endpoint region | Model |
|---|---|---|
| runtime-us | bedrock-runtime, us-east-1 | us.openai.gpt-6-astra |
| runtime-global | bedrock-runtime, us-east-1 | global.openai.gpt-6-astra |
| mantle-east | bedrock-mantle, us-east-1 | openai.gpt-6-astra |
| mantle-west | bedrock-mantle, us-west-2 | openai.gpt-6-astra |

Each route is probed with both tiers using Responses and Chat Completions,
streaming and non-streaming. An invalid-tier negative control tests parameter
validation. Optional native Converse probes test `serviceTier.type`; support
there must not be inferred from support on the OpenAI-compatible API.
The published Mantle Oregon limitation is tested, not silently routed elsewhere.
This matrix does not test WebSockets, image inputs, tool calling, JSON Schema,
long-context pricing, quotas under load, or every AWS source Region.

HTTP 200 is not sufficient proof of the actual serving tier. The script
records the final response's `service_tier`, any streamed tier observations,
HTTP status and request ID. Missing tier data is **unconfirmed**; a different
tier is a **mismatch**. No automatic retries, tier fallback or region fallback
are used. Errors are evidence of this account/route/request at the test time,
not necessarily global service unavailability.

## Workloads and Controls

- **Portfolio optimization:** 14 binary project choices, resource limits,
  dependencies, conflicts, pair bonuses, penalties and deterministic tie-breaking.
  Requests a formulation, optimum, audit, alternatives, runnable solver and
  sensitivity discussion. A local exhaustive search checks the original problem's
  reported optimum and resource totals. It does not validate every explanatory claim.
- **DAG scheduler:** complete resource-constrained scheduling implementation,
  complexity analysis, at least 12 tests and a numerical trace. Generated code
  is saved as text and is **not executed** by the harness. Performance eligibility
  does not imply implementation correctness on this workload.
- Sequential pairs alternate order across tasks and rounds. Both tiers share
  the identical substantive prompt, effort, limits and route.
- A fixed-length unique nonce at the beginning of each request reduces automatic
  prompt-cache reuse. Input and cached-token usage are retained. Cache bypass is
  not guaranteed, and results should be checked for cache asymmetry.
- Two short, unscored warm-ups establish tier support and reusable HTTPS connections.
  This is not a controlled server-side cold-start experiment.

## Metrics and Exclusions

- **Total time:** client call start through terminal response receipt.
- **TTFT:** first nonempty visible text delta, not `response.created` or other
  metadata. Includes queueing, input processing, hidden reasoning and networking.
  It is not an isolated measurement of reasoning speed.
- **Effective output tokens/s:** server-reported output tokens / total time.
  Output tokens include hidden reasoning; this is an end-to-end throughput measure.
- **Approximate visible decode tokens/s:** `(output_tokens - reasoning_tokens)`
  / `(last_text_delta_time - first_text_delta_time)`. Chunk boundaries and network
  buffering make this approximate. Missing reasoning usage or a single-chunk
  response leaves the estimate unknown, never guessed.
- **Paired speedup:** default total time / UltraFast total time.
  **Latency reduction:** `100 * (1 - UltraFast / default)`.
  Per-task summaries use medians of paired ratios; overall total speedup uses
  the geometric mean of paired ratios.

Only completed, tier-confirmed samples with at least 1000 visible tokens and
a passing portfolio check (where applicable) are eligible. Both sides of the
same task/round must qualify. Failed, short, wrong-answer, truncated and
unconfirmed requests remain in raw results but are excluded from comparisons.
The final Responses text snapshot is also checked against the concatenated
stream, to detect duplicated or missing text deltas.
Exit code 2 signals failed preflight or missing eligible benchmark pairs;
probe mode itself exits successfully even when negative controls are rejected.

Small samples are descriptive. Inspect individual results, output lengths,
reasoning-token counts, cached-token counts and ordering before claiming an
inference-speed improvement. High reasoning effort does not guarantee identical
reasoning-token counts. Neither HTTP/SSE timing nor token rates expose pure
server-side GPU inference time.

## Artifacts

- `config.json`: public configuration, script SHA-256 and dependency version, no credentials.
- `workloads.json`: exact substantive prompts.
- `results.jsonl`: one record per call with timestamps, metrics, errors, full
  answer text, usage, returned tier and portfolio validation.
- `summary.json`: matched-pair ratios and per-task medians.
- `report.md`: readable compatibility matrix and performance tables.

The output directory must be new to prevent accidental overwrite. Files are
updated after every completed call, so earlier samples survive interruption.
Do not commit credentials. Review error text and outputs before publishing raw
artifacts from tests using sensitive prompts.

## References

Checked 2026-10-02:

- [AWS announcement, September 30, 2026](https://aws.amazon.com/about-aws/whats-new/2026/09/openai-gpt-6-astra-ultrafast-on-amazon-bedrock/)
- [Bedrock GPT-6 Astra model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-openai-gpt-6-astra.html)
- [Native Bedrock ServiceTier schema](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ServiceTier.html)

The fetched model card lists UltraFast through US and Global CRIS on runtime,
and regional Mantle in us-east-1. Search-index snippets may lag that page.
The generic native `ServiceTier` schema lists default/priority/flex/reserved;
the probe records actual Converse behavior instead of assuming parity.
