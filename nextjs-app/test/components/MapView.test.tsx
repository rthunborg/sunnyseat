import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type maplibregl from 'maplibre-gl';
import { NextIntlClientProvider } from 'next-intl';
import commonMessages from '@/messages/sv/common.json';
import mapMessages from '@/messages/sv/map.json';
import venueMessages from '@/messages/sv/venue.json';
import { TimeProvider } from '@/lib/contexts/TimeContext';
import type { GetVenueDetailResponse, GetVenuesResponse } from '@/lib/types/api';
import type { VenuePinData } from '@/lib/types/map';

type VenueQueryShape = {
  data: GetVenuesResponse | undefined;
  isFetching: boolean;
  isError: boolean;
  dataUpdatedAt: number;
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

const useVenueDetailMock = vi.fn<(slug?: string | null, planner?: { date: string; time: string }) => {
  data: GetVenueDetailResponse | undefined;
  isFetching: boolean;
  isError: boolean;
}>(() => ({
  data: undefined,
  isFetching: false,
  isError: false,
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
  useVenueDetail: (slug?: string | null, planner?: { date: string; time: string }) =>
    useVenueDetailMock(slug, planner),
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
  usePathname: () => '/',
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
      messages={{ common: commonMessages, map: mapMessages, venue: venueMessages }}
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

      fireEvent.click(screen.getAllByRole('button', { name: 'Öppna kalender' })[0]);
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
      fireEvent.click(screen.getAllByRole('button', { name: 'Öppna kalender' })[0]);
      fireEvent.click(screen.getByRole('button', { name: 'Välj 21 maj 2026' }));
      rerender(<MapView />);

      await waitFor(() =>
        expect(useVenueDetailMock).toHaveBeenLastCalledWith('test-venue-sunny', {
          date: '2026-05-21',
          time: '12:15',
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

      expect(selectVenueMock).toHaveBeenCalledWith('venue-1');
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

      expect(selectVenueMock).toHaveBeenCalledWith('venue-1');
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
      expect(screen.queryByText('Laddar platsdetaljer')).not.toBeInTheDocument();
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

    it('forces the mobile venue list sheet to full state for visual validation', () => {
      searchParamsMock = new URLSearchParams('_state=map-panel-venues');
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([makeVenue({ id: 'venue-1', name: 'Bellora' })]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(screen.getByTestId('mobile-bottom-sheet')).toHaveAttribute('data-state', 'full');
      expect(screen.getByTestId('mobile-bottom-sheet-backdrop')).toBeInTheDocument();
      expect(screen.getAllByTestId('venue-card')[0]).toHaveTextContent('Bellora');
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

      expect(selectVenueMock).toHaveBeenCalledWith('venue-1');
      expect(stubMap.easeTo).toHaveBeenCalledWith({
        center: [11.97, 57.7],
        duration: 500,
      });
      expect(screen.getByTestId('map-container-stub')).toBeInTheDocument();
    });

    it('does not render the old mobile search chrome in the refreshed MVP map composition', () => {
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Kafé Magasinet', slug: 'test-venue-sunny' }),
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

      expect(screen.queryByRole('combobox', { name: 'Sök plats' })).not.toBeInTheDocument();
    });

    it('normalizes map pins only for forced visual-reference states', () => {
      searchParamsMock = new URLSearchParams('_state=map-panel-venues');
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({
            id: 'venue-shaded',
            name: 'Skuggad referenspin',
            status: 'Shaded',
            sunExposurePercent: 4,
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

    it('clears an active detail URL after selecting a different venue from search', async () => {
      searchParamsMock = new URLSearchParams('venue=old-slug&_state=venue-detail');
      selectedVenueIdMock = 'venue-2';
      selectedVenuePreviewMock = makeVenue({ id: 'venue-2', name: 'Ny plats', slug: 'new-slug' });
      useVenueSearchMock.mockReturnValue({
        data: makeVenueResponse([
          makeVenue({ id: 'venue-1', name: 'Gammal plats', slug: 'old-slug' }),
          selectedVenuePreviewMock,
        ]),
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1,
      });

      render(<MapView />, { wrapper: Wrapper });

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

function makeVenue({
  id,
  name,
  slug,
  status = 'Sunny',
  sunExposurePercent = 95,
}: {
  id: string;
  name: string;
  slug?: string;
  status?: GetVenuesResponse['venues'][number]['currentSunStatus'];
  sunExposurePercent?: number;
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
    confidence: 92,
    distanceMeters: 180,
    sunExposurePercent,
    sunWindow: { start: '13:00', end: '18:30' },
    thumbnail: {
      alt: `${name} uteservering`,
      initials: name.slice(0, 2),
    },
  };
}
