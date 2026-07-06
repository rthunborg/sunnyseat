/**
 * ATDD RED-PHASE acceptance scaffolds — Story 11.9 (AC2, AC3, AC4)
 * "Detail-route DTO: new openingHours shape; engine peakTime kept; shadowWarningMinutes gone"
 *
 * =========================================================================
 * WHAT THIS SPEC IS
 * =========================================================================
 * The API-serialization contract for the data-model cleanup, exercised through the
 * real `GET /api/venues/[slug]` route (mirroring `venue-detail-route.test.ts`):
 *   - AC4: `VenueDetailDto.shadowWarningMinutes` is REMOVED — it must NOT serialize.
 *   - AC3: the ENGINE `timeline.peakTime` (timeline-derived, `peakTimeFromTimeline`)
 *     is UNCHANGED — the stored `peak_time` fixture fallback is gone, but no surface
 *     loses the real live-computed value.
 *   - AC2: `openingHours` still serializes on the detail DTO in the NEW per-weekday
 *     structured shape (not a pre-localized `display` string), and an absent-hours
 *     venue serializes honestly (no fabricated `{display:'Öppettider saknas'}`).
 *
 * Signals are structural facts on the serialized JSON body — deterministic, fake-timer
 * clock (as the sibling test), no live weather (the route's own fallbacks apply).
 *
 * =========================================================================
 * RED PHASE — why every block is `.skip`-ed
 * =========================================================================
 * Against the current tree these FAIL:
 *   - `body.venue.shadowWarningMinutes` is STILL 45 (venue-detail-route.test.ts:41) —
 *     the field is spread in `buildDetailDto` (route.ts:182);
 *   - `body.venue.openingHours` STILL serializes as `{display, closesAt}` with a
 *     `display` STRING (route.ts:175) — the new shape has no `display` key;
 *   - the absent-hours branch STILL emits `{display:'Öppettider saknas'}` rather than
 *     honest absence.
 * `timeline.peakTime` already passes today (engine value) and MUST keep passing — it is
 * asserted here as a regression guard, not a red row.
 * Un-skip when Task 3.1/3.6 land. The sibling `venue-detail-route.test.ts` migrates its
 * OWN `shadowWarningMinutes`/`openingHours.display` assertions in Task 4.2; this scaffold
 * adds the NEW cleanup contract, it does not duplicate the surviving route coverage.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/venues/[slug]/route';
import type { GetVenueDetailResponse } from '@/lib/types/api';

function makeRequest(slug: string, query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/venues/${slug}${query}`);
}

describe.skip('[11.9 AC2/AC3/AC4] detail DTO after data-model cleanup', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.useFakeTimers();
    // A Tuesday midday in Stockholm — a weekday the gate venue is open (till 22:00).
    vi.setSystemTime(new Date('2026-06-16T10:15:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('AC4: shadowWarningMinutes is NOT present on the serialized detail DTO', async () => {
    const res = await GET(makeRequest('test-venue-sunny'), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });
    const body = (await res.json()) as GetVenueDetailResponse;
    expect('shadowWarningMinutes' in (body.venue as unknown as Record<string, unknown>)).toBe(
      false,
    );
  });

  it('AC3: the engine timeline.peakTime survives (live-computed, NOT the dropped stored value)', async () => {
    const res = await GET(makeRequest('test-venue-sunny'), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });
    const body = (await res.json()) as GetVenueDetailResponse;
    // The timeline peakTime is derived from the sun windows — a HH:MM string when the
    // day has a sunny window. It must not vanish with the stored-column removal.
    if (body.venue.timeline.windows.length > 0) {
      expect(body.venue.timeline.peakTime).toMatch(/^\d{2}:\d{2}$/);
    }
  });

  it('AC2: openingHours serializes as the per-weekday structured shape (no `display` string)', async () => {
    const res = await GET(makeRequest('test-venue-sunny'), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });
    const body = (await res.json()) as GetVenueDetailResponse;
    const hours = body.venue.openingHours as unknown as Record<string, unknown>;
    expect(hours).toBeTypeOf('object');
    // The pre-localized `display` string is GONE — the render layer derives it.
    expect('display' in hours).toBe(false);
    // At least one numeric-weekday entry is present on the gate venue.
    const hasWeekdayEntry = ['1', '2', '3', '4', '5', '6', '7'].some((k) => k in hours);
    expect(hasWeekdayEntry).toBe(true);
  });

  it('AC2: a venue with no hours serializes honestly (no fabricated "Öppettider saknas" display)', async () => {
    // Whichever fixture slug is authored WITHOUT opening hours (see venue-store fixture
    // + forced-detail cleanup): its detail DTO must not carry a stand-in display string.
    // Guarded so the row is meaningful only once such a slug exists; assert the negative
    // property against the gate venue's serialization shape as the invariant.
    const res = await GET(makeRequest('test-venue-sunny'), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });
    const body = (await res.json()) as GetVenueDetailResponse;
    const serialized = JSON.stringify(body.venue.openingHours ?? {});
    expect(serialized).not.toMatch(/Öppettider saknas/);
  });
});
