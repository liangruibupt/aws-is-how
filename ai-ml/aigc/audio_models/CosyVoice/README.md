# CosyVoice 3 on AWS

## Security Remediation Verified

The verified security update replaces the legacy dependency set with a hashed,
inference-only Python 3.12/CUDA runtime. Lightning, training callbacks, arbitrary
remote model download helpers and unused ONNX conversion packages are removed.
Every installed Python distribution is audited at build/deployment time, with
no ignored advisories and failure on skipped packages. Candidate GPU synthesis
must pass before the image is promoted. Tests and builds run on EC2, not on the
developer's Mac.

The previously deployed service was also found stopped after a kernel update:
NVIDIA modules existed for kernel 1063 but the host was running 1064. The
existing driver was rebuilt for the current kernel without rolling back
security updates. A startup preflight can install headers and rebuild the
registered NVIDIA module for the running kernel; it does not unhold the AMI's
kernel packages or disable security updates. The old vulnerable image was removed;
only the verified replacement is enabled.

The security release was deployed and verified on 2026-09-26. The original
2026-09-23 measurements at the end of this document are retained as a
historical baseline, not as evidence for the replacement runtime.

GitHub's default-branch baseline on 2026-09-25 was 43 open Dependabot alerts:
4 critical, 22 high, 12 medium and 5 low, all in this project's requirements.
The candidate runtime uses the following remediations:

| Alerted dependency | Candidate remediation |
| --- | --- |
| AnyIO | 4.15.1 |
| Diffusers | 0.40.0 |
| Protobuf | 7.36.2 |
| python-multipart | 0.0.32 |
| Transformers | 5.17.0 |
| Lightning, pytorch-lightning, Hydra | Removed; inference does not instantiate training objects |
| ModelScope, gdown | Removed; only pinned, checksum-verified local model files are loaded |
| ONNX, PyArrow | Removed; conversion/training packages are not needed by ONNX Runtime inference |

The EC2 image build passed 18 tests and audited all 123 installed Python
distributions without findings, ignored advisories or skipped packages.
The audit also passed as the non-root runtime user. The hardened GPU smoke test
produced 4.68 seconds of 24 kHz audio and stopped at 119 of 440 allowed decoder
tokens. Public CloudFront verification, also executed on EC2, passed:
readiness HTTP 200, unauthenticated HTTP 401, 5.28-second WAV output and
3.72-second MP3 output, with verified checksums and decoded audio.
The measured report is in the ignored `verification.json`.
GitHub alerts are not dismissed manually and will remain open until the fixed
requirements reach the default branch and GitHub rescans them.

An always-on, single-GPU text-to-speech API in Oregon (`us-west-2`).
Only CloudFront is public:

## Current Deployment

- Public API: <https://d2ngrjq5oi2ru4.cloudfront.net>
- Readiness: <https://d2ngrjq5oi2ru4.cloudfront.net/healthz>
- Status: security release verified on 2026-09-26. Readiness returns HTTP 200,
  unauthenticated API requests return HTTP 401, and WAV and MP3 synthesis
  complete through CloudFront. The service is active and enabled on EC2.
- This is an API, not a browser-based voice editing UI. Opening an authenticated
  API path without a Bearer token should return HTTP 401 once the service is ready.
- `client.py` resolves the current endpoint from CloudFormation, so use it rather
  than hardcoding this hostname after a future redeployment.

## Network

```text
API client -- HTTPS + Bearer token --> CloudFront + AWS WAF
                                             |
                                      CloudFront VPC Origin
                                             |
                                      internal ALB :80
                                             |
                                      private GPU EC2 :8000

private EC2 -- NAT (outbound only) --> model/container downloads and SSM
```

## Security and Scope

- EC2 has no public IP and no SSH ingress.
- The ALB is internal. After `deploy.py --tighten` or `update_service.py`, its
  only ingress rule references CloudFront's service-managed security group.
- EC2 accepts API traffic only from the ALB security group.
- CloudFront requires viewer HTTPS; API caching is disabled and responses use
  `Cache-Control: no-store`. Authorization is forwarded to the origin.
- WAF limits each viewer IP to 300 requests per five-minute window.
- A 48-character API token is generated in Secrets Manager. It is not stored
  in this repository, user data, or deployment outputs.
- Root EBS is encrypted; IMDSv2 is required. The container runs as non-root
  with dropped capabilities and a read-only root filesystem.
- GPU JIT code uses a dedicated 256 MiB executable tmpfs at `/jit-cache`,
  owned by the runtime user with mode 0700, `nosuid` and `nodev`. General
  `/tmp` remains non-executable. Neither cache persists on disk.
- Administration uses SSM. No public SSH or unauthenticated inference endpoint.
- TLS terminates at CloudFront. Origin hops use HTTP over private VPC
  connectivity; this is not end-to-end application TLS. A custom domain and
  appropriate certificates are needed if origin TLS is required.

This is a single-user, single-instance deployment, not an HA service. The GPU
instance and NAT are single-AZ dependencies. There is no automatic scale-out
or scheduled shutdown: always-on operation was explicitly requested.

## Model and Runtime

- Official source: <https://github.com/FunAudioLLM/CosyVoice>
- Source revision: `074ca6dc9e80a2f424f1f74b48bdd7d3fea531cc`
- Model: `FunAudioLLM/Fun-CosyVoice3-0.5B-2512`
- Model revision: `29e01c4e8d000f4bcd70751be16fa94bf3d85a18`
- Model files are downloaded and checksum-verified on EC2, never on the Mac.
- Compute: `g4dn.xlarge`, NVIDIA T4, 16 GiB host RAM.
- Storage: 150 GiB encrypted gp3, expanded in place on 2026-09-25.
- Base AMI: AWS Deep Learning Base OSS NVIDIA Driver GPU AMI, Ubuntu 22.04.
- Runtime: Python 3.12, PyTorch 2.14.0 / CUDA 12.6 / cuDNN 9,
  CosyVoice 3 in FP16. The exact dependency versions and hashes are in
  `requirements.txt`.
- ONNX Runtime GPU: 1.26.0 for CUDA 12. Versions 1.27 and newer default to
  CUDA 13 and are not drop-in upgrades for this image.

The runtime removes unnecessary training and download packages,
updates Diffusers and Transformers, and adapts the pinned upstream source for
inference only. Do not fall back to the original PyTorch 2.3.1 image.
The source adaptation supplies the full cached attention mask required by
Transformers 5. The GPU smoke test must reach a normal decoder stop before the
token limit; valid PCM alone is not sufficient to accept a compatibility change.
The runtime does not include optional vLLM, TensorRT, or proprietary ttsfrd.
Text normalization uses the upstream basic path; write numbers and unusual
abbreviations explicitly when exact pronunciation matters.

## Files

- `infra.py`: private network, ALB, EC2, CloudFront VPC Origin and edge WAF templates.
- `deploy.py`: initial deployment, validation and CloudFormation state checkpoints.
- `update_service.py`: upload a code revision and install it over SSM.
- `ops.py`: deployment status and bounded log retrieval.
- `app.py`: authenticated asynchronous job and reference-voice API.
- `client.py`: client that obtains the endpoint/token via the AWS profile.
- `verify_cloud.py`: real end-to-end infrastructure and audio test.
- `verify_api.py`: public HTTPS, WAV and MP3 regression checks executed on EC2.
- `test_app.py`: contract, configuration-filter and infrastructure tests, run during the EC2 build.
- `stage_candidate.py`: build, audit and GPU-test without promoting the image.
- `resolve_requirements.py`: regenerate the hashed Linux/CUDA lock on EC2.
- `AGENTS.md`: EC2-only execution instructions for future CLI and IDE sessions.

`deployment.json`, `verification.json`, and `outputs/` are local operational
artifacts and are ignored by Git. Do not put API tokens in tracked files.

## Deployment

The controller needs `boto3` and `httpx`. The existing local environment is
`/Users/ruiliang/Documents/workspaces/venv`; no local model environment is needed.
First deployment requires an explicit expected account ID:

```sh
python deploy.py --profile global_ruiliang --account YOUR_ACCOUNT_ID --validate
python deploy.py --profile global_ruiliang --account YOUR_ACCOUNT_ID
python deploy.py --tighten
```

For dependency changes on the existing EC2 host, edit `requirements.in` and
run `python resolve_requirements.py`. It uses the existing candidate image as
an isolated EC2 resolver, installs no packages locally, and retrieves only the
generated lockfile. PyTorch packages resolve through the CUDA backend; other
packages resolve from PyPI with uv's default index protection. Do not run a
local `uv pip compile` or install the GPU environment on the Mac.

Stack names:

- `cosyvoice3-service` in `us-west-2`.
- `cosyvoice3-edge-security` in `us-east-1` (CloudFront-scoped WAF).

The controller also creates a private, encrypted S3 artifact bucket and records
its name in the ignored state file. Existing VPCs and other applications are not
modified. First boot builds the container and downloads about 5.4 GB of model
files. A CloudFormation `CREATE_COMPLETE` status does not mean the model is ready;
check `/healthz`, the target health and installation logs.

For an existing deployment after a fresh checkout, recover the ignored local
state without creating resources:

```sh
python deploy.py --profile global_ruiliang --account YOUR_ACCOUNT_ID --wait
```

Validate a security candidate first. These are local AWS controllers; the
container build, dependency audit, tests, model downloads and synthesis run on
the existing EC2 instance through SSM:

```sh
python stage_candidate.py
python ops.py logs
```

Wait for the recorded candidate SSM command to succeed and the bootstrap log
to contain `SECURITY_CANDIDATE_PASSED`. Only then promote and verify:

```sh
python update_service.py
python ops.py logs
python ops.py status
python verify_cloud.py
```

`bootstrap.sh` refuses non-EC2 hosts and takes a deployment lock. Do not run
Docker, install the model environment, or invoke unit tests on the Mac.

The existing root volume was expanded from 100 to 150 GiB through the EC2
volume API, followed by online partition/filesystem growth. Its original
CloudFormation block-device declaration remains 100 GiB: changing that property
on the existing `AWS::EC2::Instance` can replace the instance and delete its root
data. `update_service.py` deliberately preserves the existing template.
`infra.py` uses 150 GiB for new deployments only; do not apply its changed
block-device mapping to the existing stack as a routine code update.

An update can restart EC2/container services. Queued/running jobs are marked
failed on service restart rather than silently resumed; clients may resubmit.
Do not rerun initial deployment to update code.

## Use the API

Resolve the endpoint from CloudFormation and retrieve its token using the
configured AWS profile. The client does not print or persist the token.

```sh
python client.py --profile global_ruiliang health
python client.py --profile global_ruiliang voices
python client.py --profile global_ruiliang speak \
  --text "欢迎收看本次演示。" --voice upstream-demo --output outputs/demo.wav
```

The installed `upstream-demo` is the official project's reference recording for
installation testing. It is **not** a selected male narrator or a blanket grant
to use that voice commercially. Supply a clean, authorized 3-30 second male
reference recording and its exact transcript for the intended production voice:

```sh
python client.py --profile global_ruiliang add-voice \
  --audio /path/to/authorized-male.wav \
  --name narrator-male \
  --transcript "The exact words in the reference recording." \
  --confirm-rights
```

Use the returned voice ID with `speak`. Both WAV and MP3 outputs are supported.
This API is custom REST, not a drop-in OpenAI speech endpoint.

| Endpoint | Purpose |
| --- | --- |
| `GET /healthz` | Minimal unauthenticated readiness check |
| `GET /v1/voices` | List authorized voice profiles |
| `POST /v1/voices` | Upload reference audio and transcript |
| `POST /v1/jobs` | Submit text; returns HTTP 202 and a job ID |
| `GET /v1/jobs/{id}` | Poll job status |
| `GET /v1/jobs/{id}/audio` | Download completed audio |

All endpoints except readiness require Bearer authentication. One GPU worker
runs at a time; at most ten jobs wait in the in-memory queue. Requests are
limited to 1,000 text characters, 10 MiB total body and 8 MiB reference audio.
Generated audio is retained for 24 hours. Copy wanted outputs before expiry.
CloudFront improves the access path; it does not accelerate GPU inference.

## Cost and Removal

At the prices checked on 2026-09-23, GPU compute is USD 0.526/hour (about
USD 384 for 730 hours), and 150 GiB gp3 is about USD 12/month. ALB, NAT,
NAT public IPv4, WAF, Secrets Manager and CloudFront add charges.
The approximate low-traffic baseline is USD 444-464/month, excluding variable
request, LCU, data processing/transfer charges and taxes.

Stopping only EC2 does not stop the other charges. To remove the deployment,
first export any needed voices/audio: stack deletion terminates EC2 and deletes
its root EBS data. Then delete the service stack, wait for deletion, delete the
edge-security stack, and remove only the artifact bucket recorded in this
deployment's state after checking its contents. Do not delete shared account
resources or CloudFront-managed service security groups manually.

## Verification

```sh
python stage_candidate.py
python ops.py logs
python verify_cloud.py
```

The contract tests run inside the EC2 image build. The cloud verifier inspects
private networking, security-group references, IMDSv2, HTTPS, WAF and disabled
caching through AWS APIs, then uses SSM to run API regression checks on EC2.
Those checks verify rejected unauthenticated requests, asynchronous inference,
checksums and decoded audio for both WAV and MP3. The token stays on EC2.
The controller retrieves the measured result into ignored `verification.json`
rather than claiming success from infrastructure creation alone.

The 2026-09-26 security release passed all 18 regression tests, the full
123-package Python audit, natural-stop GPU synthesis, infrastructure checks,
and authenticated WAV/MP3 requests through CloudFront. WAV generation took
8.982 seconds for 5.28 seconds of audio; MP3 generation took 4.001 seconds for
3.72 seconds of audio. These are smoke-test measurements, not a benchmark.

Historical baseline verified on 2026-09-23:

- Six local contract/infrastructure tests passed without local model inference.
- Live EC2 had no public IP; ALB was internal, with only CloudFront's managed
  security group allowed. GPU ingress referenced only the ALB security group.
- First WAV request: 5.40 seconds of 24 kHz mono audio, generated in 37.37 seconds.
- Subsequent MP3 request: 5.56 seconds of audio, generated/encoded in 5.764 seconds.
- Downloaded audio checksums matched server metadata.

These are two smoke-test measurements, not a throughput guarantee. The first
request includes cold inference initialization; longer text and concurrency can
change latency. The demo reference voice is not a production male narrator.
