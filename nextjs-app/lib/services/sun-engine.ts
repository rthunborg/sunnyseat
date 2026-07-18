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
import { seatingCentroidWgs84 } from '@/lib/services/sun-geometry-coordinates';
import {
  buildingsCacheKey,
  getBuildingsCache,
  getOrComputeConditional,
  getOrFetchNonNull,
  getSunComputeCache,
  getSunDaySeriesCache,
  sunComputeCacheKey,
  sunDaySeriesCacheKey,
  weatherRefreshBucketMs,
} from '@/lib/services/sun-engine-cache';
import type { Building } from '@/lib/solar/types';
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
import type { VenueDaySeriesEntry } from '@/lib/types/api';
import {
  PLANNER_END_MINUTES,
  PLANNER_START_MINUTES,
  PLANNER_STEP_MINUTES,
} from '@/lib/utils/time-planner';

const STOCKHOLM_TIME_ZONE = 'Europe/Stockholm';

/**
 * Footprint fallback size (Story 8.3 DECISION B). The single documented tunable:
 * a venue with no real `seatingArea` polygon gets a square of this side length
 * (metres) centred on its point, keeping `sunExposurePercent` graded 0..100.
 */
export const VENUE_FOOTPRINT_FALLBACK_SIZE_M = 10;

// Same-day sun-window scan. Coarse for MVP compute-on-request cost (DECISION D);
// a precompute pipeline is the flagged follow-up if measured list latency exceeds
// posture. Bounds cover the full civil day at Gothenburg's latitude — at midsummer
// the sun is up before 05:00 and after 22:00, so a narrower scan would clip the
// true sunlit window. [Story 8.3 review R1]
//
// STORY 9.3 (AC1): the building set is now fetched ONCE per venue per request
// (via `fetchVenueBuildings`, cached on rounded centroid + radius) and shared by
// BOTH the single-shot current-shadow computation AND this full-day timeline, so
// a request issues ONE `get_buildings_near_point` RPC per venue rather than two.
// The earlier "one RPC per venue via the timeline's single buildings fetch"
// comment here was FALSE: the timeline reused one fetch across its ~41 samples,
// but the single-shot call fetched independently, so two RPCs fired per venue.
const SUN_WINDOW_SCAN_START = '03:00:00';
const SUN_WINDOW_SCAN_END = '23:00:00';
const SUN_WINDOW_SAMPLE_INTERVAL_MIN = 30;

// Classification thresholds (mirror lib/solar sun-exposure-service classifySunState).
const SUNNY_THRESHOLD_PERCENT = 70;
const SUNLIT_THRESHOLD_PERCENT = 30;

// STORY 10.1 (AC1): the single, named, tunable cloud-gate threshold. When the
// effective cloud cover at the requested instant is KNOWN and meets/exceeds this
// value, a geometrically-sunlit venue's headline state is overridden to
// `CloudObscured` — the app must never claim "full sun" while the sky is overcast.
// 80 is chosen because Met.no `cloud_area_fraction >= 80` is a near-total overcast
// where direct sun is effectively blocked at ground level; below it (broken/partly
// cloudy) direct sun still reaches the terrace often enough that the geometric
// signal stays honest. The geometric layer (`sunExposurePercent`/`sunWindow`/
// `peakTime`) is NEVER touched by this gate — it stays clear-sky potential.
//
// STORY 10.3 (DONE): the gate input is now a layer-weighted "effective cloud
// cover" (see `effectiveCloudCover` in `lib/solar/effective-cloud-cover.ts`) — high
// cirrus is weighted only weakly so a thin-haze sky does NOT gate, while a low
// stratus deck still does. As the 10.1 SEAM promised, the ONLY thing that changed
// is the value passed into `applyCloudGate`; this threshold + the gate logic stay
// exactly as ratified. 80 = the effective-cover level at/above which a
// geometrically-sunlit venue is re-labelled `CloudObscured`.
export const CLOUD_GATE_THRESHOLD_PERCENT = 80;

// STORY 10.4 (AC4): the near-now horizon for the Nowcast 2.0 radar rain signal.
// The nowcast is a ~2-hour product (~5-minute steps); we consult it ONLY for a
// `requestedAt` within [now, now + NOWCAST_HORIZON_MS]. 90 min sits safely inside
// the ~2 h product horizon, so a future-planner request materially beyond "now"
// never mixes in a stale "now" radar reading — forecast cloud governs there,
// exactly as Tiers 0/1 (a past `requestedAt < now` is skipped too: no live radar
// for the past). Documented, tunable, and asserted RELATIVELY in the AC4 tests
// (they read this constant, never a hard-coded 90 minutes).
export const NOWCAST_HORIZON_MS = 90 * 60 * 1000;

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
  /**
   * STORY 11.1 (AC1): the per-planner-step gated day-series. Carried SEPARATELY
   * from `venue` (not merged onto the DTO) so ONLY the LIST route attaches it to
   * the client DTO (`sunDaySeries`) — the `[slug]` detail route ignores it and
   * stays byte-identical. `applyRealSunEngine` does NOT populate this (it is the
   * single-instant path used by BOTH routes); the list route calls the dedicated
   * {@link computeVenueDaySeries} producer instead, so a series is never
   * accidentally leaked onto the detail DTO. [Task 2]
   */
  daySeries?: VenueDaySeriesEntry[];
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

// STORY 10.4 (Tier 2): the near-now radar rain accessor. Returns the
// precipitation rate (mm/h) at a coordinate now, or `undefined` when unknown
// (nowcast down / no coverage / absent field). Injected like `GetForecast` so
// tests mock it and the default seed path stays offline.
type GetNowcastRate = (
  latitude?: number,
  longitude?: number,
) => Promise<number | undefined>;

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
 * STORY 10.4 (Task 5, AC1): the nowcast twin of {@link createDedupedForecastFetcher}.
 * Co-located venues that round to the same 4-decimal coordinate key share ONE
 * upstream Nowcast 2.0 request per batch (in-flight coalescing) — a TOS-hygiene
 * requirement, since nowcast requests count toward the same Met.no rate budget as
 * the forecast. Create a fresh instance per list request (batch-scoped). It
 * inherits the same no-eviction property as the forecast fetcher, which is fine
 * for the same reason: `getNowcastPrecipitationRate` catches all errors and
 * resolves to `undefined` (never throws), so a transient failure coalesces to the
 * correct per-venue "unknown → non-gating" degrade. [8.5 R1 defer, mirrored]
 */
export function createDedupedNowcastFetcher(getNowcast: GetNowcastRate): GetNowcastRate {
  const inFlight = new Map<string, Promise<number | undefined>>();
  return (latitude, longitude) => {
    const key = forecastCoordKey(latitude, longitude);
    const existing = inFlight.get(key);
    if (existing) return existing;
    const pending = getNowcast(latitude, longitude);
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
  getNowcastOverride?: GetNowcastRate,
): Promise<SunEngineOutcome> {
  try {
    return await computeRealSunEngineCached(
      venue,
      requestedAt,
      now,
      getForecastOverride,
      getNowcastOverride,
    );
  } catch (error) {
    console.error(
      `Sun engine failed for venue ${venue.id}; degrading to seed values:`,
      error instanceof Error ? error.message : String(error),
    );
    return safeSeedOutcome(venue);
  }
}

/**
 * STORY 9.3 (AC2/Task 3): cache the computed {@link SunEngineOutcome} per
 * `(venue id, 15-min time bucket, Stockholm day)`. A repeat request in the same
 * bucket — the common case on the live app, where the slider snaps to 15-min steps
 * and the list + detail routes recompute on every load — is served from the cache
 * instead of re-running the engine (and its building RPC + ~41 shadow projections).
 * A new wall-clock bucket recomputes, so worst-case sun staleness is one bucket
 * (15 min). The cache lives HERE, inside the shared engine seam, so BOTH
 * `/api/venues` (list) and `/api/venues/[slug]` (detail/"Mer info") inherit it
 * without duplicating cache logic (AC2 is explicit that detail benefits equally).
 *
 * ONLY successful computes are cached; a throw propagates to {@link applyRealSunEngine}'s
 * safe-seed catch and is NEVER pinned. The cached outcome carries its own honest
 * `weatherUpdatedAt` (the weather slice was cached WITH it), so the freshness signal
 * stays truthful for future-planner buckets. [Story 9.3 Task 3]
 *
 * NOTE: a per-request `getForecastOverride` (the list route's deduped fetcher) is
 * NOT part of the key — it only affects WHICH upstream call coalesces, never the
 * computed value for a given (venue, time bucket, day), so caching on the value is
 * correct.
 *
 * NOTE: `now` (the wall-clock fetch instant) is also intentionally NOT part of the
 * key. Its only effect on the outcome is the `'weather'` uncertainty flag in
 * `isWeatherUncertain`, which trips once a CURRENT (non-forecast) weather slice's
 * valid-time is > `STALE_WEATHER_AGE_MS` (2 h) before `now`. Within one 15-min
 * `requestedAt` bucket `now` drifts ≤ 15 min and the cache entry's TTL is also
 * 15 min, so that 2 h threshold cannot flip from `now`-drift alone inside a live
 * cached bucket — the staleness is bounded by the documented 15-min window, so
 * folding `now` into the key would only churn the cache without changing any
 * served value. [Story 9.3 review R1]
 *
 * The cache "variant" suffix folds in the inputs that change the computed sun
 * output but are per-venue CONSTANTS in production (resolved-geometry centroid +
 * seating/ground elevation). Keying on the venue id alone is already correct in
 * production; the variant suffix just makes the cache defensively correct if two
 * logical venues ever share an id with different geometry/elevation.
 */
async function computeRealSunEngineCached(
  venue: StoredVenue,
  requestedAt: Date,
  now: Date,
  getForecastOverride?: GetForecast,
  getNowcastOverride?: GetNowcastRate,
): Promise<SunEngineOutcome> {
  const { cache, inFlight } = getSunComputeCache<SunEngineOutcome>();
  const centroid = seatingCentroidWgs84(resolveVenueGeometry(venue));
  const variantKey =
    `${centroid.lat.toFixed(5)},${centroid.lng.toFixed(5)}` +
    `:${venue.seatingElevationM ?? 0}:${venue.groundElevationM ?? ''}`;
  const key = sunComputeCacheKey(
    venue.id,
    requestedAt,
    stockholmDateKey(requestedAt),
    variantKey,
  );
  return getOrComputeConditional(cache, inFlight, key, async () => {
    const { outcome, cacheable } = await computeRealSunEngineResult(
      venue,
      requestedAt,
      now,
      getForecastOverride,
      getNowcastOverride,
    );
    return { value: outcome, cacheable };
  });
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
// STORY 11.1 — per-step day-series producer (AC1/AC2)
// ---------------------------------------------------------------------------

/**
 * STORY 11.1 (AC1/Task 1): compute the per-planner-step gated day-series for a
 * venue — one `{ minutes, sunExposurePercent, currentSunStatus }` entry per
 * PLANNER_STEP_MINUTES (15 min) step from 06:00 to 21:00 Stockholm (61 steps).
 *
 * This is the SINGLE-INSTANT compute (`computeRealSunEngineResult`) sampled per
 * step, sharing the SAME building set (ONE `get_buildings_near_point` RPC via the
 * buildings cache) and the SAME forecast/nowcast fetchers — no extra RPC and no
 * per-step Met.no calls beyond the batch-deduped fetchers. Each step reuses the
 * shared {@link gatedStepValue} so a series entry is byte-identical to the single
 * shot at the corresponding instant (the Task-1 parity guardrail).
 *
 * The Epic-10 cloud/rain gate is applied PER STEP (never only "now"): each step's
 * weather is the forecast slice nearest THAT step's instant, and `isRaining` is
 * threaded EXPLICITLY per step under the AC4 horizon rule — the near-now nowcast
 * is consulted ONLY for a step within `[now, now + NOWCAST_HORIZON_MS]`; steps in
 * the past or beyond the horizon get `precipitationRate = undefined ⇒ isRaining =
 * false ⇒ forecast cloud governs` (byte-identical to Tiers 0/1). We never lean on
 * `applyCloudGate`'s `isRaining = false` default (the Epic-10 defer this producer
 * is the exact "new caller" for). A false-negative "sunny during rain" is the
 * worst outcome for an honesty-first app.
 *
 * Cached (AC2) per `(venue id, Stockholm day, weather-refresh bucket, elevation)`
 * via {@link getSunDaySeriesCache}: the series is a WHOLE-DAY artifact, so one
 * cached series serves every step of the day (a same-day time scrub is cache-free)
 * and a new weather-refresh bucket recomputes the whole series with its gating. A
 * degraded (null-buildings) series is returned but NOT pinned.
 */
export async function computeVenueDaySeries(
  venue: StoredVenue,
  requestedAt: Date,
  now: Date = new Date(),
  getForecastOverride?: GetForecast,
  getNowcastOverride?: GetNowcastRate,
): Promise<VenueDaySeriesEntry[]> {
  const { cache, inFlight } = getSunDaySeriesCache<VenueDaySeriesEntry[]>();
  const centroid = seatingCentroidWgs84(resolveVenueGeometry(venue));
  const variantKey =
    `${centroid.lat.toFixed(5)},${centroid.lng.toFixed(5)}` +
    `:${venue.seatingElevationM ?? 0}:${venue.groundElevationM ?? ''}`;
  const key = sunDaySeriesCacheKey(
    venue.id,
    stockholmDateKey(requestedAt),
    weatherRefreshBucketMs(now),
    variantKey,
  );
  return getOrComputeConditional(cache, inFlight, key, async () => {
    const { series, cacheable } = await computeVenueDaySeriesResult(
      venue,
      requestedAt,
      now,
      getForecastOverride,
      getNowcastOverride,
    );
    return { value: series, cacheable };
  });
}

type DaySeriesResult = { series: VenueDaySeriesEntry[]; cacheable: boolean };

/**
 * The uncached per-step compute behind {@link computeVenueDaySeries}. Fetches the
 * shared building set + forecast ONCE, then samples each 15-min planner step:
 * shadow at the step instant → geometric headline → gate against the step's
 * nearest forecast slice + the per-step nowcast rain (horizon rule). A null
 * building set makes the series degraded (`cacheable: false`), mirroring the
 * single-shot `buildings !== null` rule.
 */
async function computeVenueDaySeriesResult(
  venue: StoredVenue,
  requestedAt: Date,
  now: Date,
  getForecastOverride?: GetForecast,
  getNowcastOverride?: GetNowcastRate,
): Promise<DaySeriesResult> {
  const {
    calculateVenueShadowFromBuildings,
    fetchVenueBuildings,
    effectiveCloudCover,
    SHADOW_SEARCH_RADIUS_DEG,
  } = await import('@/lib/solar');
  const getForecast =
    getForecastOverride ?? (await import('@/lib/weather/met-no-service')).getForecast;
  const getNowcast =
    getNowcastOverride ??
    (await import('@/lib/weather/nowcast-service')).getNowcastPrecipitationRate;

  const geometry = resolveVenueGeometry(venue);
  const engineCoordinate = seatingCentroidWgs84(geometry);
  const seatingElevationM = venue.seatingElevationM ?? 0;
  const venueGroundZ = venue.groundElevationM;

  // ONE building RPC (shared via the buildings cache) for the whole series.
  const buildings = await fetchCachedVenueBuildings(
    geometry,
    fetchVenueBuildings,
    SHADOW_SEARCH_RADIUS_DEG,
  );

  // ONE forecast fetch for the whole series; slice selection is per step.
  const forecast = await getForecast(engineCoordinate.lat, engineCoordinate.lng);

  const dayKey = stockholmDateKey(requestedAt);
  const series: VenueDaySeriesEntry[] = [];
  for (
    let minutes = PLANNER_START_MINUTES;
    minutes <= PLANNER_END_MINUTES;
    minutes += PLANNER_STEP_MINUTES
  ) {
    const stepInstant = stepInstantFor(dayKey, minutes);
    const shadowInfo = calculateVenueShadowFromBuildings(geometry, stepInstant, buildings, {
      seatingElevationM,
      venueGroundZ,
    });
    const weather = nearestForecastSlice(forecast, stepInstant);
    const effectiveCover = effectiveCloudCover(weather);
    // Rain per step: consult the near-now nowcast ONLY inside the horizon
    // (AC4 rule). Beyond the horizon / in the past → undefined ⇒ isRaining=false
    // ⇒ forecast cloud governs. `getNowcast` is the batch-deduped fetcher, so a
    // co-located coord shares one call across all its near-now steps.
    const isNearNow =
      stepInstant.getTime() >= now.getTime() &&
      stepInstant.getTime() <= now.getTime() + NOWCAST_HORIZON_MS;
    const precipitationRate = isNearNow
      ? await getNowcast(engineCoordinate.lat, engineCoordinate.lng)
      : undefined;
    const isRaining = precipitationRate !== undefined && precipitationRate > 0;

    const { sunExposurePercent, currentSunStatus } = gatedStepValue(
      shadowInfo,
      effectiveCover,
      isRaining,
    );
    // STORY 11 (review): carry the per-step gated sky condition so a client time
    // scrub can override the obscured sub-line to track the step (parity with the
    // single-instant compute at ~L749 — rain precedence, else cloud descriptor,
    // else unavailable). Keeps the obscured sky phrase from freezing at the
    // server single-instant on a scrub (the Epic-10 honesty class).
    const skyCondition = isRaining
      ? 'rain'
      : weather
        ? skyConditionFromCloudCover(weather.cloudCover)
        : 'unavailable';
    series.push({ minutes, sunExposurePercent, currentSunStatus, skyCondition });
  }

  return { series, cacheable: buildings !== null };
}

/** Convert a planner minutes-of-day on `dayKey` to its UTC instant (Stockholm). */
function stepInstantFor(dayKey: string, minutes: number): Date {
  const hh = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const mm = (minutes % 60).toString().padStart(2, '0');
  return fromZonedTime(`${dayKey}T${hh}:${mm}:00`, STOCKHOLM_TIME_ZONE);
}

/** Nearest-valid-time forecast slice for an instant (matches fetchWeatherForVenue). */
function nearestForecastSlice(
  forecast: readonly WeatherSlice[],
  instant: Date,
): WeatherSlice | null {
  if (forecast.length === 0) return null;
  let best = forecast[0];
  let bestDelta = Math.abs(weatherValidAt(best).getTime() - instant.getTime());
  for (const slice of forecast) {
    const delta = Math.abs(weatherValidAt(slice).getTime() - instant.getTime());
    if (delta < bestDelta) {
      best = slice;
      bestDelta = delta;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Buildings cache (Story 9.3 Task 2) — wraps the single shared building fetch
// ---------------------------------------------------------------------------

/**
 * Fetch the venue's shadow casters through the buildings cache (rounded centroid
 * @4dp + radius-in-metres key, 24h TTL). Co-located venues that round to the same
 * key share ONE RPC; a repeat request within the window is RPC-free. A `null` (RPC
 * failure) is never cached as success — the next request retries. [Story 9.3 Task 2]
 */
async function fetchCachedVenueBuildings(
  geometry: GeoJSON.Polygon,
  fetchVenueBuildings: (geometry: GeoJSON.Polygon) => Promise<Building[] | null>,
  searchRadiusDeg: number,
): Promise<Building[] | null> {
  const { cache, inFlight } = getBuildingsCache<Building[]>();
  const centroid = seatingCentroidWgs84(geometry);
  const key = buildingsCacheKey(centroid.lng, centroid.lat, searchRadiusDeg * 111300);
  return getOrFetchNonNull(cache, inFlight, key, () => fetchVenueBuildings(geometry));
}

// ---------------------------------------------------------------------------
// Real computation (lazy-loads the engine + weather — server-only)
// ---------------------------------------------------------------------------

/**
 * The internal compute result plus whether it is safe to cache. A building-RPC
 * failure (`buildings === null`) produces a DEGRADED data-unavailable outcome that
 * must NOT be pinned in the per-bucket sun cache — otherwise a transient RPC
 * failure would persist for the whole TTL window. Weather being merely absent
 * (Met.no empty) is NOT degraded: the sun geometry computed fine, so that outcome
 * is cacheable. [Story 9.3 Task 3 — "cache only successful results"]
 */
type ComputeResult = { outcome: SunEngineOutcome; cacheable: boolean };

async function computeRealSunEngineResult(
  venue: StoredVenue,
  requestedAt: Date,
  now: Date,
  getForecastOverride?: GetForecast,
  getNowcastOverride?: GetNowcastRate,
): Promise<ComputeResult> {
  const {
    calculateVenueShadowFromBuildings,
    calculateVenueShadowTimelineFromBuildings,
    fetchVenueBuildings,
    calculateConfidenceFactors,
    calculateDisplayConfidence,
    effectiveCloudCover,
    SHADOW_SEARCH_RADIUS_DEG,
  } = await import('@/lib/solar');
  // On the list route the batch passes a deduped fetcher (one Met.no call per
  // rounded coordinate); the detail route / direct callers lazy-import the real
  // fetcher so the default path stays offline. [Story 8.5 Task 5.1]
  const getForecast =
    getForecastOverride ?? (await import('@/lib/weather/met-no-service')).getForecast;
  // STORY 10.4 (Task 2): the near-now radar rain accessor. Same injection pattern
  // as the forecast — the list route passes a batch-deduped fetcher; the detail
  // route / direct callers lazy-import the real one so the default seed path has
  // ZERO live-Met.no dependency (only resolved when actually consulted below).
  const getNowcast =
    getNowcastOverride ??
    (await import('@/lib/weather/nowcast-service')).getNowcastPrecipitationRate;

  const geometry = resolveVenueGeometry(venue);
  const engineCoordinate = seatingCentroidWgs84(geometry);
  // Story 8.6 height gate: how high the seating surface sits above local ground
  // (rooftop / raised terrace). Default 0 → ground level → byte-identical math.
  // Threaded into BOTH the single-shot and the timeline shadow computations so
  // the list, detail, and sun-window paths all honour the elevation. [AC#1, AC#3]
  const seatingElevationM = venue.seatingElevationM ?? 0;
  // Story 8.7 terrain gate: the venue's own RH2000 ground elevation. Undefined for
  // every fixture / street-level venue → the engine uses the Story 8.6 relative gate
  // (byte-identical). When set (a hilltop venue), the gate measures casters against
  // the venue's ground via the absolute ground delta. [AC#1, AC#3]
  const venueGroundZ = venue.groundElevationM;

  // STORY 9.3 (AC1): fetch the shadow casters ONCE per venue per request and share
  // them with BOTH the single-shot shadow AND the full-day timeline (previously two
  // independent get_buildings_near_point RPCs fired per venue). The fetch is wrapped
  // in the buildings cache (rounded centroid @4dp + radius, 24h TTL) so co-located
  // venues collapse to one RPC and a repeat request within the window is RPC-free.
  // A `null` (RPC failure) is NOT cached as success and is fed to both calculations,
  // reproducing the pre-9.3 data-unavailable behaviour exactly.
  const buildings = await fetchCachedVenueBuildings(
    geometry,
    fetchVenueBuildings,
    SHADOW_SEARCH_RADIUS_DEG,
  );

  // Current shadow state at the requested instant (uses the shared building set).
  const shadowInfo = calculateVenueShadowFromBuildings(geometry, requestedAt, buildings, {
    seatingElevationM,
    venueGroundZ,
  });
  // Per-venue weather at the venue's OWN location for the requested time (Task 3.2)
  // — not the engine's hardcoded Gothenburg-centre / current-only call.
  const weather = await fetchWeatherForVenue(getForecast, engineCoordinate, requestedAt);

  // STORY 10.4 (AC4 horizon gate): consult the near-now radar nowcast ONLY when the
  // requested instant is within [now, now + NOWCAST_HORIZON_MS]. Beyond the horizon
  // (a future-planner time) OR in the past there is no live radar for that instant,
  // so we do NOT fetch — `precipitationRate` stays `undefined` ⇒ rain contributes
  // nothing ⇒ behaviour is byte-identical to Tiers 0/1 (forecast cloud governs).
  // This is the AC4 guarantee: a future-planner request never fires the nowcast.
  const isNearNow =
    requestedAt.getTime() >= now.getTime() &&
    requestedAt.getTime() <= now.getTime() + NOWCAST_HORIZON_MS;
  const precipitationRate = isNearNow
    ? await getNowcast(engineCoordinate.lat, engineCoordinate.lng)
    : undefined;
  // STORY 10.4 (AC2/AC3): rain is a ONE-WAY additive gate trigger. `undefined`
  // (unknown / no coverage / beyond horizon) AND `0` (radar says genuinely no rain)
  // both yield `false` ⇒ rain contributes NOTHING; only a strictly-positive rate
  // fires the gate. Never `?? 0` the rate — unknown and no-rain stay distinct.
  const isRaining = precipitationRate !== undefined && precipitationRate > 0;

  // STORY 11.1: the geometric-%, geometric-headline and weather-gate are computed
  // by the SHARED {@link gatedStepValue} helper so the single-instant compute here
  // and the per-step day-series producer are BYTE-IDENTICAL at any instant (the
  // Task-1 parity guardrail — the series is this same computation sampled per step,
  // never a new formula). `effectiveCover` is derived from the SAME `weather` slice
  // that produces `skyCondition` below, keeping the cached outcome internally
  // consistent (10.1 AC4).
  const effectiveCover = effectiveCloudCover(weather);
  const { sunExposurePercent, currentSunStatus } = gatedStepValue(
    shadowInfo,
    effectiveCover,
    isRaining,
  );

  const confidenceFactors = calculateConfidenceFactors(
    1.0,
    shadowInfo,
    shadowInfo.solarPosition,
    weather,
  );
  const confidence = Math.round(clampPercent(calculateDisplayConfidence(confidenceFactors)));

  // STORY 10.4 (AC2): rain takes PRECEDENCE in the surfaced sky label. When it is
  // raining near-now, the sky line reads plain-language rain regardless of the
  // cloud value; otherwise fall back to the cloud-derived descriptor.
  // `skyConditionFromCloudCover` stays pure (it does not know about rain) — rain
  // precedence lives here at the call site, mirroring the two-signal concern split.
  const skyCondition = isRaining
    ? 'rain'
    : weather
      ? skyConditionFromCloudCover(weather.cloudCover)
      : 'unavailable';
  const predictionUncertainty = buildPredictionUncertainty(
    shadowInfo,
    weather,
    confidence,
    now,
  );

  // Same-day sun-window scan. STORY 9.3 (AC1): reuses the SAME shared building set
  // fetched above (no second RPC). The pure `*FromBuildings` timeline samples each
  // 30-min step against the shared casters; a `null` set degrades every in-sun
  // sample to data-unavailable exactly as before, and the per-sample try/catch
  // neutral-50/50 fallback is unchanged.
  const { start: scanStart, end: scanEnd } = sameDayScanRange(requestedAt);
  const timeline = calculateVenueShadowTimelineFromBuildings(
    geometry,
    scanStart,
    scanEnd,
    SUN_WINDOW_SAMPLE_INTERVAL_MIN * 60_000,
    buildings,
    { seatingElevationM, venueGroundZ },
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

  const outcome: SunEngineOutcome = {
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

  // A failed building RPC (`buildings === null`) yields a degraded data-unavailable
  // compute — do NOT cache it, so the next request retries the RPC rather than
  // serving the transient failure for the whole 15-min window. [Story 9.3 Task 3]
  return { outcome, cacheable: buildings !== null };
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

/**
 * STORY 11.1 (Task 1, parity guardrail): the ONE place the geometric %, the
 * geometric headline (below-horizon `NoSun` precedence) and the Epic-10 weather
 * gate are combined into a `{ sunExposurePercent, currentSunStatus }` for a
 * single instant. BOTH the single-instant compute (`computeRealSunEngineResult`)
 * and the per-step day-series producer (`computeVenueDaySeries`) call this, so a
 * series entry is byte-identical to the single-shot compute at the same instant —
 * the series is this same computation sampled per step, never a new formula.
 *
 * `sunExposurePercent` KEEPS its ONE geometric clear-sky meaning; the gate ONLY
 * rewrites the headline status. STORY 10.1/10.3: the gate reads the layer-weighted
 * effective cover (`undefined` ⇒ no gate). STORY 10.4: `isRaining` is OR-ed into
 * the fire condition — a geometrically-sunlit venue under active rain becomes
 * `CloudObscured` even below the cloud threshold, while NoSun/Shaded/below-horizon
 * are never gated.
 */
export function gatedStepValue(
  shadowInfo: Pick<VenueShadowInfo, 'sunlitAreaPercent' | 'solarPosition'>,
  effectiveCover: number | undefined,
  isRaining: boolean,
): { sunExposurePercent: number; currentSunStatus: VenueSunStatus } {
  const isSunVisible = shadowInfo.solarPosition.isSunVisible;
  const sunExposurePercent = Math.round(clampPercent(shadowInfo.sunlitAreaPercent));
  const geometricSunStatus: VenueSunStatus = isSunVisible
    ? classifySunStatus(sunExposurePercent)
    : 'NoSun';
  const currentSunStatus = applyCloudGate(
    geometricSunStatus,
    isSunVisible,
    effectiveCover,
    isRaining,
  );
  return { sunExposurePercent, currentSunStatus };
}

/** Map sunlit% to the public sun-status enum (`NoSun` decided by the caller). */
export function classifySunStatus(sunExposurePercent: number): VenueSunStatus {
  if (sunExposurePercent >= SUNNY_THRESHOLD_PERCENT) return 'Sunny';
  if (sunExposurePercent >= SUNLIT_THRESHOLD_PERCENT) return 'Partial';
  return 'Shaded';
}

/**
 * STORY 10.1 (AC1) + STORY 10.4 (AC2): the weather gate. Given the geometry-derived
 * `currentSunStatus`, whether the sun is geometrically up, the effective cloud
 * cover, and whether it is raining near-now, return the (possibly gated) headline
 * status.
 *
 * The gate fires ONLY when the venue is geometrically sunlit — i.e. the sun is up
 * (`isSunVisible`) AND the un-gated status is `Sunny` or `Partial` — AND EITHER
 * cloud cover is KNOWN and at/above {@link CLOUD_GATE_THRESHOLD_PERCENT} OR it is
 * raining (`isRaining`). In that case the headline becomes `CloudObscured`.
 * Otherwise the status passes through unchanged, which preserves:
 *  - below-horizon precedence: `NoSun` is never gated (it wins — over rain too);
 *  - geometrically-shaded venues: `Shaded` stays `Shaded` (rain never gates it);
 *  - unknown/absent cloud (AC2): `undefined` cover never gates (unknown ≠ overcast);
 *  - `CloudObscured` input (idempotent): already gated stays gated.
 *
 * STORY 10.4: rain is a ONE-WAY, ADDITIVE OR-term. It can ONLY turn a
 * geometrically-sunlit `Sunny`/`Partial` into `CloudObscured` — it can NEVER
 * un-gate a cloud-gated venue, lift a `Shaded`/`NoSun`, or up-rank a status. A
 * `false` `isRaining` (rate `undefined` or `0`) leaves the 10.3 cloud-only result
 * byte-identical. The threshold, the effective-cover input, and the switch are
 * unchanged — 10.4 only ADDs the rain OR-term to the fire condition.
 *
 * The `never`-exhaustive switch makes a future `VenueSunStatus` addition a COMPILE
 * error here, so a new status can never silently slip through the gate untriaged.
 * This is a PURE mapper (no I/O) so it is unit-tested directly.
 */
export function applyCloudGate(
  status: VenueSunStatus,
  isSunVisible: boolean,
  cloudCover: number | undefined,
  // STORY 10.4: defaults to `false` so a 3-arg (cloud-only) call — the Story 10.1
  // pure-helper tests and any pre-10.4 caller — is byte-identical to before.
  isRaining = false,
): VenueSunStatus {
  // Unknown/absent cloud never gates (AC2), and cloud below the threshold leaves
  // the geometric status intact. Only KNOWN, at/above-threshold cover can gate —
  // OR active rain (STORY 10.4 AC2: "rain wins" over the cloud fraction).
  const cloudGates =
    cloudCover !== undefined && cloudCover >= CLOUD_GATE_THRESHOLD_PERCENT;
  if (!isSunVisible || !(cloudGates || isRaining)) return status;

  switch (status) {
    case 'Sunny':
    case 'Partial':
      // Geometrically sunlit but the sky is (near-)total overcast → gate it.
      return 'CloudObscured';
    case 'Shaded':
    case 'NoSun':
    case 'CloudObscured':
      // Not geometrically sunlit (or already gated) → the gate does not apply.
      return status;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/**
 * Map Met.no `cloud_area_fraction` (0..100) to the DTO `skyCondition`.
 * STORY 10.1 (AC2): an UNKNOWN cover (`undefined` — the field was absent from the
 * timeseries entry) maps to `'unavailable'`, NEVER `'clear'`, mirroring the
 * existing `weather ? … : 'unavailable'` pattern for a missing weather slice.
 * Absent cloud data must never fabricate a clear sky.
 */
export function skyConditionFromCloudCover(cloudCover: number | undefined): string {
  if (cloudCover === undefined) return 'unavailable';
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
