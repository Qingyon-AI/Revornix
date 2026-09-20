/**
 * SubagentManager:后台子智能体失败时,绝不能把整轮对话带走。
 *
 * 派发是**不阻塞**的:run_subagent 立刻返回,子智能体在后台跑。这意味着它的 promise
 * 没有人在 await —— 一旦 reject,就是一个 unhandled rejection,而 Node 从 15 起对此的
 * 默认动作是**终止进程**。整个 sidecar 死掉,用户那一轮只看到 "pi sidecar exited"。
 *
 * 收尾清算(drain)同理:它用 Promise.all 等所有子智能体,一个 reject 就会让 runPiTurn
 * 的收尾路径抛异常 —— 那时正文已经生成完了,却因为一个后台任务失败而整轮报错。
 *
 * 子任务失败本来就是**结果的一种**(runSubagent 自己也是这么设计的:它把错误装进
 * outcome.error 返回)。这里钉住的是:即使 promise 本身炸了,也要退化成同样的形状。
 *
 * 用 esbuild 现转一份 TS 再 import,与 compaction.test.mjs 同一套做法。
 */

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, ".subagent.test.cjs");
await build({
  entryPoints: [path.join(here, "..", "src", "subagent.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: out,
  // 不设 external:SubagentManager / readOnlyTools 只用到那些包的**类型**,
  // 类型在编译后不留痕迹,整包打进来反而不需要运行时解析。
  logLevel: "silent",
});
const { SubagentManager, readOnlyTools } = await import(pathToFileURL(out).href);

// --- 一个会 reject 的后台任务,不能变成 unhandled rejection --------------------

{
  const seen = [];
  process.on("unhandledRejection", (reason) => seen.push(reason));

  const manager = new SubagentManager();
  manager.dispatch("call-1", "会炸的任务", Promise.reject(new Error("boom")));

  // 让微任务队列跑完,unhandled rejection 若要发生就在这时候发生
  await new Promise((resolve) => setTimeout(resolve, 50));

  assert.equal(
    seen.length,
    0,
    "后台子智能体 reject 产生了 unhandled rejection —— Node 默认会因此终止整个 sidecar 进程",
  );
}

// --- drain 不能因为某个子智能体失败而抛 ---------------------------------------

{
  const manager = new SubagentManager();
  manager.dispatch("ok-1", "正常任务", Promise.resolve({ report: "结论", steps: 2, trace: [] }));
  manager.dispatch("bad-1", "会炸的任务", Promise.reject(new Error("boom")));

  const settled = await manager.drain();

  assert.equal(settled.length, 2, `drain 应交出两条记录，实际 ${settled.length}`);
  const bad = settled.find((item) => item.id === "bad-1");
  assert.ok(bad, "失败的那个必须出现在清算结果里，而不是消失");
  assert.ok(
    bad.outcome && typeof bad.outcome.error === "string" && bad.outcome.error.length > 0,
    "失败必须退化成 outcome.error（和 runSubagent 自己的失败形状一致），而不是抛出去",
  );
  const ok = settled.find((item) => item.id === "ok-1");
  assert.equal(ok.outcome.report, "结论", "正常的那个不能被失败的邻居影响");
}

// --- wait 同理:一个失败不能毁掉这次 wait 的全部结果 --------------------------

{
  const manager = new SubagentManager();
  manager.dispatch("ok-2", "正常", Promise.resolve({ report: "A", steps: 1, trace: [] }));
  manager.dispatch("bad-2", "失败", Promise.reject(new Error("nope")));

  const settled = await manager.wait();
  assert.equal(settled.length, 2);
  assert.equal(settled.find((s) => s.id === "ok-2").outcome.report, "A");
  assert.ok(settled.find((s) => s.id === "bad-2").outcome.error, "失败的要带 error 回来");
}

// --- 已经取走过的结果不再重复交付 ---------------------------------------------

{
  const manager = new SubagentManager();
  manager.dispatch("once", "任务", Promise.resolve({ report: "R", steps: 1, trace: [] }));
  await manager.wait(["once"]);
  const leftover = await manager.drain();
  assert.deepEqual(
    leftover,
    [],
    "wait 已经把报告送进上下文了，收尾清算不该再续一轮把同一份报告说第二遍",
  );
}

// --- 只读过滤:写工具与 run_subagent 自身都不能给子智能体 ----------------------

{
  const tools = [
    { name: "search_document", readOnly: true },
    { name: "delete_documents", readOnly: false },
    { name: "create_document" }, // 没标记 —— 一律当作会改东西
    { name: "run_subagent", readOnly: true }, // 标了只读也不能给:否则子智能体能自己再派
  ];
  const allowed = readOnlyTools(tools).map((tool) => tool.name);
  assert.deepEqual(allowed, ["search_document"], `子智能体拿到了不该有的工具: ${allowed}`);
}

console.log("subagent tests passed");
