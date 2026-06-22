/**
 * STORY 8.3 — sun-engine adapter (server-only, env-gated).
 *
 * Replaces the TEMP seed sun-output fields (`currentSunStatus`, `skyCondition`,
 * `confidence`, `sunExposurePercent`, `sunWindow`, `predictionUncertainty`) and
 * the freshness metadata (`sunDataSource`, `weatherUpdatedAt`) with values
 * computed by `lib/solar` (sun position + shadow casting via the
 * `get_buildings_near_point` RPC) and `lib/weather` (Met.no), serialized through
 * the UNCHANGED `VenueDataDto`. Durable venue attributes (Story 8.2) are left
 * untouched.
 *
 * Env-gated exactly like `lib/services/venue-store.ts`: the default (flag unset)
 * path never calls this adapter, so the route output stays byte-identical to the
 * 8.2 seed. `SUNNYSEAT_SUN_ENGINE=real` (+ Supabase service-role config for the
 * RPC) opts into the live computation. The engine + weather modules are loaded
 * lazily so the default path has ZERO live-Supabase / live-Met.no dependency.
 *
 * Server-only — client components must never import this module (API boundary).
 */
import { fromZonedTime } from 'date-fns-tz';
import { toVenueData, type StoredVenue } from '@/lib/services/venue-store';
import type { VenuePlannerSelection } from '@/lib/services/venue-planner';
import type {
  PredictionUncertaintyDto,
  PredictionUncertaintyLevel,
  PredictionUncertaintyReason,
  SunFreshnessMeta,
  VenueDataDto,
  VenueSunStatus,
} from '@/lib/types/api';
import {
  SUN_DATA_SOURCE_GEOMETRY_ONLY,
  SUN_DATA_SOURCE_WEATHER,
} from '@/lib/utils/sun-freshness';
import type {
  ObstructionRiskClass,
  ShadowTimelinePoint,
  VenueShadowInfo,
  WeatherSlice,
} from '@/lib/solar/types';

const STOCKHOLM_TIME_ZONE = 'Europe/Stockholm';

/**
 * Footprint fallback size (Story 8.3 DECISION B). The single documented tunable:
 * a venue with no real `seatingArea` polygon gets a square of this side length
 * (metres) centred on its point, keeping `sunExposurePercent` graded 0..100.
 */
export const VENUE_FOOTPRINT_FALLBACK_SIZE_M = 10;

// Same-day sun-window scan (one RPC per venue via the timeline's single buildings
// fetch). Coarse for MVP compute-on-request cost (DECISION D); a precompute
// pipeline is the flagged follow-up if measured list latency exceeds posture.
// Bounds cover the full civil day at Gothenburg's latitude — at midsummer the
// sun is up before 05:00 and after 22:00, so a narrower scan would clip the true
// sunlit window. The single-RPC timeline makes the extra solar samples cheap.
// [Story 8.3 review R1]
const SUN_WINDOW_SCAN_START = '03:00:00';
const SUN_WINDOW_SCAN_END = '23:00:00';
const SUN_WINDOW_SAMPLE_INTERVAL_MIN = 30;

// Classification thresholds (mirror lib/solar sun-exposure-service classifySunState).
const SUNNY_THRESHOLD_PERCENT = 70;
const SUNLIT_THRESHOLD_PERCENT = 30;

// Weather older than this (or any forecast slice) flags a `weather` uncertainty
// reason, matching the confidence-display "approximate" boundary (Story 2.6).
const STALE_WEATHER_AGE_MS = 2 * 60 * 60 * 1000;

export type SunEngineOutcome = {
  /** Base venue DTO with the six sun-output fields replaced by engine values. */
  venue: VenueDataDto;
  /** Real weather freshness for the response `meta` + `X-*` headers (Task 3). */
  freshness: SunFreshnessMeta;
  /** Engine-derived peak-exposure time (HH:mm Stockholm) for the detail timeline. */
  peakTime?: string;
};

type SunEngineFields = Pick<
  VenueDataDto,
  'currentSunStatus' | 'confidence' | 'sunExposurePercent'
> & {
  skyCondition?: string;
  sunWindow?: { start: string; end: string };
  predictionUncertainty?: PredictionUncertaintyDto;
};

type GetForecast = (
  latitude?: number,
  longitude?: number,
) => Promise<WeatherSlice[]>;

// ---------------------------------------------------------------------------
// Env gate (DECISION A / Task 1.3)
// ---------------------------------------------------------------------------

export function usesRealSunEngine(): boolean {
  return process.env.SUNNYSEAT_SUN_ENGINE === 'real';
}

function hasSupabaseServiceRoleConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/**
 * The real engine runs only when explicitly opted in AND the service-role config
 * the RPC needs is present. Otherwise the routes keep the byte-identical 8.2
 * seed path. [Story 8.3 DECISION A]
 */
export function shouldUseRealSunEngine(): boolean {
  return usesRealSunEngine() && hasSupabaseServiceRoleConfig();
}

// ---------------------------------------------------------------------------
// Batch fan-out: concurrency cap + Met.no forecast dedupe (Story 8.5 5.1/5.2)
// ---------------------------------------------------------------------------

// Met.no TOS: truncate coordinates to ≤4 decimals. Rounding to 4 decimals is
// also the dedupe key — nearby venues that round to the same key share ONE
// upstream fetch, keeping aggregate Met.no load well under the 20 req/s cap.
const FORECAST_COORD_PRECISION = 4;

/** Concurrency cap on the per-venue engine fan-out for the list route. */
export const SUN_ENGINE_LIST_CONCURRENCY = 6;

function forecastCoordKey(latitude?: number, longitude?: number): string {
  const lat = Number.isFinite(latitude) ? (latitude as number) : Number.NaN;
  const lng = Number.isFinite(longitude) ? (longitude as number) : Number.NaN;
  return `${lat.toFixed(FORECAST_COORD_PRECISION)},${lng.toFixed(FORECAST_COORD_PRECISION)}`;
}

/**
 * Wrap a forecast fetcher so concurrent calls with the same rounded coordinates
 * issue ONE upstream Met.no request (in-flight coalescing). Create a fresh
 * instance per list request — batch-scoped, so there is no cross-request
 * staleness beyond Met.no's own fetch-cache revalidation. [Story 8.5 5.1 / AC#4b]
 */
export function createDedupedForecastFetcher(getForecast: GetForecast): GetForecast {
  const inFlight = new Map<string, Promise<WeatherSlice[]>>();
  return (latitude, longitude) => {
    const key = forecastCoordKey(latitude, longitude);
    const existing = inFlight.get(key);
    if (existing) return existing;
    const pending = getForecast(latitude, longitude);
    inFlight.set(key, pending);
    return pending;
  };
}

/**
 * Run `task` over `items` with at most `concurrency` in flight at once, preserving
 * input order in the results. Bounds the per-venue RPC + Met.no fan-out as the
 * venue set grows (compute-on-request, DECISION D). The caller is responsible for
 * making `task` non-throwing if a rejection must not abort the batch (the list
 * route wraps each venue → {@link safeSeedOutcome}). [Story 8.5 5.1 / AC#4b]
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const limit = Math.max(1, Math.min(concurrency, items.length || 1));

  async function worker(): Promise<void> {
    for (let i = nextIndex++; i < items.length; i = nextIndex++) {
      results[i] = await task(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}

// ---------------------------------------------------------------------------
// Public entrypoints used by the routes
// ---------------------------------------------------------------------------

/**
 * Resolve the instant to compute for (DECISION C): now, or the planner
 * selection's Stockholm-local date+time converted to UTC.
 */
export function resolveRequestedAt(
  selection: VenuePlannerSelection | undefined,
  now: Date,
): Date {
  if (!selection) return now;
  return fromZonedTime(`${selection.date}T${selection.time}:00`, STOCKHOLM_TIME_ZONE);
}

/**
 * Collapse per-venue freshness into a single response-level `meta`/header value
 * for the list route: weather (with the most recent timestamp) if any venue had
 * weather, else geometry-only.
 */
export function aggregateSunFreshness(
  freshnesses: readonly SunFreshnessMeta[],
): SunFreshnessMeta {
  let latest: string | undefined;
  for (const freshness of freshnesses) {
    if (freshness.sunDataSource === SUN_DATA_SOURCE_WEATHER && freshness.weatherUpdatedAt) {
      // ISO-8601 timestamps from the same producer are lexicographically ordered.
      if (!latest || freshness.weatherUpdatedAt > latest) {
        latest = freshness.weatherUpdatedAt;
      }
    }
  }
  return latest
    ? { sunDataSource: SUN_DATA_SOURCE_WEATHER, weatherUpdatedAt: latest }
    : { sunDataSource: SUN_DATA_SOURCE_GEOMETRY_ONLY };
}

/**
 * Compute the real sun-output fields for a venue, degrading to a safe per-venue
 * result (never a throw → never a 500, DECISION D) if the engine or weather
 * fetch fails. The route gates this behind {@link shouldUseRealSunEngine}.
 */
export async function applyRealSunEngine(
  venue: StoredVenue,
  requestedAt: Date,
  now: Date = new Date(),
  getForecastOverride?: GetForecast,
): Promise<SunEngineOutcome> {
  try {
    return await computeRealSunEngine(venue, requestedAt, now, getForecastOverride);
  } catch (error) {
    console.error(
      `Sun engine failed for venue ${venue.id}; degrading to seed values:`,
      error instanceof Error ? error.message : String(error),
    );
    return safeSeedOutcome(venue);
  }
}

/**
 * The safe per-venue fallback: the venue's base DTO with geometry-only freshness.
 * Used by {@link applyRealSunEngine}'s own catch AND by the batch runner so a
 * future adapter throw can never 500 the list route (DECISION D / Story 8.5 5.2).
 */
export function safeSeedOutcome(venue: StoredVenue): SunEngineOutcome {
  return {
    venue: toVenueData(venue),
    freshness: { sunDataSource: SUN_DATA_SOURCE_GEOMETRY_ONLY },
  };
}

// ---------------------------------------------------------------------------
// Real computation (lazy-loads the engine + weather — server-only)
// ---------------------------------------------------------------------------

async function computeRealSunEngine(
  venue: StoredVenue,
  requestedAt: Date,
  now: Date,
  getForecastOverride?: GetForecast,
): Promise<SunEngineOutcome> {
  const {
    calculateVenueShadowForGeometry,
    calculateVenueShadowTimelineForGeometry,
    calculateConfidenceFactors,
    calculateDisplayConfidence,
  } = await import('@/lib/solar');
  // On the list route the batch passes a deduped fetcher (one Met.no call per
  // rounded coordinate); the detail route / direct callers lazy-import the real
  // fetcher so the default path stays offline. [Story 8.5 Task 5.1]
  const getForecast =
    getForecastOverride ?? (await import('@/lib/weather/met-no-service')).getForecast;

  const geometry = resolveVenueGeometry(venue);

  // Current shadow state at the requested instant (RPC #1).
  const shadowInfo = await calculateVenueShadowForGeometry(geometry, requestedAt);
  // Per-venue weather at the venue's OWN location for the requested time (Task 3.2)
  // — not the engine's hardcoded Gothenburg-centre / current-only call.
  const weather = await fetchWeatherForVenue(getForecast, venue.location, requestedAt);

  const isSunVisible = shadowInfo.solarPosition.isSunVisible;
  const sunExposurePercent = Math.round(clampPercent(shadowInfo.sunlitAreaPercent));
  const currentSunStatus: VenueSunStatus = isSunVisible
    ? classifySunStatus(sunExposurePercent)
    : 'NoSun';

  const confidenceFactors = calculateConfidenceFactors(
    1.0,
    shadowInfo,
    shadowInfo.solarPosition,
    weather,
  );
  const confidence = Math.round(clampPercent(calculateDisplayConfidence(confidenceFactors)));

  const skyCondition = weather
    ? skyConditionFromCloudCover(weather.cloudCover)
    : 'unavailable';
  const predictionUncertainty = buildPredictionUncertainty(
    shadowInfo,
    weather,
    confidence,
    now,
  );

  // Same-day sun-window scan (RPC #2 — one buildings fetch reused internally).
  const { start: scanStart, end: scanEnd } = sameDayScanRange(requestedAt);
  const timeline = await calculateVenueShadowTimelineForGeometry(
    geometry,
    scanStart,
    scanEnd,
    SUN_WINDOW_SAMPLE_INTERVAL_MIN * 60_000,
  );
  const sunWindow = extractSunlitWindow(timeline.points);
  const peakTime = peakTimeFromTimeline(timeline.points);

  const fields: SunEngineFields = {
    currentSunStatus,
    confidence,
    sunExposurePercent,
    skyCondition,
    ...(sunWindow ? { sunWindow } : {}),
    ...(predictionUncertainty ? { predictionUncertainty } : {}),
  };

  return {
    venue: mergeSunFields(toVenueData(venue), fields),
    freshness: weather
      ? {
          sunDataSource: SUN_DATA_SOURCE_WEATHER,
          // The slice's valid-time (not the fetch instant) is the honest
          // freshness: a future-planner forecast slice carries its future
          // valid-time, not a misleading "now". [Story 8.5 Task 5.3 / AC#4c]
          weatherUpdatedAt: weatherValidAt(weather).toISOString(),
        }
      : { sunDataSource: SUN_DATA_SOURCE_GEOMETRY_ONLY },
    ...(peakTime ? { peakTime } : {}),
  };
}

/** Resolve the engine geometry: real seating polygon, else point footprint. */
export function resolveVenueGeometry(
  venue: Pick<StoredVenue, 'seatingArea' | 'location'>,
): GeoJSON.Polygon {
  if (venue.seatingArea) return venue.seatingArea;
  return synthesizeFootprint(
    venue.location.lat,
    venue.location.lng,
    VENUE_FOOTPRINT_FALLBACK_SIZE_M,
  );
}

/** A small square polygon of side `sizeM` centred on (lat, lng). */
export function synthesizeFootprint(
  lat: number,
  lng: number,
  sizeM: number,
): GeoJSON.Polygon {
  const halfM = sizeM / 2;
  const dLat = halfM / 111_320;
  const dLng = halfM / (111_320 * Math.cos((lat * Math.PI) / 180));
  const ring: number[][] = [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
    [lng - dLng, lat - dLat],
  ];
  return { type: 'Polygon', coordinates: [ring] };
}

async function fetchWeatherForVenue(
  getForecast: GetForecast,
  location: { lat: number; lng: number },
  requestedAt: Date,
): Promise<WeatherSlice | null> {
  const forecast = await getForecast(location.lat, location.lng);
  if (forecast.length === 0) return null;
  // Pick the slice whose valid-time is closest to the requested instant. Now
  // that WeatherSlice carries `validAt` we match directly instead of the old
  // hour-offset approximation. [Story 8.5 Task 5.3]
  let best = forecast[0];
  let bestDelta = Math.abs(weatherValidAt(best).getTime() - requestedAt.getTime());
  for (const slice of forecast) {
    const delta = Math.abs(weatherValidAt(slice).getTime() - requestedAt.getTime());
    if (delta < bestDelta) {
      best = slice;
      bestDelta = delta;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Pure DTO mappers (unit-tested directly)
// ---------------------------------------------------------------------------

/** Map sunlit% to the public sun-status enum (`NoSun` decided by the caller). */
export function classifySunStatus(sunExposurePercent: number): VenueSunStatus {
  if (sunExposurePercent >= SUNNY_THRESHOLD_PERCENT) return 'Sunny';
  if (sunExposurePercent >= SUNLIT_THRESHOLD_PERCENT) return 'Partial';
  return 'Shaded';
}

/** Map Met.no `cloud_area_fraction` (0..100) to the DTO `skyCondition`. */
export function skyConditionFromCloudCover(cloudCover: number): string {
  if (cloudCover < 20) return 'clear';
  if (cloudCover <= 60) return 'partly-cloudy';
  return 'overcast';
}

/**
 * Build `predictionUncertainty` from coverage + obstruction risk + weather,
 * mapped onto the existing {@link PredictionUncertaintyReason} union so the
 * Story 3.0.6 `next-intl` copy renders without leaking geodata internals.
 * Returns `undefined` when there is nothing to flag (matches the seed).
 */
export function buildPredictionUncertainty(
  shadowInfo: Pick<VenueShadowInfo, 'shadowDataCoverage' | 'obstructionRisks'>,
  weather: WeatherSlice | null,
  confidence: number,
  now: Date,
): PredictionUncertaintyDto | undefined {
  const reasons: PredictionUncertaintyReason[] = [];
  const seen = new Set<PredictionUncertaintyReason>();
  const add = (reason: PredictionUncertaintyReason) => {
    if (!seen.has(reason)) {
      seen.add(reason);
      reasons.push(reason);
    }
  };

  const coverage = shadowInfo.shadowDataCoverage;
  if (coverage && coverage.status !== 'eligible') {
    add('building_shadow_coverage');
  }
  for (const risk of shadowInfo.obstructionRisks ?? []) {
    add(obstructionReason(risk));
  }
  if (isWeatherUncertain(weather, now)) {
    add('weather');
  }

  if (reasons.length === 0) return undefined;
  return { level: uncertaintyLevelFromConfidence(confidence), reasons };
}

/**
 * Extract the venue's sun window as the longest contiguous run of sunlit samples
 * (sun visible AND sunlit% at/above the Partial threshold). Returns `undefined`
 * when there is no sunlit window. Times are HH:mm in `Europe/Stockholm`.
 */
export function extractSunlitWindow(
  points: readonly ShadowTimelinePoint[],
): { start: string; end: string } | undefined {
  let bestStart = -1;
  let bestEnd = -1;
  let bestLen = 0;
  let runStart = -1;
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const sunlit =
      point.isSunVisible && point.sunlitAreaPercent >= SUNLIT_THRESHOLD_PERCENT;
    if (sunlit) {
      if (runStart === -1) runStart = i;
      const len = i - runStart + 1;
      if (len > bestLen) {
        bestLen = len;
        bestStart = runStart;
        bestEnd = i;
      }
    } else {
      runStart = -1;
    }
  }
  if (bestStart === -1) return undefined;
  return {
    start: formatStockholmHHmm(points[bestStart].timestamp),
    end: formatStockholmHHmm(points[bestEnd].timestamp),
  };
}

/** Time of peak sunlit exposure (HH:mm Stockholm), or `undefined` if never sunlit. */
export function peakTimeFromTimeline(
  points: readonly ShadowTimelinePoint[],
): string | undefined {
  let best: ShadowTimelinePoint | undefined;
  for (const point of points) {
    if (!point.isSunVisible) continue;
    if (!best || point.sunlitAreaPercent > best.sunlitAreaPercent) best = point;
  }
  if (!best || best.sunlitAreaPercent < SUNLIT_THRESHOLD_PERCENT) return undefined;
  return formatStockholmHHmm(best.timestamp);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function mergeSunFields(base: VenueDataDto, fields: SunEngineFields): VenueDataDto {
  const merged: VenueDataDto = {
    ...base,
    currentSunStatus: fields.currentSunStatus,
    confidence: fields.confidence,
    sunExposurePercent: fields.sunExposurePercent,
  };
  // The engine OWNS all six sun-output fields: drop any seed-carried optional
  // field the engine did not produce so the real path never leaks seed values.
  if (fields.skyCondition !== undefined) merged.skyCondition = fields.skyCondition;
  else delete merged.skyCondition;
  if (fields.sunWindow !== undefined) merged.sunWindow = fields.sunWindow;
  else delete merged.sunWindow;
  if (fields.predictionUncertainty !== undefined) {
    merged.predictionUncertainty = fields.predictionUncertainty;
  } else {
    delete merged.predictionUncertainty;
  }
  return merged;
}

function obstructionReason(risk: ObstructionRiskClass): PredictionUncertaintyReason {
  // 'tree' maps to the public 'vegetation' copy key; the rest map 1:1 onto the
  // PredictionUncertaintyReason union. normalizeVenueForResponse coerces any
  // stray value to 'other' as the final sanitizer.
  if (risk === 'tree') return 'vegetation';
  return risk;
}

/** The slice's own valid-time, falling back to the fetch instant if absent. */
function weatherValidAt(weather: WeatherSlice): Date {
  return weather.validAt ?? weather.createdAt;
}

function isWeatherUncertain(weather: WeatherSlice | null, now: Date): boolean {
  if (!weather) return true;
  // A forecast slice (future or >30min ahead) is never a fresh current
  // measurement → always "approximate".
  if (weather.isForecast) return true;
  // A current slice whose valid-time is more than STALE_WEATHER_AGE_MS in the
  // past is stale. Using validAt (not the fetch instant, which is always ~now)
  // is what lets NFR34's freshness cap actually fire. [Story 8.5 Task 5.3]
  return now.getTime() - weatherValidAt(weather).getTime() > STALE_WEATHER_AGE_MS;
}

function uncertaintyLevelFromConfidence(confidence: number): PredictionUncertaintyLevel {
  if (confidence < 50) return 'high';
  if (confidence < 75) return 'medium';
  return 'low';
}

function sameDayScanRange(requestedAt: Date): { start: Date; end: Date } {
  const dayKey = stockholmDateKey(requestedAt);
  return {
    start: fromZonedTime(`${dayKey}T${SUN_WINDOW_SCAN_START}`, STOCKHOLM_TIME_ZONE),
    end: fromZonedTime(`${dayKey}T${SUN_WINDOW_SCAN_END}`, STOCKHOLM_TIME_ZONE),
  };
}

function stockholmDateKey(date: Date): string {
  // sv-SE renders dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: STOCKHOLM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatStockholmHHmm(date: Date): string {
  // sv-SE renders times as 24-hour HH:mm.
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: STOCKHOLM_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}
