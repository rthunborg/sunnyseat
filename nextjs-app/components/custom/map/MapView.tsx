'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AnimatePresence } from 'motion/react';
import { useSearchParams } from 'next/navigation';
import {
  VenueQuickInfo,
  type VenueQuickInfoDesktopPlacement,
} from '@/components/composed/venue/VenueQuickInfo';
import {
  MobileBottomSheet,
  type MobileBottomSheetState,
} from '@/components/custom/sheets/MobileBottomSheet';
import { VenueDetailOverlay } from '@/components/custom/venue/VenueDetailOverlay';
import { VenueListControls, type VenueListSortMode } from '@/components/composed/venue/VenueListControls';
import { VenueSearchShell } from '@/components/custom/search/VenueSearchShell';
import {
  currentTimeLabel,
  resolveForcedVisualVenueDetail,
} from '@/components/custom/venue/forced-venue-detail';
import { isVenueSunnyForList, VenueList } from '@/components/custom/venue/VenueList';
import { useVenueDetail } from '@/hooks/queries/useVenueDetail';
import { useVenueSearch } from '@/hooks/queries/useVenueSearch';
import { useGeolocation } from '@/hooks/useGeolocation';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useMapInstance } from '@/lib/contexts/MapInstanceContext';
import { useMapSelection } from '@/lib/contexts/MapSelectionContext';
import { type VenuePinData } from '@/lib/types/map';
import type { VenueDataDto } from '@/lib/types/api';
import { DURATION_FLY_MS } from '@/lib/constants/animation';
import { useForcedState } from '@/lib/dev/use-forced-state';
import { isStyleResourceUrl } from '@/lib/utils/map-errors';
import { mapVenueDtoToPinData } from '@/lib/utils/venue-pin-mapping';
import { MapContainer } from './MapContainer';
import { MapLoadingFallback } from './MapLoadingFallback';
import { VenuePinLayer } from './VenuePinLayer';
import { MapControls } from './MapControls';

const SLOW_LOAD_PILL_MS = 3000;
const SEARCH_RADIUS_KM = 1.5;
const QUICK_INFO_DESKTOP_WIDTH = 280;
const QUICK_INFO_DESKTOP_HEIGHT_ESTIMATE = 260;
const QUICK_INFO_DESKTOP_PIN_GAP = 56;
const QUICK_INFO_DESKTOP_VIEWPORT_GUTTER = 16;
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
  const tVenueDetail = useTranslations('venue.detail');
  const tVenueList = useTranslations('venue.list');
  const geolocation = useGeolocation();
  const { mapInstance } = useMapInstance();
  const { selectedVenueId, selectedVenuePreview, selectVenue } = useMapSelection();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const forcedState = useForcedState();
  const [quickInfoPosition, setQuickInfoPosition] = useState<{ x: number; y: number } | undefined>();
  const [quickInfoDesktopPlacement, setQuickInfoDesktopPlacement] =
    useState<VenueQuickInfoDesktopPlacement>('above');
  const [mobileSheetState, setMobileSheetState] =
    useState<MobileBottomSheetState>('peek');
  const [venueSortMode, setVenueSortMode] = useState<VenueListSortMode>('sun');
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
  const venueDtosForMap = useMemo(() => {
    const base = Array.isArray(rawVenues) ? rawVenues : [];
    if (!selectedVenuePreview || base.some((venue) => venue.id === selectedVenuePreview.id)) {
      return base;
    }
    return [...base, selectedVenuePreview];
  }, [rawVenues, selectedVenuePreview]);
  const venues = useMemo<VenuePinData[]>(() => {
    return venueDtosForMap.flatMap((v) => {
      const pin = mapVenueDtoToPinData(v);
      return pin ? [pin] : [];
    });
  }, [venueDtosForMap]);
  const selectedVenueDto = useMemo(() => {
    if (!selectedVenueId) return null;
    return venueDtosForMap.find((venue) => venue.id === selectedVenueId) ?? null;
  }, [selectedVenueId, venueDtosForMap]);
  const selectedPinData = useMemo(() => {
    if (!selectedVenueId) return null;
    return venues.find((venue) => venue.id === selectedVenueId) ?? null;
  }, [selectedVenueId, venues]);
  const venueSlugParam = searchParams.get('venue');
  const canRequestVenueDetail = Boolean(venueSlugParam) &&
    forcedState !== 'map-with-selected-venue';
  const venueDetailQuery = useVenueDetail(canRequestVenueDetail ? venueSlugParam : null);
  const forcedVisualVenueDetail = useMemo(
    () => resolveForcedVisualVenueDetail(venueSlugParam, forcedState),
    [forcedState, venueSlugParam],
  );
  const detailVenue = venueDetailQuery.data?.venue ?? forcedVisualVenueDetail;
  const detailFallbackVenue = useMemo(() => {
    if (!venueSlugParam) return null;
    if (detailVenue) return detailVenue;
    if (Array.isArray(rawVenues)) {
      const listVenue = rawVenues.find((venue) => venue.slug === venueSlugParam);
      if (listVenue) return listVenue;
    }
    if (selectedVenueDto?.slug === venueSlugParam) return selectedVenueDto;
    if (venueDetailQuery.isFetching || venueDetailQuery.isError) {
      return fallbackVenueFromSlug(venueSlugParam);
    }
    return null;
  }, [
    detailVenue,
    rawVenues,
    selectedVenueDto,
    venueDetailQuery.isError,
    venueDetailQuery.isFetching,
    venueSlugParam,
  ]);
  const isVenueDetailRequested = canRequestVenueDetail;

  useEffect(() => {
    if (!venueSlugParam || !selectedVenuePreview?.slug) return;
    if (selectedVenuePreview.slug === venueSlugParam) return;
    const query = queryWithout(searchParams, ['venue', '_state']);
    router.replace(Object.keys(query).length > 0 ? { pathname, query } : pathname);
  }, [pathname, router, searchParams, selectedVenuePreview?.slug, venueSlugParam]);

  useEffect(() => {
    if (forcedState === 'map-panel-venues') {
      setMobileSheetState('full');
    }
  }, [forcedState]);

  useEffect(() => {
    if (forcedState !== 'map-with-selected-venue' && !venueSlugParam) return;
    if (venueSlugParam && selectedVenuePreview?.slug && selectedVenuePreview.slug !== venueSlugParam) {
      return;
    }
    if (!Array.isArray(rawVenues) || rawVenues.length === 0) return;
    const match = venueSlugParam
      ? rawVenues.find((venue) => venue.slug === venueSlugParam)
      : rawVenues[0];
    if (!match) return;
    selectVenue(match.id);
  }, [forcedState, rawVenues, selectVenue, selectedVenuePreview?.slug, venueSlugParam]);

  useEffect(() => {
    if (!mapInstance || !selectedVenueDto) {
      setQuickInfoPosition(undefined);
      setQuickInfoDesktopPlacement('above');
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
      const halfWidth = QUICK_INFO_DESKTOP_WIDTH / 2 + QUICK_INFO_DESKTOP_VIEWPORT_GUTTER;
      const minY =
        QUICK_INFO_DESKTOP_HEIGHT_ESTIMATE +
        QUICK_INFO_DESKTOP_PIN_GAP +
        QUICK_INFO_DESKTOP_VIEWPORT_GUTTER;
      const maxY = height - QUICK_INFO_DESKTOP_VIEWPORT_GUTTER;
      const canFitAbove = maxY >= minY;
      setQuickInfoDesktopPlacement(canFitAbove ? 'above' : 'pinned');
      setQuickInfoPosition({
        x: Math.min(Math.max(projected.x, halfWidth), width - halfWidth),
        y: canFitAbove
          ? Math.min(Math.max(projected.y, minY), maxY)
          : QUICK_INFO_DESKTOP_VIEWPORT_GUTTER,
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
    router.push({
      pathname,
      query: {
        ...queryWithout(searchParams, ['_state']),
        venue: slug,
      },
    });
  };

  const handleDismissDetails = () => {
    const query = queryWithout(searchParams, ['venue', '_state']);
    router.replace(Object.keys(query).length > 0 ? { pathname, query } : pathname);
  };

  const handleSelectVenueFromList = (venue: VenueDataDto) => {
    selectVenue(venue.id);
    setMobileSheetState('peek');
    if (mapInstance && hasValidVenueLocation(venue)) {
      mapInstance.easeTo({
        center: [venue.location.lng, venue.location.lat],
        duration: DURATION_FLY_MS,
      });
    }
  };

  const listVenues = useMemo(
    () => (Array.isArray(rawVenues) ? rawVenues.filter(hasValidVenueLocation) : []),
    [rawVenues],
  );
  const sunnyVenueCount = listVenues.filter(isVenueSunnyForList).length;

  return (
    <div className="relative h-dvh lg:h-[calc(100dvh-var(--size-desktop-nav-h))] w-full">
      <MapContainer />
      <VenuePinLayer venues={venues} />
      <VenueSearchShell
        variant="mobile"
        onSearchFocus={() => setMobileSheetState('peek')}
        onVenueSelected={() => setMobileSheetState('peek')}
        className="absolute left-4 right-4 top-[calc(env(safe-area-inset-top)+calc(var(--spacing)*4))] z-glass-panel"
      />
      <MobileBottomSheet
        state={mobileSheetState}
        onStateChange={setMobileSheetState}
        handleLabel={tVenueList('handle')}
      >
        <div className="pb-2">
          <h2 className="text-heading-xl text-text-primary">
            {tVenueList('headerMobile')}
          </h2>
          <p className="mt-1 text-body-sm text-text-body">
            {tVenueList('subtitle', { count: sunnyVenueCount })}
          </p>
        </div>
        <VenueListControls
          mode="mobile"
          sortMode={venueSortMode}
          onSortModeChange={setVenueSortMode}
          labels={venueListControlLabels(tVenueList)}
        />
        <VenueList
          venues={listVenues}
          mode="mobile"
          sortMode={venueSortMode}
          isLoading={venueQuery.isFetching && listVenues.length === 0}
          animateCards={mobileSheetState === 'full'}
          onSelectVenue={handleSelectVenueFromList}
        />
      </MobileBottomSheet>
      <aside
        data-testid="desktop-venue-list-panel"
        className="absolute left-0 top-0 bottom-0 z-bottom-sheet-peek hidden lg:flex lg:w-venue-list-desktop flex-col border-r border-divider bg-surface-cream shadow-card"
      >
        <div className="border-b border-divider px-3 py-4">
          <h2 className="text-heading-sm uppercase tracking-section-label text-text-body">
            {tVenueList('headerDesktop')}
          </h2>
          <p className="mt-2 text-label-lg text-text-primary">
            {tVenueList('subtitle', { count: sunnyVenueCount })}
          </p>
        </div>
        <VenueListControls
          mode="desktop"
          sortMode={venueSortMode}
          onSortModeChange={setVenueSortMode}
          labels={venueListControlLabels(tVenueList)}
        />
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <VenueList
            venues={listVenues}
            mode="desktop"
            sortMode={venueSortMode}
            isLoading={venueQuery.isFetching && listVenues.length === 0}
            onSelectVenue={handleSelectVenueFromList}
          />
        </div>
      </aside>
      <AnimatePresence>
        {detailFallbackVenue && isVenueDetailRequested && (
          <VenueDetailOverlay
            key="venue-detail-mobile"
            mode="mobile"
            fallbackVenue={detailFallbackVenue}
            detail={detailVenue ?? undefined}
            isLoading={venueDetailQuery.isFetching && !detailVenue}
            currentTime={currentTimeLabel()}
            labels={venueDetailLabels(tVenueDetail)}
            onDismiss={handleDismissDetails}
            onRoute={() => {}}
            routeDisabled
          />
        )}
        {detailFallbackVenue && isVenueDetailRequested && (
          <VenueDetailOverlay
            key="venue-detail-desktop"
            mode="desktop"
            fallbackVenue={detailFallbackVenue}
            detail={detailVenue ?? undefined}
            isLoading={venueDetailQuery.isFetching && !detailVenue}
            currentTime={currentTimeLabel()}
            labels={venueDetailLabels(tVenueDetail)}
            onDismiss={handleDismissDetails}
            onRoute={() => {}}
            routeDisabled
          />
        )}
        {selectedPinData && !isVenueDetailRequested && (
          <VenueQuickInfo
            key="quick-info-mobile"
            mode="mobile"
            name={selectedPinData.name}
            sunTimeRange={resolveSunTimeRange(selectedVenueDto)}
            confidencePercent={selectedVenueDto?.confidence}
            distanceMeters={selectedVenueDto?.distanceMeters}
            thumbnail={selectedVenueDto?.thumbnail}
            isLoadingSunData={venueQuery.isFetching || !selectedVenueDto}
            onDismiss={() => selectVenue(null)}
            onOpenDetails={handleOpenDetails}
            onRoute={() => {}}
            labels={quickInfoLabels(tVenue)}
          />
        )}
        {selectedPinData && !isVenueDetailRequested && (
          <VenueQuickInfo
            key="quick-info-desktop"
            mode="desktop"
            name={selectedPinData.name}
            sunTimeRange={resolveSunTimeRange(selectedVenueDto)}
            confidencePercent={selectedVenueDto?.confidence}
            distanceMeters={selectedVenueDto?.distanceMeters}
            thumbnail={selectedVenueDto?.thumbnail}
            isLoadingSunData={venueQuery.isFetching || !selectedVenueDto}
            position={quickInfoPosition}
            desktopPlacement={quickInfoDesktopPlacement}
            onDismiss={() => selectVenue(null)}
            onOpenDetails={handleOpenDetails}
            onRoute={() => {}}
            labels={quickInfoLabels(tVenue)}
          />
        )}
      </AnimatePresence>
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

function resolveSunTimeRange(venue: VenueDataDto | null): string | undefined {
  if (!venue?.sunWindow) return undefined;
  return `Sol ${venue.sunWindow.start}–${venue.sunWindow.end}`;
}

function hasValidVenueLocation(venue: VenueDataDto): boolean {
  return Number.isFinite(venue.location?.lat) && Number.isFinite(venue.location?.lng);
}

function fallbackVenueFromSlug(slug: string): VenueDataDto {
  const name = slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || slug;

  return {
    id: slug,
    venueId: slug,
    venueName: name,
    venueSlug: slug,
    slug,
    neighborhood: '',
    location: { lat: Number.NaN, lng: Number.NaN },
    currentSunStatus: 'Shaded',
    isPartner: false,
    confidence: 0,
    distanceMeters: Number.NaN,
    sunExposurePercent: 0,
    thumbnail: { alt: name, initials: name.slice(0, 2) },
  };
}

function queryWithout(
  params: Pick<URLSearchParams, 'forEach'>,
  excludedKeys: string[],
): Record<string, string | string[]> {
  const excluded = new Set(excludedKeys);
  const query: Record<string, string | string[]> = {};

  params.forEach((value, key) => {
    if (excluded.has(key)) return;
    const current = query[key];
    if (current === undefined) {
      query[key] = value;
      return;
    }
    query[key] = Array.isArray(current) ? [...current, value] : [current, value];
  });

  return query;
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
    sunUnavailable: t('quickInfo.sunUnavailable'),
  };
}

function venueDetailLabels(t: ReturnType<typeof useTranslations<'venue.detail'>>) {
  return {
    close: t('close'),
    favourite: t('favourite'),
    share: t('share'),
    sectionTitle: t('sectionTitle'),
    peakTime: t('peakTime', { time: '{time}' }),
    openMaps: t('openMaps'),
    route: t('route'),
    photoPlaceholder: t('photoPlaceholder'),
    loading: t('loading'),
    detailsUnavailable: t('detailsUnavailable'),
    openingHours: t('openingHours'),
    address: t('address'),
    shadowWarning: t('shadowWarning', { minutes: '{minutes}' }),
    sunBadge: t('sunBadge', { percent: '{percent}' }),
    timeline: {
      ariaLabel: t('timeline.ariaLabel'),
      currentTime: t('timeline.currentTime', { time: '{time}' }),
      sunnyWindow: t('timeline.sunnyWindow', { start: '{start}', end: '{end}' }),
      partialWindow: t('timeline.partialWindow', { start: '{start}', end: '{end}' }),
      shadedWindow: t('timeline.shadedWindow', { start: '{start}', end: '{end}' }),
    },
  };
}

function venueListControlLabels(t: ReturnType<typeof useTranslations<'venue.list'>>) {
  return {
    nearTab: t('controls.nearTab'),
    favouritesTab: t('controls.favouritesTab'),
    topPicks: t('controls.topPicks'),
    sortBySun: t('controls.sortBySun'),
    sortByDistance: t('controls.sortByDistance'),
    categoryCafe: t('controls.categoryCafe'),
    openNow: t('controls.openNow'),
    unavailable: t('controls.unavailable'),
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

