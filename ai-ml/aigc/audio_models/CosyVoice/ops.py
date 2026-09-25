"""Inspect only this deployment; log reads use SSM instead of opening SSH."""
import argparse
import json
from pathlib import Path
import time

import boto3

parser = argparse.ArgumentParser()
parser.add_argument("action", choices=["status", "logs"])
args = parser.parse_args()
state = json.loads(Path(__file__).with_name("deployment.json").read_text())
session = boto3.Session(profile_name=state["profile"], region_name=state["region"])
assert session.client("sts").get_caller_identity()["Account"] == state["account"]
outputs = state["outputs"]
ec2 = session.client("ec2")
instance = ec2.describe_instances(InstanceIds=[outputs["InstanceId"]])["Reservations"][0]["Instances"][0]
assert {"Key": "Project", "Value": "CosyVoice3"} in instance["Tags"]
if args.action == "logs":
    ssm = session.client("ssm")
    commands = ["tail -n 75 /var/log/cosyvoice-bootstrap.log",
                "systemctl is-active cosyvoice3 || true",
                "docker logs --tail 40 cosyvoice3 2>&1 || true"]
    command = ssm.send_command(InstanceIds=[instance["InstanceId"]], DocumentName="AWS-RunShellScript",
                               Parameters={"commands": commands, "executionTimeout": ["60"]})["Command"]["CommandId"]
    for _ in range(30):
        try:
            result = ssm.get_command_invocation(CommandId=command, InstanceId=instance["InstanceId"])
        except ssm.exceptions.InvocationDoesNotExist:
            time.sleep(2)
            continue
        if result["Status"] not in {"Pending", "InProgress", "Delayed"}:
            print(result["StandardOutputContent"])
            print(result["StandardErrorContent"])
            break
        time.sleep(2)
    else:
        raise TimeoutError(command)
else:
    elb = session.client("elbv2")
    alb = elb.describe_load_balancers(LoadBalancerArns=[outputs["ALBArn"]])["LoadBalancers"][0]
    groups = ec2.describe_security_groups(GroupIds=[
        outputs["ALBSecurityGroup"], outputs["GPUSecurityGroup"]])["SecurityGroups"]
    distribution = session.client("cloudfront").get_distribution(Id=outputs["DistributionId"])["Distribution"]
    config = distribution["DistributionConfig"]
    volumes = ec2.describe_volumes(VolumeIds=[
        item["Ebs"]["VolumeId"] for item in instance["BlockDeviceMappings"] if "Ebs" in item])["Volumes"]
    result = {
        "instance": instance["InstanceId"], "state": instance["State"]["Name"],
        "instanceType": instance["InstanceType"], "publicIP": instance.get("PublicIpAddress"),
        "privateIP": instance["PrivateIpAddress"], "metadata": instance["MetadataOptions"],
        "volumes": [{"sizeGiB": v["Size"], "encrypted": v["Encrypted"], "type": v["VolumeType"]} for v in volumes],
        "albScheme": alb["Scheme"], "albState": alb["State"],
        "targetHealth": elb.describe_target_health(TargetGroupArn=outputs["TargetGroupArn"])["TargetHealthDescriptions"],
        "securityGroups": [{"id": g["GroupId"], "ingress": g["IpPermissions"]} for g in groups],
        "cloudFront": {"id": distribution["Id"], "status": distribution["Status"],
                       "domain": distribution["DomainName"], "enabled": config["Enabled"],
                       "origins": config["Origins"], "behavior": config["DefaultCacheBehavior"],
                       "webACL": config.get("WebACLId")},
    }
    print(json.dumps(result, indent=2, default=str))
