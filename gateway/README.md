# Revornix Gateway

`gateway/` is the unified public-entry gateway for split-region Revornix deployments.

This Go service is intended for setups where:

- the main product services run in mainland China
- Google / GitHub OAuth needs an overseas API
- `union-pay` should still sit behind the same public gateway
- the public product should expose one stable set of domains or path prefixes

## What it does

- Proxies HTTP traffic
- Proxies WebSocket upgrades
- Routes Google / GitHub create and bind requests to the overseas auth API
- Routes normal product API traffic to the domestic main API
- Routes `union-pay` traffic to the Java payment service
- Routes hot-news traffic to the hot-news service
- Blocks obvious scraping user agents and rate-limits high-risk public API paths
- Does not proxy web app traffic (both local and production)
- Supports multiple upstreams per service with cooldown after failure
- Exposes local gateway inspection endpoints

## Health and inspection endpoints

- `/gateway/health`
- `/gateway/routes`
- `/gateway/upstreams`

## Local run

```bash
cp .env.example .env
go run ./cmd/gateway
```

The gateway listens on `PORT`, which defaults to `8787`.
