'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SunExposureResult } from '@/lib/types/venue';

export interface UseDateSelectionReturn {
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  futureExposure: SunExposureResult[] | null;
  isLoading: boolean;
}

function formatDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function useDateSelection(
  lat: number | null,
  lng: number | null,
  radiusKm: number = 2
): UseDateSelectionReturn {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [futureExposure, setFutureExposure] = useState<SunExposureResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchForDate = useCallback(
    async (date: Date, fetchLat: number, fetchLng: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);

      try {
        const dateParam = formatDateParam(date);
        const res = await fetch(
          `/api/patios?latitude=${fetchLat}&longitude=${fetchLng}&radiusKm=${radiusKm}&date=${dateParam}`,
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
    // null or today means "live" mode — no future fetch
    if (!selectedDate || isSameDay(selectedDate, new Date())) {
      setFutureExposure(null);
      setIsLoading(false);
      return;
    }

    if (lat == null || lng == null) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchForDate(selectedDate, lat, lng);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [selectedDate, lat, lng, fetchForDate]);

  return { selectedDate, setSelectedDate, futureExposure, isLoading };
}
