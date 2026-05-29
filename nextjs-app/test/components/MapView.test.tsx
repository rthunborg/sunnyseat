import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import type maplibregl from 'maplibre-gl';
import { NextIntlClientProvider } from 'next-intl';
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
};

const useGeolocationMock = vi.fn(() => ({
  status: 'idle' as const,
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

const useVenueDetailMock = vi.fn<(slug?: string | null, params?: {
  date?: string;
  time?: string;
  lat?: number;
  lng?: number;
}) => {
  data: GetVenueDetailResponse | undefined;
  isFetching: boolean;
  isError: boolean;
}>(() => ({
  data: undefined,
  isFetching: false,
  isError: false,
}));
const useFavouriteVenuesMock = vi.fn<(params?: FavouriteVenuesParams) => VenueQueryShape>(() => ({
  data: undefined,
  isFetching: false,
  isError: false,
  dataUpdatedAt: 0,
}));
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
  VenuePinLayer: ({ venues }: { venues: VenuePinData[] }) => (
    <div data-testid="venue-pin-layer-stub" data-venues={JSON.stringify(venues)} />
  ),
}));
vi.mock('@/components/custom/map/MapLoadingFallback', () => ({
  MapLoadingFallback: () => <div data-testid="map-loading-fallback-stub" />,
}));

import { MapView } from '@/components/custom/map/MapView';

function Wrapper({ children }: { children: ReactNode }) {
  return (
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
  );
}

function EnglishWrapper({ children }: { children: ReactNode }) {
  return (
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
  );
}

function expectVenueSearchCall(expected: VenueSearchParams) {
  expect(useVenueSearchMock.mock.calls.map(([params]) => params)).toContainEqual(expected);
}

function waitMs(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

describe('<MapView />', () => {
  beforeEach(() => {
    stubMap = makeStubMap();
    selectedVenueIdMock = null;
    selectedVenuePreviewMock = null;
    searchParamsMock = new URLSearchParams();
    pathnameMock = '/';
    selectVenueMock.mockClear();
    routerPushMock.mockClear();
    routerReplaceMock.mockClear();
    useGeolocationMock.mockReset().mockReturnValue({
      status: 'idle',
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
    });
    useFavouriteVenuesMock.mockReset().mockReturnValue({
      data: undefined,
      isFetching: false,
      isError: false,
      dataUpdatedAt: 0,
    });
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
        data: makeVenueResponse([makeVenue({ id: 'venue-1', name: 'Bellora' })]),
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
      expectVenueSearchCall({
        lat: 57.7089,
        lng: 11.9746,
        radiusKm: 1.5,
      });

      fireEvent.click(screen.getAllByRole('button', { name: /Öppna kalender: Idag/ })[0]);
      fireEvent.click(screen.getByRole('button', { name: 'Välj 21 maj 2026' }));

      await waitFor(() =>
        expectVenueSearchCall({
          lat: 57.7089,
          lng: 11.9746,
          radiusKm: 1.5,
          date: '2026-05-21',
          time: '12:15',
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
              isPartner: false,
              confidence: 92,
              distanceMeters: 420,
              sunExposurePercent: 95,
              sunWindow: { start: '13:00', end: '18:30' },
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
      expect(screen.getAllByText('Sol 13:00–18:30')).toHaveLength(2);
      expect(screen.getAllByRole('img', { name: 'Uteservering hos Testbaren' }).length).toBeGreaterThanOrEqual(2);
      expect(screen.getByTestId('map-container-stub')).toBeInTheDocument();

      rerender(<MapView />);
      expect(screen.getByTestId('map-container-stub')).toBeInTheDocument();
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
      expect(screen.getAllByText('Sol 13:00–18:30')).toHaveLength(2);
      expect(screen.getAllByText(/180 m/).length).toBeGreaterThanOrEqual(2);
    });

    it('formats QuickInfo sun ranges from the active locale', () => {
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

      expect(screen.getAllByText('Sun 13:00–18:30')).toHaveLength(2);
      expect(screen.queryByText('Sol 13:00–18:30')).not.toBeInTheDocument();
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

    it('opens directions from QuickInfo instead of rendering a dead route action', () => {
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
      fireEvent.click(screen.getAllByRole('button', { name: 'Visa Rutt' })[0]);

      expect(openSpy).toHaveBeenCalledWith(
        'https://www.google.com/maps/dir/?api=1&destination=57.7%2C11.97',
        '_blank',
        'noopener,noreferrer',
      );
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
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(screen.getByTestId('mobile-venue-detail-sheet')).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { name: 'Kafé Magasinet' })).toHaveLength(2);
      expect(screen.getAllByText('Stor uteservering med eftermiddagssol, skyddade bord och nära till både spårvagn och kajstråk.')).toHaveLength(2);
      expect(screen.queryByText(/Säkerhet:/)).not.toBeInTheDocument();
      expect(screen.getAllByText('Säkerhet 95%')).toHaveLength(2);
      expect(screen.getAllByText('Bäst 11:00-15:00')).toHaveLength(1);
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
            openingHours: { display: 'Öppet till 22:00' },
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
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(screen.queryByTestId('mobile-venue-detail-sheet')).not.toBeInTheDocument();
      expect(screen.getAllByTestId('venue-quick-info')).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: 'Kafé Magasinet' })).toHaveLength(2);
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
            openingHours: { display: 'Öppet till 22:00' },
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
    it('renders the mobile venue list sheet in mid state by default', () => {
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([makeVenue({ id: 'venue-1', name: 'Bellora' })]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(screen.getByTestId('mobile-bottom-sheet')).toHaveAttribute('data-state', 'mid');
      expect(screen.getAllByTestId('venue-card')[0]).toHaveTextContent('Bellora');
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

      expect(screen.getByTestId('mobile-bottom-sheet')).toHaveAttribute('data-state', 'mid');
      expect(screen.queryByTestId('mobile-bottom-sheet-backdrop')).not.toBeInTheDocument();
      expect(screen.getAllByTestId('venue-card')[0]).toHaveTextContent('Bellora');
      expect(screen.getAllByTestId('venue-card')[0]).toHaveTextContent('95% sol');
      expect(screen.getAllByTestId('venue-card')[0]).toHaveTextContent('Säkerhet: 95%');
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
        sunExposurePercent: 61,
      });
      expect(screen.getAllByTestId('venue-card')[0]).toHaveTextContent('61% sol');
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
        sunExposurePercent: 95,
      });
      expect(screen.getAllByTestId('venue-card')[0]).toHaveTextContent('95% sol');
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

    it('renders the desktop planner as a full-width bottom bar instead of constraining it around side panels', () => {
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
      expect(desktopPlanner).toHaveClass('left-4', 'right-4');
      expect(desktopPlanner?.className).not.toContain('var(--size-venue-list-desktop-w)');
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

    it('keeps the mobile favourites sheet peeked after selecting a saved venue', async () => {
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
        expect(screen.getByTestId('mobile-bottom-sheet')).toHaveAttribute('data-state', 'peek');
      });
      expect(screen.getAllByTestId('venue-quick-info').length).toBeGreaterThan(0);
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
      }));

      render(<MapView />, { wrapper: Wrapper });
      expect(screen.getAllByText('Sol 09:00–10:00')).toHaveLength(2);

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
      expect(screen.getAllByText('Sol 13:30–18:00')).toHaveLength(2);
      expect(JSON.parse(screen.getByTestId('venue-pin-layer-stub').dataset.venues ?? '[]')).toEqual([
        expect.objectContaining({
          id: 'outside-search',
          sunStatus: 'Sunny',
          sunExposurePercent: 88,
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

      expect(screen.getByTestId('mobile-bottom-sheet')).toHaveAttribute('data-state', 'mid');
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

      expect(screen.getAllByText(/95% SOL/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Säkerhet: 95%/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Sol 13:00–18:30/).length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText(/99% SOL/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Säkerhet: 99%/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Sol 09:00–10:00/)).not.toBeInTheDocument();
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
});

function makeVenueResponse(venues: GetVenuesResponse['venues']): GetVenuesResponse {
  return {
    venues,
    meta: { count: venues.length, radiusKm: 1.5 },
    timestamp: 'now',
    totalCount: venues.length,
  };
}

function makeVenueDetail(
  venue: Parameters<typeof makeVenue>[0],
): GetVenueDetailResponse['venue'] {
  return {
    ...makeVenue(venue),
    description: 'Detaljerad platsbeskrivning',
    address: 'Testgatan 1',
    openingHours: { display: 'Öppet till 22:00' },
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
}: {
  id: string;
  name: string;
  slug?: string;
  status?: GetVenuesResponse['venues'][number]['currentSunStatus'];
  sunExposurePercent?: number;
  thumbnailUrl?: string;
  confidence?: number;
  sunWindow?: GetVenuesResponse['venues'][number]['sunWindow'];
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
    isPartner: false,
    confidence,
    distanceMeters: 180,
    sunExposurePercent,
    sunWindow,
    thumbnail: {
      alt: `${name} uteservering`,
      initials: name.slice(0, 2),
      url: thumbnailUrl,
    },
  };
}
