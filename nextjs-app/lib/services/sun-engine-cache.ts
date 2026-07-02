/**
 * STORY 9.3 — server-only TTL caches for the real sun engine.
 *
 * Two layers, both process-scoped and SERVER-ONLY (this module sits behind the
 * server-only `sun-engine.ts`, which the API routes call; client components
 * must never import it):
 *
 *  1. {@link buildingsCache} — the `get_buildings_near_point` result keyed on the
 *     rounded centroid (4 decimals ≈ 11 m, matching `FORECAST_COORD_PRECISION`)
 *     + the search radius in metres. Building geometry is effectively static, so
 *     a long TTL (24h) is safe. Co-located venues that round to the same key
 *     share ONE RPC even within a single list fan-out. ONLY successful (non-null)
 *     results are cached — an RPC failure (`null`) is never pinned as a success.
 *
 *  2. {@link sunComputeCache} — the computed {@link SunEngineOutcome} keyed on
 *     `(venue.id, rounded 15-min time bucket, Stockholm day)`. A repeat request in
 *     the same bucket is a near-free cache hit; a new wall-clock bucket recomputes,
 *     so the worst-case sun staleness equals one slider bucket (15 min).
 *
 * WHY A PROCESS MAP AND NOT `unstable_cache`:
 * `unstable_cache` JSON-serializes its return value (lossy for the `Building[]`
 * `Date`/GeoJSON payload and the freshness `Date`s), requires the Next.js request
 * store, and cannot be driven deterministically under vitest fake timers. A
 * process-scoped TTL `Map` is simpler, lossless (stores the live object), survives
 * across requests on a warm lambda instance, and is the call-count-testable choice
 * the story's open-question #1 explicitly sanctions as the fallback. It is lost on
 * a cold start — acceptable at MVP scale (≤10K MAU, 7 venues): the first request
 * after a cold start re-primes it, every subsequent request within the window is
 * served from it. [Story 9.3 Task 2 / Task 3]
 */

/** Buildings cache TTL: 24h. Building geometry is effectively static. */
export const BUILDINGS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Sun-compute cache TTL: 15 min = one slider time-bucket. Bounds worst-case sun
 * staleness to one bucket; a new wall-clock bucket always recomputes anyway, so
 * the TTL is a backstop (e.g. a future-planner bucket that never advances).
 */
export const SUN_COMPUTE_CACHE_TTL_MS = 15 * 60 * 1000;

/** The slider snaps time to 15-minute steps; the sun-compute cache mirrors it. */
export const SUN_TIME_BUCKET_MINUTES = 15;

/** Rounding precision for the buildings cache centroid key (≈11 m at 4 dp). */
export const BUILDINGS_CENTROID_PRECISION = 4;

type CacheEntry<V> = {
  value: V;
  expiresAt: number;
};

/**
 * A minimal process-scoped TTL cache. Lazy expiry on read keeps it dependency-free
 * (no timers/intervals). `now` is injectable so callers can drive it deterministically
 * under fake timers / for tests.
 */
export class TtlCache<V> {
  private readonly store = new Map<string, CacheEntry<V>>();

  constructor(private readonly ttlMs: number) {}

  get(key: string, now: number = Date.now()): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V, now: number = Date.now()): void {
    this.store.set(key, { value, expiresAt: now + this.ttlMs });
  }

  has(key: string, now: number = Date.now()): boolean {
    return this.get(key, now) !== undefined;
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * Cache the result of a successful async producer, keyed by `key`. A producer that
 * resolves to `null` (e.g. an RPC failure) is NEVER cached — the next call retries
 * — so a transient failure is not pinned across the TTL window. Concurrent calls
 * for the same key share ONE in-flight promise (so a list fan-out that races two
 * co-located venues issues a single RPC), and a rejecting/null in-flight promise is
 * evicted so it cannot poison the cache. [Story 9.3 Task 2]
 */
export async function getOrFetchNonNull<V>(
  cache: TtlCache<V>,
  inFlight: Map<string, Promise<V | null>>,
  key: string,
  produce: () => Promise<V | null>,
  now: number = Date.now(),
): Promise<V | null> {
  const cached = cache.get(key, now);
  if (cached !== undefined) return cached;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    const value = await produce();
    if (value !== null) cache.set(key, value, now);
    return value;
  })();
  inFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}

/**
 * Cache the result of an async producer that always yields a value (never the
 * not-cacheable sentinel). Concurrent calls for the same key share one in-flight
 * promise; a rejection is evicted (never cached). [Story 9.3 Task 3]
 */
export async function getOrCompute<V>(
  cache: TtlCache<V>,
  inFlight: Map<string, Promise<V>>,
  key: string,
  compute: () => Promise<V>,
  now: number = Date.now(),
): Promise<V> {
  const cached = cache.get(key, now);
  if (cached !== undefined) return cached;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    const value = await compute();
    cache.set(key, value, now);
    return value;
  })();
  inFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}

/**
 * Cache the result of an async producer that decides per-call whether the value is
 * cacheable (`{ value, cacheable }`). A non-cacheable result (e.g. a degraded
 * compute from a failed dependency) is returned but NOT stored, so the next call
 * recomputes rather than serving the degraded value for the whole TTL window.
 * Concurrent calls for the same key share one in-flight promise; a rejection is
 * evicted. [Story 9.3 Task 3]
 */
export async function getOrComputeConditional<V>(
  cache: TtlCache<V>,
  inFlight: Map<string, Promise<V>>,
  key: string,
  compute: () => Promise<{ value: V; cacheable: boolean }>,
  now: number = Date.now(),
): Promise<V> {
  const cached = cache.get(key, now);
  if (cached !== undefined) return cached;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    const { value, cacheable } = await compute();
    if (cacheable) cache.set(key, value, now);
    return value;
  })();
  inFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}

/** Round a coordinate to the buildings-cache precision (≈11 m at 4 dp). */
export function roundCentroidComponent(value: number): string {
  return Number.isFinite(value)
    ? value.toFixed(BUILDINGS_CENTROID_PRECISION)
    : 'nan';
}

/**
 * Stable buildings-cache key: rounded centroid (4 dp) + radius in metres. The
 * radius is fixed (`SHADOW_SEARCH_RADIUS_DEG`) so in practice this collapses to
 * the rounded centroid, but keying on the radius too keeps the cache correct if
 * the radius ever varies.
 */
export function buildingsCacheKey(
  centroidLng: number,
  centroidLat: number,
  radiusMeters: number,
): string {
  const radius = Number.isFinite(radiusMeters) ? Math.round(radiusMeters) : 0;
  return `${roundCentroidComponent(centroidLat)},${roundCentroidComponent(centroidLng)}@${radius}`;
}

/** Snap an instant to its 15-minute bucket (floored), expressed in epoch-ms. */
export function timeBucketMs(instant: Date): number {
  const bucketMs = SUN_TIME_BUCKET_MINUTES * 60 * 1000;
  return Math.floor(instant.getTime() / bucketMs) * bucketMs;
}

/**
 * Stable sun-compute cache key: `(venue id, 15-min time bucket, Stockholm day,
 * elevation inputs)`. The day key disambiguates the same wall clock on different
 * days. The elevation inputs (`seatingElevationM` / `groundElevationM`) ARE
 * per-venue constants in production — keying on the venue id alone would already
 * be correct there — but they are folded into the key explicitly so the cache is
 * defensively correct even if two logical venues ever share an id with different
 * elevation, and so a cached flat-terrain result can never shadow a raised /
 * hilltop recompute of the "same" id. [Story 9.3 Task 3]
 */
export function sunComputeCacheKey(
  venueId: string,
  requestedAt: Date,
  stockholmDayKey: string,
  elevationKey = '',
): string {
  return `${venueId}|${timeBucketMs(requestedAt)}|${stockholmDayKey}|${elevationKey}`;
}

// --- Singleton caches + in-flight maps (process-scoped, server-only) ---------

let _buildingsCache: TtlCache<unknown> | null = null;
let _buildingsInFlight: Map<string, Promise<unknown>> | null = null;
let _sunComputeCache: TtlCache<unknown> | null = null;
let _sunComputeInFlight: Map<string, Promise<unknown>> | null = null;

export function getBuildingsCache<V>(): {
  cache: TtlCache<V>;
  inFlight: Map<string, Promise<V | null>>;
} {
  _buildingsCache ??= new TtlCache<unknown>(BUILDINGS_CACHE_TTL_MS);
  _buildingsInFlight ??= new Map<string, Promise<unknown>>();
  return {
    cache: _buildingsCache as TtlCache<V>,
    inFlight: _buildingsInFlight as Map<string, Promise<V | null>>,
  };
}

export function getSunComputeCache<V>(): {
  cache: TtlCache<V>;
  inFlight: Map<string, Promise<V>>;
} {
  _sunComputeCache ??= new TtlCache<unknown>(SUN_COMPUTE_CACHE_TTL_MS);
  _sunComputeInFlight ??= new Map<string, Promise<unknown>>();
  return {
    cache: _sunComputeCache as TtlCache<V>,
    inFlight: _sunComputeInFlight as Map<string, Promise<V>>,
  };
}

/** Test-only: reset both caches so each test starts cold. */
export function clearSunEngineCachesForTests(): void {
  _buildingsCache?.clear();
  _buildingsInFlight?.clear();
  _sunComputeCache?.clear();
  _sunComputeInFlight?.clear();
}
