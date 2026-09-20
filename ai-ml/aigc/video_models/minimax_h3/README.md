# MiniMax-H3 (video + audio) on AWS g7e

Deploys [MiniMax-H3](https://huggingface.co/MiniMaxAI/MiniMax-H3) — a 33B joint **video + audio**
DiT — on a `g7e` instance (NVIDIA RTX PRO 6000 Blackwell, 96 GB/GPU) following
[whn09/minimax_h3_g7e](https://github.com/whn09/minimax_h3_g7e), and puts a small web console in
front of it. The model does **not** generate still images: every task outputs an mp4 with a soundtrack.

| Task | Input | Served by |
|---|---|---|
| `t2va` | text prompt | FL2VA partition, port 30010 |
| `fl2va` | first frame image (+ optional last frame) + prompt | FL2VA partition, port 30010 |
| `ref2va` | reference image / video / audio + prompt | Ref2VA partition, port 30030 |

One sglang process serves one partition, so all three tasks at once needs 2 GPUs (`g7e.12xlarge`).

## Files here

| File | Purpose |
|---|---|
| `g7e_probe.sh` | Read-only capacity survey: tries a launch in every AZ (spot + on-demand) and terminates it. |
| `g7e_hunt.sh` | Launches the first `g7e.12xlarge` it can get across regions (spot first, on-demand fallback), creating a locked-down SG per region. Writes `/tmp/h3_instance`. |
| `tunnel_webui.sh` | SSM port-forward → `http://localhost:7860` (corp network blocks direct EC2 access). |
| `minimax_h3_webui/` | FastAPI + single-page console: 3 tabs, uploads → `data:` URIs, job polling, in-page playback w/ audio, history gallery. `run_webui.sh` installs deps into the DLAMI venv and runs it on :7860. |

## Deploy (what was done, in order)

```bash
./g7e_hunt.sh                                   # → instance id in /tmp/h3_instance
# ssh alias `h3g7e` uses ProxyCommand aws ssm start-session (see ~/.ssh/config)
ssh h3g7e 'git clone --depth 1 https://github.com/whn09/minimax_h3_g7e.git h3run && chmod +x h3run/scripts/*.sh'
ssh h3g7e 'cd h3run && setsid nohup ./scripts/g7e_bringup.sh > ~/bringup.log 2>&1 < /dev/null &'   # 269 GB weights + image
ssh h3g7e 'cd h3run/scripts && JOBS=16 ./build_image.sh'                                            # h3-g7e:local (patches + SageAttention sm_120a)
ssh h3g7e 'cd h3run/scripts && IMAGE=h3-g7e:local ./serve.sh prepare && ./g7e_quant.sh'             # NVFP4 checkpoints, ~10 min each
```

Start the two servers (from `~/h3run/scripts` on the box):

```bash
SAGE="--attention-backend sage_attn --component-attention-backends text_encoder=torch_sdpa,audio_vae=torch_sdpa,video_vae=torch_sdpa"
IMAGE=h3-g7e:local DEVICES=0 VARIANT=fl2va  GPUS=1 ULYSSES=1 WARMUP="864x480 1344x768" \
  ENVX="SGLANG_DIFFUSION_FLASHINFER_FP4_GEMM_BACKEND=auto" \
  EXTRA="--layerwise-offload-components text_encoder --transformer-weights-path /out/nvfp4_fl2va.safetensors $SAGE" ./serve.sh start
IMAGE=h3-g7e:local DEVICES=1 VARIANT=ref2va GPUS=1 ULYSSES=1 WARMUP="864x480 1344x768" \
  ENVX="SGLANG_DIFFUSION_FLASHINFER_FP4_GEMM_BACKEND=auto SGLANG_MINIMAX_H3_REF_IMAGE_SHORT_EDGE=1024" \
  EXTRA="--layerwise-offload-components text_encoder --transformer-weights-path /out/nvfp4_ref2va.safetensors $SAGE" ./serve.sh start
./serve.sh status
```

Then `cd ~/minimax_h3_webui && ./run_webui.sh` on the box and `./tunnel_webui.sh` locally.

### Gotcha found during deploy

The guide's `Dockerfile` bakes three of the four NVFP4 env vars but **not**
`SGLANG_DIFFUSION_FLASHINFER_FP4_GEMM_BACKEND=auto`. Without it warmup dies with
`mm_fp4 does not support backend 'trtllm' with capability 120`. Pass it via `ENVX=` (as above).

## Measured (g7e.12xlarge spot, us-east-2, 1 GPU per task, NVFP4 + SageAttention, 5 s clip, 20 steps)

| Task | 480p (864×480) |
|---|---|
| t2va | 30 s |
| fl2va | 32 s |
| ref2va (ref short edge 1024) | 40 s |

768p is roughly 3.6× longer (≈115 s). Duration and steps scale super-linearly (attention is O(n²)).

## Cost & teardown

Spot `g7e.12xlarge` was $4.46/h (on-demand $8.29/h). The instance uses local NVMe for everything,
so **terminating loses the weights and checkpoints** (re-deploy from scratch ≈ 40 min).

```bash
export AWS_PROFILE=global_ruiliang
aws ec2 terminate-instances --region us-east-2 --instance-ids $(awk '{print $1}' /tmp/h3_instance)
# optional: remove the per-region security groups g7e_hunt.sh created
for r in us-east-1 us-east-2 us-west-2 eu-central-1; do
  sg=$(aws ec2 describe-security-groups --region $r --filters Name=group-name,Values=minimax-h3-g7e --query 'SecurityGroups[0].GroupId' --output text)
  [ "$sg" != None ] && aws ec2 delete-security-group --region $r --group-id $sg
done
```
