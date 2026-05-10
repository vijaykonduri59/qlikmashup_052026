import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry for error and performance monitoring.
 *
 * Behavior:
 * - **Dev without DSN:** no-op (Sentry disabled, console works as fallback).
 * - **Dev with DSN:** Sentry active against the configured project (typically a sandbox).
 * - **Prod without DSN:** logs a warning; errors are not reported. (TODO: gate the prod build on DSN presence in CI.)
 * - **Prod with DSN:** Sentry active.
 *
 * Sample rate: 100% in dev, 10% in prod (per docs/15).
 *
 * Should be called BEFORE React renders so init catches startup errors.
 * See main.tsx — must be the first thing after imports.
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    if (import.meta.env.PROD) {
      // Intentional: surface missing DSN in prod builds.
      console.warn(
        '[observability] VITE_SENTRY_DSN not set in production build. Errors will not be reported to Sentry.',
      );
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    integrations: [Sentry.browserTracingIntegration()],
    // PII scrubbing — Sentry has reasonable defaults; we additionally strip
    // any header/cookie that looks auth-related.
    beforeSend(event) {
      if (event.request?.headers) {
        for (const key of Object.keys(event.request.headers)) {
          if (/auth|cookie|token|session/i.test(key)) {
            event.request.headers[key] = '[Filtered]';
          }
        }
      }
      return event;
    },
  });
}
