# Qwen-Image-2.1 on AWS g7e

Deploys [Qwen-Image-2.1](https://github.com/QwenLM/Qwen-Image-2.1) (released 2026-09-20) on one
RTX PRO 6000 Blackwell (96 GB) of a `g7e` instance, with a small web console for testing. The same
model does **text-to-image, image editing with up to 10 reference images, and native transparent
(RGBA) output**, at native 2K.

Links: [blog](https://qwen.ai/blog?id=qwen-image-2.1) · [GitHub](https://github.com/QwenLM/Qwen-Image-2.1) ·
[HF](https://huggingface.co/Qwen/Qwen-Image-2.1) · [ModelScope](https://www.modelscope.cn/models/Qwen/Qwen-Image-2.1)

## Model facts

| | |
|---|---|
| Visual generator | 7B single-stream DiT, 32 layers, block-causal attention with prefix KV-cache reuse |
| Text/condition encoder | Qwen3-VL-8B (encodes prompt **and** reference images) |
| VAE | 64-channel **RGBA** autoencoder, 16× spatial — every output is RGBA; the console flattens to RGB unless you ask for transparency |
| Checkpoint | 33 GB bf16 (`text_encoder` 17.5 GB, `transformer` 14.2 GB, `vae` 1.35 GB), not gated |
| Defaults | 40 steps, `true_cfg_scale=1.0` (CFG-distilled — negative prompt only takes effect when CFG > 1) |
| Inference | `diffusers.QwenImage21Pipeline` (diffusers ≥ 0.41 dev, transformers ≥ 5.17) |

Official 2K canvases: 1:1 2048², 4:3 2400×1792, 3:4 1792×2400, 3:2 2528×1696, 2:3 1696×2528,
16:9 2752×1536, 9:16 1536×2752. The console's "1K" tier halves these.

## Measured (1 × RTX PRO 6000, bf16, no offload)

| | time | peak VRAM |
|---|---|---|
| model load | 4 s | 30.2 GiB resident |
| 1024² · 40 steps | 10.0 s | 36.8 GiB |
| 1024² · 20 steps | 4.7 s | 36.8 GiB |
| 2048² · 40 steps | 51.7 s | 56.5 GiB |
| edit, 1 ref, 1376×768 · 40 steps | 11.4 s | 38.9 GiB |
| RGBA sticker 1024² · 30 steps | 7.2 s | 36.8 GiB |

## Files

| Path | Purpose |
|---|---|
| `setup_env.sh` | Creates `/opt/dlami/nvme/qi_venv` (torch cu130 + diffusers git + transformers 5.17) and downloads the checkpoint to `/opt/dlami/nvme/qwen_image/Qwen-Image-2.1`. |
| `webui/server.py` | FastAPI server owning one pipeline; single GPU worker queue; `/api/generate` (multipart: prompt, refs, size, steps, seed, cfg, transparent), `/api/jobs/{id}`, `/api/images/{name}`, `/api/history`. |
| `webui/static/index.html` | Two-tab console (Text → Image, Edit/Reference → Image), 1K/2K tiers, RGBA toggle with checkerboard preview, multi-image previews, history gallery, "use as reference" chaining. |
| `webui/run_server.sh` | start / stop / logs on :7861, pinned to `GPU=1` by default. Sets the `LD_LIBRARY_PATH` fix below. |
| `prompt_examples.md` | Prompts run on this deployment + the official RGBA phrasing and editing patterns. |
| `sample_qwen-image_prompt.md` | 中文长提示词示例（人物与静物），展示官方 prompt-rewriter 风格的高细节描述写法。 |

## Deploy

```bash
# on the box (DLAMI Ubuntu 24.04, docker/driver already present)
./setup_env.sh                    # ~2 min venv + ~2 min for 33 GB on the g7e NIC
GPU=1 webui/run_server.sh         # model ready in ~5 s after python starts
# locally (corp network blocks direct EC2 access, so tunnel over SSM)
LPORT=7861 RPORT=7861 ../../video_models/minimax_h3/tunnel_webui.sh   # → http://localhost:7861
```

### Gotcha: cuDNN sub-library loading with the CUDA-13 pip wheels

With `torch 2.14+cu130` from pip, the first VAE decode fails with
`CUDNN_STATUS_SUBLIBRARY_LOADING_FAILED` (`libcudnn_engines_runtime_compiled.so.9`). The DiT runs
fine; only the conv-heavy VAE trips it. Cause: the CUDA-13 wheels consolidate `libnvrtc.so.13` into
`site-packages/nvidia/cu13/lib`, and cuDNN's runtime-compiled engine `dlopen`s it outside the
loader's search path. Fix (baked into `run_server.sh`):

```bash
SP=$VENV/lib/python3.12/site-packages/nvidia
export LD_LIBRARY_PATH=$SP/cu13/lib:$SP/cudnn/lib:$SP/cusparselt/lib:$SP/nccl/lib:$SP/nvshmem/lib
```

Also: diffusers now wants `dtype=` (not `torch_dtype=`).

## Sharing the box with MiniMax-H3

The g7e.12xlarge runs MiniMax-H3's `fl2va` replica (t2va + fl2va, 67 GB) on **GPU 0** and
Qwen-Image-2.1 on **GPU 1**. H3's `ref2va` replica (68 GB) cannot co-exist with Qwen-Image on one
96 GB card; to get it back, `webui/run_server.sh stop` and restart ref2va per the MiniMax-H3 README.

Ports: 7860 H3 console · 7861 Qwen-Image console · 30010 H3 fl2va sglang · 30030 H3 ref2va sglang.

## Incident note (why the box rebooted once)

DLAMI's `unattended-upgrades` fired 2 minutes after first boot — before the H3 bringup script
masked it — upgraded `nvidia-fabricmanager` 595→615 and scheduled a reboot for 00:02 UTC, which
killed every service. NVMe data survived. It is masked now; on a fresh box, mask it **first**:

```bash
sudo systemctl disable --now unattended-upgrades apt-daily.timer apt-daily-upgrade.timer
sudo systemctl mask unattended-upgrades
```
