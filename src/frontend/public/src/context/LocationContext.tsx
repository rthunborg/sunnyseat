// context/LocationContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Coordinates } from '../types/location';
import { MAP_DEFAULTS } from '../constants/mapDefaults';

interface LocationContextType {
  userLocation: Coordinates | null;
  setUserLocation: (location: Coordinates | null) => void;
  searchRadius: number;
  setSearchRadius: (radius: number) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocationContext = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocationContext must be used within LocationProvider');
  }
  return context;
};

interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(MAP_DEFAULTS.defaultRadiusKm);

  return (
    <LocationContext.Provider
      value={{
        userLocation,
        setUserLocation,
        searchRadius,
        setSearchRadius,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};
