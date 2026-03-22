'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState, useEffect, useMemo } from 'react';
import { LanguageProvider, useLanguage } from '@/lib/i18n';
import { CardTrayProvider, useCardTray } from '@/lib/context/CardTrayContext';
import { PremiumProvider } from '@/lib/context/PremiumContext';
import { useCurrentLocation } from '@/lib/hooks/useCurrentLocation';
import { useSunExposure } from '@/lib/hooks/useSunExposure';
import { useSunnyNow } from '@/lib/hooks/useSunnyNow';
import { useTimeOffset } from '@/lib/hooks/useTimeOffset';
import { useDateSelection } from '@/lib/hooks/useDateSelection';
import { useAmbientTone } from '@/lib/hooks/useAmbientTone';
import { useMapShadowLayers } from '@/lib/hooks/useMapShadowLayers';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import { useVenueSelectionFlow } from '@/lib/hooks/useVenueSelectionFlow';
import { sortVenues } from '@/lib/utils/sortVenues';
import { LocationPermissionPrompt } from '@/components/custom/LocationPermissionPrompt';
import { VenueCarousel } from '@/components/custom/VenueCarousel';
import { SelectedVenueCard } from '@/components/custom/SelectedVenueCard';
import { VenueDetailProfile } from '@/components/custom/VenueDetailProfile';
import { VenueDetailPanel } from '@/components/custom/VenueDetailPanel';
import { SearchBar } from '@/components/custom/SearchBar';
import { TimeSlider } from '@/components/custom/TimeSlider';
import { DatePicker } from '@/components/custom/DatePicker';
import type maplibregl from 'maplibre-gl';

const MapContainer = dynamic(() => import('@/components/custom/MapContainer'), { ssr: false });

function ForecastStatus({ selectedDate, timeOffset }: { selectedDate: Date | null; timeOffset: number }) {
  const { t } = useLanguage();
  const dateStr = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    : t('forecast.today');
  return (
    <div
      className="mt-1 text-center text-[length:var(--font-size-caption)] font-[number:var(--font-weight-caption)] text-brand-primary bg-brand-primary-light/90 rounded-lg py-1 px-2"
      role="status"
      aria-live="polite"
    >
      {t('forecast.label')}{' '}
      {dateStr}
      {timeOffset > 0 ? ` +${timeOffset}h` : ''}
    </div>
  );
}

function HomeScreenInner() {
  const { coordinates, permissionStatus, requestLocation } = useCurrentLocation();
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const { setVenues, setLoading, venues, setEmptyReason } = useCardTray();
  const [hoveredVenueId, setHoveredVenueId] = useState<string | null>(null);
  const isDesktop = useIsDesktop();

  // Selection flow state machine (replaces old simple selectedVenueId)
  const {
    viewState,
    selectedVenueId,
    previousMapView,
    selectVenue,
    deselectVenue,
    openDetail,
    closeDetail,
  } = useVenueSelectionFlow();

  // Desktop has its own detail state (popup → detail panel)
  const [desktopDetailVenueId, setDesktopDetailVenueId] = useState<string | null>(null);

  // Track map center for refetch on pan/zoom
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

  // Use user coordinates or map center for fetching
  const fetchLat = mapCenter?.lat ?? coordinates?.latitude ?? null;
  const fetchLng = mapCenter?.lng ?? coordinates?.longitude ?? null;

  const { data, isLoading } = useSunExposure(fetchLat, fetchLng);
  const { sunnyPartners } = useSunnyNow();
  const { timeOffset, setTimeOffset, isLoading: isTimeOffsetLoading } = useTimeOffset(fetchLat, fetchLng);
  const { selectedDate, setSelectedDate, isLoading: isDateLoading } = useDateSelection(fetchLat, fetchLng);
  const { className: ambientClass } = useAmbientTone();
  const reducedMotion = useReducedMotion();

  // Shadow layers on map (visible at zoom >= 15)
  const shadowTimestamp = selectedDate
    ? new Date(selectedDate.getTime() + timeOffset * 3600_000).toISOString()
    : timeOffset > 0
      ? new Date(Date.now() + timeOffset * 3600_000).toISOString()
      : null;
  useMapShadowLayers({ map, enabled: true, timestamp: shadowTimestamp, reducedMotion });

  // Sync loading/venues to context
  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading, setLoading]);

  useEffect(() => {
    if (data) {
      setVenues(sortVenues(data));
    }
  }, [data, setVenues]);

  // Set empty reason based on state
  useEffect(() => {
    if (permissionStatus === 'denied') {
      setEmptyReason('location');
    } else if (!navigator.onLine) {
      setEmptyReason('offline');
    } else {
      setEmptyReason(null);
    }
  }, [permissionStatus, setEmptyReason]);

  // Find the selected venue object
  const selectedVenue = useMemo(
    () => venues.find((v) => v.venue.id === selectedVenueId) ?? null,
    [venues, selectedVenueId],
  );

  // Find the desktop detail venue
  const desktopDetailVenue = useMemo(
    () => venues.find((v) => v.venue.id === desktopDetailVenueId) ?? null,
    [venues, desktopDetailVenueId],
  );

  const handleMapReady = useCallback((mapInstance: maplibregl.Map) => {
    setMap(mapInstance);
  }, []);

  const handleDismissPrompt = useCallback(() => {
    // User chose to interact with map manually
  }, []);

  // ---------------------------------------------------------------------------
  // Venue selection handlers
  // ---------------------------------------------------------------------------

  const handleVenueSelect = useCallback(
    (id: string | null) => {
      if (!id) {
        // Clicking map background
        if (isDesktop) {
          setDesktopDetailVenueId(null);
        }
        deselectVenue();
        // Restore previous map view on mobile
        if (!isDesktop && previousMapView && map) {
          if (reducedMotion) {
            map.jumpTo({ center: previousMapView.center, zoom: previousMapView.zoom });
          } else {
            map.flyTo({ center: previousMapView.center, zoom: previousMapView.zoom, duration: 600 });
          }
        }
        return;
      }

      // Get current map state before selection
      const center: [number, number] = map
        ? [map.getCenter().lng, map.getCenter().lat]
        : [11.9746, 57.7089];
      const zoom = map?.getZoom() ?? 14;

      selectVenue(id, center, zoom);

      // Fly to venue on map
      const venue = venues.find((v) => v.venue.id === id);
      if (venue && map) {
        const targetZoom = Math.max(zoom, 16);
        if (reducedMotion) {
          map.jumpTo({ center: [venue.venue.lng, venue.venue.lat], zoom: targetZoom });
        } else {
          map.flyTo({
            center: [venue.venue.lng, venue.venue.lat],
            zoom: targetZoom,
            duration: 600,
          });
        }
      }
    },
    [isDesktop, deselectVenue, selectVenue, previousMapView, map, reducedMotion, venues],
  );

  // Mobile: carousel card tap
  const handleCarouselSelect = useCallback(
    (venueId: string) => {
      handleVenueSelect(venueId);
    },
    [handleVenueSelect],
  );

  // Mobile: "Mer info" on SelectedVenueCard
  const handleMobileMoreInfo = useCallback(() => {
    openDetail();
  }, [openDetail]);

  // Mobile: dismiss SelectedVenueCard
  const handleMobileDismiss = useCallback(() => {
    handleVenueSelect(null);
  }, [handleVenueSelect]);

  // Mobile: close VenueDetailProfile
  const handleMobileCloseDetail = useCallback(() => {
    closeDetail();
  }, [closeDetail]);

  // Desktop: "Mer info" from MapPopup → open detail panel
  const handleDesktopMoreInfo = useCallback(() => {
    if (selectedVenueId) {
      setDesktopDetailVenueId(selectedVenueId);
    }
  }, [selectedVenueId]);

  // Desktop: close detail panel
  const handleDesktopCloseDetail = useCallback(() => {
    setDesktopDetailVenueId(null);
  }, []);

  const handleBoundsChange = useCallback((center: { lat: number; lng: number }) => {
    setMapCenter(center);
  }, []);

  const handleSearchVenueSelect = useCallback(
    (_venueId: string, coords: { lat: number; lng: number }) => {
      if (map) {
        map.flyTo({ center: [coords.lng, coords.lat], zoom: 16, duration: 800 });
      }
    },
    [map],
  );

  // Determine time controls position (above carousel/card on mobile)
  const mobileBottomOffset = viewState === 'browsing' ? '180px' : viewState === 'selected' ? '240px' : '80px';

  return (
    <div id="main-content" className="w-screen h-[100dvh] relative overflow-hidden lg:flex lg:flex-row">
      {/* Map fills full space */}
      <div className="relative flex-1 h-full">
        {/* Search bar overlay */}
        <div className="absolute top-3 left-4 right-14 z-30 md:left-6 md:right-14 lg:right-4 lg:w-72 lg:left-auto">
          <SearchBar onVenueSelect={handleSearchVenueSelect} />
        </div>

        <MapContainer
          userLocation={coordinates}
          onMapReady={handleMapReady}
          venues={venues}
          selectedVenueId={selectedVenueId}
          hoveredVenueId={hoveredVenueId}
          onVenueSelect={handleVenueSelect}
          onBoundsChange={handleBoundsChange}
          sunnyPartnerIds={sunnyPartners}
          // Desktop popup props
          popupVenue={isDesktop ? selectedVenue : null}
          onPopupMoreInfo={handleDesktopMoreInfo}
        />

        {/* Time slider + date picker overlay */}
        <div
          className="absolute left-4 right-4 z-20 md:left-6 md:right-6 lg:bottom-4 lg:left-auto lg:right-4 lg:w-72 transition-[bottom] duration-200"
          style={{ bottom: isDesktop ? '16px' : mobileBottomOffset }}
          data-testid="time-controls-overlay"
        >
          <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0">
              <TimeSlider
                value={timeOffset}
                onChange={setTimeOffset}
                isLoading={isTimeOffsetLoading}
              />
            </div>
            <div className="relative shrink-0">
              <DatePicker
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                isLoading={isDateLoading}
              />
            </div>
          </div>
          {(timeOffset > 0 || selectedDate) && (
            <ForecastStatus selectedDate={selectedDate} timeOffset={timeOffset} />
          )}
        </div>

        <LocationPermissionPrompt
          permissionStatus={permissionStatus}
          onRequestLocation={requestLocation}
          onDismiss={handleDismissPrompt}
        />
      </div>

      {/* Desktop: right-side detail panel */}
      {isDesktop && (
        <VenueDetailPanel
          venue={desktopDetailVenue}
          onClose={handleDesktopCloseDetail}
        />
      )}

      {/* ─── Mobile overlays ─── */}
      {!isDesktop && (
        <>
          {/* Carousel — visible in browsing state */}
          {viewState === 'browsing' && (
            <div className="fixed bottom-0 left-0 right-0 z-20 pb-[env(safe-area-inset-bottom)]">
              <VenueCarousel
                venues={venues}
                selectedVenueId={selectedVenueId}
                isLoading={isLoading}
                onVenueSelect={handleCarouselSelect}
              />
            </div>
          )}

          {/* Selected venue card — visible in selected state */}
          {viewState === 'selected' && (
            <SelectedVenueCard
              venue={selectedVenue}
              onMoreInfo={handleMobileMoreInfo}
              onDismiss={handleMobileDismiss}
            />
          )}

          {/* Full venue detail profile — visible in detail state */}
          {viewState === 'detail' && (
            <VenueDetailProfile
              venue={selectedVenue}
              onClose={handleMobileCloseDetail}
            />
          )}
        </>
      )}
    </div>
  );
}

export default function HomeScreen() {
  return (
    <LanguageProvider>
      <PremiumProvider>
        <CardTrayProvider>
          <HomeScreenInner />
        </CardTrayProvider>
      </PremiumProvider>
    </LanguageProvider>
  );
}
