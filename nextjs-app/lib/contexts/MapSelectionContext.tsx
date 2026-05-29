'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { VenueDataDto } from '@/lib/types/api';

type MapSelectionContextValue = {
  selectedVenueId: string | null;
  selectedVenuePreview: VenueDataDto | null;
  selectVenue: (id: string | null, venuePreview?: VenueDataDto | null) => void;
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
  const [selectedVenuePreview, setSelectedVenuePreview] = useState<VenueDataDto | null>(null);

  const selectVenue = useCallback((id: string | null, venuePreview?: VenueDataDto | null) => {
    setSelectedVenueId(id);
    setSelectedVenuePreview(id ? (venuePreview ?? null) : null);
  }, []);

  const toggleVenue = useCallback((id: string) => {
    setSelectedVenueId((current) => {
      const next = current === id ? null : id;
      setSelectedVenuePreview(null);
      return next;
    });
  }, []);

  const value = useMemo<MapSelectionContextValue>(
    () => ({ selectedVenueId, selectedVenuePreview, selectVenue, toggleVenue }),
    [selectedVenueId, selectedVenuePreview, selectVenue, toggleVenue],
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
