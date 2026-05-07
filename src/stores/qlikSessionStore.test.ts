import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { QlikAppHandle } from '@/lib/qlik/types';

import { WARM_TTL_MS, useQlikSessionStore } from './qlikSessionStore';

function makeHandle(appId: string): QlikAppHandle {
  return {
    appId,
    getSheets: vi.fn(async () => []),
    getObject: vi.fn(async () => {
      throw new Error('not used in store tests');
    }),
    close: vi.fn(async () => {}),
  };
}

describe('useQlikSessionStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useQlikSessionStore.setState({ active: null, warm: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens an app from cold (no active, no warm)', async () => {
    const a = makeHandle('A');
    const result = await useQlikSessionStore.getState().switchTo('A', async () => a);

    expect(result).toBe(a);
    expect(useQlikSessionStore.getState().active).toBe(a);
    expect(useQlikSessionStore.getState().warm).toBeNull();
  });

  it('reuses the active handle on same-app re-click (no re-open)', async () => {
    const a = makeHandle('A');
    const open = vi.fn(async () => a);

    await useQlikSessionStore.getState().switchTo('A', open);
    await useQlikSessionStore.getState().switchTo('A', open);

    expect(open).toHaveBeenCalledTimes(1);
  });

  it('demotes the previous active to warm when switching apps', async () => {
    const a = makeHandle('A');
    const b = makeHandle('B');

    await useQlikSessionStore.getState().switchTo('A', async () => a);
    await useQlikSessionStore.getState().switchTo('B', async () => b);

    expect(useQlikSessionStore.getState().active).toBe(b);
    expect(useQlikSessionStore.getState().warm?.handle).toBe(a);
    expect(a.close).not.toHaveBeenCalled();
  });

  it('promotes warm back to active without re-opening', async () => {
    const a = makeHandle('A');
    const b = makeHandle('B');
    const openA = vi.fn(async () => a);

    await useQlikSessionStore.getState().switchTo('A', openA);
    await useQlikSessionStore.getState().switchTo('B', async () => b);
    await useQlikSessionStore.getState().switchTo('A', openA);

    expect(openA).toHaveBeenCalledTimes(1); // didn't re-open A
    expect(useQlikSessionStore.getState().active).toBe(a);
    expect(useQlikSessionStore.getState().warm?.handle).toBe(b);
  });

  it('closes the warm handle after WARM_TTL_MS elapses', async () => {
    const a = makeHandle('A');
    const b = makeHandle('B');

    await useQlikSessionStore.getState().switchTo('A', async () => a);
    await useQlikSessionStore.getState().switchTo('B', async () => b);
    expect(a.close).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(WARM_TTL_MS);

    expect(a.close).toHaveBeenCalledOnce();
    expect(useQlikSessionStore.getState().warm).toBeNull();
  });

  it('evicts existing warm when a third app is opened (size-1 LRU)', async () => {
    const a = makeHandle('A');
    const b = makeHandle('B');
    const c = makeHandle('C');

    await useQlikSessionStore.getState().switchTo('A', async () => a);
    await useQlikSessionStore.getState().switchTo('B', async () => b);
    await useQlikSessionStore.getState().switchTo('C', async () => c);

    expect(a.close).toHaveBeenCalledOnce();
    expect(useQlikSessionStore.getState().active).toBe(c);
    expect(useQlikSessionStore.getState().warm?.handle).toBe(b);
  });

  it('closeAll closes both active and warm', async () => {
    const a = makeHandle('A');
    const b = makeHandle('B');

    await useQlikSessionStore.getState().switchTo('A', async () => a);
    await useQlikSessionStore.getState().switchTo('B', async () => b);
    await useQlikSessionStore.getState().closeAll();

    expect(a.close).toHaveBeenCalledOnce();
    expect(b.close).toHaveBeenCalledOnce();
    expect(useQlikSessionStore.getState().active).toBeNull();
    expect(useQlikSessionStore.getState().warm).toBeNull();
  });
});
