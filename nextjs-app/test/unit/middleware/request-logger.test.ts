import { NextRequest, NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { withRequestLogging } from '@/lib/middleware/request-logger';

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
});
