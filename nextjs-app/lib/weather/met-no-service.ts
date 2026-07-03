import { GOTHENBURG } from '@/lib/solar/constants';
import type { WeatherSlice } from '@/lib/solar/types';

const API_BASE = 'https://api.met.no/weatherapi';

// Met.no TOS requires an identifying User-Agent with a way to make contact.
// Sourced from MET_NO_USER_AGENT (overridable per environment) and falls back to
// a non-secret default carrying the project maintainer's contact-of-record, so
// even the fallback is TOS-compliant. This is NOT a secret — it must NOT be
// NEXT_PUBLIC_, but it carries no credential (the contact address is public by
// TOS design). [Story 8.5 Task 5.4 / AC#4e]
const DEFAULT_USER_AGENT = 'SunnySeat/1.0 rasmus.thunborg@enhancior.se';

function userAgent(): string {
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
    const url = `${API_BASE}/locationforecast/2.0/compact?lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(4)}`;

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

    for (const entry of timeseries.slice(0, 48)) {
      const instant = entry.data?.instant?.details;
      if (!instant) continue;

      const validAt = new Date(entry.time);
      const entryTime = validAt.getTime();
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
