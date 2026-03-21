'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface SunnyNowVenue {
  id: number;
  name: string;
  slug: string;
  sunStatus: 'Sunny' | 'Partial';
  sunPercentage: number;
}

interface SunnyNowResponse {
  venues: SunnyNowVenue[];
  timestamp: string;
}

interface UseSunnyNowResult {
  sunnyPartners: string[];
  sunnyVenues: SunnyNowVenue[];
  isLoading: boolean;
}

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useSunnyNow(): UseSunnyNowResult {
  const [sunnyVenues, setSunnyVenues] = useState<SunnyNowVenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSunnyNow = useCallback(async () => {
    try {
      const res = await fetch('/api/partners/sunny-now');
      if (!res.ok) {
        setSunnyVenues([]);
        return;
      }
      const data: SunnyNowResponse = await res.json();
      setSunnyVenues(data.venues);
    } catch {
      setSunnyVenues([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSunnyNow();

    intervalRef.current = setInterval(fetchSunnyNow, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchSunnyNow]);

  const sunnyPartners = sunnyVenues.map((v) => String(v.id));

  return { sunnyPartners, sunnyVenues, isLoading };
}
