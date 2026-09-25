#!/bin/bash
set -euo pipefail
exec >>/var/log/cosyvoice-bootstrap.log 2>&1
cd /opt/cosyvoice
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y awscli jq
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
docker build --progress=plain -t cosyvoice3:local /opt/cosyvoice/release
docker run --rm -v /opt/cosyvoice/models:/models cosyvoice3:local python /app/download_model.py
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
ExecStart=/usr/bin/docker run --name cosyvoice3 --gpus all --init --cap-drop ALL --security-opt no-new-privileges --memory 12g --pids-limit 512 --log-opt max-size=10m --log-opt max-file=3 --env-file /etc/cosyvoice3.env --read-only --tmpfs /tmp:rw,size=536870912 -p 8000:8000 -v /opt/cosyvoice/models:/models:ro -v /opt/cosyvoice/data:/data cosyvoice3:local
ExecStop=/usr/bin/docker stop -t 30 cosyvoice3
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now cosyvoice3
echo "BOOTSTRAP_FINISHED"
