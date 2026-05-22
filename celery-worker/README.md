# Revornix Celery Worker

Heavy lifting lives here. When a user uploads a PDF, asks for an AI summary, or expects a podcast version of an article, the API doesn't do that work itself — it enqueues a task, returns immediately, and this worker picks the task up, runs it, and writes the result back. The user sees a "processing" card in the UI, then "done", because of this service.

It is a long-running process you start once and keep alive. It scales by running more workers, not by making one worker bigger.

## What it actually does

Tasks are organized as workflows under `workflow/`. Each workflow is a self-contained pipeline triggered by the API:

- **Document conversion** — turn PDFs / Word / web pages / audio into clean Markdown using a pluggable engine (MinerU, Jina, custom).
- **Document embedding** — chunk content and write vectors to Milvus.
- **Document summarisation** — call the configured LLM to produce a summary.
- **Document tagging** — auto-pick tags from the user's tag list based on content.
- **Document transcription** — speech-to-text for audio documents.
- **Document graph build** — extract entities/relations and populate Neo4j.
- **Document chunk processing** — chunk-level downstream operations.
- **Document podcast** — turn a document into a two-voice podcast.
- **Section podcast / PPT** — similar but at the section (collection) level.
- **Process status / cancellation** — keep the per-task progress card honest, support user-initiated cancellations.

In-process periodic jobs (notification dispatch, cache warming, etc.) are scheduled by APScheduler at startup.

## Tech stack

- **Celery** (Redis broker + result backend) for the task queue.
- **APScheduler** for in-process periodic jobs.
- **Playwright** for headless page rendering during web document conversion.
- Same SQLAlchemy / Milvus / Neo4j / MinIO clients as `api/`.

## What's inside

```text
celery-worker/
├── start-worker.sh        # Entrypoint: `celery -A common.celery.app worker ...`
├── workflow/              # One file per pipeline (see list above)
├── engine/                # Pluggable parsing / AI engines
├── file/                  # File-system adapters (local, S3, MinIO, ...)
├── notification/          # Channels (email, WS, push, ...)
├── proxy/                 # Outbound HTTP proxy management
├── prompts/               # LLM prompt templates
├── crud/, models/, schemas/, enums/   # Same shape as api/, mirrored
├── common/                # Celery app, DB session, shared deps
├── config/                # Settings & env loading
├── base_implement/        # Abstract base classes for engine plugins
├── data/                  # Bootstrap scripts mirrored from api/
└── protocol/              # Wire formats and contracts
```

## Running locally

```bash
# Isolated env (mirrors api/ — they often diverge in deps over time)
conda create -n revornix-worker python=3.11 -y
conda activate revornix-worker

pip install -r requirements.txt

# Playwright browsers (required for web-page conversion)
playwright install

# Configure env — see https://revornix.com/docs/environment
cp .env.example .env

# Start the worker (default: --pool=threads --concurrency=20 --loglevel=info -E)
./start-worker.sh
```

You can override Celery flags by passing them to `start-worker.sh`:

```bash
./start-worker.sh --concurrency=4 --loglevel=debug
```

Make sure `api/` is reachable (or at least the shared dependencies — Redis, Postgres, Milvus, Neo4j, MinIO — are up). Workers without the API still process tasks, but the API is where new tasks come from.

## Conventions worth knowing

- **`OAUTH_SECRET_KEY` must match `api/`.** The worker decodes the same JWTs the API issued; mismatched secrets cause silent permission failures.
- **Don't import API code directly.** Models, CRUD, and enums are duplicated on purpose so the services deploy independently. When you change shared shapes (notification, enum, proxy), mirror the edit on both sides.
- **Workflows are idempotent where possible.** Each accepts a task id and writes status back through the DB; reruns should converge rather than corrupt.
- **Cancellations**: see `workflow/cancelled.py`. User-cancelled tasks short-circuit rather than racing to completion.

## Tuning

- `--pool=threads` is the default because most tasks are I/O-bound (HTTP calls to model providers, Playwright, S3). For CPU-bound work add a separate worker with `--pool=prefork`.
- Concurrency is set with `--concurrency=N`. Start with 4–20 and watch upstream rate limits before climbing higher.

## Learn more

The pipelines map one-to-one onto user-visible features. See <https://revornix.com/docs/documents> and <https://revornix.com/docs/sections> for what each pipeline produces, and the developer docs for architecture.
