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
describe.skip('Story 9.3 AC1 — single shared building fetch (RED until dedupe lands)', () => {
  // P0 — the load-bearing call-count assertion.
  it.skip('fetches get_buildings_near_point ONCE per venue, not twice', async () => {
    await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);

    const buildingCalls = mocks.rpc.mock.calls.filter(
      ([fn]) => fn === 'get_buildings_near_point',
    );
    // TODAY: 2 (calculateVenueShadowForGeometry + calculateVenueShadowTimelineForGeometry).
    // AFTER 9.3: exactly 1 shared fetch reused by both shadow + timeline.
    expect(buildingCalls).toHaveLength(1);
  });

  // P0 — byte-identical guard. A DIFF IS A FAIL, never a rebaseline.
  it.skip('produces a SunEngineOutcome deep-equal to the pre-dedupe baseline', async () => {
    // Snapshot the full outcome (venue sun fields + freshness + peakTime) for
    // the fixed inputs. The shared-fetch refactor is a pure plumbing change
    // (same buildings, same computeShadowInfo) so equality MUST hold.
    const outcome = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);

    // Inline-snapshot the whole outcome. The dev captures the pre-refactor
    // value into this assertion (run once on baseline `main`, paste, then
    // dedupe and confirm it still matches). toMatchInlineSnapshot keeps the
    // expected value in-file so any drift is a visible diff/FAIL.
    expect(outcome).toMatchInlineSnapshot(/* PRE-DEDUPE BASELINE — fill from baseline run */);
  });

  // P1 — both null behaviours preserved from ONE fetch.
  it.skip('a null buildings fetch drives BOTH shadow + timeline to data-unavailable', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } });

    const outcome = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);

    // Single-shot AND every timeline sample must be the unavailable result,
    // identical to today — just sourced from one failed fetch instead of two.
    // (Assert against the existing data-unavailable shape — confidence floored,
    //  geometry-only freshness — matching createShadowDataUnavailableResult.)
    expect(outcome.freshness.sunDataSource).toBe('geometry-only');
    // Still ONE fetch attempted even on failure (no retry-doubling).
    const buildingCalls = mocks.rpc.mock.calls.filter(
      ([fn]) => fn === 'get_buildings_near_point',
    );
    expect(buildingCalls).toHaveLength(1);
  });
});

// ===========================================================================
// AC2 — Buildings cache keyed on rounded centroid + radius (long revalidate)
// ===========================================================================
describe.skip('Story 9.3 AC2 — buildings cache on rounded centroid+radius (RED)', () => {
  // P0 — repeat request inside the cache window does NOT re-hit the RPC.
  it.skip('does NOT re-invoke the RPC for a 2nd request with the same centroid+radius', async () => {
    await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    const afterFirst = mocks.rpc.mock.calls.filter(([fn]) => fn === 'get_buildings_near_point').length;

    // Same venue, same time bucket -> served from the buildings cache.
    await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    const afterSecond = mocks.rpc.mock.calls.filter(([fn]) => fn === 'get_buildings_near_point').length;

    expect(afterSecond).toBe(afterFirst); // 0 additional building RPCs
  });

  // P1 — co-located venues (same rounded@4dp centroid + radius) share one entry.
  it.skip('collapses co-located venues to a single building RPC (shared cache key)', async () => {
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
  it.skip('never caches a null buildings result as a success', async () => {
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
describe.skip('Story 9.3 AC2 — per-bucket sun-compute cache (RED)', () => {
  // P0 — same bucket = cache hit (no recompute).
  it.skip('serves a 2nd request in the SAME 15-min bucket from cache (no RPC)', async () => {
    const t1 = new Date('2026-06-21T10:30:00.000Z'); // bucket 12:30
    const t2 = new Date('2026-06-21T10:37:00.000Z'); // same 15-min bucket (12:30)

    await applyRealSunEngine(makeStoredVenue(), t1, t1);
    const afterFirst = mocks.rpc.mock.calls.length;

    await applyRealSunEngine(makeStoredVenue(), t2, t2);
    const afterSecond = mocks.rpc.mock.calls.length;

    expect(afterSecond).toBe(afterFirst); // same bucket -> fully cached
  });

  // P0 — new bucket = recompute.
  it.skip('recomputes when the request crosses into a NEW 15-min bucket', async () => {
    const t1 = new Date('2026-06-21T10:30:00.000Z'); // bucket 12:30
    const t2 = new Date('2026-06-21T10:46:00.000Z'); // bucket 12:45 — different

    await applyRealSunEngine(makeStoredVenue(), t1, t1);
    const afterFirst = mocks.rpc.mock.calls.length;

    await applyRealSunEngine(makeStoredVenue(), t2, t2);
    const afterSecond = mocks.rpc.mock.calls.length;

    expect(afterSecond).toBeGreaterThan(afterFirst); // new bucket -> recompute
  });

  // P1 — cached output equals uncached output (cache is transparent).
  it.skip('returns a cached outcome byte-equal to the uncached compute', async () => {
    const uncached = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    const cached = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    expect(cached).toEqual(uncached);
  });

  // P2 — staleness: a future-planner bucket still carries its honest valid-time.
  it.skip('preserves honest weatherUpdatedAt for a cached future-planner bucket', async () => {
    // Caching the compute must NOT change the freshness signal — the cached
    // outcome carries the same weatherUpdatedAt the weather slice gave it.
    const outcome = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    expect(outcome.freshness.weatherUpdatedAt).toBe(weatherSlice().createdAt.toISOString());
  });
});
