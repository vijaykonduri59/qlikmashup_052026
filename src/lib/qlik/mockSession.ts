import type {
  QlikAppHandle,
  QlikAppId,
  QlikAppMetadata,
  QlikObjectId,
  QlikObjectLayout,
  QlikSession,
  QlikSheetMetadata,
  QlikStream,
} from './types';

// ---------------------------------------------------------------------------
// Canned data — three streams, five apps, a handful of sheets and objects.
// Lives only in dev (or until Stage 7b swaps in real enigma).
// ---------------------------------------------------------------------------

const STREAMS: QlikStream[] = [
  { id: 'stream-sales', name: 'Sales' },
  { id: 'stream-ops', name: 'Operations' },
  { id: 'stream-finance', name: 'Finance' },
];

const APPS: QlikAppMetadata[] = [
  {
    id: 'app-pipeline',
    name: 'Pipeline 2026',
    stream: STREAMS[0]!,
    description: 'Sales pipeline by region and rep.',
    lastReloadTime: '2026-05-07T08:00:00Z',
  },
  {
    id: 'app-won',
    name: 'Won Deals',
    stream: STREAMS[0]!,
    description: 'Closed-won deals YTD.',
    lastReloadTime: '2026-05-07T08:00:00Z',
  },
  {
    id: 'app-logistics',
    name: 'Logistics',
    stream: STREAMS[1]!,
    description: 'Shipping and inventory dashboard.',
    lastReloadTime: '2026-05-06T22:00:00Z',
  },
  {
    id: 'app-budget',
    name: 'Budget Tracker',
    stream: STREAMS[2]!,
    description: 'Budget vs actual spend.',
    lastReloadTime: '2026-05-07T06:00:00Z',
  },
  {
    id: 'app-forecast',
    name: 'Forecast',
    stream: STREAMS[2]!,
    description: 'Revenue forecast.',
    lastReloadTime: '2026-05-07T06:00:00Z',
  },
];

const SHEETS_BY_APP: Record<QlikAppId, QlikSheetMetadata[]> = {
  'app-pipeline': [
    {
      id: 'sheet-pipeline-overview',
      appId: 'app-pipeline',
      title: 'Overview',
      rank: 0,
      published: true,
      objects: ['obj-bar-region', 'obj-table-deals'],
    },
    {
      id: 'sheet-pipeline-by-region',
      appId: 'app-pipeline',
      title: 'By Region',
      rank: 1,
      published: true,
      objects: ['obj-bar-region'],
    },
    {
      id: 'sheet-pipeline-forecast',
      appId: 'app-pipeline',
      title: 'Forecast',
      rank: 2,
      published: true,
      objects: ['obj-table-deals'],
    },
  ],
  'app-won': [
    {
      id: 'sheet-won-summary',
      appId: 'app-won',
      title: 'Summary',
      rank: 0,
      published: true,
      objects: ['obj-bar-region'],
    },
  ],
  'app-logistics': [
    {
      id: 'sheet-logistics-shipments',
      appId: 'app-logistics',
      title: 'Shipments',
      rank: 0,
      published: true,
      objects: ['obj-table-deals'],
    },
  ],
  'app-budget': [
    {
      id: 'sheet-budget-overview',
      appId: 'app-budget',
      title: 'Overview',
      rank: 0,
      published: true,
      objects: ['obj-bar-region', 'obj-table-deals'],
    },
  ],
  'app-forecast': [
    {
      id: 'sheet-forecast-main',
      appId: 'app-forecast',
      title: 'Main',
      rank: 0,
      published: true,
      objects: ['obj-bar-region'],
    },
  ],
};

const OBJECT_LAYOUTS: Record<QlikObjectId, Omit<QlikObjectLayout, 'id'>> = {
  'obj-bar-region': {
    kind: 'barchart',
    title: 'Sales by Region',
    headers: ['Region', 'Revenue'],
    rows: [
      ['North', '128,400'],
      ['South', '94,200'],
      ['East', '156,100'],
      ['West', '112,800'],
    ],
  },
  'obj-table-deals': {
    kind: 'table',
    title: 'Top Deals',
    headers: ['Deal', 'Owner', 'Amount', 'Stage'],
    rows: [
      ['Acme Corp', 'Pat Singh', '85,000', 'Negotiation'],
      ['Globex', 'Rae Lin', '120,000', 'Proposal'],
      ['Initech', 'Dev Patel', '42,500', 'Closed Won'],
      ['Umbrella', 'Sam Cole', '67,000', 'Discovery'],
      ['Cyberdyne', 'Mei Park', '90,000', 'Negotiation'],
    ],
  },
};

// ---------------------------------------------------------------------------
// Realistic latency. App-open is intentionally the slowest call — that's true
// of the real Qlik engine and shapes our caching strategy (warm-previous-app).
// ---------------------------------------------------------------------------

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

class MockAppHandle implements QlikAppHandle {
  constructor(public readonly appId: QlikAppId) {}

  async getSheets(): Promise<QlikSheetMetadata[]> {
    await delay(80);
    const sheets = SHEETS_BY_APP[this.appId];
    if (!sheets) {
      throw new Error(`Mock: no sheets configured for app ${this.appId}`);
    }
    return [...sheets].sort((a, b) => a.rank - b.rank);
  }

  async getObject(objectId: QlikObjectId): Promise<QlikObjectLayout> {
    await delay(40);
    const layout = OBJECT_LAYOUTS[objectId];
    if (!layout) {
      throw new Error(`Mock: no layout configured for object ${objectId}`);
    }
    return { id: objectId, ...layout };
  }

  async close(): Promise<void> {
    await delay(20);
  }
}

class MockSession implements QlikSession {
  async getDocList(): Promise<QlikAppMetadata[]> {
    await delay(120);
    return APPS;
  }

  async openApp(appId: QlikAppId): Promise<QlikAppHandle> {
    // Simulates real Qlik cold-start latency. ~300ms is mid-range; cold
    // server-side opens can be 1–3 seconds.
    await delay(300);
    if (!APPS.some((a) => a.id === appId)) {
      throw new Error(`Mock: no app named ${appId}`);
    }
    return new MockAppHandle(appId);
  }

  async getAuthenticatedUser() {
    await delay(20);
    return { userDirectory: 'INTERNAL', userId: 'demo.user' };
  }

  async close(): Promise<void> {
    await delay(10);
  }
}

export function createMockSession(): QlikSession {
  return new MockSession();
}
