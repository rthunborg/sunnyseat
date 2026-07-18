/**
 * STORY 8.3 — real-engine route WIRING (SUNNYSEAT_SUN_ENGINE=real).
 *
 * Proves AC #4's "flag on" half at the route layer: /api/venues + /api/venues/
 * [slug] route the venues through the sun-engine adapter, aggregate its real
 * freshness into the response meta + X-* headers, bypass the planner/fixture-
 * weather stages, and feed the detail timeline from the engine output.
 *
 * The adapter boundary is mocked here so the route test is deterministic and has
 * ZERO live Supabase / Met.no dependency. The adapter's own engine integration
 * (real lib/solar + mocked RPC + mocked weather) is covered by sun-engine.test.ts;
 * the byte-identical default seed path is covered by venues-route.test.ts /
 * venue-detail-route.test.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { toVenueData, type StoredVenue } from '@/lib/services/venue-store';
import type { SunEngineOutcome } from '@/lib/services/sun-engine';
import type { GetVenueDetailResponse, GetVenuesResponse } from '@/lib/types/api';

const adapterMocks = vi.hoisted(() => ({
  applyRealSunEngine: vi.fn(),
  shouldUseRealSunEngine: vi.fn(() => true),
}));

vi.mock('@/lib/services/sun-engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/sun-engine')>();
  return {
    ...actual,
    shouldUseRealSunEngine: adapterMocks.shouldUseRealSunEngine,
    applyRealSunEngine: adapterMocks.applyRealSunEngine,
  };
});

import { GET as LIST_GET } from '@/app/api/venues/route';
import { GET as DETAIL_GET } from '@/app/api/venues/[slug]/route';
import { clearVenueRateLimitForTests } from '@/lib/utils/rate-limit';

const NOW = new Date('2026-06-21T10:30:00.000Z');

function listRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/venues${query}`);
}

function detailRequest(slug: string, query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/venues/${slug}${query}`);
}

/** A canned engine outcome: Partial @ 55% confidence with a replaced sun window. */
function computedOutcome(venue: StoredVenue): SunEngineOutcome {
  return {
    venue: {
      ...toVenueData(venue),
      currentSunStatus: 'Partial',
      weatherGateState: 'not_gated',
      confidence: 55,
      sunExposurePercent: 60,
      skyCondition: 'clear',
      sunWindow: { start: '12:00', end: '16:00' },
    },
    freshness: { sunDataSource: 'weather', weatherUpdatedAt: NOW.toISOString() },
    peakTime: '14:00',
  };
}

/**
 * A weather-gated outcome: geometrically sunlit (high solläge, real sun window)
 * but `applyCloudGate` flipped the headline to `CloudObscured`. This is the LIVE
 * real-engine shape that the fixture/e2e cases never produce.
 */
function cloudObscuredOutcome(venue: StoredVenue): SunEngineOutcome {
  return {
    venue: {
      ...toVenueData(venue),
      currentSunStatus: 'CloudObscured',
      weatherGateState: 'not_gated',
      confidence: 60,
      sunExposurePercent: 90,
      skyCondition: 'overcast',
      sunWindow: { start: '12:00', end: '16:00' },
    },
    freshness: { sunDataSource: 'weather', weatherUpdatedAt: NOW.toISOString() },
    peakTime: '14:00',
  };
}

/** A degraded / weather-unavailable engine outcome. */
function unavailableOutcome(venue: StoredVenue): SunEngineOutcome {
  return {
    venue: {
      ...toVenueData(venue),
      currentSunStatus: 'NoSun',
      weatherGateState: 'not_gated',
      confidence: 20,
      sunExposurePercent: 0,
      skyCondition: 'unavailable',
    },
    freshness: { sunDataSource: 'geometry-only' },
  };
}

describe('venue routes with SUNNYSEAT_SUN_ENGINE=real (route wiring)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    clearVenueRateLimitForTests();
    adapterMocks.shouldUseRealSunEngine.mockReturnValue(true);
    adapterMocks.applyRealSunEngine.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('list route replaces sun fields from the engine and emits aggregated weather freshness', async () => {
    adapterMocks.applyRealSunEngine.mockImplementation(async (venue: StoredVenue) =>
      computedOutcome(venue),
    );

    const res = await LIST_GET(listRequest('?lat=57.7089&lng=11.9746'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenuesResponse;

    expect(body.venues.length).toBeGreaterThan(0);
    expect(res.headers.get('x-sun-data-source')).toBe('weather');
    expect(body.meta.sunDataSource).toBe('weather');
    expect(body.meta.weatherUpdatedAt).toBe(NOW.toISOString());
    // The adapter ran once per stored venue.
    expect(adapterMocks.applyRealSunEngine).toHaveBeenCalled();
    // Engine fields replaced the seed: 55% confidence, replaced sun window.
    expect(body.venues.every((v) => v.confidence === 55)).toBe(true);
    const sunny = body.venues.find((v) => v.slug === 'test-venue-sunny');
    expect(sunny?.sunWindow).toEqual({ start: '12:00', end: '16:00' });
  });

  it('preserves openingHours end-to-end on the REAL-engine list DTO (Story 11.4 AC1 — live path)', async () => {
    // Story 11.4 (AC1): opening hours must survive the LIVE production path
    // (SUN_ENGINE=real), not just the seed path. The engine builds its DTO from
    // `mergeSunFields(toVenueData(venue), fields)` — it spreads the `toVenueData`
    // base (which now carries `openingHours`) and only overwrites/deletes the six
    // sun-output fields. This pins that invariant: a future refactor that stopped
    // spreading the base, or dropped `openingHours` from `toVenueData`, would
    // silently blank the live card and must fail here.
    adapterMocks.applyRealSunEngine.mockImplementation(async (venue: StoredVenue) =>
      computedOutcome(venue),
    );

    const res = await LIST_GET(listRequest('?lat=57.7089&lng=11.9746'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenuesResponse;

    // The two sunny fixtures seed a real value → present after the engine runs.
    const sunny = body.venues.find((v) => v.slug === 'test-venue-sunny');
    // Story 11.9 (AC2): the per-weekday structure survives the engine merge.
    expect(sunny?.openingHours?.['1']).toEqual({ open: '11:00', close: '22:00' });

    // Absent → absent: a fixture without opening hours never gains a fabricated
    // value through the engine merge either.
    const withoutHours = body.venues.filter((v) => v.openingHours === undefined);
    expect(withoutHours.length).toBeGreaterThan(0);
    for (const venue of withoutHours) {
      expect(venue).not.toHaveProperty('openingHours');
    }
  });

  it('does not fabricate openingHours when the engine geometry-degrades (weather-unavailable path)', async () => {
    // Even on the degraded (geometry-only, no weather) outcome the merge keeps the
    // static store-carried openingHours untouched — the engine owns only the sun
    // fields, never the venue's static attributes.
    adapterMocks.applyRealSunEngine.mockImplementation(async (venue: StoredVenue) =>
      unavailableOutcome(venue),
    );

    const res = await LIST_GET(listRequest('?lat=57.7089&lng=11.9746'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenuesResponse;

    const sunny = body.venues.find((v) => v.slug === 'test-venue-sunny');
    // Sun fields degraded, but the static opening hours are still surfaced.
    expect(sunny?.skyCondition).toBe('unavailable');
    expect(sunny?.openingHours?.['1']).toEqual({ open: '11:00', close: '22:00' });
  });

  it('degrades a single throwing venue to its seed without 500ing the list (allSettled invariant, 5.2)', async () => {
    // Even though applyRealSunEngine degrades internally today, the route fan-out
    // must be STRUCTURALLY resilient: a future adapter throw cannot 500 the list.
    adapterMocks.applyRealSunEngine.mockImplementation(async (venue: StoredVenue) => {
      if (venue.slug === 'test-venue-sunny') throw new Error('adapter blew up');
      return computedOutcome(venue);
    });

    const res = await LIST_GET(listRequest('?lat=57.7089&lng=11.9746'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenuesResponse;

    // The throwing venue is still present, degraded to its seed values
    // (Sunny / 92), not the engine's Partial / 55.
    const sunny = body.venues.find((v) => v.slug === 'test-venue-sunny');
    expect(sunny).toBeDefined();
    expect(sunny?.currentSunStatus).toBe('Sunny');
    expect(sunny?.confidence).toBe(92);

    // Other venues still received engine values.
    const others = body.venues.filter((v) => v.slug !== 'test-venue-sunny');
    expect(others.length).toBeGreaterThan(0);
    expect(others.every((v) => v.confidence === 55)).toBe(true);
  });

  it('list route bypasses the planner seasonal sim on the real path (DECISION C)', async () => {
    adapterMocks.applyRealSunEngine.mockImplementation(async (venue: StoredVenue) =>
      computedOutcome(venue),
    );

    // A future planner selection would normally drive applyPlannerSelectionToVenue;
    // on the real path the engine output is used verbatim instead.
    const res = await LIST_GET(
      listRequest('?lat=57.7089&lng=11.9746&date=2026-07-10&time=20:00'),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenuesResponse;
    const sunny = body.venues.find((v) => v.slug === 'test-venue-sunny');
    expect(sunny?.currentSunStatus).toBe('Partial'); // engine value, not planner 'Shaded'
    expect(sunny?.confidence).toBe(55);
  });

  it('list route reports geometry-only when the engine has no weather', async () => {
    adapterMocks.applyRealSunEngine.mockImplementation(async (venue: StoredVenue) =>
      unavailableOutcome(venue),
    );

    const res = await LIST_GET(listRequest('?lat=57.7089&lng=11.9746'));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('must-revalidate');
    const body = (await res.json()) as GetVenuesResponse;
    expect(body.meta.sunDataSource).toBe('geometry-only');
    expect(res.headers.get('x-weather-updated-at')).toBeNull();
    expect(body.venues.every((v) => v.skyCondition === 'unavailable')).toBe(true);
  });

  it('sorts a high-solläge CloudObscured venue by its geometric solläge, agreeing with the client re-sort (10.2 AC2 / review Patch[Med])', async () => {
    // STORY 10.1 (AC4): the weather-gated `CloudObscured` status must round-trip
    // through the route AND sort sensibly. A missing rank key would
    // make `rank(CloudObscured) - rank(other) = NaN` and silently corrupt the
    // list order; here we assign a distinct status per venue-id parity and assert
    // the emitted order is Sunny < Partial < CloudObscured < Shaded < NoSun.
    const byId: Record<string, {
      currentSunStatus: 'Sunny' | 'Partial' | 'CloudObscured' | 'Shaded' | 'NoSun';
      sunExposurePercent: number;
    }> = {
      '1': { currentSunStatus: 'Sunny', sunExposurePercent: 95 },
      '2': { currentSunStatus: 'Partial', sunExposurePercent: 60 },
      // Geometrically sunlit but weather-gated: exposure stays high (two-signal).
      '3': { currentSunStatus: 'CloudObscured', sunExposurePercent: 90 },
      '4': { currentSunStatus: 'Shaded', sunExposurePercent: 20 },
      '5': { currentSunStatus: 'NoSun', sunExposurePercent: 0 },
    };
    adapterMocks.applyRealSunEngine.mockImplementation(async (venue: StoredVenue) => {
      const fields = byId[venue.id] ?? { currentSunStatus: 'Sunny' as const, sunExposurePercent: 95 };
      return {
        venue: {
          ...toVenueData(venue),
          currentSunStatus: fields.currentSunStatus,
          weatherGateState: 'not_gated',
          confidence: 60,
          sunExposurePercent: fields.sunExposurePercent,
          skyCondition: fields.currentSunStatus === 'CloudObscured' ? 'overcast' : 'clear',
        },
        freshness: { sunDataSource: 'weather', weatherUpdatedAt: NOW.toISOString() },
      } satisfies SunEngineOutcome;
    });

    // Wide radius so all five ranked venues are in range.
    const res = await LIST_GET(listRequest('?lat=57.7089&lng=11.9746&radiusKm=3'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenuesResponse;

    // Story 10.2 review [Patch][Med]: the SERVER sort must use the SAME
    // solläge-aware CloudObscured rank as the client `getVenueSunRankForList`,
    // so the pre-slice order (which `.slice(0, 50)` truncates) agrees with the
    // client re-sort. "Higher is better" [0,2]: Sunny=2, Partial=1, Shaded/NoSun=0,
    // CloudObscured=(percent/100)*2. Venue '3' is obscured @ 90% → rank 1.8, so it
    // ranks ABOVE Partial(1) — a high-solläge obscured venue is NOT sunk below a
    // genuine partial the way the old fixed CloudObscured:2-tier sort did.
    const rank = (v: { currentSunStatus: string; sunExposurePercent: number }): number => {
      if (v.currentSunStatus === 'CloudObscured') {
        return (Math.max(0, Math.min(100, v.sunExposurePercent)) / 100) * 2;
      }
      return v.currentSunStatus === 'Sunny' ? 2 : v.currentSunStatus === 'Partial' ? 1 : 0;
    };
    const ranks = body.venues.map((v) => rank(v));
    // Every rank is a finite number (no undefined ⇒ NaN leaked into the sort).
    expect(ranks.every((r) => Number.isFinite(r))).toBe(true);
    // The emitted order is NON-INCREASING by rank (higher = better, sorted first).
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i - 1]).toBeGreaterThanOrEqual(ranks[i]);
    }
    // The CloudObscured venue is present and preserved (not downgraded).
    const gated = body.venues.find((v) => v.id === '3');
    expect(gated?.currentSunStatus).toBe('CloudObscured');
    // Its geometric clear-sky potential survived the gate + the round-trip.
    expect(gated?.sunExposurePercent).toBe(90);
    // 90%-solläge obscured (rank 1.8) sits AFTER the Sunny venue but BEFORE the
    // Partial one — ranked by its surviving geometric solläge, matching the client.
    const gatedIndex = body.venues.findIndex((v) => v.id === '3');
    const firstPartial = body.venues.map((v) => v.currentSunStatus).indexOf('Partial');
    const firstSunny = body.venues.map((v) => v.currentSunStatus).indexOf('Sunny');
    expect(gatedIndex).toBeGreaterThan(firstSunny);
    expect(gatedIndex).toBeLessThan(firstPartial);
  });

  it('detail route feeds the timeline projection from the engine output', async () => {
    adapterMocks.applyRealSunEngine.mockImplementation(async (venue: StoredVenue) =>
      computedOutcome(venue),
    );

    const res = await DETAIL_GET(detailRequest('test-venue-sunny'), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenueDetailResponse;

    expect(res.headers.get('x-sun-data-source')).toBe('weather');
    expect(body.meta?.sunDataSource).toBe('weather');
    expect(body.venue.confidence).toBe(55);
    // Durable detail attributes (Story 8.2) are untouched by the engine swap.
    // Story 11.9 (AC4): shadowWarningMinutes is dropped end-to-end (no assertion).
    expect(body.venue.venueName).toBe('Kafé Magasinet');
    // Timeline window + peak come from the engine output.
    expect(body.venue.timeline.windows[0]).toEqual({
      start: '12:00',
      end: '16:00',
      status: 'Partial',
    });
    // Story 11.9 (AC3): the ENGINE timeline.peakTime survives — it is the live
    // timeline-derived value, NOT the dropped stored `peak_time` column.
    expect(body.venue.timeline.peakTime).toBe('14:00');
  });

  it('remaps a CloudObscured detail timeline window to Partial clear-sky potential (10.2 AC2/AC4, iter-2 Patch[High])', async () => {
    // Iteration-2 review [Patch][High]: on the LIVE real-engine path
    // `buildDetailDto` sets the timeline window status from
    // `adjustedVenue.currentSunStatus`, which after `applyCloudGate` can be
    // `CloudObscured`. The SERVER-loaded `detail.timeline` is consumed DIRECTLY by
    // VenueDetailContent — the client `timelineFromListVenue` CloudObscured→Partial
    // remap only guards the pre-load fallback and never runs on the loaded DTO.
    // An unremapped `CloudObscured` window is unhandled by SunTimeline (blank bar)
    // and mislabelled "Shaded" (the exact dishonest label AC4 forbids). The fix
    // mirrors the client remap in the server buildDetailDto: the sun-window timeline
    // is geometric clear-sky POTENTIAL, so a weather-gated headline renders as
    // `Partial`, never `CloudObscured`.
    adapterMocks.applyRealSunEngine.mockImplementation(async (venue: StoredVenue) =>
      cloudObscuredOutcome(venue),
    );

    const res = await DETAIL_GET(detailRequest('test-venue-sunny'), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenueDetailResponse;

    // The venue HEADLINE keeps the honest weather-gated value (two-signal model).
    expect(body.venue.currentSunStatus).toBe('CloudObscured');
    // But the TIMELINE window ships the geometric potential, never CloudObscured.
    expect(body.venue.timeline.windows.length).toBeGreaterThan(0);
    expect(body.venue.timeline.windows[0]).toEqual({
      start: '12:00',
      end: '16:00',
      status: 'Partial',
    });
    // Hard invariant: no detail timeline window is EVER shipped as CloudObscured
    // (SunTimeline/bestWindowLabel do not handle it).
    expect(
      body.venue.timeline.windows.every((w) => w.status !== 'CloudObscured'),
    ).toBe(true);
  });
});
