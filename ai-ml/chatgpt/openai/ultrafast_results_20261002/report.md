# Bedrock GPT-6 Astra UltraFast Benchmark

UTC start: 2026-10-02T01:34:39.239022+00:00

## API Support

| Route | API | Requested | HTTP | Returned | Result | Seconds |
|---|---|---|---|---|---|---|
| runtime-us | responses | default | 200 | default | confirmed | 2.70 |
| runtime-us | responses | ultrafast | 200 | ultrafast | confirmed | 1.12 |
| runtime-us | responses-stream | default | 200 | default | confirmed | 1.12 |
| runtime-us | responses-stream | ultrafast | 200 | ultrafast | confirmed | 1.69 |
| runtime-us | chat | default | 200 | default | confirmed | 1.83 |
| runtime-us | chat | ultrafast | 200 | ultrafast | confirmed | 1.14 |
| runtime-us | chat-stream | default | 200 | default | confirmed | 1.10 |
| runtime-us | chat-stream | ultrafast | 200 | ultrafast | confirmed | 1.74 |
| runtime-global | responses | default | 200 | default | confirmed | 1.79 |
| runtime-global | responses | ultrafast | 200 | ultrafast | confirmed | 1.12 |
| runtime-global | responses-stream | default | 200 | default | confirmed | 1.14 |
| runtime-global | responses-stream | ultrafast | 200 | ultrafast | confirmed | 1.73 |
| runtime-global | chat | default | 200 | default | confirmed | 1.93 |
| runtime-global | chat | ultrafast | 200 | ultrafast | confirmed | 1.22 |
| runtime-global | chat-stream | default | 200 | default | confirmed | 1.21 |
| runtime-global | chat-stream | ultrafast | 200 | ultrafast | confirmed | 2.75 |
| mantle-east | responses | default | 200 | default | confirmed | 1.84 |
| mantle-east | responses | ultrafast | 200 | ultrafast | confirmed | 0.94 |
| mantle-east | responses-stream | default | 200 | default | confirmed | 0.96 |
| mantle-east | responses-stream | ultrafast | 200 | ultrafast | confirmed | 2.77 |
| mantle-east | chat | default | 200 | default | confirmed | 1.81 |
| mantle-east | chat | ultrafast | 200 | ultrafast | confirmed | 1.01 |
| mantle-east | chat-stream | default | 200 | default | confirmed | 4.32 |
| mantle-east | chat-stream | ultrafast | 200 | ultrafast | confirmed | 1.52 |
| mantle-west | responses | default | 200 | default | confirmed | 1.58 |
| mantle-west | responses | ultrafast | 400 | - | error | 0.40 |
| mantle-west | responses-stream | default | 200 | default | confirmed | 0.91 |
| mantle-west | responses-stream | ultrafast | 400 | - | error | 0.97 |
| mantle-west | chat | default | 200 | default | confirmed | 0.97 |
| mantle-west | chat | ultrafast | 400 | - | error | 0.40 |
| mantle-west | chat-stream | default | 200 | default | confirmed | 0.89 |
| mantle-west | chat-stream | ultrafast | 400 | - | error | 1.02 |
| runtime-us | responses | invalid-benchmark-tier | 400 | - | error | 1.28 |
| runtime-us | converse | default | 200 | default | confirmed | 2.41 |
| runtime-us | converse | ultrafast | 400 | - | error | 1.37 |
| runtime-us | responses-stream | default | 200 | default | confirmed | 2.14 |
| runtime-us | responses-stream | ultrafast | 200 | ultrafast | confirmed | 1.76 |

## Benchmark Samples

| Task | Round | Tier | Total s | TTFT s | Output | Reasoning | Visible | Approx visible tok/s | Eligible |
|---|---|---|---|---|---|---|---|---|---|
| portfolio | 1 | default | 202.68 | 170.84 | 15178 | 11909 | 3269 | 104.58 | True |
| portfolio | 1 | ultrafast | 71.95 | 62.24 | 15209 | 11870 | 3339 | 356.90 | True |
| scheduler | 1 | ultrafast | 41.61 | 36.06 | 9046 | 5052 | 3994 | 750.15 | True |
| scheduler | 1 | default | 114.76 | 76.17 | 8917 | 4660 | 4257 | 111.28 | True |
| portfolio | 2 | ultrafast | 67.22 | 56.54 | 14033 | 10731 | 3302 | 369.17 | True |
| portfolio | 2 | default | 187.96 | 156.15 | 14057 | 10876 | 3181 | 101.75 | True |
| scheduler | 2 | default | 108.96 | 71.59 | 8299 | 4142 | 4157 | 112.37 | True |
| scheduler | 2 | ultrafast | 40.77 | 31.03 | 8537 | 4436 | 4101 | 431.42 | True |

## Matched-Pair Results

| Task | Pairs | Median total speedup | Median latency reduction | Median TTFT speedup | Median approx decode speedup |
|---|---|---|---|---|---|
| portfolio | 2 | 2.81x | 64.37% | 2.75x | 3.52x |
| scheduler | 2 | 2.72x | 63.16% | 2.21x | 5.29x |

Matched pairs: 4; geometric mean total speedup: 2.76x.

## Interpretation

- HTTP success without a returned matching tier is unconfirmed, not proof of UltraFast.
- TTFT measures first visible text, including reasoning, queueing and network time; not first SSE metadata.
- Effective output tok/s includes reasoning tokens divided by wall time; it is not a pure decode rate.
- Approximate visible decode tok/s excludes reasoning tokens and uses first-to-last text delta time. Chunk boundaries and network buffering introduce error.
- Only completed, tier-confirmed, sufficiently long, quality-passing paired samples enter comparisons.
- Portfolio answers are checked against exhaustive enumeration. Scheduler code is saved for review, NOT executed.
- Repeats are sequential and counterbalanced. Each call starts with a unique nonce to reduce cache reuse; cached tokens are recorded.
- Small samples are descriptive, not statistical proof. Different answer lengths and reasoning budgets remain confounders.
- No automatic retries or tier fallback. Errors and truncated outputs stay in results.jsonl.
- Measurements are client-observed HTTPS/SSE latency, not server-only inference timing.

## Experiment Notes

- Date: 2026-10-02. Client timezone: Asia/Singapore. Requests use public HTTPS endpoints.
- Formal comparison: runtime-us, high reasoning effort, 24576 output-token cap, 2 rounds per workload.
- All 8 formal samples completed, echoed the requested tier, returned zero cached input tokens, and passed the stream/final-text consistency check. All 4 portfolio answers passed the exact oracle.
- The earlier 12288-token pilot truncated both portfolio answers. It was stopped; its samples are preserved separately and excluded from formal statistics. An in-flight call at interruption has no completed usage record.
- An initial Converse attempt failed locally because the SDK client is not a context manager. After fixing cleanup, the native API was retested with the same bearer credential.
- Native Converse default succeeded; ultrafast in serviceTier.type returned an HTTP 400 enum-validation error. This finding concerns that explicit parameter path.
- API support probes use low effort and short arithmetic only for compatibility, never speed claims.
- Pilot and first compatibility probes predate the final script's stream-snapshot consistency check and script-hash/nonce metadata. Formal samples use the final benchmark implementation.

## List-Price Estimate

- Formal recorded calls: $18.1538.
- Compatibility probes: $0.0418.
- Recorded pilot calls: $7.4826.
- These are estimates from usage and published short-context rates, not billing records. Interrupted/unrecorded exploratory calls are excluded.

## Evidence Files

- `probe_results.jsonl`: API matrix, both tiers and negative controls.
- `benchmark_results.jsonl`: formal warm-ups and full benchmark answers.
- `pilot_results.jsonl`: separately retained, excluded pilot records.
- `config.json`, `workloads.json`, `summary.json`: reproducibility and calculations.
