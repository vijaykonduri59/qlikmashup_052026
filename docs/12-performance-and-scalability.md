# Performance & Scalability for 2–3K Daily Active Users

_Last updated: 2026-05-07_

> The mashup must run fast for end users AND avoid stressing the Qlik Sense server. With 2–3K daily active users — likely 200–450 concurrent at peak — every careless engine call is multiplied. Performance is an architectural concern, not a polish pass.

---

## 1. What is it?

Two related-but-distinct concerns:

| Concern                | What it means                                                                                         | Whose problem                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **Mashup performance** | The mashup feels fast: clicks respond instantly, charts render quickly, navigation is smooth, no jank | Ours, fully                                        |
| **Qlik server impact** | The mashup doesn't disproportionately load the Qlik engine, RAM, or proxy                             | Mostly ours (architecture) + admin (server sizing) |

Both must succeed. Fast clicks on a hammered server means everyone's mashup eventually crawls. A lightly-loaded server with a sluggish UI is also a failure. We design for both.

## 2. Why we use it (in this project)

The user explicitly stated this as a major criterion:

> "Mashup should not be an overhead and create performance issues on Qlik server. Users might be 2k–3k on a daily basis. Mashup should be fast, no latency issues with user clicks."

At that scale, sloppy code is multiplied. Two illustrative numbers:

- **Naive engine sessions:** opening one extra session per chart × 10 charts × 300 concurrent users = **3,000 unnecessary sessions**. Each session allocates RAM (often hundreds of MB per loaded app). This is how a fine Qlik node becomes an OOM killer's lunch.
- **Naive `GetLayout` calls:** one redundant layout call per re-render × 10 re-renders/min × 300 users = **50 calls per second** of pure waste.

Performance discipline isn't optional at this scale. It's the architectural concern that, done wrong, kills the project even when every other decision is right.

## 3. How it works — the four pillars

### Pillar 1 — Minimize Qlik server load

> **One app + one sheet at a time IN UI** (locked 2026-05-07; no split-view in v1). The mashup never shows two apps concurrently on screen. **Architecture refinement (also 2026-05-07):** to support frequent app-switching workflows without paying the app-open cost on every switch, we keep **one warm-previous-app handle** alongside the active one with a 60-second TTL. So at any moment, each user has: 1 enigma session × (1 active + at most 1 warm) app handle × N session objects on the active sheet. When the user switches apps, the old handle goes warm with a 60s timer; if the user returns within the window the switch is instant; otherwise the warm handle is closed. See [docs/09-multi-app-navigation.md](09-multi-app-navigation.md) for the full lifecycle.

| Tactic                                                  | Implementation                                                                                                                                                                                        | Why it matters                                                                                                                                                                               |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **One shared engine session per tab**                   | Open a single `enigma.js` session on app start, store in a Zustand store. Every component borrows from it. Never open a session "for a chart."                                                        | Each session = RAM on the Qlik node. Multiply by users. Catastrophic.                                                                                                                        |
| **One active + one warm-previous app handle** (60s TTL) | `qlikSessionStore` tracks both slots. Switching apps demotes the old to warm with a 60s timer; returning within 60s skips the re-open entirely. After 60s or LRU eviction, the warm handle is closed. | Caps per-user RAM at ~1 app most of the time, briefly 2× during active switching. Eliminates re-open cost on common switch-back patterns.                                                    |
| **Reuse app handles within an app**                     | Switching sheets within the same app keeps the active handle. Only the session objects under the old sheet are destroyed.                                                                             | App-open is the most expensive engine operation; sheet switches should not pay for it.                                                                                                       |
| **Single-flight + cancel-on-switch**                    | `AbortController` / TanStack Query cancellation for in-flight `OpenDoc` calls when the user clicks another app                                                                                        | Without this, rapid app clicks stack three full opens on the server even though the user only wanted the last one                                                                            |
| **No-op on same-app re-click**                          | Guard in route handler — clicking the already-open app does nothing                                                                                                                                   | Free; just discipline. Saves the most embarrassing class of redundant opens.                                                                                                                 |
| **Last-viewed-sheet memory** (localStorage)             | Map `appId → lastSheetId`; on app open, route directly to the last sheet                                                                                                                              | Fewer transitions per user session; less engine churn                                                                                                                                        |
| **Trust Qlik's QIX cache** (server-side)                | Don't artificially keep handles open beyond use; let Qlik's document-timeout enable hot-starts for the next user                                                                                      | Your discipline benefits everyone — popular apps stay warm in shared cache                                                                                                                   |
| **Aggressive TanStack Query caching**                   | Long `staleTime` for slow-changing metadata (app list: 5 min; sheet list: 5 min; user identity: ∞ for the session)                                                                                    | Avoids redundant engine calls during normal navigation                                                                                                                                       |
| **Debounce user input**                                 | Selection changes, search inputs, slider drags — debounce 200–300ms before firing engine calls                                                                                                        | Prevents "selection storms" where rapid clicks each invalidate all open hypercubes                                                                                                           |
| **Right-size hypercubes**                               | Always set `qHeight` to what you'll display (typically ≤ 1000 rows). Never fetch "everything."                                                                                                        | Engine work is roughly linear in result size; over-fetching is a direct multiplier                                                                                                           |
| **Close session objects on unmount**                    | When a chart component unmounts, destroy its session object                                                                                                                                           | Otherwise the engine keeps recomputing it on every selection change forever                                                                                                                  |
| **Pause unfocused tabs** (Page Visibility API)          | When tab is hidden: pause TanStack Query refetches AND close the warm-previous-app handle immediately (don't wait for the 60s timer)                                                                  | Reduces idle load when users keep the mashup open all day. Critical for multi-tab users who park 2nd tabs in the background.                                                                 |
| **Per-tab independent footprint**                       | Each browser tab opens its own enigma session, its own Zustand stores, its own active+warm handles. Users opening 2 tabs cost ~2× server resources.                                                   | Multi-tab is our v1 "split-view" answer (see [docs/09-multi-app-navigation.md](09-multi-app-navigation.md) → Multi-tab usage). Capacity planning should think in **sessions** not **users**. |

### Pillar 2 — Minimize network round-trips

| Tactic                               | Implementation                                                                                  | Why it matters                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Route-level code splitting**       | `lazy: () => import('./SheetView')` in React Router config                                      | Initial bundle stays small; ECharts and AG Grid only download when needed          |
| **Lazy-load chart libraries**        | `import('echarts')` only inside the components that use it                                      | A first-time visitor never downloads ECharts unless they hit a route that needs it |
| **Prefetch on hover**                | Use React Router's prefetch hooks to download next route's bundle on link hover                 | Makes navigation feel instant once a user starts moving the mouse                  |
| **Cache static assets aggressively** | Long-cache hashes on JS/CSS via Vite's defaults                                                 | Returning users only download what changed                                         |
| **Avoid waterfalls**                 | Fire independent engine calls in parallel via `Promise.all`; never serialize when not necessary | Naive serial fetches stack latency unnecessarily                                   |
| **Batch metadata queries**           | Use a single `GetDocList` for all apps; don't loop calling `GetDoc` per app                     | One round-trip beats N                                                             |

### Pillar 3 — Maximize client responsiveness

| Tactic                               | Implementation                                                                                                                      | Why it matters                                                             |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Selective Zustand subscriptions**  | Always `useStore(s => s.field)`, never `useStore()`                                                                                 | A component subscribed to the whole store re-renders on every change       |
| **`React.memo` on chart components** | Wrap heavy components so they only re-render when their props actually change                                                       | Charts are expensive to re-render; selective updates matter                |
| **Virtualize long lists**            | Use `@tanstack/react-virtual` for sidebars, tables, anything that could exceed ~50 items                                            | Rendering 1,000 DOM nodes is slow regardless of how fast the data arrives  |
| **Render only visible charts**       | Use Intersection Observer (or `useInView` from `react-intersection-observer`) so off-screen charts skip rendering until scrolled to | A dashboard with 12 charts shouldn't render all 12 if only 4 are on-screen |
| **Web Workers for heavy transforms** | Move large hypercube → chart-data adapter functions into a worker                                                                   | Keeps the UI thread free for animation and click response                  |
| **Skeleton loaders**                 | Show shaped placeholders while data loads, never blank screens                                                                      | Perceived performance > raw performance for user satisfaction              |
| **Avoid re-mounting on URL changes** | Same `RootLayout` across all routes; only the inner `Outlet` swaps                                                                  | Re-mounting = re-fetching = unnecessary work                               |

### Pillar 4 — Measure and gate

You can't fix what you don't measure. Performance regresses silently otherwise.

| Layer                          | Tool                                                                        | What it does                                                                       |
| ------------------------------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Bundle size in CI**          | `size-limit` or `bundlesize`                                                | Fails the PR if main bundle exceeds the budget (suggested initial: 250 KB gzipped) |
| **Lighthouse CI**              | `@lhci/cli` in GitHub Actions                                               | Runs Lighthouse on every PR; gates on perf, a11y, best-practices scores            |
| **Real User Monitoring (RUM)** | (Future) Sentry Performance, Datadog RUM, or a self-hosted alternative      | Measures actual user latency in production — the only number that matters          |
| **Engine call counter (dev)**  | A debug overlay that counts engine calls per session                        | Surfaces N+1 problems during development, before they ship                         |
| **Error budget**               | Track the percentage of requests over a latency threshold; alert when above | Lets us know when something has regressed without staring at dashboards            |

## 4. Pros

- **Designed for scale from day one** — no expensive rearchitecture later
- **Predictable Qlik server behavior** — minimizes the chance of "it worked in dev but melts in prod"
- **Measurable** — every pillar has a tool that produces a number
- **Defaults bake in best practices** — once the patterns are in place, doing the wrong thing requires effort
- **Composes with our stack** — every tactic above uses libraries we've already chosen

## 5. Cons

- **Discipline is required.** Every PR must consider perf implications; not "add it later."
- **More upfront tooling cost.** Bundle-size CI, Lighthouse CI, RUM — each is a small setup tax.
- **Some optimizations are subtle.** Forgetting to memo a component or destructure a Zustand selector is invisible until 100 users hit it.
- **Profiling is a real skill** — you'll spend time learning the React DevTools profiler and Qlik engine logs.
- **Server capacity is partly outside our control.** We can minimize our load, but if the Qlik node is under-provisioned, no mashup discipline saves it.

## 6. Alternatives we considered

| Option                                 | Why we didn't pick it                                                                                                                                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **"Optimize later when it hurts"**     | At 2–3K DAU, "later" means after the project has visibly failed. The cost of retrofitting (ripping out per-chart sessions, refactoring to shared session model, etc.) is far higher than building it right from day one. |
| **Pure client-side caching only**      | Doesn't reduce engine load; only helps the same user on repeated views. We need both client and server discipline.                                                                                                       |
| **Server-side rendering / Next.js**    | Adds operational complexity (a Node.js server) and doesn't help mashup latency for an in-Qlik deploy. Wrong tool.                                                                                                        |
| **CDN-cached pre-rendered dashboards** | Loses Qlik's live, associative selection model. Defeats the point.                                                                                                                                                       |
| **Skip RUM, rely on lab tests**        | Lab numbers lie. RUM is the only signal that matches real user experience.                                                                                                                                               |

## 7. What this means for our project

Concrete commitments going into the codebase:

### Architecture invariants (cannot violate)

1. **One enigma session per browser tab.** Centralized in `src/lib/qlik/session.ts`. Every component imports from there.
2. **App handles are reused.** A Zustand store (`qlikSessionStore`) tracks open app handles by ID; we open lazily, close on tab close.
3. **Every chart component is wrapped in `React.memo`.** Linted, eventually.
4. **Every Zustand consumer uses a selector.** Linted, eventually.
5. **Hypercubes always specify `qHeight`.** Default 100; bumped explicitly only when the UI actually shows more.
6. **All routes lazy-loaded.** No exceptions for "small" routes.

### Tooling we add (in order, as the project grows)

1. **At scaffold:** `size-limit` config in `package.json`, included in CI workflow
2. **First feature complete:** Lighthouse CI on every PR
3. **Before any production deploy:** bundle analyzer (`rollup-plugin-visualizer`) to verify nothing surprising landed
4. **Before any 100+ user rollout:** RUM tool integrated (lightweight option: a custom `performance.timing` POST to a logging endpoint; heavier: Sentry Performance)

### Performance budgets (initial targets, refine with real measurements)

| Metric                                    | Target              | Notes                          |
| ----------------------------------------- | ------------------- | ------------------------------ |
| First Contentful Paint (FCP)              | < 1.5s on broadband | First paint of any content     |
| Largest Contentful Paint (LCP)            | < 2.5s on broadband | Main content visible           |
| Time to Interactive (TTI)                 | < 3.5s on broadband | Click handlers respond         |
| Click-to-update latency (within mashup)   | < 100ms             | Pure UI changes                |
| Click-to-data latency (engine round-trip) | < 800ms p95         | Selection → updated chart      |
| Initial bundle (gzipped)                  | < 250 KB            | Excluding lazy-loaded chunks   |
| Lighthouse perf score                     | > 85                | On a representative sheet view |

These are starting points. Once we have RUM data, we'll calibrate to real user distributions.

### Open questions to confirm at scaffold time

- **Qlik server version & node count** (affects engine session limits, RAM headroom)
- **App sizes** (RAM footprint per app; large apps × many concurrent users = capacity ceiling)
- **Expected concurrent peak** — refine the 200–450 estimate with real usage patterns
- **Network proximity** — same-LAN users vs WAN/VPN users dramatically change latency budgets

The single most important habit: **before adding any feature, ask "what does this add per user × 300 concurrent users?"** If the answer is "a new engine session per chart" — stop. Redesign.
