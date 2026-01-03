'use client';

// HomePage component - Client Component for interactivity
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

  // Auto-request location on mount if not already set
  React.useEffect(() => {
    if (!userLocation && !isLoadingLocation && !locationError) {
      requestLocation();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update context when location is retrieved
  React.useEffect(() => {
    if (coordinates && !userLocation) {
      setUserLocation(coordinates);
    }
  }, [coordinates, userLocation, setUserLocation]);

  return (
    <div className="w-full h-screen relative">
      {/* Map Container */}
      <PatioMap userLocation={userLocation} patios={patioData?.patios} />

      {/* Controls Overlay */}
      <div className="absolute top-4 left-4 z-10 max-w-sm">
        <LocationControl
          radius={searchRadius}
          onRadiusChange={setSearchRadius}
          isLoadingLocation={isLoadingLocation}
          onRequestLocation={requestLocation}
        />

        {locationError && (
          <div className="mt-2 p-3 bg-red-100 text-red-700 rounded-lg text-body">
            {locationError}
          </div>
        )}

        {patioError && (
          <div className="mt-2 p-3 bg-red-100 text-red-700 rounded-lg text-body">
            Error loading patios. Please try again.
          </div>
        )}

        {isLoadingPatios && (
          <div className="mt-2 p-3 bg-white rounded-lg">
            <LoadingSpinner />
            <p className="text-center text-body mt-2">Loading patios...</p>
          </div>
        )}

        {patioData && !isLoadingPatios && (
          <div className="mt-2 p-3 bg-white rounded-lg">
            <p className="text-body font-semibold">
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
