# Revornix Web

This directory hosts the Revornix web client — every screen a logged-in user sees, every public page a search engine crawls, and every SEO endpoint that exposes the platform to the open web. It is the surface area of the product. If you ever wondered "where is that button drawn?" or "how does that page load?", the answer is almost always here.

It is a standalone Next.js application and can run on its own once the supporting services (`api/`, `celery-worker/`, optionally `gateway/` and `hot-news/`) are reachable.

## Tech stack

A few choices are load-bearing, knowing them up front saves a lot of "why is this done this way?" questions later.

- **Next.js 16** with the App Router, built in `standalone` mode so production deployments don't need the whole repo.
- **React 19** with React Query for server-state, plus a small Zustand store for client-only state.
- **Tailwind CSS 4** + **shadcn/ui** + `lucide-react` for everything visible. Tailwind's arbitrary variant syntax is used heavily — when in doubt, prefer adding a real CSS rule over fighting the parser.
- **next-intl** for i18n. Translation strings live under `messages/{en,zh}.json`.
- **Tiptap 3** powers the Markdown editor and viewer, with several first-party extensions (placeholder, code block, math, mermaid, custom AI placeholders).
- **next-themes** for dark/light, **sonner** for toasts, **@tanstack/react-query** for caching, **lodash-es** + **date-fns** for the usual utilities.

## What's inside

```text
web/
├── messages/                 # i18n bundles (en, zh)
├── public/                   # static assets served as-is
└── src/
    ├── app/                  # App Router entry — see "Page map" below
    ├── components/           # Reusable UI; organized by domain (document/, section/, markdown/, ai/, ui/, seo/, ...)
    ├── service/              # Typed wrappers around backend APIs
    ├── provider/             # React context providers (user, theme, query client, ...)
    ├── hooks/                # Custom hooks
    ├── lib/                  # Cross-cutting helpers: request pipeline, markdown normalization, time, freshness, ...
    ├── enums/                # Mirrors of backend enum constants
    ├── store/                # Zustand stores
    ├── generated/            # Auto-generated API types/clients (don't hand-edit)
    └── config/               # Static config (theme tokens, routing maps, etc.)
```

### Page map

The App Router uses route groups to separate concerns. None of these names show up in URLs — they exist purely so the project doesn't sprawl.

- `(seo)` — public, indexable pages. Landing, public document/section/user detail, community feed, public hot-search.
- `(public)` — anonymous-only routes (login, register). Logged-in users are redirected away.
- `(private)` — the workspace. Requires login. Contains dashboards, documents, sections, AI tools, account, settings, social.
- `(admin)` — admin console. Same auth layer, additionally gated by admin role.
- `integrations/` — OAuth callback shells for GitHub, Google, WeChat (both "bind to existing user" and "create new user" flows).

Top-level workspace areas:

| Area | Routes | Purpose |
|---|---|---|
| Dashboard | `/dashboard`, `/dashboard/hot-search` | Daily overview and trending topics |
| Documents | `/document/create`, `/document/{mine,recent,star,unread}`, `/document/detail/[id]` | Personal knowledge base |
| Sections | `/section/{create,mine,subscribed,community}`, `/section/detail/[id]` | Curated collections, public and private |
| AI | `/revornix-ai`, `/graph` | Conversational AI and the personal knowledge graph |
| Account | `/account`, `/account/{apikey,notifications,plan}` | Profile, API keys, notification preferences, plan |
| Settings | `/setting/{engine,model,mcp,file-system,notification/...}` | Pluggable engines, models, MCP servers, file systems, notification channels |
| Social | `/user/detail/[id]`, `/user/{fans,follows}` | Public creator profiles and follow graph |

## Running locally

```bash
# Install deps
pnpm install

# Copy env (and edit) — see https://revornix.com/docs/environment
cp .env.example .env

# Development server with HMR
pnpm dev

# Production-style build + start
pnpm build
pnpm start
```

The app expects:

- `api/` running and reachable at `NEXT_PUBLIC_API_PREFIX`
- `hot-news/` reachable at `NEXT_PUBLIC_HOT_NEWS_API_PREFIX` (only used by the trending pages)
- A WebSocket endpoint at `NEXT_PUBLIC_NOTIFICATION_WS_API_PREFIX` for in-app notifications

If you put `gateway/` in front, all three URLs typically point at the gateway instead of the underlying services.

## Conventions worth knowing

A handful of design decisions reach across the codebase. Reading them once saves time debugging later.

- **Authentication**: cookies (`access_token` + `refresh_token`). The request pipeline in `src/lib/request.ts` transparently refreshes on 401 and retries the original call exactly once — see the inline comments for the loop-prevention guard.
- **i18n**: every user-visible string goes through `t(...)`. Adding a string means adding a key to **both** `messages/en.json` and `messages/zh.json`.
- **SEO routes**: pages under `(seo)` are server-rendered and statically friendly. They include their own metadata helpers (`buildMetadata` in `src/lib/seo-metadata.ts`).
- **Task cards** (AI summary, podcast, PPT, graph): all share a unified state convention — `wait_to → Hourglass + warning`, `processing → Loader2 + animate-spin + default`, `success / failed / cancelled → media icon + matching tone`. See `src/components/ui/sidebar-task-node.tsx`.
- **Freshness**: `src/lib/result-freshness.ts` decides when AI-generated outputs are "stale" relative to the source content; the UI displays a warning tone in that case.

## Learn more

Behaviour and screens are documented in detail at <https://revornix.com/docs>. When in doubt about how a feature should work end-to-end, that is the source of truth.
