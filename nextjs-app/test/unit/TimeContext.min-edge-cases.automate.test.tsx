/**
 * COVERAGE-EXPANSION (`*automate`) — Story 11.2 TimeContext today-min edge paths.
 *
 * GREEN (post-implementation) state tests for the `minMinutes` derivation branches the
 * ATDD scaffold (`TimeContext.today-window-min.atdd.test.tsx`) left open. The ATDD proves
 * the live-today min + its tick-advance + the future-date full range; these cover:
 *   - a FORCED `?_time=` session on today exposes `minMinutes = PLANNER_START` (forced
 *     sessions disable the "can't pick earlier than now" affordance so a forced time
 *     renders verbatim regardless of the machine wall clock — the code's stated contract).
 *   - a `now` BEFORE the planner start (early morning) floors/clamps the effective min to
 *     PLANNER_START (`todayMinMinutes` → clampPlannerMinutes).
 *   - a live-clock tick where the selected date has scrolled OUT of the window resets to
 *     now (`!isPlannerDateSelectable → stateFromNow`) rather than keeping a stale date.
 *
 * Deterministic under vitest fake timers + an injected `clock`. No wall-clock latency.
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { TimeProvider, useTimeContext } from '@/lib/contexts/TimeContext';
import { PLANNER_START_MINUTES, snapPlannerMinutes } from '@/lib/utils/time-planner';

// 12:15 Stockholm (summer, UTC+2) on 2026-06-14.
const NOW_ISO = '2026-06-14T10:15:00.000Z';
const NOW = new Date(NOW_ISO);

function makeWrapper(clock: () => Date, forced?: { date?: string; time?: string }) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <TimeProvider
        initialNowIso={NOW_ISO}
        clock={clock}
        forcedDate={forced?.date}
        forcedTime={forced?.time}
      >
        {children}
      </TimeProvider>
    );
  };
}

describe('[11.2 automate] TimeContext minMinutes — forced session disables the today-min', () => {
  afterEach(() => vi.useRealTimers());

  it('exposes the planner START (full range) on a forced ?_time= session even on today', () => {
    // A forced 10:00 on today would normally clamp the min to ~12:15 (live now), but a
    // forced session pins a deterministic moment and disables the live-min affordance so
    // the forced time renders verbatim. minMinutes must therefore be the planner start.
    const { result } = renderHook(() => useTimeContext(), {
      wrapper: makeWrapper(() => NOW, { time: '10:00' }),
    });
    expect(result.current.mode).toBe('today');
    expect(result.current.selectedTime).toBe('10:00'); // forced time honoured verbatim
    expect(result.current.minMinutes).toBe(PLANNER_START_MINUTES);
  });
});

describe('[11.2 automate] TimeContext — a below-min commit is floored IN STATE (AC4 "enforced in state too")', () => {
  afterEach(() => vi.useRealTimers());

  it('floors a direct setSelectedMinutes(below the today-min) up to the effective min on live today', () => {
    // NOW = 12:15 Stockholm → the effective today-min = 12:15 (floored to the step).
    // AC4 says earlier positions are "unreachable … enforced in state too": a direct
    // programmatic setSelectedMinutes(09:00) must be floored to the min, not seated
    // below it (the component clamp is not the only guard).
    const { result } = renderHook(() => useTimeContext(), {
      wrapper: makeWrapper(() => NOW),
    });
    const min = snapPlannerMinutes(12 * 60 + 15);
    expect(result.current.mode).toBe('today');

    act(() => result.current.setSelectedMinutes(9 * 60)); // 09:00 → below the 12:15 min
    expect(result.current.selectedMinutes).toBe(min);
    expect(result.current.selectedMinutes).toBeGreaterThanOrEqual(result.current.minMinutes);
  });

  it('floors a below-min snapSelectedMinutes(...) in state too', () => {
    const { result } = renderHook(() => useTimeContext(), {
      wrapper: makeWrapper(() => NOW),
    });
    const min = snapPlannerMinutes(12 * 60 + 15);

    act(() => result.current.snapSelectedMinutes(8 * 60)); // 08:00 → below min
    expect(result.current.selectedMinutes).toBe(min);
  });

  it('does NOT floor an at/above-min commit — the live "now" moment stays reachable', () => {
    const { result } = renderHook(() => useTimeContext(), {
      wrapper: makeWrapper(() => NOW),
    });
    act(() => result.current.setSelectedMinutes(14 * 60)); // 14:00 → above min, kept verbatim
    expect(result.current.selectedMinutes).toBe(14 * 60);
  });

  it('does NOT floor a below-"now" commit in a FORCED session (the forced min is the planner start)', () => {
    // A forced ?_time= session disables the live-min affordance, so a below-"now"
    // commit is honoured verbatim — the state floor must respect the same opt-out
    // the derived minMinutes uses.
    const { result } = renderHook(() => useTimeContext(), {
      wrapper: makeWrapper(() => NOW, { time: '13:00' }),
    });
    expect(result.current.minMinutes).toBe(PLANNER_START_MINUTES);
    act(() => result.current.setSelectedMinutes(9 * 60)); // 09:00 → honoured (no live min)
    expect(result.current.selectedMinutes).toBe(9 * 60);
  });

  it('does NOT floor a below-planner-start-of-today commit on a FUTURE date (full range)', () => {
    const { result } = renderHook(() => useTimeContext(), {
      wrapper: makeWrapper(() => NOW),
    });
    act(() => {
      expect(result.current.selectDate('2026-06-16')).toBe(true); // today+2 → future
    });
    expect(result.current.mode).toBe('future');
    act(() => result.current.setSelectedMinutes(9 * 60)); // 09:00 → full range on a future date
    expect(result.current.selectedMinutes).toBe(9 * 60);
  });
});

describe('[11.2 automate] TimeContext minMinutes — a pre-06:00 now clamps the min to the planner start', () => {
  afterEach(() => vi.useRealTimers());

  it('floors/clamps an early-morning wall clock to the planner start (never below the range)', () => {
    // 03:00Z on 2026-06-14 is 05:00 Stockholm (UTC+2) — before the 06:00 planner start.
    // The floored min (04:45) clamps UP to PLANNER_START so the slider min is never
    // below the planner range.
    const earlyIso = '2026-06-14T03:00:00.000Z';
    const early = new Date(earlyIso);
    const { result } = renderHook(() => useTimeContext(), {
      wrapper: function Wrapper({ children }: { children: ReactNode }) {
        return (
          <TimeProvider initialNowIso={earlyIso} clock={() => early}>
            {children}
          </TimeProvider>
        );
      },
    });
    expect(result.current.mode).toBe('today');
    expect(result.current.minMinutes).toBe(PLANNER_START_MINUTES);
  });
});

describe('[11.2 automate] TimeContext — a tick where the selected date scrolled out of the window resets to now', () => {
  afterEach(() => vi.useRealTimers());

  it('resets an explicit future selection to now once the wall clock advances past it', () => {
    vi.useFakeTimers();
    let now = NOW; // 2026-06-14
    const clock = () => now;
    const { result } = renderHook(() => useTimeContext(), { wrapper: makeWrapper(clock) });

    // Pick today+3 (the last in-window day) as an explicit future selection.
    act(() => {
      expect(result.current.selectDate('2026-06-17')).toBe(true);
    });
    expect(result.current.mode).toBe('future');
    expect(result.current.selectedDate).toBe('2026-06-17');

    // Advance the wall clock 5 days so 2026-06-17 is now in the PAST → out of window.
    now = new Date('2026-06-19T10:15:00.000Z');
    act(() => {
      vi.advanceTimersByTime(60 * 1000);
    });

    // The tick effect detects the selected date is no longer selectable and resets to now.
    expect(result.current.selectedDate).toBe('2026-06-19');
    expect(result.current.mode).toBe('today');
  });
});
