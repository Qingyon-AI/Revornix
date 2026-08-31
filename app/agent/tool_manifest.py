"""智能体能用的那份工具清单 —— **一份**,不是每个入口各写一份。

由 `api/mcp_router/` 下四个 FastMCP 注册表(common/document/graph/section)派生:
HTTP 那条路(GET /agent/tools,给 sidecar 发现工具)和执行那条路(POST /agent/tools/{name})
读的是同一份注册表。两份手写清单必然漂移,而且漂移是静默的。

确认门控与子智能体白名单由这里的两个集合标注 —— 加新工具时**必须**给它归队,
漏标 READ_ONLY 只是子智能体少一个工具,漏标 CONFIRMATION 是写操作裸奔。
"""

from __future__ import annotations

import inspect
from typing import Any

from pydantic import BaseModel

from common.logger import exception_logger


def _registries():
    """四个 FastMCP server。延迟导入:mcp_router 依赖 api/ 的 router 层,
    模块级 import 会让 app 包在 worker 里 import 时就炸。"""
    from mcp_router.common import common_mcp_router
    from mcp_router.document import document_mcp_router
    from mcp_router.graph import graph_mcp_router
    from mcp_router.section import section_mcp_router

    return (common_mcp_router, document_mcp_router, graph_mcp_router, section_mcp_router)


#: 写操作工具:调用只建确认卡,用户在界面上批准后才真正执行。
#: 档位语义:edit = 可撤销/可改的;ai-cost = 触发后台 AI 任务(花钱/排队);destructive = 撤不回。
CONFIRMATION_TOOLS: dict[str, str] = {
    # ---- document ----
    "create_document": "edit",
    "update_document": "edit",
    "delete_documents": "destructive",
    "create_document_label": "edit",
    "delete_document_labels": "destructive",
    "create_document_note": "edit",
    "set_document_star_status": "edit",
    "set_document_read_status": "edit",
    "touch_document_content": "edit",
    "transform_document_markdown": "ai-cost",
    "generate_document_summary": "ai-cost",
    "generate_document_embedding": "ai-cost",
    "transcribe_document_audio": "ai-cost",
    "generate_document_graph": "ai-cost",
    "generate_document_podcast": "ai-cost",
    "cancel_document_summary": "edit",
    "cancel_document_embedding": "edit",
    "cancel_document_transcription": "edit",
    "cancel_document_graph": "edit",
    "cancel_document_podcast": "edit",
    # ---- section ----
    "create_section": "edit",
    "update_section": "edit",
    "delete_section": "destructive",
    "create_section_label": "edit",
    "delete_section_labels": "destructive",
    "set_section_subscription_status": "edit",
    "trigger_section_process": "ai-cost",
    "retry_section_document": "ai-cost",
    "generate_section_podcast": "ai-cost",
    "generate_section_ppt": "ai-cost",
    "cancel_section_process": "edit",
    "cancel_section_podcast": "edit",
    "cancel_section_ppt": "edit",
}

#: 子智能体只拿只读工具。**显式声明**,漏声明的一律算会改东西。
READ_ONLY_TOOLS: frozenset[str] = frozenset({
    # ---- common ----
    "current_time",
    "random_string",
    "generate_uuid",
    "base64_encode",
    # ---- document ----
    "search_document",
    "search_document_vector",
    "search_my_documents",
    "search_my_unread_documents",
    "search_my_recent_documents",
    "search_my_starred_documents",
    "get_document_detail",
    "list_document_labels",
    "get_document_label_summary",
    "search_document_notes",
    "get_document_month_summary",
    # ---- graph ----
    "search_mine_graph",
    "search_document_graph",
    "search_section_graph",
    # ---- section ----
    "search_my_sections",
    "list_my_sections",
    "search_my_subscribed_sections",
    "search_public_sections",
    "search_user_sections",
    "get_section_detail",
    "get_section_markdown_content",
    "list_section_documents",
    "get_day_section",
    "list_section_labels",
    "get_my_section_role_and_authority",
    "get_section_user_role_and_authority",
    "list_section_users",
})


class ToolSpec(BaseModel):
    name: str
    description: str
    parameters: dict[str, Any]
    # 确认门控标:调用该工具只会创建一张待确认卡并立刻返回 {confirmation_id, status:
    # pending}。sidecar 据此阻塞轮询,用户批完才把**最终结果**交给模型。
    confirmation: bool = False
    permission: str | None = None  # edit | ai-cost | destructive,仅 confirmation=true 时有值
    #: 子智能体只拿只读工具。判据就是这个标记,不在第二处维护名单。
    read_only: bool = False


#: 确认门控工具在 sidecar 这条路上的真实协议。工具自己的描述只说事实(要用户批准),
#: 不说「怎么等」—— sidecar 建卡后**阻塞轮询**确认卡,模型从头到尾看不到 confirmation_id。
_CONFIRMATION_PROTOCOL = (
    "This call BLOCKS until the user approves or rejects it, and then returns the final "
    "result directly — there is no confirmation_id for you to poll afterwards. "
    "A returned result means it already happened."
)


def _describe(description: str, gated: bool) -> str:
    if not gated:
        return description
    return f"{description.rstrip()}\n\n{_CONFIRMATION_PROTOCOL}"


async def agent_tool_specs() -> list[ToolSpec]:
    """全部内置工具的清单。运行期从注册表派生,绝不手抄。"""
    specs: list[ToolSpec] = []
    for registry in _registries():
        tools = await registry.list_tools()
        for tool in tools:
            gated = tool.name in CONFIRMATION_TOOLS
            specs.append(
                ToolSpec(
                    name=tool.name,
                    description=_describe(tool.description or "", gated),
                    parameters=tool.parameters or {"type": "object", "properties": {}},
                    confirmation=gated,
                    permission=CONFIRMATION_TOOLS.get(tool.name),
                    read_only=tool.name in READ_ONLY_TOOLS,
                )
            )
    return specs


class AgentToolContext:
    """tool 函数眼里的 `ctx`:FastMCP Context 的最小替身。

    mcp_router 里的工具只用到 `ctx.get_state("user_id")`(见 mcp_router/auth.py),
    所以替身只需实现这一个方法。中间件不走 HTTP 时不会跑,身份在这里直接给。
    """

    def __init__(self, user_id: int) -> None:
        self._user_id = user_id

    async def get_state(self, key: str) -> Any:
        if key == "user_id":
            return self._user_id
        return None

    async def set_state(self, key: str, value: Any) -> None:  # pragma: no cover - 工具不写
        return None


class ToolNotFoundError(KeyError):
    pass


async def _find_tool(name: str):
    for registry in _registries():
        try:
            # get_tool 找不到时返回 None,不抛 —— 两种"没有"都要继续找下一个注册表。
            tool = await registry.get_tool(name)
        except Exception:  # noqa: BLE001 — 不在这个注册表里,看下一个
            continue
        if tool is not None:
            return tool
    raise ToolNotFoundError(name)


def _fit_arguments(fn: Any, arguments: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    """把模型给的参数收敛到这个工具真正接受的那些,返回 (可用参数, 被丢掉的键)。

    **多给一个键不该让整轮白跑**(模型经常顺手加上语义正确但工具没声明的键)。
    但**不能一律吞掉**:把必填参数拼错也表现为"多了一个不认识的键",这时静默丢弃会让工具
    带着默认值跑起来,做的是另一件事。所以只丢多余的;丢完之后必填项缺了,照样报错。
    """
    try:
        signature = inspect.signature(fn)
    except (TypeError, ValueError):  # 拿不到签名就原样放行
        return dict(arguments), []
    accepts_kwargs = any(p.kind is inspect.Parameter.VAR_KEYWORD for p in signature.parameters.values())
    if accepts_kwargs:
        return dict(arguments), []
    known = {
        name
        for name, param in signature.parameters.items()
        if param.kind in (inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Parameter.KEYWORD_ONLY)
        and name != "ctx"
    }
    fitted = {key: value for key, value in arguments.items() if key in known}
    dropped = [key for key in arguments if key not in known]
    return fitted, dropped


async def invoke_tool(name: str, arguments: dict[str, Any], user_id: int) -> Any:
    """以指定用户的身份执行一个注册表里的工具。

    工具的 HTTP 头(时区、authorization)在进程内调用时取不到,与真实 MCP 路径里
    `get_http_headers()` 拿不到时的行为一致(那些头本来就是可选项)。
    """
    tool = await _find_tool(name)
    fn = getattr(tool, "fn", None)
    if fn is None or not callable(fn):
        raise ToolNotFoundError(name)
    fitted, dropped = _fit_arguments(fn, arguments)
    if dropped:
        exception_logger.info(f"agent tool {name}: dropped unsupported arguments {dropped}")
    # common 那组工具没有 ctx 参数 —— 盲传就是 TypeError。签名里有才注。
    try:
        takes_ctx = "ctx" in inspect.signature(fn).parameters
    except (TypeError, ValueError):
        takes_ctx = True
    if takes_ctx:
        fitted["ctx"] = AgentToolContext(user_id)
    result = fn(**fitted)
    if inspect.isawaitable(result):
        result = await result
    return result
