import { NextRequest, NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  publicRouteIdentity,
  withRequestLogging,
} from '@/lib/middleware/request-logger';

describe('withRequestLogging', () => {
  beforeEach(() => {
    vi.stubEnv('VERCEL_DEPLOYMENT_ID', 'dpl_test_launch_resilience');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('VERCEL_REGION', 'dub1');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  test('echoes a valid probe tag and emits one structured completion event', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const wrapped = withRequestLogging(async () =>
      NextResponse.json({ venues: [] }, { status: 200 }),
    );
    const request = new NextRequest(
      'https://sunnyseat.vercel.app/api/venues?lat=57.7&lng=11.9&secret=do-not-log',
      {
        headers: {
          'x-sunnyseat-request-id': 'lr-20260818t090000z-a1b2c3d4-origin-001',
          authorization: 'Bearer never-log-this',
        },
      },
    );

    const response = await wrapped(request, {});

    expect(response.headers.get('x-sunnyseat-request-id')).toBe(
      'lr-20260818t090000z-a1b2c3d4-origin-001',
    );
    expect(info).toHaveBeenCalledTimes(1);
    const event = JSON.parse(String(info.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(response.headers.get('x-sunnyseat-deployment-id')).toBe(
      'dpl_test_launch_resilience',
    );
    expect(event).toMatchObject({
      event: 'api_request_complete',
      request_id: 'lr-20260818t090000z-a1b2c3d4-origin-001',
      method: 'GET',
      route: '/api/venues',
      status: 200,
      deployment_id: 'dpl_test_launch_resilience',
      environment: 'production',
      region: 'dub1',
      timestamp_utc: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/u),
    });
    const serialized = JSON.stringify(event);
    expect(serialized).not.toContain('secret');
    expect(serialized).not.toContain('do-not-log');
    expect(serialized).not.toContain('authorization');
    expect(serialized).not.toContain('never-log-this');
  });

  test('does not emit a cache-replayable request id on public cacheable GET responses', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const wrapped = withRequestLogging(async () =>
      NextResponse.json(
        { venues: [] },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, max-age=30, s-maxage=30, must-revalidate',
          },
        },
      ),
    );
    const request = new NextRequest(
      'https://sunnyseat.vercel.app/api/venues?lat=57.7&lng=11.9',
      {
        headers: {
          'x-sunnyseat-request-id': 'lr-20260818t090000z-a1b2c3d4-origin-001',
        },
      },
    );

    const response = await wrapped(request, {});

    expect(response.headers.get('Cache-Control')).toMatch(/s-maxage=30/u);
    expect(response.headers.get('x-sunnyseat-request-id')).toBeNull();
    expect(response.headers.get('x-sunnyseat-deployment-id')).toBe(
      'dpl_test_launch_resilience',
    );
    const event = JSON.parse(String(info.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(event).toMatchObject({
      event: 'api_request_complete',
      request_id: 'lr-20260818t090000z-a1b2c3d4-origin-001',
      route: '/api/venues',
      status: 200,
    });
  });

  test('replaces an unsafe request id and records a 503 response', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const wrapped = withRequestLogging(async () =>
      NextResponse.json({ code: 'COVERAGE_MISSING' }, { status: 503 }),
    );
    const request = new NextRequest(
      'https://sunnyseat.vercel.app/api/venues?lat=57.7&lng=11.9',
      {
        headers: {
          'x-sunnyseat-request-id': 'unsafe id/with?query=never-log',
        },
      },
    );

    const response = await wrapped(request, {});
    const requestId = response.headers.get('x-sunnyseat-request-id');

    expect(response.status).toBe(503);
    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
    expect(info).toHaveBeenCalledTimes(1);
    const event = JSON.parse(String(info.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(event).toMatchObject({
      event: 'api_request_complete',
      request_id: requestId,
      route: '/api/venues',
      status: 503,
    });
    expect(JSON.stringify(event)).not.toContain('never-log');
  });

  test('returns a correlated 500 response when the wrapped handler throws', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const wrapped = withRequestLogging(async () => {
      throw new Error('never-log-throw-detail');
    });
    const request = new NextRequest(
      'https://sunnyseat.vercel.app/api/venues?secret=do-not-log',
      {
        headers: {
          'x-sunnyseat-request-id': 'lr-20260818t090000z-a1b2c3d4-origin-005',
        },
      },
    );

    const response = await wrapped(request, {});
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ code: 'INTERNAL_SERVER_ERROR' });
    expect(response.headers.get('x-sunnyseat-request-id')).toBe(
      'lr-20260818t090000z-a1b2c3d4-origin-005',
    );
    expect(response.headers.get('x-sunnyseat-deployment-id')).toBe(
      'dpl_test_launch_resilience',
    );
    const event = JSON.parse(String(info.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(event).toMatchObject({
      event: 'api_request_complete',
      request_id: 'lr-20260818t090000z-a1b2c3d4-origin-005',
      route: '/api/venues',
      status: 500,
    });
    expect(JSON.stringify([body, event])).not.toContain('never-log');
    expect(JSON.stringify([body, event])).not.toContain('do-not-log');
  });

  test('rejects readable launch-shaped request ids that are not canonical probe tags', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const wrapped = withRequestLogging(async () =>
      NextResponse.json({ venues: [] }, { status: 200 }),
    );
    const readableRequestId = 'lr-readable-venue-slug-origin-001';

    const response = await wrapped(
      new NextRequest('https://sunnyseat.vercel.app/api/venues', {
        headers: {
          'x-sunnyseat-request-id': readableRequestId,
        },
      }),
      {},
    );

    const requestId = response.headers.get('x-sunnyseat-request-id');
    const event = JSON.parse(String(info.mock.calls[0]?.[0])) as Record<string, unknown>;

    expect(requestId).not.toBe(readableRequestId);
    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
    expect(event.request_id).toBe(requestId);
    expect(JSON.stringify(event)).not.toContain('readable-venue-slug');
  });

  test('normalizes public route identity without logging user-provided slugs', async () => {
    expect(publicRouteIdentity('/api/venues/posthotellet')).toBe('/api/venues/[slug]');
    expect(publicRouteIdentity('/api/venues/posthotellet/feedback')).toBe(
      '/api/venues/[slug]/feedback',
    );
    expect(publicRouteIdentity('/api/reviews')).toBe('/api/reviews');
    expect(publicRouteIdentity('/api/feedback')).toBe('/api/feedback');
    expect(publicRouteIdentity('/api/venues/posthotellet/reviews')).toBe(
      '/api/[unclassified]',
    );
    expect(publicRouteIdentity('/api/venues/posthotellet/feedback/extra')).toBe(
      '/api/[unclassified]',
    );

    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const wrapped = withRequestLogging(async () =>
      NextResponse.json({ ok: true }, { status: 200 }),
    );

    await wrapped(
      new NextRequest(
        'https://sunnyseat.vercel.app/api/venues/posthotellet?secret=do-not-log',
        {
          headers: {
            'x-sunnyseat-request-id': 'lr-20260818t090000z-a1b2c3d4-origin-004',
          },
        },
      ),
      {},
    );

    const event = JSON.parse(String(info.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(event.route).toBe('/api/venues/[slug]');
    expect(JSON.stringify(event)).not.toContain('posthotellet');
    expect(JSON.stringify(event)).not.toContain('secret');
  });
});
