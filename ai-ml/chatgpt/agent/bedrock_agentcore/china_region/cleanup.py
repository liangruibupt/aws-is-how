#!/usr/bin/env python3
"""Delete everything deploy.py created in one region (Runtime, Gateway + target, Lambda, API-key provider,
code objects + bucket, IAM roles). Asks for confirmation unless --yes."""
from __future__ import annotations

import time

from botocore.exceptions import ClientError

from common import (API_KEY_PROVIDER, GATEWAY_ROLE, LAMBDA_NAME, LAMBDA_ROLE, PREFIX, RUNTIME_ROLE, STATE_FILE, Ctx,
                    load_state, parse_args, save_state)


def quiet(what, fn, *a, **kw):
    try:
        fn(*a, **kw)
        print(f"  deleted {what}")
    except ClientError as e:
        print(f"  skip {what}: {e.response['Error']['Code']}")


def main():
    args = parse_args(__doc__, lambda p: p.add_argument("--yes", action="store_true"))
    ctx = Ctx(args.profile, args.region)
    state = load_state(ctx.region)
    if not args.yes and input(f"Delete the {PREFIX} sample resources in {ctx.region}? [y/N] ").lower() != "y":
        return
    cp = ctx.client("bedrock-agentcore-control")

    if rid := state.get("runtime_id"):
        quiet(f"runtime {rid}", cp.delete_agent_runtime, agentRuntimeId=rid)
    if gid := state.get("gateway_id"):
        if tid := state.get("target_id"):
            quiet(f"gateway target {tid}", cp.delete_gateway_target, gatewayIdentifier=gid, targetId=tid)
            for _ in range(24):  # a gateway can only be deleted once it has no targets
                if not cp.list_gateway_targets(gatewayIdentifier=gid)["items"]:
                    break
                time.sleep(5)
        quiet(f"gateway {gid}", cp.delete_gateway, gatewayIdentifier=gid)
    if state.get("api_key_provider"):
        quiet(f"API-key provider {API_KEY_PROVIDER}", cp.delete_api_key_credential_provider, name=API_KEY_PROVIDER)
    quiet(f"lambda {LAMBDA_NAME}", ctx.client("lambda").delete_function, FunctionName=LAMBDA_NAME)

    s3 = ctx.client("s3")
    try:
        for page in s3.get_paginator("list_objects_v2").paginate(Bucket=ctx.bucket, Prefix=f"{PREFIX}/"):
            for obj in page.get("Contents", []):
                s3.delete_object(Bucket=ctx.bucket, Key=obj["Key"])
        if s3.list_objects_v2(Bucket=ctx.bucket, MaxKeys=1).get("KeyCount", 0) == 0:
            quiet(f"bucket {ctx.bucket}", s3.delete_bucket, Bucket=ctx.bucket)
        else:
            print(f"  kept bucket {ctx.bucket}: it holds objects this sample did not create")
    except ClientError as e:
        print(f"  skip bucket: {e.response['Error']['Code']}")

    iam = ctx.client("iam")
    for role in (RUNTIME_ROLE, GATEWAY_ROLE, LAMBDA_ROLE):
        try:
            for name in iam.list_role_policies(RoleName=role)["PolicyNames"]:
                iam.delete_role_policy(RoleName=role, PolicyName=name)
            for p in iam.list_attached_role_policies(RoleName=role)["AttachedPolicies"]:
                iam.detach_role_policy(RoleName=role, PolicyArn=p["PolicyArn"])
        except ClientError:
            pass
        quiet(f"role {role}", iam.delete_role, RoleName=role)

    # Log groups created by the services for this sample's Runtime and Lambda.
    logs = ctx.client("logs")
    for prefix in (f"/aws/bedrock-agentcore/runtimes/{PREFIX}-", f"/aws/lambda/{LAMBDA_NAME}"):
        for page in logs.get_paginator("describe_log_groups").paginate(logGroupNamePrefix=prefix):
            for group in page["logGroups"]:
                quiet(f"log group {group['logGroupName']}", logs.delete_log_group,
                      logGroupName=group["logGroupName"])

    save_state(ctx.region, {})
    print(f"done ({STATE_FILE.name} cleared for {ctx.region})")


if __name__ == "__main__":
    main()
