#!/usr/bin/env python3
"""Deploy the China-region AgentCore sample (idempotent: re-running updates in place).

  1. Lambda with two tools                         (gateway_lambda/)
  2. AgentCore Gateway (MCP, AWS_IAM inbound) + Lambda target
  3. Optional AgentCore Identity API-key provider holding the LLM key (from $LLM_API_KEY)
  4. Agent code zip (linux/arm64 wheels) → S3 → AgentCore Runtime (direct code deployment)

The default model is Kimi K3 on Amazon Bedrock (global Region, OpenAI-compatible endpoint). The key is a
Bedrock API key; it is stored in AgentCore Identity, never in Runtime environment variables.

Usage:
  # long-term Bedrock API key (recommended beyond a quick test)
  LLM_API_KEY=ABSK... python deploy.py --profile china_ruiliang --region cn-north-1
  # or mint a short-term (12 h) Bedrock key from a global-Region AWS profile
  python deploy.py --profile china_ruiliang --region cn-north-1 --bedrock-token-profile global_ruiliang
  # any other OpenAI-compatible provider
  LLM_API_KEY=sk-... python deploy.py --llm-base-url https://api.deepseek.com --llm-model deepseek-chat
"""
from __future__ import annotations

import hashlib
import importlib.util
import io
import json
import os
import re
import shutil
import subprocess
import sys
import time
import zipfile
from pathlib import Path

from botocore.exceptions import ClientError

from common import (API_KEY_PROVIDER, GATEWAY_NAME, GATEWAY_ROLE, HERE, LAMBDA_NAME, LAMBDA_ROLE, PREFIX,
                    RUNTIME_ROLE, TARGET_NAME, Ctx, load_state, parse_args, save_state, wait_for)

BUILD = HERE / "build"


def err_code(e: ClientError) -> str:
    return e.response["Error"]["Code"]


# --------------------------------------------------------------------------- IAM
def trust_agentcore(ctx: Ctx) -> dict:
    return {"Version": "2012-10-17", "Statement": [{
        "Effect": "Allow", "Principal": {"Service": "bedrock-agentcore.amazonaws.com"}, "Action": "sts:AssumeRole",
        "Condition": {"StringEquals": {"aws:SourceAccount": ctx.account},
                      "ArnLike": {"aws:SourceArn": ctx.arn("bedrock-agentcore", "*")}}}]}


def ensure_role(ctx: Ctx, name: str, trust: dict, inline: dict | None = None, managed: list[str] = ()) -> str:
    iam = ctx.client("iam")
    try:
        arn = iam.create_role(RoleName=name, AssumeRolePolicyDocument=json.dumps(trust),
                              Description="AgentCore China-region sample")["Role"]["Arn"]
        print(f"  created role {name}")
        fresh = True
    except ClientError as e:
        if err_code(e) != "EntityAlreadyExists":
            raise
        arn = iam.get_role(RoleName=name)["Role"]["Arn"]
        iam.update_assume_role_policy(RoleName=name, PolicyDocument=json.dumps(trust))
        fresh = False
    if inline:
        iam.put_role_policy(RoleName=name, PolicyName="inline", PolicyDocument=json.dumps(inline))
    for p in managed:
        iam.attach_role_policy(RoleName=name, PolicyArn=p)
    if fresh:
        time.sleep(12)  # IAM propagation before a service tries to assume the new role
    return arn


# --------------------------------------------------------------------------- Lambda
def deploy_lambda(ctx: Ctx) -> str:
    role = ensure_role(
        ctx, LAMBDA_ROLE,
        {"Version": "2012-10-17", "Statement": [{"Effect": "Allow", "Principal": {"Service": "lambda.amazonaws.com"},
                                                 "Action": "sts:AssumeRole"}]},
        managed=[f"arn:{ctx.partition}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"])
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.write(HERE / "gateway_lambda" / "lambda_function.py", "lambda_function.py")
    code = buf.getvalue()
    lam = ctx.client("lambda")
    try:
        arn = lam.get_function(FunctionName=LAMBDA_NAME)["Configuration"]["FunctionArn"]
        lam.update_function_code(FunctionName=LAMBDA_NAME, ZipFile=code)
        print(f"  updated lambda {LAMBDA_NAME}")
    except ClientError as e:
        if err_code(e) != "ResourceNotFoundException":
            raise
        for attempt in range(6):  # a brand-new role can take a few more seconds to be assumable
            try:
                arn = lam.create_function(FunctionName=LAMBDA_NAME, Runtime="python3.13", Role=role,
                                          Handler="lambda_function.lambda_handler", Code={"ZipFile": code},
                                          Architectures=["arm64"], Timeout=15, MemorySize=256,
                                          Description="AgentCore Gateway tools (China sample)")["FunctionArn"]
                break
            except ClientError as e2:
                if err_code(e2) != "InvalidParameterValueException" or attempt == 5:
                    raise
                time.sleep(5)
        print(f"  created lambda {LAMBDA_NAME}")
    lam.get_waiter("function_active_v2").wait(FunctionName=LAMBDA_NAME)
    lam.get_waiter("function_updated_v2").wait(FunctionName=LAMBDA_NAME)
    return arn


# --------------------------------------------------------------------------- Gateway
def tool_schema() -> list[dict]:
    spec = importlib.util.spec_from_file_location("gw_lambda", HERE / "gateway_lambda" / "lambda_function.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.TOOL_SCHEMA


def deploy_gateway(ctx: Ctx, lambda_arn: str) -> dict:
    role = ensure_role(ctx, GATEWAY_ROLE, trust_agentcore(ctx), inline={
        "Version": "2012-10-17",
        "Statement": [{"Effect": "Allow", "Action": "lambda:InvokeFunction", "Resource": lambda_arn}]})
    cp = ctx.client("bedrock-agentcore-control")
    gw = next((g for g in cp.list_gateways()["items"] if g["name"] == GATEWAY_NAME), None)
    if gw is None:
        gw_id = cp.create_gateway(name=GATEWAY_NAME, roleArn=role, protocolType="MCP", authorizerType="AWS_IAM",
                                  description="AgentCore China sample gateway")["gatewayId"]
        print(f"  created gateway {gw_id}")
    else:
        gw_id = gw["gatewayId"]
    gw = wait_for(lambda: cp.get_gateway(gatewayIdentifier=gw_id), what="gateway")

    target_cfg = {"mcp": {"lambda": {"lambdaArn": lambda_arn, "toolSchema": {"inlinePayload": tool_schema()}}}}
    creds = [{"credentialProviderType": "GATEWAY_IAM_ROLE"}]
    tgt = next((t for t in cp.list_gateway_targets(gatewayIdentifier=gw_id)["items"] if t["name"] == TARGET_NAME),
               None)
    if tgt is None:
        tgt_id = cp.create_gateway_target(gatewayIdentifier=gw_id, name=TARGET_NAME, targetConfiguration=target_cfg,
                                          credentialProviderConfigurations=creds)["targetId"]
        print(f"  created gateway target {tgt_id}")
    else:
        tgt_id = tgt["targetId"]
        cp.update_gateway_target(gatewayIdentifier=gw_id, targetId=tgt_id, name=TARGET_NAME,
                                 targetConfiguration=target_cfg, credentialProviderConfigurations=creds)
        print(f"  updated gateway target {tgt_id}")
    wait_for(lambda: cp.get_gateway_target(gatewayIdentifier=gw_id, targetId=tgt_id), what="gateway target")
    return {"gateway_id": gw_id, "gateway_arn": gw["gatewayArn"], "gateway_url": gw["gatewayUrl"],
            "target_id": tgt_id}


# --------------------------------------------------------------------------- Identity (LLM key)
def short_term_bedrock_key(profile: str, region: str) -> str:
    """12-hour Bedrock API key signed with a global-partition profile (pip install aws-bedrock-token-generator)."""
    import boto3
    from aws_bedrock_token_generator import provide_token
    from botocore.credentials import CredentialProvider

    class _Profile(CredentialProvider):
        def load(self):
            return boto3.Session(profile_name=profile).get_credentials()

    return provide_token(region=region, aws_credentials_provider=_Profile())


def ensure_api_key_provider(ctx: Ctx, key: str | None) -> str | None:
    cp = ctx.client("bedrock-agentcore-control")
    exists = any(p["name"] == API_KEY_PROVIDER
                 for p in cp.list_api_key_credential_providers().get("credentialProviders", []))
    if key:
        if exists:
            cp.update_api_key_credential_provider(name=API_KEY_PROVIDER, apiKey=key)
            print(f"  updated API-key provider {API_KEY_PROVIDER}")
        else:
            cp.create_api_key_credential_provider(name=API_KEY_PROVIDER, apiKey=key)
            print(f"  created API-key provider {API_KEY_PROVIDER}")
        return API_KEY_PROVIDER
    if exists:
        return API_KEY_PROVIDER
    print("  LLM_API_KEY not set: skipping the API-key provider (selftest works; prompts will not)")
    return None


# --------------------------------------------------------------------------- Runtime
def build_package() -> Path:
    pkg = BUILD / "package"
    shutil.rmtree(BUILD, ignore_errors=True)
    pkg.mkdir(parents=True)
    print("  installing linux/arm64 wheels for Python 3.13 …")
    subprocess.run([sys.executable, "-m", "pip", "install", "--quiet", "--disable-pip-version-check",
                    "--platform", "manylinux2014_aarch64", "--implementation", "cp", "--python-version", "3.13",
                    "--only-binary=:all:", "--target", str(pkg), "-r", str(HERE / "agent" / "requirements.txt")],
                   check=True)
    shutil.copy(HERE / "agent" / "main.py", pkg / "main.py")
    out = BUILD / "agent.zip"
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(pkg.rglob("*")):
            if f.is_file() and "__pycache__" not in f.parts and f.suffix != ".pyc":
                z.write(f, f.relative_to(pkg))
    print(f"  package {out.stat().st_size / 2**20:.1f} MiB")
    return out


def upload_package(ctx: Ctx, zip_path: Path) -> str:
    s3 = ctx.client("s3")
    try:
        s3.head_bucket(Bucket=ctx.bucket)
    except ClientError:
        s3.create_bucket(Bucket=ctx.bucket, CreateBucketConfiguration={"LocationConstraint": ctx.region})
        s3.put_public_access_block(Bucket=ctx.bucket, PublicAccessBlockConfiguration={
            "BlockPublicAcls": True, "IgnorePublicAcls": True, "BlockPublicPolicy": True,
            "RestrictPublicBuckets": True})
        print(f"  created bucket {ctx.bucket}")
    digest = hashlib.sha256(zip_path.read_bytes()).hexdigest()[:12]
    key = f"{PREFIX}/agent-{digest}.zip"
    s3.upload_file(str(zip_path), ctx.bucket, key)
    return key


def runtime_policy(ctx: Ctx, gateway_arn: str) -> dict:
    ac = lambda res, account=None: ctx.arn("bedrock-agentcore", res, account=account)  # noqa: E731
    return {"Version": "2012-10-17", "Statement": [
        {"Sid": "Logs", "Effect": "Allow",
         "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents", "logs:DescribeLogStreams"],
         "Resource": [ctx.arn("logs", "log-group:/aws/bedrock-agentcore/runtimes/*"),
                      ctx.arn("logs", "log-group:/aws/bedrock-agentcore/runtimes/*:log-stream:*")]},
        {"Sid": "LogGroups", "Effect": "Allow", "Action": "logs:DescribeLogGroups",
         "Resource": ctx.arn("logs", "log-group:*")},
        {"Sid": "Metrics", "Effect": "Allow", "Action": "cloudwatch:PutMetricData", "Resource": "*",
         "Condition": {"StringEquals": {"cloudwatch:namespace": "bedrock-agentcore"}}},
        {"Sid": "CodeZip", "Effect": "Allow", "Action": "s3:GetObject",
         "Resource": f"arn:{ctx.partition}:s3:::{ctx.bucket}/{PREFIX}/*"},
        {"Sid": "Gateway", "Effect": "Allow", "Action": "bedrock-agentcore:InvokeGateway", "Resource": gateway_arn},
        {"Sid": "Browser", "Effect": "Allow",
         "Action": ["bedrock-agentcore:StartBrowserSession", "bedrock-agentcore:StopBrowserSession",
                    "bedrock-agentcore:GetBrowserSession", "bedrock-agentcore:ListBrowserSessions",
                    "bedrock-agentcore:UpdateBrowserStream", "bedrock-agentcore:ConnectBrowserAutomationStream"],
         "Resource": [ac("browser/*", account="aws"), ac("browser/*")]},
        {"Sid": "WorkloadIdentity", "Effect": "Allow",
         "Action": ["bedrock-agentcore:GetWorkloadAccessToken", "bedrock-agentcore:GetWorkloadAccessTokenForJWT",
                    "bedrock-agentcore:GetWorkloadAccessTokenForUserId"],
         "Resource": [ac("workload-identity-directory/default"),
                      ac("workload-identity-directory/default/workload-identity/*")]},
        {"Sid": "ApiKey", "Effect": "Allow", "Action": "bedrock-agentcore:GetResourceApiKey",
         "Resource": [ac("token-vault/default"), ac(f"token-vault/default/apikeycredentialprovider/{API_KEY_PROVIDER}"),
                      ac("workload-identity-directory/default"),
                      ac("workload-identity-directory/default/workload-identity/*")]},
        {"Sid": "ApiKeySecret", "Effect": "Allow", "Action": "secretsmanager:GetSecretValue",
         "Resource": ctx.arn("secretsmanager", "secret:bedrock-agentcore-identity!default/apikey/*")},
    ]}


def deploy_runtime(ctx: Ctx, gw: dict, provider: str | None, llm_base_url: str, llm_model: str) -> dict:
    role = ensure_role(ctx, RUNTIME_ROLE, trust_agentcore(ctx), inline=runtime_policy(ctx, gw["gateway_arn"]))
    key = upload_package(ctx, build_package())
    artifact = {"codeConfiguration": {"code": {"s3": {"bucket": ctx.bucket, "prefix": key}},
                                      "runtime": "PYTHON_3_13", "entryPoint": ["main.py"]}}
    env = {"GATEWAY_URL": gw["gateway_url"], "LLM_BASE_URL": llm_base_url, "LLM_MODEL": llm_model}
    if provider:
        env["LLM_API_KEY_PROVIDER"] = provider
    common = dict(agentRuntimeArtifact=artifact, roleArn=role, networkConfiguration={"networkMode": "PUBLIC"},
                  protocolConfiguration={"serverProtocol": "HTTP"}, environmentVariables=env,
                  description="Strands agent + AgentCore Gateway + Browser (China sample)")
    cp = ctx.client("bedrock-agentcore-control")
    existing = next((r for r in cp.list_agent_runtimes()["agentRuntimes"] if r["agentRuntimeName"] == PREFIX), None)
    if existing is None:
        res = cp.create_agent_runtime(agentRuntimeName=PREFIX, **common)
        print(f"  created runtime {res['agentRuntimeId']}")
    else:
        res = cp.update_agent_runtime(agentRuntimeId=existing["agentRuntimeId"], **common)
        print(f"  updated runtime {res['agentRuntimeId']} → version {res['agentRuntimeVersion']}")
    rt = wait_for(lambda: cp.get_agent_runtime(agentRuntimeId=res["agentRuntimeId"]), what="runtime")
    return {"runtime_id": rt["agentRuntimeId"], "runtime_arn": rt["agentRuntimeArn"],
            "runtime_version": rt["agentRuntimeVersion"], "code_s3": f"s3://{ctx.bucket}/{key}"}


def bedrock_region(base_url: str) -> str:
    m = re.match(r"https://bedrock-runtime\.([a-z0-9-]+)\.amazonaws\.com", base_url)
    if not m:
        raise SystemExit("--bedrock-token-profile needs a Bedrock --llm-base-url")
    return m.group(1)


def main():
    args = parse_args(__doc__, lambda p: (
        p.add_argument("--llm-base-url", default=os.environ.get(
            "LLM_BASE_URL", "https://bedrock-runtime.us-west-2.amazonaws.com/openai/v1")),
        p.add_argument("--llm-model", default=os.environ.get("LLM_MODEL", "global.moonshotai.kimi-k3")),
        p.add_argument("--bedrock-token-profile",
                       help="global-Region AWS profile used to mint a short-term Bedrock key if LLM_API_KEY is unset")))
    ctx = Ctx(args.profile, args.region)
    print(f"Deploying to {ctx.region} ({ctx.partition}, account {ctx.account[:4]}…)")
    state = load_state(ctx.region)
    print("[1/4] Lambda tools")
    state["lambda_arn"] = deploy_lambda(ctx)
    print("[2/4] Gateway")
    state.update(deploy_gateway(ctx, state["lambda_arn"]))
    print("[3/4] Identity API-key provider")
    key = os.environ.get("LLM_API_KEY")
    if not key and args.bedrock_token_profile:
        key = short_term_bedrock_key(args.bedrock_token_profile, bedrock_region(args.llm_base_url))
        print(f"  minted a 12 h Bedrock API key from profile {args.bedrock_token_profile}")
    state["api_key_provider"] = ensure_api_key_provider(ctx, key)
    save_state(ctx.region, state)
    print("[4/4] Runtime")
    state.update(deploy_runtime(ctx, state, state["api_key_provider"], args.llm_base_url, args.llm_model))
    save_state(ctx.region, state)
    print(json.dumps({k: v for k, v in state.items() if k != "lambda_arn"}, indent=2))
    print(f"\nNext: python invoke.py --region {ctx.region} --selftest")


if __name__ == "__main__":
    main()
