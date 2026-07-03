import { describe, expect, it } from 'vitest';
import {
  getVenueSunRankForList,
  isVenueSunnyForList,
  sortVenuesForList,
} from '@/components/custom/venue/VenueList';
import type { VenueDataDto } from '@/lib/types/api';

/**
 * Story 10.2 — automation coverage expansion (TEA).
 *
 * The story's own VenueList.test.tsx proves the RELATIVE ordering of the
 * obscured-solläge ranking through a full render (high-solläge obscured >
 * low-solläge partial, and the inverse). These unit tests exercise the pure
 * ranking helpers directly for the residual branch/boundary gaps the
 * render-level sort tests did not touch:
 *   - the exact tie boundaries (100% obscured ties Sunny; 50% ties Partial),
 *     where the distance tiebreak — not the sun rank — decides ordering;
 *   - the defensive non-finite / undefined solläge branch (→ rank 0, never
 *     NaN, so the sort comparator can never be corrupted);
 *   - clamping of out-of-range solläge into the [0, 2] rank space;
 *   - the AC1 amber-chrome guard: `isVenueSunnyForList` is false for an
 *     obscured venue regardless of how high its solläge is.
 *
 * All assertions are RELATIVE / boundary, never an absolute magic rank number
 * (epic-10 "a gate re-tune survives" convention).
 */

function makeVenue(overrides: Partial<VenueDataDto>): VenueDataDto {
  return {
    id: 'v',
    venueId: 'v',
    venueName: 'Venue',
    venueSlug: 'venue',
    slug: 'venue',
    neighborhood: 'Centrum',
    location: { lat: 57.7, lng: 11.97 },
    currentSunStatus: 'Sunny',
    isPartner: false,
    confidence: 80,
    distanceMeters: 100,
    sunExposurePercent: 80,
    tags: [],
    ...overrides,
  } as VenueDataDto;
}

describe('getVenueSunRankForList — obscured solläge ranking (Story 10.2 AC2)', () => {
  it('ranks a 100%-solläge obscured venue equal to a Sunny venue (top-tier tie)', () => {
    const obscured = makeVenue({ currentSunStatus: 'CloudObscured', sunExposurePercent: 100 });
    const sunny = makeVenue({ currentSunStatus: 'Sunny' });
    // A fully-lit-but-cloudy terrace is geometrically as good as a sunny one —
    // the gate does not sink it below the sunny tier. Tie, not less-than.
    expect(getVenueSunRankForList(obscured)).toBe(getVenueSunRankForList(sunny));
  });

  it('ranks a 50%-solläge obscured venue equal to a Partial venue (mid-tier tie)', () => {
    const obscured = makeVenue({ currentSunStatus: 'CloudObscured', sunExposurePercent: 50 });
    const partial = makeVenue({ currentSunStatus: 'Partial' });
    expect(getVenueSunRankForList(obscured)).toBe(getVenueSunRankForList(partial));
  });

  it('places a high-solläge obscured venue strictly between Partial and Sunny', () => {
    const obscured = makeVenue({ currentSunStatus: 'CloudObscured', sunExposurePercent: 95 });
    const sunny = makeVenue({ currentSunStatus: 'Sunny' });
    const partial = makeVenue({ currentSunStatus: 'Partial' });
    expect(getVenueSunRankForList(obscured)).toBeGreaterThan(getVenueSunRankForList(partial));
    expect(getVenueSunRankForList(obscured)).toBeLessThan(getVenueSunRankForList(sunny));
  });

  it('sinks a low-solläge obscured venue to (or below) the Shaded tier', () => {
    const obscured = makeVenue({ currentSunStatus: 'CloudObscured', sunExposurePercent: 5 });
    const shaded = makeVenue({ currentSunStatus: 'Shaded' });
    // 5% → rank 0.1 — above bare Shaded(0) but well below Partial(1). Never
    // out-ranks a genuine geometric partial under the gate.
    expect(getVenueSunRankForList(obscured)).toBeLessThan(getVenueSunRankForList(makeVenue({ currentSunStatus: 'Partial' })));
    expect(getVenueSunRankForList(obscured)).toBeGreaterThanOrEqual(getVenueSunRankForList(shaded));
  });

  it('returns 0 (never NaN) for an obscured venue with non-finite solläge', () => {
    const rank = getVenueSunRankForList(
      makeVenue({ currentSunStatus: 'CloudObscured', sunExposurePercent: Number.NaN }),
    );
    // A NaN rank would poison the Array.prototype.sort comparator (unstable,
    // non-deterministic order). The helper must coerce it to a finite 0.
    expect(Number.isNaN(rank)).toBe(false);
    expect(rank).toBe(0);
  });

  it('clamps out-of-range obscured solläge into the [0, 2] rank space', () => {
    const over = getVenueSunRankForList(
      makeVenue({ currentSunStatus: 'CloudObscured', sunExposurePercent: 150 }),
    );
    const under = getVenueSunRankForList(
      makeVenue({ currentSunStatus: 'CloudObscured', sunExposurePercent: -20 }),
    );
    // >100 does not exceed the Sunny(2) ceiling; <0 does not go below Shaded(0).
    expect(over).toBe(getVenueSunRankForList(makeVenue({ currentSunStatus: 'Sunny' })));
    expect(under).toBe(0);
  });

  it('leaves the non-obscured tiers byte-identical (clear-sky list unchanged)', () => {
    expect(getVenueSunRankForList(makeVenue({ currentSunStatus: 'Sunny' }))).toBe(2);
    expect(getVenueSunRankForList(makeVenue({ currentSunStatus: 'Partial' }))).toBe(1);
    expect(getVenueSunRankForList(makeVenue({ currentSunStatus: 'Shaded' }))).toBe(0);
    expect(getVenueSunRankForList(makeVenue({ currentSunStatus: 'NoSun' }))).toBe(0);
  });
});

describe('getVenueSunRankForList — tie is broken by distance (sort integration)', () => {
  it('orders a 100%-obscured and a Sunny venue by distance, not sun rank', () => {
    const nearSunny = makeVenue({ id: 'sunny-near', currentSunStatus: 'Sunny', distanceMeters: 50 });
    const farObscured = makeVenue({
      id: 'obscured-far',
      currentSunStatus: 'CloudObscured',
      sunExposurePercent: 100,
      distanceMeters: 400,
    });
    // Equal sun rank (2 vs 2) → the distance tiebreak in sortVenuesForList
    // decides: the nearer venue wins regardless of which is cloudy.
    const sorted = sortVenuesForList([farObscured, nearSunny], 'sun');
    expect(sorted.map((v) => v.id)).toEqual(['sunny-near', 'obscured-far']);
  });
});

describe('isVenueSunnyForList — obscured is never amber (Story 10.2 AC1)', () => {
  it('is false for a CloudObscured venue even at 100% solläge', () => {
    expect(
      isVenueSunnyForList(makeVenue({ currentSunStatus: 'CloudObscured', sunExposurePercent: 100 })),
    ).toBe(false);
  });

  it('still reports Sunny and Partial venues as amber-sunny', () => {
    expect(isVenueSunnyForList(makeVenue({ currentSunStatus: 'Sunny' }))).toBe(true);
    expect(isVenueSunnyForList(makeVenue({ currentSunStatus: 'Partial' }))).toBe(true);
    expect(isVenueSunnyForList(makeVenue({ currentSunStatus: 'Shaded' }))).toBe(false);
  });
});
