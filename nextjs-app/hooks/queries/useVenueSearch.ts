'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type { GetVenuesResponse } from '@/lib/types/api';

const FIVE_MINUTES = 5 * 60 * 1000;
const DEFAULT_RADIUS_KM = 1.5;
const BUCKET_DECIMALS = 4;
const BUCKET_FACTOR = 10 ** BUCKET_DECIMALS;

type Params = {
  lat: number;
  lng: number;
  radiusKm?: number;
};

// Round coordinates to 4 decimals (~11 m at Gothenburg's latitude — well
// inside the 1.5 km venue search radius). Without this, GPS jitter floods
// the TanStack cache with near-duplicate keys and forces a refetch on
// every micro-movement.
function bucket(n: number): number {
  return Math.round(n * BUCKET_FACTOR) / BUCKET_FACTOR;
}

/**
 * TanStack Query wrapper around `/api/venues`. Used by `MapView` to
 * populate `VenuePinLayer` with the venues currently in range.
 *
 * Query key flows through `queryKeys.venues.list({ lat, lng, radiusKm })`
 * — never construct keys inline (architecture.md §"TanStack Query Key
 * Conventions"). The hook returns the `useQuery` result verbatim per the
 * "return TanStack Query result objects directly" rule.
 *
 * The `queryFn` propagates TanStack's `signal` to `fetch` so a request
 * triggered by an earlier `(lat, lng)` is aborted as soon as the key
 * changes — Story 1.5+ (geolocation) will swap coordinates rapidly.
 *
 * `refetchOnWindowFocus: false` is also set on the QueryClient default
 * (`app/providers.tsx`); duplicating it here keeps the hook safe if the
 * default is ever loosened.
 */
export function useVenueSearch(
  params: Params,
): UseQueryResult<GetVenuesResponse, Error> {
  const radiusKm = params.radiusKm ?? DEFAULT_RADIUS_KM;
  // Reject non-finite coordinates before bucketing — guard upstream so
  // the bucketed values are also valid before they enter the query key.
  // `enabled: inputsValid` prevents a refetch storm on NaN inputs:
  // because `NaN !== NaN`, every render would otherwise produce a new
  // query key and trigger the queryFn (which would throw) again.
  const inputsValid = Number.isFinite(params.lat) && Number.isFinite(params.lng);
  const lat = inputsValid ? bucket(params.lat) : 0;
  const lng = inputsValid ? bucket(params.lng) : 0;
  return useQuery<GetVenuesResponse, Error>({
    queryKey: queryKeys.venues.list({ lat, lng, radiusKm }),
    queryFn: async ({ signal }) => {
      const url = `/api/venues?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`;
      const res = await fetch(url, { signal });
      if (!res.ok) {
        throw new Error(`Venue search failed: ${res.status} ${res.statusText}`);
      }
      // A 200 with a non-JSON content-type usually means an auth wall or
      // proxy rewrote the response. Surface a useful error rather than
      // letting `res.json()` throw a SyntaxError that TanStack reports
      // verbatim.
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.toLowerCase().includes('application/json')) {
        throw new Error(`Venue search returned unexpected content-type: ${contentType || '(missing)'}`);
      }
      return (await res.json()) as GetVenuesResponse;
    },
    staleTime: FIVE_MINUTES,
    refetchOnWindowFocus: false,
    enabled: inputsValid,
  });
}
