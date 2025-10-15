import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useShareLink } from './useShareLink';
import type { VenueDetails } from '../types';

describe('useShareLink', () => {
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

  const originalLocation = window.location;
  const originalNavigator = window.navigator;

  beforeEach(() => {
    // Mock window.location.origin
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:3000' },
      writable: true,
      configurable: true,
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it('should generate correct share URL without date', () => {
    const { result } = renderHook(() => useShareLink(mockVenue));

    expect(result.current.shareUrl).toBe('http://localhost:3000/v/test-venue-123');
  });

  it('should generate correct share URL with date', () => {
    const date = new Date('2025-10-15');
    const { result } = renderHook(() => useShareLink(mockVenue, date));

    expect(result.current.shareUrl).toBe('http://localhost:3000/v/test-venue-123?date=2025-10-15');
  });

  it('should return empty string when venue is null', () => {
    const { result } = renderHook(() => useShareLink(null));

    expect(result.current.shareUrl).toBe('');
  });

  it('should return empty string when venue is undefined', () => {
    const { result } = renderHook(() => useShareLink(undefined));

    expect(result.current.shareUrl).toBe('');
  });

  it('should use Web Share API when available', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, 'navigator', {
      value: { share: mockShare },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useShareLink(mockVenue));

    await act(async () => {
      await result.current.share();
    });

    expect(mockShare).toHaveBeenCalledWith({
      title: 'Test Venue - SunnySeat',
      text: 'Check out the sun forecast for Test Venue!',
      url: 'http://localhost:3000/v/test-venue-123',
    });
  });

  it('should fallback to clipboard when Web Share API not available', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    const mockAlert = vi.fn();

    Object.defineProperty(window, 'navigator', {
      value: { clipboard: { writeText: mockWriteText } },
      writable: true,
      configurable: true,
    });
    window.alert = mockAlert;

    const { result } = renderHook(() => useShareLink(mockVenue));

    await act(async () => {
      await result.current.share();
    });

    expect(mockWriteText).toHaveBeenCalledWith('http://localhost:3000/v/test-venue-123');
    expect(mockAlert).toHaveBeenCalledWith('Link copied to clipboard!');
  });

  it('should handle share errors gracefully', async () => {
    const mockShare = vi.fn().mockRejectedValue(new Error('Share failed'));
    const mockAlert = vi.fn();

    Object.defineProperty(window, 'navigator', {
      value: { share: mockShare },
      writable: true,
      configurable: true,
    });
    window.alert = mockAlert;

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useShareLink(mockVenue));

    await act(async () => {
      await result.current.share();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error sharing:', expect.any(Error));
    expect(mockAlert).toHaveBeenCalledWith('Failed to share link. Please try again.');

    consoleErrorSpy.mockRestore();
  });

  it('should handle clipboard write errors', async () => {
    const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard error'));
    const mockAlert = vi.fn();

    Object.defineProperty(window, 'navigator', {
      value: { clipboard: { writeText: mockWriteText } },
      writable: true,
      configurable: true,
    });
    window.alert = mockAlert;

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useShareLink(mockVenue));

    await act(async () => {
      await result.current.share();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error sharing:', expect.any(Error));
    expect(mockAlert).toHaveBeenCalledWith('Failed to share link. Please try again.');

    consoleErrorSpy.mockRestore();
  });

  it('should do nothing when share is called with null venue', async () => {
    const mockShare = vi.fn();
    Object.defineProperty(window, 'navigator', {
      value: { share: mockShare },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useShareLink(null));

    await act(async () => {
      await result.current.share();
    });

    expect(mockShare).not.toHaveBeenCalled();
  });

  it('should update shareUrl when venue changes', () => {
    const venue1 = { ...mockVenue, id: 123, slug: 'venue-1-123', name: 'Venue 1' };
    const venue2 = { ...mockVenue, id: 456, slug: 'venue-2-456', name: 'Venue 2' };

    const { result, rerender } = renderHook(
      ({ venue }) => useShareLink(venue),
      { initialProps: { venue: venue1 } }
    );

    expect(result.current.shareUrl).toBe('http://localhost:3000/v/venue-1-123');

    rerender({ venue: venue2 });

    expect(result.current.shareUrl).toBe('http://localhost:3000/v/venue-2-456');
  });

  it('should format date correctly in URL', () => {
    const testCases = [
      { date: new Date('2025-01-05'), expected: '?date=2025-01-05' },
      { date: new Date('2025-12-31'), expected: '?date=2025-12-31' },
      { date: new Date('2025-10-14'), expected: '?date=2025-10-14' },
    ];

    testCases.forEach(({ date, expected }) => {
      const { result } = renderHook(() => useShareLink(mockVenue, date));
      expect(result.current.shareUrl).toContain(expected);
    });
  });

  it('should regenerate slug correctly', () => {
    const venueWithSpecialChars = {
      ...mockVenue,
      id: 789,
      name: 'Café Husaren',
    };

    const { result } = renderHook(() => useShareLink(venueWithSpecialChars));

    // Should contain slugified name with ID (special chars become hyphens)
    expect(result.current.shareUrl).toContain('/v/caf-husaren-789');
  });
});
