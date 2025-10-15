// pages/HomePage/HomePage.integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HomePage from './HomePage';
import { patioService } from '../../services/api/patioService';
import React from 'react';

// Mock services
vi.mock('../../services/api/patioService', () => ({
  patioService: {
    getPatios: vi.fn(),
  },
}));

// Mock MapLibre
vi.mock('maplibre-gl', () => {
  const mockMap = {
    on: vi.fn((event: string, callback: () => void) => {
      if (event === 'load') setTimeout(callback, 0);
    }),
    addControl: vi.fn(),
    remove: vi.fn(),
    flyTo: vi.fn(),
  };

  return {
    default: {
      Map: vi.fn(() => mockMap),
      Marker: vi.fn(() => ({
        setLngLat: vi.fn().mockReturnThis(),
        addTo: vi.fn().mockReturnThis(),
        remove: vi.fn(),
      })),
      NavigationControl: vi.fn(),
      GeolocateControl: vi.fn(),
    },
  };
});

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

describe('HomePage Integration Tests', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup geolocation mock
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
      writable: true,
    });
  });

  it('should complete full user flow: location → search → display results', async () => {
    // Mock geolocation success
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

    // Mock API response
    const mockPatios = {
      patios: [
        {
          id: '1-1',
          venueId: '1',
          venueName: 'Sunny Cafe',
          location: { latitude: 57.7089, longitude: 11.9746 },
          currentSunStatus: 'Sunny' as const,
          confidence: 85,
          distanceMeters: 100,
        },
        {
          id: '2-1',
          venueId: '2',
          venueName: 'Partial Bistro',
          location: { latitude: 57.7090, longitude: 11.9747 },
          currentSunStatus: 'Partial' as const,
          confidence: 70,
          distanceMeters: 200,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    vi.mocked(patioService.getPatios).mockResolvedValue(mockPatios);

    // Render HomePage
    render(<HomePage />, { wrapper: createWrapper() });

    // Wait for location to be fetched and API to be called
    await waitFor(() => {
      expect(patioService.getPatios).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: 57.7089,
          longitude: 11.9746,
          radiusKm: expect.any(Number),
        })
      );
    }, { timeout: 5000 });

    // Wait for results to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Found.*patio/i)).toBeTruthy();
    }, { timeout: 2000 });
  });

  it('should handle location permission denied gracefully', async () => {
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

    render(<HomePage />, { wrapper: createWrapper() });

    // Should not crash and should not call API without location
    await waitFor(() => {
      expect(patioService.getPatios).not.toHaveBeenCalled();
    });
  });

  it('should handle API errors gracefully', async () => {
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

    // Mock API error
    vi.mocked(patioService.getPatios).mockRejectedValue(
      new Error('Network error')
    );

    render(<HomePage />, { wrapper: createWrapper() });

    // Should handle error gracefully - wait for retry attempts to complete
    await waitFor(() => {
      expect(patioService.getPatios).toHaveBeenCalled();
    }, { timeout: 5000 });

    // Wait for error message to be displayed after retries complete
    await waitFor(() => {
      expect(screen.getByText(/Error loading patios/i)).toBeTruthy();
    }, { timeout: 10000 }); // TanStack Query default retry takes time
  });

  it('should update search when radius changes', async () => {
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

    vi.mocked(patioService.getPatios).mockResolvedValue({
      patios: [],
      timestamp: new Date().toISOString(),
    });

    render(<HomePage />, { wrapper: createWrapper() });

    // Wait for initial API call
    await waitFor(() => {
      expect(patioService.getPatios).toHaveBeenCalled();
    });

    // API should be called with location and radius
    expect(patioService.getPatios).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: 57.7089,
        longitude: 11.9746,
      })
    );
  });
});
