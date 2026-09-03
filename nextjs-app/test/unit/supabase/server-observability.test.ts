import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({})),
}));

describe('Supabase server observability', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.mocked(createClient).mockClear();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project-ref.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-never-log');
    vi.stubEnv('VERCEL_REGION', 'dub1');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  test('directly observes each allowlisted destination path without sensitive request data', async () => {
    const upstreamFetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const { getSupabaseServiceRole } = await import('@/lib/supabase/server');
    const { runWithRequestContext } = await import('@/lib/observability/request-context');

    getSupabaseServiceRole();

    expect(createClient).toHaveBeenCalledTimes(1);
    const options = vi.mocked(createClient).mock.calls[0]?.[2] as {
      global?: { fetch?: typeof fetch };
    };
    expect(options.global?.fetch).toBeTypeOf('function');

    await runWithRequestContext(
      {
        requestId: 'probe-20260817-dependencies',
        route: '/api/venues',
        region: 'dub1',
        deploymentId: 'dpl_test_launch_resilience',
        environment: 'production',
      },
      async () => {
        await options.global!.fetch!(
          'https://project-ref.supabase.co/rest/v1/venues?select=never-log-query',
          { method: 'GET' },
        );
        await options.global!.fetch!(
          'https://project-ref.supabase.co/rest/v1/rpc/read_current_venue_sun_geometry_batch?apikey=never-log-query',
          {
            method: 'POST',
            headers: {
              authorization: 'Bearer never-log-authorization',
            },
            body: JSON.stringify({ venue_ids: ['never-log-venue-id'] }),
          },
        );
        await options.global!.fetch!(
          'https://project-ref.supabase.co/rest/v1/weather_bucket_snapshots?venue_id=never-log-venue-id',
          { method: 'GET' },
        );
      },
    );

    expect(upstreamFetch).toHaveBeenCalledTimes(3);
    expect(info).toHaveBeenCalledTimes(3);
    const events = info.mock.calls.map(
      ([entry]) => JSON.parse(String(entry)) as Record<string, unknown>,
    );
    expect(events).toEqual([
      expect.objectContaining({
        event: 'external_dependency',
        request_id: 'probe-20260817-dependencies',
        operation: 'venue_list',
        destination_path: '/rest/v1/venues',
        method: 'GET',
        status: 200,
        region: 'dub1',
        duration_ms: expect.any(Number),
      }),
      expect.objectContaining({
        event: 'external_dependency',
        request_id: 'probe-20260817-dependencies',
        operation: 'sun_geometry_batch',
        destination_path: '/rest/v1/rpc/read_current_venue_sun_geometry_batch',
        method: 'POST',
        status: 200,
        region: 'dub1',
        duration_ms: expect.any(Number),
      }),
      expect.objectContaining({
        event: 'external_dependency',
        request_id: 'probe-20260817-dependencies',
        operation: 'weather_batch',
        destination_path: '/rest/v1/weather_bucket_snapshots',
        method: 'GET',
        status: 200,
        region: 'dub1',
        duration_ms: expect.any(Number),
      }),
    ]);

    const serialized = JSON.stringify(events);
    for (const event of events) {
      expect(event).not.toHaveProperty('deployment_id');
      expect(event).not.toHaveProperty('environment');
      expect(event).not.toHaveProperty('timestamp_utc');
    }
    expect(serialized).not.toContain('apikey');
    expect(serialized).not.toContain('never-log-query');
    expect(serialized).not.toContain('authorization');
    expect(serialized).not.toContain('never-log-authorization');
    expect(serialized).not.toContain('never-log-venue-id');
    expect(serialized).not.toContain('service-role-never-log');
  });

  test('emits a bounded unattributed event for a non-allowlisted Supabase path', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', { status: 200 }),
    );
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const { getSupabaseServiceRole } = await import('@/lib/supabase/server');
    const { runWithRequestContext } = await import('@/lib/observability/request-context');

    getSupabaseServiceRole();
    const options = vi.mocked(createClient).mock.calls[0]?.[2] as {
      global?: { fetch?: typeof fetch };
    };

    await runWithRequestContext(
      {
        requestId: 'probe-20260817-unattributed',
        route: '/api/venues',
        region: 'dub1',
        deploymentId: 'dpl_test_launch_resilience',
        environment: 'production',
      },
      () =>
        options.global!.fetch!(
          'https://project-ref.supabase.co/rest/v1/rpc/get_shadow_caster_hash_records_v2?apikey=never-log-query',
          {
            method: 'POST',
            body: JSON.stringify({ venue_ids: ['never-log-venue-id'] }),
          },
        ),
    );

    expect(info).toHaveBeenCalledTimes(1);
    const event = JSON.parse(String(info.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(event).toMatchObject({
      event: 'external_dependency_unattributed',
      request_id: 'probe-20260817-unattributed',
      operation: 'unattributed_supabase',
      method: 'POST',
      status: 200,
      region: 'dub1',
    });
    expect(event).not.toHaveProperty('destination_path');
    const serialized = JSON.stringify(event);
    expect(serialized).not.toContain('shadow_caster');
    expect(serialized).not.toContain('apikey');
    expect(serialized).not.toContain('never-log-query');
    expect(serialized).not.toContain('never-log-venue-id');
  });

  test('does not emit dependency telemetry outside a request context', async () => {
    const upstreamFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('{}', { status: 200 }),
    );
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const { createObservedSupabaseFetch } = await import(
      '@/lib/observability/supabase-fetch-observer'
    );

    const observedFetch = createObservedSupabaseFetch(
      'https://project-ref.supabase.co',
      upstreamFetch,
    );
    const response = await observedFetch(
      'https://project-ref.supabase.co/rest/v1/venues?select=secret',
    );

    expect(response.status).toBe(200);
    expect(upstreamFetch).toHaveBeenCalledTimes(1);
    expect(info).not.toHaveBeenCalled();
  });

  test('keeps concurrent dependency observations bound to their request context', async () => {
    const upstreamFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('{}', { status: 200 }),
    );
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const { createObservedSupabaseFetch } = await import(
      '@/lib/observability/supabase-fetch-observer'
    );
    const { runWithRequestContext } = await import('@/lib/observability/request-context');
    const observedFetch = createObservedSupabaseFetch(
      'https://project-ref.supabase.co',
      upstreamFetch,
    );

    await Promise.all([
      runWithRequestContext(
        {
          requestId: 'lr-20260818t090000z-a1b2c3d4-origin-001',
          route: '/api/venues',
          region: 'dub1',
          deploymentId: 'dpl-first',
          environment: 'production',
        },
        () =>
          observedFetch(
            'https://project-ref.supabase.co/rest/v1/venues?select=do-not-log',
          ),
      ),
      runWithRequestContext(
        {
          requestId: 'lr-20260818t090000z-b2c3d4e5-origin-002',
          route: '/api/venues',
          region: 'arn1',
          deploymentId: 'dpl-second',
          environment: 'preview',
        },
        () =>
          observedFetch(
            'https://project-ref.supabase.co/rest/v1/weather_bucket_snapshots?bucket=do-not-log',
          ),
      ),
    ]);

    const events = info.mock.calls
      .map(([entry]) => JSON.parse(String(entry)) as Record<string, unknown>)
      .sort((left, right) =>
        String(left.request_id).localeCompare(String(right.request_id)),
      );
    expect(events).toEqual([
      expect.objectContaining({
        request_id: 'lr-20260818t090000z-a1b2c3d4-origin-001',
        operation: 'venue_list',
        destination_path: '/rest/v1/venues',
        region: 'dub1',
      }),
      expect.objectContaining({
        request_id: 'lr-20260818t090000z-b2c3d4e5-origin-002',
        operation: 'weather_batch',
        destination_path: '/rest/v1/weather_bucket_snapshots',
        region: 'arn1',
      }),
    ]);
    for (const event of events) {
      expect(event).not.toHaveProperty('deployment_id');
      expect(event).not.toHaveProperty('environment');
      expect(event).not.toHaveProperty('timestamp_utc');
    }
    expect(JSON.stringify(events)).not.toContain('do-not-log');
  });

  test('logs bounded failure metadata without leaking failed request details', async () => {
    const upstreamFetch = vi.fn<typeof fetch>().mockRejectedValue(
      new Error('upstream secret must not be serialized'),
    );
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const { createObservedSupabaseFetch } = await import(
      '@/lib/observability/supabase-fetch-observer'
    );
    const { runWithRequestContext } = await import('@/lib/observability/request-context');
    const observedFetch = createObservedSupabaseFetch(
      'https://project-ref.supabase.co',
      upstreamFetch,
    );

    await expect(
      runWithRequestContext(
        {
          requestId: 'lr-20260818t090000z-c3d4e5f6-origin-003',
          route: '/api/venues',
          region: 'dub1',
          deploymentId: 'dpl-failure',
          environment: 'production',
        },
        () =>
          observedFetch(
            'https://project-ref.supabase.co/rest/v1/rpc/read_current_venue_sun_geometry_batch?apikey=never-log',
            {
              method: 'POST',
              headers: { authorization: 'Bearer never-log-token' },
              body: JSON.stringify({ venue_ids: ['never-log-venue-id'] }),
            },
          ),
      ),
    ).rejects.toThrow('upstream secret must not be serialized');

    expect(info).toHaveBeenCalledTimes(1);
    const event = JSON.parse(String(info.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(event).toMatchObject({
      event: 'external_dependency',
      request_id: 'lr-20260818t090000z-c3d4e5f6-origin-003',
      operation: 'sun_geometry_batch',
      destination_path: '/rest/v1/rpc/read_current_venue_sun_geometry_batch',
      method: 'POST',
      status: 0,
      region: 'dub1',
    });
    expect(event).not.toHaveProperty('deployment_id');
    expect(event).not.toHaveProperty('environment');
    expect(event).not.toHaveProperty('timestamp_utc');
    const serialized = JSON.stringify(event);
    expect(serialized).not.toContain('apikey');
    expect(serialized).not.toContain('never-log');
    expect(serialized).not.toContain('venue-id');
    expect(serialized).not.toContain('upstream secret');
  });
});
