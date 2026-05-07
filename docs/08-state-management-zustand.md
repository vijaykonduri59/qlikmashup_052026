# State Management: Zustand

_Last updated: 2026-05-07_

> A tiny, hook-based state library that gives us global state without Redux's ceremony or React Context's prop-drilling pain.

---

## 1. What is it?

**Zustand** (German for "state") is a state-management library for React. It lets you create a _store_ — a JavaScript object that holds shared state — and subscribe to it from any component using a simple hook. State changes trigger re-renders only in the components that read the changed slice.

In our project, Zustand handles:

- **UI state** that multiple components need: which app is open, which sheet is selected, which navigation panel is expanded
- **Cross-cutting concerns**: theme, sidebar collapsed/expanded, notification toasts
- **Cached app metadata** that's expensive to recompute

Zustand does **not** handle:

- **Server state** (data from Qlik) — that goes in TanStack Query
- **Component-local state** (an input's value, a dialog's open/closed) — that stays in `useState`
- **Form state** — react-hook-form (when we add it)

The mental model: TanStack Query owns _data from the server_; `useState` owns _what's local to one component_; Zustand owns _what multiple components share but isn't from the server_.

## 2. Why we use it (in this project)

- **Smaller, simpler API than Redux Toolkit.** No actions, reducers, slices, providers. A store is one file with a few functions.
- **No Provider boilerplate.** Unlike React Context, you don't wrap your tree in a `<Provider>` per store. Just import the hook and use it.
- **TypeScript-friendly without ceremony.** Type your state once, get full inference everywhere it's used.
- **Selective subscriptions = fast.** A component that reads `state.theme` won't re-render when `state.sidebarOpen` changes. This matters in a dashboard with many components.
- **Light bundle.** ~1KB gzipped. Redux Toolkit is closer to 12KB.
- **Right size for our scope.** A mashup isn't a 50-developer codebase — Redux's structure pays off when many people contribute. Solo + multi-month, Zustand is the sweet spot.

## 3. How it works

### Creating a store

```ts
// src/stores/uiStore.ts
import { create } from 'zustand';

type UiState = {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  toggleSidebar: () => void;
  setTheme: (t: 'light' | 'dark') => void;
};

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  theme: 'light',
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
}));
```

### Reading from a component

```tsx
function Header() {
  // Selector: only re-render when `theme` changes
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);

  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>Theme: {theme}</button>
  );
}
```

### How it actually works under the hood

Zustand keeps state in a plain JavaScript closure. The `create` function returns a hook that, when called, subscribes the component to the store's change events. The selector function (`s => s.theme`) determines _which slice_ the component cares about. Zustand uses strict equality (or a custom `equality` function) to decide whether to re-render. Changes are made imperatively via `set(...)` — no immutability dance, no reducers.

The naming convention `useXyzStore` mimics the React hook convention so call sites read naturally.

## 4. Pros

- **Tiny API surface.** Three concepts: `create`, `set`, `get`. A new developer is productive in minutes.
- **No provider hell.** Multiple stores compose without wrapping the tree.
- **No immutability boilerplate.** `set({ count: state.count + 1 })` just works (Zustand uses Object.assign under the hood).
- **Built-in middleware** — persist (localStorage), devtools (Redux DevTools), immer (immutable updates), subscribe-with-selector.
- **Excellent TypeScript ergonomics** — types flow naturally without ceremony.
- **Plays well with React 18 concurrent features.**
- **Active maintenance** with a small, focused team (Poimandres collective, who also maintain Jotai and Valtio).

## 5. Cons

- **Less ecosystem than Redux.** If you need an off-the-shelf "undo/redo manager" or "time-travel debugger" with rich UI, Redux Toolkit has more.
- **Less opinionated.** Two developers will structure stores differently — Redux's rigid pattern is sometimes a feature.
- **No built-in async story.** Async logic lives in your `set` callbacks or in custom hooks. (TanStack Query owns most async anyway, so this is rarely a problem.)
- **Devtools work but aren't as polished.** Redux DevTools support is good, not great.
- **Risk of "store sprawl"** if you reach for global state too often. Discipline: keep stores focused, don't dump everything into one mega-store.

## 6. Alternatives we considered

| Option                     | Why we didn't pick it                                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Redux Toolkit**          | The senior choice for very large teams; adds boilerplate (slices, reducers, actions) that's wasted effort at our scope              |
| **Jotai**                  | Atom-based; elegant for fine-grained state but a different mental model that takes longer to get right                              |
| **Recoil**                 | Meta's library; effectively unmaintained as of 2024                                                                                 |
| **Valtio**                 | Mutation-based via Proxies; cool but unusual; smaller community                                                                     |
| **MobX**                   | Powerful but heavier; opinionated about classes/decorators                                                                          |
| **Plain React Context**    | Fine for tiny apps; rerenders the whole subtree on every change, which is a perf killer in dashboards                               |
| **No global state at all** | Try, fail, come back. Mashups need cross-component state (current app, current sheet, etc.) — prop-drilling 6 levels deep is misery |

**When we'd reconsider:** if the project grows a team of 4+ developers contributing concurrently, Redux Toolkit's enforced structure starts paying off. Until then, Zustand wins.

## 7. What this means for our project

The folder structure we'll converge on:

```
src/
  stores/
    uiStore.ts            ← sidebar, theme, layout
    qlikSessionStore.ts   ← which engine session is active
    selectionStore.ts     ← (maybe) custom selection state for non-Qlik filters
    navigationStore.ts    ← which stream/app/sheet is open
```

Conventions:

- One file per logical store. Resist creating a single mega-store.
- Stores expose **state + actions** in the same object. No separate "actions" file.
- Keep stores **dumb** — they hold state and trivial setters. Side effects (Qlik engine calls, navigation) go in components or custom hooks.
- Use the `persist` middleware for things the user expects to survive a reload (theme, sidebar collapsed state). Don't persist anything Qlik-related — that's session data and should reset.

Quick triage when you're tempted to add state somewhere:

| Where does this data come from?                      | Where it lives                   |
| ---------------------------------------------------- | -------------------------------- |
| Qlik engine (chart data, app list, etc.)             | TanStack Query                   |
| User typed it in this component                      | `useState`                       |
| Multiple components need it but it's not from server | Zustand store                    |
| It belongs in the URL (current app, current sheet)   | React Router (URL is your state) |
| Form input being edited                              | react-hook-form                  |

The single best habit: **default to `useState` first, promote to Zustand only when a second component needs the same state.** Premature global state is a common path to a slow, hard-to-reason-about app.
