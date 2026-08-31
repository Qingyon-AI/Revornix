/**
 * 让 sidecar 的出站请求走代理。
 *
 * Node 的 `fetch`(undici)**默认不读** HTTP_PROXY / HTTPS_PROXY —— 这跟几乎所有其他运行时的
 * 直觉相反。装上 EnvHttpProxyAgent 才会去读这几个变量。
 *
 * 用 EnvHttpProxyAgent 而不是 ProxyAgent,是因为**它认 NO_PROXY**。这一点不是锦上添花:
 * sidecar 的每一次工具调用都要回连 `127.0.0.1:<后端端口>`,若被一并送进代理,整个智能体就全废,
 * 而且表现是「所有工具超时」,几乎没人会联想到是代理。
 */
import { EnvHttpProxyAgent, setGlobalDispatcher } from "undici";

import { log } from "./protocol.js";

const PROXY_KEYS = ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy", "ALL_PROXY", "all_proxy"];

/** 装上代理调度器;没配代理就什么都不做(保持直连,不引入一层多余的分发)。 */
export function installProxyFromEnv(): void {
  const configured = PROXY_KEYS.map((key) => process.env[key]).find((value) => Boolean(value && value.trim()));
  if (!configured) return;
  // 回环地址必须在 NO_PROXY 里:工具调用回连本机后端,走代理就全废。
  const noProxy = process.env.NO_PROXY ?? process.env.no_proxy ?? "";
  const loopback = ["127.0.0.1", "localhost", "::1"];
  const missing = loopback.filter((host) => !noProxy.includes(host));
  if (missing.length > 0) {
    const joined = noProxy ? `${noProxy},${missing.join(",")}` : missing.join(",");
    process.env.NO_PROXY = joined;
    process.env.no_proxy = joined;
  }
  setGlobalDispatcher(new EnvHttpProxyAgent());
  log(`outbound proxy enabled: ${configured} (no_proxy=${process.env.NO_PROXY})`);
}
