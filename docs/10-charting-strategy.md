# Charting Strategy: Nebula by Default, Custom When Justified

_Last updated: 2026-05-07_

> Use Qlik's stock visuals via nebula.js for the common case. Drop down to custom rendering (ECharts, AG Grid, etc.) when nebula isn't enough or when we want a bespoke chart. The mashup supports both modes from day one.

---

## 1. What is it?

Two ways to put a Qlik-driven chart on the page, both in active use in our mashup:

| Path                | Renderer                                                              | When it's right                                                                                                     |
| ------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Nebula-only**     | `nebula.js` renders Qlik objects natively                             | Bar charts, line charts, KPIs, tables, filter panes — anything Qlik already does well                               |
| **Hybrid (custom)** | We fetch the hypercube via `enigma.js`, render with a third-party lib | Visuals nebula doesn't have (Sankey, treemap, geo, advanced grid features), or designs that fight nebula's defaults |

Both modes share the same data source (Qlik engine), the same selection state, and the same session. They're just two different ways of _drawing_.

## 2. Why we use it (in this project)

- **Pragmatic, not dogmatic.** Nebula gets us 80% of charts for ~5% of the work. The other 20% — where it doesn't fit — shouldn't bottleneck the whole mashup.
- **Learn both layers.** Working in both modes teaches you the full embedding stack: high-level (nebula) and low-level (enigma + custom rendering).
- **Future-proofs flexibility.** When the product owner asks for a chart Qlik doesn't ship, we don't have to argue — we just add it.
- **Keeps the bundle reasonable.** We don't blanket-import every visualization library; we add specific ones (ECharts, AG Grid) when actually used, lazy-loaded by route or feature.

## 3. How it works

### Path A — Nebula-only

```
React component mounts
  |
  v
1. Get app handle from shared enigma session
  |
  v
2. Call app.getObject(qlikObjectId) -> generic object handle
  |
  v
3. Hand handle + ref div to embed(...) from nebula
  |
  v
4. Nebula renders, listens for selections, manages lifecycle
  |
  v
5. On unmount: destroy nebula instance, release session object
```

A tiny wrapper hook makes this reusable:

```tsx
const { ref, status } = useNebulaObject({ appId, qlikObjectId });

return <div ref={ref} className="h-96 w-full" />;
```

### Path B — Hybrid (custom rendering)

```
React component mounts
  |
  v
1. Get app handle from shared enigma session
  |
  v
2. Create a session object describing the hypercube we want
   (qDef: dimensions, measures, sort order, ...)
  |
  v
3. Call obj.getLayout() -> hypercube data
  |
  v
4. Map hypercube rows -> chart-library data shape
  |
  v
5. Render with ECharts / AG Grid / D3 / etc.
  |
  v
6. Subscribe to obj.changed -> refetch on selection changes
  |
  v
7. On unmount: destroy session object
```

The mapping in step 4 is where custom-chart components get tricky. We'll write small adapter functions per chart library:

```ts
// src/lib/qlik/adapters.ts
function hypercubeToEchartsBarSeries(layout): EchartsSeries { ... }
function hypercubeToAgGridRows(layout): { rowData, columnDefs } { ... }
```

### The "hybrid toolkit" — recommended

For the custom-rendering side, our standard libraries:

| Library                                                  | License            | Free for enterprise use?                                                                                                         | When to reach for it                                                                                                                                                             |
| -------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Apache ECharts** (via `echarts-for-react`)             | Apache 2.0         | **Yes** — fully free, including commercial / enterprise / closed-source use; project is hosted at the Apache Software Foundation | Advanced visualizations: Sankey, treemap, sunburst, geo/map, candlestick, parallel coordinates, large scatter plots                                                              |
| **AG Grid Community**                                    | MIT                | **Yes** — fully free, commercial use OK                                                                                          | Power-user data tables: virtualized rows, multi-column sort/filter, grouping, Excel-like UX                                                                                      |
| **AG Grid Enterprise** _(only if Community gaps appear)_ | Commercial license | **No** — paid; per-developer licensing                                                                                           | Advanced grid features: integrated pivots, server-side row model, integrated charts, range selection. We start with Community and only buy this if a real feature gap forces it. |
| **(later, if needed) Recharts**                          | MIT                | Yes                                                                                                                              | Simple React-native charts; lighter than ECharts; only if we want a second option for trivial charts                                                                             |
| **(later, if needed) D3**                                | ISC                | Yes                                                                                                                              | Truly bespoke visuals where ECharts isn't enough; high cost, high power, high learning curve — last resort                                                                       |

ECharts + AG Grid Community handles the vast majority of "Qlik can't do this" cases at zero cost. Both licenses (Apache 2.0 and MIT) are permissive — no copyleft, no source-disclosure obligation, fully usable in closed-source enterprise builds.

**Watch out for:** **Highcharts** is often suggested as a "good chart library" but its license requires a commercial purchase for any non-personal/non-OSS use. We are not using Highcharts. **Plotly.js** has a similarly liberal license (MIT) but is heavier; not ruled out, just not our default.

### When to pick which path — decision rubric

| Question                                                                   | Lean nebula                          | Lean custom                       |
| -------------------------------------------------------------------------- | ------------------------------------ | --------------------------------- |
| Is there a Qlik chart type that fits?                                      | Yes → nebula                         | No → custom                       |
| Do we need a specific visual style Qlik can't theme to?                    | Theme via nebula CSS first           | Major redesign → custom           |
| Performance issue with the Qlik chart?                                     | Profile first                        | Confirmed bottleneck → custom     |
| Need interaction Qlik doesn't support (custom drag, brush, drill-down UX)? | Often nebula extension hooks suffice | Heavy custom interaction → custom |
| Just want it to look modern?                                               | Theme nebula (cheap)                 | Don't go custom for vanity        |

Default to nebula. Move to custom only when there's a concrete reason.

## 4. Pros

- **Lowest cost in the common case** — most charts are 10-line nebula components
- **Maximum flexibility when needed** — no architectural ceiling
- **Same data source for both paths** — selections, filters, and engine session are shared
- **Bundle stays lean** — third-party chart libs are only imported in components that use them, code-split per route
- **Clear decision pattern** — the rubric makes "which path?" answerable in seconds

## 5. Cons

- **Two patterns to maintain.** A mashup with both nebula and custom charts has more conceptual surface area than nebula-only.
- **Inconsistent styling risk.** Nebula charts and ECharts charts won't match by default — we need a shared theme/tokens layer (Tailwind colors → ECharts theme → nebula theme).
- **Adapter code is ours.** Hypercube → ECharts mapping is our problem; bugs there look like "data wrong in the chart" but are actually data-shape issues.
- **Easy to over-customize.** Pressure from "make it look better" can push us to custom-render charts nebula does fine. Resist unless there's a clear reason.
- **Nebula extensions vs. custom chart confusion.** Nebula supports custom chart _plugins_ — a third path between the two. Useful in some cases but it adds another mental model. We'll skip it for now.

## 6. Alternatives we considered

| Option                              | Why we didn't pick it                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Nebula-only (no hybrid)**         | Simpler, but the moment we need a chart Qlik doesn't have we're stuck or doing it poorly via workarounds                       |
| **All-custom (no nebula)**          | Maximum flexibility, but every chart costs 10× — including ones nebula does perfectly. Premature optimization for flexibility. |
| **iframe-embed Qlik sheets**        | Loses selection control, hard to style, looks like Qlik in a frame — defeats the point of a custom mashup                      |
| **Highcharts** (instead of ECharts) | Excellent library, commercial license required for our use case                                                                |
| **Plotly.js**                       | Powerful, but heavy bundle and dated UI                                                                                        |
| **Visx (Airbnb)**                   | Lower-level than ECharts; more code per chart; great for bespoke but overkill as a default                                     |

## 7. What this means for our project

Folder structure:

```
src/
  components/
    charts/
      nebula/
        NebulaObject.tsx          ← generic wrapper, used everywhere
        useNebulaObject.ts        ← the hook (fetch + render lifecycle)
      custom/
        EchartsChart.tsx          ← generic ECharts wrapper
        AgGridTable.tsx           ← generic AG Grid wrapper
        adapters/
          hypercubeToEcharts.ts
          hypercubeToAgGrid.ts
  features/
    sheet-renderer/
      SheetView.tsx               ← decides nebula vs custom per object
```

Open follow-ups (not blocking):

- **Theme harmonization:** define a Tailwind palette → derive ECharts theme + nebula theme from the same tokens. Plan to do this in a "theming pass" once the first few charts exist.
- **First custom charts:** identify which 1–2 visuals justify the hybrid path early, so we exercise the pattern before committing to it broadly.
- **Confirm chart libs:** ECharts + AG Grid is the recommendation. Pending your confirmation; can swap before scaffolding.

The single most important habit: **start every chart in nebula. Move to custom only when you have a concrete reason you can write down in the PR description.** "Looks nicer" is not a reason. "Nebula doesn't render this chart type" is.
