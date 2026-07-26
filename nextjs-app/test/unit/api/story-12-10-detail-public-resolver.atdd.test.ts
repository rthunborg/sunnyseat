import { readFileSync } from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { describe, expect, test, vi } from 'vitest';
import { GET } from '@/app/api/venues/[slug]/route';

function routeRequest(identifier: string, query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/venues/${encodeURIComponent(identifier)}${query}`);
}

function readRouteSource(): string {
  return readFileSync(path.join(process.cwd(), 'app/api/venues/[slug]/route.ts'), 'utf8');
}

describe('Story 12.10 ATDD - detail route public resolver convergence', () => {
  test.skip('[P0] live detail route consumes resolvePublicVenueIdentifier instead of the stale slug-only store lookup', () => {
    const source = readRouteSource();

    expect(source).toMatch(/resolvePublicVenueIdentifier\(/);
    expect(source).toMatch(/from ['"]@\/lib\/services\/venue-store['"]/);
    expect(source).not.toMatch(/getVenueBySlug\(/);
    expect(source).not.toMatch(/includeHidden/);
  });

  test.skip('[P0] public id and slug identifiers resolve through the same detail route behavior', async () => {
    vi.stubEnv('SUNNYSEAT_VENUE_STORE', 'fixture');

    const bySlug = await GET(routeRequest('test-venue-sunny'), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });
    const byId = await GET(routeRequest('1'), {
      params: Promise.resolve({ slug: '1' }),
    });

    expect(bySlug.status).toBe(200);
    expect(byId.status).toBe(200);
    expect(await bySlug.json()).toMatchObject({ venue: { slug: 'test-venue-sunny' } });
    expect(await byId.json()).toMatchObject({ venue: { slug: 'test-venue-sunny' } });
  });

  test.skip('[P0] unknown, blank, malformed, hidden, and ambiguous live identifiers keep indistinguishable public errors', async () => {
    const unknown = await GET(routeRequest('missing-venue'), {
      params: Promise.resolve({ slug: 'missing-venue' }),
    });
    const malformed = await GET(routeRequest('bad-slug'), {
      params: Promise.resolve({ slug: '%E0%A4%A' }),
    });

    expect(unknown.status).toBe(404);
    expect(await unknown.json()).toEqual({ detail: 'Venue not found' });
    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toEqual({ detail: 'Invalid venue slug' });

    const source = readRouteSource();
    expect(source).not.toMatch(/hidden.*detail|ambiguous.*detail|duplicate.*detail/i);
  });
});
