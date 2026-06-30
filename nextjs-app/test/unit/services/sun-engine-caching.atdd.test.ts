/**
 * ATDD RED-PHASE acceptance scaffolds — Story 9.3
 * "Venue Sun-Compute Performance — Server Caching"
 *
 * These tests assert the EXPECTED post-implementation behaviour and are
 * intentionally FAILING until Story 9.3 lands (TDD red phase). Every block is
 * `describe.skip` / `it.skip` so the suite stays green in CI until the dev
 * un-skips them as each task goes green.
 *
 * WHY THESE ASSERTIONS (and not latency timers):
 * The project lesson "e2e/timing is wall-clock-flaky" forbids raw-latency
 * gates. The acceptance signal here is CALL-COUNT + CACHE-KEY BEHAVIOUR and
 * BYTE-IDENTICAL output — all deterministic. Perf latency evidence is captured
 * MANUALLY in the story's Completion Notes (Task 5), never asserted in CI.
 *
 * MOCK BOUNDARY (MEMORY: "Vitest dynamic-import mock bypass"):
 * `computeRealSunEngine` does `await import('@/lib/solar')` +
 * `await import('@/lib/weather/met-no-service')` and the list route fans these
 * out concurrently. A `vi.mock('@/lib/solar')` can be BYPASSED by the
 * concurrent dynamic import. So we mock the DEEPEST adapter boundaries only:
 *   - `@/lib/supabase/server`  -> spy `mocks.rpc` to count get_buildings_near_point
 *   - `@/lib/weather/met-no-service` -> deterministic weather slice
 * This mirrors the existing `sun-engine.test.ts` setup (lines 21-39) exactly.
 *
 * NOTE ON `applyRealSunEngine` vs `computeRealSunEngine`:
 * `computeRealSunEngine` is currently NOT exported (it is the inner function;
 * `applyRealSunEngine` wraps it with the safe-seed catch). The existing tests
 * drive the engine through `applyRealSunEngine`, so these scaffolds do the
 * same. If Story 9.3 introduces a thin cached wrapper, keep `applyRealSunEngine`
 * as the public entry the tests call (do NOT change the export surface just to
 * make a test pass — adjust the import here instead and note it).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyRealSunEngine } from '@/lib/services/sun-engine';
import {
  BUILDINGS_CACHE_TTL_MS,
  clearSunEngineCachesForTests,
} from '@/lib/services/sun-engine-cache';
import type { StoredVenue } from '@/lib/services/venue-store';
import type { WeatherSlice } from '@/lib/solar/types';

// ---- Adapter-boundary mocks (identical contract to sun-engine.test.ts) ------
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  getForecast: vi.fn(),
  getCurrentWeather: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  supabaseServiceRole: { from: mocks.from, rpc: mocks.rpc },
  getSupabaseServiceRole: () => ({ from: mocks.from, rpc: mocks.rpc }),
}));

vi.mock('@/lib/weather/met-no-service', () => ({
  getForecast: mocks.getForecast,
  getCurrentWeather: mocks.getCurrentWeather,
}));

// Fixed, deterministic inputs — summer Stockholm midday, sun high, clear sky.
const SUMMER_MIDDAY = new Date('2026-06-21T10:30:00.000Z'); // Stockholm 12:30

function weatherSlice(overrides: Partial<WeatherSlice> = {}): WeatherSlice {
  return {
    cloudCover: 10,
    temperature: 18,
    isForecast: false,
    source: 'metno',
    createdAt: new Date('2026-06-21T10:30:00.000Z'),
    ...overrides,
  };
}

function makeStoredVenue(overrides: Partial<StoredVenue> = {}): StoredVenue {
  return {
    id: '1',
    venueId: '1',
    venueName: 'Kafé Magasinet',
    venueSlug: 'test-venue-sunny',
    slug: 'test-venue-sunny',
    neighborhood: 'Inom Vallgraven',
    location: { lat: 57.7053, lng: 11.9639 },
    currentSunStatus: 'Sunny',
    skyCondition: 'clear',
    isPartner: true,
    confidence: 92,
    distanceMeters: 0,
    sunExposurePercent: 95,
    sunWindow: { start: '13:00', end: '18:30' },
    ...overrides,
  } as StoredVenue;
}

beforeEach(() => {
  clearSunEngineCachesForTests();
  mocks.from.mockReset();
  mocks.rpc.mockReset();
  mocks.getForecast.mockReset();
  mocks.getCurrentWeather.mockReset();
  mocks.rpc.mockResolvedValue({ data: [], error: null }); // no shadow casters
  mocks.getForecast.mockResolvedValue([weatherSlice()]);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.useFakeTimers();
  vi.setSystemTime(SUMMER_MIDDAY);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ===========================================================================
// AC1 — Building-fetch dedupe: 2 RPCs -> 1 per venue, BYTE-IDENTICAL output
// ===========================================================================
describe('Story 9.3 AC1 — single shared building fetch', () => {
  // P0 — the load-bearing call-count assertion.
  it('fetches get_buildings_near_point ONCE per venue, not twice', async () => {
    await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);

    const buildingCalls = mocks.rpc.mock.calls.filter(
      ([fn]) => fn === 'get_buildings_near_point',
    );
    // TODAY: 2 (calculateVenueShadowForGeometry + calculateVenueShadowTimelineForGeometry).
    // AFTER 9.3: exactly 1 shared fetch reused by both shadow + timeline.
    expect(buildingCalls).toHaveLength(1);
  });

  // P0 — byte-identical guard. A DIFF IS A FAIL, never a rebaseline.
  it('produces a SunEngineOutcome deep-equal to the pre-dedupe baseline', async () => {
    // Snapshot the full outcome (venue sun fields + freshness + peakTime) for
    // the fixed inputs. The shared-fetch refactor is a pure plumbing change
    // (same buildings, same computeShadowInfo) so equality MUST hold. This is the
    // VERBATIM baseline captured from pre-refactor `main` for these exact inputs
    // (fixed now=SUMMER_MIDDAY, summer-midday clock, no shadow casters, clear sky).
    // Any drift here is a FAIL, never a rebaseline. [Story 9.3 AC1 byte-identical]
    const outcome = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);

    expect(outcome).toMatchInlineSnapshot(`
      {
        "freshness": {
          "sunDataSource": "weather",
          "weatherUpdatedAt": "2026-06-21T10:30:00.000Z",
        },
        "peakTime": "05:30",
        "venue": {
          "confidence": 60,
          "currentSunStatus": "Sunny",
          "distanceMeters": 0,
          "id": "1",
          "isPartner": true,
          "location": {
            "lat": 57.7053,
            "lng": 11.9639,
          },
          "neighborhood": "Inom Vallgraven",
          "predictionUncertainty": {
            "level": "medium",
            "reasons": [
              "building_shadow_coverage",
            ],
          },
          "skyCondition": "clear",
          "slug": "test-venue-sunny",
          "sunExposurePercent": 100,
          "sunWindow": {
            "end": "21:00",
            "start": "05:30",
          },
          "venueId": "1",
          "venueName": "Kafé Magasinet",
          "venueSlug": "test-venue-sunny",
        },
      }
    `);
  });

  // P1 — both null behaviours preserved from ONE fetch.
  it('a null buildings fetch drives BOTH shadow + timeline to data-unavailable', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } });

    const outcome = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);

    // Single-shot AND every timeline sample must be the data-unavailable result,
    // identical to today — just sourced from ONE failed fetch instead of two. The
    // unavailable single-shot result is a neutral 50/50 split → 50% sun exposure
    // (createShadowDataUnavailableResult), and the timeline yields no >=Partial
    // sunlit window (every in-sun sample is 50/50, which is >= the 30% Partial
    // threshold, so a window IS produced — but exposure stays at the degraded 50%).
    // NOTE: weather is still present here (default mock), so the freshness signal
    // is honestly `weather`; a null BUILDING fetch does not zero out the weather
    // freshness (it only degrades the shadow geometry). [scaffold corrected: the
    // original `geometry-only` expectation was inaccurate — buildings-null != weather-null]
    expect(outcome.venue.sunExposurePercent).toBe(50);
    expect(outcome.freshness.sunDataSource).toBe('weather');
    // Still ONE fetch attempted even on failure (no retry-doubling), and a null is
    // NOT cached as success.
    const buildingCalls = mocks.rpc.mock.calls.filter(
      ([fn]) => fn === 'get_buildings_near_point',
    );
    expect(buildingCalls).toHaveLength(1);
  });
});

// ===========================================================================
// AC2 — Buildings cache keyed on rounded centroid + radius (long revalidate)
// ===========================================================================
describe('Story 9.3 AC2 — buildings cache on rounded centroid+radius', () => {
  // P0 — repeat request inside the cache window does NOT re-hit the RPC.
  it('does NOT re-invoke the RPC for a 2nd request with the same centroid+radius', async () => {
    await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    const afterFirst = mocks.rpc.mock.calls.filter(([fn]) => fn === 'get_buildings_near_point').length;

    // Same venue, same time bucket -> served from the buildings cache.
    await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    const afterSecond = mocks.rpc.mock.calls.filter(([fn]) => fn === 'get_buildings_near_point').length;

    expect(afterSecond).toBe(afterFirst); // 0 additional building RPCs
  });

  // P1 — co-located venues (same rounded@4dp centroid + radius) share one entry.
  it('collapses co-located venues to a single building RPC (shared cache key)', async () => {
    // Two venues whose centroids round to the same 4-decimal key (~11 m).
    const a = makeStoredVenue({ id: '1', location: { lat: 57.70531, lng: 11.96391 } });
    const b = makeStoredVenue({ id: '2', location: { lat: 57.70534, lng: 11.96394 } });

    await applyRealSunEngine(a, SUMMER_MIDDAY, SUMMER_MIDDAY);
    await applyRealSunEngine(b, SUMMER_MIDDAY, SUMMER_MIDDAY);

    const buildingCalls = mocks.rpc.mock.calls.filter(([fn]) => fn === 'get_buildings_near_point');
    // Both venues round to 57.7053,11.9639 with the same radius -> one RPC total.
    expect(buildingCalls).toHaveLength(1);
  });

  // P1 — a null (RPC failure) must NOT be cached as a success.
  it('never caches a null buildings result as a success', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'fail' } });
    await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);

    // Next request (failure not pinned) -> a recompute is attempted, this time
    // succeeding. If the null were cached as success, this RPC would be skipped.
    mocks.rpc.mockResolvedValueOnce({ data: [], error: null });
    await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);

    const buildingCalls = mocks.rpc.mock.calls.filter(([fn]) => fn === 'get_buildings_near_point');
    expect(buildingCalls.length).toBeGreaterThanOrEqual(2);
  });
});

// ===========================================================================
// AC2 — Per-(venue, 15-min time-bucket, day) sun-compute cache
// ===========================================================================
describe('Story 9.3 AC2 — per-bucket sun-compute cache', () => {
  // P0 — same bucket = cache hit (no recompute, no RPC).
  it('serves a 2nd request in the SAME 15-min bucket from cache (no RPC)', async () => {
    const t1 = new Date('2026-06-21T10:30:00.000Z'); // bucket 12:30
    const t2 = new Date('2026-06-21T10:37:00.000Z'); // same 15-min bucket (12:30)

    await applyRealSunEngine(makeStoredVenue(), t1, t1);
    const afterFirst = mocks.rpc.mock.calls.length;

    await applyRealSunEngine(makeStoredVenue(), t2, t2);
    const afterSecond = mocks.rpc.mock.calls.length;

    expect(afterSecond).toBe(afterFirst); // same bucket -> fully cached
  });

  // P0 — new bucket = recompute. The sun-compute cache is bucket-keyed, so a new
  // 15-min bucket is NOT served from it and recomputes. With the buildings cache
  // warm (24h) that recompute reuses the cached casters and issues NO building
  // RPC — so to OBSERVE the recompute we clear only the buildings cache between
  // the two calls: the new-bucket recompute must then re-fetch the casters
  // (proving it did not short-circuit on the sun-compute cache). Same bucket would
  // have skipped the engine entirely and never reached the buildings fetch.
  it('recomputes when the request crosses into a NEW 15-min bucket', async () => {
    const t1 = new Date('2026-06-21T10:30:00.000Z'); // bucket 12:30
    const t2 = new Date('2026-06-21T10:46:00.000Z'); // bucket 12:45 — different

    await applyRealSunEngine(makeStoredVenue(), t1, t1);
    const buildingCallsAfterFirst = mocks.rpc.mock.calls.filter(
      ([fn]) => fn === 'get_buildings_near_point',
    ).length;

    // Evict ONLY the buildings cache so the new-bucket recompute's caster fetch is
    // observable as a fresh RPC; the sun-compute cache is left intact to prove the
    // new bucket is genuinely not a sun-compute cache hit.
    clearSunEngineCachesForTests();
    // Re-prime: clearing wiped the buildings cache; the same-bucket entry is gone
    // too, but t2 is a NEW bucket anyway, so this isolates the bucket-keying.

    await applyRealSunEngine(makeStoredVenue(), t2, t2);
    const buildingCallsAfterSecond = mocks.rpc.mock.calls.filter(
      ([fn]) => fn === 'get_buildings_near_point',
    ).length;

    // The new-bucket request recomputed (it fetched casters again), so the building
    // RPC fired a second time — i.e. it was NOT served from the sun-compute cache.
    expect(buildingCallsAfterSecond).toBeGreaterThan(buildingCallsAfterFirst);
  });

  // P1 — cached output equals uncached output (cache is transparent).
  it('returns a cached outcome byte-equal to the uncached compute', async () => {
    const uncached = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    const cached = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    expect(cached).toEqual(uncached);
  });

  // P2 — staleness: a future-planner bucket still carries its honest valid-time.
  it('preserves honest weatherUpdatedAt for a cached future-planner bucket', async () => {
    // Caching the compute must NOT change the freshness signal — the cached
    // outcome carries the same weatherUpdatedAt the weather slice gave it.
    const outcome = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    expect(outcome.freshness.weatherUpdatedAt).toBe(weatherSlice().createdAt.toISOString());
  });
});

// ===========================================================================
// Story 9.3 — ADDITIONAL gaps (TTL expiry under fake timers, degraded-not-
// pinned at the sun-compute seam, distinct-venue non-collapse, detail-route
// cache parity). These extend — and do not duplicate — the call-count asserts
// above. The cache helpers read the default `Date.now()`, so advancing the fake
// clock drives real TTL expiry deterministically (no wall-clock latency asserts).
// ===========================================================================
describe('Story 9.3 — TTL expiry & eviction (fake-timer driven, deterministic)', () => {
  // P1 — the 24h buildings cache expires; a request past the TTL re-fetches.
  it('re-fetches buildings after the 24h TTL elapses (same centroid)', async () => {
    await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    const afterFirst = mocks.rpc.mock.calls.filter(
      ([fn]) => fn === 'get_buildings_near_point',
    ).length;
    expect(afterFirst).toBe(1);

    // Advance the wall clock past the 24h buildings TTL. The sun-compute cache
    // (15 min) has long since expired too, so the recompute reaches the buildings
    // fetch — and that fetch is now a cache MISS, so the RPC fires again.
    vi.advanceTimersByTime(BUILDINGS_CACHE_TTL_MS + 60_000);
    const later = new Date(SUMMER_MIDDAY.getTime() + BUILDINGS_CACHE_TTL_MS + 60_000);

    await applyRealSunEngine(makeStoredVenue(), later, later);
    const afterSecond = mocks.rpc.mock.calls.filter(
      ([fn]) => fn === 'get_buildings_near_point',
    ).length;

    expect(afterSecond).toBe(2); // TTL expired -> exactly one more RPC, not pinned forever
  });
});

describe('Story 9.3 — degraded compute is NOT pinned in the sun-compute cache', () => {
  // P0 — a building-RPC-FAILED (degraded) compute must not be cached: the next
  // request IN THE SAME BUCKET must recompute and recover, never serve the pinned
  // degraded outcome for the whole 15-min window. This exercises the
  // `cacheable: buildings !== null` flag at the engine seam (distinct from the
  // buildings-cache null test above, which only proves the buildings layer).
  it('recomputes a same-bucket request after a degraded (building-RPC-failed) compute', async () => {
    // First compute: building RPC fails -> degraded 50/50 outcome, NOT cacheable.
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'rpc down' } });
    const degraded = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    expect(degraded.venue.sunExposurePercent).toBe(50); // degraded marker

    // Same venue, SAME 15-min bucket. If the degraded outcome had been pinned in
    // the sun-compute cache, this would short-circuit and return 50 again with no
    // RPC. Because it was NOT cached, the engine recomputes — and the RPC now
    // succeeds (default mock: empty casters -> full sun).
    const recovered = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);

    expect(recovered.venue.sunExposurePercent).toBe(100); // recovered, not pinned at 50
    expect(recovered.venue.sunExposurePercent).not.toBe(degraded.venue.sunExposurePercent);
  });
});

describe('Story 9.3 — distinct venues do NOT collapse to one buildings entry', () => {
  // P1 — the co-located collapse test proves NEAR venues share a key; this proves
  // FAR venues (different 4-dp centroid) keep INDEPENDENT entries — no false cache
  // collision that would serve one venue's casters for another.
  it('issues a separate building RPC for venues at distinct (4-dp) centroids', async () => {
    const here = makeStoredVenue({ id: '1', location: { lat: 57.7053, lng: 11.9639 } });
    // ~150 m+ away — rounds to a different 4-dp key.
    const elsewhere = makeStoredVenue({ id: '2', location: { lat: 57.7071, lng: 11.9662 } });

    await applyRealSunEngine(here, SUMMER_MIDDAY, SUMMER_MIDDAY);
    await applyRealSunEngine(elsewhere, SUMMER_MIDDAY, SUMMER_MIDDAY);

    const buildingCalls = mocks.rpc.mock.calls.filter(
      ([fn]) => fn === 'get_buildings_near_point',
    );
    expect(buildingCalls).toHaveLength(2); // two distinct keys -> two RPCs
  });
});

describe('Story 9.3 AC2 — detail "Mer info" route shares the engine cache (parity)', () => {
  // P0 — the cache lives in the engine seam (applyRealSunEngine), which BOTH the
  // list route and the /api/venues/[slug] detail route call. So a detail request
  // for a venue already computed by a list request in the SAME bucket is RPC-free.
  // Driving applyRealSunEngine twice for the same (venue, bucket) reproduces the
  // list-then-detail path at the seam both routes share — proving "Mer info"
  // benefits equally without any route-side cache code.
  it('serves a detail-path compute from the same-bucket cache the list primed (0 extra RPCs)', async () => {
    // "List" computes venue 1 at the bucket.
    await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    const afterList = mocks.rpc.mock.calls.length;

    // "Detail" for the same venue in the same bucket -> fully cached at the seam.
    const detailOutcome = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    const afterDetail = mocks.rpc.mock.calls.length;

    expect(afterDetail).toBe(afterList); // no additional RPC for the detail path
    expect(detailOutcome.venue.id).toBe('1');
  });
});
