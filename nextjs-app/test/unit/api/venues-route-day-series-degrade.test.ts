/**
 * COVERAGE EXPANSION — Story 11.1 (AC1/AC2, Task 2)
 * `app/api/venues/route.ts` — the day-series DEGRADE path.
 *
 * The green DTO ATDD (`venues-route-day-series.atdd.test.ts`) proves the HAPPY
 * path (series attached, seed/detail byte-identical, ETag, payload) but always
 * stubs `computeVenueDaySeries` to RESOLVE. The route wraps the producer in a
 * try/catch specifically so "a series failure degrades to no series (never a 500)
 * — the client falls back to the single-instant fields" (route comment). That
 * catch branch — the whole reason the field is optional — is untested. These
 * tests pin it: a THROWING producer must NOT 500 the list, must OMIT the series
 * for the affected venue (so `deriveVenueSunAtMinutes` returns null → the client
 * keeps the server single-instant fields), and must NOT drop the other venues'
 * series (per-venue isolation).
 *
 * Mock boundary mirrors `venues-route-real-engine.test.ts` +
 * `venues-route-day-series.atdd.test.ts`: `shouldUseRealSunEngine`→true,
 * `applyRealSunEngine`→canned outcome, `computeVenueDaySeries` stubbed per case.
 * Zero live Supabase / Met.no.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { toVenueData, type StoredVenue } from '@/lib/services/venue-store';
import type { SunEngineOutcome } from '@/lib/services/sun-engine';
import type { GetVenuesResponse, VenueDaySeriesEntry, VenueSunStatus } from '@/lib/types/api';
import {
  PLANNER_START_MINUTES,
  PLANNER_END_MINUTES,
  PLANNER_STEP_MINUTES,
} from '@/lib/utils/time-planner';

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

import { GET as LIST_GET } from '@/app/api/venues/route';
import { clearVenueRateLimitForTests } from '@/lib/utils/rate-limit';

const NOW = new Date('2026-06-21T10:30:00.000Z');

function listRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/venues${query}`);
}

function fullSeries(baseStatus: VenueSunStatus = 'Sunny'): VenueDaySeriesEntry[] {
  const series: VenueDaySeriesEntry[] = [];
  for (let m = PLANNER_START_MINUTES; m <= PLANNER_END_MINUTES; m += PLANNER_STEP_MINUTES) {
    series.push({
      minutes: m,
      sunExposurePercent: 80,
      currentSunStatus: baseStatus,
      weatherGateState: baseStatus === 'CloudObscured' ? 'gated' : 'not_gated',
    });
  }
  return series;
}

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

type MaybeSeries = { slug?: string; sunDaySeries?: VenueDaySeriesEntry[] };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  clearVenueRateLimitForTests();
  adapterMocks.shouldUseRealSunEngine.mockReturnValue(true);
  adapterMocks.applyRealSunEngine.mockReset();
  adapterMocks.applyRealSunEngine.mockImplementation(async (venue: StoredVenue) =>
    computedOutcome(venue),
  );
  adapterMocks.computeVenueDaySeries.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Story 11.1 — day-series degrade path (producer throws)', () => {
  it('does NOT 500 the list when EVERY venue series compute throws', async () => {
    adapterMocks.computeVenueDaySeries.mockRejectedValue(new Error('building RPC down'));

    const res = await LIST_GET(listRequest('?lat=57.7089&lng=11.9746'));

    // The list still succeeds; the series is simply absent (degrade-safe).
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenuesResponse;
    expect(body.venues.length).toBeGreaterThan(0);
    for (const v of body.venues) {
      expect((v as MaybeSeries).sunDaySeries).toBeUndefined();
      // The single-instant engine fields still ship, so the client renders from
      // them (the derivation helper returns null → server fields used).
      expect(v.currentSunStatus).toBe('Partial');
      expect(v.confidence).toBe(55);
    }
  });

  it('omits the series ONLY for the throwing venue and keeps the others (per-venue isolation)', async () => {
    adapterMocks.computeVenueDaySeries.mockImplementation(async (venue: StoredVenue) => {
      if (venue.slug === 'test-venue-sunny') throw new Error('series compute failed');
      return fullSeries('Sunny');
    });

    const res = await LIST_GET(listRequest('?lat=57.7089&lng=11.9746'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenuesResponse;

    const failed = body.venues.find((v) => v.slug === 'test-venue-sunny') as MaybeSeries | undefined;
    expect(failed).toBeDefined();
    // The failed venue lost only its series — not its place, not its fields.
    expect(failed!.sunDaySeries).toBeUndefined();

    const others = body.venues.filter((v) => v.slug !== 'test-venue-sunny') as MaybeSeries[];
    expect(others.length).toBeGreaterThan(0);
    // Every OTHER venue still carries a full series (isolation held).
    for (const v of others) {
      expect(v.sunDaySeries).toBeDefined();
      expect(v.sunDaySeries!.length).toBe(61);
    }
  });

  it('still emits a valid ETag when the series is degraded away', async () => {
    // A degraded (series-less) response is still a normal cacheable body: the weak
    // ETag hashes { venues, meta, totalCount }, so it is present + a re-request
    // with if-none-match still 304s.
    adapterMocks.computeVenueDaySeries.mockRejectedValue(new Error('down'));

    const first = await LIST_GET(listRequest('?lat=57.7089&lng=11.9746'));
    const etag = first.headers.get('ETag');
    expect(etag).toBeTruthy();

    const second = await LIST_GET(
      new NextRequest('http://localhost/api/venues?lat=57.7089&lng=11.9746', {
        headers: { 'if-none-match': etag ?? '' },
      }),
    );
    expect(second.status).toBe(304);
  });
});
