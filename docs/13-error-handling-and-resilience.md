# Error Handling & Resilience

_Last updated: 2026-05-07_

> The mashup will hit errors. Engine sessions drop. Auth expires. Apps disappear from a user's permissions mid-session. The browser tab is hidden for an hour. This document defines how we handle each gracefully — and how we make sure no error reaches the user as a blank white screen.

---

## 1. What is it?

The layer between "something failed" and "the user knows what's happening and what to do." Four cooperating parts:

| Layer                        | Catches                                           | Example                                                           |
| ---------------------------- | ------------------------------------------------- | ----------------------------------------------------------------- |
| **Per-chart error boundary** | Render-time errors in a single chart              | "Failed to render Bar Chart — [Retry]" card in place of the chart |
| **Per-route error boundary** | Errors inside a route                             | Route-level fallback page; sidebar still works                    |
| **Global error boundary**    | Anything else                                     | Friendly app-level fallback with reload                           |
| **Async/session lifecycle**  | Failed engine calls, WebSocket drops, auth expiry | Reconnecting toast; session-expired modal                         |

## 2. Why we use it (in this project)

At 300 concurrent users, errors are **guaranteed**:

- Network blips affect ~1% of requests at any moment
- Qlik engine sessions drop on server load spikes
- Auth cookies expire while users are at lunch
- Permissions change mid-session (admin removes app access)
- Browsers throttle backgrounded tabs aggressively

Without explicit handling, these failures become blank screens, frozen UIs, or cryptic console errors. With a thoughtful strategy, they're small interruptions with clear recovery paths.

## 3. How it works

### Error categorization

Every error our app encounters falls into one of four buckets, and the **category determines the response**:

| Category       | Behavior                                          | Examples                                                    |
| -------------- | ------------------------------------------------- | ----------------------------------------------------------- |
| **Transient**  | Retry automatically (exponential backoff, capped) | Network timeout, engine 500, brief disconnect               |
| **Auth**       | Show "session expired" modal; offer reload        | 401, WebSocket close 1006 with auth context, expired cookie |
| **Permission** | Show "no access to this content" UI; do not retry | Engine: "no access to app/sheet"                            |
| **Fatal**      | Show a fallback UI; report to Sentry              | Unexpected exceptions, our own bugs                         |

Centralized categorizer at `src/lib/errors/categorize.ts` — one place to update.

### React Error Boundaries

Using `react-error-boundary` (small, well-maintained) wrapped at three levels:

```tsx
<ErrorBoundary fallback={<AppErrorPage />}>          // Global
  <RouterProvider router={...}>
    <ErrorBoundary fallback={<RouteErrorPage />}>    // Per-route
      <SheetView>
        <ErrorBoundary fallback={<ChartErrorCard />}> // Per-chart
          <NebulaObject />
        </ErrorBoundary>
      </SheetView>
    </ErrorBoundary>
  </RouterProvider>
</ErrorBoundary>
```

Per-chart boundaries are the most important — **one failing chart should not take down the sheet**.

### TanStack Query retry policies

Per-data-type retry config based on category:

```ts
useQuery({
  queryKey: ['sheetList', appId],
  queryFn: () => fetchSheetList(appId),
  retry: (failureCount, error) => {
    const cat = categorize(error);
    if (cat === 'auth' || cat === 'permission') return false; // don't retry
    return failureCount < 2; // 2 retries on transient
  },
  retryDelay: (i) => Math.min(1000 * 2 ** i, 8000), // exponential, capped
});
```

### enigma.js WebSocket lifecycle

The session emits events we listen for via a `useEnigmaSession()` hook:

| Event                  | What we do                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `closed` (with reason) | Categorize and respond (auth → modal; transient → reconnect; fatal → reload prompt) |
| `suspended`            | Show "Reconnecting..." toast                                                        |
| `resumed`              | Hide toast; refresh affected queries                                                |
| `notification`         | Engine warnings; log only                                                           |

### Operation-level timeouts

Every engine call gets a hard 30-second timeout. Beyond that, treat as transient failure rather than letting things hang forever.

## 4. Pros

- **No blank screens.** Every error has a UI.
- **Per-chart isolation.** A broken chart doesn't break the page.
- **Predictable recovery paths.** Users know what to do.
- **Sentry breadcrumbs** capture the lead-up to every error (see [docs/15-logging-and-observability.md](15-logging-and-observability.md)).
- **Composable.** Error boundaries are React components — testable, replaceable.

## 5. Cons

- **More code.** Every async path needs error-handling thought.
- **Hard to test all paths.** Some failure modes only show up in production.
- **Retry tuning is empirical.** Backoff parameters need calibration after we see real error patterns.
- **Reconnect logic is finicky.** Tab visibility, network changes, engine restarts all interact in subtle ways.
- **Error messages are UX work.** "Something went wrong" is bad; specific messages take effort.

## 6. Alternatives we considered

| Option                                     | Why we didn't pick it                                               |
| ------------------------------------------ | ------------------------------------------------------------------- |
| **Let things crash**                       | Unacceptable for production; 300 users will see blank screens daily |
| **Roll our own error-boundary primitives** | `react-error-boundary` already nails it; no reason to rebuild       |
| **Custom WebSocket reconnect**             | enigma.js's events + a thin layer is cleaner than reimplementing    |
| **No retry, fail fast**                    | Punishes users for transient network blips                          |
| **Aggressive retry everywhere**            | Hammers the server when something is genuinely broken               |

## 7. What this means for our project

Folder structure:

```
src/
  lib/
    errors/
      ErrorBoundary.tsx           ← thin wrapper over react-error-boundary
      categorize.ts               ← err → 'transient' | 'auth' | 'permission' | 'fatal'
      AppErrorPage.tsx            ← global fallback
      RouteErrorPage.tsx          ← per-route fallback
      ChartErrorCard.tsx          ← per-chart fallback
      SessionExpiredDialog.tsx    ← auth-expired modal
  features/
    qlik-session/
      useEnigmaSession.ts         ← WebSocket lifecycle + reconnect
```

Conventions:

- **Every async hook returns either `data | error`** — never silently swallow
- **Every engine call has a 30s timeout** unless explicitly justified
- **Every chart component is wrapped in `ChartErrorCard`** at the parent level
- **No empty `try { ... } catch (e) {}` blocks** — log via Sentry breadcrumb, or rethrow
- **Sentry breadcrumbs** on every engine call + every navigation event so traces are useful

The single most important habit: **assume every async operation will fail at some point.** Write the failure path before the success path.
