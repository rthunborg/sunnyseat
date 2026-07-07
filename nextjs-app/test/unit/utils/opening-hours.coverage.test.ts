/**
 * COVERAGE EXPANSION — Story 11.9 (AC2), pure opening-hours formatter.
 *
 * The ATDD scaffold (`opening-hours.atdd.test.ts`) proves the primary AC2 signals:
 * open/closed/past-midnight/malformed via `formatOpeningHours`. This file expands
 * coverage of the formatter's *internal* branches and helpers that the acceptance
 * scaffold does not directly exercise, so a regression in any of them is caught:
 *
 *   - `stockholmIsoWeekday`: the exported weekday derivation (each of the 7 ISO
 *     weekdays) and its DST correctness (a WINTER instant, CET = UTC+1, vs the
 *     summer CEST = UTC+2 the scaffold uses) — the formatter's weekday selection is
 *     only as honest as this mapping.
 *   - the custom `template` parameter (the i18n-composition path the real render
 *     surfaces use — `labels.openUntilLine` / `quickInfo.openUntilLine`).
 *   - `open === close`, whitespace-preserving templates, and an empty `{}` hours
 *     object — the "no usable entry" branch.
 *
 * All tests are PURE with an injected `now` — no wall clock (the epic-wide
 * wall-clock-flake lesson). Instants are chosen so each asserts one Stockholm
 * local weekday; the UTC offset is annotated inline so the intent is auditable.
 */

import { describe, expect, it } from 'vitest';
import {
  formatOpeningHours,
  stockholmIsoWeekday,
  type WeeklyOpeningHours,
} from '@/lib/utils/opening-hours';

// ---------------------------------------------------------------------------
// stockholmIsoWeekday — exported weekday derivation
// ---------------------------------------------------------------------------

describe('[11.9 AC2] stockholmIsoWeekday — ISO weekday in Europe/Stockholm', () => {
  // 2026-06-15 is a Monday. Summer (CEST = UTC+2): 12:00 local = 10:00Z.
  // Walk the whole week from that Monday so every ISO weekday 1..7 is asserted.
  const summerWeek: Array<[string, number, string]> = [
    ['2026-06-15T10:00:00.000Z', 1, 'Mon'],
    ['2026-06-16T10:00:00.000Z', 2, 'Tue'],
    ['2026-06-17T10:00:00.000Z', 3, 'Wed'],
    ['2026-06-18T10:00:00.000Z', 4, 'Thu'],
    ['2026-06-19T10:00:00.000Z', 5, 'Fri'],
    ['2026-06-20T10:00:00.000Z', 6, 'Sat'],
    ['2026-06-21T10:00:00.000Z', 7, 'Sun'],
  ];

  it.each(summerWeek)('%s → ISO weekday %d (%s), summer CEST', (iso, expected) => {
    expect(stockholmIsoWeekday(new Date(iso))).toBe(expected);
  });

  it('is DST-correct: a WINTER instant (CET = UTC+1) still maps to the local weekday', () => {
    // 2026-01-05 is a Monday. Winter (CET = UTC+1): 00:30 local Tuesday = 23:30Z Monday.
    // 23:30Z Mon 2026-01-05 is 00:30 local Tue 2026-01-06 in Stockholm → ISO weekday 2.
    // Proves the derivation reads the ZONED weekday, not the UTC weekday.
    expect(stockholmIsoWeekday(new Date('2026-01-05T23:30:00.000Z'))).toBe(2);
  });

  it('crosses the local-midnight boundary correctly (23:30Z summer = 01:30 next day local)', () => {
    // Summer CEST = UTC+2. 23:30Z Sun 2026-06-21 = 01:30 local Mon 2026-06-22 → ISO 1.
    expect(stockholmIsoWeekday(new Date('2026-06-21T23:30:00.000Z'))).toBe(1);
  });

  it('NEVER-FABRICATE: an unrecognized Intl weekday token degrades to undefined (not Monday)', () => {
    // Simulate locale-data drift / non-Gregorian / ICU quirk yielding a token
    // outside Mon..Sun. The derivation MUST return undefined so the caller renders
    // nothing — defaulting to a concrete weekday would fabricate that day's hours.
    const RealDateTimeFormat = Intl.DateTimeFormat;
    // Constructable stub whose instances always yield an out-of-range token.
    const BogusDateTimeFormat = function BogusDateTimeFormat(this: unknown) {
      return { format: () => 'Xyz' };
    } as unknown as typeof Intl.DateTimeFormat;
    Intl.DateTimeFormat = BogusDateTimeFormat;
    try {
      expect(stockholmIsoWeekday(new Date('2026-06-15T10:00:00.000Z'))).toBeUndefined();
    } finally {
      Intl.DateTimeFormat = RealDateTimeFormat;
    }
  });
});

// ---------------------------------------------------------------------------
// formatOpeningHours — template composition & remaining edge branches
// ---------------------------------------------------------------------------

describe('[11.9 AC2] formatOpeningHours — i18n template composition', () => {
  const MON = new Date('2026-06-15T10:00:00.000Z'); // Mon 12:00 local
  const HOURS: WeeklyOpeningHours = {
    '1': { open: '11:00', close: '22:00' },
  };

  it('composes a caller-supplied i18n template (the real render surfaces pass one)', () => {
    // The render layer passes `labels.openUntilLine` ("Open until {time}" in en).
    const result = formatOpeningHours(HOURS, MON, 'en-GB', 'Open until {time}');
    expect(result.display).toBe('Open until 22:00');
    // The derived close time is locale-independent — only the surrounding copy differs.
    expect(result.closesAt).toBe('22:00');
  });

  it('replaces EVERY {time} occurrence in the template (not just the first)', () => {
    const result = formatOpeningHours(HOURS, MON, 'sv-SE', '{time}–{time}');
    expect(result.display).toBe('22:00–22:00');
  });

  it('falls back to the default Swedish template when none is supplied', () => {
    const result = formatOpeningHours(HOURS, MON, 'sv-SE');
    expect(result.display).toBe('Öppet till 22:00');
  });
});

describe('[11.9 AC2] formatOpeningHours — remaining edge branches', () => {
  const MON = new Date('2026-06-15T10:00:00.000Z'); // Mon 12:00 local

  it('empty hours object ({}) → {} : the current weekday key is absent → renders nothing', () => {
    const result = formatOpeningHours({}, MON, 'sv-SE');
    expect(result.display).toBeUndefined();
    expect(result.closesAt).toBeUndefined();
  });

  it('open === close is treated as a normal (non-past-midnight) close time', () => {
    // Degenerate but well-formed: 00:00 open, 00:00 close. The formatter must not
    // throw and must surface the close as-is (never fabricate/clamp).
    const hours: WeeklyOpeningHours = { '1': { open: '00:00', close: '00:00' } };
    const result = formatOpeningHours(hours, MON, 'sv-SE');
    expect(result.closesAt).toBe('00:00');
    expect(result.display).toBe('Öppet till 00:00');
  });

  it('boundary close times (00:00 and 23:59) pass the HH:MM validation and derive honestly', () => {
    expect(formatOpeningHours({ '1': { open: '18:00', close: '23:59' } }, MON).closesAt).toBe(
      '23:59',
    );
    expect(formatOpeningHours({ '1': { open: '18:00', close: '00:00' } }, MON).closesAt).toBe(
      '00:00',
    );
  });

  it('an out-of-range time (24:00) fails validation → renders nothing (never a throw)', () => {
    const hours = { '1': { open: '11:00', close: '24:00' } } as unknown as WeeklyOpeningHours;
    expect(() => formatOpeningHours(hours, MON, 'sv-SE')).not.toThrow();
    expect(formatOpeningHours(hours, MON, 'sv-SE').closesAt).toBeUndefined();
  });
});
