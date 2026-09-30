#!/bin/bash
# First-boot bootstrap for a KiroCrew + Codex remote coding host.
# Ubuntu 24.04 arm64. Runs as root via cloud-init; installs tools under "ubuntu".
# All output also goes to the serial console (readable via ec2 get-console-output).
exec > >(tee -a /var/log/kirocrew-bootstrap.log | logger -t kc-boot -s 2>/dev/console) 2>&1
set -euxo pipefail

U=ubuntu
H=/home/$U
CODEX_VERSION=0.159.2

echo "KCBOOT: stage=apt"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y python3 python3-pip python3-venv pipx curl git unzip jq \
  build-essential ca-certificates gnupg tmux ripgrep

echo "KCBOOT: stage=node"
# Node.js 22 LTS (needed for Codex CLI)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

echo "KCBOOT: stage=codex"
npm install -g "@openai/codex@${CODEX_VERSION}"
codex --version || true

echo "KCBOOT: stage=awscli"
# AWS CLI v2 (instance role credentials are picked up automatically)
cd /tmp
curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o awscliv2.zip
unzip -q -o awscliv2.zip && ./aws/install --update
aws --version || true

# Let the ubuntu user keep user-level systemd services running without a login.
loginctl enable-linger "$U"

echo "KCBOOT: stage=kiro-cli"
sudo -u "$U" -H bash -lc 'curl -fsSL https://cli.kiro.dev/install | bash' </dev/null || \
  echo "KCBOOT: WARN kiro-cli install script failed; retry manually"

echo "KCBOOT: stage=kirocrew"
sudo -u "$U" -H bash -lc 'curl -fsSL https://download.crew.kiro.dev/cli.sh | sh' </dev/null

grep -q '.local/bin' "$H/.bashrc" || echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$H/.bashrc"

echo "KCBOOT: stage=service"
# Install the gateway as a systemd user service (binds 127.0.0.1:5476).
UID_U=$(id -u "$U")
for i in $(seq 1 30); do [ -S "/run/user/$UID_U/bus" ] && break; sleep 2; done
sudo -u "$U" -H XDG_RUNTIME_DIR="/run/user/$UID_U" \
  DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$UID_U/bus" \
  bash -lc 'export PATH="$HOME/.local/bin:$PATH"; kirocrew service install' </dev/null || \
  echo "KCBOOT: WARN kirocrew service install failed; run it manually"

echo "KCBOOT: versions"
sudo -u "$U" -H bash -lc 'export PATH="$HOME/.local/bin:$PATH"; kiro-cli --version; kirocrew --version; codex --version' || true
echo "KCBOOT: DONE"
