"""Audit every installed distribution, failing closed on findings or skipped packages."""
import argparse
import importlib.metadata
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile

parser = argparse.ArgumentParser()
parser.add_argument("--output", type=Path, default=Path("/tmp/python-audit.json"))
args = parser.parse_args()
inventory = sorted(({"name": item.metadata["Name"], "version": item.version}
                    for item in importlib.metadata.distributions()), key=lambda item: item["name"].lower())
forbidden = {"lightning", "pytorch-lightning", "torchmetrics", "tensorboard",
             "hydra-core", "modelscope", "onnx", "pyarrow", "pyworld", "gdown"}
present = {item["name"].lower().replace("_", "-") for item in inventory}
if present & forbidden:
    raise RuntimeError(f"Training/download/conversion packages present: {sorted(present & forbidden)}")
mapped = []
with tempfile.TemporaryDirectory(prefix="cosyvoice-audit-") as temporary:
    requirements = Path(temporary)/"installed.txt"
    lines = []
    for item in inventory:
        version = item["version"]
        # CUDA wheels share PyPI source advisories; retain exact builds in the inventory.
        if item["name"].lower() in {"torch", "torchaudio"} and re.search(r"\+cu\d+$", version):
            mapped.append({"name": item["name"], "installed": version, "advisoryVersion": version.split("+")[0]})
            version = version.split("+")[0]
        lines.append(f'{item["name"]}=={version}')
    requirements.write_text("\n".join(lines)+"\n")
    raw = Path(temporary)/"audit.json"
    result = subprocess.run([sys.executable, "-m", "pip_audit", "--disable-pip", "--no-deps",
                             "--cache-dir", str(Path(temporary)/"cache"),
                             "-r", str(requirements), "--format", "json", "--output", str(raw)])
    if not raw.exists():
        raise RuntimeError("Dependency audit did not produce a result")
    audit = json.loads(raw.read_text())
    skipped = [item for item in audit["dependencies"] if "skip_reason" in item]
    findings = [item for item in audit["dependencies"] if item.get("vulns")]
    report = {"status": "PASS" if result.returncode == 0 and not skipped and not findings else "FAIL",
              "inventory": inventory, "cudaAdvisoryMappings": mapped, "skipped": skipped,
              "findings": findings, "audit": audit}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2)+"\n")
    if report["status"] != "PASS":
        raise RuntimeError(f"Audit failed: {len(findings)} vulnerable packages, {len(skipped)} skipped")
print(json.dumps({"status": "PASS", "packages": len(inventory), "ignoredAdvisories": 0}))
