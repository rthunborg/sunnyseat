import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { GeolocationProvider, useGeolocation } from '@/hooks/useGeolocation';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';
import { GOTHENBURG_CENTRE } from '@/lib/constants/geography';

type SuccessCallback = (position: GeolocationPosition) => void;
type ErrorCallback = (error: GeolocationPositionError) => void;

type GeolocationStub = {
  getCurrentPosition: ReturnType<typeof vi.fn>;
};

type PermissionsStub = {
  query: ReturnType<typeof vi.fn>;
};

type PermissionStatusStub = {
  state: PermissionState;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
};

type NavigatorWithStubs = {
  geolocation?: GeolocationStub;
  permissions?: PermissionsStub;
};

function getMutableNavigator(): NavigatorWithStubs {
  return globalThis.navigator as unknown as NavigatorWithStubs;
}

function installGeolocationStub(): GeolocationStub {
  const stub: GeolocationStub = { getCurrentPosition: vi.fn() };
  Object.defineProperty(globalThis.navigator, 'geolocation', {
    configurable: true,
    value: stub,
    writable: true,
  });
  return stub;
}

function removeGeolocation(): void {
  Object.defineProperty(globalThis.navigator, 'geolocation', {
    configurable: true,
    value: undefined,
    writable: true,
  });
}

function installPermissionsStub(state: PermissionState): PermissionsStub & { status: PermissionStatusStub } {
  const status: PermissionStatusStub = {
    state,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  const stub: PermissionsStub = {
    query: vi.fn().mockResolvedValue(status),
  };
  Object.defineProperty(globalThis.navigator, 'permissions', {
    configurable: true,
    value: stub,
    writable: true,
  });
  return { ...stub, status };
}

function removePermissions(): void {
  Object.defineProperty(globalThis.navigator, 'permissions', {
    configurable: true,
    value: undefined,
    writable: true,
  });
}

const FALLBACK = { lat: GOTHENBURG_CENTRE.lat, lng: GOTHENBURG_CENTRE.lng };

function wrapper({ children }: { children: ReactNode }) {
  return createElement(GeolocationProvider, null, children);
}

// Node 25 ships a partial native localStorage that masks jsdom's. Install a
// real in-memory Storage polyfill on `window` for the duration of these tests
// so the hook's localStorage reads/writes behave like a browser.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(key: string): string | null { return this.store.get(key) ?? null; }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string): void { this.store.delete(key); }
  setItem(key: string, value: string): void { this.store.set(key, String(value)); }
}

describe('useGeolocation', () => {
  let originalGeolocation: PropertyDescriptor | undefined;
  let originalPermissions: PropertyDescriptor | undefined;
  let originalLocalStorage: PropertyDescriptor | undefined;
  let storage: MemoryStorage;

  beforeEach(() => {
    originalGeolocation = Object.getOwnPropertyDescriptor(
      globalThis.navigator,
      'geolocation',
    );
    originalPermissions = Object.getOwnPropertyDescriptor(
      globalThis.navigator,
      'permissions',
    );
    originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
    storage = new MemoryStorage();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: storage,
      writable: true,
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalGeolocation) {
      Object.defineProperty(globalThis.navigator, 'geolocation', originalGeolocation);
    } else {
      removeGeolocation();
    }
    if (originalPermissions) {
      Object.defineProperty(globalThis.navigator, 'permissions', originalPermissions);
    } else {
      removePermissions();
    }
    if (originalLocalStorage) {
      Object.defineProperty(window, 'localStorage', originalLocalStorage);
    }
    vi.restoreAllMocks();
  });

  it('starts idle with Gothenburg centrum coords', () => {
    installGeolocationStub();
    const { result } = renderHook(() => useGeolocation(), { wrapper });

    expect(result.current.status).toBe('idle');
    expect(result.current.coords).toEqual(FALLBACK);
  });

  it('requestLocation success path: status=success, coords reflect the resolved position', async () => {
    const stub = installGeolocationStub();
    stub.getCurrentPosition.mockImplementation(
      (success: SuccessCallback) => {
        success({
          coords: {
            latitude: 57.7,
            longitude: 11.97,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      },
    );

    const { result } = renderHook(() => useGeolocation(), { wrapper });
    act(() => {
      result.current.requestLocation();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });
    expect(result.current.coords).toEqual({ lat: 57.7, lng: 11.97 });
  });

  it('requestLocation denial path: status=fallback, coords=GOTHENBURG_CENTRE', async () => {
    const stub = installGeolocationStub();
    stub.getCurrentPosition.mockImplementation(
      (_success: SuccessCallback, error: ErrorCallback) => {
        error({
          code: 1,
          message: 'denied',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError);
      },
    );

    const { result } = renderHook(() => useGeolocation(), { wrapper });
    act(() => {
      result.current.requestLocation();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('fallback');
    });
    expect(result.current.coords).toEqual(FALLBACK);
  });

  it('useCentrum synchronous path: status=fallback, coords stay at centrum', () => {
    installGeolocationStub();
    const { result } = renderHook(() => useGeolocation(), { wrapper });

    act(() => {
      result.current.useCentrum();
    });

    expect(result.current.status).toBe('fallback');
    expect(result.current.coords).toEqual(FALLBACK);
  });

  it('falls back to centrum when navigator.geolocation is unavailable', () => {
    removeGeolocation();
    const { result } = renderHook(() => useGeolocation(), { wrapper });

    act(() => {
      result.current.requestLocation();
    });

    expect(result.current.status).toBe('fallback');
    expect(result.current.coords).toEqual(FALLBACK);
  });

  it('returning user (flag set) without Permissions API resolves to fallback without prompting', async () => {
    storage.setItem(ONBOARDED_FLAG_KEY, '1');
    const stub = installGeolocationStub();
    removePermissions();

    const { result } = renderHook(() => useGeolocation(), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe('fallback');
    });
    expect(result.current.coords).toEqual(FALLBACK);
    expect(stub.getCurrentPosition).not.toHaveBeenCalled();
  });

  it('returning user (flag set) with granted permission silently re-acquires location', async () => {
    storage.setItem(ONBOARDED_FLAG_KEY, '1');
    const geo = installGeolocationStub();
    geo.getCurrentPosition.mockImplementation(
      (success: SuccessCallback) => {
        success({
          coords: {
            latitude: 57.71,
            longitude: 11.99,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      },
    );
    const permissions = installPermissionsStub('granted');

    const { result } = renderHook(() => useGeolocation(), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });
    expect(permissions.query).toHaveBeenCalledWith({ name: 'geolocation' });
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(result.current.coords).toEqual({ lat: 57.71, lng: 11.99 });
  });

  it('returning user with denied permission falls back without prompting', async () => {
    storage.setItem(ONBOARDED_FLAG_KEY, '1');
    const geo = installGeolocationStub();
    installPermissionsStub('denied');

    const { result } = renderHook(() => useGeolocation(), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe('fallback');
    });
    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
    expect(result.current.coords).toEqual(FALLBACK);
  });

  it('first-visit user (no flag) does NOT auto-call getCurrentPosition on mount', () => {
    const geo = installGeolocationStub();
    installPermissionsStub('granted');

    renderHook(() => useGeolocation(), { wrapper });

    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
  });

  it('SSR-safe path: hook returns idle/fallback when `navigator` is unavailable (Task 3.4)', () => {
    // Strip `navigator.geolocation` before render — the hook's initial
    // state must still resolve to `idle` + Gothenburg centrum without
    // throwing.
    removeGeolocation();
    removePermissions();

    const { result } = renderHook(() => useGeolocation(), { wrapper });

    expect(result.current.status).toBe('idle');
    expect(result.current.coords).toEqual(FALLBACK);
  });

  it('returning user with localStorage.getItem throwing SecurityError bails silently (private browsing)', async () => {
    // Simulate Safari private mode / partitioned storage: getItem throws.
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      writable: true,
      value: {
        get length() { return 0; },
        clear: () => {},
        getItem: () => { throw new DOMException('SecurityError', 'SecurityError'); },
        key: () => null,
        removeItem: () => {},
        setItem: () => {},
      },
    });
    const geo = installGeolocationStub();
    installPermissionsStub('granted');

    const { result } = renderHook(() => useGeolocation(), { wrapper });

    // The auto-acquire effect should bail without crashing the hook.
    expect(result.current.status).toBe('idle');
    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
  });

  it('shares one provider state across sibling consumers and one browser request', async () => {
    const geo = installGeolocationStub();
    geo.getCurrentPosition.mockImplementation((success: SuccessCallback) => {
      success({
        coords: {
          latitude: 57.72,
          longitude: 12.01,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    });

    const { result } = renderHook(
      () => {
        const first = useGeolocation();
        const second = useGeolocation();
        return { first, second };
      },
      { wrapper },
    );

    act(() => {
      result.current.first.requestLocation();
    });

    await waitFor(() => {
      expect(result.current.first.status).toBe('success');
      expect(result.current.second.status).toBe('success');
    });
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(result.current.first.coords).toEqual({ lat: 57.72, lng: 12.01 });
    expect(result.current.second.coords).toEqual({ lat: 57.72, lng: 12.01 });
  });

  it('subscribes to geolocation permission changes for returning users', async () => {
    storage.setItem(ONBOARDED_FLAG_KEY, '1');
    const geo = installGeolocationStub();
    const permissions = installPermissionsStub('prompt');

    const { unmount, result } = renderHook(() => useGeolocation(), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe('fallback');
    });
    expect(permissions.status.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );

    geo.getCurrentPosition.mockImplementation((success: SuccessCallback) => {
      success({
        coords: {
          latitude: 57.73,
          longitude: 12.02,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    });
    permissions.status.state = 'granted';
    const changeHandler = permissions.status.addEventListener.mock.calls[0]?.[1] as
      | (() => void)
      | undefined;
    act(() => {
      changeHandler?.();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });
    expect(result.current.coords).toEqual({ lat: 57.73, lng: 12.02 });

    unmount();
    expect(permissions.status.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
  });
});
