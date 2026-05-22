# Revornix Docs Site

This is the source of <https://revornix.com> — the marketing landing page, product docs, and release blog. It is a separate Next.js application that ships independently of the main product, so the docs can be deployed and rolled back without touching the live workspace.

Treat the content under `src/content/` as the canonical documentation: README files inside individual services give you a sense of *what* a service is, but anything user-facing (how to use a feature, how to configure an engine, what a screen does) belongs here.

## Tech stack

- **Next.js 15** App Router.
- **Nextra** for documentation layout (sidebar, search, theming, MDX rendering).
- **Tailwind CSS** + `shadcn/ui` for the marketing pages.
- **next-intl** for `en` / `zh` switching at the URL level (`/en/...`, `/zh/...`).
- **Pagefind** for static search index generation after production builds.

## What's inside

```text
docs/
├── messages/             # next-intl bundles (en, zh)
├── public/               # Static assets — diagrams, logos, screenshots
└── src/
    ├── app/
    │   └── [lang]/        # Localised routing (en, zh); MDX is rendered through [[...mdxPath]]/page.tsx
    ├── components/        # Hero, features, growth-path, system-ecosystem, pricing, ...
    └── content/
        ├── en/            # English content
        │   ├── index.mdx      # Landing
        │   ├── pricing.mdx    # Pricing
        │   ├── blogs/         # Release notes (v0.0.1 → v0.8.x) + background.mdx
        │   └── docs/          # Product documentation tree (see below)
        └── zh/            # Chinese content (parallel structure)
```

The `docs/` content tree mirrors what users browse on the site:

| Section | What it covers |
|---|---|
| `start.mdx` | Quick start for self-hosting |
| `workspace/` | Account, dashboard, admin console, notifications, user profile |
| `documents/` | Document collection, management, GraphRAG, podcast, website snapshot |
| `sections/` | Section creation, info, share, day-section, section PPT |
| `ai/` | Engines, custom models, hot-search, MCP, Revornix AI |
| `integrations/` | Public API, Python SDK, custom file systems, OpenClaw skill |
| `developer/` | Architecture (`structure`), gateway, contribution guide |
| `environment.mdx` | All environment variables explained |
| `flow.mdx` | Workflow diagram of the platform |
| `tos.mdx`, `privacy.mdx` | Legal |
| `question.mdx` | FAQ |
| `contact.mdx` | Contact info |

## Running locally

```bash
pnpm install

# Dev server (default port 3000; change if collides with web/)
pnpm dev

# Production build
pnpm build
pnpm start
```

Nextra picks up any `.mdx` file under `src/content/{lang}/...` automatically. The sidebar order is controlled by `_meta.tsx` files in each directory — edit those to rename or reorder entries.

## Writing a new doc page

1. Decide which `_meta.tsx` it belongs in (English: `src/content/en/docs/<area>/_meta.tsx`).
2. Add the file (e.g. `feature-x.mdx`).
3. Add a matching key to `_meta.tsx` for the title and ordering.
4. Mirror the file under `src/content/zh/docs/<area>/feature-x.mdx` for the Chinese version. If the translation isn't ready, copy the English content as a placeholder rather than leaving a 404.
5. Use the shared Nextra components — `<Callout>`, `<Steps>`, `<Tabs>` — for consistent styling.

## Conventions worth knowing

- **Blogs are release notes.** Each `vX.Y.Z.mdx` covers one release. Keep them factual and bullet-point heavy; long prose belongs in `docs/`.
- **Don't import code from `web/` or other services.** This project is intentionally standalone so docs can be deployed by themselves.
- **Asset URLs**: production screenshots live on OSS (`qingyon-revornix-public.oss-cn-beijing.aliyuncs.com`). Use the OSS path when an image needs to stay reachable from anywhere; use `public/` only for diagrams shipped with the site.

## Learn more

Read the live docs at <https://revornix.com/docs>. The repository's root [`README.md`](../README.md) explains how the docs site relates to the rest of Revornix.
