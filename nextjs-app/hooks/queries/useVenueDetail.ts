'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type { GetVenueDetailResponse } from '@/lib/types/api';

const FIVE_MINUTES = 5 * 60 * 1000;

export function useVenueDetail(
  slug: string | null | undefined,
): UseQueryResult<GetVenueDetailResponse, Error> {
  const normalizedSlug = slug?.trim() ?? '';

  return useQuery<GetVenueDetailResponse, Error>({
    queryKey: queryKeys.venues.detail(normalizedSlug),
    queryFn: async ({ signal }) => {
      const res = await fetch(`/api/venues/${encodeURIComponent(normalizedSlug)}`, {
        signal,
      });
      if (!res.ok) {
        throw new Error(`Venue detail failed: ${res.status} ${res.statusText}`);
      }
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.toLowerCase().includes('application/json')) {
        throw new Error(`Venue detail returned unexpected content-type: ${contentType || '(missing)'}`);
      }
      return (await res.json()) as GetVenueDetailResponse;
    },
    staleTime: FIVE_MINUTES,
    refetchOnWindowFocus: false,
    enabled: normalizedSlug.length > 0,
  });
}
