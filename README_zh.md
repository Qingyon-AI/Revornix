![logo](./images/logo.png)

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
> 
> Reject FOMO! When facing the information stream, be lazy, leave the rest to AI!

Revornix 是一个开源、可本地部署的 AI 信息工作台。它可以把分散的信息源汇聚成结构化知识，自动生成图文与播客内容，并通过通知机制把关键信息主动送到你面前。

## 入口链接

- 官网: [https://revornix.com](https://revornix.com)
- 环境变量文档: [https://revornix.com/docs/environment](https://revornix.com/docs/environment)
- 开发计划: [RoadMap](https://huaqinda.notion.site/RoadMap-224bbdbfa03380fabd7beda0b0337ea3)
- 社群: [Discord](https://discord.com/invite/3XZfz84aPN) | [WeChat](https://github.com/Qingyon-AI/Revornix/discussions/1#discussioncomment-13638435) | [QQ](https://github.com/Qingyon-AI/Revornix/discussions/1#discussioncomment-13638435)

## 为什么是 Revornix

- 一条完整链路: 从采集到总结、图谱、播客、通知，全流程自动化。
- 面向 AI 检索优化: 分块 + 向量化 + 个性化 GraphRAG，减少无效上下文。
- 数据可控: 开源且支持本地部署，核心数据留在自己的基础设施。
- 模型自由: 兼容 OpenAI API 的模型都可以接入，并按功能独立配置。
- 可协作: 支持知识库分享与共建，也支持公开内容被搜索引擎收录。

## 从信息流到结果的流程

1. 采集: 网页、PDF、Word、Excel、PPT、文本、API、库文档等多源输入。
2. 解析: 使用 MinerU、Jina 等引擎做清洗与标准化，支持自定义解析引擎。
3. 组织: 分块、向量存储、知识图谱构建，让内容可检索、可推理。
4. 交付: 自动输出图文内容、插图、播客，并通过通知系统触达。

## 项目结构

注意多余的结构有些是暂时没用到的，后续会逐步启用或者清理。

```text
Revornix/
├── web/                  # Next.js 前端（用户交互与控制台）
├── api/                  # FastAPI 核心后端（鉴权、文档、专栏、AI 能力接口）
├── celery-worker/        # 异步任务流（embedding、总结、图谱、播客、通知）
└── hot-news/             # 热搜聚合服务（基于 DailyHotApi）
```

## 核心能力

- 输入源自由: 多类型输入统一解析，支持扩展解析引擎。
- 文本转化强: 内容转 Markdown 与结构化处理质量高。
- 向量检索: 支持语义检索与上下文增强。
- 图谱推理: 个性化 GraphRAG 提升上下文准确率。
- 内置 MCP: 同时具备 MCP Client 与 MCP Server 能力。
- 自动播客: 文档/专栏可自动生成与更新播客音频。
- AI 插图: 可生成并嵌入高质量插图内容。
- 热搜一站式: 集成 DailyHotApi 查看多平台热榜。
- 多语言与响应式: 支持多语言，适配移动端与桌面端。

## 一些界面

![首页](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260114204108304.png)

![文档页面](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260114203737293.png)

![专栏页面](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260114204036225.png)

注: 热搜头条能力基于 [DailyHotApi](https://github.com/imsyy/DailyHotApi)。

![热搜](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260114225533807.png)

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
cp ./api/.env.example ./api/.env
cp ./celery-worker/.env.example ./celery-worker/.env
```

按 [环境变量文档](https://revornix.com/docs/environment) 完成配置。

> [!WARNING]
> 手动部署时，多个服务的 `SECRET_KEY` 必须保持一致，否则用户认证无法互通。

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

### 6) 启动热搜聚合服务

```shell
cd hot-news
pnpm build
pnpm start
```

### 7) 启动 Celery 任务服务

```shell
cd celery-worker
conda create -n celery-worker python=3.11 -y
pip install -r ./requirements.txt
playwright install
celery -A common.celery.app worker --pool=threads --concurrency=10 --loglevel=info -E
```

### 8) 启动前端服务

```shell
cd web
pnpm build
pnpm start
```

全部服务启动后，访问 http://localhost:3000。

## 贡献者

<a href="https://github.com/Qingyon-AI/Revornix/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Qingyon-AI/Revornix" />
</a>
