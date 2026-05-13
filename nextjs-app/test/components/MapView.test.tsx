import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import type maplibregl from 'maplibre-gl';
import { NextIntlClientProvider } from 'next-intl';
import mapMessages from '@/messages/sv/map.json';
import venueMessages from '@/messages/sv/venue.json';
import type { GetVenuesResponse } from '@/lib/types/api';

type VenueQueryShape = {
  data: GetVenuesResponse | undefined;
  isFetching: boolean;
  isError: boolean;
  dataUpdatedAt: number;
};

const useGeolocationMock = vi.fn(() => ({
  status: 'idle' as const,
  coords: { lat: 57.7089, lng: 11.9746 },
  requestLocation: () => {},
  useCentrum: () => {},
}));

const useVenueSearchMock = vi.fn<() => VenueQueryShape>(() => ({
  data: undefined,
  isFetching: false,
  isError: false,
  dataUpdatedAt: 0,
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
const selectVenueMock = vi.fn((id: string | null) => {
  selectedVenueIdMock = id;
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
  useVenueSearch: () => useVenueSearchMock(),
}));

vi.mock('@/lib/contexts/MapInstanceContext', () => ({
  useMapInstance: () => useMapInstanceMock(),
}));

vi.mock('@/lib/contexts/MapSelectionContext', () => ({
  useMapSelection: () => ({
    selectedVenueId: selectedVenueIdMock,
    selectVenue: selectVenueMock,
    toggleVenue: (id: string) => {
      selectedVenueIdMock = selectedVenueIdMock === id ? null : id;
    },
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
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
  VenuePinLayer: () => <div data-testid="venue-pin-layer-stub" />,
}));
vi.mock('@/components/custom/map/MapLoadingFallback', () => ({
  MapLoadingFallback: () => <div data-testid="map-loading-fallback-stub" />,
}));

import { MapView } from '@/components/custom/map/MapView';

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="sv" messages={{ map: mapMessages, venue: venueMessages }}>
      {children}
    </NextIntlClientProvider>
  );
}

describe('<MapView />', () => {
  beforeEach(() => {
    stubMap = makeStubMap();
    selectedVenueIdMock = null;
    selectVenueMock.mockClear();
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
    it('shows the pill after 3 s of cumulative fetching even across an isFetching=false gap', () => {
      vi.useFakeTimers();
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
      act(() => { vi.advanceTimersByTime(1000); });
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
      act(() => { vi.advanceTimersByTime(1500); });
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
      act(() => { vi.advanceTimersByTime(500); });
      expect(screen.getByTestId('map-loading-pill')).toBeInTheDocument();
    });

    it('a successful data delivery (dataUpdatedAt changes) hides the pill and resets the cumulative window', () => {
      vi.useFakeTimers();

      useVenueSearchMock.mockReturnValue({
        data: undefined,
        isFetching: true,
        isError: false,
        dataUpdatedAt: 0,
      });
      const { rerender } = render(<MapView />, { wrapper: Wrapper });
      act(() => { vi.advanceTimersByTime(3000); });
      expect(screen.getByTestId('map-loading-pill')).toBeInTheDocument();

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
      expect(screen.getAllByRole('img', { name: 'Uteservering hos Testbaren' })).toHaveLength(2);
      expect(screen.getByTestId('map-container-stub')).toBeInTheDocument();

      rerender(<MapView />);
      expect(screen.getByTestId('map-container-stub')).toBeInTheDocument();
    });
  });
});
