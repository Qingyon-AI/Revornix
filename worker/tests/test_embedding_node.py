"""embedding 节点体：真正调用 `_embed_document`，只把外部系统换成替身。

和 test_streaming 的分工：那边测的是分批机制本身，这边测的是**节点怎么用它** ——
批次边界在哪、尾巴有没有写出去、取消检查还在不在原来的位置。这段控制流刚被改写过
（原先「满了就写」和「收尾再写」是两段抄写的代码），而改写它的时候没有任何测试兜底。

最要紧的一条是「向量有没有安对分块」。这里是端到端验的：让替身按分块内容返回可辨认
的向量，跑完再逐个核对。这类错误不会抛异常 —— 写进 Milvus 的是合法但错误的数据，
表现为检索结果莫名其妙，且无从追溯。
"""

from __future__ import annotations

import pytest

from workflow.cancelled import WorkflowCancelledError
from workflow import document_embedding_workflow as node

BATCH = node.EMBED_BATCH_SIZE


class FakeChunk:
    """只需要 `.text` 和可写的 `.embedding`。"""

    def __init__(self, number: int) -> None:
        self.number = number
        self.text = f"chunk-{number}"
        self.embedding = None


class Recorder:
    """记录替身收到了什么。"""

    def __init__(self) -> None:
        self.embed_calls: list[list[str]] = []
        self.upserts: list[list[FakeChunk]] = []
        self.cancel_checks = 0


@pytest.fixture
def wired(monkeypatch):
    """接好替身，返回 (跑一次, 记录本)。"""
    rec = Recorder()

    def _install(total: int, *, cancel_after: int | None = None):
        chunks = [FakeChunk(i) for i in range(total)]

        async def fake_stream(**kwargs):
            for chunk in chunks:
                yield chunk

        class FakeEngine:
            async def embed(self, texts):
                rec.embed_calls.append(list(texts))
                # 向量按文本内容派生 —— 这样「安错分块」在断言里是看得见的
                return [[float(t.removeprefix("chunk-"))] for t in texts]

        def fake_upsert(user_id, chunks_info):
            # 存副本：要验的正是"交出去的批次事后没被后续写入污染"
            rec.upserts.append(list(chunks_info))

        async def fake_cancel_check(document_id):
            rec.cancel_checks += 1
            if cancel_after is not None and rec.cancel_checks > cancel_after:
                raise WorkflowCancelledError("cancelled")

        monkeypatch.setattr(node, "stream_chunk_document", fake_stream)
        monkeypatch.setattr(node, "get_embedding_engine", lambda: FakeEngine())
        monkeypatch.setattr(node, "upsert_milvus", fake_upsert)
        monkeypatch.setattr(
            node, "_ensure_embedding_task_not_cancelled", fake_cancel_check
        )
        return chunks

    async def run(total: int, *, cancel_after: int | None = None):
        chunks = _install(total, cancel_after=cancel_after)
        await node._embed_document({"document_id": 1, "user_id": 2})
        return chunks

    return run, rec


class TestEverythingGetsWritten:
    @pytest.mark.parametrize("total", [0, 1, BATCH - 1, BATCH, BATCH + 1, BATCH * 2 + 3])
    async def test_every_chunk_is_written_exactly_once_in_order(self, wired, total):
        """核心不变量：进去多少分块，就有多少被写出去，顺序不变。

        「尾巴漏写」和「某批写两遍」都会被这一条抓住。
        """
        run, rec = wired
        await run(total)

        written = [chunk.number for batch in rec.upserts for chunk in batch]
        assert written == list(range(total))

    async def test_empty_document_writes_nothing(self, wired):
        # 空文档不该产生一次空写入 —— 那会在 Milvus 侧留下无意义的调用
        run, rec = wired
        await run(0)
        assert rec.upserts == []
        assert rec.embed_calls == []

    async def test_batches_break_at_the_configured_size(self, wired):
        run, rec = wired
        await run(BATCH * 2)
        assert [len(b) for b in rec.upserts] == [BATCH, BATCH]

    async def test_the_partial_tail_is_written_too(self, wired):
        # 这正是改写前后最容易出错的地方：循环里写了，收尾忘了
        run, rec = wired
        await run(BATCH + 3)
        assert [len(b) for b in rec.upserts] == [BATCH, 3]

    async def test_a_document_smaller_than_one_batch_still_gets_written(self, wired):
        run, rec = wired
        await run(2)
        assert [len(b) for b in rec.upserts] == [2]

    async def test_each_batch_is_embedded_exactly_once(self, wired):
        # 一批被 embed 两次不会写错数据，但会白花一倍的模型调用费
        run, rec = wired
        await run(BATCH + 1)
        assert [len(c) for c in rec.embed_calls] == [BATCH, 1]


class TestVectorsLandOnTheRightChunk:
    """安错分块 = 合法但错误的数据写进向量库，没有任何报错。"""

    @pytest.mark.parametrize("total", [1, BATCH, BATCH + 5])
    async def test_every_chunk_carries_its_own_vector(self, wired, total):
        run, _ = wired
        chunks = await run(total)

        for chunk in chunks:
            assert chunk.embedding == [float(chunk.number)], (
                f"chunk-{chunk.number} 拿到的是 {chunk.embedding}"
            )

    async def test_the_text_sent_for_embedding_matches_the_batch(self, wired):
        # 派生而不是另存一条平行列表，正是为了让这一条恒成立
        run, rec = wired
        await run(BATCH + 2)

        sent = [text for call in rec.embed_calls for text in call]
        written = [chunk.text for batch in rec.upserts for chunk in batch]
        assert sent == written

    async def test_a_handed_over_batch_is_not_polluted_by_later_chunks(self, wired):
        # 若交出去的是内部那条 list，后续 add 会把新分块混进已经写过的批里
        run, rec = wired
        await run(BATCH * 2)

        first, second = rec.upserts
        assert [c.number for c in first] == list(range(BATCH))
        assert [c.number for c in second] == list(range(BATCH, BATCH * 2))


class TestCancellation:
    async def test_checked_once_up_front_and_after_each_full_batch(self, wired):
        # 进入节点先查一次，之后每写满一批查一次；尾巴之后不查
        # —— 紧接着的 _mark_embedding_success 本来就会再查一次。
        run, rec = wired
        await run(BATCH * 2 + 1)
        assert rec.cancel_checks == 1 + 2

    async def test_no_batch_check_when_everything_fits_in_the_tail(self, wired):
        run, rec = wired
        await run(3)
        assert rec.cancel_checks == 1

    async def test_cancelling_mid_document_stops_the_writes(self, wired):
        # 取消后必须真的停下。继续写下去意味着用户点了取消、账单还在涨
        run, rec = wired
        with pytest.raises(WorkflowCancelledError):
            await run(BATCH * 3, cancel_after=2)

        assert len(rec.upserts) == 2


class TestContextGuard:
    @pytest.mark.parametrize(
        "state", [{"user_id": 2}, {"document_id": 1}, {}]
    )
    async def test_missing_identifiers_fail_fast(self, wired, state):
        # 缺 id 时必须立刻报错。继续跑下去会拿 None 去查库，
        # 错误会在很深的地方以别的形式冒出来。
        run, _ = wired
        await run(0)
        with pytest.raises(Exception, match="missing context"):
            await node._embed_document(state)
