"""分批累积与乱序重排。

这两个机制原本内联在 `document_chunk_process` 和 `document_embedding` 的节点体里，
跟着那些节点一起不可测。它们的共同点是**出错不报错**：

- 尾巴没交出去 → 文档最后不足一批的分块没写进 Milvus，任务仍然标成功；
- 消费顺序错了 → 摘要按错误顺序归并，读起来通顺，内容是错的；
- 平行列表错位 → 向量安到别的分块上，写进去的是合法但错误的数据。

所以这里测的不是「每个方法都调得通」，而是两条**不变量**：
每一项恰好交出一次；交出的顺序恒等于下标升序。用全排列覆盖到达顺序。
"""

from __future__ import annotations

from itertools import permutations

import pytest

from workflow.streaming import (
    BatchAccumulator,
    OrderedResultBuffer,
    ParallelBatchAccumulator,
)


class TestBatchAccumulator:
    def test_holds_until_full(self):
        acc: BatchAccumulator[int] = BatchAccumulator(3)
        assert acc.add(1) is None
        assert acc.add(2) is None
        assert acc.add(3) == [1, 2, 3]

    def test_resets_after_a_full_batch(self):
        # 交出一批后必须清空：不清空会让下一项立刻又「满」，同一批被写两遍
        acc: BatchAccumulator[int] = BatchAccumulator(2)
        assert acc.add(1) is None
        assert acc.add(2) == [1, 2]
        assert acc.add(3) is None
        assert acc.add(4) == [3, 4]

    def test_flush_returns_the_tail(self):
        acc: BatchAccumulator[int] = BatchAccumulator(5)
        acc.add(1)
        acc.add(2)
        assert acc.flush() == [1, 2]

    def test_flush_is_empty_when_nothing_pending(self):
        # 返回空列表而不是 None：调用方直接 for 循环收尾，少一个忘判空的机会
        acc: BatchAccumulator[int] = BatchAccumulator(5)
        assert acc.flush() == []

    def test_flush_does_not_hand_the_same_items_out_twice(self):
        # 尾巴交出去之后缓冲必须空 —— 否则重复 flush 会把同一批重复写入
        acc: BatchAccumulator[int] = BatchAccumulator(5)
        acc.add(1)
        assert acc.flush() == [1]
        assert acc.flush() == []

    def test_returned_batch_is_detached(self):
        # 交出去的批次会被 await 出去用（写 Milvus / 归并摘要），期间还会有新的
        # add 进来。若返回的是内部那条 list，新数据会混进正在写的批里。
        acc: BatchAccumulator[int] = BatchAccumulator(2)
        acc.add(1)
        batch = acc.add(2)
        acc.add(3)
        assert batch == [1, 2]

    def test_size_one_yields_every_item_immediately(self):
        acc: BatchAccumulator[int] = BatchAccumulator(1)
        assert acc.add(1) == [1]
        assert acc.add(2) == [2]
        assert acc.flush() == []

    def test_rejects_non_positive_size(self):
        # size=0 会让 add 永远返回「满」，size 为负则永远不满、全堆在内存里
        with pytest.raises(ValueError):
            BatchAccumulator(0)

    @pytest.mark.parametrize("total,size", [(0, 3), (1, 3), (7, 3), (9, 3), (10, 1)])
    def test_every_item_comes_out_exactly_once_in_order(self, total, size):
        """核心不变量：进去多少、出来多少，顺序不变。

        这是「丢尾巴」和「重复写入」两类 bug 的统一判据。
        """
        acc: BatchAccumulator[int] = BatchAccumulator(size)
        emitted: list[int] = []
        for i in range(total):
            batch = acc.add(i)
            if batch is not None:
                assert len(batch) == size
                emitted.extend(batch)
        emitted.extend(acc.flush())

        assert emitted == list(range(total))


class TestParallelBatchAccumulator:
    def test_derived_list_matches_the_batch(self):
        acc = ParallelBatchAccumulator(2, derive=lambda s: s.upper())
        assert acc.add("a") is None
        assert acc.add("b") == (["a", "b"], ["A", "B"])

    def test_tail_is_also_paired(self):
        acc = ParallelBatchAccumulator(5, derive=lambda s: s.upper())
        acc.add("a")
        assert acc.flush() == (["a"], ["A"])

    def test_empty_tail_is_two_empty_lists(self):
        acc = ParallelBatchAccumulator(5, derive=lambda s: s.upper())
        assert acc.flush() == ([], [])

    @pytest.mark.parametrize("total", [0, 1, 4, 5, 13])
    def test_the_two_lists_can_never_drift(self, total):
        # 这正是它存在的理由：原先 chunk 与 text 是两条各自 append 的列表，
        # 任何一处漏掉一半就会让向量安到别的分块上，且不会报错。
        acc = ParallelBatchAccumulator(4, derive=lambda n: n * 10)
        pairs: list[tuple[int, int]] = []
        for i in range(total):
            batch = acc.add(i)
            if batch is not None:
                pairs.extend(zip(*batch))
        pairs.extend(zip(*acc.flush()))

        assert pairs == [(i, i * 10) for i in range(total)]


class TestOrderedResultBuffer:
    def test_in_order_arrival_passes_straight_through(self):
        buf: OrderedResultBuffer[str] = OrderedResultBuffer()
        buf.add(0, "a")
        assert list(buf.take_ready()) == ["a"]

    def test_out_of_order_arrival_waits_for_the_gap(self):
        # 断档处必须停下：那个下标还在算，跳过它就是乱序消费
        buf: OrderedResultBuffer[str] = OrderedResultBuffer()
        buf.add(1, "b")
        buf.add(2, "c")
        assert list(buf.take_ready()) == []

    def test_filling_the_gap_releases_the_whole_run(self):
        buf: OrderedResultBuffer[str] = OrderedResultBuffer()
        buf.add(2, "c")
        buf.add(1, "b")
        assert list(buf.take_ready()) == []
        buf.add(0, "a")
        assert list(buf.take_ready()) == ["a", "b", "c"]

    def test_nothing_is_handed_out_twice(self):
        buf: OrderedResultBuffer[str] = OrderedResultBuffer()
        buf.add(0, "a")
        assert list(buf.take_ready()) == ["a"]
        assert list(buf.take_ready()) == []

    def test_drain_is_empty_on_the_normal_path(self):
        # 下标连续时收尾应当无事可做；非空即意味着上游跳号
        buf: OrderedResultBuffer[str] = OrderedResultBuffer()
        for idx, item in enumerate(["a", "b", "c"]):
            buf.add(idx, item)
        list(buf.take_ready())
        assert list(buf.drain_remaining()) == []

    def test_drain_recovers_items_stuck_behind_a_gap(self):
        # 上游跳号时，剩下的按序补完 —— 丢掉的表现是文档少了几段而任务显示成功
        buf: OrderedResultBuffer[str] = OrderedResultBuffer()
        buf.add(3, "d")
        buf.add(1, "b")
        assert list(buf.take_ready()) == []
        assert list(buf.drain_remaining()) == ["b", "d"]

    def test_drain_does_not_repeat_what_was_already_taken(self):
        buf: OrderedResultBuffer[str] = OrderedResultBuffer()
        buf.add(0, "a")
        buf.add(2, "c")
        assert list(buf.take_ready()) == ["a"]
        assert list(buf.drain_remaining()) == ["c"]

    def test_honours_a_non_zero_start_index(self):
        # 渐进式处理会从中间某个分块接着跑，起点不是 0
        buf: OrderedResultBuffer[str] = OrderedResultBuffer(start_idx=10)
        buf.add(11, "b")
        assert list(buf.take_ready()) == []
        buf.add(10, "a")
        assert list(buf.take_ready()) == ["a", "b"]

    @pytest.mark.parametrize("arrival", list(permutations(range(4))))
    def test_consumption_order_is_index_order_whatever_the_arrival_order(self, arrival):
        """核心不变量：无论谁先算完，消费顺序恒等于下标升序，且不丢不重。

        全排列覆盖 —— 并发完成顺序本来就是不确定的，挑几个样例不足以说明问题。
        """
        buf: OrderedResultBuffer[int] = OrderedResultBuffer()
        consumed: list[int] = []
        for idx in arrival:
            buf.add(idx, idx)
            consumed.extend(buf.take_ready())
        consumed.extend(buf.drain_remaining())

        assert consumed == [0, 1, 2, 3]
