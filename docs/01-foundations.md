# Foundations: Mashups, Qlik Enterprise, and Why We're Building This

_Last updated: 2026-05-07_

> Before any code, you need a clear picture of what a Qlik Sense mashup actually is, why "Enterprise" changes everything, and what problem a custom mashup solves that the out-of-the-box Hub doesn't.

---

## 1. What is it?

A **Qlik Sense mashup** is a web page (or a full web application) that embeds Qlik Sense charts, tables, KPIs, filters, and selection state — but presents them in a UI you fully control.

Out of the box, Qlik Sense gives users:

- The **Hub** — the home page that lists all apps
- **Sheets** — the dashboards inside an app, designed in the Qlik authoring tool
- A fixed look, fixed navigation, fixed layout

A mashup says: _"Keep Qlik's data engine and chart rendering. Replace everything around it with my own UI."_ You pick the layout, the branding, the navigation, the workflow. Qlik becomes a service your custom app talks to.

**Qlik Sense Enterprise** = the on-premises (Windows-server) version of Qlik. It's the version installed inside corporate networks, behind firewalls, with central administration via the **QMC** (Qlik Management Console). This is the opposite of **Qlik Cloud**, which is the SaaS version Qlik hosts.

These two versions look the same on the surface, but the embedding rules are wildly different.

## 2. Why we use it (in this project)

A custom mashup is the right answer when one or more of these is true:

- **The default Hub doesn't fit the audience.** Executives, frontline workers, or partners all need different entry points than "here's a list of apps."
- **Branding matters.** Corporate identity, white-labeling, customer-facing dashboards.
- **Workflow integration.** You want Qlik visuals to live next to non-Qlik UI (forms, tables from other systems, custom controls).
- **Modern UX expectations.** Native-feeling app, fast navigation, mobile-friendly, dark mode — things the Qlik Hub is not optimized for.
- **Selective exposure.** Show certain charts to certain user groups, hide the rest of the Qlik environment entirely.

Our project hits multiple of these — we want a modern, branded, custom-layout experience for enterprise users, not the stock Hub.

## 3. How it works

A Qlik Sense mashup is built on three layers:

```
┌─────────────────────────────────────────┐
│  Your custom UI (React, layouts, nav)   │  ← we build this
├─────────────────────────────────────────┤
│  Qlik embedding library                 │  ← nebula.js / enigma.js / qlik.js
│  (renders charts, manages selections)   │
├─────────────────────────────────────────┤
│  Qlik Sense Engine                      │  ← Qlik server does the heavy lifting
│  (associative data model, calculations) │
└─────────────────────────────────────────┘
```

The custom UI sends requests to the Qlik engine over a **WebSocket** connection. The engine returns chart data (called a **hypercube**) or full rendered chart objects. Selections made in the UI flow back through the engine, which updates everything else in real time — that's Qlik's "associative" magic.

For Enterprise specifically, the WebSocket goes through a **virtual proxy** (configured in QMC), which is responsible for authenticating the user before any Qlik call is allowed.

## 4. Pros

- Full creative control over the UI without giving up Qlik's data engine
- Lets you put Qlik next to non-Qlik components in the same screen
- Better mobile / responsive behavior than out-of-box sheets
- One bundle to deploy = one set of analytics for many user types
- Can outperform native Qlik UI for narrow use cases (only render what's needed)

## 5. Cons

- **You're now responsible for everything.** Auth flows, accessibility, responsive design, error handling, performance — none of that comes free anymore.
- **Qlik upgrades can break things.** Engine API and embedding libraries evolve; mashups need maintenance.
- **Authoring still happens in Qlik.** Charts and data models are still built in the Qlik desktop tool. You can't redesign a measure from your React app.
- **Performance is your problem.** A poorly-coded mashup that creates too many WebSocket sessions or doesn't cache hypercubes will hammer the Qlik engine.
- **Enterprise auth is finicky.** CORS, virtual proxy prefixes, ticketing, JWT — this is where most projects bleed time.

## 6. Alternatives we considered

| Option                                                      | Why we didn't pick it                                                     |
| ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| Use Qlik's default Hub + Sheets                             | Doesn't meet the modern UI / branding / workflow goal                     |
| Iframe-embed a Qlik sheet inside our own app                | Crude, no control over selections, sized poorly, looks dated              |
| Qlik Sense extensions (custom chart types, but inside Qlik) | Solves a different problem — a custom _chart_, not a custom _app shell_   |
| Build entirely without Qlik (Power BI / Tableau / DIY)      | Throws away the existing Qlik investment, data models, and security model |

We're not throwing out Qlik — we're putting a modern face on it.

## 7. What this means for our project

Our mashup is a **custom React app** that talks to **Qlik Sense Enterprise** over a WebSocket through a **virtual proxy**. We own everything visual; Qlik owns the data and calculations. The boundary between "us" and "Qlik" is the embedding library (nebula.js / enigma.js — see [03-qlik-embedding.md](03-qlik-embedding.md)).

Every architectural decision in this project should be evaluated against one question: _does this make the mashup feel like a first-class modern web app, while still respecting that Qlik is the source of truth for data?_
