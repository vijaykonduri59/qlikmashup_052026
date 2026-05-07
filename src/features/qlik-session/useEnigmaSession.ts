import { useMemo } from 'react';

import { getQlikSession } from '@/lib/qlik/session';
import type { QlikSession } from '@/lib/qlik/types';

/**
 * Returns the singleton Qlik session for this browser tab. Lazy-initialized
 * on first call. The thin hook indirection means we can later swap the
 * source (e.g. read from Zustand context, or branch by env) without changing
 * every consumer.
 */
export function useEnigmaSession(): QlikSession {
  return useMemo(() => getQlikSession(), []);
}
