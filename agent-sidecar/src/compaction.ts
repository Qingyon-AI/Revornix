/**
 * 上下文压缩:按 token 水位触发,把早期对话压成摘要而不是直接丢掉。
 *
 * 三条设计:
 *
 * 1. **水位用供应商回报的真实数字**。pi 在每条 assistant 消息上记着这次请求的 usage,
 *    最近一条的 input+output 就是"供应商上次实际看到了多少 token" —— 比我们估算准得多。
 *    只有它之后新增的消息才需要估算。
 *
 * 2. **摘要而不是截断**。把早期消息交给同一个模型压成一段结构化摘要(已完成的事、关键
 *    结论、待办、涉及的文档/专栏 id),摘要 + 最近若干条原文继续。信息密度掉了,但不再是
 *    无声地消失。
 *
 * 3. **切点落在 user 边界**。assistant 的工具调用和它的 toolResult 必须成对出现,
 *    从中间切开会让下一次请求直接被供应商拒绝(orphan tool_call)。
 *
 * 触发阈值写死 80%:留出的两成是给本轮回复和工具结果的余量。这个数用户很难判断该调多少,
 * 暴露成设置项只会变成一个没人动、动了还容易出问题的旋钮。
 */

export interface Usage {
  input?: number;
  output?: number;
  /** 缓存命中的部分。**计价另算,但照样占窗口** —— 见 contextTokens。 */
  cacheRead?: number;
}

export interface Message {
  role?: string;
  usage?: Usage;
  content?: unknown;
  [key: string]: unknown;
}

/** 超过窗口的这个比例就压缩。两成余量留给本轮的回复与工具结果。 */
export const COMPACT_RATIO = 0.8;

/** 摘要之后保留的最近消息条数。太少会丢掉正在进行的那件事的上下文,太多则压不下来。 */
export const KEEP_RECENT = 8;

/** 没有真实计量时的每 token 字符数。中英混排的粗略经验值 —— 只用于"最近几条新增了多少",
 *  估偏一点不影响判断,真实数字下一轮就由供应商纠正回来。 */
export const CHARS_PER_TOKEN = 3.5;

/** 端点没告诉我们上下文窗口时的回退。
 *
 * 取**小**值是刻意的:这个数只用于决定何时压缩上下文,估大了会把超窗的请求原样发出去,
 * 由服务端拒掉(用户看到的是一次失败的对话);估小了只是压缩得早一点。
 *
 * **和后端 `agent/host.py` 的 FALLBACK_CONTEXT_WINDOW 是同一个数**:运行时压缩用这个数,
 * 界面显示另一个数,水位就会和实际行为对不上。 */
export const FALLBACK_CONTEXT_WINDOW = 32000;

function textOf(message: Message): string {
  const content = message.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object") {
          const record = part as Record<string, unknown>;
          if (typeof record.text === "string") return record.text;
          // 工具参数与结果往往是最占地方的那部分,不能漏算。
          return JSON.stringify(record.input ?? record.output ?? record.result ?? "");
        }
        return "";
      })
      .join(" ");
  }
  return content == null ? "" : JSON.stringify(content);
}

export function estimateTokens(message: Message): number {
  return Math.ceil(textOf(message).length / CHARS_PER_TOKEN);
}

/** 纯估算的整段大小。**衡量"压掉了多少"只能用它**,不能用 contextTokens ——
 *  后者锚定在最近一条 assistant 的 usage 上,而那个数字是"供应商上次实际看到了多少"的
 *  历史事实,不会因为我们丢掉了更早的消息而变小。用它算差值,压缩前后永远相等,
 *  界面上就是那句「腾出约 0 token」。 */
export function estimateAll(messages: readonly Message[]): number {
  return messages.reduce((sum, message) => sum + estimateTokens(message), 0);
}

/**
 * 当前上下文占了多少 token。
 *
 * 以最近一条带 usage 的 assistant 消息为锚:那条 usage 的 input+output+cacheRead 就是
 * 供应商上次实际看到的量。锚之后的消息(新的用户提问、工具结果)才需要估算。
 *
 * 一条 usage 都没有(首轮、或供应商不回报)就整段估算。
 */
export function contextTokens(messages: readonly Message[]): number {
  let anchor = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const usage = messages[i]?.usage;
    if (messages[i]?.role === "assistant" && usage && (usage.input || usage.output)) {
      anchor = i;
      break;
    }
  }
  if (anchor < 0) return messages.reduce((sum, message) => sum + estimateTokens(message), 0);
  const usage = messages[anchor].usage!;
  // **cacheRead 也占窗口。** 它在计价上另算(便宜十倍),但"还能装多少"问的是占地方,两者
  // 没有区别。开着 prompt caching 时 input 只剩新增的一小段、绝大部分记在 cacheRead 上,
  // 漏掉它这里看到的水位就只有真实值的零头 —— 压缩迟迟不触发,直到某一轮直接超窗失败。
  let total = (usage.input ?? 0) + (usage.output ?? 0) + (usage.cacheRead ?? 0);
  for (let i = anchor + 1; i < messages.length; i += 1) total += estimateTokens(messages[i]);
  return total;
}

export function shouldCompact(messages: readonly Message[], contextWindow: number): boolean {
  if (!contextWindow || contextWindow <= 0) return false;
  return contextTokens(messages) > contextWindow * COMPACT_RATIO;
}

/**
 * 找到切点:保留最近 KEEP_RECENT 条,再往前退到最近的一条 user 消息。
 *
 * 返回 0 表示不该切 —— 全部都算"最近",没有可摘要的早期部分。切在非 user 边界会留下
 * 没有对应 assistant 调用的 toolResult,下一次请求直接被供应商拒。
 */
export function splitPoint(messages: readonly Message[]): number {
  if (messages.length <= KEEP_RECENT) return 0;
  let start = messages.length - KEEP_RECENT;
  while (start > 0 && messages[start]?.role !== "user") start -= 1;
  return start;
}

/** 交给模型的摘要指令。要的是"能接着干活"所需的东西,不是一篇读后感。 */
export const SUMMARY_PROMPT = [
  "请把上面的对话压缩成一段交接说明,供你自己在后续对话中继续使用。必须包含:",
  "1. 用户的目标与明确提出的约束(原话中的关键措辞要保留);",
  "2. 已经完成的事,以及得出的结论;",
  "3. 尚未完成、或用户明确要求接下来做的事;",
  "4. 过程中涉及的具体标识:文档 id、专栏 id、标签 id、模型名等 —— 这些后续还要用到,不能概括掉。",
  "只输出交接说明本身,不要寒暄,不要复述这条指令。",
].join("\n");

/** 摘要在新上下文里的承载形式。标成 user 而不是 system:多轮里 system 只应有一条,
 *  塞第二条 system 会让部分供应商直接报错。 */
export function summaryMessage(summary: string): Message {
  return { role: "user", content: `【早期对话的交接说明(自动压缩生成)】\n${summary}` };
}

export interface CompactionResult {
  messages: Message[];
  /** 压缩没发生时为 null。前端据此在对话流里插一条可展开的标记 —— 压缩必须被看见,
   *  否则用户不知道早期消息已经不在上下文里了。 */
  /** tokensBefore/After 是**纯估算**的整段大小,只用来说"腾出了多少";
   *  水位显示走 contextTokens(锚定真实 usage),两者算的不是同一件事。 */
  info: { droppedMessages: number; tokensBefore: number; tokensAfter: number; summary: string } | null;
}

/**
 * 压缩一次。`summarize` 由调用方注入(它要用同一个模型),便于单测。
 *
 * `force=true` 时跳过水位判断 —— 对应界面上的「立即整理」。
 */
export async function compact(
  messages: readonly Message[],
  options: { contextWindow: number; force?: boolean; summarize: (messages: readonly Message[]) => Promise<string> },
): Promise<CompactionResult> {
  const tokensBefore = estimateAll(messages);
  if (!options.force && !shouldCompact(messages, options.contextWindow)) {
    return { messages: [...messages], info: null };
  }
  const cut = splitPoint(messages);
  if (cut <= 0) return { messages: [...messages], info: null };

  const early = messages.slice(0, cut);
  let summary = "";
  try {
    summary = (await options.summarize(early)).trim();
  } catch {
    // 摘要失败不能让这一轮也失败:退回旧的截断行为,至少对话还能继续。
    // 不静默 —— info 里带上空摘要,界面照样显示"已压缩",只是没有交接说明。
    summary = "";
  }
  const next = summary ? [summaryMessage(summary), ...messages.slice(cut)] : [...messages.slice(cut)];
  const tokensAfter = estimateAll(next);
  // **压完反而更大就不算压缩**。早期部分很短时,摘要加上它的说明抬头可能比被换掉的原文还长
  // (手动点「立即整理」在短对话上就会撞到这种情况)。这时保留原文并如实报告"没压" ——
  // 界面据此说"对话还不长,暂时不需要整理",而不是显示一次让上下文变大的"整理"。
  if (tokensAfter >= tokensBefore) return { messages: [...messages], info: null };
  return {
    messages: next,
    info: { droppedMessages: cut, tokensBefore, tokensAfter, summary },
  };
}
