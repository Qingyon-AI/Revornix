/**
 * 子智能体:把一段独立的调查派出去做,只把结论带回来。
 *
 * **它解决的是上下文而不是算力问题**。"把这 40 篇文档都看一遍找出和 X 相关的"——
 * 真正有用的只有最后那句结论,而 40 次 get_document_detail 的完整返回会把主对话的上下文占满,
 * 逼出一次压缩,后面用户再问别的时,早先的对话已经被摘要掉了。子智能体有自己的消息数组,
 * 中间过程留在它那里,主对话只收到一段报告。
 *
 * **跑在同一个进程里**,不另起 sidecar:它要用的 models/streamFn 已经在手上,再开一个进程
 * 就得把供应商解析整套再传一遍,而它们随时可能不一致。
 *
 * **只给只读工具**。这是有意的限制,不是没做完:
 *   ① 确认卡是对**用户**说"要不要让它做这件事",而卡上写的是发起方——一张由用户看不见的
 *      子智能体发起的卡,用户没有上下文可以判断该不该批;
 *   ② 子智能体阻塞在确认卡上时,主智能体也跟着卡在那次工具调用里,而界面上没有任何地方
 *      能说清"现在在等谁";
 *   ③ 调查任务本来就不需要写权限。要改动仍然由主智能体自己来,那条路径上用户看得见全过程。
 */
import { Agent, type AgentMessage, type AgentTool } from "@earendil-works/pi-agent-core";
import type { Api, Model } from "@earendil-works/pi-ai";

import { log } from "./protocol.js";

/** 子智能体最多跑多少轮工具循环。跑不完就带着已有的发现回来 —— 无声地转下去更糟。 */
const MAX_STEPS = 24;

const SUBAGENT_PROMPT = `你是一个子智能体,被主智能体派来独立完成一段调查任务。

你只有**只读**工具:可以检索文档、读文档详情、查知识图谱、看专栏,但**不能**做任何修改
(不能创建/更新/删除,不能触发任何生成任务)。遇到需要修改的情况,把它写进结论让主智能体去做。

你的输出会被原样交给主智能体,它看不到你的中间过程。所以:
- 直接给结论和证据,不要复述你调用了哪些工具;
- 带上后续会用到的具体标识(文档 id、专栏 id、标签 id、链接);
- 没查到就明确说没查到,不要猜 —— 主智能体会把你的话当事实用。`;

/** 只读工具的判据:manifest 的 read_only 标记。名单在后端(唯一工具注册表),这边不再维护
 *  第二份名字清单 —— 两份手写清单必然漂移,而且漂移是静默的。 */
export function readOnlyTools(tools: AgentTool[]): AgentTool[] {
  return tools.filter((tool) => (tool as { readOnly?: boolean }).readOnly === true && tool.name !== "run_subagent");
}

/** assistant 消息的正文。**content 是块数组**((TextContent|ThinkingContent|ToolCall)[]),
 *  不是字符串 —— 按 `typeof content === "string"` 取,永远取不到,表现是子智能体明明答了
 *  却报「没有产出结论」。 */
function assistantText(message: unknown): string {
  const content = (message as { role?: string; content?: unknown }).content;
  if (typeof content === "string") return content.trim(); // 兼容万一有适配层递字符串进来
  if (!Array.isArray(content)) return "";
  return content
    .filter((block): block is { type: "text"; text: string } =>
      (block as { type?: string }).type === "text" && typeof (block as { text?: unknown }).text === "string")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

export type SubagentToolEvent =
  | { phase: "start"; toolCallId: string; toolName: string; args: unknown }
  | { phase: "end"; toolCallId: string; toolName: string; result: unknown; isError: boolean };

/** 子智能体轨迹里的一条:它自己的阶段性文字,或一步工具调用。给 UI 存档用 ——
 *  **不回填给主模型**(那正是子智能体要省的上下文),只让人能事后查看它做了什么。 */
export type SubagentTraceItem =
  | { type: "text"; text: string }
  | { type: "tool"; id: string; name: string; args: unknown; result?: unknown; isError?: boolean };

/**
 * 跑一个子智能体,返回它的最终报告。
 *
 * 失败不抛给主智能体的工具调用之外:子任务失败是**结果的一种**,主智能体应当读到"没做成、
 * 原因是什么"并据此决定下一步,而不是整轮对话跟着崩掉。
 */
export async function runSubagent(input: {
  task: string;
  tools: AgentTool[];
  model: Model<Api>;
  streamFn: any;
  signal?: AbortSignal;
  onToolEvent?: (event: SubagentToolEvent) => void;
}): Promise<{ report: string; steps: number; trace: SubagentTraceItem[]; error?: string }> {
  // 构造也放进 try:模型/工具配置不合法时 Agent 构造函数会抛,而它此前在 try 之外 ——
  // 那条路径上 runSubagent 返回的是一个 rejected promise,而不是带 error 的 outcome。
  let agent: Agent;
  const trace: SubagentTraceItem[] = [];
  let steps = 0;
  try {
    agent = new Agent({
      initialState: {
        systemPrompt: SUBAGENT_PROMPT,
        model: input.model,
        tools: input.tools,
        messages: [],
        thinkingLevel: "off",
      },
      streamFn: input.streamFn,
      // 步数上限:子智能体没人盯着,转不出来时要能自己停下并交代进展。
      transformContext: async (messages: AgentMessage[]) => {
        const toolTurns = messages.filter((m) => m.role === "assistant").length;
        if (toolTurns > MAX_STEPS) {
          return [
            ...messages,
            { role: "user", content: "已达到步数上限。立刻停止调用工具,用现有发现写出结论。" } as AgentMessage,
          ];
        }
        return messages;
      },
    });

    agent.subscribe((event: any) => {
      if (event?.type === "tool_execution_start") {
        steps += 1;
        trace.push({ type: "tool", id: String(event.toolCallId ?? ""), name: String(event.toolName ?? ""), args: event.args });
        input.onToolEvent?.({ phase: "start", toolCallId: String(event.toolCallId ?? ""), toolName: String(event.toolName ?? ""), args: event.args });
      } else if (event?.type === "tool_execution_end") {
        const entry = trace.find((item) => item.type === "tool" && item.id === String(event.toolCallId ?? ""));
        if (entry && entry.type === "tool") {
          entry.result = event.result;
          entry.isError = Boolean(event.isError);
        }
        input.onToolEvent?.({ phase: "end", toolCallId: String(event.toolCallId ?? ""), toolName: String(event.toolName ?? ""), result: event.result, isError: Boolean(event.isError) });
      } else if (event?.type === "message_end") {
        // 子智能体自己的阶段性文字也进轨迹:没有它,存档只是一串工具调用,
        // 看不出它每一步**为什么**这么查。
        const message = event.message as { role?: string } | undefined;
        const text = message?.role === "assistant" ? assistantText(message) : "";
        if (text) trace.push({ type: "text", text });
      }
    });

    await agent.prompt(input.task);
  } catch (err) {
    const message = String(err);
    log("subagent failed:", message);
    return { report: "", steps, trace, error: message };
  }
  // AgentMessage 是个联合类型(assistant / toolResult …),不是每一支都有 content。
  // 取最后一条**带文本正文**的 assistant 消息 —— 那就是它写给主智能体的结论。
  const messages = (agent.state?.messages ?? []) as AgentMessage[];
  const report = [...messages]
    .reverse()
    .map((message) => ((message as { role?: string }).role === "assistant" ? assistantText(message) : ""))
    .find((text) => text.length > 0) ?? "";
  if (!report) return { report: "", steps, trace, error: "子智能体没有产出结论" };
  return { report, steps, trace };
}

export type SubagentOutcome = { report: string; steps: number; trace: SubagentTraceItem[]; error?: string };

type BackgroundRun = {
  id: string;
  task: string;
  promise: Promise<SubagentOutcome>;
  settled: SubagentOutcome | null;
  /** 结果是否已经进过主模型的上下文(wait_subagents 返回过,或收尾通知带过)。 */
  notified: boolean;
};

/**
 * 后台子智能体的记录簿,每轮一个。
 *
 * 派发默认**不阻塞**:run_subagent 立即返回,主智能体接着干别的;要不要等、什么时候等,
 * 由它自己决定(调 wait_subagents)。它不等的话,轮子也不能让报告掉地上 —— 主循环收尾时
 * (runPiTurn 尾部)清算这本账:还没跑完的等跑完,结果没进过上下文的用一条通知消息续一轮,
 * 让模型消化完再真正结束。这里刻意**不做轮中打断**:steering 注入存在"最后一次取队列之后
 * settle"的竞态窗口,通知丢了报告就永远到不了模型;收尾清算没有竞态 —— 通知在模型下一次
 * 开口前到。
 */
export class SubagentManager {
  private runs = new Map<string, BackgroundRun>();

  dispatch(id: string, task: string, promise: Promise<SubagentOutcome>): void {
    // **就地把 reject 收敛掉。** 后台派发的 promise 没有人 await,一旦 reject 就是一个
    // unhandled rejection —— 而 Node 从 15 起的默认动作是终止进程,整个 sidecar 会死在
    // 一个后台任务上,用户那一轮只看到 "pi sidecar exited"。
    //
    // runSubagent 自己已经把失败装进 outcome.error 返回了,但它的 Agent 构造在 try 之外,
    // 而 dispatch 收的是任意 promise。失败是**结果的一种**,这里让它退化成同样的形状,
    // wait / drain 下游就都不必再各自防一遍。
    const safe: Promise<SubagentOutcome> = promise.catch((err) => ({
      report: "",
      steps: 0,
      trace: [],
      error: String(err),
    }));
    const run: BackgroundRun = { id, task, promise: safe, settled: null, notified: false };
    this.runs.set(id, run);
    void safe.then((outcome) => {
      run.settled = outcome;
    });
  }

  size(): number {
    return this.runs.size;
  }

  /** 等指定(缺省=全部)子智能体跑完并返回结果,同时记为"已进上下文"。 */
  async wait(ids?: string[]): Promise<Array<{ id: string; task: string; outcome: SubagentOutcome }>> {
    const targets = (ids?.length ? ids : [...this.runs.keys()])
      .map((id) => this.runs.get(id))
      .filter((run): run is BackgroundRun => Boolean(run));
    const outcomes = await Promise.all(targets.map((run) => run.promise));
    return targets.map((run, index) => {
      run.notified = true;
      return { id: run.id, task: run.task, outcome: outcomes[index] };
    });
  }

  /** 收尾清算:等全部跑完,取出所有还没进过上下文的结果。空数组 = 不用续轮。 */
  async drain(): Promise<Array<{ id: string; task: string; outcome: SubagentOutcome }>> {
    const pending = [...this.runs.values()].filter((run) => !run.notified);
    // 用**等到的值**,不读 run.settled:后者靠 dispatch 里那个 .then 先于这里 resolve
    // 才会被填上,是一种隐性的注册顺序依赖 —— 成立,但改动一下顺序就会静默变成 undefined。
    const outcomes = await Promise.all(pending.map((run) => run.promise));
    return pending.map((run, index) => {
      run.notified = true;
      return { id: run.id, task: run.task, outcome: outcomes[index] };
    });
  }
}

/** 主智能体看到的那个工具。参数刻意只有两个 —— 派活儿要说清「做什么」和「要什么结果」,
 *  再多的旋钮只会让主智能体去调参而不是描述任务。 */
export function subagentToolSpec(): { name: string; description: string; parameters: Record<string, unknown> } {
  return {
    name: "run_subagent",
    description:
      "Delegate a self-contained investigation to a sub-agent with its own context, and get back only its conclusion. " +
      "Use when the work would otherwise flood this conversation with intermediate output: scanning many documents, " +
      "reading many sections, researching across many pages. The sub-agent has READ-ONLY tools — it cannot create, " +
      "edit, delete or trigger generation, so do not delegate changes. It cannot ask you questions, so the task must " +
      "be self-contained: say what to look at, what to decide, and what to report back. " +
      // 派发默认不阻塞 + 多个调用并发执行 —— 模型不知道这两点就会一个一个串行派、干等。
      // 这几句是在教它用对这个能力:派完接着干别的,要结果时再 wait_subagents。
      "Dispatch is NON-BLOCKING by default: the call returns a subagent_id immediately while the sub-agent runs in " +
      "the background — keep working on other things, then call wait_subagents when you need the reports. If you " +
      "finish your reply while sub-agents are still running, their reports are delivered to you automatically. " +
      "Independent investigations should be dispatched together (multiple calls in the same message run " +
      "concurrently). Pass wait=true only when you cannot do anything useful until this one answer arrives.",
    parameters: {
      type: "object",
      properties: {
        task: {
          type: "string",
          description:
            "The full task, self-contained. Include the concrete ids to look at and exactly what to report back.",
        },
        expected_output: {
          type: "string",
          description: "What the answer should look like, e.g. 'the document ids plus one sentence of reasoning each'.",
        },
        wait: {
          type: "boolean",
          description:
            "Block until this sub-agent finishes and return its report directly (default false: return immediately, collect via wait_subagents or the automatic completion notice).",
        },
      },
      required: ["task"],
    },
  };
}

/** 等待后台子智能体的工具。报告走它的返回值进上下文 —— 这是模型"决定等"的那只手。 */
export function waitSubagentsToolSpec(): { name: string; description: string; parameters: Record<string, unknown> } {
  return {
    name: "wait_subagents",
    description:
      "Wait for background sub-agents dispatched with run_subagent and return their reports. " +
      "With no arguments it waits for ALL of them; pass subagent_ids to wait for specific ones. " +
      "Call this when you have run out of other useful work and need the answers to continue.",
    parameters: {
      type: "object",
      properties: {
        subagent_ids: {
          type: "array",
          items: { type: "string" },
          description: "The subagent_id values returned by run_subagent. Omit to wait for all outstanding sub-agents.",
        },
      },
    },
  };
}
