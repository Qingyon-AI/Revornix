"""pi sidecar 适配层:spawn、协议读写、steer/abort、压缩。

与 OpenStudio 的线程版不同,这里全程 asyncio:FastAPI 单进程单事件循环,
turn 是一个后台 Task,sidecar 的工具调用经 HTTP 回到同一个进程,不会死锁。

两个易踩的坑(都是踩过的):
- **stderr 必须持续排空**:子进程写满管道缓冲区(~64KB)就卡在 write 上,
  而父进程卡在读 stdout,两边永远不动。所以有一个专门的 drain 任务。
- **turn_done 即停读**:stdin 在整轮期间保持开放(供 steer/abort),sidecar 的
  readline 循环不会自己结束 —— 等 EOF 会让每轮都"挂到超时"。
"""

from __future__ import annotations

import asyncio
import json
import os
import shutil
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

from common.logger import exception_logger, info_logger

TURN_TIMEOUT_SECONDS = 600

_PROVIDER_HINT = (
    "请检查模型供应商配置:base_url 是否为完整的 OpenAI 兼容端点"
    "(含端口与 /v1,如 http://localhost:11434/v1)、模型名是否存在、服务是否可达。"
)


class AdapterError(RuntimeError):
    pass


@dataclass(frozen=True)
class TurnResult:
    text: str
    adapter_state: object | None = None  # pi: 序列化的消息数组,用于下一轮多轮记忆
    usage: dict | None = None
    #: 本轮结束时的上下文水位 {tokens, window}。窗口按**当前模型**给 —— 换模型上限就变。
    context: dict | None = None
    #: 本轮开始前发生的压缩;没发生为 None。必须一路带到前端 —— 压缩静默进行的话,
    #: 用户不会知道早期消息已经不在上下文里了。
    compaction: dict | None = None


@dataclass(frozen=True)
class CompactionResult:
    """一次手动压缩的结果。`compaction` 为 None 表示没有可压缩的内容(对话还太短)。"""

    adapter_state: object | None
    context: dict | None
    compaction: dict | None


def pi_sidecar_command() -> tuple[str, str]:
    """跑 sidecar 用的 (node, 脚本路径)。"""
    node = os.environ.get("REVORNIX_AGENT_BIN_NODE") or shutil.which("node") or "node"
    repo_root = Path(__file__).resolve().parents[2]
    sidecar = os.environ.get("REVORNIX_PI_SIDECAR") or str(repo_root / "agent-sidecar" / "dist" / "sidecar.cjs")
    return node, sidecar


def _provider_frame(provider: dict) -> dict:
    return {
        "baseUrl": provider.get("base_url", ""),
        "apiKey": provider.get("api_key", ""),
        "vendor": provider.get("vendor", ""),
        # 模型目录给了才带上;没有就不传,由 sidecar 用保守回退而不是硬编一个大数。
        "contextWindow": provider.get("context_window"),
        "maxOutputTokens": provider.get("max_output_tokens"),
        # 按模型的手动覆盖。没填就不传,由 sidecar 保持保守默认。
        "reasoning": provider.get("reasoning"),
        "vision": provider.get("vision"),
        "reasoningEffort": provider.get("reasoning_effort"),
        "developerRole": provider.get("developer_role"),
    }


class _LiveTurn:
    """一个仍在跑的 turn 的 stdin。

    Steering 只有在轮还没结束时才有意义,这意味着必须能从"等这轮跑完"的那个
    Task 之外写入它的 stdin。
    """

    def __init__(self, process: asyncio.subprocess.Process, turn_id: str) -> None:
        self._process = process
        self.turn_id = turn_id
        self.closed = False

    def send(self, frame: dict) -> bool:
        """写一帧。轮已结束返回 False,调用方降级为普通下一轮。"""
        if self.closed or self._process.stdin is None:
            return False
        try:
            self._process.stdin.write(json.dumps(frame, ensure_ascii=False).encode("utf-8") + b"\n")
        except (BrokenPipeError, ValueError, RuntimeError):
            # 查找和写入之间轮结束了。不是错误:调用方把消息当普通下一轮发。
            self.closed = True
            return False
        return True

    def close(self) -> None:
        self.closed = True
        try:
            self._process.stdin.close()
        except Exception:  # noqa: BLE001 — 进程可能已经没了
            pass


#: 正在跑的 turn,按会话 id 索引。发 steer/abort 的 HTTP 请求与跑轮的 Task 在这里会合。
_LIVE: dict[int, _LiveTurn] = {}


def steer_turn(session_id: int, prompt: str, mode: str = "steer") -> bool:
    """往正在跑的轮里插一句话。没有在跑的轮返回 False。"""
    live = _LIVE.get(session_id)
    if live is None:
        return False
    return live.send({"type": "steer", "turnId": live.turn_id, "prompt": prompt, "mode": mode})


def abort_turn(session_id: int) -> bool:
    """停掉正在跑的轮,保留已产出的内容。没有在跑的轮返回 False。"""
    live = _LIVE.get(session_id)
    if live is None:
        return False
    return live.send({"type": "abort", "turnId": live.turn_id})


async def _drain_stderr(process: asyncio.subprocess.Process, sink: list[str]) -> None:
    """一直把 stderr 读空(见模块 docstring:不排空就是管道死锁)。

    日志体积无界,只留尾巴;sidecar 自己的日志走 stderr,协议不受影响。
    """
    if process.stderr is None:
        return
    try:
        while True:
            line = await process.stderr.readline()
            if not line:
                return
            sink.append(line.decode("utf-8", "replace"))
            del sink[:-200]
    except Exception:  # noqa: BLE001 — 读不懂也得读完
        return


def _tail(text: str, limit: int = 500) -> str:
    return text.strip()[-limit:]


async def _spawn(frame: dict) -> tuple[asyncio.subprocess.Process, asyncio.Task, list[str]]:
    node, sidecar = pi_sidecar_command()
    if not Path(sidecar).exists():
        raise AdapterError(f"pi sidecar 未构建:{sidecar}(在 agent-sidecar 目录执行 pnpm build)")
    process = await asyncio.create_subprocess_exec(
        node,
        sidecar,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    assert process.stdin is not None and process.stdout is not None
    process.stdin.write(json.dumps(frame, ensure_ascii=False).encode("utf-8") + b"\n")
    await process.stdin.drain()
    stderr_lines: list[str] = []
    drain_task = asyncio.create_task(_drain_stderr(process, stderr_lines))
    return process, drain_task, stderr_lines


def _stderr_tail(lines: list[str]) -> str:
    return _tail("".join(lines))


#: SIGTERM 之后留给 sidecar 收尾的时间。够它关掉 MCP 连接,又不至于让超时路径明显变慢。
_TERMINATE_GRACE_SECONDS = 3


async def _kill(process: asyncio.subprocess.Process) -> None:
    """先 SIGTERM 再 SIGKILL。

    直接 SIGKILL 会**跳过 sidecar 的清理**,而用户可以注册 stdio 类型的 MCP server
    (`category=stdio`,带 cmd/args)—— 那些是 sidecar 自己 spawn 的子进程,靠每轮
    `finally` 里的 `mcp.close()` 收掉。SIGKILL 不可捕获,那个 finally 永远不会跑,
    子进程就被遗弃在系统里;一次 600 秒超时留一批,api 进程活多久就积多久。

    SIGTERM 让 sidecar 走它自己的关闭路径;它没在宽限期内退出,再来硬的。
    """
    try:
        process.terminate()
    except ProcessLookupError:
        return
    try:
        await asyncio.wait_for(process.wait(), timeout=_TERMINATE_GRACE_SECONDS)
        return
    except asyncio.TimeoutError:
        pass
    try:
        process.kill()
    except ProcessLookupError:
        pass


async def run_turn(
    *,
    session_id: int,
    prompt: str,
    system_prompt: str,
    api_base: str,
    token: str,
    provider: dict,
    model: str,
    adapter_state: object | None,
    mcp_servers: list[dict] | None = None,
    thinking_level: str = "off",
    force_compact: bool = False,
    images: list[dict[str, str]] | None = None,
    on_delta: Callable[[str], None] | None = None,
    on_tool: Callable[[dict], None] | None = None,
    on_thinking: Callable[[dict], None] | None = None,
) -> TurnResult:
    """为一轮对话 spawn sidecar 并流式消费它的 JSONL 事件。"""
    frame = {
        "type": "run_turn",
        "turnId": "turn",
        "prompt": prompt,
        "systemPrompt": system_prompt,
        "apiBase": api_base,
        "token": token,
        "provider": _provider_frame(provider),
        "model": model,
        "sessionState": adapter_state,
        "forceCompact": force_compact,
        "thinkingLevel": thinking_level,
        "images": images or [],
        "mcpServers": mcp_servers or [],
    }
    process, drain_task, stderr_lines = await _spawn(frame)
    live = _LiveTurn(process, frame["turnId"])
    if session_id:
        _LIVE[session_id] = live

    result_text: str | None = None
    result_state: object | None = None
    result_usage: dict | None = None
    result_context: dict | None = None
    result_compaction: dict | None = None
    saw_tool = False
    aborted = False
    timed_out = False
    try:
        async def _read_loop() -> None:
            nonlocal result_text, result_state, result_usage, result_context, result_compaction
            nonlocal saw_tool, aborted
            assert process.stdout is not None
            while True:
                raw = await process.stdout.readline()
                if not raw:
                    return
                line = raw.decode("utf-8", "replace").strip()
                if not line:
                    continue
                try:
                    event = json.loads(line)
                except json.JSONDecodeError:
                    continue
                kind = event.get("type")
                if kind == "text_delta" and on_delta is not None:
                    on_delta(str(event.get("delta", "")))
                elif kind in ("thinking_delta", "thinking_end") and on_thinking is not None:
                    on_thinking(event)
                elif kind in ("tool_start", "tool_end", "subtool", "subagent_result"):
                    # subtool 走同一条工具事件通道:它就是一次工具调用,只是发生在子智能体里、
                    # 挂在 run_subagent 那张卡名下(parentCallId)。
                    saw_tool = True
                    if on_tool is not None:
                        on_tool(event)
                elif kind == "turn_done":
                    result_text = str(event.get("text", ""))
                    result_state = event.get("sessionState")
                    usage = event.get("usage")
                    result_usage = usage if isinstance(usage, dict) else None
                    context = event.get("context")
                    result_context = context if isinstance(context, dict) else None
                    compaction = event.get("compaction")
                    result_compaction = compaction if isinstance(compaction, dict) else None
                    # 读到 turn_done 就停,不等进程退出:stdin 整轮保持开放(供 steer),
                    # sidecar 的 readline 循环不会自己结束 —— 等 EOF 会把每轮拖到超时。
                    return
                elif kind == "error":
                    detail = _tail(str(event.get("message", "pi sidecar error")))
                    # 还没产出任何文本/工具调用就失败,基本都是供应商配置问题(端点不对、
                    # 模型不存在、鉴权失败),给一句可操作的提示;跑起来后的失败只报原始错误。
                    if not saw_tool:
                        raise AdapterError(f"{detail}\n{_PROVIDER_HINT}")
                    raise AdapterError(detail)
                elif kind == "aborted":
                    aborted = True

        try:
            await asyncio.wait_for(_read_loop(), timeout=TURN_TIMEOUT_SECONDS)
        except asyncio.TimeoutError:
            timed_out = True
            await _kill(process)
    finally:
        live.close()
        if session_id and _LIVE.get(session_id) is live:
            del _LIVE[session_id]
        try:
            await asyncio.wait_for(process.wait(), timeout=5)
        except asyncio.TimeoutError:
            await _kill(process)
        drain_task.cancel()
    stderr_tail = _stderr_tail(stderr_lines)
    if timed_out:
        raise AdapterError(
            f"智能体运行超过 {TURN_TIMEOUT_SECONDS} 秒未返回,已终止。" + (f"\n{stderr_tail}" if stderr_tail else "")
        )
    if result_text is None:
        raise AdapterError(stderr_tail or f"pi sidecar exited with code {process.returncode}")
    if aborted:
        # 主动停止是正常结果,不是失败:用户要求的,而已产出的部分是真实输出。
        return TurnResult(
            text=result_text,
            adapter_state=result_state,
            usage=result_usage,
            context=result_context,
            compaction=result_compaction,
        )
    if not result_text.strip() and not saw_tool:
        # 一轮既没有文本也没有工具调用,说明模型调用本身就失败了(端点不通、模型名错、
        # 鉴权失败)而 pi 把它吞了。绝不让它以一个空气泡的形式出现 —— 用户必须知道为什么。
        raise AdapterError(stderr_tail or f"模型没有返回任何内容。{_PROVIDER_HINT}")
    return TurnResult(
        text=result_text.strip(),
        adapter_state=result_state,
        usage=result_usage,
        context=result_context,
        compaction=result_compaction,
    )


async def compact_session(
    *,
    api_base: str,
    token: str,
    provider: dict,
    model: str,
    adapter_state: object | None,
) -> CompactionResult:
    """只压缩不对话 —— 界面上的「立即整理」。

    单独走一次 sidecar 而不是"下一轮顺带压":用户点的是"现在把上下文整理掉",要求他先
    再问一句话才生效,和这个动作的语义对不上。摘要仍然会花一次模型调用,所以它是手动的。
    """
    frame = {
        "type": "compact",
        "turnId": "compact",
        "systemPrompt": "",
        "apiBase": api_base,
        "token": token,
        "provider": _provider_frame(provider),
        "model": model,
        "sessionState": adapter_state,
    }
    process, drain_task, stderr_lines = await _spawn(frame)
    assert process.stdin is not None
    process.stdin.close()
    try:
        async def _read_loop() -> CompactionResult:
            assert process.stdout is not None
            while True:
                raw = await process.stdout.readline()
                if not raw:
                    break
                line = raw.decode("utf-8", "replace").strip()
                if not line:
                    continue
                try:
                    event = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if event.get("type") == "compacted":
                    return CompactionResult(
                        adapter_state=event.get("sessionState"),
                        context=event.get("context") if isinstance(event.get("context"), dict) else None,
                        compaction=event.get("compaction") if isinstance(event.get("compaction"), dict) else None,
                    )
                if event.get("type") == "error":
                    raise AdapterError(_tail(str(event.get("message", "压缩失败"))))
            raise AdapterError(_stderr_tail(stderr_lines) or "压缩没有返回结果")

        # 摘要要真的调一次模型,给和一轮对话同量级的时限。
        return await asyncio.wait_for(_read_loop(), timeout=TURN_TIMEOUT_SECONDS)
    except asyncio.TimeoutError:
        await _kill(process)
        raise AdapterError(f"压缩超过 {TURN_TIMEOUT_SECONDS} 秒未返回,已终止。")
    finally:
        try:
            await asyncio.wait_for(process.wait(), timeout=5)
        except asyncio.TimeoutError:
            await _kill(process)
        drain_task.cancel()


def sidecar_available() -> bool:
    """sidecar 是否已构建。设置页/健康检查用,别让一轮对话跑到一半才发现没构建。"""
    _, sidecar = pi_sidecar_command()
    return Path(sidecar).exists()


def log_sidecar_status() -> None:
    node, sidecar = pi_sidecar_command()
    if Path(sidecar).exists():
        info_logger.warning(f"agent sidecar ready: {sidecar}")
    else:
        exception_logger.warning(
            f"agent sidecar NOT built: {sidecar} — agent turns will fail until `pnpm build` runs in agent-sidecar/"
        )
