# Revornix Hot News

`hot-news/` is the trending-topic aggregation service used by Revornix dashboard and public hot-search pages. It is based on [DailyHotApi](https://github.com/imsyy/DailyHotApi), with local configuration and startup kept inside this monorepo so the web client can consume one predictable hot-list API.

The service is intentionally separate from `api/`: trending data is public, cache-heavy, and does not need the main Revornix database. The frontend reaches it through `NEXT_PUBLIC_HOT_NEWS_API_PREFIX`, or through `gateway/` when a unified public entrypoint is enabled.

## What it does

- Exposes one route per source, such as `/weibo`, `/zhihu`, `/bilibili`, `/github`, `/hackernews`, `/producthunt`, `/v2ex`, `/nytimes`, and more.
- Exposes `/all` so callers can discover the available source routes.
- Supports JSON by default and RSS when `?rss=true` or `RSS_MODE=true`.
- Supports `?limit=10` to cap returned items and `?cache=false` to bypass cache for a request.
- Uses in-memory cache first, with Redis as an optional shared cache when reachable.
- Serves `/robots.txt` and static assets through Hono middleware.

## Tech stack

- **Hono** on Node.js for the HTTP server.
- **TypeScript** compiled to `dist/`.
- **NodeCache** for local in-process cache.
- **Redis** through `ioredis` when configured and available.
- **Cheerio / axios / rss-parser** for source-specific scraping and feed parsing.

## What's inside

```text
hot-news/
├── src/
│   ├── index.ts          # Server entrypoint
│   ├── app.tsx           # Hono app, middleware, home page, robots, errors
│   ├── registry.ts       # Auto-registers source routes from src/routes
│   ├── routes/           # One source adapter per hot-list route
│   ├── utils/            # Cache, fetching, RSS, logging helpers
│   └── views/            # Minimal HTML status pages
├── dist/                 # Built output
├── package.json
└── README.md
```

## Running locally

```bash
pnpm install
pnpm build
pnpm start
```

By default the service listens on `PORT=6688`.

For development with file watching:

```bash
pnpm dev
```

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `6688` | HTTP port |
| `CACHE_TTL` | `3600` | Cache TTL in seconds |
| `REQUEST_TIMEOUT` | `6000` | Upstream request timeout in milliseconds |
| `ALLOWED_DOMAIN` | `*` | CORS fallback origin |
| `ALLOWED_HOST` | `imsyy.top` | CORS same-host suffix allow rule |
| `DISALLOW_ROBOT` | `true` | Return `Disallow: /` from `/robots.txt` |
| `RSS_MODE` | `false` | Return RSS for all source routes |
| `USE_LOG_FILE` | `true` | Enable file logging |
| `REDIS_HOST` | `localhost` | Optional Redis host |
| `REDIS_PORT` | `6379` | Optional Redis port |
| `REDIS_PASSWORD` | empty | Optional Redis password |

## Revornix integration points

- Private workspace route: `/dashboard/hot-search`
- Public SEO route: `/hot-search`
- Frontend env: `NEXT_PUBLIC_HOT_NEWS_API_PREFIX`
- Gateway upstream env: `GATEWAY_HOT_NEWS_UPSTREAMS`

When `gateway/` is enabled, the web client can point hot-news traffic at the gateway instead of this service directly.

## Upstream attribution

This service is derived from [imsyy/DailyHotApi](https://github.com/imsyy/DailyHotApi). Keep source-specific route behavior, disclaimers, and upstream terms in mind when adding or changing providers.
