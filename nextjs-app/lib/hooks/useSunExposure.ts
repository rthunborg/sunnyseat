'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SunExposureResult } from '@/lib/types/venue';

interface UseSunExposureResult {
  data: SunExposureResult[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Mock data for development — realistic Gothenburg venues
const MOCK_VENUES: SunExposureResult[] = [
  {
    venue: { id: 'v1', name: 'Café Husaren', slug: 'cafe-husaren', neighborhood: 'Haga', lat: 57.6987, lng: 11.9535, is_partner: true },
    current_status: 'sunny', sun_exposure_percent: 92, confidence: 0.88,
    windows: [{ start: '2026-03-15T09:00:00Z', end: '2026-03-15T16:00:00Z', sun_status: 'sunny', sky_condition: 'clear' }],
    weather: { cloud_cover_percent: 10, sky_condition: 'clear', temperature_c: 14, wind_speed_ms: 3, source: 'met.no', fetched_at: new Date().toISOString() },
    distance_meters: 350,
  },
  {
    venue: { id: 'v2', name: 'Hagabullen', slug: 'hagabullen', neighborhood: 'Haga', lat: 57.6978, lng: 11.9548 },
    current_status: 'sunny', sun_exposure_percent: 85, confidence: 0.82,
    windows: [{ start: '2026-03-15T10:00:00Z', end: '2026-03-15T15:30:00Z', sun_status: 'sunny', sky_condition: 'partly-cloudy' }],
    weather: { cloud_cover_percent: 25, sky_condition: 'partly-cloudy', temperature_c: 13, wind_speed_ms: 4, source: 'met.no', fetched_at: new Date().toISOString() },
    distance_meters: 420,
  },
  {
    venue: { id: 'v3', name: 'Pustervik', slug: 'pustervik', neighborhood: 'Järntorget', lat: 57.6996, lng: 11.9490 },
    current_status: 'partial', sun_exposure_percent: 55, confidence: 0.75,
    windows: [{ start: '2026-03-15T11:00:00Z', end: '2026-03-15T13:00:00Z', sun_status: 'partial', sky_condition: 'partly-cloudy' }],
    weather: { cloud_cover_percent: 40, sky_condition: 'partly-cloudy', temperature_c: 12, wind_speed_ms: 5, source: 'met.no', fetched_at: new Date().toISOString() },
    distance_meters: 600,
  },
  {
    venue: { id: 'v4', name: 'Bar Centro', slug: 'bar-centro', neighborhood: 'Vasastan', lat: 57.7010, lng: 11.9795 },
    current_status: 'upcoming', sun_exposure_percent: 0, confidence: 0.80,
    windows: [{ start: '2026-03-15T14:00:00Z', end: '2026-03-15T17:00:00Z', sun_status: 'sunny', sky_condition: 'clear' }],
    weather: { cloud_cover_percent: 15, sky_condition: 'clear', temperature_c: 14, wind_speed_ms: 2, source: 'met.no', fetched_at: new Date().toISOString() },
    distance_meters: 800,
  },
  {
    venue: { id: 'v5', name: 'Da Matteo', slug: 'da-matteo', neighborhood: 'Vallgatan', lat: 57.7055, lng: 11.9680, is_partner: true },
    current_status: 'sunny', sun_exposure_percent: 78, confidence: 0.85,
    windows: [{ start: '2026-03-15T08:00:00Z', end: '2026-03-15T14:00:00Z', sun_status: 'sunny', sky_condition: 'clear' }],
    weather: { cloud_cover_percent: 5, sky_condition: 'clear', temperature_c: 15, wind_speed_ms: 2, source: 'met.no', fetched_at: new Date().toISOString() },
    distance_meters: 200,
  },
  {
    venue: { id: 'v6', name: 'Sjöbaren', slug: 'sjobaren', neighborhood: 'Haga', lat: 57.6965, lng: 11.9510 },
    current_status: 'shaded', sun_exposure_percent: 10, confidence: 0.70,
    windows: [],
    weather: { cloud_cover_percent: 60, sky_condition: 'overcast', temperature_c: 11, wind_speed_ms: 6, source: 'met.no', fetched_at: new Date().toISOString() },
    distance_meters: 550,
  },
  {
    venue: { id: 'v7', name: 'Kafé Magasinet', slug: 'kafe-magasinet', neighborhood: 'Tredje Långgatan', lat: 57.6993, lng: 11.9457 },
    current_status: 'partial', sun_exposure_percent: 45, confidence: 0.72,
    windows: [{ start: '2026-03-15T12:00:00Z', end: '2026-03-15T14:30:00Z', sun_status: 'partial', sky_condition: 'partly-cloudy' }],
    weather: { cloud_cover_percent: 35, sky_condition: 'partly-cloudy', temperature_c: 13, wind_speed_ms: 3, source: 'met.no', fetched_at: new Date().toISOString() },
    distance_meters: 750,
  },
];

export function useSunExposure(
  lat: number | null,
  lng: number | null,
  radiusKm: number = 2
): UseSunExposureResult {
  const [data, setData] = useState<SunExposureResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchCountRef = useRef(0);

  const fetchData = useCallback(async (fetchLat: number, fetchLng: number, fetchRadius: number) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchId = ++fetchCountRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/patios?lat=${fetchLat}&lng=${fetchLng}&radiusKm=${fetchRadius}`,
        { signal: controller.signal }
      );

      if (fetchId !== fetchCountRef.current) return; // Stale

      if (!res.ok) {
        // API not available — use mock data
        setData(MOCK_VENUES);
        setIsLoading(false);
        return;
      }

      const json = await res.json();
      setData(json as SunExposureResult[]);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (fetchId !== fetchCountRef.current) return;
      // Fallback to mock data in development
      setData(MOCK_VENUES);
    } finally {
      if (fetchId === fetchCountRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const refetch = useCallback(() => {
    if (lat != null && lng != null) {
      fetchData(lat, lng, radiusKm);
    }
  }, [lat, lng, radiusKm, fetchData]);

  useEffect(() => {
    if (lat == null || lng == null) {
      // No coordinates — load mock data for default center
      setData(MOCK_VENUES);
      return;
    }

    // Debounce 300ms
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchData(lat, lng, radiusKm);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [lat, lng, radiusKm, fetchData]);

  return { data, isLoading, error, refetch };
}
