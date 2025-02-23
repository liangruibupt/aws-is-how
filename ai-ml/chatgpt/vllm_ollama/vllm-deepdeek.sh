#!/bin/bash
set -e

MODEL_NAME="deepseek-ai/DeepSeek-R1-Distill-Qwen-32B"
LOCAL_MODEL_NAME="deepseek-ai/DeepSeek-R1-Distill-Qwen-32B"
SERVED_MODEL_NAME="deekseek-r1-distill-qwen-32b"
TENSOR_PARALLEL_SIZE=4 # Equotable to the number of GPUs
MAX_NUM_SEQS=30 # Number of parallel sequences to run
VLLM_API_KEY="mih"

CONTAINER_NAME="vllm"



docker run --rm -v ~/.cache/huggingface:/root/.cache/huggingface public.ecr.aws/docker/library/python:3.10-slim bash -c "
    pip install huggingface_hub && \
    python3 -c 'from huggingface_hub import snapshot_download; snapshot_download(\"$MODEL_NAME\")'
"

# Check if a container named "$CONTAINER_NAME" is already running
if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
    echo "A container named '$CONTAINER_NAME' is already running."
    echo "To stop and remove it, you can run the following commands:"
    echo "  docker stop $CONTAINER_NAME && docker rm $CONTAINER_NAME"
    echo "Then, you can rerun this script."
    exit 1
fi

# Run the Docker container with the appropriate settings
docker run --restart always -dit --runtime nvidia --gpus=all \
    -v ~/.cache/huggingface:/root/.cache/huggingface \
    -v $(pwd)/chatml_prefill.jinja:/vllm-workspace/jinja/chatml_prefill.jinja \
    -p 8000:8000 \
    --ipc=host \
    --env "VLLM_ATTENTION_BACKEND=FLASHINFER" \
    --env "VLLM_ALLOW_LONG_MAX_MODEL_LEN=1" \
    --env "LLM_WORKER_MULTIPROC_METHOD=spawn" \
    --env "VLLM_API_KEY=$VLLM_API_KEY" \
    --name $CONTAINER_NAME \
    public.ecr.aws/aws-gcr-solutions/medical-insight/vllm/vllm-openai:v0.6.6 \
    --model $MODEL_NAME \
    --dtype auto \
    --tensor-parallel-size $TENSOR_PARALLEL_SIZE \
    --gpu-memory-utilization 0.9 \
    --max-model-len 30000  \
    --enable-prefix-caching \
    --served-model-name "$SERVED_MODEL_NAME" \
    --chat-template /vllm-workspace/jinja/chatml_prefill.jinja \
    --max-num-seqs $MAX_NUM_SEQS

echo "The container '$CONTAINER_NAME' has been started."
echo "You can view the logs using the following command:"
echo "  docker logs --tail 50 -f $CONTAINER_NAME"