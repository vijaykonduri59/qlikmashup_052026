# Logging & Observability

_Last updated: 2026-05-07_

> When something breaks for 1 of 300 users in production, how do we know? Observability is the system that answers that. We use Sentry as the spine, with custom breadcrumbs for Qlik-specific events.

---

## 1. What is it?

Three overlapping concerns:

| Concern                    | Question it answers                          | Tool                                                     |
| -------------------------- | -------------------------------------------- | -------------------------------------------------------- |
| **Error tracking**         | What broke and where?                        | **Sentry** (errors with stack traces + user context)     |
| **Performance monitoring** | What's slow? Where's the bottleneck?         | **Sentry Performance** (Web Vitals, custom transactions) |
| **Logging** (lightweight)  | What did the app do leading up to the error? | Sentry **breadcrumbs** + browser console in dev          |

We do **NOT** add separate analytics or A/B testing tools in v1. If user-behavior insight becomes valuable later, that's a v2 conversation.

## 2. Why we use it (in this project)

At 300 users, manual monitoring is impossible. Without observability, your only signals are:

- A user emails you (slow, sampled, late)
- You happen to load the mashup yourself (random)
- The Qlik admin notices something (out-of-band, indirect)

All bad. With Sentry, you know about every error every user hits, in real time.

## 3. How it works

### Sentry initialization

```ts
// src/main.tsx — runs BEFORE React renders
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.reactRouterV6BrowserTracingIntegration({
      /* ... */
    }),
  ],
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD,
});
```

What this captures automatically:

- Unhandled exceptions
- Unhandled promise rejections
- React render errors (via Sentry-aware ErrorBoundary)
- Page loads + route transitions (Performance Monitoring)
- Web Vitals (LCP, FCP, CLS, INP)

What we add manually:

- Custom transactions wrapping engine calls (`app-open`, `sheet-render`, `export-data`)
- Breadcrumbs for Qlik-specific events

### Custom breadcrumbs for Qlik

Every Qlik-related event gets a breadcrumb so error traces have context:

```ts
import { qlikBreadcrumb } from '@/lib/observability/breadcrumbs';

qlikBreadcrumb({
  category: 'qlik.app',
  message: 'open',
  data: { appId, durationMs: 1240 },
});
```

Breadcrumbs we emit:

- Engine session: `opened` / `closed` / `suspended` / `resumed`
- App handle: `opened` / `closed` / `warm` / `evicted`
- Sheet: `rendered`
- Selection: `made` (compact form, never raw values — see Privacy below)
- Export: `started` / `completed`

### What we DO NOT log

- **No PII** (email, names, sensitive selection values)
- **No raw hypercube data** (could contain sensitive figures)
- **No auth tokens or session cookies** (Sentry has automatic scrubbing — but be defensive)
- **No `console.log` spam in production** — only meaningful events through breadcrumbs

### Dev vs production

| Environment | Sentry                        | Console            |
| ----------- | ----------------------------- | ------------------ |
| Development | Disabled (or sandbox project) | Full debug logging |
| Production  | Enabled, live project         | Errors only        |

### Source maps

Production builds upload source maps to Sentry so stack traces show real source code, not minified gibberish. Done in CI:

```yaml
- name: Upload source maps to Sentry
  uses: getsentry/action-release@v1
```

### Performance budget alerts

| Alert                                | Condition      | Severity                         |
| ------------------------------------ | -------------- | -------------------------------- |
| LCP > 4s on > 5% of sessions         | Hourly window  | High                             |
| Engine `OpenDoc` p95 > 5s for 1 hour | Sliding window | High; possibly Qlik server issue |
| Error rate > 1% of sessions          | Hourly         | Critical                         |
| Sentry quota at 80%                  | Daily          | Medium; investigate noisy errors |

### Privacy & retention

- Sentry free tier retention: 30 days
- We use Sentry's automatic PII scrubbing (cookies, common form-field patterns)
- Personal account context: Sentry is GDPR-friendly; we own our data and can purge anytime
- DSN stored only as a build-time env var (`VITE_SENTRY_DSN`), not in code

## 4. Pros

- **Free tier covers our scale** — 5K errors/month + 10K perf events
- **Stack traces with real source code** in production via source maps
- **Web Vitals built-in** — LCP, CLS, INP captured automatically
- **Source-of-truth for "is it broken right now"**
- **Breadcrumbs make debugging real** — you see what happened just before the error
- **React-aware** — error boundaries integrate cleanly
- **Industry standard** — easy to recognize, easy to find help

## 5. Cons

- **Free tier limits** — 5K errors/month sounds like a lot until a single bug fires 50× per minute. Need quota alerts.
- **Vendor dependency** — locked into Sentry's data model and pricing
- **Privacy review may be needed** — sending data to a 3rd-party SaaS can be a corporate question (less so for personal)
- **Configuration complexity** — getting source maps + sample rates + integrations right is a real task
- **Breadcrumbs can leak data** if developers aren't careful with `data` payloads

## 6. Alternatives we considered

| Option                                                    | Why we didn't pick it                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------ |
| **Self-hosted GlitchTip** (open-source Sentry-compatible) | Adds ops burden; Sentry's free tier is plenty                      |
| **PostHog**                                               | Strong on product analytics; weaker as the primary error/perf tool |
| **Datadog RUM**                                           | More expensive; more powerful than we need                         |
| **Custom logging endpoint** (Cloudflare Worker, etc.)     | DIY appeal but no ready dashboards, no stack-trace symbolication   |
| **No observability**                                      | At 300 users, this is reckless                                     |

## 7. What this means for our project

Folder structure:

```
src/
  lib/
    observability/
      sentry.ts                ← Sentry.init wrapper, env-aware
      breadcrumbs.ts           ← typed helpers (qlikBreadcrumb, navigationBreadcrumb)
      transactions.ts          ← Sentry custom-transaction wrappers
```

Conventions:

- **Sentry initializes BEFORE React renders** (top of `main.tsx`)
- **Every long-running engine call** gets a custom Sentry transaction wrapping it
- **Every error category** is tagged so we can filter (`error.category=auth` etc.) — see [docs/13-error-handling-and-resilience.md](13-error-handling-and-resilience.md)
- **No `console.log` in production code** — use breadcrumbs or remove
- **`VITE_SENTRY_DSN`** is a required prod env var; missing should fail the production build (CI guard)

The single most important habit: **when an error happens, before fixing it, check Sentry to see who else hit it and what they were doing.** Bugs in production aren't isolated; they affect groups of users in patterns. Sentry shows the patterns.
