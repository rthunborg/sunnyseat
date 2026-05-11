'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type MapSelectionContextValue = {
  selectedVenueId: string | null;
  selectVenue: (id: string | null) => void;
  toggleVenue: (id: string) => void;
};

export const MapSelectionContext = createContext<MapSelectionContextValue | null>(null);

/**
 * Story 1.4 — holds the currently selected venue id and dispatchers.
 *
 * Split out from the original `MapContext` stub (Story 1.3) so that pin
 * selection state changes do not bubble through `MapInstanceContext`
 * consumers (which mostly only need the stable map ref).
 *
 * `toggleVenue` clears the selection when the same id is tapped twice
 * (AC3 deselect-by-tapping behaviour).
 */
export function MapSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

  const selectVenue = useCallback((id: string | null) => {
    setSelectedVenueId(id);
  }, []);

  const toggleVenue = useCallback((id: string) => {
    setSelectedVenueId((current) => (current === id ? null : id));
  }, []);

  const value = useMemo<MapSelectionContextValue>(
    () => ({ selectedVenueId, selectVenue, toggleVenue }),
    [selectedVenueId, selectVenue, toggleVenue],
  );

  return <MapSelectionContext.Provider value={value}>{children}</MapSelectionContext.Provider>;
}

export function useMapSelection(): MapSelectionContextValue {
  const ctx = useContext(MapSelectionContext);
  if (!ctx) {
    throw new Error('useMapSelection must be used within <MapSelectionProvider>');
  }
  return ctx;
}
