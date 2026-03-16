import { describe, it, expect } from 'vitest';
import { sortVenues, getTimeOfDayContext } from '@/lib/utils/sortVenues';
import type { SunExposureResult } from '@/lib/types/venue';

function makeVenue(
  overrides: Partial<{
    id: string;
    status: 'sunny' | 'partial' | 'shaded' | 'upcoming';
    distance: number;
    windows: { start: string; end: string }[];
  }> = {}
): SunExposureResult {
  const id = overrides.id ?? 'v1';
  return {
    venue: { id, name: `Venue ${id}`, slug: id, neighborhood: 'Test', lat: 57.7, lng: 11.97 },
    patio: { id: `p-${id}`, venue_id: id, geometry: { type: 'Polygon', coordinates: [] } },
    current_status: overrides.status ?? 'sunny',
    sun_exposure_percent: 80,
    confidence: 0.85,
    windows: (overrides.windows ?? []).map((w) => ({
      start: w.start,
      end: w.end,
      sun_status: 'sunny' as const,
      sky_condition: 'clear' as const,
    })),
    distance_meters: overrides.distance ?? 500,
  };
}

describe('sortVenues', () => {
  it('sorts by sun status tier: sunny → partial → upcoming → shaded', () => {
    const venues = [
      makeVenue({ id: 'shaded', status: 'shaded' }),
      makeVenue({ id: 'sunny', status: 'sunny' }),
      makeVenue({ id: 'upcoming', status: 'upcoming' }),
      makeVenue({ id: 'partial', status: 'partial' }),
    ];
    const sorted = sortVenues(venues);
    expect(sorted.map((v) => v.current_status)).toEqual([
      'sunny',
      'partial',
      'upcoming',
      'shaded',
    ]);
  });

  it('sorts by distance within the same tier', () => {
    const venues = [
      makeVenue({ id: 'far', status: 'sunny', distance: 900 }),
      makeVenue({ id: 'near', status: 'sunny', distance: 100 }),
      makeVenue({ id: 'mid', status: 'sunny', distance: 500 }),
    ];
    const sorted = sortVenues(venues);
    expect(sorted.map((v) => v.venue.id)).toEqual(['near', 'mid', 'far']);
  });

  it('handles missing distance_meters gracefully', () => {
    const venues = [
      makeVenue({ id: 'no-dist', status: 'sunny' }),
      makeVenue({ id: 'with-dist', status: 'sunny', distance: 100 }),
    ];
    // Remove distance from first venue
    venues[0].distance_meters = undefined;
    const sorted = sortVenues(venues);
    expect(sorted[0].venue.id).toBe('with-dist');
  });

  it('does not mutate the input array', () => {
    const venues = [
      makeVenue({ id: 'b', status: 'shaded' }),
      makeVenue({ id: 'a', status: 'sunny' }),
    ];
    const original = [...venues];
    sortVenues(venues);
    expect(venues).toEqual(original);
  });

  it('returns empty array for empty input', () => {
    expect(sortVenues([])).toEqual([]);
  });
});

describe('getTimeOfDayContext', () => {
  it('returns morning for 08:00 Stockholm time', () => {
    // Create a date that is 08:00 in Stockholm
    const date = new Date('2026-03-15T07:00:00Z'); // UTC+1 in March → 08:00 Stockholm
    expect(getTimeOfDayContext(date)).toBe('morning');
  });

  it('returns afternoon for 14:00 Stockholm time', () => {
    const date = new Date('2026-03-15T13:00:00Z'); // 14:00 Stockholm
    expect(getTimeOfDayContext(date)).toBe('afternoon');
  });

  it('returns evening for 20:00 Stockholm time', () => {
    const date = new Date('2026-03-15T19:00:00Z'); // 20:00 Stockholm
    expect(getTimeOfDayContext(date)).toBe('evening');
  });
});
