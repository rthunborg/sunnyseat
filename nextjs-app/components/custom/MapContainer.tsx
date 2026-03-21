'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { useLanguage } from '@/lib/i18n';
import type { Coordinates } from '@/lib/types/location';
import type { SunExposureResult } from '@/lib/types/venue';
import type maplibregl from 'maplibre-gl';

const GOTHENBURG_CENTER: [number, number] = [11.9746, 57.7089];
const DEFAULT_ZOOM = 14;

/** Marker sizes (radius in px) */
const MARKER_RADIUS = { regular: 7, partner: 10, candidate: 6 };
const SELECTED_RADIUS = { regular: 11, partner: 13, candidate: 9 };
const SELECTION_RING_WHITE = 3;
const SELECTION_RING_COLOR = 2;

export const STATUS_COLORS: Record<string, string> = {
  sunny: '#16A34A',
  partial: '#D97706',
  shaded: '#6B7280',
  upcoming: '#8B5CF6',
};

/** Status color expression reusable across layers */
const STATUS_COLOR_EXPR: maplibregl.ExpressionSpecification = [
  'match',
  ['get', 'sunStatus'],
  'sunny', STATUS_COLORS.sunny,
  'partial', STATUS_COLORS.partial,
  'shaded', STATUS_COLORS.shaded,
  'upcoming', STATUS_COLORS.upcoming,
  '#6B7280',
];

/** Build a paint expression: selectedValue when id matches, defaultValue otherwise */
export function selectedExpr(
  selectedId: string,
  selectedValue: number,
  defaultValue: number,
): maplibregl.ExpressionSpecification {
  return ['case', ['==', ['get', 'id'], selectedId], selectedValue, defaultValue];
}

/** Opacity expression: 1 when selected, dimmed otherwise */
export function selectedOpacityExpr(
  selectedId: string,
  dimmedOpacity: number = 0.6,
): maplibregl.ExpressionSpecification {
  return ['case', ['==', ['get', 'id'], selectedId], 1, dimmedOpacity];
}

interface MapContainerProps {
  userLocation: Coordinates | null;
  onMapReady?: (map: maplibregl.Map) => void;
  venues?: SunExposureResult[];
  selectedVenueId?: string | null;
  hoveredVenueId?: string | null;
  onVenueSelect?: (id: string | null) => void;
  onBoundsChange?: (center: { lat: number; lng: number }) => void;
  sunnyPartnerIds?: string[];
}

function createUserMarkerElement(reducedMotion: boolean): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'user-location-marker';

  const dot = document.createElement('div');
  dot.style.width = '16px';
  dot.style.height = '16px';
  dot.style.background = 'var(--color-brand-primary, #2563EB)';
  dot.style.border = '3px solid white';
  dot.style.borderRadius = '50%';
  dot.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.3)';
  if (!reducedMotion) {
    dot.style.animation = 'pulse-ring 2s ease-out infinite';
  }

  el.appendChild(dot);
  return el;
}

function venuesToGeoJSON(venues: SunExposureResult[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: venues.map((v) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [v.venue.lng, v.venue.lat],
      },
      properties: {
        id: v.venue.id,
        venueName: v.venue.name,
        slug: v.venue.slug,
        sunStatus: v.current_status,
        lat: v.venue.lat,
        lng: v.venue.lng,
        isPartner: v.venue.is_partner ?? false,
        isCandidate: v.venue.verification_status === 0,
        neighborhood: v.venue.neighborhood,
      },
    })),
  };
}

function createSunnyNowBadgeElement(reducedMotion: boolean): HTMLDivElement {
  const el = document.createElement('div');
  el.style.pointerEvents = 'none';
  el.style.position = 'relative';
  el.style.top = '-18px';

  const badge = document.createElement('span');
  badge.setAttribute('role', 'status');
  badge.setAttribute('aria-label', 'Sol nu');
  badge.textContent = '☀ Sol nu';
  badge.style.display = 'inline-flex';
  badge.style.alignItems = 'center';
  badge.style.gap = '2px';
  badge.style.padding = '2px 6px';
  badge.style.borderRadius = '9999px';
  badge.style.backgroundColor = '#FFD700';
  badge.style.border = '1px solid #B8960F';
  badge.style.color = '#111827';
  badge.style.fontSize = '10px';
  badge.style.fontWeight = '600';
  badge.style.lineHeight = '1';
  badge.style.whiteSpace = 'nowrap';
  badge.style.boxShadow = '0 1px 2px rgba(0,0,0,0.15)';

  if (!reducedMotion) {
    badge.classList.add('animate-sunny-now-pulse');
  }

  el.appendChild(badge);
  return el;
}

export default function MapContainer({
  userLocation,
  onMapReady,
  venues,
  selectedVenueId,
  hoveredVenueId,
  onVenueSelect,
  onBoundsChange,
  sunnyPartnerIds,
}: MapContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hasFlyToFired = useRef(false);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const reducedMotion = useReducedMotion();
  const { t } = useLanguage();
  const moveendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markersInitialized = useRef(false);
  const sunnyBadgeMarkersRef = useRef<maplibregl.Marker[]>([]);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSelectedRef = useRef<string | null>(null);

  const initMap = useCallback(async () => {
    if (!containerRef.current || mapRef.current) return;

    const mgl = await import('maplibre-gl');

    // Load maplibre CSS via <link> tag to avoid PostCSS/lightningcss processing
    if (!document.querySelector('link[href*="maplibre-gl"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/maplibre-gl@5.20.2/dist/maplibre-gl.css';
      document.head.appendChild(link);
    }

    const tileKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    const styleUrl = tileKey
      ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${tileKey}`
      : 'https://demotiles.maplibre.org/style.json';

    const map = new mgl.default.Map({
      container: containerRef.current,
      style: styleUrl,
      center: GOTHENBURG_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 10,
      maxZoom: 18,
    });

    map.addControl(new mgl.default.NavigationControl(), 'top-right');

    mapRef.current = map;

    map.on('load', () => {
      onMapReady?.(map);
    });

    // Click on marker → select venue (regular + partner + candidate layers)
    const handleMarkerClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (e.features && e.features.length > 0) {
        const id = e.features[0].properties?.id;
        if (id) onVenueSelect?.(id);
      }
    };
    map.on('click', 'venue-markers', handleMarkerClick);
    map.on('click', 'partner-markers', handleMarkerClick);
    map.on('click', 'candidate-markers', handleMarkerClick);

    // Click on map background → deselect
    map.on('click', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['venue-markers', 'partner-markers', 'candidate-markers'] });
      if (!features || features.length === 0) {
        onVenueSelect?.(null);
      }
    });

    // Pointer cursor on markers
    const setCursorPointer = () => { map.getCanvas().style.cursor = 'pointer'; };
    const resetCursor = () => { map.getCanvas().style.cursor = ''; };
    map.on('mouseenter', 'venue-markers', setCursorPointer);
    map.on('mouseleave', 'venue-markers', resetCursor);
    map.on('mouseenter', 'partner-markers', setCursorPointer);
    map.on('mouseleave', 'partner-markers', resetCursor);
    map.on('mouseenter', 'candidate-markers', setCursorPointer);
    map.on('mouseleave', 'candidate-markers', resetCursor);

    // Fire initial center so venues load immediately at default location
    const initialCenter = map.getCenter();
    onBoundsChange?.({ lat: initialCenter.lat, lng: initialCenter.lng });

    // Auto-update on pan/zoom (debounced 500ms)
    map.on('moveend', () => {
      if (moveendTimerRef.current) clearTimeout(moveendTimerRef.current);
      moveendTimerRef.current = setTimeout(() => {
        const center = map.getCenter();
        onBoundsChange?.({ lat: center.lat, lng: center.lng });
      }, 500);
    });

    return () => {
      if (moveendTimerRef.current) clearTimeout(moveendTimerRef.current);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const cleanup = initMap();
    return () => {
      cleanup?.then((fn) => fn?.());
    };
  }, [initMap]);

  // Fly to user location
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation || hasFlyToFired.current) return;

    hasFlyToFired.current = true;
    const center: [number, number] = [userLocation.longitude, userLocation.latitude];

    if (reducedMotion) {
      map.jumpTo({ center, zoom: DEFAULT_ZOOM });
    } else {
      map.flyTo({ center, zoom: DEFAULT_ZOOM, duration: 800 });
    }

    // Add user location marker
    if (!userMarkerRef.current) {
      const el = createUserMarkerElement(reducedMotion);

      import('maplibre-gl').then((mgl) => {
        userMarkerRef.current = new mgl.default.Marker({ element: el })
          .setLngLat(center)
          .addTo(map);
      });
    }
  }, [userLocation, reducedMotion]);

  // Task 9 & 10: Update venue markers when venues change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !venues || venues.length === 0) return;

    // Wait for map style to be loaded
    const addMarkers = () => {
      const geojson = venuesToGeoJSON(venues);

      // Update existing source or add new one
      const source = map.getSource('venues') as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData(geojson);
        return;
      }

      map.addSource('venues', {
        type: 'geojson',
        data: geojson,
      });

      // Glow aura layer (behind markers, sunny non-partner non-candidate only)
      map.addLayer({
        id: 'venue-markers-glow',
        type: 'circle',
        source: 'venues',
        filter: ['all', ['==', ['get', 'sunStatus'], 'sunny'], ['!=', ['get', 'isPartner'], true], ['!=', ['get', 'isCandidate'], true]],
        paint: {
          'circle-radius': 11,
          'circle-color': '#16A34A',
          'circle-opacity': reducedMotion ? 0.2 : 0,
          'circle-stroke-width': 0,
        },
      });

      // Selection outer ring layer (regular venues — behind main markers)
      map.addLayer({
        id: 'venue-selection-ring',
        type: 'circle',
        source: 'venues',
        filter: ['all', ['!=', ['get', 'isPartner'], true], ['!=', ['get', 'isCandidate'], true]],
        paint: {
          'circle-radius': SELECTED_RADIUS.regular + SELECTION_RING_WHITE,
          'circle-color': 'transparent',
          'circle-opacity': 0,
          'circle-stroke-width': SELECTION_RING_COLOR,
          'circle-stroke-color': STATUS_COLOR_EXPR,
          'circle-stroke-opacity': 0,
        },
      });

      // Main marker layer (non-partner, non-candidate venues)
      map.addLayer({
        id: 'venue-markers',
        type: 'circle',
        source: 'venues',
        filter: ['all', ['!=', ['get', 'isPartner'], true], ['!=', ['get', 'isCandidate'], true]],
        paint: {
          'circle-radius': MARKER_RADIUS.regular,
          'circle-color': STATUS_COLOR_EXPR,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
          'circle-blur': 0.5,
          'circle-opacity': reducedMotion ? 1 : 0,
          'circle-radius-transition': { duration: reducedMotion ? 0 : 200 },
          'circle-stroke-width-transition': { duration: reducedMotion ? 0 : 200 },
        },
      });

      // Golden pin glow aura (partner venues only, behind golden markers)
      map.addLayer({
        id: 'partner-markers-glow',
        type: 'circle',
        source: 'venues',
        filter: ['==', ['get', 'isPartner'], true],
        paint: {
          'circle-radius': 14,
          'circle-color': '#FFD700',
          'circle-opacity': 0.25,
          'circle-stroke-width': 0,
        },
      });

      // Selection outer ring layer (partner venues — behind partner markers)
      map.addLayer({
        id: 'partner-selection-ring',
        type: 'circle',
        source: 'venues',
        filter: ['==', ['get', 'isPartner'], true],
        paint: {
          'circle-radius': SELECTED_RADIUS.partner + SELECTION_RING_WHITE,
          'circle-color': 'transparent',
          'circle-opacity': 0,
          'circle-stroke-width': SELECTION_RING_COLOR,
          'circle-stroke-color': '#FFD700',
          'circle-stroke-opacity': 0,
        },
      });

      // Golden pin marker layer (partner venues, larger and gold)
      map.addLayer({
        id: 'partner-markers',
        type: 'circle',
        source: 'venues',
        filter: ['==', ['get', 'isPartner'], true],
        paint: {
          'circle-radius': MARKER_RADIUS.partner,
          'circle-color': '#FFD700',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
          'circle-opacity': 1,
          'circle-radius-transition': { duration: reducedMotion ? 0 : 200 },
          'circle-stroke-width-transition': { duration: reducedMotion ? 0 : 200 },
        },
      });

      // Selection outer ring layer (candidate venues — behind candidate markers)
      map.addLayer({
        id: 'candidate-selection-ring',
        type: 'circle',
        source: 'venues',
        filter: ['==', ['get', 'isCandidate'], true],
        paint: {
          'circle-radius': SELECTED_RADIUS.candidate + SELECTION_RING_WHITE,
          'circle-color': 'transparent',
          'circle-opacity': 0,
          'circle-stroke-width': SELECTION_RING_COLOR,
          'circle-stroke-color': '#3B82F6',
          'circle-stroke-opacity': 0,
        },
      });

      // Candidate venue markers (blue dots for unverified venues)
      map.addLayer({
        id: 'candidate-markers',
        type: 'circle',
        source: 'venues',
        filter: ['==', ['get', 'isCandidate'], true],
        paint: {
          'circle-radius': MARKER_RADIUS.candidate,
          'circle-color': '#3B82F6',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
          'circle-opacity': 1,
          'circle-radius-transition': { duration: reducedMotion ? 0 : 200 },
          'circle-stroke-width-transition': { duration: reducedMotion ? 0 : 200 },
        },
      });

      // Pulse layer (used for selection pulse animation)
      map.addLayer({
        id: 'venue-pulse',
        type: 'circle',
        source: 'venues',
        paint: {
          'circle-radius': SELECTED_RADIUS.regular,
          'circle-color': 'transparent',
          'circle-opacity': 0,
          'circle-stroke-width': 3,
          'circle-stroke-color': STATUS_COLOR_EXPR,
          'circle-stroke-opacity': 0,
          'circle-radius-transition': { duration: 400 },
          'circle-stroke-opacity-transition': { duration: 400 },
        },
      });

      // Hit-test layer (invisible, larger for touch targets)
      map.addLayer({
        id: 'venue-markers-hit',
        type: 'circle',
        source: 'venues',
        paint: {
          'circle-radius': 22,
          'circle-opacity': 0,
        },
      });

      markersInitialized.current = true;

      // Task 10: Progressive marker appearance
      if (!reducedMotion) {
        // Sunny first (0ms)
        requestAnimationFrame(() => {
          map.setPaintProperty('venue-markers-glow', 'circle-opacity', 0.2);
          map.setPaintProperty('venue-markers', 'circle-opacity', [
            'case',
            ['==', ['get', 'sunStatus'], 'sunny'], 1,
            0,
          ]);

          // Partial (50ms)
          setTimeout(() => {
            map.setPaintProperty('venue-markers', 'circle-opacity', [
              'case',
              ['any',
                ['==', ['get', 'sunStatus'], 'sunny'],
                ['==', ['get', 'sunStatus'], 'partial'],
              ], 1,
              0,
            ]);
          }, 50);

          // Shaded + upcoming (100ms)
          setTimeout(() => {
            map.setPaintProperty('venue-markers', 'circle-opacity', 1);
          }, 100);
        });
      }
    };

    if (map.isStyleLoaded()) {
      addMarkers();
    } else {
      map.on('load', addMarkers);
    }
  }, [venues, reducedMotion]);

  // Update marker styles when selectedVenueId changes (AC1–AC8)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !markersInitialized.current) return;

    try {
      if (!map.getLayer('venue-markers')) return;

      // Clear any pending pulse timer
      if (pulseTimerRef.current) {
        clearTimeout(pulseTimerRef.current);
        pulseTimerRef.current = null;
      }

      if (selectedVenueId) {
        const isNewSelection = prevSelectedRef.current !== selectedVenueId;

        // AC1: Scale-up selected marker (7→11, 10→13, 6→9)
        // AC3: Dim non-selected markers to 0.6
        map.setPaintProperty('venue-markers', 'circle-radius',
          selectedExpr(selectedVenueId, SELECTED_RADIUS.regular, MARKER_RADIUS.regular));
        map.setPaintProperty('venue-markers', 'circle-opacity',
          selectedOpacityExpr(selectedVenueId));
        // AC2: Selected marker gets 3px white ring
        map.setPaintProperty('venue-markers', 'circle-stroke-width',
          selectedExpr(selectedVenueId, SELECTION_RING_WHITE, 2));

        // AC2: Outer colored ring for selected regular venue
        if (map.getLayer('venue-selection-ring')) {
          map.setPaintProperty('venue-selection-ring', 'circle-stroke-opacity',
            selectedExpr(selectedVenueId, 1, 0));
          map.setPaintProperty('venue-selection-ring', 'circle-radius',
            selectedExpr(selectedVenueId, SELECTED_RADIUS.regular + SELECTION_RING_WHITE, 0));
        }

        // Partner markers
        if (map.getLayer('partner-markers')) {
          map.setPaintProperty('partner-markers', 'circle-radius',
            selectedExpr(selectedVenueId, SELECTED_RADIUS.partner, MARKER_RADIUS.partner));
          map.setPaintProperty('partner-markers', 'circle-opacity',
            selectedOpacityExpr(selectedVenueId));
          map.setPaintProperty('partner-markers', 'circle-stroke-width',
            selectedExpr(selectedVenueId, SELECTION_RING_WHITE, 2));
        }
        if (map.getLayer('partner-selection-ring')) {
          map.setPaintProperty('partner-selection-ring', 'circle-stroke-opacity',
            selectedExpr(selectedVenueId, 1, 0));
          map.setPaintProperty('partner-selection-ring', 'circle-radius',
            selectedExpr(selectedVenueId, SELECTED_RADIUS.partner + SELECTION_RING_WHITE, 0));
        }

        // Candidate markers
        if (map.getLayer('candidate-markers')) {
          map.setPaintProperty('candidate-markers', 'circle-radius',
            selectedExpr(selectedVenueId, SELECTED_RADIUS.candidate, MARKER_RADIUS.candidate));
          map.setPaintProperty('candidate-markers', 'circle-opacity',
            selectedOpacityExpr(selectedVenueId));
          map.setPaintProperty('candidate-markers', 'circle-stroke-width',
            selectedExpr(selectedVenueId, SELECTION_RING_WHITE, 2));
        }
        if (map.getLayer('candidate-selection-ring')) {
          map.setPaintProperty('candidate-selection-ring', 'circle-stroke-opacity',
            selectedExpr(selectedVenueId, 1, 0));
          map.setPaintProperty('candidate-selection-ring', 'circle-radius',
            selectedExpr(selectedVenueId, SELECTED_RADIUS.candidate + SELECTION_RING_WHITE, 0));
        }

        // AC4: Pulse animation on initial selection (not reduced motion)
        if (isNewSelection && !reducedMotion && map.getLayer('venue-pulse')) {
          // Start pulse: show ring at selected marker, expanding outward
          const pulseRadius = Math.round(SELECTED_RADIUS.regular * 1.15);
          map.setPaintProperty('venue-pulse', 'circle-radius',
            selectedExpr(selectedVenueId, SELECTED_RADIUS.regular, 0));
          map.setPaintProperty('venue-pulse', 'circle-stroke-opacity',
            selectedExpr(selectedVenueId, 0.6, 0));

          // Trigger expansion + fade via transitions (400ms)
          requestAnimationFrame(() => {
            if (!mapRef.current) return;
            map.setPaintProperty('venue-pulse', 'circle-radius',
              selectedExpr(selectedVenueId, pulseRadius, 0));
            map.setPaintProperty('venue-pulse', 'circle-stroke-opacity',
              selectedExpr(selectedVenueId, 0, 0));
          });

          // Clean up pulse layer after animation completes
          pulseTimerRef.current = setTimeout(() => {
            if (!mapRef.current || !map.getLayer('venue-pulse')) return;
            map.setPaintProperty('venue-pulse', 'circle-stroke-opacity', 0);
          }, 450);
        }

        prevSelectedRef.current = selectedVenueId;
      } else {
        // AC5: Deselection — reset all markers to normal state
        prevSelectedRef.current = null;

        map.setPaintProperty('venue-markers', 'circle-radius', MARKER_RADIUS.regular);
        map.setPaintProperty('venue-markers', 'circle-opacity', 1);
        map.setPaintProperty('venue-markers', 'circle-stroke-width', 2);

        if (map.getLayer('venue-selection-ring')) {
          map.setPaintProperty('venue-selection-ring', 'circle-stroke-opacity', 0);
        }

        if (map.getLayer('partner-markers')) {
          map.setPaintProperty('partner-markers', 'circle-radius', MARKER_RADIUS.partner);
          map.setPaintProperty('partner-markers', 'circle-opacity', 1);
          map.setPaintProperty('partner-markers', 'circle-stroke-width', 2);
        }
        if (map.getLayer('partner-selection-ring')) {
          map.setPaintProperty('partner-selection-ring', 'circle-stroke-opacity', 0);
        }

        if (map.getLayer('candidate-markers')) {
          map.setPaintProperty('candidate-markers', 'circle-radius', MARKER_RADIUS.candidate);
          map.setPaintProperty('candidate-markers', 'circle-opacity', 1);
          map.setPaintProperty('candidate-markers', 'circle-stroke-width', 2);
        }
        if (map.getLayer('candidate-selection-ring')) {
          map.setPaintProperty('candidate-selection-ring', 'circle-stroke-opacity', 0);
        }

        // Reset pulse layer
        if (map.getLayer('venue-pulse')) {
          map.setPaintProperty('venue-pulse', 'circle-stroke-opacity', 0);
        }
      }
    } catch {
      // Layer may not exist yet
    }
  }, [selectedVenueId, reducedMotion]);

  // Sunny-now badge overlay on partner markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !venues || !sunnyPartnerIds) return;

    // Remove old badge markers
    for (const marker of sunnyBadgeMarkersRef.current) {
      marker.remove();
    }
    sunnyBadgeMarkersRef.current = [];

    if (sunnyPartnerIds.length === 0) return;

    const sunnySet = new Set(sunnyPartnerIds);

    const addBadges = async () => {
      const mgl = await import('maplibre-gl');
      for (const v of venues) {
        if (!v.venue.is_partner) continue;
        if (!sunnySet.has(v.venue.id)) continue;

        const el = createSunnyNowBadgeElement(reducedMotion);
        const marker = new mgl.default.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([v.venue.lng, v.venue.lat])
          .addTo(map);
        sunnyBadgeMarkersRef.current.push(marker);
      }
    };

    addBadges();
  }, [venues, sunnyPartnerIds, reducedMotion]);

  // Highlight marker on card hover (desktop)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !markersInitialized.current) return;

    try {
      if (!map.getLayer('venue-markers')) return;

      const HOVER_RADIUS = SELECTED_RADIUS.regular;
      const HOVER_PARTNER_RADIUS = SELECTED_RADIUS.partner;

      if (hoveredVenueId && !selectedVenueId) {
        // Enlarge hovered marker
        map.setPaintProperty('venue-markers', 'circle-radius',
          selectedExpr(hoveredVenueId, HOVER_RADIUS, MARKER_RADIUS.regular));
        map.setPaintProperty('venue-markers', 'circle-stroke-width',
          selectedExpr(hoveredVenueId, SELECTION_RING_WHITE, 2));

        if (map.getLayer('partner-markers')) {
          map.setPaintProperty('partner-markers', 'circle-radius',
            selectedExpr(hoveredVenueId, HOVER_PARTNER_RADIUS, MARKER_RADIUS.partner));
          map.setPaintProperty('partner-markers', 'circle-stroke-width',
            selectedExpr(hoveredVenueId, SELECTION_RING_WHITE, 2));
        }
      } else if (!hoveredVenueId && !selectedVenueId) {
        // Reset to normal
        map.setPaintProperty('venue-markers', 'circle-radius', MARKER_RADIUS.regular);
        map.setPaintProperty('venue-markers', 'circle-stroke-width', 2);

        if (map.getLayer('partner-markers')) {
          map.setPaintProperty('partner-markers', 'circle-radius', MARKER_RADIUS.partner);
          map.setPaintProperty('partner-markers', 'circle-stroke-width', 2);
        }
      }
      // If selectedVenueId is set, the selection effect takes precedence — don't override
    } catch {
      // Layer may not exist yet
    }
  }, [hoveredVenueId, selectedVenueId]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label={t('accessibility.mapRegion')}
      style={{ position: 'absolute', inset: 0 }}
    />
  );
}
