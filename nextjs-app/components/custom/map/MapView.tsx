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
import { RouteOverlay, type RouteOverlayLabels } from '@/components/custom/routing/RouteOverlay';
import {
  VenueListControls,
  type VenueListModeSelection,
  type VenueListSortMode,
} from '@/components/composed/venue/VenueListControls';
import { FavouritesList } from '@/components/custom/favourites/FavouritesList';
import { FeedbackFlow } from '@/components/custom/feedback/FeedbackFlow';
import { ReviewFlow } from '@/components/custom/feedback/ReviewFlow';
import { VenueSearchShell } from '@/components/custom/search/VenueSearchShell';
import { resolveForcedVisualVenueDetail } from '@/components/custom/venue/forced-venue-detail';
import { TimeSliderPanel } from '@/components/custom/time/TimeSliderPanel';
import { isVenueSunnyForList, VenueList } from '@/components/custom/venue/VenueList';
import { useVenueDetail } from '@/hooks/queries/useVenueDetail';
import { isVenueNotFoundError } from '@/hooks/queries/venue-query-options';
import { useFavouriteVenues } from '@/hooks/queries/useFavouriteVenues';
import { useVenueSearch } from '@/hooks/queries/useVenueSearch';
import { useFavourites } from '@/hooks/useFavourites';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useMapInstance } from '@/lib/contexts/MapInstanceContext';
import { useMapSelection } from '@/lib/contexts/MapSelectionContext';
import { useTimeContext } from '@/lib/contexts/TimeContext';
import { type VenuePinData } from '@/lib/types/map';
import type { SunFreshnessMeta, VenueDataDto } from '@/lib/types/api';
import { getConfidenceDisplayState } from '@/lib/utils/confidence-display';
import {
  getPredictionUncertaintyDisplay,
  type PredictionUncertaintyDisplayLabels,
} from '@/lib/utils/prediction-uncertainty-display';
import type { RouteOverlayConfidence } from '@/components/custom/routing/RouteOverlay';
import {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsSearchUrl,
  buildNativeDirectionsUrl,
  getRouteSummary,
  resolveRoutingPlatform,
  type CardinalDirection,
  type RouteSummary,
} from '@/lib/services/routing';
import { DURATION_FLY_MS } from '@/lib/constants/animation';
import { useForcedState } from '@/lib/dev/use-forced-state';
import { cn } from '@/lib/utils';
import { isStyleResourceUrl } from '@/lib/utils/map-errors';
import { mapVenueDtoToPinData } from '@/lib/utils/venue-pin-mapping';
import { OfflineBanner } from '@/components/custom/offline/OfflineBanner';
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
  const isOnline = useOnlineStatus();
  // Offline shell (Story 7.3 AC3/AC4/AC7): render the cached map background +
  // "Ingen anslutning" banner and hide ALL venue data when the device is
  // offline OR the dev `map-primary-offline` state is forced. This is computed
  // here, alongside the other hooks, so the venue-data tree can be gated in
  // the single return below without ever changing hook order. The TanStack
  // Query layer pauses its fetches while offline and resumes them when the
  // `online` event flips `isOnline`, so reconnect reloads venue data through
  // the existing query flow without a hand-rolled fetch.
  const showOfflineShell = forcedState === 'map-primary-offline' || !isOnline;
  const venueSlugParam = searchParams.get('venue');
  const [quickInfoPosition, setQuickInfoPosition] = useState<{ x: number; y: number } | undefined>();
  const [quickInfoDesktopPlacement, setQuickInfoDesktopPlacement] =
    useState<VenueQuickInfoDesktopPlacement>('above');
  const [mobileSheetState, setMobileSheetState] =
    useState<MobileBottomSheetState>('mid');
  const [venueSortMode, setVenueSortMode] = useState<VenueListSortMode>('sun');
  const [routeOverlay, setRouteOverlay] = useState<{
    venueId: string;
    labels: RouteOverlayLabels;
    fallbackHref: string;
  } | null>(null);
  const [routeLoadingVenueId, setRouteLoadingVenueId] = useState<string | null>(null);
  const hasHandledFavouritesRouteEntryRef = useRef(false);
  const routeLoadingTimerRef = useRef<number | null>(null);
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
  const activeFavouriteVenueRows = listMode === 'favourites'
    ? favouriteVenueRows
    : EMPTY_VENUES;
  const selectedPreviewSlug = selectedVenuePreview?.slug || selectedVenuePreview?.venueSlug || null;
  const selectedPreviewIsInCurrentRows = useMemo(() => {
    if (!selectedVenuePreview) return false;
    if (Array.isArray(rawVenues) && rawVenues.some((venue) => venue.id === selectedVenuePreview.id)) {
      return true;
    }
    return activeFavouriteVenueRows.some((venue) => venue.id === selectedVenuePreview.id);
  }, [activeFavouriteVenueRows, rawVenues, selectedVenuePreview]);
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

    for (const favouriteVenue of activeFavouriteVenueRows) {
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
  }, [activeFavouriteVenueRows, rawVenues, selectedVenuePreviewForMap]);
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
  const feedbackVenue = (forcedVisualVenueDetail || !venueDetailQuery.isPlaceholderData)
    ? detailVenue
    : null;
  const renderFeedbackSlot = (slotKey: string) => (
    feedbackVenue && (forcedState === 'feedback' || plannerTime.isLiveNow)
      ? (
          <FeedbackFlow
            key={`feedback-${slotKey}-${feedbackVenue.id}`}
            venue={feedbackVenue}
            plannerTimestamp={plannerTime.currentTime.toISOString()}
            isLivePlannerTime={plannerTime.isLiveNow}
          />
        )
      : null
  );
  const detailFallback = useMemo((): {
    venue: VenueDataDto;
    isSynthetic: boolean;
  } | null => {
    if (!venueSlugParam) return null;
    if (detailVenue) return { venue: detailVenue, isSynthetic: false };
    if (Array.isArray(rawVenues)) {
      const listVenue = rawVenues.find((venue) => venueMatchesSlug(venue, venueSlugParam));
      if (listVenue) return { venue: listVenue, isSynthetic: false };
    }
    const favouriteVenue = activeFavouriteVenueRows.find((venue) => venueMatchesSlug(venue, venueSlugParam));
    if (favouriteVenue) return { venue: favouriteVenue, isSynthetic: false };
    if (selectedVenueDto && venueMatchesSlug(selectedVenueDto, venueSlugParam)) {
      return { venue: selectedVenueDto, isSynthetic: false };
    }
    if (venueDetailQuery.isFetching) {
      // Synthetic skeleton venue fabricated from the slug while the detail
      // request is in flight — placeholder fields only, no real data.
      return { venue: fallbackVenueFromSlug(venueSlugParam), isSynthetic: true };
    }
    return null;
  }, [
    detailVenue,
    activeFavouriteVenueRows,
    rawVenues,
    selectedVenueDto,
    venueDetailQuery.isError,
    venueDetailQuery.isFetching,
    venueSlugParam,
  ]);
  const detailFallbackVenue = detailFallback?.venue ?? null;
  const isSyntheticDetailFallback = detailFallback?.isSynthetic ?? false;
  const reviewVenue = (forcedVisualVenueDetail || !venueDetailQuery.isPlaceholderData)
    ? (detailVenue ?? detailFallbackVenue)
    : detailFallbackVenue;
  const renderReviewSlot = (slotKey: string) => (
    reviewVenue
      ? (
          <ReviewFlow
            key={`review-${slotKey}-${reviewVenue.id}`}
            venue={reviewVenue}
            instanceId={slotKey}
          />
        )
      : null
  );
  const detailFavouriteId = useMemo(() => {
    if (!venueSlugParam) return undefined;
    const candidates = [
      detailVenue,
      selectedVenueDto,
      ...activeFavouriteVenueRows,
      ...(Array.isArray(rawVenues) ? rawVenues : []),
    ];
    return candidates.find((venue) => venueMatchesSlug(venue, venueSlugParam))?.id;
  }, [activeFavouriteVenueRows, detailVenue, rawVenues, selectedVenueDto, venueSlugParam]);
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
    : selectedVenueId && activeFavouriteVenueRows.some((venue) => venue.id === selectedVenueId)
    ? (favouriteListConfidenceMeta ?? venueQuery.data?.meta)
    : venueQuery.data?.meta;
  const quickInfoSunWindowTemplate = tVenue('quickInfo.sunWindow', {
    start: '{start}',
    end: '{end}',
  });
  const routeText = routeLabels(tVenue);
  const quickInfoRouteSummary = selectedQuickInfoVenue
    ? getRouteSummary({ venue: selectedQuickInfoVenue, origin: geolocation.coords })
    : null;
  const quickInfoRouteEstimateLabel = quickInfoRouteSummary
    ? routeEstimateLabel(quickInfoRouteSummary.walkMinutes, routeText.walkEstimateCompact)
    : undefined;
  const detailRouteVenue = detailFallbackVenue
    ? (detailVenue ?? detailFallbackVenue)
    : null;
  const detailRouteSummary = detailRouteVenue
    ? getRouteSummary({ venue: detailRouteVenue, origin: geolocation.coords })
    : null;
  const detailRouteEstimateLabel = detailRouteSummary
    ? routeEstimateLabel(detailRouteSummary.walkMinutes, routeText.walkEstimate)
    : undefined;
  const activeRouteVenueId = isVenueDetailRequested
    ? (detailRouteVenue?.id ?? null)
    : (selectedQuickInfoVenue?.id ?? selectedVenueDto?.id ?? null);

  useEffect(() => {
    setDesktopListMode(isFavouritesRoute ? 'favourites' : 'near');
  }, [isFavouritesRoute]);

  useEffect(() => {
    return () => {
      if (routeLoadingTimerRef.current !== null) {
        window.clearTimeout(routeLoadingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setRouteOverlay((current) => {
      if (!current || current.venueId === activeRouteVenueId) return current;
      return null;
    });
  }, [activeRouteVenueId]);

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
    handleRouteVenue(venue, quickInfoConfidenceMeta);
  };

  const handleRouteDetailVenue = () => {
    if (!detailRouteVenue) return;
    // The synthetic loading-fallback venue hardcodes placeholder fields
    // (confidence: 0); withholding the freshness meta keeps the confidence
    // display hidden instead of inventing "0%" for an unfetched venue.
    handleRouteVenue(
      detailRouteVenue,
      isSyntheticDetailFallback ? undefined : detailConfidenceMeta,
    );
  };

  const handleRouteVenue = (venue: VenueDataDto, confidenceMeta?: SunFreshnessMeta) => {
    const summary = getRouteSummary({ venue, origin: geolocation.coords });
    const platform = typeof navigator === 'undefined'
      ? 'google'
      : resolveRoutingPlatform({
          userAgent: navigator.userAgent,
          maxTouchPoints: navigator.maxTouchPoints,
        });
    const directionsUrl = buildNativeDirectionsUrl(venue, platform);
    setRouteOverlay({
      venueId: venue.id,
      labels: routeOverlayLabels(venue, summary, routeText, confidenceMeta),
      fallbackHref: buildGoogleMapsDirectionsUrl(venue),
    });
    setRouteLoadingVenueId(venue.id);
    if (routeLoadingTimerRef.current !== null) {
      window.clearTimeout(routeLoadingTimerRef.current);
    }
    routeLoadingTimerRef.current = window.setTimeout(() => {
      setRouteLoadingVenueId((current) => current === venue.id ? null : current);
      routeLoadingTimerRef.current = null;
    }, 200);
    window.open(directionsUrl, '_blank', 'noopener,noreferrer');
  };
  const handleSortModeChange = (mode: VenueListSortMode) => {
    if (listMode === 'favourites') return;
    setVenueSortMode(mode);
  };

  // Story 3.4 AC #2: a failed venue-detail request must surface a localized
  // not-found/retry state instead of silently unmounting the overlay.
  //  - No fallback content (pure deep link): 404 → not-found + back to map;
  //    other errors → retry + back to map.
  //  - Fallback content rendering (venue known from list/favourites rows):
  //    the overlay already shows degraded localized content, so only a
  //    retry affordance is added for transient errors; a 404 is suppressed
  //    because contradicting visible venue content would mislead.
  const detailErrorNotice = (() => {
    if (!canRequestVenueDetail) return null;
    // A present-but-blank/whitespace `?venue=` slug never triggers a fetch
    // (useVenueDetail disables the query on an empty trimmed slug), so it
    // would otherwise strand a dead param with no surface. Treat it as a
    // not-found, exactly like a 404 from a real lookup, so the user always
    // gets a way back to the map (AC #2 invalid-slug clause).
    const slugIsBlank =
      venueSlugParam !== null && venueSlugParam.trim().length === 0;
    if (!slugIsBlank) {
      if (!venueDetailQuery.isError) return null;
      // While a retry is in flight the loading skeleton renders instead; the
      // notice returns only once the refetch settles, so its variant never
      // flips under the user's pointer mid-request.
      if (venueDetailQuery.isFetching) return null;
    }
    // A map-level venue failure renders MapVenueError in the same slot;
    // don't stack a second alert on top of its retry action.
    if (venueQuery.isError) return null;
    const isNotFound = slugIsBlank || isVenueNotFoundError(venueDetailQuery.error);
    if (detailFallbackVenue) {
      return isNotFound ? null : { isNotFound: false, showBack: false };
    }
    return { isNotFound, showBack: true };
  })();

  return (
    <div className="relative h-dvh lg:h-[calc(100dvh-var(--size-desktop-nav-h))] w-full">
      <MapContainer />
      {/* Offline shell (Story 7.3): keep the cached map background but hide
          every venue-data surface (pins, search, sheet, list, overlays,
          controls, errors) so only the map + "Ingen anslutning" banner show. */}
      {!showOfflineShell && (
        <>
      <VenuePinLayer venues={venues} />
      {!isForcedVisualReference && (
        <VenueSearchShell
          variant="mobile"
          className="absolute left-4 right-4 top-[calc(env(safe-area-inset-top)+var(--spacing)*3)] z-bottom-sheet-full"
          onVenueSelected={() => setMobileSheetState('peek')}
        />
      )}
      <TimeSliderPanel
        variant="mobile"
        className="absolute left-4 right-4 top-[calc(env(safe-area-inset-top)+var(--spacing)*18)]"
      />
      {/* Desktop planner mirrors the Claude Design reference (src-desktop/
          App.jsx): a contained bar offset to clear the 340px venue list on the
          left, shrinking from the right by the 390px detail panel's width when
          it is open — NOT the full-bleed `left-4 right-4` it originally shipped
          as. Tokens: --size-venue-list-desktop-w, --size-venue-detail-panel-w. */}
      <TimeSliderPanel
        variant="desktop"
        className={cn(
          'absolute bottom-6 left-[calc(var(--size-venue-list-desktop-w)+1rem)] transition-[right] duration-200 ease-default motion-reduce:transition-none',
          isVenueDetailRequested
            ? 'right-[calc(var(--size-venue-detail-panel-w)+1rem)]'
            : 'right-4',
        )}
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
            labels={venueDetailLabels(tVenue)}
            onDismiss={handleDismissDetails}
            onRoute={handleRouteDetailVenue}
            routeEstimateLabel={detailRouteEstimateLabel}
            isRouteLoading={routeLoadingVenueId === detailRouteVenue?.id}
            isFavourite={detailFavouriteId ? favourites.isFavourite(detailFavouriteId) : false}
            onFavouriteToggle={
              detailFavouriteId ? () => favourites.toggleFavourite(detailFavouriteId) : undefined
            }
            locale={locale}
            feedbackSlot={renderFeedbackSlot('mobile')}
            reviewSlot={renderReviewSlot('mobile')}
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
            labels={venueDetailLabels(tVenue)}
            onDismiss={handleDismissDetails}
            onRoute={handleRouteDetailVenue}
            routeEstimateLabel={detailRouteEstimateLabel}
            isRouteLoading={routeLoadingVenueId === detailRouteVenue?.id}
            isFavourite={detailFavouriteId ? favourites.isFavourite(detailFavouriteId) : false}
            onFavouriteToggle={
              detailFavouriteId ? () => favourites.toggleFavourite(detailFavouriteId) : undefined
            }
            locale={locale}
            feedbackSlot={renderFeedbackSlot('desktop')}
            reviewSlot={renderReviewSlot('desktop')}
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
            predictionUncertainty={selectedQuickInfoVenue?.predictionUncertainty}
            sunExposurePercent={selectedQuickInfoVenue?.sunExposurePercent}
            distanceMeters={selectedQuickInfoVenue?.distanceMeters}
            thumbnail={selectedQuickInfoVenue?.thumbnail}
            isLoadingSunData={!selectedQuickInfoVenue}
            position={quickInfoPosition}
            onDismiss={() => selectVenue(null)}
            onOpenDetails={handleOpenDetails}
            onRoute={handleRouteSelectedVenue}
            routeEstimateLabel={quickInfoRouteEstimateLabel}
            isRouteLoading={routeLoadingVenueId === selectedQuickInfoVenue?.id}
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
            predictionUncertainty={selectedQuickInfoVenue?.predictionUncertainty}
            sunExposurePercent={selectedQuickInfoVenue?.sunExposurePercent}
            distanceMeters={selectedQuickInfoVenue?.distanceMeters}
            thumbnail={selectedQuickInfoVenue?.thumbnail}
            isLoadingSunData={!selectedQuickInfoVenue}
            position={quickInfoPosition}
            desktopPlacement={quickInfoDesktopPlacement}
            onDismiss={() => selectVenue(null)}
            onOpenDetails={handleOpenDetails}
            onRoute={handleRouteSelectedVenue}
            routeEstimateLabel={quickInfoRouteEstimateLabel}
            isRouteLoading={routeLoadingVenueId === selectedQuickInfoVenue?.id}
            isFavourite={selectedQuickInfoVenue ? favourites.isFavourite(selectedQuickInfoVenue.id) : false}
            onFavouriteToggle={
              selectedQuickInfoVenue
                ? () => favourites.toggleFavourite(selectedQuickInfoVenue.id)
                : undefined
            }
            labels={quickInfoLabels(tVenue)}
          />
        )}
        {routeOverlay && (
          <RouteOverlay
            key={routeOverlay.venueId}
            labels={routeOverlay.labels}
            fallbackHref={routeOverlay.fallbackHref}
            onDismiss={() => setRouteOverlay(null)}
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
      {detailErrorNotice && (
        <VenueDetailError
          isNotFound={detailErrorNotice.isNotFound}
          showBack={detailErrorNotice.showBack}
          onRetry={() => {
            void venueDetailQuery.refetch();
          }}
          onBack={handleDismissDetails}
        />
      )}
        </>
      )}
      <OfflineBanner visible={showOfflineShell} />
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
    routeLoading: t('route.loading'),
    favouriteAdd: t('list.favouriteAdd'),
    favouriteRemove: t('list.favouriteRemove'),
    uncertainty: predictionUncertaintyLabels(t),
  };
}

function venueDetailLabels(t: ReturnType<typeof useTranslations<'venue'>>) {
  return {
    close: t('detail.close'),
    favourite: t('detail.favourite'),
    favouriteAdd: t('detail.favouriteAdd'),
    favouriteRemove: t('detail.favouriteRemove'),
    share: t('detail.share'),
    sectionTitle: t('detail.sectionTitle'),
    peakTime: t('detail.peakTime', { time: '{time}' }),
    bestWindow: t('detail.bestWindow', { start: '{start}', end: '{end}' }),
    openMaps: t('detail.openMaps'),
    route: t('detail.route'),
    routeLoading: t('route.loading'),
    photoPlaceholder: t('detail.photoPlaceholder'),
    loading: t('detail.loading'),
    detailsUnavailable: t('detail.detailsUnavailable'),
    openingHours: t('detail.openingHours'),
    address: t('detail.address'),
    shadowWarning: t('detail.shadowWarning', { minutes: '{minutes}' }),
    sunBadge: t('detail.sunBadge', { percent: '{percent}' }),
    confidence: t('detail.confidence'),
    confidenceApproximate: t('detail.confidenceApproximate'),
    confidenceUnavailable: t('detail.confidenceUnavailable'),
    city: t('detail.city'),
    openUntil: t('detail.openUntil', { time: '{time}' }),
    placeholderImageShort: t('detail.placeholderImageShort'),
    facts: {
      distance: t('detail.facts.distance'),
      exposure: t('detail.facts.exposure'),
      bestAt: t('detail.facts.bestAt'),
      outdoorSeats: t('detail.facts.outdoorSeats'),
    },
    timeline: {
      ariaLabel: t('detail.timeline.ariaLabel'),
      currentTime: t('detail.timeline.currentTime', { time: '{time}' }),
      sunnyWindow: t('detail.timeline.sunnyWindow', { start: '{start}', end: '{end}' }),
      partialWindow: t('detail.timeline.partialWindow', { start: '{start}', end: '{end}' }),
      shadedWindow: t('detail.timeline.shadedWindow', { start: '{start}', end: '{end}' }),
    },
    uncertainty: predictionUncertaintyLabels(t),
  };
}

function routeLabels(t: ReturnType<typeof useTranslations<'venue'>>) {
  return {
    overlayTitle: t('route.overlayTitle', { name: '{name}' }),
    loading: t('route.loading'),
    walkEstimate: t('route.walkEstimate', { minutes: '{minutes}' }),
    walkEstimateCompact: t('route.walkEstimateCompact', { minutes: '{minutes}' }),
    bikeEstimate: t('route.bikeEstimate', { minutes: '{minutes}' }),
    unavailable: t('route.unavailable'),
    openMaps: t('route.openMaps'),
    close: t('route.close'),
    confidence: t('route.confidence'),
    confidenceApproximate: t('route.confidenceApproximate'),
    confidenceUnavailable: t('route.confidenceUnavailable'),
    uncertainty: predictionUncertaintyLabels(t),
    directionFallback: t('route.directionFallback', { neighborhood: '{neighborhood}' }),
    directions: {
      north: t('route.directions.north'),
      northeast: t('route.directions.northeast'),
      east: t('route.directions.east'),
      southeast: t('route.directions.southeast'),
      south: t('route.directions.south'),
      southwest: t('route.directions.southwest'),
      west: t('route.directions.west'),
      northwest: t('route.directions.northwest'),
    } satisfies Record<CardinalDirection, string>,
  };
}

function routeOverlayLabels(
  venue: VenueDataDto,
  summary: RouteSummary,
  labels: ReturnType<typeof routeLabels>,
  confidenceMeta?: SunFreshnessMeta,
): RouteOverlayLabels {
  return {
    title: formatLabel(labels.overlayTitle, { name: venue.venueName }),
    walk: routeEstimateLabel(summary.walkMinutes, labels.walkEstimate) ?? null,
    bike: routeEstimateLabel(summary.bikeMinutes, labels.bikeEstimate) ?? null,
    direction: routeDirectionLabel(summary.direction, venue.neighborhood, labels),
    confidence: routeConfidenceLabel(venue, labels, confidenceMeta),
    close: labels.close,
    fallback: labels.openMaps,
    unavailable: labels.unavailable,
  };
}

/**
 * The route overlay's "confidence context" reuses the exact public
 * confidence/uncertainty presentation already shown on venue surfaces
 * (Story 3.0.6 contract). When the public display is hidden (no fresh
 * weather metadata, geometry-only source) the overlay shows nothing
 * rather than inventing a number. The accessible variant spells out the
 * approximate qualifier ("Säkerhet cirka 88%") that the visible "~" glyph
 * does not convey to screen readers.
 */
function routeConfidenceLabel(
  venue: VenueDataDto,
  labels: ReturnType<typeof routeLabels>,
  confidenceMeta?: SunFreshnessMeta,
): RouteOverlayConfidence | null {
  const confidenceDisplay = getConfidenceDisplayState({
    confidence: venue.confidence,
    meta: confidenceMeta,
    labels: {
      confidence: labels.confidence,
      approximate: labels.confidenceApproximate,
      unavailable: labels.confidenceUnavailable,
    },
  });
  const uncertaintyDisplay = getPredictionUncertaintyDisplay({
    predictionUncertainty: venue.predictionUncertainty,
    labels: labels.uncertainty,
  });
  const uncertaintyLabel = uncertaintyDisplay?.visibleLabel ?? null;
  const visibleParts = [
    confidenceDisplay.visibleText
      ? `${labels.confidence} ${confidenceDisplay.visibleText}`
      : null,
    uncertaintyLabel,
  ].filter(Boolean);
  if (visibleParts.length === 0) return null;
  // `accessibleText` is always populated (the confidence value for the
  // exact/approximate kinds, the "unavailable" label for the hidden kind).
  // Include it unconditionally so a hidden-confidence-with-uncertainty row
  // still announces "Säkerhet saknas" to screen readers, matching the
  // VenueQuickInfo surface that shares this Story 3.0.6 helper.
  const accessibleParts = [
    confidenceDisplay.accessibleText,
    uncertaintyLabel,
  ].filter(Boolean);
  return {
    visible: visibleParts.join(' · '),
    accessible: accessibleParts.join(' · '),
  };
}

function routeEstimateLabel(minutes: number | null, template: string): string | undefined {
  if (minutes === null) return undefined;
  return formatLabel(template, { minutes: String(minutes) });
}

function routeDirectionLabel(
  direction: CardinalDirection | null,
  neighborhood: string | undefined,
  labels: ReturnType<typeof routeLabels>,
): string | null {
  if (direction) return labels.directions[direction];
  const trimmedNeighborhood = neighborhood?.trim();
  if (trimmedNeighborhood) {
    return formatLabel(labels.directionFallback, { neighborhood: trimmedNeighborhood });
  }
  return null;
}

function predictionUncertaintyLabels(
  t: ReturnType<typeof useTranslations<'venue'>>,
): PredictionUncertaintyDisplayLabels {
  return {
    description: t('uncertainty.description'),
    accessible: t('uncertainty.accessible', {
      label: '{label}',
      description: '{description}',
    }),
    levels: {
      low: t('uncertainty.levels.low'),
      medium: t('uncertainty.levels.medium'),
      high: t('uncertainty.levels.high'),
    },
    short: {
      building_shadow_coverage: t('uncertainty.short.building_shadow_coverage'),
      obstruction: t('uncertainty.short.obstruction'),
      weather: t('uncertainty.short.weather'),
      other: t('uncertainty.short.other'),
    },
    reasons: {
      building_shadow_coverage: t('uncertainty.reasons.building_shadow_coverage'),
      vegetation: t('uncertainty.reasons.vegetation'),
      awning: t('uncertainty.reasons.awning'),
      umbrella: t('uncertainty.reasons.umbrella'),
      bridge: t('uncertainty.reasons.bridge'),
      temporary_structure: t('uncertainty.reasons.temporary_structure'),
      seasonal_furniture: t('uncertainty.reasons.seasonal_furniture'),
      weather: t('uncertainty.reasons.weather'),
      other: t('uncertainty.reasons.other'),
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

/**
 * Localized venue-detail not-found/error notice (Story 3.4 AC #2). Uses
 * `z-toast` so the retry affordance stays reachable above an open detail
 * overlay when fallback content is rendering behind a failed detail query.
 */
function VenueDetailError({
  isNotFound,
  showBack,
  onRetry,
  onBack,
}: {
  isNotFound: boolean;
  showBack: boolean;
  onRetry: () => void;
  onBack: () => void;
}) {
  const t = useTranslations('venue');
  return (
    <div
      role="alert"
      data-testid="venue-detail-error"
      className="absolute top-3 left-4 right-4 z-toast mx-auto flex max-w-[min(22rem,calc(100%-2rem))] flex-wrap items-center justify-between gap-2 rounded-card bg-surface-cream px-4 py-3 text-body-sm text-text-body shadow-card lg:left-1/2 lg:right-auto lg:-translate-x-1/2"
    >
      <span>{isNotFound ? t('detail.notFound') : t('detail.loadFailed')}</span>
      <span className="flex shrink-0 items-center gap-1">
        {!isNotFound && (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 shrink-0 rounded-pill px-3 text-label-lg text-amber-dark outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
          >
            {t('detail.retry')}
          </button>
        )}
        {showBack && (
          <button
            type="button"
            onClick={onBack}
            className="min-h-11 shrink-0 rounded-pill px-3 text-label-lg text-amber-dark outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
          >
            {t('detail.backToMap')}
          </button>
        )}
      </span>
    </div>
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

