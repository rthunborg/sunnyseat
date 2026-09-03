import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { useReducedMotion } from '@/hooks/use-reduced-motion';

const QUERY = '(prefers-reduced-motion: reduce)';

describe('useReducedMotion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('reads and subscribes to the platform media query', () => {
    let matches = false;
    const listeners = new Set<() => void>();
    const mediaQuery = {
      get matches() {
        return matches;
      },
      media: QUERY,
      onchange: null,
      addEventListener: vi.fn((_type: string, listener: () => void) => {
        listeners.add(listener);
      }),
      removeEventListener: vi.fn((_type: string, listener: () => void) => {
        listeners.delete(listener);
      }),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } satisfies MediaQueryList;
    const matchMedia = vi.fn(() => mediaQuery);
    vi.stubGlobal('matchMedia', matchMedia);

    const { result, unmount } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);
    expect(matchMedia).toHaveBeenCalledWith(QUERY);
    expect(mediaQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    act(() => {
      matches = true;
      for (const listener of listeners) listener();
    });

    expect(result.current).toBe(true);
    unmount();
    expect(mediaQuery.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  test('fails closed to reduced motion when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(true);
  });
});
