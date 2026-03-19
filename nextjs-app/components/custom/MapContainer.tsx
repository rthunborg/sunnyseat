'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { useLanguage } from '@/lib/i18n';
import type { Coordinates } from '@/lib/types/location';
import type { SunExposureResult } from '@/lib/types/venue';
import type maplibregl from 'maplibre-gl';

const GOTHENBURG_CENTER: [number, number] = [11.9746, 57.7089];
const DEFAULT_ZOOM = 14;

const STATUS_COLORS: Record<string, string> = {
  sunny: '#16A34A',
  partial: '#D97706',
  shaded: '#6B7280',
  upcoming: '#8B5CF6',
};

interface MapContainerProps {
  userLocation: Coordinates | null;
  onMapReady?: (map: maplibregl.Map) => void;
  venues?: SunExposureResult[];
  selectedVenueId?: string | null;
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

      // Main marker layer (non-partner, non-candidate venues)
      map.addLayer({
        id: 'venue-markers',
        type: 'circle',
        source: 'venues',
        filter: ['all', ['!=', ['get', 'isPartner'], true], ['!=', ['get', 'isCandidate'], true]],
        paint: {
          'circle-radius': 7,
          'circle-color': [
            'match',
            ['get', 'sunStatus'],
            'sunny', STATUS_COLORS.sunny,
            'partial', STATUS_COLORS.partial,
            'shaded', STATUS_COLORS.shaded,
            'upcoming', STATUS_COLORS.upcoming,
            '#6B7280',
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
          'circle-blur': 0.5,
          'circle-opacity': reducedMotion ? 1 : 0,
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

      // Golden pin marker layer (partner venues, larger and gold)
      map.addLayer({
        id: 'partner-markers',
        type: 'circle',
        source: 'venues',
        filter: ['==', ['get', 'isPartner'], true],
        paint: {
          'circle-radius': 10,
          'circle-color': '#FFD700',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
          'circle-opacity': 1,
        },
      });

      // Candidate venue markers (blue dots for unverified venues)
      map.addLayer({
        id: 'candidate-markers',
        type: 'circle',
        source: 'venues',
        filter: ['==', ['get', 'isCandidate'], true],
        paint: {
          'circle-radius': 6,
          'circle-color': '#3B82F6',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
          'circle-opacity': 1,
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

  // Task 11: Update marker styles when selectedVenueId changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !markersInitialized.current) return;

    try {
      if (!map.getLayer('venue-markers')) return;

      if (selectedVenueId) {
        // Regular markers
        map.setPaintProperty('venue-markers', 'circle-radius', [
          'case',
          ['==', ['get', 'id'], selectedVenueId], 10,
          7,
        ]);
        map.setPaintProperty('venue-markers', 'circle-opacity', [
          'case',
          ['==', ['get', 'id'], selectedVenueId], 1,
          0.7,
        ]);
        // Partner markers
        if (map.getLayer('partner-markers')) {
          map.setPaintProperty('partner-markers', 'circle-radius', [
            'case',
            ['==', ['get', 'id'], selectedVenueId], 13,
            10,
          ]);
          map.setPaintProperty('partner-markers', 'circle-opacity', [
            'case',
            ['==', ['get', 'id'], selectedVenueId], 1,
            0.7,
          ]);
        }
        // Candidate markers
        if (map.getLayer('candidate-markers')) {
          map.setPaintProperty('candidate-markers', 'circle-radius', [
            'case',
            ['==', ['get', 'id'], selectedVenueId], 9,
            6,
          ]);
          map.setPaintProperty('candidate-markers', 'circle-opacity', [
            'case',
            ['==', ['get', 'id'], selectedVenueId], 1,
            0.7,
          ]);
        }
      } else {
        map.setPaintProperty('venue-markers', 'circle-radius', 7);
        map.setPaintProperty('venue-markers', 'circle-opacity', 1);
        if (map.getLayer('partner-markers')) {
          map.setPaintProperty('partner-markers', 'circle-radius', 10);
          map.setPaintProperty('partner-markers', 'circle-opacity', 1);
        }
        if (map.getLayer('candidate-markers')) {
          map.setPaintProperty('candidate-markers', 'circle-radius', 6);
          map.setPaintProperty('candidate-markers', 'circle-opacity', 1);
        }
      }
    } catch {
      // Layer may not exist yet
    }
  }, [selectedVenueId]);

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

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label={t('accessibility.mapRegion')}
      style={{ position: 'absolute', inset: 0 }}
    />
  );
}
