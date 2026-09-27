"""Shared settings for deploy.py / invoke.py / cleanup.py."""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import boto3

HERE = Path(__file__).resolve().parent
STATE_FILE = HERE / ".deploy_state.json"

PREFIX = "china_agent_demo"          # Runtime names allow [a-zA-Z0-9_]
GATEWAY_NAME = "china-agent-demo-gw"  # Gateway names allow hyphens
TARGET_NAME = "china-tools"
LAMBDA_NAME = "china-agent-demo-tools"
LAMBDA_ROLE = "ChinaAgentDemoLambdaRole"
GATEWAY_ROLE = "AmazonBedrockAgentCoreChinaDemoGatewayRole"
RUNTIME_ROLE = "AmazonBedrockAgentCoreChinaDemoRuntimeRole"
API_KEY_PROVIDER = "china-agent-demo-llm-key"


def parse_args(description: str, extra=None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description=description)
    p.add_argument("--profile", default="china_ruiliang")
    p.add_argument("--region", default="cn-north-1", choices=["cn-north-1", "cn-northwest-1"])
    if extra:
        extra(p)
    return p.parse_args()


class Ctx:
    def __init__(self, profile: str, region: str):
        self.session = boto3.Session(profile_name=profile, region_name=region)
        self.region = region
        ident = self.session.client("sts").get_caller_identity()
        self.account = ident["Account"]
        self.partition = ident["Arn"].split(":")[1]  # aws-cn
        self.bucket = f"bedrock-agentcore-code-{self.account}-{region}"

    def client(self, name: str):
        return self.session.client(name)

    def arn(self, service: str, resource: str, region: str | None = None, account: str | None = None) -> str:
        return (f"arn:{self.partition}:{service}:{self.region if region is None else region}:"
                f"{self.account if account is None else account}:{resource}")


def load_state(region: str) -> dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text()).get(region, {})
    return {}


def save_state(region: str, state: dict) -> None:
    all_state = json.loads(STATE_FILE.read_text()) if STATE_FILE.exists() else {}
    all_state[region] = state
    STATE_FILE.write_text(json.dumps(all_state, indent=2))


def wait_for(fetch, ok=("READY",), bad=("FAILED", "CREATE_FAILED", "UPDATE_FAILED"), what="resource",
             timeout=900, interval=5) -> dict:
    t0 = time.time()
    while True:
        res = fetch()
        status = res.get("status")
        if status in ok:
            return res
        if status in bad:
            raise RuntimeError(f"{what} {status}: {res.get('failureReason') or res.get('statusReasons')}")
        if time.time() - t0 > timeout:
            raise TimeoutError(f"{what} still {status} after {timeout}s")
        print(f"  … {what} {status}")
        time.sleep(interval)
