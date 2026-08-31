"""确认卡内核:写操作工具绝不直接执行,先建 pending 卡,用户批准后才跑。

三档权限(写在 `tool_manifest.CONFIRMATION_TOOLS` 里):
- edit:可撤销/可再改(建文档、改标签、标星…)
- ai-cost:触发后台 AI 任务,花钱/排队(摘要、播客、embedding…)
- destructive:撤不回(删文档、删专栏、删标签)

卡的生命周期:pending → approved → executed | failed;或 rejected | cancelled。
批准是**当场执行**(不是唤醒某个还在等的线程),sidecar 那边在轮询结果。
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
from agent import tool_manifest
from common.logger import exception_logger


def _now() -> datetime:
    return datetime.now(timezone.utc)


class ConfirmationError(ValueError):
    pass


def _summarize(tool: str, payload: dict[str, Any]) -> str:
    """卡片上那一行字 —— 用户点批准之前唯一会读的东西。点名关键参数。"""
    if tool == "delete_documents":
        ids = payload.get("document_ids") or []
        return f"⚠️ 删除 {len(ids)} 篇文档(连同标签、笔记、向量与图谱数据,不可恢复): {ids[:6]}"
    if tool == "delete_section":
        return f"⚠️ 删除专栏 #{payload.get('section_id')}(不可恢复)"
    if tool in ("delete_document_labels", "delete_section_labels"):
        ids = payload.get("label_ids") or []
        return f"⚠️ 删除 {len(ids)} 个标签: {ids[:6]}"
    if tool == "create_document":
        head = payload.get("title") or payload.get("url") or "(无标题)"
        return f"创建文档「{str(head)[:60]}」"
    if tool == "update_document":
        return f"修改文档 #{payload.get('document_id')}"
    if tool == "create_document_note":
        return f"给文档 #{payload.get('document_id')} 添加笔记"
    if tool == "set_document_star_status":
        return f"{'标星' if payload.get('status') else '取消标星'}文档 #{payload.get('document_id')}"
    if tool == "set_document_read_status":
        return f"标记文档 #{payload.get('document_id')} 为{'已读' if payload.get('status') else '未读'}"
    if tool == "create_section":
        return f"创建专栏「{str(payload.get('title') or '')[:60]}」"
    if tool == "update_section":
        return f"修改专栏 #{payload.get('section_id')}"
    if tool == "set_section_subscription_status":
        return f"{'订阅' if payload.get('status') else '取消订阅'}专栏 #{payload.get('section_id')}"
    if tool.startswith("generate_document_"):
        kind = tool.removeprefix("generate_document_")
        return f"为文档 #{payload.get('document_id')} 生成{kind}(消耗 AI 额度)"
    if tool.startswith("generate_section_"):
        kind = tool.removeprefix("generate_section_")
        return f"为专栏 #{payload.get('section_id')} 生成{kind}(消耗 AI 额度)"
    if tool == "transcribe_document_audio":
        return f"转写音频文档 #{payload.get('document_id')}(消耗 AI 额度)"
    if tool == "transform_document_markdown":
        return f"为文档 #{payload.get('document_id')} 执行 Markdown 转换"
    if tool.startswith("cancel_"):
        return f"取消任务: {tool}"
    if tool in ("trigger_section_process", "retry_section_document"):
        return f"触发专栏处理: {tool}"
    return f"{tool}: {json.dumps(payload, ensure_ascii=False)[:80]}"


async def request_confirmation(
    db: AsyncSession,
    *,
    user_id: int,
    tool: str,
    payload: dict[str, Any],
    requested_by: str = "pi-agent",
    session_id: int | None = None,
) -> models.agent.ToolConfirmation:
    """开一张确认卡。auto_allow 命中时跳过等待直接执行(见 approve 路径的调用方)。"""
    permission = tool_manifest.CONFIRMATION_TOOLS.get(tool)
    if permission is None:
        raise ConfirmationError(f"Unknown confirmation-gated tool: {tool}")
    card = models.agent.ToolConfirmation(
        user_id=user_id,
        session_id=session_id,
        tool=tool,
        permission=permission,
        summary=_summarize(tool, payload),
        payload=json.dumps(payload, ensure_ascii=False),
        status="pending",
        requested_by=requested_by,
        create_time=_now(),
    )
    db.add(card)
    await db.commit()
    await db.refresh(card)
    return card


async def authorize_and_approve(
    db: AsyncSession,
    user: models.user.User,
    confirmation: models.agent.ToolConfirmation,
) -> models.agent.ToolConfirmation:
    """批准一张确认卡 —— **所有入口的唯一实现**。

    两道闸门缺一不可:卡是这个人名下或他可见的会话里的(调用方校验);记在谁头上
    (decided_by)。bypass/auto 绕的是"用户同意"这一步,不是这道归属校验。
    """
    confirmation.decided_by = user.id
    return await approve_confirmation(db, confirmation)


async def approve_confirmation(
    db: AsyncSession, confirmation: models.agent.ToolConfirmation
) -> models.agent.ToolConfirmation:
    await _claim(db, confirmation, "approved")
    try:
        payload = json.loads(confirmation.payload or "{}")
        # 执行用**批准者**的身份:智能体自己不是主体。
        result = await tool_manifest.invoke_tool(confirmation.tool, payload, confirmation.decided_by or confirmation.user_id)
        confirmation.status = "executed"
        confirmation.result = json.dumps(result, ensure_ascii=False, default=str)
    except Exception as exc:  # noqa: BLE001 — 执行失败是卡的一种终态,不是 500
        confirmation.status = "failed"
        confirmation.error = str(exc)[:500]
    confirmation.resolved_at = _now()
    await db.commit()
    await db.refresh(confirmation)
    return confirmation


async def authorize_and_reject(
    db: AsyncSession,
    user: models.user.User,
    confirmation: models.agent.ToolConfirmation,
) -> models.agent.ToolConfirmation:
    """拒绝一张确认卡。拒绝是对待办下结论,和批准是同一类决定。"""
    await _claim(db, confirmation, "rejected")
    confirmation.decided_by = user.id
    confirmation.resolved_at = _now()
    await db.commit()
    await db.refresh(confirmation)
    return confirmation


async def _claim(db: AsyncSession, confirmation: models.agent.ToolConfirmation, to_status: str) -> None:
    """独占一张 pending 卡,否则拒绝。

    读内存里的 status 再赋值是 check-then-act:两个请求都读到 pending、都通过检查、
    都跑执行 —— 那就是一篇文档被删两次。一条条件 UPDATE 让数据库来裁决:rowcount
    是 0 就是别人抢先了。
    """
    result = await db.execute(
        update(models.agent.ToolConfirmation)
        .where(
            models.agent.ToolConfirmation.id == confirmation.id,
            models.agent.ToolConfirmation.status == "pending",
        )
        .values(status=to_status)
    )
    await db.commit()
    await db.refresh(confirmation)
    if result.rowcount != 1:
        raise ConfirmationError(f"Confirmation is already {confirmation.status}")


async def cancel_pending_for_sessions(db: AsyncSession, session_ids: list[int], reason: str) -> None:
    """作废一批会话的 pending 卡(后端重启拨回 running 会话时一起调用)。

    不作废的话,对话上面写着「已中断,请重新发送」,下面那张卡还亮着按钮等你点 ——
    而批准是当场执行的,点下去真的会删东西,结果却没有任何一轮对话去接收。
    """
    if not session_ids:
        return
    await db.execute(
        update(models.agent.ToolConfirmation)
        .where(
            models.agent.ToolConfirmation.session_id.in_(session_ids),
            models.agent.ToolConfirmation.status == "pending",
        )
        .values(status="cancelled", error=reason, resolved_at=_now())
    )
    await db.commit()
