![logo](./images/logo.png)

![](https://img.shields.io/badge/free-pricing?logo=free&color=%20%23155EEF&label=pricing&labelColor=%20%23528bff)
![](https://github.com/Qingyon-AI/Revornix/actions/workflows/release.yml/badge.svg?branch=release)
![](https://img.shields.io/github/commit-activity/m/Qingyon-AI/Revornix)
![GitHub last commit (branch)](https://img.shields.io/github/last-commit/Qingyon-AI/Revornix/develop)
![](https://img.shields.io/github/v/release/Qingyon-AI/Revornix)
![GitHub Release Date](https://img.shields.io/github/release-date-pre/Qingyon-AI/Revornix)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Qingyon-AI/Revornix)
[![MseeP.ai Security Assessment Badge](https://img.shields.io/badge/MseeP.ai-Security-blue)](https://mseep.ai/app/qingyon-ai-revornix)

English | [中文文档](./README_zh.md) | [日本語ドキュメント](./README_jp.md)

## Introduction

🚀 RoadMap: [RoadMap](https://huaqinda.notion.site/RoadMap-224bbdbfa03380fabd7beda0b0337ea3)

🖥️ Official Website: [https://revornix.com](https://revornix.com)

❤️ Join our community: [Discord](https://discord.com/invite/3XZfz84aPN) | [WeChat](https://github.com/Qingyon-AI/Revornix/discussions/1#discussioncomment-13638435) | [QQ](https://github.com/Qingyon-AI/Revornix/discussions/1#discussioncomment-13638435)

Revornix is an information management tool built for the AI era. It helps you consolidate every visible source with ease and delivers a full report at the time you choose.

![](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20251011141251012.png)

## Key Features

- Flexible input sources: Currently supports RSS, web pages, PDF, Word, Excel, PowerPoint, manual text entry, APIs, PyPI packages, Node.js packages, and more integrations are on the way.
- Advanced text conversion: Powered by MinerU and other state-of-the-art Markdown conversion engines, delivering industry-leading parsing quality with custom engine support.
- Vector storage & knowledge graph: Personalized GraphRAG combined with embeddings turns every input into searchable vectors and knowledge graphs, improving retrieval and context accuracy.
- Built-in sharing: Share selected knowledge bases or explore public collections to collaborate and exchange insights effortlessly.
- Local-first & open source: Fully open source. With self-hosted deployment, your data stays on your infrastructure—no leakage concerns.
- Smart assistant & MCP: Bundled MCP client and server let you expose tools to others or let the assistant call local and third-party MCP services.
- Seamless LLM integration: Bring any model you like. Each feature can rely on its own model configuration.
- Multilingual & responsive: Great experience in both Chinese and English, across desktop and mobile.
- Auto Podcast: Users can enable automatic podcast generation and updates for documents/sections. Once enabled, Revornix will automatically generate audio files for documents/sections, providing an additional way to consume information.

## Quick Start

The current architecture is still evolving and our Docker packaging has known issues. We therefore recommend following the manual deployment steps below for now.

> [!NOTE]
> We highly recommend creating separate Python virtual environments for each service via Conda. Different services depend on different Python packages and may conflict with each other. Feel free to use another environment manager if you prefer.

### Clone the repository

```shell
git clone git@github.com:Qingyon-AI/Revornix.git
cd Revornix
```

### Install and start the core infrastructure

> [!NOTE]
> If you do not have PostgreSQL, Redis, Neo4j, MinIO, Milvus, RSSHub, or Browserless on your machine, install them first and configure their environment variables according to each service’s requirements and the [Revornix environment guide](https://revornix.com/docs/environment).
>
> To make this easier, we provide `docker-compose-local.yaml` and `.env.local.example`. You can spin up the dependencies with that compose file and copy the example environment variables directly.

> [!WARNING]
> If any of the services above are already running locally, disable the corresponding entries in `docker-compose-local.yaml` to avoid unexpected conflicts.

Copy the provided example file and adjust the values with the help of the [environment guide](https://revornix.com/docs/environment). In most cases you only need to change `OAUTH_SECRET_KEY`.

```shell
cp .env.local.example .env.local
```

Start PostgreSQL, Redis, Neo4j, MinIO, Milvus, RSSHub, and Browserless:

```shell
docker compose -f ./docker-compose-local.yaml --env-file .env.local up -d
```

### Configure service-specific environment variables

```shell
cp ./web/.env.example ./web/.env
cp ./api/.env.example ./api/.env
cp ./celery-worker/.env.example ./celery-worker/.env
```

Fill each file according to the [environment variables guide](https://revornix.com/docs/environment).

> [!WARNING]
> When deploying manually, keep the `SECRET_KEY` (or `OAUTH_SECRET_KEY`) identical across services. Otherwise, authentication states cannot be shared.

### Initialize required seed data

```shell
cd api
python -m data.milvus.create
python -m data.sql.create
```

### Launch the core backend

```shell
cd api
conda create -n api python=3.11 -y
pip install -r ./requirements.txt
fastapi run --port 8001
```

### Launch the Daily Hot service

```shell
cd hot-news
pnpm build
pnpm start
```

### Launch the Celery worker queue

```shell
cd celery-worker
conda create -n celery-worker python=3.11 -y
pip install -r ./requirements.txt
celery -A common.celery.app worker --pool=threads --concurrency=10 --loglevel=info -E
```

### Launch the frontend

```shell
cd web
pnpm build
pnpm start
```

After all services are running, open http://localhost:3000 to access the web app.

## Contributors

<a href="https://github.com/Qingyon-AI/Revornx/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Qingyon-AI/Revornix" />
</a>
