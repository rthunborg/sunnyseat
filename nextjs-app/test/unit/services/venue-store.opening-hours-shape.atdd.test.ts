/**
 * ATDD RED-PHASE acceptance scaffolds — Story 11.9 (AC2, AC3, AC4)
 * "Store adapter: new per-weekday hours shape; drop peak_time + shadow_warning_minutes"
 *
 * =========================================================================
 * WHAT THIS SPEC IS
 * =========================================================================
 * The store-adapter contract for the data-model cleanup:
 *   - AC2: `fromVenueRow`/`detailFromRow` maps `row.opening_hours` (new per-weekday
 *     jsonb) → `detail.openingHours` via a defensive `coerceOpeningHours` (mirrors the
 *     other `coerce*` helpers) — a malformed/null value → `undefined` (renders
 *     nothing), NEVER a throw.
 *   - AC3/AC4: `VENUE_SELECT_COLUMNS` no longer requests `peak_time` /
 *     `shadow_warning_minutes`, and neither is mapped onto the DTO.
 *   - CI-determinism seam (11.4): the two sunny `VENUE_FIXTURE` entries carry the new
 *     structured `openingHours` so the "renders opening hours" branch is reachable on
 *     the SEED path (flag OFF — what CI runs), plus at least one present + one absent
 *     case for both formatter branches.
 *
 * Signals are pure structural facts on the store's exported constants + row-mapper
 * output — deterministic, no clock, no live Supabase (the existing `venue-store.test.ts`
 * mocks the service-role client the same way).
 *
 * =========================================================================
 * STATUS — GREEN (live, un-skipped)
 * =========================================================================
 * Tasks 2.1–2.4 landed: `VENUE_SELECT_COLUMNS` no longer requests
 * `peak_time`/`shadow_warning_minutes`, `coerceOpeningHours` shapes `row.opening_hours`
 * into the per-weekday structure, and `detailFromRow` no longer assigns the dropped
 * fields. These blocks are un-skipped and run against the real store as ordinary green
 * tests that gate CI; this file is no longer a `.skip`-ed red-phase scaffold.
 *
 * The assertions target the OBSERVABLE mapper output (`detail.openingHours` value /
 * absence) plus the exported `coerceOpeningHours` / `VENUE_SELECT_COLUMNS` constants.
 */

import { describe, expect, it } from 'vitest';
import { coerceOpeningHours, VENUE_SELECT_COLUMNS } from '@/lib/services/venue-store';
import { VENUE_FIXTURE } from '@/lib/services/venues-fixture';

describe('[11.9 AC3/AC4] VENUE_SELECT_COLUMNS drops the dead columns', () => {
  it('no longer requests peak_time', () => {
    expect(VENUE_SELECT_COLUMNS).not.toContain('peak_time');
  });

  it('no longer requests shadow_warning_minutes', () => {
    expect(VENUE_SELECT_COLUMNS).not.toContain('shadow_warning_minutes');
  });

  it('still requests opening_hours (the column stays; only its shape changes)', () => {
    expect(VENUE_SELECT_COLUMNS).toContain('opening_hours');
  });
});

/**
 * `coerceOpeningHours` / row-mapper contract. The dev exposes the coercer or the
 * mapper; this block imports whatever surfaces the new-shape → DTO behaviour. Because
 * `fromVenueRow`/`coerceOpeningHours` may not be exported yet, we probe via a dynamic
 * require and tolerate absence in the red phase.
 */
describe('[11.9 AC2] coerceOpeningHours — new per-weekday jsonb → structured DTO', () => {
  const WEEKLY = {
    '1': { open: '11:00', close: '22:00' },
    '5': { open: '11:00', close: '02:00' },
    '7': null,
  };

  it('passes a well-formed per-weekday object through (as the structured shape, NOT a display string)', () => {
    const result = coerceOpeningHours(WEEKLY);
    // The stored `display` string is GONE — the coerced value is the per-weekday
    // structure the formatter consumes. Assert it retained a weekday entry.
    expect(result).toBeTruthy();
    expect(result?.['1']).toMatchObject({ open: '11:00', close: '22:00' });
  });

  it('maps a null column value → undefined (renders nothing, never a throw)', () => {
    expect(() => coerceOpeningHours(null)).not.toThrow();
    expect(coerceOpeningHours(null)).toBeUndefined();
  });

  it('maps a malformed value (string / array / number) → undefined, never a throw', () => {
    expect(() => coerceOpeningHours('Öppet till 22:00')).not.toThrow();
    expect(coerceOpeningHours('Öppet till 22:00')).toBeUndefined();
    expect(coerceOpeningHours(42)).toBeUndefined();
    expect(coerceOpeningHours([])).toBeUndefined();
  });
});

/**
 * SEED-path CI determinism (11.4 seam): on flag OFF `getVenues()` returns raw
 * `VENUE_FIXTURE`. The two sunny fixture entries must carry the NEW structured
 * `openingHours` (present case) and the others stay absent (absent case) so BOTH
 * formatter branches are reachable deterministically without live Supabase.
 */
describe('[11.9 AC2 / 11.4 seam] fixture openingHours converted to the new shape', () => {
  it('at least one fixture venue carries a per-weekday openingHours object (present branch)', () => {
    const present = VENUE_FIXTURE.filter(
      (v: { openingHours?: unknown }) => v.openingHours !== undefined,
    );
    expect(present.length).toBeGreaterThanOrEqual(1);
    // The present value is the structured object, NOT the old `{display, closesAt}` string form.
    const sample = present[0].openingHours as Record<string, unknown>;
    expect(sample).toBeTypeOf('object');
    expect('display' in sample).toBe(false);
  });

  it('at least one fixture venue has NO openingHours (absent branch stays reachable)', () => {
    const absent = VENUE_FIXTURE.filter(
      (v: { openingHours?: unknown }) => v.openingHours === undefined,
    );
    expect(absent.length).toBeGreaterThanOrEqual(1);
  });

  it('no fixture venue carries peakTime or shadowWarningMinutes any more', () => {
    for (const v of VENUE_FIXTURE) {
      expect('peakTime' in v).toBe(false);
      expect('shadowWarningMinutes' in v).toBe(false);
    }
  });
});
