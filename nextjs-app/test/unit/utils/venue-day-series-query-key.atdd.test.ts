/**
 * ATDD RED-PHASE acceptance scaffolds — Story 11.1 (AC1, Task 4)
 * "Client-Side Day-Series — the zero-fetch query-key invariant (unit half)"
 *
 * =========================================================================
 * WHAT THIS SPEC IS
 * =========================================================================
 * THE HEADLINE (R-001, CRITICAL score 9): a settled time change (scrub) must NOT
 * change the TanStack query key, so it issues ZERO `/api/venues` requests. Today,
 * `normalizePlannerParams(date, time)` puts BOTH date AND time into the planner
 * filter that becomes the query key (`useVenueSearch.ts:70-75`), so every settled
 * off-live time forces a `planner` key and a fetch. With the day-series present,
 * the TIME dimension is derived CLIENT-SIDE — so the key must change ONLY on a
 * DATE change or a material LOCATION change, never on a same-date time scrub.
 *
 * This is the UNIT half of the R-001 defence-in-depth (the epic explicitly wants
 * this double-covered): the query-key builder invariant here, the whole-app
 * request-count = 0 at e2e (`epic-11-scrub-zero-fetch.spec.ts`).
 *
 * =========================================================================
 * RED PHASE
 * =========================================================================
 * Every block is `describe.skip`. Today `queryKeys.venues.planner(filters)` with
 * a `time` in `filters` DIFFERS on a time change (the current, wrong behaviour),
 * so these assertions FAIL until Task 4 decouples time from the key. The dev's
 * exact mechanism is their call (drop `time` from the key filter; keep `date` +
 * coords) — the assertions pin the INVARIANT (same-date time change ⇒ same key),
 * not a specific builder. `buildVenueQueryKey` below is the ATDD contract shape
 * the hook must satisfy; the dev points it at the real builder when un-skipping.
 */

import { describe, expect, it } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

// The stable-key contract the hook must satisfy after Task 4: a builder that keys
// on (coords, date) and NOT on time. In the red phase this delegates to the
// CURRENT behaviour (planner filter incl. time) so the invariant assertions FAIL
// until the dev decouples time. When Task 4 lands, the dev repoints this at the
// real decoupled builder (or inlines `queryKeys.venues.list({ lat, lng, radiusKm,
// date })`) and un-skips.
function buildVenueQueryKey(params: {
  lat: number;
  lng: number;
  radiusKm: number;
  date?: string;
  time?: string;
}): readonly unknown[] {
  // GREEN PHASE (Story 11.1 Task 4): the DECOUPLED builder — mirrors
  // `useVenueSearch`'s key construction. A planner selection (date + time) keys
  // ONLY on `date` (+ coords + radius); `time` is derived client-side from the
  // `sunDaySeries` and is NEVER a key input, so a same-date time scrub produces
  // the SAME key (zero fetch) while a date/location change flips it.
  const { lat, lng, radiusKm, date, time } = params;
  const keyPlanner = date && time ? { date } : undefined;
  const filters = { lat, lng, radiusKm, ...keyPlanner };
  return keyPlanner ? queryKeys.venues.planner(filters) : queryKeys.venues.list(filters);
}

const BASE = { lat: 57.7089, lng: 11.9746, radiusKm: 1.5, date: '2026-07-04' };

describe('Story 11.1 AC1 — a same-date time scrub does NOT change the query key', () => {
  // P0 — the zero-fetch invariant at the key level: two selections that differ
  // ONLY in `time` (same date, same coords) must produce the SAME query key, so
  // TanStack does not refetch. This is the unit proxy for "scrub = 0 requests".
  it('produces the SAME key for two times on the same date', () => {
    const at1300 = buildVenueQueryKey({ ...BASE, time: '13:00' });
    const at1730 = buildVenueQueryKey({ ...BASE, time: '17:30' });
    expect(at1730).toEqual(at1300);
  });

  // P0 — the live-now clock tick must not thrash the key either: advancing "now"
  // (a new live time on the same date) keeps the key stable.
  it('keeps the key stable as the live-now time advances within the same date', () => {
    const tickA = buildVenueQueryKey({ ...BASE, time: '12:00' });
    const tickB = buildVenueQueryKey({ ...BASE, time: '12:15' });
    expect(tickB).toEqual(tickA);
  });
});

describe('Story 11.1 AC3 — the key DOES change on a date or location change', () => {
  // P0 — a DATE change is the one fetch AC3 permits: the key must change so
  // exactly one new request fires (and the markers persist under the overlay).
  it('produces a DIFFERENT key when the date changes', () => {
    const today = buildVenueQueryKey({ ...BASE, time: '13:00' });
    const tomorrow = buildVenueQueryKey({ ...BASE, date: '2026-07-05', time: '13:00' });
    expect(tomorrow).not.toEqual(today);
  });

  // P0 — a MATERIAL location change also changes the key (a new origin ⇒ a new
  // venue set). Same-date time is derived client-side; coords stay in the key.
  it('produces a DIFFERENT key when the origin location changes materially', () => {
    const here = buildVenueQueryKey({ ...BASE, time: '13:00' });
    const elsewhere = buildVenueQueryKey({ ...BASE, lat: 59.3293, lng: 18.0686, time: '13:00' });
    expect(elsewhere).not.toEqual(here);
  });
});
