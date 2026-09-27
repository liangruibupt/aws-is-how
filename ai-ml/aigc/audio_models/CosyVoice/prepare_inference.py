"""Apply narrow, reviewed inference-only adaptations to the pinned upstream source."""
import argparse
import ast
import hashlib
import json
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument("source", type=Path)
parser.add_argument("--archive-test", action="store_true", help="For tests against pinned source archives only")
args = parser.parse_args()
source = args.source
matcha = source/"third_party/Matcha-TTS"
if not args.archive_test:
    for directory, expected in [(source, "074ca6dc9e80a2f424f1f74b48bdd7d3fea531cc"),
                                (matcha, "dd9105b34bf2be2230f4aa1e4769fb586a3c824e")]:
        actual = subprocess.check_output(["git", "-C", str(directory), "rev-parse", "HEAD"], text=True).strip()
        if actual != expected:
            raise RuntimeError(f"Unexpected source revision: {directory}")
        subprocess.run(["git", "-C", str(directory), "diff", "--exit-code"], check=True,
                       stdout=subprocess.DEVNULL)
changes = []


def edit(relative, transform):
    path = source/relative
    before = path.read_text()
    after = transform(before)
    ast.parse(after)
    path.write_text(after)
    changes.append({"file": str(relative), "beforeSHA256": hashlib.sha256(before.encode()).hexdigest(),
                    "afterSHA256": hashlib.sha256(after.encode()).hexdigest()})


def replace_once(text, old, new):
    if text.count(old) != 1:
        raise RuntimeError(f"Upstream fragment changed: {old!r}")
    return text.replace(old, new, 1)


def logging_init(text):
    if "from matcha.utils.instantiators import" not in text:
        raise RuntimeError("Unexpected Matcha utility initializer")
    return '"""Inference exports; training callbacks and application servers are not installed."""\nfrom .pylogger import get_pylogger\n'


def logger(text):
    if "from lightning.pytorch.utilities import rank_zero_only" not in text:
        raise RuntimeError("Unexpected upstream logger")
    return ('"""Single-process inference logging; no distributed training dependency."""\n'
            'import logging\n\n\ndef get_pylogger(name=__name__):\n    return logging.getLogger(name)\n')


edit(Path("third_party/Matcha-TTS/matcha/utils/__init__.py"), logging_init)
edit(Path("third_party/Matcha-TTS/matcha/utils/pylogger.py"), logger)
edit(Path("cosyvoice/cli/cosyvoice.py"), lambda text: replace_once(
    text, "from modelscope import snapshot_download",
    'def snapshot_download(*args, **kwargs):\n'
    '    raise RuntimeError("This deployment loads only the preverified local model directory")'))
edit(Path("cosyvoice/cli/cosyvoice.py"), lambda text: replace_once(
    text, "from hyperpyyaml import load_hyperpyyaml",
    "from inference_config import load_hyperpyyaml"))


edit(Path("cosyvoice/utils/file_utils.py"), lambda text: replace_once(
    text, "    speech, sample_rate = torchaudio.load(wav, backend='soundfile')",
    "    import soundfile as sf\n"
    "    data, sample_rate = sf.read(wav, dtype='float32', always_2d=True)\n"
    "    speech = torch.from_numpy(data.T.copy())"))
edit(Path("cosyvoice/cli/frontend.py"), lambda text: replace_once(
    text, "        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')",
    "        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')\n"
    "        if torch.cuda.is_available():\n"
    "            onnxruntime.preload_dlls(directory='')"))
edit(Path("cosyvoice/llm/llm.py"), lambda text: replace_once(
    text, "        input_masks = masks[:, -1, :]",
    "        input_masks = masks[:, -1, :]\n"
    "        # Transformers 5 requires the full unpadded inference cache mask.\n"
    "        cached = cache.get_seq_length() if cache is not None else 0\n"
    "        expected = cached + xs.shape[1]\n"
    "        if input_masks.shape[-1] < expected:\n"
    "            prefix = input_masks.new_ones((xs.shape[0], expected - input_masks.shape[-1]))\n"
    "            input_masks = torch.cat((prefix, input_masks), dim=-1)"))
(source/"inference-patch-manifest.json").write_text(json.dumps({
    "scope": "Single-process inference only; checkpoint tensor shapes are not modified",
    "changes": changes,
}, indent=2)+"\n")
print(json.dumps({"patchedFiles": len(changes)}))
