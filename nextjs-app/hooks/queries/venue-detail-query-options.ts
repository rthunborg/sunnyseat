'use client';

import {
  keepPreviousData,
  type QueryFunctionContext,
  type QueryKey,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type { GetVenueDetailResponse } from '@/lib/types/api';
import { readSunFreshnessHeaders } from '@/lib/utils/sun-freshness';
import {
  HttpError,
  shouldRetryVenueQuery,
  venueQueryRetryDelay,
} from './venue-query-options';

export const FIVE_MINUTES = 5 * 60 * 1000;
export const BUCKET_DECIMALS = 4;

const BUCKET_FACTOR = 10 ** BUCKET_DECIMALS;

export type VenueDetailParams = {
  date?: string;
  time?: string;
  lat?: number;
  lng?: number;
};

export type NormalizedVenueDetailQuery = {
  normalizedSlug: string;
  normalizedPlanner: { date: string; time: string } | undefined;
  normalizedLocation: { lat: number; lng: number } | undefined;
  queryKey: QueryKey;
  url: string;
};

export function normalizeVenueDetailQuery(
  slug: string | null | undefined,
  params?: VenueDetailParams | undefined,
): NormalizedVenueDetailQuery {
  const normalizedSlug = slug?.trim() ?? '';
  const date = params?.date?.trim();
  const time = params?.time?.trim();
  const normalizedPlanner = date && time ? { date, time } : undefined;
  const normalizedLocation = normalizeLocation(params?.lat, params?.lng);
  const detailFilters = {
    ...normalizedPlanner,
    ...normalizedLocation,
  };
  const hasDetailFilters = Object.keys(detailFilters).length > 0;
  const queryKey = queryKeys.venues.detailAt(
    normalizedSlug,
    hasDetailFilters ? detailFilters : undefined,
  );

  return {
    normalizedSlug,
    normalizedPlanner,
    normalizedLocation,
    queryKey,
    url: buildVenueDetailUrl(normalizedSlug, normalizedPlanner, normalizedLocation),
  };
}

export function venueDetailQueryOptions(
  slug: string | null | undefined,
  params?: VenueDetailParams | undefined,
): UseQueryOptions<GetVenueDetailResponse, Error, GetVenueDetailResponse, QueryKey> {
  const normalized = normalizeVenueDetailQuery(slug, params);
  return {
    queryKey: normalized.queryKey,
    queryFn: async ({ signal }: QueryFunctionContext) =>
      fetchVenueDetail(normalized.url, signal),
    staleTime: FIVE_MINUTES,
    refetchInterval: normalized.normalizedPlanner ? false : FIVE_MINUTES,
    refetchOnWindowFocus: false,
    retry: shouldRetryVenueQuery,
    retryDelay: venueQueryRetryDelay,
  };
}

export function isVenueDetailQueryEnabled(
  slug: string | null | undefined,
): boolean {
  return (slug?.trim() ?? '').length > 0;
}

export function sameVenueDetailPlaceholderData(
  normalizedSlug: string,
) {
  return (
    previousData: GetVenueDetailResponse | undefined,
    previousQuery: { queryKey?: QueryKey } | undefined,
  ): GetVenueDetailResponse | undefined => {
    const previousKey = previousQuery?.queryKey;
    if (Array.isArray(previousKey) && previousKey[2] === normalizedSlug) {
      return keepPreviousData(previousData);
    }
    return undefined;
  };
}

async function fetchVenueDetail(
  url: string,
  signal: AbortSignal | undefined,
): Promise<GetVenueDetailResponse> {
  const res = await fetch(url, { signal });
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
}

function buildVenueDetailUrl(
  normalizedSlug: string,
  normalizedPlanner: { date: string; time: string } | undefined,
  normalizedLocation: { lat: number; lng: number } | undefined,
): string {
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
  return `/api/venues/${encodeURIComponent(normalizedSlug)}${query ? `?${query}` : ''}`;
}

function normalizeLocation(
  lat: number | undefined,
  lng: number | undefined,
): { lat: number; lng: number } | undefined {
  return typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
    ? { lat: bucket(lat), lng: bucket(lng) }
    : undefined;
}

function bucket(n: number): number {
  return Math.round(n * BUCKET_FACTOR) / BUCKET_FACTOR;
}
