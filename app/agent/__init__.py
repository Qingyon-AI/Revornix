"""Revornix 智能体宿主。

每个会话一条持久记录(`agent_session`),每轮对话 spawn 一个短命 Node sidecar
(agent-sidecar/dist/sidecar.cjs,内嵌 pi-agent-core)经 stdio 逐行 JSON 驱动。
sidecar 的工具经 HTTP 回连本 API(/agent/tools/*),写操作全部过确认卡。

为什么是独立进程而不是 Python 内的循环:agent 循环、思考档位翻译、供应商差异
适配都在 pi 里维护,自己重写一份等于把上游的持续修复拒之门外。
"""
