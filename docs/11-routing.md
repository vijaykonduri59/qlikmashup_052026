# Routing: React Router v7 (Library Mode)

_Last updated: 2026-05-07_

> Why we picked the safe industry default, what we trade away vs TanStack Router, and how routing actually shapes the mashup's structure.

---

## 1. What is it?

**React Router v7** is the dominant routing library for React. It maps URLs to components: when the URL is `/app/123/sheet/abc`, React Router decides which React components to mount and what params they get.

A small but important distinction in v7 — there are **two ways to use it**:

| Mode               | What it is                                                                                   | When to use                                                     |
| ------------------ | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Library mode**   | Just the router; you set up the rest of your app yourself                                    | **Our choice** — pairs naturally with Vite + our existing stack |
| **Framework mode** | Full framework (formerly Remix) with file-based routing, server-side rendering, data loaders | Overkill for a client-only mashup                               |

We use **library mode** exclusively. Anywhere this doc says "React Router," it means library mode.

History sidebar: **React Router v7 = React Router v6 + Remix merged into one project.** When you read older tutorials, "React Router v6" code mostly works in v7 unchanged; v7 added optional new features (data routers, lazy routes) without breaking the v6 API.

## 2. Why we use it (in this project)

- **AI assistance quality is dramatically higher** than any alternative — this matters every single day in a multi-month solo project.
- **Massive ecosystem.** Every React tutorial, every Stack Overflow answer, every Qlik mashup example you'll Google uses React Router. Searching for help is frictionless.
- **Mature error boundaries and scroll restoration** — these are non-trivial things you don't want to build yourself.
- **Stable across project lifetime.** v6 → v7 was the biggest evolution; future changes are unlikely to be disruptive in our scope.
- **Plays well with everything we already picked** — Vite, TanStack Query, Zustand. No friction.
- **Type safety is "good enough."** Manual route param generics get us most of the way to TanStack Router's compile-time guarantees.

## 3. How it works

### Defining routes (code-based)

```tsx
// src/routes/index.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import RootLayout from './RootLayout';
import HomeView from './HomeView';
import AppView from './AppView';
import SheetView from './SheetView';
import NotFound from './NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />, // shared sidebar + header
    errorElement: <NotFound />,
    children: [
      { index: true, element: <HomeView /> },
      { path: 'app/:appId', element: <AppView /> },
      { path: 'app/:appId/sheet/:sheetId', element: <SheetView /> },
    ],
  },
]);

// src/main.tsx
<RouterProvider router={router} />;
```

### Reading params and the URL

```tsx
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';

function SheetView() {
  // Path params
  const { appId, sheetId } = useParams<{ appId: string; sheetId: string }>();

  // Query string (?selection=...)
  const [searchParams, setSearchParams] = useSearchParams();
  const selection = searchParams.get('selection');

  // Programmatic navigation
  const navigate = useNavigate();
  navigate(`/app/${appId}/sheet/${anotherSheetId}`);
}
```

### Nested routes (the big idea)

Our route tree mirrors our UI tree:

```
RootLayout (sidebar + header always visible)
  ├─ HomeView                 →  /
  ├─ AppView                  →  /app/:appId
  └─ SheetView                →  /app/:appId/sheet/:sheetId
```

A request for `/app/123/sheet/abc` mounts `RootLayout` → `SheetView`. The sidebar and header don't unmount when navigating between sheets — only the main pane swaps. That's the value of nested routes.

### URL as state (critical pattern)

All navigation state lives in the URL, **not** in Zustand:

| What               | URL pattern                       | Why URL                                                                       |
| ------------------ | --------------------------------- | ----------------------------------------------------------------------------- |
| Current app        | `/app/:appId`                     | Bookmarkable, shareable, browser-back works                                   |
| Current sheet      | `/app/:appId/sheet/:sheetId`      | Same                                                                          |
| (Later) Selections | `?selection=Region:US,California` | Lets you send a teammate a link to "the dashboard with these filters applied" |

This is why we picked Zustand for _cross-cutting UI state_ and React Router for _navigation state_. They don't overlap.

### Lazy-loaded routes (performance)

For large routes, lazy-load to keep the initial bundle small:

```tsx
{
  path: 'app/:appId/sheet/:sheetId',
  lazy: () => import('./SheetView'),  // code-split
},
```

This becomes important once we add ECharts/AG Grid components to specific routes.

## 4. Pros

- **Industry default** — best documentation, most tutorials, biggest community
- **Best AI assistance** of any routing library
- **Mature** — battle-tested at every scale from solo to Facebook-sized
- **Nested routes** are exactly the right model for our streams/apps/sheets UI
- **Type-safe enough** — manual generics on `useParams`, type assertion on params, gets us 90% of the way to TanStack Router's safety
- **Clean separation from data fetching** — TanStack Query handles loading; React Router just decides which component renders
- **Built-in scroll restoration, error boundaries, loaders, actions** — non-trivial features we don't have to build
- **Easy migration path** to framework mode (Remix) later if we ever want SSR

## 5. Cons

- **Manual type-safety on params** — `useParams<{ appId: string }>()` works but is opt-in; you can forget the generic and silently get `undefined`-typed params
- **Two modes (library vs framework)** can confuse beginners reading docs — many examples assume framework mode and won't work as written
- **Loaders and actions** are powerful but overlap with TanStack Query; the v7 evolution sometimes shows
- **Legacy concepts** like `useNavigate` and `<Navigate>` exist alongside newer patterns; there's more than one way to do most things
- **Bundle size** is bigger than minimal alternatives (Wouter, etc.) — but acceptable, and the ecosystem benefit dominates

## 6. Alternatives we considered

| Option                               | Why we didn't pick it                                                                                                                                                                        |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TanStack Router**                  | Strictly better type safety and beautiful URL-state ergonomics; loses on community size, AI assistance, and tutorial availability — productivity win goes to React Router for a solo project |
| **Wouter**                           | Tiny (~1KB) routing library; great for trivial apps; lacks nested routes, scroll restoration, error boundaries — we'd outgrow it within weeks                                                |
| **Reach Router**                     | Deprecated; merged into React Router years ago                                                                                                                                               |
| **Hash routing only** (`#/app/123`)  | Avoids server-side routing config but loses SEO and looks unprofessional in URLs                                                                                                             |
| **Build our own with `history` API** | Reinvents a complex wheel for no upside                                                                                                                                                      |
| **Next.js routing**                  | Would force us into Next.js the framework, which is wrong shape for a Qlik mashup (no SSR needed)                                                                                            |

**When we'd reconsider:** if the project becomes route-heavy enough that compile-time URL safety is paying for itself in caught bugs (>50 routes, complex nesting), TanStack Router becomes the right move. We're not there.

## 7. What this means for our project

Folder structure:

```
src/
  routes/
    index.tsx              ← router config (createBrowserRouter)
    RootLayout.tsx         ← sidebar + header + <Outlet />
    HomeView.tsx           ← /
    AppView.tsx            ← /app/:appId
    SheetView.tsx          ← /app/:appId/sheet/:sheetId
    NotFound.tsx           ← errorElement / catch-all
  main.tsx                 ← <RouterProvider router={router} />
```

Conventions we'll follow:

- **All navigation state in the URL.** If two screens need to share something that survives a refresh, it goes in the URL. Period.
- **`useParams<T>()` always typed** — never bare `useParams()`. Lint rule, eventually.
- **Lazy-load routes** with significant dependencies (charts, AG Grid). Initial bundle stays small.
- **One `RootLayout`** that owns the sidebar + header + outlet — never re-render the sidebar on sheet navigation.
- **`<Link>` over `<a>`** for internal navigation (preserves SPA behavior).
- **Avoid loaders for now.** Use TanStack Query in the components themselves. Loaders are powerful but overlap with what TanStack Query already gives us; mixing patterns is confusing.

The single most important habit: **the URL is your state.** When in doubt about whether something belongs in Zustand or the URL, ask "would I want to share this state with a teammate via a link?" If yes, URL.
