'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { GetVenueDetailResponse } from '@/lib/types/api';
import {
  isVenueDetailQueryEnabled,
  normalizeVenueDetailQuery,
  sameVenueDetailPlaceholderData,
  venueDetailQueryOptions,
  type VenueDetailParams,
} from './venue-detail-query-options';

export function useVenueDetail(
  slug: string | null | undefined,
  params?: VenueDetailParams | undefined,
): UseQueryResult<GetVenueDetailResponse, Error> {
  const { normalizedSlug } = normalizeVenueDetailQuery(slug, params);
  return useQuery<GetVenueDetailResponse, Error>({
    ...venueDetailQueryOptions(slug, params),
    placeholderData: sameVenueDetailPlaceholderData(normalizedSlug),
    enabled: isVenueDetailQueryEnabled(slug),
  });
}
