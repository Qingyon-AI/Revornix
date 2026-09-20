/**
 * Revornix agent sidecar — entry point.
 *
 * A short-lived Node process the Python backend spawns once per turn and drives over
 * stdio (see protocol.ts). It embeds pi's `Agent` (pi-agent-core) to run turns,
 * bridges Revornix's tools (backend manifest + user-registered MCP servers), and
 * streams events back. stdin stays open for the life of the turn so steer/abort
 * frames can land while a turn is running.
 */
import * as readline from "node:readline";

import type { Agent } from "@earendil-works/pi-agent-core";

import {
  log,
  send,
  type CompactRequest,
  type Request,
} from "./protocol.js";
import { installProxyFromEnv } from "./proxy.js";
import { runCompaction, runPiTurn } from "./pi.js";
import { buildAllTools } from "./tools.js";
import { buildMcpTools } from "./mcp.js";

/**
 * Turns currently running, so a later frame can reach into one.
 *
 * Steering is only meaningful while a turn is in flight, which means the Agent has to be
 * addressable from outside the call that is awaiting it.
 */
const active = new Map<string, Agent>();

/**
 * MCP handles for turns currently in flight, so a signal handler can reach them.
 *
 * A stdio MCP server is a child process this sidecar spawned. Normally the turn's own
 * `finally` closes it. But the backend kills this process when a turn exceeds its timeout,
 * and a kill does not run that `finally` — the children would be left behind, one batch per
 * timed-out turn, for as long as the api process lives.
 */
const openMcp = new Set<{ close: () => Promise<void> }>();

let shuttingDown = false;

/** Close every open MCP connection, then exit. Safe to call twice. */
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  log(`received ${signal}; closing ${openMcp.size} MCP connection(s)`);
  await Promise.allSettled([...openMcp].map((handle) => handle.close()));
  process.exit(0);
}

// Without these, node's default SIGTERM action terminates immediately and the cleanup above
// never runs — which is the whole reason the backend sends SIGTERM before SIGKILL.
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

async function handleRunTurn(msg: Extract<Request, { type: "run_turn" }>): Promise<void> {
  const { turnId, prompt } = msg;
  if (!msg.provider?.baseUrl || !msg.model) {
    send({ type: "error", turnId, message: "missing provider/model in run_turn frame" });
    return;
  }
  const [builtin, mcp] = await Promise.all([
    buildAllTools(msg.apiBase, msg.token),
    buildMcpTools(msg.mcpServers ?? []),
  ]);
  try {
    const result = await runPiTurn(
      {
        systemPrompt: msg.systemPrompt,
        prompt,
        images: (msg.images ?? []).map((image) => ({ type: "image" as const, ...image })),
        provider: msg.provider,
        model: msg.model,
        tools: [...builtin, ...mcp.tools],
        sessionState: msg.sessionState,
        forceCompact: msg.forceCompact,
        thinkingLevel: msg.thinkingLevel,
        onAgentReady: (agent) => active.set(turnId, agent),
      },
      {
        onDelta: (delta) => send({ type: "text_delta", turnId, delta }),
        onThinking: (delta) => send({ type: "thinking_delta", turnId, delta }),
        onThinkingEnd: () => send({ type: "thinking_end", turnId }),
        onToolStart: (toolCallId, name, args) => send({ type: "tool_start", turnId, toolCallId, name, args }),
        onToolEnd: (toolCallId, result, isError) => send({ type: "tool_end", turnId, toolCallId, result, isError }),
        // 子智能体的每一步。result 原样带上 —— 截断是展示层的事,传输层截了就再也补不回来。
        onSubtool: (event) => send({ type: "subtool", turnId, ...event }),
        onSubagentResult: (parentCallId, archive) => send({ type: "subagent_result", turnId, parentCallId, archive }),
      },
    );
    if (result.aborted) send({ type: "aborted", turnId });
    // 模型调用失败但没产出任何文本 → 报错,别把它当成一轮"成功但空"的回答。
    else if (result.errorMessage && !result.text.trim()) {
      send({ type: "error", turnId, message: result.errorMessage });
      return;
    }
    send({
      type: "turn_done",
      turnId,
      text: result.text,
      sessionState: result.sessionState,
      usage: result.usage,
      context: result.context,
      compaction: result.compaction ?? null,
    });
  } finally {
    // MCP 连接跟着这轮走:sidecar 是回合级进程,留着也不会有人复用。
    await mcp.close();
  }
}

/** 只压缩不对话。没有 provider/model 就原样回,不假装压过 —— 界面会显示"没有可压缩的内容"。 */
async function handleCompact(msg: CompactRequest): Promise<void> {
  if (!msg.provider?.baseUrl || !msg.model) {
    send({ type: "compacted", turnId: msg.turnId, sessionState: msg.sessionState ?? null, compaction: null });
    return;
  }
  const result = await runCompaction({
    provider: msg.provider,
    model: msg.model,
    sessionState: msg.sessionState,
  });
  send({
    type: "compacted",
    turnId: msg.turnId,
    sessionState: result.sessionState,
    context: result.context,
    compaction: result.compaction,
  });
}

async function main(): Promise<void> {
  // 必须在任何请求之前:setGlobalDispatcher 只影响之后发起的请求。
  installProxyFromEnv();
  const rl = readline.createInterface({ input: process.stdin });
  send({ type: "ready" });
  log("started; awaiting run_turn frames on stdin");
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let msg: Request;
    try {
      msg = JSON.parse(trimmed) as Request;
    } catch {
      log("ignoring non-JSON line:", trimmed.slice(0, 120));
      continue;
    }
    try {
      if (msg.type === "run_turn") {
        // Deliberately NOT awaited. Awaiting here stops stdin from being read until the turn
        // ends, which would make steer and abort frames — the only frames that matter while a
        // turn is running — impossible to deliver.
        void handleRunTurn(msg)
          .catch((err) => send({ type: "error", turnId: msg.turnId, message: String(err) }))
          .finally(() => active.delete(msg.turnId));
      } else if (msg.type === "steer") {
        const agent = active.get(msg.turnId);
        if (!agent) {
          // The turn finished between the user typing and this frame arriving. Saying so lets
          // the backend send it as an ordinary next turn instead of dropping it.
          send({ type: "queued", turnId: msg.turnId, mode: msg.mode ?? "steer", pending: false });
        } else {
          const message = { role: "user" as const, content: msg.prompt, timestamp: Date.now() };
          if (msg.mode === "follow_up") agent.followUp(message);
          else agent.steer(message);
          send({ type: "queued", turnId: msg.turnId, mode: msg.mode ?? "steer", pending: true });
        }
      } else if (msg.type === "queue") {
        const agent = active.get(msg.turnId);
        if (agent) {
          agent.clearSteeringQueue();
          for (const prompt of msg.prompts) {
            agent.steer({ role: "user" as const, content: prompt, timestamp: Date.now() });
          }
        }
        send({ type: "queued", turnId: msg.turnId, mode: "steer", pending: Boolean(agent) && msg.prompts.length > 0 });
      } else if (msg.type === "compact") {
        // 同样不 await:压缩要调一次模型做摘要,期间 stdin 仍要能收 abort。
        void handleCompact(msg).catch((err) => send({ type: "error", turnId: msg.turnId, message: String(err) }));
      } else if (msg.type === "abort") {
        active.get(msg.turnId)?.abort();
      } else {
        log("unknown message type:", (msg as { type?: string }).type ?? "(none)");
      }
    } catch (err) {
      send({ type: "error", turnId: (msg as { turnId?: string }).turnId ?? null, message: String(err) });
    }
  }
  log("stdin closed; exiting");
}

main().catch((err) => {
  log("fatal:", err);
  process.exit(1);
});
