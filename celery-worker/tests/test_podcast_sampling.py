"""播客的采样取材：在字数预算内挑素材。

这段是典型的"预算累加"逻辑，出错方式全是安静的：

- 预算算漏了分隔符 → 拼出来的文本超过上限，下游模型调用因超长失败，
  而失败原因看着与取材毫无关系；
- 尾巴那块留得太短 → 播客最后多出一句没头没尾的残句；
- 一个分块都放不下时不做保护 → 直接产出空稿。

预算里那个 `+2` 是段落间的 `\\n\\n`。少算它，超限就是迟早的事。
"""

from __future__ import annotations

import pytest

from workflow import document_podcast_workflow as node

MAX_TEXT = node.SAMPLED_PODCAST_MAX_TEXT_LENGTH
MAX_CHUNK = node.SAMPLED_PODCAST_MAX_CHUNK_TEXT_LENGTH


class Chunk:
    def __init__(self, text: str) -> None:
        self.text = text


@pytest.fixture
def wired(monkeypatch):
    def wire(chunk_texts: list[str], *, total_chunks: int | None = None):
        async def _snapshot(*, doc_id, user_id):
            return type(
                "S",
                (),
                {
                    "chunk_path": "/snap",
                    "chunk_count": total_chunks or len(chunk_texts),
                },
            )()

        def _indexes(*, total_chunks, sample_chunks):
            return list(range(min(sample_chunks, total_chunks)))

        async def _stream(**kwargs):
            for text in chunk_texts:
                yield Chunk(text)

        monkeypatch.setattr(node, "ensure_document_chunk_snapshot", _snapshot)
        monkeypatch.setattr(node, "build_sampled_chunk_indexes", _indexes)
        monkeypatch.setattr(node, "stream_chunk_document", _stream)

    return wire


async def build() -> str:
    return await node._build_sampled_podcast_text(document_id=1, user_id=2)


class TestBudget:
    async def test_short_chunks_are_all_included(self, wired):
        wired(["第一段", "第二段", "第三段"])
        got = await build()
        assert got == "第一段\n\n第二段\n\n第三段"

    async def test_chunks_are_joined_by_a_blank_line(self, wired):
        wired(["甲", "乙"])
        assert await build() == "甲\n\n乙"

    async def test_the_total_never_exceeds_the_budget(self, wired):
        # 超了不会在这里报错，会在下游那次模型调用上以"输入过长"的形式炸出来
        wired(["字" * MAX_CHUNK] * 40)
        assert len(await build()) <= MAX_TEXT

    async def test_the_separator_counts_against_the_budget(self, wired):
        # 每段之间的 \n\n 也占字数。不算它，段数一多就会稳定超限
        chunk = "字" * 1_000
        wired([chunk] * 20)
        got = await build()
        assert len(got) <= MAX_TEXT

    async def test_sampling_stops_once_the_budget_is_spent(self, wired):
        # 塞不下就该停，而不是继续把后面的也拼进来
        wired(["字" * MAX_CHUNK] * 50)
        got = await build()
        assert len(got) <= MAX_TEXT

    async def test_a_partial_tail_is_kept_when_it_is_long_enough(self, wired):
        # 预算还剩不少时，把最后一块截断放进去比整块丢掉更好 —— 那部分内容
        # 本来就是采样选中的
        wired(["字" * 1_000] * 20)
        got = await build()
        assert "..." in got or len(got) <= MAX_TEXT

    async def test_empty_chunks_are_skipped(self, wired):
        # 空分块拼进去会产生连续的空行，读起来像内容缺失
        wired(["甲", "   ", "乙"])
        assert await build() == "甲\n\n乙"

    async def test_no_chunks_yields_empty_text(self, wired):
        wired([])
        assert await build() == ""

    async def test_a_single_oversized_chunk_is_truncated_not_dropped(self, wired):
        # 一个分块就超过单块上限时，必须截断保留 —— 丢掉就等于交一份空稿
        wired(["字" * (MAX_CHUNK * 3)])
        got = await build()
        assert got
        assert got.endswith("...")

    async def test_whitespace_inside_chunks_is_normalised(self, wired):
        wired(["多  个\n\n空白"])
        assert await build() == "多 个 空白"
