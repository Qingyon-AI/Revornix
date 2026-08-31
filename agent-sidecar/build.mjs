/**
 * 用 esbuild 的 JS API 打包,而不是 CLI。
 *
 * esbuild 的 postinstall 在 POSIX 上会把 bin/esbuild 的 JS 启动器**替换成原生二进制**,
 * 而 pnpm 的 .bin shim 是在替换之前生成的(node 包装),于是 `pnpm build` 走 CLI 会变成
 * "拿 node 去解析一个 Mach-O"。JS API 不经过 bin,没有这个时序问题。
 *
 * --ignore-annotations 对应 ignoreAnnotations: pi-ai 的 package.json 把 sideEffects 限定在
 * 个别文件里,esbuild 会据此摘掉/推迟模块初始化,而 createModels() 会被提到顶层,它引用的
 * 实现却留在惰性块里,调用时 undefined。开它固定初始化顺序。删掉会静默复现该故障:类型与
 * 单测全绿,只有 bundle 冒烟测试抓得到。
 */
import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  ignoreAnnotations: true,
  outfile: "dist/sidecar.cjs",
  logLevel: "info",
});
