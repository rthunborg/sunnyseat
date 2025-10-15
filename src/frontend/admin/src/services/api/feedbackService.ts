// Feedback API Service

import type { FeedbackSubmission, FeedbackResponse } from '../../types/feedback';
import { offlineSyncService, type FeedbackSubmission as QueuedFeedback } from '../offlineSyncService';
import { analyticsService } from '../analyticsService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * Converts FeedbackSubmission to queued feedback format
 */
function toQueuedFeedback(feedback: FeedbackSubmission): QueuedFeedback {
  return {
    venueId: feedback.venueId,
    patioId: feedback.patioId,
    wasActuallySunny: feedback.actualSunny,
    submittedAt: feedback.timestamp.toISOString(),
    predictedSunExposure: feedback.predictedSunExposure,
    predictedConfidence: feedback.predictedConfidence,
  };
}

/**
 * Submits feedback to the API
 * Automatically queues for offline sync if network is unavailable
 */
export async function submitFeedback(
  feedback: FeedbackSubmission
): Promise<FeedbackResponse> {
  // Check if online before attempting submission
  if (!offlineSyncService.isOnline()) {
    console.log('Device offline, queuing feedback for later sync');
    offlineSyncService.queueFeedback(toQueuedFeedback(feedback));
    
    // Track offline queuing
    analyticsService.trackOfflineQueued(feedback.venueId, feedback.patioId);
    
    return {
      id: 0, // Temporary ID for queued feedback
      success: true,
      message: 'Feedback queued for submission when online',
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patioId: feedback.patioId, // Already number type
        timestamp: feedback.timestamp.toISOString(),
        wasSunny: feedback.actualSunny,
        predictedSunExposure: feedback.predictedSunExposure,
        predictedConfidence: feedback.predictedConfidence,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to submit feedback');
    }

    const data = await response.json();
    return {
      id: data.id,
      success: true,
      message: data.message || 'Feedback submitted successfully',
    };
  } catch (error) {
    // Network error - queue for offline sync
    console.error('Failed to submit feedback, queuing for offline sync:', error);
    offlineSyncService.queueFeedback(toQueuedFeedback(feedback));
    
    // Track offline queuing
    analyticsService.trackOfflineQueued(feedback.venueId, feedback.patioId);
    
    return {
      id: 0,
      success: true,
      message: 'Feedback queued for submission when online',
    };
  }
}

/**
 * Processes any pending offline feedback submissions
 * Call this when the app comes online
 */
export async function syncPendingFeedback(): Promise<number> {
  return offlineSyncService.processPendingFeedback(async (queuedFeedback) => {
    const response = await fetch(`${API_BASE_URL}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patioId: queuedFeedback.patioId,
        timestamp: queuedFeedback.submittedAt,
        wasSunny: queuedFeedback.wasActuallySunny,
        predictedSunExposure: queuedFeedback.predictedSunExposure,
        predictedConfidence: queuedFeedback.predictedConfidence,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to sync feedback');
    }

    // Track successful offline sync
    analyticsService.trackOfflineSynced(queuedFeedback.venueId, queuedFeedback.patioId);
  });
}

/**
 * Gets the count of pending offline feedback items
 */
export function getPendingFeedbackCount(): number {
  return offlineSyncService.getPendingCount();
}
