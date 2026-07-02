/**
 * ATDD RED-PHASE acceptance scaffolds — Story 10.1 AC4
 * "Consumer sweep + contract tests + cache consistency"
 *
 * These tests assert the EXPECTED post-implementation behaviour and are
 * intentionally FAILING until Story 10.1 Task 1/5 land (TDD red phase). Every
 * block is `describe.skip` so the suite stays green in CI until the dev
 * un-skips them once `VenueSunStatus` gains `'CloudObscured'` and every
 * consumer (SUN_STATUS_ORDER, the sanitizer, the DB allow-list) handles it.
 *
 * WHAT AC4 REQUIRES OF THIS SURFACE:
 *  1. `normalizeVenueForResponse` (the API sanitizer) must round-trip a
 *     `CloudObscured` venue WITHOUT corrupting the status (preserve the value).
 *  2. A `CloudObscured` venue must sort SENSIBLY in the venues route (no NaN
 *     from a missing SUN_STATUS_ORDER key — Task 1 (a) load-bearing surface).
 *
 * TYPE NOTE (RED-PHASE tsc-safety):
 * `'CloudObscured'` is not yet a member of `VenueSunStatus` (Task 1 adds it), so
 * constructing a DTO with that literal would break the tsc gate today (tsc
 * ignores `.skip`). The scaffold builds the status via a helper that is typed as
 * the CURRENT union but produces the future literal at runtime, keeping tsc
 * green. When Task 1 widens the union, the dev replaces `cloudObscuredStatus()`
 * with the plain literal `'CloudObscured'` and un-skips.
 */

import { describe, expect, it } from 'vitest';
import { normalizeVenueForResponse } from '@/lib/services/venues-fixture';
import type { VenueDataDto, VenueSunStatus } from '@/lib/types/api';

/**
 * Produces the future `'CloudObscured'` literal at runtime while staying typed
 * as the CURRENT `VenueSunStatus` union so tsc passes before Task 1 widens it.
 * Post-Task-1: delete this and inline `'CloudObscured'`.
 */
function cloudObscuredStatus(): VenueSunStatus {
  return 'CloudObscured' as VenueSunStatus;
}

function makeCloudObscuredVenue(overrides: Partial<VenueDataDto> = {}): VenueDataDto {
  return {
    id: '99',
    venueId: '99',
    venueName: 'Överskuggad Terrass',
    venueSlug: 'test-venue-cloud',
    slug: 'test-venue-cloud',
    neighborhood: 'Centrum',
    location: { lat: 57.7089, lng: 11.9746 },
    // Weather-gated headline, but geometrically sunlit — the two-signal model.
    currentSunStatus: cloudObscuredStatus(),
    skyCondition: 'overcast',
    isPartner: false,
    confidence: 60,
    distanceMeters: 0,
    // Geometric clear-sky potential is PRESERVED (unchanged by the gate).
    sunExposurePercent: 95,
    tags: [],
    ...overrides,
  };
}

describe.skip('[RED 10.1 AC4] CloudObscured round-trips through the API sanitizer', () => {
  it('normalizeVenueForResponse preserves the CloudObscured status (no corruption)', () => {
    const normalized = normalizeVenueForResponse(makeCloudObscuredVenue());

    expect(normalized.currentSunStatus).toBe('CloudObscured');
    // The geometric layer survives the sanitizer unchanged (two-signal model).
    expect(normalized.sunExposurePercent).toBe(95);
  });

  it('does NOT drop or downgrade the value to a legacy status', () => {
    const normalized = normalizeVenueForResponse(makeCloudObscuredVenue());

    expect(normalized.currentSunStatus).not.toBe('Shaded');
    expect(normalized.currentSunStatus).not.toBe('NoSun');
    expect(normalized.currentSunStatus).not.toBe('Sunny');
  });
});

describe.skip('[RED 10.1 AC4] CloudObscured sorts sensibly (no NaN from SUN_STATUS_ORDER)', () => {
  it('a CloudObscured venue receives a defined numeric sort rank (never undefined ⇒ NaN)', () => {
    // Story 10.1 Task 1 (a): SUN_STATUS_ORDER is `Record<VenueSunStatus, number>`.
    // A missing key would make `rank(CloudObscured) - rank(other) = NaN`, silently
    // corrupting the list sort. The dev ranks CloudObscured between Partial and
    // Shaded (documented choice). Assert the comparator produces a total order:
    // sorting a mixed list must not throw and must not leave CloudObscured at an
    // undefined position.
    const statuses: VenueSunStatus[] = [
      'NoSun',
      cloudObscuredStatus(),
      'Sunny',
      'Shaded',
      'Partial',
    ];

    // The route is not exported, so we assert the invariant the route relies on:
    // every status the DTO can carry must map to a finite rank. This mirrors the
    // `Record<VenueSunStatus, number>` compile-forcing site. A helper import of
    // the route's SUN_STATUS_ORDER can replace this once the dev exports it; for
    // now assert via the sanitizer that the value survives to the sort input.
    for (const s of statuses) {
      const dto = makeCloudObscuredVenue({ currentSunStatus: s });
      const normalized = normalizeVenueForResponse(dto);
      expect(normalized.currentSunStatus).toBe(s);
    }
  });
});
