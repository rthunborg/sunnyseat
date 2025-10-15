// Analytics Service - Privacy-safe event tracking (GDPR/CCPA compliant)
// NO personally identifiable information (PII) collected

export type AnalyticsEventType =
  | 'feedback_prompt_shown'
  | 'feedback_submitted'
  | 'feedback_failed'
  | 'feedback_offline_queued'
  | 'feedback_offline_synced';

export interface AnalyticsEvent {
  eventType: AnalyticsEventType;
  timestamp: string;
  venueId?: number; // Venue is not PII
  patioId?: number; // Patio is not PII
  wasActuallySunny?: boolean; // Aggregated metric, not PII
  predictedConfidence?: number; // Aggregated metric
  // NO user identifiers, IP addresses, session IDs, or personal data
}

export interface AnalyticsMetrics {
  promptsShown: number;
  feedbackSubmitted: number;
  feedbackFailed: number;
  offlineQueued: number;
  offlineSynced: number;
  accuracy: number; // Ratio of correct predictions
}

const STORAGE_KEY = 'sunnyseat_analytics';
const MAX_EVENTS = 100; // Keep last 100 events for aggregation

/**
 * Gets stored analytics events from localStorage
 */
function getStoredEvents(): AnalyticsEvent[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to parse analytics events:', error);
    return [];
  }
}

/**
 * Saves analytics events to localStorage
 */
function saveEvents(events: AnalyticsEvent[]): void {
  try {
    // Keep only last MAX_EVENTS
    const eventsToSave = events.slice(-MAX_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(eventsToSave));
  } catch (error) {
    console.error('Failed to save analytics events:', error);
  }
}

/**
 * Privacy-safe analytics service
 * Tracks only anonymous aggregate metrics - NO PII
 */
export const analyticsService = {
  /**
   * Tracks an analytics event
   * @param eventType - Type of event to track
   * @param metadata - Optional metadata (NO PII allowed)
   */
  trackEvent(
    eventType: AnalyticsEventType,
    metadata?: {
      venueId?: number;
      patioId?: number;
      wasActuallySunny?: boolean;
      predictedConfidence?: number;
    }
  ): void {
    const event: AnalyticsEvent = {
      eventType,
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    const events = getStoredEvents();
    events.push(event);
    saveEvents(events);

    console.log('Analytics event tracked:', event);
  },

  /**
   * Tracks when feedback prompt is shown to user
   */
  trackPromptShown(venueId: number, patioId: number): void {
    this.trackEvent('feedback_prompt_shown', { venueId, patioId });
  },

  /**
   * Tracks successful feedback submission
   */
  trackFeedbackSubmitted(
    venueId: number,
    patioId: number,
    wasActuallySunny: boolean,
    predictedConfidence: number
  ): void {
    this.trackEvent('feedback_submitted', {
      venueId,
      patioId,
      wasActuallySunny,
      predictedConfidence,
    });
  },

  /**
   * Tracks failed feedback submission
   */
  trackFeedbackFailed(venueId: number, patioId: number): void {
    this.trackEvent('feedback_failed', { venueId, patioId });
  },

  /**
   * Tracks feedback queued for offline sync
   */
  trackOfflineQueued(venueId: number, patioId: number): void {
    this.trackEvent('feedback_offline_queued', { venueId, patioId });
  },

  /**
   * Tracks successful offline feedback sync
   */
  trackOfflineSynced(venueId: number, patioId: number): void {
    this.trackEvent('feedback_offline_synced', { venueId, patioId });
  },

  /**
   * Gets aggregate analytics metrics
   * @returns Aggregated anonymous metrics
   */
  getMetrics(): AnalyticsMetrics {
    const events = getStoredEvents();

    const promptsShown = events.filter((e) => e.eventType === 'feedback_prompt_shown').length;
    const feedbackSubmitted = events.filter((e) => e.eventType === 'feedback_submitted').length;
    const feedbackFailed = events.filter((e) => e.eventType === 'feedback_failed').length;
    const offlineQueued = events.filter((e) => e.eventType === 'feedback_offline_queued').length;
    const offlineSynced = events.filter((e) => e.eventType === 'feedback_offline_synced').length;

    // Calculate accuracy (submissions with known outcome)
    const feedbackWithOutcome = events.filter(
      (e) => e.eventType === 'feedback_submitted' && e.wasActuallySunny !== undefined
    );

    let accuracy = 0;
    if (feedbackWithOutcome.length > 0) {
      const correctPredictions = feedbackWithOutcome.filter((e) => {
        // Assume "sunny" prediction if confidence > 50%
        const predictedSunny = (e.predictedConfidence || 0) > 50;
        return predictedSunny === e.wasActuallySunny;
      }).length;

      accuracy = (correctPredictions / feedbackWithOutcome.length) * 100;
    }

    return {
      promptsShown,
      feedbackSubmitted,
      feedbackFailed,
      offlineQueued,
      offlineSynced,
      accuracy: Math.round(accuracy * 10) / 10, // Round to 1 decimal
    };
  },

  /**
   * Gets engagement rate (submitted vs shown)
   * @returns Percentage of prompts that resulted in submission
   */
  getEngagementRate(): number {
    const metrics = this.getMetrics();
    if (metrics.promptsShown === 0) return 0;

    const rate = (metrics.feedbackSubmitted / metrics.promptsShown) * 100;
    return Math.round(rate * 10) / 10; // Round to 1 decimal
  },

  /**
   * Gets all events (for debugging/export)
   * @returns Array of anonymous events
   */
  getAllEvents(): AnalyticsEvent[] {
    return getStoredEvents();
  },

  /**
   * Clears all analytics data
   */
  clearData(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  /**
   * Exports analytics data as JSON (privacy-safe)
   * @returns JSON string of anonymous aggregated data
   */
  exportData(): string {
    const metrics = this.getMetrics();
    const events = getStoredEvents();

    return JSON.stringify(
      {
        metrics,
        engagementRate: this.getEngagementRate(),
        eventCount: events.length,
        exportedAt: new Date().toISOString(),
        // NO PII included in export
      },
      null,
      2
    );
  },
};
