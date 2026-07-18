import { describe, expect, it } from 'vitest';
import { applyPlannerSelectionToVenue } from '@/lib/services/venue-planner';
import type { VenueDataDto } from '@/lib/types/api';

const BASE_VENUE: VenueDataDto = {
  id: '1',
  venueId: '1',
  venueName: 'Kafé Magasinet',
  venueSlug: 'test-venue-sunny',
  slug: 'test-venue-sunny',
  neighborhood: 'Inom Vallgraven',
  location: { lat: 57.705, lng: 11.97 },
  currentSunStatus: 'Sunny',
  weatherGateState: 'not_gated',
  skyCondition: 'clear',
  isPartner: true,
  confidence: 92,
  distanceMeters: 0,
  sunExposurePercent: 95,
  tags: [],
  sunWindow: { start: '13:00', end: '18:30' },
};

describe('venue planner fixture projection', () => {
  it('uses the selected future date to adjust the effective sun window', () => {
    const summer = applyPlannerSelectionToVenue(BASE_VENUE, {
      date: '2026-06-21',
      time: '18:45',
      isFutureDate: true,
    });
    const autumn = applyPlannerSelectionToVenue(BASE_VENUE, {
      date: '2026-10-31',
      time: '18:45',
      isFutureDate: true,
    });

    expect(summer.currentSunStatus).toBe('Sunny');
    expect(summer.sunWindow).not.toEqual(BASE_VENUE.sunWindow);
    expect(autumn.sunWindow).toEqual(BASE_VENUE.sunWindow);
    expect(summer.sunExposurePercent).toBeGreaterThan(autumn.sunExposurePercent);
    expect(autumn.currentSunStatus).toBe('Shaded');
  });

  it('uses fixture weather conditions to dampen future-date exposure', () => {
    const clear = applyPlannerSelectionToVenue(BASE_VENUE, {
      date: '2026-06-21',
      time: '15:00',
      isFutureDate: true,
    });
    const overcast = applyPlannerSelectionToVenue(
      { ...BASE_VENUE, skyCondition: 'overcast' },
      {
        date: '2026-06-21',
        time: '15:00',
        isFutureDate: true,
      },
    );

    expect(clear.currentSunStatus).toBe('Sunny');
    expect(overcast.sunExposurePercent).toBeLessThan(clear.sunExposurePercent);
    expect(overcast.currentSunStatus).toBe('Partial');
    expect(overcast.confidence).toBeLessThan(clear.confidence);
  });

  it('preserves geometry-only exposure and confidence when weather is unavailable', () => {
    const clear = applyPlannerSelectionToVenue(BASE_VENUE, {
      date: '2026-06-21',
      time: '15:00',
      isFutureDate: true,
    });
    const unavailable = applyPlannerSelectionToVenue(
      { ...BASE_VENUE, skyCondition: 'unavailable' },
      {
        date: '2026-06-21',
        time: '15:00',
        isFutureDate: true,
      },
    );

    expect(unavailable.sunExposurePercent).toBe(clear.sunExposurePercent);
    expect(unavailable.currentSunStatus).toBe(clear.currentSunStatus);
    expect(unavailable.confidence).toBe(clear.confidence);
  });

  it('does not collapse short venue sun windows during low-season adjustment', () => {
    const venue = {
      ...BASE_VENUE,
      sunWindow: { start: '13:00', end: '13:15' },
    };

    const projected = applyPlannerSelectionToVenue(venue, {
      date: '2026-10-31',
      time: '13:10',
      isFutureDate: true,
    });

    expect(projected.currentSunStatus).not.toBe('Shaded');
    expect(projected.sunExposurePercent).toBeGreaterThan(35);
  });
});
