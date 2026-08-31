/**
 * 用户自注册的外部 MCP server —— 挂在 pi agent 上,与内置工具并列。
 *
 * 这是 Revornix 既有能力的延续(原来是 mcp_use 的 MCPClient):用户在设置里登记 STDIO / HTTP
 * 的 MCP server,对话时它们的工具就能被调用。pi 本身没有 MCP 支持,所以这里用官方 SDK 做一层
 * 薄薄的桥:turn 开始时连接、列出工具、包成 AgentTool;turn 结束时统一断开。
 *
 * 工具命名 `mcp__<server>__<tool>`:① 与内置工具一眼可辨(模型据此知道失败时该提示用户去检查
 * 那个 server 的配置);② 不同 server 的同名工具不撞车。非法字符折成下划线。
 *
 * 这些工具**不走确认卡**(它们是用户自己登记并显式启用的外部能力,登记本身就是授权),
 * 也**不给子智能体**(外部工具是不是只读我们无法知道,宁可少给)。
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { AgentTool, AgentToolResult } from "@earendil-works/pi-agent-core";

import { log, type McpServerConfig } from "./protocol.js";

const SAFE_NAME = /[^A-Za-z0-9_]+/g;

/** pi 的 AgentTool 没有 readOnly 字段;它是我们自己的约定,subagent.ts 靠它筛选子智能体工具。 */
type RevornixTool = AgentTool & { readOnly?: boolean };

/** 一个 server 连接失败不该拖垮整轮对话 —— 跳过它,把原因记到 stderr。 */
export async function buildMcpTools(
  configs: McpServerConfig[],
): Promise<{ tools: AgentTool[]; close: () => Promise<void> }> {
  const tools: AgentTool[] = [];
  const clients: Client[] = [];

  for (const config of configs) {
    const prefix = `mcp__${config.name.replace(SAFE_NAME, "_")}__`;
    try {
      const client = new Client({ name: "revornix-agent", version: "1.0.0" });
      const transport =
        config.category === "stdio"
          ? new StdioClientTransport({
              command: config.command ?? "",
              args: config.args ?? [],
              // 合入宿主环境:PATH/HOME 不在的话,npx 这类命令根本起不来。
              env: { ...(process.env as Record<string, string>), ...(config.env ?? {}) },
              stderr: "pipe",
            })
          : new StreamableHTTPClientTransport(new URL(config.url ?? ""), {
              requestInit: { headers: config.headers ?? {} },
            });
      await client.connect(transport);
      clients.push(client);
      const listed = await client.listTools();
      for (const tool of listed.tools ?? []) {
        const name = `${prefix}${tool.name.replace(SAFE_NAME, "_")}`;
        const agentTool: RevornixTool = {
          name,
          label: `${config.name}: ${tool.name}`,
          readOnly: false,
          description: `[MCP · ${config.name}] ${(tool.description ?? "").trim() || tool.name}`,
          parameters: (tool.inputSchema ?? { type: "object", properties: {} }) as never,
          execute: async (_id: string, rawParams: unknown): Promise<AgentToolResult<{ data: unknown }>> => {
            const result = await client.callTool({
              name: tool.name,
              arguments: (rawParams ?? {}) as Record<string, unknown>,
            });
            const blocks = Array.isArray(result.content) ? result.content : [];
            const text = blocks
              .map((block) => {
                const record = block as Record<string, unknown>;
                if (record.type === "text" && typeof record.text === "string") return record.text;
                return JSON.stringify(record);
              })
              .join("\n");
            if (result.isError) throw new Error(text || "MCP tool failed");
            const structured = (result as { structuredContent?: unknown }).structuredContent;
            return {
              content: [{ type: "text", text: text || JSON.stringify(structured ?? null) }],
              details: { data: structured ?? text },
            };
          },
        };
        tools.push(agentTool);
      }
      log(`mcp server "${config.name}": ${listed.tools?.length ?? 0} tools`);
    } catch (err) {
      log(`mcp server "${config.name}" unavailable, skipped:`, String(err));
    }
  }

  return {
    tools,
    close: async () => {
      for (const client of clients) {
        try {
          await client.close();
        } catch {
          // 断开失败没有后续影响 —— 进程本来就随这轮结束。
        }
      }
    },
  };
}
