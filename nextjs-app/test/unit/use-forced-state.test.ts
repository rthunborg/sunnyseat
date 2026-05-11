import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
}));

describe('useForcedState', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('returns the raw _state query value in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { useSearchParams } = await import('next/navigation');
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('_state=premium-paywall') as ReturnType<typeof useSearchParams>,
    );
    const { useForcedState } = await import('@/lib/dev/use-forced-state');

    const { result } = renderHook(() => useForcedState());

    expect(result.current).toBe('premium-paywall');
  });

  it('returns null when _state is absent in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { useSearchParams } = await import('next/navigation');
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as ReturnType<typeof useSearchParams>,
    );
    const { useForcedState } = await import('@/lib/dev/use-forced-state');

    const { result } = renderHook(() => useForcedState());

    expect(result.current).toBeNull();
  });

  it('returns null unconditionally when NODE_ENV === "production"', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { useSearchParams } = await import('next/navigation');
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('_state=premium-paywall') as ReturnType<typeof useSearchParams>,
    );
    const { useForcedState } = await import('@/lib/dev/use-forced-state');

    const { result } = renderHook(() => useForcedState());

    expect(result.current).toBeNull();
    expect(useSearchParams).not.toHaveBeenCalled();
  });
});
