import { GOTHENBURG } from '@/lib/solar/constants';
import type { WeatherSlice } from '@/lib/solar/types';
import { PLANNER_MAX_FUTURE_DAYS } from '@/lib/utils/time-planner';

const API_BASE = 'https://api.met.no/weatherapi';

// Met.no TOS requires an identifying User-Agent with a way to make contact.
// Sourced from MET_NO_USER_AGENT (overridable per environment) and falls back to
// a non-secret default carrying the project maintainer's contact-of-record, so
// even the fallback is TOS-compliant. This is NOT a secret — it must NOT be
// NEXT_PUBLIC_, but it carries no credential (the contact address is public by
// TOS design). [Story 8.5 Task 5.4 / AC#4e]
const DEFAULT_USER_AGENT = 'SunnySeat/1.0 rasmus.thunborg@enhancior.se';
const FORECAST_HORIZON_MS = (PLANNER_MAX_FUTURE_DAYS + 1) * 24 * 60 * 60 * 1000;

// EXPORTED (Story 10.4 Task 1): the Nowcast 2.0 client (`nowcast-service.ts`)
// reuses this SAME identifying User-Agent helper so the two Met.no clients cannot
// drift out of TOS compliance (a second copy-pasted UA constant is exactly what
// the story forbids). Kept as the single source of truth here — smaller diff than
// lifting both into a separate `met-no-common.ts`.
export function userAgent(): string {
  return process.env.MET_NO_USER_AGENT?.trim() || DEFAULT_USER_AGENT;
}

interface MetNoResponse {
  properties?: {
    timeseries?: Array<{
      time: string;
      data?: {
        instant?: {
          details?: {
            air_temperature?: number;
            cloud_area_fraction?: number;
            // STORY 10.3 (AC1): the three-layer cloud split. These exist ONLY in the
            // Met.no `complete` product (below-2000 m / 2000–5000 m / above-5000 m
            // cirrus), all in percent 0..100 — which is exactly why Task 1 switches
            // the fetch below from `compact` to `complete`. Optional: a `complete`
            // entry that lacks a band leaves that field absent (never `?? 0`).
            cloud_area_fraction_low?: number;
            cloud_area_fraction_medium?: number;
            cloud_area_fraction_high?: number;
            fog_area_fraction?: number;
          };
        };
        next_1_hours?: {
          details?: {
            precipitation_amount?: number;
          };
        };
      };
    }>;
  };
}

export async function getCurrentWeather(
  latitude = GOTHENBURG.LATITUDE,
  longitude = GOTHENBURG.LONGITUDE
): Promise<WeatherSlice | null> {
  const forecast = await getForecast(latitude, longitude);
  return forecast[0] ?? null;
}

export async function getForecast(
  latitude = GOTHENBURG.LATITUDE,
  longitude = GOTHENBURG.LONGITUDE
): Promise<WeatherSlice[]> {
  try {
    // STORY 10.3 (AC1): `complete` (not `compact`) so the response carries the
    // three-layer cloud split (`cloud_area_fraction_low/_medium/_high`) that the
    // layer-weighted effective-cover gate consumes. Same API, same TOS posture,
    // same 4-decimal coordinate truncation, same `revalidate: 300` caching — the
    // ONLY change from Story 8.5 is the endpoint path segment. `complete` payloads
    // are larger (many more instant variables) but we read only a handful of
    // `instant.details` fields, so the extra parse cost is negligible and the
    // 48-entry slice cap already bounds it.
    const url = `${API_BASE}/locationforecast/2.0/complete?lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(4)}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': userAgent() },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.warn(`Met.no returned ${res.status} for lat=${latitude}, lon=${longitude}`);
      return [];
    }

    const data: MetNoResponse = await res.json();
    const timeseries = data.properties?.timeseries;
    if (!timeseries?.length) return [];

    const now = Date.now();
    const slices: WeatherSlice[] = [];

    const forecastHorizon = now + FORECAST_HORIZON_MS;
    for (const entry of timeseries) {
      const instant = entry.data?.instant?.details;
      if (!instant) continue;

      const validAt = new Date(entry.time);
      const entryTime = validAt.getTime();
      if (entryTime > forecastHorizon) continue;
      const isForecast = entryTime > now + 30 * 60000;

      const fogFraction = instant.fog_area_fraction;
      const visibility =
        fogFraction != null ? (100 - fogFraction) / 10.0 : undefined;

      slices.push({
        // STORY 10.1 (AC2): do NOT default a missing `cloud_area_fraction` to `0`
        // (clear sky) — the old optimistic default was exactly the wrong failure
        // mode. Leave `cloudCover` undefined when the field is absent so the slice
        // reads "weather-unknown for gating": non-gating AND non-clear downstream
        // (the cloud gate does not fire, skyCondition → 'unavailable', and the
        // confidence blend treats it as neutral rather than 100% overcast).
        cloudCover: instant.cloud_area_fraction,
        // STORY 10.3 (AC1): the three-layer split from the `complete` product.
        // Like the total above, leave each `undefined` when the band is absent —
        // do NOT `?? 0`. A partial `complete` entry (any layer missing) degrades to
        // the Tier-0 total via `effectiveCloudCover`'s fallback (Story 10.3 AC3).
        cloudCoverLow: instant.cloud_area_fraction_low,
        cloudCoverMedium: instant.cloud_area_fraction_medium,
        cloudCoverHigh: instant.cloud_area_fraction_high,
        temperature: instant.air_temperature ?? 0,
        visibility,
        isForecast,
        source: 'metno',
        // createdAt = when WE fetched (kept for confidence-calculator's data-age
        // model). validAt = the slice's own valid-time, used by the sun-engine
        // adapter for honest freshness + the >2h "approximate" signal so it can
        // actually fire and a future-planner slice is not advertised as fresh
        // "now". [Story 8.5 Task 5.3 / AC#4c]
        createdAt: new Date(),
        validAt,
      });
    }

    return slices;
  } catch (err) {
    console.error('Met.no fetch error:', err);
    return [];
  }
}

export async function isAvailable(): Promise<boolean> {
  try {
    // STORY 10.3: the liveness probe deliberately stays on `compact`. It is a cheap
    // ok/not-ok ping (never a data read), so switching it to the heavier `complete`
    // payload would just cost more bandwidth for no benefit — a conscious choice,
    // not an oversight. The DATA fetch (`getForecast`) is the one that needs the
    // three-layer split and uses `complete`.
    const url = `${API_BASE}/locationforecast/2.0/compact?lat=57.7089&lon=11.9746`;
    const res = await fetch(url, {
      headers: { 'User-Agent': userAgent() },
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
