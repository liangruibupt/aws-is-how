"""Regenerate the Linux/CUDA lock on EC2; this controller installs nothing locally."""
import hashlib
import json
from pathlib import Path
import shlex
import time

import boto3

from release import build_archive

ROOT = Path(__file__).resolve().parent
state = json.loads((ROOT / "deployment.json").read_text())
session = boto3.Session(profile_name=state["profile"], region_name=state["region"])
if session.client("sts").get_caller_identity()["Account"] != state["account"]:
    raise RuntimeError("Wrong AWS account")
s3 = session.client("s3")
ssm = session.client("ssm")
archive = build_archive(ROOT)
digest = hashlib.sha256(archive).hexdigest()
key = f"release/{digest}.tgz"
output_key = f"release/locks/{digest}/requirements.txt"
bucket = state["artifactBucket"]
s3.put_object(Bucket=bucket, Key=key, Body=archive, ServerSideEncryption="AES256")
# Grant one temporary object write, without broadening the instance IAM role.
upload = s3.generate_presigned_url(
    "put_object",
    Params={"Bucket": bucket, "Key": output_key, "ServerSideEncryption": "AES256"},
    ExpiresIn=1800,
)
directory = f"/opt/cosyvoice/resolve/{digest}"
resolve = (
    "set -euo pipefail; "
    "python -m pip install --quiet --no-deps uv==0.11.7; "
    "uv pip compile --quiet requirements.in --python-version 3.12 "
    "--python-platform x86_64-unknown-linux-gnu --torch-backend cu126 "
    "--generate-hashes --emit-index-url --output-file requirements.txt; "
    # uv's torch backend scopes resolution correctly but does not emit its pip index.
    "python -c " + shlex.quote(
        "from pathlib import Path; p = Path('requirements.txt'); text = p.read_text(); "
        "index = '--extra-index-url https://download.pytorch.org/whl/cu126\\n'; "
        "primary = '--index-url https://pypi.org/simple\\n'; "
        "assert primary in text; text = text.replace(index, ''); "
        "p.write_text(text.replace(primary, primary + index, 1))"
    )
)
script = f"""set -euo pipefail
mkdir -p {directory}
aws --region {shlex.quote(state["region"])} s3 cp s3://{bucket}/{key} {directory}.tgz
echo '{digest}  {directory}.tgz' | sha256sum -c -
tar --no-same-owner -xzf {directory}.tgz -C {directory}
docker run --rm --user 0 --cap-drop ALL --security-opt no-new-privileges \
  -v {directory}:/work -w /work --entrypoint /bin/bash \
  cosyvoice3:candidate -c {shlex.quote(resolve)}
curl --fail --silent --show-error --upload-file {directory}/requirements.txt \
  -H 'x-amz-server-side-encryption: AES256' {shlex.quote(upload)}
"""
command = ssm.send_command(
    InstanceIds=[state["outputs"]["InstanceId"]], DocumentName="AWS-RunShellScript",
    Parameters={"commands": ["bash -lc " + shlex.quote(script)], "executionTimeout": ["1500"]},
)["Command"]["CommandId"]
print(json.dumps({"resolveCommand": command, "execution": "EC2"}), flush=True)
deadline = time.monotonic() + 1600
while time.monotonic() < deadline:
    try:
        invocation = ssm.get_command_invocation(
            CommandId=command, InstanceId=state["outputs"]["InstanceId"],
        )
    except ssm.exceptions.InvocationDoesNotExist:
        time.sleep(5)
        continue
    if invocation["Status"] not in {"Pending", "InProgress", "Delayed"}:
        if invocation["Status"] != "Success":
            raise RuntimeError(f"EC2 resolution {invocation['Status']}: "
                               f"{invocation['StandardErrorContent']}")
        break
    time.sleep(5)
else:
    raise TimeoutError(f"EC2 resolution did not finish: {command}")
with s3.get_object(Bucket=bucket, Key=output_key)["Body"] as response:
    lock = response.read()
if b"--extra-index-url https://download.pytorch.org/whl/cu126" not in lock:
    raise RuntimeError("Generated lock is missing the required CUDA index")
if lock.find(b"--index-url ") > lock.find(b"--extra-index-url "):
    raise RuntimeError("The primary pip index must precede the CUDA index")
(ROOT / "requirements.txt").write_bytes(lock)
print(json.dumps({"status": "GENERATED", "sha256": hashlib.sha256(lock).hexdigest(),
                  "bytes": len(lock), "execution": "EC2"}))
