/**
 * COVERAGE EXPANSION — Story 11.9 (AC2), store-adapter `coerceOpeningHours`.
 *
 * The ATDD scaffold (`venue-store.opening-hours-shape.atdd.test.ts`) proves the
 * top-level coercer signals: well-formed passthrough, null → undefined, and a
 * malformed SCALAR (string/number/array) → undefined. This file expands the
 * defensive boundary — the exact branches that keep a bad production `opening_hours`
 * jsonb from crashing the render (the coercer is the trust boundary between the DB
 * and the pure formatter):
 *
 *   - an object whose weekday entries are ALL malformed → undefined (the `hasEntry`
 *     gate: an object with zero *recognizable* weekday entries is "no hours").
 *   - MIXED validity: valid intervals kept, malformed intervals dropped, in one call.
 *   - an explicit `null` weekday entry PRESERVED (closed-that-day is honest data,
 *     not garbage) so the formatter can derive "closed today".
 *   - non-weekday / out-of-range keys ignored (only ISO "1".."7" are read).
 *   - boundary + out-of-range interval times validated at the store layer.
 *
 * Deterministic, no clock, no live Supabase — pure structural assertions on the
 * exported `coerceOpeningHours`.
 */

import { describe, expect, it } from 'vitest';
import { coerceOpeningHours } from '@/lib/services/venue-store';

describe('[11.9 AC2] coerceOpeningHours — the "no usable entry" gate', () => {
  it('an object with weekday keys but ALL-malformed intervals → undefined (renders nothing)', () => {
    const allBad = {
      '1': { open: 'nope', close: 'nope' },
      '2': { open: '11:00' }, // missing close
      '3': 42, // wrong type
    };
    expect(coerceOpeningHours(allBad)).toBeUndefined();
  });

  it('an object with only non-weekday / out-of-range keys → undefined', () => {
    // "0" and "8" are not valid ISO weekdays; the display string key is gone entirely.
    const noWeekdays = { '0': { open: '11:00', close: '22:00' }, '8': null, display: 'x' };
    expect(coerceOpeningHours(noWeekdays)).toBeUndefined();
  });
});

describe('[11.9 AC2] coerceOpeningHours — mixed validity is cleaned, not rejected', () => {
  it('keeps valid intervals and DROPS malformed ones in the same object', () => {
    const mixed = {
      '1': { open: '11:00', close: '22:00' }, // valid → kept
      '2': { open: 'bad', close: '22:00' }, // invalid open → dropped
      '3': { close: '22:00' }, // missing open → dropped
    };
    const result = coerceOpeningHours(mixed);
    expect(result).toBeTruthy();
    expect(result?.['1']).toMatchObject({ open: '11:00', close: '22:00' });
    expect('2' in (result ?? {})).toBe(false);
    expect('3' in (result ?? {})).toBe(false);
  });

  it('PRESERVES an explicit null weekday entry (closed-that-day is honest data)', () => {
    const result = coerceOpeningHours({
      '1': { open: '11:00', close: '22:00' },
      '7': null, // Sunday closed — must survive so the formatter derives "closed today"
    });
    expect(result?.['7']).toBeNull();
    expect('7' in (result ?? {})).toBe(true);
  });

  it('ignores non-weekday keys but keeps the valid weekday ones', () => {
    const result = coerceOpeningHours({
      '1': { open: '11:00', close: '22:00' },
      display: 'Öppet till 22:00', // legacy stray key must NOT leak through
      timezone: 'Europe/Stockholm',
    } as unknown as Record<string, unknown>);
    expect(result?.['1']).toMatchObject({ open: '11:00', close: '22:00' });
    expect('display' in (result ?? {})).toBe(false);
    expect('timezone' in (result ?? {})).toBe(false);
  });
});

describe('[11.9 AC2] coerceOpeningHours — interval time validation', () => {
  it('accepts boundary times (00:00, 23:59) and past-midnight (close < open)', () => {
    const result = coerceOpeningHours({
      '1': { open: '00:00', close: '23:59' },
      '5': { open: '18:00', close: '02:00' }, // past-midnight — close < open is legal
    });
    expect(result?.['1']).toMatchObject({ open: '00:00', close: '23:59' });
    expect(result?.['5']).toMatchObject({ open: '18:00', close: '02:00' });
  });

  it('rejects out-of-range times (24:00, 12:60) and non-string values', () => {
    const result = coerceOpeningHours({
      '1': { open: '24:00', close: '22:00' }, // hour out of range
      '2': { open: '11:00', close: '12:60' }, // minute out of range
      '3': { open: 1100, close: 2200 }, // numbers, not strings
    } as unknown as Record<string, unknown>);
    expect(result).toBeUndefined();
  });
});
