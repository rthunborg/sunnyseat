import { useRef, useCallback, useEffect } from 'react';
import type maplibregl from 'maplibre-gl';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SHADOW_SOURCE_ID = 'shadow-polygons';
const SHADOW_LAYER_ID = 'shadow-fill';
const SHADOW_OUTLINE_LAYER_ID = 'shadow-outline';

/** Minimum zoom at which shadows are fetched/visible */
export const SHADOW_MIN_ZOOM = 15;

/** Debounce interval for refetching on time or view change (ms) */
const FETCH_DEBOUNCE_MS = 800;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShadowApiResponse {
  shadows: GeoJSON.FeatureCollection;
  meta: {
    venuesProcessed: number;
    shadowFeaturesCount: number;
    timestamp: string;
    radiusKm: number;
  };
}

interface UseMapShadowLayersOptions {
  /** The MapLibre map instance (null until loaded) */
  map: maplibregl.Map | null;
  /** Whether shadow layers are enabled */
  enabled: boolean;
  /** Timestamp override for time-slider (ISO string or null for 'now') */
  timestamp?: string | null;
  /** Whether user prefers reduced motion */
  reducedMotion?: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages shadow polygon layers on a MapLibre map.
 *
 * - Fetches /api/shadows when the map center changes at zoom >= 15
 * - Adds semi-transparent shadow fill layers to the map
 * - Debounces requests to avoid spamming on pan/zoom
 * - Cleans up layers and sources on unmount
 */
export function useMapShadowLayers({
  map,
  enabled,
  timestamp,
  reducedMotion = false,
}: UseMapShadowLayersOptions) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layersAddedRef = useRef(false);

  // -------------------------------------------------------------------
  // Add source + layers if not yet present
  // -------------------------------------------------------------------
  const ensureLayers = useCallback(
    (mapInstance: maplibregl.Map) => {
      if (layersAddedRef.current) return;
      if (mapInstance.getSource(SHADOW_SOURCE_ID)) {
        layersAddedRef.current = true;
        return;
      }

      mapInstance.addSource(SHADOW_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Insert below venue marker layers so shadows don't cover markers.
      // The glow layer may not exist yet if venues haven't loaded, so fall back gracefully.
      const beforeLayer = mapInstance.getLayer('venue-markers-glow')
        ? 'venue-markers-glow'
        : undefined;

      // Shadow fill layer — semi-transparent dark overlay
      mapInstance.addLayer(
        {
          id: SHADOW_LAYER_ID,
          type: 'fill',
          source: SHADOW_SOURCE_ID,
          minzoom: SHADOW_MIN_ZOOM,
          paint: {
            'fill-color': '#1a1a2e',
            'fill-opacity': reducedMotion ? 0.18 : 0.18,
            'fill-opacity-transition': { duration: reducedMotion ? 0 : 600 },
          },
        },
        beforeLayer,
      );

      // Shadow edge outline for definition
      mapInstance.addLayer(
        {
          id: SHADOW_OUTLINE_LAYER_ID,
          type: 'line',
          source: SHADOW_SOURCE_ID,
          minzoom: SHADOW_MIN_ZOOM,
          paint: {
            'line-color': '#1a1a2e',
            'line-width': 0.5,
            'line-opacity': 0.12,
          },
        },
        beforeLayer,
      );

      layersAddedRef.current = true;
    },
    [reducedMotion],
  );

  // -------------------------------------------------------------------
  // Fetch shadows for the current map center
  // -------------------------------------------------------------------
  const fetchShadows = useCallback(
    async (mapInstance: maplibregl.Map) => {
      // Cancel any in-flight request
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const center = mapInstance.getCenter();
      const zoom = mapInstance.getZoom();

      if (zoom < SHADOW_MIN_ZOOM) {
        // Clear existing shadow data when zoomed out
        const source = mapInstance.getSource(SHADOW_SOURCE_ID) as
          | maplibregl.GeoJSONSource
          | undefined;
        source?.setData({ type: 'FeatureCollection', features: [] });
        return;
      }

      const params = new URLSearchParams({
        lat: center.lat.toFixed(6),
        lng: center.lng.toFixed(6),
        zoom: zoom.toFixed(1),
      });
      if (timestamp) {
        params.set('timestamp', timestamp);
      }

      try {
        const res = await fetch(`/api/shadows?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;

        const data: ShadowApiResponse = await res.json();

        // Ensure layers exist before setting data
        ensureLayers(mapInstance);

        const source = mapInstance.getSource(SHADOW_SOURCE_ID) as
          | maplibregl.GeoJSONSource
          | undefined;
        source?.setData(data.shadows);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Failed to fetch shadow data:', err);
      }
    },
    [timestamp, ensureLayers],
  );

  // -------------------------------------------------------------------
  // Debounced fetch trigger
  // -------------------------------------------------------------------
  const scheduleFetch = useCallback(
    (mapInstance: maplibregl.Map) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        fetchShadows(mapInstance);
      }, FETCH_DEBOUNCE_MS);
    },
    [fetchShadows],
  );

  // -------------------------------------------------------------------
  // Wire up map events
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!map || !enabled) return;

    // Initial fetch
    if (map.isStyleLoaded()) {
      scheduleFetch(map);
    } else {
      map.once('load', () => scheduleFetch(map));
    }

    // Refetch on move/zoom
    const handleMoveEnd = () => scheduleFetch(map);
    map.on('moveend', handleMoveEnd);

    return () => {
      map.off('moveend', handleMoveEnd);
      abortControllerRef.current?.abort();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [map, enabled, scheduleFetch]);

  // -------------------------------------------------------------------
  // Re-fetch when timestamp changes (time slider)
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!map || !enabled) return;
    if (!map.isStyleLoaded()) return;

    scheduleFetch(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timestamp]);

  // -------------------------------------------------------------------
  // Toggle visibility
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!map || !layersAddedRef.current) return;

    const visibility = enabled ? 'visible' : 'none';
    try {
      if (map.getLayer(SHADOW_LAYER_ID)) {
        map.setLayoutProperty(SHADOW_LAYER_ID, 'visibility', visibility);
      }
      if (map.getLayer(SHADOW_OUTLINE_LAYER_ID)) {
        map.setLayoutProperty(SHADOW_OUTLINE_LAYER_ID, 'visibility', visibility);
      }
    } catch {
      // Layers may not exist yet
    }
  }, [map, enabled]);

  // -------------------------------------------------------------------
  // Cleanup on unmount
  // -------------------------------------------------------------------
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);
}
