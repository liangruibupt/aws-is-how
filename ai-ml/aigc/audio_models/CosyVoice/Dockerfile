FROM ubuntu:24.04@sha256:008173c23f95b170204355c12626cb5a965d779a7e1283b09e9cffbb1bf33ca3
ENV DEBIAN_FRONTEND=noninteractive PIP_NO_CACHE_DIR=1 PYTHONUNBUFFERED=1 \
    PATH=/opt/runtime/bin:$PATH NVIDIA_VISIBLE_DEVICES=all \
    NVIDIA_DRIVER_CAPABILITIES=compute,utility NVIDIA_REQUIRE_CUDA="cuda>=12.6"
RUN apt-get update && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends ca-certificates python3 python3-venv python3-dev git ffmpeg libsndfile1 build-essential \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /opt/runtime
WORKDIR /app
COPY requirements.txt .
RUN pip install --require-hashes --extra-index-url https://download.pytorch.org/whl/cu126 -r requirements.txt && pip check
RUN git init /app/source \
    && git -C /app/source remote add origin https://github.com/FunAudioLLM/CosyVoice.git \
    && git -C /app/source fetch --depth 1 origin 074ca6dc9e80a2f424f1f74b48bdd7d3fea531cc \
    && git -C /app/source checkout FETCH_HEAD \
    && git -C /app/source submodule update --init --recursive --depth 1
COPY prepare_inference.py audit_dependencies.py inference_config.py ./
RUN python prepare_inference.py /app/source
ENV PYTHONPATH=/app/source:/app/source/third_party/Matcha-TTS \
    MODEL_DIR=/models DATA_DIR=/data HOME=/tmp \
    HF_HUB_DISABLE_TELEMETRY=1 HF_HUB_DISABLE_IMPLICIT_TOKEN=1 \
    NUMBA_CACHE_DIR=/jit-cache/numba TRITON_CACHE_DIR=/jit-cache/triton \
    TORCHINDUCTOR_CACHE_DIR=/jit-cache/torchinductor
RUN python -c "from cosyvoice.cli.cosyvoice import AutoModel; import cosyvoice.flow.flow_matching, cosyvoice.hifigan.generator" \
    && python audit_dependencies.py --output /app/python-audit.json
COPY app.py download_model.py smoke_inference.py verify_api.py test_app.py test_verify_api.py infra.py ./
RUN python -W error::ResourceWarning -m unittest test_app test_verify_api -v
USER 10001:10001
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
