# Revornix API

The core backend of Revornix. Every request the web client (or any third-party integration) makes about documents, sections, users, AI, plans, or admin operations ends up here. It owns authentication, persistent state, and orchestrates the AI / background workflows by enqueuing tasks for `worker/`.

If you treat Revornix as a layered system, this is the layer that knows *what is true* — the database is its memory and Milvus / Neo4j are its long-term knowledge stores.

## Tech stack

- **FastAPI** for HTTP, with async SQLAlchemy 2 against Postgres.
- **Alembic** for schema migrations.
- **Milvus** for vector retrieval, **Neo4j** for the personal knowledge graph, **MinIO** (or any S3-compatible store) for files, **Redis** as cache + Celery broker.
- **Pydantic v2** for all request / response models.
- **APScheduler** for periodic in-process jobs; **Celery** (the worker lives in `worker/`) for heavy or long-running tasks.
- Auth: JWT (HS256) over Bearer tokens, paired with rotating refresh tokens.

## What's inside

```text
api/
├── main.py         # FastAPI entrypoint
├── router/         # HTTP routes grouped by domain
├── mcp_router/     # MCP server endpoints (Model Context Protocol)
├── scripts/        # export_openapi and one-off maintenance scripts
└── tests/          # pytest suite
```

Everything else — models, crud, schemas, enums, common, data, engines,
notification channels, file adapters, proxies, prompts — lives in `app/` at the
repo root. `app/`, `api/` and `worker/` are members of one **uv workspace**, so
`app/` is installed here in editable mode automatically — one copy, shared with
`worker/`, exposed as top-level packages so `from crud.document import ...`
reads unchanged.


## Running locally

```bash
# From the REPO ROOT, not from api/. One uv.lock, one .venv, both services.
# uv rather than conda: conda's strength is non-Python dependencies (CUDA, MKL), and
# torch is optional here now — the default configuration uses cloud embedding — so that
# strength does not apply. Cold-cache install of the same dependency set measured 32s
# with uv against 242s with pip, and uv fetches the matching Python itself.
uv sync --all-packages

# Local embedding (optional, ~1.3 GB of torch) — not needed with cloud embedding.
# Keep --all-packages: uv sync makes the venv *equal* the selected packages' deps, so
# --package revornix-api would install torch and uninstall what only worker/ needs.
# uv sync --all-packages --extra local-embedding

# Configure env — see https://revornix.com/docs/environment
cp .env.example .env

# Nothing to initialise: startup creates tables, applies column migrations,
# seeds built-in data and ensures the Milvus collection exists.

# Dev server. --directory is not optional: BASE_DIR (where logs go) and
# load_dotenv(usecwd=True) (which .env is read) both resolve from the working
# directory, and the repo root holds a *different* .env.
uv run --directory api fastapi run main.py --port 8001
```

Before starting, make sure Postgres, Redis, Neo4j, MinIO and Milvus are running. The repo root ships `docker-compose-local.yaml` for exactly this.

## A few conventions worth knowing

These are easy to get wrong if you're touching the codebase for the first time:

- **CRUD never commits.** All `crud/*` functions stage changes; the route handler is responsible for the final `await db.commit()`. This keeps transactions composable across multiple CRUD calls within one request.
- **`OAUTH_SECRET_KEY` must be identical** between `api/` and `worker/`. The worker verifies user identity from JWTs the API issued; mismatched keys break that trust chain silently.
- **Optional vs required auth.** `get_current_user` rejects with 401 when credentials are missing or invalid. `get_current_user_without_throw` returns `None` only when **no** `Authorization` header is sent; any *invalid* token raises 401 so the client can refresh-and-retry. Don't reach for the optional variant just to "silently fall back to anonymous" — that hides token failures.
- **Soft deletes**: most tables use a soft-delete flag; respect it in CRUD filters.
- **`uv run --directory api python -m scripts.export_openapi --check` is the cheapest whole-app smoke
  test there is:** it imports every router to build the spec, so an import that breaks anywhere fails it.
  It also caught the one bug this arrangement makes possible — module-level side effects leaking across
  services. `app/common/celery/app.py` initialised Sentry and OTel at import time, which was harmless while
  api had its own client-only copy of that module; after the merge api imports the real one (it enqueues
  tasks by name) and was initialising the *worker's* tracing too. The visible symptom was this check going
  from seconds to minutes. Worker-side setup now hangs off the `worker_init` signal.
- **`./scripts/check-all.sh` runs what CI runs**, locally, so a red build is not the first time you hear about it. Services whose dependencies aren't installed are skipped rather than failed — nobody has torch, a Go toolchain and three node_modules trees on one machine. Pass names to narrow it: `./scripts/check-all.sh web api`.
- **Integration tests are separate on purpose.** `worker/tests_integration/` connects to real Postgres, Neo4j and Milvus and takes about a hundred seconds; the fast suite takes 1.3 and touches nothing. Mixing them would mean every PR waits on containers, and container-backed tests flake — a build that goes red often enough gets re-run rather than read, and that habit would spread to the fast suite too. So they live in their own workflow (manual and nightly, never on push), and `./scripts/check-all.sh` only runs them when you name them: `./scripts/check-all.sh integration`, after `docker compose -f worker/tests_integration/docker-compose.yaml up -d --wait`.
- **What they actually guard is re-execution.** `task_acks_late` means a task can run twice, so writing twice has to equal writing once. That assumption was wrong when it was first checked: `upsert_milvus` called `milvus_client.insert`, which does not deduplicate on primary key, so retries quietly accumulated duplicate vectors. A primary-key query returns one row either way, which is why nothing noticed. The same suite also just imports the worker's entry modules, because a mirrored file once depended on a symbol that only existed on the API side and the worker could not start at all.
- **There is one copy of the shared code, in `app/`.** Both services get it as a uv workspace member, installed editable, and it is exposed as *top-level* packages, so imports like `from enums.document import ...` are unchanged — extracting it touched none of the call sites. The two services used to keep separate copies policed by a byte-equality check; that guard is gone along with the duplication, because it could enforce that two files matched but not that both were usable, and a mirrored file importing a symbol only the API side defined once left the worker unable to start. `docs-internal/plan-one-codebase.md` records why the split ended.
- **Nobody touches the database by hand.** `data/sql/bootstrap.py` runs on every API startup and does three idempotent steps: `create_all` (tables), the `_migrate_*` chain in `data/sql/schema_guard.py` (columns and backfills on tables that already exist), then `seed_database` (built-in file systems, engines, notification sources/templates, root user). Fresh installs and upgrades both need nothing but starting the service. `python -m data.sql.create` still exists but only as a manual trigger for the same function.
- **Changing the schema, therefore:** add a column → add a `_migrate_*` and hook it into `run_schema_guard()`; add a table → add the model **and** list its module in `bootstrap._MODEL_MODULES` (`create_all` only builds tables it has seen); add a built-in engine/template → extend `seed_database`, keeping the existence check so re-running stays a no-op. Change the model only, and a fresh install works while everyone upgrading crashes on the missing column.
- **`create_all` runs in the API only**, even though there is now a single `app/models/` and the worker could in principle build the same tables. Table creation belongs to one service so that "who owns the schema" has an answer; the worker runs only the `_migrate_*` chain from its `worker_init` signal, and that chain is hard-coded DDL that skips tables which do not exist yet — so either service can start first. (The original reason was different and is gone: `worker/models/` used to be a *subset* of `api/models/`, so building tables from it would have produced a database missing whole tables.)
- (Alembic used to live here. Its migrations were never version-controlled: every deployment autogenerated its own chain with its own revision ids, so nothing could be shared and every install had to be migrated by hand. That is why it is gone.)

## Background work

Anything that takes more than a few hundred milliseconds is offloaded to `worker/`: document conversion, embedding, summarisation, graph building, podcast generation, illustration, notifications. The API enqueues tasks via Redis and reads results back through DB / WebSocket. See [`worker/README.md`](../worker/README.md) for the task surface.

In-process scheduled jobs (light, frequent ticks) live under `common/` and run via APScheduler at boot.

## Tests

```bash
pytest
```

Tests live under `tests/`. They focus on routes, CRUD, and auth flows.

## Learn more

End-user and integrator documentation is at <https://revornix.com/docs>. The `developer/` subtree there covers architecture, gateway deployment, and contribution flow.
