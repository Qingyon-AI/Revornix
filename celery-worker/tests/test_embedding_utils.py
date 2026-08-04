"""向量形状归一化。

不同 embedding 引擎返回的形状不一样：list、tuple、numpy/torch 的数组、单条查询
有时给 `[0.1, 0.2]` 有时给 `[[0.1, 0.2]]`。这层适配一旦判断错，不会抛异常，
只会把**错误的向量**写进 Milvus —— 之后表现为「检索结果莫名其妙」，而不是一个
能定位的报错。所以这里的边界值得逐条钉住。
"""

from __future__ import annotations

import math

import pytest

from common.embedding_utils import (
    coerce_embedding_vector,
    coerce_embedding_vectors,
    extract_single_embedding_vector,
)


class _FakeArray:
    """模拟 numpy / torch 张量：它们靠 tolist() 转成 Python 值。"""

    def __init__(self, data):
        self._data = data

    def tolist(self):
        return self._data


class TestCoerceEmbeddingVector:
    def test_accepts_list_of_floats(self):
        assert coerce_embedding_vector([0.1, 0.2, 0.3]) == [0.1, 0.2, 0.3]

    def test_accepts_tuple(self):
        assert coerce_embedding_vector((1.0, 2.0)) == [1.0, 2.0]

    def test_converts_ints_to_float(self):
        out = coerce_embedding_vector([1, 2])
        assert out == [1.0, 2.0]
        assert all(isinstance(v, float) for v in out)

    def test_unwraps_tensor_like_objects(self):
        # numpy/torch 走这条路径
        assert coerce_embedding_vector(_FakeArray([0.5, 0.25])) == [0.5, 0.25]

    def test_rejects_string(self):
        # 字符串是 Iterable，逐字符遍历会得到一个荒谬的"向量"，必须挡住
        with pytest.raises(TypeError):
            coerce_embedding_vector("0.1,0.2")

    def test_rejects_dict(self):
        # 有些后端把向量包在 {"embedding": [...]} 里，直接传进来应报错而不是静默取键
        with pytest.raises(TypeError):
            coerce_embedding_vector({"embedding": [0.1]})

    def test_rejects_non_numeric_entries(self):
        with pytest.raises(TypeError):
            coerce_embedding_vector([0.1, "x"])

    def test_rejects_booleans(self):
        # float(True) == 1.0 不会报错，所以布尔必须被单独挡下来，
        # 否则一个装满 True/False 的列表会变成合法的 0/1 向量。
        with pytest.raises(TypeError):
            coerce_embedding_vector([True, False])

    @pytest.mark.parametrize("bad", [float("nan"), float("inf"), float("-inf")])
    def test_rejects_nan_and_inf_by_default(self, bad):
        # NaN 写进向量库不会报错，只会让相似度计算失去意义
        with pytest.raises(ValueError):
            coerce_embedding_vector([0.1, bad])

    def test_allows_nan_when_explicitly_opted_in(self):
        out = coerce_embedding_vector([float("nan")], allow_nan_inf=True)
        assert math.isnan(out[0])

    def test_empty_vector_is_allowed(self):
        # 归一化层不判断维度，维度校验是向量库的事
        assert coerce_embedding_vector([]) == []


class TestCoerceEmbeddingVectors:
    def test_batch_of_vectors(self):
        out = coerce_embedding_vectors(vectors_raw=[[0.1], [0.2]], expected_count=2)
        assert out == [[0.1], [0.2]]

    def test_single_query_returned_unwrapped(self):
        # 关键兼容：单条输入时，有的后端直接返回 [0.1, 0.2] 而不是 [[0.1, 0.2]]。
        # 若不识别这种形状，会被当成"两条一维向量"。
        out = coerce_embedding_vectors(vectors_raw=[0.1, 0.2], expected_count=1)
        assert out == [[0.1, 0.2]]

    def test_single_query_already_nested_stays_nested(self):
        out = coerce_embedding_vectors(vectors_raw=[[0.1, 0.2]], expected_count=1)
        assert out == [[0.1, 0.2]]

    def test_count_mismatch_raises(self):
        # 静默少一条会让 chunk 与向量错位，必须炸
        with pytest.raises(ValueError):
            coerce_embedding_vectors(vectors_raw=[[0.1], [0.2]], expected_count=3)

    def test_rejects_unsupported_container(self):
        with pytest.raises(TypeError):
            coerce_embedding_vectors(vectors_raw={"a": 1}, expected_count=1)


class TestExtractSingleEmbeddingVector:
    def test_extracts_from_batch_of_one(self):
        assert extract_single_embedding_vector([[0.1, 0.2]]) == [0.1, 0.2]

    def test_extracts_from_flat_vector(self):
        assert extract_single_embedding_vector([0.1, 0.2]) == [0.1, 0.2]
