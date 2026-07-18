/**
 * External-review fix (PR #17, finding 4) — DATE-STABLE top-N truncation.
 *
 * The list route sorts by the SINGLE-INSTANT sun rank then `.slice(0, MAX_RESULTS)`.
 * With >MAX_RESULTS matches, a venue OUTSIDE the instant top-N that becomes the
 * sunniest at a scrubbed planner time was truncated away BEFORE the client (which
 * derives every scrubbed step from the cached `sunDaySeries`) ever saw it — so its
 * pin + "Mest sol" row vanished for that time. The fix truncates by the venue's
 * DAY-PEAK exposure (stable across the whole day, no payload growth) while keeping
 * the response ORDER on the single-instant rank the client re-sort expects.
 *
 * This spec drives the REAL route with a fully-mocked adapter boundary: 51 venues
 * (> MAX_RESULTS = 50) with controlled instant fields + controlled day-series so
 * the peak vs. instant divergence is deterministic.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { toVenueData, type StoredVenue } from '@/lib/services/venue-store';
import type { SunEngineOutcome } from '@/lib/services/sun-engine';
import type {
  GetVenuesResponse,
  VenueDaySeriesEntry,
  VenueSunStatus,
} from '@/lib/types/api';

const NOW = new Date('2026-06-21T10:30:00.000Z');
const CENTRE = { lat: 57.7089, lng: 11.9746 };

// Per-venue controlled sun profile: the INSTANT status (what the single-shot sort
// sees "now") and the day-series PEAK status (the best the venue reaches at some
// other planner time).
type Profile = { instant: VenueSunStatus; peak: VenueSunStatus };

const profiles = vi.hoisted(() => ({ map: new Map<string, { instant: string; peak: string }>() }));

const adapterMocks = vi.hoisted(() => ({
  applyRealSunEngine: vi.fn(),
  shouldUseRealSunEngine: vi.fn(() => true),
  computeVenueDaySeries: vi.fn(),
}));

vi.mock('@/lib/services/sun-engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/sun-engine')>();
  return {
    ...actual,
    shouldUseRealSunEngine: adapterMocks.shouldUseRealSunEngine,
    applyRealSunEngine: adapterMocks.applyRealSunEngine,
    computeVenueDaySeries: adapterMocks.computeVenueDaySeries,
  };
});

const storeMocks = vi.hoisted(() => ({ getVenues: vi.fn() }));
vi.mock('@/lib/services/venue-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/venue-store')>();
  return { ...actual, getVenues: storeMocks.getVenues };
});

import { GET as LIST_GET } from '@/app/api/venues/route';
import { clearVenueRateLimitForTests } from '@/lib/utils/rate-limit';

/** Build a minimal valid StoredVenue at the search centre (distance ~0). */
function storedVenue(index: number): StoredVenue {
  const id = `v${index}`;
  return {
    id,
    venueId: id,
    venueName: `Venue ${index}`,
    venueSlug: id,
    slug: id,
    neighborhood: 'Test',
    location: { lat: CENTRE.lat, lng: CENTRE.lng },
    currentSunStatus: 'Sunny',
    weatherGateState: 'not_gated',
    skyCondition: 'clear',
    isPartner: false,
    confidence: 90,
    distanceMeters: 0,
    sunExposurePercent: 90,
    tags: [],
  } as unknown as StoredVenue;
}

function seriesFor(peak: VenueSunStatus): VenueDaySeriesEntry[] {
  // A two-entry series: a low mid-day step and the venue's PEAK step. Only the
  // MAX matters for the truncation rank.
  return [
    {
      minutes: 6 * 60,
      sunExposurePercent: 0,
      currentSunStatus: 'NoSun',
      weatherGateState: 'not_gated',
    },
    {
      minutes: 15 * 60,
      sunExposurePercent: exposureForStatus(peak, 'peak'),
      currentSunStatus: peak,
      weatherGateState: peak === 'CloudObscured' ? 'gated' : 'not_gated',
    },
  ];
}

function exposureForStatus(status: VenueSunStatus, phase: 'instant' | 'peak'): number {
  if (status === 'Sunny') return phase === 'peak' ? 100 : 90;
  if (status === 'Partial') return 60;
  if (status === 'CloudObscured') return 100;
  if (status === 'Shaded') return 20;
  return 0;
}

function listRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/venues${query}`);
}

describe('venues route — date-stable peak-rank truncation (external-review fix)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    clearVenueRateLimitForTests();
    profiles.map.clear();
    adapterMocks.shouldUseRealSunEngine.mockReturnValue(true);

    adapterMocks.applyRealSunEngine.mockReset().mockImplementation(async (venue: StoredVenue) => {
      const profile = profiles.map.get(venue.id) ?? { instant: 'Sunny', peak: 'Sunny' };
      return {
        venue: {
          ...toVenueData(venue),
          currentSunStatus: profile.instant as VenueSunStatus,
          weatherGateState: profile.instant === 'CloudObscured' ? 'gated' : 'not_gated',
          confidence: 60,
          sunExposurePercent: exposureForStatus(profile.instant as VenueSunStatus, 'instant'),
          skyCondition: 'clear',
        },
        freshness: { sunDataSource: 'weather', weatherUpdatedAt: NOW.toISOString() },
      } satisfies SunEngineOutcome;
    });

    adapterMocks.computeVenueDaySeries.mockReset().mockImplementation(async (venue: StoredVenue) => {
      const profile = profiles.map.get(venue.id) ?? { instant: 'Sunny', peak: 'Sunny' };
      return seriesFor(profile.peak as VenueSunStatus);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    storeMocks.getVenues.mockReset();
  });

  it('keeps a venue that is OUTSIDE the instant top-50 but is the DAY-PEAK sunniest in the truncated set', async () => {
    // 50 venues that are all NoSun "now" but Sunny at their peak (fills the top-50
    // by peak), plus 1 SPECIAL venue that is NoSun now AND ... wait: to force the
    // instant-sort to drop the special venue, make the 50 fillers Partial "now"
    // (instant rank 1) with only a Partial peak, and the special venue NoSun "now"
    // (instant rank 0, so the instant sort ranks it LAST → dropped at 51) but Sunny
    // at its peak (peak rank 2, the highest of all) → the peak truncation MUST keep
    // it.
    const fillers = Array.from({ length: 50 }, (_, i) => storedVenue(i));
    for (const v of fillers) {
      profiles.map.set(v.id, { instant: 'Partial', peak: 'Partial' } satisfies Profile);
    }
    const special = storedVenue(999);
    profiles.map.set(special.id, { instant: 'NoSun', peak: 'Sunny' } satisfies Profile);

    // Order the store so the special venue is LAST (worst instant rank → the naive
    // instant-only slice would drop it at position 51).
    storeMocks.getVenues.mockResolvedValue([...fillers, special]);

    const res = await LIST_GET(listRequest(`?lat=${CENTRE.lat}&lng=${CENTRE.lng}&radiusKm=3`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenuesResponse;

    // Exactly MAX_RESULTS returned; the pre-slice match count is 51.
    expect(body.venues).toHaveLength(50);
    expect(body.totalCount).toBe(51);

    // THE HEADLINE: the special low-instant/high-peak venue survived truncation
    // (the naive instant-only slice would have dropped it).
    const kept = body.venues.find((v) => v.id === special.id);
    expect(kept, 'day-peak-sunniest venue must survive the top-50 truncation').toBeDefined();
    // Its cached day-series is present so the client can derive the peak step.
    expect(Array.isArray(kept?.sunDaySeries)).toBe(true);

    // And a filler venue (Partial peak, lower than the special's Sunny peak) was
    // the one dropped instead — the set now favours day-peak potential.
    expect(body.venues.length).toBe(50);
  });

  it('response ORDER is by the single-instant rank (client re-sort contract) even though truncation is peak-based', async () => {
    // Two obviously-ordered instant tiers among a small in-range set (no truncation
    // here — proves the ORDER stage is instant-based regardless of peak).
    const sunnyNow = storedVenue(1);
    const partialNow = storedVenue(2);
    profiles.map.set(sunnyNow.id, { instant: 'Sunny', peak: 'Partial' });
    profiles.map.set(partialNow.id, { instant: 'Partial', peak: 'Sunny' });
    storeMocks.getVenues.mockResolvedValue([partialNow, sunnyNow]);

    const res = await LIST_GET(listRequest(`?lat=${CENTRE.lat}&lng=${CENTRE.lng}&radiusKm=3`));
    const body = (await res.json()) as GetVenuesResponse;

    // Sunny-now first, Partial-now second — instant order, NOT peak order (the
    // partial-now venue has the higher peak but is ranked second for "now").
    expect(body.venues.map((v) => v.id)).toEqual([sunnyNow.id, partialNow.id]);
  });
});
