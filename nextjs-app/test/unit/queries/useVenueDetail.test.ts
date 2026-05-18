import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { useVenueDetail } from '@/hooks/queries/useVenueDetail';
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
});
