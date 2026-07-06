/**
 * Applies the SunnySeat basemap colour overrides (see
 * `lib/constants/map-basemap-colors.ts`) to a loaded MapLibre style.
 *
 * Called once the positron style is loaded (`map.isStyleLoaded()` / the
 * `styledata` event), this recolours the water and green layers toward the
 * friendlier blue/green palette while leaving roads, buildings, boundaries and
 * labels at their neutral positron defaults.
 *
 * RESILIENCE: each override is applied only if the target layer actually exists
 * in the loaded style (`map.getLayer(...)`), so a renamed/removed/absent layer
 * is skipped silently instead of throwing. Any unexpected `setPaintProperty`
 * failure for an individual layer is swallowed so a single bad layer can never
 * break the whole recolour (or the map). This keeps the override safe across
 * upstream positron style changes.
 */
import type { Map as MapLibreMap } from 'maplibre-gl';
import {
  BASEMAP_COLOR_OVERRIDES,
  type BasemapColorOverride,
} from '@/lib/constants/map-basemap-colors';

/**
 * The subset of the MapLibre `Map` surface this helper needs. Declared
 * structurally so unit tests can pass a light fake without constructing a real
 * WebGL map, and so we don't couple to the full `maplibre-gl` `Map` type.
 */
export interface BasemapStyleTarget {
  getLayer(id: string): unknown;
  setPaintProperty(layerId: string, name: string, value: unknown): unknown;
}

/**
 * Recolour every present water/green layer. Returns the list of layer ids that
 * were actually recoloured (useful for logging/tests); absent layers are
 * omitted. Never throws.
 */
export function applyBasemapColorOverrides(
  map: BasemapStyleTarget,
  overrides: readonly BasemapColorOverride[] = BASEMAP_COLOR_OVERRIDES,
): string[] {
  const applied: string[] = [];
  for (const { layerId, paintProperty, color } of overrides) {
    let layerExists = false;
    try {
      layerExists = Boolean(map.getLayer(layerId));
    } catch {
      // A malformed style descriptor can make getLayer throw; treat as absent.
      layerExists = false;
    }
    if (!layerExists) continue;
    try {
      map.setPaintProperty(layerId, paintProperty, color);
      applied.push(layerId);
    } catch {
      // A single layer failing to recolour must not break the others or the map.
    }
  }
  return applied;
}

/**
 * Convenience wrapper accepting the real MapLibre map. `map.getLayer` /
 * `map.setPaintProperty` are only safe once the style has loaded, so callers
 * must gate on `map.isStyleLoaded()` or the `styledata`/`load` event first.
 */
export function applyBasemapColorOverridesToMap(map: MapLibreMap): string[] {
  return applyBasemapColorOverrides(map as unknown as BasemapStyleTarget);
}
