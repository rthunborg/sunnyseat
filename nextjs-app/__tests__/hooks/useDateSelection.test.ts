import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDateSelection } from '@/lib/hooks/useDateSelection';

describe('useDateSelection', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns null selectedDate by default (live mode)', () => {
    const { result } = renderHook(() => useDateSelection(57.7, 11.97));
    expect(result.current.selectedDate).toBeNull();
    expect(result.current.futureExposure).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('does not fetch when selectedDate is null', async () => {
    renderHook(() => useDateSelection(57.7, 11.97));
    await vi.advanceTimersByTimeAsync(500);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does not fetch when selectedDate is today', async () => {
    const { result } = renderHook(() => useDateSelection(57.7, 11.97));

    act(() => {
      result.current.setSelectedDate(new Date());
    });

    await vi.advanceTimersByTimeAsync(500);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches when a future date is selected', async () => {
    const mockResponse = { ok: true, json: () => Promise.resolve([{ venue: { id: 'v1' } }]) };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useDateSelection(57.7, 11.97));

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);

    act(() => {
      result.current.setSelectedDate(futureDate);
    });

    // Advance past debounce
    await vi.advanceTimersByTimeAsync(400);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('/api/patios');
    expect(url).toContain('date=');
  });

  it('clears futureExposure when date is reset to null', async () => {
    const mockResponse = { ok: true, json: () => Promise.resolve([{ venue: { id: 'v1' } }]) };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useDateSelection(57.7, 11.97));

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);

    act(() => {
      result.current.setSelectedDate(futureDate);
    });
    await vi.advanceTimersByTimeAsync(400);

    act(() => {
      result.current.setSelectedDate(null);
    });

    expect(result.current.futureExposure).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('does not fetch when lat/lng are null', async () => {
    const { result } = renderHook(() => useDateSelection(null, null));

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);

    act(() => {
      result.current.setSelectedDate(futureDate);
    });

    await vi.advanceTimersByTimeAsync(500);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('formats date parameter as YYYY-MM-DD', async () => {
    const mockResponse = { ok: true, json: () => Promise.resolve([]) };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useDateSelection(57.7, 11.97));

    const futureDate = new Date(2026, 3, 15); // April 15, 2026

    act(() => {
      result.current.setSelectedDate(futureDate);
    });

    await vi.advanceTimersByTimeAsync(400);

    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('date=2026-04-15');
  });
});
