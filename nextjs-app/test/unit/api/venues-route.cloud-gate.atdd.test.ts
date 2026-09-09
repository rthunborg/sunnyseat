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
import { normalizeVenueForResponse, VENUE_FIXTURE } from '@/lib/services/venues-fixture';
import type { VenueDataDto } from '@/lib/types/api';
import { deriveVenueSunAtMinutes } from '@/lib/utils/venue-day-series';
import {
  compareVenuesByPublicSun,
  extractPublicSunPeak,
  extractPublicSunWindow,
  isVenuePubliclySunny,
  publicSunVerdictFor,
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
    directSunState: 'blocked',
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
  it.each([
    { reasons: ['precipitation'] }, { reasons: ['weather-unavailable'] },
    { reasons: ['unrecognized'] }, { reasons: 'precipitation' }, { reasons: null },
  ])(
    'neutralizes contradictory or malformed likely reasons $reasons before serialization and cached scrubbing', ({ reasons }) => {
      const clear = makeCloudObscuredVenue({
        currentSunStatus: 'Sunny', weatherGateState: 'not_gated',
        directSunState: 'likely', skyCondition: 'clear',
      });
      const normalized = normalizeVenueForResponse({
        ...clear, directSunReasons: reasons,
        sunDaySeries: [{ ...clear, minutes: 720, directSunReasons: reasons }],
      } as VenueDataDto);
      const cached = JSON.parse(JSON.stringify(normalized)) as VenueDataDto;
      expect(cached).toMatchObject({ directSunState: 'unknown', weatherGateState: 'unknown' });
      expect(cached.directSunReasons).toContain('contradictory-weather');
      expect(deriveVenueSunAtMinutes(cached.sunDaySeries, 720)).toMatchObject({ directSunState: 'unknown' });
      expect(isVenuePubliclySunny(cached)).toBe(false);
      expect(publicSunVerdictFor(cached)).toBe('grey');
      const genuine = normalizeVenueForResponse({ ...clear, id: 'genuine', sunExposurePercent: 60, directSunReasons: [] });
      expect([cached, genuine].sort(compareVenuesByPublicSun)[0].id).toBe('genuine');
      expect(extractPublicSunWindow(cached.sunDaySeries ?? [], { stepMinutes: 15 })).toBeNull();
      expect(extractPublicSunPeak(cached.sunDaySeries ?? [])).toBeNull();
    },
  );

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

  it('neutralizes CloudObscured + gated + likely across sanitizer, rank, pin verdict, window, and peak', () => {
    const normalized = normalizeVenueForResponse(
      makeCloudObscuredVenue({
        directSunState: 'likely',
        sunDaySeries: [{
          minutes: 720,
          sunExposurePercent: 95,
          currentSunStatus: 'CloudObscured',
          weatherGateState: 'gated',
          directSunState: 'likely',
          skyCondition: 'overcast',
        }],
      }),
    );
    const genuine = normalizeVenueForResponse(makeCloudObscuredVenue({
      id: 'genuine',
      currentSunStatus: 'Partial',
      weatherGateState: 'not_gated',
      directSunState: 'likely',
      skyCondition: 'clear',
      sunExposurePercent: 60,
    }));

    expect(normalized).toMatchObject({
      currentSunStatus: 'CloudObscured',
      weatherGateState: 'gated',
      directSunState: 'unknown',
      directSunReasons: ['contradictory-weather'],
    });
    expect(normalized.sunDaySeries?.[0]).toMatchObject({
      weatherGateState: 'gated',
      directSunState: 'unknown',
      directSunReasons: ['contradictory-weather'],
    });
    expect(isVenuePubliclySunny(normalized)).toBe(false);
    expect(publicSunVerdictFor(normalized)).toBe('grey');
    expect([normalized, genuine].sort(compareVenuesByPublicSun)[0]?.id).toBe('genuine');
    expect(extractPublicSunWindow(normalized.sunDaySeries ?? [], { stepMinutes: 15 })).toBeNull();
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
        directSunState: 'likely',
        sunExposurePercent: 60,
        skyCondition: 'clear',
      }),
    );
    const shaded = normalizeVenueForResponse(
      makeCloudObscuredVenue({
        id: 'shaded',
        currentSunStatus: 'Shaded',
        weatherGateState: 'not_gated',
        directSunState: 'blocked',
        sunExposurePercent: 20,
        skyCondition: 'clear',
      }),
    );

    const ordered = [shaded, obscured, partial].sort(compareVenuesByPublicSun);

    expect(ordered.map((venue) => venue.id)).toEqual(['partial', '99', 'shaded']);
    expect(ordered.map(isVenuePubliclySunny)).toEqual([true, false, false]);
  });

  it('keeps every affirmative development fixture coherent with the approved classifier', () => {
    const affirmative = VENUE_FIXTURE.filter((venue) => venue.directSunState === 'likely');

    expect(affirmative.length).toBeGreaterThan(0);
    for (const venue of affirmative) {
      expect(venue.weatherGateState, venue.id).toBe('not_gated');
      expect(venue.sunExposurePercent, venue.id).toBeGreaterThan(50);
      expect(['Sunny', 'Partial'], venue.id).toContain(venue.currentSunStatus);
      expect(venue.skyCondition, venue.id).toBe('clear');
    }
  });
});
