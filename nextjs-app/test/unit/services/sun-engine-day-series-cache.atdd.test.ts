/**
 * ATDD RED-PHASE acceptance scaffolds — Story 11.1 (AC2, Task 3 + Task 6)
 * "Client-Side Day-Series — server-side cache per (venue, date, weather-bucket)"
 *
 * =========================================================================
 * WHAT THIS SPEC IS
 * =========================================================================
 * The day-series is a WHOLE-DAY artifact, so it is cached on the DAY + a
 * weather-refresh bucket — NOT the per-instant 15-min `requestedAt` bucket the
 * sun-compute cache uses — so ONE cached series serves every step of that day
 * (Task 3, R-012). Acceptance signals (all deterministic, fake-timer driven — no
 * latency asserts):
 *
 *   1. SAME (venue, date, weather-bucket) → the series is served from cache; the
 *      producer / building RPC is NOT re-invoked.
 *   2. A NEW weather-refresh bucket → the whole series RECOMPUTES (a key of only
 *      (venue, date) would serve yesterday's weather gating — the R-012 hazard).
 *   3. A DEGRADED (null-buildings) series is NOT cached (mirrors the existing
 *      `cacheable: buildings !== null` rule) — a failed-RPC series must not be
 *      pinned for the TTL window.
 *   4. The series + its weather gating are cached TOGETHER (a cache hit never
 *      re-gates against different weather — the Epic-10 gated-outcome-with-weather
 *      rule).
 *
 * =========================================================================
 * MOCK BOUNDARY (MEMORY: "Vitest dynamic-import mock bypass")
 * =========================================================================
 * Deepest adapter boundaries only — `@/lib/supabase/server` (count the building
 * RPC) + `@/lib/weather/met-no-service` (deterministic forecast) — identical to
 * `sun-engine-caching.atdd.test.ts`. The cache helpers read the default
 * `Date.now()`, so advancing the fake clock drives real TTL/bucket rollover
 * deterministically.
 *
 * =========================================================================
 * RED PHASE
 * =========================================================================
 * Every block is `describe.skip`. The day-series producer + its cache reset do
 * not exist yet; the placeholder `computeVenueDaySeries` throws until Task 1/3
 * land. `clearSunEngineCachesForTests` is EXTENDED by Task 3 to also reset the new
 * series cache (Dev Notes) — this test relies on that extension for a cold start.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSunEngineCachesForTests } from '@/lib/services/sun-engine-cache';
import { computeVenueDaySeries } from '@/lib/services/sun-engine';
import type { StoredVenue } from '@/lib/services/venue-store';
import type { WeatherSlice } from '@/lib/solar/types';

// GREEN PHASE (Story 11.1 Task 1/3): the real cached per-step producer.

// ---- Adapter-boundary mocks (identical contract to sun-engine-caching.atdd) --
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  getForecast: vi.fn(),
  getCurrentWeather: vi.fn(),
  getNowcastPrecipitationRate: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  supabaseServiceRole: { from: mocks.from, rpc: mocks.rpc },
  getSupabaseServiceRole: () => ({ from: mocks.from, rpc: mocks.rpc }),
}));

vi.mock('@/lib/weather/met-no-service', () => ({
  getForecast: mocks.getForecast,
  getCurrentWeather: mocks.getCurrentWeather,
}));

vi.mock('@/lib/weather/nowcast-service', () => ({
  getNowcastPrecipitationRate: mocks.getNowcastPrecipitationRate,
}));

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
    weatherGateState: 'not_gated',
    skyCondition: 'clear',
    isPartner: true,
    confidence: 92,
    distanceMeters: 0,
    sunExposurePercent: 95,
    sunWindow: { start: '13:00', end: '18:30' },
    ...overrides,
  } as StoredVenue;
}

function buildingRpcCount(): number {
  return mocks.rpc.mock.calls.filter(([fn]) => fn === 'get_buildings_near_point').length;
}

// The series producer fetches the forecast ONCE per (uncached) compute, so the
// forecast-call count is the reliable "the producer ran again" observable even
// when the 24h buildings cache masks the caster RPC on a recompute.
function forecastCount(): number {
  return mocks.getForecast.mock.calls.length;
}

beforeEach(() => {
  clearSunEngineCachesForTests();
  mocks.from.mockReset();
  mocks.rpc.mockReset();
  mocks.getForecast.mockReset();
  mocks.getCurrentWeather.mockReset();
  mocks.getNowcastPrecipitationRate.mockReset();
  mocks.rpc.mockResolvedValue({ data: [], error: null }); // no shadow casters
  mocks.getForecast.mockResolvedValue([weatherSlice()]);
  mocks.getNowcastPrecipitationRate.mockResolvedValue(undefined);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.useFakeTimers();
  vi.setSystemTime(SUMMER_MIDDAY);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ===========================================================================
// AC2 / Task 3 — same (venue, date, weather-bucket) is served from cache
// ===========================================================================
describe('Story 11.1 AC2 — day-series cached per (venue, date, weather-bucket)', () => {
  // P1 — a 2nd series request for the same day (a different requested INSTANT, same
  // day + weather bucket) is served from the series cache: no re-compute, no extra
  // building RPC. This is the whole point of keying on the DAY, not the instant —
  // one series serves every step, so a same-day time change is cache-free.
  it('serves a 2nd same-day request from cache (no additional building RPC)', async () => {
    const morning = new Date('2026-06-21T05:00:00.000Z'); // Stockholm 07:00, same day
    const evening = new Date('2026-06-21T17:00:00.000Z'); // Stockholm 19:00, same day

    await computeVenueDaySeries(makeStoredVenue(), morning, SUMMER_MIDDAY);
    const afterFirst = buildingRpcCount();

    await computeVenueDaySeries(makeStoredVenue(), evening, SUMMER_MIDDAY);
    const afterSecond = buildingRpcCount();

    // Different instant, SAME day + weather bucket → the cached whole-day series
    // is reused; the producer is not re-run and no extra building RPC fires.
    expect(afterSecond).toBe(afterFirst);
  });

  // P1 — the cached series byte-equals the uncached compute (cache is transparent).
  it('returns a cached series byte-equal to the uncached compute', async () => {
    const uncached = await computeVenueDaySeries(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    const cached = await computeVenueDaySeries(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    expect(cached).toEqual(uncached);
  });
});

// ===========================================================================
// AC2 / Task 3 — a NEW weather-refresh bucket recomputes the whole series
// ===========================================================================
describe('Story 11.1 AC2 — a new weather-refresh bucket recomputes the series', () => {
  // P1 — advancing past the weather-refresh bucket TTL must recompute the whole
  // series (a key of only (venue, date) would serve yesterday's weather gating —
  // the R-012 stale-bucket hazard). The 24h buildings cache masks the caster RPC
  // on a recompute, so we OBSERVE the recompute via the forecast-call count (the
  // producer fetches the forecast once per uncached compute).
  it('recomputes the series when the weather-refresh bucket rolls over', async () => {
    await computeVenueDaySeries(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    const afterFirst = forecastCount();
    expect(afterFirst).toBeGreaterThanOrEqual(1);

    // Advance the clock past the series' weather-refresh TTL. The exact TTL mirrors
    // SUN_COMPUTE_CACHE_TTL_MS (15 min = the sun-freshness bucket) per the Dev
    // Notes; use a generous advance so any TTL ≥ 15 min still rolls over.
    vi.advanceTimersByTime(16 * 60 * 1000);
    const later = new Date(SUMMER_MIDDAY.getTime() + 16 * 60 * 1000);

    await computeVenueDaySeries(makeStoredVenue(), later, later);
    const afterSecond = forecastCount();

    // A new weather bucket → the whole series recomputed → the producer ran again.
    expect(afterSecond).toBeGreaterThan(afterFirst);
  });
});

// ===========================================================================
// AC2 / Task 3 — a degraded (null-buildings) series is NOT cached
// ===========================================================================
describe('Story 11.1 AC2 — a degraded series is NOT pinned in the cache', () => {
  // P1 — a series computed from a FAILED building RPC (degraded) must not be
  // cached: the next same-day request must recompute and recover, never serve the
  // pinned degraded series for the whole TTL window (the `cacheable: buildings !==
  // null` rule, applied to the series cache).
  it('recomputes a same-day request after a degraded (building-RPC-failed) series', async () => {
    // First: building RPC fails → degraded series, NOT cacheable.
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'rpc down' } });
    await computeVenueDaySeries(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    const afterDegraded = buildingRpcCount();

    // Same venue, SAME day + weather bucket. If the degraded series had been
    // pinned, this would short-circuit with no extra RPC. Because it was NOT
    // cached, the producer recomputes → another building RPC fires (now succeeding).
    mocks.rpc.mockResolvedValueOnce({ data: [], error: null });
    await computeVenueDaySeries(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    const afterRecovered = buildingRpcCount();

    expect(afterRecovered).toBeGreaterThan(afterDegraded);
  });
});
