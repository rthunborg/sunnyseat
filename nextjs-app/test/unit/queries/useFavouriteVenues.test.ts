import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { useFavouriteVenues } from '@/hooks/queries/useFavouriteVenues';
import { queryKeys } from '@/lib/query-keys';
import { MAX_FAVOURITE_IDS } from '@/lib/services/favourites-storage';
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
  timestamp: '2026-05-28T12:00:00.000Z',
  totalCount: 1,
};

function makeWrapper(client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

describe('useFavouriteVenues', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('is disabled without valid coordinates or favourite IDs', async () => {
    const { result } = renderHook(
      () => useFavouriteVenues({ ids: [], lat: 57.7089, lng: 11.9746 }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('stays disabled while saved favourites are not visible', async () => {
    const { result } = renderHook(
      () => useFavouriteVenues({ ids: ['venue-1'], lat: 57.7089, lng: 11.9746, enabled: false }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('normalizes URL params and query keys while forwarding AbortSignal', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(SAMPLE_RESPONSE), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Weather-Updated-At': '2026-05-28T11:00:00.000Z',
          'X-Sun-Data-Source': 'weather',
        },
      }),
    );

    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const { result } = renderHook(
      () => useFavouriteVenues({ ids: ['venue-2', 'venue-1', 'venue-1'], lat: 57.708912, lng: 11.974601 }),
      { wrapper: makeWrapper(client) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url = new URL(fetchSpy.mock.calls[0]?.[0] as string, 'http://localhost');
    expect(url.searchParams.get('ids')).toBe('venue-1,venue-2');
    expect(url.searchParams.get('lat')).toBe('57.7089');
    expect(url.searchParams.get('lng')).toBe('11.9746');
    expect(fetchSpy.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result.current.data?.meta.weatherUpdatedAt).toBe('2026-05-28T11:00:00.000Z');
    expect(client.getQueryCache().find({
      queryKey: queryKeys.venues.favourites({
        ids: ['venue-1', 'venue-2'],
        lat: 57.7089,
        lng: 11.9746,
      }),
    })).toBeDefined();
  });

  it('caps unsafe favourite IDs before constructing the URL and query key', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(SAMPLE_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const ids = [
      'foo,bar',
      ...Array.from({ length: MAX_FAVOURITE_IDS + 3 }, (_, index) => `venue-${index}`),
      'bad\nid',
    ];
    renderHook(
      () => useFavouriteVenues({ ids, lat: 57.708912, lng: 11.974601 }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const url = new URL(fetchSpy.mock.calls[0]?.[0] as string, 'http://localhost');
    const requestIds = url.searchParams.get('ids')?.split(',') ?? [];
    expect(requestIds).toHaveLength(MAX_FAVOURITE_IDS);
    expect(requestIds).not.toContain('bad\nid');
    expect(requestIds).not.toContain('foo');
    expect(requestIds).not.toContain('bar');
  });

  it('filters placeholder data to the currently saved favourite IDs while a refetch is pending', async () => {
    const secondVenue: VenueDataDto = {
      ...SAMPLE_VENUE,
      id: 'venue-2',
      venueId: 'venue-2',
      venueName: 'Bellora',
    };
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ ...SAMPLE_RESPONSE, venues: [SAMPLE_VENUE, secondVenue], totalCount: 2 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const { result, rerender } = renderHook(
      ({ ids }) => useFavouriteVenues({ ids, lat: 57.7089, lng: 11.9746 }),
      {
        initialProps: { ids: ['venue-1', 'venue-2'] },
        wrapper: makeWrapper(client),
      },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.venues.map((venue) => venue.id)).toEqual(['venue-1', 'venue-2']);

    fetchSpy.mockReturnValue(new Promise<Response>(() => {}));
    rerender({ ids: ['venue-2'] });

    await waitFor(() => {
      expect(result.current.data?.venues.map((venue) => venue.id)).toEqual(['venue-2']);
    });
  });

  it('polls live favourites but not explicit planner favourites', async () => {
    fetchSpy
      .mockResolvedValueOnce(
        new Response(JSON.stringify(SAMPLE_RESPONSE), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(SAMPLE_RESPONSE), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    const liveClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const live = renderHook(
      () => useFavouriteVenues({ ids: ['venue-1'], lat: 57.7089, lng: 11.9746 }),
      { wrapper: makeWrapper(liveClient) },
    );
    await waitFor(() => expect(live.result.current.isSuccess).toBe(true));
    const liveQuery = liveClient.getQueryCache().find({
      queryKey: queryKeys.venues.favourites({ ids: ['venue-1'], lat: 57.7089, lng: 11.9746 }),
    });
    expect((liveQuery?.options as { refetchInterval?: unknown }).refetchInterval).toBe(5 * 60 * 1000);

    const plannerClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const planner = renderHook(
      () => useFavouriteVenues({
        ids: ['venue-1'],
        lat: 57.7089,
        lng: 11.9746,
        date: '2026-06-14',
        time: '14:00',
      }),
      { wrapper: makeWrapper(plannerClient) },
    );
    await waitFor(() => expect(planner.result.current.isSuccess).toBe(true));
    const plannerQuery = plannerClient.getQueryCache().find({
      queryKey: queryKeys.venues.favourites({
        ids: ['venue-1'],
        lat: 57.7089,
        lng: 11.9746,
        date: '2026-06-14',
        time: '14:00',
      }),
    });
    expect((plannerQuery?.options as { refetchInterval?: unknown }).refetchInterval).toBe(false);
  });
});
