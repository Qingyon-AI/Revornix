"""Revornix AI(智能体)的 HTTP 面。

会话/消息/确认卡是持久化的;对话的「轮」由 host 驱动 pi sidecar 进程执行。
工具的清单与执行也由这里暴露 —— 它们是 sidecar 的回连端点,同时也是
前端确认卡界面要读的东西。
"""

from __future__ import annotations

import asyncio
import json
from typing import Any

import jwt
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
import schemas
from agent import confirmations, host, tool_manifest
from agent.sidecar import AdapterError
from common.dependencies import (
    get_async_db,
    get_authorization_header,
    get_current_user,
)
from common.jwt_utils import create_token
from common.logger import exception_logger, format_log_message
from common.plan_access import (
    check_deployed_by_official_in_fuc,
    plan_ability_checked_in_func,
)
from config.oauth2 import OAUTH_SECRET_KEY
from enums.ability import Ability
from enums.user import UserRole

agent_router = APIRouter()


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def _session_out(session: models.agent.AgentSession, context: dict | None = None) -> schemas.agent.AgentSessionInfo:
    return schemas.agent.AgentSessionInfo(
        id=session.id,
        uuid=session.uuid,
        title=session.title,
        status=session.status,
        adapter=session.adapter,
        model_id=session.model_id,
        document_id=session.document_id,
        section_id=session.section_id,
        enable_mcp=session.enable_mcp,
        thinking_level=session.thinking_level,
        permission_mode=session.permission_mode,
        auto_allow_tools=json.loads(session.auto_allow_tools) if session.auto_allow_tools else [],
        context=context,
        create_time=session.create_time,
        update_time=session.update_time,
    )


def _message_out(message: models.agent.AgentMessage) -> schemas.agent.AgentMessageInfo:
    return schemas.agent.AgentMessageInfo(
        id=message.id,
        session_id=message.session_id,
        role=message.role,
        content=message.content or "",
        payload=json.loads(message.payload) if message.payload else None,
        error=message.error,
        create_time=message.create_time,
    )


def _confirmation_out(card: models.agent.ToolConfirmation) -> schemas.agent.ToolConfirmationInfo:
    return schemas.agent.ToolConfirmationInfo(
        id=card.id,
        session_id=card.session_id,
        tool=card.tool,
        permission=card.permission,
        summary=card.summary,
        payload=json.loads(card.payload or "{}"),
        status=card.status,
        result=json.loads(card.result) if card.result else None,
        error=card.error,
        requested_by=card.requested_by,
        decided_by=card.decided_by,
        create_time=card.create_time,
        resolved_at=card.resolved_at,
    )


async def _require_session(
    db: AsyncSession, user: models.user.User, session_id: int
) -> models.agent.AgentSession:
    session = await db.get(models.agent.AgentSession, session_id)
    # 看不见就是不存在(404,不是 403)—— 不泄露"这里有一个你看不到的东西"。
    if session is None or session.delete_at is not None or (
        session.user_id != user.id and user.role not in (UserRole.ADMIN, UserRole.ROOT)
    ):
        raise schemas.error.CustomException(message="Session not found", code=404)
    return session


def _token_session_id(authorization: str) -> int | None:
    """turn 令牌里铸进去的 agent_session_id(见 host.mint_turn_token)。"""
    try:
        payload = jwt.decode(authorization, OAUTH_SECRET_KEY, algorithms=["HS256"])
    except Exception:  # noqa: BLE001 — 拿不到就是没有,正常 token 不带这个 claim
        return None
    value = payload.get("agent_session_id")
    return int(value) if value is not None else None


# ---------------------------------------------------------------------------
# 会话
# ---------------------------------------------------------------------------


@agent_router.post("/session/create", response_model=schemas.agent.AgentSessionInfo)
async def create_agent_session(
    body: schemas.agent.AgentSessionCreateRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    if body.document_id is not None and body.section_id is not None:
        raise schemas.error.CustomException(message="document_id 与 section_id 只能绑定一个", code=400)
    if body.model_id is not None:
        db_model = await crud.model.get_ai_model_by_id_async(db=db, model_id=body.model_id)
        if db_model is None:
            raise schemas.error.CustomException(message="Model not found", code=404)
    session = await host.create_session(
        db,
        user_id=user.id,
        title=body.title or "新对话",
        model_id=body.model_id,
        document_id=body.document_id,
        section_id=body.section_id,
        enable_mcp=body.enable_mcp,
    )
    return _session_out(session)


class AgentSessionSearchRequest(schemas.base.BaseModel):
    keyword: str | None = None
    start: int | None = None
    limit: int = 20


@agent_router.post("/session/search", response_model=list[schemas.agent.AgentSessionInfo])
async def search_agent_sessions(
    body: AgentSessionSearchRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    stmt = (
        select(models.agent.AgentSession)
        .where(
            models.agent.AgentSession.user_id == user.id,
            models.agent.AgentSession.delete_at.is_(None),
        )
        .order_by(models.agent.AgentSession.update_time.desc())
    )
    if body.keyword:
        stmt = stmt.where(models.agent.AgentSession.title.contains(body.keyword))
    stmt = stmt.offset(body.start or 0).limit(body.limit)
    sessions = (await db.scalars(stmt)).all()
    return [_session_out(session) for session in sessions]


class AgentSessionIdRequest(schemas.base.BaseModel):
    session_id: int


@agent_router.post("/session/detail", response_model=schemas.agent.AgentSessionInfo)
async def get_agent_session(
    body: AgentSessionIdRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    session = await _require_session(db, user, body.session_id)
    return _session_out(session, context=host.session_context(db, session))


@agent_router.post("/session/update", response_model=schemas.agent.AgentSessionInfo)
async def update_agent_session(
    body: schemas.agent.AgentSessionUpdateRequest,
    session_id: int,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    session = await _require_session(db, user, session_id)
    if session.user_id != user.id:
        raise schemas.error.CustomException(message="Forbidden", code=403)
    if body.title is not None:
        session.title = body.title
    if body.model_id is not None:
        db_model = await crud.model.get_ai_model_by_id_async(db=db, model_id=body.model_id)
        if db_model is None:
            raise schemas.error.CustomException(message="Model not found", code=404)
        session.model_id = body.model_id
    if body.thinking_level is not None:
        if body.thinking_level not in ("off", "low", "medium", "high"):
            raise schemas.error.CustomException(message="thinking_level 只能是 off/low/medium/high", code=422)
        session.thinking_level = body.thinking_level
    if body.permission_mode is not None:
        if body.permission_mode not in ("manual", "auto", "bypass"):
            raise schemas.error.CustomException(message="permission_mode 只能是 manual/auto/bypass", code=422)
        session.permission_mode = body.permission_mode
    if body.auto_allow_tools is not None:
        session.auto_allow_tools = json.dumps([str(name) for name in body.auto_allow_tools][:40], ensure_ascii=False)
    if body.enable_mcp is not None:
        if body.enable_mcp and check_deployed_by_official_in_fuc():
            # 外部 MCP 是计划能力:官方部署下过一下权限,自建部署直接放行。
            access_token, _ = create_token(user=user)
            await plan_ability_checked_in_func(
                ability=Ability.MCP_CLIENT.value,
                authorization=f"Bearer {access_token}",
            )
        session.enable_mcp = body.enable_mcp
    session.update_time = host._now()
    await db.commit()
    await db.refresh(session)
    return _session_out(session)


@agent_router.post("/session/delete", response_model=schemas.common.SuccessResponse)
async def delete_agent_session(
    body: AgentSessionIdRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    session = await _require_session(db, user, body.session_id)
    if session.user_id != user.id:
        raise schemas.error.CustomException(message="Forbidden", code=403)
    await host.stop_turn(db, session)
    session.delete_at = host._now()
    await db.commit()
    return schemas.common.SuccessResponse()


@agent_router.post("/session/messages", response_model=list[schemas.agent.AgentMessageInfo])
async def list_agent_messages(
    body: AgentSessionIdRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    session = await _require_session(db, user, body.session_id)
    messages = (
        await db.scalars(
            select(models.agent.AgentMessage)
            .where(models.agent.AgentMessage.session_id == session.id)
            .order_by(models.agent.AgentMessage.create_time, models.agent.AgentMessage.id)
        )
    ).all()
    return [_message_out(message) for message in messages]


@agent_router.post("/session/message", response_model=schemas.agent.AgentMessageInfo)
async def post_agent_message(
    body: schemas.agent.AgentMessageCreateRequest,
    session_id: int,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    session = await _require_session(db, user, session_id)
    if session.user_id != user.id:
        raise schemas.error.CustomException(message="Forbidden", code=403)
    if not body.content.strip() and not body.images:
        raise schemas.error.CustomException(message="消息不能为空", code=400)
    message = await host.post_user_message(
        db,
        session,
        body.content,
        user,
        images=body.images,
        references=[one.model_dump() for one in body.references],
    )
    return _message_out(message)


@agent_router.get("/session/{session_id}/stream")
async def stream_agent_turn(
    session_id: int,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    """SSE:正在跑的那轮的实时流(快照式:seq 变就推一帧,done 收尾)。"""
    await _require_session(db, user, session_id)

    async def generator():
        last_seq = -1
        while True:
            state = host.get_stream_state(session_id)
            if state["seq"] != last_seq:
                last_seq = state["seq"]
                yield (
                    "data: "
                    + json.dumps(
                        {
                            "text": state["text"],
                            "done": state["done"],
                            "timeline": state.get("timeline", []),
                        },
                        ensure_ascii=False,
                    )
                    + "\n\n"
                )
            if state["done"]:
                break
            await asyncio.sleep(0.1)

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@agent_router.post("/session/queue", response_model=list[schemas.agent.AgentMessageInfo])
async def list_queued_messages(
    body: AgentSessionIdRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    session = await _require_session(db, user, body.session_id)
    return [_message_out(message) for message in await host.queued_messages(db, session)]


@agent_router.post("/session/queue/steer", response_model=dict)
async def steer_queued_message(
    session_id: int,
    message_id: int,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    """把排队消息切进正在跑的轮。排队是默认,steer 是有意的「现在就改变你在做的事」。"""
    session = await _require_session(db, user, session_id)
    try:
        steered = await host.steer_queued_message(db, session, message_id)
    except host.HostError as exc:
        raise schemas.error.CustomException(message=str(exc), code=409) from exc
    return {"steered": steered}


@agent_router.post("/session/queue/cancel", response_model=dict)
async def cancel_queued_message(
    session_id: int,
    message_id: int,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    session = await _require_session(db, user, session_id)
    try:
        remaining = await host.cancel_queued_message(db, session, message_id)
    except host.HostError as exc:
        raise schemas.error.CustomException(message=str(exc), code=409) from exc
    return {"remaining": remaining}


@agent_router.post("/session/stop", response_model=dict)
async def stop_agent_turn(
    body: AgentSessionIdRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    """停掉正在跑的轮,保留已产出的部分。没有在跑不是错误。"""
    session = await _require_session(db, user, body.session_id)
    return {"stopped": await host.stop_turn(db, session)}


@agent_router.post("/session/compact", response_model=schemas.agent.AgentCompactResponse)
async def compact_agent_session(
    body: AgentSessionIdRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    """手动整理上下文。压缩要调一次模型做摘要,所以是用户主动触发,不做后台自动跑。"""
    session = await _require_session(db, user, body.session_id)
    try:
        result = await host.compact_session_context(db, session, user)
    except AdapterError as exc:
        raise schemas.error.CustomException(message=str(exc), code=502) from exc
    return schemas.agent.AgentCompactResponse(**result)


# ---------------------------------------------------------------------------
# 工具清单与执行(sidecar 的回连端点;清单同时也喂前端的「这个智能体会什么」)
# ---------------------------------------------------------------------------


@agent_router.get("/tools", response_model=list[schemas.agent.AgentToolSpecInfo])
async def list_agent_tools(user: models.user.User = Depends(get_current_user)):
    """智能体工具清单。从 mcp_router 的注册表派生,永远只有这一份。"""
    return await tool_manifest.agent_tool_specs()


@agent_router.post("/tools/{name}", response_model=dict)
async def invoke_agent_tool(
    name: str,
    body: schemas.agent.AgentToolInvokeRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
    authorization: str = Depends(get_authorization_header),
):
    """以调用方的身份执行一个工具。

    确认门控的工具在这里分流:命中「本会话始终允许」/ bypass 模式的直接执行;
    否则只建一张 pending 卡,sidecar 会阻塞轮询它的结果。
    """
    specs = {spec.name: spec for spec in await tool_manifest.agent_tool_specs()}
    spec = specs.get(name)
    if spec is None:
        raise schemas.error.CustomException(message=f"Tool {name} not found", code=404)

    session_id = _token_session_id(authorization)
    if spec.confirmation:
        auto_allowed = False
        if session_id is not None:
            session = await db.get(models.agent.AgentSession, session_id)
            if session is not None and session.user_id == user.id:
                allowed = json.loads(session.auto_allow_tools) if session.auto_allow_tools else []
                auto_allowed = confirmations.may_run_without_asking(
                    permission=spec.permission,
                    mode=session.permission_mode,
                    auto_allow_tools=allowed,
                    tool=name,
                )
        if not auto_allowed:
            card = await confirmations.request_confirmation(
                db,
                user_id=user.id,
                tool=name,
                payload=body.arguments,
                requested_by=body.requested_by or "pi-agent",
                session_id=session_id,
            )
            return {"result": {"confirmation_id": card.id, "status": "pending"}}
    try:
        result = await tool_manifest.invoke_tool(name, body.arguments, user.id)
    except tool_manifest.ToolNotFoundError:
        raise schemas.error.CustomException(message=f"Tool {name} not found", code=404)
    except TypeError as exc:
        # 缺必填参数(含把参数名拼错)—— 是模型的输入问题,不是服务端故障
        raise schemas.error.CustomException(message=f"{exc}", code=422) from exc
    except Exception as exc:  # noqa: BLE001 — 工具失败是一种结果,不是 500
        exception_logger.warning(format_log_message("agent_tool_failed", tool=name, error=exc))
        return {"error": str(exc)[:500]}
    return {"result": result}


# ---------------------------------------------------------------------------
# 确认卡
# ---------------------------------------------------------------------------


class ConfirmationSearchRequest(schemas.base.BaseModel):
    session_id: int | None = None
    status: str | None = None


@agent_router.post("/confirmations/list", response_model=list[schemas.agent.ToolConfirmationInfo])
async def list_confirmations(
    body: ConfirmationSearchRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    stmt = (
        select(models.agent.ToolConfirmation)
        .where(models.agent.ToolConfirmation.user_id == user.id)
        .order_by(models.agent.ToolConfirmation.create_time.desc())
        .limit(100)
    )
    if body.session_id is not None:
        stmt = stmt.where(models.agent.ToolConfirmation.session_id == body.session_id)
    if body.status is not None:
        stmt = stmt.where(models.agent.ToolConfirmation.status == body.status)
    cards = (await db.scalars(stmt)).all()
    return [_confirmation_out(card) for card in cards]


async def _require_confirmation(
    db: AsyncSession, user: models.user.User, confirmation_id: int
) -> models.agent.ToolConfirmation:
    card = await db.get(models.agent.ToolConfirmation, confirmation_id)
    if card is None or card.user_id != user.id:
        raise schemas.error.CustomException(message="Confirmation not found", code=404)
    return card


@agent_router.get("/confirmations/{confirmation_id}", response_model=schemas.agent.ToolConfirmationInfo)
async def get_confirmation(
    confirmation_id: int,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    """sidecar 阻塞轮询的端点,也是前端卡片的轮询端点。"""
    card = await _require_confirmation(db, user, confirmation_id)
    return _confirmation_out(card)


@agent_router.post("/confirmations/{confirmation_id}/approve", response_model=schemas.agent.ToolConfirmationInfo)
async def approve_confirmation(
    confirmation_id: int,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    card = await _require_confirmation(db, user, confirmation_id)
    try:
        card = await confirmations.authorize_and_approve(db, user, card)
    except confirmations.ConfirmationError as exc:
        raise schemas.error.CustomException(message=str(exc), code=409) from exc
    return _confirmation_out(card)


@agent_router.post("/confirmations/{confirmation_id}/reject", response_model=schemas.agent.ToolConfirmationInfo)
async def reject_confirmation(
    confirmation_id: int,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    card = await _require_confirmation(db, user, confirmation_id)
    try:
        card = await confirmations.authorize_and_reject(db, user, card)
    except confirmations.ConfirmationError as exc:
        raise schemas.error.CustomException(message=str(exc), code=409) from exc
    return _confirmation_out(card)
