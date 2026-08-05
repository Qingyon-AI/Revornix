"""文档是否还活着 —— 长流程里的中途守卫。

处理一份文档要跑很久（分块、抽取、建图）。用户在中途把文档删了是常事，而删除
不会去中断已经在跑的任务。于是这个守卫被插在流程各处：每隔一段就确认一次文档
还在，不在就停下。

**异常类型是这个模块的重点。** 用 `ValueError` 表达"文档已删"有两个问题：一是
调用方没法只捕获这一种情况（`except ValueError` 会连带吃掉参数校验错误），二是
排查时看到 ValueError 完全想不到是"文档被删了"。所以这里给它一个专名。

曾经两侧不一致：api 抛 `ValueError("Document not found")`，worker 抛
`DocumentDeletedError`，而这个类只在 worker 侧存在。worker 的
`document_process_status_workflow` 正是靠 `except DocumentDeletedError` 来"已删就
安静返回" —— 两侧合并时取任一版本都会坏掉另一边。现已统一到具名异常。

MIRRORED-FILE: api/ <-> celery-worker/ —— 两侧必须逐字节一致，由 scripts/check_mirrored_files.py 强制。
"""

from __future__ import annotations

import crud


class DocumentDeletedError(RuntimeError):
    """文档在处理途中被删除了。

    继承 RuntimeError 而不是 Exception：它表示的是"运行时状态变了"，
    不是调用方传错了参数。
    """


async def ensure_document_active(*, db, document_id: int) -> None:
    if await crud.document.get_document_by_document_id_async(db=db, document_id=document_id) is None:
        raise DocumentDeletedError("Document is deleted")
