import { useState, useCallback } from 'react';
import type { MapState, UseMapStateReturn } from '../types';

const DEFAULT_MAP_STATE: MapState = {
  center: [11.9746, 57.7089], // Gothenburg coordinates [lng, lat]
  zoom: 12,
  bearing: 0,
  pitch: 0,
};

export function useMapState(): UseMapStateReturn {
  const [mapState, setMapState] = useState<MapState>(DEFAULT_MAP_STATE);

  const updateMapState = useCallback((updates: Partial<MapState>) => {
    setMapState(prev => ({ ...prev, ...updates }));
  }, []);

  const resetMapState = useCallback(() => {
    setMapState(DEFAULT_MAP_STATE);
  }, []);

  return {
    mapState,
    updateMapState,
    resetMapState,
  };
}