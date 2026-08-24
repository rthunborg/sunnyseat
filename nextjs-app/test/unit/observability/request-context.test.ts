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
});
