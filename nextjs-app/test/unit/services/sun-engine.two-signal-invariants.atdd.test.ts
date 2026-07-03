/**
 * ATDD RED-PHASE scaffolds — Story 10.5 AC4 (regression guards for the historical
 * failure mode) — the NET-NEW cross-tier "two-signal guarantee" invariant.
 *
 * =========================================================================
 * WHAT THIS FILE PINS (and why it is net-new)
 * =========================================================================
 * Epic 10 layered three weather tiers on top of the geometric sun engine. Each
 * tier is exhaustively unit-tested in isolation (10.1–10.4, see
 * `sun-engine.cloud-gate.atdd.test.ts`). But NO single-tier test asserts the
 * load-bearing CROSS-TIER invariant the whole epic exists to protect:
 *
 *   For the SAME venue geometry + the SAME instant, the geometric fields
 *   (`sunExposurePercent`, `sunWindow`) are BYTE-IDENTICAL across every weather
 *   variation — clear / overcast / high-cirrus-only / active-rain /
 *   weather-missing. Weather may ONLY change the headline `currentSunStatus`,
 *   the `skyCondition`, and the `confidence`; it must NEVER perturb the geometry.
 *
 * This is the "two-signal guarantee": the geometric layer is sacred
 * (epics.md:2659). If a future refactor of the gate/effective-cover/nowcast path
 * ever leaks weather into the geometry, this guard goes red.
 *
 * =========================================================================
 * RED-PHASE STATUS
 * =========================================================================
 * The whole block is `.skip`-gated so `vitest run` is green on HEAD before the
 * dev authors the real guard. The DEV agent un-skips it and confirms it goes
 * GREEN against the shipped Tier 0+1+2 engine (this is a VERIFICATION story —
 * the production seams ALL exist; the assertions should already hold, so this
 * is a guard being pinned, not new behaviour being driven). If any assertion is
 * RED on un-skip, that is a genuine two-signal defect to triage (do NOT weaken
 * the assertion to make it pass).
 *
 * MOCK BOUNDARY (MEMORY "no live Met.no" + "Vitest dynamic-import mock bypass"):
 * Mirror `sun-engine.cloud-gate.atdd.test.ts` EXACTLY — mock the DEEPEST adapters
 * only (`@/lib/supabase/server` rpc → no casters ⇒ fully sunlit geometry;
 * `@/lib/weather/met-no-service` getForecast → the per-scenario cloud slice;
 * `@/lib/weather/nowcast-service` → the rain rate). Weather is injected; NO
 * outbound network. The rain scenario injects the nowcast override through the
 * loose-cast `applyRealSunEngineWithNowcast` accessor (rain is now a shipped 5th
 * param, so the cast resolves to the real typed function).
 *
 * RELATIVE-BOUNDARY DISCIPLINE (retro-note: threshold / layer weights re-tunable):
 * Scenarios drive cloud to extremes (0 / 100-low / 100-high-only) and rain to a
 * clear rate>0, never the exact 80 boundary or a magic mm/h, so a future re-tune
 * of CLOUD_GATE_THRESHOLD_PERCENT or the layer weights does not break the guard.
 * The geometry-equality assertion is the load-bearing one; the status/sky deltas
 * are asserted RELATIVELY (obscured-vs-not, rain-vs-not).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyRealSunEngine } from '@/lib/services/sun-engine';
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
  userAgent: () => 'sunnyseat-test/1.0 test@example.com',
}));

vi.mock('@/lib/weather/nowcast-service', () => ({
  getNowcastPrecipitationRate: mocks.getNowcastPrecipitationRate,
}));

// Loose-cast accessor for the shipped 5th `getNowcastOverride` param (mirrors the
// pattern ratified in sun-engine.cloud-gate.atdd.test.ts). Keeps this file robust
// to the exact exported signature.
type GetNowcastRateLoose = (lat?: number, lng?: number) => Promise<number | undefined>;
const applyRealSunEngineWithNowcast = applyRealSunEngine as unknown as (
  venue: StoredVenue,
  requestedAt: Date,
  now: Date,
  getForecastOverride?: unknown,
  getNowcastOverride?: GetNowcastRateLoose,
) => ReturnType<typeof applyRealSunEngine>;

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

// The five weather variations the epic must render honestly. Each carries its
// forecast slice(s) + nowcast rate; geometry (rpc → no casters) is identical.
type Scenario = {
  name: string;
  forecast: WeatherSlice[];
  nowcastRate: number | undefined;
  expectObscured: boolean;
};

const SCENARIOS: Scenario[] = [
  { name: 'clear', forecast: [weatherSlice({ cloudCover: 0 })], nowcastRate: 0, expectObscured: false },
  {
    name: 'overcast (low stratus ≥ threshold)',
    forecast: [weatherSlice({ cloudCover: 100, cloudCoverLow: 100, cloudCoverMedium: 0, cloudCoverHigh: 0 })],
    nowcastRate: 0,
    expectObscured: true,
  },
  {
    name: 'high-cirrus-only (effective < threshold ⇒ NOT gated)',
    forecast: [weatherSlice({ cloudCover: 100, cloudCoverLow: 0, cloudCoverMedium: 0, cloudCoverHigh: 100 })],
    nowcastRate: 0,
    expectObscured: false,
  },
  {
    name: 'active rain (rate>0 forces gate)',
    forecast: [weatherSlice({ cloudCover: 10 })],
    nowcastRate: 0.5,
    expectObscured: true,
  },
  {
    name: 'weather-missing (no cloud slice ⇒ NOT gated, geometry governs)',
    forecast: [],
    nowcastRate: undefined,
    expectObscured: false,
  },
];

describe.skip('[10.5 AC4] two-signal guarantee — geometry is byte-identical across all five weather variations', () => {
  beforeEach(() => {
    clearSunEngineCachesForTests();
    mocks.from.mockReset();
    mocks.rpc.mockReset();
    mocks.getForecast.mockReset();
    mocks.getCurrentWeather.mockReset();
    mocks.getNowcastPrecipitationRate.mockReset();
    mocks.rpc.mockResolvedValue({ data: [], error: null }); // no shadow casters → fully sunlit geometry
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    vi.setSystemTime(SUMMER_MIDDAY);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  async function runScenario(s: Scenario) {
    clearSunEngineCachesForTests(); // isolate each weather variation from the 15-min cache
    mocks.getForecast.mockResolvedValue(s.forecast);
    const getNowcast: GetNowcastRateLoose = vi.fn(async () => s.nowcastRate);
    return applyRealSunEngineWithNowcast(
      makeStoredVenue(),
      SUMMER_MIDDAY,
      SUMMER_MIDDAY,
      undefined,
      getNowcast,
    );
  }

  it('sunExposurePercent is IDENTICAL across all five weather variations for the same geometry + instant', async () => {
    const results = [];
    for (const s of SCENARIOS) {
      results.push({ name: s.name, outcome: await runScenario(s) });
    }
    const baseline = results[0].outcome.venue.sunExposurePercent;
    for (const r of results) {
      expect(
        r.outcome.venue.sunExposurePercent,
        `sunExposurePercent drifted under weather "${r.name}" — weather must NEVER touch geometry`,
      ).toBe(baseline);
    }
  });

  it('sunWindow is IDENTICAL (deep-equal, byte-identical serialization) across all five weather variations', async () => {
    const results = [];
    for (const s of SCENARIOS) {
      results.push({ name: s.name, outcome: await runScenario(s) });
    }
    const baseline = JSON.stringify(results[0].outcome.venue.sunWindow);
    for (const r of results) {
      expect(
        JSON.stringify(r.outcome.venue.sunWindow),
        `sunWindow drifted under weather "${r.name}" — the geometric window is sacred`,
      ).toBe(baseline);
    }
  });

  it('weather DOES change ONLY the headline status / sky / confidence (proves the variations are real, not a no-op)', async () => {
    const byName = new Map<string, Awaited<ReturnType<typeof runScenario>>>();
    for (const s of SCENARIOS) byName.set(s.name, await runScenario(s));

    // At least one obscured and one non-obscured scenario exist ⇒ the status axis
    // genuinely varies (so the geometry-equality assertions above are meaningful,
    // not vacuously equal because nothing changed).
    const statuses = SCENARIOS.map((s) => byName.get(s.name)!.venue.currentSunStatus);
    expect(statuses).toContain('CloudObscured');
    expect(statuses.some((st) => st !== 'CloudObscured')).toBe(true);

    // Relative check per scenario (no hardcoded threshold / rate).
    for (const s of SCENARIOS) {
      const status = byName.get(s.name)!.venue.currentSunStatus;
      if (s.expectObscured) {
        expect(status, `"${s.name}" must render obscured`).toBe('CloudObscured');
      } else {
        expect(status, `"${s.name}" must NOT be obscured`).not.toBe('CloudObscured');
      }
    }
  });

  it('confidence at 100% effective cloud is STRICTLY LOWER than confidence at 0% cloud (FR12 blend, guarded here cross-tier)', async () => {
    const clear = await runScenario(SCENARIOS[0]); // 0% cloud
    const overcast = await runScenario(SCENARIOS[1]); // 100% low stratus
    expect(overcast.venue.confidence).toBeLessThan(clear.venue.confidence);
  });

  it('weather-missing NEVER fabricates a clear sky: NOT gated + skyCondition="unavailable"', async () => {
    const missing = await runScenario(SCENARIOS[4]);
    expect(missing.venue.currentSunStatus).not.toBe('CloudObscured');
    expect(missing.venue.skyCondition).toBe('unavailable');
  });
});
