import { describe, it, expect } from 'vitest';
import {
  generateSegments,
  timeToPosition,
  formatTimeLabel,
  getCardTimeRange,
  calculateDuration,
  generateAriaLabel,
} from '@/lib/utils/timeline';
import type { SunWindow } from '@/lib/types/venue';

// Helper: create a SunWindow with Stockholm-equivalent UTC times.
// For simplicity in tests, we assume CET (UTC+1) — January dates.
// minute 600 Stockholm = 10:00 CET = 09:00 UTC
function makeWindow(
  startMinuteStockholm: number,
  endMinuteStockholm: number,
  sunStatus: 'sunny' | 'partial' | 'shaded' = 'sunny',
  skyCondition: 'clear' | 'partly-cloudy' | 'overcast' | 'rain' | 'unavailable' = 'clear'
): SunWindow {
  // Use a January date for CET (UTC+1)
  const startH = Math.floor(startMinuteStockholm / 60);
  const startM = startMinuteStockholm % 60;
  const endH = Math.floor(endMinuteStockholm / 60);
  const endM = endMinuteStockholm % 60;

  // Stockholm = UTC+1 in winter, so subtract 1 hour for UTC
  const start = new Date(Date.UTC(2026, 0, 15, startH - 1, startM));
  const end = new Date(Date.UTC(2026, 0, 15, endH - 1, endM));

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    sun_status: sunStatus,
    sky_condition: skyCondition,
  };
}

describe('generateSegments', () => {
  it('produces correct 10-minute segments from SunWindow array', () => {
    const windows = [makeWindow(600, 720)]; // 10:00–12:00
    const segments = generateSegments(windows, 600, 720);

    // All segments should be sunny (merged into one)
    expect(segments.length).toBe(1);
    expect(segments[0].sunStatus).toBe('sunny');
    expect(segments[0].startMinute).toBe(600);
    expect(segments[0].endMinute).toBe(720);
  });

  it('fills gaps between sun windows with shaded segments', () => {
    const windows = [
      makeWindow(600, 660), // 10:00–11:00 sunny
      makeWindow(720, 780), // 12:00–13:00 sunny
    ];
    const segments = generateSegments(windows, 600, 780);

    // Should have: sunny 600-660, shaded 660-720, sunny 720-780
    expect(segments.length).toBe(3);
    expect(segments[0].sunStatus).toBe('sunny');
    expect(segments[1].sunStatus).toBe('shaded');
    expect(segments[2].sunStatus).toBe('sunny');
  });

  it('handles empty SunWindow array (all shaded)', () => {
    const segments = generateSegments([], 600, 720);
    expect(segments.length).toBe(1);
    expect(segments[0].sunStatus).toBe('shaded');
    expect(segments[0].startMinute).toBe(600);
    expect(segments[0].endMinute).toBe(720);
  });

  it('handles overlapping windows (last wins)', () => {
    const windows = [
      makeWindow(600, 720, 'sunny'),
      makeWindow(660, 780, 'partial'),
    ];
    const segments = generateSegments(windows, 600, 780);

    // 600-660 sunny, 660-720 partial (overwritten), 720-780 partial
    const sunnySegs = segments.filter((s) => s.sunStatus === 'sunny');
    const partialSegs = segments.filter((s) => s.sunStatus === 'partial');
    expect(sunnySegs.length).toBeGreaterThanOrEqual(1);
    expect(partialSegs.length).toBeGreaterThanOrEqual(1);
  });
});

describe('timeToPosition', () => {
  it('returns correct percentage for start of range', () => {
    expect(timeToPosition(360, 360, 1320)).toBe(0);
  });

  it('returns correct percentage for middle of range', () => {
    expect(timeToPosition(840, 360, 1320)).toBeCloseTo(50, 1);
  });

  it('returns correct percentage for end of range', () => {
    expect(timeToPosition(1320, 360, 1320)).toBe(100);
  });

  it('clamps below range to 0', () => {
    expect(timeToPosition(300, 360, 1320)).toBe(0);
  });

  it('clamps above range to 100', () => {
    expect(timeToPosition(1400, 360, 1320)).toBe(100);
  });
});

describe('formatTimeLabel', () => {
  it('returns "HH:MM" format', () => {
    expect(formatTimeLabel(540)).toBe('09:00');
    expect(formatTimeLabel(825)).toBe('13:45');
    expect(formatTimeLabel(0)).toBe('00:00');
    expect(formatTimeLabel(60)).toBe('01:00');
  });
});

describe('getCardTimeRange', () => {
  it('produces at least 2 hour range', () => {
    // Now = 14:00 Stockholm (13:00 UTC in winter)
    const now = new Date(Date.UTC(2026, 0, 15, 13, 0));
    const result = getCardTimeRange([], now);
    expect(result.end - result.start).toBeGreaterThanOrEqual(120);
  });

  it('produces max 4 hour range', () => {
    const now = new Date(Date.UTC(2026, 0, 15, 8, 0)); // 09:00 Stockholm
    const windows = [makeWindow(540, 900)]; // 09:00–15:00 (6h window)
    const result = getCardTimeRange(windows, now);
    expect(result.end - result.start).toBeLessThanOrEqual(240);
  });
});

describe('calculateDuration', () => {
  it('formats hours and minutes correctly', () => {
    const start = '2026-01-15T09:00:00.000Z';
    const end = '2026-01-15T11:25:00.000Z';
    expect(calculateDuration(start, end)).toBe('2h 25m');
  });

  it('formats minutes only for short durations', () => {
    const start = '2026-01-15T09:00:00.000Z';
    const end = '2026-01-15T09:45:00.000Z';
    expect(calculateDuration(start, end)).toBe('45 min');
  });
});

describe('generateAriaLabel', () => {
  it('produces Swedish text description of sun windows', () => {
    const segments = [
      { startMinute: 600, endMinute: 720, sunStatus: 'sunny' as const, skyCondition: 'clear' as const },
    ];
    const label = generateAriaLabel(segments);
    expect(label).toContain('Solschema:');
    expect(label).toContain('soligt');
    expect(label).toContain('10:00');
    expect(label).toContain('12:00');
  });

  it('returns no-sun message for all-shaded segments', () => {
    const segments = [
      { startMinute: 600, endMinute: 720, sunStatus: 'shaded' as const, skyCondition: 'unavailable' as const },
    ];
    const label = generateAriaLabel(segments);
    expect(label).toContain('Solschema:');
    expect(label).toContain('Ingen sol idag');
  });
});
