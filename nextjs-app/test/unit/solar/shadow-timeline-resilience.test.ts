/**
 * STORY 8.3 review R1 (P1) — `calculateVenueShadowTimelineForGeometry` must guard
 * each sample like the legacy `calculateVenueShadowTimeline`: a single throwing
 * sample degrades to a neutral 50/50/0.2 fallback point rather than rejecting the
 * whole timeline (which would make `applyRealSunEngine` degrade the ENTIRE venue
 * to seed values). This pins the per-sample try/catch.
 *
 * The geometry math is mocked to throw at the `calculateShadowedAndSunlitAreas`
 * step (reached for every sun-up, above-min-elevation sample), isolated to this
 * file so the rest of the engine math stays real.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({
  supabaseServiceRole: { rpc: mocks.rpc },
}));

vi.mock('@/lib/solar/shadow-geometry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/solar/shadow-geometry')>();
  return {
    ...actual,
    calculateShadowedAndSunlitAreas: () => {
      throw new Error('boom — geometry op failed for this sample');
    },
  };
});

import { calculateVenueShadowTimelineForGeometry } from '@/lib/solar/shadow-calculation-service';

const GEOMETRY: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [[
    [11.9740, 57.7080],
    [11.9744, 57.7080],
    [11.9744, 57.7083],
    [11.9740, 57.7083],
    [11.9740, 57.7080],
  ]],
};

// Stockholm 12:00–12:30 at the summer solstice — sun is high (~53°), so every
// sample reaches computeShadowInfo (past the NoSun / low-elevation guards).
const SUMMER_MIDDAY_START = new Date('2026-06-21T10:00:00.000Z');
const SUMMER_MIDDAY_END = new Date('2026-06-21T10:30:00.000Z');
const HALF_HOUR_MS = 30 * 60_000;

describe('calculateVenueShadowTimelineForGeometry per-sample resilience (review R1 P1)', () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.rpc.mockResolvedValue({ data: [], error: null }); // buildings fetch ok, empty
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('degrades a throwing sample to a neutral fallback point instead of rejecting the whole timeline', async () => {
    const timeline = await calculateVenueShadowTimelineForGeometry(
      GEOMETRY,
      SUMMER_MIDDAY_START,
      SUMMER_MIDDAY_END,
      HALF_HOUR_MS,
    );

    // Buildings are fetched ONCE for the whole timeline (single RPC).
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(timeline.points.length).toBeGreaterThan(0);
    // Each sun-up sample hit the throwing geometry op and fell back to 50/50/0.2
    // rather than aborting the run.
    for (const point of timeline.points) {
      expect(point.shadowedAreaPercent).toBe(50.0);
      expect(point.sunlitAreaPercent).toBe(50.0);
      expect(point.confidence).toBe(0.2);
      expect(point.isSunVisible).toBe(true);
    }
  });
});
