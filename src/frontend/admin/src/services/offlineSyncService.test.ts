// Offline Sync Service Tests

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { offlineSyncService, type FeedbackSubmission } from './offlineSyncService';

describe('offlineSyncService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockFeedback: FeedbackSubmission = {
    venueId: 1,
    patioId: 1,
    wasActuallySunny: true,
    submittedAt: new Date().toISOString(),
    predictedSunExposure: 85,
    predictedConfidence: 75,
  };

  describe('queueFeedback', () => {
    it('should add feedback to queue', () => {
      offlineSyncService.queueFeedback(mockFeedback);

      const queue = offlineSyncService.getQueue();
      expect(queue.pending).toHaveLength(1);
      expect(queue.pending[0]).toMatchObject(mockFeedback);
      expect(queue.pending[0].queuedAt).toBeDefined();
    });

    it('should add multiple feedback items to queue', () => {
      offlineSyncService.queueFeedback(mockFeedback);
      offlineSyncService.queueFeedback({
        ...mockFeedback,
        venueId: 2,
        submittedAt: new Date().toISOString(),
      });

      const queue = offlineSyncService.getQueue();
      expect(queue.pending).toHaveLength(2);
    });

    it('should remove stale feedback when queueing new items', () => {
      // Add old feedback (>24 hours old)
      const staleFeedback: FeedbackSubmission = {
        ...mockFeedback,
        queuedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      };

      // Manually add to storage
      localStorage.setItem(
        'sunnyseat_offline_queue',
        JSON.stringify({
          pending: [staleFeedback],
          lastSyncAttempt: null,
        })
      );

      // Queue new feedback
      offlineSyncService.queueFeedback(mockFeedback);

      const queue = offlineSyncService.getQueue();
      expect(queue.pending).toHaveLength(1);
      expect(queue.pending[0].queuedAt).not.toBe(staleFeedback.queuedAt);
    });
  });

  describe('processPendingFeedback', () => {
    it('should successfully sync all pending feedback', async () => {
      const submitFn = vi.fn().mockResolvedValue(undefined);

      offlineSyncService.queueFeedback(mockFeedback);
      offlineSyncService.queueFeedback({
        ...mockFeedback,
        venueId: 2,
        submittedAt: new Date().toISOString(),
      });

      const syncedCount = await offlineSyncService.processPendingFeedback(submitFn);

      expect(syncedCount).toBe(2);
      expect(submitFn).toHaveBeenCalledTimes(2);
      expect(offlineSyncService.getPendingCount()).toBe(0);
    });

    it('should handle sync failures gracefully', async () => {
      const submitFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);

      offlineSyncService.queueFeedback(mockFeedback);
      offlineSyncService.queueFeedback({
        ...mockFeedback,
        venueId: 2,
        submittedAt: new Date().toISOString(),
      });

      const syncedCount = await offlineSyncService.processPendingFeedback(submitFn);

      expect(syncedCount).toBe(1); // Only second one succeeded
      expect(offlineSyncService.getPendingCount()).toBe(1); // First one still queued
    });

    it('should remove stale feedback during sync', async () => {
      const submitFn = vi.fn().mockResolvedValue(undefined);

      // Add stale feedback
      const staleFeedback: FeedbackSubmission = {
        ...mockFeedback,
        queuedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      };

      localStorage.setItem(
        'sunnyseat_offline_queue',
        JSON.stringify({
          pending: [staleFeedback],
          lastSyncAttempt: null,
        })
      );

      const syncedCount = await offlineSyncService.processPendingFeedback(submitFn);

      expect(syncedCount).toBe(0);
      expect(submitFn).not.toHaveBeenCalled(); // Stale item not submitted
      expect(offlineSyncService.getPendingCount()).toBe(0);
    });

    it('should update lastSyncAttempt timestamp', async () => {
      const submitFn = vi.fn().mockResolvedValue(undefined);

      offlineSyncService.queueFeedback(mockFeedback);

      await offlineSyncService.processPendingFeedback(submitFn);

      const queue = offlineSyncService.getQueue();
      expect(queue.lastSyncAttempt).toBeDefined();
      expect(new Date(queue.lastSyncAttempt!).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('getQueue', () => {
    it('should return empty queue when no items stored', () => {
      const queue = offlineSyncService.getQueue();

      expect(queue.pending).toEqual([]);
      expect(queue.lastSyncAttempt).toBeNull();
    });

    it('should return stored queue', () => {
      offlineSyncService.queueFeedback(mockFeedback);

      const queue = offlineSyncService.getQueue();

      expect(queue.pending).toHaveLength(1);
      expect(queue.pending[0]).toMatchObject(mockFeedback);
    });

    it('should handle corrupted localStorage data', () => {
      localStorage.setItem('sunnyseat_offline_queue', 'invalid json');

      const queue = offlineSyncService.getQueue();

      expect(queue.pending).toEqual([]);
      expect(queue.lastSyncAttempt).toBeNull();
    });
  });

  describe('getPendingCount', () => {
    it('should return 0 when queue is empty', () => {
      expect(offlineSyncService.getPendingCount()).toBe(0);
    });

    it('should return correct count of pending items', () => {
      offlineSyncService.queueFeedback(mockFeedback);
      offlineSyncService.queueFeedback({
        ...mockFeedback,
        venueId: 2,
        submittedAt: new Date().toISOString(),
      });

      expect(offlineSyncService.getPendingCount()).toBe(2);
    });

    it('should exclude stale items from count', () => {
      // Add stale feedback
      const staleFeedback: FeedbackSubmission = {
        ...mockFeedback,
        queuedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      };

      localStorage.setItem(
        'sunnyseat_offline_queue',
        JSON.stringify({
          pending: [staleFeedback, mockFeedback],
          lastSyncAttempt: null,
        })
      );

      // Should only count non-stale items
      expect(offlineSyncService.getPendingCount()).toBe(1);
    });
  });

  describe('clearQueue', () => {
    it('should clear all pending feedback', () => {
      offlineSyncService.queueFeedback(mockFeedback);
      offlineSyncService.queueFeedback({
        ...mockFeedback,
        venueId: 2,
        submittedAt: new Date().toISOString(),
      });

      offlineSyncService.clearQueue();

      expect(offlineSyncService.getPendingCount()).toBe(0);
      const queue = offlineSyncService.getQueue();
      expect(queue.pending).toEqual([]);
      expect(queue.lastSyncAttempt).toBeNull();
    });
  });

  describe('isOnline', () => {
    it('should return navigator.onLine value', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      expect(offlineSyncService.isOnline()).toBe(true);

      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      expect(offlineSyncService.isOnline()).toBe(false);
    });
  });

  describe('registerNetworkListeners', () => {
    it('should call callback when device comes online', () => {
      const onOnline = vi.fn();

      const cleanup = offlineSyncService.registerNetworkListeners(onOnline);

      // Simulate online event
      window.dispatchEvent(new Event('online'));

      expect(onOnline).toHaveBeenCalledTimes(1);

      cleanup();
    });

    it('should log when device goes offline', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const onOnline = vi.fn();

      const cleanup = offlineSyncService.registerNetworkListeners(onOnline);

      // Simulate offline event
      window.dispatchEvent(new Event('offline'));

      expect(consoleSpy).toHaveBeenCalledWith('Device is offline, feedback will be queued');

      cleanup();
    });

    it('should cleanup event listeners', () => {
      const onOnline = vi.fn();

      const cleanup = offlineSyncService.registerNetworkListeners(onOnline);
      cleanup();

      // After cleanup, events should not trigger callbacks
      window.dispatchEvent(new Event('online'));

      expect(onOnline).not.toHaveBeenCalled();
    });
  });
});
