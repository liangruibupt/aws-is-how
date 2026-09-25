FROM pytorch/pytorch:2.3.1-cuda12.1-cudnn8-runtime
ENV DEBIAN_FRONTEND=noninteractive PIP_NO_CACHE_DIR=1 PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends git ffmpeg sox libsox-dev build-essential \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install setuptools==75.8.0 wheel==0.45.1 Cython==3.0.12
RUN pip install --no-build-isolation -r requirements.txt && pip check
RUN git init /app/source \
    && git -C /app/source remote add origin https://github.com/FunAudioLLM/CosyVoice.git \
    && git -C /app/source fetch --depth 1 origin 074ca6dc9e80a2f424f1f74b48bdd7d3fea531cc \
    && git -C /app/source checkout FETCH_HEAD \
    && git -C /app/source submodule update --init --recursive --depth 1
COPY app.py download_model.py ./
ENV PYTHONPATH=/app/source:/app/source/third_party/Matcha-TTS \
    MODEL_DIR=/models DATA_DIR=/data HOME=/tmp \
    HF_HUB_DISABLE_TELEMETRY=1 HF_HUB_DISABLE_IMPLICIT_TOKEN=1
RUN python -c "from cosyvoice.cli.cosyvoice import AutoModel; import cosyvoice.flow.flow_matching, cosyvoice.hifigan.generator; import onnxruntime; print(onnxruntime.get_available_providers())"
USER 10001:10001
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
