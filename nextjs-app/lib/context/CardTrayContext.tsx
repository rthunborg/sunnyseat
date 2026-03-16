'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { CardTrayState } from '@/lib/types/card-states';
import type { SunExposureResult } from '@/lib/types/venue';

interface CardTrayContextValue {
  trayState: CardTrayState;
  setTrayState: (state: CardTrayState) => void;
  selectedVenueId: string | null;
  selectVenue: (id: string | null) => void;
  venues: SunExposureResult[];
  setVenues: (venues: SunExposureResult[]) => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

const CardTrayContext = createContext<CardTrayContextValue | null>(null);

export const SNAP_POINTS: Record<CardTrayState, number> = {
  peeking: 25,
  'half-expanded': 50,
  collapsed: 8,
};

export function CardTrayProvider({ children }: { children: ReactNode }) {
  const [trayState, setTrayState] = useState<CardTrayState>('peeking');
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [venues, setVenues] = useState<SunExposureResult[]>([]);
  const [isLoading, setLoading] = useState(false);

  const selectVenue = useCallback((id: string | null) => {
    setSelectedVenueId(id);
  }, []);

  return (
    <CardTrayContext.Provider
      value={{
        trayState,
        setTrayState,
        selectedVenueId,
        selectVenue,
        venues,
        setVenues,
        isLoading,
        setLoading,
      }}
    >
      {children}
    </CardTrayContext.Provider>
  );
}

export function useCardTray(): CardTrayContextValue {
  const ctx = useContext(CardTrayContext);
  if (!ctx) throw new Error('useCardTray must be used within CardTrayProvider');
  return ctx;
}
