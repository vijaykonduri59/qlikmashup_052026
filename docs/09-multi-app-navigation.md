# Multi-App Navigation: Streams → Apps → Sheets

_Last updated: 2026-05-07_

> The navigation backbone of the mashup. How users discover and move between Qlik content, respecting the access permissions Qlik already enforces.

---

## 1. What is it?

Qlik Sense Enterprise organizes content in a three-level hierarchy:

| Level      | Definition                                                                                                                                                       | What permissions look like                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Stream** | A category/folder grouping related apps. Set up by Qlik admins in QMC. Has its own access control list.                                                          | "Sales", "Operations", "Finance" — each visible only to users in the right user group |
| **App**    | A `.qvf` file: data model + sheets + scripts. Apps are _published into_ one or more streams.                                                                     | A user in the "Finance" stream can open all apps published there                      |
| **Sheet**  | A dashboard within an app. An app contains many sheets. Sheets can be "published" (visible to all who can open the app) or "private" (visible only to the owner) | Within a published app, a viewer sees published sheets + their own private ones       |

Our mashup will surface this hierarchy in its navigation:

```
[Sidebar]
 ├─ Stream: Sales
 │   ├─ App: Pipeline 2026
 │   │   ├─ Sheet: Overview
 │   │   ├─ Sheet: By Region
 │   │   └─ Sheet: Forecast
 │   └─ App: Won Deals
 ├─ Stream: Operations
 │   └─ App: Logistics
 ...
```

## 2. Why we use it (in this project)

- **It's how Qlik users already think.** Asking enterprise users to navigate by anything other than streams/apps would be confusing — they know this model from the Hub.
- **Permissions come for free.** Whatever access control your QMC enforces is automatically reflected — we just enumerate what the user _can_ see and Qlik handles the rest.
- **Multi-app is your stated requirement.** A single-app mashup is much simpler but doesn't fit your goal.
- **It scales.** A user with access to 50 apps gets a usable navigation tree without us hard-coding anything.

## 3. How it works

> **Constraint locked in 2026-05-07:** the mashup shows **exactly one app + one sheet at a time**. No split-view, no multi-app comparison, no concurrent app loading. This is a UX decision that doubles as a major performance simplification. All architecture below assumes this constraint.

### App handle lifecycle: 1 active + 1 warm-previous (60s TTL)

User-confirmed workflow: analysts switch between apps frequently to derive insights. A strict "close-on-every-switch" pattern would pay the (expensive) app-open cost on every switch-back. The smart pattern is a **60-second warm cache for the previous app**:

```
Initial state:
  enigma session: open (1 per tab)
  active app handle:   none
  warm app handle:     none
  warm timer:          --

User clicks a sheet for App A:
  -> open App A handle (active)
  active: A    warm: --

User clicks a sheet within App A:
  -> keep A handle (no re-open); swap session objects only
  active: A    warm: --

User clicks a sheet for App B:
  -> A becomes WARM (handle kept alive, not rendering)
  -> 60-second timer starts on A
  -> open App B handle (active) and render
  active: B    warm: A (60s TTL)

If user returns to App A within 60s:
  -> cancel A's timer
  -> A becomes active (no re-open — instant)
  -> B becomes warm with a fresh 60s timer
  active: A    warm: B (60s TTL)

If 60s elapses without return:
  -> close A's handle (Qlik server frees user-specific state)
  active: B    warm: -- (Qlik's own QIX cache may still keep A's data warm at server level for other users)

If user goes A -> B -> C while A is still warm:
  -> close A (LRU evict; we keep only ONE warm in v1)
  -> B becomes warm; C is active
  active: C    warm: B (60s TTL)
```

The Zustand `qlikSessionStore` tracks **one active handle + one warm handle** (each is a single slot, not a map). Per-user footprint: 1 active + at most 1 warm app. Sustained per-user cost is still ~1 app's RAM most of the time; only briefly 2× during active switching.

> **Why one warm slot, not two?** v1 simplicity. If real usage shows users frequently doing A → B → C → A patterns where they revisit a 3-back app, we can bump warm slots to 2 in v2. Easy to change later.

### Easing the app-click moment (the most expensive UX event)

Clicking an app is the **most expensive operation** in a Qlik mashup. The seven tactics we use to manage that cost:

| #   | Tactic                                | Type             | Implementation                                                                                                                                |
| --- | ------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **60-second warm previous-app cache** | Server load + UX | (See lifecycle above.) Eliminates re-open cost for the most common "switch and come back" pattern                                             |
| 2   | **Single-flight + cancel-on-switch**  | Server load      | `AbortController` (or TanStack Query cancellation) on rapid A→B→C clicks; only C's open completes — A and B are aborted                       |
| 3   | **Sheet-list cached for session**     | Network          | TanStack Query `staleTime: 5 * 60_000` for `['sheetList', appId]`; revisiting a known app's sheet list is instant                             |
| 4   | **Last-viewed-sheet memory**          | UX speed         | Persist `{ appId: lastSheetId }` in `localStorage`; on app open, route directly to last sheet                                                 |
| 5   | **Skeleton UI on click**              | Perceived speed  | Shaped placeholders the instant the click registers, before the engine call resolves                                                          |
| 6   | **No-op on same-app re-click**        | Server load      | Guard in the route handler — clicking the active app does nothing                                                                             |
| 7   | **Trust Qlik's QIX cache**            | Server load      | Don't artificially extend handle lifetime beyond the 60s warm window; let the server's own document-timeout enable hot-starts for other users |

**Deferred to v2** (real wins, not v1 priorities):

- **Hover pre-warming** — open on 500ms+ hover; cancel on hover-out
- **Predictive prefetch** based on per-user app-usage history
- **Multi-warm cache** — 2 warm slots instead of 1 if usage warrants
- **Split-view / side-by-side comparison** — significant scope; revisit if user feedback shows clear demand

### Multi-tab usage (the v1 "split-view" answer)

Users who genuinely need side-by-side comparison can simply **open the mashup in a second browser tab** and load a different app. This is officially supported and is our v1 answer to split-view.

**What's shared between tabs (same browser, same origin):**

- Qlik session cookie (both tabs are this user)
- `localStorage` (last-viewed-sheet map, theme preference)

**What's independent per tab:**

- React app instance
- Zustand stores (each tab has its own active + warm app handles)
- `enigma.js` WebSocket (each tab has its own engine session on Qlik server)
- Selections (selections in Tab 1 do not affect Tab 2)
- TanStack Query cache

**Per-tab footprint:**

```
Tab 1: 1 enigma session × (1 active + 1 warm) app handles × N session objects
Tab 2: 1 enigma session × (1 active + 1 warm) app handles × N session objects
```

A user with 2 tabs open costs roughly 2× the server resources of a single-tab user. Still 1 Qlik license — Qlik licenses are per-user, not per-session.

**What we add to handle this gracefully:**

| #   | Tactic                              | Why                                                                                                                                                                                                    |
| --- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Page Visibility API integration** | When a tab is hidden, immediately close the warm-previous-app handle (don't wait the 60s) and pause TanStack Query background refetches. Frees server RAM proactively for users parking inactive tabs. |
| 2   | **localStorage = last-write-wins**  | Both tabs may write to the same `localStorage` keys; last write wins. Documented behavior; no `BroadcastChannel` cross-tab coordination in v1. Neither tab gets into a broken state.                   |

**What we explicitly do NOT add:**

- No artificial tab limit — let users open as many tabs as they need
- No cross-tab state synchronization — tabs are independent by design
- No "you have another tab open" warning — annoying, no real benefit

**Capacity planning note:** if a meaningful percentage of users run multiple tabs (say 30%+), capacity planning should think in **concurrent sessions** rather than concurrent users. At 300 users with 30% multi-tab → ~400 concurrent engine sessions. Worth communicating to the Qlik admin team when sizing the production environment.

### Download / Export per chart

User-confirmed: download is part of the analysis workflow. Every chart in the mashup exposes a download menu:

| Chart type            | How export works                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Native nebula objects | Qlik Engine API `ExportData` call on the session object — server returns a download URL/blob                                          |
| Custom (ECharts)      | Generate CSV/XLSX **client-side** from the hypercube data already loaded; no extra engine call                                        |
| Custom (AG Grid)      | AG Grid's built-in `exportDataAsCsv` / `exportDataAsExcel` (Community has CSV; Excel needs Enterprise OR a free library like SheetJS) |

UX:

- "Download" button on every chart — opens a small menu with **CSV** and **Excel** options
- Filename pattern: `{AppName}_{SheetName}_{ChartTitle}.{csv|xlsx}` — sanitized
- Toast notification on completion
- Large-export warning: if the hypercube would export > 100K rows, confirm before generating (browsers struggle with very large client-generated files)

The **active app handle** services the export — no extra app open required. Exports **do not** keep the warm-cache timer running on a previous app.

### What we fetch from Qlik

To build the tree, we need three pieces of data:

| Data                                            | Qlik API                                                                                                   | Notes                                                    |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Apps the user can access (with stream metadata) | Engine API: `GetDocList` (returns `qDocList[]`) — each entry has `qMeta.stream.name` and `qMeta.stream.id` | One round-trip; gives us streams + apps in a single call |
| Sheets within an app                            | Engine API: open the app, then `CreateSessionObject` with type `SheetList` (uses GenericObject API)        | Per-app; lazy — only fetch when user expands the app     |
| Current user (for filtering "private" sheets)   | Engine API: `GetAuthenticatedUser`                                                                         | One-time on app start                                    |

### The data flow

```
App start
  |
  v
1. Open shared engine session (enigma.js, anonymous global handle)
  |
  v
2. GetDocList -> array of {appId, appName, stream: {id, name}}
  |
  v
3. Group by stream.id -> { streamId: {streamName, apps: [...]} }
  |
  v
4. Render sidebar tree (streams collapsed by default)

User clicks "expand app" in sidebar
  |
  v
5. Open per-app session, get SheetList
  |
  v
6. Filter to published sheets + user's own private sheets
  |
  v
7. Render sheets under the app

User clicks a sheet
  |
  v
8. Navigate to /app/<appId>/sheet/<sheetId> (URL is the source of truth)
  |
  v
9. Main pane renders the sheet via nebula.js
```

### Caching strategy (TanStack Query)

| Data               | Cache key              | Stale time                     | Why                               |
| ------------------ | ---------------------- | ------------------------------ | --------------------------------- |
| Stream + app list  | `['docList']`          | 5 min                          | Apps don't appear/disappear often |
| Sheet list per app | `['sheetList', appId]` | 5 min                          | Same                              |
| Current user       | `['currentUser']`      | Infinity (or session lifetime) | Doesn't change mid-session        |

### URL as source of truth

The current navigation state lives in the URL, _not_ in Zustand:

| URL pattern                                | Meaning                                                       |
| ------------------------------------------ | ------------------------------------------------------------- |
| `/`                                        | Root — show stream picker or default landing                  |
| `/app/:appId`                              | App selected — show app's default sheet (or sheet picker)     |
| `/app/:appId/sheet/:sheetId`               | Specific sheet open — render via nebula                       |
| `/app/:appId/sheet/:sheetId?selection=...` | (Future) Encode current selections in URL for shareable links |

This enables back-button, bookmarking, and sending links to teammates.

## 4. Pros

- **Familiar mental model** — users don't have to relearn how to find content
- **Permissions inherited automatically** — no role-based logic in our code
- **Scales naturally** — adding a new app/stream in QMC just appears
- **Deep-linkable** — the URL is the state, so sharing a sheet works
- **Cacheable** — TanStack Query caches the tree, so navigation feels instant after first load
- **No content sync** — we never have to mirror Qlik's catalog into our own store; we re-query

## 5. Cons

- **Many round-trips for sheet metadata.** Each app the user expands triggers a separate engine call. Mitigated by lazy fetching (don't expand all apps at once).
- **Sheet-list fetching requires opening the app session** — there's no cheap "list all sheets in all apps I can access" call. We open a session, get the list, close it.
- **Stream metadata can be stale.** If an admin moves an app to a different stream while the user is browsing, they see the old grouping until cache expires.
- **Empty streams.** A stream the user has access to but with no apps in it is a UX edge case — show it or hide it? (Our default: hide.)
- **Private/published sheet logic.** The Engine API exposes both; we have to filter manually based on whether the user owns the sheet vs. it's published. Subtle bug surface.
- **No native search.** Qlik Hub has a search-across-apps feature. Replicating it requires fetching everything upfront — opposite of our lazy strategy. Probably skip for v1.

## 6. Alternatives we considered

| Option                                                  | Why we didn't pick it                                                                                                      |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Single-app mashup**                                   | Simplest to build, but doesn't match your stated requirement                                                               |
| **Flat app list (no streams)**                          | Loses the organizational structure users expect; harder to navigate at scale                                               |
| **Hard-coded app/sheet list**                           | Fast to ship, breaks the moment Qlik catalog changes; fights against permissions                                           |
| **"Featured apps" curated landing page**                | Nice complement, but not a replacement for the full tree                                                                   |
| **Mirror Qlik metadata into our own DB**                | Massive scope creep; we'd own a sync problem we don't need                                                                 |
| **Pull from Qlik Repository API instead of Engine API** | More detailed metadata (tags, last-modified, owner) but requires separate auth (certificates/JWT) — overkill for our needs |

**When we'd reconsider:** if the user count grows past ~50 apps and the tree becomes overwhelming, we'd add a "favorites" feature in Zustand (persisted) and/or a search box. Both are non-breaking additions on top of the same tree.

## 7. What this means for our project

Folder structure when we build this:

```
src/
  features/
    navigation/
      useStreamsAndApps.ts    ← TanStack Query: GetDocList, group by stream
      useSheets.ts             ← TanStack Query: SheetList per app, lazy
      useCurrentUser.ts        ← TanStack Query: GetAuthenticatedUser
      Sidebar.tsx              ← The tree UI
      StreamRow.tsx
      AppRow.tsx
      SheetRow.tsx
  routes/
    AppView.tsx                ← /app/:appId — sheet picker + first sheet
    SheetView.tsx              ← /app/:appId/sheet/:sheetId — render via nebula
```

Open implementation questions to revisit:

- **Empty streams:** show or hide? (Default plan: hide.)
- **Sheet sort order:** alphabetical, by Qlik's `rank` field, or by last-modified? (Default plan: Qlik's rank, which is the order set in the app.)
- **Default sheet on app open:** first published sheet, or remember last-viewed per user? (Default plan: first sheet for v1, last-viewed via localStorage in a later iteration.)
- **Search across apps/sheets:** v2 feature, not v1.
- **Multi-language stream/app names:** Qlik supports multi-language metadata; not worrying about it for v1 unless you flag this as needed.

The single most important habit: **never short-circuit Qlik's permission model.** If the engine returns a list of N apps, you show those N apps. Don't add filtering logic that "hides admin apps" or "only shows recent ones" — that's a path to either bypassing security (bad) or surprising users (also bad).
