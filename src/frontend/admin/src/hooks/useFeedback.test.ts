// useFeedback Hook Tests

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFeedback } from './useFeedback';
import * as feedbackService from '../services/api/feedbackService';

// Mock the feedback service
vi.mock('../services/api/feedbackService', () => ({
  submitFeedback: vi.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useFeedback', () => {
  const defaultOptions = {
    venueId: 1,
    patioId: 1,
    predictedSunExposure: 85,
    predictedConfidence: 75,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useFeedback(defaultOptions));

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.hasSubmittedToday).toBe(false);
  });

  it('should submit feedback successfully', async () => {
    const mockResponse = { id: 1, success: true, message: 'Success' };
    vi.mocked(feedbackService.submitFeedback).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useFeedback(defaultOptions));

    expect(result.current.isSubmitting).toBe(false);

    // Call the action and wait for completion
    await result.current.submitFeedbackAction(true);

    // Verify final state after submission completes
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.hasSubmittedToday).toBe(true);
    });

    expect(result.current.error).toBeNull();
  });

  it('should handle API errors gracefully', async () => {
    const mockError = new Error('Network error');
    vi.mocked(feedbackService.submitFeedback).mockRejectedValue(mockError);

    const { result } = renderHook(() => useFeedback(defaultOptions));

    result.current.submitFeedbackAction(false);

    await waitFor(() => {
      expect(result.current.error).toEqual(mockError);
    });

    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('should store feedback in local storage after submission', async () => {
    const mockResponse = { id: 1, success: true, message: 'Success' };
    vi.mocked(feedbackService.submitFeedback).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useFeedback(defaultOptions));

    await result.current.submitFeedbackAction(true);

    await waitFor(() => {
      expect(result.current.hasSubmittedToday).toBe(true);
    });

    const stored = localStorageMock.getItem('sunnyseat_feedback_history');
    expect(stored).toBeTruthy();

    const history = JSON.parse(stored!);
    expect(history.submissions).toHaveLength(1);
    expect(history.submissions[0].venueId).toBe(1);
    expect(history.submissions[0].patioId).toBe(1);
  });

  it('should prevent duplicate submissions for same venue', async () => {
    const mockResponse = { id: 1, success: true, message: 'Success' };
    vi.mocked(feedbackService.submitFeedback).mockResolvedValue(mockResponse);

    // First submission
    const { result: result1 } = renderHook(() => useFeedback(defaultOptions));
    await result1.current.submitFeedbackAction(true);

    await waitFor(() => {
      expect(result1.current.hasSubmittedToday).toBe(true);
    });

    // Second submission for same venue
    const { result: result2 } = renderHook(() => useFeedback(defaultOptions));

    expect(result2.current.hasSubmittedToday).toBe(true);
  });

  it('should reset state correctly', async () => {
    const mockResponse = { id: 1, success: true, message: 'Success' };
    vi.mocked(feedbackService.submitFeedback).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useFeedback(defaultOptions));

    await result.current.submitFeedbackAction(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    result.current.resetState();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  it('should clean up expired feedback on initialization', () => {
    // Store expired feedback
    const expiredFeedback = {
      submissions: [
        {
          venueId: 1,
          patioId: 1,
          submittedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
          expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
        },
      ],
      lastCleanup: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    };

    localStorageMock.setItem('sunnyseat_feedback_history', JSON.stringify(expiredFeedback));

    const { result } = renderHook(() => useFeedback(defaultOptions));

    expect(result.current.hasSubmittedToday).toBe(false);
  });
});
