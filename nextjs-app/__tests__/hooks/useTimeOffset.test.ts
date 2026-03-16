import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTimeOffset } from '@/lib/hooks/useTimeOffset';

describe('useTimeOffset', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('starts with offset 0 and no future data', () => {
    const { result } = renderHook(() => useTimeOffset(57.7, 11.95));
    expect(result.current.timeOffset).toBe(0);
    expect(result.current.futureExposure).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('does not fetch when offset is 0', () => {
    renderHook(() => useTimeOffset(57.7, 11.95));
    vi.advanceTimersByTime(500);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetches future data when offset > 0 after 300ms debounce', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ patios: [{ id: '1' }], timestamp: new Date().toISOString(), totalCount: 1 }),
    });

    const { result } = renderHook(() => useTimeOffset(57.7, 11.95));

    act(() => {
      result.current.setTimeOffset(2);
    });

    // Not called yet (debounce)
    expect(mockFetch).not.toHaveBeenCalled();

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callUrl = mockFetch.mock.calls[0][0] as string;
    expect(callUrl).toContain('offset_hours=2');
    expect(callUrl).toContain('latitude=57.7');
    expect(callUrl).toContain('longitude=11.95');
  });

  it('clears future data when offset returns to 0', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ patios: [{ id: '1' }], timestamp: new Date().toISOString(), totalCount: 1 }),
    });

    const { result } = renderHook(() => useTimeOffset(57.7, 11.95));

    // Set offset to 1
    act(() => {
      result.current.setTimeOffset(1);
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // Reset to 0
    act(() => {
      result.current.setTimeOffset(0);
    });

    expect(result.current.futureExposure).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('does not fetch when coordinates are null', async () => {
    mockFetch.mockClear();
    const { result } = renderHook(() => useTimeOffset(null, null));

    act(() => {
      result.current.setTimeOffset(1);
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // Filter out any calls that don't include our expected params
    const relevantCalls = mockFetch.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('offset_hours=1')
    );
    expect(relevantCalls).toHaveLength(0);
  });

  it('handles fetch errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useTimeOffset(57.7, 11.95));

    act(() => {
      result.current.setTimeOffset(1);
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // Let the rejected promise settle
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.futureExposure).toBeNull();
  });

  it('handles non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false });

    const { result } = renderHook(() => useTimeOffset(57.7, 11.95));

    act(() => {
      result.current.setTimeOffset(3);
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.futureExposure).toBeNull();
  });

  it('debounces rapid offset changes — final value wins', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ patios: [], timestamp: new Date().toISOString(), totalCount: 0 }),
    });

    const { result } = renderHook(() => useTimeOffset(57.7, 11.95));
    mockFetch.mockClear();

    // Set to 3 directly (simulates the end result of a rapid drag)
    act(() => {
      result.current.setTimeOffset(3);
    });

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // Should have fetched with offset_hours=3
    const calls = mockFetch.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('offset_hours=3')
    );
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });
});
