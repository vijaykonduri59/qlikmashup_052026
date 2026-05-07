# The Frontend Stack

_Last updated: 2026-05-07_

> The five core pieces of our frontend — Vite, React, TypeScript, Tailwind, shadcn/ui — and why each was chosen over its alternatives.

---

## 1. What is it?

The "stack" is the combination of tools and libraries that determine how we write, build, and ship the mashup's frontend. Five layers, each solving a different job:

| Layer             | Job                                      | Our pick         |
| ----------------- | ---------------------------------------- | ---------------- |
| Build tool        | Compile and bundle code; serve in dev    | **Vite**         |
| UI framework      | Component model, rendering, state hooks  | **React 18+**    |
| Language          | Static types over JavaScript             | **TypeScript**   |
| Styling system    | How we write CSS                         | **Tailwind CSS** |
| Component library | Pre-built buttons, dialogs, tables, etc. | **shadcn/ui**    |

These compose together: Vite builds React+TypeScript code, which uses Tailwind classes, which style shadcn/ui components.

## 2. Why we use it (in this project)

This stack hits four goals:

1. **AI-assisted dev quality.** This combination has the biggest training data of any web stack — Claude/Cursor/v0 produce dramatically better code in this stack than alternatives. Over a multi-month project, that compounds.
2. **Speed of iteration.** Vite + Tailwind is the fastest "edit and see it" loop in the JS ecosystem.
3. **Type safety with messy external data.** Qlik engine payloads are loosely typed. TypeScript turns "what shape is this hypercube?" from a runtime mystery into a compile-time guarantee.
4. **No reinventing wheels.** shadcn/ui gives us accessible, professional components day one. We are not building a `<Combobox />` from scratch.

## 3. How it works

### Vite

A dev server + build tool. In dev mode it serves your source files directly to the browser using ES modules — no bundling — which is why it starts in milliseconds. For production it switches to **Rollup** under the hood and outputs an optimized bundle.

### React

Components are JavaScript functions that return JSX (HTML-like syntax). State is managed with hooks (`useState`, `useEffect`, `useMemo`). React diffs your component tree and updates only what changed.

### TypeScript

Adds optional static types on top of JavaScript. Compiles to plain JS before it runs. The compiler catches "this object doesn't have that property" errors before you push.

### Tailwind

Utility-first CSS. Instead of writing `.my-button { padding: 16px; background: blue; }`, you write `<button class="p-4 bg-blue-500">`. Styling lives in the markup.

### shadcn/ui

Not an installed package — a CLI that **copies component source code into your repo**. Components are built on Radix UI (accessibility primitives) and styled with Tailwind. You can edit them freely because they're just files in your project.

```
Vite (dev server + bundler)
  └─ React (component tree)
       └─ TypeScript (type-checks before compile)
            └─ Tailwind (utility classes in JSX)
                 └─ shadcn/ui (Radix-based components, in your repo)
```

## 4. Pros

- Fast feedback loop — sub-second dev reload
- Excellent AI assistance — every layer has heavy AI training coverage
- Type safety where it matters most (Qlik payload boundaries)
- shadcn means production-quality components day one with full editability
- Tailwind makes design changes fast — adjust a class, see the result
- Each layer is the modern industry default — easy to hire for, easy to onboard

## 5. Cons

- **Tailwind makes JSX visually noisy.** Long `className` strings everywhere. Some developers find it unreadable.
- **TypeScript adds friction.** Generics, narrowing, type errors that look scary at first.
- **shadcn means more files in your repo.** Every component you `add` becomes source code you maintain.
- **No silver bullet for state.** React's built-in state hooks aren't enough for a real app — you'll add a state library (Zustand or Redux Toolkit) or a server-state library (TanStack Query).
- **Vite quirks with WebSockets and HTTPS.** Qlik integration in dev requires a careful proxy config. We will hit this.

## 6. Alternatives we considered

### Build tool

| Option                 | Why we didn't pick it                                                |
| ---------------------- | -------------------------------------------------------------------- |
| Webpack                | Slower dev start, much more config, dying in greenfield projects     |
| Create React App (CRA) | Officially deprecated; no longer recommended by React team           |
| Parcel                 | Smaller community, less Qlik/React-specific guidance available       |
| Next.js / Remix        | Server-side rendering frameworks — overkill for a client-only mashup |

### UI framework

| Option             | Why we didn't pick it                                                     |
| ------------------ | ------------------------------------------------------------------------- |
| Vue 3              | Smaller ecosystem for AI tools; less Qlik-mashup community knowledge      |
| Svelte / SvelteKit | Genuinely elegant, but smaller AI training corpus and fewer Qlik examples |
| Solid.js           | Excellent perf, but niche; we'd be on our own for problem-solving         |
| Angular            | Heavy, opinionated, ages slower; weaker AI assistance                     |

### Language

| Option           | Why we didn't pick it                                                       |
| ---------------- | --------------------------------------------------------------------------- |
| Plain JavaScript | Qlik payloads are typed nightmares without TS; bugs surface only at runtime |
| Flow             | Largely abandoned outside Meta                                              |

### Styling

| Option                                 | Why we didn't pick it                                                |
| -------------------------------------- | -------------------------------------------------------------------- |
| CSS Modules                            | Boring in a good way, but slower dev loop; no built-in design tokens |
| CSS-in-JS (styled-components, Emotion) | Runtime cost; falling out of fashion in 2026                         |
| UnoCSS                                 | Faster than Tailwind but smaller ecosystem and weaker AI assistance  |
| Panda CSS                              | Type-safe CSS-in-JS; great DX but smaller community                  |
| Vanilla Extract                        | Excellent for design systems; verbose for everyday use               |

### Component library

| Option                        | Why we didn't pick it                                              |
| ----------------------------- | ------------------------------------------------------------------ |
| MUI (Material UI)             | Heavy, opinionated visual style, harder to override                |
| Ant Design                    | Very enterprise-y by default but rigid theming                     |
| Chakra UI                     | Solid choice; less editable than shadcn (you don't own the source) |
| Headless UI / Radix UI alone  | shadcn already gives us Radix + sensible Tailwind defaults         |
| Build everything from scratch | Wastes months on accessible primitives                             |

## 7. What this means for our project

You'll write **TypeScript React components** styled with **Tailwind utility classes**, dropping in **shadcn/ui components** from `components/ui/` whenever you need a button, dialog, table, or input. **Vite** will run the dev server and produce the production bundle. Every layer is a standard, well-documented choice — when you're stuck, the answer is almost always one search away, and Claude will be much more useful inside this stack than any alternative.
