import { describe, expect, test } from 'vitest';
import {
  getRequestContext,
  resolveRequestId,
  runWithRequestContext,
} from '@/lib/observability/request-context';

describe('request observability context', () => {
  test('preserves only the launch-probe grammar and replaces every other input', () => {
    const probeId = 'lr-20260818t090000z-a1b2c3d4-origin-001';
    expect(resolveRequestId(probeId)).toBe(
      probeId,
    );

    for (const candidate of [
      'probe_2026-08-17:001',
      'safe-but-not-a-controlled-probe',
      'lr-readable-venue-slug-origin-001',
      'lr-20260818t090000z-private-venue-slug-origin-001',
      'lr-20260818t090000z-a1b2c3d4-origin-1',
      'lr-20260818t090000z-a1b2c3d4-unknown-001',
      'unsafe id/with?query=never-log',
      `p${'x'.repeat(64)}`,
      '',
    ]) {
      const resolved = resolveRequestId(candidate);
      expect(resolved).not.toBe(candidate);
      expect(resolved).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
      );
    }
  });

  test('isolates concurrent request tags and clears the outer context', async () => {
    const requestIds = await Promise.all([
      runWithRequestContext(
        { requestId: 'probe-first', route: '/api/venues', region: 'dub1', deploymentId: 'dpl-first', environment: 'production' },
        async () => {
          await Promise.resolve();
          return getRequestContext()?.requestId;
        },
      ),
      runWithRequestContext(
        { requestId: 'probe-second', route: '/api/venues', region: 'iad1', deploymentId: 'dpl-second', environment: 'preview' },
        async () => {
          await Promise.resolve();
          return getRequestContext()?.requestId;
        },
      ),
    ]);

    expect(requestIds).toEqual(['probe-first', 'probe-second']);
    expect(getRequestContext()).toBeUndefined();
  });

  test('keeps nested async request contexts isolated until their callbacks finish', async () => {
    const observations: string[] = [];
    const first = runWithRequestContext(
      {
        requestId: 'lr-20260818t090000z-a1b2c3d4-origin-001',
        route: '/api/venues',
        region: 'dub1',
        deploymentId: 'dpl-first',
        environment: 'production',
      },
      async () => {
        observations.push(`first-start:${getRequestContext()?.requestId}`);
        await Promise.resolve();
        await runWithRequestContext(
          {
            requestId: 'lr-20260818t090000z-b2c3d4e5-origin-002',
            route: '/api/venues',
            region: 'iad1',
            deploymentId: 'dpl-nested',
            environment: 'preview',
          },
          async () => {
            await Promise.resolve();
            observations.push(`nested:${getRequestContext()?.requestId}`);
          },
        );
        observations.push(`first-end:${getRequestContext()?.requestId}`);
      },
    );
    const second = runWithRequestContext(
      {
        requestId: 'lr-20260818t090000z-c3d4e5f6-edge-prime-003',
        route: '/api/venues',
        region: 'arn1',
        deploymentId: 'dpl-second',
        environment: 'production',
      },
      async () => {
        await Promise.resolve();
        observations.push(`second:${getRequestContext()?.requestId}`);
      },
    );

    await Promise.all([first, second]);

    expect(observations).toEqual(expect.arrayContaining([
      'first-start:lr-20260818t090000z-a1b2c3d4-origin-001',
      'nested:lr-20260818t090000z-b2c3d4e5-origin-002',
      'second:lr-20260818t090000z-c3d4e5f6-edge-prime-003',
      'first-end:lr-20260818t090000z-a1b2c3d4-origin-001',
    ]));
    expect(observations.indexOf('first-start:lr-20260818t090000z-a1b2c3d4-origin-001'))
      .toBeLessThan(observations.indexOf('first-end:lr-20260818t090000z-a1b2c3d4-origin-001'));
    expect(observations.indexOf('nested:lr-20260818t090000z-b2c3d4e5-origin-002'))
      .toBeLessThan(observations.indexOf('first-end:lr-20260818t090000z-a1b2c3d4-origin-001'));
    expect(getRequestContext()).toBeUndefined();
  });
});
