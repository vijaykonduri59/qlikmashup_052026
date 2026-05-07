# Target Platform: Desktop (Laptop / Monitor) Only

_Last updated: 2026-05-07_

> A small but important scope decision: this mashup runs on desktop browsers only. No mobile, no tablet, no PWA. This simplifies layout, interactions, and design system substantially.

---

## 1. What is it?

The set of devices and viewport sizes the mashup officially supports:

| Device                                 | Supported?                |
| -------------------------------------- | ------------------------- |
| Desktop / laptop (viewport ≥ 1280×720) | **Yes** — the only target |
| Large external monitor (≥ 1920×1080)   | **Yes** — works the same  |
| Tablet (iPad, Surface)                 | **No** — not in v1 scope  |
| Phone                                  | **No** — not in v1 scope  |
| Touch-first interaction                | **No** — not optimized    |
| PWA / installable                      | **No**                    |
| Offline mode                           | **No**                    |

## 2. Why we use it (in this project)

User-confirmed: enterprise users access this mashup from work laptops with full keyboards and external monitors. Phone or tablet usage is not a stated need.

Locking this in early avoids a class of decisions that would otherwise compound:

- No hamburger-menu sidebars
- No touch-first selection patterns
- No swipe gestures
- No responsive font scaling
- No PWA service workers
- No offline-mode caching strategies

## 3. How it works

### Layout assumptions

- **Minimum viewport: 1280×720** (a standard 13" laptop)
- **Sidebar always visible** — no responsive collapse to drawer
- **Multi-pane layouts allowed** at large widths (≥ 1600px)
- **Mouse + keyboard primary** — touch is incidental at best

### Browser support

| Browser                         | Versions          | Notes                     |
| ------------------------------- | ----------------- | ------------------------- |
| **Chrome / Edge** (Chromium)    | Latest 2 versions | Primary target            |
| **Firefox**                     | Latest 2 versions | Secondary; tested         |
| **Safari**                      | Latest 2 versions | Tested but lower priority |
| Internet Explorer / legacy Edge | None              | Not supported             |

We can use modern JS/CSS features without polyfills:

- Native ES modules
- CSS Grid, flexbox, custom properties
- Optional chaining, nullish coalescing
- `fetch`, `Promise`, `async/await`, `AbortController`

### Tailwind viewport strategy

We use Tailwind's responsive prefixes minimally — basically just to handle the 1280px → 2560px+ range:

```tsx
<div className="px-4 lg:px-8 xl:px-12">
```

We do **NOT** use `sm:` / `md:` aggressively. Anything below `lg:` is unusual and probably wrong.

### What this changes about other decisions

| Doc / Decision                                                     | Implication                                                                   |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| [02-the-stack.md](02-the-stack.md) (Tailwind)                      | Reduce reliance on responsive variants; design for fixed-ish desktop layouts  |
| [09-multi-app-navigation.md](09-multi-app-navigation.md) (sidebar) | Sidebar is always visible; no mobile drawer                                   |
| [10-charting-strategy.md](10-charting-strategy.md) (charts)        | Charts can assume ≥ 600px width on most layouts; no narrow-viewport redesigns |

## 4. Pros

- **Significantly less work** in design system, layout, and interaction code
- **Charts look great by default** at desktop sizes; no compromise visuals at narrow widths
- **No PWA complexity** (service workers, manifest, install flows)
- **No touch-vs-mouse interaction conflicts**
- **No "hidden until expanded" UI patterns** — sidebar lives at the same place every time

## 5. Cons

- **Excludes any mobile use case.** A field user on a phone gets a broken experience.
- **Pivoting to mobile later is expensive.** Layout, navigation, and interaction would all need rework.
- **Tablet users in meetings** (e.g., presenting from an iPad) get a marginal experience.

## 6. Alternatives we considered

| Option                                   | Why we didn't pick it                                                       |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| **Responsive everywhere (mobile-first)** | Significant additional work for a use case the user explicitly doesn't need |
| **Tablet-friendly (only down to 768px)** | Adds work + testing surface for a small audience                            |
| **PWA / installable**                    | No clear value-add for a desktop-only mashup                                |
| **Native mobile app**                    | Different project entirely                                                  |

**When we'd reconsider:** if user feedback shows demand for mobile/tablet (e.g., field reps want phone access), we'd add responsive layouts in v2. Cost: 2–4 weeks of design + implementation, not a complete rewrite.

## 7. What this means for our project

Practical effects:

- **Tailwind config:** keep default breakpoints; we'll only use `lg:` and `xl:` in practice
- **Layout components:** `<RootLayout>` always renders sidebar — no conditional rendering on viewport
- **Touch handlers:** not added; mouse events suffice
- **No service worker, no `manifest.json`, no offline UX**
- **Browser support tested** in Chrome (primary), Edge, Firefox, Safari latest

The single most important habit: **don't waste time on responsive logic.** If a feature would only matter at a narrow viewport, skip it. Reclaim that time for the desktop experience.
