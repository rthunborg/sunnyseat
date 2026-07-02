import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { useSubmitReview } from '@/hooks/mutations/useSubmitReview';
import { queryKeys } from '@/lib/query-keys';
import type { GetReviewsResponse, GetVenueDetailResponse } from '@/lib/types/api';
import { TestProviders } from '../../setup/test-utils';

describe('useSubmitReview', () => {
  it('posts reviews, disables automatic retry, and updates relevant review/detail caches', async () => {
    const response = {
      review: {
        id: 'review_new',
        venueId: '1',
        venueSlug: 'test-venue-sunny',
        text: 'Mycket sol.',
        rating: 5,
        createdAt: '2026-06-08T12:00:00.000Z',
      },
      summary: { averageRating: 5, reviewCount: 1 },
      timestamp: '2026-06-08T12:00:01.000Z',
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 60_000,
          refetchOnWindowFocus: false,
        },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData<GetReviewsResponse>(
      queryKeys.reviews.byVenue('test-venue-sunny'),
      {
        reviews: [],
        summary: { averageRating: null, reviewCount: 0 },
        timestamp: '2026-06-08T11:59:00.000Z',
      },
    );
    queryClient.setQueryData<GetVenueDetailResponse>(
      queryKeys.venues.detail('test-venue-sunny'),
      {
        venue: {
          id: '1',
          venueId: '1',
          venueName: 'Kafé Magasinet',
          venueSlug: 'test-venue-sunny',
          slug: 'test-venue-sunny',
          neighborhood: 'Centrum',
          location: { lat: 57.7, lng: 11.97 },
          currentSunStatus: 'Sunny',
          isPartner: false,
          confidence: 90,
          distanceMeters: 100,
          sunExposurePercent: 95,
          tags: [],
          reviewSummary: { averageRating: null, reviewCount: 0 },
          description: 'Detalj',
          address: 'Testgatan 1',
          openingHours: { display: 'Öppet' },
          timeline: {
            timezone: 'Europe/Stockholm',
            range: { start: '06:00', end: '21:00' },
            windows: [],
          },
        },
        timestamp: '2026-06-08T11:59:00.000Z',
      },
    );

    const { result } = renderHook(() => useSubmitReview('test-venue-sunny'), {
      wrapper: ({ children }) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
    });

    result.current.mutate({
      venueId: '1',
      venueSlug: 'test-venue-sunny',
      text: 'Mycket sol.',
      rating: 5,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/reviews', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"text":"Mycket sol."'),
    }));
    expect(queryClient.getQueryData<GetReviewsResponse>(
      queryKeys.reviews.byVenue('test-venue-sunny'),
    )?.reviews).toHaveLength(1);
    expect(queryClient.getQueryData<GetVenueDetailResponse>(
      queryKeys.venues.detail('test-venue-sunny'),
    )?.venue.reviewSummary).toEqual({ averageRating: 5, reviewCount: 1 });
  });

  it('surfaces failed submissions and does not retry automatically', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'bad' }), {
      status: 400,
      statusText: 'Bad Request',
    }));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useSubmitReview('test-venue-sunny'), {
      wrapper: TestProviders,
    });

    result.current.mutate({
      venueId: '1',
      text: 'Misslyckas.',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
