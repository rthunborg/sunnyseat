'use client';

import React from 'react';
import { LocationProvider, useLocationContext } from '@/lib/context/LocationContext';
import { useCurrentLocation } from '@/lib/hooks/useCurrentLocation';
import { usePatioData } from '@/lib/hooks/usePatioData';
import PatioMap from '@/components/client/map/PatioMap';
import LocationControl from '@/components/client/location/LocationControl';
import LoadingSpinner from '@/components/client/common/LoadingSpinner';

const HomePageContent: React.FC = () => {
  const { userLocation, setUserLocation, searchRadius, setSearchRadius } = useLocationContext();
  const {
    coordinates,
    isLoading: isLoadingLocation,
    error: locationError,
    requestLocation,
  } = useCurrentLocation();

  const {
    data: patioData,
    isLoading: isLoadingPatios,
    error: patioError,
  } = usePatioData(userLocation, searchRadius);

  React.useEffect(() => {
    if (!userLocation && !isLoadingLocation && !locationError) {
      requestLocation();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (coordinates && !userLocation) {
      setUserLocation(coordinates);
    }
  }, [coordinates, userLocation, setUserLocation]);

  return (
    <div className="w-full h-screen relative">
      <PatioMap userLocation={userLocation} patios={patioData?.patios} />

      <div className="absolute top-4 left-4 z-10 max-w-sm">
        <LocationControl
          radius={searchRadius}
          onRadiusChange={setSearchRadius}
          isLoadingLocation={isLoadingLocation}
          onRequestLocation={requestLocation}
        />

        {locationError && (
          <div className="mt-2 p-3 bg-sun-sunny-bg text-red-700 rounded-card text-body">
            {locationError}
          </div>
        )}

        {patioError && (
          <div className="mt-2 p-3 bg-sun-sunny-bg text-red-700 rounded-card text-body">
            Error loading patios. Please try again.
          </div>
        )}

        {isLoadingPatios && (
          <div className="mt-2 p-3 bg-surface-primary rounded-card shadow-card">
            <LoadingSpinner />
            <p className="text-center text-body mt-2 text-text-secondary">Loading patios...</p>
          </div>
        )}

        {patioData && !isLoadingPatios && (
          <div className="mt-2 p-3 bg-surface-primary rounded-card shadow-card">
            <p className="text-body font-semibold text-text-primary">
              Found {patioData.patios.length} {patioData.patios.length === 1 ? 'patio' : 'patios'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const HomePage: React.FC = () => {
  return (
    <LocationProvider>
      <HomePageContent />
    </LocationProvider>
  );
};

export default HomePage;
