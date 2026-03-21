import { describe, it, expect } from 'vitest';
import { groupVenuesByStatus, countByStatus, STATUS_ORDER } from '@/lib/utils/groupVenuesByStatus';
import type { SunExposureResult } from '@/lib/types/venue';
import type { SunStatus } from '@/lib/types/design-tokens';

function makeVenue(id: string, status: SunStatus): SunExposureResult {
  return {
    venue: { id, name: `Venue ${id}`, slug: id, neighborhood: 'Haga', lat: 57.7, lng: 11.97 },
    current_status: status,
    sun_exposure_percent: 50,
    confidence: 0.8,
    windows: [],
    distance_meters: 100,
  };
}

describe('groupVenuesByStatus', () => {
  it('groups venues by status in correct order', () => {
    const venues = [
      makeVenue('v1', 'sunny'),
      makeVenue('v2', 'sunny'),
      makeVenue('v3', 'shaded'),
      makeVenue('v4', 'upcoming'),
    ];

    const groups = groupVenuesByStatus(venues);
    expect(groups).toHaveLength(3);
    expect(groups[0].status).toBe('sunny');
    expect(groups[0].venues).toHaveLength(2);
    expect(groups[1].status).toBe('upcoming');
    expect(groups[1].venues).toHaveLength(1);
    expect(groups[2].status).toBe('shaded');
    expect(groups[2].venues).toHaveLength(1);
  });

  it('excludes empty groups', () => {
    const venues = [makeVenue('v1', 'sunny')];
    const groups = groupVenuesByStatus(venues);
    expect(groups).toHaveLength(1);
    expect(groups[0].status).toBe('sunny');
  });

  it('returns empty array for empty input', () => {
    expect(groupVenuesByStatus([])).toHaveLength(0);
  });

  it('preserves venue order within each group', () => {
    const venues = [
      makeVenue('v1', 'sunny'),
      makeVenue('v2', 'sunny'),
      makeVenue('v3', 'sunny'),
    ];
    const groups = groupVenuesByStatus(venues);
    expect(groups[0].venues.map((v) => v.venue.id)).toEqual(['v1', 'v2', 'v3']);
  });

  it('STATUS_ORDER contains all four statuses', () => {
    expect(STATUS_ORDER).toEqual(['sunny', 'partial', 'upcoming', 'shaded']);
  });
});

describe('countByStatus', () => {
  it('counts venues by status correctly', () => {
    const venues = [
      makeVenue('v1', 'sunny'),
      makeVenue('v2', 'sunny'),
      makeVenue('v3', 'partial'),
      makeVenue('v4', 'upcoming'),
      makeVenue('v5', 'shaded'),
      makeVenue('v6', 'shaded'),
    ];
    const counts = countByStatus(venues);
    expect(counts).toEqual({ sunny: 2, partial: 1, upcoming: 1, shaded: 2 });
  });

  it('returns zeros for empty input', () => {
    expect(countByStatus([])).toEqual({ sunny: 0, partial: 0, upcoming: 0, shaded: 0 });
  });
});
