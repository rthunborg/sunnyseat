/**
 * Shared planner→venue-query derivation (external-review fix, PR #17).
 *
 * The R-001 zero-fetch invariant is proven by TWO seams that MUST stay in
 * lock-step: the CALLER-side args shape (`venuePlannerQueryArgs`) and the
 * HOOK-side key fragment (`deriveQueryKeyPlanner`). This file pins both, and
 * — crucially — reproduces the exact defect Codex flagged: a caller that omits
 * `isLiveNow` (spreading the raw `plannerQuery`, undefined on live-today) landed
 * on the `list` key on live-today and flipped to the `planner` key on the first
 * scrub away from live, firing a hidden second /api/venues request mid-scrub.
 * With the shared helper the two callers (MapView vs DesktopNavBar/VenueSearchShell)
 * are un-divergeable: both stay on ONE date-keyed query across live→scrub.
 */

import { describe, expect, it } from 'vitest';
import {
  deriveQueryKeyPlanner,
  venuePlannerQueryArgs,
  type PlannerQuerySource,
} from '@/lib/utils/venue-query-planner';
import { queryKeys } from '@/lib/query-keys';

const DATE = '2026-06-14';
const COORDS = { lat: 57.7089, lng: 11.9746, radiusKm: 1.5 };

/** The planner context shape on LIVE-today: `plannerQuery` is undefined, but the
 * moment IS live and the selected date/time are present. */
function liveTodaySource(time = '14:00'): PlannerQuerySource {
  return {
    isLiveNow: true,
    plannerQuery: undefined,
    selectedDate: DATE,
    selectedTime: time,
  };
}

/** The planner context shape on an OFF-LIVE same-date selection (a scrub away
 * from the live moment): `plannerQuery` is now concrete and isLiveNow is false. */
function offLiveTodaySource(time: string): PlannerQuerySource {
  return {
    isLiveNow: false,
    plannerQuery: { date: DATE, time },
    selectedDate: DATE,
    selectedTime: time,
  };
}

describe('venuePlannerQueryArgs — shared caller-side derivation', () => {
  it('live-today emits { date, time, isLiveNow: true } (date PRESENT even when plannerQuery is undefined)', () => {
    expect(venuePlannerQueryArgs(liveTodaySource('14:00'))).toEqual({
      date: DATE,
      time: '14:00',
      isLiveNow: true,
    });
  });

  it('off-live same-date emits { date, time, isLiveNow: false }', () => {
    expect(venuePlannerQueryArgs(offLiveTodaySource('17:30'))).toEqual({
      date: DATE,
      time: '17:30',
      isLiveNow: false,
    });
  });

  it('an invalid/out-of-range non-live date (no plannerQuery, not live) emits undefined (plain live/list key)', () => {
    expect(
      venuePlannerQueryArgs({
        isLiveNow: false,
        plannerQuery: undefined,
        selectedDate: DATE,
        selectedTime: '14:00',
      }),
    ).toBeUndefined();
  });

  it('THE HEADLINE: a caller omitting isLiveNow stays on ONE date-keyed query across live → scrub', () => {
    // Build the query key EXACTLY as the hook does (deriveQueryKeyPlanner on the
    // args.date), for both the live and the scrubbed-away planner states.
    function keyFor(source: PlannerQuerySource) {
      const args = venuePlannerQueryArgs(source);
      const keyPlanner = deriveQueryKeyPlanner(args?.date);
      const filters = { ...COORDS, ...keyPlanner };
      return keyPlanner
        ? queryKeys.venues.planner(filters)
        : queryKeys.venues.list(filters);
    }

    const liveKey = keyFor(liveTodaySource('14:00'));
    const scrubbedKey = keyFor(offLiveTodaySource('17:30'));

    // Same date → byte-identical key across the live→scrub transition. Before the
    // fix, live-today produced a `list` key (plannerQuery undefined) and the scrub
    // produced a `planner` key — a key FLIP that fired a hidden fetch.
    expect(liveKey).toEqual(scrubbedKey);
    // And both are the DATE-keyed planner key (never the date-less list key).
    expect(liveKey).toEqual(
      queryKeys.venues.planner({ ...COORDS, date: DATE }),
    );
    // The TIME is never in the key (the scrub changed 14:00 → 17:30 with no key change).
    expect(JSON.stringify(liveKey)).not.toContain('17:30');
    expect(JSON.stringify(liveKey)).not.toContain('14:00');
  });
});

describe('deriveQueryKeyPlanner — shared hook-side key fragment', () => {
  it('returns { date } when a date is present (never includes time)', () => {
    expect(deriveQueryKeyPlanner(DATE)).toEqual({ date: DATE });
  });

  it('returns undefined for no date (the plain live/list key)', () => {
    expect(deriveQueryKeyPlanner(undefined)).toBeUndefined();
  });
});
