#!/bin/bash
set -euo pipefail
if [ "$(uname -s)" != "Linux" ] ||
   [ "$(cat /sys/devices/virtual/dmi/id/sys_vendor 2>/dev/null)" != "Amazon EC2" ]; then
  echo "CosyVoice deployment must run on EC2, not on a developer workstation." >&2
  exit 1
fi
exec >>/var/log/cosyvoice-bootstrap.log 2>&1
exec 9>/run/lock/cosyvoice-deploy.lock
flock -n 9 || { echo "Another CosyVoice deployment is already running." >&2; exit 1; }
cd /opt/cosyvoice
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y awscli jq
bash "${RELEASE_DIR:-/opt/cosyvoice/release}/ensure_gpu.sh"
command -v nvidia-smi
nvidia-smi
if ! command -v docker; then
  apt-get install -y docker.io
fi
systemctl enable --now docker
if ! docker info --format '{{json .Runtimes}}' | grep -q nvidia; then
  command -v nvidia-ctk
  nvidia-ctk runtime configure --runtime=docker
  systemctl restart docker
fi
mkdir -p /opt/cosyvoice/models /opt/cosyvoice/data
chown -R 10001:10001 /opt/cosyvoice/models /opt/cosyvoice/data
build_cache=()
if docker image inspect cosyvoice3:candidate >/dev/null 2>&1; then
  build_cache+=(--cache-from cosyvoice3:candidate)
fi
docker build --progress=plain --build-arg BUILDKIT_INLINE_CACHE=1 "${build_cache[@]}" \
  -t cosyvoice3:candidate "${RELEASE_DIR:-/opt/cosyvoice/release}"
docker run --rm --cap-drop ALL --security-opt no-new-privileges --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,nodev,size=536870912 \
  cosyvoice3:candidate python /app/audit_dependencies.py --output /tmp/python-audit.json
docker run --rm -v /opt/cosyvoice/models:/models cosyvoice3:candidate python /app/download_model.py
# Validate on the actual GPU before promoting a new image. This is a single-GPU maintenance window.
systemctl stop cosyvoice3 2>/dev/null || true
if [ "${CANDIDATE_ONLY:-0}" = "1" ]; then
  systemctl disable cosyvoice3 2>/dev/null || true
fi
docker run --rm --gpus all --network none --cap-drop ALL --security-opt no-new-privileges \
  --memory 12g --pids-limit 512 --read-only --tmpfs /tmp:rw,noexec,nosuid,nodev,size=536870912 \
  --tmpfs /jit-cache:rw,exec,nosuid,nodev,size=268435456,uid=10001,gid=10001,mode=0700 \
  -e HF_HUB_OFFLINE=1 -e TRANSFORMERS_OFFLINE=1 \
  -v /opt/cosyvoice/models:/models:ro cosyvoice3:candidate python /app/smoke_inference.py
if [ "${CANDIDATE_ONLY:-0}" = "1" ]; then
  echo "SECURITY_CANDIDATE_PASSED"
  exit 0
fi
if docker image inspect cosyvoice3:local >/dev/null 2>&1; then
  docker tag cosyvoice3:local cosyvoice3:previous
fi
docker tag cosyvoice3:candidate cosyvoice3:local
umask 077
printf 'API_TOKEN=' > /etc/cosyvoice3.env
aws --region us-west-2 secretsmanager get-secret-value --secret-id "$COSYVOICE_SECRET_ARN" \
  --query SecretString --output text >> /etc/cosyvoice3.env
printf 'HF_HUB_OFFLINE=1\nTRANSFORMERS_OFFLINE=1\n' >> /etc/cosyvoice3.env
cat >/etc/systemd/system/cosyvoice3.service <<'UNIT'
[Unit]
Description=CosyVoice 3 private GPU API
After=docker.service network-online.target
Requires=docker.service
StartLimitIntervalSec=600
StartLimitBurst=5
[Service]
Restart=on-failure
RestartSec=20
TimeoutStartSec=0
ExecStartPre=-/usr/bin/docker rm -f cosyvoice3
ExecStartPre=/bin/bash /opt/cosyvoice/release/ensure_gpu.sh
ExecStart=/usr/bin/docker run --name cosyvoice3 --gpus all --init --cap-drop ALL --security-opt no-new-privileges --memory 12g --pids-limit 512 --log-opt max-size=10m --log-opt max-file=3 --env-file /etc/cosyvoice3.env --read-only --tmpfs /tmp:rw,noexec,nosuid,nodev,size=536870912 --tmpfs /jit-cache:rw,exec,nosuid,nodev,size=268435456,uid=10001,gid=10001,mode=0700 -p 8000:8000 -v /opt/cosyvoice/models:/models:ro -v /opt/cosyvoice/data:/data cosyvoice3:local
ExecStop=/usr/bin/docker stop -t 30 cosyvoice3
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl reset-failed cosyvoice3 || true
systemctl enable --now cosyvoice3
echo "BOOTSTRAP_FINISHED"
