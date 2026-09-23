#!/bin/bash
# EC2 user-data (Ubuntu 24.04, x86_64): installs Kokoro on a start/stop-on-demand box.
# Stopped instances only bill EBS storage, so this is the "no compute charge when idle" option
# that also doubles as a fast linux/amd64 Docker build host for build.sh.
#
# Afterwards on the box:  /opt/tts/tts.sh <voice> <out.wav> "<text or /path/to/script.txt>"
set -ex
exec > /var/log/tts-userdata.log 2>&1

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y espeak-ng python3-venv python3-pip ffmpeg unzip curl docker.io
systemctl enable --now docker
usermod -aG docker ubuntu

# AWS CLI v2
cd /tmp && curl -s https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip -o awscliv2.zip && unzip -q awscliv2.zip && ./aws/install

mkdir -p /opt/tts/out && cd /opt/tts
python3 -m venv venv
./venv/bin/pip install -q --upgrade pip
./venv/bin/pip install -q torch --index-url https://download.pytorch.org/whl/cpu   # CPU-only torch
./venv/bin/pip install -q "kokoro>=0.9.4" "misaki[en,zh]" soundfile

cat > tts.py <<'EOF'
import sys, os
import numpy as np, soundfile as sf
from kokoro import KPipeline
voice, out, src = sys.argv[1], sys.argv[2], sys.argv[3]
text = open(src, encoding='utf-8').read() if os.path.isfile(src) else src
p = KPipeline(lang_code=voice[0], repo_id='hexgrad/Kokoro-82M')
audio = np.concatenate([a for _, _, a in p(text, voice=voice, speed=1.0)])
sf.write(out, audio, 24000)
print(out, round(len(audio) / 24000, 1), 's')
EOF
cat > tts.sh <<'EOF'
#!/bin/bash
# usage: /opt/tts/tts.sh <voice> <out.wav> "<text or /path/to/file.txt>"
exec /opt/tts/venv/bin/python /opt/tts/tts.py "$@"
EOF
chmod +x tts.sh
chown -R ubuntu:ubuntu /opt/tts

# Pre-download model + voices and smoke test
./tts.sh zm_yunjian out/smoke_zh.wav "你好，这是一次冒烟测试。"
./tts.sh am_michael out/smoke_en.wav "Hello, this is a smoke test."
echo ALL_DONE
