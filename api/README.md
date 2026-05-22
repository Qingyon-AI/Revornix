# Revornix API

The core backend of Revornix. Every request the web client (or any third-party integration) makes about documents, sections, users, AI, plans, or admin operations ends up here. It owns authentication, persistent state, and orchestrates the AI / background workflows by enqueuing tasks for `celery-worker/`.

If you treat Revornix as a layered system, this is the layer that knows *what is true* — the database is its memory and Milvus / Neo4j are its long-term knowledge stores.

## Tech stack

- **FastAPI** for HTTP, with async SQLAlchemy 2 against Postgres.
- **Alembic** for schema migrations.
- **Milvus** for vector retrieval, **Neo4j** for the personal knowledge graph, **MinIO** (or any S3-compatible store) for files, **Redis** as cache + Celery broker.
- **Pydantic v2** for all request / response models.
- **APScheduler** for periodic in-process jobs; **Celery** (the worker lives in `celery-worker/`) for heavy or long-running tasks.
- Auth: JWT (HS256) over Bearer tokens, paired with rotating refresh tokens.

## What's inside

```text
api/
├── main.py                # FastAPI entrypoint
├── router/                # HTTP routes grouped by domain (documents, sections, users, ai, admin, ...)
├── mcp_router/            # MCP server endpoints (Model Context Protocol)
├── crud/                  # Database access (no commits inside crud; the route layer commits)
├── models/                # SQLAlchemy ORM models
├── schemas/               # Pydantic request/response schemas
├── common/                # Dependencies (auth, db session, rate limiting, logging)
├── engine/                # Pluggable AI / document engines
├── file/                  # File-system adapters (local, S3, MinIO, ...)
├── notification/          # Email / WebSocket / push / chat-platform channel implementations
├── proxy/                 # Outbound HTTP proxy management
├── prompts/               # System prompts for LLM calls
├── data/                  # One-shot bootstrap scripts (Milvus collections, baseline SQL data)
├── alembic/               # DB migrations
├── tests/                 # pytest suite
└── config/                # Settings & env loading
```

## Running locally

```bash
# Recommended: an isolated Python env per service
conda create -n revornix-api python=3.11 -y
conda activate revornix-api

pip install -r requirements.txt

# Configure env — see https://revornix.com/docs/environment
cp .env.example .env

# Bootstrap (only on a fresh database)
python -m data.milvus.create
python -m data.sql.create

# Dev server
fastapi run --port 8001
```

Before starting, make sure Postgres, Redis, Neo4j, MinIO and Milvus are running. The repo root ships `docker-compose-local.yaml` for exactly this.

## A few conventions worth knowing

These are easy to get wrong if you're touching the codebase for the first time:

- **CRUD never commits.** All `crud/*` functions stage changes; the route handler is responsible for the final `await db.commit()`. This keeps transactions composable across multiple CRUD calls within one request.
- **`OAUTH_SECRET_KEY` must be identical** between `api/` and `celery-worker/`. The worker verifies user identity from JWTs the API issued; mismatched keys break that trust chain silently.
- **Optional vs required auth.** `get_current_user` rejects with 401 when credentials are missing or invalid. `get_current_user_without_throw` returns `None` only when **no** `Authorization` header is sent; any *invalid* token raises 401 so the client can refresh-and-retry. Don't reach for the optional variant just to "silently fall back to anonymous" — that hides token failures.
- **Soft deletes**: most tables use a soft-delete flag; respect it in CRUD filters.

## Background work

Anything that takes more than a few hundred milliseconds is offloaded to `celery-worker/`: document conversion, embedding, summarisation, graph building, podcast generation, illustration, notifications. The API enqueues tasks via Redis and reads results back through DB / WebSocket. See [`celery-worker/README.md`](../celery-worker/README.md) for the task surface.

In-process scheduled jobs (light, frequent ticks) live under `common/` and run via APScheduler at boot.

## Tests

```bash
pytest
```

Tests live under `tests/`. They focus on routes, CRUD, and auth flows.

## Learn more

End-user and integrator documentation is at <https://revornix.com/docs>. The `developer/` subtree there covers architecture, gateway deployment, and contribution flow.
