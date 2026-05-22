import { describe, expect, it } from 'vitest';
import {
  clampPlannerMinutes,
  formatDateForUrl,
  formatPlannerTime,
  generatePlannerTicks,
  isTodayInStockholm,
  parsePlannerTime,
  snapPlannerMinutes,
  stockholmDateKey,
  sunSeasonBounds,
  validatePlannerDateTime,
} from '@/lib/utils/time-planner';

describe('time planner helpers', () => {
  const now = new Date('2026-05-20T10:15:00.000Z');

  it('normalizes dates in Europe/Stockholm instead of the host timezone', () => {
    expect(stockholmDateKey(new Date('2026-05-20T22:30:00.000Z'))).toBe('2026-05-21');
    expect(formatDateForUrl(new Date('2026-06-14T10:00:00.000Z'))).toBe('2026-06-14');
  });

  it('formats and parses 24-hour planner times deterministically', () => {
    expect(formatPlannerTime(6 * 60)).toBe('06:00');
    expect(formatPlannerTime(15 * 60 + 30)).toBe('15:30');
    expect(parsePlannerTime('15:30')).toBe(15 * 60 + 30);
    expect(parsePlannerTime('25:00')).toBeNull();
    expect(parsePlannerTime('14:00\n')).toBeNull();
  });

  it('generates visible planner ticks and snaps slider values to 15-minute marks', () => {
    expect(generatePlannerTicks().map((tick) => tick.label)).toEqual([
      '06:00',
      '09:00',
      '12:00',
      '15:00',
      '18:00',
      '21:00',
    ]);
    expect(snapPlannerMinutes(13 * 60 + 7)).toBe(13 * 60);
    expect(snapPlannerMinutes(13 * 60 + 8)).toBe(13 * 60 + 15);
    expect(clampPlannerMinutes(2 * 60)).toBe(6 * 60);
    expect(clampPlannerMinutes(23 * 60)).toBe(21 * 60);
  });

  it('calculates the current Gothenburg sun season and today label semantics', () => {
    expect(sunSeasonBounds(now)).toEqual({
      start: '2026-03-01',
      end: '2026-10-31',
    });
    expect(isTodayInStockholm('2026-05-20', now)).toBe(true);
    expect(isTodayInStockholm('2026-05-21', now)).toBe(false);
  });

  it('validates URL-safe planner date/time values and rejects out-of-season dates', () => {
    expect(validatePlannerDateTime({ date: '2026-06-14', time: '14:00', now })).toEqual({
      ok: true,
      date: '2026-06-14',
      time: '14:00',
    });
    expect(validatePlannerDateTime({ date: '2026-11-01', time: '14:00', now })).toEqual({
      ok: false,
      reason: 'out-of-season',
    });
    expect(validatePlannerDateTime({ date: '2026-06-14', time: '14:00\u0000', now })).toEqual({
      ok: false,
      reason: 'invalid-time',
    });
    expect(validatePlannerDateTime({ date: '2026-6-14', time: '14:00', now })).toEqual({
      ok: false,
      reason: 'invalid-date',
    });
  });
});
