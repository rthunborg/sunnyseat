import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import type maplibregl from 'maplibre-gl';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import commonMessages from '@/messages/sv/common.json';
import favouritesMessages from '@/messages/sv/favourites.json';
import mapMessages from '@/messages/sv/map.json';
import venueMessages from '@/messages/sv/venue.json';
import commonMessagesEn from '@/messages/en/common.json';
import favouritesMessagesEn from '@/messages/en/favourites.json';
import mapMessagesEn from '@/messages/en/map.json';
import venueMessagesEn from '@/messages/en/venue.json';
import { TimeProvider } from '@/lib/contexts/TimeContext';
import type { GetVenueDetailResponse, GetVenuesResponse } from '@/lib/types/api';
import type { VenuePinData } from '@/lib/types/map';

type VenueQueryShape = {
  data: GetVenuesResponse | undefined;
  isFetching: boolean;
  isError: boolean;
  dataUpdatedAt: number;
  refetch?: ReturnType<typeof vi.fn>;
};
type FavouritesShape = {
  favouriteIds: string[];
  isHydrated: boolean;
  isFavourite: (id: string) => boolean;
  toggleFavourite: (id: string) => void;
  addFavourite: (id: string) => void;
  removeFavourite: (id: string) => void;
};
type FavouriteVenuesParams = {
  ids: readonly string[];
  lat: number;
  lng: number;
  date?: string;
  time?: string;
  enabled?: boolean;
};
type VenueSearchParams = {
  lat: number;
  lng: number;
  radiusKm?: number;
  q?: string;
  date?: string;
  time?: string;
  isLiveNow?: boolean;
  enabled?: boolean;
};

type GeolocationStatus = 'idle' | 'pending' | 'success' | 'fallback';
const useGeolocationMock = vi.fn<() => {
  status: GeolocationStatus;
  coords: { lat: number; lng: number };
  requestLocation: () => void;
  useCentrum: () => void;
}>(() => ({
  status: 'success',
  coords: { lat: 57.7089, lng: 11.9746 },
  requestLocation: () => {},
  useCentrum: () => {},
}));

const useVenueSearchMock = vi.fn<(params?: VenueSearchParams) => VenueQueryShape>(() => ({
  data: undefined,
  isFetching: false,
  isError: false,
  dataUpdatedAt: 0,
}));

// `refetch` is required to mirror the real TanStack hook contract (review
// R1-P10) — production code must not optional-chain around a mock shape.
const useVenueDetailMock = vi.fn<(slug?: string | null, params?: {
  date?: string;
  time?: string;
  lat?: number;
  lng?: number;
}) => {
  data: GetVenueDetailResponse | undefined;
  isFetching: boolean;
  isError: boolean;
  error?: Error;
  refetch: ReturnType<typeof vi.fn>;
}>(() => ({
  data: undefined,
  isFetching: false,
  isError: false,
  refetch: vi.fn(),
}));
const useFavouriteVenuesMock = vi.fn<(params?: FavouriteVenuesParams) => VenueQueryShape>(() => ({
  data: undefined,
  isFetching: false,
  isError: false,
  dataUpdatedAt: 0,
}));
const useVenueDetailPrefetchMock = vi.fn();
const prefetchSelectedVenueDetailMock = vi.fn<(...args: unknown[]) => Promise<void>>(
  async () => undefined,
);
const coachGuideMock = vi.fn(
  ({
    forcedStepId,
    autoStartEnabled,
  }: {
    forcedStepId?: string | null;
    autoStartEnabled?: boolean;
  }) => (
    <div
      hidden
      data-testid="coach-guide-stub"
      data-forced-step-id={forcedStepId ?? ''}
      data-auto-start-enabled={String(autoStartEnabled)}
    />
  ),
);
const useFavouritesMock = vi.fn<() => FavouritesShape>(() => ({
  favouriteIds: [],
  isHydrated: true,
  isFavourite: () => false,
  toggleFavourite: vi.fn(),
  addFavourite: vi.fn(),
  removeFavourite: vi.fn(),
}));

type SourceDataHandler = (e: { isSourceLoaded: boolean; sourceDataType?: string }) => void;
// Story 1.6 review (P31): handler now reads an event payload so the
// tile-vs-warning scope can be tested.
type ErrorHandler = (e?: { tile?: unknown; error?: { url?: unknown; message?: unknown } }) => void;
type StubMap = {
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  areTilesLoaded?: () => boolean;
  project: ReturnType<typeof vi.fn>;
  easeTo: ReturnType<typeof vi.fn>;
  flyTo: ReturnType<typeof vi.fn>;
  getCanvas: () => HTMLCanvasElement;
  __sourcedata: SourceDataHandler[];
  __error: ErrorHandler[];
};

function makeStubMap(opts: { tilesAlreadyLoaded?: boolean } = {}): StubMap {
  const sourcedataHandlers: SourceDataHandler[] = [];
  const errorHandlers: ErrorHandler[] = [];
  return {
    on: vi.fn((event: string, handler: SourceDataHandler | ErrorHandler) => {
      if (event === 'sourcedata') sourcedataHandlers.push(handler as SourceDataHandler);
      if (event === 'error') errorHandlers.push(handler as ErrorHandler);
    }),
    off: vi.fn(),
    areTilesLoaded: () => Boolean(opts.tilesAlreadyLoaded),
    project: vi.fn(() => ({ x: 240, y: 260 })),
    easeTo: vi.fn(),
    flyTo: vi.fn(),
    getCanvas: () => {
      const canvas = document.createElement('canvas');
      Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 390 });
      Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: 700 });
      return canvas;
    },
    __sourcedata: sourcedataHandlers,
    __error: errorHandlers,
  };
}

let stubMap: StubMap;
let selectedVenueIdMock: string | null = null;
// Story 9.7: the shared tag-filter selection. Empty by default (no-op → all
// venues); mutate it per test (add tags) to assert list + pins filter
// identically. Kept as a stable Set reference (cleared, never reassigned).
const activeTagsMock = new Set<string>();
function setActiveTags(...tags: string[]): void {
  activeTagsMock.clear();
  for (const tag of tags) activeTagsMock.add(tag);
}
// Story 11.3: the mobile chip row writes to the SAME shared context the desktop
// nav does. Spy on `toggleTag` so a mobile chip click can be asserted to write
// the shared context (never a forked local filter state).
const toggleTagMock = vi.fn();
let selectedVenuePreviewMock: GetVenuesResponse['venues'][number] | null = null;
let searchParamsMock = new URLSearchParams();
let pathnameMock = '/';
const routerPushMock = vi.fn();
const routerReplaceMock = vi.fn();
const selectVenueMock = vi.fn((id: string | null, venue?: GetVenuesResponse['venues'][number] | null) => {
  selectedVenueIdMock = id;
  selectedVenuePreviewMock = id ? (venue ?? null) : null;
});
const useMapInstanceMock = vi.fn(() => ({
  mapRef: { current: stubMap as unknown as maplibregl.Map },
  mapInstance: stubMap as unknown as maplibregl.Map,
  setMapInstance: () => {},
}));

vi.mock('@/hooks/useGeolocation', () => ({
  useGeolocation: () => useGeolocationMock(),
}));

vi.mock('@/hooks/queries/useVenueSearch', () => ({
  useVenueSearch: (params?: VenueSearchParams) => useVenueSearchMock(params),
}));

vi.mock('@/hooks/queries/useVenueDetail', () => ({
  useVenueDetail: (slug?: string | null, params?: {
    date?: string;
    time?: string;
    lat?: number;
    lng?: number;
  }) => useVenueDetailMock(slug, params),
}));

vi.mock('@/hooks/queries/useFavouriteVenues', () => ({
  useFavouriteVenues: (params?: FavouriteVenuesParams) => useFavouriteVenuesMock(params),
}));

vi.mock('@/hooks/queries/useVenueDetailPrefetch', () => ({
  useVenueDetailPrefetch: (params: unknown) => useVenueDetailPrefetchMock(params),
  prefetchSelectedVenueDetail: (...args: unknown[]) => prefetchSelectedVenueDetailMock(...args),
}));

vi.mock('@/hooks/useFavourites', () => ({
  useFavourites: () => useFavouritesMock(),
}));

vi.mock('@/lib/contexts/MapInstanceContext', () => ({
  useMapInstance: () => useMapInstanceMock(),
}));

vi.mock('@/lib/contexts/MapSelectionContext', () => ({
  useMapSelection: () => ({
    selectedVenueId: selectedVenueIdMock,
    selectedVenuePreview: selectedVenuePreviewMock,
    selectVenue: selectVenueMock,
    toggleVenue: (id: string) => {
      selectedVenueIdMock = selectedVenueIdMock === id ? null : id;
      selectedVenuePreviewMock = null;
    },
  }),
}));

vi.mock('@/lib/contexts/TagFilterContext', () => ({
  useTagFilter: () => ({
    activeTags: activeTagsMock,
    toggleTag: (tag: string) => toggleTagMock(tag),
    clearTags: () => {},
    isActive: (tag: string) => activeTagsMock.has(tag),
    retainTags: () => {},
  }),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParamsMock,
}));

vi.mock('@/i18n/navigation', () => ({
  usePathname: () => pathnameMock,
  useRouter: () => ({ push: routerPushMock, replace: routerReplaceMock }),
}));

// Stub out heavyweight children so the orchestration logic can be
// tested in isolation.
vi.mock('@/components/custom/map/MapContainer', () => ({
  MapContainer: () => <div data-testid="map-container-stub" />,
}));
vi.mock('@/components/custom/map/MapControls', () => ({
  MapControls: () => <div data-testid="map-controls-stub" />,
}));
vi.mock('@/components/custom/map/VenuePinLayer', () => ({
  VenuePinLayer: ({
    venues,
    onToggleVenue,
    onCanvasDeselect,
  }: {
    venues: VenuePinData[];
    onToggleVenue?: (venueId: string) => void;
    onCanvasDeselect?: () => void;
  }) => (
    <div data-testid="venue-pin-layer-stub" data-venues={JSON.stringify(venues)}>
      {venues.map((venue) => (
        <button
          type="button"
          hidden
          key={venue.id}
          aria-label={`Select map pin ${venue.name}`}
          data-testid={`pin-select-${venue.id}`}
          onClick={() => onToggleVenue?.(venue.id)}
        />
      ))}
      <button
        type="button"
        hidden
        aria-label="Deselect map canvas"
        data-testid="map-canvas-deselect"
        onClick={() => onCanvasDeselect?.()}
      />
    </div>
  ),
}));
// Story 9.5 AC2: stub the user-location layer (it mounts a real MapLibre
// Marker, which the stub map instance can't service) and surface its props so
// the MapView-level gating assertion can verify status/coords are threaded.
vi.mock('@/components/custom/map/UserLocationLayer', () => ({
  UserLocationLayer: ({
    status,
    coords,
  }: {
    status: string;
    coords: { lat: number; lng: number };
  }) => (
    <div
      data-testid="user-location-layer-stub"
      data-status={status}
      data-coords={JSON.stringify(coords)}
    />
  ),
}));
vi.mock('@/components/custom/map/MapLoadingFallback', () => ({
  MapLoadingFallback: () => <div data-testid="map-loading-fallback-stub" />,
}));
vi.mock('@/components/custom/coach-tour/FirstRunCoachMarkGuide', () => ({
  FirstRunCoachMarkGuide: (props: {
    forcedStepId?: string | null;
    autoStartEnabled?: boolean;
  }) => coachGuideMock(props),
}));
vi.mock('@/components/custom/feedback/ReviewFlow', () => ({
  ReviewFlow: ({ venue, instanceId }: { venue: { id: string }; instanceId?: string }) => (
    <div
      data-testid={`review-flow-stub-${instanceId ?? 'default'}`}
      data-venue-id={venue.id}
      data-instance-id={instanceId}
    />
  ),
}));

import { MapView } from '@/components/custom/map/MapView';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function Wrapper({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createTestQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider
        locale="sv"
        messages={{
          common: commonMessages,
          favourites: favouritesMessages,
          map: mapMessages,
          venue: venueMessages,
        }}
      >
        <TimeProvider
          initialNowIso="2026-05-20T10:15:00.000Z"
          clock={() => new Date('2026-05-20T10:15:00.000Z')}
        >
          {children}
        </TimeProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

function EnglishWrapper({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createTestQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider
        locale="en"
        messages={{
          common: commonMessagesEn,
          favourites: favouritesMessagesEn,
          map: mapMessagesEn,
          venue: venueMessagesEn,
        }}
      >
        <TimeProvider
          initialNowIso="2026-05-20T10:15:00.000Z"
          clock={() => new Date('2026-05-20T10:15:00.000Z')}
        >
          {children}
        </TimeProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

function expectVenueSearchCall(expected: VenueSearchParams) {
  // Story 9.4 AC2: the live venue search is now gated on a settled
  // geolocation status, so every call carries `enabled` (true under the
  // default `success` mock). Callers assert the geo/planner shape; the gate
  // flag is injected here so the existing call-shape expectations stay terse.
  expect(useVenueSearchMock.mock.calls.map(([params]) => params)).toContainEqual({
    enabled: true,
    ...expected,
  });
}

/**
 * `useVenueSearch` is consumed by BOTH MapView (the gated list query) and the
 * VenueSearchShell (the typed-query search, which is never coordinate-gated).
 * The two are distinguishable by shape: only MapView passes `enabled`, and
 * only the search shell passes a `q` key. This returns the most recent
 * MapView (list) call so AC2/AC3 assertions don't accidentally read the
 * search-shell call.
 */
function lastMapViewSearchCall(): VenueSearchParams | undefined {
  const mapViewCalls = useVenueSearchMock.mock.calls
    .map(([params]) => params)
    .filter((params): params is VenueSearchParams => Boolean(params) && 'enabled' in params!);
  return mapViewCalls[mapViewCalls.length - 1];
}

function waitMs(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function pinLayerIds(): string[] {
  const raw = screen.getByTestId('venue-pin-layer-stub').getAttribute('data-venues') ?? '[]';
  return (JSON.parse(raw) as Array<{ id: string }>).map((pin) => pin.id);
}

function mockMobilePlannerPanelHeight(height: number): void {
  const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function getBoundingClientRect(this: HTMLElement) {
    if (
      this.getAttribute('data-testid') === 'time-slider-panel' &&
      this.className.includes('lg:hidden')
    ) {
      return {
        x: 0,
        y: 0,
        width: 358,
        height,
        top: 0,
        left: 0,
        right: 358,
        bottom: height,
        toJSON: () => ({}),
      } as DOMRect;
    }
    return originalGetBoundingClientRect.call(this);
  });
}

describe('<MapView />', () => {
  beforeEach(() => {
    stubMap = makeStubMap();
    selectedVenueIdMock = null;
    selectedVenuePreviewMock = null;
    activeTagsMock.clear();
    toggleTagMock.mockClear();
    searchParamsMock = new URLSearchParams();
    pathnameMock = '/';
    selectVenueMock.mockClear();
    routerPushMock.mockClear();
    routerReplaceMock.mockClear();
    useGeolocationMock.mockReset().mockReturnValue({
      // Story 9.4 AC2: default to a settled status so the venue/favourites
      // queries are enabled (mirrors the common returning-user-with-GPS case).
      // The idle/pending gating is exercised explicitly in the AC2 suite.
      status: 'success',
      coords: { lat: 57.7089, lng: 11.9746 },
      requestLocation: () => {},
      useCentrum: () => {},
    });
    useVenueSearchMock.mockReset().mockReturnValue({
      data: undefined,
      isFetching: false,
      isError: false,
      dataUpdatedAt: 0,
    });
    useVenueDetailMock.mockReset().mockReturnValue({
      data: undefined,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    });
    useFavouriteVenuesMock.mockReset().mockReturnValue({
      data: undefined,
      isFetching: false,
      isError: false,
      dataUpdatedAt: 0,
    });
    useVenueDetailPrefetchMock.mockClear();
    prefetchSelectedVenueDetailMock.mockReset().mockResolvedValue(undefined);
    coachGuideMock.mockClear();
    useFavouritesMock.mockReset().mockReturnValue({
      favouriteIds: [],
      isHydrated: true,
      isFavourite: () => false,
      toggleFavourite: vi.fn(),
      addFavourite: vi.fn(),
      removeFavourite: vi.fn(),
    });
    useMapInstanceMock.mockReset().mockImplementation(() => ({
      mapRef: { current: stubMap as unknown as maplibregl.Map },
      mapInstance: stubMap as unknown as maplibregl.Map,
      setMapInstance: () => {},
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Story 12.11 — coach-mark guide route states', () => {
    it('maps coach-mark-first to the pin-legend guide step and disables visual prefetch churn', () => {
      searchParamsMock = new URLSearchParams('_state=coach-mark-first&_time=14:00');
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([makeVenue({ id: 'venue-1', name: 'Bellora' })]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(screen.getByTestId('coach-guide-stub')).toHaveAttribute(
        'data-forced-step-id',
        'pin-legend',
      );
      expect(screen.getByTestId('coach-guide-stub')).toHaveAttribute(
        'data-auto-start-enabled',
        'false',
      );
      expect(useVenueDetailPrefetchMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ enabled: false }),
      );
    });

    it('maps coach-mark-middle to the mounted planner guide step', () => {
      searchParamsMock = new URLSearchParams('_state=coach-mark-middle&_time=14:00');
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([makeVenue({ id: 'venue-1', name: 'Bellora' })]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(screen.getByTestId('coach-guide-stub')).toHaveAttribute(
        'data-forced-step-id',
        'time-slider',
      );
      expect(screen.getByTestId('coach-guide-stub')).toHaveAttribute(
        'data-auto-start-enabled',
        'false',
      );
    });

    it('leaves the guide in auto-start mode on the normal map route', () => {
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([makeVenue({ id: 'venue-1', name: 'Bellora' })]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(screen.getByTestId('coach-guide-stub')).toHaveAttribute(
        'data-forced-step-id',
        '',
      );
      expect(screen.getByTestId('coach-guide-stub')).toHaveAttribute(
        'data-auto-start-enabled',
        'true',
      );
    });
  });

  describe('tile-paint cover (Task 8)', () => {
    it('renders the loading-fallback cover until MapLibre paints its first non-metadata source', () => {
      render(<MapView />, { wrapper: Wrapper });
      expect(screen.getByTestId('map-tile-paint-cover')).toBeInTheDocument();
      expect(screen.getByTestId('map-loading-fallback-stub')).toBeInTheDocument();

      // Metadata-only sourcedata events do NOT count as a paint.
      act(() => {
        stubMap.__sourcedata[0]?.({ isSourceLoaded: true, sourceDataType: 'metadata' });
      });
      expect(screen.getByTestId('map-tile-paint-cover')).toBeInTheDocument();

      // First real sourcedata event flips the flag and removes the cover.
      act(() => {
        stubMap.__sourcedata[0]?.({ isSourceLoaded: true });
      });
      expect(screen.queryByTestId('map-tile-paint-cover')).toBeNull();
    });

    it('releases the cover synchronously when MapLibre reports tiles already loaded at bind time', () => {
      stubMap = makeStubMap({ tilesAlreadyLoaded: true });
      useMapInstanceMock.mockImplementation(() => ({
        mapRef: { current: stubMap as unknown as maplibregl.Map },
        mapInstance: stubMap as unknown as maplibregl.Map,
        setMapInstance: () => {},
      }));
      render(<MapView />, { wrapper: Wrapper });
      // Cover should be gone after the effect commits — `areTilesLoaded()`
      // returns true so we don't have to wait for `sourcedata`.
      expect(screen.queryByTestId('map-tile-paint-cover')).toBeNull();
    });

    it('keeps listening when MapLibre areTilesLoaded throws during style churn', () => {
      stubMap = {
        ...makeStubMap(),
        areTilesLoaded: () => {
          throw new TypeError('sources not ready');
        },
      };
      useMapInstanceMock.mockImplementation(() => ({
        mapRef: { current: stubMap as unknown as maplibregl.Map },
        mapInstance: stubMap as unknown as maplibregl.Map,
        setMapInstance: () => {},
      }));

      expect(() => render(<MapView />, { wrapper: Wrapper })).not.toThrow();
      expect(screen.getByTestId('map-tile-paint-cover')).toBeInTheDocument();

      act(() => {
        stubMap.__sourcedata[0]?.({ isSourceLoaded: true });
      });
      expect(screen.queryByTestId('map-tile-paint-cover')).toBeNull();
    });

    it('does NOT release the cover on a single transient tile error (Round 2 R2-P4)', () => {
      // Round 1 P31 narrowed the predicate to "tile or style errors";
      // Round 2 R2-P4 noted that a single tile error still released the
      // cover, exposing the half-painted MapLibre canvas with conspicuous
      // gaps on a transient blip (CORS retry, rate-limited tile, slow-
      // network burst). The cover now requires the cumulative tile-error
      // count to reach the same threshold MapContainer uses for sand-
      // fallback latching (4) — at which point both overlays release
      // together and the user sees the sand fallback.
      render(<MapView />, { wrapper: Wrapper });
      expect(screen.getByTestId('map-tile-paint-cover')).toBeInTheDocument();

      act(() => {
        stubMap.__error[0]?.({ tile: {} });
      });
      expect(screen.getByTestId('map-tile-paint-cover')).toBeInTheDocument();

      act(() => {
        stubMap.__error[0]?.({ tile: {} });
        stubMap.__error[0]?.({ tile: {} });
      });
      expect(screen.getByTestId('map-tile-paint-cover')).toBeInTheDocument();
    });

    it('releases the cover after 4 cumulative tile errors so MapContainer sand fallback can take the screen (Round 2 R2-P4)', () => {
      render(<MapView />, { wrapper: Wrapper });
      expect(screen.getByTestId('map-tile-paint-cover')).toBeInTheDocument();

      act(() => {
        stubMap.__error[0]?.({ tile: {} });
        stubMap.__error[0]?.({ tile: {} });
        stubMap.__error[0]?.({ tile: {} });
        stubMap.__error[0]?.({ tile: {} });
      });
      expect(screen.queryByTestId('map-tile-paint-cover')).toBeNull();
    });

    it('releases the cover IMMEDIATELY on a hard style failure (no canvas can render without style descriptor) (Round 2 R2-P1)', () => {
      // Round 2 R2-P1 extracted `isStyleResourceUrl` so MapView and
      // MapContainer share the same predicate (covers /styles/, /sprite,
      // /glyphs/, and the literal /style.json suffix). A style failure
      // releases on the first error because retries can't help — the
      // canvas has nothing to render.
      render(<MapView />, { wrapper: Wrapper });
      expect(screen.getByTestId('map-tile-paint-cover')).toBeInTheDocument();

      act(() => {
        stubMap.__error[0]?.({ error: { url: 'https://tiles.openfreemap.org/styles/positron/style.json' } });
      });
      expect(screen.queryByTestId('map-tile-paint-cover')).toBeNull();
    });

    it('releases the cover on a sprite resource failure (R2-P1 covers /sprite path)', () => {
      render(<MapView />, { wrapper: Wrapper });
      expect(screen.getByTestId('map-tile-paint-cover')).toBeInTheDocument();

      act(() => {
        stubMap.__error[0]?.({ error: { url: 'https://tiles.openfreemap.org/sprite/positron@2x.png' } });
      });
      expect(screen.queryByTestId('map-tile-paint-cover')).toBeNull();
    });

    it('releases the cover on a glyphs resource failure (R2-P1 covers /glyphs/ path)', () => {
      render(<MapView />, { wrapper: Wrapper });
      expect(screen.getByTestId('map-tile-paint-cover')).toBeInTheDocument();

      act(() => {
        stubMap.__error[0]?.({ error: { url: 'https://tiles.openfreemap.org/glyphs/Noto%20Sans/0-255.pbf' } });
      });
      expect(screen.queryByTestId('map-tile-paint-cover')).toBeNull();
    });

    it('does NOT release the cover on a non-tile, non-style MapLibre warning', () => {
      // Story 1.6 review (P31): the original handler released the cover
      // on ANY error event; this regression test pins the tile-or-style-
      // only scope. Round 2 R2-P4 further narrowed the tile path to
      // require 4+ errors; this test only fires a non-tile non-style
      // warning so neither path activates.
      render(<MapView />, { wrapper: Wrapper });
      expect(screen.getByTestId('map-tile-paint-cover')).toBeInTheDocument();

      act(() => {
        stubMap.__error[0]?.({ error: { message: 'unrelated warning' } });
      });
      expect(screen.getByTestId('map-tile-paint-cover')).toBeInTheDocument();
    });
  });

  describe('user-location dot gating (Story 9.5 AC2)', () => {
    it('threads status + coords into the UserLocationLayer on a real GPS fix', () => {
      useGeolocationMock.mockReturnValue({
        status: 'success',
        coords: { lat: 57.705, lng: 11.93 },
        requestLocation: vi.fn(),
        useCentrum: vi.fn(),
      });
      render(<MapView />, { wrapper: Wrapper });
      const layer = screen.getByTestId('user-location-layer-stub');
      // The layer itself owns the "draw the dot only on success" decision; the
      // MapView contract is that it threads the live status + coords through.
      expect(layer).toHaveAttribute('data-status', 'success');
      expect(layer).toHaveAttribute(
        'data-coords',
        JSON.stringify({ lat: 57.705, lng: 11.93 }),
      );
    });

    it('threads the fallback status through so the layer suppresses the dot', () => {
      useGeolocationMock.mockReturnValue({
        status: 'fallback',
        coords: { lat: 57.7089, lng: 11.9746 },
        requestLocation: vi.fn(),
        useCentrum: vi.fn(),
      });
      render(<MapView />, { wrapper: Wrapper });
      expect(screen.getByTestId('user-location-layer-stub')).toHaveAttribute(
        'data-status',
        'fallback',
      );
    });

    it('does not mount the user-location layer in the offline shell', () => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
      try {
        render(<MapView />, { wrapper: Wrapper });
        expect(screen.queryByTestId('user-location-layer-stub')).toBeNull();
      } finally {
        Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
      }
    });
  });

  describe('offline shell (Story 7.3)', () => {
    function setOnLine(value: boolean) {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value });
    }

    afterEach(() => {
      // Leave the shared navigator back online for the other suites.
      setOnLine(true);
    });

    it('forced map-primary-offline renders the cached map + banner and hides all venue data (AC3/AC7)', () => {
      searchParamsMock = new URLSearchParams('_state=map-primary-offline');
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Bellora' }),
          makeVenue({ id: 'venue-2', name: 'Da Matteo' }),
          makeVenue({ id: 'venue-3', name: 'Bar Centro' }),
          makeVenue({ id: 'venue-4', name: 'A43' }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      // Cached map background still renders.
      expect(screen.getByTestId('map-container-stub')).toBeInTheDocument();
      // "Ingen anslutning" banner is a polite live region.
      const banner = screen.getByTestId('offline-banner');
      expect(banner).toHaveTextContent('Ingen anslutning');
      expect(banner).toHaveAttribute('role', 'status');
      expect(banner).toHaveAttribute('aria-live', 'polite');
      // No venue data: pins, quick info, list controls, search, loading pill.
      expect(screen.queryByTestId('venue-pin-layer-stub')).toBeNull();
      expect(screen.queryByTestId('venue-quick-info')).toBeNull();
      expect(screen.queryByTestId('map-loading-pill')).toBeNull();
      expect(screen.queryAllByTestId('time-slider-panel')).toHaveLength(0);
    });

    it('renders the English offline copy under the en locale (AC6)', () => {
      searchParamsMock = new URLSearchParams('_state=map-primary-offline');

      render(<MapView />, { wrapper: EnglishWrapper });

      expect(screen.getByTestId('offline-banner')).toHaveTextContent('No connection');
    });

    it('shows the offline shell when the device goes offline and reloads venue data on reconnect (AC3/AC4)', async () => {
      setOnLine(true);
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Bellora' }),
          makeVenue({ id: 'venue-2', name: 'Da Matteo' }),
          makeVenue({ id: 'venue-3', name: 'Bar Centro' }),
          makeVenue({ id: 'venue-4', name: 'A43' }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      // Online: venue layer present, no offline banner.
      expect(screen.getByTestId('venue-pin-layer-stub')).toBeInTheDocument();
      expect(screen.queryByTestId('offline-banner')).toBeNull();

      // Lose connectivity.
      setOnLine(false);
      act(() => {
        window.dispatchEvent(new Event('offline'));
      });
      expect(await screen.findByTestId('offline-banner')).toBeInTheDocument();
      expect(screen.queryByTestId('venue-pin-layer-stub')).toBeNull();

      // Reconnect — the venue-data tree (driven by the existing query layer)
      // comes back; no hand-rolled fetch is involved.
      setOnLine(true);
      act(() => {
        window.dispatchEvent(new Event('online'));
      });
      await waitFor(() =>
        expect(screen.getByTestId('venue-pin-layer-stub')).toBeInTheDocument(),
      );
    });
  });

  describe('cumulative LoadingPill timer (Task 9)', () => {
    it('shows the pill after 3 s of cumulative fetching even across an isFetching=false gap', async () => {
      const dataUpdatedAt = 0;

      // 0 s: mount, isFetching=true.
      useVenueSearchMock.mockReturnValue({
        data: undefined,
        isFetching: true,
        isError: false,
        dataUpdatedAt,
      });
      const { rerender } = render(<MapView />, { wrapper: Wrapper });
      expect(screen.queryByTestId('map-loading-pill')).toBeNull();

      // 1 s: still fetching → 0 s elapsed of pill threshold.
      await waitMs(1000);
      expect(screen.queryByTestId('map-loading-pill')).toBeNull();

      // isFetching drops false (no data update — TanStack briefly idle
      // between query-key flips). The cumulative timer must NOT reset.
      useVenueSearchMock.mockReturnValue({
        data: undefined,
        isFetching: false,
        isError: false,
        dataUpdatedAt,
      });
      rerender(<MapView />);
      await waitMs(1500);
      expect(screen.queryByTestId('map-loading-pill')).toBeNull();

      // 2.5 s wall: isFetching back to true. We're still on the original
      // 3 s clock (not a fresh 3 s starting now).
      useVenueSearchMock.mockReturnValue({
        data: undefined,
        isFetching: true,
        isError: false,
        dataUpdatedAt,
      });
      rerender(<MapView />);
      // 0.5 s more reaches the cumulative 3 s mark — pill shows.
      expect(await screen.findByTestId('map-loading-pill', {}, { timeout: 1000 })).toBeInTheDocument();
    });

    it('a successful data delivery (dataUpdatedAt changes) hides the pill and resets the cumulative window', async () => {
      useVenueSearchMock.mockReturnValue({
        data: undefined,
        isFetching: true,
        isError: false,
        dataUpdatedAt: 0,
      });
      const { rerender } = render(<MapView />, { wrapper: Wrapper });
      expect(await screen.findByTestId('map-loading-pill', {}, { timeout: 3500 })).toBeInTheDocument();

      useVenueSearchMock.mockReturnValue({
        data: { venues: [], meta: { count: 0, radiusKm: 1.5 }, timestamp: 'x', totalCount: 0 },
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1000,
      });
      rerender(<MapView />);
      expect(screen.queryByTestId('map-loading-pill')).toBeNull();
    });

    it('does not show the loading pill during a background refetch when previous venue data is displayed', () => {
      vi.useFakeTimers();
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Bellora' }),
          makeVenue({ id: 'venue-2', name: 'Avenybaren' }),
          makeVenue({ id: 'venue-3', name: 'Solgården' }),
          makeVenue({ id: 'venue-4', name: 'Kvällsljus' }),
        ]),
        isFetching: true,
        isError: false,
        dataUpdatedAt: 1000,
      });

      render(<MapView />, { wrapper: Wrapper });

      act(() => {
        vi.advanceTimersByTime(3500);
      });
      expect(screen.queryByTestId('map-loading-pill')).toBeNull();
      vi.useRealTimers();
    });

    it('clears the pending slow-load timer when the venue query ends in error', () => {
      vi.useFakeTimers();
      useVenueSearchMock.mockReturnValue({
        data: undefined,
        isFetching: true,
        isError: false,
        dataUpdatedAt: 0,
      });
      const { rerender } = render(<MapView />, { wrapper: Wrapper });

      act(() => {
        vi.advanceTimersByTime(1500);
      });
      useVenueSearchMock.mockReturnValue({
        data: undefined,
        isFetching: false,
        isError: true,
        dataUpdatedAt: 0,
        refetch: vi.fn(),
      });
      rerender(<MapView />);

      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.getByRole('alert')).toHaveTextContent('Kunde inte ladda platser. Försök igen');
      expect(screen.queryByTestId('map-loading-pill')).toBeNull();
      vi.useRealTimers();
    });

    it('renders the inline venue API failure message with a retry button', () => {
      const refetch = vi.fn();
      useVenueSearchMock.mockReturnValue({
        data: undefined,
        isFetching: false,
        isError: true,
        dataUpdatedAt: 0,
        refetch,
      });

      render(<MapView />, { wrapper: Wrapper });

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Kunde inte ladda platser. Försök igen');
      fireEvent.click(screen.getByRole('button', { name: 'Försök igen' }));
      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('selected venue QuickInfo orchestration', () => {
    it('renders planner chrome and forwards selected future date/time to venue search', async () => {
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([makeVenue({ id: 'venue-1', name: 'Bellora' })]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(screen.getAllByTestId('time-slider-panel').length).toBeGreaterThanOrEqual(2);
      // Story 11.1: the initial live-today call keys on the selected date but
      // flags `isLiveNow: true` (so the request omits date/time server-side and
      // the query polls). The date is in the KEY in both live + off-live cases so
      // a same-date scrub keeps the same key.
      expectVenueSearchCall({
        lat: 57.7089,
        lng: 11.9746,
        radiusKm: 1.5,
        date: '2026-05-20',
        time: '12:15',
        isLiveNow: true,
      });

      fireEvent.click(screen.getAllByRole('button', { name: /Öppna kalender: Idag/ })[0]);
      fireEvent.click(screen.getByRole('button', { name: 'Välj 21 maj 2026' }));

      await waitFor(() =>
        // A committed FUTURE date is off-live → `isLiveNow: false` and the request
        // sends date/time; the key flips to the new date (the one fetch AC3 allows).
        expectVenueSearchCall({
          lat: 57.7089,
          lng: 11.9746,
          radiusKm: 1.5,
          date: '2026-05-21',
          time: '12:15',
          isLiveNow: false,
        }),
      );
    });

    it('forwards selected planner date/time to venue detail query and timeline marker', async () => {
      searchParamsMock = new URLSearchParams('venue=test-venue-sunny');
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Kafé Magasinet', slug: 'test-venue-sunny' }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      const { rerender } = render(<MapView />, { wrapper: Wrapper });
      fireEvent.click(screen.getAllByRole('button', { name: /Öppna kalender: Idag/ })[0]);
      fireEvent.click(screen.getByRole('button', { name: 'Välj 21 maj 2026' }));
      rerender(<MapView />);

      await waitFor(() =>
        expect(useVenueDetailMock).toHaveBeenLastCalledWith('test-venue-sunny', {
          date: '2026-05-21',
          time: '12:15',
          lat: 57.7089,
          lng: 11.9746,
        }),
      );
      expect(screen.getAllByText('12:15').length).toBeGreaterThanOrEqual(1);
    });

    it('renders QuickInfo for the selected venue without remounting MapContainer', () => {
      selectedVenueIdMock = 'venue-1';
      useVenueSearchMock.mockReturnValue({
        data: {
          venues: [
            {
              id: 'venue-1',
              venueId: 'venue-1',
              venueName: 'Testbaren',
              venueSlug: 'test-venue-sunny',
              slug: 'test-venue-sunny',
              neighborhood: 'Centrum',
              location: { lat: 57.7, lng: 11.97 },
              currentSunStatus: 'Sunny',
              weatherGateState: 'not_gated',
              isPartner: false,
              confidence: 92,
              distanceMeters: 420,
              sunExposurePercent: 95,
              tags: [],
              sunWindow: { start: '13:00', end: '18:30' },
              openingHours: {
                '1': { open: '11:00', close: '22:00' },
                '2': { open: '11:00', close: '22:00' },
                '3': { open: '11:00', close: '22:00' },
                '4': { open: '11:00', close: '22:00' },
                '5': { open: '11:00', close: '22:00' },
                '6': { open: '11:00', close: '22:00' },
                '7': { open: '11:00', close: '22:00' },
              }, // Story 11.9 (AC2): per-weekday hours (closes 22:00 every day)
              thumbnail: {
                alt: 'Uteservering hos Testbaren',
                initials: 'TB',
                url: 'https://example.com/testbaren.jpg',
              },
            },
          ],
          meta: { count: 1, radiusKm: 1.5 },
          timestamp: 'now',
          totalCount: 1,
        },
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      const { rerender } = render(<MapView />, { wrapper: Wrapper });
      expect(screen.getAllByTestId('venue-quick-info')).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: 'Testbaren' })).toHaveLength(2);
      // Story 11.4 (AC1): the quick-info renders real opening hours (both mounted
      // breakpoint variants) in place of the removed "Sol HH:mm–HH:mm" window.
      expect(screen.getAllByText('Öppet till 22:00')).toHaveLength(2);
      expect(screen.queryByText('Sol 13:00–18:30')).not.toBeInTheDocument();
      expect(screen.getAllByRole('img', { name: 'Uteservering hos Testbaren' }).length).toBeGreaterThanOrEqual(2);
      expect(screen.getByTestId('map-container-stub')).toBeInTheDocument();

      rerender(<MapView />);
      expect(screen.getByTestId('map-container-stub')).toBeInTheDocument();
    });

    it('does NOT project a selected venue with a null/non-finite location (Story 9.10 Task 3 — MapLibre null-coord warning guard)', () => {
      // Repro of the live 3× MapLibre "Expected value to be of type number, but
      // found null" warning (epics.md:2359): the `?venue=<slug>` deep-link (and
      // a favourite row) can select a venue whose `location` is null despite the
      // non-null `CoordinatesDto` type. The QuickInfo-position effect must skip
      // `mapInstance.project([...])` entirely for such a venue rather than feed
      // it a null coordinate — the same finiteness contract the sibling `easeTo`
      // already honours via `hasValidVenueLocation`.
      selectedVenueIdMock = 'venue-null';
      useVenueSearchMock.mockReturnValue({
        data: {
          venues: [
            {
              id: 'venue-null',
              venueId: 'venue-null',
              venueName: 'Ortlös Bar',
              venueSlug: 'ortlos-bar',
              slug: 'ortlos-bar',
              neighborhood: 'Centrum',
              // Real data can deliver a null location; the DTO types it non-null.
              location: null as unknown as { lat: number; lng: number },
              currentSunStatus: 'Sunny',
              weatherGateState: 'not_gated',
              isPartner: false,
              confidence: 90,
              distanceMeters: 300,
              sunExposurePercent: 88,
              tags: [],
              sunWindow: { start: '13:00', end: '18:30' },
            },
          ],
          meta: { count: 1, radiusKm: 1.5 },
          timestamp: 'now',
          totalCount: 1,
        },
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      // The position effect ran but must have bailed BEFORE calling project():
      // a null coordinate would otherwise reach MapLibre and warn.
      expect(stubMap.project).not.toHaveBeenCalled();
    });

    it('does NOT project a selected venue whose lat/lng are non-finite (null coords on a present location object)', () => {
      // The live warning ("type number, found null", epics.md:2359) fires when
      // `location` EXISTS but its lat/lng are null — `project([null, null])`
      // warns rather than throws. `hasValidVenueLocation` (`Number.isFinite`)
      // must reject this shape too, not only a wholly-null `location`.
      selectedVenueIdMock = 'venue-nan';
      useVenueSearchMock.mockReturnValue({
        data: {
          venues: [
            {
              id: 'venue-nan',
              venueId: 'venue-nan',
              venueName: 'Nollö Bar',
              venueSlug: 'nollo-bar',
              slug: 'nollo-bar',
              neighborhood: 'Centrum',
              location: {
                lat: null as unknown as number,
                lng: null as unknown as number,
              },
              currentSunStatus: 'Sunny',
              weatherGateState: 'not_gated',
              isPartner: false,
              confidence: 90,
              distanceMeters: 300,
              sunExposurePercent: 88,
              tags: [],
              sunWindow: { start: '13:00', end: '18:30' },
            },
          ],
          meta: { count: 1, radiusKm: 1.5 },
          timestamp: 'now',
          totalCount: 1,
        },
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(stubMap.project).not.toHaveBeenCalled();
    });

    it('projects a selected venue with a finite location (positive control for the null-coord guard)', () => {
      // Complements the guard test above: a well-formed selected venue MUST
      // still project (proving the guard is a null-coord filter, not a blanket
      // "never project" regression).
      selectedVenueIdMock = 'venue-1';
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Testbaren', slug: 'test-venue-sunny' }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(stubMap.project).toHaveBeenCalled();
    });

    it('does NOT register move/zoom position listeners for a null-coord selected venue (Story 9.10 Task 3 — no re-projection on pan/zoom)', () => {
      // The live warning was observed 3× (epics.md:2359) because the QuickInfo
      // position effect re-runs `updatePosition` on EVERY `move`/`zoom` event.
      // The guard's load-bearing value is not only skipping the initial
      // `project()` (asserted above) but bailing BEFORE the `mapInstance.on('move'
      // /'zoom', ...)` registrations — so a subsequent pan/zoom can never re-feed
      // a null coord to MapLibre. A refactor that instead bailed INSIDE
      // `updatePosition` would still pass the initial-project assertions yet
      // silently re-introduce the per-event re-fire; this test closes that gap.
      // `move`/`zoom` are ONLY ever registered by this effect (MapView.tsx:677-678),
      // so their absence in `stubMap.on` proves the listeners were never attached.
      selectedVenueIdMock = 'venue-null';
      useVenueSearchMock.mockReturnValue({
        data: {
          venues: [
            {
              id: 'venue-null',
              venueId: 'venue-null',
              venueName: 'Ortlös Bar',
              venueSlug: 'ortlos-bar',
              slug: 'ortlos-bar',
              neighborhood: 'Centrum',
              location: null as unknown as { lat: number; lng: number },
              currentSunStatus: 'Sunny',
              weatherGateState: 'not_gated',
              isPartner: false,
              confidence: 90,
              distanceMeters: 300,
              sunExposurePercent: 88,
              tags: [],
              sunWindow: { start: '13:00', end: '18:30' },
            },
          ],
          meta: { count: 1, radiusKm: 1.5 },
          timestamp: 'now',
          totalCount: 1,
        },
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      const listenerEvents = stubMap.on.mock.calls.map((call) => call[0]);
      expect(listenerEvents).not.toContain('move');
      expect(listenerEvents).not.toContain('zoom');
    });

    it('registers move/zoom position listeners for a finite-coord selected venue (positive control for the re-projection guard)', () => {
      // Symmetric positive control: a well-formed venue MUST attach the
      // `move`/`zoom` listeners so the card keeps tracking the pin during a
      // pan/zoom — proving the guard above suppresses listeners ONLY for the
      // null-coord case, not for every selection.
      selectedVenueIdMock = 'venue-1';
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Testbaren', slug: 'test-venue-sunny' }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      const listenerEvents = stubMap.on.mock.calls.map((call) => call[0]);
      expect(listenerEvents).toContain('move');
      expect(listenerEvents).toContain('zoom');
    });

    it('clamps the mobile QuickInfo card below the planner panel (Story 9.9 AC3)', () => {
      // A pin projected near the TOP of the viewport (project → y=260) would,
      // unclamped, anchor the card ABOVE the pin and collide with the mobile
      // "Planera soltid" TimeSliderPanel (safe-area + 72px offset + panel
      // height). The mobile `minY` clamp must push the card's `top` down so its
      // rendered top edge (`top - cardHeight - 40`) sits clear of the planner.
      //
      // Derived floor (must stay in sync with MapView's mobile constants):
      //   plannerBottom = SAFE_AREA(59) + PLANNER_OFFSET(72) + measured PLANNER_HEIGHT(83) = 214
      //   minY = plannerBottom + gutter(16) + cardHeight(170) + anchorGap(40) = 440
      const EXPECTED_MOBILE_MIN_Y = 440;
      mockMobilePlannerPanelHeight(83);
      selectedVenueIdMock = 'venue-1';
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Testbaren', slug: 'test-venue-sunny' }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      const mobileCard = screen
        .getAllByTestId('venue-quick-info')
        .find((el) => el.className.includes('w-[var(--size-quick-info-mobile-w)]'));
      expect(mobileCard).toBeDefined();
      const top = Number.parseFloat(
        (mobileCard as HTMLElement).style.top.replace('px', ''),
      );
      // The projected pin (y=260) is above the floor, so the card clamps down to
      // exactly the planner-clearing minimum.
      expect(top).toBe(EXPECTED_MOBILE_MIN_Y);
      // Card top edge = top - cardHeight(170) - anchorGap(40) must clear the
      // planner bottom (214) by at least a gutter (16).
      expect(top - 170 - 40).toBeGreaterThanOrEqual(214 + 16);
    });

    it('cancels background detail prefetch and starts the selected detail key when a map pin selects a venue', async () => {
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Bellora', slug: 'bellora' }),
          makeVenue({ id: 'venue-2', name: 'Avenybaren', slug: 'avenybaren' }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });
      expect(lastVenueDetailPrefetchParams()?.interactionToken).toBe(0);

      fireEvent.click(screen.getByTestId('pin-select-venue-2'));

      await waitFor(() =>
        expect(lastVenueDetailPrefetchParams()?.interactionToken).toBeGreaterThan(0),
      );
      expect(lastVenueDetailPrefetchParams()?.preserveVenueSlug).toBe('avenybaren');
      await waitFor(() =>
        expect(prefetchSelectedVenueDetailMock).toHaveBeenCalledWith(
          expect.any(QueryClient),
          'avenybaren',
          expect.objectContaining({ lat: 57.7089, lng: 11.9746 }),
        ),
      );
      expect(selectedVenueIdMock).toBe('venue-2');
    });

    it('cancels delayed detail prefetch when QuickInfo is dismissed', async () => {
      selectedVenueIdMock = 'venue-1';
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Bellora', slug: 'bellora' }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });
      fireEvent.click(screen.getAllByRole('button', { name: 'Stäng platskort' })[0]);

      await waitFor(() =>
        expect(lastVenueDetailPrefetchParams()?.interactionToken).toBeGreaterThan(0),
      );
      expect(lastVenueDetailPrefetchParams()?.preserveVenueSlug).toBeNull();
      expect(selectedVenueIdMock).toBeNull();
    });

    it('cancels background detail prefetch and starts the selected detail key when a list row selects a venue', async () => {
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Bellora', slug: 'bellora' }),
          makeVenue({ id: 'venue-2', name: 'Avenybaren', slug: 'avenybaren' }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });
      fireEvent.click(screen.getAllByRole('button', { name: /Välj Avenybaren/ })[0]);

      await waitFor(() =>
        expect(lastVenueDetailPrefetchParams()?.interactionToken).toBeGreaterThan(0),
      );
      expect(lastVenueDetailPrefetchParams()?.preserveVenueSlug).toBe('avenybaren');
      await waitFor(() =>
        expect(prefetchSelectedVenueDetailMock).toHaveBeenCalledWith(
          expect.any(QueryClient),
          'avenybaren',
          expect.objectContaining({ lat: 57.7089, lng: 11.9746 }),
        ),
      );
      expect(selectVenueMock).toHaveBeenCalledWith(
        'venue-2',
        expect.objectContaining({ slug: 'avenybaren' }),
      );
    });

    it('starts one selected-intent detail prefetch for each explicit row selection', async () => {
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Bellora', slug: 'bellora' }),
          makeVenue({ id: 'venue-2', name: 'Avenybaren', slug: 'avenybaren' }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });
      fireEvent.click(screen.getAllByRole('button', { name: /Välj Bellora/ })[0]);
      await waitFor(() =>
        expect(lastVenueDetailPrefetchParams()?.preserveVenueSlug).toBe('bellora'),
      );
      await waitFor(() =>
        expect(prefetchSelectedVenueDetailMock).toHaveBeenCalledWith(
          expect.any(QueryClient),
          'bellora',
          expect.objectContaining({ lat: 57.7089, lng: 11.9746 }),
        ),
      );
      const firstInteractionToken = lastVenueDetailPrefetchParams()?.interactionToken ?? 0;

      fireEvent.click(screen.getAllByRole('button', { name: /Välj Avenybaren/ })[0]);

      await waitFor(() =>
        expect(lastVenueDetailPrefetchParams()?.interactionToken).toBeGreaterThan(firstInteractionToken),
      );
      expect(lastVenueDetailPrefetchParams()?.preserveVenueSlug).toBe('avenybaren');
      await waitFor(() => expect(prefetchSelectedVenueDetailMock).toHaveBeenCalledTimes(2));
      expect(prefetchSelectedVenueDetailMock.mock.calls.map((call) => call[1])).toEqual([
        'bellora',
        'avenybaren',
      ]);
    });

    it('does not enable forced-route detail prefetch until the URL planner time is resolved into context', () => {
      searchParamsMock = new URLSearchParams('_time=14:00&_prefetch=venue-detail');
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Bellora', slug: 'bellora' }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(lastVenueDetailPrefetchParams()?.enabled).toBe(false);
      expect(useVenueDetailMock).toHaveBeenCalledWith(null, expect.any(Object));
    });

    it('passes the exact displayed distance order into initial detail prefetch when distance is selected before settle', async () => {
      useVenueSearchMock.mockReturnValue({
        data: undefined,
        isFetching: true,
        isError: false,
        dataUpdatedAt: 0,
      });
      const view = render(<MapView />, { wrapper: Wrapper });

      fireEvent.click(screen.getAllByRole('button', { name: 'Närmast' })[0]);
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          { ...makeVenue({ id: 'far', name: 'Far', slug: 'far' }), distanceMeters: 300 },
          { ...makeVenue({ id: 'near', name: 'Near', slug: 'near' }), distanceMeters: 100 },
          { ...makeVenue({ id: 'mid', name: 'Mid', slug: 'mid' }), distanceMeters: 200 },
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      view.rerender(<MapView />);

      await waitFor(() =>
        expect(lastVenueDetailPrefetchParams()?.listVenues.map((venue) => venue.id)).toEqual([
          'near',
          'mid',
          'far',
        ]),
      );
      expect(lastVenueDetailPrefetchParams()?.interactionToken).toBe(1);
    });

    it('derives the mobile QuickInfo clamp from the measured planner height, not a fixed capture value', () => {
      // Same geometry as the clamp test, but with a taller measured planner.
      // If MapView uses a hard-coded 83px capture value, this incorrectly stays
      // at 440 instead of moving down to 469.
      const EXPECTED_MOBILE_MIN_Y = 469;
      mockMobilePlannerPanelHeight(112);
      selectedVenueIdMock = 'venue-1';
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Testbaren', slug: 'test-venue-sunny' }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      const mobileCard = screen
        .getAllByTestId('venue-quick-info')
        .find((el) => el.className.includes('w-[var(--size-quick-info-mobile-w)]'));
      expect(mobileCard).toBeDefined();
      const top = Number.parseFloat(
        (mobileCard as HTMLElement).style.top.replace('px', ''),
      );
      expect(top).toBe(EXPECTED_MOBILE_MIN_Y);
    });

    it('threads the honest approximate-distance label into the mobile QuickInfo on the centrum fallback (Story 9.9 Task 3)', () => {
      selectedVenueIdMock = 'venue-1';
      useGeolocationMock.mockReturnValue({
        status: 'fallback',
        coords: { lat: 57.7089, lng: 11.9746 },
        requestLocation: () => {},
        useCentrum: () => {},
      });
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Testbaren', slug: 'test-venue-sunny' }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      // Both mobile + desktop cards render the annotation on the fallback.
      expect(screen.getAllByText('≈ från centrum').length).toBeGreaterThanOrEqual(1);
      // The real distance value is still present, never hidden.
      expect(screen.getAllByTestId('venue-quick-info')[0]).toHaveTextContent('180 m');
    });

    it('omits the approximate-distance label on a real GPS fix (Story 9.9 Task 3)', () => {
      selectedVenueIdMock = 'venue-1';
      useGeolocationMock.mockReturnValue({
        status: 'success',
        coords: { lat: 57.7089, lng: 11.9746 },
        requestLocation: () => {},
        useCentrum: () => {},
      });
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Testbaren', slug: 'test-venue-sunny' }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(screen.queryByText('≈ från centrum')).toBeNull();
      expect(screen.getAllByTestId('venue-quick-info')[0]).toHaveTextContent('180 m');
    });

    it('keeps selected QuickInfo data visible during background venue refetch', () => {
      selectedVenueIdMock = 'venue-1';
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Testbaren', slug: 'test-venue-sunny' }),
        ]),
        isFetching: true,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(screen.queryByLabelText('Laddar soldata')).not.toBeInTheDocument();
      // Story 11.4 (AC1): the quick-info keeps its content visible during a
      // background refetch — now proven via the opening-hours line + distance
      // (the sun-window line was removed).
      expect(screen.getAllByText('Öppet till 22:00')).toHaveLength(2);
      expect(screen.getAllByText(/180 m/).length).toBeGreaterThanOrEqual(2);
    });

    it('renders the QuickInfo with locale-driven chrome and the honest opening-hours line (Story 11.4 AC1)', () => {
      selectedVenueIdMock = 'venue-1';
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Testbaren', slug: 'test-venue-sunny' }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: EnglishWrapper });

      // The quick-info chrome follows the active locale (English CTA labels).
      // Story 11.9 (AC2): the opening-hours line is now DERIVED via a locale-aware
      // template, so under the English wrapper it reads "Open until 22:00" (the old
      // raw stored Swedish string no longer renders verbatim).
      expect(screen.getAllByRole('button', { name: 'Show Route' })).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: 'More Info' })).toHaveLength(2);
      expect(screen.getAllByText('Open until 22:00')).toHaveLength(2);
      expect(screen.queryByText('Sol 13:00–18:30')).not.toBeInTheDocument();
      expect(screen.queryByText('Sun 13:00–18:30')).not.toBeInTheDocument();
    });

    it('opens details from QuickInfo with the public deep-link URL', () => {
      selectedVenueIdMock = 'venue-1';
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Kafé Magasinet', slug: 'test-venue-sunny' }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });
      fireEvent.click(screen.getAllByRole('button', { name: 'Mer Info' })[0]);

      expect(routerPushMock).toHaveBeenCalledWith({
        pathname: '/',
        query: { venue: 'test-venue-sunny' },
      });
    });

    it('opens directions from QuickInfo and keeps an in-app route overlay available', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      selectedVenueIdMock = 'venue-1';
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Kafé Magasinet', slug: 'test-venue-sunny' }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });
      // Story 11.4 (AC2): the quick-info route CTA no longer squeezes an ETA
      // inside the button — it reads only "VISA RUTT". The ETA lives on in the
      // route overlay below (which is asserted after the handoff opens it).
      expect(screen.queryByText('ca 2 min')).not.toBeInTheDocument();
      fireEvent.click(screen.getAllByRole('button', { name: /Visa Rutt/ })[0]);

      expect(openSpy).toHaveBeenCalledWith(
        'https://www.google.com/maps/dir/?api=1&destination=57.7%2C11.97&travelmode=walking&dir_action=navigate',
        '_blank',
        'noopener,noreferrer',
      );
      expect(screen.getByRole('dialog', { name: 'Rutt till Kafé Magasinet' })).toHaveTextContent(
        'ca 2 min promenad',
      );
      expect(screen.getByRole('link', { name: 'ÖPPNA I KARTOR' })).toHaveAttribute(
        'href',
        'https://www.google.com/maps/dir/?api=1&destination=57.7%2C11.97&travelmode=walking&dir_action=navigate',
      );
      fireEvent.click(screen.getByRole('button', { name: 'Stäng rutt' }));
      return waitFor(() =>
        expect(screen.queryByRole('dialog', { name: 'Rutt till Kafé Magasinet' })).toBeNull(),
      );
    });

    it('clears a route overlay when the selected venue is cleared', async () => {
      vi.spyOn(window, 'open').mockImplementation(() => null);
      selectedVenueIdMock = 'venue-1';
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Kafé Magasinet', slug: 'test-venue-sunny' }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      const { rerender } = render(<MapView />, { wrapper: Wrapper });
      fireEvent.click(screen.getAllByRole('button', { name: /Visa Rutt/ })[0]);
      expect(screen.getByRole('dialog', { name: 'Rutt till Kafé Magasinet' })).toBeInTheDocument();

      selectedVenueIdMock = null;
      selectedVenuePreviewMock = null;
      rerender(<MapView />);

      await waitFor(() =>
        expect(screen.queryByRole('dialog', { name: 'Rutt till Kafé Magasinet' })).not.toBeInTheDocument(),
      );
    });

    it('shows uncertainty context in the route overlay before the native-map handoff (Story 12.13 AC4)', () => {
      vi.spyOn(window, 'open').mockImplementation(() => null);
      selectedVenueIdMock = 'venue-1';
      useVenueSearchMock.mockReturnValue({
        data: {
          ...makeVenueResponse([
            {
              ...makeVenue({
                id: 'venue-1',
                name: 'Kafé Magasinet',
                slug: 'test-venue-sunny',
                confidence: 88,
              }),
              predictionUncertainty: { level: 'medium', reasons: ['weather'] },
            },
          ]),
          meta: {
            count: 1,
            radiusKm: 1.5,
            sunDataSource: 'weather',
            weatherUpdatedAt: '2999-01-01T00:00:00.000Z',
          },
        },
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });
      fireEvent.click(screen.getAllByRole('button', { name: /Visa Rutt/ })[0]);

      const overlay = screen.getByRole('dialog', { name: 'Rutt till Kafé Magasinet' });
      expect(overlay).not.toHaveTextContent('Säkerhet');
      expect(overlay).toHaveTextContent('Osäker prognos');
      expect(overlay).toHaveTextContent('ca 2 min promenad');
    });

    it('keeps confidence hidden in the route overlay when no public uncertainty is available', () => {
      vi.spyOn(window, 'open').mockImplementation(() => null);
      selectedVenueIdMock = 'venue-1';
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Kafé Magasinet', slug: 'test-venue-sunny' }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });
      fireEvent.click(screen.getAllByRole('button', { name: /Visa Rutt/ })[0]);

      const overlay = screen.getByRole('dialog', { name: 'Rutt till Kafé Magasinet' });
      expect(overlay).not.toHaveTextContent('Säkerhet');
    });

    it('renders uncertainty without a confidence-unavailable screen reader fallback in the route overlay', () => {
      vi.spyOn(window, 'open').mockImplementation(() => null);
      selectedVenueIdMock = 'venue-1';
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          {
            ...makeVenue({ id: 'venue-1', name: 'Kafé Magasinet', slug: 'test-venue-sunny' }),
            predictionUncertainty: { level: 'medium', reasons: ['weather'] },
          },
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });
      fireEvent.click(screen.getAllByRole('button', { name: /Visa Rutt/ })[0]);

      const overlay = screen.getByRole('dialog', { name: 'Rutt till Kafé Magasinet' });
      // Confidence is gone from the public route overlay; the uncertainty row is
      // the only model-context row when meaningful uncertainty exists.
      expect(overlay).not.toHaveTextContent(/Säkerhet \d/);
      expect(overlay).not.toHaveTextContent('Säkerhet saknas');
      expect(overlay).toHaveTextContent('Osäker prognos');
    });

    it('plain venue deep links select the matching venue and render detail once data is available', () => {
      searchParamsMock = new URLSearchParams('venue=test-venue-sunny');
      const venue = makeVenue({ id: 'venue-1', name: 'Kafé Magasinet', slug: 'test-venue-sunny' });
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([venue]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      const { rerender } = render(<MapView />, { wrapper: Wrapper });

      expect(selectVenueMock).toHaveBeenCalledWith('venue-1', expect.objectContaining({ id: 'venue-1' }));
      rerender(<MapView />);
      expect(screen.getByTestId('mobile-venue-detail-sheet')).toBeInTheDocument();
    });

    it('a shared ?venue=<slug> deep-link opens the recipient on the venue detail (Story 9.8 AC3 regression guard)', () => {
      // This is the exact URL shape `buildVenueShareUrl` produces — a clean
      // `?venue=<slug>` with no planner/dev params. A recipient landing here
      // must resolve straight to the venue detail. Guards AC3 against a future
      // routing change silently breaking every previously-shared link.
      const shareUrl = new URL('https://sunnyseat.app/?venue=test-venue-sunny');
      searchParamsMock = new URLSearchParams(shareUrl.search);
      expect(searchParamsMock.get('venue')).toBe('test-venue-sunny');
      const venue = makeVenue({ id: 'venue-1', name: 'Kafé Magasinet', slug: 'test-venue-sunny' });
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([venue]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      const { rerender } = render(<MapView />, { wrapper: Wrapper });
      expect(selectVenueMock).toHaveBeenCalledWith('venue-1', expect.objectContaining({ id: 'venue-1' }));
      rerender(<MapView />);
      expect(screen.getByTestId('mobile-venue-detail-sheet')).toBeInTheDocument();
      expect(screen.getByTestId('desktop-venue-detail-panel')).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { name: 'Kafé Magasinet' }).length).toBeGreaterThan(0);
    });

    it('direct venue-detail visual-validation URL selects the matching venue once list data is available', () => {
      searchParamsMock = new URLSearchParams('venue=test-venue-sunny&_state=venue-detail');
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Kafé Magasinet', slug: 'test-venue-sunny' }),
          makeVenue({ id: 'venue-2', name: 'Annan plats', slug: 'annan-plats' }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      const { rerender } = render(<MapView />, { wrapper: Wrapper });

      expect(selectVenueMock).toHaveBeenCalledWith('venue-1', expect.objectContaining({ id: 'venue-1' }));
      rerender(<MapView />);
      expect(screen.getByTestId('mobile-venue-detail-sheet')).toBeInTheDocument();
      expect(screen.getByTestId('desktop-venue-detail-panel')).toBeInTheDocument();
      expect(screen.getByTestId('review-flow-stub-mobile')).toHaveAttribute('data-instance-id', 'mobile');
      expect(screen.getByTestId('review-flow-stub-desktop')).toHaveAttribute('data-instance-id', 'desktop');
      expect(screen.queryByTestId('venue-quick-info')).not.toBeInTheDocument();
    });

    it('renders seeded forced venue detail before list and detail data resolve', () => {
      searchParamsMock = new URLSearchParams('venue=test-venue-sunny&_state=venue-detail');
      useVenueSearchMock.mockReturnValue({
        data: undefined,
        isFetching: true,
        isError: false,
        dataUpdatedAt: 0,
      });
      useVenueDetailMock.mockReturnValue({
        data: undefined,
        isFetching: true,
        isError: false,
        refetch: vi.fn(),
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(screen.getByTestId('mobile-venue-detail-sheet')).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { name: 'Kafé Magasinet' })).toHaveLength(2);
      expect(screen.getAllByText('Stor uteservering med eftermiddagssol, skyddade bord och nära till både spårvagn och kajstråk.')).toHaveLength(2);
      expect(screen.getAllByLabelText('95% sol')).toHaveLength(2);
      for (const detailSunBadge of screen.getAllByLabelText('95% sol')) {
        expect(detailSunBadge).toHaveTextContent('95%');
      }
      expect(screen.queryByText('95% SOL')).not.toBeInTheDocument();
      expect(screen.queryByText(/Säkerhet/)).not.toBeInTheDocument();
      // Story 11.6 (AC2): the "Soltider idag" sun-forecast section is removed on
      // both breakpoints — no heading, no best-window subtitle, no timeline strip.
      expect(screen.queryByText('Solprognos idag')).not.toBeInTheDocument();
      expect(screen.queryByText(/^Bäst \d/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Soltider idag')).not.toBeInTheDocument();
      expect(screen.queryByText('Laddar platsdetaljer')).not.toBeInTheDocument();
    });

    it('keeps detail favourite disabled while only a URL-slug fallback is available', () => {
      searchParamsMock = new URLSearchParams('venue=unknown-sunny-place');
      const toggleFavourite = vi.fn();
      useVenueSearchMock.mockReturnValue({
        data: undefined,
        isFetching: true,
        isError: false,
        dataUpdatedAt: 0,
      });
      useVenueDetailMock.mockReturnValue({
        data: undefined,
        isFetching: true,
        isError: false,
        refetch: vi.fn(),
      });
      useFavouritesMock.mockReturnValue({
        favouriteIds: [],
        isHydrated: true,
        isFavourite: () => false,
        toggleFavourite,
        addFavourite: vi.fn(),
        removeFavourite: vi.fn(),
      });

      render(<MapView />, { wrapper: Wrapper });

      for (const button of screen.getAllByRole('button', { name: 'Spara som favorit' })) {
        expect(button).toBeDisabled();
      }
      expect(toggleFavourite).not.toHaveBeenCalled();
    });

    it('renders mobile venue detail from URL state and dismisses without clearing selected pin', () => {
      selectedVenueIdMock = 'venue-1';
      searchParamsMock = new URLSearchParams('venue=test-venue-sunny&_state=venue-detail');
      const venue = makeVenue({ id: 'venue-1', name: 'Kafé Magasinet' });
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([venue]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(screen.getByTestId('mobile-venue-detail-sheet')).toBeInTheDocument();
      fireEvent.keyDown(screen.getByTestId('mobile-venue-detail-handle'), {
        key: 'ArrowDown',
      });

      expect(routerReplaceMock).toHaveBeenCalledWith('/');
      expect(selectVenueMock).not.toHaveBeenCalledWith(null);
    });

    it('switches an open detail to a clicked favourite/out-of-radius pin via URL replace before local selection', async () => {
      pathnameMock = '/favoriter';
      searchParamsMock = new URLSearchParams('venue=venue-a&_state=venue-detail&foo=bar');
      const venueA = makeVenue({ id: 'venue-a', name: 'Aktiv plats', slug: 'venue-a' });
      const favouriteVenue = makeVenue({ id: 'venue-b', name: 'Favoritplats', slug: 'venue-b' });
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([venueA]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });
      useFavouriteVenuesMock.mockReturnValue({
        data: makeVenueResponse([favouriteVenue]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
        refetch: vi.fn(),
      });
      useFavouritesMock.mockReturnValue({
        favouriteIds: ['venue-b'],
        isHydrated: true,
        isFavourite: (id: string) => id === 'venue-b',
        toggleFavourite: vi.fn(),
        addFavourite: vi.fn(),
        removeFavourite: vi.fn(),
      });

      render(<MapView />, { wrapper: Wrapper });
      selectVenueMock.mockClear();
      fireEvent.click(screen.getByTestId('pin-select-venue-b'));

      expect(routerReplaceMock).toHaveBeenCalledWith({
        pathname: '/favoriter',
        query: {
          foo: 'bar',
          venue: 'venue-b',
        },
      });
      expect(selectVenueMock).not.toHaveBeenCalledWith(
        'venue-b',
        expect.anything(),
      );
      await waitFor(() =>
        expect(lastVenueDetailPrefetchParams()?.preserveVenueSlug).toBe('venue-b'),
      );
      await waitFor(() =>
        expect(prefetchSelectedVenueDetailMock).toHaveBeenCalledWith(
          expect.any(QueryClient),
          'venue-b',
          expect.objectContaining({ lat: 57.7089, lng: 11.9746 }),
        ),
      );
    });

    it('dismisses an open detail from a bare canvas click and clears the selected pin', async () => {
      selectedVenueIdMock = 'venue-a';
      selectedVenuePreviewMock = makeVenue({ id: 'venue-a', name: 'Aktiv plats', slug: 'venue-a' });
      searchParamsMock = new URLSearchParams('venue=venue-a&_state=venue-detail&foo=bar');
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([selectedVenuePreviewMock]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });
      selectVenueMock.mockClear();
      fireEvent.click(screen.getByTestId('map-canvas-deselect'));

      expect(routerReplaceMock).toHaveBeenCalledWith({
        pathname: '/',
        query: { foo: 'bar' },
      });
      await waitFor(() =>
        expect(lastVenueDetailPrefetchParams()?.preserveVenueSlug).toBeNull(),
      );
      expect(selectVenueMock).toHaveBeenCalledWith(null);
    });

    it('keeps a bare-canvas detail dismissal closed while the stale venue URL is clearing', async () => {
      selectedVenueIdMock = 'venue-a';
      selectedVenuePreviewMock = makeVenue({ id: 'venue-a', name: 'Aktiv plats', slug: 'venue-a' });
      searchParamsMock = new URLSearchParams('venue=venue-a&_state=venue-detail&foo=bar');
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([selectedVenuePreviewMock]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      const view = render(<MapView />, { wrapper: Wrapper });
      selectVenueMock.mockClear();
      fireEvent.click(screen.getByTestId('map-canvas-deselect'));

      expect(selectVenueMock).toHaveBeenCalledWith(null);
      selectVenueMock.mockClear();

      // Next/router has not reflected the replace yet, so the old URL param is
      // still observable for one render. It must not resurrect the just-dismissed
      // venue into local selection.
      view.rerender(<MapView />);
      await waitMs(0);

      expect(selectVenueMock).not.toHaveBeenCalledWith(
        'venue-a',
        expect.objectContaining({ slug: 'venue-a' }),
      );

      searchParamsMock = new URLSearchParams('foo=bar');
      view.rerender(<MapView />);

      await waitFor(() =>
        expect(screen.queryByTestId('venue-quick-info')).not.toBeInTheDocument(),
      );
    });

    it('keeps the deep-linked venue-detail-obscured pin weather-gated without rewriting unrelated pins', () => {
      selectedVenueIdMock = 'venue-1';
      searchParamsMock = new URLSearchParams(
        'venue=test-venue-sunny&_state=venue-detail-obscured',
      );
      const selectedVenue = makeVenue({
        id: 'venue-1',
        name: 'Kafé Magasinet',
        slug: 'test-venue-sunny',
        status: 'Sunny',
        sunExposurePercent: 92,
      });
      const unrelatedVenue = makeVenue({
        id: 'venue-2',
        name: 'Södra Solen',
        slug: 'sodra-solen',
        status: 'Sunny',
        sunExposurePercent: 88,
      });
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([selectedVenue, unrelatedVenue]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      const pins = JSON.parse(
        screen.getByTestId('venue-pin-layer-stub').dataset.venues ?? '[]',
      ) as VenuePinData[];
      expect(pins.find((pin) => pin.id === 'venue-1')).toMatchObject({
        sunStatus: 'CloudObscured',
        weatherGateState: 'gated',
        sunExposurePercent: 95,
      });
      expect(pins.find((pin) => pin.id === 'venue-2')).toMatchObject({
        sunStatus: 'Sunny',
        weatherGateState: 'not_gated',
        sunExposurePercent: 88,
      });
    });

    it('uses URL detail data instead of stale selected venue fallback', () => {
      selectedVenueIdMock = 'venue-1';
      searchParamsMock = new URLSearchParams('venue=venue-b');
      const selectedVenue = makeVenue({ id: 'venue-1', name: 'Stale venue', slug: 'venue-a' });
      const urlVenue = makeVenue({ id: 'venue-2', name: 'URL venue', slug: 'venue-b' });
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([selectedVenue]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });
      useVenueDetailMock.mockReturnValue({
        data: {
          venue: {
            ...urlVenue,
            description: 'URL-owned detail',
            address: 'URLgatan 1',
            openingHours: {
              '1': { open: '11:00', close: '22:00' },
              '2': { open: '11:00', close: '22:00' },
              '3': { open: '11:00', close: '22:00' },
              '4': { open: '11:00', close: '22:00' },
              '5': { open: '11:00', close: '22:00' },
              '6': { open: '11:00', close: '22:00' },
              '7': { open: '11:00', close: '22:00' },
            }, // Story 11.9 (AC2): per-weekday hours (closes 22:00 every day)
            timeline: {
              timezone: 'Europe/Stockholm',
              range: { start: '06:00', end: '21:00' },
              windows: [{ start: '13:00', end: '18:30', status: 'Sunny' }],
            },
          },
          timestamp: 'now',
        },
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(screen.getByTestId('mobile-venue-detail-sheet')).toHaveAttribute(
        'aria-label',
        'URL venue',
      );
      expect(screen.getByTestId('desktop-venue-detail-panel')).toHaveAttribute(
        'aria-label',
        'URL venue',
      );
      expect(screen.getAllByRole('heading', { name: 'URL venue' })).toHaveLength(2);
    });

    it('lets a changed venue URL override stale selected preview state', () => {
      selectedVenueIdMock = 'venue-1';
      selectedVenuePreviewMock = makeVenue({ id: 'venue-1', name: 'Stale venue', slug: 'venue-a' });
      searchParamsMock = new URLSearchParams('venue=venue-b');
      const urlVenue = makeVenue({ id: 'venue-2', name: 'URL venue', slug: 'venue-b' });
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([selectedVenuePreviewMock, urlVenue]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(selectVenueMock).toHaveBeenCalledWith('venue-2', expect.objectContaining({ id: 'venue-2' }));
      expect(routerReplaceMock).not.toHaveBeenCalled();
    });

    it('does not fabricate a detail sheet once an unknown venue slug returns an error', () => {
      searchParamsMock = new URLSearchParams('venue=unknown-sunny-place');
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });
      useVenueDetailMock.mockReturnValue({
        data: undefined,
        isFetching: false,
        isError: true,
        refetch: vi.fn(),
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(screen.queryByTestId('mobile-venue-detail-sheet')).not.toBeInTheDocument();
      expect(screen.queryByText('Unknown Sunny Place')).not.toBeInTheDocument();
    });

    it('keeps selected QuickInfo visible when a stale detail slug cannot resolve', () => {
      searchParamsMock = new URLSearchParams('venue=unknown-sunny-place');
      selectedVenueIdMock = 'venue-1';
      selectedVenuePreviewMock = makeVenue({
        id: 'venue-1',
        name: 'Kafé Magasinet',
        slug: 'test-venue-sunny',
      });
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([selectedVenuePreviewMock]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });
      useVenueDetailMock.mockReturnValue({
        data: undefined,
        isFetching: false,
        isError: true,
        refetch: vi.fn(),
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(screen.queryByTestId('mobile-venue-detail-sheet')).not.toBeInTheDocument();
      expect(screen.getAllByTestId('venue-quick-info')).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: 'Kafé Magasinet' })).toHaveLength(2);
    });

    it('renders a localized not-found state with a way back to the map for an unknown venue slug (Story 3.4 AC #2)', () => {
      searchParamsMock = new URLSearchParams('venue=unknown-sunny-place');
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });
      useVenueDetailMock.mockReturnValue({
        data: undefined,
        isFetching: false,
        isError: true,
        error: new Error('Venue detail failed: 404 Not Found'),
        refetch: vi.fn(),
      });

      render(<MapView />, { wrapper: Wrapper });

      const alert = screen.getByTestId('venue-detail-error');
      expect(alert).toHaveTextContent('Platsen hittades inte.');
      expect(within(alert).queryByRole('button', { name: 'Försök igen' })).toBeNull();
      fireEvent.click(within(alert).getByRole('button', { name: 'Tillbaka till kartan' }));
      expect(routerReplaceMock).toHaveBeenCalledWith('/');
    });

    it('renders a localized not-found state for a present-but-blank venue slug (Story 3.4 AC #2, review R2-P1)', () => {
      // A whitespace-only ?venue= slug disables the detail query (it never
      // errors), so without the R2-P1 fix the user would be stranded on a
      // dead param with no surface.
      searchParamsMock = new URLSearchParams('venue=%20');
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });
      useVenueDetailMock.mockReturnValue({
        data: undefined,
        isFetching: false,
        isError: false,
        error: undefined,
        refetch: vi.fn(),
      });

      render(<MapView />, { wrapper: Wrapper });

      const alert = screen.getByTestId('venue-detail-error');
      expect(alert).toHaveTextContent('Platsen hittades inte.');
      expect(within(alert).queryByRole('button', { name: 'Försök igen' })).toBeNull();
      fireEvent.click(within(alert).getByRole('button', { name: 'Tillbaka till kartan' }));
      expect(routerReplaceMock).toHaveBeenCalledWith('/');
    });

    it('renders a localized retry state when a venue detail deep link fails to load (Story 3.4 AC #2)', () => {
      searchParamsMock = new URLSearchParams('venue=test-venue-sunny');
      const refetch = vi.fn();
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });
      useVenueDetailMock.mockReturnValue({
        data: undefined,
        isFetching: false,
        isError: true,
        error: new Error('Venue detail failed: 500 Internal Server Error'),
        refetch,
      });

      render(<MapView />, { wrapper: Wrapper });

      const alert = screen.getByTestId('venue-detail-error');
      expect(alert).toHaveTextContent('Kunde inte ladda platsen.');
      fireEvent.click(within(alert).getByRole('button', { name: 'Försök igen' }));
      expect(refetch).toHaveBeenCalled();
      fireEvent.click(within(alert).getByRole('button', { name: 'Tillbaka till kartan' }));
      expect(routerReplaceMock).toHaveBeenCalledWith('/');
    });

    it('keeps a retry affordance visible when detail data fails behind a fallback overlay (Story 3.4 AC #2)', () => {
      searchParamsMock = new URLSearchParams('venue=test-venue-sunny');
      const refetch = vi.fn();
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Kafé Magasinet', slug: 'test-venue-sunny' }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });
      useVenueDetailMock.mockReturnValue({
        data: undefined,
        isFetching: false,
        isError: true,
        error: new Error('Venue detail failed: 500 Internal Server Error'),
        refetch,
      });

      const { rerender } = render(<MapView />, { wrapper: Wrapper });
      rerender(<MapView />);

      expect(screen.getByTestId('mobile-venue-detail-sheet')).toBeInTheDocument();
      const alert = screen.getByTestId('venue-detail-error');
      expect(within(alert).queryByRole('button', { name: 'Tillbaka till kartan' })).toBeNull();
      fireEvent.click(within(alert).getByRole('button', { name: 'Försök igen' }));
      expect(refetch).toHaveBeenCalled();
    });

    it('suppresses the not-found alert when fallback venue content already renders for a 404 detail', () => {
      searchParamsMock = new URLSearchParams('venue=test-venue-sunny');
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Kafé Magasinet', slug: 'test-venue-sunny' }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });
      useVenueDetailMock.mockReturnValue({
        data: undefined,
        isFetching: false,
        isError: true,
        error: new Error('Venue detail failed: 404 Not Found'),
        refetch: vi.fn(),
      });

      const { rerender } = render(<MapView />, { wrapper: Wrapper });
      rerender(<MapView />);

      expect(screen.getByTestId('mobile-venue-detail-sheet')).toBeInTheDocument();
      expect(screen.queryByTestId('venue-detail-error')).toBeNull();
    });

    it('hides the detail error notice while a retry is in flight (review R1-P2)', () => {
      searchParamsMock = new URLSearchParams('venue=test-venue-sunny');
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });
      useVenueDetailMock.mockReturnValue({
        data: undefined,
        isFetching: true,
        isError: true,
        error: new Error('Venue detail failed: 500 Internal Server Error'),
        refetch: vi.fn(),
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(screen.queryByTestId('venue-detail-error')).toBeNull();
    });

    it('yields to the map-level venue error instead of stacking a second alert (review R1-P3)', () => {
      searchParamsMock = new URLSearchParams('venue=test-venue-sunny');
      useVenueSearchMock.mockReturnValue({
        data: undefined,
        isFetching: false,
        isError: true,
        dataUpdatedAt: 0,
      });
      useVenueDetailMock.mockReturnValue({
        data: undefined,
        isFetching: false,
        isError: true,
        error: new Error('Venue detail failed: 500 Internal Server Error'),
        refetch: vi.fn(),
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(screen.getByTestId('map-error-inline')).toBeInTheDocument();
      expect(screen.queryByTestId('venue-detail-error')).toBeNull();
    });

    it('omits confidence context when routing from the synthetic loading-fallback venue (review R1-P1)', () => {
      vi.spyOn(window, 'open').mockImplementation(() => null);
      searchParamsMock = new URLSearchParams('venue=unknown-but-loading');
      useVenueSearchMock.mockReturnValue({
        data: {
          ...makeVenueResponse([]),
          meta: {
            count: 0,
            radiusKm: 1.5,
            sunDataSource: 'weather',
            weatherUpdatedAt: '2999-01-01T00:00:00.000Z',
          },
        },
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });
      useVenueDetailMock.mockReturnValue({
        data: undefined,
        isFetching: true,
        isError: false,
        refetch: vi.fn(),
      });

      const { rerender } = render(<MapView />, { wrapper: Wrapper });
      rerender(<MapView />);

      expect(screen.getByTestId('mobile-venue-detail-sheet')).toBeInTheDocument();
      fireEvent.click(screen.getAllByRole('button', { name: /Visa Rutt/ })[0]);

      const overlay = screen.getByRole('dialog', { name: 'Rutt till Unknown But Loading' });
      // Fresh list meta + the synthetic venue's hardcoded confidence: 0 must
      // not surface as an invented "Säkerhet 0%".
      expect(overlay).not.toHaveTextContent('Säkerhet');
    });

    it('keeps detail responses whose canonical slug differs from the URL alias', () => {
      searchParamsMock = new URLSearchParams('venue=legacy-alias');
      const aliasVenue = {
        ...makeVenue({ id: 'venue-9', name: 'Alias venue', slug: 'canonical-slug' }),
        venueSlug: 'legacy-alias',
      };
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([aliasVenue]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });
      useVenueDetailMock.mockReturnValue({
        data: {
          venue: {
            ...aliasVenue,
            description: 'Alias-owned detail',
            address: 'Aliasgatan 1',
            openingHours: {
              '1': { open: '11:00', close: '22:00' },
              '2': { open: '11:00', close: '22:00' },
              '3': { open: '11:00', close: '22:00' },
              '4': { open: '11:00', close: '22:00' },
              '5': { open: '11:00', close: '22:00' },
              '6': { open: '11:00', close: '22:00' },
              '7': { open: '11:00', close: '22:00' },
            }, // Story 11.9 (AC2): per-weekday hours (closes 22:00 every day)
            timeline: {
              timezone: 'Europe/Stockholm',
              range: { start: '06:00', end: '21:00' },
              windows: [{ start: '13:00', end: '18:30', status: 'Sunny' }],
            },
          },
          timestamp: 'now',
        },
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(screen.getByTestId('mobile-venue-detail-sheet')).toHaveAttribute(
        'aria-label',
        'Alias venue',
      );
      expect(screen.getAllByRole('heading', { name: 'Alias venue' })).toHaveLength(2);
      expect(routerReplaceMock).not.toHaveBeenCalled();
    });
  });

  describe('venue list orchestration', () => {
    it('renders the mobile venue list sheet with three visible rows by default', () => {
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Bellora' }),
          makeVenue({ id: 'venue-2', name: 'Avenybaren' }),
          makeVenue({ id: 'venue-3', name: 'Solgården' }),
          makeVenue({ id: 'venue-4', name: 'Kvällsljus' }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(screen.getByTestId('mobile-bottom-sheet')).toHaveAttribute('data-state', 'rows-3');
      expect(screen.getByTestId('mobile-bottom-sheet')).toHaveAttribute('data-visible-rows', '3');
      expect(screen.getAllByTestId('venue-card')[0]).toHaveTextContent('Bellora');
    });

    it('ignores row-sheet capture params on production URLs without an explicit forced state', () => {
      searchParamsMock = new URLSearchParams('_sheetRows=0&_sheetDrag=mid');
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Bellora' }),
          makeVenue({ id: 'venue-2', name: 'Avenybaren' }),
          makeVenue({ id: 'venue-3', name: 'Solgården' }),
          makeVenue({ id: 'venue-4', name: 'Kvällsljus' }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      const sheet = screen.getByTestId('mobile-bottom-sheet');
      expect(sheet).toHaveAttribute('data-visible-rows', '3');
      expect(sheet).toHaveAttribute('data-dragging', 'false');
    });

    it('uses reference-safe mobile list chrome for forced visual validation', () => {
      searchParamsMock = new URLSearchParams('_state=map-panel-venues');
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({
            id: 'venue-1',
            name: 'Bellora',
            sunExposurePercent: 61,
            thumbnailUrl: 'https://example.com/bellora.jpg',
          }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      const { container } = render(<MapView />, { wrapper: Wrapper });

      expect(screen.getByTestId('mobile-bottom-sheet')).toHaveAttribute('data-state', 'rows-1');
      expect(screen.getByTestId('mobile-bottom-sheet')).toHaveAttribute('data-visible-rows', '1');
      expect(screen.getByTestId('mobile-bottom-sheet')).toHaveAttribute('data-max-rows', '1');
      expect(screen.queryByRole('search', { name: 'Sök plats' })).not.toBeInTheDocument();
      expect(screen.queryByTestId('mobile-bottom-sheet-backdrop')).not.toBeInTheDocument();
      expect(screen.getAllByTestId('venue-card')[0]).toHaveTextContent('Bellora');
      expect(screen.getAllByTestId('venue-card')[0]).toHaveTextContent('FULL SOL');
      // Story 12.13: row cards must not expose model confidence while the
      // Story 12.9 compact mobile row uses public status copy instead of the
      // taller card's visible percentage line.
      expect(screen.getAllByTestId('venue-card')[0]).not.toHaveTextContent('Säkerhet');
      expect(container.querySelector('img[src="https://example.com/bellora.jpg"]')).toBeNull();
    });

    it('keeps real mobile pin and list sun data when only the reference time is forced', () => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
      searchParamsMock = new URLSearchParams('_time=14:00');
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({
            id: 'venue-1',
            name: 'Bellora',
            status: 'Partial',
            sunExposurePercent: 61,
          }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      const pins = JSON.parse(screen.getByTestId('venue-pin-layer-stub').dataset.venues ?? '[]') as VenuePinData[];
      expect(pins[0]).toMatchObject({
        id: 'venue-1',
        sunStatus: 'Partial',
        weatherGateState: 'not_gated',
        sunExposurePercent: 61,
      });
      expect(screen.getAllByTestId('venue-card')[0]).toHaveTextContent('DELVIS SOL');
    });

    it('applies map-primary visual normalization only behind explicit _state', () => {
      searchParamsMock = new URLSearchParams('_state=map-primary&_time=14:00');
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({
            id: 'venue-1',
            name: 'Bellora',
            status: 'Partial',
            sunExposurePercent: 61,
            thumbnailUrl: 'https://example.com/bellora.jpg',
          }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      const { container } = render(<MapView />, { wrapper: Wrapper });

      const pins = JSON.parse(screen.getByTestId('venue-pin-layer-stub').dataset.venues ?? '[]') as VenuePinData[];
      expect(pins[0]).toMatchObject({
        id: 'venue-1',
        sunStatus: 'Sunny',
        weatherGateState: 'not_gated',
        sunExposurePercent: 95,
      });
      expect(screen.getAllByTestId('venue-card')[0]).toHaveTextContent('FULL SOL');
      expect(container.querySelector('img[src="https://example.com/bellora.jpg"]')).toBeNull();
    });

    it('renders a desktop 340px overlay venue panel without removing the map container', () => {
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([makeVenue({ id: 'venue-1', name: 'Bellora' })]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(screen.getByTestId('desktop-venue-list-panel')).toHaveClass('lg:w-venue-list-desktop');
      expect(screen.getAllByTestId('venue-card').map((card) => card.textContent)).toEqual([
        expect.stringContaining('Bellora'),
        expect.stringContaining('Bellora'),
      ]);
      expect(screen.getByTestId('map-container-stub')).toBeInTheDocument();
    });

    describe('Story 9.7 — tag filter (list + pins filter identically)', () => {
      // Three venues: two carry Innergård, one carries only Kanal.
      const venueA = { ...makeVenue({ id: 'v-a', name: 'Alfa' }), tags: ['Innergård', 'Hund ok'] };
      const venueB = { ...makeVenue({ id: 'v-b', name: 'Beta' }), tags: ['Kanal'] };
      const venueC = { ...makeVenue({ id: 'v-c', name: 'Gamma' }), tags: ['Innergård'] };

      function mockThreeVenues() {
        useVenueSearchMock.mockReturnValue({
          data: makeVenueResponse([venueA, venueB, venueC]),
          isFetching: false,
          isError: false,
          dataUpdatedAt: 1,
        });
      }

      function desktopVenueCardNames(): string[] {
        return within(screen.getByTestId('desktop-venue-list-panel'))
          .getAllByTestId('venue-card')
          .map((card) => card.textContent ?? '');
      }

      it('no active chip → ALL venues in both the list and the pins (AC4 no-op)', () => {
        mockThreeVenues();
        render(<MapView />, { wrapper: Wrapper });

        expect(pinLayerIds()).toEqual(['v-a', 'v-b', 'v-c']);
        const names = desktopVenueCardNames();
        expect(names.some((n) => n.includes('Alfa'))).toBe(true);
        expect(names.some((n) => n.includes('Beta'))).toBe(true);
        expect(names.some((n) => n.includes('Gamma'))).toBe(true);
      });

      it('one active chip → only matching venues, in BOTH the list and the pins (AC3)', () => {
        setActiveTags('Innergård');
        mockThreeVenues();
        render(<MapView />, { wrapper: Wrapper });

        // Pins filtered identically to the list: Beta (Kanal-only) is excluded.
        expect(pinLayerIds()).toEqual(['v-a', 'v-c']);
        const names = desktopVenueCardNames();
        expect(names.some((n) => n.includes('Alfa'))).toBe(true);
        expect(names.some((n) => n.includes('Gamma'))).toBe(true);
        expect(names.some((n) => n.includes('Beta'))).toBe(false);
      });

      it('multi-select is OR/union — a venue matches ANY active tag (AC3)', () => {
        setActiveTags('Innergård', 'Kanal');
        mockThreeVenues();
        render(<MapView />, { wrapper: Wrapper });

        // Innergård (Alfa, Gamma) OR Kanal (Beta) → all three, source order kept.
        expect(pinLayerIds()).toEqual(['v-a', 'v-b', 'v-c']);
      });

      it('no venue matches → empty list state + zero pins (AC3)', () => {
        setActiveTags('NoSuchTag');
        mockThreeVenues();
        render(<MapView />, { wrapper: Wrapper });

        expect(pinLayerIds()).toEqual([]);
        expect(
          within(screen.getByTestId('desktop-venue-list-panel')).queryAllByTestId('venue-card'),
        ).toHaveLength(0);
        // The existing venue.list.empty copy renders (not gated on isLoading).
        expect(screen.getAllByText('Inga platser hittades i det här området.').length).toBeGreaterThan(0);
      });
    });

    describe('Story 11.3 — mobile tag-chip row in the bottom-sheet header (AC1)', () => {
      const venueA = { ...makeVenue({ id: 'v-a', name: 'Alfa' }), tags: ['Innergård', 'Hund ok'] };
      const venueB = { ...makeVenue({ id: 'v-b', name: 'Beta' }), tags: ['Kanal'] };

      function mockTwoVenues(isFetching = false) {
        useVenueSearchMock.mockReturnValue({
          data: makeVenueResponse([venueA, venueB]),
          isFetching,
          isError: false,
          dataUpdatedAt: 1,
        });
      }

      function mobileSheet(): HTMLElement {
        return screen.getByTestId('mobile-bottom-sheet');
      }

      it('renders the data-driven chip row inside the mobile sheet, from the loaded venues tag union', () => {
        mockTwoVenues();
        render(<MapView />, { wrapper: Wrapper });

        const chips = within(mobileSheet()).getByTestId('mobile-tag-chips');
        // Union of the loaded venues' tags, first-seen order: Innergård, Hund ok, Kanal.
        expect(within(chips).getByRole('button', { name: 'Innergård' })).toBeInTheDocument();
        expect(within(chips).getByRole('button', { name: 'Hund ok' })).toBeInTheDocument();
        expect(within(chips).getByRole('button', { name: 'Kanal' })).toBeInTheDocument();
      });

      it('places the chip row directly UNDER the mobile sort toggles in the sheet header', () => {
        mockTwoVenues();
        render(<MapView />, { wrapper: Wrapper });

        const sheet = mobileSheet();
        // The sort toggles ("Mest sol") are the first sheet child; the chip row
        // follows them in DOM order.
        const sortToggle = within(sheet).getByRole('button', { name: 'Mest sol' });
        const chips = within(sheet).getByTestId('mobile-tag-chips');
        const position = sortToggle.compareDocumentPosition(chips);
        // DOCUMENT_POSITION_FOLLOWING === 4: the chip row comes AFTER the toggle.
        expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      });

      it('toggling a mobile chip writes the shared TagFilterContext (calls toggleTag)', () => {
        mockTwoVenues();
        render(<MapView />, { wrapper: Wrapper });

        const chips = within(mobileSheet()).getByTestId('mobile-tag-chips');
        fireEvent.click(within(chips).getByRole('button', { name: 'Innergård' }));
        expect(toggleTagMock).toHaveBeenCalledWith('Innergård');
      });

      it('a mobile chip reflects active state (aria-pressed + "on" pill) from the shared context', () => {
        setActiveTags('Innergård');
        mockTwoVenues();
        render(<MapView />, { wrapper: Wrapper });

        const chips = within(mobileSheet()).getByTestId('mobile-tag-chips');
        const active = within(chips).getByRole('button', { name: 'Innergård' });
        expect(active).toHaveAttribute('aria-pressed', 'true');
        expect(active.className).toContain('bg-text-primary');
        expect(active.className).toContain('text-white');
      });

      it('a filtered-to-empty mobile list shows the empty copy — NOT the loading skeleton — during a concurrent background refetch (9.7 fold-in)', () => {
        // Venues ARE loaded, a tag filter prunes them to zero, AND a background
        // refetch is in flight (isFetching=true). The mobile list must show the
        // "nothing matches" copy, not the 3-card skeleton.
        setActiveTags('NoSuchTag');
        mockTwoVenues(true);
        render(<MapView />, { wrapper: Wrapper });

        const sheet = mobileSheet();
        expect(within(sheet).getByText('Inga platser hittades i det här området.')).toBeInTheDocument();
        // The loading skeleton (role=status, aria-busy) must NOT be shown.
        expect(within(sheet).queryByRole('status')).toBeNull();
      });

      it('still shows the skeleton on a genuine first load (no venues loaded yet, fetching)', () => {
        useVenueSearchMock.mockReturnValue({
          data: undefined,
          isFetching: true,
          isError: false,
          dataUpdatedAt: 0,
        });
        render(<MapView />, { wrapper: Wrapper });

        // Pre-data: the skeleton is the correct state (nothing loaded to filter).
        expect(within(mobileSheet()).getByRole('status')).toBeInTheDocument();
      });
    });

    describe('Story 12.14 — selected-time venue availability filtering', () => {
      const closedAtSelectedTimeHours = {
        '1': { open: '18:00', close: '22:00' },
        '2': { open: '18:00', close: '22:00' },
        '3': { open: '18:00', close: '22:00' },
        '4': { open: '18:00', close: '22:00' },
        '5': { open: '18:00', close: '22:00' },
        '6': { open: '18:00', close: '22:00' },
        '7': { open: '18:00', close: '22:00' },
      };

      it('removes closed venues from discovery pins, ranked rows, and tags while keeping unknown venues', () => {
        const openVenue = { ...makeVenue({ id: 'open', name: 'Öppen plats' }), tags: ['Kanal'] };
        const closedVenue = {
          ...makeVenue({
            id: 'closed',
            name: 'Stängd plats',
            openingHours: closedAtSelectedTimeHours,
          }),
          tags: ['Innergård'],
        };
        const unknownVenue = {
          ...makeVenue({ id: 'unknown', name: 'Okänd plats', openingHours: undefined }),
          tags: ['Tak'],
        };
        useVenueSearchMock.mockReturnValue({
          data: makeVenueResponse([openVenue, closedVenue, unknownVenue]),
          isFetching: false,
          isError: false,
          dataUpdatedAt: 1,
        });

        render(<MapView />, { wrapper: Wrapper });

        expect(pinLayerIds()).toEqual(['open', 'unknown']);
        const panel = within(screen.getByTestId('desktop-venue-list-panel'));
        expect(panel.getByRole('button', { name: /Välj Öppen plats/ })).toBeInTheDocument();
        expect(panel.getByRole('button', { name: /Välj Okänd plats/ })).toBeInTheDocument();
        expect(panel.queryByRole('button', { name: /Välj Stängd plats/ })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Innergård' })).toBeNull();
      });

      it('retains a closed saved favourite in the list but removes its pin and opens detail directly', () => {
        pathnameMock = '/favoriter';
        const closedFavourite = makeVenue({
          id: 'closed-favourite',
          name: 'Sparad stängd plats',
          slug: 'sparad-stangd-plats',
          openingHours: closedAtSelectedTimeHours,
        });
        useVenueSearchMock.mockReturnValue({
          data: makeVenueResponse([closedFavourite]),
          isFetching: false,
          isError: false,
          dataUpdatedAt: 1,
        });
        useFavouritesMock.mockReturnValue({
          favouriteIds: ['closed-favourite'],
          isHydrated: true,
          isFavourite: (id: string) => id === 'closed-favourite',
          toggleFavourite: vi.fn(),
          addFavourite: vi.fn(),
          removeFavourite: vi.fn(),
        });

        render(<MapView />, { wrapper: Wrapper });

        expect(pinLayerIds()).toEqual([]);
        expect(screen.getAllByText('Stängt vid vald tid').length).toBeGreaterThan(0);
        fireEvent.click(screen.getAllByRole('button', {
          name: /Välj Sparad stängd plats.*Stängt vid vald tid/,
        })[0]);

        expect(selectVenueMock).not.toHaveBeenCalledWith('closed-favourite', expect.anything());
        expect(stubMap.easeTo).not.toHaveBeenCalled();
        expect(routerPushMock).toHaveBeenCalledWith({
          pathname: '/favoriter',
          query: { venue: 'sparad-stangd-plats' },
        });
      });

      it('does not reintroduce a closed selected preview as a map pin or quick-info card', () => {
        const closedPreview = makeVenue({
          id: 'closed-preview',
          name: 'Vald stängd plats',
          slug: 'vald-stangd-plats',
          openingHours: closedAtSelectedTimeHours,
        });
        selectedVenueIdMock = closedPreview.id;
        selectedVenuePreviewMock = closedPreview;
        useVenueSearchMock.mockReturnValue({
          data: makeVenueResponse([]),
          isFetching: false,
          isError: false,
          dataUpdatedAt: 1,
        });

        render(<MapView />, { wrapper: Wrapper });

        expect(pinLayerIds()).toEqual([]);
        expect(screen.queryByText('Vald stängd plats')).toBeNull();
      });
    });

    it('constrains the desktop planner to clear the venue list and shrink for the open detail panel', () => {
      searchParamsMock = new URLSearchParams('venue=test-venue-sunny&_state=venue-detail');
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([makeVenue({ id: 'venue-1', name: 'Bellora', slug: 'test-venue-sunny' })]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      const desktopPlanner = screen
        .getAllByTestId('time-slider-panel')
        .find((panel) => panel.className.includes('lg:flex'));
      // Matches the Claude Design reference: offset to clear the 340px venue
      // list on the left, and shrunk from the right by the 390px detail panel
      // while it is open. Never the full-bleed `left-4 right-4` it shipped as.
      expect(desktopPlanner?.className).toContain(
        'left-[calc(var(--size-venue-list-desktop-w)+1rem)]',
      );
      expect(desktopPlanner?.className).toContain(
        'right-[calc(var(--size-venue-detail-panel-w)+1rem)]',
      );
      expect(desktopPlanner).not.toHaveClass('left-4');
    });

    it('right-aligns the desktop planner to the viewport edge when no detail panel is open', () => {
      searchParamsMock = new URLSearchParams();
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([makeVenue({ id: 'venue-1', name: 'Bellora' })]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      const desktopPlanner = screen
        .getAllByTestId('time-slider-panel')
        .find((panel) => panel.className.includes('lg:flex'));
      // Still clears the venue list on the left, but with no detail panel open
      // the right edge sits at the standard 16px inset.
      expect(desktopPlanner?.className).toContain(
        'left-[calc(var(--size-venue-list-desktop-w)+1rem)]',
      );
      expect(desktopPlanner).toHaveClass('right-4');
      expect(desktopPlanner?.className).not.toContain('var(--size-venue-detail-panel-w)');
    });

    it('renders the venue-list empty state when no venues are loaded', () => {
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(screen.getAllByText('Inga platser hittades i det här området.')).toHaveLength(2);
    });

    it('selects a venue from the list, recenters the map, and leaves QuickInfo handoff to selection state', () => {
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([makeVenue({ id: 'venue-1', name: 'Bellora' })]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });
      fireEvent.click(screen.getAllByRole('button', { name: /Välj Bellora/ })[0]);

      expect(selectVenueMock).toHaveBeenCalledWith('venue-1', expect.objectContaining({ id: 'venue-1' }));
      expect(stubMap.easeTo).toHaveBeenCalledWith({
        center: [11.97, 57.7],
        duration: 500,
      });
      expect(screen.getByTestId('map-container-stub')).toBeInTheDocument();
    });

    it('passes favourite venue DTOs into selection so out-of-radius favourites can open QuickInfo', () => {
      pathnameMock = '/favoriter';
      const favouriteVenue = makeVenue({ id: 'outside-favourite', name: 'Utflyktsplats' });
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });
      useFavouriteVenuesMock.mockReturnValue({
        data: makeVenueResponse([favouriteVenue]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
        refetch: vi.fn(),
      });
      useFavouritesMock.mockReturnValue({
        favouriteIds: ['outside-favourite'],
        isHydrated: true,
        isFavourite: (id: string) => id === 'outside-favourite',
        toggleFavourite: vi.fn(),
        addFavourite: vi.fn(),
        removeFavourite: vi.fn(),
      });

      const view = render(<MapView />, { wrapper: Wrapper });
      fireEvent.click(screen.getAllByRole('button', { name: /Välj Utflyktsplats/ })[0]);

      expect(selectVenueMock).toHaveBeenCalledWith('outside-favourite', favouriteVenue);
      selectVenueMock.mockClear();
      view.rerender(<MapView />);
      expect(selectVenueMock).not.toHaveBeenCalledWith(null);
    });

    it('preserves the mobile favourites sheet row count after selecting a saved venue', async () => {
      pathnameMock = '/favoriter';
      const favouriteVenue = makeVenue({ id: 'outside-favourite', name: 'Utflyktsplats' });
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });
      useFavouriteVenuesMock.mockReturnValue({
        data: makeVenueResponse([favouriteVenue]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
        refetch: vi.fn(),
      });
      useFavouritesMock.mockReturnValue({
        favouriteIds: ['outside-favourite'],
        isHydrated: true,
        isFavourite: (id: string) => id === 'outside-favourite',
        toggleFavourite: vi.fn(),
        addFavourite: vi.fn(),
        removeFavourite: vi.fn(),
      });

      render(<MapView />, { wrapper: Wrapper });
      fireEvent.click(screen.getAllByRole('button', { name: /Välj Utflyktsplats/ })[0]);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-bottom-sheet')).toHaveAttribute('data-state', 'rows-1');
        expect(screen.getByTestId('mobile-bottom-sheet')).toHaveAttribute('data-visible-rows', '1');
      });
      expect(selectVenueMock).toHaveBeenCalledWith('outside-favourite', favouriteVenue);
    });

    it('refreshes a selected out-of-radius favourite from the favourite query rows', () => {
      pathnameMock = '/favoriter';
      const staleFavourite = makeVenue({
        id: 'outside-favourite',
        name: 'Utflyktsplats',
        status: 'Shaded',
        sunExposurePercent: 12,
      });
      const refreshedFavourite = makeVenue({
        id: 'outside-favourite',
        name: 'Utflyktsplats',
        status: 'Sunny',
        sunExposurePercent: 91,
      });
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });
      useFavouriteVenuesMock.mockReturnValue({
        data: makeVenueResponse([staleFavourite]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
        refetch: vi.fn(),
      });
      useFavouritesMock.mockReturnValue({
        favouriteIds: ['outside-favourite'],
        isHydrated: true,
        isFavourite: (id: string) => id === 'outside-favourite',
        toggleFavourite: vi.fn(),
        addFavourite: vi.fn(),
        removeFavourite: vi.fn(),
      });

      const view = render(<MapView />, { wrapper: Wrapper });
      fireEvent.click(screen.getAllByRole('button', { name: /Välj Utflyktsplats/ })[0]);

      useFavouriteVenuesMock.mockReturnValue({
        data: makeVenueResponse([refreshedFavourite]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 2,
        refetch: vi.fn(),
      });
      view.rerender(<MapView />);

      const pins = JSON.parse(screen.getByTestId('venue-pin-layer-stub').dataset.venues ?? '[]') as VenuePinData[];
      expect(pins).toEqual([
        expect.objectContaining({
          id: 'outside-favourite',
          sunStatus: 'Sunny',
          weatherGateState: 'not_gated',
          sunExposurePercent: 91,
        }),
      ]);
    });

    it('refreshes a selected out-of-radius search preview from the detail query after planner changes', async () => {
      selectedVenueIdMock = 'outside-search';
      selectedVenuePreviewMock = makeVenue({
        id: 'outside-search',
        name: 'Sökplatsen',
        slug: 'outside-search',
        status: 'Shaded',
        sunExposurePercent: 12,
        confidence: 44,
        sunWindow: { start: '09:00', end: '10:00' },
      });
      const refreshedVenue = makeVenueDetail({
        id: 'outside-search',
        name: 'Sökplatsen',
        slug: 'outside-search',
        status: 'Sunny',
        sunExposurePercent: 88,
        confidence: 91,
        sunWindow: { start: '13:30', end: '18:00' },
      });
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });
      useVenueDetailMock.mockImplementation((slug, params) => ({
        data: slug === 'outside-search' && params?.date === '2026-05-21'
          ? {
              venue: refreshedVenue,
              meta: { sunDataSource: 'weather', weatherUpdatedAt: '2026-05-21T10:00:00.000Z' },
              timestamp: 'now',
            }
          : undefined,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      }));

      render(<MapView />, { wrapper: Wrapper });
      expect(screen.queryByText(/12% SOL/)).not.toBeInTheDocument();
      expect(JSON.parse(screen.getByTestId('venue-pin-layer-stub').dataset.venues ?? '[]')).toEqual([
        expect.objectContaining({
          id: 'outside-search',
          sunStatus: 'Shaded',
          sunExposurePercent: 12,
        }),
      ]);

      fireEvent.click(screen.getAllByRole('button', { name: /Öppna kalender: Idag/ })[0]);
      fireEvent.click(screen.getByRole('button', { name: 'Välj 21 maj 2026' }));

      await waitFor(() =>
        expect(useVenueDetailMock).toHaveBeenCalledWith('outside-search', {
          date: '2026-05-21',
          time: '12:15',
          lat: 57.7089,
          lng: 11.9746,
        }),
      );
      expect(screen.getAllByText(/88% SOL/).length).toBeGreaterThanOrEqual(2);
      expect(JSON.parse(screen.getByTestId('venue-pin-layer-stub').dataset.venues ?? '[]')).toEqual([
        expect.objectContaining({
          id: 'outside-search',
          sunStatus: 'Sunny',
          weatherGateState: 'not_gated',
          sunExposurePercent: 88,
        }),
      ]);
    });

    it('ignores disabled cached favourite rows when refreshing an out-of-radius search preview', async () => {
      selectedVenueIdMock = 'outside-search';
      selectedVenuePreviewMock = makeVenue({
        id: 'outside-search',
        name: 'Sökfavoriten',
        slug: 'outside-search',
        status: 'Shaded',
        sunExposurePercent: 15,
        confidence: 40,
        sunWindow: { start: '09:00', end: '10:00' },
      });
      const staleCachedFavourite = makeVenue({
        id: 'outside-search',
        name: 'Sökfavoriten',
        slug: 'outside-search',
        status: 'Shaded',
        sunExposurePercent: 19,
        confidence: 42,
        sunWindow: { start: '09:30', end: '10:30' },
      });
      const refreshedVenue = makeVenueDetail({
        id: 'outside-search',
        name: 'Sökfavoriten',
        slug: 'outside-search',
        status: 'Sunny',
        sunExposurePercent: 86,
        confidence: 89,
        sunWindow: { start: '13:15', end: '17:45' },
      });
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });
      useFavouriteVenuesMock.mockReturnValue({
        data: makeVenueResponse([staleCachedFavourite]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
        refetch: vi.fn(),
      });
      useFavouritesMock.mockReturnValue({
        favouriteIds: ['outside-search'],
        isHydrated: true,
        isFavourite: (id: string) => id === 'outside-search',
        toggleFavourite: vi.fn(),
        addFavourite: vi.fn(),
        removeFavourite: vi.fn(),
      });
      useVenueDetailMock.mockImplementation((slug, params) => ({
        data: slug === 'outside-search' && params?.date === '2026-05-21'
          ? {
              venue: refreshedVenue,
              meta: { sunDataSource: 'weather', weatherUpdatedAt: '2026-05-21T10:00:00.000Z' },
              timestamp: 'now',
            }
          : undefined,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      }));

      render(<MapView />, { wrapper: Wrapper });
      expect(useFavouriteVenuesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ enabled: false }),
      );

      fireEvent.click(screen.getAllByRole('button', { name: /Öppna kalender: Idag/ })[0]);
      fireEvent.click(screen.getByRole('button', { name: 'Välj 21 maj 2026' }));

      await waitFor(() =>
        expect(useVenueDetailMock).toHaveBeenCalledWith('outside-search', {
          date: '2026-05-21',
          time: '12:15',
          lat: 57.7089,
          lng: 11.9746,
        }),
      );
      // Story 11.4 (AC1): sun-window line removed — assert the refreshed geometric
      // sun badge (19% stale → 86% refreshed) as the per-time refresh proof.
      expect(screen.getAllByText(/86% SOL/).length).toBeGreaterThanOrEqual(2);
      expect(screen.queryByText(/19% SOL/)).not.toBeInTheDocument();
      expect(JSON.parse(screen.getByTestId('venue-pin-layer-stub').dataset.venues ?? '[]')).toEqual([
        expect.objectContaining({
          id: 'outside-search',
          sunStatus: 'Sunny',
          weatherGateState: 'not_gated',
          sunExposurePercent: 86,
        }),
      ]);
    });

    it('keeps the favourites skeleton while a newly saved favourite is fetching', () => {
      pathnameMock = '/favoriter';
      useFavouriteVenuesMock.mockReturnValue({
        data: makeVenueResponse([]),
        isFetching: true,
        isError: false,
        dataUpdatedAt: 1,
        refetch: vi.fn(),
      });
      useFavouritesMock.mockReturnValue({
        favouriteIds: ['venue-new'],
        isHydrated: true,
        isFavourite: (id: string) => id === 'venue-new',
        toggleFavourite: vi.fn(),
        addFavourite: vi.fn(),
        removeFavourite: vi.fn(),
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(screen.queryByText('Du har inga sparade platser än.')).not.toBeInTheDocument();
      expect(screen.getAllByTestId('venue-card-skeleton').length).toBeGreaterThan(0);
    });

    it('leaves an empty favourites sheet at zero rows instead of force-reopening it', async () => {
      pathnameMock = '/favoriter';
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });
      useFavouriteVenuesMock.mockReturnValue({
        data: makeVenueResponse([]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
        refetch: vi.fn(),
      });
      useFavouritesMock.mockReturnValue({
        favouriteIds: [],
        isHydrated: true,
        isFavourite: () => false,
        toggleFavourite: vi.fn(),
        addFavourite: vi.fn(),
        removeFavourite: vi.fn(),
      });

      render(<MapView />, { wrapper: Wrapper });

      await waitFor(() => {
        const sheet = screen.getByTestId('mobile-bottom-sheet');
        expect(sheet).toHaveAttribute('data-max-rows', '0');
        expect(sheet).toHaveAttribute('data-visible-rows', '0');
      });
      expect(screen.getAllByText('Du har inga sparade platser än.').length).toBeGreaterThan(0);
    });

    it('keeps favourite venue polling disabled until the favourites section is visible', () => {
      useFavouritesMock.mockReturnValue({
        favouriteIds: ['venue-1'],
        isHydrated: true,
        isFavourite: (id: string) => id === 'venue-1',
        toggleFavourite: vi.fn(),
        addFavourite: vi.fn(),
        removeFavourite: vi.fn(),
      });

      const view = render(<MapView />, { wrapper: Wrapper });
      expect(useFavouriteVenuesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ ids: ['venue-1'], enabled: false }),
      );

      pathnameMock = '/favoriter';
      view.rerender(<MapView />);
      expect(useFavouriteVenuesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ ids: ['venue-1'], enabled: true }),
      );
    });

    it('routes desktop list segment changes between nearby and favourites sections', () => {
      pathnameMock = '/favoriter';
      const firstRender = render(<MapView />, { wrapper: Wrapper });

      fireEvent.click(within(screen.getByTestId('desktop-venue-list-panel')).getByRole('button', { name: 'Nära mig' }));
      expect(routerPushMock).toHaveBeenCalledWith('/');

      firstRender.unmount();
      pathnameMock = '/';
      routerPushMock.mockClear();
      render(<MapView />, { wrapper: Wrapper });

      fireEvent.click(within(screen.getByTestId('desktop-venue-list-panel')).getByRole('button', { name: 'Favoriter' }));
      expect(routerPushMock).toHaveBeenCalledWith('/favoriter');
    });

    it('keeps favourites route list chrome on sunny-first sort even after distance is clicked', () => {
      pathnameMock = '/favoriter';
      useFavouriteVenuesMock.mockReturnValue({
        data: makeVenueResponse([makeVenue({ id: 'venue-1', name: 'Bellora' })]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
        refetch: vi.fn(),
      });
      useFavouritesMock.mockReturnValue({
        favouriteIds: ['venue-1'],
        isHydrated: true,
        isFavourite: (id: string) => id === 'venue-1',
        toggleFavourite: vi.fn(),
        addFavourite: vi.fn(),
        removeFavourite: vi.fn(),
      });

      render(<MapView />, { wrapper: Wrapper });

      const panel = within(screen.getByTestId('desktop-venue-list-panel'));
      fireEvent.click(panel.getByRole('button', { name: /Närmast/ }));

      expect(panel.getByRole('button', { name: 'Mest sol' })).toHaveAttribute('aria-pressed', 'true');
      expect(panel.getByRole('button', { name: /Närmast/ })).toBeDisabled();
    });

    it('opens the mobile favourites list instead of stale selected QuickInfo on /favoriter', async () => {
      pathnameMock = '/';
      selectedVenueIdMock = 'venue-selected';
      selectedVenuePreviewMock = makeVenue({ id: 'venue-selected', name: 'Vald plats' });
      const favouriteVenue = makeVenue({ id: 'venue-1', name: 'Bellora' });
      useFavouriteVenuesMock.mockReturnValue({
        data: makeVenueResponse([favouriteVenue]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
        refetch: vi.fn(),
      });
      useFavouritesMock.mockReturnValue({
        favouriteIds: ['venue-1'],
        isHydrated: true,
        isFavourite: (id: string) => id === 'venue-1',
        toggleFavourite: vi.fn(),
        addFavourite: vi.fn(),
        removeFavourite: vi.fn(),
      });

      const view = render(<MapView />, { wrapper: Wrapper });
      expect(screen.getAllByTestId('venue-quick-info').length).toBeGreaterThan(0);

      pathnameMock = '/favoriter';
      view.rerender(<MapView />);
      expect(selectVenueMock).toHaveBeenCalledWith(null);
      view.rerender(<MapView />);

      expect(screen.getByTestId('mobile-bottom-sheet')).toHaveAttribute('data-state', 'rows-1');
      await waitFor(() => expect(screen.queryAllByTestId('venue-quick-info')).toHaveLength(0));
      expect(screen.getAllByRole('button', { name: /Välj Bellora/ }).length).toBeGreaterThan(0);
    });

    it('clears stale selected QuickInfo on a direct /favoriter remount', () => {
      pathnameMock = '/favoriter';
      selectedVenueIdMock = 'venue-selected';
      selectedVenuePreviewMock = makeVenue({ id: 'venue-selected', name: 'Vald plats' });
      useFavouritesMock.mockReturnValue({
        favouriteIds: ['venue-1'],
        isHydrated: true,
        isFavourite: (id: string) => id === 'venue-1',
        toggleFavourite: vi.fn(),
        addFavourite: vi.fn(),
        removeFavourite: vi.fn(),
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(selectVenueMock).toHaveBeenCalledWith(null);
    });

    it('mounts the mobile venue search chrome in the refreshed MVP map composition', () => {
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Kafé Magasinet', slug: 'test-venue-sunny' }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(screen.getByRole('search', { name: 'Sök plats' })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'Sök plats' })).toBeInTheDocument();
      expect(screen.getByRole('search', { name: 'Sök plats' }).parentElement).toHaveClass('z-bottom-sheet-full');
    });

    it('normalizes map pins only for forced visual-reference states', () => {
      searchParamsMock = new URLSearchParams('_state=map-panel-venues');
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({
            id: 'venue-shaded',
            name: 'Skuggad referenspin',
            status: 'Shaded',
            confidence: 99,
            sunExposurePercent: 99,
            sunWindow: { start: '09:00', end: '10:00' },
          }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(JSON.parse(screen.getByTestId('venue-pin-layer-stub').dataset.venues ?? '[]')).toEqual([
        expect.objectContaining({
          id: 'venue-shaded',
          sunStatus: 'Sunny',
          weatherGateState: 'not_gated',
          sunExposurePercent: 95,
        }),
      ]);
    });

    it('normalizes selected QuickInfo data for forced selected-venue visual-reference states', () => {
      selectedVenueIdMock = 'venue-shaded';
      searchParamsMock = new URLSearchParams('_state=map-with-selected-venue');
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({
            id: 'venue-shaded',
            name: 'Skuggad referenspin',
            status: 'Shaded',
            sunExposurePercent: 99,
          }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      // Forced-visual normalization pins the geometric badge to 95% and keeps
      // the venue's real opening hours. Public confidence is not rendered; the
      // un-normalized 99% never appears.
      expect(screen.getAllByText(/95% SOL/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Öppet till 22:00/).length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText(/99% SOL/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Säkerhet/)).not.toBeInTheDocument();
      // No sun-window line renders on the quick-info at all anymore.
      expect(screen.queryByText(/Sol \d{2}:\d{2}/)).not.toBeInTheDocument();
    });

    it('keeps the amber sun-exposure badge on the route-mapped selected-venue QuickInfo', () => {
      searchParamsMock = new URLSearchParams(
        'venue=test-venue-sunny&_state=map-with-selected-venue',
      );
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({
            id: 'venue-shaded',
            name: 'Skuggad referenspin',
            slug: 'test-venue-sunny',
            status: 'Shaded',
            confidence: 12,
            sunExposurePercent: 99,
          }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      const { rerender } = render(<MapView />, { wrapper: Wrapper });
      expect(selectVenueMock).toHaveBeenCalledWith(
        'venue-shaded',
        expect.objectContaining({ slug: 'test-venue-sunny' }),
      );
      rerender(<MapView />);
      expect(prefetchSelectedVenueDetailMock).not.toHaveBeenCalled();

      const quickInfos = screen.getAllByTestId('venue-quick-info');
      expect(screen.queryByTestId('mobile-venue-detail-sheet')).not.toBeInTheDocument();
      expect(quickInfos).toHaveLength(2);
      for (const quickInfo of quickInfos) {
        expect(quickInfo).toHaveTextContent('95% SOL');
        expect(quickInfo).not.toHaveTextContent('99% SOL');
        expect(quickInfo).not.toHaveTextContent(/Säkerhet|Confidence/);
      }
    });

    it('clears an active detail URL after selecting a different venue from search', async () => {
      searchParamsMock = new URLSearchParams('venue=old-slug&_state=venue-detail');
      selectedVenueIdMock = 'venue-1';
      selectedVenuePreviewMock = makeVenue({ id: 'venue-1', name: 'Gammal plats', slug: 'old-slug' });
      const nextVenue = makeVenue({ id: 'venue-2', name: 'Ny plats', slug: 'new-slug' });
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          selectedVenuePreviewMock,
          nextVenue,
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      const { rerender } = render(<MapView />, { wrapper: Wrapper });
      act(() => {
        selectVenueMock('venue-2', nextVenue);
      });
      rerender(<MapView />);

      await waitFor(() => expect(routerReplaceMock).toHaveBeenCalledWith('/'));
    });

    it('filters invalid location rows out of the venue list before selection can recenter', () => {
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          {
            ...makeVenue({ id: 'invalid-location', name: 'Trasig plats' }),
            location: { lat: Number.NaN, lng: Number.NaN },
          },
          makeVenue({ id: 'venue-1', name: 'Bellora' }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(screen.queryByRole('button', { name: /Välj Trasig plats/ })).not.toBeInTheDocument();
      fireEvent.click(screen.getAllByRole('button', { name: /Välj Bellora/ })[0]);
      expect(stubMap.easeTo).toHaveBeenCalledWith({
        center: [11.97, 57.7],
        duration: 500,
      });
    });
  });

  describe('Story 9.4 — client query hygiene', () => {
    describe('AC1 — Favoriter sourced from the loaded list cache', () => {
      it('issues NO favourites fetch and renders the filtered venues when the favourited ids are already in the loaded list', () => {
        // Loaded Närmast list already holds the favourited venue.
        pathnameMock = '/favoriter';
        const loadedVenue = makeVenue({ id: 'venue-1', name: 'Bellora' });
        useVenueSearchMock.mockReturnValue({
          data: makeVenueResponse([
            loadedVenue,
            makeVenue({ id: 'venue-2', name: 'Annan plats' }),
          ]),
          isFetching: false,
          isError: false,
          dataUpdatedAt: 1,
        });
        // The favourites query returns nothing — it must not be the source.
        useFavouriteVenuesMock.mockReturnValue({
          data: undefined,
          isFetching: false,
          isError: false,
          dataUpdatedAt: 0,
          refetch: vi.fn(),
        });
        useFavouritesMock.mockReturnValue({
          favouriteIds: ['venue-1'],
          isHydrated: true,
          isFavourite: (id: string) => id === 'venue-1',
          toggleFavourite: vi.fn(),
          addFavourite: vi.fn(),
          removeFavourite: vi.fn(),
        });

        render(<MapView />, { wrapper: Wrapper });

        // The network favourites query is gated OFF (0 new /api/venues fetch).
        expect(useFavouriteVenuesMock).toHaveBeenLastCalledWith(
          expect.objectContaining({ ids: ['venue-1'], enabled: false }),
        );
        // The favourites list still renders the venue, derived from the
        // loaded Närmast list cache (not from a favourites fetch).
        expect(screen.getAllByRole('button', { name: /Välj Bellora/ }).length).toBeGreaterThan(0);
        // The non-favourite loaded venue is filtered out of the favourites view.
        expect(screen.queryByRole('button', { name: /Välj Annan plats/ })).not.toBeInTheDocument();
      });

      it('keeps the Närmast→Favoriter toggle from enabling a fetch when every favourite is loaded', () => {
        const loadedVenue = makeVenue({ id: 'venue-1', name: 'Bellora' });
        useVenueSearchMock.mockReturnValue({
          data: makeVenueResponse([loadedVenue]),
          isFetching: false,
          isError: false,
          dataUpdatedAt: 1,
        });
        useFavouriteVenuesMock.mockReturnValue({
          data: undefined,
          isFetching: false,
          isError: false,
          dataUpdatedAt: 0,
          refetch: vi.fn(),
        });
        useFavouritesMock.mockReturnValue({
          favouriteIds: ['venue-1'],
          isHydrated: true,
          isFavourite: (id: string) => id === 'venue-1',
          toggleFavourite: vi.fn(),
          addFavourite: vi.fn(),
          removeFavourite: vi.fn(),
        });

        // Start on Närmast — favourites query disabled (not the active view).
        const view = render(<MapView />, { wrapper: Wrapper });
        expect(useFavouriteVenuesMock).toHaveBeenLastCalledWith(
          expect.objectContaining({ enabled: false }),
        );

        // Switch to Favoriter — STILL disabled, because the favourited venue
        // is already in the loaded list (derive-from-cache, instant toggle).
        pathnameMock = '/favoriter';
        view.rerender(<MapView />);
        expect(useFavouriteVenuesMock).toHaveBeenLastCalledWith(
          expect.objectContaining({ enabled: false }),
        );
      });

      it('enables the favourites fetch when only SOME favourites are loaded, and still derives the loaded ones from cache', () => {
        // Boundary between the all-loaded (0 fetch) and none-loaded (fetch)
        // cases: `favouritesAllInLoadedList` is an `.every()`, so a SINGLE
        // missing favourite must flip the network query on — while the
        // already-loaded favourite is still rendered from the list cache
        // (and the network query, which only returns the missing one, tops
        // it up rather than replacing the derived rows).
        pathnameMock = '/favoriter';
        const loadedFavourite = makeVenue({ id: 'venue-loaded', name: 'Närfavorit' });
        useVenueSearchMock.mockReturnValue({
          data: makeVenueResponse([
            loadedFavourite,
            makeVenue({ id: 'venue-other', name: 'Inte favorit' }),
          ]),
          isFetching: false,
          isError: false,
          dataUpdatedAt: 1,
        });
        const missingFavourite = makeVenue({ id: 'venue-missing', name: 'Utflyktsfavorit' });
        useFavouriteVenuesMock.mockReturnValue({
          data: makeVenueResponse([missingFavourite]),
          isFetching: false,
          isError: false,
          dataUpdatedAt: 1,
          refetch: vi.fn(),
        });
        useFavouritesMock.mockReturnValue({
          favouriteIds: ['venue-loaded', 'venue-missing'],
          isHydrated: true,
          isFavourite: (id: string) => id === 'venue-loaded' || id === 'venue-missing',
          toggleFavourite: vi.fn(),
          addFavourite: vi.fn(),
          removeFavourite: vi.fn(),
        });

        render(<MapView />, { wrapper: Wrapper });

        // One favourite is missing from the loaded list → the network query
        // is enabled (it must NOT stay gated just because the OTHER is loaded).
        expect(useFavouriteVenuesMock).toHaveBeenLastCalledWith(
          expect.objectContaining({
            ids: ['venue-loaded', 'venue-missing'],
            enabled: true,
          }),
        );
        // Both the cache-derived favourite and the network-topped-up favourite
        // render; the non-favourite loaded venue is filtered out.
        expect(screen.getAllByRole('button', { name: /Välj Närfavorit/ }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('button', { name: /Välj Utflyktsfavorit/ }).length).toBeGreaterThan(0);
        expect(screen.queryByRole('button', { name: /Välj Inte favorit/ })).not.toBeInTheDocument();
      });

      it('falls back to a real favourites fetch for a favourited id NOT in the loaded list (out-of-radius / cold deep link)', () => {
        pathnameMock = '/favoriter';
        // Loaded list does NOT contain the favourited id.
        useVenueSearchMock.mockReturnValue({
          data: makeVenueResponse([makeVenue({ id: 'venue-loaded', name: 'Närplats' })]),
          isFetching: false,
          isError: false,
          dataUpdatedAt: 1,
        });
        const outsideFavourite = makeVenue({ id: 'outside-favourite', name: 'Utflyktsplats' });
        useFavouriteVenuesMock.mockReturnValue({
          data: makeVenueResponse([outsideFavourite]),
          isFetching: false,
          isError: false,
          dataUpdatedAt: 1,
          refetch: vi.fn(),
        });
        useFavouritesMock.mockReturnValue({
          favouriteIds: ['outside-favourite'],
          isHydrated: true,
          isFavourite: (id: string) => id === 'outside-favourite',
          toggleFavourite: vi.fn(),
          addFavourite: vi.fn(),
          removeFavourite: vi.fn(),
        });

        render(<MapView />, { wrapper: Wrapper });

        // The favourite is missing from the loaded list → the network query
        // is enabled so the out-of-radius favourite can still load.
        expect(useFavouriteVenuesMock).toHaveBeenLastCalledWith(
          expect.objectContaining({ ids: ['outside-favourite'], enabled: true }),
        );
        expect(screen.getAllByRole('button', { name: /Välj Utflyktsplats/ }).length).toBeGreaterThan(0);
      });
    });

    describe('AC2 — gate the venue query until geolocation settles', () => {
      function setGeolocationStatus(status: 'idle' | 'pending' | 'success' | 'fallback') {
        useGeolocationMock.mockReturnValue({
          status,
          coords: { lat: 57.7089, lng: 11.9746 },
          requestLocation: () => {},
          useCentrum: () => {},
        });
      }

      it('does NOT enable the venue search while geolocation is idle or pending', () => {
        setGeolocationStatus('idle');
        const view = render(<MapView />, { wrapper: Wrapper });
        expect(lastMapViewSearchCall()).toMatchObject({ enabled: false });

        setGeolocationStatus('pending');
        view.rerender(<MapView />);
        expect(lastMapViewSearchCall()).toMatchObject({ enabled: false });
      });

      it('enables the venue search exactly once geolocation settles to success', () => {
        setGeolocationStatus('idle');
        const view = render(<MapView />, { wrapper: Wrapper });
        expect(lastMapViewSearchCall()).toMatchObject({ enabled: false });

        setGeolocationStatus('success');
        view.rerender(<MapView />);
        expect(lastMapViewSearchCall()).toMatchObject({ enabled: true });
      });

      it('enables the venue search for a fallback (centrum) user so they still get exactly one prompt fetch', () => {
        setGeolocationStatus('fallback');
        render(<MapView />, { wrapper: Wrapper });
        expect(lastMapViewSearchCall()).toMatchObject({ enabled: true });
      });

      it('keeps the favourites query gated on a settled status too (no cold-deep-link fetch before location resolves)', () => {
        pathnameMock = '/favoriter';
        setGeolocationStatus('pending');
        // A favourite NOT in the (empty) loaded list would normally enable the
        // fetch, but the coordinate gate must hold it until location settles.
        useVenueSearchMock.mockReturnValue({
          data: makeVenueResponse([]),
          isFetching: false,
          isError: false,
          dataUpdatedAt: 1,
        });
        useFavouritesMock.mockReturnValue({
          favouriteIds: ['outside-favourite'],
          isHydrated: true,
          isFavourite: (id: string) => id === 'outside-favourite',
          toggleFavourite: vi.fn(),
          addFavourite: vi.fn(),
          removeFavourite: vi.fn(),
        });

        render(<MapView />, { wrapper: Wrapper });
        expect(useFavouriteVenuesMock).toHaveBeenLastCalledWith(
          expect.objectContaining({ enabled: false }),
        );
      });
    });

    describe('AC3 — deferred planner key (live-now semantics preserved)', () => {
      it('feeds the venue search the live-today date with isLiveNow=true (date in key, request omits it)', () => {
        useVenueSearchMock.mockReturnValue({
          data: makeVenueResponse([makeVenue({ id: 'venue-1', name: 'Bellora' })]),
          isFetching: false,
          isError: false,
          dataUpdatedAt: 1,
        });

        render(<MapView />, { wrapper: Wrapper });

        // Story 11.1: live now → the list search call carries the selected date
        // (so the KEY is date-scoped and a same-date scrub keeps the same key) but
        // flags `isLiveNow: true`, which tells the hook to omit date/time from the
        // request and keep polling. The date being present is the whole point —
        // it makes the live-today and off-live-today keys identical (zero fetch).
        const lastCall = lastMapViewSearchCall();
        expect(lastCall).toMatchObject({
          lat: 57.7089,
          lng: 11.9746,
          radiusKm: 1.5,
          enabled: true,
          date: '2026-05-20',
          time: '12:15',
          isLiveNow: true,
        });
      });

      it('feeds the venue search a single off-live planner key after a future date is committed', async () => {
        useVenueSearchMock.mockReturnValue({
          data: makeVenueResponse([makeVenue({ id: 'venue-1', name: 'Bellora' })]),
          isFetching: false,
          isError: false,
          dataUpdatedAt: 1,
        });

        render(<MapView />, { wrapper: Wrapper });

        fireEvent.click(screen.getAllByRole('button', { name: /Öppna kalender: Idag/ })[0]);
        fireEvent.click(screen.getByRole('button', { name: 'Välj 21 maj 2026' }));

        await waitFor(() =>
          expectVenueSearchCall({
            lat: 57.7089,
            lng: 11.9746,
            radiusKm: 1.5,
            date: '2026-05-21',
            time: '12:15',
            isLiveNow: false,
          }),
        );
      });
    });
  });
});

function makeVenueResponse(venues: GetVenuesResponse['venues']): GetVenuesResponse {
  return {
    venues,
    meta: { count: venues.length, radiusKm: 1.5 },
    timestamp: 'now',
    totalCount: venues.length,
  };
}

function lastVenueDetailPrefetchParams(): {
  enabled: boolean;
  listVenues: GetVenuesResponse['venues'];
  favouriteVenueRows: GetVenuesResponse['venues'];
  interactionToken: number;
  preserveVenueSlug?: string | null;
} | undefined {
  const lastCall = useVenueDetailPrefetchMock.mock.calls.at(-1);
  return lastCall?.[0] as ReturnType<typeof lastVenueDetailPrefetchParams>;
}

function makeVenueDetail(
  venue: Parameters<typeof makeVenue>[0],
): GetVenueDetailResponse['venue'] {
  return {
    ...makeVenue(venue),
    description: 'Detaljerad platsbeskrivning',
    address: 'Testgatan 1',
    openingHours: {
      '1': { open: '11:00', close: '22:00' },
      '2': { open: '11:00', close: '22:00' },
      '3': { open: '11:00', close: '22:00' },
      '4': { open: '11:00', close: '22:00' },
      '5': { open: '11:00', close: '22:00' },
      '6': { open: '11:00', close: '22:00' },
      '7': { open: '11:00', close: '22:00' },
    }, // Story 11.9 (AC2)
    timeline: {
      timezone: 'Europe/Stockholm',
      range: { start: '06:00', end: '21:00' },
      windows: [
        {
          start: venue.sunWindow?.start ?? '13:00',
          end: venue.sunWindow?.end ?? '18:30',
          status: venue.status ?? 'Sunny',
        },
      ],
    },
  };
}

function makeVenue({
  id,
  name,
  slug,
  status = 'Sunny',
  sunExposurePercent = 95,
  thumbnailUrl,
  confidence = 92,
  sunWindow = { start: '13:00', end: '18:30' },
  // Story 11.9 (AC2): per-weekday hours (closes 22:00 every day) so the derived
  // quick-info line is a stable "Öppet till 22:00" regardless of the CI run-day.
  openingHours = {
    '1': { open: '11:00', close: '22:00' },
    '2': { open: '11:00', close: '22:00' },
    '3': { open: '11:00', close: '22:00' },
    '4': { open: '11:00', close: '22:00' },
    '5': { open: '11:00', close: '22:00' },
    '6': { open: '11:00', close: '22:00' },
    '7': { open: '11:00', close: '22:00' },
  },
}: {
  id: string;
  name: string;
  slug?: string;
  status?: GetVenuesResponse['venues'][number]['currentSunStatus'];
  sunExposurePercent?: number;
  thumbnailUrl?: string;
  confidence?: number;
  sunWindow?: GetVenuesResponse['venues'][number]['sunWindow'];
  // Story 11.4 (AC1): opening hours now ride on the list DTO. Default present so
  // the quick-info renders its honest "Öppet till HH:MM" line in these
  // integration renders; pass `undefined` to exercise the absent branch.
  openingHours?: GetVenuesResponse['venues'][number]['openingHours'];
}): GetVenuesResponse['venues'][number] {
  return {
    id,
    venueId: id,
    venueName: name,
    venueSlug: slug ?? id,
    slug: slug ?? id,
    neighborhood: 'Centrum',
    location: { lat: 57.7, lng: 11.97 },
    currentSunStatus: status,
    weatherGateState: 'not_gated',
    isPartner: false,
    confidence,
    distanceMeters: 180,
    sunExposurePercent,
    tags: [],
    sunWindow,
    ...(openingHours ? { openingHours } : {}),
    thumbnail: {
      alt: `${name} uteservering`,
      initials: name.slice(0, 2),
      url: thumbnailUrl,
    },
  };
}
