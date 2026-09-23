# CosyVoice 3 on AWS

An always-on, single-GPU text-to-speech API in Oregon (`us-west-2`).
Only CloudFront is public:

## Current Deployment

- Public API: <https://d2ngrjq5oi2ru4.cloudfront.net>
- Readiness: <https://d2ngrjq5oi2ru4.cloudfront.net/healthz>
- Status: end-to-end verified on 2026-09-23. Readiness returns HTTP 200,
  unauthenticated API requests return HTTP 401, and both WAV and MP3 synthesis
  completed successfully through CloudFront.
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
- Storage: 100 GiB encrypted gp3.
- Base AMI: AWS Deep Learning Base OSS NVIDIA Driver GPU AMI, Ubuntu 22.04.
- Container: PyTorch 2.3.1 / CUDA 12.1 / cuDNN 8, CosyVoice 3 in FP16.

The runtime intentionally pins older compatible Python dependencies. Diffusers
is pinned to 0.32.2 for the newer Hugging Face Hub API, and build tooling is
pinned because the upstream Whisper release imports `pkg_resources`.
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
- `test_app.py`: contract and infrastructure tests without local inference.

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

Update existing service code:

```sh
python update_service.py
python ops.py logs
python ops.py status
python verify_cloud.py
```

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
USD 384 for 730 hours), and 100 GiB gp3 is about USD 8/month. ALB, NAT,
NAT public IPv4, WAF, Secrets Manager and CloudFront add charges.
The approximate low-traffic baseline is USD 440-460/month, excluding variable
request, LCU, data processing/transfer charges and taxes.

Stopping only EC2 does not stop the other charges. To remove the deployment,
first export any needed voices/audio: stack deletion terminates EC2 and deletes
its root EBS data. Then delete the service stack, wait for deletion, delete the
edge-security stack, and remove only the artifact bucket recorded in this
deployment's state after checking its contents. Do not delete shared account
resources or CloudFront-managed service security groups manually.

## Verification

```sh
python -W error::ResourceWarning -m unittest discover -s . -p test_app.py -v
python verify_cloud.py
```

The contract tests require no local model weights or inference. The cloud
verifier checks private networking, security-group references, IMDSv2, HTTPS,
WAF, disabled caching, rejected unauthenticated requests, asynchronous inference
and the checksum/PCM structure of a real generated WAV. It writes its measured
result to the ignored `verification.json` rather than claiming success from
infrastructure creation alone.

Verified on 2026-09-23:

- Six local contract/infrastructure tests passed without local model inference.
- Live EC2 had no public IP; ALB was internal, with only CloudFront's managed
  security group allowed. GPU ingress referenced only the ALB security group.
- First WAV request: 5.40 seconds of 24 kHz mono audio, generated in 37.37 seconds.
- Subsequent MP3 request: 5.56 seconds of audio, generated/encoded in 5.764 seconds.
- Downloaded audio checksums matched server metadata.

These are two smoke-test measurements, not a throughput guarantee. The first
request includes cold inference initialization; longer text and concurrency can
change latency. The demo reference voice is not a production male narrator.
