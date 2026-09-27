#!/bin/bash
# Repair only the NVIDIA module for the running kernel; do not unhold or downgrade kernels.
set -euo pipefail
if nvidia-smi >/dev/null 2>&1; then
  exit 0
fi
kernel=$(uname -r)
version=$(dkms status -m nvidia | awk -F'[/,]' '/^nvidia\// {print $2}' | sort -Vu | tail -n 1)
if [ -z "$version" ]; then
  echo "No registered NVIDIA DKMS source; manual driver repair required" >&2
  exit 1
fi
if [ ! -d "/usr/src/linux-headers-$kernel" ]; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends "linux-headers-$kernel"
fi
dkms install -m nvidia -v "$version" -k "$kernel"
modprobe nvidia
nvidia-smi
