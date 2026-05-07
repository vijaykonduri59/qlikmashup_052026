# Project Documentation

This folder is the **learning record** for the Qlik Sense Mashup project. Every meaningful concept, decision, library, or pattern we encounter gets its own document so you (or anyone joining later) can build a real mental model of the project.

> **Goal:** by the time the project ships, this folder should read like a self-contained tutorial on building a modern Qlik Sense Enterprise mashup — not a dump of facts.

## How to read this

Documents are numbered roughly in the order they become relevant. You can read top-to-bottom, or jump to a topic when you need it.

| #   | Document                                                                   | Topic                                                                                                         |
| --- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 00  | [\_template.md](_template.md)                                              | The format every doc in this folder follows                                                                   |
| 01  | [01-foundations.md](01-foundations.md)                                     | What's a Qlik Sense mashup, Enterprise vs Cloud, why build one                                                |
| 02  | [02-the-stack.md](02-the-stack.md)                                         | Vite, React, TypeScript, Tailwind, shadcn — what each does and why                                            |
| 03  | [03-qlik-embedding.md](03-qlik-embedding.md)                               | Capability API vs nebula.js vs enigma.js (the most important Qlik choice)                                     |
| 04  | [04-context-and-persistence.md](04-context-and-persistence.md)             | How this project keeps context across multi-month AI-assisted work                                            |
| 05  | [05-source-control-and-cicd.md](05-source-control-and-cicd.md)             | GitHub + GitHub Actions: how every code change gets validated automatically                                   |
| 06  | [06-security-scanning.md](06-security-scanning.md)                         | The four-layer security baseline (CodeQL, Dependabot, Secret Scanning, npm audit)                             |
| 07  | [07-authentication.md](07-authentication.md)                               | Why deploying as a content-library extension means we don't write auth code (and the dev-environment caveat)  |
| 08  | [08-state-management-zustand.md](08-state-management-zustand.md)           | Zustand: store conventions, mental model, when to reach for global state vs `useState` vs TanStack Query      |
| 09  | [09-multi-app-navigation.md](09-multi-app-navigation.md)                   | The streams → apps → sheets navigation tree, how we fetch it from Qlik, caching, URL-as-state                 |
| 10  | [10-charting-strategy.md](10-charting-strategy.md)                         | Nebula-only by default, custom rendering (ECharts/AG Grid) for cases nebula can't handle                      |
| 11  | [11-routing.md](11-routing.md)                                             | React Router v7 (library mode), URL-as-state pattern, nested routes for streams/apps/sheets                   |
| 12  | [12-performance-and-scalability.md](12-performance-and-scalability.md)     | Designing for 2–3K DAU: shared engine sessions, lazy loading, caching, virtualization, perf budgets and gates |
| 13  | [13-error-handling-and-resilience.md](13-error-handling-and-resilience.md) | Layered error boundaries, error categorization, TanStack Query retry policies, WebSocket reconnect            |
| 14  | [14-testing-strategy.md](14-testing-strategy.md)                           | Vitest + @testing-library/react + Playwright; coverage targets; CI integration                                |
| 15  | [15-logging-and-observability.md](15-logging-and-observability.md)         | Sentry as observability spine; custom Qlik breadcrumbs; performance monitoring; alerts                        |
| 16  | [16-target-platform-scope.md](16-target-platform-scope.md)                 | Desktop-only scope (laptop + monitor); no mobile, no tablet, no PWA                                           |
| 17  | [17-project-scaffold.md](17-project-scaffold.md)                           | Living document tracking each stage of the scaffold (Stage 1: base Vite/React/TS)                             |

_More documents will be added as we make decisions on deployment, etc._

## The format

Every document follows the structure in [\_template.md](_template.md):

1. **What is it?** — plain definition
2. **Why we use it (in this project)** — project-specific reasoning
3. **How it works** — mechanics, mental model
4. **Pros** — what makes it good
5. **Cons** — where it hurts or where it can bite you
6. **Alternatives we considered** — what we said no to and why
7. **What this means for our project** — the practical takeaway

This format is deliberate: it forces every doc to teach the _tradeoff_, not just "we chose X."

## Relationship to other project files

| File                           | Purpose                                                              |
| ------------------------------ | -------------------------------------------------------------------- |
| [`../SKILLS.md`](../SKILLS.md) | High-level decision log — short, scannable, with dates               |
| [`../CLAUDE.md`](../CLAUDE.md) | Auto-loaded by Claude every session; points at SKILLS.md and `docs/` |
| `docs/*` (this folder)         | Detailed learning record — the _why_ and _how_ behind each decision  |

Think of it as: SKILLS.md tells you **what** we decided; `docs/` tells you **why and how**.
