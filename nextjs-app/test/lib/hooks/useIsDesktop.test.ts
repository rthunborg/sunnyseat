import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';

describe('useIsDesktop', () => {
  let listeners: Map<string, (e: MediaQueryListEvent) => void>;
  let matchesValue: boolean;

  beforeEach(() => {
    listeners = new Map();
    matchesValue = false;

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: matchesValue,
        media: query,
        addEventListener: vi.fn((_event: string, handler: (e: MediaQueryListEvent) => void) => {
          listeners.set(query, handler);
        }),
        removeEventListener: vi.fn((_event: string) => {
          listeners.delete(query);
        }),
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when viewport is below 1024px', () => {
    matchesValue = false;
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);
  });

  it('returns true when viewport is at or above 1024px', () => {
    matchesValue = true;
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(true);
  });

  it('queries the correct breakpoint', () => {
    renderHook(() => useIsDesktop());
    expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 1024px)');
  });

  it('updates when media query changes', () => {
    matchesValue = false;
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);

    // Simulate resize to desktop
    const handler = listeners.get('(min-width: 1024px)');
    expect(handler).toBeDefined();

    act(() => {
      handler!({ matches: true } as MediaQueryListEvent);
    });

    expect(result.current).toBe(true);
  });

  it('updates back to false when resizing to mobile', () => {
    matchesValue = true;
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(true);

    const handler = listeners.get('(min-width: 1024px)');
    act(() => {
      handler!({ matches: false } as MediaQueryListEvent);
    });

    expect(result.current).toBe(false);
  });

  it('cleans up event listener on unmount', () => {
    const { unmount } = renderHook(() => useIsDesktop());

    const mockMq = (window.matchMedia as ReturnType<typeof vi.fn>).mock.results[0].value;
    unmount();

    expect(mockMq.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
