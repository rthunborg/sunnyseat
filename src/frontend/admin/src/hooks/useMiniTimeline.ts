// useMiniTimeline Hook
// Story 4.2: Patio Information Cards & Results
// Custom hook for fetching and managing mini timeline data

import { useState, useEffect, useCallback } from 'react';
import type { MiniTimelineData } from '../types/timeline';

interface UseMiniTimelineOptions {
  patioId: string;
  startTime?: Date;
  enabled?: boolean;
}

interface UseMiniTimelineResult {
  timelineData: MiniTimelineData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for fetching 2-hour mini timeline data for a patio
 * Implements 5-minute caching
 */
export const useMiniTimeline = ({
  patioId,
  startTime = new Date(),
  enabled = true,
}: UseMiniTimelineOptions): UseMiniTimelineResult => {
  const [timelineData, setTimelineData] = useState<MiniTimelineData | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const fetchTimeline = useCallback(async () => {
    // Check if we have recent data (within 5 minutes)
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (timelineData && now - lastFetch < fiveMinutes) {
      return; // Use cached data
    }

    if (!enabled) return;

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      // The story notes indicate the miniTimeline data is included in /api/patios response
      // This hook would be used if we need to fetch it separately or refresh it
      const response = await fetch(
        `/api/patios/${patioId}/timeline?startTime=${startTime.toISOString()}&duration=120&resolution=10`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch mini timeline data');
      }

      const data = await response.json();
      
      // Convert ISO strings to Date objects
      const processedData: MiniTimelineData = {
        ...data,
        generatedAt: new Date(data.generatedAt),
        slots: data.slots.map((slot: any) => ({
          ...slot,
          timestamp: new Date(slot.timestamp),
        })),
      };

      setTimelineData(processedData);
      setLastFetch(now);
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [patioId, startTime, enabled, timelineData, lastFetch]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  const refetch = useCallback(() => {
    setLastFetch(0); // Force refetch
    fetchTimeline();
  }, [fetchTimeline]);

  return {
    timelineData,
    isLoading,
    isError,
    error,
    refetch,
  };
};

