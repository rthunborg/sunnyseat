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
import * as sunEngine from '@/lib/services/sun-engine';
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
  getNowcastPrecipitationRate: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  supabaseServiceRole: { from: mocks.from, rpc: mocks.rpc },
  getSupabaseServiceRole: () => ({ from: mocks.from, rpc: mocks.rpc }),
}));

vi.mock('@/lib/weather/met-no-service', () => ({
  getForecast: mocks.getForecast,
  getCurrentWeather: mocks.getCurrentWeather,
  // The nowcast client imports `userAgent` from this module; keep it a no-op
  // stub so the mocked module still satisfies that import.
  userAgent: () => 'sunnyseat-test/1.0 test@example.com',
}));

// [10.4 Review][Patch] Mock the nowcast adapter boundary so the engine's LAZY
// import path (`await import('@/lib/weather/nowcast-service')`, used when no
// `getNowcastOverride` is injected) NEVER issues a live outbound request to
// api.met.no/nowcast/2.0/complete. The default resolves to `undefined` (rate
// unknown = non-gating, AC3) — byte-identical to the pre-fix behaviour where the
// real client's swallowed network error also resolved to `undefined`, but with
// zero network I/O. Tests that inject an explicit `getNowcastOverride` bypass
// this module entirely and are unaffected.
vi.mock('@/lib/weather/nowcast-service', () => ({
  getNowcastPrecipitationRate: mocks.getNowcastPrecipitationRate,
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

// ===========================================================================
// STORY 10.4 — Tier 2: the rain-now radar signal (AC2 / AC3 / AC4)
// ===========================================================================
/**
 * ATDD RED-PHASE scaffolds for Story 10.4. Written red-first against production
 * seams that DO NOT EXIST YET on HEAD:
 *   - `applyRealSunEngine`'s 5th param `getNowcastOverride?: GetNowcastRate`
 *     (Task 2) — today the signature stops at `getForecastOverride`.
 *   - `applyCloudGate`'s 4th param `isRaining: boolean` (Task 3) — today it is
 *     the 3-arg `(status, isSunVisible, cloudCover)`.
 *   - the exported constant `NOWCAST_HORIZON_MS` (Task 2, AC4) — not exported yet.
 *   - `skyCondition === 'rain'` on the outcome (Task 4) — not produced yet.
 * The whole block is `.skip`-gated so `vitest run` is green on HEAD; the dev
 * un-skips it as each seam lands (it should go RED first, then green).
 *
 * =========================================================================
 * WHY THE CAST-THROUGH-CURRENT-SIGNATURE HELPERS (epic-10 ratified pattern)
 * =========================================================================
 * The tsc CI gate compiles `.skip`-ped tests too. Calling `applyRealSunEngine`
 * with a 5th argument, or `applyCloudGate` with a 4th, or reading a not-yet-
 * exported `NOWCAST_HORIZON_MS`, all HARD-BREAK `tsc --noEmit` on HEAD (arity /
 * missing-export errors) — turning CI red before any production code is written.
 * So we reach those seams through LOOSELY-TYPED accessors that cast the CURRENT
 * export shape to the FUTURE shape:
 *   - `applyRealSunEngineWithNowcast` casts `applyRealSunEngine` to a signature
 *     that accepts the extra `getNowcastOverride`.
 *   - `applyCloudGateWithRain` casts `applyCloudGate` to accept the extra
 *     `isRaining`.
 *   - `nowcastHorizonMs()` reads `NOWCAST_HORIZON_MS` off the module namespace
 *     loosely (undefined on HEAD, a number once Task 2 exports it).
 * `tsc` only ever sees the loose cast, so the file compiles green while `.skip`;
 * once the real seams land the casts resolve to the real, correctly-typed
 * functions and the assertions run unchanged.
 *
 * RELATIVE-BOUNDARY DISCIPLINE (retro-note: NOWCAST_HORIZON_MS is re-tunable):
 * AC4 boundaries are asserted by READING `NOWCAST_HORIZON_MS`, never by
 * hard-coding "90 minutes". Rain INTENT (rate>0 gates; rate 0/undefined inert)
 * is asserted, never an exact rate number.
 */

// --- Cast-through accessors (loose typing so `.skip` + tsc stay green) ------
type GetNowcastRateLoose = (lat?: number, lng?: number) => Promise<number | undefined>;

/** `applyRealSunEngine` with the future 5th `getNowcastOverride` param. */
const applyRealSunEngineWithNowcast = applyRealSunEngine as unknown as (
  venue: StoredVenue,
  requestedAt: Date,
  now: Date,
  getForecastOverride?: unknown,
  getNowcastOverride?: GetNowcastRateLoose,
) => ReturnType<typeof applyRealSunEngine>;

/** `applyCloudGate` with the future 4th `isRaining` param. */
const applyCloudGateWithRain = applyCloudGate as unknown as (
  status: string,
  isSunVisible: boolean,
  cloudCover: number | undefined,
  isRaining: boolean,
) => string;

/** Read the not-yet-exported `NOWCAST_HORIZON_MS` loosely (undefined on HEAD). */
function nowcastHorizonMs(): number {
  const v = (sunEngine as unknown as { NOWCAST_HORIZON_MS?: number }).NOWCAST_HORIZON_MS;
  // The scaffold reads the constant so an AC4 re-tune never breaks it. If the
  // dev has not exported it yet this returns NaN and the horizon tests fail
  // loudly (red-first) — exactly the intent.
  return v as number;
}

const SUMMER_NIGHT = new Date('2026-06-21T00:00:00.000Z'); // Stockholm 02:00, sun below horizon

// ---------------------------------------------------------------------------
// 4. Pure helper: applyCloudGate folds in the rain OR-term (AC2 / AC3)
// ---------------------------------------------------------------------------
describe('[10.4 AC2] applyCloudGate — rain is a one-way OR-ed gate trigger', () => {
  it('gates a geometrically-sunlit venue under rain EVEN when cloud is below threshold (rain wins)', () => {
    // Low cloud (well below the gate) but it is raining → still gate.
    expect(applyCloudGateWithRain('Sunny', true, 10, true)).toBe('CloudObscured');
    expect(applyCloudGateWithRain('Partial', true, 10, true)).toBe('CloudObscured');
  });

  it('gates under rain even when cloud is UNKNOWN (undefined) — rain does not need a cloud reading', () => {
    expect(applyCloudGateWithRain('Sunny', true, undefined, true)).toBe('CloudObscured');
  });

  it('NEVER gates a Shaded venue under rain (geometric-shade precedence — AC3b)', () => {
    expect(applyCloudGateWithRain('Shaded', true, 10, true)).toBe('Shaded');
  });

  it('NEVER gates NoSun under rain (below-horizon precedence wins over rain too)', () => {
    expect(applyCloudGateWithRain('NoSun', false, 10, true)).toBe('NoSun');
    expect(applyCloudGateWithRain('NoSun', true, 10, true)).toBe('NoSun');
  });

  it('does NOT gate when the sun is geometrically down, even under rain', () => {
    // isSunVisible false → the fire condition is false regardless of rain.
    expect(applyCloudGateWithRain('Sunny', false, 10, true)).toBe('Sunny');
  });

  it('no-rain (isRaining=false) leaves the 10.3 result byte-identical — cloud alone decides', () => {
    // Below-threshold + no rain ⇒ unchanged.
    expect(applyCloudGateWithRain('Sunny', true, 10, false)).toBe('Sunny');
    // At/above-threshold + no rain ⇒ still gated by CLOUD (not rain).
    expect(applyCloudGateWithRain('Sunny', true, CLOUD_GATE_THRESHOLD_PERCENT, false)).toBe(
      'CloudObscured',
    );
  });

  it('rain never UN-gates a cloud-gated venue (one-way): overcast + no-rain still CloudObscured', () => {
    expect(applyCloudGateWithRain('Sunny', true, 100, false)).toBe('CloudObscured');
  });
});

// ---------------------------------------------------------------------------
// 5. End-to-end: rain forces the gate through the real engine (AC2)
// ---------------------------------------------------------------------------
describe('[10.4 AC2] rain forces the gate through computeRealSunEngineResult', () => {
  beforeEach(() => {
    clearSunEngineCachesForTests();
    mocks.from.mockReset();
    mocks.rpc.mockReset();
    mocks.getForecast.mockReset();
    mocks.getCurrentWeather.mockReset();
    mocks.rpc.mockResolvedValue({ data: [], error: null }); // no casters → geometrically sunlit
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    vi.setSystemTime(SUMMER_MIDDAY);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('rain (rate>0) over a sunlit venue with LOW cloud ⇒ CloudObscured + skyCondition="rain", geometry preserved', async () => {
    // Cloud is well below the gate; only rain forces it. Rain must WIN.
    mocks.getForecast.mockResolvedValue([weatherSlice({ cloudCover: 10 })]);
    const getNowcast: GetNowcastRateLoose = vi.fn(async () => 0.5); // 0.5 mm/h — raining

    const outcome = await applyRealSunEngineWithNowcast(
      makeStoredVenue(),
      SUMMER_MIDDAY,
      SUMMER_MIDDAY,
      undefined,
      getNowcast,
    );

    expect(outcome.venue.currentSunStatus).toBe('CloudObscured');
    // Rain takes PRECEDENCE in the surfaced sky label (over the cloud-derived one).
    expect(outcome.venue.skyCondition).toBe('rain');
    // Two-signal guarantee: the geometric clear-sky layer is untouched by the gate.
    expect(outcome.venue.sunExposurePercent).toBe(100);
    expect(outcome.venue.sunWindow).toBeDefined();
  });

  it('rain over a NON-sunlit (below-horizon) venue does NOT gate — stays NoSun (rain never gates non-sunlit)', async () => {
    // Below-horizon ⇒ isSunVisible false ⇒ rain cannot gate. Equivalent to the
    // AC3b "geometrically-shaded stays Shaded" guarantee (the gate switch treats
    // Shaded / NoSun identically), asserted here via the deterministic night case.
    mocks.getForecast.mockResolvedValue([weatherSlice({ cloudCover: 10 })]);
    const getNowcast: GetNowcastRateLoose = vi.fn(async () => 0.9);

    const outcome = await applyRealSunEngineWithNowcast(
      makeStoredVenue(),
      SUMMER_NIGHT,
      SUMMER_NIGHT,
      undefined,
      getNowcast,
    );

    expect(outcome.venue.currentSunStatus).toBe('NoSun');
  });
});

// ---------------------------------------------------------------------------
// 6. Absence of rain contributes NOTHING — the epic's HARD CONSTRAINT (AC3)
// ---------------------------------------------------------------------------
describe("[10.4 AC3] absence of rain changes nothing (\"absence of rain must NEVER imply sun\")", () => {
  beforeEach(() => {
    clearSunEngineCachesForTests();
    mocks.from.mockReset();
    mocks.rpc.mockReset();
    mocks.getForecast.mockReset();
    mocks.getCurrentWeather.mockReset();
    mocks.getNowcastPrecipitationRate.mockReset();
    // Lazy-path default: rate unknown ⇒ non-gating (AC3). The lazy-import test
    // below relies on this mocked accessor instead of a live Met.no fetch.
    mocks.getNowcastPrecipitationRate.mockResolvedValue(undefined);
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    vi.setSystemTime(SUMMER_MIDDAY);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('(a) no-rain (0) + effective-overcast + sunlit ⇒ still CloudObscured (the cloud gate decides, no-rain does not un-gate)', async () => {
    mocks.getForecast.mockResolvedValue([weatherSlice({ cloudCover: 100 })]);
    const noRain: GetNowcastRateLoose = vi.fn(async () => 0); // radar says genuinely no rain

    const outcome = await applyRealSunEngineWithNowcast(
      makeStoredVenue(),
      SUMMER_MIDDAY,
      SUMMER_MIDDAY,
      undefined,
      noRain,
    );

    // A `rate === 0` reading must NEVER lift a cloud-gated venue back to Sunny.
    expect(outcome.venue.currentSunStatus).toBe('CloudObscured');
    // And the sky label is the cloud-derived one (NOT 'rain') — 0 is not raining.
    expect(outcome.venue.skyCondition).toBe('overcast');
  });

  it('(b) no-rain (0) + clear + geometrically-non-sunlit (below horizon) ⇒ stays NoSun (no-rain never lifts to Sunny)', async () => {
    mocks.getForecast.mockResolvedValue([weatherSlice({ cloudCover: 5 })]);
    const noRain: GetNowcastRateLoose = vi.fn(async () => 0);

    const outcome = await applyRealSunEngineWithNowcast(
      makeStoredVenue(),
      SUMMER_NIGHT,
      SUMMER_NIGHT,
      undefined,
      noRain,
    );

    expect(outcome.venue.currentSunStatus).toBe('NoSun');
  });

  it('undefined rate (nowcast down / no coverage) behaves IDENTICALLY to 0 — cloud+geometry alone decide', async () => {
    // Overcast + sunlit: with an UNKNOWN rate the outcome must be exactly the
    // cloud-only outcome (CloudObscured), same as the `rate === 0` case above —
    // unknown is non-gating, and it never un-gates the cloud gate either.
    mocks.getForecast.mockResolvedValue([weatherSlice({ cloudCover: 100 })]);
    const unknownRate: GetNowcastRateLoose = vi.fn(async () => undefined);

    const outcome = await applyRealSunEngineWithNowcast(
      makeStoredVenue(),
      SUMMER_MIDDAY,
      SUMMER_MIDDAY,
      undefined,
      unknownRate,
    );

    expect(outcome.venue.currentSunStatus).toBe('CloudObscured');
    expect(outcome.venue.skyCondition).toBe('overcast'); // never 'rain' — rate unknown
  });

  it('no nowcast override at all (engine lazy path) matches the pure-cloud outcome — rain is additive-only', async () => {
    // Sanity anchor: with NO nowcast injected, the sunlit + low-cloud venue is
    // Sunny (10.3 behaviour). Rain can only ADD a gate on top of this; it can
    // never be the reason a clear+sunlit venue becomes Sunny.
    //
    // [10.4 Review][Patch] This exercises the engine's LAZY import path
    // (`await import('@/lib/weather/nowcast-service')`). That module is mocked at
    // the top of this file (default ⇒ `undefined`, non-gating), so the near-now
    // request resolves the MOCKED accessor and issues NO live outbound Met.no
    // fetch — the assertion below proves the lazy path went through the mock.
    mocks.getForecast.mockResolvedValue([weatherSlice({ cloudCover: 5 })]);

    const outcome = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);

    expect(outcome.venue.currentSunStatus).toBe('Sunny');
    // Near-now ⇒ the lazy-imported (mocked) nowcast accessor WAS consulted, so no
    // real network request could have escaped to api.met.no.
    expect(mocks.getNowcastPrecipitationRate).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 7. Future planner requests do NOT consult the nowcast (AC4)
// ---------------------------------------------------------------------------
describe('[10.4 AC4] future-horizon requests skip the nowcast (no stale "now" radar leak)', () => {
  beforeEach(() => {
    clearSunEngineCachesForTests();
    mocks.from.mockReset();
    mocks.rpc.mockReset();
    mocks.getForecast.mockReset();
    mocks.getCurrentWeather.mockReset();
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    vi.setSystemTime(SUMMER_MIDDAY);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('a requestedAt BEYOND NOWCAST_HORIZON_MS ⇒ nowcast NOT called, and the ignored rain does NOT force-gate', async () => {
    // Read the constant (re-tune safe): pick a requestedAt comfortably beyond it.
    const beyond = new Date(SUMMER_MIDDAY.getTime() + nowcastHorizonMs() + 60 * 60 * 1000);
    mocks.getForecast.mockResolvedValue([weatherSlice({ cloudCover: 10 })]);
    const rainMock = vi.fn(async () => 0.9); // would gate IF consulted — it must not be

    const outcome = await applyRealSunEngineWithNowcast(
      makeStoredVenue(),
      beyond,
      SUMMER_MIDDAY,
      undefined,
      rainMock as GetNowcastRateLoose,
    );

    // AC4: a future-planner request never fires the nowcast.
    expect(rainMock).not.toHaveBeenCalled();
    // Forecast cloud (low) governs; the ignored "now" rain does NOT force a gate.
    expect(outcome.venue.currentSunStatus).not.toBe('CloudObscured');
    expect(outcome.venue.skyCondition).not.toBe('rain');
  });

  it('a requestedAt INSIDE the horizon (now) ⇒ nowcast IS consulted and rain gates', async () => {
    mocks.getForecast.mockResolvedValue([weatherSlice({ cloudCover: 10 })]);
    const rainMock = vi.fn(async () => 0.9);

    const outcome = await applyRealSunEngineWithNowcast(
      makeStoredVenue(),
      SUMMER_MIDDAY,
      SUMMER_MIDDAY,
      undefined,
      rainMock as GetNowcastRateLoose,
    );

    expect(rainMock).toHaveBeenCalled();
    expect(outcome.venue.currentSunStatus).toBe('CloudObscured');
    expect(outcome.venue.skyCondition).toBe('rain');
  });

  it('a PAST requestedAt (< now) ⇒ nowcast NOT called (no live radar for the past)', async () => {
    const past = new Date(SUMMER_MIDDAY.getTime() - 30 * 60 * 1000);
    mocks.getForecast.mockResolvedValue([weatherSlice({ cloudCover: 10 })]);
    const rainMock = vi.fn(async () => 0.9);

    await applyRealSunEngineWithNowcast(
      makeStoredVenue(),
      past,
      SUMMER_MIDDAY,
      undefined,
      rainMock as GetNowcastRateLoose,
    );

    expect(rainMock).not.toHaveBeenCalled();
  });
});
