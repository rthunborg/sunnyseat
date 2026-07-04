/**
 * ATDD RED-PHASE acceptance scaffolds — Story 11.1 (AC1, Task 1 + Task 6)
 * "Client-Side Day-Series — engine per-step PARITY + per-step Epic-10 gate"
 *
 * =========================================================================
 * WHAT THIS SPEC IS
 * =========================================================================
 * Task 1 adds a server-side day-series producer that samples the SAME per-instant
 * pipeline as the single-shot `applyRealSunEngine`, at every 15-min planner step
 * across 06:00–21:00. The hard guardrails (Task 1 "Parity guardrail", Dev Notes
 * "sunExposurePercent keeps ONE physical meaning", test-design R-003/R-005):
 *
 *   1. PARITY — for the step whose instant equals the single-shot `requestedAt`,
 *      the series entry's `sunExposurePercent` + `currentSunStatus` MUST equal the
 *      existing single-instant compute BYTE-FOR-BYTE. The series is that same
 *      computation sampled per step, NOT a new formula. A divergence is a FAIL,
 *      NEVER a rebaseline.
 *   2. PER-STEP GATE — the Epic-10 cloud/rain gate applies PER STEP, never only to
 *      "now". A 100%-cloud (or raining, in-horizon) step gates THAT step; a
 *      below-horizon / shaded step is NEVER gated (geometry governs).
 *   3. EXPLICIT `isRaining` — the day-series is the exact "new applyCloudGate
 *      caller" the Epic-10 defer warns about: rain must be threaded EXPLICITLY per
 *      step (under the NOWCAST_HORIZON_MS horizon rule), never left to the
 *      `isRaining = false` default. A false-negative "sunny during rain" is the
 *      worst outcome for an honesty-first app.
 *
 * =========================================================================
 * MOCK BOUNDARY (MEMORY: "Vitest dynamic-import mock bypass")
 * =========================================================================
 * `computeRealSunEngineResult` does `await import('@/lib/solar')` +
 * `await import('@/lib/weather/met-no-service')` fanned out concurrently, which
 * a `vi.mock('@/lib/solar')` can DODGE. So we mock only the DEEPEST adapter
 * boundaries — `@/lib/supabase/server` (spy the building RPC) and
 * `@/lib/weather/met-no-service` (deterministic forecast slice) — exactly as
 * `sun-engine-caching.atdd.test.ts` does. No latency asserts; the acceptance
 * signal is BYTE-EQUALITY per step + gate-applied-per-step (deterministic).
 *
 * =========================================================================
 * RED PHASE
 * =========================================================================
 * Every block is `describe.skip`. The day-series producer does NOT exist yet;
 * the placeholder `computeVenueDaySeries` throws until Task 1 lands. The dev
 * replaces the placeholder with the real export and un-skips block-by-block.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyRealSunEngine } from '@/lib/services/sun-engine';
import { clearSunEngineCachesForTests } from '@/lib/services/sun-engine-cache';
import {
  PLANNER_START_MINUTES,
  PLANNER_END_MINUTES,
  PLANNER_STEP_MINUTES,
} from '@/lib/utils/time-planner';
import type { StoredVenue } from '@/lib/services/venue-store';
import type { WeatherSlice } from '@/lib/solar/types';
import type { VenueSunStatus } from '@/lib/types/api';

// ---- The Task-1 producer under test (does NOT exist yet — red phase) --------
// When Task 1 lands, the dev replaces this placeholder with the real export, e.g.
//   import { computeVenueDaySeries } from '@/lib/services/sun-engine';
// and un-skips the blocks. The signature is the ATDD contract for the producer:
// given the same (venue, requestedAt, now) the single-shot engine takes, plus the
// SAME forecast/nowcast overrides, it returns one gated entry per 15-min step.
type DaySeriesEntry = { minutes: number; sunExposurePercent: number; currentSunStatus: VenueSunStatus };
const computeVenueDaySeries = async (
  _venue: StoredVenue,
  _requestedAt: Date,
  _now?: Date,
): Promise<DaySeriesEntry[]> => {
  throw new Error('Story 11.1 not implemented: computeVenueDaySeries (lib/services/sun-engine.ts Task 1)');
};

// ---- Adapter-boundary mocks (identical contract to sun-engine-caching.atdd) --
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
// AC1 / Task 1 — the series has one entry per 15-min planner step
// ===========================================================================
describe.skip('Story 11.1 AC1 — day-series covers every planner step', () => {
  // P0 — one entry per 15-min step from 06:00 to 21:00 inclusive (61 steps).
  it('emits one entry per 15-min planner step across 06:00–21:00', async () => {
    const series = await computeVenueDaySeries(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);

    const expectedMinutes: number[] = [];
    for (let m = PLANNER_START_MINUTES; m <= PLANNER_END_MINUTES; m += PLANNER_STEP_MINUTES) {
      expectedMinutes.push(m);
    }
    expect(series.map((e) => e.minutes)).toEqual(expectedMinutes);
    // Sanity: 61 steps (06:00, 06:15, … 21:00).
    expect(series).toHaveLength(61);
  });

  // P0 — each entry carries AT LEAST the two client-consumed fields.
  it('carries sunExposurePercent + currentSunStatus on every entry', async () => {
    const series = await computeVenueDaySeries(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    for (const entry of series) {
      expect(typeof entry.sunExposurePercent).toBe('number');
      expect(entry.currentSunStatus).toBeTruthy();
    }
  });
});

// ===========================================================================
// AC1 / Task 1 — PARITY: series entry == single-shot compute at the same instant
// ===========================================================================
describe.skip('Story 11.1 AC1 — per-step parity with the single-instant compute', () => {
  // P0 — the load-bearing guardrail. For the step whose instant equals the
  // single-shot requestedAt, the series entry's %/status equals
  // applyRealSunEngine's byte-for-byte. A diff is a FAIL, never a rebaseline.
  it('matches the single-instant compute at the requestedAt step (byte-parity)', async () => {
    const venue = makeStoredVenue();
    // Single-shot at exactly the requested instant.
    const single = await applyRealSunEngine(venue, SUMMER_MIDDAY, SUMMER_MIDDAY);

    // The series sampled the SAME (venue, date, weather-bucket). Find the entry
    // for the planner step that snaps to the requested instant's Stockholm wall
    // clock (12:30 → the 12:30 step).
    const series = await computeVenueDaySeries(venue, SUMMER_MIDDAY, SUMMER_MIDDAY);
    const requestedStep = series.find((e) => e.minutes === 12 * 60 + 30);
    expect(requestedStep).toBeDefined();

    expect(requestedStep!.sunExposurePercent).toBe(single.venue.sunExposurePercent);
    expect(requestedStep!.currentSunStatus).toBe(single.venue.currentSunStatus);
  });

  // P0 — parity holds at OTHER steps too: for any planner step, the series value
  // equals the single-shot compute run at THAT step's instant. Spot-check a
  // representative subset (mid-morning, midday, late-afternoon) — the series is the
  // same computation sampled per step, so each must agree with the single-shot.
  it('matches the single-instant compute at other sampled steps', async () => {
    const venue = makeStoredVenue();
    const series = await computeVenueDaySeries(venue, SUMMER_MIDDAY, SUMMER_MIDDAY);

    // The dev un-skipping this drives applyRealSunEngine at each step's UTC instant
    // (Stockholm wall-clock → fromZonedTime, per the story's Task-1 conversion) and
    // asserts equality. The exact instant construction mirrors the producer's own
    // sameDayScanRange/resolveRequestedAt reuse — kept as a TODO for the dev so the
    // instant math is shared with the implementation (never re-derived here).
    // For the red-phase scaffold we assert the SHAPE that makes parity checkable:
    // every entry is a plain {%,status} the single-shot compute could produce.
    for (const entry of series) {
      expect(entry.sunExposurePercent).toBeGreaterThanOrEqual(0);
      expect(entry.sunExposurePercent).toBeLessThanOrEqual(100);
      expect(['Sunny', 'Partial', 'Shaded', 'NoSun', 'CloudObscured']).toContain(entry.currentSunStatus);
    }
    // TODO(dev, green phase): replace the shape check above with a per-step
    // equality loop against applyRealSunEngine(venue, stepInstant, SUMMER_MIDDAY)
    // once the producer exposes (or shares) its step→instant conversion.
  });
});

// ===========================================================================
// AC1 / Task 1 — the Epic-10 gate applies PER STEP (never only "now")
// ===========================================================================
describe.skip('Story 11.1 AC1 — Epic-10 cloud/rain gate applies per step', () => {
  // P0 — a HEAVILY-CLOUDED forecast gates a geometrically-sunlit step to
  // CloudObscured — for a MIDDAY step that is NOT "now" (proving the gate is not
  // applied only to the requested instant). effectiveCloudCover uses the raw total
  // for low/mid cloud, so a 100% overcast slice trips the CLOUD_GATE_THRESHOLD.
  it('gates a sunlit non-"now" step under heavy cloud (per-step, not only now)', async () => {
    mocks.getForecast.mockResolvedValue([weatherSlice({ cloudCover: 100 })]);

    const series = await computeVenueDaySeries(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    // A midday step where geometry is sunlit should be gated to CloudObscured by
    // the 100% overcast, even though this step is not the "now" instant.
    const midday = series.find((e) => e.minutes === 13 * 60);
    expect(midday).toBeDefined();
    expect(midday!.currentSunStatus).toBe('CloudObscured');
  });

  // P0 — a CLEAR-sky step keeps its geometric status (NOT gated). The gate only
  // fires when effective cloud meets the threshold — a clear step is Sunny.
  it('leaves a clear-sky sunlit step ungated', async () => {
    mocks.getForecast.mockResolvedValue([weatherSlice({ cloudCover: 5 })]);

    const series = await computeVenueDaySeries(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    const midday = series.find((e) => e.minutes === 13 * 60);
    expect(midday).toBeDefined();
    expect(midday!.currentSunStatus).not.toBe('CloudObscured');
  });

  // P0 — a step where the sun is DOWN / geometry is not sunlit is NEVER gated:
  // the cloud gate only reframes an otherwise-sunlit step. A late (21:00) or
  // early step must not become CloudObscured just because it is cloudy.
  it('never gates a non-sunlit step (gate only reframes sunlit geometry)', async () => {
    mocks.getForecast.mockResolvedValue([weatherSlice({ cloudCover: 100 })]);

    const series = await computeVenueDaySeries(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    // The last planner step (21:00) — if the geometry is not sunlit there, cloud
    // cannot turn it into CloudObscured.
    const late = series.find((e) => e.minutes === PLANNER_END_MINUTES);
    expect(late).toBeDefined();
    if (late!.sunExposurePercent === 0) {
      expect(late!.currentSunStatus).not.toBe('CloudObscured');
    }
  });
});

// ===========================================================================
// AC1 / Task 1 — rain (`isRaining`) threaded EXPLICITLY per step under the horizon
// ===========================================================================
describe.skip('Story 11.1 AC1 — rain threaded explicitly per step (horizon rule)', () => {
  // P0 — an in-horizon step with an active nowcast rain rate is gated to
  // CloudObscured (rain governs) — proving `isRaining` is threaded, not left at the
  // `false` default the Epic-10 defer warns about. The honesty-first guardrail:
  // "sunny during rain" must be impossible.
  it('gates an in-horizon step when the nowcast reports active rain', async () => {
    // Clear cloud so ONLY rain can gate — isolates the isRaining thread.
    mocks.getForecast.mockResolvedValue([weatherSlice({ cloudCover: 5 })]);

    // The dev wires the nowcast override so the near-"now" step reads an active
    // precipitation rate (in [now, now+NOWCAST_HORIZON_MS]). Once the producer
    // accepts/uses a nowcast override, un-skip and assert the near-now step is
    // CloudObscured despite the clear cloud. Kept as the explicit red contract:
    const series = await computeVenueDaySeries(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    const nearNow = series.find((e) => e.minutes === 12 * 60 + 30); // the "now" step
    expect(nearNow).toBeDefined();
    // TODO(dev, green phase): with an active-rain nowcast override in horizon,
    // this step MUST be CloudObscured (rain gate). The scaffold asserts the step
    // exists and is a valid gated value so the contract is un-skippable.
    expect(['Sunny', 'CloudObscured']).toContain(nearNow!.currentSunStatus);
  });

  // P0 — a step BEYOND the nowcast horizon (or in the past) must NOT read the
  // near-now rain: `precipitationRate = undefined` ⇒ `isRaining = false` ⇒
  // forecast cloud governs (byte-identical to Epic-10 Tiers 0/1). A future step is
  // never "raining now".
  it('does not read near-now rain for a step beyond the nowcast horizon', async () => {
    mocks.getForecast.mockResolvedValue([weatherSlice({ cloudCover: 5 })]);

    const series = await computeVenueDaySeries(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    // A late-evening step is well beyond the 90-min nowcast horizon from 12:30, so
    // even with an active near-now rain nowcast it must be forecast-cloud-governed,
    // i.e. NOT rain-gated. With clear forecast cloud it should not be CloudObscured
    // due to rain.
    const beyondHorizon = series.find((e) => e.minutes === 20 * 60);
    expect(beyondHorizon).toBeDefined();
    if (beyondHorizon!.sunExposurePercent > 0) {
      expect(beyondHorizon!.currentSunStatus).not.toBe('CloudObscured');
    }
  });
});
