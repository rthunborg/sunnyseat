import { useEffect, useState } from 'react';
import type { UseAutoRefreshOptions, UseAutoRefreshReturn } from '../types';

/**
 * Custom hook for auto-refreshing data at regular intervals
 * Pauses when browser tab is hidden to conserve battery
 * 
 * @param options - Configuration options for auto-refresh
 * @returns Object with last refresh timestamp
 */
export const useAutoRefresh = (options: UseAutoRefreshOptions): UseAutoRefreshReturn => {
  const { intervalMs, enabled, onRefresh } = options;
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    if (!enabled) return;

    // Handle visibility change to pause/resume refresh
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        onRefresh();
        setLastRefresh(new Date());
      }
    };

    // Setup visibility listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Setup interval for auto-refresh
    const interval = setInterval(() => {
      if (!document.hidden) {
        onRefresh();
        setLastRefresh(new Date());
      }
    }, intervalMs);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [intervalMs, enabled, onRefresh]);

  return { lastRefresh };
};
