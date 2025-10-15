// Offline Sync Service - Queue feedback submissions when offline

export interface FeedbackSubmission {
  venueId: number;
  patioId: number;
  wasActuallySunny: boolean;
  submittedAt: string;
  predictedSunExposure?: number;
  predictedConfidence?: number;
  userLocation?: { latitude: number; longitude: number };
  queuedAt?: string; // Timestamp when queued for offline sync
}

export interface OfflineFeedbackQueue {
  pending: FeedbackSubmission[];
  lastSyncAttempt: string | null;
}

const QUEUE_STORAGE_KEY = 'sunnyseat_offline_queue';
const MAX_AGE_HOURS = 24; // Discard feedback older than 24 hours

/**
 * Checks if a queued feedback item is too old to submit
 */
function isStale(feedback: FeedbackSubmission): boolean {
  if (!feedback.queuedAt) return false;
  
  const queuedTime = new Date(feedback.queuedAt).getTime();
  const now = Date.now();
  const ageMs = now - queuedTime;
  const maxAgeMs = MAX_AGE_HOURS * 60 * 60 * 1000;
  
  return ageMs > maxAgeMs;
}

/**
 * Gets the offline queue from localStorage
 */
function getOfflineQueue(): OfflineFeedbackQueue {
  try {
    const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!stored) {
      return { pending: [], lastSyncAttempt: null };
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to parse offline queue:', error);
    return { pending: [], lastSyncAttempt: null };
  }
}

/**
 * Saves the offline queue to localStorage
 */
function saveOfflineQueue(queue: OfflineFeedbackQueue): void {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to save offline queue:', error);
  }
}

/**
 * Removes a specific feedback item from the queue
 */
function removeFeedbackFromQueue(feedback: FeedbackSubmission): void {
  const queue = getOfflineQueue();
  queue.pending = queue.pending.filter(
    (item) =>
      !(
        item.venueId === feedback.venueId &&
        item.patioId === feedback.patioId &&
        item.submittedAt === feedback.submittedAt
      )
  );
  saveOfflineQueue(queue);
}

/**
 * Offline sync service for queuing feedback when network is unavailable
 */
export const offlineSyncService = {
  /**
   * Adds feedback to the offline queue
   */
  queueFeedback(feedback: FeedbackSubmission): void {
    const queue = getOfflineQueue();
    
    // Remove stale items before adding new one
    queue.pending = queue.pending.filter((item) => !isStale(item));
    
    // Add new feedback with queue timestamp
    queue.pending.push({
      ...feedback,
      queuedAt: new Date().toISOString(),
    });
    
    saveOfflineQueue(queue);
    console.log('Feedback queued for offline sync:', feedback);
  },

  /**
   * Processes all pending feedback in the queue
   * @param submitFn - Function to submit feedback to API
   * @returns Number of successfully synced items
   */
  async processPendingFeedback(
    submitFn: (feedback: FeedbackSubmission) => Promise<void>
  ): Promise<number> {
    const queue = getOfflineQueue();
    let successCount = 0;

    // Update last sync attempt timestamp
    queue.lastSyncAttempt = new Date().toISOString();
    saveOfflineQueue(queue);

    // Process each pending item
    for (const feedback of queue.pending) {
      // Skip if feedback is too old
      if (isStale(feedback)) {
        console.log('Removing stale feedback from queue:', feedback);
        removeFeedbackFromQueue(feedback);
        continue;
      }

      try {
        await submitFn(feedback);
        removeFeedbackFromQueue(feedback);
        successCount++;
        console.log('Successfully synced queued feedback:', feedback);
      } catch (error) {
        console.error('Failed to sync feedback, will retry later:', error);
        // Keep in queue for next sync attempt
      }
    }

    return successCount;
  },

  /**
   * Gets the current offline queue
   */
  getQueue(): OfflineFeedbackQueue {
    return getOfflineQueue();
  },

  /**
   * Gets count of pending feedback items
   */
  getPendingCount(): number {
    const queue = getOfflineQueue();
    // Filter out stale items
    return queue.pending.filter((item) => !isStale(item)).length;
  },

  /**
   * Clears all pending feedback from queue
   */
  clearQueue(): void {
    saveOfflineQueue({ pending: [], lastSyncAttempt: null });
  },

  /**
   * Checks if device is currently online
   */
  isOnline(): boolean {
    return navigator.onLine;
  },

  /**
   * Registers event listeners for online/offline events
   * @param onOnline - Callback when device comes online
   */
  registerNetworkListeners(onOnline: () => void): () => void {
    const handleOnline = () => {
      console.log('Device is online, attempting to sync pending feedback');
      onOnline();
    };

    const handleOffline = () => {
      console.log('Device is offline, feedback will be queued');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Return cleanup function
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  },
};
