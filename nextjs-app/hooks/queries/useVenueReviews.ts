'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type { GetReviewsResponse } from '@/lib/types/api';

const ONE_MINUTE = 60 * 1000;

export function useVenueReviews(
  venueId: string | null | undefined,
): UseQueryResult<GetReviewsResponse, Error> {
  const identifier = venueId?.trim() ?? '';

  return useQuery<GetReviewsResponse, Error>({
    queryKey: queryKeys.reviews.byVenue(identifier),
    queryFn: async ({ signal }) => {
      const res = await fetch(
        `/api/reviews?venueId=${encodeURIComponent(identifier)}`,
        { signal },
      );
      if (!res.ok) {
        throw new Error(`Venue reviews failed: ${res.status} ${res.statusText}`);
      }
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.toLowerCase().includes('application/json')) {
        throw new Error(`Venue reviews returned unexpected content-type: ${contentType || '(missing)'}`);
      }
      return (await res.json()) as GetReviewsResponse;
    },
    enabled: identifier.length > 0,
    staleTime: ONE_MINUTE,
    refetchOnWindowFocus: false,
  });
}
