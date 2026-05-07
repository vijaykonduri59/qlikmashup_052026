import { useQuery } from '@tanstack/react-query';

import type { QlikAppMetadata, QlikStream } from '@/lib/qlik/types';

import { useEnigmaSession } from './useEnigmaSession';

export type StreamGroup = {
  stream: QlikStream;
  apps: QlikAppMetadata[];
};

/**
 * Fetches the user's accessible apps grouped by stream. Cached for 5 minutes
 * — the catalog rarely changes within a session.
 */
export function useDocList() {
  const session = useEnigmaSession();
  return useQuery({
    queryKey: ['docList'],
    queryFn: () => session.getDocList(),
    staleTime: 5 * 60_000,
    select: groupByStream,
  });
}

function groupByStream(apps: QlikAppMetadata[]): StreamGroup[] {
  const map = new Map<string, StreamGroup>();
  for (const app of apps) {
    let group = map.get(app.stream.id);
    if (!group) {
      group = { stream: app.stream, apps: [] };
      map.set(app.stream.id, group);
    }
    group.apps.push(app);
  }
  return Array.from(map.values());
}
