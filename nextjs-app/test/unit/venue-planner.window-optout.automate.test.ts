/**
 * COVERAGE-EXPANSION (`*automate`) — Story 11.2 server-route window opt-out.
 *
 * GREEN (post-implementation) tests for `parseVenuePlannerParams`, which the API
 * route uses to interpret `?date=&?time=`. Story 11.2 wired the route to opt OUT of
 * the today→today+3 window (`validatePlannerDateTime({ enforceWindow: false })`) so a
 * stale/far-future forecast BOOKMARK keeps working (up to the season edge) rather than
 * 400-ing merely for being beyond the picker window. The window clamp is a client/state
 * concern (covered at TimeContext/DatePickerDialog level); this covers the SERVER seam.
 *
 * Gap: neither the ATDD nor the existing `venue-planner.test.ts` (which only exercises
 * `applyPlannerSelectionToVenue`) touches `parseVenuePlannerParams` or the opt-out.
 *
 * Deterministic: fixed `now`. No live Met.no, no browser.
 */

import { describe, expect, it } from 'vitest';
import { parseVenuePlannerParams } from '@/lib/services/venue-planner';

// today = 2026-05-20 (in season, summer); window end = 2026-05-23.
const NOW = new Date('2026-05-20T10:15:00.000Z');

function params(entries: Array<[string, string]>): URLSearchParams {
  return new URLSearchParams(entries);
}

describe('[11.2 automate] parseVenuePlannerParams — route opts out of the today→today+3 window', () => {
  it('returns an empty selection when neither date nor time is present', () => {
    expect(parseVenuePlannerParams(params([]), NOW)).toEqual({ ok: true, selection: undefined });
  });

  it('accepts a far-future in-season date BEYOND today+3 (the forecast-bookmark seam)', () => {
    // 2026-05-31 is today+11 — out of the client window but in season. The route must
    // serve it (NOT reject out-of-window), marking it a future date.
    const result = parseVenuePlannerParams(params([['date', '2026-05-31'], ['time', '14:00']]), NOW);
    expect(result).toEqual({
      ok: true,
      selection: { date: '2026-05-31', time: '14:00', isFutureDate: true },
    });
  });

  it('marks a today selection as not-future', () => {
    const result = parseVenuePlannerParams(params([['date', '2026-05-20'], ['time', '14:00']]), NOW);
    expect(result).toEqual({
      ok: true,
      selection: { date: '2026-05-20', time: '14:00', isFutureDate: false },
    });
  });

  it('still rejects out-of-season and past dates despite the window opt-out', () => {
    expect(parseVenuePlannerParams(params([['date', '2026-11-05'], ['time', '14:00']]), NOW)).toEqual({
      ok: false,
      detail: 'Planner date must be within the current sun season',
    });
    expect(parseVenuePlannerParams(params([['date', '2026-05-19'], ['time', '14:00']]), NOW)).toEqual({
      ok: false,
      detail: 'Planner date cannot be in the past',
    });
  });

  it('rejects malformed date/time with the matching detail message', () => {
    expect(parseVenuePlannerParams(params([['date', '2026-5-20'], ['time', '14:00']]), NOW)).toEqual({
      ok: false,
      detail: 'Invalid planner date',
    });
    expect(parseVenuePlannerParams(params([['date', '2026-05-20'], ['time', '25:00']]), NOW)).toEqual({
      ok: false,
      detail: 'Invalid planner time',
    });
  });

  it('rejects duplicated or half-supplied planner params', () => {
    // Two dates, one time.
    const dup = new URLSearchParams();
    dup.append('date', '2026-05-20');
    dup.append('date', '2026-05-21');
    dup.append('time', '14:00');
    expect(parseVenuePlannerParams(dup, NOW)).toEqual({
      ok: false,
      detail: 'Use a single date and a single time parameter together',
    });
    // Date without time.
    expect(parseVenuePlannerParams(params([['date', '2026-05-20']]), NOW)).toEqual({
      ok: false,
      detail: 'Use a single date and a single time parameter together',
    });
  });
});
