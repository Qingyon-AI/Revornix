"""打标与摘要两个节点。

放在一起是因为它们的失败方式同一类：**产出看起来正常，内容是错的**。

- 打标漏了去重 → 同一个标签在界面上出现两次，没有任何报错；
- 摘要的采样档位判错 → 一份 40 万字的文档被逐段跑完，账单翻十几倍，结果照样正确，
  所以不会有人发现。
"""

from __future__ import annotations

import pytest

from tests.doubles import FakeDb, Row, async_returning, session_factory
from workflow import document_summarize_workflow as sum_node
from workflow import document_tag_workflow as tag_node


class TestTagging:
    @pytest.fixture
    def wired(self, monkeypatch):
        db = FakeDb()
        created: list[list[int]] = []

        def wire(*, generated: list | None, existing: list[int]):
            monkeypatch.setattr(tag_node, "async_session_context", session_factory(db))

            async def ensure_active(**kwargs):
                return None

            monkeypatch.setattr(tag_node, "ensure_document_active", ensure_active)

            class FakeEngine:
                def __init__(self, user_id):
                    pass

                async def generate_tags(self, document_id):
                    return generated

            monkeypatch.setattr(tag_node, "LLMDocumentTagEngine", FakeEngine)

            async def create_labels(*, db, document_id, label_ids):
                created.append(list(label_ids))

            monkeypatch.setattr(
                tag_node.crud,
                "document",
                type(
                    "D",
                    (),
                    {
                        "get_document_labels_by_document_id_async": staticmethod(
                            async_returning([Row(label_id=i) for i in existing])
                        ),
                        "create_document_labels_async": staticmethod(create_labels),
                    },
                ),
                raising=False,
            )
            return created, db

        return wire

    async def test_new_labels_are_linked(self, wired):
        created, db = wired(generated=[Row(id=1), Row(id=2)], existing=[])
        await tag_node.handle_tag_document(document_id=1, user_id=2)
        assert created == [[1, 2]]
        assert db.commits == 1

    async def test_labels_the_document_already_has_are_not_relinked(self, wired):
        # 重新打标不能给已有标签再加一行关联 —— 界面上会出现重复标签
        created, _ = wired(generated=[Row(id=1), Row(id=2)], existing=[1])
        await tag_node.handle_tag_document(document_id=1, user_id=2)
        assert created == [[2]]

    async def test_duplicates_within_one_batch_are_collapsed(self, wired):
        # 模型自己就可能吐出重复标签
        created, _ = wired(generated=[Row(id=3), Row(id=3), Row(id=4)], existing=[])
        await tag_node.handle_tag_document(document_id=1, user_id=2)
        assert created == [[3, 4]]

    async def test_order_is_preserved_when_deduping(self, wired):
        # 用 set 去重会让标签顺序随机，界面上每次刷新排列都不同
        created, _ = wired(generated=[Row(id=9), Row(id=2), Row(id=5)], existing=[])
        await tag_node.handle_tag_document(document_id=1, user_id=2)
        assert created == [[9, 2, 5]]

    async def test_nothing_new_means_no_write(self, wired):
        created, db = wired(generated=[Row(id=1)], existing=[1])
        await tag_node.handle_tag_document(document_id=1, user_id=2)
        assert created == []
        assert db.commits == 0

    async def test_no_tags_from_the_model_is_a_no_op(self, wired):
        # 模型返回 None（拿不到结果）不该被当成「标签为空」而去清空什么
        created, db = wired(generated=None, existing=[1])
        await tag_node.handle_tag_document(document_id=1, user_id=2)
        assert created == []
        assert db.commits == 0

    @pytest.mark.parametrize("state", [{"user_id": 2}, {"document_id": 1}, {}])
    async def test_missing_context_fails_fast(self, state):
        with pytest.raises(Exception, match="missing document_id or user_id"):
            await tag_node._tag_document(state)


class TestSummaryModeSelection:
    """采样还是全量 —— 判错不报错，只是让账单翻十几倍。"""

    @pytest.fixture
    def wired(self, monkeypatch):
        seen: dict = {}

        def wire(*, markdown_length: int, total_chunks: int = 100):
            async def _len(document_id):
                return markdown_length

            async def _snapshot(*, doc_id, user_id):
                return Row(chunk_path="/snap", chunk_count=total_chunks)

            def _indexes(*, total_chunks, sample_chunks):
                seen["sample_chunks"] = sample_chunks
                return list(range(min(sample_chunks, total_chunks)))

            async def _cancel_check(document_id):
                return None

            async def _stream(**kwargs):
                seen["selected"] = kwargs.get("selected_chunk_indexes")
                seen["snapshot_path"] = kwargs.get("chunk_snapshot_path")
                if False:
                    yield None

            async def _llm(**kwargs):
                return object()

            async def _close(client):
                return None

            monkeypatch.setattr(sum_node, "get_document_markdown_length", _len)
            monkeypatch.setattr(sum_node, "ensure_document_chunk_snapshot", _snapshot)
            monkeypatch.setattr(sum_node, "build_sampled_chunk_indexes", _indexes)
            monkeypatch.setattr(
                sum_node, "_ensure_summarize_task_not_cancelled", _cancel_check
            )
            monkeypatch.setattr(sum_node, "stream_chunk_document", _stream)
            monkeypatch.setattr(sum_node, "get_extract_llm_client", _llm)
            monkeypatch.setattr(sum_node, "close_extract_llm_client", _close)
            return seen

        return wire

    def _state(self, **overrides):
        state = {
            "document_id": 1,
            "user_id": 2,
            "model_id": 3,
            "llm_model_name": "m",
        }
        state.update(overrides)
        return state

    async def test_a_small_document_reads_every_chunk(self, wired):
        seen = wired(markdown_length=1_000)
        await sum_node._summarize_document(self._state())
        # 全量档不做采样：selected 为 None 表示"不筛选"
        assert seen["selected"] is None

    async def test_a_huge_document_switches_to_sampling(self, wired):
        seen = wired(markdown_length=sum_node.SAMPLED_SUMMARY_MARKDOWN_CHAR_THRESHOLD)
        await sum_node._summarize_document(self._state())
        assert seen["selected"] is not None
        assert seen["sample_chunks"] == sum_node.SAMPLED_SUMMARY_CHUNK_LIMIT

    async def test_the_threshold_is_inclusive(self, wired):
        # 边界：恰好等于阈值走采样。差一个字符就换一条路径，这条边界值得钉住
        below = wired(
            markdown_length=sum_node.SAMPLED_SUMMARY_MARKDOWN_CHAR_THRESHOLD - 1
        )
        await sum_node._summarize_document(self._state())
        assert below["selected"] is None

    async def test_an_explicit_mode_overrides_the_measurement(self, wired):
        # 调用方指定了档位就不再自己判断 —— 渐进式路径会显式传 sampled
        seen = wired(markdown_length=10)
        await sum_node._summarize_document(self._state(summary_mode="sampled"))
        assert seen["selected"] is not None

    async def test_explicit_full_mode_skips_sampling_on_a_huge_document(self, wired):
        seen = wired(markdown_length=10_000_000)
        await sum_node._summarize_document(self._state(summary_mode="full"))
        assert seen["selected"] is None

    async def test_sampling_reads_from_the_snapshot(self, wired):
        # 采样必须基于快照：直接流式读原文，两次采到的分块可能不是同一批
        seen = wired(markdown_length=10, total_chunks=50)
        await sum_node._summarize_document(self._state(summary_mode="sampled"))
        assert seen["snapshot_path"] == "/snap"

    @pytest.mark.parametrize(
        "missing", ["document_id", "user_id", "model_id", "llm_model_name"]
    )
    async def test_missing_context_fails_fast(self, missing):
        state = self._state()
        del state[missing]
        with pytest.raises(Exception, match="missing context"):
            await sum_node._summarize_document(state)
