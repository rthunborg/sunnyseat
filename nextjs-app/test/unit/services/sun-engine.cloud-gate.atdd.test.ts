/**
 * ATDD RED-PHASE acceptance scaffolds — Story 10.1 AC1 + AC4 (cache consistency)
 * "Cloud-gated headline status (CloudObscured)"
 *
 * Written red-first for Story 10.1 Task 1/3/5 — these assertions FAILED before
 * `applyCloudGate` + the engine wiring + the `CloudObscured` union extension
 * landed. Now that Task 3/5 are implemented they are un-skipped and green against
 * the real implementation.
 *
 * THREE LEVELS ASSERTED HERE:
 *  1. The pure exported helper `applyCloudGate(status, isSunVisible, cloudCover)`
 *     (Task 3) — overcast+sunlit ⇒ CloudObscured; below-threshold ⇒ unchanged;
 *     NoSun/Shaded untouched; unknown/null cloud ⇒ no gate.
 *  2. End-to-end `computeRealSunEngineResult` via `applyRealSunEngine` with the
 *     Met.no `getForecast` boundary mocked to overcast — the headline
 *     `currentSunStatus` becomes `CloudObscured` while `sunExposurePercent`,
 *     `sunWindow`, `peakTime` keep their geometric clear-sky meaning (AC1).
 *  3. Cache consistency (AC4 final clause): a repeat request in the SAME 15-min
 *     bucket returns the SAME gated status + skyCondition (outcome + weather
 *     slice + gate all cache together).
 *
 * MOCK BOUNDARY (MEMORY: "Vitest dynamic-import mock bypass" + "no live Met.no"):
 * Mock the DEEPEST adapters only — `@/lib/supabase/server` (rpc) and
 * `@/lib/weather/met-no-service` (getForecast) — exactly like the existing
 * sun-engine.test.ts. Weather is injected as a deterministic overcast slice.
 *
 * RELATIVE-THRESHOLD DISCIPLINE (retro-note: threshold may re-tune):
 * We drive cloudCover to 100 (well above) and 0 (well below) rather than
 * asserting the exact 80 boundary, so a future re-tune of
 * CLOUD_GATE_THRESHOLD_PERCENT does not break these. A dedicated boundary test
 * reads the constant itself.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyCloudGate,
  applyRealSunEngine,
  CLOUD_GATE_THRESHOLD_PERCENT,
} from '@/lib/services/sun-engine';
import { clearSunEngineCachesForTests } from '@/lib/services/sun-engine-cache';
import type { StoredVenue } from '@/lib/services/venue-store';
import type { WeatherSlice } from '@/lib/solar/types';

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

const SUMMER_MIDDAY = new Date('2026-06-21T10:30:00.000Z'); // Stockholm 12:30, sun high

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
    tags: [],
    sunWindow: { start: '13:00', end: '18:30' },
    ...overrides,
  };
}

function weatherSlice(overrides: Partial<WeatherSlice> = {}): WeatherSlice {
  return {
    cloudCover: 10,
    temperature: 18,
    isForecast: false,
    source: 'metno',
    createdAt: new Date('2026-06-21T10:30:00.000Z'),
    validAt: new Date('2026-06-21T10:30:00.000Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Pure helper: applyCloudGate (Task 3)
// ---------------------------------------------------------------------------
describe('[10.1 AC1] applyCloudGate pure helper', () => {
  it('gates a geometrically-sunny + sun-visible venue under overcast ⇒ CloudObscured', () => {
    expect(applyCloudGate('Sunny', true, 100)).toBe('CloudObscured');
  });

  it('gates a geometrically-partial + sun-visible venue under overcast ⇒ CloudObscured', () => {
    expect(applyCloudGate('Partial', true, 100)).toBe('CloudObscured');
  });

  it('leaves Sunny unchanged when cloud is below the threshold', () => {
    expect(applyCloudGate('Sunny', true, 0)).toBe('Sunny');
  });

  it('never gates NoSun (below-horizon precedence wins)', () => {
    expect(applyCloudGate('NoSun', false, 100)).toBe('NoSun');
    // Even if isSunVisible were spuriously true, NoSun must not become gated.
    expect(applyCloudGate('NoSun', true, 100)).toBe('NoSun');
  });

  it('never gates Shaded (geometrically shaded venues stay Shaded)', () => {
    expect(applyCloudGate('Shaded', true, 100)).toBe('Shaded');
  });

  it('does NOT gate when the sun is geometrically down even if cloud is high', () => {
    expect(applyCloudGate('Sunny', false, 100)).toBe('Sunny');
  });

  it('does NOT gate when cloud is UNKNOWN (undefined) — unknown ≠ overcast (AC2 interplay)', () => {
    expect(applyCloudGate('Sunny', true, undefined)).toBe('Sunny');
  });

  it('gates at exactly the named threshold (>= boundary, reads the constant so a re-tune is safe)', () => {
    expect(applyCloudGate('Sunny', true, CLOUD_GATE_THRESHOLD_PERCENT)).toBe('CloudObscured');
    // Just below the threshold stays un-gated.
    expect(applyCloudGate('Sunny', true, CLOUD_GATE_THRESHOLD_PERCENT - 0.1)).toBe('Sunny');
  });
});

// ---------------------------------------------------------------------------
// 2. End-to-end gate through the real engine (AC1)
// ---------------------------------------------------------------------------
describe('[10.1 AC1] cloud gate through computeRealSunEngineResult', () => {
  beforeEach(() => {
    clearSunEngineCachesForTests();
    mocks.from.mockReset();
    mocks.rpc.mockReset();
    mocks.getForecast.mockReset();
    mocks.getCurrentWeather.mockReset();
    mocks.rpc.mockResolvedValue({ data: [], error: null }); // no shadow casters → fully sunlit
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    vi.setSystemTime(SUMMER_MIDDAY);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('overcast weather over a geometrically-sunlit venue ⇒ CloudObscured headline', async () => {
    mocks.getForecast.mockResolvedValue([weatherSlice({ cloudCover: 100 })]);

    const outcome = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);

    expect(outcome.venue.currentSunStatus).toBe('CloudObscured');
  });

  it('PRESERVES the geometric layer unchanged under the gate (sunExposurePercent / sunWindow / peakTime)', async () => {
    mocks.getForecast.mockResolvedValue([weatherSlice({ cloudCover: 100 })]);

    const outcome = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);

    // The gate only rewrites currentSunStatus. The clear-sky potential IP is intact:
    expect(outcome.venue.sunExposurePercent).toBe(100); // no casters → fully sunlit geometry
    // sunWindow/peakTime are geometry-derived and must still be populated.
    expect(outcome.venue.sunWindow).toBeDefined();
  });

  it('clear weather over the same venue leaves the geometric Sunny status intact (no false gate)', async () => {
    mocks.getForecast.mockResolvedValue([weatherSlice({ cloudCover: 5 })]);

    const outcome = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);

    expect(outcome.venue.currentSunStatus).toBe('Sunny');
  });

  it('missing/unavailable weather does NOT gate (AC2) — degrades to geometric Sunny, sky unavailable', async () => {
    mocks.getForecast.mockResolvedValue([]); // Met.no unavailable → weather === null

    const outcome = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);

    expect(outcome.venue.currentSunStatus).toBe('Sunny'); // never fabricates a gate
    expect(outcome.venue.skyCondition).toBe('unavailable');
  });
});

// ---------------------------------------------------------------------------
// 2b. STORY 10.3: layer-weighted effective cover feeds the gate end-to-end
// ---------------------------------------------------------------------------
describe('[10.3 AC2] layered cloud detail through computeRealSunEngineResult', () => {
  beforeEach(() => {
    clearSunEngineCachesForTests();
    mocks.from.mockReset();
    mocks.rpc.mockReset();
    mocks.getForecast.mockReset();
    mocks.getCurrentWeather.mockReset();
    mocks.rpc.mockResolvedValue({ data: [], error: null }); // no casters → fully sunlit
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    vi.setSystemTime(SUMMER_MIDDAY);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('100%-HIGH-only cirrus over a sunlit venue does NOT gate — the cirrus-doesn-not-cry-no-sun case this story exists for', async () => {
    // Total cloud is 100% but it is all thin high cirrus; the effective cover lands
    // well below the gate, so the geometric Sunny survives.
    mocks.getForecast.mockResolvedValue([
      weatherSlice({ cloudCover: 100, cloudCoverLow: 0, cloudCoverMedium: 0, cloudCoverHigh: 100 }),
    ]);

    const outcome = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);

    expect(outcome.venue.currentSunStatus).toBe('Sunny');
    // The geometric layer is untouched (two-signal guarantee).
    expect(outcome.venue.sunExposurePercent).toBe(100);
    // ...but skyCondition still honestly reports the OBSERVABLE overcast sky
    // (Task 5 decision: skyCondition reads the RAW TOTAL, not the effective cover).
    expect(outcome.venue.skyCondition).toBe('overcast');
  });

  it('100%-LOW-only stratus deck over the same venue DOES gate ⇒ CloudObscured', async () => {
    mocks.getForecast.mockResolvedValue([
      weatherSlice({ cloudCover: 100, cloudCoverLow: 100, cloudCoverMedium: 0, cloudCoverHigh: 0 }),
    ]);

    const outcome = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);

    expect(outcome.venue.currentSunStatus).toBe('CloudObscured');
    // Geometry preserved even under the gate.
    expect(outcome.venue.sunExposurePercent).toBe(100);
  });

  it('a partial split (layer missing) falls back to the raw total for gating (AC3 Tier-0)', async () => {
    // No layer fields ⇒ the effective cover = the raw total 100 ⇒ gates exactly as
    // Story 10.1 did (the compact-shaped slice path stays byte-compatible).
    mocks.getForecast.mockResolvedValue([weatherSlice({ cloudCover: 100 })]);

    const outcome = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);

    expect(outcome.venue.currentSunStatus).toBe('CloudObscured');
  });

  // COVERAGE EXPANSION: the AC tests above drive single-band extremes (all-high,
  // all-low). This exercises the ADDITIVE effective-cover path end-to-end — a full
  // low deck is enough to gate on its own regardless of the cirrus above it, so a
  // mixed sky still gates. Complements the helper-level additive test with an
  // engine-level assertion that the summed effective value flows into the gate.
  it('a full LOW deck under cirrus (mixed split) still gates — the summed effective cover crosses the gate', async () => {
    mocks.getForecast.mockResolvedValue([
      weatherSlice({ cloudCover: 100, cloudCoverLow: 100, cloudCoverMedium: 0, cloudCoverHigh: 100 }),
    ]);

    const outcome = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);

    expect(outcome.venue.currentSunStatus).toBe('CloudObscured');
    // skyCondition still reports the observable overcast total (Task 5 split).
    expect(outcome.venue.skyCondition).toBe('overcast');
  });

  it('cirrus over a THIN low haze (well below the gate combined) does NOT gate — the terrace keeps its sun', async () => {
    // A little low cloud (20%) plus full cirrus: LOW*20 + HIGH*100 stays under the
    // 80 gate, so the geometric Sunny survives. The additive path does not
    // over-count cirrus into a false gate.
    mocks.getForecast.mockResolvedValue([
      weatherSlice({ cloudCover: 100, cloudCoverLow: 20, cloudCoverMedium: 0, cloudCoverHigh: 100 }),
    ]);

    const outcome = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);

    expect(outcome.venue.currentSunStatus).toBe('Sunny');
  });
});

// ---------------------------------------------------------------------------
// 3. Cache consistency: gated status + skyCondition cache together (AC4)
// ---------------------------------------------------------------------------
describe('[10.1 AC4] gated outcome caches with its weather slice', () => {
  beforeEach(() => {
    clearSunEngineCachesForTests();
    mocks.from.mockReset();
    mocks.rpc.mockReset();
    mocks.getForecast.mockReset();
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    vi.setSystemTime(SUMMER_MIDDAY);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('a repeat request in the same 15-min bucket returns the SAME gated status + skyCondition', async () => {
    mocks.getForecast.mockResolvedValue([weatherSlice({ cloudCover: 100 })]);

    const first = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    // A subsequent call in the same bucket must be served from cache with the
    // SAME gated outcome — the weather slice that produced skyCondition is the
    // same slice the gate read, so the cached bucket is internally consistent.
    const second = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);

    expect(first.venue.currentSunStatus).toBe('CloudObscured');
    expect(second.venue.currentSunStatus).toBe(first.venue.currentSunStatus);
    expect(second.venue.skyCondition).toBe(first.venue.skyCondition);
    // The second call must NOT have re-fetched weather (served from the cached
    // 15-min bucket) → getForecast called exactly once.
    expect(mocks.getForecast).toHaveBeenCalledTimes(1);
  });
});
