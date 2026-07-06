'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapInstance } from '@/lib/contexts/MapInstanceContext';
import { GOTHENBURG_CENTRE } from '@/lib/constants/geography';
import { isStyleResourceUrl } from '@/lib/utils/map-errors';
import { applyBasemapColorOverridesToMap } from '@/lib/utils/apply-basemap-colors';

const TILE_FAILURE_THRESHOLD = 4;
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

/**
 * Story 1.4 — MapLibre canvas. Renders the actual map and a decorative
 * gradient overlay on top, plus a sand-coloured fallback if tile loading
 * fails persistently or the style cannot be loaded (AC1).
 *
 * Lifecycle: the component is responsible only for the map instance and
 * its visual overlays. `VenuePinLayer` and `MapControls` are mounted as
 * siblings by the orchestrating `MapView`.
 *
 * The instance is stored into the `MapInstance` context after creation
 * so other components can read it without prop-drilling.
 *
 * Style source: OpenFreeMap (community tile service, no API key). Round 2
 * D3=B dropped the optional MapTiler upstream because the proxied
 * `style.json` still embedded the API key in tile URLs the browser
 * fetched directly — the original D4 concern was not actually resolved.
 * If OpenFreeMap proves insufficient, see deferred-work.md for the
 * tile-proxy alternative.
 */
export function MapContainer() {
  const t = useTranslations('map');
  const { mapRef, setMapInstance } = useMapInstance();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tilesFailed, setTilesFailed] = useState(false);
  // Bump on every false→true transition so the live region remounts and
  // screen readers re-announce on a *second* failure (Story 1.4 R1
  // deferred-work — `role="status"` repeated announcements).
  const [failureKey, setFailureKey] = useState(0);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    let tileFailureCount = 0;
    let isMounted = true;
    const safeSetTilesFailed = (value: boolean) => {
      if (!isMounted) return;
      setTilesFailed((prev) => {
        if (!prev && value) setFailureKey((k) => k + 1);
        return value;
      });
    };

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [GOTHENBURG_CENTRE.lng, GOTHENBURG_CENTRE.lat],
      zoom: GOTHENBURG_CENTRE.zoom,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });

    setMapInstance(map);

    /**
     * Basemap recolour (maintainer design review, 2026-07-06): the positron
     * style ships a near-grey water/green palette. We recolour the water and
     * green layers toward a friendlier blue/green ONCE the style has loaded,
     * so the map reads pleasant and colourful under the (unchanged) warm brand
     * overlay. Roads/buildings/labels stay neutral, and every override is
     * applied only if the layer is present (see `apply-basemap-colors.ts`).
     *
     * The style can already be loaded by the time this effect runs (fast
     * cache) OR load later; cover both. We do NOT re-apply on every
     * `styledata` — `setPaintProperty` itself emits `styledata`, which would
     * loop — a single application on load is enough (the overrides are static
     * and MapLibre persists them for the style's lifetime).
     */
    const recolourBasemap = () => {
      applyBasemapColorOverridesToMap(map);
    };
    if (map.isStyleLoaded()) {
      recolourBasemap();
    } else {
      map.once('load', recolourBasemap);
    }

    // Story 1.6 Task 11 removed the dev-only `[MapContainer] Map load
    // took N ms` info log. The metric measured style parse, not tile
    // paint, and Lighthouse Performance ≥ 0.55 (CI gate, see
    // `lighthouserc.json`) covers the tile-paint timing more directly
    // via Largest Contentful Paint. If real-user telemetry is later
    // wanted, hook into Vercel Analytics' custom-event API or
    // `web-vitals` rather than reviving this log.
    //
    // Story 1.6 review (P35): the empty-handler husk was removed (no
    // `map.on('load', ...)` registration; the `'load'` event is unused).

    /**
     * Style/sprite/glyph errors fall back immediately — the map cannot
     * render without these resources. We detect them via the URL of the
     * failed request rather than message-text matching, because
     * substring tests like /style/i over-trigger on tile errors that
     * happen to mention "style" in their message.
     *
     * Story 1.6 Round 1 P29 + Round 2 R2-P1: the style-resource predicate
     * is now the shared `isStyleResourceUrl` helper covering /styles/,
     * /sprite, /glyphs/, and the literal /style.json suffix. Originally
     * `failedUrl.endsWith('.json')` matched any failed JSON resource (per-
     * tile metadata fetches, future cache manifests, future webhook URLs)
     * and would latch the sand fallback on transient noise; the helper
     * keeps the predicate narrow and shared with MapView so the two cannot
     * drift again (Round 1 P29/P31 had drifted, hiding the sand fallback
     * behind a permanent loading skeleton on sprite/glyph failure).
     */
    const handleError = (event: maplibregl.ErrorEvent) => {
      const errorEvent = event as maplibregl.ErrorEvent & {
        tile?: unknown;
        sourceId?: string;
        error?: { message?: unknown; url?: string };
      };

      if (isStyleResourceUrl(errorEvent.error?.url) && !errorEvent.tile) {
        safeSetTilesFailed(true);
        return;
      }

      if (errorEvent.tile) {
        tileFailureCount += 1;
        if (tileFailureCount >= TILE_FAILURE_THRESHOLD) {
          safeSetTilesFailed(true);
        }
      }
    };

    /**
     * Auto-recovery: when a tile source successfully (re)loads after a
     * latched failure, clear the fallback and reset the counter.
     *
     * Story 1.6 review (P30): scoped to actual tile sources. MapLibre's
     * `sourcedata` event fires for every source, including the style
     * descriptor itself (sourceId=`'composite'` style metadata, glyphs,
     * sprites). Without the sourceId scope, any style-source success
     * silently zeroed the tile-failure count, so transient tile failures
     * never reached the threshold of 4 unless they all happened between
     * style events. We accept any tile source whose ID is the conventional
     * `'openmaptiles'` (OpenFreeMap's name) or `'osm'` / `'tiles'` for
     * future style swaps; the style/sprite/glyph sources have distinct
     * IDs and are filtered out.
     */
    const TILE_SOURCE_IDS = new Set(['openmaptiles', 'osm', 'tiles']);
    const handleSourceData = (event: maplibregl.MapSourceDataEvent) => {
      if (event.sourceDataType === 'metadata') return;
      if (!event.isSourceLoaded) return;
      const sourceId = (event as maplibregl.MapSourceDataEvent & { sourceId?: string }).sourceId;
      if (!sourceId || !TILE_SOURCE_IDS.has(sourceId)) return;
      tileFailureCount = 0;
      safeSetTilesFailed(false);
    };

    map.on('error', handleError);
    map.on('sourcedata', handleSourceData);

    return () => {
      isMounted = false;
      map.off('error', handleError);
      map.off('sourcedata', handleSourceData);
      map.remove();
      setMapInstance(null);
    };
  }, [mapRef, setMapInstance]);

  return (
    <>
      <div
        ref={containerRef}
        data-testid="map-container"
        // Story 7.3 Task 8.4: once tile/style loading has hard-failed, the
        // cream status overlay below communicates the failure visually. Mark
        // the now non-functional, visually-covered MapLibre canvas `inert` so
        // keyboard and screen-reader users don't tab into a map they can't see
        // or use — keeping the sighted fallback and the focus state coherent
        // (the same "communicate unavailability" stance as the offline shell).
        // Clears automatically when a tile source recovers and `tilesFailed`
        // flips back to false.
        inert={tilesFailed}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
      {/* Story 11.5 (AC1): the two decorative tint layers were reduced to
          ~a quarter of their previous strength so the basemap (streets,
          water, parks, labels) reads clearly while a subtle warm brand tone
          remains. The sand wash dropped from /80 → /20 and the
          `--gradient-map-overlay` alpha stops were thinned to a quarter (see
          globals.css). The exact strength was set by a design-gate eyeball
          against the live map; tests assert the OUTCOME (legible basemap +
          axe AA green), never a specific opacity number. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none bg-surface-sand/20"
        style={{ zIndex: 1 }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none gradient-map-overlay"
        style={{ zIndex: 2 }}
      />
      {tilesFailed && (
        <div
          key={failureKey}
          role="status"
          className="absolute inset-0 bg-surface-sand pointer-events-none flex items-center justify-center"
          style={{ zIndex: 3 }}
        >
          <p className="text-body-sm text-text-muted">{t('tileLoadFailed')}</p>
        </div>
      )}
    </>
  );
}
