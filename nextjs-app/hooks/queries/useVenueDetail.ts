'use client';

import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type { GetVenueDetailResponse } from '@/lib/types/api';

const FIVE_MINUTES = 5 * 60 * 1000;

export function useVenueDetail(
  slug: string | null | undefined,
  planner?: { date: string; time: string } | undefined,
): UseQueryResult<GetVenueDetailResponse, Error> {
  const normalizedSlug = slug?.trim() ?? '';
  const normalizedPlanner = planner?.date && planner.time
    ? { date: planner.date.trim(), time: planner.time.trim() }
    : undefined;

  return useQuery<GetVenueDetailResponse, Error>({
    queryKey: queryKeys.venues.detailAt(normalizedSlug, normalizedPlanner),
    queryFn: async ({ signal }) => {
      const searchParams = new URLSearchParams();
      if (normalizedPlanner) {
        searchParams.set('date', normalizedPlanner.date);
        searchParams.set('time', normalizedPlanner.time);
      }
      const query = searchParams.toString();
      const res = await fetch(
        `/api/venues/${encodeURIComponent(normalizedSlug)}${query ? `?${query}` : ''}`,
        {
        signal,
        },
      );
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
    refetchInterval: normalizedPlanner ? false : FIVE_MINUTES,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    enabled: normalizedSlug.length > 0,
  });
}
