/**
 * ATDD RED-PHASE scaffold — Story 10.4 AC2 (rain sky-condition copy)
 * "the surfaced sky condition reflects rain in plain language"
 *
 * Written red-first for Story 10.4 Task 4. On HEAD `skyConditionCopy('rain', …)`
 * returns `null` (the anticipatory placeholder — see the `'rain'` comment in
 * `lib/utils/sun-status-presentation.ts:74`), and `SkyConditionCopy` has NO
 * `rain` field. Task 4 REALISES the placeholder: it adds `rain: string` to
 * `SkyConditionCopy` and a `case 'rain': return copy.rain;` branch, so this
 * suite flips from red to green. The block is `.skip`-gated so the suite is
 * green on HEAD; the dev un-skips it once Task 4 lands.
 *
 * NOTE ON THE EXISTING UNIT TEST (not this file):
 * `test/unit/sun-status-presentation.test.ts:59` currently asserts
 * `skyConditionCopy('rain', SKY_COPY)).toBeNull()`. Story 10.4 Task 4 FLIPS that
 * in-place assertion (and adds `rain` to that file's `SKY_COPY` fixture) as part
 * of the implementation edit — this red-first scaffold is the acceptance signal
 * that drives it.
 *
 * =========================================================================
 * WHY THE CAST-THROUGH-CURRENT-TYPE HELPER (epic-10 ratified pattern)
 * =========================================================================
 * The tsc CI gate compiles `.skip`-ped tests too. A copy fixture that includes
 * a `rain` property, passed to `skyConditionCopy`, would HARD-BREAK `tsc` on
 * HEAD because the parameter type `SkyConditionCopy` has no `rain` member yet
 * (excess-property / structural error). We build the fixture and cast it THROUGH
 * the current `SkyConditionCopy` type via `as unknown as`, so `tsc` sees only a
 * conforming value while `.skip`; once Task 4 widens the type the cast is a
 * harmless identity and the assertions run unchanged.
 */

import { describe, expect, it } from 'vitest';
import {
  skyConditionCopy,
  type SkyConditionCopy,
} from '@/lib/utils/sun-status-presentation';

// Copy fixture INCLUDING the future `rain` key, cast through the current
// (rain-less) `SkyConditionCopy` type so `tsc` stays green while `.skip`.
const SKY_COPY_WITH_RAIN = {
  clear: 'Klart',
  partlyCloudy: 'Delvis molnigt',
  overcast: 'Mulet',
  rain: 'Regn',
} as unknown as SkyConditionCopy;

// Loose accessor so the `.rain` read below does not depend on the type having
// gained the field yet.
const rainCopy = (SKY_COPY_WITH_RAIN as unknown as { rain: string }).rain;

describe('[10.4 AC2] skyConditionCopy renders plain-language rain copy', () => {
  it("maps 'rain' to the plain-language rain descriptor (no longer null)", () => {
    // Was `toBeNull()` on HEAD (placeholder). Task 4 makes it return copy.rain.
    expect(skyConditionCopy('rain', SKY_COPY_WITH_RAIN)).toBe(rainCopy);
  });

  it("the rain copy carries no meteorology internals (plain language only)", () => {
    const result = skyConditionCopy('rain', SKY_COPY_WITH_RAIN);
    expect(result).toBeTruthy();
    // Honest, plain-language sky line — never a rate, mm/h, or radar internals.
    expect(String(result)).not.toMatch(/mm|precipitation|rate|radar|%/i);
  });

  it('leaves the other sky conditions unchanged (no regression from adding rain)', () => {
    expect(skyConditionCopy('clear', SKY_COPY_WITH_RAIN)).toBe('Klart');
    expect(skyConditionCopy('partly-cloudy', SKY_COPY_WITH_RAIN)).toBe('Delvis molnigt');
    expect(skyConditionCopy('overcast', SKY_COPY_WITH_RAIN)).toBe('Mulet');
  });

  it('still renders NOTHING for unavailable / undefined / unknown (honest we-do-not-know)', () => {
    expect(skyConditionCopy('unavailable', SKY_COPY_WITH_RAIN)).toBeNull();
    expect(skyConditionCopy(undefined, SKY_COPY_WITH_RAIN)).toBeNull();
    expect(skyConditionCopy('nonsense', SKY_COPY_WITH_RAIN)).toBeNull();
  });
});
