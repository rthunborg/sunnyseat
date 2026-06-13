import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useVenueReviews } from '@/hooks/queries/useVenueReviews';
import { queryKeys } from '@/lib/query-keys';
import { createTestQueryClient, TestProviders } from '../../setup/test-utils';

describe('useVenueReviews', () => {
  it('fetches reviews through the centralized venue review key', async () => {
    const response = {
      reviews: [
        {
          id: 'review_1',
          venueId: '1',
          venueSlug: 'test-venue-sunny',
          text: 'Soligt.',
          createdAt: '2026-06-08T12:00:00.000Z',
        },
      ],
      summary: { averageRating: null, reviewCount: 1 },
      timestamp: '2026-06-08T12:01:00.000Z',
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useVenueReviews('test-venue-sunny'), {
      wrapper: ({ children }) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/reviews?venueId=test-venue-sunny',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(queryClient.getQueryData(queryKeys.reviews.byVenue('test-venue-sunny'))).toEqual(response);
  });

  it('surfaces failed fetches without retrying automatically', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'bad' }), {
      status: 500,
      statusText: 'Internal Server Error',
    }));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useVenueReviews('test-venue-sunny'), {
      wrapper: TestProviders,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not fetch for blank identifiers', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useVenueReviews('  '), {
      wrapper: TestProviders,
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
