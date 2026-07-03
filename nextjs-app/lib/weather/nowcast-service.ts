/**
 * STORY 10.4 (Tier 2, AC1) — Met.no Nowcast 2.0 client.
 *
 * A SEPARATE Met.no product from the Locationforecast client (`met-no-service.ts`)
 * — a different endpoint, field, coverage model, and horizon — so it lives in its
 * own file rather than bolted onto `getForecast`. It gives the sun engine a direct
 * radar-based "is it raining RIGHT NOW at this coordinate" signal for near-now
 * requests: `precipitation_rate` (mm/h) from the ~5-minute Nordic radar nowcast.
 *
 * TOS posture is IDENTICAL to the forecast client and shares its primitives so the
 * two cannot drift: the same identifying `User-Agent` (imported from
 * `met-no-service.ts`, not re-declared — Met.no 403s a missing/non-identifying UA)
 * and the same `.toFixed(4)` coordinate truncation.
 *
 * GRACEFUL DEGRADATION (AC1 + the epic's unknown-never-fabricates discipline):
 * the accessor returns `number | undefined`, never throws. `undefined` = "we don't
 * know" (network/HTTP error, empty timeseries, coverage insufficient so Met.no
 * OMITS the field, or an explicit non-`ok` coverage marker); `0` = "radar says
 * genuinely no rain". Both are non-gating in the engine (AC3), but they are kept
 * DISTINCT — the rate is NEVER `?? 0`-defaulted, exactly as Story 10.1 ratified for
 * cloud cover. A nowcast outage therefore degrades silently to Tier 0/1 behaviour.
 *
 * Server-only — client components must never import this module (API boundary).
 */
import { GOTHENBURG } from '@/lib/solar/constants';
import { userAgent } from '@/lib/weather/met-no-service';

const API_BASE = 'https://api.met.no/weatherapi';

interface NowcastResponse {
  properties?: {
    // Optional radar coverage indicator (`ok` / `temporarily unavailable` /
    // `no coverage`). When present and not `ok`, the reading is untrustworthy →
    // treated as unknown. Met.no exposes it under `properties.meta.radar`.
    meta?: {
      radar?: string;
    };
    timeseries?: Array<{
      time: string;
      data?: {
        instant?: {
          details?: {
            // Present ONLY where radar coverage is sufficient — OMITTED elsewhere,
            // which reads as `undefined` (unknown), never a fabricated `0`. mm/h.
            precipitation_rate?: number;
          };
        };
      };
    }>;
  };
}

/**
 * Fetch the near-now radar precipitation rate (mm/h) at a coordinate.
 *
 * Returns the `precipitation_rate` of the timeseries entry nearest to now, or
 * `undefined` when it is unknown (any failure, no coverage, absent field). Never
 * throws, never fabricates a value.
 */
export async function getNowcastPrecipitationRate(
  latitude = GOTHENBURG.LATITUDE,
  longitude = GOTHENBURG.LONGITUDE,
): Promise<number | undefined> {
  try {
    // `/complete` is the JSON (GeoJSON) product; `/classic` is the legacy XML
    // variant (not used). Same `api.met.no/weatherapi` base + `.toFixed(4)`
    // coordinate truncation (Met.no TOS) as the forecast client.
    const url = `${API_BASE}/nowcast/2.0/complete?lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(4)}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': userAgent() },
      // Short TTL consistent with the 5-minute radar cadence — comfortably fresher
      // than the product update while still coalescing the per-request fan-out.
      // NOT the forecast's `revalidate: 300` (that would serve stale "now" rain).
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.warn(`Met.no nowcast returned ${res.status} for lat=${latitude}, lon=${longitude}`);
      return undefined;
    }

    const data: NowcastResponse = await res.json();

    // An explicit coverage marker that is present and not `ok` ⇒ the reading is
    // not trustworthy → unknown (non-gating), regardless of any rate in the body.
    const radar = data.properties?.meta?.radar;
    if (radar !== undefined && radar !== 'ok') return undefined;

    const timeseries = data.properties?.timeseries;
    if (!timeseries?.length) return undefined;

    const entry = nearestToNowEntry(timeseries);
    // ABSENT `precipitation_rate` = radar coverage insufficient (Met.no OMITS it).
    // Stays `undefined` (unknown), NEVER `?? 0` — `0` would fabricate "no rain".
    return entry?.data?.instant?.details?.precipitation_rate;
  } catch (err) {
    console.error('Met.no nowcast fetch error:', err);
    return undefined;
  }
}

/**
 * Pick the timeseries entry whose valid-time is nearest to now. Guards against an
 * unparseable `entry.time` (Invalid Date) so a bad timestamp cannot silently
 * select the wrong slice — an entry with a NaN time is never considered the
 * closest, and if every time is unparseable we fall back to the first entry (the
 * natural earliest ≈ now step). [8.5 R1 Invalid-Date defensiveness, folded in]
 */
function nearestToNowEntry<T extends { time: string }>(
  timeseries: readonly T[],
): T | undefined {
  const now = Date.now();
  let best: T | undefined;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const entry of timeseries) {
    const t = new Date(entry.time).getTime();
    if (Number.isNaN(t)) continue;
    const delta = Math.abs(t - now);
    if (delta < bestDelta) {
      best = entry;
      bestDelta = delta;
    }
  }
  return best ?? timeseries[0];
}
