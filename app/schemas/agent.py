from datetime import datetime
from typing import Any

from .base import BaseModel


class AgentSessionCreateRequest(BaseModel):
    title: str | None = None
    model_id: int | None = None
    document_id: int | None = None
    section_id: int | None = None
    enable_mcp: bool = False


class AgentSessionUpdateRequest(BaseModel):
    title: str | None = None
    model_id: int | None = None
    thinking_level: str | None = None  # off | low | medium | high
    permission_mode: str | None = None  # manual | auto | bypass
    auto_allow_tools: list[str] | None = None
    enable_mcp: bool | None = None


class AgentSessionInfo(BaseModel):
    id: int
    uuid: str
    title: str
    status: str
    adapter: str
    model_id: int | None = None
    document_id: int | None = None
    section_id: int | None = None
    enable_mcp: bool
    thinking_level: str
    permission_mode: str
    auto_allow_tools: list[str] | None = None
    context: dict[str, Any] | None = None
    create_time: datetime
    update_time: datetime | None = None


class AgentMessageCreateRequest(BaseModel):
    content: str
    images: list[str] = []


class AgentMessageInfo(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    payload: dict[str, Any] | None = None
    error: str | None = None
    create_time: datetime


class AgentToolInvokeRequest(BaseModel):
    arguments: dict[str, Any] = {}
    # 确认卡上显示的请求方;留空用默认("pi-agent")。
    # **没有 session_id**:这次调用属于哪次对话,由调用方的令牌说了算 —— 参数说的可以是任何值。
    requested_by: str = ""


class AgentToolSpecInfo(BaseModel):
    name: str
    description: str
    parameters: dict[str, Any]
    confirmation: bool = False
    permission: str | None = None
    read_only: bool = False


class ToolConfirmationInfo(BaseModel):
    id: int
    session_id: int | None = None
    tool: str
    permission: str
    summary: str
    payload: dict[str, Any]
    status: str
    # 工具的返回什么形状都有(dict/str/list)。**不要写成 `Any | None`**:那会让
    # OpenAPI 产出 anyOf:[{}, null],openapi-generator 会生成一个引用不到的空壳类型。
    result: Any = None
    error: str | None = None
    requested_by: str
    decided_by: int | None = None
    create_time: datetime
    resolved_at: datetime | None = None


class AgentCompactResponse(BaseModel):
    context: dict[str, Any] | None = None
    compaction: dict[str, Any] | None = None
