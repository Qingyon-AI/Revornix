/**
 * Bundle smoke test: prove the built sidecar actually boots and speaks the protocol.
 *
 * esbuild 配置问题(--ignore-annotations 被摘了之类)的症状是类型与单测全绿、bundle 一跑就炸,
 * 所以这条测试直接驱动 dist/sidecar.cjs,不碰源码。
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const bundle = path.join(here, "..", "dist", "sidecar.cjs");

const child = spawn(process.execPath, [bundle], { stdio: ["pipe", "pipe", "pipe"] });
let stderr = "";
child.stderr.on("data", (chunk) => (stderr += chunk));

const events = [];
let resolveNext;
const nextEvent = () =>
  new Promise((resolve, reject) => {
    resolveNext = resolve;
    child.once("error", reject);
    setTimeout(() => reject(new Error(`timed out waiting for event; stderr:\n${stderr}`)), 15000);
  });

let buffer = "";
child.stdout.on("data", (chunk) => {
  buffer += chunk;
  for (;;) {
    const newline = buffer.indexOf("\n");
    if (newline < 0) break;
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (!line) continue;
    events.push(JSON.parse(line));
    resolveNext?.(events[events.length - 1]);
  }
});

const send = (frame) => child.stdin.write(JSON.stringify(frame) + "\n");

// 1. ready
const ready = await nextEvent();
if (ready.type !== "ready") throw new Error(`expected ready, got ${JSON.stringify(ready)}`);

// 2. run_turn without provider → error frame (transport works both ways)
send({ type: "run_turn", turnId: "t1", prompt: "hi", systemPrompt: "", apiBase: "http://127.0.0.1:1", token: "x" });
const error = await nextEvent();
if (error.type !== "error" || error.turnId !== "t1") {
  throw new Error(`expected error for t1, got ${JSON.stringify(error)}`);
}

child.kill();
console.log("bundle smoke test passed");
process.exit(0);
