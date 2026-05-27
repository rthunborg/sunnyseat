import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { useVenueDetail } from '@/hooks/queries/useVenueDetail';
import {
  shouldRetryVenueQuery,
  venueQueryRetryDelay,
} from '@/hooks/queries/venue-query-options';
import { queryKeys } from '@/lib/query-keys';
import type { GetVenueDetailResponse } from '@/lib/types/api';

const SAMPLE_RESPONSE: GetVenueDetailResponse = {
  venue: {
    id: '1',
    venueId: '1',
    venueName: 'Kafé Magasinet',
    venueSlug: 'test-venue-sunny',
    slug: 'test-venue-sunny',
    neighborhood: 'Inom Vallgraven',
    location: { lat: 57.705, lng: 11.97 },
    currentSunStatus: 'Sunny',
    isPartner: true,
    confidence: 92,
    distanceMeters: 0,
    sunExposurePercent: 95,
    description: 'Stor uteservering med eftermiddagssol.',
    openingHours: { display: 'Öppet till 22:00', closesAt: '22:00' },
    address: 'Tredje Långgatan 9, Göteborg',
    timeline: {
      timezone: 'Europe/Stockholm',
      range: { start: '06:00', end: '21:00' },
      windows: [{ start: '13:00', end: '18:30', status: 'Sunny' }],
      peakTime: '15:30',
    },
    shadowWarningMinutes: 45,
  },
  timestamp: '2026-05-16T12:00:00.000Z',
};

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

describe('useVenueDetail', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('fetches a venue detail response by slug', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(SAMPLE_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { result } = renderHook(() => useVenueDetail('test-venue-sunny'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(SAMPLE_RESPONSE);
    expect(fetchSpy.mock.calls[0]?.[0]).toBe('/api/venues/test-venue-sunny');
  });

  it('enriches detail response metadata from freshness headers', async () => {
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

    const { result } = renderHook(() => useVenueDetail('test-venue-sunny'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.meta).toMatchObject({
      weatherUpdatedAt: '2026-05-22T11:00:00.000Z',
      sunDataSource: 'weather',
    });
  });

  it('preserves detail data and marks confidence unavailable for geometry-only responses', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(SAMPLE_RESPONSE), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Sun-Data-Source': 'geometry-only',
        },
      }),
    );

    const { result } = renderHook(() => useVenueDetail('test-venue-sunny'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.venue.slug).toBe('test-venue-sunny');
    expect(result.current.data?.meta).toMatchObject({ sunDataSource: 'geometry-only' });
    expect(result.current.data?.meta?.weatherUpdatedAt).toBeUndefined();
  });

  it('uses queryKeys.venues.detail for the cache key', () => {
    expect(queryKeys.venues.detail('test-venue-sunny')).toEqual([
      'venues',
      'detail',
      'test-venue-sunny',
    ]);
  });

  it('forwards the AbortSignal from TanStack to fetch', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(SAMPLE_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    renderHook(() => useVenueDetail('test-venue-sunny'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const fetchInit = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(fetchInit?.signal).toBeInstanceOf(AbortSignal);
  });

  it('does not fetch when the slug is empty', async () => {
    const { result } = renderHook(() => useVenueDetail(''), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('keeps previous venue detail visible while planner params change', async () => {
    const firstResponse: GetVenueDetailResponse = {
      ...SAMPLE_RESPONSE,
      venue: {
        ...SAMPLE_RESPONSE.venue,
        sunExposurePercent: 95,
      },
    };
    const secondResponse: GetVenueDetailResponse = {
      ...SAMPLE_RESPONSE,
      venue: {
        ...SAMPLE_RESPONSE.venue,
        sunExposurePercent: 61,
      },
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
        useVenueDetail('test-venue-sunny', { date: '2026-06-14', time }),
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
      new Response(JSON.stringify(secondResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await waitFor(() => expect(result.current.isPlaceholderData).toBe(false));
    expect(result.current.data).toEqual(secondResponse);
  });

  it('does not reuse placeholder detail data when the slug changes', async () => {
    const firstResponse: GetVenueDetailResponse = {
      ...SAMPLE_RESPONSE,
      venue: { ...SAMPLE_RESPONSE.venue, slug: 'venue-a', venueSlug: 'venue-a' },
    };
    const secondResponse: GetVenueDetailResponse = {
      ...SAMPLE_RESPONSE,
      venue: { ...SAMPLE_RESPONSE.venue, slug: 'venue-b', venueSlug: 'venue-b' },
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
      ({ slug }: { slug: string }) => useVenueDetail(slug),
      {
        wrapper: makeWrapper(),
        initialProps: { slug: 'venue-a' },
      },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender({ slug: 'venue-b' });

    await waitFor(() => expect(result.current.isFetching).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect(result.current.isPlaceholderData).toBe(false);

    resolveSecond?.(
      new Response(JSON.stringify(secondResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await waitFor(() => expect(result.current.data).toEqual(secondResponse));
  });

  it('polls live detail and disables polling for explicit planner detail', async () => {
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

    type PlannerProps = { planner: { date: string; time: string } | undefined };
    const { result, rerender } = renderHook(
      ({ planner }: PlannerProps) =>
        useVenueDetail('test-venue-sunny', planner),
      {
        wrapper: StableWrapper,
        initialProps: { planner: undefined } as PlannerProps,
      },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const liveQuery = client.getQueryCache().find({
      queryKey: queryKeys.venues.detail('test-venue-sunny'),
    });
    const liveOptions = liveQuery?.options as { refetchInterval?: unknown } | undefined;
    expect(liveOptions?.refetchInterval).toBe(5 * 60 * 1000);

    rerender({ planner: { date: '2026-06-14', time: '14:00' } });
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
    const plannerQuery = client.getQueryCache().find({
      queryKey: queryKeys.venues.detailAt('test-venue-sunny', {
        date: '2026-06-14',
        time: '14:00',
      }),
    });
    const plannerOptions = plannerQuery?.options as { refetchInterval?: unknown } | undefined;
    expect(plannerOptions?.refetchInterval).toBe(false);
  });

  it('uses the explicit venue retry policy instead of relying on provider defaults', async () => {
    fetchSpy.mockResolvedValueOnce(
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

    const { result } = renderHook(() => useVenueDetail('test-venue-sunny'), {
      wrapper: StableWrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const query = client.getQueryCache().find({
      queryKey: queryKeys.venues.detail('test-venue-sunny'),
    });

    expect(query?.options.retry).toBe(shouldRetryVenueQuery);
    expect(query?.options.retryDelay).toBe(venueQueryRetryDelay);
  });
});
