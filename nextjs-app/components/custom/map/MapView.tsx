'use client';

import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'motion/react';
import { LoaderCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import {
  VenueQuickInfo,
  type VenueQuickInfoDesktopPlacement,
} from '@/components/composed/venue/VenueQuickInfo';
import {
  MobileBottomSheet,
  type MobileBottomSheetMetrics,
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
import {
  isForcedVenuePhotoState,
  resolveForcedVisualVenueDetail,
  withForcedVenuePhotoThumbnail,
} from '@/components/custom/venue/forced-venue-detail';
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
import { useTagFilter } from '@/lib/contexts/TagFilterContext';
import { useTimeContext } from '@/lib/contexts/TimeContext';
import { type VenuePinData } from '@/lib/types/map';
import type { VenueDataDto } from '@/lib/types/api';
import {
  getPredictionUncertaintyDisplay,
  type PredictionUncertaintyDisplayLabels,
} from '@/lib/utils/prediction-uncertainty-display';
import type { RouteOverlayUncertainty } from '@/components/custom/routing/RouteOverlay';
import {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsSearchUrl,
  buildNativeDirectionsUrl,
  getRouteSummary,
  resolveRoutingPlatform,
  type CardinalDirection,
  type RouteSummary,
} from '@/lib/services/routing';
import { DURATION_FAST_S, DURATION_FLY_MS, EASE_ENTER } from '@/lib/constants/animation';
import { useForcedState } from '@/lib/dev/use-forced-state';
import { cn } from '@/lib/utils';
import { isStyleResourceUrl } from '@/lib/utils/map-errors';
import { mapVenueDtoToPinData } from '@/lib/utils/venue-pin-mapping';
import { deriveVenueSunAtMinutes } from '@/lib/utils/venue-day-series';
import { formatOpeningHours } from '@/lib/utils/opening-hours';
import { venuePlannerQueryArgs } from '@/lib/utils/venue-query-planner';
import { collectTags, filterVenuesByTags } from '@/lib/utils/venue-tags';
import { MobileTagChips } from '@/components/composed/venue/MobileTagChips';
import { OfflineBanner } from '@/components/custom/offline/OfflineBanner';
import { MapContainer } from './MapContainer';
import { MapLoadingFallback } from './MapLoadingFallback';
import { VenuePinLayer } from './VenuePinLayer';
import { UserLocationLayer } from './UserLocationLayer';
import { MapControls } from './MapControls';

const SLOW_LOAD_PILL_MS = 3000;
const SEARCH_RADIUS_KM = 1.5;
const QUICK_INFO_DESKTOP_WIDTH = 280;
const QUICK_INFO_DESKTOP_HEIGHT_ESTIMATE = 260;
const QUICK_INFO_DESKTOP_PIN_GAP = 56;
const QUICK_INFO_DESKTOP_VIEWPORT_GUTTER = 16;
const QUICK_INFO_MOBILE_WIDTH = 230;
const QUICK_INFO_MOBILE_HEIGHT_ESTIMATE = 170;
// The anchored mobile card renders ABOVE the pin via
// `translate(-50%, calc(-100% - 40px))` (VenueQuickInfo). So for a projected
// pin at `y`, the card's rendered TOP edge is `y - cardHeight - 40`. This gap
// must match the transform's `40px` so the clearance math below stays honest.
const QUICK_INFO_MOBILE_ANCHOR_GAP = 40;
const QUICK_INFO_MOBILE_VIEWPORT_GUTTER = 16;
// Story 9.9 AC3 — planner-panel collision. The mobile "Planera soltid"
// TimeSliderPanel is positioned at `top: safe-area + var(--spacing)*18`
// (= safe-area + 72px) and the mobile search shell sits above it. The smoke
// test found the quick-info card's sun-% badge jamming UNDER the slider, so we
// derive the card's minimum `y` from the planner-panel BOTTOM rather than a
// bare magic clearance: the card TOP (`y - cardHeight - 40`) must sit at least
// one gutter BELOW the planner bottom at common mobile heights.
//   planner bottom ≈ SAFE_AREA_MAX + PLANNER_TOP_OFFSET + PLANNER_HEIGHT
// SAFE_AREA_MAX covers the tallest common notch inset (~59px); PLANNER_TOP_OFFSET
// mirrors `var(--spacing)*18 = 72px`. The planner height itself is measured from
// the rendered mobile TimeSliderPanel during layout, because font metrics,
// compact date text, and safe-area/browser chrome can change the actual panel
// box. Keep the offset in sync with TimeSliderPanel's mobile `top-[…*18]`.
const MOBILE_SAFE_AREA_MAX_PX = 59;
const MOBILE_PLANNER_TOP_OFFSET_PX = 72;
const MOBILE_NAV_HEIGHT_PX = 52;
const EMPTY_VENUES: VenueDataDto[] = [];
const DEFAULT_MOBILE_SHEET_METRICS: MobileBottomSheetMetrics = {
  visibleRows: 3,
  maxRows: 3,
  rowCount: 3,
  rowHeightPx: 88,
  chromeHeightPx: 104,
  handleHeightPx: 44,
  safeAreaInsetBottomPx: 0,
  sheetHeightPx: 416,
  maxSheetHeightPx: 416,
};
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
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const geolocation = useGeolocation();
  const { mapInstance } = useMapInstance();
  const { selectedVenueId, selectedVenuePreview, selectVenue } = useMapSelection();
  const { activeTags, isActive: isTagActive, toggleTag } = useTagFilter();
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
  const mobilePlannerPanelRef = useRef<HTMLElement | null>(null);
  const [mobilePlannerHeightPx, setMobilePlannerHeightPx] = useState(0);
  const [mobileSheetVisibleRows, setMobileSheetVisibleRows] = useState(3);
  const [mobileSheetMetrics, setMobileSheetMetrics] =
    useState<MobileBottomSheetMetrics>(DEFAULT_MOBILE_SHEET_METRICS);
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
  const measureMobilePlannerHeight = useCallback(() => {
    const nextHeight = measuredElementHeight(mobilePlannerPanelRef.current);
    if (nextHeight <= 0) return;
    setMobilePlannerHeightPx((previous) =>
      previous === nextHeight ? previous : nextHeight,
    );
  }, []);

  useLayoutEffect(() => {
    measureMobilePlannerHeight();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const node = mobilePlannerPanelRef.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(() => measureMobilePlannerHeight());
    observer.observe(node);
    return () => observer.disconnect();
  }, [measureMobilePlannerHeight]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => measureMobilePlannerHeight();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [measureMobilePlannerHeight]);
  // Story 10.2 (Task 5): `map-with-obscured-venue` is the deterministic
  // obscured force-state — a sibling of `map-with-selected-venue` that
  // normalizes the selected venue + pin to the weather-gated CloudObscured
  // state (+ `skyCondition: 'overcast'`) so the muted pin/quick-info surface
  // is reachable on the fixture/CI path WITHOUT live Met.no weather.
  const isForcedObscuredReference = forcedState === 'map-with-obscured-venue';
  const isForcedObscuredDetailReference = forcedState === 'venue-detail-obscured';
  const isForcedPhotoReference = isForcedVenuePhotoState(forcedState);
  const isForcedVisualReference =
    forcedState === 'map-primary' ||
    forcedState === 'map-panel-venues' ||
    forcedState === 'map-with-selected-venue' ||
    isForcedObscuredReference ||
    isForcedPhotoReference;
  // Story 9.4 AC2: gate the FIRST venue fetch until the user's location has
  // resolved to a real value (`success`) or the centrum fallback. While the
  // status is `idle`/`pending` the fallback-centrum key and the eventual
  // real-GPS key would otherwise both fire — two round-trips on first paint.
  // The gate releases on the FIRST settled status (never waits indefinitely),
  // so a fallback user still gets exactly one prompt fetch at centrum, and a
  // permission-grant-after-fallback transition is masked by `keepPreviousData`.
  const coordsSettled =
    geolocation.status === 'success' || geolocation.status === 'fallback';
  // Story 9.5 AC3: on the Gothenburg-centrum fallback the venue distances are
  // centrum-relative, not a real personal fix — the list annotates them
  // "≈ från centrum" so the number is honest. Only the LABEL changes; the
  // value (still the centrum-relative distance) is never hidden.
  const locationIsApproximate = geolocation.status === 'fallback';
  // Story 11.1 (AC1): the query is keyed on the selected DATE (+ coords), never
  // on the selected TIME — the time dimension is derived client-side from each
  // venue's `sunDaySeries`. So we pass the selected `date`/`time`/`isLiveNow` to
  // the query and let the hook (a) always key on `date`, (b) send date/time only
  // when off-live, (c) poll only when live. A same-date time scrub therefore
  // keeps the SAME key → zero fetch; a date change flips the key → one fetch.
  //
  // Story 9.4 AC3: still DEFER these query-driving args so a rapid drag settles to
  // at most one recompute; the slider thumb + time badge keep updating live off
  // `selectedMinutes`/`selectedTime`. Since time is no longer in the key, the
  // deferral only smooths the request-param/derivation churn — the key itself is
  // stable across a scrub regardless.
  // External-review fix (R-001): the venue-query args are derived by the SHARED
  // `venuePlannerQueryArgs` so MapView, DesktopNavBar, and VenueSearchShell all
  // feed the hooks the IDENTICAL `{ date, time, isLiveNow }` shape. Before, only
  // MapView passed `isLiveNow` (+ date on live-today → the `planner` key) while
  // the nav/search callers spread the raw `plannerQuery` (undefined on live-today
  // → the `list` key) and flipped `list`→`planner` on the first scrub away from
  // live — a hidden fetch during a same-day scrub. One shared derivation makes
  // the three callers un-divergeable.
  const plannerArgs = useMemo(
    () =>
      venuePlannerQueryArgs({
        isLiveNow: plannerTime.isLiveNow,
        plannerQuery: plannerTime.plannerQuery,
        selectedDate: plannerTime.selectedDate,
        selectedTime: plannerTime.selectedTime,
      }),
    [
      plannerTime.isLiveNow,
      plannerTime.plannerQuery,
      plannerTime.selectedDate,
      plannerTime.selectedTime,
    ],
  );
  const deferredPlanner = useDeferredValue(plannerArgs);
  const venueQuery = useVenueSearch({
    lat: geolocation.coords.lat,
    lng: geolocation.coords.lng,
    radiusKm: SEARCH_RADIUS_KM,
    enabled: coordsSettled,
    ...deferredPlanner,
  });
  // Story 9.4 AC1: when the favourited venues are already present in the
  // loaded Närmast list (the common case — the live store holds a handful of
  // venues, so favourites are almost always a subset of what is loaded),
  // render Favoriter by filtering the loaded list rather than firing a fresh
  // `/api/venues?ids=…`. Only fall back to the network favourites query when a
  // favourited id is NOT in the loaded list (a favourite outside the search
  // radius, or a cold `/favoriter` deep link with no list yet). This keeps the
  // Närmast↔Favoriter toggle instant and issues 0 new requests when loaded.
  const loadedVenueIds = useMemo(() => {
    const rows = venueQuery.data?.venues;
    return new Set(Array.isArray(rows) ? rows.map((venue) => venue.id) : []);
  }, [venueQuery.data?.venues]);
  const favouritesAllInLoadedList = favourites.favouriteIds.every((id) =>
    loadedVenueIds.has(id),
  );
  // Enable the network favourites query only when we actually need it: the
  // favourites view is active AND at least one favourited id is missing from
  // the loaded list (so the derive-from-list path cannot cover it). Coordinate
  // gating (AC2) still applies so a cold `/favoriter` entry waits for a
  // settled location before its single fetch.
  const needsFavouriteFetch =
    listMode === 'favourites' && !favouritesAllInLoadedList;
  const favouriteVenueQuery = useFavouriteVenues({
    ids: favourites.favouriteIds,
    lat: geolocation.coords.lat,
    lng: geolocation.coords.lng,
    enabled: coordsSettled && needsFavouriteFetch,
    ...deferredPlanner,
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
  const rawVenuesData = venueQuery.data?.venues;
  // Story 11.1 (AC1): derive every time-dependent surface CLIENT-SIDE from each
  // venue's cached `sunDaySeries` at the live `plannerTime.selectedMinutes`, so a
  // settled time scrub updates pins/lists/quick-info/"Mest sol" ordering WITHOUT
  // any network request (the R-001 headline — "do not dampen the fetch, REMOVE
  // it"). For a venue carrying a series we override `currentSunStatus` +
  // `sunExposurePercent` with the already-gated per-step value (the client NEVER
  // re-gates — it reads the server-emitted series). A venue WITHOUT a series (the
  // seed/fixture path, flag OFF) passes through untouched, keeping the server's
  // single-instant fields. `selectedMinutes` updates live during a drag, so this
  // memo re-derives per scrub step off already-fetched data.
  const rawVenues = useMemo(() => {
    if (!Array.isArray(rawVenuesData)) return rawVenuesData;
    return rawVenuesData.map((venue) =>
      applyDaySeriesDerivation(venue, plannerTime.selectedMinutes),
    );
  }, [rawVenuesData, plannerTime.selectedMinutes]);
  // Story 9.7: apply the shared tag filter to the loaded Närmast list ONCE, so
  // BOTH the venue lists (desktop + mobile) AND the map pins derive from the same
  // filtered source. Pure client `.filter()` over already-fetched data — issues
  // ZERO new network requests (Story 9.4 fetch-hygiene spine untouched). With no
  // active chip this is a pass-through (AC4 no-op: ALL venues, incl. tag-less
  // ones); with ≥1 active chip a venue is kept iff its tags intersect the
  // selection (OR/union — AC3). No match → [] → the existing `venue.list.empty`
  // state renders. The favourites NETWORK path is intentionally left unfiltered
  // (scope decision — see Task 6 Completion Notes): tag filtering is scoped to
  // the Närmast list + pins, avoiding double-filtering the favourites surface.
  const tagFilteredVenues = useMemo(() => {
    if (!Array.isArray(rawVenues)) return rawVenues;
    return filterVenuesByTags(rawVenues, activeTags);
  }, [activeTags, rawVenues]);
  // Story 11.3 (AC1): the mobile tag-chip row shares the desktop data source —
  // the union of the LOADED venues' tags via `collectTags`. Derived from the
  // SAME `venueQuery.data` the desktop nav reads (no second fetch; TanStack
  // de-dupes on the identical key). `allTags` is UNFILTERED (from the loaded
  // set, not `tagFilteredVenues`) so toggling a chip never removes the chips
  // themselves. The orphaned-tag prune (`retainTags`) still runs from the
  // always-mounted `DesktopNavBar` (`hidden lg:flex`, effect fires at every
  // viewport) over the SAME cached union, so a stale mobile filter can never
  // strand the surfaces — no duplicate prune needed here.
  const allTags = useMemo(
    () => collectTags(venueQuery.data?.venues ?? []),
    [venueQuery.data?.venues],
  );
  // Story 9.4 AC1: build the favourites rows by preferring the loaded Närmast
  // list (no extra fetch when the favourites are already loaded — the common
  // case) and only topping up with the network favourites query for ids the
  // loaded list does not cover (out-of-radius favourites / cold `/favoriter`
  // deep link). This keeps the Närmast↔Favoriter toggle instant: when every
  // favourite is in the list cache the favourites query stays disabled and
  // these rows come straight from `rawVenues`.
  const favouriteIdsForRows = favourites.favouriteIds;
  // Story 11.1 AC1 ("both venue lists"): the favourites network payload hits the
  // same real-engine `/api/venues` path, so its rows carry `sunDaySeries` too.
  // Derive the per-step value here — mirroring `rawVenues` — so an out-of-radius
  // favourite or a cold `/favoriter` deep link (present ONLY in the favourites
  // payload, never in the Närmast list cache) tracks a same-date time scrub for
  // both its card figures and its "Mest sol" rank. Without this the top-up rows
  // would render the server's single-instant fields, frozen against the scrub.
  const networkFavouriteRows = useMemo<VenueDataDto[]>(() => {
    const rows = Array.isArray(favouriteVenueQuery.data?.venues)
      ? favouriteVenueQuery.data.venues
      : EMPTY_VENUES;
    if (rows.length === 0) return EMPTY_VENUES;
    return rows.map((venue) =>
      applyDaySeriesDerivation(venue, plannerTime.selectedMinutes),
    );
  }, [favouriteVenueQuery.data?.venues, plannerTime.selectedMinutes]);
  const favouriteVenueRows = useMemo<VenueDataDto[]>(() => {
    const allowed = new Set(favouriteIdsForRows);
    if (allowed.size === 0) return EMPTY_VENUES;
    const seen = new Set<string>();
    const rows: VenueDataDto[] = [];
    // List cache first — these are the freshly-loaded rows for the current
    // coords/planner, so they take precedence over a possibly-stale network
    // favourites payload for the same id.
    if (Array.isArray(rawVenues)) {
      for (const venue of rawVenues) {
        if (allowed.has(venue.id) && !seen.has(venue.id)) {
          seen.add(venue.id);
          rows.push(venue);
        }
      }
    }
    // Top up with any network favourite rows the list did not cover.
    for (const venue of networkFavouriteRows) {
      if (allowed.has(venue.id) && !seen.has(venue.id)) {
        seen.add(venue.id);
        rows.push(venue);
      }
    }
    return rows.length === 0 ? EMPTY_VENUES : rows;
  }, [favouriteIdsForRows, networkFavouriteRows, rawVenues]);
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
    forcedState !== 'map-with-selected-venue' &&
    forcedState !== 'map-with-obscured-venue';
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
    // Story 9.7: pins derive from the tag-filtered Närmast list, so an active
    // chip filters the map pins identically to the venue list (AC3). The
    // favourites-mode rows + the selected-preview venue are still merged in so a
    // selected/favourited pin does not vanish when a chip is toggled.
    const base = Array.isArray(tagFilteredVenues) ? tagFilteredVenues : [];
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
  }, [activeFavouriteVenueRows, tagFilteredVenues, selectedVenuePreviewForMap]);
  const forceSunnyVisualPins = shouldUseForcedSunnyMapPins(forcedState);
  const venues = useMemo<VenuePinData[]>(() => {
    return venueDtosForMap.flatMap((v) => {
      const pin = mapVenueDtoToPinData(v);
      if (!pin) return [];
      // Story 10.2 (Task 5): the obscured force-state normalizes every pin to
      // the muted CloudObscured pill (deterministic obscured surface).
      if (isForcedObscuredReference) return [normalizeForcedObscuredPin(pin)];
      // Story 12.6 visual-defect pass: `venue-detail-obscured` forces the
      // detail DTO for the deep-linked seeded venue into the weather-gated
      // CloudObscured state. Keep that selected map pin coherent with the
      // detail surface without rewriting unrelated background pins.
      if (isForcedObscuredDetailReference && venueMatchesSlug(v, venueSlugParam)) {
        return [normalizeForcedObscuredPin(pin)];
      }
      return forceSunnyVisualPins
        ? [normalizeForcedVisualPin(pin)]
        : [pin];
    });
  }, [
    forceSunnyVisualPins,
    isForcedObscuredDetailReference,
    isForcedObscuredReference,
    venueDtosForMap,
    venueSlugParam,
  ]);
  const selectedVenueDto = useMemo(() => {
    if (!selectedVenueId) return null;
    return venueDtosForMap.find((venue) => venue.id === selectedVenueId) ?? null;
  }, [selectedVenueId, venueDtosForMap]);
  const selectedQuickInfoVenue = useMemo(() => {
    if (!selectedVenueDto) return null;
    if (isForcedObscuredReference) return normalizeForcedObscuredVenue(selectedVenueDto);
    if (isForcedPhotoReference) return normalizeForcedPhotoVenue(selectedVenueDto, forcedState);
    return isForcedVisualReference
      ? normalizeForcedVisualVenue(selectedVenueDto)
      : selectedVenueDto;
  }, [
    forcedState,
    isForcedObscuredReference,
    isForcedPhotoReference,
    isForcedVisualReference,
    selectedVenueDto,
  ]);
  // Story 11.9 (AC2): derive the quick-info "Öppet till HH:MM" line for the CURRENT
  // Stockholm weekday from the list-DTO per-weekday `openingHours`, keeping the
  // component presentational (it renders the pre-derived `display` verbatim).
  // Closed today / no hours → `{}` → the card renders nothing (never fabricated).
  const quickInfoOpeningHours = useMemo(
    () =>
      selectedQuickInfoVenue?.openingHours
        ? formatOpeningHours(
            selectedQuickInfoVenue.openingHours,
            new Date(),
            locale,
            tVenue('quickInfo.openUntilLine', { time: '{time}' }),
          )
        : undefined,
    [selectedQuickInfoVenue, locale, tVenue],
  );
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

  const isForcedRowSheetReference =
    forcedState === 'map-primary' || forcedState === 'map-panel-venues';
  const forcedSheetRows = resolveForcedSheetRows({
    forcedState: isForcedRowSheetReference ? forcedState : null,
    maxRows: mobileSheetMetrics.maxRows,
    rowsParam: isForcedRowSheetReference ? searchParams.get('_sheetRows') : null,
  });
  const forcedSheetDragOffsetPx =
    isForcedRowSheetReference && searchParams.get('_sheetDrag') === 'mid'
      ? Math.round(mobileSheetMetrics.rowHeightPx / 2)
      : 0;

  useEffect(() => {
    if (forcedSheetRows === null) return;
    setMobileSheetVisibleRows(forcedSheetRows);
  }, [forcedSheetRows]);

  useEffect(() => {
    if (forcedSheetRows !== null) return;
    if (listMode === 'favourites' && mobileSheetVisibleRows === 0) {
      const reopenRows = Math.min(3, Math.max(0, mobileSheetMetrics.maxRows));
      if (reopenRows > 0) {
        setMobileSheetVisibleRows(reopenRows);
      }
    }
  }, [forcedSheetRows, listMode, mobileSheetMetrics.maxRows, mobileSheetVisibleRows]);

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
    if (
      forcedState !== 'map-with-selected-venue' &&
      forcedState !== 'map-with-obscured-venue' &&
      !venueSlugParam
    ) {
      return;
    }
    if (!Array.isArray(rawVenues) || rawVenues.length === 0) return;
    const match = venueSlugParam
      ? rawVenues.find((venue) => venueMatchesSlug(venue, venueSlugParam))
      : rawVenues[0];
    if (!match) return;
    selectVenue(match.id, match);
  }, [forcedState, rawVenues, selectVenue, selectedVenuePreview, venueSlugParam]);

  useLayoutEffect(() => {
    // Story 9.10 Task 3: guard against a selected venue whose coordinates are
    // null / non-finite (the `?venue=<slug>` deep-link at :604 selects a match
    // WITHOUT a location check, and real venue rows can carry a null lat/lng
    // despite the `CoordinatesDto` type). Without this guard,
    // `mapInstance.project([null, null])` fires MapLibre's "Expected value to
    // be of type number, but found null" warning — once on the effect run and
    // again on every `move`/`zoom` (the 3× warning observed live, epics.md:2359).
    // Skip positioning entirely (same as the no-selection branch) so the sibling
    // `easeTo` guard (`hasValidVenueLocation`, :696) and this stay symmetric.
    if (!mapInstance || !selectedVenueDto || !hasValidVenueLocation(selectedVenueDto)) {
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
        : // Story 9.9 AC3: the card TOP renders at `y - cardHeight - anchorGap`.
          // Require that top to sit a gutter BELOW the planner-panel bottom, so
          // `minY = plannerBottom + gutter + cardHeight + anchorGap`. This keeps
          // the sun-% badge (top-left of the card) clear of the slider above it.
          MOBILE_SAFE_AREA_MAX_PX +
          MOBILE_PLANNER_TOP_OFFSET_PX +
          mobilePlannerHeightPx +
          QUICK_INFO_MOBILE_VIEWPORT_GUTTER +
          QUICK_INFO_MOBILE_HEIGHT_ESTIMATE +
          QUICK_INFO_MOBILE_ANCHOR_GAP;
      const maxY = isDesktopViewport
        ? height - QUICK_INFO_DESKTOP_VIEWPORT_GUTTER
        : Math.max(
            minY,
            height -
              MOBILE_NAV_HEIGHT_PX -
              mobileSheetMetrics.sheetHeightPx -
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
  }, [mapInstance, mobilePlannerHeightPx, mobileSheetMetrics.sheetHeightPx, selectedVenueDto]);

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
    if (mapInstance && hasValidVenueLocation(venue)) {
      mapInstance.easeTo({
        center: [venue.location.lng, venue.location.lat],
        duration: DURATION_FLY_MS,
      });
    }
  };

  const listVenues = useMemo(
    () => {
      // Story 9.7: desktop + mobile lists derive from the tag-filtered set, so an
      // active chip filters the list identically to the pins (AC3). Empty result
      // → `venue.list.empty` renders via VenueList's existing empty path.
      const validVenues = Array.isArray(tagFilteredVenues)
        ? tagFilteredVenues.filter(hasValidVenueLocation)
        : [];
      if (isForcedPhotoReference) {
        return validVenues.map((venue) => normalizeForcedPhotoVenue(venue, forcedState));
      }
      return isForcedVisualReference
        ? validVenues.map(normalizeForcedVisualVenue)
        : validVenues;
    },
    [forcedState, isForcedPhotoReference, isForcedVisualReference, tagFilteredVenues],
  );
  // Story 11.3 (AC1, empty-state fold-in from the 9.7 code review): the Närmast
  // list shows its loading skeleton ONLY while there is genuinely no underlying
  // venue data yet — never when a tag filter has legitimately pruned the loaded
  // set to zero matches. Keying off the PRE-FILTER loaded count (not
  // `listVenues.length`) means a filtered-to-empty list renders the
  // `venue.list.empty` copy — not a 3-card skeleton — even during a concurrent
  // background refetch (e.g. a planner-change). Matches list + pins on both
  // breakpoints (the same `isNearListLoading` feeds the mobile + desktop
  // VenueList call sites).
  const loadedVenueCount = venueQuery.data?.venues?.length ?? 0;
  const isNearListLoading = venueQuery.isFetching && loadedVenueCount === 0;
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
  const mobileSheetRowCount = listMode === 'favourites'
    ? (isFavouriteListLoading ? 3 : Math.max(visibleFavouriteVenueCount, 0))
    : (isNearListLoading ? 3 : Math.max(listVenues.length, 0));
  const routeText = routeLabels(tVenue);
  // Story 11.4 (AC1/AC2): the quick-info no longer renders a "Sol HH:mm–HH:mm"
  // window line or a truncated ETA inside its route button, so the
  // `quickInfoSunWindowTemplate` / `quickInfoRouteSummary` /
  // `quickInfoRouteEstimateLabel` wiring is gone. The detail/route surface keeps
  // its own `detailRouteEstimateLabel` below (AC2: the ETA may live on there).
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
    handleRouteVenue(venue);
  };

  const handleRouteDetailVenue = () => {
    if (!detailRouteVenue) return;
    handleRouteVenue(detailRouteVenue);
  };

  const handleRouteVenue = (venue: VenueDataDto) => {
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
      labels: routeOverlayLabels(venue, summary, routeText),
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
  // Story 11.1 (AC3): a DATE change (or material location change) is the ONE
  // fetch AC3 permits; while it is in flight the existing markers stay MOUNTED
  // (keepPreviousData keeps the previous venues rendered → `isPlaceholderData`)
  // and the map dims under a subtle-gray scrim + centered spinner overlay until
  // the new series arrives, then updates in place. This is TRUE only when a
  // previous result already exists (a real key change), never on the very first
  // load (that gap is covered by the tile-paint cover) — so the overlay is a
  // clean signal for "swapping to a new day/location". A same-date time scrub
  // does not change the query key, so it never triggers this state.
  const isDateChangeLoading =
    venueQuery.isFetching && venueQuery.isPlaceholderData && !isForcedVisualReference;

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
      {/* Story 11.1 (AC3): the date-change dim + spinner overlay. Rendered as an
          absolutely-positioned sibling so the pin layer above stays MOUNTED
          (markers persist keyed by venue id) while the single new-date request
          is in flight; markers update in place when the new series arrives. The
          scrim + spinner are design-system tokens (subtle-gray scrim via
          `bg-text-primary/20`, the standard `LoaderCircle` spinner), and the
          overlay fades in/out per the motion spec. Reference-PNG rebaseline for
          this NEW visual state is a maintainer checkpoint owned by Story 11.7 —
          dev does NOT self-bless a reference PNG here. */}
      <AnimatePresence>
        {isDateChangeLoading && (
          <motion.div
            key="date-change-overlay"
            data-testid="date-change-overlay"
            role="status"
            aria-live="polite"
            aria-label={tVenue('planner.loading')}
            className="absolute inset-0 z-floating-buttons flex items-center justify-center bg-text-primary/20 backdrop-blur-standard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION_FAST_S, ease: EASE_ENTER }}
          >
            <LoaderCircle
              aria-hidden="true"
              className="size-8 text-text-primary motion-safe:animate-spin"
            />
          </motion.div>
        )}
      </AnimatePresence>
      {/* Story 9.5 AC2: the amber user-location dot. Gated on a real GPS fix
          (`status === 'success'`) so it is NOT drawn while sitting on the
          Gothenburg-centrum fallback / idle / pending. Additive only — the
          fly-to recenter lives in OnboardingGate + MapControls. */}
      <UserLocationLayer status={geolocation.status} coords={geolocation.coords} />
      {!isForcedVisualReference && (
        <VenueSearchShell
          variant="mobile"
          className="absolute left-4 right-4 top-[calc(env(safe-area-inset-top)+var(--spacing)*3)] z-bottom-sheet-full"
          onVenueSelected={() => undefined}
        />
      )}
      <TimeSliderPanel
        variant="mobile"
        panelRef={mobilePlannerPanelRef}
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
        visibleRows={mobileSheetVisibleRows}
        onVisibleRowsChange={setMobileSheetVisibleRows}
        rowCount={mobileSheetRowCount}
        forcedDragOffsetPx={forcedSheetDragOffsetPx}
        onMetricsChange={setMobileSheetMetrics}
        handleLabel={tVenueList('handle')}
        rowStatusLabel={(visibleRows, maxRows) =>
          tVenueList('rowStatus', { visibleRows, maxRows })
        }
        chrome={(
          <>
            <VenueListControls
              mode="mobile"
              sortMode={effectiveSortMode}
              onSortModeChange={handleSortModeChange}
              listMode={listMode}
              labels={venueListControlLabels(tVenueList)}
            />
            {/* Story 11.3 (AC1): the mobile tag-chip row sits directly UNDER the sort
                toggles, inside the sheet body, so it scrolls/collapses with the
                header (not a floating layer). It is a NEW consumer of the SHARED
                TagFilterContext — a toggle here filters BOTH the mobile list AND the
                map pins (the venue surfaces already read `activeTags`). It rides the
                Närmast list only (favourites are intentionally unfiltered, matching
                the desktop scope). Renders nothing until a tag loads. */}
            {listMode !== 'favourites' && (
              <MobileTagChips
                tags={allTags}
                isActive={isTagActive}
                onToggleTag={toggleTag}
                locale={locale === 'en' ? 'en' : 'sv'}
                label={tCommon('nav.filter')}
              />
            )}
          </>
        )}
      >
        {listMode === 'favourites' ? (
          <FavouritesList
            favouriteIds={favourites.favouriteIds}
            venues={favouriteVenueRows}
            mode="mobile"
            sortMode={effectiveSortMode}
            locationIsApproximate={locationIsApproximate}
            isLoading={isFavouriteListLoading}
            isError={favouriteVenueQuery.isError}
            onRetry={() => favouriteVenueQuery.refetch()}
            compactCards
            onSelectVenue={handleSelectVenueFromList}
            onFavouriteToggle={(venue) => favourites.toggleFavourite(venue.id)}
            isFavourite={favourites.isFavourite}
          />
        ) : (
          <VenueList
            venues={listVenues}
            mode="mobile"
            sortMode={effectiveSortMode}
            locationIsApproximate={locationIsApproximate}
            isLoading={isNearListLoading}
            compactCards
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
              locationIsApproximate={locationIsApproximate}
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
              locationIsApproximate={locationIsApproximate}
              isLoading={isNearListLoading}
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
            distanceIsApproximate={locationIsApproximate}
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
            distanceIsApproximate={locationIsApproximate}
            feedbackSlot={renderFeedbackSlot('desktop')}
            reviewSlot={renderReviewSlot('desktop')}
          />
        )}
        {selectedPinData && !isVenueDetailRequested && (
          <VenueQuickInfo
            key="quick-info-mobile"
            mode="mobile"
            name={selectedPinData.name}
            sunExposurePercent={selectedQuickInfoVenue?.sunExposurePercent}
            openingHours={quickInfoOpeningHours}
            currentSunStatus={selectedQuickInfoVenue?.currentSunStatus}
            weatherGateState={selectedQuickInfoVenue?.weatherGateState}
            skyCondition={selectedQuickInfoVenue?.skyCondition}
            distanceMeters={selectedQuickInfoVenue?.distanceMeters}
            distanceIsApproximate={locationIsApproximate}
            thumbnail={selectedQuickInfoVenue?.thumbnail}
            isLoadingSunData={!selectedQuickInfoVenue}
            position={quickInfoPosition}
            onDismiss={() => selectVenue(null)}
            onOpenDetails={handleOpenDetails}
            onRoute={handleRouteSelectedVenue}
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
            sunExposurePercent={selectedQuickInfoVenue?.sunExposurePercent}
            openingHours={quickInfoOpeningHours}
            currentSunStatus={selectedQuickInfoVenue?.currentSunStatus}
            weatherGateState={selectedQuickInfoVenue?.weatherGateState}
            skyCondition={selectedQuickInfoVenue?.skyCondition}
            distanceMeters={selectedQuickInfoVenue?.distanceMeters}
            distanceIsApproximate={locationIsApproximate}
            thumbnail={selectedQuickInfoVenue?.thumbnail}
            isLoadingSunData={!selectedQuickInfoVenue}
            position={quickInfoPosition}
            desktopPlacement={quickInfoDesktopPlacement}
            onDismiss={() => selectVenue(null)}
            onOpenDetails={handleOpenDetails}
            onRoute={handleRouteSelectedVenue}
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
      {/* Story 11.5 (AC3): thread the live obstruction state so the recenter
          flyTo lands the user-location dot centred in the UNOBSCURED map area
          (mobile bottom-sheet snap / desktop detail panel). */}
      <MapControls
        mobileSheetHeightPx={mobileSheetMetrics.sheetHeightPx}
        isVenueDetailOpen={isVenueDetailRequested}
      />
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

function formatLabel(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (label, [key, value]) => label.replaceAll(`{${key}}`, value),
    template,
  );
}

function hasValidVenueLocation(venue: VenueDataDto): boolean {
  return Number.isFinite(venue.location?.lat) && Number.isFinite(venue.location?.lng);
}

/**
 * Story 11.1 (AC1): override a venue's headline sun fields with the derived
 * per-step value from its cached `sunDaySeries` at `selectedMinutes`. A venue
 * without a series (seed/fixture path) is returned unchanged, so the client keeps
 * the server's single-instant fields. The derived value is the ALREADY weather-
 * gated series entry — the client does not re-gate. This feeds pins, both venue
 * lists, quick-info figures, the obscured presentation, and the "Mest sol"
 * ordering input (the shared public-sun comparator reads `weatherGateState` +
 * `sunExposurePercent`) so ordering tracks the scrub.
 *
 * STORY 11 (review): `skyCondition` (the obscured sub-line) is ALSO overridden
 * from the per-step series entry so the plain-language sky phrase tracks the
 * scrub. Without it, scrubbing a clear "now" step to a cloud-gated step flips
 * the muted "Sol bakom moln" chrome while the sky phrase still reads the stale
 * server "Klart" — a self-contradicting obscured card (the Epic-10 honesty
 * class). `skyCondition` is only overridden when the series entry carries it
 * (`!== undefined`), so a legacy series without the field leaves the venue's
 * server value untouched.
 */
function applyDaySeriesDerivation(
  venue: VenueDataDto,
  selectedMinutes: number,
): VenueDataDto {
  const derived = deriveVenueSunAtMinutes(venue.sunDaySeries, selectedMinutes);
  if (!derived) return venue;
  const nextSkyCondition =
    derived.skyCondition !== undefined ? derived.skyCondition : venue.skyCondition;
  if (
    derived.currentSunStatus === venue.currentSunStatus &&
    derived.sunExposurePercent === venue.sunExposurePercent &&
    derived.weatherGateState === venue.weatherGateState &&
    nextSkyCondition === venue.skyCondition
  ) {
    return venue;
  }
  return {
    ...venue,
    currentSunStatus: derived.currentSunStatus,
    weatherGateState: derived.weatherGateState,
    sunExposurePercent: derived.sunExposurePercent,
    skyCondition: nextSkyCondition,
  };
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
    weatherGateState: 'unknown',
    isPartner: false,
    confidence: 0,
    distanceMeters: Number.NaN,
    sunExposurePercent: 0,
    tags: [],
    thumbnail: { alt: name, initials: name.slice(0, 2) },
  };
}

function shouldUseForcedSunnyMapPins(forcedState: string | null): boolean {
  return forcedState === 'map-primary' ||
    forcedState === 'map-panel-venues' ||
    forcedState === 'map-with-selected-venue' ||
    isForcedVenuePhotoState(forcedState);
}

function measuredElementHeight(node: HTMLElement | null): number {
  if (!node) return 0;
  const height = node.getBoundingClientRect().height || node.offsetHeight;
  return Number.isFinite(height) && height > 0 ? Math.round(height) : 0;
}

function resolveForcedSheetRows({
  forcedState,
  rowsParam,
  maxRows,
}: {
  forcedState: string | null;
  rowsParam: string | null;
  maxRows: number;
}): number | null {
  if (rowsParam) {
    if (rowsParam === 'max') return Math.max(0, maxRows);
    const parsed = Number(rowsParam);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : null;
  }
  if (forcedState === 'map-primary') return 0;
  if (forcedState === 'map-panel-venues') return 3;
  return null;
}

function normalizeForcedVisualPin(pin: VenuePinData): VenuePinData {
  return {
    ...pin,
    sunStatus: 'Sunny',
    sunExposurePercent: 95,
    weatherGateState: 'not_gated',
  };
}

function normalizeForcedVisualVenue(venue: VenueDataDto): VenueDataDto {
  return {
    ...venue,
    currentSunStatus: 'Sunny',
    weatherGateState: 'not_gated',
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

function normalizeForcedPhotoVenue(
  venue: VenueDataDto,
  forcedState: string | null,
): VenueDataDto {
  const visuallyStableVenue = normalizeForcedVisualVenue(venue);
  return isForcedVenuePhotoState(forcedState) && venueMatchesSlug(venue, 'test-venue-sunny')
    ? withForcedVenuePhotoThumbnail(visuallyStableVenue, forcedState)
    : visuallyStableVenue;
}

// Story 10.2 (Task 5): the deterministic obscured normalizers. Mirror the
// forced-sunny pair but set the weather-gated headline state (CloudObscured +
// overcast sky) while KEEPING the internal geometric layer and sun window so the
// "when it clears" potential stays available without rendering a grey-surface
// percentage. Dev-only; no live Met.no.
function normalizeForcedObscuredPin(pin: VenuePinData): VenuePinData {
  return {
    ...pin,
    sunStatus: 'CloudObscured',
    sunExposurePercent: 95,
    weatherGateState: 'gated',
  };
}

function normalizeForcedObscuredVenue(venue: VenueDataDto): VenueDataDto {
  return {
    ...normalizeForcedVisualVenue(venue),
    currentSunStatus: 'CloudObscured',
    weatherGateState: 'gated',
    skyCondition: 'overcast',
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
    distance: t('quickInfo.distance'),
    distanceApproximate: t('quickInfo.distanceApproximate'),
    loadingSun: t('quickInfo.loadingSun'),
    routeLoading: t('route.loading'),
    favouriteAdd: t('list.favouriteAdd'),
    favouriteRemove: t('list.favouriteRemove'),
    // Story 10.2: muted "Sol bakom moln" headline + plain-language sky copy.
    obscuredHeadline: t('quickInfo.obscuredHeadline'),
    weatherUnavailable: t('quickInfo.weatherUnavailable'),
    notSunnyVerdict: t('quickInfo.notSunnyVerdict'),
    sky: {
      clear: t('quickInfo.sky.clear'),
      partlyCloudy: t('quickInfo.sky.partlyCloudy'),
      overcast: t('quickInfo.sky.overcast'),
      rain: t('quickInfo.sky.rain'),
    },
  };
}

function venueDetailLabels(t: ReturnType<typeof useTranslations<'venue'>>) {
  return {
    close: t('detail.close'),
    favourite: t('detail.favourite'),
    favouriteAdd: t('detail.favouriteAdd'),
    favouriteRemove: t('detail.favouriteRemove'),
    share: t('detail.share'),
    shareText: t('detail.shareModal.shareText', { name: '{name}' }),
    openMaps: t('detail.openMaps'),
    route: t('detail.route'),
    routeLoading: t('route.loading'),
    photoPlaceholder: t('detail.photoPlaceholder'),
    loading: t('detail.loading'),
    detailsUnavailable: t('detail.detailsUnavailable'),
    openingHours: t('detail.openingHours'),
    address: t('detail.address'),
    sunBadge: t('detail.sunBadge', { percent: '{percent}' }),
    // Story 10.2 / 12.13: muted obscured hero headline + plain-language sky copy.
    // The obscured hero badge is deliberately percentage-free.
    obscuredHeadline: t('detail.obscuredHeadline'),
    sky: {
      label: t('detail.sky.label'),
      clear: t('detail.sky.clear'),
      partlyCloudy: t('detail.sky.partlyCloudy'),
      overcast: t('detail.sky.overcast'),
      rain: t('detail.sky.rain'),
    },
    city: t('detail.city'),
    openUntil: t('detail.openUntil', { time: '{time}' }),
    openUntilLine: t('detail.openUntilLine', { time: '{time}' }),
    placeholderImageShort: t('detail.placeholderImageShort'),
    facts: {
      distance: t('detail.facts.distance'),
      distanceApproximate: t('detail.facts.distanceApproximate'),
    },
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
): RouteOverlayLabels {
  return {
    title: formatLabel(labels.overlayTitle, { name: venue.venueName }),
    walk: routeEstimateLabel(summary.walkMinutes, labels.walkEstimate) ?? null,
    bike: routeEstimateLabel(summary.bikeMinutes, labels.bikeEstimate) ?? null,
    direction: routeDirectionLabel(summary.direction, venue.neighborhood, labels),
    uncertainty: routeUncertaintyLabel(venue, labels),
    close: labels.close,
    fallback: labels.openMaps,
    unavailable: labels.unavailable,
  };
}

function routeUncertaintyLabel(
  venue: VenueDataDto,
  labels: ReturnType<typeof routeLabels>,
): RouteOverlayUncertainty | null {
  const uncertaintyDisplay = getPredictionUncertaintyDisplay({
    predictionUncertainty: venue.predictionUncertainty,
    labels: labels.uncertainty,
  });
  if (!uncertaintyDisplay) return null;
  return {
    visible: uncertaintyDisplay.visibleLabel,
    accessible: uncertaintyDisplay.accessibleText,
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
