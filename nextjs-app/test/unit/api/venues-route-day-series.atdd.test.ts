/**
 * ATDD RED-PHASE acceptance scaffolds — Story 11.1 (AC1 + AC2, Task 2 + Task 6)
 * "Client-Side Day-Series — list DTO contract, seed byte-identical, ETag, payload"
 *
 * =========================================================================
 * WHAT THIS SPEC IS
 * =========================================================================
 * The API/contract half of the day-series (test-design dedup: DTO shape + payload
 * live at API level; the derivation math at unit; the request-count at e2e):
 *
 *   - AC1/Task 2 — the REAL-engine list response (`useRealEngine` branch) carries a
 *     per-venue `sunDaySeries` (one entry per 15-min planner step across the range),
 *     each with `sunExposurePercent` + the weather-gated `currentSunStatus`.
 *   - The DEFAULT seed path (flag OFF, what CI runs) and the `[slug]` detail DTO stay
 *     BYTE-IDENTICAL — no `sunDaySeries` — so every existing consumer compiles and the
 *     detail view keeps using its own `timeline` (Story 11.6 owns the render change).
 *   - The weak ETag already hashes the full venues array, so the series is covered —
 *     the ETag/304 path still holds with the larger payload.
 *   - AC2/Task 6 — the GZIPPED payload for ~all seeded venues × 61 steps is MEASURED
 *     and a guard set FROM THE MEASUREMENT. The ceiling is `UNKNOWN` by design (see the
 *     PAYLOAD_CEILING_BYTES TODO); the dev records the measured size in the Dev Agent
 *     Record and sets the guard — do NOT invent a number.
 *
 * =========================================================================
 * MOCK BOUNDARY
 * =========================================================================
 * Same route-wiring pattern as `venues-route-real-engine.test.ts`: mock
 * `shouldUseRealSunEngine`→true and `applyRealSunEngine`→a canned outcome, so the
 * real-engine branch runs deterministically with ZERO live Supabase/Met.no. The
 * canned outcome carries a `sunDaySeries` (the shape Task 1/2 threads through
 * `SunEngineOutcome`), so this test asserts the ROUTE forwards it onto the DTO —
 * the engine's own per-step parity is covered by
 * `sun-engine.day-series-parity.atdd.test.ts`.
 *
 * =========================================================================
 * RED PHASE
 * =========================================================================
 * Every block is `describe.skip`. `sunDaySeries` is not yet on `VenueDataDto`
 * nor on `SunEngineOutcome`, and the route does not yet forward it. The canned
 * outcome attaches it via a loose cast so the file compiles now; un-skip as
 * Task 2 lands.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gzipSync } from 'node:zlib';
import { NextRequest } from 'next/server';
import { toVenueData, type StoredVenue } from '@/lib/services/venue-store';
import type { SunEngineOutcome } from '@/lib/services/sun-engine';
import type { GetVenuesResponse, VenueSunStatus } from '@/lib/types/api';
import {
  PLANNER_START_MINUTES,
  PLANNER_END_MINUTES,
  PLANNER_STEP_MINUTES,
} from '@/lib/utils/time-planner';

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

// Payload guard ceiling — UNKNOWN by design (test-design R-003/R-012). The dev
// MEASURES the real gzipped size (see the measurement test below), records it in
// the Dev Agent Record, and replaces this TODO with the measured guard before
// un-skipping. Never invent a number.
// TODO(dev, Task 6): set PAYLOAD_CEILING_BYTES from the recorded measurement.
const PAYLOAD_CEILING_BYTES = Number.NaN; // <-- replace with the measured ceiling

function listRequest(query: string, headers?: HeadersInit): NextRequest {
  return new NextRequest(`http://localhost/api/venues${query}`, { headers });
}
function detailRequest(slug: string): NextRequest {
  return new NextRequest(`http://localhost/api/venues/${slug}`);
}

/** Build a full 61-entry gated day-series for a venue (the Task-1 producer shape). */
function daySeriesFor(baseStatus: VenueSunStatus): { minutes: number; sunExposurePercent: number; currentSunStatus: VenueSunStatus }[] {
  const series: { minutes: number; sunExposurePercent: number; currentSunStatus: VenueSunStatus }[] = [];
  for (let m = PLANNER_START_MINUTES; m <= PLANNER_END_MINUTES; m += PLANNER_STEP_MINUTES) {
    // A plausible arc: shaded early/late, sunlit midday; one midday step gated.
    const sunlit = m >= 11 * 60 && m <= 18 * 60;
    const sunExposurePercent = sunlit ? 90 : 10;
    const currentSunStatus: VenueSunStatus = sunlit ? (m === 13 * 60 ? 'CloudObscured' : baseStatus) : 'Shaded';
    series.push({ minutes: m, sunExposurePercent, currentSunStatus });
  }
  return series;
}

/** A canned engine outcome that carries the day-series Task 2 threads onto the DTO. */
function computedOutcomeWithSeries(venue: StoredVenue): SunEngineOutcome {
  return {
    venue: {
      ...toVenueData(venue),
      currentSunStatus: 'Sunny',
      confidence: 55,
      sunExposurePercent: 90,
      skyCondition: 'clear',
      sunWindow: { start: '12:00', end: '16:00' },
      // The optional field Task 2 adds to VenueDataDto. Loose-cast in the red phase
      // because `sunDaySeries` is not yet on the type; drop the cast once Task 2
      // adds the field.
      sunDaySeries: daySeriesFor('Sunny'),
    } as SunEngineOutcome['venue'],
    freshness: { sunDataSource: 'weather', weatherUpdatedAt: NOW.toISOString() },
    peakTime: '14:00',
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  clearVenueRateLimitForTests();
  adapterMocks.shouldUseRealSunEngine.mockReset();
  adapterMocks.applyRealSunEngine.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ===========================================================================
// AC1 / Task 2 — the real-engine list DTO carries sunDaySeries
// ===========================================================================
describe.skip('Story 11.1 AC1 — real-engine list DTO carries the day-series', () => {
  beforeEach(() => {
    adapterMocks.shouldUseRealSunEngine.mockReturnValue(true);
    adapterMocks.applyRealSunEngine.mockImplementation(async (venue: StoredVenue) =>
      computedOutcomeWithSeries(venue),
    );
  });

  // P0 — every real-engine venue carries a sunDaySeries with one entry per 15-min
  // planner step across 06:00–21:00, each with %+status.
  it('attaches one series entry per 15-min step, each with sunExposurePercent + currentSunStatus', async () => {
    const res = await LIST_GET(listRequest('?lat=57.7089&lng=11.9746'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenuesResponse;

    const expectedMinutes: number[] = [];
    for (let m = PLANNER_START_MINUTES; m <= PLANNER_END_MINUTES; m += PLANNER_STEP_MINUTES) {
      expectedMinutes.push(m);
    }

    expect(body.venues.length).toBeGreaterThan(0);
    for (const v of body.venues) {
      const series = (v as unknown as { sunDaySeries?: { minutes: number; sunExposurePercent: number; currentSunStatus: string }[] }).sunDaySeries;
      expect(series).toBeDefined();
      expect(series!.map((e) => e.minutes)).toEqual(expectedMinutes);
      for (const entry of series!) {
        expect(typeof entry.sunExposurePercent).toBe('number');
        expect(entry.currentSunStatus).toBeTruthy();
      }
    }
  });

  // P1 — the ETag/304 path still holds with the larger payload. The weak ETag
  // hashes { venues, meta, totalCount }, so the series is covered.
  it('preserves the ETag + 304 if-none-match path with the series present', async () => {
    const first = await LIST_GET(listRequest('?lat=57.7089&lng=11.9746'));
    const etag = first.headers.get('ETag');
    expect(etag).toBeTruthy();

    const second = await LIST_GET(
      listRequest('?lat=57.7089&lng=11.9746', { 'if-none-match': etag ?? '' }),
    );
    expect(second.status).toBe(304);
  });
});

// ===========================================================================
// AC1 / Task 2 — the seed (flag OFF) + detail DTO stay byte-identical (no series)
// ===========================================================================
describe.skip('Story 11.1 AC1 — seed + detail DTO stay byte-identical (no series)', () => {
  // P0 — with the real engine OFF (the CI default seed path), the list DTO must
  // NOT carry sunDaySeries. The series is populated ONLY on the useRealEngine branch.
  it('does NOT add sunDaySeries on the default seed path (flag OFF)', async () => {
    adapterMocks.shouldUseRealSunEngine.mockReturnValue(false);

    const res = await LIST_GET(listRequest('?lat=57.7089&lng=11.9746'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenuesResponse;

    expect(body.venues.length).toBeGreaterThan(0);
    for (const v of body.venues) {
      expect((v as unknown as Record<string, unknown>).sunDaySeries).toBeUndefined();
    }
  });

  // P0 — the [slug] detail DTO must remain byte-identical (no series). The detail
  // view keeps its own timeline; Story 11.6 (not 11.1) removes the render.
  it('does NOT add sunDaySeries to the [slug] detail DTO', async () => {
    // Detail on the seed path (flag OFF is the CI default and the byte-identical
    // guarantee). Even on the real path the detail route must not carry the series.
    adapterMocks.shouldUseRealSunEngine.mockReturnValue(false);

    const res = await DETAIL_GET(detailRequest('test-venue-sunny'), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.venue.slug).toBe('test-venue-sunny');
    expect(body.venue.sunDaySeries).toBeUndefined();
  });
});

// ===========================================================================
// AC2 / Task 6 — measure + guard the gzipped day-series payload size
// ===========================================================================
describe.skip('Story 11.1 AC2 — gzipped day-series payload is measured + bounded', () => {
  beforeEach(() => {
    adapterMocks.shouldUseRealSunEngine.mockReturnValue(true);
    adapterMocks.applyRealSunEngine.mockImplementation(async (venue: StoredVenue) =>
      computedOutcomeWithSeries(venue),
    );
  });

  // P0 (measurement) — MEASURE the gzipped response size for all seeded venues ×
  // 61 steps and RECORD it (console + Dev Agent Record). Then assert it stays under
  // the guard set FROM the measurement. The ceiling is UNKNOWN by design: the dev
  // replaces PAYLOAD_CEILING_BYTES with the recorded number before un-skipping.
  it('stays under the measured gzipped ceiling for ~all venues × 61 steps', async () => {
    const res = await LIST_GET(listRequest('?lat=57.7089&lng=11.9746'));
    expect(res.status).toBe(200);
    const raw = Buffer.from(await res.arrayBuffer());
    const gzippedBytes = gzipSync(raw).byteLength;

    // Record for the Dev Agent Record (visible in the vitest run output).
    // eslint-disable-next-line no-console
    console.log(`[11.1 AC2] gzipped /api/venues payload with day-series = ${gzippedBytes} bytes`);

    // The guard fires only once the dev sets PAYLOAD_CEILING_BYTES from the
    // measurement (NaN comparison is always false → un-skipping WITHOUT setting the
    // ceiling FAILS loudly, forcing the dev to record + set it).
    expect(Number.isFinite(PAYLOAD_CEILING_BYTES)).toBe(true);
    expect(gzippedBytes).toBeLessThanOrEqual(PAYLOAD_CEILING_BYTES);
  });
});
