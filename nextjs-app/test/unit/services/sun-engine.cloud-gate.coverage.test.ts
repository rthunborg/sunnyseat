/**
 * COVERAGE EXPANSION — Story 10.1 cloud-gate engine surface.
 *
 * The AC-driven ATDD scaffolds (sun-engine.cloud-gate.atdd.test.ts,
 * met-no-service.cloud-gate.atdd.test.ts, confidence-calculator.cloud-gate.atdd.test.ts,
 * venues-route.cloud-gate.atdd.test.ts) prove the four acceptance criteria on their
 * headline paths (overcast ⇒ gated, missing ⇒ unknown, cover ⇒ confidence drop,
 * sanitizer/sort round-trip, cache consistency).
 *
 * This file fills the residual branch/edge gaps those scaffolds intentionally left,
 * WITHOUT duplicating them:
 *
 *  1. `skyConditionFromCloudCover(undefined)` ⇒ 'unavailable' — the AC2 unknown branch
 *     of the pure mapper. The existing pure-mapper test in sun-engine.test.ts only
 *     asserts the 0..100 numeric boundaries (clear/partly-cloudy/overcast) and never
 *     the undefined ⇒ 'unavailable' case that Task 2 added.
 *  2. `applyCloudGate` idempotency + the Partial-below-threshold branch + the
 *     defensive out-of-range clamp — documented in the helper's contract but not
 *     asserted by the ATDD (which only drives Sunny/Partial-above, NoSun, Shaded,
 *     unknown, and the exact >= boundary).
 *  3. End-to-end FORECAST gating: an overcast slice with `isForecast: true` still
 *     gates. Story 10.1 Dev Notes are explicit — "Gating on forecast cloud is correct
 *     and intended (Story 10.4 will exclude only the near-now radar signal for future
 *     requests). Do not special-case forecast here." The ATDD end-to-end cases all use
 *     `isForecast: false`; this pins the forecast path so a future 10.4 change is a
 *     conscious, test-visible decision.
 *
 * MOCK BOUNDARY (MEMORY: "Vitest dynamic-import mock bypass" + "no live Met.no"):
 * mirror the ATDD scaffold — mock the deepest adapters (`@/lib/supabase/server` rpc
 * and `@/lib/weather/met-no-service` getForecast) only. The forecast-gating case uses
 * the `getForecastOverride` param instead, exactly as the story's Test Surfaces note
 * describes ("the sun-engine tests already inject getForecastOverride").
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyCloudGate,
  applyRealSunEngine,
  CLOUD_GATE_THRESHOLD_PERCENT,
  skyConditionFromCloudCover,
} from '@/lib/services/sun-engine';
import { clearSunEngineCachesForTests } from '@/lib/services/sun-engine-cache';
import type { StoredVenue } from '@/lib/services/venue-store';
import type { WeatherSlice } from '@/lib/solar/types';

// `GetForecast` (the getForecastOverride shape) is a private type in sun-engine;
// mirror its signature locally rather than importing the un-exported type.
type GetForecastOverride = (lat?: number, lng?: number) => Promise<WeatherSlice[]>;

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
    weatherGateState: 'not_gated',
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
// 1. skyConditionFromCloudCover — the AC2 unknown branch (pure mapper)
// ---------------------------------------------------------------------------
describe('[10.1 AC2] skyConditionFromCloudCover unknown branch', () => {
  it('maps UNKNOWN cover (undefined) to "unavailable", never "clear"', () => {
    // Task 2: absent cloud data must never fabricate a clear sky. The existing
    // pure-mapper test only covers the numeric 0..100 boundaries.
    expect(skyConditionFromCloudCover(undefined)).toBe('unavailable');
    expect(skyConditionFromCloudCover(undefined)).not.toBe('clear');
  });

  it('still maps a KNOWN 0 to "clear" (undefined and 0 are distinct — the whole point of AC2)', () => {
    // Guards against a regression that would collapse undefined back onto 0.
    expect(skyConditionFromCloudCover(0)).toBe('clear');
    expect(skyConditionFromCloudCover(undefined)).not.toBe(skyConditionFromCloudCover(0));
  });
});

// ---------------------------------------------------------------------------
// 2. applyCloudGate — residual branches the ATDD did not drive
// ---------------------------------------------------------------------------
describe('[10.1 AC1] applyCloudGate residual branches', () => {
  it('is idempotent: a CloudObscured input under overcast stays CloudObscured (never double-gates or resets)', () => {
    // The helper documents "already gated stays gated"; the ATDD asserts the
    // Sunny/Partial ⇒ CloudObscured transition but never re-feeds CloudObscured.
    expect(applyCloudGate('CloudObscured', true, 100)).toBe('CloudObscured');
  });

  it('leaves an already-gated CloudObscured untouched even when cloud drops below threshold', () => {
    // The gate is a pure function of the CURRENT inputs; a CloudObscured status
    // fed with clear cloud passes through unchanged (it does not un-gate to Sunny),
    // because un-gating is the caller's job on a fresh geometric classify.
    expect(applyCloudGate('CloudObscured', true, 0)).toBe('CloudObscured');
    expect(applyCloudGate('CloudObscured', true, undefined)).toBe('CloudObscured');
  });

  it('leaves Partial unchanged when cloud is below the threshold (mirrors the Sunny-below case)', () => {
    // The ATDD only asserts Sunny-below-threshold; Partial is the other geometrically
    // sunlit tier and must behave identically below the gate.
    expect(applyCloudGate('Partial', true, CLOUD_GATE_THRESHOLD_PERCENT - 0.1)).toBe('Partial');
    expect(applyCloudGate('Partial', true, 0)).toBe('Partial');
  });

  it('gates on defensively out-of-range cover (>100 still clears the >= threshold)', () => {
    // The gate condition is `cover >= THRESHOLD`; a sensor glitch of 120 must still
    // gate (it is not < threshold), and must not throw.
    expect(applyCloudGate('Sunny', true, 120)).toBe('CloudObscured');
  });

  it('does NOT gate on a negative cover reading (a glitch below 0 is below threshold, treated as un-gated)', () => {
    expect(applyCloudGate('Sunny', true, -5)).toBe('Sunny');
  });
});

// ---------------------------------------------------------------------------
// 3. End-to-end FORECAST gating (Story 10.1 Dev Notes: forecast cloud DOES gate)
// ---------------------------------------------------------------------------
describe('[10.1 AC1] overcast FORECAST slice still gates the headline (10.4 seam)', () => {
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

  it('an overcast slice flagged isForecast:true gates to CloudObscured (no special-casing of forecasts)', async () => {
    // Story 10.1 explicitly does NOT special-case forecast cloud — gating on a
    // forecast slice is correct and intended; Story 10.4 owns the future-nowcast
    // carve-out. Inject via getForecastOverride, the documented seam.
    const forecastOvercast: GetForecastOverride = async () => [
      weatherSlice({ cloudCover: 95, isForecast: true }),
    ];

    const outcome = await applyRealSunEngine(
      makeStoredVenue(),
      SUMMER_MIDDAY,
      SUMMER_MIDDAY,
      forecastOvercast,
    );

    expect(outcome.venue.currentSunStatus).toBe('CloudObscured');
    // The geometric layer is still preserved under a forecast-driven gate.
    expect(outcome.venue.sunExposurePercent).toBe(100);
  }, 10_000);

  it('a CLEAR forecast slice does not gate (forecast path is not blanket-pessimistic)', async () => {
    const forecastClear: GetForecastOverride = async () => [
      weatherSlice({ cloudCover: 5, isForecast: true }),
    ];

    const outcome = await applyRealSunEngine(
      makeStoredVenue(),
      SUMMER_MIDDAY,
      SUMMER_MIDDAY,
      forecastClear,
    );

    expect(outcome.venue.currentSunStatus).toBe('Sunny');
  });
});
