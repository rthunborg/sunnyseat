import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

type ChangeHandler = (event: MediaQueryListEvent) => void;

type MediaQueryListMock = {
  matches: boolean;
  media: string;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
};

describe('useMediaQuery', () => {
  let mql: MediaQueryListMock;
  let capturedHandler: ChangeHandler | undefined;

  beforeEach(() => {
    capturedHandler = undefined;
    mql = {
      matches: false,
      media: '(min-width: 1024px)',
      addEventListener: vi.fn((event: string, handler: ChangeHandler) => {
        if (event === 'change') {
          capturedHandler = handler;
        }
      }),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => mql),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('returns false on initial render (SSR-safe default)', () => {
    mql.matches = false;
    const { result } = renderHook(() =>
      useMediaQuery('(min-width: 1024px)'),
    );

    expect(result.current).toBe(false);
  });

  it('returns true after useEffect syncs with a matching media query', () => {
    mql.matches = true;
    const { result } = renderHook(() =>
      useMediaQuery('(min-width: 1024px)'),
    );

    expect(result.current).toBe(true);
  });

  it('updates to false when the change event fires with matches: false', () => {
    mql.matches = true;
    const { result } = renderHook(() =>
      useMediaQuery('(min-width: 1024px)'),
    );
    expect(result.current).toBe(true);
    expect(capturedHandler).toBeDefined();

    act(() => {
      capturedHandler?.({ matches: false } as MediaQueryListEvent);
    });

    expect(result.current).toBe(false);
  });

  it('removes the change listener with the same handler on unmount', () => {
    const { unmount } = renderHook(() =>
      useMediaQuery('(min-width: 1024px)'),
    );

    expect(mql.addEventListener).toHaveBeenCalledTimes(1);
    const registeredHandler = mql.addEventListener.mock.calls[0]?.[1];

    unmount();

    expect(mql.removeEventListener).toHaveBeenCalledTimes(1);
    expect(mql.removeEventListener.mock.calls[0]?.[0]).toBe('change');
    expect(mql.removeEventListener.mock.calls[0]?.[1]).toBe(registeredHandler);
  });
});
