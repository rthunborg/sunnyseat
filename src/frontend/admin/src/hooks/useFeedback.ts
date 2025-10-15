// useFeedback Hook - Manage feedback submission state

import { useState, useCallback, useEffect } from 'react';
import { submitFeedback } from '../services/api/feedbackService';
import { analyticsService } from '../services/analyticsService';
import type { FeedbackSubmission, StoredFeedback, FeedbackHistory } from '../types/feedback';

const STORAGE_KEY = 'sunnyseat_feedback_history';
const EXPIRY_HOURS = 24;

interface UseFeedbackOptions {
  venueId: number;
  patioId: number;
  predictedSunExposure: number;
  predictedConfidence: number;
}

interface UseFeedbackReturn {
  submitFeedbackAction: (actualSunny: boolean) => Promise<void>;
  isSubmitting: boolean;
  isSuccess: boolean;
  error: Error | null;
  hasSubmittedToday: boolean;
  resetState: () => void;
}

function getStoredFeedbackHistory(): FeedbackHistory {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { submissions: [], lastCleanup: new Date() };
    }
    const history = JSON.parse(stored);
    return {
      submissions: history.submissions.map((s: any) => ({
        ...s,
        submittedAt: new Date(s.submittedAt),
        expiresAt: new Date(s.expiresAt),
      })),
      lastCleanup: new Date(history.lastCleanup),
    };
  } catch {
    return { submissions: [], lastCleanup: new Date() };
  }
}

function saveStoredFeedbackHistory(history: FeedbackHistory): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save feedback history:', error);
  }
}

function cleanupExpiredFeedback(): void {
  const history = getStoredFeedbackHistory();
  const now = new Date();

  history.submissions = history.submissions.filter(
    (f) => f.expiresAt > now
  );

  history.lastCleanup = now;
  saveStoredFeedbackHistory(history);
}

function hasSubmittedForVenueToday(venueId: number, patioId: number): boolean {
  const history = getStoredFeedbackHistory();
  const now = new Date();

  return history.submissions.some(
    (f) => f.venueId === venueId && f.patioId === patioId && f.expiresAt > now
  );
}

function storeFeedbackSubmission(venueId: number, patioId: number): void {
  const history = getStoredFeedbackHistory();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + EXPIRY_HOURS * 60 * 60 * 1000);

  const newSubmission: StoredFeedback = {
    venueId,
    patioId,
    submittedAt: now,
    expiresAt,
  };

  history.submissions.push(newSubmission);
  saveStoredFeedbackHistory(history);
}

export function useFeedback({
  venueId,
  patioId,
  predictedSunExposure,
  predictedConfidence,
}: UseFeedbackOptions): UseFeedbackReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);

  // Check if user has already submitted feedback for this venue today
  useEffect(() => {
    cleanupExpiredFeedback();
    setHasSubmittedToday(hasSubmittedForVenueToday(venueId, patioId));
  }, [venueId, patioId]);

  const submitFeedbackAction = useCallback(
    async (actualSunny: boolean) => {
      setIsSubmitting(true);
      setError(null);
      setIsSuccess(false);

      try {
        const feedbackData: FeedbackSubmission = {
          venueId,
          patioId,
          timestamp: new Date(),
          predictedSunExposure,
          predictedConfidence,
          actualSunny,
        };

        await submitFeedback(feedbackData);

        // Store in local storage to prevent duplicates
        storeFeedbackSubmission(venueId, patioId);

        // Track successful submission
        analyticsService.trackFeedbackSubmitted(
          venueId,
          patioId,
          actualSunny,
          predictedConfidence
        );

        setIsSuccess(true);
        setHasSubmittedToday(true);
      } catch (err) {
        // Track failed submission
        analyticsService.trackFeedbackFailed(venueId, patioId);
        setError(err instanceof Error ? err : new Error('Failed to submit feedback'));
      } finally {
        setIsSubmitting(false);
      }
    },
    [venueId, patioId, predictedSunExposure, predictedConfidence]
  );

  const resetState = useCallback(() => {
    setIsSuccess(false);
    setError(null);
  }, []);

  return {
    submitFeedbackAction,
    isSubmitting,
    isSuccess,
    error,
    hasSubmittedToday,
    resetState,
  };
}
