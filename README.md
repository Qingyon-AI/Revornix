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

Revornix is an open-source, local-first AI information workspace. Save the noisy stream of links, papers, audio and screenshots you can't keep up with, and let the platform turn them into structured knowledge, generate reports and podcasts you can actually consume, and deliver the result through notifications when you're ready.

The whole stack — web client, gateway, API, async workers, trending feed, docs site — is open and self-hostable.

## Links

- Official site: <https://revornix.com>
- Live workspace: <https://app.revornix.com>
- Documentation: <https://revornix.com/docs>
- Environment variables: <https://revornix.com/docs/environment>
- Roadmap: [Notion roadmap](https://huaqinda.notion.site/RoadMap-224bbdbfa03380fabd7beda0b0337ea3)
- Community: [Discord](https://discord.com/invite/3XZfz84aPN) · [WeChat](https://github.com/Qingyon-AI/Revornix/discussions/1#discussioncomment-13638435) · [QQ](https://github.com/Qingyon-AI/Revornix/discussions/1#discussioncomment-13638435)

## Why Revornix

- **One pipeline for noisy information** — ingestion → conversion → summary → graph → podcast → notification, all in one place.
- **Built for AI retrieval quality** — chunked vector storage in Milvus paired with a personalized GraphRAG layer on Neo4j.
- **Open and controllable** — runs entirely on your own infrastructure. Your documents, your database, your keys.
- **Model-flexible** — any OpenAI-compatible provider can be wired in, and engines for parsing, embedding, summarising, podcasting and illustration can be swapped independently.
- **Collaboration-ready** — share knowledge sections privately with a team or publish them to the open web.
- **Public discovery** — published documents, sections, creators, labels and trending topics get SEO-friendly pages out of the box.

## How it works

1. **Collect** — drop in web pages, PDFs, Word, Excel, PPT, plain text, audio, or automate ingestion through the public API, Python SDK / CLI, or OpenClaw skill.
2. **Understand** — pluggable converters (MinerU, Jina, custom engines) clean and normalise the content into Markdown.
3. **Organise** — chunks are embedded into Milvus; entities and relations are written to a per-user Neo4j graph; tags are auto-assigned.
4. **Deliver** — AI-generated summaries, illustrated reports, two-voice podcasts and notifications reach you on your schedule.

## Project structure

```text
Revornix/
├── web/                       # Next.js client (workspace + SEO pages) — see web/README.md
├── api/                       # FastAPI core backend (auth, documents, sections, AI) — see api/README.md
├── celery-worker/             # Async workflows (embedding, summary, graph, podcast, notifications)
├── gateway/                   # Go public-entry gateway (routing, anti-scraping, upstream failover)
├── hot-news/                  # Trending aggregation service (based on DailyHotApi)
├── docs/                      # Public docs site (revornix.com/docs) — separate Next.js + Nextra
├── desktop/                   # Planned desktop app (Tauri/Electron) — placeholder for now
├── assets/                    # Repo-level images and brand assets
└── docker-compose-local.yaml  # Local dependency bootstrap (Postgres, Redis, Neo4j, MinIO, Milvus)
```

Each subdirectory has its own README with the details specific to that service.

## Core capabilities

A short tour of what the platform actually does today. For step-by-step walkthroughs and screenshots, see the [docs site](https://revornix.com/docs).

- **Multi-format ingestion** — web pages, PDF, Word, Excel, PPT, plain text, audio, and structured data through the public API.
- **Pluggable converters** — pick a default engine (MinerU, Jina, custom) per workspace; mix engines per document type if needed.
- **Vector retrieval + GraphRAG** — every document is chunked into Milvus and projected onto a personal knowledge graph in Neo4j for context-aware AI answers.
- **Global search** — vector or text mode over your private library, plus a separate public surface for published documents, sections, creators and labels.
- **Sections** — curated collections that can stay private, be shared with collaborators, or be published to the community feed.
- **Day sections** — automatic daily digests that gather what you saved into a single readable section.
- **AI assistant (Revornix AI)** — chat that grounds on your documents and the personal graph.
- **MCP** — both MCP client (the workspace can drive external MCP servers) and MCP server (your library is exposed to MCP-aware tools).
- **Auto podcast** — two-voice podcast versions of documents and sections, regeneratable when content changes.
- **AI illustrations** — inline figures generated and embedded into long-form content.
- **Trending feed** — aggregated hot-search across mainstream platforms via the bundled `hot-news/`.
- **Rich Markdown reading & editing** — Tiptap-based editor with tables, Mermaid, math, images, and a floating table of contents on long public pages.
- **Notifications** — pick channels (email, in-app, push) and let the system surface task completion or scheduled digests.
- **Multilingual & responsive** — English / Chinese product UI, plus English / Chinese / Japanese repository docs; mobile and desktop layouts.
- **Layered protection** — `gateway/` blocks obvious scraping at the edge, `api/` rate-limits sensitive public endpoints.

## A few screens

A glimpse of the workspace and the public surfaces. The full walkthrough lives in the [docs](https://revornix.com/docs).

**Dashboard** — daily overview, AI suggestions, freshness signals.
![Dashboard](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260522164249535.png)

**Revornix AI** — chat grounded on your documents and personal graph.
![Revornix-AI](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260522172943460.png)

**Document detail** — Markdown reader, AI summary, podcast, knowledge graph and actions on one page.
![Document](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260522165240787.png)

**Personal knowledge graph** — entities and relations extracted from everything you've saved.
![Knowledge Graph](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260522170319488.png)

**Section** — curate a private or public collection of documents around a topic.
![Section](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260522172433090.png)

**Podcast** — turn a document or section into a two-voice audio episode.
![Podcast](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260522165744549.png)

**Public creator page** — SEO-friendly profile for your published work.
![User SEO](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260522173343696.png)

**Community** — browse what others have published.
![Community](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260522172513510.png)

**Trending headlines** — aggregated from major platforms via the bundled `hot-news/` service (based on [DailyHotApi](https://github.com/imsyy/DailyHotApi)).
![Hot-News](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260522174104765.png)

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
cp ./gateway/.env.example ./gateway/.env
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

### 6) Run gateway service

```shell
cd gateway
go run ./cmd/gateway
```

The gateway is optional for local development, but recommended for production. It handles public routing, failover, and the first layer of anti-scraping protection before traffic reaches `api/`.

### 7) Run trending aggregation service

```shell
cd hot-news
pnpm build
pnpm start
```

### 8) Run Celery worker

```shell
cd celery-worker
conda create -n celery-worker python=3.11 -y
pip install -r ./requirements.txt
playwright install
./start-worker.sh
```

### 9) Run frontend

```shell
cd web
pnpm build
pnpm start
```

After all services are running, open <http://localhost:3000>.

## Where to look next

- **Want to use the product?** Start at <https://revornix.com/docs/start>, then jump into the workspace at <https://app.revornix.com>.
- **Want to extend it?** Each service has its own README: [`web/`](./web/README.md), [`api/`](./api/README.md), [`celery-worker/`](./celery-worker/README.md), [`gateway/`](./gateway/README.md), [`docs/`](./docs/README.md).
- **Want to contribute docs?** Add an MDX file under [`docs/src/content/`](./docs/README.md).
- **Curious about the desktop app?** It's planned but not built yet — see [`desktop/`](./desktop/README.md).
- **Architecture deep dive?** <https://revornix.com/docs/developer/structure>.

## Contributors

<a href="https://github.com/Qingyon-AI/Revornix/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Qingyon-AI/Revornix" />
</a>
