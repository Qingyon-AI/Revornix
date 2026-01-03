from __future__ import annotations

import time
import uuid
from typing import Any, Dict, Iterable, Optional


# ============
# 工具函数
# ============

def now_ts() -> float:
    return time.time()


def gen_event_id() -> str:
    return f"evt_{uuid.uuid4().hex}"


def base_event(
    *,
    event_type: str,
    run_id: str,
    payload: Dict[str, Any],
    trace: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    return {
        "id": gen_event_id(),
        "type": event_type,          # status | output | error | done
        "timestamp": now_ts(),
        "run_id": run_id,
        "trace": trace or {},
        "payload": payload,
    }


# ==========================
# EventInterpreter（生产级）
# ==========================

class EventInterpreter:
    """
    LangGraph / MCP → 前端可消费事件（AESP）
    """

    def __init__(self):
        self._last_status: Optional[str] = None
        self._done_sent: bool = False

    # ========= 主入口 =========
    def interpret(
        self,
        event: Dict[str, Any],
        *,
        run_id: str,
    ) -> Iterable[Dict[str, Any]]:
        event_type = event.get("event")
        name = event.get("name")
        data = event.get("data", {}) or {}
        parent_ids = event.get("parent_ids", [])

        # trace 信息（给前端 / 调试用）
        trace = {
            "node": name,
            "parent_ids": parent_ids,
        }

        is_root = not parent_ids

        # =========================
        # 1️⃣ Chain Start
        # =========================
        if event_type == "on_chain_start":
            if is_root:
                evt = self._status_once(
                    run_id,
                    trace,
                    phase="thinking",
                    label="正在理解你的问题",
                )
                if evt:
                    yield evt
            return

        # =========================
        # 2️⃣ Chain Stream（忽略）
        # =========================
        if event_type == "on_chain_stream":
            return

        # =========================
        # 3️⃣ Chat Model Start
        # =========================
        if event_type == "on_chat_model_start":
            evt = self._status_once(
                run_id,
                trace,
                phase="writing",
                label="正在生成回答",
            )
            if evt:
                yield evt
            return

        # =========================
        # 4️⃣ Chat Model Token
        # =========================
        if event_type == "on_chat_model_stream":
            chunk = data.get("chunk")

            # LangChain 有时是 AIMessageChunk
            if hasattr(chunk, "content"):
                content = chunk.content
            else:
                content = chunk

            if isinstance(content, str) and content:
                yield base_event(
                    event_type="output",
                    run_id=run_id,
                    trace=trace,
                    payload={
                        "kind": "token",
                        "content": content,
                    },
                )
            return

        # =========================
        # 5️⃣ Chat Model End（不发事件）
        # =========================
        if event_type == "on_chat_model_end":
            return

        # =========================
        # 6️⃣ Tool Start
        # =========================
        if event_type == "on_tool_start":
            tool_name = name or "tool"
            evt = self._status_once(
                run_id,
                trace,
                phase="tool",
                label=f"正在调用工具：{tool_name}",
                detail={"tool": tool_name},
            )
            if evt:
                yield evt
            return

        # =========================
        # 7️⃣ Tool End
        # =========================
        if event_type == "on_tool_end":
            evt = self._status_once(
                run_id,
                trace,
                phase="thinking",
                label="工具返回结果，继续思考",
            )
            if evt:
                yield evt
            return

        # =========================
        # 8️⃣ Chain End（只处理 root）
        # =========================
        if event_type == "on_chain_end":
            if is_root and not self._done_sent:
                self._done_sent = True
                yield base_event(
                    event_type="done",
                    run_id=run_id,
                    trace=trace,
                    payload={"success": True},
                )
            return

        # =========================
        # 9️⃣ Error
        # =========================
        if event_type in ("on_chain_error", "on_tool_error"):
            yield base_event(
                event_type="error",
                run_id=run_id,
                trace=trace,
                payload={
                    "code": "EXECUTION_ERROR",
                    "message": str(data),
                    "recoverable": False,
                },
            )
            return

        # =========================
        # 默认忽略
        # =========================
        return

    # =========================
    # 状态去抖（关键）
    # =========================
    def _status_once(
        self,
        run_id: str,
        trace: Dict[str, Any],
        *,
        phase: str,
        label: str,
        detail: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        if self._last_status == phase:
            return None

        self._last_status = phase

        return base_event(
            event_type="status",
            run_id=run_id,
            trace=trace,
            payload={
                "phase": phase,   # thinking | writing | tool
                "label": label,
                "detail": detail or {},
            },
        )