// hooks/useCurrentLocation.ts
import { useState } from 'react';
import { Coordinates, LocationState } from '../types/location';

export const useCurrentLocation = () => {
  const [state, setState] = useState<LocationState>({
    coordinates: null,
    isLoading: false,
    error: null,
    permissionStatus: null,
  });

  const requestLocation = () => {
    if (!('geolocation' in navigator)) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
        isLoading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates: Coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setState({
          coordinates,
          isLoading: false,
          error: null,
          permissionStatus: 'granted',
        });
      },
      (error) => {
        let errorMessage = 'Failed to get location';
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = 'Location permission denied';
          setState((prev) => ({
            ...prev,
            error: errorMessage,
            isLoading: false,
            permissionStatus: 'denied',
          }));
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = 'Location information unavailable';
          setState((prev) => ({
            ...prev,
            error: errorMessage,
            isLoading: false,
          }));
        } else if (error.code === error.TIMEOUT) {
          errorMessage = 'Location request timed out';
          setState((prev) => ({
            ...prev,
            error: errorMessage,
            isLoading: false,
          }));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  };

  return {
    ...state,
    requestLocation,
  };
};
