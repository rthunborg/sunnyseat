'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';

type MapInstanceContextValue = {
  /** Stable ref — synchronous access, never triggers re-renders. */
  mapRef: MutableRefObject<MapLibreMap | null>;
  /**
   * Reactive instance — subscribers re-run their effects when the map is
   * created or torn down. Use this in `useEffect` deps when you need to
   * wire MapLibre listeners or markers.
   */
  mapInstance: MapLibreMap | null;
  /** Called by `MapContainer` after `new maplibregl.Map(...)` resolves. */
  setMapInstance: (map: MapLibreMap | null) => void;
};

export const MapInstanceContext = createContext<MapInstanceContextValue | null>(null);

/**
 * Story 1.4 — holds the MapLibre map instance.
 *
 * Read by `MapContainer` (writes the instance), `VenuePinLayer` (attaches
 * markers), and `MapControls` (drives zoom and pan). Separate from
 * `MapSelectionContext` so consumers that only care about `selectedVenueId`
 * do not re-render on map drag/zoom events.
 *
 * Exposes both a stable ref (`mapRef`) and reactive state (`mapInstance`).
 * Subscribers that need to wire effects when the map is created should
 * depend on `mapInstance`; refs alone never trigger effect re-runs, so an
 * effect with `[mapRef]` would miss the moment `mapRef.current` is first
 * populated (Round 1 review finding).
 */
export function MapInstanceProvider({ children }: { children: ReactNode }) {
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapInstance, setMapInstanceState] = useState<MapLibreMap | null>(null);

  const setMapInstance = useCallback((map: MapLibreMap | null) => {
    mapRef.current = map;
    setMapInstanceState(map);
  }, []);

  const value = useMemo<MapInstanceContextValue>(
    () => ({ mapRef, mapInstance, setMapInstance }),
    [mapInstance, setMapInstance],
  );

  return (
    <MapInstanceContext.Provider value={value}>{children}</MapInstanceContext.Provider>
  );
}

export function useMapInstance(): MapInstanceContextValue {
  const ctx = useContext(MapInstanceContext);
  if (!ctx) {
    throw new Error('useMapInstance must be used within <MapInstanceProvider>');
  }
  return ctx;
}
