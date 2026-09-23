"""Download only pinned official inference files on the EC2 host volume."""
import hashlib
import json
import os
from pathlib import Path

from huggingface_hub import HfApi, snapshot_download

REPO = "FunAudioLLM/Fun-CosyVoice3-0.5B-2512"
REVISION = "29e01c4e8d000f4bcd70751be16fa94bf3d85a18"
root = Path(os.environ.get("MODEL_DIR", "/models"))
files = ["README.md", "cosyvoice3.yaml", "config.json", "configuration.json",
         "llm.pt", "flow.pt", "hift.pt", "campplus.onnx", "speech_tokenizer_v3.onnx",
         "CosyVoice-BlankEN/config.json", "CosyVoice-BlankEN/generation_config.json",
         "CosyVoice-BlankEN/merges.txt", "CosyVoice-BlankEN/tokenizer_config.json",
         "CosyVoice-BlankEN/vocab.json", "CosyVoice-BlankEN/model.safetensors"]
info = HfApi().model_info(REPO, revision=REVISION, files_metadata=True, token=False)
assert info.sha == REVISION
snapshot_download(REPO, revision=REVISION, local_dir=str(root), allow_patterns=files,
                  max_workers=2, token=False)
manifest = {"repository": REPO, "revision": REVISION, "files": {}}
metadata = {entry.rfilename: entry for entry in info.siblings}
for name in files:
    path = root/name
    assert path.stat().st_size == metadata[name].size, name
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024*1024), b""):
            digest.update(block)
    value = digest.hexdigest()
    if metadata[name].lfs:
        assert value == metadata[name].lfs.sha256, name
    manifest["files"][name] = {"size": path.stat().st_size, "sha256": value}
(root/"manifest.json").write_text(json.dumps(manifest, indent=2)+"\n")
print(json.dumps({"status": "VERIFIED", "files": len(files),
                  "bytes": sum(item["size"] for item in manifest["files"].values())}), flush=True)
