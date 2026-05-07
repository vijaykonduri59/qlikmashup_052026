import { beforeEach, describe, expect, it } from 'vitest';

import { useUiStore } from './uiStore';

describe('useUiStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useUiStore.setState({ theme: 'system', sidebarCollapsed: false });
  });

  it('exposes default state', () => {
    const state = useUiStore.getState();
    expect(state.theme).toBe('system');
    expect(state.sidebarCollapsed).toBe(false);
  });

  it('setTheme updates the theme', () => {
    useUiStore.getState().setTheme('dark');
    expect(useUiStore.getState().theme).toBe('dark');
  });

  it('toggleSidebar flips the boolean each call', () => {
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
  });

  it('persists state to localStorage under the configured key', () => {
    useUiStore.getState().setTheme('dark');
    useUiStore.getState().toggleSidebar();

    const stored = JSON.parse(localStorage.getItem('qlik-mashup-ui') ?? '{}');
    expect(stored.state.theme).toBe('dark');
    expect(stored.state.sidebarCollapsed).toBe(true);
  });

  it('does not persist action functions (only data)', () => {
    useUiStore.getState().setTheme('light');

    const stored = JSON.parse(localStorage.getItem('qlik-mashup-ui') ?? '{}');
    expect(stored.state.setTheme).toBeUndefined();
    expect(stored.state.toggleSidebar).toBeUndefined();
  });
});
