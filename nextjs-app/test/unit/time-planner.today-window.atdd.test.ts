/**
 * ATDD RED-PHASE acceptance scaffolds — Story 11.2 (AC3)
 * "Planner date window = today → today+3 (in the shared helper + validator)"
 *
 * =========================================================================
 * WHAT THIS SPEC IS
 * =========================================================================
 * The unit contract for the maintainer decision (2026-07-04 workshop): "dates
 * selectable only today→today+3". It REPLACES the current season-based upper bound
 * (`isDateInCurrentSunSeason` → Mar 1–Oct 31) with a fixed 4-day window
 * (today, +1, +2, +3) exposed via a new `PLANNER_MAX_FUTURE_DAYS = 3` constant, and
 * keeps `validatePlannerDateTime` coherent (a beyond-window date is rejected, not 500).
 *
 * Signals are pure boolean/enum returns from `isPlannerDateSelectable` /
 * `validatePlannerDateTime` at the window BOUNDARIES (today, +3, +4, yesterday) —
 * deterministic, no clock reads (a fixed `now` is injected). (test-design R-007,
 * "boundary at now + the future edge".)
 *
 * =========================================================================
 * RED PHASE — why every block is `.skip`-ed
 * =========================================================================
 * Against the current tree these FAIL:
 *   - `PLANNER_MAX_FUTURE_DAYS` does not exist yet (imported below via an untyped
 *     re-import shim so the `.skip`-ed file still type-checks);
 *   - `isPlannerDateSelectable('<today+4>')` currently returns TRUE (in-season) — the
 *     3-day cap is not yet enforced;
 *   - `validatePlannerDateTime` returns `out-of-season` only for a season edge, not for
 *     a beyond-today+3 date inside the season.
 * Un-skip when Task 3 lands. The existing `time-planner.test.ts` "out-of-season" /
 * "past-date" assertions are MIGRATED to the window semantics IN THAT FILE by the dev
 * (Task 5) — this scaffold adds the NEW window contract; it does not duplicate the
 * existing helper coverage beyond the boundary rows the window introduces.
 */

import { describe, expect, it } from 'vitest';
import {
  isPlannerDateSelectable,
  stockholmDateKey,
  validatePlannerDateTime,
} from '@/lib/utils/time-planner';

// A summer `now` so the season bound never interferes with the window boundaries —
// this isolates the "today→today+3" rule from the surviving season concept.
const NOW = new Date('2026-06-14T10:15:00.000Z');

/** today + n days, as a Stockholm date key. */
function dayKey(now: Date, offsetDays: number): string {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return stockholmDateKey(d);
}

const TODAY = dayKey(NOW, 0);
const PLUS_1 = dayKey(NOW, 1);
const PLUS_2 = dayKey(NOW, 2);
const PLUS_3 = dayKey(NOW, 3);
const PLUS_4 = dayKey(NOW, 4);
const YESTERDAY = dayKey(NOW, -1);

describe.skip('[11.2 AC3] planner date window = today → today+3 (selectability)', () => {
  it('selects today and each of the next three days', () => {
    for (const date of [TODAY, PLUS_1, PLUS_2, PLUS_3]) {
      expect(isPlannerDateSelectable(date, NOW), `${date} should be selectable`).toBe(true);
    }
  });

  it('does NOT select today+4 (one day past the window) or any past date', () => {
    expect(isPlannerDateSelectable(PLUS_4, NOW), 'today+4 is beyond the window').toBe(false);
    expect(isPlannerDateSelectable(YESTERDAY, NOW), 'past dates stay unselectable').toBe(false);
  });

  it('pins the window width to a named PLANNER_MAX_FUTURE_DAYS = 3 constant', async () => {
    // Task 3 must add this constant (no magic number). Imported dynamically so this
    // `.skip`-ed file type-checks before the export exists.
    const planner = (await import('@/lib/utils/time-planner')) as unknown as {
      PLANNER_MAX_FUTURE_DAYS?: number;
    };
    expect(planner.PLANNER_MAX_FUTURE_DAYS).toBe(3);
    // The last selectable day is exactly today + PLANNER_MAX_FUTURE_DAYS.
    expect(isPlannerDateSelectable(dayKey(NOW, planner.PLANNER_MAX_FUTURE_DAYS ?? 3), NOW)).toBe(true);
    expect(isPlannerDateSelectable(dayKey(NOW, (planner.PLANNER_MAX_FUTURE_DAYS ?? 3) + 1), NOW)).toBe(false);
  });
});

describe.skip('[11.2 AC3] validatePlannerDateTime stays coherent with the window (reject beyond, accept in-window)', () => {
  it('accepts an in-window date/time', () => {
    expect(validatePlannerDateTime({ date: PLUS_2, time: '14:00', now: NOW })).toEqual({
      ok: true,
      date: PLUS_2,
      time: '14:00',
    });
  });

  it('rejects a beyond-window date (today+4) without throwing / 500', () => {
    const result = validatePlannerDateTime({ date: PLUS_4, time: '14:00', now: NOW });
    expect(result.ok).toBe(false);
    // The reason may be `out-of-season` (reused), `past-date`, or a new `out-of-window`
    // reason — the acceptance signal is that a beyond-window date is REJECTED
    // coherently, not the exact string. Assert behaviour, not the magic reason literal.
    if (!result.ok) {
      expect(result.reason).not.toBe('invalid-date');
      expect(result.reason).not.toBe('invalid-time');
    }
  });

  it('still rejects a past date and still validates a well-formed today', () => {
    expect(validatePlannerDateTime({ date: YESTERDAY, time: '14:00', now: NOW }).ok).toBe(false);
    expect(validatePlannerDateTime({ date: TODAY, time: '14:00', now: NOW })).toEqual({
      ok: true,
      date: TODAY,
      time: '14:00',
    });
  });
});
