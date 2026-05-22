import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { useRef, type ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import type maplibregl from 'maplibre-gl';
import { MapInstanceContext } from '@/lib/contexts/MapInstanceContext';
import { MapControls } from '@/components/custom/map/MapControls';
import { GOTHENBURG_CENTRE } from '@/lib/constants/geography';
import { GeolocationProvider } from '@/hooks/useGeolocation';

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

// Story 1.6 review P15: typed fixture for GeolocationPosition. Replaces
// two `as any` smuggles that were bypassing the `toJSON()` method on the
// real DOM lib type. `toJSON: () => ({})` matches the real signature.
function makeMockPosition(coords: {
  latitude: number;
  longitude: number;
  accuracy: number;
}): GeolocationPosition {
  return {
    coords: {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON: () => ({}),
    } as GeolocationCoordinates,
    timestamp: Date.now(),
    toJSON: () => ({}),
  };
}

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
        <GeolocationProvider>
          <MapInstanceContext.Provider value={value}>
            {children}
          </MapInstanceContext.Provider>
        </GeolocationProvider>
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
        <GeolocationProvider>
          <MapInstanceContext.Provider value={value}>
            {children}
          </MapInstanceContext.Provider>
        </GeolocationProvider>
      </NextIntlClientProvider>
    );
  };
}

describe('<MapControls />', () => {
  let stubMap: StubMap;

  beforeEach(() => {
    stubMap = makeStubMap();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders four buttons with localised aria-labels', () => {
    const { getByTestId } = render(<MapControls />, { wrapper: makeWrapper(stubMap) });
    expect(getByTestId('map-control-zoom-in')).toHaveAttribute('aria-label', 'Zooma in');
    expect(getByTestId('map-control-zoom-out')).toHaveAttribute('aria-label', 'Zooma ut');
    expect(getByTestId('map-control-my-location')).toHaveAttribute('aria-label', 'Min plats');
    expect(getByTestId('map-control-settings')).toHaveAttribute('aria-label', 'Inställningar');
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

  it('my-location button: requests browser geolocation and flies to the resolved coords on success', () => {
    const originalGeolocation = Object.getOwnPropertyDescriptor(
      globalThis.navigator,
      'geolocation',
    );
    const getCurrentPosition = vi.fn(
      (success: (pos: GeolocationPosition) => void) => {
        success(
          makeMockPosition({ latitude: 57.71, longitude: 11.99, accuracy: 10 }),
        );
      },
    );
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      configurable: true,
      writable: true,
      value: { getCurrentPosition },
    });

    try {
      const { getByTestId } = render(<MapControls />, { wrapper: makeWrapper(stubMap) });
      fireEvent.click(getByTestId('map-control-my-location'));
      expect(getCurrentPosition).toHaveBeenCalledTimes(1);
      expect(stubMap.flyTo).toHaveBeenCalledWith({
        center: [11.99, 57.71],
        zoom: GOTHENBURG_CENTRE.zoom,
        duration: 500,
      });
    } finally {
      if (originalGeolocation) {
        Object.defineProperty(globalThis.navigator, 'geolocation', originalGeolocation);
      }
    }
  });

  it('my-location button: silently keeps the current map centre on permission denial', () => {
    const originalGeolocation = Object.getOwnPropertyDescriptor(
      globalThis.navigator,
      'geolocation',
    );
    const getCurrentPosition = vi.fn(
      (
        _success: (pos: GeolocationPosition) => void,
        error: (e: GeolocationPositionError) => void,
      ) => {
        error({
          code: 1,
          message: 'denied',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError);
      },
    );
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      configurable: true,
      writable: true,
      value: { getCurrentPosition },
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const { getByTestId } = render(<MapControls />, { wrapper: makeWrapper(stubMap) });
      fireEvent.click(getByTestId('map-control-my-location'));
      expect(getCurrentPosition).toHaveBeenCalledTimes(1);
      expect(stubMap.flyTo).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
      if (originalGeolocation) {
        Object.defineProperty(globalThis.navigator, 'geolocation', originalGeolocation);
      }
    }
  });

  it('my-location button: deny then grant — second click flies to coords', async () => {
    const originalGeolocation = Object.getOwnPropertyDescriptor(
      globalThis.navigator,
      'geolocation',
    );
    let callCount = 0;
    const getCurrentPosition = vi.fn(
      (
        success: (pos: GeolocationPosition) => void,
        error: (e: GeolocationPositionError) => void,
      ) => {
        callCount += 1;
        if (callCount === 1) {
          // First click: deny.
          error({
            code: 1,
            message: 'denied',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError);
        } else {
          // Second click: grant.
          success(
            makeMockPosition({ latitude: 57.72, longitude: 11.95, accuracy: 10 }),
          );
        }
      },
    );
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      configurable: true,
      writable: true,
      value: { getCurrentPosition },
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const { getByTestId } = render(<MapControls />, { wrapper: makeWrapper(stubMap) });
      const myLocation = getByTestId('map-control-my-location');

      fireEvent.click(myLocation);
      expect(stubMap.flyTo).not.toHaveBeenCalled();

      fireEvent.click(myLocation);
      expect(getCurrentPosition).toHaveBeenCalledTimes(2);
      expect(stubMap.flyTo).toHaveBeenCalledWith({
        center: [11.95, 57.72],
        zoom: GOTHENBURG_CENTRE.zoom,
        duration: 500,
      });
    } finally {
      warnSpy.mockRestore();
      if (originalGeolocation) {
        Object.defineProperty(globalThis.navigator, 'geolocation', originalGeolocation);
      }
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

  it('renders all three buttons disabled while mapInstance is null', () => {
    // Story 1.6 review (P37): native `disabled` is the only signal — the
    // explicit `aria-disabled` attribute was removed (it was redundant
    // with `disabled` and caused double-announcement on some AT).
    const { getByTestId } = render(<MapControls />, { wrapper: makeNullMapWrapper() });

    for (const id of ['map-control-zoom-in', 'map-control-zoom-out', 'map-control-my-location', 'map-control-settings']) {
      const btn = getByTestId(id);
      expect(btn).toBeDisabled();
      // The DOM disabled attribute is what AT reads; assert that, not
      // a synthesised aria-disabled mirror.
      expect(btn).toHaveAttribute('disabled');
    }
  });

  it('enabled buttons are NOT disabled (no false-positive a11y noise)', () => {
    const { getByTestId } = render(<MapControls />, { wrapper: makeWrapper(stubMap) });

    for (const id of ['map-control-zoom-in', 'map-control-zoom-out', 'map-control-my-location', 'map-control-settings']) {
      const btn = getByTestId(id);
      expect(btn).not.toBeDisabled();
      expect(btn).not.toHaveAttribute('aria-disabled');
    }
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
