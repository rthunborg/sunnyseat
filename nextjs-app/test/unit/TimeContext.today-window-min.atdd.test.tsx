/**
 * ATDD RED-PHASE acceptance scaffolds — Story 11.2 (AC3 forced-date clamp + AC4 today-min)
 * "TimeContext: out-of-window forced date clamps; today-minimum advances with the clock"
 *
 * =========================================================================
 * WHAT THIS SPEC IS
 * =========================================================================
 * The STATE-level acceptance facts (test-design R-007: "range rules hold in state"):
 *
 *   - AC3 forced/URL clamp: a `forcedDate` beyond today+3 (or in the past) clamps into
 *     the window in `TimeProvider` state — it must NOT render an out-of-range planner.
 *     Mirrors the existing tick-effect reset (`!isPlannerDateSelectable → stateFromNow`).
 *   - AC4 today-minimum: on `mode==='today'` the context exposes an effective slider
 *     minimum = the snapped current wall-clock time (clamped to the planner range); the
 *     min ADVANCES as the live clock ticks, and a selection that falls below the new min
 *     is pushed up. `mode==='future'` exposes the planner start (full range). The minute
 *     tick advances `currentTime`/the min WITHOUT thrashing the query key (11.1 seam:
 *     the date-only `plannerQuery` must not gain time / must not change on a tick).
 *
 * Signals are the derived context values + `plannerQuery` identity across a tick —
 * deterministic under vitest fake timers (the `TimeContext.test.tsx` pattern). No
 * wall-clock latency.
 *
 * =========================================================================
 * RED PHASE — why every block is `.skip`-ed
 * =========================================================================
 * Against the current tree these FAIL:
 *   - `stateFromForcedPlanner` only checks `isValidDateKey` and does NOT clamp an
 *     out-of-window forced date (Task 3);
 *   - the context exposes NO effective-min value and does not push a below-min selection
 *     up on a tick (Task 4). The effective-min is read via a dynamic property shim
 *     (`minutesMin(...)`) so this `.skip`-ed file type-checks before the field exists.
 * The exact NAME of the exposed field (`effectiveMinMinutes` / `minMinutes` / …) is
 * Task 4's call — the shim probes the plausible names and the assertion is on the VALUE.
 * Un-skip when Tasks 3 + 4 land.
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { TimeProvider, useTimeContext } from '@/lib/contexts/TimeContext';
import { snapPlannerMinutes, PLANNER_START_MINUTES } from '@/lib/utils/time-planner';

// 12:15 Stockholm (summer, UTC+2) on 2026-06-14.
const NOW_ISO = '2026-06-14T10:15:00.000Z';
const NOW = new Date(NOW_ISO);

function makeWrapper(clock: () => Date, forcedDate?: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <TimeProvider initialNowIso={NOW_ISO} clock={clock} forcedDate={forcedDate}>
        {children}
      </TimeProvider>
    );
  };
}

/**
 * Read the effective slider minimum the context exposes for the today-clamp (AC4).
 * The field name is chosen by Task 4; probe the plausible names so this scaffold does
 * not hard-code a name that may differ. Returns `undefined` until Task 4 exposes it
 * (which is the red-phase state).
 */
function minutesMin(ctx: Record<string, unknown>): number | undefined {
  const candidate =
    ctx.effectiveMinMinutes ?? ctx.minMinutes ?? ctx.sliderMinMinutes ?? ctx.minSelectableMinutes;
  return typeof candidate === 'number' ? candidate : undefined;
}

describe.skip('[11.2 AC3] forced/URL date outside today→today+3 clamps into the window', () => {
  afterEach(() => vi.useRealTimers());

  it('clamps a forced date beyond today+3 back into the window (falls back to today)', () => {
    const { result } = renderHook(() => useTimeContext(), {
      wrapper: makeWrapper(() => NOW, '2026-06-30'), // today+16 → out of window
    });
    // Must NOT render the out-of-range date; clamps to today (or the nearest in-window day).
    expect(result.current.selectedDate).toBe('2026-06-14');
  });

  it('clamps a forced PAST date back into the window', () => {
    const { result } = renderHook(() => useTimeContext(), {
      wrapper: makeWrapper(() => NOW, '2026-06-01'), // past → out of window
    });
    expect(result.current.selectedDate).toBe('2026-06-14');
  });

  it('preserves an in-window forced date (today+2) unchanged', () => {
    const { result } = renderHook(() => useTimeContext(), {
      wrapper: makeWrapper(() => NOW, '2026-06-16'), // today+2 → in window
    });
    expect(result.current.selectedDate).toBe('2026-06-16');
    expect(result.current.mode).toBe('future');
  });
});

describe.skip('[11.2 AC4] today-minimum = snapped current wall-clock; advances with the clock; no key thrash', () => {
  afterEach(() => vi.useRealTimers());

  it('exposes the snapped current wall-clock time as the effective slider min on today', () => {
    const { result } = renderHook(() => useTimeContext(), { wrapper: makeWrapper(() => NOW) });

    expect(result.current.mode).toBe('today');
    // 12:15 → snapped up to the 15-min planner step = 12:15 (already on a step).
    const expectedMin = snapPlannerMinutes(12 * 60 + 15);
    expect(minutesMin(result.current as unknown as Record<string, unknown>)).toBe(expectedMin);
  });

  it('advances the effective min past a step boundary on a clock tick and pushes a below-min selection up', () => {
    vi.useFakeTimers();
    let now = new Date('2026-06-14T10:12:00.000Z'); // 12:12 → snaps up to 12:15
    const clock = () => now;
    const { result } = renderHook(() => useTimeContext(), { wrapper: makeWrapper(clock) });

    const minBefore = minutesMin(result.current as unknown as Record<string, unknown>);
    expect(minBefore).toBe(snapPlannerMinutes(12 * 60 + 12)); // 12:15

    // Advance the wall clock past the next 15-min boundary (12:12 → 12:16 → min 12:30).
    now = new Date('2026-06-14T10:16:00.000Z');
    act(() => {
      vi.advanceTimersByTime(60 * 1000);
    });

    const minAfter = minutesMin(result.current as unknown as Record<string, unknown>);
    expect(minAfter).toBeGreaterThan(minBefore ?? 0);
    // The current live selection is never below the advanced min.
    expect(result.current.selectedMinutes).toBeGreaterThanOrEqual(minAfter ?? 0);
  });

  it('does NOT thrash the query key on a minute tick (11.1 seam: date-only key, no time added)', () => {
    vi.useFakeTimers();
    let now = NOW;
    const clock = () => now;
    const { result } = renderHook(() => useTimeContext(), { wrapper: makeWrapper(clock) });

    // Pin an explicit today planner time so a query key EXISTS to compare.
    act(() => result.current.setSelectedTime('14:00'));
    const keyBefore = result.current.plannerQuery;
    expect(keyBefore).toEqual({ date: '2026-06-14', time: '14:00' });

    now = new Date('2026-06-14T10:16:00.000Z');
    act(() => {
      vi.advanceTimersByTime(60 * 1000);
    });

    // The tick advances currentTime/the min — it must NOT change the DATE in the key
    // (the 11.1 date-only key must be stable across a minute tick).
    expect(result.current.plannerQuery?.date).toBe(keyBefore?.date);
  });

  it('exposes the planner START as the effective min on a FUTURE date (full range, no clamp)', () => {
    const { result } = renderHook(() => useTimeContext(), { wrapper: makeWrapper(() => NOW) });

    act(() => {
      expect(result.current.selectDate('2026-06-16')).toBe(true); // today+2 → future
    });
    expect(result.current.mode).toBe('future');
    expect(minutesMin(result.current as unknown as Record<string, unknown>)).toBe(PLANNER_START_MINUTES);
  });
});
