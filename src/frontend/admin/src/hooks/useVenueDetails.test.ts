import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useVenueDetails } from './useVenueDetails';
import * as venueService from '../services/api/venueService';
import type { VenueDetails } from '../types';

// Mock the venue service
vi.mock('../services/api/venueService');

describe('useVenueDetails', () => {
  const mockVenue: VenueDetails = {
    id: 123,
    slug: 'test-venue-123',
    name: 'Test Venue',
    address: '123 Test St',
    location: { latitude: 57.7089, longitude: 11.9746 },
    patios: [],
    sunForecast: {
      today: {
        date: '2025-10-14',
        sunWindows: [],
      },
      tomorrow: {
        date: '2025-10-15',
        sunWindows: [],
      },
      generatedAt: '2025-10-14T10:00:00Z',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch venue data successfully', async () => {
    const getVenueBySlugMock = vi.mocked(venueService.getVenueBySlug);
    getVenueBySlugMock.mockResolvedValue(mockVenue);

    const { result } = renderHook(() => useVenueDetails('test-venue-123'));

    // Initial state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockVenue);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(getVenueBySlugMock).toHaveBeenCalledWith('test-venue-123', true);
  });

  it('should handle fetch errors gracefully', async () => {
    const getVenueBySlugMock = vi.mocked(venueService.getVenueBySlug);
    const errorMessage = 'Venue not found';
    getVenueBySlugMock.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useVenueDetails('non-existent-slug'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe(errorMessage);
    expect(result.current.data).toBeNull();
  });

  it('should handle empty slug gracefully', () => {
    const { result } = renderHook(() => useVenueDetails(''));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it('should refetch data when refetch is called', async () => {
    const getVenueBySlugMock = vi.mocked(venueService.getVenueBySlug);
    getVenueBySlugMock.mockResolvedValue(mockVenue);

    const { result } = renderHook(() => useVenueDetails('test-venue-123'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(getVenueBySlugMock).toHaveBeenCalledTimes(1);

    // Call refetch
    result.current.refetch();

    await waitFor(() => {
      expect(getVenueBySlugMock).toHaveBeenCalledTimes(2);
    });

    expect(result.current.data).toEqual(mockVenue);
  });

  it('should handle non-Error exceptions', async () => {
    const getVenueBySlugMock = vi.mocked(venueService.getVenueBySlug);
    getVenueBySlugMock.mockRejectedValue('String error');

    const { result } = renderHook(() => useVenueDetails('test-venue-123'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toBe('Failed to fetch venue');
  });

  it('should refetch when slug changes', async () => {
    const getVenueBySlugMock = vi.mocked(venueService.getVenueBySlug);
    const venue1 = { ...mockVenue, id: 123, slug: 'venue-1-123' };
    const venue2 = { ...mockVenue, id: 456, slug: 'venue-2-456' };

    getVenueBySlugMock.mockResolvedValueOnce(venue1).mockResolvedValueOnce(venue2);

    const { result, rerender } = renderHook(
      ({ slug }) => useVenueDetails(slug),
      { initialProps: { slug: 'venue-1-123' } }
    );

    await waitFor(() => {
      expect(result.current.data?.id).toBe(123);
    });

    // Change slug
    rerender({ slug: 'venue-2-456' });

    await waitFor(() => {
      expect(result.current.data?.id).toBe(456);
    });

    expect(getVenueBySlugMock).toHaveBeenCalledTimes(2);
    expect(getVenueBySlugMock).toHaveBeenNthCalledWith(1, 'venue-1-123', true);
    expect(getVenueBySlugMock).toHaveBeenNthCalledWith(2, 'venue-2-456', true);
  });

  it('should clear errors on successful refetch', async () => {
    const getVenueBySlugMock = vi.mocked(venueService.getVenueBySlug);
    
    // First call fails
    getVenueBySlugMock.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useVenueDetails('test-venue-123'));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Second call succeeds
    getVenueBySlugMock.mockResolvedValueOnce(mockVenue);
    result.current.refetch();

    await waitFor(() => {
      expect(result.current.isError).toBe(false);
    });

    expect(result.current.data).toEqual(mockVenue);
    expect(result.current.error).toBeNull();
  });
});
