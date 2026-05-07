# Qlik Sense Mashup (Enterprise)

A modern Qlik Sense Enterprise mashup built with **Vite + React 19 + TypeScript +
Tailwind v4 + shadcn/ui**, designed for 2,000–3,000 daily active users on
on-premises Qlik Sense Enterprise.

> 📚 **Project context lives in [SKILLS.md](SKILLS.md) and [docs/](docs/)** — every
> meaningful decision is recorded with what / why / how / pros / cons /
> alternatives. New contributors (including future-you) should start there.

## Stack

| Layer            | Pick                                                                              |
| ---------------- | --------------------------------------------------------------------------------- |
| Build            | Vite 6                                                                            |
| Framework        | React 19 + TypeScript (strict)                                                    |
| Styling          | Tailwind v4 + shadcn/ui                                                           |
| State            | Zustand (UI state) + TanStack Query (server state)                                |
| Routing          | React Router v7 (library mode)                                                    |
| Qlik integration | nebula.js + enigma.js (mocked in v1; real swap-in is Stage 7b)                    |
| Charting hybrid  | nebula by default; ECharts + AG Grid Community for custom                         |
| Testing          | Vitest + Testing Library + Playwright                                             |
| Errors           | `react-error-boundary` (per-chart, per-route, global)                             |
| Observability    | Sentry (errors + performance + Qlik breadcrumbs)                                  |
| CI/CD            | GitHub Actions (CI) + Semgrep (SAST) + Dependabot + Secret Scanning + `npm audit` |

## Getting started

```bash
npm install
npm run dev          # Vite dev server at http://localhost:5173
```

### Common scripts

```bash
npm run dev              # Vite dev server (http://localhost:5173)
npm run build            # production build
npm run preview          # serve the production build locally

npm test                 # one-shot Vitest run (CI mode)
npm run test:watch       # Vitest watch mode
npm run test:coverage    # generate coverage/index.html

npm run lint             # ESLint
npm run lint:fix         # ESLint with --fix
npm run format           # Prettier --write
npm run format:check     # Prettier --check
npm run typecheck        # tsc -b (strict)
```

## Project layout

```
src/
├── main.tsx                ← QueryClientProvider > RouterProvider, dev DevTools
├── routes/                 ← React Router v7 routes
│   ├── index.tsx
│   ├── RootLayout.tsx
│   ├── HomeView.tsx
│   ├── AppView.tsx         (lazy)
│   ├── SheetView.tsx       (lazy)
│   └── NotFound.tsx
├── components/
│   ├── Sidebar.tsx         ← streams → apps → sheets nav
│   ├── ui/                 ← shadcn components
│   └── charts/nebula/      ← chart wrappers
├── features/qlik-session/  ← hooks: useEnigmaSession, useDocList, useApp
├── lib/
│   ├── qlik/               ← types, mock session, real session factory
│   └── queryClient.ts      ← TanStack Query client
└── stores/
    ├── uiStore.ts          ← theme, sidebar (persist)
    └── qlikSessionStore.ts ← active + warm app handle (60s TTL)
```

## Architectural commitments

- **One Qlik engine session per browser tab** (singleton)
- **One active + one warm-previous app handle** with 60-second TTL — see [docs/09](docs/09-multi-app-navigation.md)
- **Performance is non-negotiable** for 200–450 concurrent users — see [docs/12](docs/12-performance-and-scalability.md)
- **Desktop only** — min viewport 1280×720, no mobile / tablet / PWA — see [docs/16](docs/16-target-platform-scope.md)

## License

Personal project — license TBD.
