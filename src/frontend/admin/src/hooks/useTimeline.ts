import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import type { 
  SunExposureTimeline, 
  TimelineViewOptions, 
  UseTimelineReturn,
  TimelineComparison,
  UseTimelineComparisonReturn
} from '../types';

/**
 * Custom hook for managing timeline data and operations
 */
export function useTimeline(): UseTimelineReturn {
  const [timeline, setTimeline] = useState<SunExposureTimeline | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTimeline = useCallback(async (patioId: number, options: TimelineViewOptions) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const timelineData = await apiService.getTimelineByOptions(patioId, options);
      setTimeline(timelineData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load timeline';
      setError(errorMessage);
      console.error('Timeline loading error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearTimeline = useCallback(() => {
    setTimeline(null);
    setError(null);
  }, []);

  const refreshTimeline = useCallback(async () => {
    if (!timeline) return;
    
    // Reconstruct options from current timeline
    const options: TimelineViewOptions = {
      timeRange: 'custom',
      resolution: 10, // Default resolution
      showConfidence: true,
      showSunWindows: true,
      showRecommendations: true,
      customStart: timeline.startTime,
      customEnd: timeline.endTime
    };
    
    await loadTimeline(timeline.patioId, options);
  }, [timeline, loadTimeline]);

  return {
    timeline,
    isLoading,
    error,
    loadTimeline,
    clearTimeline,
    refreshTimeline
  };
}

/**
 * Custom hook for managing timeline comparisons between multiple patios
 */
export function useTimelineComparison(): UseTimelineComparisonReturn {
  const [comparison, setComparison] = useState<TimelineComparison | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const comparePatios = useCallback(async (patioIds: number[], startTime: string, endTime: string) => {
    if (patioIds.length < 2) {
      setError('At least 2 patios required for comparison');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const comparisonData = await apiService.compareTimelines(patioIds, startTime, endTime);
      setComparison(comparisonData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to compare timelines';
      setError(errorMessage);
      console.error('Timeline comparison error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearComparison = useCallback(() => {
    setComparison(null);
    setError(null);
  }, []);

  return {
    comparison,
    isLoading,
    error,
    comparePatios,
    clearComparison
  };
}