![logo](./assets/logo.png)

![](https://img.shields.io/badge/free-pricing?logo=free&color=%20%23155EEF&label=pricing&labelColor=%20%23528bff)
![](https://github.com/Qingyon-AI/Revornix/actions/workflows/release.yml/badge.svg?branch=release)
![](https://img.shields.io/github/commit-activity/m/Qingyon-AI/Revornix)
![GitHub last commit (branch)](https://img.shields.io/github/last-commit/Qingyon-AI/Revornix/develop)
![](https://img.shields.io/github/v/release/Qingyon-AI/Revornix)
![GitHub Release Date](https://img.shields.io/github/release-date-pre/Qingyon-AI/Revornix)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Qingyon-AI/Revornix)
[![MseeP.ai Security Assessment Badge](https://img.shields.io/badge/MseeP.ai-Security-blue)](https://mseep.ai/app/qingyon-ai-revornix)

[English](./README.md) | [中文文档](./README_zh.md) | [日本語ドキュメント](./README_jp.md)

> Reject FOMO! When facing the information stream, be lazy, leave the rest to AI!
> 
> 拒绝 FOMO！面对信息流，做个懒人，剩下的，交给 AI！

Revornix is an open-source, local-first AI information workspace. It helps you collect fragmented inputs, turn them into structured knowledge, generate reports with images and podcast audio, and deliver the output through automated notifications.

## Links

- Official site: [https://revornix.com](https://revornix.com)
- Environment docs: [https://revornix.com/docs/environment](https://revornix.com/docs/environment)
- Roadmap: [RoadMap](https://huaqinda.notion.site/RoadMap-224bbdbfa03380fabd7beda0b0337ea3)
- Community: [Discord](https://discord.com/invite/3XZfz84aPN) | [WeChat](https://github.com/Qingyon-AI/Revornix/discussions/1#discussioncomment-13638435) | [QQ](https://github.com/Qingyon-AI/Revornix/discussions/1#discussioncomment-13638435)

## Why Revornix

- One pipeline for noisy information: from ingestion to summary, graph, podcast, and notification.
- Built for AI retrieval quality: chunking + vector storage + personalized GraphRAG.
- Open and controllable: self-host locally and keep your data under your own infra.
- Model-flexible: any provider compatible with the OpenAI API can be wired in.
- Collaboration-ready: share private/public knowledge sections and co-create with others.

## How It Works

1. Collect: web pages, PDF, Word, Excel, PPT, text, APIs, library docs, and more.
2. Understand: parse and normalize with pluggable converters (MinerU, Jina, custom engines).
3. Organize: store vectors, build graph context, and keep content query-ready.
4. Deliver: generate rich documents, add illustrations/podcasts, and push notifications.

## Project Structure

```text
Revornix/
├── web/                  # Next.js frontend (user interaction + dashboard)
├── api/                  # FastAPI core backend (auth, documents, sections, AI APIs)
├── celery-worker/        # Async workflows (embedding, summary, graph, podcast, notifications)
├── hot-news/             # Trending aggregation service (based on DailyHotApi)
└── docker-compose-local.yaml # Local dependency bootstrap
```

## Core Capabilities

- Flexible ingestion: multi-format parsing with customizable engines.
- Advanced transformation: strong markdown/content conversion pipelines.
- Vector retrieval: chunk-to-vector storage for semantic search and AI context.
- Graph reasoning: personalized GraphRAG for better context precision.
- Built-in MCP: both MCP client and MCP server are supported.
- Auto podcast: generate and update podcast audio for documents/sections.
- Illustration generation: generate and embed AI images into content.
- Trending in one place: major platform hot lists via integrated DailyHotApi.
- Responsive and multilingual: available on mobile/desktop with multi-language support.

## Some UI

![Dashboard](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260312200944018.png)

![Revornix-AI](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260318193157115.png)

![Document](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260318190625846.png)

![Knowledge Graph](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260318192919663.png)

![Section](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260318192242314.png)

Note: The trending headlines feature is based on [DailyHotApi](https://github.com/imsyy/DailyHotApi).

![Hot-News](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260318193532765.png)

## Quick Start

> [!NOTE]
> We recommend creating isolated Python environments per service (for example with conda), because dependencies across services can conflict.

### 1) Clone repository

```shell
git clone git@github.com:Qingyon-AI/Revornix.git
cd Revornix
```

### 2) Start base dependencies

> [!NOTE]
> If you already have postgres, redis, neo4j, minio, and milvus installed, you can reuse them. Otherwise use `docker-compose-local.yaml` with `.env.local.example`.

> [!WARNING]
> If some dependencies are already running on your machine, disable the corresponding services in `docker-compose-local.yaml` to avoid conflicts.

```shell
cp .env.local.example .env.local
docker compose -f ./docker-compose-local.yaml --env-file .env.local up -d
```

### 3) Configure env files for microservices

```shell
cp ./web/.env.example ./web/.env
cp ./api/.env.example ./api/.env
cp ./celery-worker/.env.example ./celery-worker/.env
```

Configure env values based on [environment docs](https://revornix.com/docs/environment).

> [!WARNING]
> For manual deployment, keep `OAUTH_SECRET_KEY` consistent across services, or cross-service authentication will fail.

### 4) Initialize required data

```shell
cd api
python -m data.milvus.create
python -m data.sql.create
```

### 5) Run API service

```shell
cd api
conda create -n api python=3.11 -y
pip install -r ./requirements.txt
fastapi run --port 8001
```

### 6) Run trending aggregation service

```shell
cd hot-news
pnpm build
pnpm start
```

### 7) Run Celery worker

```shell
cd celery-worker
conda create -n celery-worker python=3.11 -y
pip install -r ./requirements.txt
playwright install
celery -A common.celery.app worker --pool=threads --concurrency=20 --loglevel=info -E
```

### 8) Run frontend

```shell
cd web
pnpm build
pnpm start
```

After all services are running, open http://localhost:3000.

## Contributors

<a href="https://github.com/Qingyon-AI/Revornix/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Qingyon-AI/Revornix" />
</a>
