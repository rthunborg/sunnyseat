/**
 * Basemap colour overrides for the OpenFreeMap "positron" MapLibre style.
 *
 * WHY THIS EXISTS
 * ---------------
 * The OpenFreeMap positron basemap ships a deliberately muted, near-grey
 * palette (water `rgb(194,200,202)`, parks `rgb(230,233,229)`, woods
 * `rgb(220,224,220)`). Story 11.5 already de-dulled the app's own warm tint
 * overlay (the `--gradient-map-overlay` alpha stops + the `bg-surface-sand`
 * wash in `MapContainer.tsx`), but the remaining greyness comes from the
 * BASEMAP's own colours, which no CSS token can reach — MapLibre paints the
 * canvas from the style JSON, not the DOM.
 *
 * A maintainer design review ("the map looks too grey/depressing — water
 * bluer, greens greener, keep the warm brand tint") asked for the base colours
 * themselves to read clearly blue/green while the subtle warm overlay stays.
 * We do that by overriding the relevant style layers' paint colours after the
 * style loads (`map.setPaintProperty`), which is the MapLibre-idiomatic way to
 * recolour a hosted style without forking the whole style JSON.
 *
 * WHY A CONSTANTS BLOCK (not a CSS token)
 * ---------------------------------------
 * These values are consumed by the MapLibre JS API, never by CSS — the canvas
 * is not a DOM surface. So, mirroring how the app tokenizes every OTHER map
 * colour that a component consumes (e.g. `--color-amber-location-dot`,
 * `--color-map-line` in `globals.css`), the basemap-layer colours live here as
 * one named, documented block rather than as magic hex scattered through
 * `MapContainer.tsx`. `DESIGN.md` §"Map Background" documents them alongside the
 * CSS map tokens so the two stay in sync.
 *
 * COLOUR CHOICES (design-gate eyeball, biased clearly away from grey)
 * ------------------------------------------------------------------
 * The app's warm sand wash (`bg-surface-sand/20`) + `--gradient-map-overlay`
 * sit ON TOP of the canvas, so the perceived colour is slightly warmed/muted
 * vs. these source values. The values below are therefore chosen a touch more
 * vivid/cooler than the on-screen target so the water reads as a friendly,
 * clearly-blue blue and the greens as a fresh (not toy) green THROUGH the warm
 * tint. Roads, buildings, boundaries and labels are deliberately left at the
 * positron defaults (kept neutral, per the design request), so pin/label
 * contrast — which the axe AA gate pins over these colours (R-006) — is
 * unaffected: the venue pins/labels render on their own opaque fills, not on
 * the basemap.
 *
 * RESILIENCE
 * ----------
 * The applier looks each layer up by id at runtime and SKIPS silently if a
 * layer is absent, so an upstream positron style change (renamed/removed layer,
 * or extra `grass`/`forest`/`landcover-*` variants appearing) can never throw —
 * every plausible water/green variant is listed; only the present ones are
 * recoloured.
 */

/** A single style-layer recolour: which paint property to set, to what value. */
export type BasemapColorOverride = {
  /** The layer `id` in the loaded positron style. */
  readonly layerId: string;
  /** The paint property to override (`fill-color` for fills, `line-color` for lines). */
  readonly paintProperty: 'fill-color' | 'line-color';
  /** The new colour (any MapLibre-accepted colour string). */
  readonly color: string;
};

/**
 * Water: a friendly, clearly-blue blue (was the near-grey `rgb(194,200,202)` /
 * `hsl(195,17%,78%)`). The waterway (thin rivers/canals) gets a slightly
 * stronger blue so hairline strokes still read as water through the warm tint.
 */
export const BASEMAP_WATER_BLUE = '#7cc0e8';
export const BASEMAP_WATERWAY_BLUE = '#5fb0df';

/**
 * Greens: a fresh, natural green (was the grey-green `rgb(230,233,229)` for
 * parks / `rgb(220,224,220)` for woods). Woods sit a touch deeper than parks so
 * the two green surfaces stay distinguishable.
 */
export const BASEMAP_PARK_GREEN = '#b6e0a6';
export const BASEMAP_WOOD_GREEN = '#a6d691';

/**
 * The full override table. Every water/green layer variant the positron style
 * could plausibly expose is listed; the applier skips any that are absent in
 * the loaded style (see `applyBasemapColorOverrides`). Roads/buildings/labels
 * are intentionally NOT here — they stay neutral.
 *
 * Present in positron as of 2026-07: `water`, `waterway`, `park`,
 * `landcover_wood`. The remaining entries (`landcover_grass`, `grass`, `wood`,
 * `forest`, `landcover-*`, `park_outline`) are forward-compat no-ops guarding
 * against an upstream style refresh that splits or renames these surfaces.
 */
export const BASEMAP_COLOR_OVERRIDES: readonly BasemapColorOverride[] = [
  // ── Water ──────────────────────────────────────────────────────────────
  { layerId: 'water', paintProperty: 'fill-color', color: BASEMAP_WATER_BLUE },
  { layerId: 'water_shadow', paintProperty: 'fill-color', color: BASEMAP_WATER_BLUE },
  { layerId: 'ocean', paintProperty: 'fill-color', color: BASEMAP_WATER_BLUE },
  { layerId: 'waterway', paintProperty: 'line-color', color: BASEMAP_WATERWAY_BLUE },
  { layerId: 'waterway-tunnel', paintProperty: 'line-color', color: BASEMAP_WATERWAY_BLUE },
  { layerId: 'waterway_line', paintProperty: 'line-color', color: BASEMAP_WATERWAY_BLUE },
  // ── Greens ─────────────────────────────────────────────────────────────
  { layerId: 'park', paintProperty: 'fill-color', color: BASEMAP_PARK_GREEN },
  { layerId: 'park_outline', paintProperty: 'line-color', color: BASEMAP_PARK_GREEN },
  { layerId: 'landuse_park', paintProperty: 'fill-color', color: BASEMAP_PARK_GREEN },
  { layerId: 'landcover_grass', paintProperty: 'fill-color', color: BASEMAP_PARK_GREEN },
  { layerId: 'grass', paintProperty: 'fill-color', color: BASEMAP_PARK_GREEN },
  { layerId: 'landcover_wood', paintProperty: 'fill-color', color: BASEMAP_WOOD_GREEN },
  { layerId: 'wood', paintProperty: 'fill-color', color: BASEMAP_WOOD_GREEN },
  { layerId: 'forest', paintProperty: 'fill-color', color: BASEMAP_WOOD_GREEN },
  { layerId: 'landcover-wood', paintProperty: 'fill-color', color: BASEMAP_WOOD_GREEN },
  { layerId: 'landcover-grass', paintProperty: 'fill-color', color: BASEMAP_PARK_GREEN },
] as const;
