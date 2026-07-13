/**
 * ATDD RED-PHASE acceptance scaffolds — Story 12.1 (AC6, AC8)
 * Public detail DTO preserves whole-field unknown and leaks no service metadata.
 */
import { NextRequest } from 'next/server';
import { describe, expect, test } from 'vitest';
import { GET } from '@/app/api/venues/[slug]/route';

function request(slug: string): NextRequest {
  return new NextRequest('http://localhost/api/venues/' + slug);
}

async function detail(slug: string): Promise<Record<string, unknown>> {
  const response = await GET(request(slug), {
    params: Promise.resolve({ slug }),
  });
  expect(response.status).toBe(200);
  return (await response.json()) as Record<string, unknown>;
}

describe('[12.1 AC6] honest whole-field unknown at the detail route', () => {
  test.skip('[P0] a real hours-less fixture omits openingHours instead of serializing an empty object', async () => {
    const body = await detail('brygghuset-lerum');
    const venue = body.venue as Record<string, unknown>;
    expect('openingHours' in venue).toBe(false);
  });

  test.skip('[P0] a known-hours fixture keeps the canonical weekday shape unchanged', async () => {
    const body = await detail('test-venue-sunny');
    const venue = body.venue as Record<string, unknown>;
    expect(venue.openingHours).toMatchObject({
      '1': { open: '11:00', close: '22:00' },
    });
  });

  test.skip('[P0] public JSON exposes no Place ID, provenance, notes, or audit outcome fields', async () => {
    const body = await detail('test-venue-sunny');
    expect(JSON.stringify(body)).not.toMatch(
      /placeId|place_id|placesApiUrl|places_api_url|hoursSource|hours_source|hoursReview|hours_review|hoursNotes|hours_notes|reviewOutcome|review_outcome/,
    );
  });
});

