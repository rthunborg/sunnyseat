import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { useVenueSearch } from '@/hooks/queries/useVenueSearch';
import {
  shouldRetryVenueQuery,
  venueQueryRetryDelay,
} from '@/hooks/queries/venue-query-options';
import { queryKeys } from '@/lib/query-keys';
import type { GetVenuesResponse, VenueDataDto } from '@/lib/types/api';

const SAMPLE_VENUE: VenueDataDto = {
  id: 'venue-1',
  venueId: 'venue-1',
  venueName: 'Kafé Magasinet',
  venueSlug: 'test-venue-sunny',
  slug: 'test-venue-sunny',
  neighborhood: 'Centrum',
  location: { lat: 57.705, lng: 11.97 },
  currentSunStatus: 'Sunny',
  skyCondition: 'clear',
  isPartner: false,
  confidence: 92,
  distanceMeters: 100,
  sunExposurePercent: 95,
  sunWindow: { start: '13:00', end: '18:30' },
};

const SAMPLE_RESPONSE: GetVenuesResponse = {
  venues: [SAMPLE_VENUE],
  meta: { count: 1, radiusKm: 1.5 },
  timestamp: new Date('2026-05-01T12:00:00Z').toISOString(),
  totalCount: 1,
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
    expect(result.current.data?.venues[0]).toMatchObject({
      confidence: 92,
      sunExposurePercent: 95,
    });

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

  it('enriches response metadata from freshness headers', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(SAMPLE_RESPONSE), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Weather-Updated-At': '2026-05-22T11:00:00.000Z',
          'X-Sun-Data-Source': 'weather',
        },
      }),
    );

    const { result } = renderHook(
      () => useVenueSearch({ lat: 57.7089, lng: 11.9746, radiusKm: 1.5 }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.meta).toMatchObject({
      weatherUpdatedAt: '2026-05-22T11:00:00.000Z',
      sunDataSource: 'weather',
    });
  });

  it('uses geometry-only header metadata to preserve venues while marking confidence unavailable', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(SAMPLE_RESPONSE), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Sun-Data-Source': 'geometry-only',
        },
      }),
    );

    const { result } = renderHook(
      () => useVenueSearch({ lat: 57.7089, lng: 11.9746, radiusKm: 1.5 }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.venues).toHaveLength(1);
    expect(result.current.data?.meta.sunDataSource).toBe('geometry-only');
    expect(result.current.data?.meta.weatherUpdatedAt).toBeUndefined();
  });

  it('adds trimmed text query to the request URL and normalized query key', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(SAMPLE_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { result } = renderHook(
      () => useVenueSearch({
        lat: 57.708912,
        lng: 11.974601,
        radiusKm: 1.5,
        q: ' Kafé Magasinet ',
      }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calledUrl = fetchSpy.mock.calls[0]?.[0] as string;
    const parsed = new URL(calledUrl, 'http://localhost');
    expect(parsed.searchParams.get('q')).toBe('Kafé Magasinet');

    expect(
      queryKeys.venues.list({
        radiusKm: 1.5,
        q: 'Kafé Magasinet',
        lng: 11.9746,
        lat: 57.7089,
      }),
    ).toEqual([
      'venues',
      'list',
      { lat: 57.7089, lng: 11.9746, q: 'Kafé Magasinet', radiusKm: 1.5 },
    ]);
  });

  it('adds selected planner date/time to the request URL', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(SAMPLE_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { result } = renderHook(
      () => useVenueSearch({
        lat: 57.708912,
        lng: 11.974601,
        radiusKm: 1.5,
        date: '2026-06-14',
        time: '14:00',
      }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calledUrl = fetchSpy.mock.calls[0]?.[0] as string;
    const parsed = new URL(calledUrl, 'http://localhost');
    expect(parsed.searchParams.get('date')).toBe('2026-06-14');
    expect(parsed.searchParams.get('time')).toBe('14:00');
  });

  it('keeps previous venue data visible while a new planner date/time request is in flight', async () => {
    const firstResponse: GetVenuesResponse = {
      ...SAMPLE_RESPONSE,
      venues: [
        {
          id: 'venue-1',
          venueId: 'venue-1',
          venueName: 'Första platsen',
          venueSlug: 'forsta-platsen',
          slug: 'forsta-platsen',
          neighborhood: 'Centrum',
          location: { lat: 57.7, lng: 11.97 },
          currentSunStatus: 'Sunny',
          isPartner: false,
          confidence: 92,
          distanceMeters: 100,
          sunExposurePercent: 95,
        },
      ],
      meta: { count: 1, radiusKm: 1.5 },
      totalCount: 1,
    };
    let resolveSecond: ((value: Response) => void) | undefined;
    fetchSpy
      .mockResolvedValueOnce(
        new Response(JSON.stringify(firstResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          resolveSecond = resolve;
        }),
      );

    const { result, rerender } = renderHook(
      ({ time }: { time: string }) =>
        useVenueSearch({
          lat: 57.7089,
          lng: 11.9746,
          radiusKm: 1.5,
          date: '2026-06-14',
          time,
        }),
      {
        wrapper: makeWrapper(),
        initialProps: { time: '14:00' },
      },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender({ time: '15:00' });

    await waitFor(() => expect(result.current.isFetching).toBe(true));
    expect(result.current.data).toEqual(firstResponse);
    expect(result.current.isPlaceholderData).toBe(true);

    resolveSecond?.(
      new Response(JSON.stringify(SAMPLE_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await waitFor(() => expect(result.current.isPlaceholderData).toBe(false));
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

  it('uses the explicit venue retry policy instead of relying on provider defaults', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(SAMPLE_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    function StableWrapper({ children }: { children: ReactNode }) {
      return createElement(QueryClientProvider, { client }, children);
    }

    const { result } = renderHook(
      () => useVenueSearch({ lat: 57.7089, lng: 11.9746, radiusKm: 1.5 }),
      { wrapper: StableWrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const query = client.getQueryCache().find({
      queryKey: queryKeys.venues.list({ lat: 57.7089, lng: 11.9746, radiusKm: 1.5 }),
    });

    expect(query?.options.retry).toBe(shouldRetryVenueQuery);
    expect(query?.options.retryDelay).toBe(venueQueryRetryDelay);
    expect(venueQueryRetryDelay(0)).toBe(1000);
    expect(venueQueryRetryDelay(1)).toBe(2000);
    expect(venueQueryRetryDelay(2)).toBe(4000);
    expect(shouldRetryVenueQuery(2, new Error('network down'))).toBe(true);
    expect(shouldRetryVenueQuery(3, new Error('network down'))).toBe(false);
    expect(shouldRetryVenueQuery(0, new Error('Venue search failed: 400 Bad Request'))).toBe(false);
  });

  it('polls the live venue search path every five minutes', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(SAMPLE_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    function StableWrapper({ children }: { children: ReactNode }) {
      return createElement(QueryClientProvider, { client }, children);
    }

    const { result } = renderHook(
      () => useVenueSearch({ lat: 57.7089, lng: 11.9746, radiusKm: 1.5 }),
      { wrapper: StableWrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const query = client.getQueryCache().find({
      queryKey: queryKeys.venues.list({ lat: 57.7089, lng: 11.9746, radiusKm: 1.5 }),
    });
    const options = query?.options as { refetchInterval?: unknown } | undefined;

    expect(options?.refetchInterval).toBe(5 * 60 * 1000);
  });

  it('does not poll explicit planner date/time searches', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(SAMPLE_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    function StableWrapper({ children }: { children: ReactNode }) {
      return createElement(QueryClientProvider, { client }, children);
    }

    const { result } = renderHook(
      () => useVenueSearch({
        lat: 57.7089,
        lng: 11.9746,
        radiusKm: 1.5,
        date: '2026-06-14',
        time: '14:00',
      }),
      { wrapper: StableWrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const query = client.getQueryCache().find({
      queryKey: queryKeys.venues.planner({
        lat: 57.7089,
        lng: 11.9746,
        radiusKm: 1.5,
        date: '2026-06-14',
        time: '14:00',
      }),
    });
    const options = query?.options as { refetchInterval?: unknown } | undefined;

    expect(options?.refetchInterval).toBe(false);
  });

  it('does NOT fire fetch while gated by enabled: false, then fires exactly once when enabled (AC2 geolocation gate)', async () => {
    // Story 9.4 AC2: MapView gates the first venue fetch until geolocation
    // settles. The hook combines the caller `enabled` flag with its internal
    // `inputsValid` guard. While `enabled` is false (status idle/pending) no
    // fetch fires; flipping it true (status success|fallback) fires once at
    // the settled coords. `keepPreviousData` masks any later key change.
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

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useVenueSearch({ lat: 57.7089, lng: 11.9746, radiusKm: 1.5, enabled }),
      { wrapper: StableWrapper, initialProps: { enabled: false } },
    );

    // Gated: the query stays in fetchStatus 'idle' and fetch never fires.
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(fetchSpy).not.toHaveBeenCalled();

    // Geolocation settled → enabled flips true → exactly one fetch fires.
    rerender({ enabled: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('gated idle@fallback-coords then settled@GPS-coords fires EXACTLY ONE fetch, at the GPS bucket (AC2 double-fetch kill)', async () => {
    // Story 9.4 AC2 — the actual double-fetch root cause: before the gate,
    // the list query ran immediately at the GOTHENBURG_CENTRE fallback coords
    // (status idle), then a real-GPS resolve flipped to a DIFFERENT bucketed
    // key and fired a SECOND `/api/venues`. The `enabled: coordsSettled` gate
    // suppresses the fallback-bucket fetch entirely, so only the settled GPS
    // bucket fetches — exactly once. This complements the static-coords
    // `enabled:false→true` case by changing BOTH the gate AND the coords in
    // the same transition (the real-world shape the gate has to defuse).
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

    // GOTHENBURG_CENTRE fallback coords, gated off (status idle/pending).
    const FALLBACK_COORDS = { lat: 57.7089, lng: 11.9746 };
    // A real GPS fix lands in a DIFFERENT 4-dp bucket → a distinct query key.
    const GPS_COORDS = { lat: 57.7012, lng: 11.9881 };

    const { result, rerender } = renderHook(
      ({ lat, lng, enabled }: { lat: number; lng: number; enabled: boolean }) =>
        useVenueSearch({ lat, lng, radiusKm: 1.5, enabled }),
      {
        wrapper: StableWrapper,
        initialProps: { ...FALLBACK_COORDS, enabled: false },
      },
    );

    // Gated at the fallback coords: NO fetch fires (the suppressed first round-trip).
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(fetchSpy).not.toHaveBeenCalled();

    // Geolocation settles to a real GPS fix in a new bucket → gate releases.
    rerender({ ...GPS_COORDS, enabled: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Exactly ONE fetch total — the fallback-bucket round-trip never happened.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    // And it went to the settled GPS bucket, not the fallback centrum coords.
    const calledUrl = fetchSpy.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('lat=57.7012');
    expect(calledUrl).toContain('lng=11.9881');
    expect(calledUrl).not.toContain('lat=57.7089');
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
