![logo](./images/logo.png)

![](https://img.shields.io/badge/free-pricing?logo=free&color=%20%23155EEF&label=pricing&labelColor=%20%23528bff)
![](https://github.com/Qingyon-AI/Revornix/actions/workflows/release.yml/badge.svg?branch=release)
![](https://img.shields.io/github/commit-activity/m/Qingyon-AI/Revornix)
![GitHub last commit (branch)](https://img.shields.io/github/last-commit/Qingyon-AI/Revornix/develop)
![](https://img.shields.io/github/v/release/Qingyon-AI/Revornix)
![GitHub Release Date](https://img.shields.io/github/release-date-pre/Qingyon-AI/Revornix)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Qingyon-AI/Revornix)
[![MseeP.ai Security Assessment Badge](https://img.shields.io/badge/MseeP.ai-Security-blue)](https://mseep.ai/app/qingyon-ai-revornix)

[English](./README.md) | [中文文档](./README_zh.md) | [日本語ドキュメント](./README_jp.md)

## Introduction

🖥️ Official site: [https://revornix.com](https://revornix.com)

🚀 Development plan: [RoadMap](https://huaqinda.notion.site/RoadMap-224bbdbfa03380fabd7beda0b0337ea3)

❤️ Join the community: [Discord](https://discord.com/invite/3XZfz84aPN) | [WeChat](https://github.com/Qingyon-AI/Revornix/discussions/1#discussioncomment-13638435) | [QQ](https://github.com/Qingyon-AI/Revornix/discussions/1#discussioncomment-13638435)

One-sentence description: Revornix is a highly customizable information and document management tool for the AI era. It helps you easily consolidate any information source, generate rich reports with images and podcast audio, and then notify you.

**Some UI**

![Home](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260114204108304.png)

![Document Page](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260114203737293.png)

![Column Page](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260114204036225.png)

Note: **The trending headlines feature comes from the [DailyHotApi](https://github.com/imsyy/DailyHotApi) project**

![Trending](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260114225533807.png)

## Features

- Input sources stay flexible: Depending on different parsing engines, we currently support web pages, PDF, Word, Excel, PPT, manually entered text, APIs, PIP libraries, Node.js libraries, and more. Additional third-party platforms will be integrated in the future.
- Advanced text conversion: Powered by cutting-edge text transformation technologies such as MinerU and Jina, delivering industry-leading conversion quality with support for custom conversion engines.
- Vectorized storage: Revornix breaks all input content into chunks, converts them into vectors, and stores them in a vector database to make retrieval easy and to provide richer context to AI models.
- Knowledge graphs: Based on personalized GraphRag, Revornix analyzes information sources and generates knowledge graphs, greatly improving context accuracy while giving you a satisfying big-picture view.
- Integrated sharing: Built-in sharing lets users share specific knowledge bases for co-creation, push their knowledge bases to the public for search engine indexing, or use other public knowledge bases. Knowledge sharing is a core focus for Revornix.
- Local-first & open source: The code is open source, and with local deployment all data is stored locally, so you don’t need to worry about data leakage.
- Intelligent assistant & built-in MCP: Revornix includes both an MCP client and server, letting you provide MCP services to third parties or let the AI assistant call local or external MCP services.
- Seamless model integration: Models are not fixed. Any model compatible with the OpenAI API can be used, and different features can use independent models.
- Multilingual & responsive: Whether you use Chinese or English, on mobile or desktop, you’ll get a great experience.
- Automatic podcasts: Enable automatic podcast generation/updates for documents/columns. Revornix will automatically generate podcast audio files, offering a more convenient way to consume information.
- Trending integration: Revornix embeds the [DailyHotApi](https://github.com/imsyy/DailyHotApi) service so you can view trending lists from major platforms in one place.
- Illustration generation: Leveraging powerful image-generation models such as Banana Pro, Revornix can generate high-quality images and embed them into documents/columns.

## Quick Start

> [!NOTE]
> We strongly recommend using conda to create different Python virtual environments for each service because Python dependencies may conflict across services. If you prefer another virtual environment manager, feel free to use it.

### Clone the repository locally

```shell
git clone git@github.com:Qingyon-AI/Revornix.git
cd Revornix
```

### Install and start the base services

> [!NOTE]
> If you haven’t installed postgres, redis, neo4j, minio, milvus, rsshub, or browserless, you need to install them manually and configure environment variables based on your needs. Refer to each service’s requirements and the [Revornix environment variables](https://revornix.com/docs/environment).
> 
> To avoid that busywork, we provide `docker-compose-local.yaml` and `.env.local.example`. You can use `docker-compose-local.yaml` to pull these services and `.env.local.example` as the environment configuration.

> [!WARNING]
> If some of these services are already installed locally, disable the corresponding services in `docker-compose-local.yaml` according to your setup to prevent unexpected issues.

Copy the example file provided, then adjust fields as needed with the [Revornix environment variables](https://revornix.com/docs/environment). If you have no special requirements, you typically only need to change the `OAUTH_SECRET_KEY` field.

```shell
cp .env.local.example .env.local
```

Start postgres, redis, neo4j, minio, milvus, rsshub, and browserless.

```shell
docker compose -f ./docker-compose-local.yaml --env-file .env.local up -d
```

### Environment variables for each microservice

```shell
cp ./web/.env.example ./web/.env
cp ./api/.env.example ./api/.env
cp ./celery-worker/.env.example ./celery-worker/.env
```

Configure the corresponding environment variable files. See the [Revornix environment variables](https://revornix.com/docs/environment) for details.

> [!WARNING]
> If you use manual deployment, the `SECRET_KEY` must stay consistent across services; otherwise, user authentication won’t work across services.

### Initialize the necessary data

```shell
cd api
python -m data.milvus.create
python -m data.sql.create
```

### Start the core backend service

```shell
cd api
conda create -n api python=3.11 -y
pip install -r ./requirements.txt
fastapi run --port 8001
```

### Start the trending aggregation service

```shell
cd hot-news
pnpm build
pnpm start
```

### Start the Celery task queue

```shell
cd celery-worker
conda create -n celery-worker python=3.11 -y
pip install -r ./requirements.txt
celery -A common.celery.app worker --pool=threads --concurrency=10 --loglevel=info -E
```

### Start the frontend service

```shell
cd web
pnpm build
pnpm start
```

After all services are running, visit http://localhost:3000 to view the frontend.

## Contributors

<a href="https://github.com/Qingyon-AI/Revornix/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Qingyon-AI/Revornix" />
</a>
