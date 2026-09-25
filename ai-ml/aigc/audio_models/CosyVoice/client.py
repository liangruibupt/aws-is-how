"""Call the CloudFront API; retrieve its token from AWS without printing it."""
import argparse
import hashlib
import json
from pathlib import Path
import time

import boto3
import httpx

parser = argparse.ArgumentParser()
parser.add_argument("--profile", default="global_ruiliang")
parser.add_argument("--region", default="us-west-2")
subcommands = parser.add_subparsers(dest="command", required=True)
subcommands.add_parser("health")
subcommands.add_parser("voices")
speak = subcommands.add_parser("speak")
speak.add_argument("--text", required=True)
speak.add_argument("--voice", default="upstream-demo")
speak.add_argument("--format", choices=["wav", "mp3"], default="wav")
speak.add_argument("--speed", type=float, default=1.0)
speak.add_argument("--output", type=Path, required=True)
voice = subcommands.add_parser("add-voice")
voice.add_argument("--audio", type=Path, required=True)
voice.add_argument("--name", required=True)
voice.add_argument("--transcript", required=True)
voice.add_argument("--confirm-rights", action="store_true", required=True)
args = parser.parse_args()
session = boto3.Session(profile_name=args.profile, region_name=args.region)
stack = session.client("cloudformation").describe_stacks(StackName="cosyvoice3-service")["Stacks"][0]
outputs = {entry["OutputKey"]: entry["OutputValue"] for entry in stack.get("Outputs", [])}
domain = outputs["DomainName"]
assert domain.endswith(".cloudfront.net") and "/" not in domain, "Unexpected API domain"
token = session.client("secretsmanager").get_secret_value(SecretId=outputs["SecretArn"])["SecretString"]

with httpx.Client(base_url="https://"+domain, headers={"Authorization": "Bearer "+token},
                  timeout=60, follow_redirects=False) as api:
    def request(method, path, **kwargs):
        response = api.request(method, path, **kwargs)
        if response.is_error:
            raise RuntimeError(f"API returned HTTP {response.status_code}: {response.text[:300]}")
        return response

    if args.command in {"health", "voices"}:
        path = "/healthz" if args.command == "health" else "/v1/voices"
        print(json.dumps(request("GET", path).json(), ensure_ascii=False, indent=2))
    elif args.command == "add-voice":
        assert args.audio.stat().st_size <= 8*1024*1024
        with args.audio.open("rb") as audio:
            value = request("POST", "/v1/voices",
                            data={"name": args.name, "transcript": args.transcript, "rights_confirmed": "true"},
                            files={"audio": ("reference.wav", audio, "audio/wav")}).json()
        print(json.dumps(value, ensure_ascii=False, indent=2))
    else:
        if args.output.exists():
            raise RuntimeError("Output already exists; choose another filename")
        created = request("POST", "/v1/jobs", json={
            "text": args.text, "voice": args.voice, "speed": args.speed, "format": args.format}).json()
        job_id = created["id"]
        print(json.dumps({"job": job_id}), flush=True)
        deadline, previous = time.monotonic()+900, None
        while time.monotonic() < deadline:
            status = request("GET", f"/v1/jobs/{job_id}").json()
            if status["status"] != previous:
                print(json.dumps(status, ensure_ascii=False), flush=True)
                previous = status["status"]
            if status["status"] == "completed":
                content = request("GET", f"/v1/jobs/{job_id}/audio").content
                if hashlib.sha256(content).hexdigest() != status["sha256"]:
                    raise RuntimeError("Downloaded audio checksum mismatch")
                args.output.parent.mkdir(parents=True, exist_ok=True)
                with args.output.open("xb") as output:
                    output.write(content)
                print(json.dumps({"saved": str(args.output.resolve()), "bytes": len(content)}), flush=True)
                break
            if status["status"] in {"failed", "expired"}:
                raise RuntimeError(json.dumps(status))
            time.sleep(3)
        else:
            raise TimeoutError(f"Job {job_id} is still pending; check its status before resubmitting")
