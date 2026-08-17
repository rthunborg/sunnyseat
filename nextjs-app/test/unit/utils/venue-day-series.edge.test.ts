/**
 * COVERAGE EXPANSION — Story 11.1 (AC1, Task 4)
 * `lib/utils/venue-day-series.ts` — the null-return / fallback branches the
 * green ATDD scaffold (`venue-day-series.derivation.atdd.test.ts`) left open.
 *
 * The ATDD suite wraps `deriveVenueSunAtMinutes` so a `null` result THROWS
 * (its fixtures always contain the queried step), which means the helper's
 * documented fallback contract — "returns `null` when the series is empty/absent
 * or has no entry for the snapped step, so the caller can fall back to the
 * server's single-instant fields" — is never asserted. That fallback is
 * load-bearing: MapView's `applyDaySeriesDerivation` returns the venue UNCHANGED
 * on `null` (keeping the server single-instant fields), so a broken null branch
 * would silently corrupt every seed-path / partial-series venue. These tests pin
 * the branches plus the snapping + planner-boundary behaviour.
 *
 * Pure, offline, deterministic — no network, no timers.
 */

import { describe, expect, it } from 'vitest';
import { deriveVenueSunAtMinutes } from '@/lib/utils/venue-day-series';
import {
  PLANNER_START_MINUTES,
  PLANNER_END_MINUTES,
  PLANNER_STEP_MINUTES,
} from '@/lib/utils/time-planner';
import type { VenueDaySeriesEntry } from '@/lib/types/api';

/** A full 61-entry planner-range series with a per-step % arc. */
function fullSeries(): VenueDaySeriesEntry[] {
  const series: VenueDaySeriesEntry[] = [];
  for (let m = PLANNER_START_MINUTES; m <= PLANNER_END_MINUTES; m += PLANNER_STEP_MINUTES) {
    series.push({
      minutes: m,
      sunExposurePercent: (m / 15) % 100,
      currentSunStatus: 'Partial',
      weatherGateState: 'not_gated',
    });
  }
  return series;
}

describe('Story 11.1 — deriveVenueSunAtMinutes null/fallback branches', () => {
  // The caller (applyDaySeriesDerivation) treats `null` as "no series → keep the
  // server single-instant fields". These are the untested inputs that MUST yield
  // `null` so that fallback fires.

  it('returns null for an undefined series (seed/fixture-path venue)', () => {
    expect(deriveVenueSunAtMinutes(undefined, 13 * 60)).toBeNull();
  });

  it('returns null for an empty series array', () => {
    expect(deriveVenueSunAtMinutes([], 13 * 60)).toBeNull();
  });

  it('returns null for a non-array passed as series (defensive)', () => {
    // The route degrade path omits the field, but a malformed payload must not
    // throw — the `Array.isArray` guard returns null so the caller falls back.
    expect(
      deriveVenueSunAtMinutes({ length: 1 } as unknown as VenueDaySeriesEntry[], 13 * 60),
    ).toBeNull();
  });

  it('returns null when the snapped step has no matching entry (sparse series)', () => {
    // A series missing the 13:00 step (e.g. a truncated/partial payload) — the
    // exact-match lookup finds nothing and returns null rather than a wrong
    // neighbouring step.
    const sparse: VenueDaySeriesEntry[] = [
      {
        minutes: 12 * 60,
        sunExposurePercent: 90,
        currentSunStatus: 'Sunny',
        weatherGateState: 'not_gated',
      },
      {
        minutes: 14 * 60,
        sunExposurePercent: 40,
        currentSunStatus: 'Shaded',
        weatherGateState: 'not_gated',
      },
    ];
    expect(deriveVenueSunAtMinutes(sparse, 13 * 60)).toBeNull();
  });
});

describe('Story 11 (review) — deriveVenueSunAtMinutes carries the per-step skyCondition', () => {
  it('returns the entry`s skyCondition so a scrub can track the obscured sub-line', () => {
    // The obscured sky sub-line must follow the scrub, not freeze at the server
    // single-instant. The derived value carries the per-step gated sky condition.
    const series: VenueDaySeriesEntry[] = [
      {
        minutes: 13 * 60,
        sunExposurePercent: 80,
        currentSunStatus: 'Sunny',
        weatherGateState: 'gated',
        skyCondition: 'clear',
      },
      {
        minutes: 14 * 60,
        sunExposurePercent: 10,
        currentSunStatus: 'CloudObscured',
        weatherGateState: 'not_gated',
        skyCondition: 'overcast',
      },
    ];
    expect(deriveVenueSunAtMinutes(series, 13 * 60)?.skyCondition).toBe('clear');
    expect(deriveVenueSunAtMinutes(series, 14 * 60)?.skyCondition).toBe('overcast');
  });

  it('yields skyCondition undefined for a legacy series entry without the field (backward-compatible)', () => {
    // A series predating the field: derivation still resolves; skyCondition is
    // undefined so the caller leaves the venue`s server value untouched.
    const legacy: VenueDaySeriesEntry[] = [
      {
        minutes: 13 * 60,
        sunExposurePercent: 50,
        currentSunStatus: 'Partial',
        weatherGateState: 'not_gated',
      },
    ];
    const derived = deriveVenueSunAtMinutes(legacy, 13 * 60);
    expect(derived).not.toBeNull();
    expect(derived?.skyCondition).toBeUndefined();
  });
});

describe('Story 11.1 — deriveVenueSunAtMinutes snapping + boundary behaviour', () => {
  const series = fullSeries();

  it('snaps an unsnapped input to the nearest 15-min step before lookup', () => {
    // 13:07 snaps to 13:00; 13:08 snaps to 13:15. The helper snaps internally so a
    // raw (unsnapped) minutes value still resolves to a real entry.
    const at1307 = deriveVenueSunAtMinutes(series, 13 * 60 + 7);
    const at1300 = deriveVenueSunAtMinutes(series, 13 * 60);
    expect(at1307).not.toBeNull();
    expect(at1307).toEqual(at1300);

    const at1308 = deriveVenueSunAtMinutes(series, 13 * 60 + 8);
    const at1315 = deriveVenueSunAtMinutes(series, 13 * 60 + 15);
    expect(at1308).toEqual(at1315);
  });

  it('resolves the exact planner-range boundaries (06:00 and 21:00)', () => {
    // The first and last steps must be reachable — a snap that clamped 21:00 past
    // the end (or 06:00 below the start) would drop the boundary entry.
    expect(deriveVenueSunAtMinutes(series, PLANNER_START_MINUTES)).not.toBeNull();
    expect(deriveVenueSunAtMinutes(series, PLANNER_END_MINUTES)).not.toBeNull();
  });

  it('clamps an out-of-range input into the planner range (never null from clamp)', () => {
    // Below 06:00 clamps up to the first step; above 21:00 clamps down to the last
    // step — snapPlannerMinutes clamps, so these resolve, not return null.
    expect(deriveVenueSunAtMinutes(series, 0)).toEqual(
      deriveVenueSunAtMinutes(series, PLANNER_START_MINUTES),
    );
    expect(deriveVenueSunAtMinutes(series, 24 * 60)).toEqual(
      deriveVenueSunAtMinutes(series, PLANNER_END_MINUTES),
    );
  });

  it('handles a non-finite selectedMinutes without throwing (clamps to start)', () => {
    // clampPlannerMinutes maps NaN → PLANNER_START_MINUTES, so a NaN scrub value
    // resolves to the first step rather than throwing or returning null.
    expect(deriveVenueSunAtMinutes(series, Number.NaN)).toEqual(
      deriveVenueSunAtMinutes(series, PLANNER_START_MINUTES),
    );
  });
});
