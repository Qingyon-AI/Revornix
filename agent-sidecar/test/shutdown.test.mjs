/**
 * SIGTERM 必须走清理路径,而不是被 node 的默认动作直接打死。
 *
 * 为什么重要:用户可以注册 stdio 类型的 MCP server —— 那是本进程 spawn 的子进程,
 * 靠每轮 `finally` 里的 `mcp.close()` 收掉。后端在一轮超时(600 秒)时会终止本进程,
 * 而 node 对 SIGTERM 的默认动作是立即退出,那个 finally 根本不会跑,子进程被遗弃。
 *
 * 所以后端改成「先 SIGTERM,宽限 3 秒,再 SIGKILL」,前提是这一侧真的装了处理器。
 * 这个测试验的就是那个前提 —— 对着**构建产物**跑,因为那才是 api 运行时执行的文件。
 */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const bundle = path.join(here, "..", "dist", "sidecar.cjs");

/** 起一个 sidecar,等它自报 ready —— 再早发信号就测不到处理器是否装上了。 */
function startSidecar() {
  const child = spawn(process.execPath, [bundle], { stdio: ["pipe", "pipe", "pipe"] });
  let stderr = "";
  child.stderr.on("data", (chunk) => (stderr += String(chunk)));
  const ready = new Promise((resolve, reject) => {
    let buffer = "";
    child.stdout.on("data", (chunk) => {
      buffer += String(chunk);
      for (const line of buffer.split("\n")) {
        if (!line.trim()) continue;
        try {
          if (JSON.parse(line).type === "ready") resolve();
        } catch {
          /* 半行,等下一块 */
        }
      }
    });
    child.on("exit", (code) => reject(new Error(`启动即退出，code=${code}\n${stderr}`)));
    setTimeout(() => reject(new Error(`10 秒内没有 ready 帧\n${stderr}`)), 10_000);
  });
  return { child, ready, stderrOf: () => stderr };
}

const { child, ready, stderrOf } = startSidecar();
await ready;

const exited = new Promise((resolve) => {
  child.on("exit", (code, signal) => resolve({ code, signal }));
});

child.kill("SIGTERM");

const timeout = new Promise((resolve) => setTimeout(() => resolve("timeout"), 5_000));
const outcome = await Promise.race([exited, timeout]);

assert.notEqual(
  outcome,
  "timeout",
  "SIGTERM 之后 5 秒内没退出 —— 后端的宽限期是 3 秒，这会导致每次超时都退化成 SIGKILL",
);

// 退出码 0 说明走的是自己的 shutdown（process.exit(0)）；
// 若 signal 是 SIGTERM，说明是 node 的默认动作干掉的，清理没跑。
assert.equal(
  outcome.signal,
  null,
  `被信号直接终止(signal=${outcome.signal})，说明 SIGTERM 处理器没生效，MCP 子进程会被遗弃`,
);
assert.equal(outcome.code, 0, `期望优雅退出码 0，实际 ${outcome.code}`);
assert.match(
  stderrOf(),
  /received SIGTERM/,
  "没有看到 SIGTERM 的清理日志 —— 处理器可能被后来的改动去掉了",
);

console.log("shutdown test passed");
