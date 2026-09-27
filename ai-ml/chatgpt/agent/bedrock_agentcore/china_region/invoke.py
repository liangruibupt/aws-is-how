#!/usr/bin/env python3
"""Invoke the deployed Runtime.

  python invoke.py --selftest                       # Gateway + Browser check, no LLM
  python invoke.py "北京区域的运营方是谁？现在北京时间几点？"
  python invoke.py --session <id> "follow-up question"   # reuse a Runtime session (microVM)
"""
from __future__ import annotations

import json
import time
import uuid

from common import Ctx, load_state, parse_args


def main():
    args = parse_args(__doc__, lambda p: (
        p.add_argument("prompt", nargs="?"),
        p.add_argument("--selftest", action="store_true"),
        p.add_argument("--session", help="runtimeSessionId to reuse (>= 33 chars)"),
        p.add_argument("--user", default="demo-user", help="runtimeUserId (lets the agent get a workload token)")))
    if not (args.selftest or args.prompt):
        raise SystemExit("give a prompt or --selftest")
    ctx = Ctx(args.profile, args.region)
    state = load_state(ctx.region)
    if "runtime_arn" not in state:
        raise SystemExit(f"nothing deployed in {ctx.region}; run deploy.py first")

    payload = {"mode": "selftest"} if args.selftest else {"prompt": args.prompt}
    session_id = args.session or f"china-demo-{uuid.uuid4().hex}"
    dp = ctx.session.client("bedrock-agentcore", config=__import__("botocore.config").config.Config(
        read_timeout=600, retries={"max_attempts": 1}))
    t0 = time.time()
    res = dp.invoke_agent_runtime(agentRuntimeArn=state["runtime_arn"], qualifier="DEFAULT",
                                  runtimeSessionId=session_id, runtimeUserId=args.user,
                                  contentType="application/json", accept="application/json",
                                  payload=json.dumps(payload).encode())
    body = res["response"].read().decode()
    try:
        body = json.dumps(json.loads(body), indent=2, ensure_ascii=False)
    except json.JSONDecodeError:
        pass
    print(body)
    print(f"\n[session {res.get('runtimeSessionId', session_id)} · HTTP {res.get('statusCode')} · "
          f"{time.time() - t0:.1f}s]")


if __name__ == "__main__":
    main()
