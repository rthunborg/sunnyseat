import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSunnyNow } from '@/lib/hooks/useSunnyNow';

describe('useSunnyNow', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches sunny partners on mount', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        venues: [
          { id: 1, name: 'Test', slug: 'test', sunStatus: 'Sunny', sunPercentage: 80 },
        ],
        timestamp: new Date().toISOString(),
      }),
    });

    const { result } = renderHook(() => useSunnyNow());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/partners/sunny-now');
    expect(result.current.sunnyPartners).toEqual(['1']);
    expect(result.current.sunnyVenues).toHaveLength(1);
  });

  it('returns empty arrays on fetch error', async () => {
    mockFetch.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useSunnyNow());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sunnyPartners).toEqual([]);
    expect(result.current.sunnyVenues).toEqual([]);
  });

  it('returns empty arrays on non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false });

    const { result } = renderHook(() => useSunnyNow());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sunnyPartners).toEqual([]);
  });

  it('starts loading initially', () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ venues: [], timestamp: new Date().toISOString() }),
    });

    const { result } = renderHook(() => useSunnyNow());
    expect(result.current.isLoading).toBe(true);
  });

  it('converts venue ids to strings in sunnyPartners', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        venues: [
          { id: 42, name: 'Café', slug: 'cafe', sunStatus: 'Sunny', sunPercentage: 90 },
          { id: 7, name: 'Bar', slug: 'bar', sunStatus: 'Partial', sunPercentage: 55 },
        ],
        timestamp: new Date().toISOString(),
      }),
    });

    const { result } = renderHook(() => useSunnyNow());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sunnyPartners).toEqual(['42', '7']);
  });
});
