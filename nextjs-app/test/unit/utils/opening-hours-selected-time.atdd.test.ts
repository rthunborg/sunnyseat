import { describe, expect, it } from 'vitest';
import {
  formatOpeningHoursAt,
  getVenueAvailabilityAt,
  isVenueOpenAt,
  type WeeklyOpeningHours,
} from '@/lib/utils/opening-hours';

const HOURS: WeeklyOpeningHours = {
  '1': { open: '11:00', close: '22:00' },
  '2': null,
  '5': { open: '18:00', close: '02:00' },
  '6': null,
};

describe('[12.14 AC1] selected-instant venue availability', () => {
  it('returns unknown when the whole opening-hours field is absent', () => {
    expect(isVenueOpenAt(undefined, new Date('2026-06-15T10:00:00.000Z'))).toBe('unknown');
  });

  it.each([
    ['same-day inside interval', '2026-06-15T10:00:00.000Z', 'open'],
    ['open boundary is inclusive', '2026-06-15T09:00:00.000Z', 'open'],
    ['before open is closed', '2026-06-15T08:59:00.000Z', 'closed'],
    ['close boundary is exclusive', '2026-06-15T20:00:00.000Z', 'closed'],
    ['after close is closed', '2026-06-15T20:01:00.000Z', 'closed'],
    ['null selected weekday is closed', '2026-06-16T10:00:00.000Z', 'closed'],
  ] as const)('%s', (_name, iso, expected) => {
    expect(isVenueOpenAt(HOURS, new Date(iso))).toBe(expected);
  });

  it('handles current-day overnight intervals after the open time', () => {
    const result = getVenueAvailabilityAt(HOURS, new Date('2026-06-19T21:30:00.000Z'));
    expect(result).toEqual({ state: 'open', closesAt: '02:00' });
  });

  it('handles prior-day spillover before the prior close even when the selected weekday is null', () => {
    const result = getVenueAvailabilityAt(HOURS, new Date('2026-06-19T23:30:00.000Z'));
    expect(result).toEqual({ state: 'open', closesAt: '02:00' });
  });

  it('treats the prior-day spillover close boundary as closed', () => {
    expect(isVenueOpenAt(HOURS, new Date('2026-06-20T00:00:00.000Z'))).toBe('closed');
  });

  it('formats selected-instant open copy only when the venue is open at that instant', () => {
    const open = formatOpeningHoursAt(
      HOURS,
      new Date('2026-06-15T10:00:00.000Z'),
      'sv-SE',
      'Öppet vid vald tid · till {time}',
    );
    expect(open).toEqual({
      display: 'Öppet vid vald tid · till 22:00',
      closesAt: '22:00',
    });

    const closed = formatOpeningHoursAt(
      HOURS,
      new Date('2026-06-15T20:00:00.000Z'),
      'sv-SE',
      'Öppet vid vald tid · till {time}',
    );
    expect(closed.display).toBeUndefined();
    expect(closed.closesAt).toBeUndefined();
  });
});
