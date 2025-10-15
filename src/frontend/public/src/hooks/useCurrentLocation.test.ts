// hooks/useCurrentLocation.test.ts
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useCurrentLocation } from './useCurrentLocation';

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

describe('useCurrentLocation', () => {
  beforeEach(() => {
    // Setup geolocation mock
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useCurrentLocation());
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.coordinates).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.permissionStatus).toBeNull();
  });

  it('should get user location successfully', async () => {
    const mockPosition = {
      coords: {
        latitude: 57.7089,
        longitude: 11.9746,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };

    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success(mockPosition);
    });

    const { result } = renderHook(() => useCurrentLocation());

    act(() => {
      result.current.requestLocation();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.coordinates).toEqual({
      latitude: 57.7089,
      longitude: 11.9746,
    });
    expect(result.current.error).toBeNull();
    expect(result.current.permissionStatus).toBe('granted');
  });

  it('should handle permission denied error', async () => {
    const mockError = {
      code: 1, // PERMISSION_DENIED
      message: 'User denied geolocation',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
      error(mockError);
    });

    const { result } = renderHook(() => useCurrentLocation());

    act(() => {
      result.current.requestLocation();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.coordinates).toBeNull();
    expect(result.current.error).toBe('Location permission denied');
    expect(result.current.permissionStatus).toBe('denied');
  });

  it('should handle position unavailable error', async () => {
    const mockError = {
      code: 2, // POSITION_UNAVAILABLE
      message: 'Position unavailable',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
      error(mockError);
    });

    const { result } = renderHook(() => useCurrentLocation());

    act(() => {
      result.current.requestLocation();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Location information unavailable');
  });

  it('should handle timeout error', async () => {
    const mockError = {
      code: 3, // TIMEOUT
      message: 'Timeout',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
      error(mockError);
    });

    const { result } = renderHook(() => useCurrentLocation());

    act(() => {
      result.current.requestLocation();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Location request timed out');
  });

  it('should handle missing geolocation API', () => {
    // Save original geolocation
    const originalGeo = globalThis.navigator.geolocation;
    
    // Delete geolocation property to simulate unsupported browser
    delete (globalThis.navigator as any).geolocation;

    const { result } = renderHook(() => useCurrentLocation());

    act(() => {
      result.current.requestLocation();
    });

    expect(result.current.error).toBe('Geolocation is not supported by your browser');
    expect(result.current.isLoading).toBe(false);

    // Restore
    (globalThis.navigator as any).geolocation = originalGeo;
  });
});
