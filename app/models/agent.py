from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base


class AgentSession(Base):
    """一次 Revornix AI 对话。

    `adapter_state` 存的是 pi 序列化的消息数组(JSON 字符串)——多轮记忆靠它
    在每轮之间 round-trip:每轮开始时发给 sidecar,轮末带回来回存。
    """

    __tablename__ = 'agent_session'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    uuid: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False, default='新对话')
    status: Mapped[str] = mapped_column(String(20), index=True, nullable=False, default='idle')  # idle | running
    # 智能体运行时。会话表记着自己是被哪个运行时跑的,换运行时时旧会话仍能被正确解读。
    adapter: Mapped[str] = mapped_column(String(20), nullable=False, default='pi')
    user_id: Mapped[int] = mapped_column(ForeignKey('user.id'), index=True, nullable=False)
    # 本轮对话用的模型;为空回落到用户默认对话模型(user.default_revornix_model_id)。
    model_id: Mapped[int | None] = mapped_column(ForeignKey('ai_model.id'), index=True)
    adapter_state: Mapped[str | None] = mapped_column(Text)  # pi 消息数组的 JSON
    thinking_level: Mapped[str] = mapped_column(String(10), nullable=False, default='off')  # off|low|medium|high
    permission_mode: Mapped[str] = mapped_column(String(10), nullable=False, default='manual')  # manual|auto|bypass
    # 「本会话始终允许」的工具名清单(JSON 数组)。配合确认卡的第三个按钮。
    auto_allow_tools: Mapped[str | None] = mapped_column(Text)
    # 绑定的 grounding 对象:文档问答 / 专栏问答。两者至多一个非空。
    document_id: Mapped[int | None] = mapped_column(ForeignKey('document.id'), index=True)
    section_id: Mapped[int | None] = mapped_column(ForeignKey('section.id'), index=True)
    # 是否挂载用户在设置里注册并启用的外部 MCP server。
    enable_mcp: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AgentMessage(Base):
    """会话里的一条消息。

    `payload`(JSON 字符串)装着 trace 泳道的数据源:timeline(text/thinking/tool/subtool
    的有序条目)、usage(轮耗时/首 token/计量)、prompt 快照(变了才记)、context(水位)、
    compaction、queued 标记。
    """

    __tablename__ = 'agent_message'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey('agent_session.id'), index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(20), index=True, nullable=False)  # user | assistant | system
    content: Mapped[str] = mapped_column(Text, nullable=False, default='')
    payload: Mapped[str | None] = mapped_column(Text)
    error: Mapped[str | None] = mapped_column(Text)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class ToolConfirmation(Base):
    """一张确认卡:写操作工具不直接执行,先建卡,用户批准后才执行。

    唯一开卡入口是 `agent.confirmations.request_confirmation`;批准走
    `authorize_and_approve` —— 所有入口(HTTP、自动放行)共用那一个实现。
    """

    __tablename__ = 'tool_confirmation'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('user.id'), index=True, nullable=False)
    # 归属哪次对话由**开卡请求的令牌**决定(claim 里带着),不是参数转述的。
    session_id: Mapped[int | None] = mapped_column(ForeignKey('agent_session.id'), index=True)
    tool: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    permission: Mapped[str] = mapped_column(String(20), nullable=False)  # edit | ai-cost | destructive
    summary: Mapped[str] = mapped_column(String(500), nullable=False, default='')
    payload: Mapped[str] = mapped_column(Text, nullable=False)  # 工具参数的 JSON
    status: Mapped[str] = mapped_column(String(20), index=True, nullable=False, default='pending')
    # pending | approved | executed | rejected | failed | cancelled
    result: Mapped[str | None] = mapped_column(Text)
    error: Mapped[str | None] = mapped_column(Text)
    requested_by: Mapped[str] = mapped_column(String(50), nullable=False, default='pi-agent')
    decided_by: Mapped[int | None] = mapped_column(ForeignKey('user.id'))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
