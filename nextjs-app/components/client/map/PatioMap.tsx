'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Coordinates } from '@/lib/types/location';
import type { PatioData } from '@/lib/types/patio';
import { MAP_DEFAULTS, MAPTILER_STYLE_URL } from '@/lib/constants/mapDefaults';

interface PatioMapProps {
  userLocation: Coordinates | null;
  patios?: PatioData[];
  onMapLoad?: (map: maplibregl.Map) => void;
  onPatioClick?: (patio: PatioData) => void;
}

const SUN_STATUS_COLORS = {
  Sunny: '#16A34A',   // sun-sunny
  Partial: '#D97706', // sun-partial
  Shaded: '#6B7280',  // sun-shaded
} as const;

const BRAND_PRIMARY = '#0EA5E9';

const PatioMap: React.FC<PatioMapProps> = ({
  userLocation,
  patios = [],
  onMapLoad,
  onPatioClick,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const userMarker = useRef<maplibregl.Marker | null>(null);

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

    newMap.addControl(new maplibregl.NavigationControl(), 'top-right');
    newMap.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
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

  useEffect(() => {
    if (!map.current || !isMapLoaded || patios.length === 0) return;

    const currentMap = map.current;

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

    if (currentMap.getLayer('clusters')) currentMap.removeLayer('clusters');
    if (currentMap.getLayer('cluster-count')) currentMap.removeLayer('cluster-count');
    if (currentMap.getLayer('unclustered-point')) currentMap.removeLayer('unclustered-point');
    if (currentMap.getSource('patios')) currentMap.removeSource('patios');

    currentMap.addSource('patios', {
      type: 'geojson',
      data: geojson,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    currentMap.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'patios',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          BRAND_PRIMARY,
          10,
          SUN_STATUS_COLORS.Partial,
          30,
          '#EF4444',
        ],
        'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 30, 40],
      },
    });

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
      paint: { 'text-color': '#ffffff' },
    });

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
          SUN_STATUS_COLORS.Sunny,
          'Partial',
          SUN_STATUS_COLORS.Partial,
          'Shaded',
          SUN_STATUS_COLORS.Shaded,
          SUN_STATUS_COLORS.Shaded,
        ],
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });

    currentMap.on('click', 'clusters', async (e) => {
      const features = currentMap.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      const feature = features[0];
      if (!feature) return;

      const clusterId = feature.properties?.cluster_id;
      if (clusterId !== undefined && feature.geometry.type === 'Point') {
        const source = currentMap.getSource('patios') as maplibregl.GeoJSONSource;
        const point = feature.geometry as GeoJSON.Point;
        try {
          const zoom = await source.getClusterExpansionZoom(clusterId);
          currentMap.easeTo({
            center: point.coordinates as [number, number],
            zoom: zoom ?? currentMap.getZoom() + 2,
          });
        } catch {
          currentMap.easeTo({
            center: point.coordinates as [number, number],
            zoom: currentMap.getZoom() + 2,
          });
        }
      }
    });

    currentMap.on('click', 'unclustered-point', (e) => {
      if (!e.features || e.features.length === 0) return;
      const feature = e.features[0];
      const patioId = feature.properties?.id;
      const patio = patios.find((p) => p.id === patioId);
      if (patio && onPatioClick) {
        onPatioClick(patio);
      }
    });

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

    return () => {
      if (currentMap.getLayer('clusters')) currentMap.removeLayer('clusters');
      if (currentMap.getLayer('cluster-count')) currentMap.removeLayer('cluster-count');
      if (currentMap.getLayer('unclustered-point')) currentMap.removeLayer('unclustered-point');
      if (currentMap.getSource('patios')) currentMap.removeSource('patios');
    };
  }, [patios, isMapLoaded, onPatioClick]);

  useEffect(() => {
    if (!map.current || !isMapLoaded || !userLocation) return;

    if (userMarker.current) {
      userMarker.current.remove();
    }

    const markerElement = document.createElement('div');
    markerElement.className = 'user-location-marker';
    markerElement.style.width = '20px';
    markerElement.style.height = '20px';
    markerElement.style.borderRadius = '50%';
    markerElement.style.backgroundColor = BRAND_PRIMARY;
    markerElement.style.border = '3px solid white';
    markerElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    markerElement.setAttribute('aria-label', 'Your location');

    userMarker.current = new maplibregl.Marker({ element: markerElement })
      .setLngLat([userLocation.longitude, userLocation.latitude])
      .addTo(map.current);

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
      role="application"
      aria-label="Karta med uteplatser"
    />
  );
};

export default React.memo(PatioMap, (prevProps, nextProps) => {
  return (
    prevProps.userLocation?.latitude === nextProps.userLocation?.latitude &&
    prevProps.userLocation?.longitude === nextProps.userLocation?.longitude &&
    prevProps.patios?.length === nextProps.patios?.length
  );
});
