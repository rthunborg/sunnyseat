import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

function setOnLine(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value });
}

describe('useOnlineStatus', () => {
  afterEach(() => {
    setOnLine(true);
    vi.restoreAllMocks();
  });

  it('reports online by default', () => {
    setOnLine(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it('re-syncs to offline when the browser was already offline at mount', () => {
    setOnLine(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
  });

  it('flips to false on an `offline` event and back to true on `online`', () => {
    setOnLine(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    setOnLine(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);

    setOnLine(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current).toBe(true);
  });

  it('removes both window listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useOnlineStatus());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});
