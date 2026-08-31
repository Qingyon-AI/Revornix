/**
 * Revornix tools as pi AgentTools — generated entirely from the backend registry.
 *
 * pi has no MCP for the built-in surface, so tools come from GET /agent/tools (the manifest
 * derived from the FastMCP registries in api/mcp_router, the single tool registry) and execute
 * via POST /agent/tools/{name}. There is no hand-written second list: two lists maintained by
 * hand will drift, and the drift is silent.
 *
 * Confirmation-gated tools are not special-cased by name: the manifest marks them with
 * `confirmation: true`, and any such tool gets the same generic wrapper — invoke (creates the
 * pending card), then block-poll /agent/confirmations/{id} until the user resolves it, so the
 * model receives the executed result rather than a pending stub.
 */
import type { AgentTool, AgentToolResult } from "@earendil-works/pi-agent-core";

import { log } from "./protocol.js";

async function apiGet(
  apiBase: string,
  token: string,
  path: string,
  params?: Record<string, string | number>,
): Promise<unknown> {
  const url = new URL(apiBase + path);
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

async function apiPost(apiBase: string, token: string, path: string, body: unknown): Promise<unknown> {
  const res = await fetch(apiBase + path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} -> ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(id); reject(new Error("aborted")); }, { once: true });
  });
}

interface Confirmation { id: number | string; status: string; result: unknown; error?: string | null }

/**
 * Block until the user resolves a confirmation card.
 * pending -> approved -> executed(result) | failed(error) | rejected. This is the
 * confirmation gate: the agent's turn waits here until the user acts.
 */
async function awaitConfirmation(
  apiBase: string,
  token: string,
  confirmationId: number | string,
  signal: AbortSignal | undefined,
): Promise<unknown> {
  // 人工批准是人速的,轮询上限给足(后端 turn 超时兜底)
  for (let waited = 0; waited < 590_000; waited += 1500) {
    const cur = (await apiGet(apiBase, token, `/agent/confirmations/${confirmationId}`)) as Confirmation;
    if (cur.status === "executed") return cur.result;
    if (cur.status === "rejected") throw new Error("用户拒绝了该操作");
    if (cur.status === "failed") throw new Error(`执行失败:${cur.error ?? "unknown"}`);
    if (cur.status === "cancelled") throw new Error("该确认已被取消");
    await sleep(1500, signal);
  }
  throw new Error("等待用户确认超时");
}

/**
 * A tool result the model can read AND the UI can render.
 *
 * `content` is what the model sees, so it stays text. `details` carries the same value with
 * its structure intact — without it the UI receives a JSON string and has nothing to render
 * but the string.
 */
function jsonResult(data: unknown): AgentToolResult<{ data: unknown }> {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], details: { data } };
}

interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  confirmation?: boolean;
  read_only?: boolean;
}

/** All built-in Revornix tools for a turn, generated from the backend manifest. */
export async function buildAllTools(
  apiBase: string,
  token: string,
): Promise<AgentTool[]> {
  let specs: ToolSpec[];
  try {
    specs = (await apiGet(apiBase, token, "/agent/tools")) as ToolSpec[];
  } catch (err) {
    // 没有 manifest 就没有工具面;宁可空手起 turn(模型会说明情况),也不要一份注定漂移的内置副本。
    log("could not load the tool manifest; starting the turn without tools:", String(err));
    return [];
  }

  return specs
    .filter((spec) => spec?.name)
    .map((spec) => {
      return {
        name: spec.name,
        label: spec.name,
        confirmation: Boolean(spec.confirmation),
        // 子智能体只拿只读工具,判据就是这个标记 —— 名单在后端(唯一工具注册表),
        // 这边再抄一份名字清单必然漂移。
        readOnly: Boolean(spec.read_only),
        description: spec.description || spec.name,
        // The manifest's parameters are already JSON Schema, which is what pi wants.
        parameters: (spec.parameters ?? { type: "object", properties: {} }) as never,
        execute: async (_id: string, rawParams: unknown, signal?: AbortSignal) => {
          const args = { ...((rawParams ?? {}) as Record<string, unknown>) };
          const response = (await apiPost(apiBase, token, `/agent/tools/${spec.name}`, {
            arguments: args,
            requested_by: "pi-agent",
            // **不转述 sessionId**:这次调用属于哪次对话,后端从 token 认出来(turn 令牌铸造时
            // 就带着它)。转述的东西可以被伪造,而确认卡的归属决定它出现在谁面前。
          })) as { result?: unknown; error?: string };
          if (response?.error) throw new Error(response.error);
          if (!spec.confirmation) return jsonResult(response?.result ?? null);
          // 确认门控:调用只创建了待确认卡,阻塞等用户批准后把执行结果给模型。
          const card = (response?.result ?? {}) as { confirmation_id?: number | string };
          if (card.confirmation_id === undefined || card.confirmation_id === null) {
            throw new Error("确认卡创建失败(缺 confirmation_id)");
          }
          return jsonResult(await awaitConfirmation(apiBase, token, card.confirmation_id, signal));
        },
      };
    });
}
