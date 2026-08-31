/**
 * Wire protocol between the Python backend and this sidecar.
 *
 * Transport: newline-delimited JSON over stdio. The backend writes one
 * request object per line to our stdin; we write event objects to stdout,
 * one per line. stdout carries ONLY protocol JSON — all human/debug logging
 * goes to stderr (see log()).
 */

/** 用户在 Revornix 里自注册的外部 MCP server(随 run_turn 帧下发,只有 enable 的)。 */
export interface McpServerConfig {
  name: string;
  /** "stdio" | "http" */
  category: "stdio" | "http";
  /** stdio */
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  /** http */
  url?: string;
  headers?: Record<string, string>;
}

/** Backend -> sidecar. */
export interface RunTurnRequest {
  type: "run_turn";
  turnId: string;
  prompt: string;
  /** Current-turn images; pi.ts applies them only when the selected model declares image input. */
  images?: Array<{ data: string; mimeType: string }>;
  systemPrompt: string;
  /** Base URL + bearer token for calling Revornix's HTTP API from tools. */
  apiBase: string;
  token: string;
  /** Resolved provider for pi-ai: OpenAI-compatible endpoint + model. */
  provider?: {
    baseUrl: string;
    apiKey: string;
    vendor: string;
    /** 来自模型目录;端点没给就不传,由 pi.ts 用保守回退。 */
    contextWindow?: number | null;
    maxOutputTokens?: number | null;
    /** 按模型的手动覆盖。没填就是 undefined —— 由 sidecar 保持保守默认,而不是当成 false。 */
    reasoning?: boolean | null;
    vision?: boolean | null;
    reasoningEffort?: boolean | null;
    developerRole?: boolean | null;
  };
  model?: string;
  /** Opaque pi session/compaction state to resume. */
  sessionState?: unknown;
  /** 跳过水位判断,本轮开始前先压缩一次(界面上的「立即整理」)。 */
  forceCompact?: boolean;
  /** 思考档位(off/low/medium/high)。不传即 off —— 不向供应商要思考。 */
  thinkingLevel?: "off" | "low" | "medium" | "high";
  /** 用户自注册并启用的外部 MCP server。 */
  mcpServers?: McpServerConfig[];
}

/**
 * Inject a message into a turn that is already running.
 *
 * "steer" lands after the current assistant message completes, which is what makes it a
 * correction rather than a second conversation: the model sees it before deciding its next
 * step. "follow_up" waits until the agent would otherwise stop, which is a queued next task.
 * Both are pi's own queues — see Agent.steer / Agent.followUp.
 */
export interface SteerRequest {
  type: "steer";
  turnId: string;
  prompt: string;
  mode?: "steer" | "follow_up";
}

/**
 * Declare the whole steering queue, replacing whatever is pending.
 *
 * pi can clear the queue but not remove one entry from it, and the UI needs per-message
 * cancel. Sending the desired queue rather than a delete makes that possible and is
 * idempotent: the client says what should be pending, not what changed.
 */
export interface QueueRequest {
  type: "queue";
  turnId: string;
  prompts: string[];
}

/** Stop a running turn. Whatever it produced so far is kept. */
export interface AbortRequest {
  type: "abort";
  turnId: string;
}

/** 只压缩,不对话。对应界面上的「立即整理」—— 用户想主动整理上下文,而不是先发一句话。 */
export interface CompactRequest {
  type: "compact";
  turnId: string;
  systemPrompt: string;
  provider?: RunTurnRequest["provider"];
  model?: string;
  sessionState?: unknown;
  apiBase: string;
  token: string;
}

export type Request =
  | RunTurnRequest
  | SteerRequest
  | QueueRequest
  | AbortRequest
  | CompactRequest;

/** Sidecar -> backend events. */
export type Event =
  | { type: "ready" }
  | { type: "text_delta"; turnId: string; delta: string }
  | { type: "thinking_delta"; turnId: string; delta: string }
  | { type: "thinking_end"; turnId: string }
  | { type: "tool_start"; turnId: string; toolCallId: string; name: string; args: unknown }
  | { type: "tool_end"; turnId: string; toolCallId: string; result: unknown; isError: boolean }
  | {
      /** 子智能体内部的一步工具调用,挂在发起它的 run_subagent 调用(parentCallId)名下。 */
      type: "subtool";
      turnId: string;
      parentCallId: string;
      phase: "start" | "end";
      toolCallId: string;
      toolName: string;
      args?: unknown;
      result?: unknown;
      isError?: boolean;
    }
  | {
      /** 后台派发的子智能体跑完了:把存档填回发起它的 run_subagent 卡(parentCallId)。 */
      type: "subagent_result";
      turnId: string;
      parentCallId: string;
      archive: { task: string; steps: number; error: string | null; trace: unknown[] };
    }
  | {
      type: "turn_done";
      turnId: string;
      text: string;
      sessionState: unknown;
      usage?: Record<string, unknown>;
      /** 本轮结束时的上下文水位。窗口按当前模型给 —— 换模型上限就变。 */
      context?: { tokens: number; window: number };
      /** 本轮开始前发生的压缩;没发生则不带。前端据此在对话流里插一条标记 ——
       *  压缩必须被看见,否则用户不知道早期消息已经不在上下文里了。 */
      compaction?: { droppedMessages: number; tokensBefore: number; tokensAfter: number; summary: string } | null;
    }
  | { type: "queued"; turnId: string; mode: "steer" | "follow_up"; pending: boolean }
  | { type: "aborted"; turnId: string }
  | {
      type: "compacted";
      turnId: string;
      sessionState: unknown;
      context?: { tokens: number; window: number };
      compaction?: { droppedMessages: number; tokensBefore: number; tokensAfter: number; summary: string } | null;
    }
  | { type: "error"; turnId: string | null; message: string };

export function send(event: Event): void {
  process.stdout.write(JSON.stringify(event) + "\n");
}

export function log(...args: unknown[]): void {
  process.stderr.write("[sidecar] " + args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ") + "\n");
}
