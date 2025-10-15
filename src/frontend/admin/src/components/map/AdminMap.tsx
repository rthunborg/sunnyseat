import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useMapState } from '../../hooks/useMapState';
import { usePolygonEditor } from '../../hooks/usePolygonEditor';
import { MapControls } from './MapControls';
import { PolygonLayer } from './PolygonLayer';
import type { Patio } from '../../types';

interface AdminMapProps {
  patios?: Patio[];
  selectedPatio?: Patio | null;
  onPatioSelect?: (patio: Patio | null) => void;
  onPolygonCreate?: (polygon: GeoJSON.Polygon) => void;
  onPolygonUpdate?: (patioId: number, polygon: GeoJSON.Polygon) => void;
  className?: string;
}

export function AdminMap({
  patios = [],
  selectedPatio,
  onPatioSelect,
  onPolygonCreate,
  onPolygonUpdate,
  className = 'w-full h-full',
}: AdminMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  
  const { mapState, updateMapState } = useMapState();
  const { drawingState, startDrawing, stopDrawing, startEditing, stopEditing, undo, redo } = usePolygonEditor();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm-tiles'
          }
        ]
      },
      center: mapState.center,
      zoom: mapState.zoom,
      bearing: mapState.bearing,
      pitch: mapState.pitch,
    });

    // Map event handlers
    map.current.on('load', () => {
      setIsMapReady(true);
    });

    map.current.on('move', () => {
      if (map.current) {
        const center = map.current.getCenter();
        updateMapState({
          center: [center.lng, center.lat],
          zoom: map.current.getZoom(),
          bearing: map.current.getBearing(),
          pitch: map.current.getPitch(),
        });
      }
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.current.addControl(new maplibregl.ScaleControl({}), 'bottom-left');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update map when state changes
  useEffect(() => {
    if (!map.current) return;

    map.current.easeTo({
      center: mapState.center,
      zoom: mapState.zoom,
      bearing: mapState.bearing,
      pitch: mapState.pitch,
    });
  }, [mapState]);

  // Handle drawing mode changes
  useEffect(() => {
    if (!map.current) return;

    const mapElement = map.current.getContainer();
    
    if (drawingState.mode === 'draw') {
      mapElement.classList.add('polygon-drawing-active');
    } else if (drawingState.mode === 'edit') {
      mapElement.classList.add('polygon-editing-active');
    } else {
      mapElement.classList.remove('polygon-drawing-active', 'polygon-editing-active');
    }
  }, [drawingState.mode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((event.ctrlKey && event.key === 'y') || (event.ctrlKey && event.shiftKey && event.key === 'Z')) {
        event.preventDefault();
        redo();
      } else if (event.key === 'Escape') {
        if (drawingState.isDrawing) {
          stopDrawing();
        } else if (drawingState.mode === 'edit') {
          stopEditing();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawingState, undo, redo, stopDrawing, stopEditing]);

  const handleStartDrawing = () => {
    startDrawing();
  };

  const handleStopDrawing = () => {
    stopDrawing();
  };

  const handlePatioClick = (patio: Patio) => {
    onPatioSelect?.(patio);
    if (drawingState.mode === 'edit') {
      startEditing(patio.polygon);
    }
  };

  const handlePolygonComplete = (polygon: GeoJSON.Polygon) => {
    if (drawingState.mode === 'draw') {
      onPolygonCreate?.(polygon);
      stopDrawing();
    } else if (drawingState.mode === 'edit' && selectedPatio) {
      onPolygonUpdate?.(selectedPatio.id, polygon);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div
        ref={mapContainer}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />
      
      {isMapReady && map.current && (
        <>
          <PolygonLayer
            map={map.current}
            patios={patios}
            selectedPatio={selectedPatio}
            drawingState={drawingState}
            onPatioClick={handlePatioClick}
            onPolygonComplete={handlePolygonComplete}
          />
          
          <MapControls
            drawingState={drawingState}
            onStartDrawing={handleStartDrawing}
            onStopDrawing={handleStopDrawing}
            onStartEditing={() => selectedPatio && startEditing(selectedPatio.polygon)}
            onStopEditing={stopEditing}
            onUndo={undo}
            onRedo={redo}
            className="absolute top-4 left-4 z-10"
          />
        </>
      )}

      {/* Drawing instructions */}
      {drawingState.isDrawing && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg text-sm z-10">
          Click to add points, double-click to finish, Esc to cancel
        </div>
      )}

      {/* Editing instructions */}
      {drawingState.mode === 'edit' && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg text-sm z-10">
          Drag vertices to edit, Esc to finish editing
        </div>
      )}
    </div>
  );
}