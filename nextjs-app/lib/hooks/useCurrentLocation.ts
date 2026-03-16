'use client';

import { useState, useEffect } from 'react';
import type { Coordinates, LocationState } from '@/lib/types/location';

export const useCurrentLocation = () => {
  const [state, setState] = useState<LocationState>({
    coordinates: null,
    isLoading: false,
    error: null,
    permissionStatus: null,
  });

  // Pre-populate permission status on mount without triggering a prompt
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.permissions) return;

    let mounted = true;

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((result) => {
        if (!mounted) return;
        setState((prev) => ({
          ...prev,
          permissionStatus: result.state as LocationState['permissionStatus'],
        }));

        // Listen for permission changes
        const handleChange = () => {
          if (!mounted) return;
          setState((prev) => ({
            ...prev,
            permissionStatus: result.state as LocationState['permissionStatus'],
          }));

          // Auto-fetch location if permission was just granted
          if (result.state === 'granted') {
            requestLocationInternal(setState);
          }
        };

        result.addEventListener('change', handleChange);
      })
      .catch(() => {
        // permissions API not available
      });

    return () => {
      mounted = false;
    };
  }, []);

  const requestLocation = () => {
    requestLocationInternal(setState);
  };

  return {
    ...state,
    requestLocation,
  };
};

function requestLocationInternal(
  setState: React.Dispatch<React.SetStateAction<LocationState>>
) {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
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
}
