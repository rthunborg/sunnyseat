'use client';

import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type { GetVenuesResponse } from '@/lib/types/api';
import { readSunFreshnessHeaders } from '@/lib/utils/sun-freshness';
import { deriveQueryKeyPlanner } from '@/lib/utils/venue-query-planner';
import {
  HttpError,
  shouldRetryVenueQuery,
  venueQueryRetryDelay,
} from './venue-query-options';

const FIVE_MINUTES = 5 * 60 * 1000;
const DEFAULT_RADIUS_KM = 1.5;
const BUCKET_DECIMALS = 4;
const BUCKET_FACTOR = 10 ** BUCKET_DECIMALS;

type Params = {
  lat: number;
  lng: number;
  radiusKm?: number;
  q?: string;
  date?: string;
  time?: string;
  // Story 11.1 (AC1): whether the selected planner moment is the live wall-clock
  // "now". When true, the request omits date/time (the server computes for now)
  // and the query POLLS (`refetchInterval`), while off-live it sends date/time and
  // does not poll. Critically, the query KEY includes the selected `date` in BOTH
  // cases, so a live-today ↔ off-live-today scrub keeps the SAME key and fires
  // ZERO fetches (the R-001 zero-fetch invariant). Defaults to FALSE so a caller
  // that passes an explicit `date`+`time` keeps the pre-11.1 "send the planner
  // selection" behaviour; MapView passes `isLiveNow` explicitly.
  isLiveNow?: boolean;
  // Story 9.4 AC2: lets the caller gate the FIRST fetch until geolocation
  // settles (so the fallback-centrum key and the real-GPS key don't both
  // fire). Defaults to enabled; combined with the internal `inputsValid`
  // guard. `keepPreviousData` still masks any later key change.
  enabled?: boolean;
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
  const q = normalizeTextQuery(params.q);
  const isLiveNow = params.isLiveNow === true;
  const planner = normalizePlannerParams(params.date, params.time);
  // STORY 11.1 (AC1, R-001 headline): the TIME dimension is derived CLIENT-SIDE
  // from the per-step `sunDaySeries` (see `lib/utils/venue-day-series.ts`), so a
  // settled same-date time change (scrub) MUST NOT change the query key — that is
  // the "scrub = 0 requests" invariant. The key therefore includes the selected
  // `date` (+ coords + q) but NEVER `time`, and it includes `date` in BOTH the
  // live and off-live cases so a live-today ↔ off-live-today scrub keeps the SAME
  // key (zero fetch). Only a DATE change or a material LOCATION change flips it
  // (the single fetch AC3 permits). The REQUEST sends `date` + `time` ONLY when
  // off-live (the route requires both together and anchors the series to that
  // day); when live the request omits them so the server computes for "now" and
  // the freshness stays live. The `time` value only picks the single-instant
  // fallback fields and never appears in the key, so the live-clock tick that
  // advances "now" cannot thrash the key either.
  const sendPlanner = !isLiveNow && planner ? planner : undefined;
  // Story 11.1 / external-review fix: the date-only key fragment is derived by the
  // SHARED `deriveQueryKeyPlanner` (used identically by `useFavouriteVenues`) so a
  // future edit cannot reintroduce a `time`-keyed fetch in only one hook.
  const keyPlanner = deriveQueryKeyPlanner(planner?.date);
  const filters = { lat, lng, q, radiusKm, ...keyPlanner };
  return useQuery<GetVenuesResponse, Error>({
    queryKey: keyPlanner
      ? queryKeys.venues.planner(filters)
      : queryKeys.venues.list(filters),
    queryFn: async ({ signal }) => {
      const searchParams = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radiusKm: String(radiusKm),
      });
      if (q) searchParams.set('q', q);
      if (sendPlanner) {
        searchParams.set('date', sendPlanner.date);
        searchParams.set('time', sendPlanner.time);
      }
      const url = `/api/venues?${searchParams.toString()}`;
      const res = await fetch(url, { signal });
      if (!res.ok) {
        throw new HttpError(`Venue search failed: ${res.status} ${res.statusText}`, res.status);
      }
      // A 200 with a non-JSON content-type usually means an auth wall or
      // proxy rewrote the response. Surface a useful error rather than
      // letting `res.json()` throw a SyntaxError that TanStack reports
      // verbatim.
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.toLowerCase().includes('application/json')) {
        throw new Error(`Venue search returned unexpected content-type: ${contentType || '(missing)'}`);
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
    // Poll on the live path (no off-live planner selection sent), never off-live.
    // `sendPlanner` is set ONLY when the selection is off-live; so this keeps the
    // 5-min live refresh for the live-now key (with or without a date) and stops
    // polling a fixed off-live planner selection. [Story 11.1]
    refetchInterval: sendPlanner ? false : FIVE_MINUTES,
    refetchOnWindowFocus: false,
    retry: shouldRetryVenueQuery,
    retryDelay: venueQueryRetryDelay,
    placeholderData: keepPreviousData,
    enabled: params.enabled !== false && inputsValid,
  });
}

function normalizeTextQuery(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
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
