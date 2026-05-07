import { create } from 'zustand';

import type { QlikAppHandle, QlikAppId } from '@/lib/qlik/types';

/**
 * TTL for the warm-previous-app handle. See docs/09 (Multi-app navigation)
 * + docs/12 (Performance) for full rationale. Tweak in v2 if usage data
 * shows users frequently revisit older apps.
 */
export const WARM_TTL_MS = 60_000;

type WarmHandle = {
  handle: QlikAppHandle;
  closeAt: number; // epoch ms when this is scheduled to close
  timeoutId: number;
};

type QlikSessionState = {
  /** Currently rendering app handle. */
  active: QlikAppHandle | null;
  /** Recently active, kept alive for fast switch-back. Size 1 in v1. */
  warm: WarmHandle | null;

  /**
   * Switch the active app to `appId`. Same-app re-clicks are a no-op.
   * If the requested app is in the warm slot, it's promoted (no re-open).
   * Otherwise `openHandle` is called and the previous active becomes warm.
   */
  switchTo: (appId: QlikAppId, openHandle: () => Promise<QlikAppHandle>) => Promise<QlikAppHandle>;

  /** Close everything. Used on tab unload + by tests. */
  closeAll: () => Promise<void>;
};

export const useQlikSessionStore = create<QlikSessionState>((set, get) => ({
  active: null,
  warm: null,

  switchTo: async (appId, openHandle) => {
    const { active, warm } = get();

    // Case 1 — already active. No-op.
    if (active && active.appId === appId) {
      return active;
    }

    const scheduleEviction = (handle: QlikAppHandle): WarmHandle => {
      const closeAt = Date.now() + WARM_TTL_MS;
      const timeoutId = window.setTimeout(() => {
        // Avoid races: only close + clear if THIS handle is still warm.
        const current = get().warm;
        if (current?.handle === handle) {
          set({ warm: null });
          void handle.close().catch(() => {});
        }
      }, WARM_TTL_MS);
      return { handle, closeAt, timeoutId };
    };

    // Case 2 — requested app is warm. Promote without re-open.
    if (warm && warm.handle.appId === appId) {
      window.clearTimeout(warm.timeoutId);
      const promoted = warm.handle;
      const newWarm = active ? scheduleEviction(active) : null;
      set({ active: promoted, warm: newWarm });
      return promoted;
    }

    // Case 3 — cold. Open the new handle and demote the old active.
    const next = await openHandle();
    if (warm) {
      window.clearTimeout(warm.timeoutId);
      void warm.handle.close().catch(() => {});
    }
    const newWarm = active ? scheduleEviction(active) : null;
    set({ active: next, warm: newWarm });
    return next;
  },

  closeAll: async () => {
    const { active, warm } = get();
    if (warm) {
      window.clearTimeout(warm.timeoutId);
      await warm.handle.close().catch(() => {});
    }
    if (active) {
      await active.close().catch(() => {});
    }
    set({ active: null, warm: null });
  },
}));
