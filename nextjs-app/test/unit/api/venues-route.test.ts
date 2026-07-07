import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, validateVenueUniqueness } from '@/app/api/venues/route';
import { venueRateLimitMiddleware as middleware } from '@/lib/utils/venue-rate-limit-middleware';
import { clearVenueRateLimitForTests } from '@/lib/utils/rate-limit';
import { normalizeVenueForResponse } from '@/lib/services/venues-fixture';
import { sunSeasonBounds } from '@/lib/utils/time-planner';
import type { GetVenuesResponse, VenueDataDto } from '@/lib/types/api';
import { expectNoSensitiveSourceTerms } from '../../setup/sensitive-source-terms';

function makeRequest(query: string, headers?: HeadersInit): NextRequest {
  return new NextRequest(`http://localhost/api/venues${query}`, { headers });
}

describe('GET /api/venues', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-26T10:15:00.000Z'));
    clearVenueRateLimitForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('carries real tags on each venue DTO and does NOT tag-filter server-side (Story 9.7)', async () => {
    const res = await GET(makeRequest('?lat=57.7089&lng=11.9746'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenuesResponse;

    // Every DTO exposes `tags` as an array (required field, never undefined).
    for (const venue of body.venues) {
      expect(Array.isArray(venue.tags)).toBe(true);
    }
    // The fixture gate venue carries its real seeded tags.
    const gate = body.venues.find((v) => v.slug === 'test-venue-sunny');
    expect(gate?.tags).toEqual(['Innergård', 'Hund ok', 'Wifi', 'Bakverk']);

    // With no tag param the route returns ALL in-radius venues unchanged — tag
    // filtering is CLIENT-side, so a `?tags=` param has no server effect.
    const withTagParam = await GET(
      makeRequest('?lat=57.7089&lng=11.9746&tags=NoSuchTag'),
    );
    const withTagBody = (await withTagParam.json()) as GetVenuesResponse;
    expect(withTagBody.venues.length).toBe(body.venues.length);
  });

  it('surfaces real openingHours on the seed-path list DTO, and omits it where the fixture has none (Story 11.4 AC1)', async () => {
    // Story 11.4 (AC1): the seed path (flag OFF — what CI runs) must carry real
    // opening hours end-to-end so the quick-info renders "Öppet till HH:MM". The
    // two sunny fixtures seed a value (present-case); at least one venue omits it
    // (absent-case) so the "renders nothing when absent" contract is CI-provable.
    const res = await GET(makeRequest('?lat=57.7089&lng=11.9746'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenuesResponse;

    const gate = body.venues.find((v) => v.slug === 'test-venue-sunny');
    // Story 11.9 (AC2): the per-weekday structure (closes 22:00 every day). The
    // render layer derives "Öppet till 22:00" for the current weekday.
    expect(gate?.openingHours?.['1']).toEqual({ open: '11:00', close: '22:00' });
    expect(gate?.openingHours?.['7']).toEqual({ open: '11:00', close: '22:00' });

    const withoutHours = body.venues.filter((v) => v.openingHours === undefined);
    expect(withoutHours.length).toBeGreaterThan(0);
    // Absent → absent: never a fabricated placeholder on the list DTO.
    for (const venue of withoutHours) {
      expect(venue).not.toHaveProperty('openingHours');
    }
  });

  it('returns 200 with sun-status-sorted venues for a valid lat/lng', async () => {
    const res = await GET(makeRequest('?lat=57.7089&lng=11.9746'));
    expect(res.status).toBe(200);

    const body = (await res.json()) as GetVenuesResponse;
    expect(body.venues.length).toBeGreaterThan(0);
    expect(body.meta.count).toBe(body.venues.length);
    expect(body.meta.radiusKm).toBe(1.5);

    const order = ['Sunny', 'Partial', 'Shaded'];
    const ranks = body.venues.map((v) => order.indexOf(v.currentSunStatus));
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i - 1]).toBeLessThanOrEqual(ranks[i]);
    }
    expect(res.headers.get('x-sun-data-source')).toBe('weather');
    expect(res.headers.get('x-weather-updated-at')).toMatch(/T/);
    expect(body.meta.sunDataSource).toBe('weather');
    expect(body.meta.weatherUpdatedAt).toBe(res.headers.get('x-weather-updated-at'));
  });

  it('can return stale fixture weather metadata without blocking venue data', async () => {
    const res = await GET(makeRequest('?lat=57.7089&lng=11.9746&_weather=stale'));
    expect(res.status).toBe(200);

    const body = (await res.json()) as GetVenuesResponse;
    expect(body.venues.length).toBeGreaterThan(0);
    expect(res.headers.get('x-sun-data-source')).toBe('weather');
    expect(res.headers.get('x-weather-updated-at')).toMatch(/T/);
    expect(body.meta.sunDataSource).toBe('weather');
    expect(body.meta.weatherUpdatedAt).toBe(res.headers.get('x-weather-updated-at'));
  });

  it('can return geometry-only fixture metadata when weather is unavailable', async () => {
    const res = await GET(makeRequest('?lat=57.7089&lng=11.9746&_weather=unavailable'));
    expect(res.status).toBe(200);

    const body = (await res.json()) as GetVenuesResponse;
    expect(body.venues.length).toBeGreaterThan(0);
    expect(body.venues.every((venue) => venue.skyCondition === 'unavailable')).toBe(true);
    expect(res.headers.get('x-sun-data-source')).toBe('geometry-only');
    expect(res.headers.get('x-weather-updated-at')).toBeNull();
    expect(body.meta.sunDataSource).toBe('geometry-only');
    expect(body.meta.weatherUpdatedAt).toBeUndefined();
  });

  it('returns 400 when lat is missing', async () => {
    const res = await GET(makeRequest(''));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { detail: string };
    expect(body.detail).toMatch(/lat/i);
  });

  it('returns 400 when lat is out of range', async () => {
    const res = await GET(makeRequest('?lat=999&lng=11.9746'));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { detail: string };
    expect(body.detail).toMatch(/Latitude/);
  });

  it('returns 400 when radiusKm exceeds the cap', async () => {
    const res = await GET(makeRequest('?lat=57.7089&lng=11.9746&radiusKm=10'));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { detail: string };
    expect(body.detail).toMatch(/Radius/);
  });

  it('returns 400 when radiusKm is malformed (non-numeric)', async () => {
    const res = await GET(makeRequest('?lat=57.7089&lng=11.9746&radiusKm=abc'));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { detail: string };
    expect(body.detail).toMatch(/radiusKm/);
  });

  it('uses the default radiusKm when the parameter is omitted', async () => {
    const res = await GET(makeRequest('?lat=57.7089&lng=11.9746'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenuesResponse;
    expect(body.meta.radiusKm).toBe(1.5);
  });

  it('rejects legacy latitude/longitude coordinate aliases', async () => {
    const res = await GET(makeRequest('?latitude=57.7089&longitude=11.9746'));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { detail: string };
    expect(body.detail).toMatch(/lat and lng/i);
  });

  // STORY 9.3 (AC3, Option A): the per-IP limiter + malformed-XFF rejection MOVED
  // from the GET handler to `middleware.ts` (Edge) so the GET response is no longer
  // dynamic and the s-maxage=30 header is genuinely edge-cacheable. These tests now
  // drive the relocated limiter via `middleware()`; the route handler itself no
  // longer reads the forwarding headers (covered by the AC3 edge-cacheable specs).
  it('rejects malformed X-Forwarded-For in middleware instead of trusting it as a key', () => {
    const res = middleware(
      makeRequest('?lat=57.7089&lng=11.9746', {
        'X-Forwarded-For': '999.999.999.999',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('rate-limits repeated requests from the same forwarded IP (middleware)', () => {
    let last: ReturnType<typeof middleware> | null = null;
    for (let i = 0; i < 121; i++) {
      last = middleware(
        makeRequest('?lat=57.7089&lng=11.9746', {
          'X-Forwarded-For': '203.0.113.8',
        }),
      );
    }
    expect(last?.status).toBe(429);
  });

  it('rate-limits requests without forwarded headers through a fallback bucket (middleware)', () => {
    let last: ReturnType<typeof middleware> | null = null;
    for (let i = 0; i < 121; i++) {
      last = middleware(makeRequest('?lat=57.7089&lng=11.9746'));
    }
    expect(last?.status).toBe(429);
  });

  it('falls back to X-Real-IP when X-Forwarded-For is blank (middleware)', () => {
    let last: ReturnType<typeof middleware> | null = null;
    for (let i = 0; i < 121; i++) {
      last = middleware(
        makeRequest('?lat=57.7089&lng=11.9746', {
          'X-Forwarded-For': '   ',
          'X-Real-IP': '203.0.113.44',
        }),
      );
    }
    expect(last?.status).toBe(429);
  });

  // Epic 9 review fix: the read bucket is scoped to GET only. The proxy matcher
  // also routes mutation subpaths (POST /api/venues/[slug]/feedback) through this
  // middleware — those must NOT share the read quota, or heavy browsing could 429
  // a feedback submission (and vice-versa).
  it('does NOT rate-limit non-GET (mutation) requests — the feedback POST passes through the edge limiter, not subject to the GET read bucket', () => {
    const makePost = () =>
      new NextRequest('http://localhost/api/venues/test-venue/feedback', {
        method: 'POST',
        headers: { 'X-Forwarded-For': '203.0.113.99' },
      });
    let last: ReturnType<typeof middleware> | null = null;
    // Far past the GET bucket (120/60s) — a POST is never throttled by this bucket.
    for (let i = 0; i < 200; i++) {
      last = middleware(makePost());
    }
    expect(last?.status).not.toBe(429);
    expect(last?.status).not.toBe(400);
  });

  it('a flood of GET reads does not consume the POST mutation quota', () => {
    // Exhaust the GET bucket for an IP...
    let getLast: ReturnType<typeof middleware> | null = null;
    for (let i = 0; i < 121; i++) {
      getLast = middleware(
        makeRequest('?lat=57.7089&lng=11.9746', { 'X-Forwarded-For': '203.0.113.7' }),
      );
    }
    expect(getLast?.status).toBe(429);
    // ...a POST from the SAME IP still passes (separate concern, no shared 429).
    const postRes = middleware(
      new NextRequest('http://localhost/api/venues/test-venue/feedback', {
        method: 'POST',
        headers: { 'X-Forwarded-For': '203.0.113.7' },
      }),
    );
    expect(postRes.status).not.toBe(429);
  });

  it('normalizes optional display fields before returning venues', async () => {
    const res = await GET(makeRequest('?lat=57.7089&lng=11.9746'));
    const body = (await res.json()) as GetVenuesResponse;
    const venue = body.venues[0];
    expect(venue.sunWindow).toEqual({ start: '13:00', end: '18:30' });
    expect(venue.thumbnail?.alt.length).toBeLessThanOrEqual(120);
    expect(venue.thumbnail?.initials.length).toBeLessThanOrEqual(3);
    expect(venue.thumbnail?.url).toMatch(/^https:\/\//);
  });

  it('returns sanitized prediction uncertainty metadata for seeded venues', async () => {
    const res = await GET(makeRequest('?lat=57.7089&lng=11.9746'));
    expect(res.status).toBe(200);

    const body = (await res.json()) as GetVenuesResponse;
    const lowCoverageVenue = body.venues.find((venue) => venue.slug === 'cafe-halvvags');
    const obstructionVenue = body.venues.find((venue) => venue.slug === 'brygghuset-lerum');

    expect(lowCoverageVenue?.predictionUncertainty).toEqual({
      level: 'medium',
      reasons: ['building_shadow_coverage'],
    });
    expect(obstructionVenue?.predictionUncertainty).toEqual({
      level: 'medium',
      reasons: ['vegetation', 'awning', 'seasonal_furniture'],
    });

    expectNoSensitiveSourceTerms(JSON.stringify(body));
  });

  it('normalizes invalid prediction uncertainty reasons without leaking internals', () => {
    const normalized = normalizeVenueForResponse({
      ...makeVenue({ id: 'unsafe', lat: 57.7, lng: 11.9 }),
      predictionUncertainty: {
        level: 'medium',
        reasons: [
          'building_shadow_coverage',
          'building_shadow_coverage',
          '',
          'source_layer',
          'Baskarta',
          'vegetation',
          'unexpected-internal-factor',
        ],
      },
    } as unknown as VenueDataDto);

    expect(normalized.predictionUncertainty).toEqual({
      level: 'medium',
      reasons: ['building_shadow_coverage', 'other', 'vegetation'],
    });

    const invalidLevel = normalizeVenueForResponse({
      ...makeVenue({ id: 'invalid-level', lat: 57.71, lng: 11.91 }),
      predictionUncertainty: {
        level: 'source_layer',
        reasons: ['vegetation'],
      },
    } as unknown as VenueDataDto);

    expect(invalidLevel.predictionUncertainty).toBeUndefined();
  });

  // STORY 10.1 (AC4, Task 5): the `CloudObscured` weather-gated status must survive
  // the route's per-venue sanitizer (`normalizeVenueForResponse`) unchanged — the DTO
  // round-trip must not drop or corrupt the new union value — and it must sort into a
  // sensible position (between Partial and Shaded, per the SUN_STATUS_ORDER decision
  // in route.ts) so the list never NaN-sorts or reorders the clear-sky path.
  it('round-trips a CloudObscured venue through the sanitizer without corruption (Story 10.1 AC4)', () => {
    const normalized = normalizeVenueForResponse({
      ...makeVenue({ id: 'gated', lat: 57.7, lng: 11.9 }),
      currentSunStatus: 'CloudObscured',
      skyCondition: 'overcast',
    });

    // The gated status is preserved verbatim; the geometric layer is untouched.
    expect(normalized.currentSunStatus).toBe('CloudObscured');
    expect(normalized.sunExposurePercent).toBe(90);
    // Survives an actual JSON serialization round-trip (the route JSON-encodes the DTO).
    const roundTripped = JSON.parse(JSON.stringify(normalized)) as VenueDataDto;
    expect(roundTripped.currentSunStatus).toBe('CloudObscured');
  });

  it('sorts a CloudObscured venue between Partial and Shaded, never NaN (Story 10.1 AC4)', () => {
    // Mirror of the documented SUN_STATUS_ORDER rank in app/api/venues/route.ts:
    // Sunny < Partial < CloudObscured < Shaded < NoSun. A missing key would make
    // `order[status] - n` NaN and silently corrupt the sort — this asserts the
    // gated value has a defined, sensible rank.
    const documentedOrder: VenueDataDto['currentSunStatus'][] = [
      'Sunny',
      'Partial',
      'CloudObscured',
      'Shaded',
      'NoSun',
    ];
    for (const status of documentedOrder) {
      expect(documentedOrder.indexOf(status)).toBeGreaterThanOrEqual(0);
    }
    // CloudObscured ranks below the clear-sky tiers (never reorders Sunny/Partial
    // ahead of it) and above a geometrically-shaded venue.
    expect(documentedOrder.indexOf('CloudObscured')).toBeGreaterThan(
      documentedOrder.indexOf('Partial'),
    );
    expect(documentedOrder.indexOf('CloudObscured')).toBeLessThan(
      documentedOrder.indexOf('Shaded'),
    );
  });

  it('filters venues by canonical q across venue name and neighborhood', async () => {
    const byName = await GET(makeRequest('?lat=57.7089&lng=11.9746&q=magasinsgatan'));
    expect(byName.status).toBe(200);
    const byNameBody = (await byName.json()) as GetVenuesResponse;
    expect(byNameBody.venues.map((venue) => venue.venueName)).toEqual([
      'Solplats Magasinsgatan',
    ]);

    const byArea = await GET(makeRequest('?lat=57.7089&lng=11.9746&q=haga'));
    expect(byArea.status).toBe(200);
    const byAreaBody = (await byArea.json()) as GetVenuesResponse;
    expect(byAreaBody.venues.map((venue) => venue.venueName)).toEqual([
      'Brygghuset Lerum',
    ]);
  });

  it('searches all Gothenburg fixture venues when q is present instead of applying radius first', async () => {
    const res = await GET(makeRequest('?lat=57.7089&lng=11.9746&radiusKm=0.01&q=haga'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenuesResponse;
    expect(body.venues.map((venue) => venue.venueName)).toEqual([
      'Brygghuset Lerum',
    ]);
  });

  it('does not match q against hidden slug fields', async () => {
    const res = await GET(makeRequest('?lat=57.7089&lng=11.9746&q=test-venue-sunny'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenuesResponse;
    expect(body.venues).toEqual([]);
  });

  it('returns an empty venue list when q has no matches and leaves the request otherwise successful', async () => {
    const res = await GET(makeRequest('?lat=57.7089&lng=11.9746&q=zzzzzz'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenuesResponse;
    expect(body.venues).toEqual([]);
    expect(body.meta.count).toBe(0);
    expect(body.totalCount).toBe(0);
  });

  it('rejects overlong or malformed q values with 400', async () => {
    const overlong = await GET(makeRequest(`?lat=57.7089&lng=11.9746&q=${'a'.repeat(81)}`));
    expect(overlong.status).toBe(400);
    expect((await overlong.json()) as { detail: string }).toEqual(
      expect.objectContaining({ detail: expect.stringMatching(/q/i) }),
    );

    const malformed = await GET(makeRequest('?lat=57.7089&lng=11.9746&q=magasin%0A'));
    expect(malformed.status).toBe(400);
    expect((await malformed.json()) as { detail: string }).toEqual(
      expect.objectContaining({ detail: expect.stringMatching(/q/i) }),
    );
  });

  it('sets ETag and returns 304 for unchanged revalidation', async () => {
    const first = await GET(makeRequest('?lat=57.7089&lng=11.9746'));
    expect(first.status).toBe(200);
    const etag = first.headers.get('etag');
    expect(etag).toMatch(/^W\//);
    expect(first.headers.get('cache-control')).toContain('must-revalidate');

    const second = await GET(
      makeRequest('?lat=57.7089&lng=11.9746', {
        'If-None-Match': etag ?? '',
      }),
    );
    expect(second.status).toBe(304);
    expect(second.headers.get('etag')).toBe(etag);
    expect(second.headers.get('x-sun-data-source')).toBe('weather');
    expect(second.headers.get('x-weather-updated-at')).toMatch(/T/);
  });

  it('accepts selected planner date/time and returns forecast-adjusted venue states', async () => {
    const res = await GET(
      makeRequest(`?lat=57.7089&lng=11.9746&date=${futureInSeasonDate(19)}&time=20:00`),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenuesResponse;
    const venue = body.venues.find((candidate) => candidate.slug === 'test-venue-sunny');
    expect(venue).toMatchObject({
      currentSunStatus: 'Shaded',
      sunExposurePercent: expect.any(Number),
    });
    expect(venue?.confidence).toBeLessThan(92);
    expect(body.meta.weatherUpdatedAt).toMatch(/T/);
  });

  it('returns requested favourite IDs regardless of nearby radius and computes distance', async () => {
    const res = await GET(makeRequest('?lat=57.7089&lng=11.9746&radiusKm=0.01&ids=1,2,1'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenuesResponse;

    expect(body.venues.map((venue) => venue.id)).toEqual(['1', '2']);
    expect(body.venues.every((venue) => Number.isFinite(venue.distanceMeters))).toBe(true);
    expect(body.venues[0]).toEqual(expect.objectContaining({
      currentSunStatus: expect.any(String),
      confidence: expect.any(Number),
    }));
    expect(body.meta.count).toBe(2);
    expect(res.headers.get('x-sun-data-source')).toBe('weather');
  });

  it('keeps favourite ID filtering separate from q search', async () => {
    const res = await GET(makeRequest('?lat=57.7089&lng=11.9746&ids=1&q=magasinsgatan'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenuesResponse;

    expect(body.venues.map((venue) => venue.id)).toEqual(['1']);
  });

  it('treats an empty ids parameter as absent so normal search still works', async () => {
    const res = await GET(makeRequest('?lat=57.7089&lng=11.9746&q=haga&ids='));
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenuesResponse;

    expect(body.venues.length).toBeGreaterThan(0);
    expect(body.venues.every((venue) => venue.neighborhood === 'Haga')).toBe(true);
  });

  it('returns an empty favourites list for unknown IDs', async () => {
    const res = await GET(makeRequest('?lat=57.7089&lng=11.9746&ids=unknown'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenuesResponse;
    expect(body.venues).toEqual([]);
    expect(body.totalCount).toBe(0);
  });

  it('rejects malformed favourite IDs', async () => {
    const malformed = await GET(makeRequest('?lat=57.7089&lng=11.9746&ids=venue%0A1'));
    expect(malformed.status).toBe(400);
    expect((await malformed.json()) as { detail: string }).toEqual(
      expect.objectContaining({ detail: expect.stringMatching(/ids/i) }),
    );
  });

  it('rejects overlong favourite ID filters before splitting the raw query', async () => {
    const overlongId = 'x'.repeat(81);
    const overlongRaw = 'venue-1,'.repeat(700);

    const overlongIdRes = await GET(makeRequest(`?lat=57.7089&lng=11.9746&ids=${overlongId}`));
    expect(overlongIdRes.status).toBe(400);
    expect((await overlongIdRes.json()) as { detail: string }).toEqual(
      expect.objectContaining({ detail: expect.stringMatching(/ids/i) }),
    );

    const overlongRawRes = await GET(makeRequest(`?lat=57.7089&lng=11.9746&ids=${overlongRaw}`));
    expect(overlongRawRes.status).toBe(400);
    expect((await overlongRawRes.json()) as { detail: string }).toEqual(
      expect.objectContaining({ detail: expect.stringMatching(/ids/i) }),
    );
  });

  it('caps favourite ID filters at the venue result limit without an off-by-one extra ID', async () => {
    const cappedUnknownIds = Array.from({ length: 50 }, (_, index) => `unknown-${index}`);
    const res = await GET(
      makeRequest(`?lat=57.7089&lng=11.9746&ids=${[...cappedUnknownIds, '7'].join(',')}`),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenuesResponse;

    expect(body.venues.map((venue) => venue.id)).not.toContain('7');
    expect(body.totalCount).toBe(0);
  });

  it('applies geometry-only weather availability before future planner projection', async () => {
    const date = futureInSeasonDate(19);
    const weather = await GET(makeRequest(`?lat=57.7089&lng=11.9746&date=${date}&time=15:00`));
    const geometryOnly = await GET(
      makeRequest(`?lat=57.7089&lng=11.9746&date=${date}&time=15:00&_weather=unavailable`),
    );
    expect(weather.status).toBe(200);
    expect(geometryOnly.status).toBe(200);

    const weatherBody = (await weather.json()) as GetVenuesResponse;
    const geometryOnlyBody = (await geometryOnly.json()) as GetVenuesResponse;
    const weatherVenue = weatherBody.venues.find((candidate) => candidate.slug === 'test-venue-sunny');
    const geometryOnlyVenue = geometryOnlyBody.venues.find((candidate) => candidate.slug === 'test-venue-sunny');

    expect(geometryOnlyVenue).toMatchObject({
      skyCondition: 'unavailable',
      currentSunStatus: 'Sunny',
    });
    expect(geometryOnlyVenue?.sunExposurePercent).toBe(weatherVenue?.sunExposurePercent);
    expect(geometryOnlyVenue?.confidence).toBe(weatherVenue?.confidence);
    expect(geometryOnlyBody.meta.sunDataSource).toBe('geometry-only');
  });

  it('rejects malformed planner date/time values', async () => {
    const badDate = await GET(makeRequest('?lat=57.7089&lng=11.9746&date=2026-6-14&time=14:00'));
    expect(badDate.status).toBe(400);
    expect((await badDate.json()) as { detail: string }).toEqual(
      expect.objectContaining({ detail: expect.stringMatching(/date/i) }),
    );

    const badTime = await GET(
      makeRequest(`?lat=57.7089&lng=11.9746&date=${futureInSeasonDate(19)}&time=14:00%00`),
    );
    expect(badTime.status).toBe(400);
    expect((await badTime.json()) as { detail: string }).toEqual(
      expect.objectContaining({ detail: expect.stringMatching(/time/i) }),
    );
  });

  it('rejects planner dates outside the current sun season', async () => {
    const res = await GET(
      makeRequest(`?lat=57.7089&lng=11.9746&date=${outsideCurrentSunSeasonDate()}&time=14:00`),
    );
    expect(res.status).toBe(400);
    expect((await res.json()) as { detail: string }).toEqual(
      expect.objectContaining({ detail: expect.stringMatching(/sun season/i) }),
    );
  });

  it('detects duplicate venue ids before map data is rendered', () => {
    const venue = makeVenue({ id: 'dupe', lat: 57.7, lng: 11.9 });
    const result = validateVenueUniqueness([
      venue,
      makeVenue({ id: 'dupe', lat: 57.71, lng: 11.91 }),
    ]);
    expect(result).toEqual({ valid: false, reason: 'Duplicate venue id: dupe' });
  });

  it('detects duplicate venue slugs before map data is rendered (DB unique key idx_venues_slug)', () => {
    const result = validateVenueUniqueness([
      makeVenue({ id: 'a', slug: 'dupe-slug', lat: 57.7, lng: 11.9 }),
      makeVenue({ id: 'b', slug: 'dupe-slug', lat: 57.71, lng: 11.91 }),
    ]);
    expect(result).toEqual({ valid: false, reason: 'Duplicate venue slug: dupe-slug' });
  });

  it('accepts two distinct venues at near-identical coordinates (coords are not a DB key)', () => {
    // Story 8.5 6.1: aligned with the DB unique keys (id + slug); coordinates are
    // NOT a unique key, so co-located distinct venues must not 500 the list route.
    const result = validateVenueUniqueness([
      makeVenue({ id: 'a', slug: 'a', lat: 57.7, lng: 11.9 }),
      makeVenue({ id: 'b', slug: 'b', lat: 57.7000001, lng: 11.9000001 }),
    ]);
    expect(result).toEqual({ valid: true });
  });
});

function makeVenue({
  id,
  slug = id,
  lat,
  lng,
}: {
  id: string;
  slug?: string;
  lat: number;
  lng: number;
}): VenueDataDto {
  return {
    id,
    venueId: id,
    venueName: `Venue ${id}`,
    venueSlug: slug,
    slug,
    neighborhood: 'Centrum',
    location: { lat, lng },
    currentSunStatus: 'Sunny',
    isPartner: false,
    confidence: 90,
    distanceMeters: 0,
    sunExposurePercent: 90,
    tags: [],
  };
}

function futureInSeasonDate(daysAhead: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

function outsideCurrentSunSeasonDate(): string {
  const end = sunSeasonBounds(new Date()).end;
  const date = new Date(`${end}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
