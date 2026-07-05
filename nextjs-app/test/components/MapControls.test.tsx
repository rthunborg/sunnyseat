import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { useRef, type ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import type maplibregl from 'maplibre-gl';
import { MapInstanceContext } from '@/lib/contexts/MapInstanceContext';
import { MapControls } from '@/components/custom/map/MapControls';
import { GOTHENBURG_CENTRE } from '@/lib/constants/geography';

// Story 9.6: the floating locate + settings buttons were removed from
// MapControls (they duplicated the mobile top-bar pair and the desktop nav).
// This suite now covers only the surviving concerns: zoom +/-, the drag-fade,
// the shared success-fly-to effect, and listener cleanup. The locate-button
// reliability feedback (Story 9.5) moved to `VenueSearchShell` and is covered
// in `VenueSearchShell.test.tsx`.

// Settings is no longer consumed by MapControls; keep a harmless mock so the
// component tree never reaches the real provider by accident.
vi.mock('@/lib/contexts/SettingsContext', () => ({
  useSettings: () => ({
    activeView: null,
    openSettings: vi.fn(),
    openFeedback: vi.fn(),
    close: vi.fn(),
  }),
}));

// Drive `useGeolocation` directly so the shared success-fly-to effect can be
// exercised without any locate button (the buttons live elsewhere now).
const geoState = vi.hoisted(() => ({
  status: 'idle' as string,
  coords: { lat: 57.7089, lng: 11.9746 },
}));
vi.mock('@/hooks/useGeolocation', () => ({
  useGeolocation: () => ({
    status: geoState.status,
    coords: geoState.coords,
    requestLocation: vi.fn(),
    useCentrum: vi.fn(),
  }),
}));

type MapInstanceContextValue = React.ComponentProps<
  typeof MapInstanceContext.Provider
>['value'];

const messages = {
  map: {
    zoomIn: 'Zooma in',
    zoomOut: 'Zooma ut',
    myLocation: 'Min plats',
    settings: 'Inställningar',
  },
};

type DragHandler = () => void;

type StubMap = {
  zoomIn: Mock;
  zoomOut: Mock;
  flyTo: Mock;
  on: Mock;
  off: Mock;
  __dragstart: DragHandler[];
  __dragend: DragHandler[];
};

function makeStubMap(): StubMap {
  const dragstart: DragHandler[] = [];
  const dragend: DragHandler[] = [];
  return {
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    flyTo: vi.fn(),
    on: vi.fn((event: string, handler: DragHandler) => {
      if (event === 'dragstart') dragstart.push(handler);
      if (event === 'dragend') dragend.push(handler);
    }),
    off: vi.fn((event: string, handler: DragHandler) => {
      const list = event === 'dragstart' ? dragstart : event === 'dragend' ? dragend : null;
      if (!list) return;
      const idx = list.indexOf(handler);
      if (idx >= 0) list.splice(idx, 1);
    }),
    __dragstart: dragstart,
    __dragend: dragend,
  };
}

function makeWrapper(stubMap: StubMap) {
  return function Wrapper({ children }: { children: ReactNode }) {
    const mapRef = useRef<maplibregl.Map | null>(stubMap as unknown as maplibregl.Map);
    const value: MapInstanceContextValue = {
      mapRef,
      mapInstance: stubMap as unknown as maplibregl.Map,
      setMapInstance: () => {},
    };
    return (
      <NextIntlClientProvider locale="sv" messages={messages}>
        <MapInstanceContext.Provider value={value}>
          {children}
        </MapInstanceContext.Provider>
      </NextIntlClientProvider>
    );
  };
}

function makeNullMapWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    const mapRef = useRef<maplibregl.Map | null>(null);
    const value: MapInstanceContextValue = {
      mapRef,
      mapInstance: null,
      setMapInstance: () => {},
    };
    return (
      <NextIntlClientProvider locale="sv" messages={messages}>
        <MapInstanceContext.Provider value={value}>
          {children}
        </MapInstanceContext.Provider>
      </NextIntlClientProvider>
    );
  };
}

describe('<MapControls />', () => {
  let stubMap: StubMap;

  beforeEach(() => {
    stubMap = makeStubMap();
    geoState.status = 'idle';
    geoState.coords = { lat: 57.7089, lng: 11.9746 };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders only the zoom buttons with localised aria-labels (no floating locate/settings)', () => {
    const { getByTestId, queryByTestId } = render(<MapControls />, {
      wrapper: makeWrapper(stubMap),
    });
    expect(getByTestId('map-control-zoom-in')).toHaveAttribute('aria-label', 'Zooma in');
    expect(getByTestId('map-control-zoom-out')).toHaveAttribute('aria-label', 'Zooma ut');
    // Story 9.6: the floating locate + settings buttons are gone from the stack.
    expect(queryByTestId('map-control-my-location')).toBeNull();
    expect(queryByTestId('map-control-settings')).toBeNull();
  });

  it('zoom+ button calls map.zoomIn with a 200 ms duration', () => {
    const { getByTestId } = render(<MapControls />, { wrapper: makeWrapper(stubMap) });
    fireEvent.click(getByTestId('map-control-zoom-in'));
    expect(stubMap.zoomIn).toHaveBeenCalledWith({ duration: 200 });
  });

  it('zoom− button calls map.zoomOut', () => {
    const { getByTestId } = render(<MapControls />, { wrapper: makeWrapper(stubMap) });
    fireEvent.click(getByTestId('map-control-zoom-out'));
    expect(stubMap.zoomOut).toHaveBeenCalled();
  });

  it('shared success-fly-to: flies to the resolved coords when geolocation resolves to success (mobile, default mid snap)', () => {
    // The success fly-to still lives in MapControls (shared for both the mobile
    // top-bar locate and the desktop-nav locate, which drive the same
    // useGeolocation context). Here we drive the hook state directly.
    // jsdom has no matchMedia → isDesktopViewport() is false → mobile padding.
    geoState.status = 'success';
    geoState.coords = { lat: 57.71, lng: 11.99 };
    render(<MapControls />, { wrapper: makeWrapper(stubMap) });
    expect(stubMap.flyTo).toHaveBeenCalledWith({
      center: [11.99, 57.71],
      zoom: GOTHENBURG_CENTRE.zoom,
      duration: 500,
      // Story 11.5 (AC3): default `mid` snap → bottom padding = mid height
      // (320) + mobile top-bar cover (72). Derived from the snap enum, not a
      // fixed offset (R-013).
      padding: { top: 72, bottom: 320, left: 0, right: 0 },
    });
  });

  it('shared success-fly-to: keeps the current map centre on fallback (no fly)', () => {
    geoState.status = 'fallback';
    render(<MapControls />, { wrapper: makeWrapper(stubMap) });
    expect(stubMap.flyTo).not.toHaveBeenCalled();
  });

  // Story 11.5 (AC3 / Task 5, test-design R-013): the recenter padding must be
  // DERIVED from the current obstruction state, not a fixed offset. These
  // assertions prove the landed centre changes per snap/panel so a fixed-offset
  // regression fails, and that flyTo stays 500 ms.
  it('recenter padding VARIES per mobile snap (mid → 320 vs full → 560 bottom)', () => {
    geoState.status = 'success';
    geoState.coords = { lat: 57.71, lng: 11.99 };

    const midMap = makeStubMap();
    render(<MapControls mobileSheetState="mid" />, { wrapper: makeWrapper(midMap) });
    expect(midMap.flyTo).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: 500,
        padding: { top: 72, bottom: 320, left: 0, right: 0 },
      }),
    );

    const fullMap = makeStubMap();
    render(<MapControls mobileSheetState="full" />, { wrapper: makeWrapper(fullMap) });
    expect(fullMap.flyTo).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: 500,
        padding: { top: 72, bottom: 560, left: 0, right: 0 },
      }),
    );

    // The two bottom paddings must differ — a fixed offset would make them equal.
    const midPadding = (midMap.flyTo.mock.calls[0][0] as { padding: { bottom: number } }).padding;
    const fullPadding = (fullMap.flyTo.mock.calls[0][0] as { padding: { bottom: number } }).padding;
    expect(midPadding.bottom).not.toBe(fullPadding.bottom);
  });

  it('recenter padding: collapsed snap uses the handle-strip cover (44 + safe-area allowance)', () => {
    geoState.status = 'success';
    geoState.coords = { lat: 57.71, lng: 11.99 };
    render(<MapControls mobileSheetState="collapsed" />, { wrapper: makeWrapper(stubMap) });
    expect(stubMap.flyTo).toHaveBeenCalledWith(
      expect.objectContaining({
        padding: { top: 72, bottom: 68, left: 0, right: 0 },
      }),
    );
  });

  it('recenter padding on desktop: left = venue-list width (340); no right until detail opens', () => {
    // Desktop breakpoint: mock matchMedia so isDesktopViewport() is true.
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('min-width: 1024px'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    })) as unknown as typeof window.matchMedia;

    try {
      geoState.status = 'success';
      geoState.coords = { lat: 57.71, lng: 11.99 };

      const closedMap = makeStubMap();
      render(<MapControls isVenueDetailOpen={false} />, { wrapper: makeWrapper(closedMap) });
      expect(closedMap.flyTo).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: 500,
          padding: { top: 0, bottom: 0, left: 340, right: 0 },
        }),
      );

      const openMap = makeStubMap();
      render(<MapControls isVenueDetailOpen />, { wrapper: makeWrapper(openMap) });
      expect(openMap.flyTo).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: 500,
          padding: { top: 0, bottom: 0, left: 340, right: 390 },
        }),
      );
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('fades the controls to 60% during a map drag and back to full opacity on dragend', () => {
    const { getByTestId } = render(<MapControls />, { wrapper: makeWrapper(stubMap) });
    const wrapper = getByTestId('map-controls') as HTMLDivElement;

    expect(stubMap.__dragstart.length).toBeGreaterThan(0);
    expect(stubMap.__dragend.length).toBeGreaterThan(0);

    act(() => stubMap.__dragstart[0]());
    expect(wrapper.style.opacity).toBe('0.6');

    act(() => stubMap.__dragend[0]());
    expect(wrapper.style.opacity).toBe('1');
  });

  it('renders the zoom buttons disabled while mapInstance is null', () => {
    // Story 1.6 review (P37): native `disabled` is the only signal — the
    // explicit `aria-disabled` attribute was removed (it was redundant
    // with `disabled` and caused double-announcement on some AT).
    const { getByTestId } = render(<MapControls />, { wrapper: makeNullMapWrapper() });

    for (const id of ['map-control-zoom-in', 'map-control-zoom-out']) {
      const btn = getByTestId(id);
      expect(btn).toBeDisabled();
      // The DOM disabled attribute is what AT reads; assert that, not
      // a synthesised aria-disabled mirror.
      expect(btn).toHaveAttribute('disabled');
    }
  });

  it('enables the zoom buttons once the map is ready', () => {
    const { getByTestId } = render(<MapControls />, { wrapper: makeWrapper(stubMap) });

    for (const id of ['map-control-zoom-in', 'map-control-zoom-out']) {
      const btn = getByTestId(id);
      expect(btn).not.toBeDisabled();
      expect(btn).not.toHaveAttribute('aria-disabled');
    }
  });

  it('leaves no orphaned floating locate/settings wiring in the source (imports, testids, handler)', () => {
    // Rendered-absence is asserted above; this guards the SOURCE so a future
    // edit cannot reintroduce a dead handler/import for the removed floating
    // locate + settings buttons (Story 9.6 root cause #3 — "visual shell
    // without plumbing"). If any of these strings resurface, the buttons are
    // creeping back in.
    const source = readFileSync(
      join(process.cwd(), 'components', 'custom', 'map', 'MapControls.tsx'),
      'utf8',
    );
    // Strip block/line comments so stale prose (e.g. a history note mentioning
    // the old useSettings wiring) can't mask a live orphan — we only want to
    // catch executable code that resurrects the removed controls.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(code).not.toContain('LocateFixed');
    expect(code).not.toContain('map-control-my-location');
    expect(code).not.toContain('map-control-settings');
    expect(code).not.toContain('handleMyLocation');
    // Settings is no longer opened from the map stack (top bar / desktop nav own
    // it now) — the useSettings import + openSettings call must be gone from code.
    expect(code).not.toContain('useSettings');
    expect(code).not.toContain('openSettings');
  });

  it('removes both drag listeners on unmount (one off() per on())', () => {
    const { unmount } = render(<MapControls />, { wrapper: makeWrapper(stubMap) });

    expect(stubMap.on).toHaveBeenCalledWith('dragstart', expect.any(Function));
    expect(stubMap.on).toHaveBeenCalledWith('dragend', expect.any(Function));

    unmount();

    const offDragStarts = stubMap.off.mock.calls.filter(
      ([event]) => event === 'dragstart',
    );
    const offDragEnds = stubMap.off.mock.calls.filter(
      ([event]) => event === 'dragend',
    );
    expect(offDragStarts).toHaveLength(1);
    expect(offDragEnds).toHaveLength(1);
    expect(stubMap.__dragstart).toHaveLength(0);
    expect(stubMap.__dragend).toHaveLength(0);
  });
});
