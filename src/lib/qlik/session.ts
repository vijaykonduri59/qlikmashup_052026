import { createMockSession } from './mockSession';
import type { QlikSession } from './types';

let sessionInstance: QlikSession | null = null;

/**
 * One Qlik session per browser tab — singleton. Lazily initialized on first
 * use.
 *
 * Stage 7: always returns a `MockSession` with canned data so the mashup
 * runs without a Qlik server.
 *
 * Stage 7b (future): will branch on env / config to return either a real
 * `enigma.js` session (against a configured Qlik server) or the mock.
 */
export function getQlikSession(): QlikSession {
  if (sessionInstance === null) {
    sessionInstance = createMockSession();
  }
  return sessionInstance;
}

/** Reset the singleton — used in tests only. */
export function __resetSessionForTesting(): void {
  sessionInstance = null;
}
