import { describe, it, expect } from 'vitest';
import { searchVenues } from '@/lib/utils/searchVenues';
import type { SunExposureResult } from '@/lib/types/venue';

function makeVenue(
  overrides: Partial<{ id: string; name: string; slug: string; neighborhood: string; lat: number; lng: number }> = {},
  status: 'sunny' | 'partial' | 'shaded' | 'upcoming' = 'sunny'
): SunExposureResult {
  return {
    venue: {
      id: overrides.id ?? '1',
      name: overrides.name ?? 'Test Venue',
      slug: overrides.slug ?? 'test-venue',
      neighborhood: overrides.neighborhood ?? 'Linné',
      lat: overrides.lat ?? 57.7,
      lng: overrides.lng ?? 11.97,
    },
    current_status: status,
    sun_exposure_percent: 80,
    confidence: 0.9,
    windows: [],
  };
}

const venues: SunExposureResult[] = [
  makeVenue({ id: '1', name: 'Café Husaren', slug: 'cafe-husaren', neighborhood: 'Haga' }, 'sunny'),
  makeVenue({ id: '2', name: 'Sjöbaren', slug: 'sjobaren', neighborhood: 'Majorna' }, 'partial'),
  makeVenue({ id: '3', name: 'Bar Centro', slug: 'bar-centro', neighborhood: 'Linné' }, 'shaded'),
  makeVenue({ id: '4', name: 'Hagabion Café', slug: 'hagabion-cafe', neighborhood: 'Haga' }, 'upcoming'),
  makeVenue({ id: '5', name: 'Linnéterrassen', slug: 'linneterrassen', neighborhood: 'Linné' }, 'sunny'),
  makeVenue({ id: '6', name: 'Puta Madre', slug: 'puta-madre', neighborhood: 'Centrum' }, 'partial'),
];

describe('searchVenues', () => {
  it('returns empty array for empty query', () => {
    expect(searchVenues(venues, '')).toEqual([]);
    expect(searchVenues(venues, '   ')).toEqual([]);
  });

  it('matches venue name case-insensitively', () => {
    const results = searchVenues(venues, 'café');
    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('Café Husaren');
    expect(results[1].name).toBe('Hagabion Café');
  });

  it('matches neighborhood case-insensitively', () => {
    const results = searchVenues(venues, 'haga');
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.name)).toEqual(['Café Husaren', 'Hagabion Café']);
  });

  it('returns correct SearchResult shape', () => {
    const results = searchVenues(venues, 'sjö');
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      venueId: '2',
      name: 'Sjöbaren',
      slug: 'sjobaren',
      neighborhood: 'Majorna',
      lat: 57.7,
      lng: 11.97,
      currentStatus: 'partial',
    });
  });

  it('limits results to specified limit', () => {
    const results = searchVenues(venues, 'a', 2);
    expect(results).toHaveLength(2);
  });

  it('defaults to max 5 results', () => {
    // All 6 venues contain 'a'
    const results = searchVenues(venues, 'a');
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('returns empty array for no matches', () => {
    expect(searchVenues(venues, 'zzzzz')).toEqual([]);
  });

  it('handles empty venues array', () => {
    expect(searchVenues([], 'café')).toEqual([]);
  });

  it('matches substring in middle of name', () => {
    const results = searchVenues(venues, 'terr');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Linnéterrassen');
  });
});
