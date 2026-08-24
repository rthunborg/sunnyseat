import { afterEach, describe, expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';
import * as venueRoute from '@/app/api/venues/route';

type ObservableVenueRoute = {
  GET: (request: NextRequest) => Promise<Response>;
  __setSunGeometryRepositoryForTests?: (repo: unknown) => void;
  __setWeatherSnapshotRepositoryForTests?: (repo: unknown) => void;
};

const route = venueRoute as ObservableVenueRoute;

describe('/api/venues observability integration', () => {
  afterEach(() => {
    route.__setSunGeometryRepositoryForTests?.(undefined);
    route.__setWeatherSnapshotRepositoryForTests?.(undefined);
    vi.restoreAllMocks();
  });

  test('runs the public venue handler inside the request telemetry context', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const response = await route.GET(
      new NextRequest(
        'http://localhost/api/venues?lat=57.7089&lng=11.9746',
        {
          headers: {
            'x-sunnyseat-request-id': 'lr-20260818t090000z-a1b2c3d4-origin-002',
          },
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('x-sunnyseat-request-id')).toBe(
      'lr-20260818t090000z-a1b2c3d4-origin-002',
    );
    const completionEvents = info.mock.calls
      .map(([entry]) => JSON.parse(String(entry)) as Record<string, unknown>)
      .filter((event) => event.event === 'api_request_complete');
    expect(completionEvents).toHaveLength(1);
    expect(completionEvents[0]).toMatchObject({
      request_id: 'lr-20260818t090000z-a1b2c3d4-origin-002',
      route: '/api/venues',
      status: 200,
    });
  });

  test('records and echoes the request id for a fail-closed 503', async () => {
    route.__setSunGeometryRepositoryForTests?.({
      readCurrentCoverageForVenueDay: async () => null,
      computeCurrentGeometryInputHash: async () =>
        'g1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    });
    route.__setWeatherSnapshotRepositoryForTests?.({
      readSnapshotForVenueDay: async () => ({ status: 'ready', slices: [] }),
    });
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const response = await route.GET(
      new NextRequest(
        'http://localhost/api/venues?lat=57.7089&lng=11.9746',
        {
          headers: {
            'x-sunnyseat-request-id': 'lr-20260818t090000z-a1b2c3d4-origin-003',
          },
        },
      ),
    );

    expect(response.status).toBe(503);
    expect(response.headers.get('x-sunnyseat-request-id')).toBe(
      'lr-20260818t090000z-a1b2c3d4-origin-003',
    );
    const completionEvents = info.mock.calls
      .map(([entry]) => JSON.parse(String(entry)) as Record<string, unknown>)
      .filter((event) => event.event === 'api_request_complete');
    expect(completionEvents).toHaveLength(1);
    expect(completionEvents[0]).toMatchObject({
      request_id: 'lr-20260818t090000z-a1b2c3d4-origin-003',
      route: '/api/venues',
      status: 503,
    });
  });
});
