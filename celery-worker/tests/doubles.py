"""节点体测试共用的替身。

大部分节点做的事是同一个形状：开一个会话 → 取任务行 → 改状态 → commit。要验的是
**分支**（取不到行时怎么办、文档已删时怎么办、失败时状态写成什么），而不是 ORM。
所以这里给一个够用的假会话，而不是去起一个真数据库。

有意保留的一点：`commit` 被记次数。「改了字段但没提交」在真实实现里是个安静的
bug —— 用户看到状态没变，日志里却一切正常。
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from types import SimpleNamespace


class Row(SimpleNamespace):
    """一行任务/文档记录。属性随便设，测试断言时直接读。"""


class FakeDb:
    def __init__(self) -> None:
        self.commits = 0
        self.rollbacks = 0

    async def commit(self) -> None:
        self.commits += 1

    async def rollback(self) -> None:
        self.rollbacks += 1

    async def refresh(self, *args: object, **kwargs: object) -> None:
        return None

    def add(self, *args: object, **kwargs: object) -> None:
        return None


def session_factory(db: FakeDb):
    """造一个能替掉 `async_session_context` 的东西。"""

    @asynccontextmanager
    async def _factory(*args: object, **kwargs: object):
        yield db

    return _factory


def async_returning(value):
    """做成协程函数返回固定值 —— crud 里的读取几乎都是这个形状。"""

    async def _call(*args: object, **kwargs: object):
        return value

    return _call


def async_noop():
    async def _call(*args: object, **kwargs: object):
        return None

    return _call


def recording_async(sink: list):
    """记录每次调用的 kwargs，并返回 None。"""

    async def _call(*args: object, **kwargs: object):
        sink.append(kwargs if kwargs else args)
        return None

    return _call
