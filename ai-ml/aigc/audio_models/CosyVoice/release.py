"""Deterministic, explicit runtime bundle; never include tokens or deployment state."""
import gzip
import io
from pathlib import Path
import tarfile

RUNTIME_FILES = (
    "Dockerfile", "requirements.in", "requirements.txt", "app.py", "download_model.py",
    "bootstrap.sh", "prepare_inference.py", "inference_config.py", "audit_dependencies.py",
    "smoke_inference.py", "verify_api.py",
    "test_app.py", "test_verify_api.py", "infra.py",
    "ensure_gpu.sh",
)


def build_archive(root: Path) -> bytes:
    result = io.BytesIO()
    with gzip.GzipFile(fileobj=result, mode="wb", mtime=0) as compressed:
        with tarfile.open(fileobj=compressed, mode="w") as archive:
            for name in RUNTIME_FILES:
                data = (root/name).read_bytes()
                item = tarfile.TarInfo(name)
                item.size, item.mode, item.mtime = len(data), 0o644, 0
                archive.addfile(item, io.BytesIO(data))
    return result.getvalue()
