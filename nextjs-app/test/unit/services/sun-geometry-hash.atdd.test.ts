/**
 * ATDD RED-PHASE acceptance scaffolds - Story 12.3
 * Canonical geometry_input_hash contract.
 */

import { describe, expect, test } from 'vitest';

type HashModule = {
  computeGeometryInputHash: (input: unknown) => string | Promise<string>;
  GEOMETRY_INPUT_HASH_GOLDEN_VECTORS?: Record<string, string>;
};

const hashModulePath = '@/lib/services/sun-geometry-hash';

async function loadHashModule(): Promise<HashModule> {
  return (await import(hashModulePath)) as HashModule;
}

const baseInput = {
  version: 'g1',
  plannerStepMinutes: 15,
  venue: {
    id: 'venue-1',
    seatingElevationM: 18.25,
    groundElevationM: 11.5,
    seatingArea: {
      type: 'Polygon',
      coordinates: [
        [
          [11.9701, 57.7051],
          [11.9704, 57.7051],
          [11.9704, 57.7054],
          [11.9701, 57.7054],
          [11.9701, 57.7051],
        ],
      ],
    },
  },
  casters: [
    {
      id: 'b-2',
      importGeneration: '2026-07-12',
      footprintEwkbHex: '0103000020E6100000010000000500000000',
      groundZ: 10,
      roofZ: 32.5,
    },
    {
      id: 'b-1',
      importGeneration: '2026-07-12',
      footprintEwkbHex: '0103000020E6100000010000000500000001',
      groundZ: 10.2,
      roofZ: 28,
    },
  ],
};

describe('Story 12.3 AC1 - canonical sun geometry input hash', () => {
  test.skip('emits exactly g1:<lowercase sha-256> for the canonical golden vector', async () => {
    const { computeGeometryInputHash, GEOMETRY_INPUT_HASH_GOLDEN_VECTORS } = await loadHashModule();
    const hash = await computeGeometryInputHash(baseInput);

    expect(hash).toMatch(/^g1:[0-9a-f]{64}$/);
    expect(hash).toBe(hash.toLowerCase());
    expect(GEOMETRY_INPUT_HASH_GOLDEN_VECTORS?.story123RealVenueScaleBase).toMatch(/^g1:[0-9a-f]{64}$/);
    expect(hash).toBe(GEOMETRY_INPUT_HASH_GOLDEN_VECTORS?.story123RealVenueScaleBase);
  });

  test.skip('is invariant to polygon ring rotation and orientation', async () => {
    const { computeGeometryInputHash } = await loadHashModule();
    const clockwise = await computeGeometryInputHash(baseInput);
    const rotatedAndReversed = structuredClone(baseInput);
    rotatedAndReversed.venue.seatingArea.coordinates[0] = [
      [11.9704, 57.7054],
      [11.9704, 57.7051],
      [11.9701, 57.7051],
      [11.9701, 57.7054],
      [11.9704, 57.7054],
    ];

    await expect(computeGeometryInputHash(rotatedAndReversed)).resolves.toBe(clockwise);
  });

  test.skip('is invariant to caster row order while preserving each caster identity', async () => {
    const { computeGeometryInputHash } = await loadHashModule();
    const first = await computeGeometryInputHash(baseInput);
    const reordered = { ...baseInput, casters: [...baseInput.casters].reverse() };

    await expect(computeGeometryInputHash(reordered)).resolves.toBe(first);
  });

  test.skip('normalizes -0 and 0 to the same canonical numeric representation', async () => {
    const { computeGeometryInputHash } = await loadHashModule();
    const positiveZero = structuredClone(baseInput);
    const negativeZero = structuredClone(baseInput);
    positiveZero.venue.groundElevationM = 0;
    negativeZero.venue.groundElevationM = -0;

    await expect(computeGeometryInputHash(negativeZero)).resolves.toBe(
      await computeGeometryInputHash(positiveZero),
    );
  });

  test.skip('rejects non-finite numeric inputs instead of silently canonicalizing them', async () => {
    const { computeGeometryInputHash } = await loadHashModule();
    const bad = structuredClone(baseInput) as typeof baseInput & { venue: { seatingElevationM: number } };
    bad.venue.seatingElevationM = Number.POSITIVE_INFINITY;

    await expect(computeGeometryInputHash(bad)).rejects.toThrow(/finite|non-finite/i);
  });

  test.skip('changes when planner step version, caster EWKB, or import generation changes', async () => {
    const { computeGeometryInputHash } = await loadHashModule();
    const base = await computeGeometryInputHash(baseInput);

    await expect(computeGeometryInputHash({ ...baseInput, plannerStepMinutes: 30 })).resolves.not.toBe(base);

    const ewkbChanged = structuredClone(baseInput);
    ewkbChanged.casters[0].footprintEwkbHex = '0103000020E61000000100000005000000ff';
    await expect(computeGeometryInputHash(ewkbChanged)).resolves.not.toBe(base);

    const generationChanged = structuredClone(baseInput);
    generationChanged.casters[0].importGeneration = '2026-07-13';
    await expect(computeGeometryInputHash(generationChanged)).resolves.not.toBe(base);
  });

  test.skip('includes actual get_buildings_near_point caster z-values in the hash input', async () => {
    const { computeGeometryInputHash } = await loadHashModule();
    const base = await computeGeometryInputHash(baseInput);
    const roofChanged = structuredClone(baseInput);
    roofChanged.casters[0].roofZ = 33.5;

    await expect(computeGeometryInputHash(roofChanged)).resolves.not.toBe(base);
  });
});
