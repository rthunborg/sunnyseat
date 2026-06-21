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

import { clearVenueRateLimitForTests, GET as LIST_GET } from '@/app/api/venues/route';
import { GET as DETAIL_GET } from '@/app/api/venues/[slug]/route';

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
      confidence: 55,
      sunExposurePercent: 60,
      skyCondition: 'clear',
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
    expect(body.venue.venueName).toBe('Kafé Magasinet');
    expect(body.venue.shadowWarningMinutes).toBe(45);
    // Timeline window + peak come from the engine output.
    expect(body.venue.timeline.windows[0]).toEqual({
      start: '12:00',
      end: '16:00',
      status: 'Partial',
    });
    expect(body.venue.timeline.peakTime).toBe('14:00');
  });
});
