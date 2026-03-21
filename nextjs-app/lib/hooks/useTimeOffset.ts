'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SunExposureResult } from '@/lib/types/venue';

export type TimeOffsetHours = 0 | 1 | 2 | 3;

interface UseTimeOffsetReturn {
  timeOffset: TimeOffsetHours;
  setTimeOffset: (offset: TimeOffsetHours) => void;
  futureExposure: SunExposureResult[] | null;
  isLoading: boolean;
}

/**
 * Manages time offset state for the future time slider.
 * When offset > 0, fetches sun exposure data for that future time.
 * Debounces API calls by 300ms during rapid changes.
 */
export function useTimeOffset(
  lat: number | null,
  lng: number | null,
  radiusKm: number = 2
): UseTimeOffsetReturn {
  const [timeOffset, setTimeOffset] = useState<TimeOffsetHours>(0);
  const [futureExposure, setFutureExposure] = useState<SunExposureResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchFutureExposure = useCallback(
    async (offset: TimeOffsetHours, fetchLat: number, fetchLng: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);

      try {
        const res = await fetch(
          `/api/patios?latitude=${fetchLat}&longitude=${fetchLng}&radiusKm=${radiusKm}&offset_hours=${offset}`,
          { signal: controller.signal }
        );

        if (!res.ok) {
          setFutureExposure(null);
          return;
        }

        const json = await res.json();
        setFutureExposure(json.patios ?? json);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setFutureExposure(null);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [radiusKm]
  );

  useEffect(() => {
    // When offset is 0, clear future data
    if (timeOffset === 0) {
      setFutureExposure(null);
      setIsLoading(false);
      return;
    }

    if (lat == null || lng == null) return;

    // Debounce 300ms
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchFutureExposure(timeOffset, lat, lng);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [timeOffset, lat, lng, fetchFutureExposure]);

  return { timeOffset, setTimeOffset, futureExposure, isLoading };
}
