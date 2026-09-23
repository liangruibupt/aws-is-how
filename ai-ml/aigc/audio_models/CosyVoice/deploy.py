"""Deploy only project-owned resources; checkpoint IDs before waiting."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import tarfile
import time

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from infra import edge_template, service_template

ROOT = Path(__file__).resolve().parent
STATE = ROOT/"deployment.json"
config = Config(connect_timeout=10, read_timeout=60, retries={"max_attempts": 3})
REGION = "us-west-2"
TAGS = [{"Key": "Project", "Value": "CosyVoice3"}, {"Key": "ManagedBy", "Value": "cosyvoice-cloud"}]
state = json.loads(STATE.read_text()) if STATE.exists() else {"profile": "global_ruiliang", "region": REGION}
parser = argparse.ArgumentParser()
parser.add_argument("--profile", default=state.get("profile", "global_ruiliang"))
parser.add_argument("--account", default=state.get("account"), help="Expected AWS account ID; required on first use")
parser.add_argument("--validate", action="store_true")
parser.add_argument("--tighten", action="store_true")
parser.add_argument("--wait", action="store_true")
args = parser.parse_args()
if not args.account:
    parser.error("--account is required until deployment.json exists")
ACCOUNT = args.account
session = boto3.Session(profile_name=args.profile)
state["profile"] = args.profile
state["account"] = ACCOUNT


def client(name, region=REGION):
    return session.client(name, region_name=region, config=config)


def save():
    STATE.write_text(json.dumps(state, indent=2)+"\n")


def wait_stack(cfn, name):
    previous = None
    deadline = time.monotonic()+3600
    while time.monotonic() < deadline:
        stack = cfn.describe_stacks(StackName=name)["Stacks"][0]
        status = stack["StackStatus"]
        if status != previous:
            print(json.dumps({"stack": name, "status": status}), flush=True)
            previous = status
        if status in {"CREATE_COMPLETE", "UPDATE_COMPLETE"}:
            return {item["OutputKey"]: item["OutputValue"] for item in stack.get("Outputs", [])}
        if status.endswith("FAILED") or "ROLLBACK" in status:
            events = cfn.describe_stack_events(StackName=name)["StackEvents"]
            failed = [{k: e.get(k) for k in ["LogicalResourceId", "ResourceStatus", "ResourceStatusReason"]}
                      for e in events if e["ResourceStatus"].endswith("FAILED")]
            raise RuntimeError(json.dumps({"stack": name, "status": status, "failures": failed}))
        time.sleep(15)
    raise TimeoutError("Stack still running; use --wait to resume")


def ensure_stack(cfn, name, template, parameters=None):
    try:
        existing = cfn.describe_stacks(StackName=name)["Stacks"][0]
    except ClientError as error:
        if error.response["Error"]["Code"] != "ValidationError":
            raise
        existing = None
    if existing:
        assert {"Key": "ManagedBy", "Value": "cosyvoice-cloud"} in existing.get("Tags", []), "Unowned stack"
    else:
        cfn.create_stack(StackName=name, TemplateBody=json.dumps(template),
                         Parameters=[{"ParameterKey": key, "ParameterValue": value}
                                     for key, value in (parameters or {}).items()],
                         Capabilities=["CAPABILITY_IAM"], Tags=TAGS, OnFailure="ROLLBACK")
        print(json.dumps({"createdStack": name}), flush=True)
    return wait_stack(cfn, name)


assert client("sts").get_caller_identity()["Account"] == ACCOUNT, "Wrong AWS account"
cfn = client("cloudformation")
edge_cfn = client("cloudformation", "us-east-1")
if args.validate:
    print(cfn.validate_template(TemplateBody=json.dumps(service_template()))["Description"])
    print(edge_cfn.validate_template(TemplateBody=json.dumps(edge_template()))["Description"])
elif args.tighten:
    outputs = state["outputs"]
    groups = client("ec2").describe_security_groups(Filters=[
        {"Name": "vpc-id", "Values": [outputs["VpcId"]]},
        {"Name": "group-name", "Values": ["CloudFront-VPCOrigins-Service-SG*"]},
    ])["SecurityGroups"]
    assert len(groups) == 1, "Expected one CloudFront-managed security group"
    stack = cfn.describe_stacks(StackName="cosyvoice3-service")["Stacks"][0]
    parameters = [{"ParameterKey": p["ParameterKey"], "UsePreviousValue": True}
                  for p in stack["Parameters"] if p["ParameterKey"] != "CloudFrontSG"]
    parameters.append({"ParameterKey": "CloudFrontSG", "ParameterValue": groups[0]["GroupId"]})
    try:
        cfn.update_stack(StackName="cosyvoice3-service", UsePreviousTemplate=True,
                         Parameters=parameters, Capabilities=["CAPABILITY_IAM"])
        wait_stack(cfn, "cosyvoice3-service")
    except ClientError as error:
        if "No updates" not in error.response["Error"]["Message"]:
            raise
    state["cloudFrontManagedSG"] = groups[0]["GroupId"]
    save()
    print(json.dumps({"restrictedToCloudFrontSG": groups[0]["GroupId"]}), flush=True)
elif args.wait:
    state["outputs"] = wait_stack(cfn, "cosyvoice3-service")
    details = cfn.describe_stacks(StackName="cosyvoice3-service")["Stacks"][0]
    parameters = {p["ParameterKey"]: p["ParameterValue"] for p in details["Parameters"]}
    state.update(artifactBucket=parameters["ArtifactBucket"], artifactKey=parameters["ArtifactKey"],
                 artifactSHA=parameters["ArtifactSHA"], cloudFrontManagedSG=parameters.get("CloudFrontSG", ""))
    state["edgeOutputs"] = wait_stack(edge_cfn, "cosyvoice3-edge-security")
    save()
    print(json.dumps(state["outputs"], indent=2))
else:
    state["account"] = ACCOUNT
    save()
    if "artifactBucket" not in state:
        bucket = f"cosyvoice3-deploy-{ACCOUNT}-{int(time.time())}"
        client("s3").create_bucket(Bucket=bucket, CreateBucketConfiguration={"LocationConstraint": REGION},
                                   ObjectOwnership="BucketOwnerEnforced")
        state["artifactBucket"] = bucket
        save()
        client("s3").put_public_access_block(Bucket=bucket, PublicAccessBlockConfiguration={
            "BlockPublicAcls": True, "IgnorePublicAcls": True, "BlockPublicPolicy": True,
            "RestrictPublicBuckets": True})
        client("s3").put_bucket_encryption(Bucket=bucket, ServerSideEncryptionConfiguration={
            "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]})
        client("s3").put_bucket_tagging(Bucket=bucket, Tagging={"TagSet": TAGS})
    files = ["Dockerfile", "requirements.txt", "app.py", "download_model.py", "bootstrap.sh"]
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz") as archive:
        for name in files:
            archive.add(ROOT/name, arcname=name)
    package = buffer.getvalue()
    digest = hashlib.sha256(package).hexdigest()
    key = f"release/{digest}.tgz"
    client("s3").put_object(Bucket=state["artifactBucket"], Key=key, Body=package,
                            ServerSideEncryption="AES256")
    state["artifactKey"], state["artifactSHA"] = key, digest
    save()
    state["edgeOutputs"] = ensure_stack(edge_cfn, "cosyvoice3-edge-security", edge_template())
    save()
    parameters = {"ArtifactBucket": state["artifactBucket"], "ArtifactKey": key, "ArtifactSHA": digest,
                  "WebACLArn": state["edgeOutputs"]["WebACLArn"]}
    state["outputs"] = ensure_stack(cfn, "cosyvoice3-service", service_template(), parameters)
    save()
    print(json.dumps(state["outputs"], indent=2), flush=True)
