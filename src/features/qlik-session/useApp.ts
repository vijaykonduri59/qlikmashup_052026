import { useQuery } from '@tanstack/react-query';

import type { QlikAppId, QlikObjectId, QlikObjectLayout } from '@/lib/qlik/types';
import { useQlikSessionStore } from '@/stores/qlikSessionStore';

import { useEnigmaSession } from './useEnigmaSession';

/**
 * Returns the active app handle for the given `appId`. Backed by the
 * session store's switchTo (which enforces the one-app-at-a-time + 60s
 * warm-previous rule from docs/09 and docs/12).
 */
export function useApp(appId: QlikAppId | undefined) {
  const session = useEnigmaSession();
  const switchTo = useQlikSessionStore((s) => s.switchTo);

  return useQuery({
    queryKey: ['app', appId],
    queryFn: async () => {
      if (!appId) throw new Error('appId required');
      return switchTo(appId, () => session.openApp(appId));
    },
    enabled: !!appId,
  });
}

/**
 * Sheets for an app. Requires the app handle to be open.
 * Cached for 5 minutes per app (sheets rarely change mid-session).
 */
export function useSheets(appId: QlikAppId | undefined) {
  const app = useApp(appId);
  return useQuery({
    queryKey: ['sheets', appId],
    queryFn: () => {
      if (!app.data) throw new Error('app handle not open');
      return app.data.getSheets();
    },
    enabled: app.isSuccess,
    staleTime: 5 * 60_000,
  });
}

/**
 * Layout (data) for a single Qlik object — chart, table, KPI, etc.
 * Cached for 1 minute; selections invalidate it via the engine in real Qlik.
 */
export function useObjectLayout(appId: QlikAppId | undefined, objectId: QlikObjectId | undefined) {
  const app = useApp(appId);
  return useQuery<QlikObjectLayout>({
    queryKey: ['object', appId, objectId],
    queryFn: () => {
      if (!app.data) throw new Error('app handle not open');
      if (!objectId) throw new Error('objectId required');
      return app.data.getObject(objectId);
    },
    enabled: app.isSuccess && !!objectId,
    staleTime: 60_000,
  });
}
