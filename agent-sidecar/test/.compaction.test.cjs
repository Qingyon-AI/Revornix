"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/compaction.ts
var compaction_exports = {};
__export(compaction_exports, {
  CHARS_PER_TOKEN: () => CHARS_PER_TOKEN,
  COMPACT_RATIO: () => COMPACT_RATIO,
  FALLBACK_CONTEXT_WINDOW: () => FALLBACK_CONTEXT_WINDOW,
  KEEP_RECENT: () => KEEP_RECENT,
  SUMMARY_PROMPT: () => SUMMARY_PROMPT,
  compact: () => compact,
  contextTokens: () => contextTokens,
  estimateAll: () => estimateAll,
  estimateTokens: () => estimateTokens,
  shouldCompact: () => shouldCompact,
  splitPoint: () => splitPoint,
  summaryMessage: () => summaryMessage
});
module.exports = __toCommonJS(compaction_exports);
var COMPACT_RATIO = 0.8;
var KEEP_RECENT = 8;
var CHARS_PER_TOKEN = 3.5;
var FALLBACK_CONTEXT_WINDOW = 32e3;
function textOf(message) {
  const content = message.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object") {
        const record = part;
        if (typeof record.text === "string") return record.text;
        return JSON.stringify(record.input ?? record.output ?? record.result ?? "");
      }
      return "";
    }).join(" ");
  }
  return content == null ? "" : JSON.stringify(content);
}
function estimateTokens(message) {
  return Math.ceil(textOf(message).length / CHARS_PER_TOKEN);
}
function estimateAll(messages) {
  return messages.reduce((sum, message) => sum + estimateTokens(message), 0);
}
function contextTokens(messages) {
  let anchor = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const usage2 = messages[i]?.usage;
    if (messages[i]?.role === "assistant" && usage2 && (usage2.input || usage2.output)) {
      anchor = i;
      break;
    }
  }
  if (anchor < 0) return messages.reduce((sum, message) => sum + estimateTokens(message), 0);
  const usage = messages[anchor].usage;
  let total = (usage.input ?? 0) + (usage.output ?? 0) + (usage.cacheRead ?? 0);
  for (let i = anchor + 1; i < messages.length; i += 1) total += estimateTokens(messages[i]);
  return total;
}
function shouldCompact(messages, contextWindow) {
  if (!contextWindow || contextWindow <= 0) return false;
  return contextTokens(messages) > contextWindow * COMPACT_RATIO;
}
function splitPoint(messages) {
  if (messages.length <= KEEP_RECENT) return 0;
  let start = messages.length - KEEP_RECENT;
  while (start > 0 && messages[start]?.role !== "user") start -= 1;
  return start;
}
var SUMMARY_PROMPT = [
  "\u8BF7\u628A\u4E0A\u9762\u7684\u5BF9\u8BDD\u538B\u7F29\u6210\u4E00\u6BB5\u4EA4\u63A5\u8BF4\u660E,\u4F9B\u4F60\u81EA\u5DF1\u5728\u540E\u7EED\u5BF9\u8BDD\u4E2D\u7EE7\u7EED\u4F7F\u7528\u3002\u5FC5\u987B\u5305\u542B:",
  "1. \u7528\u6237\u7684\u76EE\u6807\u4E0E\u660E\u786E\u63D0\u51FA\u7684\u7EA6\u675F(\u539F\u8BDD\u4E2D\u7684\u5173\u952E\u63AA\u8F9E\u8981\u4FDD\u7559);",
  "2. \u5DF2\u7ECF\u5B8C\u6210\u7684\u4E8B,\u4EE5\u53CA\u5F97\u51FA\u7684\u7ED3\u8BBA;",
  "3. \u5C1A\u672A\u5B8C\u6210\u3001\u6216\u7528\u6237\u660E\u786E\u8981\u6C42\u63A5\u4E0B\u6765\u505A\u7684\u4E8B;",
  "4. \u8FC7\u7A0B\u4E2D\u6D89\u53CA\u7684\u5177\u4F53\u6807\u8BC6:\u6587\u6863 id\u3001\u4E13\u680F id\u3001\u6807\u7B7E id\u3001\u6A21\u578B\u540D\u7B49 \u2014\u2014 \u8FD9\u4E9B\u540E\u7EED\u8FD8\u8981\u7528\u5230,\u4E0D\u80FD\u6982\u62EC\u6389\u3002",
  "\u53EA\u8F93\u51FA\u4EA4\u63A5\u8BF4\u660E\u672C\u8EAB,\u4E0D\u8981\u5BD2\u6684,\u4E0D\u8981\u590D\u8FF0\u8FD9\u6761\u6307\u4EE4\u3002"
].join("\n");
function summaryMessage(summary) {
  return { role: "user", content: `\u3010\u65E9\u671F\u5BF9\u8BDD\u7684\u4EA4\u63A5\u8BF4\u660E(\u81EA\u52A8\u538B\u7F29\u751F\u6210)\u3011
${summary}` };
}
async function compact(messages, options) {
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
    summary = "";
  }
  const next = summary ? [summaryMessage(summary), ...messages.slice(cut)] : [...messages.slice(cut)];
  const tokensAfter = estimateAll(next);
  if (tokensAfter >= tokensBefore) return { messages: [...messages], info: null };
  return {
    messages: next,
    info: { droppedMessages: cut, tokensBefore, tokensAfter, summary }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CHARS_PER_TOKEN,
  COMPACT_RATIO,
  FALLBACK_CONTEXT_WINDOW,
  KEEP_RECENT,
  SUMMARY_PROMPT,
  compact,
  contextTokens,
  estimateAll,
  estimateTokens,
  shouldCompact,
  splitPoint,
  summaryMessage
});
