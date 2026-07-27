/**
 * ATDD RED-PHASE acceptance scaffolds - Story 12.5
 * Dev editor polygon validation and no-write-on-error behavior.
 */

import { describe, expect, test, vi } from 'vitest';

type PolygonValidationResult =
  | { ok: true; polygon: { type: 'Polygon'; coordinates: number[][][] } }
  | { ok: false; code: string; message: string };

type PlannedPolygonEditorModule = {
  validateDevEditorSeatingPolygon: (input: unknown) => PolygonValidationResult;
  saveValidatedPolygon: (input: unknown, writer: (polygon: unknown) => Promise<void>) => Promise<PolygonValidationResult>;
};

async function loadPlannedPolygonEditorModule(): Promise<PlannedPolygonEditorModule> {
  throw new Error('RED: implement strict dev editor polygon validation and import it here.');
}

const closedRing = [
  [11.9700, 57.7050],
  [11.9704, 57.7050],
  [11.9704, 57.7054],
  [11.9700, 57.7050],
];

describe.skip('Story 12.5 ATDD - polygon validation', () => {
  test('[P0] accepts a closed outer ring in [lng, lat] order and normalizes to GeoJSON Polygon', async () => {
    const polygons = await loadPlannedPolygonEditorModule();

    expect(polygons.validateDevEditorSeatingPolygon(closedRing)).toEqual({
      ok: true,
      polygon: { type: 'Polygon', coordinates: [closedRing] },
    });
  });

  test('[P0] accepts a GeoJSON Polygon with one closed outer ring', async () => {
    const polygons = await loadPlannedPolygonEditorModule();

    expect(polygons.validateDevEditorSeatingPolygon({
      type: 'Polygon',
      coordinates: [closedRing],
    })).toEqual({
      ok: true,
      polygon: { type: 'Polygon', coordinates: [closedRing] },
    });
  });

  test('[P0] rejects unclosed, too-short, non-finite, and non-Polygon inputs with specific errors', async () => {
    const polygons = await loadPlannedPolygonEditorModule();

    expect(polygons.validateDevEditorSeatingPolygon(closedRing.slice(0, 3))).toMatchObject({
      ok: false,
      code: 'POLYGON_RING_TOO_SHORT',
    });
    expect(polygons.validateDevEditorSeatingPolygon([
      [11.9700, 57.7050],
      [11.9704, 57.7050],
      [11.9704, 57.7054],
      [11.9701, 57.7051],
    ])).toMatchObject({
      ok: false,
      code: 'POLYGON_RING_NOT_CLOSED',
    });
    expect(polygons.validateDevEditorSeatingPolygon([
      [11.9700, 57.7050],
      [Number.NaN, 57.7050],
      [11.9704, 57.7054],
      [11.9700, 57.7050],
    ])).toMatchObject({
      ok: false,
      code: 'POLYGON_COORDINATE_NON_FINITE',
    });
    expect(polygons.validateDevEditorSeatingPolygon({ type: 'MultiPolygon', coordinates: [] })).toMatchObject({
      ok: false,
      code: 'POLYGON_TYPE_UNSUPPORTED',
    });
  });

  test('[P0] rejects coordinates outside Gothenburg bounds and likely lat/lng swaps', async () => {
    const polygons = await loadPlannedPolygonEditorModule();

    expect(polygons.validateDevEditorSeatingPolygon([
      [57.7050, 11.9700],
      [57.7051, 11.9700],
      [57.7051, 11.9701],
      [57.7050, 11.9700],
    ])).toMatchObject({
      ok: false,
      code: 'POLYGON_OUTSIDE_GOTHENBURG_BOUNDS',
    });
  });

  test('[P0] invalid polygon writes nothing', async () => {
    const polygons = await loadPlannedPolygonEditorModule();
    const writer = vi.fn(async () => undefined);

    const result = await polygons.saveValidatedPolygon([
      [11.9700, 57.7050],
      [11.9704, 57.7050],
      [11.9701, 57.7051],
    ], writer);

    expect(result).toMatchObject({ ok: false });
    expect(writer).not.toHaveBeenCalled();
  });
});
