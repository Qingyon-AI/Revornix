/**
 * pi integration: build an OpenAI-compatible provider from the config Revornix passes
 * per turn (base URL + key + model), then run a turn through pi's Agent and stream
 * text deltas back out. Tools come from buildAllTools (manifest) + buildMcpTools
 * (user-registered MCP servers); subagents attach here because they need the
 * resolved model/streamFn.
 */
import { Agent, type AgentMessage, type AgentTool } from "@earendil-works/pi-agent-core";
import {
  createModels,
  createProvider,
  type Api,
  type ImageContent,
  type Model,
  type Models,
} from "@earendil-works/pi-ai";

// 规范入口(不是 `/compat` —— 那是上游标注为「临时」的兼容层)。
// 这个入口能用的前提是构建带 --ignore-annotations,原因见 package.json 里的说明。
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy";

import {
  type CompactionResult,
  type Message as CompactionMessage,
  SUMMARY_PROMPT,
  compact,
  FALLBACK_CONTEXT_WINDOW,
  contextTokens,
} from "./compaction";
import {
  SubagentManager,
  readOnlyTools,
  runSubagent,
  subagentToolSpec,
  waitSubagentsToolSpec,
  type SubagentOutcome,
  type SubagentToolEvent,
} from "./subagent.js";

const PROVIDER_ID = "revornix";

/** 主智能体手里的 run_subagent。子智能体只拿只读工具(理由见 subagent.ts),
 *  它的每一步都当作父工具卡的进度上报 —— 否则界面上是一段几十秒的静默。 */
function buildSubagentTools(
  allTools: AgentTool[],
  model: Model<Api>,
  streamFn: unknown,
  handlers: PiTurnHandlers,
  manager: SubagentManager,
): AgentTool[] {
  const spec = subagentToolSpec();
  const waitSpec = waitSubagentsToolSpec();
  const archiveOf = (task: string, outcome: SubagentOutcome) => ({
    task,
    steps: outcome.steps,
    error: outcome.error ?? null,
    trace: outcome.trace,
  });
  const dispatchTool: AgentTool = {
    name: spec.name,
    label: "子智能体",
    description: spec.description,
    parameters: spec.parameters as never,
    execute: async (parentCallId: string, rawParams: unknown, signal?: AbortSignal) => {
      const args = (rawParams ?? {}) as { task?: string; expected_output?: string; wait?: boolean };
      const task = (args.task ?? "").trim();
      if (!task) throw new Error("task 不能为空");
      const prompt = args.expected_output ? `${task}\n\n【期望的输出形式】${args.expected_output}` : task;
      const running = runSubagent({
        task: prompt,
        tools: readOnlyTools(allTools),
        model,
        streamFn,
        signal,
        // 每一步实时外发,挂在**这次 run_subagent 调用**名下 —— 界面据此把子步
        // 归到发起它的那张卡,而不是一段几十秒的静默。
        onToolEvent: (event: SubagentToolEvent) => handlers.onSubtool?.({ parentCallId, ...event }),
      });
      if (args.wait === true) {
        // 阻塞路径:等到报告直接返回 —— 模型明说"这一个不等到没法继续"。
        const result = await running;
        const payload = result.error
          ? { ok: false, error: result.error, steps: result.steps }
          : { ok: true, report: result.report, steps: result.steps };
        // 完整轨迹只进 details(UI 存档),**不进 content** —— content 会回填给主模型,
        // 而省下那份上下文正是派子智能体的意义。task 一起存:列表里靠它认出这是哪个子代理。
        return {
          content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
          details: { data: payload, subagent: archiveOf(task, result) },
        };
      }
      // 默认路径:立即返回,子智能体在后台跑。id 就用这次调用的 toolCallId ——
      // UI 时间线已经拿它当锚,模型拿它来 wait,两边天然对上。
      manager.dispatch(parentCallId, task, running);
      void running.then((outcome) => {
        // 跑完就把存档发给宿主,让界面上这张卡从「进行中」翻成完整档案 ——
        // 不等模型来取:看得见过程是 UI 的事,和模型什么时候读报告无关。
        handlers.onSubagentResult?.(parentCallId, archiveOf(task, outcome));
      });
      const payload = {
        ok: true,
        dispatched: true,
        subagent_id: parentCallId,
        note: "Sub-agent is running in the background. Keep working; call wait_subagents when you need its report, or finish your reply and the report will be delivered to you.",
      };
      return {
        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
        details: { data: payload, subagent_dispatched: true },
      };
    },
  };
  const waitTool: AgentTool = {
    name: waitSpec.name,
    label: "等待子智能体",
    description: waitSpec.description,
    parameters: waitSpec.parameters as never,
    execute: async (_callId: string, rawParams: unknown) => {
      const args = (rawParams ?? {}) as { subagent_ids?: string[] };
      if (manager.size() === 0) {
        return {
          content: [{ type: "text", text: JSON.stringify({ ok: false, error: "没有在跑的子智能体" }) }],
          details: {},
        };
      }
      const settled = await manager.wait(args.subagent_ids);
      // 报告走 content 进模型上下文 —— wait 的意义就是"把答案拿进来"。
      const payload = settled.map(({ id, outcome }) => ({
        subagent_id: id,
        ok: !outcome.error,
        report: outcome.report || undefined,
        error: outcome.error,
        steps: outcome.steps,
      }));
      return {
        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
        details: { data: payload },
      };
    },
  };
  return [dispatchTool, waitTool];
}

// 轮内兜底:一轮里工具调用可能连着追加十几条消息,而按 token 的压缩只在**轮与轮之间**做
// (见 prepareContext)。这条只防"单轮内爆炸"这一种情况,阈值放得很宽,正常对话碰不到它。
const RUNAWAY_TURN_MESSAGES = 120;
const RUNAWAY_KEEP = 60;

function guardRunawayTurn(messages: AgentMessage[]): AgentMessage[] {
  if (messages.length <= RUNAWAY_TURN_MESSAGES) return messages;
  let start = messages.length - RUNAWAY_KEEP;
  while (start > 0 && (messages[start] as { role?: string }).role !== "user") start -= 1;
  return start > 0 ? messages.slice(start) : messages;
}

/**
 * 轮前压缩:水位过线就把早期对话交给同一个模型压成交接说明。
 *
 * **放在轮与轮之间而不是 transformContext 里**:后者在一轮内的每次 LLM 调用前都会跑,
 * 工具循环里会被调用很多次 —— 在那儿摘要等于一轮里付好几次摘要的钱,而且每次摘的还是
 * 几乎同一段内容。
 */
async function prepareContext(
  messages: AgentMessage[],
  model: Model<Api>,
  streamFn: ConstructorParameters<typeof Agent>[0]["streamFn"],
  force: boolean,
): Promise<{ messages: AgentMessage[]; info: CompactionResult["info"] }> {
  const contextWindow = Number(model.contextWindow) || 0;
  const result = await compact(messages as unknown as CompactionMessage[], {
    contextWindow,
    force,
    summarize: async (early) => {
      // 摘要用同一个模型:换个便宜模型看着省钱,但它读不懂这段对话里的专有名词和 id,
      // 摘出来的东西反而会误导后续几十轮。工具留空 —— 摘要不该顺手去调工具。
      const summarizer = new Agent({
        initialState: { systemPrompt: "你是一个严谨的对话摘要器。", model, tools: [], messages: [...early] as unknown as AgentMessage[] },
        streamFn,
      });
      await summarizer.prompt(SUMMARY_PROMPT);
      const last = [...summarizer.state.messages].reverse().find((m) => (m as { role?: string }).role === "assistant");
      const content = (last as { content?: unknown } | undefined)?.content;
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        return content
          .map((part) => (typeof part === "string" ? part : String((part as { text?: unknown })?.text ?? "")))
          .join("");
      }
      return "";
    },
  });
  return { messages: result.messages as unknown as AgentMessage[], info: result.info };
}

const FALLBACK_MAX_TOKENS = 4096;

/** A single-provider Models collection targeting an OpenAI-compatible endpoint. */
export function buildModels(
  baseUrl: string,
  apiKey: string,
  modelId: string,
  limits: {
    contextWindow?: number | null;
    maxOutputTokens?: number | null;
    reasoning?: boolean | null;
    vision?: boolean | null;
    reasoningEffort?: boolean | null;
    developerRole?: boolean | null;
  } = {},
): { models: Models; model: Model<"openai-completions"> } {
  const model: Model<"openai-completions"> = {
    id: modelId,
    name: modelId,
    api: "openai-completions",
    provider: PROVIDER_ID,
    baseUrl,
    // vision / developerRole / reasoningEffort 三项默认取**最保守**的那一侧,由用户在设置里
    // 按模型放开:多发一个 reasoning_effort 或 developer 角色,不认的端点会直接 400,整轮
    // 对话失败;而少发只是不用上某个增强。
    //
    // **reasoning 例外,默认开**。它在 pi 里不是"能不能发某个参数",而是这个模型的思考
    // **开关总闸**:pi 里每一条"把思考关掉"的分支(deepseek 的 thinking:{type:"disabled"}、
    // qwen 的 enable_thinking:false、openrouter 的 reasoning:{effort:"none"}…)都写着
    // `&& model.reasoning`。关着的话,会话里的思考档位两个方向都发不出去 —— 请求里既没有
    // "要思考"也没有"别思考",供应商按它自己的默认来,于是 DeepSeek 这类混合模型无论开关
    // 都在思考,用户看到的就是那个开关根本没接线。
    //
    // 默认开**不会**把参数发给不认识它的端点:那些分支是按 baseUrl 匹配到具体供应商的
    // (deepseek.com / z.ai / openrouter.ai…),通用 OpenAI 兼容端点走的是最后两条
    // reasoning_effort 分支,而它们额外要求 supportsReasoningEffort —— 那一项仍然默认关。
    reasoning: limits.reasoning ?? true,
    input: limits.vision ? ["text", "image"] : ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: limits.contextWindow ?? FALLBACK_CONTEXT_WINDOW,
    maxTokens: limits.maxOutputTokens ?? FALLBACK_MAX_TOKENS,
    // Ollama / vLLM / LM Studio 等本地 OpenAI 兼容服务不认 developer role 与 reasoning_effort
    compat: {
      supportsDeveloperRole: limits.developerRole ?? false,
      supportsReasoningEffort: limits.reasoningEffort ?? false,
    },
  };
  const provider = createProvider({
    id: PROVIDER_ID,
    name: "Revornix provider",
    baseUrl,
    // 本地服务(Ollama/LM Studio 等)通常不需要 key,但 pi 缺少 apiKey 时会直接报
    // "No API key for provider" —— 所以补一个占位值,这类端点会忽略它。
    auth: {
      apiKey: {
        name: "Revornix provider key",
        resolve: async () => ({ auth: { apiKey: apiKey || "not-required" } }),
      },
    },
    models: [model],
    api: openAICompletionsApi(),
  });
  const models = createModels();
  models.setProvider(provider);
  return { models, model };
}

/** 只压缩不对话:走和轮前压缩同一条路径,force=true。 */
export async function runCompaction(input: {
  provider: NonNullable<PiTurnInput["provider"]>;
  model: string;
  sessionState?: unknown;
}): Promise<{ sessionState: unknown; context: { tokens: number; window: number }; compaction: CompactionResult["info"] }> {
  const { models, model } = buildModels(input.provider.baseUrl, input.provider.apiKey, input.model, input.provider);
  const prior = Array.isArray(input.sessionState) ? (input.sessionState as AgentMessage[]) : [];
  // **必须是 streamSimple**,不是 stream。pi 的 Agent 把思考档位放在 options.reasoning 里,
  // 而拼请求体的地方读的是 options.reasoningEffort —— 这两者之间的翻译(含按模型 clamp)
  // 只发生在 streamSimple 里。走 stream 的话 reasoningEffort 永远是 undefined,于是供应商
  // 收到的永远是"别思考",思考档位调什么都没用。pi 的 StreamFn 契约原文就写着
  // "Models.streamSimple satisfies this shape"。
  const streamFn = (
    m: Parameters<typeof models.streamSimple>[0],
    context: Parameters<typeof models.streamSimple>[1],
    options: Parameters<typeof models.streamSimple>[2],
  ) => models.streamSimple(m, context, options);
  const { messages, info } = await prepareContext(prior, model as Model<Api>, streamFn, true);
  return {
    sessionState: messages,
    context: { tokens: contextTokens(messages as unknown as CompactionMessage[]), window: Number(model?.contextWindow) || 0 },
    compaction: info,
  };
}

export interface PiTurnInput {
  systemPrompt: string;
  prompt: string;
  images?: ImageContent[];
  provider: {
    baseUrl: string;
    apiKey: string;
    contextWindow?: number | null;
    maxOutputTokens?: number | null;
    reasoning?: boolean | null;
    vision?: boolean | null;
    reasoningEffort?: boolean | null;
    developerRole?: boolean | null;
  };
  model: string;
  tools: AgentTool[];
  /** pi 上轮序列化的消息数组(多轮记忆);首轮为空。 */
  sessionState?: unknown;
  /** Called with the Agent once built, so the caller can steer or abort the running turn. */
  onAgentReady?: (agent: Agent) => void;
  /** 跳过水位判断直接压缩一次 —— 对应界面上的「立即整理」。 */
  forceCompact?: boolean;
  /** 思考档位。off 时 pi 根本不向供应商要思考(reasoning 传 undefined),
   *  所以"模型是推理模型"和"这一轮要不要思考"是两件事,前者只决定怎么解析。 */
  thinkingLevel?: "off" | "low" | "medium" | "high";
}

export interface PiTurnResult {
  text: string;
  usage: Record<string, unknown>;
  /** 本轮结束后的完整消息数组,回存给下一轮。 */
  sessionState: AgentMessage[];
  /**
   * 模型调用失败时 pi **不抛异常** —— 它把失败记在最后一条 assistant 消息上
   * (stopReason:"error" + errorMessage),照常结束这一轮。不主动挖出来的话,
   * 上游只会看到一个空的 turn_done,配置错误就变成了"什么都没发生"。
   */
  errorMessage?: string;
  /** True when the run was stopped by abort() rather than finishing on its own. */
  aborted?: boolean;
  /** 本轮结束时的上下文水位(前端画进度条)。 */
  context?: { tokens: number; window: number };
  /** 本轮**开始前**是否发生了压缩;没发生为 null。 */
  compaction?: CompactionResult["info"];
}

export interface PiTurnHandlers {
  onDelta: (delta: string) => void;
  /** 思考增量。与正文分开上报 —— 混进 onDelta 会让思考内容被当成回答存进消息正文。 */
  onThinking: (delta: string) => void;
  /** 思考结束。前端据此把「思考中…」收起来。 */
  onThinkingEnd: () => void;
  onToolStart: (toolCallId: string, name: string, args: unknown) => void;
  onToolEnd: (toolCallId: string, result: unknown, isError: boolean) => void;
  /** 子智能体的一步工具调用(start/end),挂在发起它的 run_subagent 调用名下。 */
  onSubtool?: (event: { parentCallId: string } & SubagentToolEvent) => void;
  /** 后台派发的子智能体跑完了:把完整存档交给宿主,填回发起那张卡。 */
  onSubagentResult?: (
    parentCallId: string,
    archive: { task: string; steps: number; error: string | null; trace: unknown[] },
  ) => void;
}

/** Run one turn through pi's Agent; stream text + tool events, return text + new state. */
export async function runPiTurn(input: PiTurnInput, handlers: PiTurnHandlers): Promise<PiTurnResult> {
  const { models, model } = buildModels(input.provider.baseUrl, input.provider.apiKey, input.model, input.provider);
  const prior = Array.isArray(input.sessionState) ? (input.sessionState as AgentMessage[]) : [];
  const images = model?.input?.includes("image") ? (input.images ?? []) : [];
  // **必须是 streamSimple**,不是 stream(见 runCompaction 里的说明)。
  const streamFn = (
    m: Parameters<typeof models.streamSimple>[0],
    context: Parameters<typeof models.streamSimple>[1],
    options: Parameters<typeof models.streamSimple>[2],
  ) => models.streamSimple(m, context, options);
  // 轮前按 token 水位压缩(超过窗口 80% 触发,或调用方显式要求)。
  const { messages: priorMessages, info: compaction } = await prepareContext(
    prior,
    model as Model<Api>,
    streamFn,
    Boolean(input.forceCompact),
  );
  // 子智能体挂在这里而不是 buildAllTools 里:它要用的 model/streamFn 到这一步才解析出来,
  // 而它跑在同一个进程里(见 subagent.ts —— 另起进程就得把供应商解析整套再传一遍)。
  const subagents = new SubagentManager();
  const tools = [...input.tools, ...buildSubagentTools(input.tools, model as Model<Api>, streamFn, handlers, subagents)];
  const agent = new Agent({
    initialState: {
      systemPrompt: input.systemPrompt,
      model,
      tools,
      messages: priorMessages,
      thinkingLevel: input.thinkingLevel ?? "off",
    },
    streamFn,
    // 轮内兜底:只防单轮里工具调用把消息堆爆,正常对话碰不到。
    transformContext: async (messages) => guardRunawayTurn(messages),
  });
  // One queued message per turn, in the order they were sent. Draining the whole queue at
  // once merges several questions into a single answer, which reads as the agent ignoring
  // all but the last — a queue the user can see the order of has to be answered in that order.
  agent.steeringMode = "one-at-a-time";
  agent.followUpMode = "one-at-a-time";
  input.onAgentReady?.(agent);

  let full = "";
  agent.subscribe((event) => {
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
      const delta = event.assistantMessageEvent.delta;
      full += delta;
      handlers.onDelta(delta);
    } else if (event.type === "message_update" && event.assistantMessageEvent.type === "thinking_delta") {
      // 思考不进 `full`:那是回答正文,会被落库成助手消息的内容。
      handlers.onThinking(event.assistantMessageEvent.delta);
    } else if (event.type === "message_update" && event.assistantMessageEvent.type === "thinking_end") {
      handlers.onThinkingEnd();
    } else if (event.type === "tool_execution_start") {
      handlers.onToolStart(event.toolCallId, event.toolName, event.args);
    } else if (event.type === "tool_execution_end") {
      handlers.onToolEnd(event.toolCallId, event.result, event.isError);
    }
  });
  let aborted = false;
  try {
    if (images.length > 0) await agent.prompt(input.prompt, images);
    else await agent.prompt(input.prompt);
    // 收尾清算:模型答完了,但后台可能还有子智能体在跑、或报告还没进过它的上下文。
    // 等全部跑完,把没送达的报告作为一条通知消息续一轮 —— 模型消化完(可能因此又派新的,
    // 所以是循环)才算真正结束。丢报告是不可接受的:sidecar 是回合级进程,这轮不送,永远没了。
    for (;;) {
      if (agent.signal?.aborted) break;
      const settled = await subagents.drain();
      if (settled.length === 0) break;
      const notice = settled
        .map(({ id, task, outcome }) => {
          const head = `【子智能体完成通知】subagent_id=${id}\n任务:${task.split("\n")[0]}`;
          return outcome.error ? `${head}\n结果:失败 —— ${outcome.error}` : `${head}\n报告:\n${outcome.report}`;
        })
        .join("\n\n");
      await agent.prompt(`${notice}\n\n请基于以上报告继续:该转述的转述,该行动的行动。`);
    }
  } catch (err) {
    // An aborted run rejects. The text streamed so far is real output the user watched
    // arrive, so it is returned rather than discarded.
    if (agent.signal?.aborted || String(err).includes("abort")) aborted = true;
    else throw err;
  }
  const messages = agent.state.messages;
  // 最近一条标记为 error 的消息即本轮的失败原因(如 base_url 不是 OpenAI 兼容端点、
  // 模型不存在、鉴权失败)。
  const failed = [...messages]
    .reverse()
    .find((message) => (message as { stopReason?: string }).stopReason === "error") as
    | { errorMessage?: string }
    | undefined;
  return {
    text: full,
    usage: collectUsage(messages),
    sessionState: messages,
    errorMessage: aborted ? undefined : failed?.errorMessage,
    aborted,
    // 每轮都回报水位:前端据此画进度条。窗口按**当前模型**给 —— 换个模型上限就变了,
    // 用一个全局常量会在小窗口模型上显示成"还早得很"。
    context: {
      tokens: contextTokens(messages as unknown as CompactionMessage[]),
      window: Number(model?.contextWindow) || 0,
    },
    compaction,
  };
}

/**
 * 把本轮真实的 token 用量汇总出来。
 *
 * 一轮可能有多条助手消息(工具调用会触发后续 LLM 调用),所以要累加而不是取最后一条。
 * 字段名对齐后端认的那组(input_tokens / output_tokens / total_tokens)。
 * cacheRead/cacheWrite 另记:它们计价不同,压平进 input 会让费用偏高。
 *
 * 一条都没读到就别硬报 0:那会让后端以为拿到了真实用量而跳过估算,结果是费用恒为 0
 * —— 比估算更糟。宁可退回估算。
 */
function collectUsage(messages: readonly unknown[]): Record<string, number> {
  let input = 0, output = 0, cacheRead = 0, cacheWrite = 0, reasoning = 0, requests = 0;
  for (const message of messages) {
    const usage = (message as { role?: string; usage?: Record<string, number> }).usage;
    if (!usage || (message as { role?: string }).role !== "assistant") continue;
    requests += 1;
    input += usage.input ?? 0;
    output += usage.output ?? 0;
    cacheRead += usage.cacheRead ?? 0;
    cacheWrite += usage.cacheWrite ?? 0;
    reasoning += usage.reasoning ?? 0;
  }
  if (requests === 0) return { requests: 1 };
  const out: Record<string, number> = {
    requests,
    input_tokens: input,
    output_tokens: output,
    total_tokens: input + output,
  };
  if (cacheRead) out.cache_read_tokens = cacheRead;
  if (cacheWrite) out.cache_write_tokens = cacheWrite;
  if (reasoning) out.reasoning_tokens = reasoning;
  return out;
}
