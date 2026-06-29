'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { sanitizeFavouriteIds } from '@/lib/services/favourites-storage';
import type { GetVenuesResponse } from '@/lib/types/api';
import { readSunFreshnessHeaders } from '@/lib/utils/sun-freshness';
import {
  HttpError,
  shouldRetryVenueQuery,
  venueQueryRetryDelay,
} from './venue-query-options';

const FIVE_MINUTES = 5 * 60 * 1000;
const BUCKET_DECIMALS = 4;
const BUCKET_FACTOR = 10 ** BUCKET_DECIMALS;

type Params = {
  ids: readonly string[];
  lat: number;
  lng: number;
  date?: string;
  time?: string;
  enabled?: boolean;
};

export function useFavouriteVenues(
  params: Params,
): UseQueryResult<GetVenuesResponse, Error> {
  const inputsValid = Number.isFinite(params.lat) && Number.isFinite(params.lng);
  const lat = inputsValid ? bucket(params.lat) : 0;
  const lng = inputsValid ? bucket(params.lng) : 0;
  const ids = normalizeIds(params.ids);
  const planner = normalizePlannerParams(params.date, params.time);
  const filters = { ids, lat, lng, ...planner };

  return useQuery<GetVenuesResponse, Error>({
    queryKey: queryKeys.venues.favourites(filters),
    queryFn: async ({ signal }) => {
      const searchParams = new URLSearchParams({
        ids: ids.join(','),
        lat: String(lat),
        lng: String(lng),
      });
      if (planner) {
        searchParams.set('date', planner.date);
        searchParams.set('time', planner.time);
      }
      const res = await fetch(`/api/venues?${searchParams.toString()}`, { signal });
      if (!res.ok) {
        throw new HttpError(`Favourite venues failed: ${res.status} ${res.statusText}`, res.status);
      }
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.toLowerCase().includes('application/json')) {
        throw new Error(`Favourite venues returned unexpected content-type: ${contentType || '(missing)'}`);
      }
      const body = (await res.json()) as GetVenuesResponse;
      return {
        ...body,
        meta: {
          ...body.meta,
          ...readSunFreshnessHeaders(res.headers),
        },
      };
    },
    staleTime: FIVE_MINUTES,
    refetchInterval: planner ? false : FIVE_MINUTES,
    refetchOnWindowFocus: false,
    retry: shouldRetryVenueQuery,
    retryDelay: venueQueryRetryDelay,
    placeholderData: (previousData) => filterResponseToIds(previousData, ids),
    enabled: params.enabled !== false && inputsValid && ids.length > 0,
  });
}

function bucket(n: number): number {
  return Math.round(n * BUCKET_FACTOR) / BUCKET_FACTOR;
}

function normalizeIds(ids: readonly string[]): string[] {
  return sanitizeFavouriteIds(ids).sort();
}

function filterResponseToIds(
  response: GetVenuesResponse | undefined,
  ids: readonly string[],
): GetVenuesResponse | undefined {
  if (!response) return undefined;
  const allowed = new Set(ids);
  const venues = response.venues.filter((venue) => allowed.has(venue.id));
  return {
    ...response,
    venues,
    meta: {
      ...response.meta,
      count: venues.length,
    },
    totalCount: venues.length,
  };
}

function normalizePlannerParams(
  date: string | undefined,
  time: string | undefined,
): { date: string; time: string } | undefined {
  const normalizedDate = date?.trim();
  const normalizedTime = time?.trim();
  if (!normalizedDate || !normalizedTime) return undefined;
  return { date: normalizedDate, time: normalizedTime };
}
