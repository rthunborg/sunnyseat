'use client';

import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type { GetVenueDetailResponse } from '@/lib/types/api';
import { readSunFreshnessHeaders } from '@/lib/utils/sun-freshness';
import {
  HttpError,
  shouldRetryVenueQuery,
  venueQueryRetryDelay,
} from './venue-query-options';

const FIVE_MINUTES = 5 * 60 * 1000;
const BUCKET_DECIMALS = 4;
const BUCKET_FACTOR = 10 ** BUCKET_DECIMALS;

type VenueDetailParams = {
  date?: string;
  time?: string;
  lat?: number;
  lng?: number;
};

function bucket(n: number): number {
  return Math.round(n * BUCKET_FACTOR) / BUCKET_FACTOR;
}

export function useVenueDetail(
  slug: string | null | undefined,
  params?: VenueDetailParams | undefined,
): UseQueryResult<GetVenueDetailResponse, Error> {
  const normalizedSlug = slug?.trim() ?? '';
  const normalizedPlanner = params?.date && params.time
    ? { date: params.date.trim(), time: params.time.trim() }
    : undefined;
  const paramLat = params?.lat;
  const paramLng = params?.lng;
  const normalizedLocation =
    typeof paramLat === 'number' &&
    typeof paramLng === 'number' &&
    Number.isFinite(paramLat) &&
    Number.isFinite(paramLng)
      ? { lat: bucket(paramLat), lng: bucket(paramLng) }
      : undefined;
  const detailFilters = {
    ...normalizedPlanner,
    ...normalizedLocation,
  };
  const hasDetailFilters = Object.keys(detailFilters).length > 0;

  return useQuery<GetVenueDetailResponse, Error>({
    queryKey: queryKeys.venues.detailAt(
      normalizedSlug,
      hasDetailFilters ? detailFilters : undefined,
    ),
    queryFn: async ({ signal }) => {
      const searchParams = new URLSearchParams();
      if (normalizedPlanner) {
        searchParams.set('date', normalizedPlanner.date);
        searchParams.set('time', normalizedPlanner.time);
      }
      if (normalizedLocation) {
        searchParams.set('lat', String(normalizedLocation.lat));
        searchParams.set('lng', String(normalizedLocation.lng));
      }
      const query = searchParams.toString();
      const res = await fetch(
        `/api/venues/${encodeURIComponent(normalizedSlug)}${query ? `?${query}` : ''}`,
        {
        signal,
        },
      );
      if (!res.ok) {
        throw new HttpError(`Venue detail failed: ${res.status} ${res.statusText}`, res.status);
      }
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.toLowerCase().includes('application/json')) {
        throw new Error(`Venue detail returned unexpected content-type: ${contentType || '(missing)'}`);
      }
      const body = (await res.json()) as GetVenueDetailResponse;
      const freshness = readSunFreshnessHeaders(res.headers);
      if (!body.meta && Object.keys(freshness).length === 0) return body;
      return {
        ...body,
        meta: {
          ...body.meta,
          ...freshness,
        },
      };
    },
    staleTime: FIVE_MINUTES,
    refetchInterval: normalizedPlanner ? false : FIVE_MINUTES,
    refetchOnWindowFocus: false,
    retry: shouldRetryVenueQuery,
    retryDelay: venueQueryRetryDelay,
    placeholderData: (previousData, previousQuery) => {
      const previousKey = previousQuery?.queryKey;
      if (Array.isArray(previousKey) && previousKey[2] === normalizedSlug) {
        return keepPreviousData(previousData);
      }
      return undefined;
    },
    enabled: normalizedSlug.length > 0,
  });
}
