/**
 * compaction.ts 的单测:压缩是纯函数,summarize 注入,不碰网络。
 */
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

// compaction.ts 是 TS —— 用 esbuild 现转一份再 import,不引测试框架。
import { build } from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, ".compaction.test.cjs");
await build({
  entryPoints: [path.join(here, "..", "src", "compaction.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: out,
  logLevel: "silent",
});
const { contextTokens, shouldCompact, splitPoint, compact, FALLBACK_CONTEXT_WINDOW } = await import(
  pathToFileURL(out).href
);

const user = (text) => ({ role: "user", content: text });
const assistant = (text, usage) => ({ role: "assistant", content: text, usage });

// contextTokens: 没有 usage 时整段估算("abcd" / 3.5 ≈ 2/token)
assert.equal(contextTokens([user("a".repeat(35))]), 10);

// 锚定最近一条带 usage 的 assistant:之后的才估算
assert.equal(
  contextTokens([user("x".repeat(350)), assistant("y".repeat(35), { input: 1000, output: 100 }), user("z".repeat(35))]),
  1000 + 100 + 10,
);
// cacheRead 也占窗口
assert.equal(
  contextTokens([assistant("y", { input: 100, output: 10, cacheRead: 5000 })]),
  5110,
);

// shouldCompact: 80% 水位
assert.equal(shouldCompact([assistant("y", { input: 7000, output: 0 })], 10000), false);
assert.equal(shouldCompact([assistant("y", { input: 9000, output: 0 })], 10000), true);
assert.equal(shouldCompact([user("x")], 0), false);

// splitPoint: 切点必须落在 user 边界
const msgs = [];
for (let i = 0; i < 10; i++) msgs.push(user(`u${i}`), assistant(`a${i}`));
const cut = splitPoint(msgs);
assert.equal(msgs[cut].role, "user");
assert.ok(msgs.length - cut <= 10);

// compact: 低于水位不动
const short = [user("hi"), assistant("hello")];
const untouched = await compact(short, { contextWindow: FALLBACK_CONTEXT_WINDOW, summarize: async () => "S" });
assert.equal(untouched.info, null);
assert.equal(untouched.messages.length, 2);

// 超水位:摘要 + 最近几条;摘要在首位、标成 user
const big = [];
for (let i = 0; i < 30; i++) big.push(user(`问题${i} ${"长".repeat(200)}`), assistant(`回答${i}`, { input: 9999, output: 99 }));
const done = await compact(big, { contextWindow: 10000, summarize: async () => "交接说明" });
assert.ok(done.info);
assert.equal(done.messages[0].role, "user");
assert.match(String(done.messages[0].content), /交接说明/);
assert.ok(done.messages.length < big.length);

// force: 跳过水位判断
const forced = await compact(big, { contextWindow: 10 ** 9, force: true, summarize: async () => "交接说明" });
assert.ok(forced.info);

// 摘要失败降级为截断,不炸
const degraded = await compact(big, { contextWindow: 10000, summarize: async () => { throw new Error("boom"); } });
assert.ok(degraded.info === null || degraded.messages.length <= big.length);

console.log("compaction tests passed");
