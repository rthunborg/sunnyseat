'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
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
import {
  VenueListControls,
  type VenueListModeSelection,
  type VenueListSortMode,
} from '@/components/composed/venue/VenueListControls';
import { FavouritesList } from '@/components/custom/favourites/FavouritesList';
import { VenueSearchShell } from '@/components/custom/search/VenueSearchShell';
import { resolveForcedVisualVenueDetail } from '@/components/custom/venue/forced-venue-detail';
import { TimeSliderPanel } from '@/components/custom/time/TimeSliderPanel';
import { isVenueSunnyForList, VenueList } from '@/components/custom/venue/VenueList';
import { useVenueDetail } from '@/hooks/queries/useVenueDetail';
import { useFavouriteVenues } from '@/hooks/queries/useFavouriteVenues';
import { useVenueSearch } from '@/hooks/queries/useVenueSearch';
import { useFavourites } from '@/hooks/useFavourites';
import { useGeolocation } from '@/hooks/useGeolocation';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useMapInstance } from '@/lib/contexts/MapInstanceContext';
import { useMapSelection } from '@/lib/contexts/MapSelectionContext';
import { useTimeContext } from '@/lib/contexts/TimeContext';
import { type VenuePinData } from '@/lib/types/map';
import type { SunFreshnessMeta, VenueDataDto } from '@/lib/types/api';
import { DURATION_FLY_MS } from '@/lib/constants/animation';
import { useForcedState } from '@/lib/dev/use-forced-state';
import { cn } from '@/lib/utils';
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
const QUICK_INFO_MOBILE_WIDTH = 230;
const QUICK_INFO_MOBILE_HEIGHT_ESTIMATE = 170;
const QUICK_INFO_MOBILE_PIN_GAP = 56;
const QUICK_INFO_MOBILE_TOP_CLEARANCE = 192;
const QUICK_INFO_MOBILE_VIEWPORT_GUTTER = 16;
const MOBILE_NAV_HEIGHT_PX = 52;
const MOBILE_SHEET_MID_HEIGHT_PX = 320;
const FORCED_VISUAL_CONFIDENCE_META: SunFreshnessMeta = {
  sunDataSource: 'weather',
  weatherUpdatedAt: '2999-01-01T00:00:00.000Z',
};
const EMPTY_VENUES: VenueDataDto[] = [];
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
  const locale = useLocale();
  const geolocation = useGeolocation();
  const { mapInstance } = useMapInstance();
  const { selectedVenueId, selectedVenuePreview, selectVenue } = useMapSelection();
  const plannerTime = useTimeContext();
  const favourites = useFavourites();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const forcedState = useForcedState();
  const venueSlugParam = searchParams.get('venue');
  const [quickInfoPosition, setQuickInfoPosition] = useState<{ x: number; y: number } | undefined>();
  const [quickInfoDesktopPlacement, setQuickInfoDesktopPlacement] =
    useState<VenueQuickInfoDesktopPlacement>('above');
  const [mobileSheetState, setMobileSheetState] =
    useState<MobileBottomSheetState>('mid');
  const [venueSortMode, setVenueSortMode] = useState<VenueListSortMode>('sun');
  const hasHandledFavouritesRouteEntryRef = useRef(false);
  const isFavouritesRoute = isFavouritesPath(pathname);
  const [desktopListMode, setDesktopListMode] = useState<'near' | 'favourites'>(
    isFavouritesRoute ? 'favourites' : 'near',
  );
  const previousSelectedPreviewKeyRef = useRef<string | null>(
    venueIdentityKey(selectedVenuePreview),
  );
  const listMode = isFavouritesRoute ? 'favourites' : desktopListMode;
  const effectiveSortMode = listMode === 'favourites' ? 'sun' : venueSortMode;
  const isForcedVisualReference =
    forcedState === 'map-primary' ||
    forcedState === 'map-panel-venues' ||
    forcedState === 'map-with-selected-venue';
  const venueQuery = useVenueSearch({
    lat: geolocation.coords.lat,
    lng: geolocation.coords.lng,
    radiusKm: SEARCH_RADIUS_KM,
    ...plannerTime.plannerQuery,
  });
  const favouriteVenueQuery = useFavouriteVenues({
    ids: favourites.favouriteIds,
    lat: geolocation.coords.lat,
    lng: geolocation.coords.lng,
    enabled: listMode === 'favourites',
    ...plannerTime.plannerQuery,
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
    // Catch the "already loaded before listener bound" case. MapLibre can
    // throw here while a route transition races style/source initialization;
    // the event listeners above still resolve the cover once tiles settle.
    try {
      if (typeof mapInstance.areTilesLoaded === 'function' && mapInstance.areTilesLoaded()) {
        setTilesPainted(true);
      }
    } catch {
      // Keep the loading cover until sourcedata/error events provide signal.
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
  const favouriteListConfidenceMeta = favouriteVenueQuery.data?.meta;
  const favouriteVenueRows = Array.isArray(favouriteVenueQuery.data?.venues)
    ? favouriteVenueQuery.data.venues
    : EMPTY_VENUES;
  const selectedPreviewSlug = selectedVenuePreview?.slug || selectedVenuePreview?.venueSlug || null;
  const selectedPreviewIsInCurrentRows = useMemo(() => {
    if (!selectedVenuePreview) return false;
    if (Array.isArray(rawVenues) && rawVenues.some((venue) => venue.id === selectedVenuePreview.id)) {
      return true;
    }
    return favouriteVenueRows.some((venue) => venue.id === selectedVenuePreview.id);
  }, [favouriteVenueRows, rawVenues, selectedVenuePreview]);
  const canRequestVenueDetail = Boolean(venueSlugParam) &&
    forcedState !== 'map-with-selected-venue';
  const shouldRefreshSelectedPreview = Boolean(
    selectedVenuePreview &&
    selectedVenueId === selectedVenuePreview.id &&
    selectedPreviewSlug &&
    !selectedPreviewIsInCurrentRows &&
    !canRequestVenueDetail,
  );
  const selectedPreviewDetailQuery = useVenueDetail(
    shouldRefreshSelectedPreview ? selectedPreviewSlug : null,
    {
      ...plannerTime.plannerQuery,
      lat: geolocation.coords.lat,
      lng: geolocation.coords.lng,
    },
  );
  const refreshedSelectedVenuePreview = useMemo(() => {
    const detailVenue = selectedPreviewDetailQuery.data?.venue;
    if (!selectedVenuePreview || !detailVenue) return null;
    if (detailVenue.id !== selectedVenuePreview.id) return null;
    if (!venueMatchesSlug(detailVenue, selectedPreviewSlug)) return null;
    return detailVenue;
  }, [selectedPreviewDetailQuery.data?.venue, selectedPreviewSlug, selectedVenuePreview]);
  const selectedVenuePreviewForMap = refreshedSelectedVenuePreview ?? selectedVenuePreview;
  const venueDtosForMap = useMemo(() => {
    const base = Array.isArray(rawVenues) ? rawVenues : [];
    const seenIds = new Set(base.map((venue) => venue.id));
    const extraVenues: VenueDataDto[] = [];

    for (const favouriteVenue of favouriteVenueRows) {
      if (seenIds.has(favouriteVenue.id)) continue;
      seenIds.add(favouriteVenue.id);
      extraVenues.push(favouriteVenue);
    }

    if (selectedVenuePreviewForMap && !seenIds.has(selectedVenuePreviewForMap.id)) {
      extraVenues.push(selectedVenuePreviewForMap);
    }

    if (extraVenues.length === 0) {
      return base;
    }
    return [...base, ...extraVenues];
  }, [favouriteVenueRows, rawVenues, selectedVenuePreviewForMap]);
  const forceSunnyVisualPins = shouldUseForcedSunnyMapPins(forcedState);
  const venues = useMemo<VenuePinData[]>(() => {
    return venueDtosForMap.flatMap((v) => {
      const pin = mapVenueDtoToPinData(v);
      if (!pin) return [];
      return forceSunnyVisualPins
        ? [normalizeForcedVisualPin(pin)]
        : [pin];
    });
  }, [forceSunnyVisualPins, venueDtosForMap]);
  const selectedVenueDto = useMemo(() => {
    if (!selectedVenueId) return null;
    return venueDtosForMap.find((venue) => venue.id === selectedVenueId) ?? null;
  }, [selectedVenueId, venueDtosForMap]);
  const selectedQuickInfoVenue = useMemo(() => {
    if (!selectedVenueDto) return null;
    return isForcedVisualReference
      ? normalizeForcedVisualVenue(selectedVenueDto)
      : selectedVenueDto;
  }, [isForcedVisualReference, selectedVenueDto]);
  const selectedPinData = useMemo(() => {
    if (!selectedVenueId) return null;
    return venues.find((venue) => venue.id === selectedVenueId) ?? null;
  }, [selectedVenueId, venues]);
  const venueDetailQuery = useVenueDetail(
    canRequestVenueDetail ? venueSlugParam : null,
    {
      ...plannerTime.plannerQuery,
      lat: geolocation.coords.lat,
      lng: geolocation.coords.lng,
    },
  );
  const forcedVisualVenueDetail = useMemo(
    () => resolveForcedVisualVenueDetail(venueSlugParam, forcedState),
    [forcedState, venueSlugParam],
  );
  const queriedDetailVenue = venueDetailQuery.data?.venue;
  const queriedDetailMatchesUrl = venueMatchesSlug(queriedDetailVenue, venueSlugParam);
  const detailVenue = forcedVisualVenueDetail ?? (queriedDetailMatchesUrl ? queriedDetailVenue : null);
  const detailConfidenceMeta = forcedVisualVenueDetail
    ? FORCED_VISUAL_CONFIDENCE_META
    : queriedDetailMatchesUrl
    ? (venueDetailQuery.data?.meta ?? venueQuery.data?.meta)
    : venueQuery.data?.meta;
  const detailFallbackVenue = useMemo(() => {
    if (!venueSlugParam) return null;
    if (detailVenue) return detailVenue;
    if (Array.isArray(rawVenues)) {
      const listVenue = rawVenues.find((venue) => venueMatchesSlug(venue, venueSlugParam));
      if (listVenue) return listVenue;
    }
    const favouriteVenue = favouriteVenueRows.find((venue) => venueMatchesSlug(venue, venueSlugParam));
    if (favouriteVenue) return favouriteVenue;
    if (venueMatchesSlug(selectedVenueDto, venueSlugParam)) return selectedVenueDto;
    if (venueDetailQuery.isFetching) {
      return fallbackVenueFromSlug(venueSlugParam);
    }
    return null;
  }, [
    detailVenue,
    favouriteVenueRows,
    rawVenues,
    selectedVenueDto,
    venueDetailQuery.isError,
    venueDetailQuery.isFetching,
    venueSlugParam,
  ]);
  const detailFavouriteId = useMemo(() => {
    if (!venueSlugParam) return undefined;
    const candidates = [
      detailVenue,
      selectedVenueDto,
      ...favouriteVenueRows,
      ...(Array.isArray(rawVenues) ? rawVenues : []),
    ];
    return candidates.find((venue) => venueMatchesSlug(venue, venueSlugParam))?.id;
  }, [detailVenue, favouriteVenueRows, rawVenues, selectedVenueDto, venueSlugParam]);
  const isVenueDetailRequested = canRequestVenueDetail && Boolean(detailFallbackVenue);

  useEffect(() => {
    if (!venueSlugParam || !selectedVenuePreview?.slug) return;
    const selectedPreviewKey = venueIdentityKey(selectedVenuePreview);
    const selectedPreviewChanged =
      selectedPreviewKey !== previousSelectedPreviewKeyRef.current;
    previousSelectedPreviewKeyRef.current = selectedPreviewKey;
    if (!selectedPreviewChanged) return;
    if (venueMatchesSlug(selectedVenuePreview, venueSlugParam)) return;
    const query = queryWithout(searchParams, ['venue', '_state']);
    router.replace(Object.keys(query).length > 0 ? { pathname, query } : pathname);
  }, [pathname, router, searchParams, selectedVenuePreview, venueSlugParam]);

  useEffect(() => {
    if (forcedState === 'map-panel-venues') {
      setMobileSheetState('mid');
    }
  }, [forcedState]);

  useEffect(() => {
    if (selectedVenueId && !isVenueDetailRequested) {
      setMobileSheetState('peek');
      return;
    }
    if (listMode === 'favourites') {
      setMobileSheetState('mid');
    }
  }, [isVenueDetailRequested, listMode, selectedVenueId]);

  useEffect(() => {
    if (!isFavouritesRoute) {
      hasHandledFavouritesRouteEntryRef.current = false;
      return;
    }
    if (hasHandledFavouritesRouteEntryRef.current) return;
    hasHandledFavouritesRouteEntryRef.current = true;
    if (selectedVenueId) selectVenue(null);
  }, [isFavouritesRoute, selectVenue, selectedVenueId]);

  useEffect(() => {
    if (forcedState !== 'map-with-selected-venue' && !venueSlugParam) return;
    if (!Array.isArray(rawVenues) || rawVenues.length === 0) return;
    const match = venueSlugParam
      ? rawVenues.find((venue) => venueMatchesSlug(venue, venueSlugParam))
      : rawVenues[0];
    if (!match) return;
    selectVenue(match.id, match);
  }, [forcedState, rawVenues, selectVenue, selectedVenuePreview, venueSlugParam]);

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
      const isDesktopViewport =
        typeof window.matchMedia === 'function'
          ? window.matchMedia('(min-width: 1024px)').matches
          : width >= 1024;
      const halfWidth = isDesktopViewport
        ? QUICK_INFO_DESKTOP_WIDTH / 2 + QUICK_INFO_DESKTOP_VIEWPORT_GUTTER
        : QUICK_INFO_MOBILE_WIDTH / 2 + QUICK_INFO_MOBILE_VIEWPORT_GUTTER;
      const minY = isDesktopViewport
        ? QUICK_INFO_DESKTOP_HEIGHT_ESTIMATE +
          QUICK_INFO_DESKTOP_PIN_GAP +
          QUICK_INFO_DESKTOP_VIEWPORT_GUTTER
        : QUICK_INFO_MOBILE_HEIGHT_ESTIMATE +
          QUICK_INFO_MOBILE_PIN_GAP +
          QUICK_INFO_MOBILE_TOP_CLEARANCE +
          QUICK_INFO_MOBILE_VIEWPORT_GUTTER;
      const maxY = isDesktopViewport
        ? height - QUICK_INFO_DESKTOP_VIEWPORT_GUTTER
        : Math.max(
            minY,
            height -
              MOBILE_NAV_HEIGHT_PX -
              MOBILE_SHEET_MID_HEIGHT_PX -
              QUICK_INFO_MOBILE_VIEWPORT_GUTTER,
          );
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
    selectVenue(venue.id, venue);
    setMobileSheetState('peek');
    if (mapInstance && hasValidVenueLocation(venue)) {
      mapInstance.easeTo({
        center: [venue.location.lng, venue.location.lat],
        duration: DURATION_FLY_MS,
      });
    }
  };

  const listVenues = useMemo(
    () => {
      const validVenues = Array.isArray(rawVenues) ? rawVenues.filter(hasValidVenueLocation) : [];
      return isForcedVisualReference
        ? validVenues.map(normalizeForcedVisualVenue)
        : validVenues;
    },
    [isForcedVisualReference, rawVenues],
  );
  const listConfidenceMeta = isForcedVisualReference
    ? FORCED_VISUAL_CONFIDENCE_META
    : venueQuery.data?.meta;
  const favouriteIdSet = useMemo(
    () => new Set(favourites.favouriteIds),
    [favourites.favouriteIds],
  );
  const visibleFavouriteVenueCount = favouriteVenueRows
    .filter((venue) => favouriteIdSet.has(venue.id)).length;
  const isFavouriteListLoading = !favourites.isHydrated ||
    (
      favouriteVenueQuery.isFetching &&
      favourites.favouriteIds.length > 0 &&
      visibleFavouriteVenueCount === 0
    );
  const quickInfoConfidenceMeta = isForcedVisualReference
    ? FORCED_VISUAL_CONFIDENCE_META
    : selectedVenueId && refreshedSelectedVenuePreview?.id === selectedVenueId
    ? (selectedPreviewDetailQuery.data?.meta ?? venueQuery.data?.meta)
    : selectedVenueId && favouriteVenueRows.some((venue) => venue.id === selectedVenueId)
    ? (favouriteListConfidenceMeta ?? venueQuery.data?.meta)
    : venueQuery.data?.meta;
  const quickInfoSunWindowTemplate = tVenue('quickInfo.sunWindow', {
    start: '{start}',
    end: '{end}',
  });

  useEffect(() => {
    setDesktopListMode(isFavouritesRoute ? 'favourites' : 'near');
  }, [isFavouritesRoute]);

  const handleDesktopListModeChange = (mode: VenueListModeSelection) => {
    setDesktopListMode(mode);
    const query = queryWithout(searchParams, ['venue', '_state']);
    if (mode === 'favourites' && !isFavouritesRoute) {
      router.push(Object.keys(query).length > 0 ? { pathname: '/favoriter', query } : '/favoriter');
    }
    if (mode === 'near' && isFavouritesRoute) {
      router.push(Object.keys(query).length > 0 ? { pathname: '/', query } : '/');
    }
  };

  const handleRouteSelectedVenue = () => {
    const venue = selectedQuickInfoVenue ?? selectedVenueDto;
    if (!venue) return;
    openDirections(venue);
  };
  const handleSortModeChange = (mode: VenueListSortMode) => {
    if (listMode === 'favourites') return;
    setVenueSortMode(mode);
  };

  return (
    <div className="relative h-dvh lg:h-[calc(100dvh-var(--size-desktop-nav-h))] w-full">
      <MapContainer />
      <VenuePinLayer venues={venues} />
      <VenueSearchShell
        variant="mobile"
        className="absolute left-4 right-4 top-[calc(env(safe-area-inset-top)+var(--spacing)*3)] z-bottom-sheet-full"
        onVenueSelected={() => setMobileSheetState('peek')}
      />
      <TimeSliderPanel
        variant="mobile"
        className="absolute left-4 right-4 top-[calc(env(safe-area-inset-top)+var(--spacing)*18)]"
      />
      <TimeSliderPanel
        variant="desktop"
        className="absolute bottom-6 left-4 right-4"
      />
      <MobileBottomSheet
        state={mobileSheetState}
        onStateChange={setMobileSheetState}
        handleLabel={tVenueList('handle')}
      >
        {mobileSheetState !== 'peek' && (
          <VenueListControls
            mode="mobile"
            sortMode={effectiveSortMode}
            onSortModeChange={handleSortModeChange}
            listMode={listMode}
            labels={venueListControlLabels(tVenueList)}
          />
        )}
        {listMode === 'favourites' ? (
          <FavouritesList
            favouriteIds={favourites.favouriteIds}
            venues={favouriteVenueRows}
            mode="mobile"
            sortMode={effectiveSortMode}
            confidenceMeta={favouriteListConfidenceMeta}
            isLoading={isFavouriteListLoading}
            isError={favouriteVenueQuery.isError}
            onRetry={() => favouriteVenueQuery.refetch()}
            animateCards={mobileSheetState === 'full'}
            compactCards={mobileSheetState === 'peek'}
            onSelectVenue={handleSelectVenueFromList}
            onFavouriteToggle={(venue) => favourites.toggleFavourite(venue.id)}
            isFavourite={favourites.isFavourite}
          />
        ) : (
          <VenueList
            venues={listVenues}
            mode="mobile"
            sortMode={effectiveSortMode}
            confidenceMeta={listConfidenceMeta}
            showVisibleConfidence={!isForcedVisualReference}
            isLoading={venueQuery.isFetching && listVenues.length === 0}
            animateCards={mobileSheetState === 'full'}
            compactCards={mobileSheetState === 'peek'}
            onSelectVenue={handleSelectVenueFromList}
            onFavouriteToggle={(venue) => favourites.toggleFavourite(venue.id)}
            isFavourite={favourites.isFavourite}
          />
        )}
      </MobileBottomSheet>
      <aside
        data-testid="desktop-venue-list-panel"
        className="absolute left-0 top-0 bottom-0 z-bottom-sheet-peek hidden lg:flex lg:w-venue-list-desktop flex-col border-r border-divider bg-surface-cream shadow-card"
      >
        <VenueListControls
          mode="desktop"
          sortMode={effectiveSortMode}
          onSortModeChange={handleSortModeChange}
          listMode={listMode}
          onListModeChange={handleDesktopListModeChange}
          labels={venueListControlLabels(tVenueList)}
        />
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {listMode === 'favourites' ? (
            <FavouritesList
              favouriteIds={favourites.favouriteIds}
              venues={favouriteVenueRows}
              mode="desktop"
              sortMode={effectiveSortMode}
              confidenceMeta={favouriteListConfidenceMeta}
              isLoading={isFavouriteListLoading}
              isError={favouriteVenueQuery.isError}
              onRetry={() => favouriteVenueQuery.refetch()}
              onSelectVenue={handleSelectVenueFromList}
              onFavouriteToggle={(venue) => favourites.toggleFavourite(venue.id)}
              isFavourite={favourites.isFavourite}
            />
          ) : (
            <VenueList
              venues={listVenues}
              mode="desktop"
              sortMode={effectiveSortMode}
              confidenceMeta={listConfidenceMeta}
              showVisibleConfidence={!isForcedVisualReference}
              isLoading={venueQuery.isFetching && listVenues.length === 0}
              onSelectVenue={handleSelectVenueFromList}
              onFavouriteToggle={(venue) => favourites.toggleFavourite(venue.id)}
              isFavourite={favourites.isFavourite}
            />
          )}
        </div>
      </aside>
      <AnimatePresence>
        {detailFallbackVenue && isVenueDetailRequested && (
          <VenueDetailOverlay
            key="venue-detail-mobile"
            mode="mobile"
            fallbackVenue={detailFallbackVenue}
            detail={detailVenue ?? undefined}
            confidenceMeta={detailConfidenceMeta}
            isLoading={venueDetailQuery.isFetching && !detailVenue}
            currentTime={plannerTime.selectedTime}
            labels={venueDetailLabels(tVenueDetail)}
            onDismiss={handleDismissDetails}
            onRoute={() => {}}
            isFavourite={detailFavouriteId ? favourites.isFavourite(detailFavouriteId) : false}
            onFavouriteToggle={
              detailFavouriteId ? () => favourites.toggleFavourite(detailFavouriteId) : undefined
            }
            routeDisabled
            locale={locale}
          />
        )}
        {detailFallbackVenue && isVenueDetailRequested && (
          <VenueDetailOverlay
            key="venue-detail-desktop"
            mode="desktop"
            fallbackVenue={detailFallbackVenue}
            detail={detailVenue ?? undefined}
            confidenceMeta={detailConfidenceMeta}
            isLoading={venueDetailQuery.isFetching && !detailVenue}
            currentTime={plannerTime.selectedTime}
            labels={venueDetailLabels(tVenueDetail)}
            onDismiss={handleDismissDetails}
            onRoute={() => {}}
            isFavourite={detailFavouriteId ? favourites.isFavourite(detailFavouriteId) : false}
            onFavouriteToggle={
              detailFavouriteId ? () => favourites.toggleFavourite(detailFavouriteId) : undefined
            }
            routeDisabled
            locale={locale}
          />
        )}
        {selectedPinData && !isVenueDetailRequested && (
          <VenueQuickInfo
            key="quick-info-mobile"
            mode="mobile"
            name={selectedPinData.name}
            sunTimeRange={resolveSunTimeRange(selectedQuickInfoVenue, quickInfoSunWindowTemplate)}
            confidencePercent={selectedQuickInfoVenue?.confidence}
            confidenceMeta={quickInfoConfidenceMeta}
            sunExposurePercent={selectedQuickInfoVenue?.sunExposurePercent}
            distanceMeters={selectedQuickInfoVenue?.distanceMeters}
            thumbnail={selectedQuickInfoVenue?.thumbnail}
            isLoadingSunData={!selectedQuickInfoVenue}
            position={quickInfoPosition}
            onDismiss={() => selectVenue(null)}
            onOpenDetails={handleOpenDetails}
            onRoute={handleRouteSelectedVenue}
            isFavourite={selectedQuickInfoVenue ? favourites.isFavourite(selectedQuickInfoVenue.id) : false}
            onFavouriteToggle={
              selectedQuickInfoVenue
                ? () => favourites.toggleFavourite(selectedQuickInfoVenue.id)
                : undefined
            }
            labels={quickInfoLabels(tVenue)}
          />
        )}
        {selectedPinData && !isVenueDetailRequested && (
          <VenueQuickInfo
            key="quick-info-desktop"
            mode="desktop"
            name={selectedPinData.name}
            sunTimeRange={resolveSunTimeRange(selectedQuickInfoVenue, quickInfoSunWindowTemplate)}
            confidencePercent={selectedQuickInfoVenue?.confidence}
            confidenceMeta={quickInfoConfidenceMeta}
            sunExposurePercent={selectedQuickInfoVenue?.sunExposurePercent}
            distanceMeters={selectedQuickInfoVenue?.distanceMeters}
            thumbnail={selectedQuickInfoVenue?.thumbnail}
            isLoadingSunData={!selectedQuickInfoVenue}
            position={quickInfoPosition}
            desktopPlacement={quickInfoDesktopPlacement}
            onDismiss={() => selectVenue(null)}
            onOpenDetails={handleOpenDetails}
            onRoute={handleRouteSelectedVenue}
            isFavourite={selectedQuickInfoVenue ? favourites.isFavourite(selectedQuickInfoVenue.id) : false}
            onFavouriteToggle={
              selectedQuickInfoVenue
                ? () => favourites.toggleFavourite(selectedQuickInfoVenue.id)
                : undefined
            }
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
        isFetching={venueQuery.isFetching && venueQuery.data === undefined}
        isError={venueQuery.isError}
        dataUpdatedAt={venueQuery.dataUpdatedAt}
      />
      {/* Venue API failure stays visible during background refetch; hide
          only once a refetch succeeds (`isError` flips false). */}
      {venueQuery.isError && <MapVenueError onRetry={() => venueQuery.refetch()} />}
    </div>
  );
}

function resolveSunTimeRange(
  venue: VenueDataDto | null,
  template: string,
): string | undefined {
  if (!venue?.sunWindow) return undefined;
  return formatLabel(template, {
    start: venue.sunWindow.start,
    end: venue.sunWindow.end,
  });
}

function formatLabel(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (label, [key, value]) => label.replaceAll(`{${key}}`, value),
    template,
  );
}

function hasValidVenueLocation(venue: VenueDataDto): boolean {
  return Number.isFinite(venue.location?.lat) && Number.isFinite(venue.location?.lng);
}

function isFavouritesPath(pathname: string): boolean {
  return pathname === '/favoriter' || pathname.startsWith('/favoriter/');
}

function venueMatchesSlug(
  venue: Pick<VenueDataDto, 'slug' | 'venueSlug'> | null | undefined,
  slug: string | null,
): boolean {
  if (!venue || !slug) return false;
  return venue.slug === slug || venue.venueSlug === slug;
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

function shouldUseForcedSunnyMapPins(forcedState: string | null): boolean {
  return forcedState === 'map-primary' ||
    forcedState === 'map-panel-venues' ||
    forcedState === 'map-with-selected-venue';
}

function normalizeForcedVisualPin(pin: VenuePinData): VenuePinData {
  return {
    ...pin,
    sunStatus: 'Sunny',
    sunExposurePercent: 95,
  };
}

function normalizeForcedVisualVenue(venue: VenueDataDto): VenueDataDto {
  return {
    ...venue,
    currentSunStatus: 'Sunny',
    skyCondition: 'clear',
    confidence: 95,
    sunExposurePercent: 95,
    sunWindow: { start: '13:00', end: '18:30' },
    thumbnail: venue.thumbnail
      ? {
          alt: venue.thumbnail.alt,
          initials: venue.thumbnail.initials,
        }
      : venue.thumbnail,
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
    confidenceApproximate: t('quickInfo.confidenceApproximate'),
    confidenceUnavailable: t('quickInfo.confidenceUnavailable'),
    distance: t('quickInfo.distance'),
    loadingSun: t('quickInfo.loadingSun'),
    sunUnavailable: t('quickInfo.sunUnavailable'),
    favouriteAdd: t('list.favouriteAdd'),
    favouriteRemove: t('list.favouriteRemove'),
  };
}

function venueDetailLabels(t: ReturnType<typeof useTranslations<'venue.detail'>>) {
  return {
    close: t('close'),
    favourite: t('favourite'),
    favouriteAdd: t('favouriteAdd'),
    favouriteRemove: t('favouriteRemove'),
    share: t('share'),
    sectionTitle: t('sectionTitle'),
    peakTime: t('peakTime', { time: '{time}' }),
    bestWindow: t('bestWindow', { start: '{start}', end: '{end}' }),
    openMaps: t('openMaps'),
    route: t('route'),
    photoPlaceholder: t('photoPlaceholder'),
    loading: t('loading'),
    detailsUnavailable: t('detailsUnavailable'),
    openingHours: t('openingHours'),
    address: t('address'),
    shadowWarning: t('shadowWarning', { minutes: '{minutes}' }),
    sunBadge: t('sunBadge', { percent: '{percent}' }),
    confidence: t('confidence'),
    confidenceApproximate: t('confidenceApproximate'),
    confidenceUnavailable: t('confidenceUnavailable'),
    city: t('city'),
    openUntil: t('openUntil', { time: '{time}' }),
    placeholderImageShort: t('placeholderImageShort'),
    facts: {
      distance: t('facts.distance'),
      exposure: t('facts.exposure'),
      bestAt: t('facts.bestAt'),
      outdoorSeats: t('facts.outdoorSeats'),
    },
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
  isError: boolean;
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
function LoadingPill({ isFetching, isError, dataUpdatedAt }: LoadingPillProps) {
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
    if (isError) {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setShow(false);
      return;
    }
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
  }, [isFetching, isError, dataUpdatedAt]);

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
      className="absolute top-3 left-1/2 -translate-x-1/2 z-floating-buttons px-4 py-2 rounded-pill bg-glass-standard backdrop-blur-standard shadow-button-float text-body-sm text-text-muted"
    >
      {t('loadingPlaces')}
    </div>
  );
}

function venueIdentityKey(venue: Pick<VenueDataDto, 'id' | 'slug' | 'venueSlug'> | null): string | null {
  if (!venue) return null;
  return `${venue.id}:${venue.slug}:${venue.venueSlug}`;
}

function openDirections(venue: VenueDataDto): void {
  const destination = Number.isFinite(venue.location.lat) && Number.isFinite(venue.location.lng)
    ? `${venue.location.lat},${venue.location.lng}`
    : venue.venueName;
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`,
    '_blank',
    'noopener,noreferrer',
  );
}

function MapVenueError({ onRetry }: { onRetry: () => unknown }) {
  const t = useTranslations('map');
  return (
    <div
      role="alert"
      data-testid="map-error-inline"
      className="absolute top-3 left-4 right-4 z-floating-buttons mx-auto flex max-w-[min(22rem,calc(100%-2rem))] items-center justify-between gap-3 rounded-card bg-surface-cream px-4 py-3 text-body-sm text-text-body shadow-card lg:left-1/2 lg:right-auto lg:-translate-x-1/2"
    >
      <span>{t('loadFailed')} </span>
      <button
        type="button"
        onClick={() => {
          void onRetry();
        }}
        className="min-h-11 shrink-0 rounded-pill px-4 text-label-lg text-amber-dark outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
      >
        {t('retry')}
      </button>
    </div>
  );
}

