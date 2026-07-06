/**
 * ATDD RED-PHASE acceptance scaffolds — Story 11.9 (AC2)
 * "Per-weekday `opening_hours`; derive the display line + ÖPPET badge at render time"
 *
 * =========================================================================
 * WHAT THIS SPEC IS
 * =========================================================================
 * The unit contract for the NEW pure formatter `lib/utils/opening-hours.ts`
 * (`formatOpeningHours(hours, now, locale) → { display?, closesAt? }`). This is the
 * PRIMARY proof of AC2: the stored pre-localized `{display, closesAt}` string is
 * REPLACED by a per-weekday jsonb shape (numeric ISO weekday 1=Mon..7=Sun; missing
 * key / `null` value = closed that day; `close` < `open` = past-midnight), and the
 * "Öppet till HH:MM" line + the ÖPPET-badge `closesAt` are DERIVED from that shape +
 * the CURRENT Stockholm weekday at render time.
 *
 * Signals are pure string/undefined returns for a fixed injected `now` in
 * `Europe/Stockholm` — deterministic, NO wall-clock reads (project lesson: wall-clock
 * is flaky; the e2e time-determinism convention forces `?_time=`, a pure formatter
 * sidesteps that entirely). The formatter is injected `now: Date` + `locale` and must
 * NEVER call `new Date()` internally (Dev Notes "New formatter — keep it PURE").
 *
 * =========================================================================
 * RED PHASE — why every block is `.skip`-ed
 * =========================================================================
 * Against the current tree these FAIL because `lib/utils/opening-hours.ts` does not
 * exist yet (imported below via an untyped dynamic-import shim so the `.skip`-ed file
 * still type-checks). Un-skip when Task 3.2 lands.
 *
 * NAMING TOLERANCE: the dev has not committed to the exact export name/signature. The
 * scaffold probes `formatOpeningHours` (the name in Dev Notes) and tolerates either a
 * single `{ display?, closesAt? }` return OR two functions — the ACCEPTANCE SIGNAL is
 * the VALUE (derived display string / today's close / undefined-when-closed), not a
 * name the dev has not chosen. If the dev picks a different key convention
 * (`"mon".."sun"` instead of numeric ISO), update `hoursFor()` below; the assertions
 * stand.
 */

import { describe, expect, it } from 'vitest';

// Red-phase shim: the module does not exist yet. A dynamic require keeps the
// `.skip`-ed file type-checking (no unresolved static import) and goes red at runtime
// only when un-skipped after Task 3.2.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let formatOpeningHours: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
  formatOpeningHours = require('@/lib/utils/opening-hours').formatOpeningHours;
} catch {
  formatOpeningHours = () => ({});
}

/**
 * Per-weekday opening-hours fixture (Dev Notes "Opening-hours shape"): numeric ISO
 * weekday keys; `null`/missing = closed; `close` < `open` = past-midnight close.
 * Mon–Thu 11–22, Thu 11–23, Fri 11→02 (past midnight), Sat 12→02, Sun closed.
 */
const WEEKLY_HOURS = {
  '1': { open: '11:00', close: '22:00' }, // Mon
  '2': { open: '11:00', close: '22:00' }, // Tue
  '3': { open: '11:00', close: '22:00' }, // Wed
  '4': { open: '11:00', close: '23:00' }, // Thu
  '5': { open: '11:00', close: '02:00' }, // Fri — past-midnight close
  '6': { open: '12:00', close: '02:00' }, // Sat — past-midnight close
  '7': null, // Sun — closed
};

// Fixed Stockholm instants (summer, CEST = UTC+2). Local Stockholm date/weekday noted.
const MON_MIDDAY = new Date('2026-06-15T10:00:00.000Z'); // Mon 2026-06-15 12:00 local
const THU_MIDDAY = new Date('2026-06-18T10:00:00.000Z'); // Thu 2026-06-18 12:00 local
const FRI_MIDDAY = new Date('2026-06-19T10:00:00.000Z'); // Fri 2026-06-19 12:00 local
const SUN_MIDDAY = new Date('2026-06-21T10:00:00.000Z'); // Sun 2026-06-21 12:00 local

describe.skip('[11.9 AC2] formatOpeningHours — derived display + closesAt (pure, injected now)', () => {
  it('open today → derives "Öppet till HH:MM" + today\'s close as closesAt', () => {
    const result = formatOpeningHours(WEEKLY_HOURS, MON_MIDDAY, 'sv-SE');
    // Monday close is 22:00 — the derived closesAt is today's close.
    expect(result.closesAt).toBe('22:00');
    // Display carries the localized "open until" time; assert the TIME, not exact
    // copy (the dev owns whether it composes via i18n template or a raw string).
    expect(result.display).toMatch(/22:00/);
  });

  it('picks the CURRENT weekday (Thursday close is 23:00, not Monday 22:00)', () => {
    const result = formatOpeningHours(WEEKLY_HOURS, THU_MIDDAY, 'sv-SE');
    expect(result.closesAt).toBe('23:00');
    expect(result.display).toMatch(/23:00/);
  });

  it('past-midnight close (Fri opens 11:00 closes 02:00) → closesAt "02:00", honest display', () => {
    const result = formatOpeningHours(WEEKLY_HOURS, FRI_MIDDAY, 'sv-SE');
    // The venue is "open until 02:00" for Friday — do NOT fabricate/clamp to 23:59.
    expect(result.closesAt).toBe('02:00');
    expect(result.display).toMatch(/02:00/);
  });

  it('closed today (Sunday = null) → {} : renders NOTHING (no fabricated close)', () => {
    const result = formatOpeningHours(WEEKLY_HOURS, SUN_MIDDAY, 'sv-SE');
    // NEVER-FABRICATE rule (11.4/11.6): absent hours today → no display, no closesAt.
    expect(result.display).toBeUndefined();
    expect(result.closesAt).toBeUndefined();
  });

  it('no hours at all (undefined/empty) → {} : renders NOTHING (never a throw)', () => {
    expect(() => formatOpeningHours(undefined, MON_MIDDAY, 'sv-SE')).not.toThrow();
    const result = formatOpeningHours(undefined, MON_MIDDAY, 'sv-SE');
    expect(result.display).toBeUndefined();
    expect(result.closesAt).toBeUndefined();
  });

  it('malformed shape (garbage value for today) → {} : no throw, renders NOTHING', () => {
    // A defensive coercer contract: a bad today-entry must degrade to closed, not crash.
    const malformed = { ...WEEKLY_HOURS, '1': { open: 'not-a-time' } };
    expect(() => formatOpeningHours(malformed, MON_MIDDAY, 'sv-SE')).not.toThrow();
    const result = formatOpeningHours(malformed, MON_MIDDAY, 'sv-SE');
    expect(result.closesAt).toBeUndefined();
  });

  it('is locale-aware (en still derives the same numeric close for the current weekday)', () => {
    const sv = formatOpeningHours(WEEKLY_HOURS, MON_MIDDAY, 'sv-SE');
    const en = formatOpeningHours(WEEKLY_HOURS, MON_MIDDAY, 'en-GB');
    // The derived time is locale-independent; only the surrounding copy may differ.
    expect(en.closesAt).toBe(sv.closesAt);
    expect(en.closesAt).toBe('22:00');
  });
});

/**
 * `test-venue-sunny` gate parity (Dev Notes "Migration ground truth"): the seed
 * rewrite for id "1" must still DERIVE "Öppet till 22:00" / closesAt "22:00" for the
 * weekday(s) the 8-2 smoke check / venue-store tests assert. This block pins that the
 * new per-weekday shape reproduces the OLD stored `{display:"Öppet till 22:00",
 * closesAt:"22:00"}` for the gate weekday, so the byte-stable gate assertion survives.
 */
describe.skip('[11.9 AC2] test-venue-sunny gate parity — new shape derives the old value', () => {
  it('derives closesAt "22:00" for the gate weekday (byte-stable on the gate-asserted value)', () => {
    // The gate venue is open till 22:00; whichever weekday the store/detail tests fix,
    // the derived close must be "22:00". Use Monday (a 22:00 day) as the reference.
    const result = formatOpeningHours(WEEKLY_HOURS, MON_MIDDAY, 'sv-SE');
    expect(result.closesAt).toBe('22:00');
    expect(result.display).toMatch(/22:00/);
  });
});
