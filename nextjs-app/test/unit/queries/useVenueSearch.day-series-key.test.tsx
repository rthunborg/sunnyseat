/**
 * COVERAGE EXPANSION — Story 11.1 (AC1, Task 4) — the `isLiveNow` boundary.
 *
 * The story's BREAKING CHANGE + R-001 headline hangs on one invariant that the
 * existing `useVenueSearch.test.ts` does NOT exercise (it never passes
 * `isLiveNow`): a live-today ↔ off-live-today transition must keep the SAME query
 * key so it fires ZERO fetches, while the REQUEST toggles date/time (sent only
 * off-live) and polling (live only). The `query-key` ATDD proves the pure builder;
 * this file proves the HOOK wires `isLiveNow` correctly end-to-end:
 *
 *   1. live-now (isLiveNow:true, same date+time selection present) → the request
 *      OMITS date/time (server computes "now") and the query POLLS;
 *   2. flipping isLiveNow true→false on the SAME date fires ZERO additional
 *      fetches (the key is date-only, unchanged) — the zero-fetch headline;
 *   3. off-live sends date+time and disables polling (regression lock on the
 *      request contract).
 *
 * Real fetch spy (no mock of the hook); deterministic responses.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { useVenueSearch } from '@/hooks/queries/useVenueSearch';
import { queryKeys } from '@/lib/query-keys';
import type { GetVenuesResponse } from '@/lib/types/api';

const RESPONSE: GetVenuesResponse = {
  venues: [],
  meta: { count: 0, radiusKm: 1.5 },
  timestamp: new Date('2026-06-14T12:00:00Z').toISOString(),
  totalCount: 0,
};

function jsonResponse(): Response {
  return new Response(JSON.stringify(RESPONSE), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function stableClientWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return { client, Wrapper };
}

describe('useVenueSearch — isLiveNow request + key contract (Story 11.1)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse());
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('live-now OMITS date/time from the request even when a selection is present', async () => {
    renderHook(
      () =>
        useVenueSearch({
          lat: 57.7089,
          lng: 11.9746,
          radiusKm: 1.5,
          date: '2026-06-14',
          time: '14:00',
          isLiveNow: true,
        }),
      { wrapper: stableClientWrapper().Wrapper },
    );

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const url = new URL(fetchSpy.mock.calls[0]?.[0] as string, 'http://localhost');
    // Live path: the server computes for "now", so date/time are NOT sent.
    expect(url.searchParams.get('date')).toBeNull();
    expect(url.searchParams.get('time')).toBeNull();
  });

  it('live-now keys on the selected DATE (planner key), not a date-less list key', async () => {
    const { client, Wrapper } = stableClientWrapper();
    renderHook(
      () =>
        useVenueSearch({
          lat: 57.7089,
          lng: 11.9746,
          radiusKm: 1.5,
          date: '2026-06-14',
          time: '14:00',
          isLiveNow: true,
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    // The key includes `date` in the LIVE case too, so a live↔off-live scrub on
    // the same date keeps the SAME key (the zero-fetch invariant depends on this).
    const planner = client.getQueryCache().find({
      queryKey: queryKeys.venues.planner({
        lat: 57.7089,
        lng: 11.9746,
        radiusKm: 1.5,
        date: '2026-06-14',
      }),
    });
    expect(planner).toBeDefined();
  });

  it('live-now POLLS every five minutes (live freshness preserved)', async () => {
    const { client, Wrapper } = stableClientWrapper();
    renderHook(
      () =>
        useVenueSearch({
          lat: 57.7089,
          lng: 11.9746,
          radiusKm: 1.5,
          date: '2026-06-14',
          time: '14:00',
          isLiveNow: true,
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const query = client.getQueryCache().find({
      queryKey: queryKeys.venues.planner({
        lat: 57.7089,
        lng: 11.9746,
        radiusKm: 1.5,
        date: '2026-06-14',
      }),
    });
    const options = query?.options as { refetchInterval?: unknown } | undefined;
    expect(options?.refetchInterval).toBe(5 * 60 * 1000);
  });

  it('flipping isLiveNow true→false on the SAME date fires ZERO additional fetches (the headline)', async () => {
    const { Wrapper } = stableClientWrapper();
    const { rerender, result } = renderHook(
      ({ isLiveNow, time }: { isLiveNow: boolean; time: string }) =>
        useVenueSearch({
          lat: 57.7089,
          lng: 11.9746,
          radiusKm: 1.5,
          date: '2026-06-14',
          time,
          isLiveNow,
        }),
      { wrapper: Wrapper, initialProps: { isLiveNow: true, time: '14:00' } },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // The user scrubs off the live moment on the SAME date: isLiveNow flips false
    // and the selected time changes. The key is date-only (unchanged), so NO new
    // fetch fires — the scrub is derived client-side from the sunDaySeries.
    rerender({ isLiveNow: false, time: '17:30' });
    // Give TanStack its sync + microtask windows; a key change would fetch here.
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('off-live SENDS date+time and disables polling (request-contract regression lock)', async () => {
    const { client, Wrapper } = stableClientWrapper();
    renderHook(
      () =>
        useVenueSearch({
          lat: 57.7089,
          lng: 11.9746,
          radiusKm: 1.5,
          date: '2026-06-14',
          time: '17:30',
          isLiveNow: false,
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const url = new URL(fetchSpy.mock.calls[0]?.[0] as string, 'http://localhost');
    expect(url.searchParams.get('date')).toBe('2026-06-14');
    expect(url.searchParams.get('time')).toBe('17:30');

    const query = client.getQueryCache().find({
      queryKey: queryKeys.venues.planner({
        lat: 57.7089,
        lng: 11.9746,
        radiusKm: 1.5,
        date: '2026-06-14',
      }),
    });
    const options = query?.options as { refetchInterval?: unknown } | undefined;
    expect(options?.refetchInterval).toBe(false);
  });
});
