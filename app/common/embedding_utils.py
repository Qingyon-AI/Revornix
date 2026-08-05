from __future__ import annotations

from typing import Any, Iterable
import math


def _to_python_value(raw: Any):
    # numpy / torch / pandas 常见：tolist()
    if hasattr(raw, "tolist"):
        return raw.tolist()
    return raw


def _is_number(x: Any) -> bool:
    # 排除 bool（bool 是 int 子类）
    if isinstance(x, bool):
        return False
    return isinstance(x, (int, float))


def coerce_embedding_vector(vector_raw: Any, *, allow_nan_inf: bool = False) -> list[float]:
    vector = _to_python_value(vector_raw)

    # 支持任意 iterable（但排除 str/bytes/dict 等）
    if isinstance(vector, (str, bytes, dict)) or not isinstance(vector, Iterable):
        raise TypeError(f"Embedding vector has unsupported type: {type(vector).__name__}")

    try:
        out = [float(v) for v in vector]  # list/tuple/array/tensor.tolist 后都能走到这里
    except (TypeError, ValueError) as e:
        raise TypeError(f"Embedding vector contains non-numeric values: {e}") from e

    # 过滤 bool 转换后的 0/1（上面 float(True) 不会报错）
    # 如果你希望 bool 直接报错，用下面这段更严格：
    if any(isinstance(v, bool) for v in _to_python_value(vector_raw) if not hasattr(vector_raw, "tolist")):
        raise TypeError("Embedding vector contains boolean values")

    if not allow_nan_inf:
        bad = next((x for x in out if not math.isfinite(x)), None)
        if bad is not None:
            raise ValueError(f"Embedding vector contains NaN/Inf: {bad}")

    return out


def coerce_embedding_vectors(*, vectors_raw: Any, expected_count: int) -> list[list[float]]:
    vectors_value = _to_python_value(vectors_raw)

    if isinstance(vectors_value, (str, bytes, dict)) or not isinstance(vectors_value, Iterable):
        raise TypeError(f"Embedding output has unsupported type: {type(vectors_value).__name__}")

    vectors = list(vectors_value)

    # 兼容：单条输入但返回形如 [0.1, 0.2, ...]
    if expected_count == 1 and vectors and _is_number(vectors[0]):
        return [coerce_embedding_vector(vectors)]

    if len(vectors) != expected_count:
        raise ValueError(f"Embedding output size mismatch: expected {expected_count}, got {len(vectors)}")

    return [coerce_embedding_vector(v) for v in vectors]


def extract_single_embedding_vector(embeddings_raw: Any) -> list[float]:
    embeddings_value = _to_python_value(embeddings_raw)

    if isinstance(embeddings_value, (str, bytes, dict)) or not isinstance(embeddings_value, Iterable):
        raise TypeError(
            f"Embedding output has unsupported type for single input: {type(embeddings_value).__name__}"
        )

    embeddings = list(embeddings_value)
    if not embeddings:
        raise ValueError("Embedding output is empty for single input")

    # 兼容：直接就是向量
    if _is_number(embeddings[0]):
        return coerce_embedding_vector(embeddings)

    # 常见：[[...]] 或 [{"embedding":[...]}]（后者你可以按需再扩展）
    return coerce_embedding_vector(embeddings[0])