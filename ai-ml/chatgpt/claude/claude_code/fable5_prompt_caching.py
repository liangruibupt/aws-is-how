"""
Incremental prompt caching with Claude Fable 5 on the Amazon Bedrock
`bedrock-mantle` endpoint (Anthropic Messages API).

This walks through FOUR sequential calls that build up TWO cache checkpoints:

  Phase 1 — one checkpoint (the system prompt):
    call 1 : system[CP1] + question      -> COLD WRITE of CP1
    call 2 : system[CP1] + question      -> reads CP1

  Phase 2 — add a second, independent checkpoint (a large reference doc):
    call 3 : system[CP1] + doc[CP2] + q  -> reads CP1, COLD WRITE of CP2
    call 4 : system[CP1] + doc[CP2] + q  -> reads CP1 + CP2

Read the usage line of each call:
    cache_write > 0  -> tokens newly written to a checkpoint
    cache_read  > 0  -> tokens reused from an existing checkpoint
Note call 3 does BOTH: it reuses CP1 (system) while writing CP2 (the new doc).

Fable 5 caching limits (AWS model card):
  - Min 1,024 tokens per checkpoint; the Nth checkpoint needs N*1,024 cumulative
    tokens of prefix. Max 4 checkpoints/request. TTL 5 min or 1 hour.
  - Cacheable fields: system, messages, tools.

Cache key = exact bytes of the prefix (tools -> system -> messages). We make the
system prompt AND the reference doc unique PER RUN (random marker) so CP1 and CP2
are genuine cold writes each run, instead of surprise hits from a prior run still
inside the 5-minute TTL.
"""

import os

from anthropic import AnthropicBedrockMantle

REGION = "us-east-1"
MODEL_ID = "anthropic.claude-fable-5"

# Per-run marker so this run's cached prefixes differ from any previous run.
RUN_ID = os.urandom(8).hex()

# --- CP1: a large, STABLE system prompt (must clear the 1,024-token minimum) ---
_BASE_POLICY = """\
You are "AWSCloudGuide", a senior AWS solutions architect assistant. Follow these
operating rules on every answer:

1. Prefer managed, serverless-first services unless a hard constraint rules them
   out. Justify the choice in one sentence.
2. For every architecture, name the specific AWS services, the data flow between
   them, and at least one failure mode with its mitigation.
3. Call out cost drivers explicitly and suggest the cheapest viable option.
4. Security is non-negotiable: IAM least-privilege, encryption at rest and in
   transit, network isolation (VPC, security groups) where relevant.
5. For multi-region designs, address data residency, replication lag, failover.
6. Keep answers concrete: numbered steps and short tables over prose. No filler.
"""
SYSTEM_PROMPT = f"(run {RUN_ID})\n" + (_BASE_POLICY + "\n") * 12

# --- CP2: a large reference doc added in phase 2 (also clears the minimum) ---
_BASE_DOC = """\
ACCOUNT INVENTORY — service: payments-api
  region us-east-1 : ECS Fargate (12 tasks), Aurora PostgreSQL (writer+2 readers),
    ElastiCache Redis (3 shards), SQS (orders), S3 (receipts), KMS CMK rotated 90d.
  region eu-west-1 : ECS Fargate (8 tasks), Aurora global secondary, Redis (2
    shards), SQS (orders-eu), S3 (receipts-eu). Route 53 latency routing in front.
  Constraints: PCI-DSS scope; EU customer data must stay in eu-west-1; RPO 5 min,
    RTO 15 min; current p99 latency 180ms; peak 9k rps; budget owner: platform.
"""
REFERENCE_DOC = f"(run {RUN_ID})\n" + (_BASE_DOC + "\n") * 10

QUESTIONS = [
    "Design a serverless image-upload-and-thumbnail pipeline.",          # call 1
    "Design a serverless clickstream analytics pipeline.",               # call 2
    "Given the inventory above, where is our biggest single point of failure?",  # call 3
    "Given the inventory above, how would you cut the Aurora cost safely?",       # call 4
]


def call(client, label: str, system_blocks, messages) -> str:
    msg = client.messages.create(
        model=MODEL_ID,
        max_tokens=512,
        system=system_blocks,
        messages=messages,
        output_config={"effort": "high"},
    )
    u = msg.usage
    # Total prompt tokens = freshly-processed (input) + reused (cache_read) +
    # newly-cached (cache_write). On a cache hit, almost all of `total` lands in
    # cache_read and `input` stays tiny — i.e. nothing is reprocessed.
    total = u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens
    print(
        f"[{label}] "
        f"input={u.input_tokens} "
        f"cache_write={u.cache_creation_input_tokens} "
        f"cache_read={u.cache_read_input_tokens} "
        f"total_prompt={total} "
        f"output={u.output_tokens}"
    )
    return "".join(b.text for b in msg.content if b.type == "text")


def run() -> None:
    client = AnthropicBedrockMantle(aws_region=REGION)

    # CP1 lives on the (only) system block. It stays byte-identical all 4 calls,
    # so it is written once (call 1) and read on calls 2, 3, 4.
    system_blocks = [
        {"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}
    ]

    print(f"=== incremental prompt caching — run {RUN_ID} ===")

    print("\n-- Phase 1: system prompt only (1 checkpoint) --")
    # System is cached; the user question varies and is NOT cached.
    call(client, "call 1  write CP1", system_blocks,
         [{"role": "user", "content": QUESTIONS[0]}])
    call(client, "call 2  read  CP1", system_blocks,
         [{"role": "user", "content": QUESTIONS[1]}])

    print("\n-- Phase 2: add reference doc as a 2nd checkpoint (CP2) --")
    # The doc block carries CP2 and is byte-identical across calls 3 & 4, so the
    # question after it can vary while CP2 still hits. CP1 (system) keeps hitting.
    def phase2_messages(question: str):
        return [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": REFERENCE_DOC,
                        "cache_control": {"type": "ephemeral"},  # CP2
                    },
                    {"type": "text", "text": question},  # varies, uncached
                ],
            }
        ]

    call(client, "call 3  read CP1 / write CP2", system_blocks,
         phase2_messages(QUESTIONS[2]))
    call(client, "call 4  read CP1 + CP2       ", system_blocks,
         phase2_messages(QUESTIONS[3]))


if __name__ == "__main__":
    run()
