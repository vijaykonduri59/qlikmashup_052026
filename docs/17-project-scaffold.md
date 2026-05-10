# Project Scaffold (Living Document)

_Last updated: 2026-05-07 — Stages 1–7 + 10 + 11 (initial commit) complete; pipeline live before Stage 7b real-Qlik integration_

> The actual codebase, layered in stages so each addition is a focused learning + commit point. This document is updated as each stage lands.

---

## 1. What is it?

The skeleton on which every other piece of the project rests. Built **incrementally**, one focused stage at a time, so each addition is small enough to understand and revert if needed.

## 2. Why we use it (in this project)

- **Learning over cargo-culting.** A 50-file scaffold landing all at once teaches nothing. Stage-by-stage lets each piece be understood.
- **Reversibility.** If a stage's choice doesn't fit, only that stage's files need to change.
- **Commits map to stages.** Git history becomes a self-documenting tour of the architecture.

## 3. How it works — stage by stage

### Stage 1 — Base Vite + React + TS skeleton ✓ DONE

10 files at the project root:

| File                 | Role                                                                       |
| -------------------- | -------------------------------------------------------------------------- |
| `package.json`       | Dependency manifest + npm scripts (`dev`, `build`, `preview`, `typecheck`) |
| `vite.config.ts`     | Vite config; includes `@/` → `src/` path alias                             |
| `tsconfig.json`      | TS root config (project references)                                        |
| `tsconfig.app.json`  | TS config for application code (`src/`) — strict mode                      |
| `tsconfig.node.json` | TS config for Node-side files (`vite.config.ts` itself)                    |
| `index.html`         | HTML entry; Vite injects the bundle                                        |
| `src/main.tsx`       | React render root with `StrictMode`                                        |
| `src/App.tsx`        | Placeholder top-level component                                            |
| `src/vite-env.d.ts`  | Vite client type declarations                                              |
| `.gitignore`         | Excludes `node_modules`, `dist`, `.env`, build cache, etc.                 |

**Dependencies in this stage** (deliberately minimal):

| Package                            | Version | Role                           |
| ---------------------------------- | ------- | ------------------------------ |
| `react`, `react-dom`               | ^19     | View layer                     |
| `vite`, `@vitejs/plugin-react`     | ^6 / ^4 | Build tool + React integration |
| `typescript`                       | ^5.7    | Type safety                    |
| `@types/react`, `@types/react-dom` | ^19     | TS definitions                 |

**Why so few?** Every package adds churn, security surface, and learning load. Stage 1 deps are non-negotiable. Everything else gets added when its stage arrives.

**Architectural choices baked in:**

- **`@/` path alias** → `src/` — keeps imports clean (`@/lib/qlik/...` instead of `../../../lib/qlik/...`). Configured in both `vite.config.ts` (bundler resolves) and `tsconfig.app.json` (TS + IDE resolve)
- **Project-reference tsconfigs** — separates browser code from Node-side build config. Faster type checks, more accurate per environment
- **Strict mode on** — `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports` — catches bugs at compile time
- **ES2022 target** — our desktop-only browser support (see [docs/16-target-platform-scope.md](16-target-platform-scope.md)) lets us emit modern JS without polyfills

**How to run after Stage 1:**

```
npm install
npm run dev
```

Opens at `http://localhost:5173` with a placeholder page.

### Stage 2 — Tailwind v4 + shadcn/ui ✓ DONE

Files added or modified:

| File                           | Role                                                                                                                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                 | New deps: `tailwindcss@^4`, `@tailwindcss/vite@^4`, `tw-animate-css`, plus shadcn runtime deps (`clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `@radix-ui/react-slot`) |
| `vite.config.ts`               | Added `@tailwindcss/vite` plugin                                                                                                                                                              |
| `src/index.css`                | New — Tailwind v4 import + shadcn theme tokens (light + dark via OKLCH); `@theme inline` block exposes them as Tailwind utility colors (`bg-background`, `text-muted-foreground`, etc.)       |
| `src/main.tsx`                 | Added `import './index.css'` so styles load                                                                                                                                                   |
| `src/lib/utils.ts`             | New — `cn()` helper (clsx + tailwind-merge) used by every shadcn component                                                                                                                    |
| `components.json`              | New — shadcn CLI config; `npx shadcn@latest add <component>` will use this                                                                                                                    |
| `src/components/ui/button.tsx` | First shadcn component (Button) — verifies the whole pipeline works                                                                                                                           |
| `src/App.tsx`                  | Replaced inline-style placeholder with Tailwind-styled layout + Button variants demo                                                                                                          |

**Why Tailwind v4 (not v3):**

- v4 (Jan 2025) is the modern default in 2026
- CSS-first config (no `tailwind.config.js`) — simpler mental model
- ~5× faster builds via the Oxide engine
- Native CSS variables + `@theme inline` integration plays beautifully with shadcn's token system

**Why shadcn `new-york` style + `neutral` base color:**

- `new-york` is shadcn's slightly tighter, more refined default — the more popular choice
- `neutral` base color = monochrome grayscale; we'll layer brand color on top later (Stage 3+ as a theme decision)
- Both can be changed later by re-running shadcn init or editing CSS variables

**Architecture notes baked in:**

- **CSS variables for theming** — every shadcn color comes from a CSS variable, so switching to dark mode is just adding `class="dark"` to the document root
- **`cn()` everywhere** — every component that conditionally combines classes uses `cn(...)` so duplicate or conflicting Tailwind classes resolve correctly
- **`@/components/ui/`** is the shadcn component home; we never modify these from "outside" — we either edit them in place or copy/rename them when we need a custom variant

**How to verify Stage 2:**

```
npm install     # picks up the new deps
npm run dev
```

Page should now show Tailwind-styled content + 6 button variants (default, secondary, outline, ghost, destructive, link). If buttons look styled and the page background is white (or near-white), Tailwind is wired up.

### Stage 3 — React Router v7 ✓ DONE

Files added:

| File                        | Role                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------- |
| `src/routes/index.tsx`      | Router config via `createBrowserRouter`; root route + index + nested app/sheet routes |
| `src/routes/RootLayout.tsx` | Shared shell: sidebar (placeholder) + `<Outlet />` for the active route               |
| `src/routes/HomeView.tsx`   | `/` — landing page placeholder                                                        |
| `src/routes/AppView.tsx`    | `/app/:appId` — app-level view placeholder; reads `appId` via `useParams`             |
| `src/routes/SheetView.tsx`  | `/app/:appId/sheet/:sheetId` — sheet view placeholder                                 |
| `src/routes/NotFound.tsx`   | `errorElement` — 404 + generic error fallback; uses `useRouteError` to differentiate  |
| `src/main.tsx` (modified)   | Now mounts `<RouterProvider router={router} />` instead of `<App />`                  |
| `src/App.tsx` (deprecated)  | Stub — kept as a file for clean git history; safe to delete                           |
| `package.json` (modified)   | Added `react-router@^7.1.0`                                                           |

**Why React Router v7 (over v6 or TanStack Router):** see [docs/11-routing.md](11-routing.md). TL;DR — biggest ecosystem, best AI assistance, mature.

**Why we lazy-load `AppView` and `SheetView` but not `HomeView`:**

- `HomeView` is the entry point — lazy-loading it would add an extra round-trip on first load (anti-pattern)
- `AppView` and `SheetView` will become bundle-heavy once Qlik integration + chart libraries land in Stage 7+; lazy-loading them today bakes in the perf discipline from [docs/12-performance-and-scalability.md](12-performance-and-scalability.md)
- `RootLayout` is always rendered (it's the shell) — never lazy

**URL = state (locked pattern):**

| URL                          | Meaning                                         |
| ---------------------------- | ----------------------------------------------- |
| `/`                          | Home / app picker                               |
| `/app/:appId`                | App view — sheet picker for that app            |
| `/app/:appId/sheet/:sheetId` | Sheet view — renders nebula objects + downloads |

When selections-in-URL land in a later stage, they'll be added as query params (`?selection=...`) — preserving bookmark/share-link behavior.

**How to verify Stage 3:**

```
npm install     # picks up react-router
npm run dev
```

Page should now show:

- Sidebar on the left (white-ish background, monochrome text) with three test links
- Main content area on the right showing the active route
- Click "App: demo" → URL becomes `/app/demo`, content swaps to "App: demo" placeholder
- Click "Sheet: demo / main" → URL becomes `/app/demo/sheet/main`, content swaps again
- Browser back button works (URL is the source of truth)
- Try a bogus URL like `/nope/nothing` → 404 page from `NotFound`

### Stage 4 — ESLint + Prettier + Husky + lint-staged ✓ DONE

Files added:

| File                | Role                                                                                                                                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `eslint.config.js`  | ESLint flat config: `js.recommended` + `typescript-eslint.recommended` + `react-hooks` + `jsx-a11y.recommended` + `react-refresh` + `eslint-config-prettier` (must be last to disable conflicting rules) |
| `.prettierrc.json`  | Prettier config: single quotes, trailing commas, semi, 100-col width, 2-space tabs                                                                                                                       |
| `.prettierignore`   | Excludes dist, node_modules, lockfile, build artifacts                                                                                                                                                   |
| `.husky/pre-commit` | Runs `npx lint-staged` on every commit (only after `git init` happens — Husky skips silently before that)                                                                                                |
| `package.json`      | New scripts: `lint`, `lint:fix`, `format`, `format:check`, `prepare`. New `lint-staged` config block for staged files.                                                                                   |

**Devs deps added:** `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-plugin-jsx-a11y`, `eslint-config-prettier`, `globals`, `prettier`, `husky`, `lint-staged`.

**What's enforced:**

- TypeScript correctness
- React hooks rules (no missing deps, no rules-of-hooks violations)
- WCAG 2.1 AA-friendly accessibility (`jsx-a11y/recommended`) — matches our [docs/16-target-platform-scope.md](16-target-platform-scope.md) commitment to a11y
- React Fast Refresh compatibility (warns on files exporting both components and non-components)
- Prettier formatting (everything Prettier handles: indentation, quotes, semicolons, line length)

**The pre-commit hook runs:**

1. `eslint --max-warnings=0 --fix` on staged `.ts` / `.tsx` files (auto-fixes what it can; **fails on any warning**)
2. `prettier --write` on staged code + JSON/MD/CSS/HTML

If lint or format finds anything it can't auto-fix, the commit is rejected with a clear error. If auto-fixes happened, the staged files are updated transparently.

**Two opt-outs we use:**

- `src/routes/index.tsx` — inline `// eslint-disable-next-line react-refresh/only-export-components` on the `router` export. The file is a route registry, not a component file; the warning would be noise.
- `src/App.tsx` — file-level `/* eslint-disable */` because it's a deprecated stub awaiting deletion.

**How to verify Stage 4:**

```
npm install            # adds the new deps + runs husky setup (silent if no .git yet)
npm run lint           # should report 0 errors / 0 warnings
npm run format:check   # should report all files match Prettier style
```

Husky's pre-commit hook activates only after `git init` (Stage 11). Before then, the `.husky/pre-commit` file exists but is inert.

### Stage 6 — Zustand + TanStack Query ✓ DONE

Files added:

| File                         | Role                                                                                                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/stores/uiStore.ts`      | First Zustand store: `theme`, `sidebarCollapsed` + actions, persisted to `localStorage` (key `qlik-mashup-ui`) via `persist` middleware; `partialize` strips action functions before serializing |
| `src/lib/queryClient.ts`     | Singleton `QueryClient` with sensible defaults (1m staleTime, 5m gcTime, 2 retries with exponential backoff, no refetch-on-focus, refetch on reconnect)                                          |
| `src/main.tsx` (modified)    | Wraps `<RouterProvider />` in `<QueryClientProvider>`; conditionally lazy-loads `<ReactQueryDevtools />` in dev only                                                                             |
| `src/stores/uiStore.test.ts` | 5 tests — defaults, setTheme, toggleSidebar, persistence to localStorage, action functions excluded from persistence                                                                             |

**Deps added:** `zustand@^5`, `@tanstack/react-query@^5`, `@tanstack/react-query-devtools@^5`.

**Why each pick (recap from earlier docs):**

- **Zustand** for cross-cutting UI state — see [docs/08-state-management-zustand.md](08-state-management-zustand.md)
- **TanStack Query** for server state — caching layer that protects the Qlik server from redundant calls — see [docs/12-performance-and-scalability.md](12-performance-and-scalability.md) Pillar 1
- **React Query DevTools** lazy-loaded so prod bundle doesn't pay for them

**The dev-only DevTools pattern (worth understanding):**

```tsx
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() => import('@tanstack/react-query-devtools').then((m) => ...))
  : null;
```

Vite replaces `import.meta.env.DEV` with the literal `true` (dev) or `false` (prod) at build time. In prod, the ternary becomes `false ? ... : null` — pure dead code. Rollup's tree-shaker drops the dynamic `import()` call entirely. **Result:** zero DevTools bytes in the production bundle, full DevTools in dev.

**How to verify Stage 6:**

```
npm install   # picks up zustand, react-query, react-query-devtools
npm run dev   # open browser; bottom-right shows TanStack Query DevTools floating button
npm test      # 10 passing (5 utils + 5 uiStore)
```

**Patterns established for the rest of the project:**

- Stores live in `src/stores/<name>Store.ts`
- Stores expose state + actions in the same shape; persist only data via `partialize`
- Server state (Qlik API calls) goes in TanStack Query, not Zustand — strict separation
- Component-local state stays in `useState`; promote to Zustand only when a second component needs it

### Stage 7 — Qlik integration architecture (mock-backed) ✓ DONE

Files added:

| File                                            | Role                                                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `src/lib/qlik/types.ts`                         | TypeScript interfaces for streams, apps, sheets, objects, layouts, `QlikSession`, `QlikAppHandle`                  |
| `src/lib/qlik/mockSession.ts`                   | In-memory mock with 3 streams, 5 apps, sheets, and two object kinds (bar chart + table); realistic latencies       |
| `src/lib/qlik/session.ts`                       | Singleton factory — returns mock today, will branch to real enigma in Stage 7b                                     |
| `src/stores/qlikSessionStore.ts`                | Zustand store enforcing the **1 active + 1 warm (60s TTL)** rule — handles same-app no-op, warm-promote, LRU evict |
| `src/stores/qlikSessionStore.test.ts`           | 7 tests covering every lifecycle case (cold open, no-op, demote, promote, TTL eviction, LRU, closeAll)             |
| `src/features/qlik-session/useEnigmaSession.ts` | Thin hook returning the singleton session                                                                          |
| `src/features/qlik-session/useDocList.ts`       | TanStack Query for streams + apps; 5-min `staleTime`; `select` groups by stream                                    |
| `src/features/qlik-session/useApp.ts`           | `useApp`, `useSheets`, `useObjectLayout` hooks — orchestrate `switchTo` and per-data caching                       |
| `src/components/charts/nebula/NebulaObject.tsx` | Placeholder chart renderer — title + kind tag + simple HTML table; swaps to real `nebula.js` in Stage 7b           |
| `src/components/Sidebar.tsx`                    | Streams → apps → sheets nav; sheet list lazy-loads when an app row is active                                       |
| `src/routes/RootLayout.tsx` (rewrite)           | Now just `<Sidebar /> + <Outlet />`                                                                                |
| `src/routes/HomeView.tsx` (rewrite)             | Welcome + grid of app cards from `useDocList`                                                                      |
| `src/routes/AppView.tsx` (rewrite)              | App-open status + sheet picker                                                                                     |
| `src/routes/SheetView.tsx` (rewrite)            | Renders all of a sheet's objects via `<NebulaObject />`                                                            |

**Why mock-only in Stage 7:** lets us prove every architectural pattern (one-app-at-a-time, warm cache, lazy queries, error states, navigation) end-to-end without depending on a Qlik server. Stage 7b swaps the mock for real `enigma.js` + `nebula.js` with no changes to the consuming code.

**The mock returns realistic latencies:** `getDocList` 120ms, `openApp` 300ms (the cold-start cost we cache around), `getSheets` 80ms, `getObject` 40ms. This makes loading states visible and tests the perceived-perf UX.

### Stage 10 — CI/CD pipeline ✓ DONE (lifted earlier than originally planned)

User decided to wire the full CI pipeline before adding more code so future code changes flow through it automatically. Files added:

| File                            | Role                                                                                                                                                                                                                             |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`      | On PR + push to `main`: install (`npm ci`) → lint → format:check → typecheck → test → build → `npm audit`                                                                                                                        |
| `.github/workflows/semgrep.yml` | SAST: PR + push to `main` + weekly Monday scan. Originally CodeQL; swapped 2026-05-08 when CodeQL failed with "Code scanning not enabled" — turns out CodeQL on private repos requires GitHub Advanced Security (org-only paid). |
| `.github/dependabot.yml`        | Weekly grouped npm updates (types, eslint, prettier, tanstack, testing, tailwind, radix); + GitHub Actions                                                                                                                       |
| `.gitattributes`                | LF normalization across OSes; CRLF preserved for Windows scripts                                                                                                                                                                 |
| `README.md` (root)              | Project overview pointing to `SKILLS.md` and `docs/`                                                                                                                                                                             |

**What's enforced:** every PR runs the quality gate AND Semgrep SAST. Branch protection (set up via GitHub UI) requires both green before merge.

**What's free at our scale:** all of it. Semgrep CLI + rule packs are free open-source; Dependabot, Secret Scanning, and Actions free-tier minutes (2,000/month) are far more than we need. CodeQL would have been free too if this were a public repo or an org with Advanced Security — not our case.

### Stage 11 — git init + initial commit ✓ DONE

`.git` initialized; husky's pre-commit hook (`npx lint-staged`) is now active. Initial commit captures Stages 1–7 + 10. Push to GitHub is the user's next step.

### Stage 8 — Sentry observability ✓ DONE (foundation)

Files added:

| File                                   | Role                                                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/observability/sentry.ts`      | `initSentry()` — env-aware init, no-op when DSN missing, samples 100% in dev / 10% in prod, scrubs auth-related headers via `beforeSend`   |
| `src/lib/observability/breadcrumbs.ts` | Typed helpers: `qlikBreadcrumb({ category, message, data })`, `navigationBreadcrumb({ from, to })`. Categories restricted to a fixed enum. |
| `src/main.tsx` (modified)              | Calls `initSentry()` BEFORE React renders so startup errors are captured                                                                   |
| `.env.example`                         | Documents `VITE_SENTRY_DSN` env var (gitignored `.env.local` is where the user pastes their actual DSN)                                    |

**Dep added:** `@sentry/react` (~7 packages, ~115 KB gzipped client-side).

**What's wired:**

- Unhandled exceptions → Sentry (auto)
- Unhandled promise rejections → Sentry (auto)
- Web Vitals (LCP, FCP, CLS, INP) → Sentry Performance (auto, via `browserTracingIntegration`)
- Page loads + transitions → traced (10% sampling in prod)
- Custom breadcrumbs for Qlik events → ready to call from `qlik-architect` work

**Deferred to follow-up stages:**

- `@sentry/vite-plugin` for source-map upload (needs `SENTRY_AUTH_TOKEN` from a real Sentry account; once user signs up + adds the secret in GitHub Actions, it's a 5-minute add)
- React Router v7 routing instrumentation (the basic browser tracing covers page loads; nicer route-name tags come later)
- Sentry user context (`Sentry.setUser({ id })`) — happens in Stage 7b once we have a real `userId` from `getAuthenticatedUser`
- Custom transactions wrapping engine calls (`app-open`, `sheet-render`, `export-data`) — better written when those calls are real Qlik, not mocked
- CI guard that fails the prod build if `VITE_SENTRY_DSN` is missing — currently a warning

**To activate Sentry:**

1. Sign up at sentry.io (free tier — 5K errors + 10K perf events/month)
2. Create a React project; copy the DSN
3. Locally: `cp .env.example .env.local`, paste DSN into `VITE_SENTRY_DSN`
4. In GitHub: repo → Settings → Secrets and variables → Actions → New repository secret → name `VITE_SENTRY_DSN`, value the DSN
5. Update `.github/workflows/ci.yml` build step to read the secret (one-line addition; defer until DSN exists)

### Stages ahead

| Stage | What gets added                                                  | Status  |
| ----- | ---------------------------------------------------------------- | ------- |
| 7b    | Replace mock with real `enigma.js` + nebula.js bar chart + table | pending |
| 9     | Playwright E2E                                                   | pending |
| 12    | size-limit + Lighthouse CI (perf gates from docs/12)             | pending |

Each stage is a single focused change with its own commit (eventually) and an update to this doc's "what's in stage X" section.

## 4. Pros

- **Each stage is reviewable.** No 50-file PRs.
- **Each stage's choices are visible.** Future-you can git-blame to see exactly when and why something landed.
- **Easy to skip / defer.** Stage 9 (E2E) can wait if we want; nothing earlier depends on it.
- **Teaches the stack from the ground up** rather than handing over a fait accompli.

## 5. Cons

- **Slower than running one big scaffolder.** A `degit` from a comprehensive starter would have us "done" in 30 seconds — but we'd have to retrofit understanding.
- **Risk of stage drift** — if we never finish a stage, the scaffold has a half-built area. Mitigated by completing each stage before starting the next.

## 6. Alternatives we considered

| Option                                                              | Why we didn't pick it                                        |
| ------------------------------------------------------------------- | ------------------------------------------------------------ |
| **`npm create vite@latest`** plus a giant follow-up commit          | Loses the per-stage learning; one big bang of files          |
| **Pre-built starter (e.g., a "shadcn dashboard starter" template)** | Hidden choices; can't tell what's load-bearing vs decoration |
| **`degit` from someone else's mashup repo**                         | Inherits their unknowns; harder to map to our docs           |
| **Skip scaffolding, build everything from scratch by hand**         | Wastes time on solved problems                               |

## 7. What this means for our project

Conventions we follow as we add stages:

- **One stage = one logical concern.** Don't mix Tailwind with Sentry in the same stage.
- **Update this doc** when a stage lands (mark status, list files added, note key choices).
- **Commit at the end of each stage** so git history mirrors the stage list.
- **If a stage is incomplete, don't start the next.** Avoids half-built corners.

The single most important habit: **understand each stage before starting the next.** If you can't explain why a file exists, dig in until you can — that's the whole point of building incrementally.
