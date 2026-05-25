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
    registerOTel({
        serviceName: process.env.OTEL_SERVICE_NAME || 'revornix-web',
        // `@vercel/otel` auto-wires fetch + Node.js instrumentation; we add
        // manual spans on top for the SSR request paths.
    });
};
