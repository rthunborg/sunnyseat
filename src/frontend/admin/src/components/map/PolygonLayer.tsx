import { useEffect, useRef } from 'react';
import type { Map, GeoJSONSource, MapMouseEvent } from 'maplibre-gl';
import type { Patio, DrawingState } from '../../types';

interface PolygonLayerProps {
  map: Map;
  patios: Patio[];
  selectedPatio?: Patio | null;
  drawingState: DrawingState;
  onPatioClick: (patio: Patio) => void;
  onPolygonComplete: (polygon: GeoJSON.Polygon) => void;
}

export function PolygonLayer({
  map,
  patios,
  selectedPatio,
  drawingState,
  onPatioClick,
  onPolygonComplete,
}: PolygonLayerProps) {
  const drawingPoints = useRef<[number, number][]>([]);
  const isDrawing = useRef(false);

  // Initialize sources and layers
  useEffect(() => {
    if (!map.getSource('patios')) {
      map.addSource('patios', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Patio fill layer
      map.addLayer({
        id: 'patio-fills',
        type: 'fill',
        source: 'patios',
        paint: {
          'fill-color': [
            'case',
            ['==', ['get', 'quality'], 'excellent'], '#10b981',
            ['==', ['get', 'quality'], 'good'], '#f59e0b',
            '#ef4444'
          ],
          'fill-opacity': [
            'case',
            ['==', ['get', 'selected'], true], 0.6,
            0.4
          ],
        },
      });

      // Patio stroke layer
      map.addLayer({
        id: 'patio-strokes',
        type: 'line',
        source: 'patios',
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'selected'], true], '#1f2937',
            '#6b7280'
          ],
          'line-width': [
            'case',
            ['==', ['get', 'selected'], true], 3,
            2
          ],
        },
      });
    }

    // Drawing source for active drawing
    if (!map.getSource('drawing')) {
      map.addSource('drawing', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      map.addLayer({
        id: 'drawing-fill',
        type: 'fill',
        source: 'drawing',
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.3,
        },
      });

      map.addLayer({
        id: 'drawing-stroke',
        type: 'line',
        source: 'drawing',
        paint: {
          'line-color': '#1d4ed8',
          'line-width': 2,
          'line-dasharray': [2, 2],
        },
      });

      map.addLayer({
        id: 'drawing-points',
        type: 'circle',
        source: 'drawing',
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius': 5,
          'circle-color': '#1d4ed8',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      });
    }
  }, [map]);

  // Update patio data
  useEffect(() => {
    const features = patios.map(patio => {
      // Determine quality category based on polygonQuality
      let quality = 'poor';
      if (patio.polygonQuality >= 0.8) quality = 'excellent';
      else if (patio.polygonQuality >= 0.6) quality = 'good';

      return {
        type: 'Feature' as const,
        geometry: patio.polygon,
        properties: {
          id: patio.id,
          venueId: patio.venueId,
          quality,
          selected: selectedPatio?.id === patio.id,
          reviewNeeded: patio.reviewNeeded,
          heightSource: patio.heightSource,
        },
      };
    });

    const source = map.getSource('patios') as GeoJSONSource;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features,
      });
    }
  }, [map, patios, selectedPatio]);

  // Handle drawing mode
  useEffect(() => {
    const handleMapClick = (e: MapMouseEvent) => {
      if (drawingState.mode !== 'draw') return;

      const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      
      if (!isDrawing.current) {
        // Start new polygon
        drawingPoints.current = [coords];
        isDrawing.current = true;
      } else {
        // Add point to current polygon
        drawingPoints.current.push(coords);
      }

      updateDrawingDisplay();
    };

    const handleMapDblClick = (e: MapMouseEvent) => {
      e.preventDefault();
      
      if (drawingState.mode !== 'draw' || !isDrawing.current) return;

      // Complete the polygon
      if (drawingPoints.current.length >= 3) {
        // Close the polygon
        const coords = [...drawingPoints.current, drawingPoints.current[0]];
        
        const polygon: GeoJSON.Polygon = {
          type: 'Polygon',
          coordinates: [coords],
        };

        onPolygonComplete(polygon);
      }

      // Reset drawing state
      drawingPoints.current = [];
      isDrawing.current = false;
      clearDrawing();
    };

    const handlePatioClick = (e: MapMouseEvent) => {
      if (drawingState.mode === 'draw') return;

      const features = map.queryRenderedFeatures(e.point, { layers: ['patio-fills'] });
      
      if (features.length > 0) {
        const feature = features[0];
        const patioId = feature.properties?.id;
        const patio = patios.find(p => p.id === patioId);
        
        if (patio) {
          onPatioClick(patio);
        }
      }
    };

    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    // Add event listeners
    map.on('click', handleMapClick);
    map.on('dblclick', handleMapDblClick);
    map.on('click', 'patio-fills', handlePatioClick);

    // Change cursor when hovering over patios
    map.on('mouseenter', 'patio-fills', handleMouseEnter);
    map.on('mouseleave', 'patio-fills', handleMouseLeave);

    return () => {
      map.off('click', handleMapClick);
      map.off('dblclick', handleMapDblClick);
      map.off('click', 'patio-fills', handlePatioClick);
      map.off('mouseenter', 'patio-fills', handleMouseEnter);
      map.off('mouseleave', 'patio-fills', handleMouseLeave);
    };
  }, [map, drawingState.mode, patios, onPatioClick, onPolygonComplete]);

  // Clear drawing when not in draw mode
  useEffect(() => {
    if (drawingState.mode !== 'draw') {
      drawingPoints.current = [];
      isDrawing.current = false;
      clearDrawing();
    }
  }, [drawingState.mode]);

  const updateDrawingDisplay = () => {
    if (drawingPoints.current.length === 0) {
      clearDrawing();
      return;
    }

    const features: GeoJSON.Feature[] = [];

    // Add points
    drawingPoints.current.forEach(point => {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: point,
        },
        properties: {},
      });
    });

    // Add polygon if we have enough points
    if (drawingPoints.current.length >= 3) {
      // Create a closed polygon for preview
      const coords = [...drawingPoints.current, drawingPoints.current[0]];
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [coords],
        },
        properties: {},
      });
    } else if (drawingPoints.current.length >= 2) {
      // Show line for incomplete polygon
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: drawingPoints.current,
        },
        properties: {},
      });
    }

    const source = map.getSource('drawing') as GeoJSONSource;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features,
      });
    }
  };

  const clearDrawing = () => {
    const source = map.getSource('drawing') as GeoJSONSource;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: [],
      });
    }
  };

  return null; // This component manages map layers, no DOM rendering
}