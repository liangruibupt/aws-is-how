"""Exclude training objects before HyperPyYAML instantiates the trusted model configuration."""
import io

import yaml

ALLOWED = {
    "__set_seed1", "__set_seed2", "__set_seed3", "__set_seed4",
    "sample_rate", "llm_input_size", "llm_output_size", "spk_embed_dim",
    "qwen_pretrain_path", "token_frame_rate", "token_mel_ratio", "chunk_size",
    "num_decoding_left_chunks", "llm", "flow", "hift", "get_tokenizer",
    "allowed_special", "feat_extractor",
}
REQUIRED = {"sample_rate", "llm", "flow", "hift", "get_tokenizer", "allowed_special", "feat_extractor"}


def filter_config(stream):
    text = stream.read() if hasattr(stream, "read") else stream
    # compose builds syntax nodes only; it does not execute !new/!apply constructors.
    node = yaml.compose(text, Loader=yaml.SafeLoader)
    if not isinstance(node, yaml.MappingNode):
        raise ValueError("Expected the pinned CosyVoice mapping")
    keys = [key.value for key, _ in node.value]
    if len(keys) != len(set(keys)) or not REQUIRED.issubset(keys):
        raise ValueError("Unexpected or incomplete inference configuration")
    node.value = [(key, value) for key, value in node.value if key.value in ALLOWED]
    return yaml.serialize(node)


def load_hyperpyyaml(stream, *args, **kwargs):
    from hyperpyyaml import load_hyperpyyaml as original
    return original(io.StringIO(filter_config(stream)), *args, **kwargs)
