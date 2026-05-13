'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { VenueQuickInfo } from '@/components/composed/venue/VenueQuickInfo';
import { useVenueSearch } from '@/hooks/queries/useVenueSearch';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useMapInstance } from '@/lib/contexts/MapInstanceContext';
import { useMapSelection } from '@/lib/contexts/MapSelectionContext';
import { type VenuePinData } from '@/lib/types/map';
import type { VenueDataDto } from '@/lib/types/api';
import { useForcedState } from '@/lib/dev/use-forced-state';
import { isStyleResourceUrl } from '@/lib/utils/map-errors';
import { mapVenueDtoToPinData } from '@/lib/utils/venue-pin-mapping';
import { MapContainer } from './MapContainer';
import { MapLoadingFallback } from './MapLoadingFallback';
import { VenuePinLayer } from './VenuePinLayer';
import { MapControls } from './MapControls';

const SLOW_LOAD_PILL_MS = 3000;
const SEARCH_RADIUS_KM = 1.5;
// Round 2 R2-P4: Round 1 P31 released the loading cover on the very first
// tile error, but MapContainer only latches the sand fallback after
// TILE_FAILURE_THRESHOLD = 4 errors. A single transient blip (CORS retry,
// rate-limited tile, slow-network burst) tore down the cover and revealed
// the half-painted MapLibre canvas with conspicuous gaps. Cover now
// requires either (a) a hard style/sprite/glyphs failure, or (b) the
// cumulative tile-error count to reach the same threshold MapContainer
// uses for fallback latching, or (c) the sourcedata listener firing for a
// real tile load. Keep this in sync with MapContainer's threshold.
const TILE_FAILURE_RELEASE_THRESHOLD = 4;

/**
 * Orchestrates the persistent map experience: canvas, pin layer,
 * controls, slow-load loading pill, and an error overlay when the
 * venue query fails.
 *
 * Story 1.5 wires the venue search to `useGeolocation`, so the map
 * fetches venues around the user's actual location once permission is
 * granted (or stays at the Gothenburg-centrum fallback while the
 * onboarding overlay is visible / on permission denial). The
 * persistent `<MapLoadingFallback />` covers the gap between the
 * dynamic-import chunk arriving and MapLibre painting its first tile,
 * so returning users don't see a blank flash during cold load.
 *
 * On mobile the map fills the full dynamic viewport and sits underneath
 * the fixed bottom nav, matching the layout-shell contract from Story 1.3.
 * Desktop still subtracts the fixed top nav height. `dvh` rather than `vh`
 * keeps the height stable while iOS Safari collapses its URL bar — `vh`
 * would make the floating controls lurch during the transition.
 */
export function MapView() {
  const tVenue = useTranslations('venue');
  const geolocation = useGeolocation();
  const { mapInstance } = useMapInstance();
  const { selectedVenueId, selectVenue } = useMapSelection();
  const router = useRouter();
  const searchParams = useSearchParams();
  const forcedState = useForcedState();
  const [quickInfoPosition, setQuickInfoPosition] = useState<{ x: number; y: number } | undefined>();
  const venueQuery = useVenueSearch({
    lat: geolocation.coords.lat,
    lng: geolocation.coords.lng,
    radiusKm: SEARCH_RADIUS_KM,
  });

  // Show the loading skeleton until MapLibre paints its first non-metadata
  // source — covers the gap between the dynamic-import resolving and the
  // canvas actually rendering tiles. Two failure modes that the listener
  // alone can't catch:
  //   1. Sources finished loading BEFORE we bound the listener (e.g. a
  //      cached style on a re-mount). Check synchronously after binding.
  //   2. Tile fetch errors so `sourcedata` never fires with
  //      `isSourceLoaded: true`. Bind `error` so the cover releases and
  //      the venue-error overlay below can take the screen.
  const [tilesPainted, setTilesPainted] = useState(false);
  useEffect(() => {
    if (!mapInstance) return;
    const handler = (e: { isSourceLoaded: boolean; sourceDataType?: string }) => {
      if (e.isSourceLoaded && e.sourceDataType !== 'metadata') {
        setTilesPainted(true);
      }
    };
    // Story 1.6 Round 1 P31 + Round 2 R2-P1 + R2-P4:
    // - R2-P1: the style-resource predicate is now the shared
    //   `isStyleResourceUrl` helper (covers /styles/, /sprite, /glyphs/,
    //   and the literal /style.json suffix). Previously MapView's predicate
    //   was narrower than MapContainer's, so sprite/glyph failures latched
    //   the sand fallback in MapContainer but the loading cover here never
    //   released — the user saw a permanent skeleton hiding the fallback.
    // - R2-P4: a single transient tile error no longer releases the cover.
    //   The cumulative tile-error count must reach the same threshold
    //   MapContainer uses for sand-fallback latching (4), matching the
    //   user-visible policy: "the map is genuinely broken, show fallback +
    //   release cover". Hard style failures still release the cover
    //   immediately because there is no point retrying — the canvas can't
    //   render without a style descriptor.
    let tileErrorCount = 0;
    const errorHandler = (event: unknown) => {
      const err = event as { tile?: unknown; error?: { url?: unknown } };
      if (isStyleResourceUrl(err.error?.url)) {
        setTilesPainted(true);
        return;
      }
      if (err.tile) {
        tileErrorCount += 1;
        if (tileErrorCount >= TILE_FAILURE_RELEASE_THRESHOLD) {
          setTilesPainted(true);
        }
      }
    };
    mapInstance.on('sourcedata', handler);
    mapInstance.on('error', errorHandler);
    // Catch the "already loaded before listener bound" case.
    if (typeof mapInstance.areTilesLoaded === 'function' && mapInstance.areTilesLoaded()) {
      setTilesPainted(true);
    }
    return () => {
      mapInstance.off('sourcedata', handler);
      mapInstance.off('error', errorHandler);
    };
  }, [mapInstance]);

  // Stable reference whenever the underlying data is unchanged — prevents
  // VenuePinLayer's [venues] effect from rebuilding markers per render.
  //
  // Story 1.6 review (P17, Edge Case Hunter 7.1): originally keyed on
  // `dataUpdatedAt`, on the false premise that it would prevent re-runs
  // for byte-identical refetches. In fact `dataUpdatedAt` ticks on every
  // successful fetch regardless of payload equality, so the memo was
  // recomputing anyway. Switched to keying on the array reference itself —
  // TanStack v5's `structuralSharing: true` (default) preserves the array
  // reference across structurally-equal refetches, which is the actual
  // identity guarantee we want.
  //
  // Defensive against drift: `venues` may be missing or null on a
  // malformed response, and individual entries may lack a `location`
  // (real Supabase rows in 2.x will sometimes have NULL geometry until
  // backfilled). Skip those rather than crash the entire map.
  const rawVenues = venueQuery.data?.venues;
  const venues = useMemo<VenuePinData[]>(() => {
    if (!Array.isArray(rawVenues)) return [];
    return rawVenues.flatMap((v) => {
      const pin = mapVenueDtoToPinData(v);
      return pin ? [pin] : [];
    });
  }, [rawVenues]);
  const selectedVenueDto = useMemo(() => {
    if (!selectedVenueId || !Array.isArray(rawVenues)) return null;
    return rawVenues.find((venue) => venue.id === selectedVenueId) ?? null;
  }, [rawVenues, selectedVenueId]);
  const selectedPinData = useMemo(() => {
    if (!selectedVenueId) return null;
    return venues.find((venue) => venue.id === selectedVenueId) ?? null;
  }, [selectedVenueId, venues]);

  useEffect(() => {
    if (forcedState !== 'map-with-selected-venue') return;
    if (!Array.isArray(rawVenues) || rawVenues.length === 0) return;
    const slug = searchParams.get('venue');
    const match = rawVenues.find((venue) => venue.slug === slug) ?? rawVenues[0];
    selectVenue(match.id);
  }, [forcedState, rawVenues, searchParams, selectVenue]);

  useEffect(() => {
    if (!mapInstance || !selectedVenueDto) {
      setQuickInfoPosition(undefined);
      return;
    }

    const updatePosition = () => {
      const projected = mapInstance.project([
        selectedVenueDto.location.lng,
        selectedVenueDto.location.lat,
      ]);
      const canvas = mapInstance.getCanvas();
      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || window.innerHeight;
      setQuickInfoPosition({
        x: Math.min(Math.max(projected.x, 164), width - 164),
        y: Math.min(Math.max(projected.y, 150), height - 96),
      });
    };

    updatePosition();
    mapInstance.on('move', updatePosition);
    mapInstance.on('zoom', updatePosition);
    return () => {
      mapInstance.off('move', updatePosition);
      mapInstance.off('zoom', updatePosition);
    };
  }, [mapInstance, selectedVenueDto]);

  const handleOpenDetails = () => {
    const slug = selectedVenueDto?.slug ?? selectedPinData?.slug;
    if (!slug) return;
    router.push(`?venue=${encodeURIComponent(slug)}&_state=venue-detail`);
  };

  return (
    <div className="relative h-dvh lg:h-[calc(100dvh-var(--size-desktop-nav-h))] w-full">
      <MapContainer />
      <VenuePinLayer venues={venues} />
      {selectedPinData && (
        <>
          <VenueQuickInfo
            mode="mobile"
            name={selectedPinData.name}
            sunTimeRange={resolveSunTimeRange(selectedVenueDto)}
            confidencePercent={selectedVenueDto?.confidence}
            distanceMeters={selectedVenueDto?.distanceMeters}
            isLoadingSunData={venueQuery.isFetching || !selectedVenueDto}
            onDismiss={() => selectVenue(null)}
            onOpenDetails={handleOpenDetails}
            onRoute={() => {}}
            labels={quickInfoLabels(tVenue)}
          />
          <VenueQuickInfo
            mode="desktop"
            name={selectedPinData.name}
            sunTimeRange={resolveSunTimeRange(selectedVenueDto)}
            confidencePercent={selectedVenueDto?.confidence}
            distanceMeters={selectedVenueDto?.distanceMeters}
            isLoadingSunData={venueQuery.isFetching || !selectedVenueDto}
            position={quickInfoPosition}
            onDismiss={() => selectVenue(null)}
            onOpenDetails={handleOpenDetails}
            onRoute={() => {}}
            labels={quickInfoLabels(tVenue)}
          />
        </>
      )}
      <MapControls />
      {!tilesPainted && (
        <div className="absolute inset-0 z-floating-buttons" data-testid="map-tile-paint-cover">
          <MapLoadingFallback />
        </div>
      )}
      <LoadingPill
        isFetching={venueQuery.isFetching}
        dataUpdatedAt={venueQuery.dataUpdatedAt}
      />
      {/* ErrorPill stays visible during background refetch so the user
          knows the previous attempt failed — only hide once a refetch
          actually succeeds (`isError` flips false). */}
      {venueQuery.isError && <ErrorPill />}
    </div>
  );
}

function resolveSunTimeRange(_venue: VenueDataDto | null): string {
  return 'Sol 13:00-18:30';
}

function quickInfoLabels(t: ReturnType<typeof useTranslations<'venue'>>) {
  return {
    route: t('quickInfo.route'),
    moreInfo: t('quickInfo.moreInfo'),
    close: t('quickInfo.close'),
    photoPlaceholder: t('quickInfo.photoPlaceholder'),
    confidence: t('quickInfo.confidence'),
    distance: t('quickInfo.distance'),
    loadingSun: t('quickInfo.loadingSun'),
  };
}

type LoadingPillProps = {
  isFetching: boolean;
  dataUpdatedAt: number;
};

/**
 * Cumulative-fetching loading pill. The 3 s threshold is measured
 * across consecutive in-flight fetches — only a successful data
 * delivery (`dataUpdatedAt` change) resets the window. Without this,
 * a chain of sub-3 s refetches (geolocation success → query key flip
 * → second fetch) would never surface feedback even if the cumulative
 * wait is long.
 *
 * The timer starts on the first `isFetching=true` and survives
 * subsequent `isFetching=false` gaps; it is cleared only on a
 * successful `dataUpdatedAt` change or on unmount.
 */
function LoadingPill({ isFetching, dataUpdatedAt }: LoadingPillProps) {
  const t = useTranslations('map');
  const [show, setShow] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Single effect drives both directions so a chained refetch (where
  // `isFetching` stays continuously true across two deliveries) still
  // re-arms the timer after the cumulative window resets. Two separate
  // effects would let Effect 2 clear the timer on `dataUpdatedAt` change
  // without Effect 1 re-running (because `isFetching` never transitioned),
  // leaving the next slow fetch silent.
  useEffect(() => {
    // A successful data delivery resets the cumulative window. Skip the
    // initial mount where TanStack reports `dataUpdatedAt: 0` (the "no
    // data delivered yet" sentinel).
    if (dataUpdatedAt !== 0) {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setShow(false);
    }
    // Arm a fresh timer if currently fetching and not already armed.
    if (isFetching && timerRef.current === null) {
      timerRef.current = window.setTimeout(() => {
        setShow(true);
        timerRef.current = null;
      }, SLOW_LOAD_PILL_MS);
    }
  }, [isFetching, dataUpdatedAt]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  if (!show) return null;

  return (
    <div
      role="status"
      data-testid="map-loading-pill"
      className="absolute top-3 left-1/2 -translate-x-1/2 z-floating-buttons px-4 py-2 rounded-pill bg-glass-standard backdrop-blur-[6px] shadow-button-float text-body-sm text-text-muted"
    >
      {t('loadingPlaces')}
    </div>
  );
}

function ErrorPill() {
  const t = useTranslations('map');
  return (
    <div
      role="alert"
      data-testid="map-error-pill"
      className="absolute top-3 left-1/2 -translate-x-1/2 z-floating-buttons px-4 py-2 rounded-pill bg-glass-standard backdrop-blur-[6px] shadow-button-float text-body-sm text-text-muted"
    >
      {t('loadFailed')}
    </div>
  );
}

