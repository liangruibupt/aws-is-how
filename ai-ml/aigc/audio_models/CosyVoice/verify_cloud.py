"""Verify private origins, public HTTPS authentication, and real GPU-generated audio."""
import array
from datetime import datetime, timezone
import hashlib
import io
import json
import math
from pathlib import Path
import time
import wave

import boto3
import httpx

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
token = session.client("secretsmanager").get_secret_value(SecretId=out["SecretArn"])["SecretString"]
with httpx.Client(base_url="https://"+domain, timeout=60, follow_redirects=False) as api:
    ready_deadline = time.monotonic()+900
    while time.monotonic() < ready_deadline:
        health = api.get("/healthz")
        if health.status_code == 200:
            break
        assert health.status_code in {502, 503, 504}, (health.status_code, health.text[:200])
        print(json.dumps({"waitingForModel": health.status_code}), flush=True)
        time.sleep(15)
    else:
        raise TimeoutError("Model not ready after 15 minutes; inspect SSM logs")
    unauthorized = api.get("/v1/voices")
    assert unauthorized.status_code == 401, unauthorized.status_code
    assert unauthorized.headers.get("cache-control") == "no-store"
    api.headers["Authorization"] = "Bearer "+token
    voices = api.get("/v1/voices")
    assert voices.status_code == 200
    request = api.post("/v1/jobs", json={"text": "欢迎收看本次演示。现在，让我们一起了解模型的细节。",
                                        "voice": "upstream-demo", "format": "wav"})
    assert request.status_code == 202, (request.status_code, request.text[:200])
    job_id = request.json()["id"]
    deadline = time.monotonic()+900
    while time.monotonic() < deadline:
        response = api.get(f"/v1/jobs/{job_id}")
        response.raise_for_status()
        job = response.json()
        if job["status"] == "completed":
            break
        if job["status"] == "failed":
            raise RuntimeError(job)
        time.sleep(3)
    else:
        raise TimeoutError(job_id)
    response = api.get(f"/v1/jobs/{job_id}/audio")
    response.raise_for_status()
    audio = response.content
    assert hashlib.sha256(audio).hexdigest() == job["sha256"]
    with wave.open(io.BytesIO(audio)) as wav:
        assert wav.getsampwidth() == 2 and wav.getnchannels() == 1
        rate, frames = wav.getframerate(), wav.getnframes()
        samples = array.array("h", wav.readframes(frames))
    rms = math.sqrt(sum(float(x)*x for x in samples)/len(samples))/32768
    assert rate == job["sample_rate"] and 1 < frames/rate < 60 and rms > .001
    (ROOT/"outputs").mkdir(exist_ok=True)
    (ROOT/"outputs/cloud-smoke.wav").write_bytes(audio)
    report = {"status": "PASS", "checkedAtUTC": datetime.now(timezone.utc).isoformat(),
              "endpoint": "https://"+domain, "instance": out["InstanceId"],
              "publicEC2IP": False, "internalALB": True, "originRestrictedToCloudFrontSG": True,
              "gpuRestrictedToALBSG": True, "IMDSv2": True, "httpsOnly": True,
              "WAF": True, "cacheDisabled": True, "unauthorizedHTTP": unauthorized.status_code,
              "job": job, "wavSeconds": frames/rate, "rms": rms,
              "note": "Upstream reference voice is for installation QA, not a selected male voice."}
    (ROOT/"verification.json").write_text(json.dumps(report, indent=2)+"\n")
    print(json.dumps(report, indent=2))
