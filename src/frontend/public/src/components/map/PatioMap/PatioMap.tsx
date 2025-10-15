// components/map/PatioMap/PatioMap.tsx
import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Coordinates } from '../../../types/location';
import { PatioData } from '../../../types/patio';
import { MAP_DEFAULTS, MAPTILER_STYLE_URL } from '../../../constants/mapDefaults';

interface PatioMapProps {
  userLocation: Coordinates | null;
  patios?: PatioData[];
  onMapLoad?: (map: maplibregl.Map) => void;
  onPatioClick?: (patio: PatioData) => void;
}

const PatioMap: React.FC<PatioMapProps> = ({ userLocation, patios = [], onMapLoad, onPatioClick }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const userMarker = useRef<maplibregl.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const newMap = new maplibregl.Map({
      container: mapContainer.current,
      style: MAPTILER_STYLE_URL,
      center: [MAP_DEFAULTS.center.longitude, MAP_DEFAULTS.center.latitude],
      zoom: MAP_DEFAULTS.zoom,
      minZoom: MAP_DEFAULTS.minZoom,
      maxZoom: MAP_DEFAULTS.maxZoom,
    });

    // Add navigation controls
    newMap.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Add geolocation control
    newMap.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
      }),
      'top-right'
    );

    newMap.on('load', () => {
      setIsMapLoaded(true);
      onMapLoad?.(newMap);
    });

    map.current = newMap;

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [onMapLoad]);

  // Add patio markers with clustering (Story 4.1 Task 7: Optimize marker rendering for >50 patios)
  useEffect(() => {
    if (!map.current || !isMapLoaded || patios.length === 0) return;

    const currentMap = map.current;

    // Convert patios to GeoJSON format for clustering
    const geojson: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: patios.map((patio) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [patio.location.longitude, patio.location.latitude],
        },
        properties: {
          id: patio.id,
          venueName: patio.venueName,
          sunStatus: patio.currentSunStatus,
          confidence: patio.confidence,
        },
      })),
    };

    // Remove existing source and layers if they exist
    if (currentMap.getLayer('clusters')) currentMap.removeLayer('clusters');
    if (currentMap.getLayer('cluster-count')) currentMap.removeLayer('cluster-count');
    if (currentMap.getLayer('unclustered-point')) currentMap.removeLayer('unclustered-point');
    if (currentMap.getSource('patios')) currentMap.removeSource('patios');

    // Add source with clustering enabled
    currentMap.addSource('patios', {
      type: 'geojson',
      data: geojson,
      cluster: true,
      clusterMaxZoom: 14, // Max zoom to cluster points on
      clusterRadius: 50, // Radius of each cluster when clustering points (in pixels)
    });

    // Add cluster circles
    currentMap.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'patios',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#0EA5E9', // Sky blue for small clusters
          10,
          '#F59E0B', // Amber for medium clusters
          30,
          '#EF4444', // Red for large clusters
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20, // Small clusters
          10,
          30, // Medium clusters
          30,
          40, // Large clusters
        ],
      },
    });

    // Add cluster count labels
    currentMap.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'patios',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 12,
      },
      paint: {
        'text-color': '#ffffff',
      },
    });

    // Add individual patio markers (unclustered)
    currentMap.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'patios',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': [
          'match',
          ['get', 'sunStatus'],
          'Sunny',
          '#22C55E', // Green
          'Partial',
          '#F59E0B', // Amber
          'Shaded',
          '#9CA3AF', // Gray
          '#9CA3AF', // Default gray
        ],
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });

    // Handle cluster clicks (zoom in)
    currentMap.on('click', 'clusters', (e) => {
      const features = currentMap.queryRenderedFeatures(e.point, {
        layers: ['clusters'],
      });
      const clusterId = features[0]?.properties?.cluster_id;
      if (clusterId) {
        const source = currentMap.getSource('patios') as maplibregl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || !features[0].geometry || features[0].geometry.type !== 'Point') return;

          currentMap.easeTo({
            center: features[0].geometry.coordinates as [number, number],
            zoom: zoom ?? currentMap.getZoom() + 2,
          });
        });
      }
    });

    // Handle individual patio marker clicks
    currentMap.on('click', 'unclustered-point', (e) => {
      if (!e.features || e.features.length === 0) return;
      
      const feature = e.features[0];
      const patioId = feature.properties?.id;
      const patio = patios.find((p) => p.id === patioId);
      
      if (patio && onPatioClick) {
        onPatioClick(patio);
      }
    });

    // Change cursor on hover
    currentMap.on('mouseenter', 'clusters', () => {
      currentMap.getCanvas().style.cursor = 'pointer';
    });
    currentMap.on('mouseleave', 'clusters', () => {
      currentMap.getCanvas().style.cursor = '';
    });
    currentMap.on('mouseenter', 'unclustered-point', () => {
      currentMap.getCanvas().style.cursor = 'pointer';
    });
    currentMap.on('mouseleave', 'unclustered-point', () => {
      currentMap.getCanvas().style.cursor = '';
    });

    // Cleanup on unmount or when patios change
    return () => {
      if (currentMap.getLayer('clusters')) currentMap.removeLayer('clusters');
      if (currentMap.getLayer('cluster-count')) currentMap.removeLayer('cluster-count');
      if (currentMap.getLayer('unclustered-point')) currentMap.removeLayer('unclustered-point');
      if (currentMap.getSource('patios')) currentMap.removeSource('patios');
    };
  }, [patios, isMapLoaded, onPatioClick]);

  // Update user location marker
  useEffect(() => {
    if (!map.current || !isMapLoaded || !userLocation) return;

    // Remove existing marker
    if (userMarker.current) {
      userMarker.current.remove();
    }

    // Create new marker
    const markerElement = document.createElement('div');
    markerElement.className = 'user-location-marker';
    markerElement.style.width = '20px';
    markerElement.style.height = '20px';
    markerElement.style.borderRadius = '50%';
    markerElement.style.backgroundColor = '#0EA5E9';
    markerElement.style.border = '3px solid white';
    markerElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    markerElement.setAttribute('aria-label', 'Your location');

    userMarker.current = new maplibregl.Marker({ element: markerElement })
      .setLngLat([userLocation.longitude, userLocation.latitude])
      .addTo(map.current);

    // Center map on user location
    map.current.flyTo({
      center: [userLocation.longitude, userLocation.latitude],
      zoom: 14,
      duration: 1000,
    });
  }, [userLocation, isMapLoaded]);

  return (
    <div 
      ref={mapContainer} 
      className="w-full h-full"
      style={{ minHeight: '400px' }}
      data-testid="patio-map-container"
    />
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(PatioMap, (prevProps, nextProps) => {
  // Only re-render if user location or patios change
  return (
    prevProps.userLocation?.latitude === nextProps.userLocation?.latitude &&
    prevProps.userLocation?.longitude === nextProps.userLocation?.longitude &&
    prevProps.patios?.length === nextProps.patios?.length
  );
});
