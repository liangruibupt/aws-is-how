"""Build/audit/test on the existing GPU without promoting an unverified release."""
import hashlib
import json
from pathlib import Path
import shlex

import boto3
from release import build_archive

ROOT = Path(__file__).resolve().parent
state_path = ROOT/"deployment.json"
state = json.loads(state_path.read_text())
session = boto3.Session(profile_name=state["profile"], region_name=state["region"])
if session.client("sts").get_caller_identity()["Account"] != state["account"]:
    raise RuntimeError("Wrong AWS account")
package = build_archive(ROOT)
digest = hashlib.sha256(package).hexdigest()
key = f"release/{digest}.tgz"
session.client("s3").put_object(Bucket=state["artifactBucket"], Key=key, Body=package,
                                 ServerSideEncryption="AES256")
candidate = f"/opt/cosyvoice/candidates/{digest}"
script = f"""set -euo pipefail
mkdir -p {candidate}
aws --region {shlex.quote(state["region"])} s3 cp s3://{state["artifactBucket"]}/{key} {candidate}.tgz
echo '{digest}  {candidate}.tgz' | sha256sum -c -
tar --no-same-owner -xzf {candidate}.tgz -C {candidate}
export RELEASE_DIR={candidate}
export CANDIDATE_ONLY=1
bash {candidate}/bootstrap.sh
"""
command = session.client("ssm").send_command(
    InstanceIds=[state["outputs"]["InstanceId"]], DocumentName="AWS-RunShellScript",
    Parameters={"commands": ["bash -lc "+shlex.quote(script)], "executionTimeout": ["3600"]},
)["Command"]["CommandId"]
state["securityCandidate"] = {"artifactKey": key, "sha256": digest, "commandId": command}
state_path.write_text(json.dumps(state, indent=2)+"\n")
print(json.dumps(state["securityCandidate"], indent=2))
