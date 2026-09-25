#!/usr/bin/env bash
# One-shot environment setup for Qwen-Image-2.1 on a DLAMI (Ubuntu 24.04, python3.12) GPU box.
# Creates an isolated venv (diffusers-from-git needs transformers>=5.17, which would disturb other
# stacks) and downloads the 33 GB checkpoint to local NVMe.
#
#   ./setup_env.sh                  # venv + weights
#   WEIGHTS=0 ./setup_env.sh        # venv only
set -euo pipefail
VENV=${VENV:-/opt/dlami/nvme/qi_venv}
MODEL_DIR=${MODEL_DIR:-/opt/dlami/nvme/qwen_image/Qwen-Image-2.1}
WEIGHTS=${WEIGHTS:-1}
# Pin diffusers to a commit known to contain QwenImage21Pipeline; move forward deliberately.
DIFFUSERS_REF=${DIFFUSERS_REF:-main}

if [ ! -x "$VENV/bin/python" ]; then
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install -q -U pip
  # torch built for CUDA 13 (sm_120 / RTX PRO 6000 Blackwell needs cu128+; DLAMI driver 595 is fine)
  "$VENV/bin/pip" install -q torch torchvision --index-url https://download.pytorch.org/whl/cu130
  "$VENV/bin/pip" install -q "transformers>=5.17" accelerate pillow safetensors sentencepiece \
                              fastapi "uvicorn[standard]" python-multipart "huggingface_hub[cli]"
  "$VENV/bin/pip" install -q "git+https://github.com/huggingface/diffusers@${DIFFUSERS_REF}"
fi
"$VENV/bin/python" -c 'import torch,diffusers,transformers; from diffusers import QwenImage21Pipeline
print("torch",torch.__version__,"| diffusers",diffusers.__version__,"| transformers",transformers.__version__,"| QwenImage21Pipeline OK")'

if [ "$WEIGHTS" = 1 ]; then
  export HF_XET_HIGH_PERFORMANCE=1
  mkdir -p "$(dirname "$MODEL_DIR")"
  "$VENV/bin/hf" download Qwen/Qwen-Image-2.1 --local-dir "$MODEL_DIR"
  du -sh "$MODEL_DIR"
fi
echo "done. start the console with: webui/run_server.sh"
