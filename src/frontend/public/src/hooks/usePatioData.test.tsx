// hooks/usePatioData.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePatioData } from './usePatioData';
import { patioService } from '../services/api/patioService';
import React from 'react';

// Mock the patio service
vi.mock('../services/api/patioService', () => ({
  patioService: {
    getPatios: vi.fn(),
  },
}));

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

describe('usePatioData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not fetch when location is null', () => {
    const { result } = renderHook(
      () => usePatioData(null, 1.5),
      { wrapper: createWrapper() }
    );

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(patioService.getPatios).not.toHaveBeenCalled();
  });

  it('should fetch patios when location is provided', async () => {
    const mockResponse = {
      patios: [
        {
          id: '1-1',
          venueId: '1',
          venueName: 'Test Cafe',
          location: { latitude: 57.7089, longitude: 11.9746 },
          currentSunStatus: 'Sunny' as const,
          confidence: 85,
          distanceMeters: 100,
          sunExposurePercent: 90,
        },
      ],
      timestamp: new Date().toISOString(),
      totalCount: 1,
    };

    vi.mocked(patioService.getPatios).mockResolvedValue(mockResponse);

    const location = { latitude: 57.7089, longitude: 11.9746 };
    const { result } = renderHook(
      () => usePatioData(location, 1.5),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(result.current.data?.patios).toHaveLength(1);
    expect(patioService.getPatios).toHaveBeenCalledWith({
      latitude: 57.7089,
      longitude: 11.9746,
      radiusKm: 1.5,
    });
  });

  it('should handle API errors', async () => {
    vi.mocked(patioService.getPatios).mockRejectedValue(
      new Error('API Error')
    );

    const location = { latitude: 57.7089, longitude: 11.9746 };
    const { result } = renderHook(
      () => usePatioData(location, 1.5),
      { wrapper: createWrapper() }
    );

    // Wait for TanStack Query to complete retries
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });

    expect(result.current.error).toBeDefined();
  });

  it('should refetch when location changes', async () => {
    const mockResponse1 = {
      patios: [],
      timestamp: new Date().toISOString(),
      totalCount: 0,
    };

    vi.mocked(patioService.getPatios).mockResolvedValue(mockResponse1);

    const location1 = { latitude: 57.7089, longitude: 11.9746 };
    const { rerender } = renderHook(
      ({ location, radius }: any) => usePatioData(location, radius),
      { 
        wrapper: createWrapper(),
        initialProps: { location: location1, radius: 1.5 }
      }
    );

    await waitFor(() => expect(patioService.getPatios).toHaveBeenCalledTimes(1));

    // Change location
    const location2 = { latitude: 57.71, longitude: 11.98 };
    rerender({ location: location2, radius: 1.5 });

    await waitFor(() => expect(patioService.getPatios).toHaveBeenCalledTimes(2));

    expect(patioService.getPatios).toHaveBeenLastCalledWith({
      latitude: 57.71,
      longitude: 11.98,
      radiusKm: 1.5,
    });
  });
});
