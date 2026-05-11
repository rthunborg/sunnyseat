import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { useVenueSearch } from '@/hooks/queries/useVenueSearch';
import { queryKeys } from '@/lib/query-keys';
import type { GetVenuesResponse } from '@/lib/types/api';

const SAMPLE_RESPONSE: GetVenuesResponse = {
  venues: [],
  meta: { count: 0, radiusKm: 1.5 },
  timestamp: new Date('2026-05-01T12:00:00Z').toISOString(),
  totalCount: 0,
};

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

describe('useVenueSearch', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('resolves with the GetVenuesResponse shape on a successful fetch', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(SAMPLE_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { result } = renderHook(
      () => useVenueSearch({ lat: 57.7089, lng: 11.9746, radiusKm: 1.5 }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(SAMPLE_RESPONSE);

    const calledUrl = fetchSpy.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('/api/venues');
    expect(calledUrl).toContain('lat=57.7089');
    expect(calledUrl).toContain('lng=11.9746');
    expect(calledUrl).toContain('radiusKm=1.5');
  });

  it('surfaces a 400 response as an error and stays in isError', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'bad lat' }), { status: 400, statusText: 'Bad Request' }),
    );

    const { result } = renderHook(
      () => useVenueSearch({ lat: 999, lng: 11.9746 }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('uses queryKeys.venues.list with the resolved radius', () => {
    const expected = queryKeys.venues.list({ lat: 57.7089, lng: 11.9746, radiusKm: 1.5 });
    expect(expected).toEqual(['venues', 'list', { lat: 57.7089, lng: 11.9746, radiusKm: 1.5 }]);
  });

  it('forwards the AbortSignal from TanStack to fetch (request cancellation)', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(SAMPLE_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    renderHook(
      () => useVenueSearch({ lat: 57.7089, lng: 11.9746, radiusKm: 1.5 }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const fetchInit = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(fetchInit?.signal).toBeInstanceOf(AbortSignal);
  });

  it('buckets lat/lng to 4 decimals so GPS jitter shares one query key', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(SAMPLE_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    function StableWrapper({ children }: { children: ReactNode }) {
      return createElement(QueryClientProvider, { client }, children);
    }

    // Two calls with sub-bucket-precision differences (5th decimal place)
    // must produce identical query keys, so the second call hits the cache.
    const { rerender } = renderHook(
      ({ lat, lng }: { lat: number; lng: number }) =>
        useVenueSearch({ lat, lng, radiusKm: 1.5 }),
      {
        wrapper: StableWrapper,
        initialProps: { lat: 57.708912, lng: 11.974621 },
      },
    );

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    // Both inputs bucket to (57.7089, 11.9746) — same query key, no
    // refetch.
    rerender({ lat: 57.708934, lng: 11.974638 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const cached = client.getQueryData(
      queryKeys.venues.list({ lat: 57.7089, lng: 11.9746, radiusKm: 1.5 }),
    );
    expect(cached).toEqual(SAMPLE_RESPONSE);
  });

  it('crossing a bucket boundary produces a distinct query key (new fetch)', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(SAMPLE_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    function StableWrapper({ children }: { children: ReactNode }) {
      return createElement(QueryClientProvider, { client }, children);
    }

    const { rerender } = renderHook(
      ({ lat, lng }: { lat: number; lng: number }) =>
        useVenueSearch({ lat, lng, radiusKm: 1.5 }),
      {
        wrapper: StableWrapper,
        initialProps: { lat: 57.7089, lng: 11.9746 },
      },
    );

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    // 57.7089 stays at 57.7089; 57.7090 buckets to 57.709 → different
    // key, so a fresh fetch fires.
    rerender({ lat: 57.7090, lng: 11.9746 });
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
  });

  it('bucketed lat/lng appear in the request URL (server cache aligned with client cache)', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(SAMPLE_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    renderHook(
      () => useVenueSearch({ lat: 57.708912, lng: 11.974601, radiusKm: 1.5 }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const calledUrl = fetchSpy.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('lat=57.7089');
    expect(calledUrl).toContain('lng=11.9746');
  });

  it('does NOT fire fetch when lat/lng are non-finite (refetch-storm guard)', async () => {
    // Story 1.6 review (P20): replaced hardcoded 50 ms wait with a polling
    // assertion. The previous pattern was the canonical flaky-test shape —
    // a longer scheduling delay would let the test drift to a false PASS.
    const { result } = renderHook(
      () => useVenueSearch({ lat: Number.NaN, lng: Number.NaN, radiusKm: 1.5 }),
      { wrapper: makeWrapper() },
    );

    // `enabled: false` should keep the query in `isPending: true,
    // fetchStatus: 'idle'` — assert that and confirm fetch never fires.
    await waitFor(() =>
      expect(result.current.fetchStatus).toBe('idle'),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('falls back to the 1.5 km default radius when radiusKm is omitted', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(SAMPLE_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    renderHook(
      () => useVenueSearch({ lat: 57.7089, lng: 11.9746 }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const calledUrl = fetchSpy.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('radiusKm=1.5');
  });

  it('configures a non-zero staleTime so cached results stay fresh for the polling window', async () => {
    // Story 1.6 review (P18, Edge Case Hunter 9.1): the original test
    // re-rendered with the same args and asserted no refetch — but TanStack
    // doesn't refetch on rerender even with `staleTime: 0`, so the assertion
    // held regardless of whether the hook set `staleTime: FIVE_MINUTES`.
    // Direct test instead: read `result.current.isStale` after the fetch
    // settles — false ⇔ staleTime > 0 (truly testing the option).
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(SAMPLE_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { result } = renderHook(
      () => useVenueSearch({ lat: 57.7089, lng: 11.9746, radiusKm: 1.5 }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isStale).toBe(false);
  });

  it('configures refetchOnWindowFocus: false (window focus does NOT trigger a refetch even when stale)', async () => {
    // Story 1.6 review (P19, Edge Case Hunter 9.2 → Round 2 R2-P5): the
    // original test dispatched a `focus` event and asserted no refetch —
    // but with the hook's staleTime > 0, TanStack would skip the focus
    // refetch even if the hook had refetchOnWindowFocus: true (false PASS).
    // Round 1 P19 replaced it with `cached.options` introspection, but
    // observer-specific flags like refetchOnWindowFocus live on
    // QueryObserverOptions only as a side-effect of the active observer
    // calling setOptions — Round 2 R-006 flagged that as a fragile
    // coupling to TanStack v5 internals.
    //
    // R2-P5 fix: stage a stale query (via `invalidateQueries` with
    // `refetchType: 'none'`, a public v5 method that marks stale without
    // refetching), then dispatch a window focus event. With
    // refetchOnWindowFocus: false, the focus manager's notification is
    // a no-op for the observer regardless of stale state — assert no
    // second fetch fires. This reads only the public observable
    // behaviour (fetch was/wasn't called), with no internals coupling.
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(SAMPLE_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    function StableWrapper({ children }: { children: ReactNode }) {
      return createElement(QueryClientProvider, { client }, children);
    }

    const { result } = renderHook(
      () => useVenueSearch({ lat: 57.7089, lng: 11.9746, radiusKm: 1.5 }),
      { wrapper: StableWrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Mark the query stale without triggering a refetch — this is the
    // pre-condition where refetchOnWindowFocus matters.
    await client.invalidateQueries({
      queryKey: queryKeys.venues.list({
        lat: 57.7089,
        lng: 11.9746,
        radiusKm: 1.5,
      }),
      refetchType: 'none',
    });

    // Window focus would normally trigger a refetch on stale active
    // queries — UNLESS the hook opts out via refetchOnWindowFocus: false.
    window.dispatchEvent(new Event('focus'));
    // Give TanStack's focusManager its synchronous + microtask windows to
    // process the event. A real refetch would mutate fetchStatus and
    // call fetch, both of which we'd see by the next microtask.
    await Promise.resolve();
    await Promise.resolve();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.current.fetchStatus).toBe('idle');
  });
});
