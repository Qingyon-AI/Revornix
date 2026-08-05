"""分块节点体：真正跑 `_process_document_chunks` 的管线段。

这个节点是仓库里最长的一段控制流，也是刚被改写过的那一段 —— 分块的写入批次、
摘要的归并批次、以及「并发产出、顺序消费」的重排，原先都内联在这里，其中重排
内联了三遍。改写它的时候没有任何测试兜底。

**测到哪为止**：管线跑完即止。之后的落库与图谱构建要真的数据库和 Neo4j，那属于
集成测试；这里用一个哨兵在第一次碰数据库时停下，此前的行为已经全部发生并被记录。
这条边界是有意画的 —— 把落库也伪造出来，用例会变成大半是脚手架，且验不到真东西。

最关键的一条是**乱序完成下的消费顺序**：预处理是并发的，谁先算完谁先回来。这里
故意让后面的分块先算完，再断言写入顺序仍是分块下标序。顺序错了不会报错，只会让
摘要按错误顺序归并 —— 读起来通顺，内容是错的。
"""

from __future__ import annotations

import asyncio

import pytest

from workflow import document_chunk_process_workflow as node

UPSERT_BATCH = node.CHUNK_UPSERT_BATCH_SIZE
REDUCE_BATCH = node.SUMMARY_REDUCE_BATCH_SIZE


class StopAtPersistence(Exception):
    """哨兵：管线之后的第一次数据库访问。"""


class FakeChunk:
    def __init__(self, idx: int) -> None:
        self.idx = idx
        self.text = f"chunk-{idx}"
        self.summary = f"summary-{idx}"
        self.embedding = None


class Recorder:
    def __init__(self) -> None:
        self.milvus: list[list[FakeChunk]] = []
        self.neo4j: list[list[FakeChunk]] = []
        self.reduce_batches: list[list[str]] = []
        self.preprocess_order: list[int] = []


@pytest.fixture
def wired(monkeypatch):
    """接好替身。返回 (跑一次, 记录本)。"""
    rec = Recorder()

    async def run(
        total: int,
        *,
        auto_summary: bool = False,
        finish_reversed: bool = False,
    ):
        chunks = [FakeChunk(i) for i in range(total)]

        async def fake_stream(**kwargs):
            for chunk in chunks:
                yield chunk

        async def fake_preprocess(*, chunk_info, **kwargs):
            # finish_reversed：让下标越大的越早算完，逼出重排逻辑。
            # 不这样安排的话，并发调度大概率恰好按顺序回来，测了等于没测。
            delay = (total - chunk_info.idx) if finish_reversed else chunk_info.idx
            await asyncio.sleep(delay * 0.001)
            rec.preprocess_order.append(chunk_info.idx)
            return node.ChunkPreprocessResult(
                chunk_info=chunk_info,
                sub_entities=[],
                sub_relations=[],
                embedding_elapsed_ms=0.0,
                extract_elapsed_ms=0.0,
                summary_elapsed_ms=0.0,
            )

        async def fake_upsert_milvus(*, user_id, chunks_info):
            rec.milvus.append(list(chunks_info))

        async def fake_upsert_chunks_neo4j(*, chunks_info):
            rec.neo4j.append(list(chunks_info))

        async def fake_reducer_summary(**kwargs):
            rec.reduce_batches.append(kwargs["new_summary_to_append"].split("\n\n"))
            return None

        class FakeProxy:
            @staticmethod
            async def create(**kwargs):
                return FakeProxy()

            @staticmethod
            def get_configuration():
                return type("Cfg", (), {"api_key": "k", "base_url": "u"})()

        monkeypatch.setattr(node, "stream_chunk_document", fake_stream)
        monkeypatch.setattr(node, "_preprocess_chunk", fake_preprocess)
        monkeypatch.setattr(node, "upsert_milvus", fake_upsert_milvus)
        monkeypatch.setattr(node, "upsert_chunks_neo4j", fake_upsert_chunks_neo4j)
        monkeypatch.setattr(node, "reducer_summary", fake_reducer_summary)
        monkeypatch.setattr(node, "AIModelProxy", FakeProxy)
        monkeypatch.setattr(node, "AsyncOpenAI", lambda **kwargs: object())
        monkeypatch.setattr(node, "get_embedding_engine", lambda: object())

        async def fake_get_llm_client(**kwargs):
            return object()

        async def fake_close_llm_client(client):
            return None

        monkeypatch.setattr(node, "get_extract_llm_client", fake_get_llm_client)
        monkeypatch.setattr(node, "close_extract_llm_client", fake_close_llm_client)

        def sentinel(*args, **kwargs):
            raise StopAtPersistence

        monkeypatch.setattr(node, "async_session_context", sentinel)

        with pytest.raises(StopAtPersistence):
            await node._process_document_chunks(
                {
                    "document_id": 1,
                    "user_id": 2,
                    "model_id": 3,
                    "llm_model_name": "m",
                    "auto_summary": auto_summary,
                }
            )
        return chunks

    return run, rec


def written(rec: Recorder) -> list[int]:
    return [chunk.idx for batch in rec.milvus for chunk in batch]


class TestEveryChunkIsWritten:
    @pytest.mark.parametrize(
        "total", [1, UPSERT_BATCH - 1, UPSERT_BATCH, UPSERT_BATCH + 1, UPSERT_BATCH * 2 + 5]
    )
    async def test_written_exactly_once_in_index_order(self, wired, total):
        run, rec = wired
        await run(total)
        assert written(rec) == list(range(total))

    async def test_the_partial_tail_is_written(self, wired):
        # 改写前这里是「循环里写一次、收尾再写一次」的两段抄写
        run, rec = wired
        await run(UPSERT_BATCH + 5)
        assert [len(b) for b in rec.milvus] == [UPSERT_BATCH, 5]

    async def test_milvus_and_neo4j_get_the_same_batches(self, wired):
        # 两边不一致意味着向量库和图谱对同一份文档的认知不同，且不会报错
        run, rec = wired
        await run(UPSERT_BATCH + 3)
        assert [[c.idx for c in b] for b in rec.milvus] == [
            [c.idx for c in b] for b in rec.neo4j
        ]

    async def test_an_empty_document_writes_nothing(self, wired):
        run, rec = wired
        await run(0)
        assert rec.milvus == []


class TestOrderSurvivesConcurrency:
    """并发产出、顺序消费 —— 原先内联了三遍的那段。"""

    @pytest.mark.parametrize("total", [8, UPSERT_BATCH + 7])
    async def test_reversed_completion_still_writes_in_index_order(self, wired, total):
        run, rec = wired
        await run(total, finish_reversed=True)

        # 前提检查：预处理确实是乱序完成的，否则这条用例什么都没验证
        assert rec.preprocess_order != sorted(rec.preprocess_order)
        assert written(rec) == list(range(total))

    async def test_no_chunk_is_lost_when_completion_is_reversed(self, wired):
        run, rec = wired
        total = UPSERT_BATCH * 2 + 3
        await run(total, finish_reversed=True)
        assert len(written(rec)) == total


class TestSummaryReduction:
    async def test_summaries_are_reduced_in_batches(self, wired):
        run, rec = wired
        await run(REDUCE_BATCH * 2, auto_summary=True)
        assert [len(b) for b in rec.reduce_batches] == [REDUCE_BATCH, REDUCE_BATCH]

    async def test_the_leftover_summaries_are_still_reduced(self, wired):
        # 漏掉这一批的表现是：文档摘要缺了最后几段，而任务显示成功
        run, rec = wired
        await run(REDUCE_BATCH + 4, auto_summary=True)
        assert [len(b) for b in rec.reduce_batches] == [REDUCE_BATCH, 4]

    async def test_summaries_are_reduced_in_index_order(self, wired):
        # 归并顺序错了，摘要读起来仍然通顺 —— 这正是它危险的地方
        run, rec = wired
        await run(REDUCE_BATCH, auto_summary=True, finish_reversed=True)
        assert rec.reduce_batches[0] == [f"summary-{i}" for i in range(REDUCE_BATCH)]

    async def test_nothing_is_reduced_when_summary_is_off(self, wired):
        run, rec = wired
        await run(REDUCE_BATCH + 2, auto_summary=False)
        assert rec.reduce_batches == []


class TestContextGuard:
    @pytest.mark.parametrize(
        "missing", ["document_id", "user_id", "model_id", "llm_model_name"]
    )
    async def test_missing_context_fails_fast(self, missing):
        state = {
            "document_id": 1,
            "user_id": 2,
            "model_id": 3,
            "llm_model_name": "m",
        }
        del state[missing]
        with pytest.raises(Exception, match="missing context"):
            await node._process_document_chunks(state)
