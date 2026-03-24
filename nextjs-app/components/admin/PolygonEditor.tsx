'use client';

import { useEffect, useRef, useCallback } from 'react';
import type maplibregl from 'maplibre-gl';
import type { EditorMode } from '@/lib/hooks/usePolygonEditor';

const GOTHENBURG_CENTER: [number, number] = [11.9746, 57.7089];

interface VenuePolygonData {
  id: string;
  name: string;
  geometry: GeoJSON.Polygon | null;
}

interface PolygonEditorProps {
  venueLatitude: number | null;
  venueLongitude: number | null;
  venues: VenuePolygonData[];
  mode: EditorMode;
  vertices: [number, number][];
  selectedVenueId: string | null;
  onMapClick: (lngLat: [number, number]) => void;
  onMapDblClick: () => void;
  onVenueClick: (venueId: string) => void;
  onVertexDrag: (index: number, lngLat: [number, number]) => void;
}

export default function PolygonEditor({
  venueLatitude,
  venueLongitude,
  venues,
  mode,
  vertices,
  selectedVenueId,
  onMapClick,
  onMapDblClick,
  onVenueClick,
  onVertexDrag,
}: PolygonEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const vertexMarkersRef = useRef<maplibregl.Marker[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mglRef = useRef<any>(null);

  const clearVertexMarkers = useCallback(() => {
    vertexMarkersRef.current.forEach((m) => m.remove());
    vertexMarkersRef.current = [];
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;
    let mapInstance: maplibregl.Map | null = null;

    (async () => {
      const mgl = await import('maplibre-gl');

      // Load maplibre CSS via <link> tag to avoid PostCSS/lightningcss processing
      if (!document.querySelector('link[href*="maplibre-gl"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/maplibre-gl@5.20.2/dist/maplibre-gl.css';
        document.head.appendChild(link);
      }

      if (cancelled) return;

      mglRef.current = mgl.default;

      const tileKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
      const styleUrl = tileKey
        ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${tileKey}`
        : 'https://demotiles.maplibre.org/style.json';

      const center: [number, number] =
        venueLongitude && venueLatitude
          ? [venueLongitude, venueLatitude]
          : GOTHENBURG_CENTER;

      const map = new mgl.default.Map({
        container: containerRef.current!,
        style: styleUrl,
        center,
        zoom: 17,
        minZoom: 10,
        maxZoom: 20,
      });

      map.addControl(new mgl.default.NavigationControl(), 'top-right');
      mapInstance = map;
      mapRef.current = map;

      map.on('load', () => {
        // Add venue marker
        if (venueLongitude && venueLatitude) {
          const el = document.createElement('div');
          el.style.width = '12px';
          el.style.height = '12px';
          el.style.background = '#EF4444';
          el.style.border = '2px solid white';
          el.style.borderRadius = '50%';
          new mgl.default.Marker({ element: el })
            .setLngLat([venueLongitude, venueLatitude])
            .addTo(map);
        }

        // Venue polygon source
        map.addSource('venue-polygons', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        map.addLayer({
          id: 'venue-fills',
          type: 'fill',
          source: 'venue-polygons',
          paint: {
            'fill-color': [
              'case',
              ['==', ['get', 'selected'], true],
              '#2563EB',
              '#6B7280',
            ],
            'fill-opacity': 0.3,
          },
        });

        map.addLayer({
          id: 'venue-outlines',
          type: 'line',
          source: 'venue-polygons',
          paint: {
            'line-color': [
              'case',
              ['==', ['get', 'selected'], true],
              '#2563EB',
              '#6B7280',
            ],
            'line-width': 2,
          },
        });

        // Drawing preview source
        map.addSource('drawing', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        map.addLayer({
          id: 'drawing-line',
          type: 'line',
          source: 'drawing',
          paint: {
            'line-color': '#2563EB',
            'line-width': 2,
            'line-dasharray': [3, 3],
          },
        });

        map.addLayer({
          id: 'drawing-points',
          type: 'circle',
          source: 'drawing',
          filter: ['==', '$type', 'Point'],
          paint: {
            'circle-radius': 5,
            'circle-color': '#2563EB',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#FFFFFF',
          },
        });

        // Click on venue polygon
        map.on('click', 'venue-fills', (e) => {
          if (e.features && e.features.length > 0) {
            const id = e.features[0].properties?.id;
            if (id) {
              e.preventDefault();
              onVenueClick(id);
            }
          }
        });

        map.on('mouseenter', 'venue-fills', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'venue-fills', () => {
          map.getCanvas().style.cursor = '';
        });
      });
    })();

    return () => {
      cancelled = true;
      clearVertexMarkers();
      if (mapInstance) {
        mapInstance.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle map click events for drawing
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      if ((e.originalEvent as Event & { _preventedDefault?: boolean })?.defaultPrevented) return;
      onMapClick([e.lngLat.lng, e.lngLat.lat]);
    };

    const handleDblClick = (e: maplibregl.MapMouseEvent) => {
      if (mode === 'drawing') {
        e.preventDefault();
        onMapDblClick();
      }
    };

    map.on('click', handleClick);
    map.on('dblclick', handleDblClick);

    return () => {
      map.off('click', handleClick);
      map.off('dblclick', handleDblClick);
    };
  }, [mode, onMapClick, onMapDblClick]);

  // Update cursor based on mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = mode === 'drawing' ? 'crosshair' : '';
  }, [mode]);

  // Update venue polygon layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateSource = () => {
      const source = map.getSource('venue-polygons') as maplibregl.GeoJSONSource | undefined;
      if (!source) return;

      const features: GeoJSON.Feature[] = venues
        .filter((p) => p.geometry)
        .map((p) => ({
          type: 'Feature' as const,
          properties: {
            id: p.id,
            name: p.name,
            selected: p.id === selectedVenueId,
          },
          geometry: p.geometry!,
        }));

      source.setData({ type: 'FeatureCollection', features });
    };

    if (map.isStyleLoaded()) {
      updateSource();
    } else {
      map.on('load', updateSource);
    }
  }, [venues, selectedVenueId]);

  // Update drawing preview
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateDrawing = () => {
      const source = map.getSource('drawing') as maplibregl.GeoJSONSource | undefined;
      if (!source) return;

      if (mode !== 'drawing' || vertices.length === 0) {
        source.setData({ type: 'FeatureCollection', features: [] });
        return;
      }

      const features: GeoJSON.Feature[] = [];

      // Point features for each vertex
      vertices.forEach((v) => {
        features.push({
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point', coordinates: v },
        });
      });

      // Line connecting vertices
      if (vertices.length >= 2) {
        features.push({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: vertices,
          },
        });
      }

      source.setData({ type: 'FeatureCollection', features });
    };

    if (map.isStyleLoaded()) {
      updateDrawing();
    } else {
      map.on('load', updateDrawing);
    }
  }, [mode, vertices]);

  // Vertex handles for editing mode
  useEffect(() => {
    const mgl = mglRef.current;
    const map = mapRef.current;
    if (!mgl || !map) return;

    clearVertexMarkers();

    if ((mode === 'editing' || mode === 'selected') && vertices.length > 0) {
      vertices.forEach((v, i) => {
        const el = document.createElement('div');
        el.style.width = '14px';
        el.style.height = '14px';
        el.style.background = mode === 'editing' ? '#2563EB' : '#6B7280';
        el.style.border = '2px solid white';
        el.style.borderRadius = '50%';
        el.style.cursor = mode === 'editing' ? 'grab' : 'default';
        el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';

        const marker = new mgl.Marker({
          element: el,
          draggable: mode === 'editing',
        })
          .setLngLat(v)
          .addTo(map);

        if (mode === 'editing') {
          marker.on('dragend', () => {
            const pos = marker.getLngLat();
            onVertexDrag(i, [pos.lng, pos.lat]);
          });
        }

        vertexMarkersRef.current.push(marker);
      });
    }

    return () => {
      clearVertexMarkers();
    };
  }, [mode, vertices, clearVertexMarkers, onVertexDrag]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Karteditor för uteplatser"
      className="h-full w-full"
      style={{ minHeight: '400px' }}
    />
  );
}
