import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/venues/[slug]/route';
import type { GetVenueDetailResponse } from '@/lib/types/api';

function makeRequest(slug: string, query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/venues/${slug}${query}`);
}

describe('GET /api/venues/[slug]', () => {
  it('returns the detail DTO for a known venue slug', async () => {
    const res = await GET(makeRequest('test-venue-sunny'), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenueDetailResponse;
    expect(body.venue.slug).toBe('test-venue-sunny');
    expect(body.venue.venueName).toBe('Kafé Magasinet');
    expect(body.venue.description).toMatch(/uteservering/i);
    expect(body.venue.openingHours.display).toMatch(/\d{2}:\d{2}/);
    expect(body.venue.timeline.windows.length).toBeGreaterThan(0);
    expect(body.venue.timeline.windows[0]).toMatchObject({
      start: '13:00',
      end: '18:30',
      status: 'Sunny',
    });
    expect(body.venue.shadowWarningMinutes).toBe(45);
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

  it('preserves an immediate zero-minute shadow warning', async () => {
    const res = await GET(makeRequest('bistro-bakgarden'), {
      params: Promise.resolve({ slug: 'bistro-bakgarden' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenueDetailResponse;
    expect(body.venue.shadowWarningMinutes).toBe(0);
  });

  it('applies selected planner date/time to venue detail and timeline', async () => {
    const res = await GET(makeRequest('test-venue-sunny', '?date=2026-06-14&time=20:00'), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenueDetailResponse;
    expect(body.venue.currentSunStatus).toBe('Shaded');
    expect(body.venue.sunExposurePercent).toBeLessThan(95);
    expect(body.venue.confidence).toBeLessThan(92);
    expect(body.venue.timeline.windows[0]).toMatchObject({
      start: '13:00',
      end: '18:30',
      status: 'Sunny',
    });
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
