"""Upload a revision, keep CloudFormation reproducible, and install it over SSM."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import tarfile
import time

import boto3

ROOT = Path(__file__).resolve().parent
state = json.loads((ROOT/"deployment.json").read_text())
parser = argparse.ArgumentParser()
parser.add_argument("--log", help="Read a previously started SSM command")
args = parser.parse_args()
session = boto3.Session(profile_name=state["profile"], region_name=state["region"])
assert session.client("sts").get_caller_identity()["Account"] == state["account"]
ssm = session.client("ssm")
instance = state["outputs"]["InstanceId"]
if args.log:
    response = ssm.get_command_invocation(CommandId=args.log, InstanceId=instance)
    print(json.dumps({key: response[key] for key in ["Status", "StandardOutputContent", "StandardErrorContent"]},
                     indent=2))
else:
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz") as archive:
        for name in ["Dockerfile", "requirements.txt", "app.py", "download_model.py", "bootstrap.sh"]:
            archive.add(ROOT/name, arcname=name)
    content = buffer.getvalue()
    digest = hashlib.sha256(content).hexdigest()
    key = f"release/{digest}.tgz"
    session.client("s3").put_object(Bucket=state["artifactBucket"], Key=key, Body=content,
                                     ServerSideEncryption="AES256")
    groups = session.client("ec2").describe_security_groups(Filters=[
        {"Name": "vpc-id", "Values": [state["outputs"]["VpcId"]]},
        {"Name": "group-name", "Values": ["CloudFront-VPCOrigins-Service-SG*"]},
    ])["SecurityGroups"]
    assert len(groups) == 1
    cfn = session.client("cloudformation")
    stack = cfn.describe_stacks(StackName="cosyvoice3-service")["Stacks"][0]
    changes = {"ArtifactKey": key, "ArtifactSHA": digest, "CloudFrontSG": groups[0]["GroupId"]}
    params = [{"ParameterKey": p["ParameterKey"], **(
        {"ParameterValue": changes[p["ParameterKey"]]} if p["ParameterKey"] in changes else
        {"UsePreviousValue": True})} for p in stack["Parameters"]]
    cfn.update_stack(StackName="cosyvoice3-service", UsePreviousTemplate=True,
                     Parameters=params, Capabilities=["CAPABILITY_IAM"])
    cfn.get_waiter("stack_update_complete").wait(StackName="cosyvoice3-service",
                                                WaiterConfig={"Delay": 15, "MaxAttempts": 120})
    state.update(artifactKey=key, artifactSHA=digest, cloudFrontManagedSG=groups[0]["GroupId"])
    (ROOT/"deployment.json").write_text(json.dumps(state, indent=2)+"\n")
    deadline = time.monotonic()+600
    while time.monotonic() < deadline:
        entries = ssm.describe_instance_information(Filters=[
            {"Key": "InstanceIds", "Values": [instance]}])["InstanceInformationList"]
        if entries and entries[0]["PingStatus"] == "Online":
            break
        time.sleep(10)
    else:
        raise TimeoutError("SSM agent did not return online")
    bucket, secret = state["artifactBucket"], state["outputs"]["SecretArn"]
    script = f"""set -euo pipefail
systemctl stop cosyvoice3 2>/dev/null || true
aws --region {state['region']} s3 cp s3://{bucket}/{key} /opt/cosyvoice/release.tgz
echo '{digest}  /opt/cosyvoice/release.tgz' | sha256sum -c -
tar --no-same-owner -xzf /opt/cosyvoice/release.tgz -C /opt/cosyvoice/release
export COSYVOICE_SECRET_ARN='{secret}'
bash /opt/cosyvoice/release/bootstrap.sh
"""
    command = ssm.send_command(InstanceIds=[instance], DocumentName="AWS-RunShellScript",
        Parameters={"commands": ["bash -lc "+__import__("shlex").quote(script)],
                    "executionTimeout": ["3600"]})["Command"]["CommandId"]
    state["lastInstallCommand"] = command
    (ROOT/"deployment.json").write_text(json.dumps(state, indent=2)+"\n")
    print(json.dumps({"installCommand": command, "instance": instance,
                      "cloudFrontManagedSG": groups[0]["GroupId"]}), flush=True)
