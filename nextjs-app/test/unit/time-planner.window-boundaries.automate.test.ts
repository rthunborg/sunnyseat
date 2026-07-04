/**
 * COVERAGE-EXPANSION (`*automate`) — Story 11.2 planner range helpers.
 *
 * These are GREEN (post-implementation) tests that cover boundary / precedence /
 * error-path gaps the ATDD red-phase scaffolds (`time-planner.today-window.atdd.test.ts`)
 * and the migrated `time-planner.test.ts` left open:
 *   - `addDaysToDateKey` (new export, no direct test): month/year rollover, month-end,
 *     leap day, negative shift, UTC-anchored (host-timezone-agnostic).
 *   - `plannerWindowBounds` (new export): start=today / end=today+3 identity + rollover.
 *   - `isPlannerDateSelectable` season-floor DOMINANCE at a season edge — the exact edge
 *     the source comment calls out but no test exercises.
 *   - `validatePlannerDateTime` REASON PRECEDENCE when several conditions hold at once +
 *     the `enforceWindow` interaction + boundary times + trim/null handling.
 *
 * Deterministic: every assertion injects a fixed `now`. No wall-clock. No new dependency.
 * Assert behaviour/values, never magic numbers.
 */

import { describe, expect, it } from 'vitest';
import {
  addDaysToDateKey,
  isPlannerDateSelectable,
  PLANNER_END_MINUTES,
  PLANNER_MAX_FUTURE_DAYS,
  PLANNER_START_MINUTES,
  plannerWindowBounds,
  validatePlannerDateTime,
} from '@/lib/utils/time-planner';

describe('[11.2 automate] addDaysToDateKey — UTC-anchored whole-day math', () => {
  it('rolls over month and year boundaries', () => {
    expect(addDaysToDateKey('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDaysToDateKey('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysToDateKey('2026-10-30', 3)).toBe('2026-11-02'); // the season-edge case (see below)
  });

  it('handles the leap day and non-leap February end', () => {
    expect(addDaysToDateKey('2028-02-28', 1)).toBe('2028-02-29'); // 2028 is a leap year
    expect(addDaysToDateKey('2028-02-29', 1)).toBe('2028-03-01');
    expect(addDaysToDateKey('2026-02-28', 1)).toBe('2026-03-01'); // 2026 is not
  });

  it('shifts by zero and by negative days symmetrically', () => {
    expect(addDaysToDateKey('2026-05-20', 0)).toBe('2026-05-20');
    expect(addDaysToDateKey('2026-03-01', -1)).toBe('2026-02-28');
    // round-trip: +3 then -3 returns the original key
    expect(addDaysToDateKey(addDaysToDateKey('2026-06-14', 3), -3)).toBe('2026-06-14');
  });
});

describe('[11.2 automate] plannerWindowBounds — [today, today+PLANNER_MAX_FUTURE_DAYS]', () => {
  it('spans today through today+3 for an in-month now', () => {
    const now = new Date('2026-05-20T10:15:00.000Z');
    expect(plannerWindowBounds(now)).toEqual({ start: '2026-05-20', end: '2026-05-23' });
    // end is exactly PLANNER_MAX_FUTURE_DAYS after start.
    expect(addDaysToDateKey('2026-05-20', PLANNER_MAX_FUTURE_DAYS)).toBe('2026-05-23');
  });

  it('rolls the window end across a month boundary', () => {
    const now = new Date('2026-05-30T10:15:00.000Z');
    expect(plannerWindowBounds(now)).toEqual({ start: '2026-05-30', end: '2026-06-02' });
  });

  it('normalizes the window start in Europe/Stockholm (late-UTC now rolls to the next local day)', () => {
    // 22:30Z on 2026-05-20 is already 2026-05-21 in Stockholm (UTC+2 summer).
    const now = new Date('2026-05-20T22:30:00.000Z');
    expect(plannerWindowBounds(now).start).toBe('2026-05-21');
  });
});

describe('[11.2 automate] isPlannerDateSelectable — season floor DOMINATES near a season edge', () => {
  it('rejects an in-window date that crosses the season edge into out-of-season', () => {
    // now = 2026-10-30 is IN season (season ends 2026-10-31); the 3-day window would
    // otherwise reach 2026-11-02, but the season floor makes anything past 10-31
    // unplannable. This is the code comment's key edge that the ATDD (in-summer now)
    // never reaches.
    const now = new Date('2026-10-30T10:00:00.000Z');
    expect(isPlannerDateSelectable('2026-10-30', now)).toBe(true); // today, in season
    expect(isPlannerDateSelectable('2026-10-31', now)).toBe(true); // +1, last season day
    expect(isPlannerDateSelectable('2026-11-01', now)).toBe(false); // +2, out of season
    expect(isPlannerDateSelectable('2026-11-02', now)).toBe(false); // +3, out of season
  });

  it('treats a wholly out-of-season "today" as unplannable even inside the 3-day window', () => {
    // Deep winter: today itself is out of season, so no date in the window is selectable.
    const now = new Date('2026-01-15T10:00:00.000Z');
    expect(isPlannerDateSelectable('2026-01-15', now)).toBe(false);
    expect(isPlannerDateSelectable('2026-01-18', now)).toBe(false); // +3, still winter
  });

  it('rejects a malformed date key outright', () => {
    const now = new Date('2026-05-20T10:00:00.000Z');
    expect(isPlannerDateSelectable('2026-5-20', now)).toBe(false); // not zero-padded
    expect(isPlannerDateSelectable('2026-13-01', now)).toBe(false); // invalid month
  });
});

describe('[11.2 automate] validatePlannerDateTime — reason precedence + enforceWindow interaction', () => {
  const now = new Date('2026-05-20T10:15:00.000Z'); // today = 2026-05-20, window end = 2026-05-23

  it('short-circuits on invalid date/time BEFORE any season/window/past check', () => {
    // A far-past, out-of-season, malformed date still reports invalid-date first.
    expect(validatePlannerDateTime({ date: '2020-13-99', time: '14:00', now })).toEqual({
      ok: false,
      reason: 'invalid-date',
    });
    // A valid past date with a malformed time reports invalid-time before past-date.
    expect(validatePlannerDateTime({ date: '2026-05-19', time: '99:99', now })).toEqual({
      ok: false,
      reason: 'invalid-time',
    });
  });

  it('reports out-of-season before past-date, and past-date before out-of-window', () => {
    // Out-of-season wins over past-date (a past winter date is out-of-season first).
    expect(validatePlannerDateTime({ date: '2026-01-10', time: '14:00', now })).toEqual({
      ok: false,
      reason: 'out-of-season',
    });
    // In-season past date → past-date.
    expect(validatePlannerDateTime({ date: '2026-05-19', time: '14:00', now })).toEqual({
      ok: false,
      reason: 'past-date',
    });
    // A future, in-season, beyond-window date → out-of-window (the last check).
    expect(validatePlannerDateTime({ date: '2026-05-24', time: '14:00', now })).toEqual({
      ok: false,
      reason: 'out-of-window',
    });
  });

  it('enforceWindow:false still rejects out-of-season and past dates (opt-out is window-only)', () => {
    // The server route opts out of the WINDOW but not the season/past guards.
    expect(
      validatePlannerDateTime({ date: '2026-05-24', time: '14:00', now, enforceWindow: false }),
    ).toEqual({ ok: true, date: '2026-05-24', time: '14:00' }); // beyond window, but allowed
    expect(
      validatePlannerDateTime({ date: '2026-11-05', time: '14:00', now, enforceWindow: false }),
    ).toEqual({ ok: false, reason: 'out-of-season' });
    expect(
      validatePlannerDateTime({ date: '2026-05-19', time: '14:00', now, enforceWindow: false }),
    ).toEqual({ ok: false, reason: 'past-date' });
  });

  it('accepts the exact planner-hour boundaries and rejects one minute outside', () => {
    expect(validatePlannerDateTime({ date: '2026-05-20', time: '06:00', now }).ok).toBe(true);
    expect(validatePlannerDateTime({ date: '2026-05-20', time: '21:00', now }).ok).toBe(true);
    // 05:59 is below PLANNER_START; 21:01 is above PLANNER_END → invalid-time.
    expect(validatePlannerDateTime({ date: '2026-05-20', time: '05:59', now })).toEqual({
      ok: false,
      reason: 'invalid-time',
    });
    expect(validatePlannerDateTime({ date: '2026-05-20', time: '21:01', now })).toEqual({
      ok: false,
      reason: 'invalid-time',
    });
    // Sanity: the boundaries match the exported constants (behaviour, not a magic number).
    expect(PLANNER_START_MINUTES).toBe(6 * 60);
    expect(PLANNER_END_MINUTES).toBe(21 * 60);
  });

  it('trims surrounding whitespace and treats null/undefined date as invalid-date', () => {
    expect(validatePlannerDateTime({ date: '  2026-05-20  ', time: ' 14:00 ', now })).toEqual({
      ok: true,
      date: '2026-05-20',
      time: '14:00',
    });
    expect(validatePlannerDateTime({ date: null, time: '14:00', now })).toEqual({
      ok: false,
      reason: 'invalid-date',
    });
    expect(validatePlannerDateTime({ date: undefined, time: undefined, now })).toEqual({
      ok: false,
      reason: 'invalid-date',
    });
  });
});
