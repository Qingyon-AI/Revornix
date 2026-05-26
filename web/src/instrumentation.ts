import { registerOTel } from '@vercel/otel';

/**
 * Next.js calls this once when the server boots (and on every Node.js worker
 * spawn). Spans created via `@opentelemetry/api` from inside server components,
 * route handlers, and our SSR fetch helpers all flow through the SDK
 * configured here.
 *
 * Set `OTEL_EXPORTER_OTLP_ENDPOINT` to point at any OTLP/HTTP-compatible
 * backend (Jaeger 1.50+, Tempo, Honeycomb, Grafana Cloud, SigNoz, ...). When
 * unset the SDK falls back to `http://localhost:4318/v1/traces`, matching the
 * default `docker-compose` Jaeger setup.
 */
export const register = async () => {
    if (process.env.NEXT_RUNTIME !== 'nodejs') {
        return;
    }
    // Why this opt-out: Next.js 16 + Turbopack dev mode generates an enormous
    // number of short-lived promises during React Server rendering. The
    // `@vercel/otel` SDK installs a Node async-hooks tracer that records every
    // promise in an internal Map, which quickly hits V8's ~16M-entry limit and
    // crashes the dev server with `RangeError: Map maximum size exceeded`. We
    // therefore skip OTel registration in dev unless the developer explicitly
    // opts in by setting `OTEL_ENABLED=true`.
    const isProduction = process.env.NODE_ENV === 'production';
    const explicitlyEnabled = process.env.OTEL_ENABLED === 'true';
    const explicitlyDisabled = process.env.OTEL_ENABLED === 'false';
    if (explicitlyDisabled) {
        return;
    }
    if (!isProduction && !explicitlyEnabled) {
        return;
    }
    const serviceName = process.env.OTEL_SERVICE_NAME || 'revornix-web';
    console.log(`registering instrumentation, ${serviceName}`);
    registerOTel({
        serviceName: serviceName,
        // `@vercel/otel` auto-wires fetch + Node.js instrumentation; we add
        // manual spans on top for the SSR request paths.
    });
};
