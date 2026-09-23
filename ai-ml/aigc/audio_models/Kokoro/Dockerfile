FROM public.ecr.aws/lambda/python:3.12

# espeak-ng is a fallback for English out-of-dictionary words; misaki also ships espeakng-loader.
# ffmpeg static build for optional mp3 output.
RUN dnf install -y tar xz gzip && dnf clean all && \
    curl -sL https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o /tmp/ffmpeg.tar.xz && \
    tar -xJf /tmp/ffmpeg.tar.xz -C /tmp && mv /tmp/ffmpeg-*-static/ffmpeg /usr/local/bin/ffmpeg && rm -rf /tmp/ffmpeg*

RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir "kokoro>=0.9.4" "misaki[en,zh]" soundfile boto3

# Bake model weights, voices and spaCy model into the image so runtime needs no network.
ENV HF_HOME=/opt/hf
COPY warmup.py /tmp/warmup.py
RUN python /tmp/warmup.py && rm /tmp/warmup.py
ENV HF_HUB_OFFLINE=1
ENV TRANSFORMERS_OFFLINE=1

COPY app.py ${LAMBDA_TASK_ROOT}/
CMD ["app.handler"]
