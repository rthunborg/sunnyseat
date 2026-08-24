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
          'https://project-ref.supabase.co/rest/v1/rpc/get_shadow_caster_hash_records?apikey=never-log-query',
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
});
