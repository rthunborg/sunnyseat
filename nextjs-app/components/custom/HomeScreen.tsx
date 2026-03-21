'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState, useEffect } from 'react';
import { LanguageProvider, useLanguage } from '@/lib/i18n';
import { CardTrayProvider, useCardTray } from '@/lib/context/CardTrayContext';
import { PremiumProvider } from '@/lib/context/PremiumContext';
import { useCurrentLocation } from '@/lib/hooks/useCurrentLocation';
import { useSunExposure } from '@/lib/hooks/useSunExposure';
import { useSunnyNow } from '@/lib/hooks/useSunnyNow';
import { useTimeOffset } from '@/lib/hooks/useTimeOffset';
import { useDateSelection } from '@/lib/hooks/useDateSelection';
import { useOverlayPosition } from '@/lib/hooks/useOverlayPosition';
import { useAmbientTone } from '@/lib/hooks/useAmbientTone';
import { sortVenues } from '@/lib/utils/sortVenues';
import { LocationPermissionPrompt } from '@/components/custom/LocationPermissionPrompt';
import { BottomCardTray } from '@/components/custom/BottomCardTray';
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
  const { setVenues, setLoading, selectedVenueId, selectVenue, trayState, setTrayState, venues, setEmptyReason } = useCardTray();
  const [hoveredVenueId, setHoveredVenueId] = useState<string | null>(null);

  // Track map center for refetch on pan/zoom
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

  // Use user coordinates or map center for fetching
  const fetchLat = mapCenter?.lat ?? coordinates?.latitude ?? null;
  const fetchLng = mapCenter?.lng ?? coordinates?.longitude ?? null;

  const { data, isLoading } = useSunExposure(fetchLat, fetchLng);
  const { sunnyPartners } = useSunnyNow();
  const { timeOffset, setTimeOffset, isLoading: isTimeOffsetLoading } = useTimeOffset(fetchLat, fetchLng);
  const { selectedDate, setSelectedDate, isLoading: isDateLoading } = useDateSelection(fetchLat, fetchLng);
  const { bottomOffset, visible: timeControlsVisible } = useOverlayPosition(trayState);
  const { className: ambientClass } = useAmbientTone();

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

  // CTA handler for empty states
  const handleEmptyCta = useCallback(() => {
    // "Go to centrum" for area variant — fly to Gothenburg default
    if (venues.length === 0 && permissionStatus !== 'denied' && navigator.onLine) {
      if (map) {
        map.flyTo({ center: [11.9746, 57.7089], zoom: 14 });
      }
      return;
    }
    // "Use time control" for weather variant — scroll to time slider
    if (venues.length > 0 && venues.every((v) => v.current_status === 'shaded')) {
      const el = document.querySelector('[data-testid="time-controls-overlay"]');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('animate-pulse');
        setTimeout(() => el.classList.remove('animate-pulse'), 2000);
      }
      return;
    }
    // "Try again" for offline — reload
    if (!navigator.onLine) {
      window.location.reload();
    }
  }, [map, venues, permissionStatus]);

  const handleMapReady = useCallback((map: maplibregl.Map) => {
    setMap(map);
  }, []);

  const handleDismissPrompt = useCallback(() => {
    // User chose to interact with map manually
  }, []);

  const handleVenueSelect = useCallback((id: string | null) => {
    selectVenue(id);
    // If marker tapped and tray is collapsed, expand to peeking
    if (id && trayState === 'collapsed') {
      setTrayState('peeking');
    }
  }, [selectVenue, trayState, setTrayState]);

  const handleBoundsChange = useCallback((center: { lat: number; lng: number }) => {
    setMapCenter(center);
  }, []);

  const handleSearchVenueSelect = useCallback(
    (_venueId: string, coords: { lat: number; lng: number }) => {
      if (map) {
        map.flyTo({ center: [coords.lng, coords.lat], zoom: 16, duration: 800 });
      }
      if (trayState === 'collapsed') {
        setTrayState('peeking');
      }
    },
    [map, trayState, setTrayState]
  );

  return (
    <div id="main-content" className="w-screen h-[100dvh] relative overflow-hidden lg:flex lg:flex-row">
      {/* Desktop: side panel on the left */}
      <div className="hidden lg:block">
        <BottomCardTray ambientClass={ambientClass} onEmptyCta={handleEmptyCta} onVenueHover={setHoveredVenueId} />
      </div>

      {/* Map fills remaining space */}
      <div className="relative flex-1 h-full">
        {/* Search bar overlay */}
        <div className="absolute top-3 left-4 right-14 z-30 md:left-6 md:right-14 lg:left-auto lg:right-4 lg:w-72">
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
        />

        {/* Time slider + date picker overlay — above card tray, below search */}
        {timeControlsVisible && (
          <div
            className="absolute left-4 right-4 z-20 md:left-6 md:right-6 lg:bottom-4 lg:left-auto lg:right-4 lg:w-72 transition-[bottom] duration-200"
            style={{ bottom: timeControlsVisible ? bottomOffset : undefined }}
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
        )}

        <LocationPermissionPrompt
          permissionStatus={permissionStatus}
          onRequestLocation={requestLocation}
          onDismiss={handleDismissPrompt}
        />
      </div>

      {/* Mobile: bottom card tray overlaid */}
      <div className="lg:hidden">
        <BottomCardTray ambientClass={ambientClass} onEmptyCta={handleEmptyCta} />
      </div>
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
