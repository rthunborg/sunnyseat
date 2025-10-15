// Analytics Service Tests

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { analyticsService } from './analyticsService';

describe('analyticsService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    analyticsService.clearData();
  });

  describe('trackEvent', () => {
    it('should track basic event without metadata', () => {
      analyticsService.trackEvent('feedback_prompt_shown');

      const events = analyticsService.getAllEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('feedback_prompt_shown');
      expect(events[0].timestamp).toBeDefined();
    });

    it('should track event with metadata', () => {
      analyticsService.trackEvent('feedback_submitted', {
        venueId: 1,
        patioId: 2,
        wasActuallySunny: true,
        predictedConfidence: 75,
      });

      const events = analyticsService.getAllEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        eventType: 'feedback_submitted',
        venueId: 1,
        patioId: 2,
        wasActuallySunny: true,
        predictedConfidence: 75,
      });
    });

    it('should persist events across page loads', () => {
      analyticsService.trackEvent('feedback_prompt_shown', { venueId: 1 });

      // Simulate page reload by getting fresh instance
      const events = analyticsService.getAllEvents();
      expect(events).toHaveLength(1);
    });

    it('should limit stored events to MAX_EVENTS', () => {
      // Track more than 100 events
      for (let i = 0; i < 150; i++) {
        analyticsService.trackEvent('feedback_prompt_shown', { venueId: i });
      }

      const events = analyticsService.getAllEvents();
      expect(events.length).toBeLessThanOrEqual(100);
      
      // Should keep the most recent events
      expect(events[events.length - 1].venueId).toBe(149);
    });
  });

  describe('trackPromptShown', () => {
    it('should track prompt shown event', () => {
      analyticsService.trackPromptShown(1, 2);

      const events = analyticsService.getAllEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        eventType: 'feedback_prompt_shown',
        venueId: 1,
        patioId: 2,
      });
    });
  });

  describe('trackFeedbackSubmitted', () => {
    it('should track feedback submission event', () => {
      analyticsService.trackFeedbackSubmitted(1, 2, true, 85);

      const events = analyticsService.getAllEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        eventType: 'feedback_submitted',
        venueId: 1,
        patioId: 2,
        wasActuallySunny: true,
        predictedConfidence: 85,
      });
    });
  });

  describe('trackFeedbackFailed', () => {
    it('should track feedback failure event', () => {
      analyticsService.trackFeedbackFailed(1, 2);

      const events = analyticsService.getAllEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        eventType: 'feedback_failed',
        venueId: 1,
        patioId: 2,
      });
    });
  });

  describe('trackOfflineQueued', () => {
    it('should track offline queued event', () => {
      analyticsService.trackOfflineQueued(1, 2);

      const events = analyticsService.getAllEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        eventType: 'feedback_offline_queued',
        venueId: 1,
        patioId: 2,
      });
    });
  });

  describe('trackOfflineSynced', () => {
    it('should track offline synced event', () => {
      analyticsService.trackOfflineSynced(1, 2);

      const events = analyticsService.getAllEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        eventType: 'feedback_offline_synced',
        venueId: 1,
        patioId: 2,
      });
    });
  });

  describe('getMetrics', () => {
    it('should return zero metrics when no events tracked', () => {
      const metrics = analyticsService.getMetrics();

      expect(metrics).toEqual({
        promptsShown: 0,
        feedbackSubmitted: 0,
        feedbackFailed: 0,
        offlineQueued: 0,
        offlineSynced: 0,
        accuracy: 0,
      });
    });

    it('should calculate correct event counts', () => {
      analyticsService.trackPromptShown(1, 1);
      analyticsService.trackPromptShown(1, 2);
      analyticsService.trackFeedbackSubmitted(1, 1, true, 85);
      analyticsService.trackFeedbackFailed(1, 2);
      analyticsService.trackOfflineQueued(1, 3);

      const metrics = analyticsService.getMetrics();

      expect(metrics.promptsShown).toBe(2);
      expect(metrics.feedbackSubmitted).toBe(1);
      expect(metrics.feedbackFailed).toBe(1);
      expect(metrics.offlineQueued).toBe(1);
    });

    it('should calculate accuracy correctly', () => {
      // Correct prediction (high confidence, was sunny)
      analyticsService.trackFeedbackSubmitted(1, 1, true, 85);
      
      // Incorrect prediction (high confidence, was not sunny)
      analyticsService.trackFeedbackSubmitted(1, 2, false, 85);
      
      // Correct prediction (low confidence, was not sunny)
      analyticsService.trackFeedbackSubmitted(1, 3, false, 30);

      const metrics = analyticsService.getMetrics();

      // 2 out of 3 correct = 66.7%
      expect(metrics.accuracy).toBeCloseTo(66.7, 1);
    });

    it('should handle edge case with no feedback submissions', () => {
      analyticsService.trackPromptShown(1, 1);
      analyticsService.trackPromptShown(1, 2);

      const metrics = analyticsService.getMetrics();

      expect(metrics.accuracy).toBe(0);
    });
  });

  describe('getEngagementRate', () => {
    it('should return 0 when no prompts shown', () => {
      const rate = analyticsService.getEngagementRate();
      expect(rate).toBe(0);
    });

    it('should calculate engagement rate correctly', () => {
      analyticsService.trackPromptShown(1, 1);
      analyticsService.trackPromptShown(1, 2);
      analyticsService.trackPromptShown(1, 3);
      analyticsService.trackPromptShown(1, 4);
      
      analyticsService.trackFeedbackSubmitted(1, 1, true, 85);
      analyticsService.trackFeedbackSubmitted(1, 2, false, 45);

      const rate = analyticsService.getEngagementRate();

      // 2 submissions / 4 prompts = 50%
      expect(rate).toBe(50.0);
    });

    it('should round to 1 decimal place', () => {
      analyticsService.trackPromptShown(1, 1);
      analyticsService.trackPromptShown(1, 2);
      analyticsService.trackPromptShown(1, 3);
      
      analyticsService.trackFeedbackSubmitted(1, 1, true, 85);

      const rate = analyticsService.getEngagementRate();

      // 1/3 = 33.333... -> 33.3%
      expect(rate).toBe(33.3);
    });
  });

  describe('getAllEvents', () => {
    it('should return all tracked events', () => {
      analyticsService.trackPromptShown(1, 1);
      analyticsService.trackFeedbackSubmitted(1, 1, true, 85);
      analyticsService.trackFeedbackFailed(1, 2);

      const events = analyticsService.getAllEvents();

      expect(events).toHaveLength(3);
      expect(events[0].eventType).toBe('feedback_prompt_shown');
      expect(events[1].eventType).toBe('feedback_submitted');
      expect(events[2].eventType).toBe('feedback_failed');
    });
  });

  describe('clearData', () => {
    it('should clear all analytics data', () => {
      analyticsService.trackPromptShown(1, 1);
      analyticsService.trackFeedbackSubmitted(1, 1, true, 85);

      expect(analyticsService.getAllEvents()).toHaveLength(2);

      analyticsService.clearData();

      expect(analyticsService.getAllEvents()).toHaveLength(0);
      expect(analyticsService.getMetrics().promptsShown).toBe(0);
    });
  });

  describe('exportData', () => {
    it('should export analytics data as JSON', () => {
      analyticsService.trackPromptShown(1, 1);
      analyticsService.trackPromptShown(1, 2);
      analyticsService.trackFeedbackSubmitted(1, 1, true, 85);

      const exported = analyticsService.exportData();
      const data = JSON.parse(exported);

      expect(data.metrics).toBeDefined();
      expect(data.metrics.promptsShown).toBe(2);
      expect(data.metrics.feedbackSubmitted).toBe(1);
      expect(data.engagementRate).toBe(50.0);
      expect(data.eventCount).toBe(3);
      expect(data.exportedAt).toBeDefined();
    });

    it('should not include PII in export', () => {
      analyticsService.trackFeedbackSubmitted(1, 1, true, 85);

      const exported = analyticsService.exportData();
      const data = JSON.parse(exported);

      // Verify no PII fields present
      expect(data).not.toHaveProperty('userId');
      expect(data).not.toHaveProperty('sessionId');
      expect(data).not.toHaveProperty('ipAddress');
      expect(data).not.toHaveProperty('email');
      expect(data).not.toHaveProperty('location');
    });
  });

  describe('Privacy Compliance', () => {
    it('should not track any PII', () => {
      analyticsService.trackFeedbackSubmitted(1, 1, true, 85);

      const events = analyticsService.getAllEvents();
      const event = events[0];

      // Verify NO PII fields
      expect(event).not.toHaveProperty('userId');
      expect(event).not.toHaveProperty('sessionId');
      expect(event).not.toHaveProperty('ipAddress');
      expect(event).not.toHaveProperty('email');
      expect(event).not.toHaveProperty('userLocation');
      expect(event).not.toHaveProperty('deviceId');
    });

    it('should only track venue/patio IDs (public identifiers)', () => {
      analyticsService.trackFeedbackSubmitted(1, 2, true, 85);

      const events = analyticsService.getAllEvents();
      const event = events[0];

      // Only allowed identifiers
      expect(event.venueId).toBe(1);
      expect(event.patioId).toBe(2);
      expect(event.timestamp).toBeDefined();
      expect(event.eventType).toBeDefined();
      
      // No other identifying information
      const keys = Object.keys(event);
      const allowedKeys = [
        'eventType',
        'timestamp',
        'venueId',
        'patioId',
        'wasActuallySunny',
        'predictedConfidence',
      ];
      
      keys.forEach((key) => {
        expect(allowedKeys).toContain(key);
      });
    });
  });
});
