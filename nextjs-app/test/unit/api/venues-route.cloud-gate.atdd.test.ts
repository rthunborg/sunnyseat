/**
 * ATDD acceptance tests — Story 10.1 AC4
 * "Consumer sweep + contract tests + cache consistency"
 *
 * Written red-first (they FAILED before `VenueSunStatus` gained `'CloudObscured'`
 * and every consumer — SUN_STATUS_ORDER, the sanitizer, the DB allow-list — handled
 * it). Now that Task 1/5 are implemented these are un-skipped and green.
 *
 * WHAT AC4 REQUIRES OF THIS SURFACE:
 *  1. `normalizeVenueForResponse` (the API sanitizer) must preserve the
 *     `CloudObscured` status while enforcing its already-fired weather gate.
 *  2. A high-exposure `CloudObscured` venue must remain in the public grey band.
 */

import { describe, expect, it } from 'vitest';
import { normalizeVenueForResponse } from '@/lib/services/venues-fixture';
import type { VenueDataDto } from '@/lib/types/api';
import {
  compareVenuesByPublicSun,
  extractPublicSunPeak,
  isVenuePubliclySunny,
} from '@/lib/utils/public-sun';

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
    currentSunStatus: 'CloudObscured',
    weatherGateState: 'gated',
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

describe('[10.1 AC4] CloudObscured round-trips through the API sanitizer', () => {
  it('normalizeVenueForResponse preserves the CloudObscured status (no corruption)', () => {
    const normalized = normalizeVenueForResponse(makeCloudObscuredVenue());

    expect(normalized.currentSunStatus).toBe('CloudObscured');
    expect(normalized.weatherGateState).toBe('gated');
    // The geometric layer survives the sanitizer unchanged (two-signal model).
    expect(normalized.sunExposurePercent).toBe(95);
  });

  it('fails a contradictory not_gated producer closed before public ranking', () => {
    const normalized = normalizeVenueForResponse(
      makeCloudObscuredVenue({
        weatherGateState: 'not_gated',
        sunDaySeries: [
          {
            minutes: 720,
            sunExposurePercent: 95,
            currentSunStatus: 'CloudObscured',
            weatherGateState: 'not_gated',
          },
        ],
      }),
    );

    expect(normalized.weatherGateState).toBe('gated');
    expect(normalized.sunDaySeries?.[0]?.weatherGateState).toBe('gated');
    expect(isVenuePubliclySunny(normalized)).toBe(false);
    expect(extractPublicSunPeak(normalized.sunDaySeries ?? [])).toBeNull();
  });

  it('does NOT drop or downgrade the value to a legacy status', () => {
    const normalized = normalizeVenueForResponse(makeCloudObscuredVenue());

    expect(normalized.currentSunStatus).not.toBe('Shaded');
    expect(normalized.currentSunStatus).not.toBe('NoSun');
    expect(normalized.currentSunStatus).not.toBe('Sunny');
  });
});

describe('[12.6] CloudObscured stays outside the public-sunny band', () => {
  it('sorts a lower-exposure genuine Partial before high-exposure CloudObscured', () => {
    const obscured = normalizeVenueForResponse(makeCloudObscuredVenue());
    const partial = normalizeVenueForResponse(
      makeCloudObscuredVenue({
        id: 'partial',
        currentSunStatus: 'Partial',
        weatherGateState: 'not_gated',
        sunExposurePercent: 60,
        skyCondition: 'clear',
      }),
    );
    const shaded = normalizeVenueForResponse(
      makeCloudObscuredVenue({
        id: 'shaded',
        currentSunStatus: 'Shaded',
        weatherGateState: 'not_gated',
        sunExposurePercent: 20,
        skyCondition: 'clear',
      }),
    );

    const ordered = [shaded, obscured, partial].sort(compareVenuesByPublicSun);

    expect(ordered.map((venue) => venue.id)).toEqual(['partial', '99', 'shaded']);
    expect(ordered.map(isVenuePubliclySunny)).toEqual([true, false, false]);
  });
});
