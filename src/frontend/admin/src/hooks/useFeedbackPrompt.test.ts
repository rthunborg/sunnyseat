// useFeedbackPrompt Hook Tests

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFeedbackPrompt } from './useFeedbackPrompt';
import type { SunWindow } from '../types';

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

describe('useFeedbackPrompt', () => {
  const mockSunWindow: SunWindow = {
    id: 1,
    patioId: 1,
    date: new Date().toISOString().split('T')[0],
    startTime: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
    endTime: new Date(Date.now() + 1800000).toISOString(), // 30 minutes from now
    localStartTime: new Date(Date.now() - 1800000).toISOString(),
    localEndTime: new Date(Date.now() + 1800000).toISOString(),
    duration: '01:00:00',
    peakExposure: 85,
    minExposurePercent: 70,
    maxExposurePercent: 90,
    averageExposurePercent: 85,
    peakExposureTime: new Date().toISOString(),
    localPeakExposureTime: new Date().toISOString(),
    quality: 'High' as any,
    confidence: 75,
    description: 'Mock sun window',
    isRecommended: true,
    recommendationReason: 'Peak hours',
    priorityScore: 85,
    dataPointCount: 12,
    calculatedAt: new Date().toISOString(),
  };

  const defaultOptions = {
    venueLocation: { latitude: 57.7, longitude: 11.9 },
    currentSunWindow: mockSunWindow,
    pageOpenedAt: new Date(Date.now() - 600000), // 10 minutes ago
    predictedConfidence: 75,
    hasSubmittedToday: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Remove fake timers - use real timers with waitFor instead
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useFeedbackPrompt(defaultOptions));

    expect(result.current.showPrompt).toBe(false);
    expect(result.current.isUserAtVenue).toBeNull();
    expect(result.current.timeOnPage).toBeGreaterThanOrEqual(0);
  });

  it('should show prompt after 10 minutes if user is at venue', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 57.7,
          longitude: 11.9,
          accuracy: 10,
        },
      });
    });

    const pageOpenedAt = new Date(Date.now() - 601000); // 10 minutes + 1 second ago
    const { result } = renderHook(() =>
      useFeedbackPrompt({
        ...defaultOptions,
        pageOpenedAt,
      })
    );

    // Wait for geolocation and prompt logic to complete
    await waitFor(() => {
      expect(result.current.showPrompt).toBe(true);
    }, { timeout: 2000 });
  });

  it('should show prompt after 15 minutes if user location unknown', async () => {
    const pageOpenedAt = new Date(Date.now() - 901000); // 15 minutes + 1 second ago

    const { result } = renderHook(() =>
      useFeedbackPrompt({
        ...defaultOptions,
        pageOpenedAt,
      })
    );

    await waitFor(() => {
      expect(result.current.showPrompt).toBe(true);
    }, { timeout: 2000 });
  });

  it('should not show prompt if already submitted today', () => {
    const { result } = renderHook(() =>
      useFeedbackPrompt({
        ...defaultOptions,
        hasSubmittedToday: true,
      })
    );

    expect(result.current.showPrompt).toBe(false);
  });

  it('should not show prompt if confidence is below threshold', () => {
    const { result } = renderHook(() =>
      useFeedbackPrompt({
        ...defaultOptions,
        predictedConfidence: 35, // Below 40% threshold
      })
    );

    expect(result.current.showPrompt).toBe(false);
  });

  it('should not show prompt if not during sun window', () => {
    const pastSunWindow: SunWindow = {
      ...mockSunWindow,
      startTime: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      endTime: new Date(Date.now() - 5400000).toISOString(), // 1.5 hours ago
      localStartTime: new Date(Date.now() - 7200000).toISOString(),
      localEndTime: new Date(Date.now() - 5400000).toISOString(),
    };

    const { result } = renderHook(() =>
      useFeedbackPrompt({
        ...defaultOptions,
        currentSunWindow: pastSunWindow,
      })
    );

    expect(result.current.showPrompt).toBe(false);
  });

  it('should show prompt within 1 hour after sun window ends', async () => {
    const recentSunWindow: SunWindow = {
      ...mockSunWindow,
      startTime: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      endTime: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago (within 1-hour grace period)
      localStartTime: new Date(Date.now() - 7200000).toISOString(),
      localEndTime: new Date(Date.now() - 1800000).toISOString(),
    };

    const pageOpenedAt = new Date(Date.now() - 901000); // 15 minutes + 1 second ago

    const { result } = renderHook(() =>
      useFeedbackPrompt({
        ...defaultOptions,
        currentSunWindow: recentSunWindow,
        pageOpenedAt,
      })
    );

    await waitFor(() => {
      expect(result.current.showPrompt).toBe(true);
    }, { timeout: 2000 });
  });

  it('should update time on page periodically', async () => {
    const pageOpenedAt = new Date(Date.now() - 5000); // 5 seconds ago

    const { result } = renderHook(() =>
      useFeedbackPrompt({
        ...defaultOptions,
        pageOpenedAt,
      })
    );

    const initialTime = result.current.timeOnPage;

    // Wait for time to update (interval runs every second)
    await waitFor(() => {
      expect(result.current.timeOnPage).toBeGreaterThan(initialTime);
    }, { timeout: 2000 });
  });

  it('should handle geolocation errors gracefully', () => {
    mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
      error({ code: 1, message: 'User denied geolocation' });
    });

    const { result } = renderHook(() => useFeedbackPrompt(defaultOptions));

    // Should fall back to time-based prompt (unknown location)
    expect(result.current.isUserAtVenue).toBeNull();
  });

  it('should detect when user is at venue (within 100m)', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 57.7001, // Very close to venue
          longitude: 11.9001,
          accuracy: 10,
        },
      });
    });

    const pageOpenedAt = new Date(Date.now() - 601000); // 10 minutes + 1 second ago

    const { result } = renderHook(() => useFeedbackPrompt({
      ...defaultOptions,
      pageOpenedAt,
    }));

    await waitFor(() => {
      expect(result.current.isUserAtVenue).toBe(true);
    }, { timeout: 2000 });
  });

  it('should detect when user is not at venue (beyond 100m)', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 57.8, // Far from venue
          longitude: 12.0,
          accuracy: 10,
        },
      });
    });

    const pageOpenedAt = new Date(Date.now() - 601000); // 10 minutes + 1 second ago

    const { result } = renderHook(() => useFeedbackPrompt({
      ...defaultOptions,
      pageOpenedAt,
    }));

    await waitFor(() => {
      expect(result.current.isUserAtVenue).toBe(false);
    }, { timeout: 2000 });
  });
});
