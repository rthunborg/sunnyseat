/**
 * ATDD RED-PHASE acceptance scaffolds - Story 12.5
 * Dev venue editor route writes, visibility, atomic rollback, and cache invalidation.
 *
 * These tests are intentionally skipped until the implementation task lands.
 * The loader avoids importing routes that do not exist yet, keeping the scaffold compile-safe.
 */

import { NextRequest } from 'next/server';
import { describe, expect, test, vi } from 'vitest';

type EditorRouteModule = {
  GET: (request: NextRequest) => Promise<Response>;
  PATCH: (request: NextRequest) => Promise<Response>;
  DELETE?: (request: NextRequest) => Promise<Response>;
};

type PublicRouteModule = {
  GET: (request: NextRequest, context?: unknown) => Promise<Response>;
};

type PlannedRouteHooks = {
  __setVenueEditorRepositoryForTests?: (repo: unknown) => void;
  __setPublicVenueResolverForTests?: (resolver: unknown) => void;
  __setQueryInvalidationForTests?: (invalidator: unknown) => void;
};

async function loadPlannedEditorRoute(): Promise<EditorRouteModule & PlannedRouteHooks> {
  throw new Error('RED: implement app/api/dev/venues route and import it in this ATDD scaffold.');
}

async function loadPlannedPublicVenueRoute(): Promise<PublicRouteModule & PlannedRouteHooks> {
  throw new Error('RED: import the existing public route when hidden filtering seams are complete.');
}

function editorRequest(body?: unknown, search = ''): NextRequest {
  return new NextRequest(`http://localhost:3000/api/dev/venues${search}`, {
    method: body === undefined ? 'GET' : 'PATCH',
    headers: {
      'content-type': 'application/json',
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe.skip('Story 12.5 ATDD - dev venue editor routes', () => {
  test('[P0] PATCH display position uses service role and writes only display_lat/display_lng', async () => {
    const route = await loadPlannedEditorRoute();
    const repo = {
      patchVenueFields: vi.fn(async () => ({ slug: 'test-venue-sunny' })),
      publishGeometry: vi.fn(),
      getWrittenColumns: vi.fn(() => ['display_lat', 'display_lng']),
    };
    route.__setVenueEditorRepositoryForTests?.(repo);

    const response = await route.PATCH(editorRequest({
      slug: 'test-venue-sunny',
      displayLocation: { lat: 57.70542, lng: 11.97012 },
    }));

    expect(response.status).toBe(200);
    expect(repo.patchVenueFields).toHaveBeenCalledWith(expect.objectContaining({
      table: 'venues',
      serviceRole: true,
      values: { display_lat: 57.70542, display_lng: 11.97012 },
    }));
    expect(repo.getWrittenColumns()).toEqual(['display_lat', 'display_lng']);
    expect(repo.publishGeometry).not.toHaveBeenCalled();
  });

  test('[P0] polygon mutation validates first, writes seating_area, and invalidates Story 12.3 geometry input hash', async () => {
    const route = await loadPlannedEditorRoute();
    const repo = {
      patchVenueFields: vi.fn(async () => ({ slug: 'test-venue-sunny' })),
      markGeometryDirty: vi.fn(async () => ({ geometryInputHash: 'g1:new-hash' })),
      publishGeometry: vi.fn(async () => ({ status: 'queued' })),
    };
    route.__setVenueEditorRepositoryForTests?.(repo);

    const response = await route.PATCH(editorRequest({
      slug: 'test-venue-sunny',
      seatingArea: {
        type: 'Polygon',
        coordinates: [[
          [11.9701, 57.7051],
          [11.9704, 57.7051],
          [11.9704, 57.7054],
          [11.9701, 57.7051],
        ]],
      },
    }));

    expect(response.status).toBe(200);
    expect(repo.patchVenueFields).toHaveBeenCalledWith(expect.objectContaining({
      values: expect.objectContaining({ seating_area: expect.any(Object) }),
    }));
    expect(repo.markGeometryDirty).toHaveBeenCalledWith('test-venue-sunny');
    expect(repo.publishGeometry).toHaveBeenCalledWith(expect.objectContaining({
      reason: 'dev-venue-editor-polygon',
      previousGeometryInputHash: expect.any(String),
    }));
  });

  test('[P0] failed geometry publish or cache invalidation rolls the mutation back atomically', async () => {
    const route = await loadPlannedEditorRoute();
    const repo = {
      beginTransaction: vi.fn(),
      patchVenueFields: vi.fn(),
      markGeometryDirty: vi.fn(async () => {
        throw new Error('precompute enqueue failed');
      }),
      rollback: vi.fn(),
      commit: vi.fn(),
      readVenue: vi.fn(async () => ({ seating_area: 'original' })),
    };
    route.__setVenueEditorRepositoryForTests?.(repo);

    const response = await route.PATCH(editorRequest({
      slug: 'test-venue-sunny',
      seatingArea: [[
        [11.9701, 57.7051],
        [11.9704, 57.7051],
        [11.9704, 57.7054],
        [11.9701, 57.7051],
      ]],
    }));

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(repo.rollback).toHaveBeenCalled();
    expect(repo.commit).not.toHaveBeenCalled();
    await expect(repo.readVenue()).resolves.toMatchObject({ seating_area: 'original' });
  });

  test('[P0] hidden venues are invisible through all public list/detail/reviews/feedback/prefetch paths', async () => {
    const publicRoute = await loadPlannedPublicVenueRoute();
    const resolver = vi.fn(async () => null);
    publicRoute.__setPublicVenueResolverForTests?.(resolver);

    const response = await publicRoute.GET(
      new NextRequest('http://localhost:3000/api/venues/private-hidden?includeHidden=true'),
      { params: Promise.resolve({ slug: 'private-hidden' }) },
    );

    expect(response.status).toBe(404);
    expect(JSON.stringify(await response.json())).not.toMatch(/hidden|private|visibility/i);
    expect(resolver).toHaveBeenCalledWith(expect.objectContaining({
      includeHidden: false,
    }));
  });

  test('[P0] editor can include hidden rows only through the same dev guard', async () => {
    const route = await loadPlannedEditorRoute();
    const response = await route.GET(editorRequest(undefined, '?includeHidden=true'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      venues: expect.arrayContaining([
        expect.objectContaining({ slug: 'test-venue-hidden', hidden: true }),
      ]),
    });
  });

  test('[P1] successful mutation returns exact query invalidation hints for editing browser freshness', async () => {
    const route = await loadPlannedEditorRoute();
    const invalidator = vi.fn();
    route.__setQueryInvalidationForTests?.(invalidator);

    const response = await route.PATCH(editorRequest({
      slug: 'test-venue-sunny',
      hidden: true,
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toMatchObject({
      invalidate: expect.arrayContaining([
        ['venues'],
        ['venues', 'detail', 'test-venue-sunny'],
        ['dev', 'venues'],
      ]),
      publicStalenessSeconds: 30,
    });
  });
});
