/**
 * Unit coverage for the resilient basemap recolour applier
 * (`lib/utils/apply-basemap-colors.ts`) and the colour constants
 * (`lib/constants/map-basemap-colors.ts`).
 *
 * The recolour runs against a live WebGL MapLibre map at runtime (covered end-
 * to-end by the map-primary e2e), but the RESILIENCE contract — skip absent
 * layers, swallow per-layer failures, never touch neutral surfaces — is pure
 * logic best pinned in the fast gate with a light fake `Map`.
 */
import { describe, expect, it } from 'vitest';
import {
  applyBasemapColorOverrides,
  type BasemapStyleTarget,
} from '@/lib/utils/apply-basemap-colors';
import {
  BASEMAP_COLOR_OVERRIDES,
  BASEMAP_WATER_BLUE,
  BASEMAP_WATERWAY_BLUE,
  BASEMAP_PARK_GREEN,
  BASEMAP_WOOD_GREEN,
} from '@/lib/constants/map-basemap-colors';

/** A fake style target that "has" only the given layer ids. */
function fakeMap(presentLayerIds: string[]): {
  target: BasemapStyleTarget;
  calls: Array<{ layerId: string; name: string; value: unknown }>;
} {
  const present = new Set(presentLayerIds);
  const calls: Array<{ layerId: string; name: string; value: unknown }> = [];
  const target: BasemapStyleTarget = {
    getLayer: (id) => (present.has(id) ? { id } : undefined),
    setPaintProperty: (layerId, name, value) => {
      calls.push({ layerId, name, value });
    },
  };
  return { target, calls };
}

describe('applyBasemapColorOverrides', () => {
  it('recolours the real positron water/green layer ids to the blue/green palette', () => {
    const { target, calls } = fakeMap(['water', 'waterway', 'park', 'landcover_wood']);
    const applied = applyBasemapColorOverrides(target);

    expect(applied).toEqual(['water', 'waterway', 'park', 'landcover_wood']);
    const byLayer = new Map(calls.map((c) => [c.layerId, c]));
    expect(byLayer.get('water')).toEqual({
      layerId: 'water',
      name: 'fill-color',
      value: BASEMAP_WATER_BLUE,
    });
    expect(byLayer.get('waterway')).toEqual({
      layerId: 'waterway',
      name: 'line-color',
      value: BASEMAP_WATERWAY_BLUE,
    });
    expect(byLayer.get('park')).toEqual({
      layerId: 'park',
      name: 'fill-color',
      value: BASEMAP_PARK_GREEN,
    });
    expect(byLayer.get('landcover_wood')).toEqual({
      layerId: 'landcover_wood',
      name: 'fill-color',
      value: BASEMAP_WOOD_GREEN,
    });
  });

  it('skips absent layers silently (no setPaintProperty, no throw)', () => {
    const { target, calls } = fakeMap(['water']); // only water present
    const applied = applyBasemapColorOverrides(target);
    expect(applied).toEqual(['water']);
    expect(calls).toHaveLength(1);
  });

  it('recolours nothing when no target layer is present', () => {
    const { target, calls } = fakeMap([]);
    const applied = applyBasemapColorOverrides(target);
    expect(applied).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it('swallows a getLayer that throws (malformed style) and continues', () => {
    const calls: Array<{ layerId: string; name: string }> = [];
    let first = true;
    const target: BasemapStyleTarget = {
      getLayer: (id) => {
        if (first) {
          first = false;
          throw new Error('style not ready');
        }
        return id === 'park' ? { id } : undefined;
      },
      setPaintProperty: (layerId, name) => {
        calls.push({ layerId, name });
      },
    };
    // Must not throw despite the first getLayer blowing up.
    const applied = applyBasemapColorOverrides(target);
    expect(applied).toContain('park');
  });

  it('swallows a per-layer setPaintProperty failure without breaking the rest', () => {
    const present = new Set(['water', 'park']);
    const good: string[] = [];
    const target: BasemapStyleTarget = {
      getLayer: (id) => (present.has(id) ? { id } : undefined),
      setPaintProperty: (layerId) => {
        if (layerId === 'water') throw new Error('paint failed');
        good.push(layerId);
      },
    };
    const applied = applyBasemapColorOverrides(target);
    // water threw → not in applied; park still recoloured.
    expect(applied).toEqual(['park']);
    expect(good).toEqual(['park']);
  });

  it('never targets neutral road/building/label layers', () => {
    const targeted = new Set(BASEMAP_COLOR_OVERRIDES.map((o) => o.layerId));
    for (const neutral of ['building', 'background', 'highway_major_inner', 'label_city']) {
      expect(targeted.has(neutral)).toBe(false);
    }
  });

  it('every override sets a colour property (fill-color for fills, line-color for lines)', () => {
    for (const o of BASEMAP_COLOR_OVERRIDES) {
      expect(['fill-color', 'line-color']).toContain(o.paintProperty);
      expect(o.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
