# Qlik Embedding: Capability API vs nebula.js vs enigma.js

_Last updated: 2026-05-07_

> The most consequential Qlik decision in any mashup project. Pick the wrong embedding library and every subsequent choice fights you.

---

## 1. What is it?

To put a Qlik chart on a web page, you need a JavaScript library that knows how to:

1. Open a connection to the Qlik Sense engine
2. Authenticate (through the virtual proxy in Enterprise)
3. Request a chart object or hypercube
4. Render it inside a `<div>` on your page
5. Listen for selections and react to them

There are **three** Qlik-supported ways to do this. Picking among them is the single most important architectural call in a mashup project.

## 2. Why we use it (in this project)

Each library exists at a different abstraction level. The "right" one depends on how much control you want versus how much you want done for you. For our project — modern React, modern UI, full custom layout — we chose **nebula.js + enigma.js**, and the rest of this doc explains why.

## 3. How it works

### Option A: Capability APIs (`qlik.js`) — the legacy path

The original Qlik mashup library, dating from the QlikView days. You include `qlik.js`, call `qlik.openApp(...)`, then `app.getObject(divId, objectId)` and Qlik renders a chart for you.

```
Your page → qlik.js → Qlik server
            (very high level: "render this chart in this div")
```

It's the path most legacy mashups (and most Qlik tutorials online) use.

### Option B: enigma.js — the low-level engine client

A pure WebSocket / JSON-RPC client for the Qlik engine. You speak the engine's protocol directly: open a session, get the doc, create a session object, fetch a hypercube, listen for changes.

```
Your page → enigma.js → Qlik engine WebSocket
            (very low level: every engine call is your responsibility)
```

You have to render the chart yourself — enigma just gives you the data.

### Option C: nebula.js — the modern, framework-friendly middle layer

Nebula is a chart-rendering library that sits **on top of enigma**. You give it an engine session (from enigma) plus an object ID, and it renders the chart into a `<div>`. The charts themselves are pluggable — Qlik ships standard ones (`barchart`, `linechart`, `kpi`, `table`), and you can add custom chart types as plugins.

```
Your page → nebula.js → enigma.js → Qlik engine
            (nebula renders the chart; enigma manages the connection)
```

This is Qlik's _current_ recommended approach for new mashups. It's framework-agnostic, well-documented, and designed for modern React/Vue/Svelte apps.

### How they relate

```
       Capability API (qlik.js)         Nebula + Enigma
       ─────────────────────────         ───────────────
Level: high-level, all-in-one            mid-level (nebula) + low-level (enigma)
Era:   legacy (still supported)          modern (active development)
Best:  quick prototypes, old mashups     production mashups, modern frameworks
```

## 4. Pros (of nebula.js + enigma.js, our pick)

- **Modern, actively developed** by Qlik — gets new features and bug fixes
- **Framework-agnostic** — drops cleanly into React (and Vue/Svelte) without iframe weirdness
- **Modular** — you only include what you use; chart types are individual packages
- **Pluggable** — you can register custom chart types or wrap existing ones
- **Same engine, more control** — when nebula isn't enough you can drop down to enigma directly
- **TypeScript-friendly** — has official types

## 5. Cons

- **More boilerplate than Capability API.** You're managing engine sessions, app handles, object lifecycles — not just calling `getObject()`.
- **Smaller community** than the legacy Capability API — older Stack Overflow answers will be `qlik.js` examples that don't translate cleanly.
- **Documentation gaps.** Qlik's docs are improving but you'll occasionally read source code to understand a behavior.
- **Auth integration is manual.** Nebula doesn't handle authentication — you give it an already-connected enigma session, which means you've solved auth before nebula gets involved.
- **Nebula bundles can be heavy** if you naively include every chart type.

## 6. Alternatives we considered

| Option                                         | Why we didn't pick it                                                                                                                                                                                                            |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Capability API (qlik.js)**                   | Tied to a global `qlik` object that fights with modern bundlers; renders charts via internal mechanisms that don't compose with React; Qlik's own roadmap deprioritizes it for new mashups; integration with Vite/HMR is awkward |
| **Pure enigma.js (no nebula)**                 | Forces us to write our own chart rendering for every visual. Reasonable if every chart is custom (D3/ECharts), excessive if we want to reuse Qlik's stock charts                                                                 |
| **iframe embedding (Single Configurator URL)** | Quick to set up but you can't style it, can't react to selections cleanly, and it looks like a stock Qlik sheet inside your app                                                                                                  |

**When we'd reconsider:** if our project ends up being almost entirely custom charts (D3/ECharts) with very few stock Qlik visuals, dropping nebula and going pure-enigma would shrink the bundle. Until then, nebula stays.

## 7. What this means for our project

In code, we will:

1. Use **enigma.js** to open a WebSocket session against the Qlik engine through the virtual proxy.
2. Use **nebula.js** to render charts into React `<div>` refs whenever we need a stock Qlik visual (bar chart, table, KPI, filter pane).
3. Drop down to **enigma.js directly** when we need to do something nebula doesn't expose — e.g., inspecting current selections, traversing the data model, listing available fields.

Every Qlik-related component in our app will follow a pattern roughly like:

```
React component mounts
  → ask app-level enigma session for the object handle
  → hand that object to nebula to render
  → on unmount, clean up the session/object so we don't leak
```

Getting that lifecycle right is one of the hardest parts of a mashup. We will write a custom React hook (`useQlikObject` or similar) that encapsulates it once and use it everywhere.
