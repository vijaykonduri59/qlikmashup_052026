// Types describing the subset of Qlik concepts our mashup interacts with.
// Intentionally simpler than enigma.js's full schema — we model only what we
// USE. The same interface is implemented by the mock today and (later) by a
// real enigma.js wrapper.

export type QlikStreamId = string;
export type QlikAppId = string;
export type QlikSheetId = string;
export type QlikObjectId = string;

export interface QlikStream {
  id: QlikStreamId;
  name: string;
}

export interface QlikAppMetadata {
  id: QlikAppId;
  name: string;
  description?: string;
  stream: QlikStream;
  lastReloadTime?: string;
}

export interface QlikSheetMetadata {
  id: QlikSheetId;
  appId: QlikAppId;
  title: string;
  description?: string;
  rank: number;
  published: boolean;
  /** Object IDs visible on this sheet (charts, tables, KPIs, filter panes). */
  objects: QlikObjectId[];
}

export type QlikObjectKind = 'barchart' | 'table' | 'kpi' | 'filterpane';

/**
 * A simplified hypercube-ish layout returned by `getObject()` in our mock.
 * In the real engine, layouts are deeply nested and per-chart-type. This is
 * just enough for placeholder rendering in Stage 7. Real nebula.js takes
 * over rendering in Stage 7b.
 */
export interface QlikObjectLayout {
  id: QlikObjectId;
  kind: QlikObjectKind;
  title: string;
  /** Mock-data column headers. */
  headers: string[];
  /** Mock-data rows (cells stringified for simplicity). */
  rows: string[][];
}

/**
 * A handle to an open Qlik app. The session keeps the handle alive until
 * `close()` is called. Per the one-app-at-a-time rule (docs/09 + docs/12),
 * `qlikSessionStore` enforces that at most one handle is "active" and one
 * is "warm" (60s TTL) at any time.
 */
export interface QlikAppHandle {
  appId: QlikAppId;
  getSheets(): Promise<QlikSheetMetadata[]>;
  getObject(objectId: QlikObjectId): Promise<QlikObjectLayout>;
  close(): Promise<void>;
}

/**
 * The session interface our app depends on. One per browser tab. Either a
 * real enigma.js session (Stage 7b) or our mock (Stage 7) implements this.
 */
export interface QlikSession {
  /** List apps the user can access (with embedded stream metadata). */
  getDocList(): Promise<QlikAppMetadata[]>;

  /** Open an app handle. App-open is the most expensive operation in real Qlik. */
  openApp(appId: QlikAppId): Promise<QlikAppHandle>;

  /** Get the current authenticated user's identity. */
  getAuthenticatedUser(): Promise<{ userDirectory: string; userId: string }>;

  /** Close the entire session (typically called once on tab unload). */
  close(): Promise<void>;
}
