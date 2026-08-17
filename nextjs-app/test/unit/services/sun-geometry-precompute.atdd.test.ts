/**
 * ATDD RED-PHASE acceptance scaffolds - Story 12.3
 * Scheduled persisted geometry precompute contract.
 */

import { describe, expect, test } from 'vitest';
import {
  PLANNER_END_MINUTES,
  PLANNER_MAX_FUTURE_DAYS,
  PLANNER_START_MINUTES,
  PLANNER_STEP_MINUTES,
} from '@/lib/utils/time-planner';

type PrecomputeModule = {
  buildSunGeometryPrecomputeWindow: (now: Date) => string[];
  computeUngatedGeometryDaySeries: (input: unknown) => Promise<Array<Record<string, unknown>>>;
  collectSunGeometryPrecomputeTargets: (options: unknown) => Promise<Array<Record<string, unknown>>>;
  runSunGeometryPrecompute: (options: unknown) => Promise<Record<string, unknown>>;
};

const precomputeModulePath = '@/lib/services/sun-geometry-precompute';

async function loadPrecomputeModule(): Promise<PrecomputeModule> {
  return (await import(precomputeModulePath)) as PrecomputeModule;
}

function expectedPlannerMinutes(): number[] {
  const minutes: number[] = [];
  for (let m = PLANNER_START_MINUTES; m <= PLANNER_END_MINUTES; m += PLANNER_STEP_MINUTES) {
    minutes.push(m);
  }
  return minutes;
}

describe('Story 12.3 AC1/AC3/AC6 - geometry-only precompute', () => {
  test('computes deterministic ungated geometry-only entries for every planner step', async () => {
    const { computeUngatedGeometryDaySeries } = await loadPrecomputeModule();
    const series = await computeUngatedGeometryDaySeries({
      venueId: 'venue-1',
      stockholmDate: '2026-07-18',
      geometryInputHash: 'g1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    });

    expect(series.map((entry) => entry.minutes)).toEqual(expectedPlannerMinutes());
    for (const entry of series) {
      expect(Object.keys(entry).sort()).toEqual(['minutes', 'sunExposurePercent']);
      expect(entry.sunExposurePercent).toEqual(expect.any(Number));
    }
  });

  test('precompute window covers today through today + PLANNER_MAX_FUTURE_DAYS + 1', async () => {
    const { buildSunGeometryPrecomputeWindow } = await loadPrecomputeModule();
    const window = buildSunGeometryPrecomputeWindow(new Date('2026-07-18T00:30:00+02:00'));

    expect(window).toHaveLength(PLANNER_MAX_FUTURE_DAYS + 2);
    expect(window[0]).toBe('2026-07-18');
    expect(window.at(-1)).toBe('2026-07-22');
  });

  test('targets every persisted venue, including hidden and resolver-excluded venues', async () => {
    const { collectSunGeometryPrecomputeTargets } = await loadPrecomputeModule();
    const targets = await collectSunGeometryPrecomputeTargets({ includeHidden: true });

    expect(targets.length).toBeGreaterThan(0);
    expect(targets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ isHidden: true }),
        expect.objectContaining({ isHidden: false }),
      ]),
    );
  });

  test('publishes a run only after every venue/date/hash cell is complete', async () => {
    const { runSunGeometryPrecompute } = await loadPrecomputeModule();
    const result = await runSunGeometryPrecompute({
      now: new Date('2026-07-18T00:30:00+02:00'),
      failVenueIds: ['venue-missing'],
    });

    expect(result.status).toBe('failed');
    expect(result).toMatchObject({
      totalVenueDays: expect.any(Number),
      completedVenueDays: expect.any(Number),
      failedVenueDays: expect.any(Number),
    });
    expect(result.completedVenueDays).not.toBe(result.totalVenueDays);
  });

  test('records cold, bucket-roll, and precompute timing evidence for CPU profiling', async () => {
    const { runSunGeometryPrecompute } = await loadPrecomputeModule();
    const result = await runSunGeometryPrecompute({
      now: new Date('2026-07-18T00:30:00+02:00'),
      profile: true,
    });

    expect(result).toMatchObject({
      timingsMs: expect.objectContaining({
        coldRouteBefore: expect.any(Number),
        coldRouteAfter: expect.any(Number),
        bucketRollAfter: expect.any(Number),
        precomputeRun: expect.any(Number),
      }),
    });
  });
});
