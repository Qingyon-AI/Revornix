# 智能体重构:Revornix AI 从 mcp_use/LangGraph 迁到 pi sidecar

## 为什么重写

旧管道(api/router/ai.py 的 /ai/ask + document_ai.py + section_ai.py)的问题:

- **没有服务端会话**:历史存在浏览器 IndexedDB,换设备即丢;每轮把全量历史重新 POST
  上来,token 成本随轮数线性涨。
- **没有写操作闸门**:delete_documents 这类 MCP 工具一旦注册,agent 可自主调用。
- **agent 没有内置工具**:/ai/ask 默认不接地;想让它检索自己的库,得把 Revornix 自己的
  MCP server 注册回自己的 MCP 列表。
- **工具名与前端解释器硬耦合**(interpret_event.py 里的工具名清单),第三方工具结果
  只剩 preview 文本。
- agent 循环是 LangGraph 黑盒:不能 steer、不能 abort、不可观测,超限只有
  GraphRecursionError。

## 目标形态(对齐 OpenStudio 验证过的架构)

```
web ──▶ api/router/agent.py ──▶ app/agent/host.py(会话/队列/流式 timeline)
                                     │ 每轮 spawn 短命 Node 进程
                                     ▼ stdio 逐行 JSON
                          agent-sidecar/(内嵌 pi-agent-core)
                                     │ HTTP 回连(Bearer turn-token)
                                     ▼
                          GET /agent/tools(manifest,从 mcp_router 注册表派生)
                          POST /agent/tools/{name}(invoke;门控工具只建确认卡)
                          POST /agent/confirmations/{id}/approve(用户批准后当场执行)
```

关键决策:

1. **pi 在 Node 里跑,不在 Python 里仿写。** agent 循环、思考档位翻译、供应商差异
   适配都由 pi-agent-core 维护,自己重写一份等于把上游修复拒之门外。代价是部署多了
   一个 Node 运行时(api/Dockerfile 已从 node:22 镜像拷二进制 + 构建 sidecar 层)。
2. **会话真相在服务端。** `agent_session.adapter_state` 存 pi 序列化的消息数组,每轮
   round-trip。压缩在 sidecar 里按 token 水位(80%)做,切点对齐 user 边界,摘要用
   同一个模型、以 user 消息置顶。
3. **工具只有一份注册表。** mcp_router/ 的四个 FastMCP server 本来就是薄包装;manifest
   端点从注册表派生,加工具不用改第二处。`agent/tool_manifest.py` 的两个集合
   (CONFIRMATION_TOOLS / READ_ONLY_TOOLS)给每个工具归队,api/tests/test_agent_tools.py
   是棘轮:新工具不归队测试就红。
4. **确认卡是唯一的写路径。** 门控工具调用只建行返回 {confirmation_id, pending};
   sidecar 阻塞轮询,用户批准 → 条件 UPDATE 抢占(防双击双执行)→ 以批准者身份执行。
   归属从 turn 令牌的 claim 反查,不从参数转述。
5. **排队是默认,steer 是有意的。** 会话在跑时发来的消息落库标 queued,上轮结束 drain
   成独立的一轮;插进当前轮要显式 steer。
6. **三个旧入口统一。** /ai/ask 删除;/document/ask、/section/ask 的 grounding 搬进
   host(绑定 document_id/section_id 的会话,每轮重新组装:内容摘录 + 按当前问题的
   向量召回 + 专栏的 Neo4j 图扩展)。公共 API(tp 路由)的一问一答走
   host.ask_document_once / ask_section_once —— 无会话、同一 sidecar 管道、SSE 契约不变。
   编辑器续写走新的 /ai/complete(无状态纯补全,不带工具)。
7. **trace 就是消息 payload。** 每轮的 timeline(text/thinking/tool/subtool 有序条目)、
   usage(耗时/首 token/真实计量)、context(水位)、compaction 标记都落在
   agent_message.payload,刷新后仍在。

## 删除的东西

mcp_use 依赖、LangChain agent 路径、StructuredLangChainAdapter、interpret_event.py
(LangGraph 事件翻译)、usage_collector.py、kimi_compat.py、prompts/mcp.py(本就是
dead code)、前端 IndexedDB 会话存储(store/ai-chat.ts)及配套 lib。

## 运维注意

- sidecar 没构建,智能体对话会在启动日志里点名(agent sidecar NOT built),第一轮对话
  报「pi sidecar 未构建」。`./scripts/dev.sh api` 会在缺失时自动构建。
- sidecar 回连 API 的地址是 `AGENT_API_BASE`(默认 http://127.0.0.1:8001);API 不在
  默认端口时要设它。
- 后端重启会把卡在 running 的会话拨回 idle、作废其 pending 确认卡,并在对话里留一条
  可见的中断说明。
