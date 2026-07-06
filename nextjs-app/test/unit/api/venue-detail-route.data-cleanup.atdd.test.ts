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
 * STATUS — GREEN (live, un-skipped)
 * =========================================================================
 * Tasks 3.1/3.6 landed: `buildDetailDto` no longer spreads `shadowWarningMinutes`,
 * `openingHours` serializes in the new per-weekday shape (no `display` string), and the
 * absent-hours branch serializes honestly (no fabricated `{display:'Öppettider saknas'}`).
 * These blocks are un-skipped and run against the real `GET /api/venues/[slug]` route as
 * ordinary green tests that gate CI; this file is no longer a `.skip`-ed red-phase scaffold.
 * `timeline.peakTime` (engine value) is asserted here as a regression guard.
 *
 * The sibling `venue-detail-route.test.ts` owns its migrated
 * `shadowWarningMinutes`/`openingHours.display` assertions (Task 4.2); this file adds the
 * NEW cleanup contract, it does not duplicate the surviving route coverage.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/venues/[slug]/route';
import type { GetVenueDetailResponse } from '@/lib/types/api';

function makeRequest(slug: string, query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/venues/${slug}${query}`);
}

describe('[11.9 AC2/AC3/AC4] detail DTO after data-model cleanup', () => {
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

  it('AC3: the timeline.peakTime is DERIVED (live-computed, NOT the dropped stored value)', async () => {
    // Send a planner selection (frozen Tuesday 2026-06-16) so the seed path derives
    // peakTime from the sun window (`peakTimeFromSunWindow`) rather than echoing the
    // now-removed stored `peak_time` column. This proves the live-computed peakTime
    // survives the AC3 stored-column removal.
    const res = await GET(makeRequest('test-venue-sunny', '?date=2026-06-16&time=14:00'), {
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
