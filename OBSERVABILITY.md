# Observability Stack

Revornix ships traces (OTel), errors (Sentry) and structured JSON logs
(stdout) from all three runtimes — `web`, `api`, `celery-worker`. They share a
single `trace_id`, so a customer report can be followed from the browser
response header all the way down to a Cypher query in Neo4j.

This doc covers **trace backend setup** only. Sentry / logging are configured
via the per-service `.env` (`*_SENTRY_DSN`, `API_REQUEST_LOG`,
`WORKER_LOG_FORMAT`, …).

## Trace Backend: SigNoz (recommended)

SigNoz is an OTLP-native open-source APM. It runs separately from this
repo's `docker-compose-local.yaml` so the rest of the stack stays lean.

### 1. Install

```bash
cd ~/Developer    # any sibling directory works
git clone -b main https://github.com/SigNoz/signoz.git
cd signoz/deploy/docker
docker compose up -d
```

Wait ~2 minutes for ClickHouse / query-service / frontend to become healthy:

```bash
docker compose ps
```

### 2. Sanity check

```bash
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" -d '{}'
# Expect HTTP 4xx — SigNoz collector is up and parsing.
```

### 3. Boot the apps

No env changes needed: each service already points at
`OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318` (see
`api/.env.example`, `celery-worker/.env.example`, `web/.env.example`).

```bash
# api
cd api && fastapi run --port 8001

# worker
cd celery-worker && ./start-worker.sh

# web
cd web && pnpm dev
```

Each service logs `event=otel_tracing_initialized ...` on startup. After
~10 s of traffic, three services appear in SigNoz:

- `revornix-web`
- `revornix-api`
- `revornix-worker`

### 4. Open the UI

http://localhost:8080 — register a local account (data stays on your
machine).

Key pages:

| Page | What it's for |
|---|---|
| Services | Auto-detected service list with QPS / p99 / error rate |
| Traces | Search by service, operation, duration, attributes |
| Service Map | Auto-drawn topology between services |
| Dashboards | Drag-build charts; ships with FastAPI / Celery templates |
| Alerts | Rule-based alerting (Slack / Webhook / Email) |

## Switching Backend

Any OTLP/HTTP collector works — only `OTEL_EXPORTER_OTLP_ENDPOINT` and
optional `OTEL_EXPORTER_OTLP_HEADERS` need to change per `.env`.

Examples:

```env
# Honeycomb (SaaS, free tier)
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io
OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=<api-key>

# Grafana Cloud Traces
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-...grafana.net/otlp
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic <base64-token>

# Local Jaeger (legacy, ugly UI but minimal footprint)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
# Run: docker run -p16686:16686 -p4318:4318 -e COLLECTOR_OTLP_ENABLED=true \
#        jaegertracing/all-in-one:latest
```

## Disabling Observability

```env
OTEL_SDK_DISABLED=true        # all three services
API_REQUEST_LOG=off           # api access log
WORKER_LOG_FORMAT=text        # worker: revert JSON → key=value
API_SENTRY_ENABLE=false       # api Sentry
WORKER_SENTRY_ENABLE=false    # worker Sentry
```

## Logs

Each service emits one-line JSON to stdout, identical schema across tiers,
all carrying `trace_id`:

```bash
# Follow live
tail -f api/logs/info.log celery-worker/logs/info.log | jq -c

# Cross-service grep by trace
TRACE_ID=4bf92f3577b34da6a3ce929d0e0e4736
grep "$TRACE_ID" api/logs/info.log celery-worker/logs/info.log | sort
```

## Sentry × OTel

Sentry runs alongside OTel as the dedicated error tracker. Each issue
carries the matching OTel `trace_id` as a tag, so the Sentry → SigNoz pivot
is one copy-paste:

1. Open a Sentry issue.
2. Copy `tags.otel.trace_id`.
3. Paste into SigNoz top search.
4. Land on the exact failing trace's flame chart.
