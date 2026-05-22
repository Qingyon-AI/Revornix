![logo](./assets/logo.png)

![](https://img.shields.io/badge/free-pricing?logo=free&color=%20%23155EEF&label=pricing&labelColor=%20%23528bff)
![](https://github.com/Qingyon-AI/Revornix/actions/workflows/release.yml/badge.svg?branch=release)
![](https://img.shields.io/github/commit-activity/m/Qingyon-AI/Revornix)
![GitHub last commit (branch)](https://img.shields.io/github/last-commit/Qingyon-AI/Revornix/develop)
![](https://img.shields.io/github/v/release/Qingyon-AI/Revornix)
![GitHub Release Date](https://img.shields.io/github/release-date-pre/Qingyon-AI/Revornix)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Qingyon-AI/Revornix)
[![MseeP.ai Security Assessment Badge](https://img.shields.io/badge/MseeP.ai-Security-blue)](https://mseep.ai/app/qingyon-ai-revornix)

[English](./README.md) | 中文文档 | [日本語ドキュメント](./README_jp.md)

> 拒绝 FOMO！面对信息流，做个懒人，剩下的，交给 AI！

Revornix 是一个开源、可本地部署的 AI 信息工作台。把那些"想看却来不及看"的链接、PDF、音频、截图都丢给它，平台会自动整理成结构化知识，生成可以读和听的图文/播客，再在你方便的时候通过通知送到面前。

整套系统（Web 客户端、网关、API、异步任务、热搜服务、文档站）都是开源的，可以完全跑在自己的机器上。

## 入口链接

- 官网：<https://revornix.com>
- 在线体验：<https://app.revornix.com>
- 文档：<https://revornix.com/docs>
- 环境变量：<https://revornix.com/docs/environment>
- 开发计划：[RoadMap](https://huaqinda.notion.site/RoadMap-224bbdbfa03380fabd7beda0b0337ea3)
- 社群：[Discord](https://discord.com/invite/3XZfz84aPN) · [WeChat](https://github.com/Qingyon-AI/Revornix/discussions/1#discussioncomment-13638435) · [QQ](https://github.com/Qingyon-AI/Revornix/discussions/1#discussioncomment-13638435)

## 为什么是 Revornix

- **一条完整链路** —— 从采集到解析、总结、图谱、播客、通知，所有环节都在一个产品里完成。
- **面向 AI 检索优化** —— Milvus 中的分块向量检索，叠加 Neo4j 上的个性化 GraphRAG，让回答精度更高。
- **数据可控** —— 完全运行在你自己的基础设施上。文档、数据库、密钥都在你这边。
- **模型自由** —— 兼容 OpenAI API 的模型都能接，且解析、向量、总结、播客、插图等引擎可以分别独立配置。
- **可协作** —— 知识专栏支持团队私密共享，也支持公开发布到社区。
- **公开发现** —— 已发布的文档、专栏、创作者、标签、热搜话题都自带 SEO 友好的公开页面。

## 从信息流到结果的流程

1. **采集** —— 网页、PDF、Word、Excel、PPT、文本、音频，也可以通过公开 API、Python SDK / CLI 或 OpenClaw Skill 自动接入。
2. **解析** —— 可插拔的转换引擎（MinerU、Jina、自定义）把内容统一清洗成干净的 Markdown。
3. **组织** —— 分块向量化进入 Milvus；实体与关系写入用户专属 Neo4j 图谱；标签自动归类。
4. **交付** —— AI 总结、配图长文、双人播客、通知，按你的节奏推送到位。

## 项目结构

```text
Revornix/
├── web/                       # Next.js 客户端（工作台 + 公开页面）— 见 web/README.md
├── api/                       # FastAPI 核心后端（鉴权、文档、专栏、AI 能力接口）— 见 api/README.md
├── celery-worker/             # 异步任务流（embedding、总结、图谱、播客、通知）— 见 celery-worker/README.md
├── gateway/                   # Go 公网入口网关（路由、反爬、上游容错）
├── hot-news/                  # 热搜聚合服务（基于 DailyHotApi）
├── docs/                      # 公开文档站（revornix.com/docs）— 独立 Next.js + Nextra
├── desktop/                   # 规划中的桌面应用（Tauri/Electron）— 目前是占位目录
├── assets/                    # 仓库级图片与品牌资源
└── docker-compose-local.yaml  # 本地依赖一键拉起（Postgres、Redis、Neo4j、MinIO、Milvus）
```

每个子目录都有各自的 README，里面是该服务的细节说明。

## 核心能力

简述一下平台当前实际具备的能力。每项功能的图文走读详见 [文档站](https://revornix.com/docs)。

- **多格式采集** —— 网页、PDF、Word、Excel、PPT、文本、音频，以及通过公开 API 进入。
- **可插拔解析引擎** —— 工作区级别选默认引擎（MinerU、Jina、自定义）；也可以为不同文档类型混搭。
- **向量检索 + GraphRAG** —— 每篇文档进 Milvus，同时投射到该用户的 Neo4j 图谱，问答更有上下文。
- **全局搜索** —— 私有库支持向量与全文双模式；另有公开发现层覆盖已发布文档、专栏、创作者、标签。
- **专栏** —— 围绕一个主题的文档合集，可保持私密、内部共享或公开发布。
- **日报专栏** —— 自动把当日收集的内容聚合成一个可读专栏。
- **AI 助手（Revornix AI）** —— 基于你的文档和个性化图谱进行对话问答。
- **MCP** —— 既是 MCP Client（工作台可调用外部 MCP 服务），也是 MCP Server（你的知识库对外暴露给 MCP 工具）。
- **自动播客** —— 文档与专栏可生成双人对话播客，内容变更后可重新生成。
- **AI 插图** —— 在长文中按节生成并嵌入插图。
- **热搜聚合** —— 通过内置的 `hot-news/` 聚合多平台热榜。
- **强化的 Markdown 阅读与编辑** —— 基于 Tiptap 的编辑器，支持表格、Mermaid、数学公式、图片，长公开文档自带浮动目录。
- **通知系统** —— 多渠道（邮件、站内、推送）推送任务完成、定时摘要等。
- **多语言与响应式** —— 产品 UI 支持中英双语，仓库 README 覆盖中英日三语，适配桌面与移动。
- **分层防护** —— `gateway/` 在边缘拦截明显爬虫，`api/` 对公开高风险接口做限流。

## 一些界面

下面是工作台和公开页面的一些截图。完整图文走读见 [文档站](https://revornix.com/docs)。

**仪表盘** —— 日常概览、AI 建议、数据新鲜度信号。
![Dashboard](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260418161335093.png)

**Revornix AI** —— 基于你的文档和个性化图谱进行对话。
![Revornix-AI](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260418161439547.png)

**文档详情** —— Markdown 阅读、AI 总结、播客、图谱、操作集中在一页。
![Document](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260418161532457.png)

**个性化知识图谱** —— 从你收藏的内容中提取的实体和关系。
![Knowledge Graph](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260318192919663.png)

**专栏** —— 围绕主题整理的私密或公开文档合集。
![Section](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260418161641269.png)

**播客** —— 把文档或专栏转成双人对话音频。
![Podcast](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260421222904288.png)

**创作者公开页** —— SEO 友好的创作者主页。
![User SEO](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260418162540367.png)

**社区** —— 浏览其他人发布的内容。
![Community](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260418162732909.png)

**热搜头条** —— 通过内置的 `hot-news/` 聚合多平台热榜（基于 [DailyHotApi](https://github.com/imsyy/DailyHotApi)）。
![Hot-News](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260318193532765.png)

## 快速开始

> [!NOTE]
> 推荐为每个 Python 服务使用独立虚拟环境（例如 conda），避免依赖冲突。

### 1) 克隆仓库

```shell
git clone git@github.com:Qingyon-AI/Revornix.git
cd Revornix
```

### 2) 启动基础依赖服务

> [!NOTE]
> 如果本地已有 postgres、redis、neo4j、minio、milvus，可直接复用。否则推荐使用 `docker-compose-local.yaml` + `.env.local.example`。

> [!WARNING]
> 如果你的机器上已运行了部分依赖，请在 `docker-compose-local.yaml` 中关闭对应服务，避免端口或实例冲突。

```shell
cp .env.local.example .env.local
docker compose -f ./docker-compose-local.yaml --env-file .env.local up -d
```

### 3) 配置微服务环境变量

```shell
cp ./web/.env.example ./web/.env
cp ./gateway/.env.example ./gateway/.env
cp ./api/.env.example ./api/.env
cp ./celery-worker/.env.example ./celery-worker/.env
```

按 [环境变量文档](https://revornix.com/docs/environment) 完成配置。

> [!WARNING]
> 手动部署时，多个服务的 `OAUTH_SECRET_KEY` 必须保持一致，否则用户认证无法互通。

### 4) 初始化必要数据

```shell
cd api
python -m data.milvus.create
python -m data.sql.create
```

### 5) 启动核心后端服务

```shell
cd api
conda create -n api python=3.11 -y
pip install -r ./requirements.txt
fastapi run --port 8001
```

### 6) 启动网关服务（可选）

```shell
cd gateway
go run ./cmd/gateway
```

本地开发时网关不是强制项，但生产环境建议启用。它负责公网流量入口、上游切换，以及在流量进入 `api/` 前先做一层反爬与限流。

### 7) 启动热搜聚合服务

```shell
cd hot-news
pnpm build
pnpm start
```

### 8) 启动 Celery 任务服务

```shell
cd celery-worker
conda create -n celery-worker python=3.11 -y
pip install -r ./requirements.txt
playwright install
./start-worker.sh
```

### 9) 启动前端服务

```shell
cd web
pnpm build
pnpm start
```

全部服务启动后，访问 <http://localhost:3000>。

## 接下来去哪里

- **想用产品？** 从 <https://revornix.com/docs/start> 开始，然后进入 <https://app.revornix.com>。
- **想扩展功能？** 每个服务有自己的 README：[`web/`](./web/README.md)、[`api/`](./api/README.md)、[`celery-worker/`](./celery-worker/README.md)、[`gateway/`](./gateway/README.md)、[`docs/`](./docs/README.md)。
- **想为文档贡献内容？** 在 [`docs/src/content/`](./docs/README.md) 下增加 MDX。
- **关心桌面端？** 还在规划中，见 [`desktop/`](./desktop/README.md)。
- **想了解架构细节？** <https://revornix.com/docs/developer/structure>。

## 贡献者

<a href="https://github.com/Qingyon-AI/Revornix/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Qingyon-AI/Revornix" />
</a>
