import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/venues/[slug]/route';
import { formatPlannerTime, parsePlannerTime, sunSeasonBounds } from '@/lib/utils/time-planner';
import type { GetVenueDetailResponse } from '@/lib/types/api';
import { expectNoSensitiveSourceTerms } from '../../setup/sensitive-source-terms';

function makeRequest(slug: string, query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/venues/${slug}${query}`);
}

describe('GET /api/venues/[slug]', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-26T10:15:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('returns the detail DTO for a known venue slug', async () => {
    const res = await GET(makeRequest('test-venue-sunny'), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenueDetailResponse;
    expect(body.venue.slug).toBe('test-venue-sunny');
    expect(body.venue.venueName).toBe('Kafé Magasinet');
    expect(body.venue.description).toMatch(/uteservering/i);
    // Story 11.9 (AC2): openingHours is the per-weekday structure (no `display`
    // string). The gate venue closes 22:00 every weekday.
    expect(body.venue.openingHours?.['1']).toEqual({ open: '11:00', close: '22:00' });
    expect(body.venue.timeline.windows.length).toBeGreaterThan(0);
    expect(body.venue.timeline.windows[0]).toMatchObject({
      start: '13:00',
      end: '18:30',
      status: 'Sunny',
    });
    // Story 11.9 (AC4): shadowWarningMinutes is dropped end-to-end (no assertion).
    expect(res.headers.get('x-sun-data-source')).toBe('weather');
    expect(res.headers.get('x-weather-updated-at')).toMatch(/T/);
    expect(body.meta).toMatchObject({
      sunDataSource: 'weather',
      weatherUpdatedAt: res.headers.get('x-weather-updated-at'),
    });
  });

  it('returns geometry-only metadata and hides weather freshness when weather is unavailable', async () => {
    const res = await GET(makeRequest('test-venue-sunny', '?_weather=unavailable'), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenueDetailResponse;
    expect(body.venue.slug).toBe('test-venue-sunny');
    expect(body.venue.skyCondition).toBe('unavailable');
    expect(res.headers.get('x-sun-data-source')).toBe('geometry-only');
    expect(res.headers.get('x-weather-updated-at')).toBeNull();
    expect(body.meta).toMatchObject({ sunDataSource: 'geometry-only' });
    expect(body.meta?.weatherUpdatedAt).toBeUndefined();
  });

  it('serves venue detail when only review summary persistence is unavailable', async () => {
    vi.stubEnv('SUNNYSEAT_REVIEW_PERSISTENCE', 'supabase');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');

    const res = await GET(makeRequest('test-venue-sunny'), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenueDetailResponse;
    expect(body.venue.slug).toBe('test-venue-sunny');
    expect(body.venue.reviewSummary).toBeUndefined();
  });

  it('computes detail distance from canonical coordinates when supplied', async () => {
    const res = await GET(makeRequest('test-venue-sunny', '?lat=57.7089&lng=11.9746'), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenueDetailResponse;
    expect(body.venue.distanceMeters).toBeGreaterThan(0);
    expect(body.venue.distanceMeters).toBeLessThan(700);
  });

  it('rejects incomplete venue detail coordinates', async () => {
    const res = await GET(makeRequest('test-venue-sunny', '?lat=57.7089'), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { detail: string };
    expect(body.detail).toMatch(/lat and lng together/i);
  });

  it('returns 404 for an unknown venue slug', async () => {
    const res = await GET(makeRequest('missing-venue'), {
      params: Promise.resolve({ slug: 'missing-venue' }),
    });

    expect(res.status).toBe(404);
    const body = (await res.json()) as { detail: string };
    expect(body.detail).toMatch(/not found/i);
  });

  it('returns 400 for malformed percent-encoded slugs', async () => {
    const res = await GET(makeRequest('bad-slug'), {
      params: Promise.resolve({ slug: '%E0%A4%A' }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { detail: string };
    expect(body.detail).toMatch(/invalid venue slug/i);
  });

  // Story 11.9 (AC4): the `shadow_warning_minutes` column + DTO field are dropped
  // end-to-end (carried store→DTO but rendered nowhere), so the old
  // "preserves an immediate zero-minute shadow warning" test is removed.

  it('returns sanitized prediction uncertainty metadata for venue detail', async () => {
    const res = await GET(makeRequest('brygghuset-lerum'), {
      params: Promise.resolve({ slug: 'brygghuset-lerum' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenueDetailResponse;
    expect(body.venue.predictionUncertainty).toEqual({
      level: 'medium',
      reasons: ['vegetation', 'awning', 'seasonal_furniture'],
    });

    expectNoSensitiveSourceTerms(JSON.stringify(body));
  });

  it('applies selected planner date/time to venue detail and timeline', async () => {
    const res = await GET(makeRequest('test-venue-sunny', `?date=${futureInSeasonDate(19)}&time=20:00`), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenueDetailResponse;
    expect(body.venue.currentSunStatus).toBe('Shaded');
    expect(body.venue.sunExposurePercent).toBeLessThan(95);
    expect(body.venue.confidence).toBeLessThan(92);
    expect(body.venue.sunWindow).not.toEqual({ start: '13:00', end: '18:30' });
    expect(body.venue.timeline.windows[0]).toMatchObject({
      start: body.venue.sunWindow?.start,
      end: body.venue.sunWindow?.end,
      status: 'Shaded',
    });
    expect(body.venue.timeline.peakTime).toBe(peakTimeFromWindow(body.venue.sunWindow));
  });

  it('rejects malformed planner params for venue detail', async () => {
    const res = await GET(makeRequest('test-venue-sunny', '?date=2026-11-01&time=14:00'), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { detail: string };
    expect(body.detail).toMatch(/sun season/i);
  });
});

function futureInSeasonDate(daysAhead: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysAhead);
  const key = date.toISOString().slice(0, 10);
  const bounds = sunSeasonBounds(new Date());
  if (key >= bounds.start && key <= bounds.end) return key;
  return bounds.start > new Date().toISOString().slice(0, 10) ? bounds.start : bounds.end;
}

function peakTimeFromWindow(
  window: GetVenueDetailResponse['venue']['sunWindow'],
): string | undefined {
  if (!window) return undefined;
  const start = parsePlannerTime(window.start);
  const end = parsePlannerTime(window.end);
  if (start === null || end === null) return undefined;
  return formatPlannerTime((start + end) / 2);
}
