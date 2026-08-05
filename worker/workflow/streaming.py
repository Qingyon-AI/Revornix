"""流式处理里的两个纯机制：分批累积与乱序重排。

这两件事原本内联在节点体里，而节点体连着数据库、Milvus、Neo4j 和模型服务，
于是它们跟着一起变得不可测 —— 但它们本身**不依赖任何外部系统**，只是被写在了
依赖最重的地方。抽出来之后就能直接断言。

抽出来的第二个理由是它们出错的方式：不抛异常，只是少写或者写错。

- 分批累积漏掉尾巴 → 文档最后不足一批的分块**静默丢失**，任务照样标成功；
- 两条平行列表（chunk 和 text）不同步 → 向量被安到别的分块上，写进 Milvus
  的是**错误但合法**的数据，检索结果从此莫名其妙；
- 乱序重排丢一个下标 → 摘要按错误顺序归并，读起来通顺、内容是错的。

以上没有一条会让任务变红。
"""

from __future__ import annotations

from typing import Callable, Generic, Iterator, TypeVar

T = TypeVar("T")


class BatchAccumulator(Generic[T]):
    """攒够一批就交出去，剩下的由 `flush()` 兜底。

    替代「手工维护一个 list + 满了就处理 + 循环外再补一次尾巴」的写法 ——
    那个写法要求处理逻辑写两遍，而漏写第二遍不会报错，只会静静少处理一批。
    """

    def __init__(self, size: int) -> None:
        if size < 1:
            raise ValueError(f"batch size 必须为正，收到 {size}")
        self._size = size
        self._items: list[T] = []

    def add(self, item: T) -> list[T] | None:
        """加入一项。攒满一批时返回这一批，否则返回 None。

        返回的是新列表，内部缓冲已清空 —— 调用方可以安全地持有它，
        不必担心下一次 add 把它改掉。
        """
        self._items.append(item)
        if len(self._items) < self._size:
            return None
        batch, self._items = self._items, []
        return batch

    def flush(self) -> list[T]:
        """取走不足一批的尾巴；没有就返回空列表。

        空列表而不是 None：调用方 `for x in acc.flush()` 就能收尾，
        少一个「忘了判空」的机会。
        """
        batch, self._items = self._items, []
        return batch

    def __len__(self) -> int:
        return len(self._items)


class ParallelBatchAccumulator(Generic[T]):
    """同上，但同时给出由每一项派生的第二条列表。

    存在的理由很具体：embedding 那段原本维护 `embed_chunks` 和 `embed_texts`
    两条平行列表，靠「每次都成对 append、成对 clear」保持同步。这个约定一旦
    在某个分支上漏掉一半，两条列表就会错位 —— 而错位的后果是向量被安到别的
    分块上，**没有任何报错**。

    这里只存一条列表，第二条按需派生，错位从根上不可能发生。
    """

    def __init__(self, size: int, derive: Callable[[T], object]) -> None:
        self._acc: BatchAccumulator[T] = BatchAccumulator(size)
        self._derive = derive

    def add(self, item: T) -> tuple[list[T], list] | None:
        batch = self._acc.add(item)
        return None if batch is None else (batch, [self._derive(x) for x in batch])

    def flush(self) -> tuple[list[T], list]:
        batch = self._acc.flush()
        return batch, [self._derive(x) for x in batch]

    def __len__(self) -> int:
        return len(self._acc)


class OrderedResultBuffer(Generic[T]):
    """并发产出、顺序消费。

    分块预处理是并发跑的（谁先算完谁先回来），但消费必须**按分块下标有序** ——
    摘要是逐段归并出来的，顺序错了结果就错，而且错得很通顺、看不出来。

    用法是固定的两步：产出时 `add()`，随后 `take_ready()` 取走从当前位置起
    连续的那一段；流结束后再 `drain_remaining()` 收尾。
    """

    def __init__(self, start_idx: int = 0) -> None:
        self._next_idx = start_idx
        self._ready: dict[int, T] = {}

    def add(self, idx: int, item: T) -> None:
        self._ready[idx] = item

    def take_ready(self) -> Iterator[T]:
        """交出从当前位置开始**连续**的那一段。

        断档处必须停下 —— 那个下标的结果还在算，跳过它就是乱序消费。
        """
        while self._next_idx in self._ready:
            yield self._ready.pop(self._next_idx)
            self._next_idx += 1

    def drain_remaining(self) -> Iterator[T]:
        """流结束后交出剩下的，按下标排序。

        正常情况下这里是空的：下标连续时 `take_ready()` 已经取完了。非空意味着
        下标有断档（上游跳号，或是从非 0 开始），此时**按序交出剩余**总好过
        把它们悄悄丢掉 —— 丢掉的表现是文档少了几段，而任务显示成功。
        """
        for idx in sorted(self._ready):
            yield self._ready.pop(idx)

    def __len__(self) -> int:
        return len(self._ready)
