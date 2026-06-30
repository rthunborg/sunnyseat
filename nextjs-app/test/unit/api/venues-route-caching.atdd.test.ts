/**
 * ATDD RED-PHASE acceptance scaffolds — Story 9.3 (route level)
 * "Venue Sun-Compute Performance — Server Caching"
 *
 * Route-level signals for:
 *   AC2 — BOTH /api/venues (list) and /api/venues/[slug] (detail) benefit from
 *         the cache equally ("Mer info" detail must be cheap too).
 *   AC3 — after rate-limiting relocation (Option A, the recommended default),
 *         the GET handler no longer reads request headers for the limiter, so
 *         the already-present `s-maxage=30` response is genuinely edge-cacheable
 *         — while rate-limiting (the 429 path) is STILL enforced from its new
 *         (edge/middleware) home, and the ETag/304 + freshness headers survive.
 *
 * All blocks are `describe.skip` / `it.skip` (TDD red phase). No latency asserts
 * — only call-counts, cache-key behaviour, and header presence (deterministic).
 *
 * These tests deliberately drive the DEFAULT (flag-off) seed path that CI runs,
 * plus mocked real-engine assertions where the cache lives in the engine. For
 * the real-engine RPC-dedupe/cache call-count assertions see the engine-level
 * scaffold: test/unit/services/sun-engine-caching.atdd.test.ts.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { clearVenueRateLimitForTests, GET as listGET } from '@/app/api/venues/route';
import { GET as detailGET } from '@/app/api/venues/[slug]/route';

function listRequest(query: string, headers?: HeadersInit): NextRequest {
  return new NextRequest(`http://localhost/api/venues${query}`, { headers });
}

function detailRequest(slug: string, query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/venues/${slug}${query}`);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-26T10:15:00.000Z'));
  clearVenueRateLimitForTests();
});

afterEach(() => {
  vi.useRealTimers();
});

// ===========================================================================
// AC3 — rate-limiting relocated so the response is edge-cacheable
// ===========================================================================
describe.skip('Story 9.3 AC3 — edge-cacheable list route after rate-limit relocation (RED)', () => {
  // P0 — the cache header is still set and now actually honour-able by the edge.
  it.skip('returns a public s-maxage=30 Cache-Control the edge can honour', async () => {
    const res = await listGET(listRequest('?lat=57.7089&lng=11.9746'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toMatch(/s-maxage=30/);
    expect(res.headers.get('Cache-Control')).toMatch(/public/);
  });

  // P0 — the dynamic-forcing header read is GONE from the GET handler.
  // After Option A, the handler must NOT consult x-forwarded-for / x-real-ip
  // (that read is what forced the route dynamic and killed s-maxage). Identical
  // responses regardless of the forwarded-IP header proves the handler no longer
  // varies on it.
  it.skip('does not vary the response on x-forwarded-for (limiter moved to the edge)', async () => {
    const a = await listGET(listRequest('?lat=57.7089&lng=11.9746', { 'x-forwarded-for': '1.1.1.1' }));
    const b = await listGET(listRequest('?lat=57.7089&lng=11.9746', { 'x-forwarded-for': '2.2.2.2' }));
    // Same ETag => response identical, not keyed on the client IP.
    expect(a.headers.get('ETag')).toBe(b.headers.get('ETag'));
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
  });

  // P0 — rate-limiting is STILL enforced (just from its new home). DoS
  // protection must not be lost when the limiter moves. If the limiter now
  // lives in middleware.ts, this exercises that entry point; if a test-only
  // limiter hook remains on the route, drive that. Adjust the import to the
  // limiter's new public surface — do NOT delete this assertion.
  it.skip('still enforces the 429 rate-limit from the relocated limiter', async () => {
    // EXPECTED: hammering the limiter boundary eventually yields 429.
    // (Dev wires this to the relocated limiter — middleware or extracted fn.)
    let last: Response | undefined;
    for (let i = 0; i < 200; i++) {
      last = await listGET(listRequest('?lat=57.7089&lng=11.9746', { 'x-forwarded-for': '9.9.9.9' }));
    }
    expect(last?.status).toBe(429);
  });

  // P1 — the ETag / 304 freshness contract survives the relocation.
  it.skip('preserves the ETag + 304 if-none-match path', async () => {
    const first = await listGET(listRequest('?lat=57.7089&lng=11.9746'));
    const etag = first.headers.get('ETag');
    expect(etag).toBeTruthy();
    const second = await listGET(
      listRequest('?lat=57.7089&lng=11.9746', { 'if-none-match': etag ?? '' }),
    );
    expect(second.status).toBe(304);
  });

  // P1 — freshness headers preserved on the list route.
  it.skip('preserves X-Sun-Data-Source + X-Weather-Updated-At on the list route', async () => {
    const res = await listGET(listRequest('?lat=57.7089&lng=11.9746'));
    expect(res.headers.get('x-sun-data-source')).toBeTruthy();
    expect(res.headers.get('x-weather-updated-at')).toMatch(/T/);
  });
});

// ===========================================================================
// AC2 — the detail "Mer info" route benefits equally + keeps its headers
// ===========================================================================
describe.skip('Story 9.3 AC2/AC3 — detail route benefits equally (RED)', () => {
  // P1 — detail route also advertises an edge-cacheable response.
  it.skip('sets a public s-maxage Cache-Control on the detail route', async () => {
    const res = await detailGET(detailRequest('test-venue-sunny'), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toMatch(/s-maxage=30/);
  });

  // P1 — freshness headers preserved on the detail route.
  it.skip('preserves X-Sun-Data-Source + X-Weather-Updated-At on the detail route', async () => {
    const res = await detailGET(detailRequest('test-venue-sunny'), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });
    expect(res.headers.get('x-sun-data-source')).toBeTruthy();
    expect(res.headers.get('x-weather-updated-at')).toMatch(/T/);
  });

  // P2 — REGRESSION GUARD: the default (flag-off) seed path stays byte-identical.
  // Story 9.3 is "no behaviour change, only faster". The DTO shape and seed
  // values must not move on the CI default path.
  it.skip('keeps the default seed detail DTO byte-identical (no behaviour drift)', async () => {
    const res = await detailGET(detailRequest('test-venue-sunny'), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });
    const body = await res.json();
    expect(body.venue.slug).toBe('test-venue-sunny');
    // Existing venue-detail-route.test.ts already locks the full seed shape;
    // this is a sentinel that 9.3 did not perturb the default path.
    expect(body.venue.timeline.windows[0]).toMatchObject({
      start: '13:00',
      end: '18:30',
      status: 'Sunny',
    });
  });
});
