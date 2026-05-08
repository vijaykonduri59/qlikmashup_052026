# SKILLS.md — Qlik Sense Mashup (Enterprise)

> **Living document.** Source of truth for the stack, skills, decisions, and open questions on this project. Update as decisions evolve.
>
> _Last updated: 2026-05-07_

---

## 1. Project goal

Build a modern Qlik Sense mashup for **Qlik Sense Enterprise** (on-prem / Windows), replacing or augmenting the default Hub experience with a custom UI tailored to enterprise users.

Project may run for **multiple months**. Persistent context across sessions is a hard requirement — every meaningful decision lands here.

---

## 2. Confirmed stack

| Layer          | Choice                    | Why                                                                     |
| -------------- | ------------------------- | ----------------------------------------------------------------------- |
| Build tool     | **Vite**                  | Fast HMR, ESM-native, pairs cleanly with React + TS                     |
| Framework      | **React 18+**             | Industry default; clean fit with nebula.js/enigma.js                    |
| Language       | **TypeScript**            | Keeps Qlik's loosely-typed engine payloads under control                |
| Styling        | **Tailwind CSS**          | Maximum AI-assisted dev support; foundation for shadcn/ui               |
| Components     | **shadcn/ui**             | Source-level components, AI-friendly, Radix a11y baked in               |
| Qlik embedding | **nebula.js + enigma.js** | Modern Qlik-supported path; framework-agnostic; clean React integration |

---

## 3. Required skills (by category)

### 3.1 Qlik Sense Enterprise — _the highest-risk area_

- **nebula.js** — chart/object rendering as React-friendly components
- **enigma.js** — direct Engine API access (WebSocket / JSON-RPC)
- **Capability APIs** (legacy `qlik.js`) — fallback knowledge if nebula hits limits
- **Virtual proxy configuration** in QMC (Qlik Management Console)
- **Authentication** — header auth, ticket auth, JWT (enterprise patterns; **not** Qlik Cloud OAuth)
- **App/object IDs**, hypercube structure, selection state, alternate states, bookmarks
- **WebSocket lifecycle** — reconnects, session handoff, cleanup on unmount
- **CORS / WebSocket origin whitelisting** for virtual proxies

### 3.2 Modern frontend

- React 18+ (hooks, Suspense, error boundaries)
- TypeScript (generics, discriminated unions for narrowing Qlik payloads)
- Vite (dev proxy to Qlik server, env-based virtual proxy switching, HTTPS/WS quirks)
- Tailwind CSS + shadcn/ui
- **React Router v7** (library mode)
- **TanStack Query** — Qlik fetch caching, retries, background refresh
- **Zustand** — app state

### 3.3 Glue layer (where things break)

- Hypercube → chart adapters (mapping Qlik measures/dimensions to chart libs)
- Vite dev-proxy config for Qlik (WebSocket support, cookie passthrough)
- Auth flow handling on enterprise (virtual proxy in dev vs prod)
- Build & deploy: hosted under Qlik content library (`/extensions/`) **or** standalone behind reverse proxy with CORS configured on the virtual proxy

### 3.7 Resilience, testing & observability

- **`react-error-boundary`** — layered error boundaries (per-chart, per-route, global)
- **Error categorization** — transient / auth / permission / fatal
- **enigma.js WebSocket lifecycle** — `closed` / `suspended` / `resumed` events; reconnect strategy
- **TanStack Query retry policies** — category-aware
- **Vitest** — fast Vite-native unit and component tests
- **`@testing-library/react`** — accessibility-first component testing
- **Playwright** — cross-browser E2E automation
- **Sentry** (errors + performance) — production observability spine
- **Custom Sentry breadcrumbs** for Qlik engine events
- **Source-map upload in CI** — readable production stack traces

### 3.6 Performance & scalability

- **One-session-per-tab** discipline with `enigma.js`; centralized session lifecycle
- **TanStack Query** as the primary perf tool — `staleTime` tuned per data type
- **React performance patterns**: `React.memo`, selective Zustand subscriptions, key stability
- **List & content virtualization** with `@tanstack/react-virtual`
- **Intersection Observer** for "render only visible" charts
- **Code splitting** at the route level (`lazy: () => import(...)`)
- **Lazy-loading chart libraries** (ECharts, AG Grid) per-route
- **Web Workers** for heavy hypercube transformations
- **Bundle-size budgets** via `size-limit` in CI
- **Lighthouse CI** for perf/a11y regressions on every PR
- **Real User Monitoring** (later) — Sentry Performance or similar
- **Profiling** — React DevTools Profiler, Chrome DevTools Performance panel, Qlik engine logs

### 3.5 DevOps, quality & security

- Git basics — branch, commit, push, rebase, merge
- **GitHub Actions** — workflow YAML, jobs, steps, matrices, secrets
- **ESLint** + **Prettier** — code quality and formatting
- **Vitest** — unit/integration testing (added when we start writing tests)
- **Branch protection rules** + PR-driven workflow (solo-friendly variant)
- **Semgrep** — SAST via rule packs (`p/security-audit`, `p/typescript`, `p/react`, `p/owasp-top-ten`); inline `// nosemgrep` suppressions when justified
- **Dependabot** — configuration + reviewing/merging dependency PRs
- **Secret Scanning** — knowing what to do when an alert fires
- **`npm audit`** — supplementary dependency advisory check
- **Conventional Commits** (optional) — clean history + future automated changelogs
- Bundle-size budgets / Lighthouse CI (later, post-MVP)

### 3.4 Optional / nice-to-haves

- **ECharts** or **Recharts** — custom viz beyond native Qlik objects
- **AG Grid** — enterprise-grade tables
- **Storybook** — isolated component dev (critical when Qlik connections are slow/flaky)
- **Playwright** — end-to-end testing against a real Qlik environment
- **D3** — only if a custom viz justifies the complexity

---

## 4. Decisions made

| Date       | Decision                                                                                                                                                          | Reasoning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-07 | Use **nebula.js + enigma.js** over legacy Capability API                                                                                                          | Modern, Qlik-supported, integrates cleanly with Vite/React vs. iframe-style mashup model                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-05-07 | Use **Tailwind + shadcn/ui** over UnoCSS / Panda / Vanilla Extract                                                                                                | Best AI-assisted dev support, largest ecosystem, shadcn provides source-level component layer                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-05-07 | Use **Vite + React + TypeScript** as the base stack                                                                                                               | Modern default; best DX for AI-assisted dev                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-05-07 | Created `.claude/settings.json` with starter permissions allowlist                                                                                                | Reduce permission-prompt friction over a multi-month project; allowlist safe Vite/npm/pnpm/tsc/eslint/prettier and read-only git for both Bash and PowerShell tools; explicitly deny destructive ops (rm, git push, git reset --hard, npm publish, etc.)                                                                                                                                                                                                                                                                                                             |
| 2026-05-07 | Established `docs/` folder as the **learning record**                                                                                                             | User wants to learn while building — every meaningful concept/decision gets a doc covering what / why / how / pros / cons / alternatives. SKILLS.md stays as the short decision log; `docs/` carries the depth. See [docs/README.md](docs/README.md).                                                                                                                                                                                                                                                                                                                |
| 2026-05-07 | Source control & CI/CD: **GitHub (private personal repo) + GitHub Actions**                                                                                       | Best AI/ecosystem support, generous free Actions quota for solo project, native integration with CodeQL / Dependabot / Secret Scanning. See [docs/05-source-control-and-cicd.md](docs/05-source-control-and-cicd.md).                                                                                                                                                                                                                                                                                                                                                |
| 2026-05-07 | Workflow: **trunk-based with PR + branch protection (CI-green required)**, no approval gate (solo)                                                                | Enforces quality gates on every change while staying solo-friendly; learns enterprise discipline without team-review overhead; admin override available for emergencies.                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-05-07 | Security scanning baseline: **CodeQL + Dependabot + Secret Scanning + `npm audit`** (4 free GitHub-native layers)                                                 | Catches source vulnerabilities (SAST), dep CVEs, leaked secrets, and dep advisories on every PR. Optional second-opinion (Snyk/Semgrep) deferred — easy to add later. See [docs/06-security-scanning.md](docs/06-security-scanning.md).                                                                                                                                                                                                                                                                                                                              |
| 2026-05-08 | **Claude subagent team**: 7 specialized agents in `.claude/agents/`                                                                                               | **`system-design-architect`** (highest-level: cross-cutting design, trade-off adjudication, invariant stewardship, decision logging), `frontend-dev` (React/TS/Tailwind/shadcn/Zustand/Router), `qlik-architect` (enigma/nebula/session/auth), `perf-reviewer` (docs/12 audit), `security-reviewer` (docs/06+07+15 audit), `code-reviewer` (general PR review), `docs-keeper` (SKILLS.md + docs/ sync). Each agent has focused scope + tool restrictions + handoff rules. Committed with the repo so future contributors / fresh Claude sessions have the same team. |
| 2026-05-08 | **SAST swap: CodeQL → Semgrep**                                                                                                                                   | Tested CodeQL on push: failed with "Code scanning is not enabled for this repository." On personal-account private repos, CodeQL requires GitHub Advanced Security (org-only paid feature) — not free as we'd hoped. Pivoted to Semgrep (free, open-source, the documented fallback in [docs/06](docs/06-security-scanning.md) §6). Coverage is comparable for our stack; findings live in Actions logs (no Security-tab upload without GHAS).                                                                                                                       |
| 2026-05-07 | **Authentication: deploy as Qlik content-library extension** → session inheritance, no auth code                                                                  | Mashup served under the Qlik origin shares the user's Qlik session via cookies + WebSocket. No login UI, no token mgmt, no SAML library. Dev environment requires Vite proxy or test-server deploys. See [docs/07-authentication.md](docs/07-authentication.md).                                                                                                                                                                                                                                                                                                     |
| 2026-05-07 | **State management: Zustand** (over Redux Toolkit, Jotai, Recoil, Valtio, plain Context)                                                                          | Tiny API, no provider boilerplate, excellent TS ergonomics, right-sized for our scope. Server state stays in TanStack Query; component-local stays in `useState`. See [docs/08-state-management-zustand.md](docs/08-state-management-zustand.md).                                                                                                                                                                                                                                                                                                                    |
| 2026-05-07 | **Multi-app navigation: streams → apps → sheets hierarchy** (matches Qlik's permission model)                                                                     | User sees only what Qlik authorizes; structure is familiar (mirrors Hub mental model); URL is source of truth for navigation; lazy fetch via TanStack Query. See [docs/09-multi-app-navigation.md](docs/09-multi-app-navigation.md).                                                                                                                                                                                                                                                                                                                                 |
| 2026-05-07 | **Charting: hybrid (nebula-only by default, custom for the rest)** with ECharts + AG Grid Community as the custom toolkit                                         | Pragmatic — nebula handles 80% of charts cheaply; ECharts/AG Grid cover the rest without architectural ceiling. Default to nebula; move to custom only with a written reason. See [docs/10-charting-strategy.md](docs/10-charting-strategy.md).                                                                                                                                                                                                                                                                                                                      |
| 2026-05-07 | **Routing: React Router v7** (library mode, not the Remix framework mode) over TanStack Router                                                                    | Industry default, dramatically better AI assistance, biggest ecosystem, mature. Loses some type-safety vs TanStack but gains far more in productivity for a solo multi-month project. URL-as-state still works cleanly via `useSearchParams`. See [docs/11-routing.md](docs/11-routing.md).                                                                                                                                                                                                                                                                          |
| 2026-05-07 | **Performance is a hard architectural constraint** — sized for 2–3K DAU (~200–450 concurrent peak); zero tolerance for unnecessary Qlik server load or UI latency | User-stated requirement. Locks in invariants: one shared enigma session per tab, reused app handles, lazy-loaded routes/chart libs, aggressive TanStack Query caching, hypercube size discipline, bundle-size + Lighthouse CI gates. See [docs/12-performance-and-scalability.md](docs/12-performance-and-scalability.md).                                                                                                                                                                                                                                           |
| 2026-05-07 | **UX constraint: one app + one sheet at a time** (no split-view, no multi-app comparison)                                                                         | Navigation always REPLACES the current view. Architectural simplification: a single current app handle (not a map), closing the old app handle on app switch, keeping it on sheet switch within the same app. Dramatically smaller per-user RAM footprint than concurrent-app scenarios. See [docs/09-multi-app-navigation.md](docs/09-multi-app-navigation.md) and [docs/12-performance-and-scalability.md](docs/12-performance-and-scalability.md).                                                                                                                |
| 2026-05-07 | **No split-view in v1** (no side-by-side multi-app rendering)                                                                                                     | Doubles per-user server RAM, ~2× UI/state complexity, ~2× testing surface. Users can already get split-view via two browser tabs (URLs are bookmarkable). Defer to v2 if real usage data shows demand. See [docs/12-performance-and-scalability.md](docs/12-performance-and-scalability.md) §6 alternatives.                                                                                                                                                                                                                                                         |
| 2026-05-07 | **App-handle architecture: 1 active + 1 warm-previous (60s TTL)** — refines the strict "single handle" interpretation while keeping "one app in UI" intact        | User confirmed users frequently switch between apps for analysis. The 60s warm cache makes A → B → A round-trips instant without paying the open cost again. ~2× RAM only briefly for users actively switching; trades modest sustained RAM for major UX win on the user's stated workflow. After 60s with no return, the warm handle is closed.                                                                                                                                                                                                                     |
| 2026-05-07 | **Download / Export: per-chart CSV + Excel** as a first-class feature                                                                                             | User confirmed download is part of the workflow ("download, compare"). Implementation: Qlik `ExportData` engine call for native nebula objects; client-side generation for custom (ECharts/AG Grid) charts using their already-loaded hypercube data. No extra app handles needed.                                                                                                                                                                                                                                                                                   |
| 2026-05-07 | **Multi-tab: officially supported** — users running multiple browser tabs is the v1 "split-view" answer                                                           | Each tab = independent enigma session + Zustand stores + active/warm handles. Cost: ~2× server resources for users running 2 tabs (still 1 license). Add Page Visibility API to close warm handles + pause refetches when tab hidden. localStorage is last-write-wins across tabs (no `BroadcastChannel` coordination in v1).                                                                                                                                                                                                                                        |
| 2026-05-07 | **Error handling: layered React Error Boundaries + categorized errors** (transient / auth / permission / fatal) via `react-error-boundary`                        | Per-chart, per-route, global boundaries. enigma.js session events drive WebSocket reconnect. TanStack Query retry policies tuned per error category. 30s timeout on every engine call. See [docs/13-error-handling-and-resilience.md](docs/13-error-handling-and-resilience.md).                                                                                                                                                                                                                                                                                     |
| 2026-05-07 | **Testing: Vitest (unit + component via @testing-library/react) + Playwright (E2E)**                                                                              | Three layers, defined scope. Co-located unit/component; E2E in top-level `e2e/`. PR runs unit + critical E2E; full E2E nightly. Coverage targets: 80%+ for `lib/`, 60%+ for `components/`, 10–15 critical E2E flows. Mock Qlik via stub session, never WebSocket-level. See [docs/14-testing-strategy.md](docs/14-testing-strategy.md).                                                                                                                                                                                                                              |
| 2026-05-07 | **Observability: Sentry** (errors + Performance Monitoring + custom Qlik breadcrumbs)                                                                             | Free tier (5K errors + 10K perf events / month) covers our 300-user scale. Source maps uploaded in CI; sample rate 100% dev / 10% prod. Custom transactions wrap engine calls. Strict no-PII rule on breadcrumbs. See [docs/15-logging-and-observability.md](docs/15-logging-and-observability.md).                                                                                                                                                                                                                                                                  |
| 2026-05-07 | **Target platform: desktop only** (laptop + monitor); min viewport 1280×720; no mobile, no tablet, no PWA, no offline                                             | User-confirmed. Eliminates significant work in responsive design, touch interactions, service workers. Tailwind uses mainly `lg:`/`xl:`; sidebar always visible; mouse + keyboard primary. Reconsider in v2 only if mobile demand emerges. See [docs/16-target-platform-scope.md](docs/16-target-platform-scope.md).                                                                                                                                                                                                                                                 |

---

## 5. Open questions (not yet decided)

- [ ] **Deployment target** — hosted under Qlik (`/extensions/`) or standalone with reverse proxy? _(**deferred** as of 2026-05-07 — user marked not needed for now; revisit when MVP is ready to ship; auth assumes content-library deploy until changed)_
- [ ] **Target users / use cases** — drives layout, feature priority, and access control needs
- [ ] **Dev environment for Qlik integration** — Vite dev proxy vs deploy-to-test vs mocking (revisit at scaffold time)
- [ ] **Qlik server specifics** — virtual proxy prefix, certificate setup, exact version (covered by §6 minimum-standard assumptions until concrete values known)
- [ ] **Documentation site (VitePress)** — convert `docs/*.md` into a browsable HTML site with sidebar, search, dark mode; deploy to GitHub Pages. _(**deferred** as of 2026-05-07 — raw Markdown is sufficient for current docs volume; revisit once `docs/` has grown enough that a real site adds value)_

---

## 6. Project context

- **Working directory:** `c:\Users\madhu\Desktop\QlikSense Mashup Enterprise Version`
- **Status (2026-05-07):** Stage 1 scaffold complete (base Vite + React 19 + TS strict-mode); requirements gathering alongside subsequent stages
- **Repo:** not initialized yet (planned for Stage 11)
- **Scale target:** 2,000–3,000 daily active users (estimated 200–450 concurrent at peak)
- **Performance constraint:** zero tolerance for Qlik server overhead; click-to-update latency must feel instant

### Minimum-standard assumptions (revisit when real numbers known)

These are working assumptions chosen to size the architecture sensibly. All will be tested at scaffold/integration time and adjusted if reality differs.

| Assumption                            | Default value                                                                             | If reality differs                                                                                     |
| ------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Qlik server version                   | **November 2022 release or later** (Qlik Sense Enterprise on Windows)                     | Older versions: nebula.js features may differ — check compatibility per chart type                     |
| App size                              | **Medium apps** — 50–200 MB on disk, 100–500 MB RAM loaded                                | Larger apps × concurrent users may push the Qlik node's RAM ceiling — server team may need to scale up |
| Network                               | **Internal LAN**, ~5–20ms RTT to Qlik server                                              | WAN/VPN users: roughly 2× latency budgets (FCP < 3s, click-to-data < 1.6s p95)                         |
| Concurrent peak (sessions, not users) | **~400 sessions** (300 users baseline + ~30% running a 2nd browser tab × 2 sessions each) | If multi-tab usage is much higher, factor it in; perf budgets sized per-tab                            |

---

## 7. How to use this document

- **Every new session:** Claude reads this first to recover context.
- **After every meaningful decision:** add a row to §4 with the date and reasoning.
- **When a question gets answered:** move it from §5 to §4 with a date.
- **When the stack changes:** update §2 and add a §4 entry explaining why.
- **Keep §3 stable** — skills don't change much; decisions and open questions do.
