"""Verify private origins, public HTTPS authentication, and real GPU-generated audio."""
import json
from pathlib import Path
import shlex
import time

import boto3

ROOT = Path(__file__).resolve().parent
state = json.loads((ROOT/"deployment.json").read_text())
session = boto3.Session(profile_name=state["profile"], region_name=state["region"])
assert session.client("sts").get_caller_identity()["Account"] == state["account"]
out = state["outputs"]
instance = session.client("ec2").describe_instances(InstanceIds=[out["InstanceId"]])["Reservations"][0]["Instances"][0]
assert not instance.get("PublicIpAddress"), "EC2 must not have a public IP"
assert instance["MetadataOptions"]["HttpTokens"] == "required"
alb = session.client("elbv2").describe_load_balancers(LoadBalancerArns=[out["ALBArn"]])["LoadBalancers"][0]
assert alb["Scheme"] == "internal"
groups = {g["GroupId"]: g for g in session.client("ec2").describe_security_groups(
    GroupIds=[out["ALBSecurityGroup"], out["GPUSecurityGroup"]])["SecurityGroups"]}
for group, allowed, port in [(out["ALBSecurityGroup"], state["cloudFrontManagedSG"], 80),
                             (out["GPUSecurityGroup"], out["ALBSecurityGroup"], 8000)]:
    rules = groups[group]["IpPermissions"]
    assert len(rules) == 1
    rule = rules[0]
    assert rule["FromPort"] == rule["ToPort"] == port
    assert not rule.get("IpRanges") and not rule.get("Ipv6Ranges") and not rule.get("PrefixListIds")
    assert [r["GroupId"] for r in rule["UserIdGroupPairs"]] == [allowed]
distribution = session.client("cloudfront").get_distribution(Id=out["DistributionId"])["Distribution"]
assert distribution["Status"] == "Deployed"
config = distribution["DistributionConfig"]
assert config["Origins"]["Items"][0]["VpcOriginConfig"]["VpcOriginId"] == out["VpcOriginId"]
assert config["DefaultCacheBehavior"]["ViewerProtocolPolicy"] == "https-only"
assert config["DefaultCacheBehavior"]["CachePolicyId"] == "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
assert config["WebACLId"] == state["edgeOutputs"]["WebACLArn"]
domain = distribution["DomainName"]
ssm = session.client("ssm")
command = ssm.send_command(
    InstanceIds=[out["InstanceId"]], DocumentName="AWS-RunShellScript",
    Parameters={"commands": [
        "docker run --rm --cap-drop ALL --security-opt no-new-privileges "
        "--read-only --tmpfs /tmp:rw,noexec,nosuid,nodev,size=536870912 --env-file /etc/cosyvoice3.env "
        "-e VERIFY_ENDPOINT=" + shlex.quote("https://" + domain) +
        " cosyvoice3:local python /app/verify_api.py"
    ], "executionTimeout": ["3000"]},
)["Command"]["CommandId"]
print(json.dumps({"verificationCommand": command, "execution": "EC2"}), flush=True)
deadline = time.monotonic() + 3100
while time.monotonic() < deadline:
    try:
        invocation = ssm.get_command_invocation(CommandId=command, InstanceId=out["InstanceId"])
    except ssm.exceptions.InvocationDoesNotExist:
        time.sleep(5)
        continue
    if invocation["Status"] not in {"Pending", "InProgress", "Delayed"}:
        if invocation["Status"] != "Success":
            raise RuntimeError(f"EC2 verification {invocation['Status']}: "
                               f"{invocation['StandardErrorContent']}")
        report = json.loads(invocation["StandardOutputContent"])
        assert report["status"] == "PASS"
        break
    time.sleep(10)
else:
    raise TimeoutError(f"EC2 verification did not complete: {command}")
report.update(
    instance=out["InstanceId"], verificationCommand=command,
    publicEC2IP=False, internalALB=True, originRestrictedToCloudFrontSG=True,
    gpuRestrictedToALBSG=True, IMDSv2=True, httpsOnly=True, WAF=True, cacheDisabled=True,
    note="Upstream reference voice is for installation QA, not a selected male voice.",
)
(ROOT/"verification.json").write_text(json.dumps(report, indent=2)+"\n")
print(json.dumps(report, indent=2))
