'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SunExposureResult } from '@/lib/types/venue';
import type { SunStatus, SkyCondition } from '@/lib/types/design-tokens';
import type { GetVenuesResponse, VenueDataDto } from '@/lib/types/api';

interface UseSunExposureResult {
  data: SunExposureResult[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Map the API's flat VenueDataDto into the SunExposureResult shape
 * that the entire frontend (map, cards, sort, context) expects.
 */
function mapApiToSunExposureResult(dto: VenueDataDto): SunExposureResult {
  const statusMap: Record<string, SunStatus> = {
    Sunny: 'sunny',
    Partial: 'partial',
    Shaded: 'shaded',
  };

  const skyCondition = (dto.skyCondition as SkyCondition) ?? 'unavailable';

  return {
    venue: {
      id: dto.id,
      name: dto.venueName,
      slug: dto.slug || dto.id,
      neighborhood: dto.neighborhood || '',
      lat: dto.location.latitude,
      lng: dto.location.longitude,
    },
    current_status: statusMap[dto.currentSunStatus] ?? 'shaded',
    sun_exposure_percent: dto.sunExposurePercent,
    confidence: dto.confidence,
    windows: [],
    weather: {
      cloud_cover_percent: 0,
      sky_condition: skyCondition,
      source: 'api',
      fetched_at: new Date().toISOString(),
    },
    distance_meters: dto.distanceMeters,
  };
}

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
        `/api/venues?latitude=${fetchLat}&longitude=${fetchLng}&radiusKm=${fetchRadius}`,
        { signal: controller.signal }
      );

      if (fetchId !== fetchCountRef.current) return; // Stale

      if (!res.ok) {
        setError(`API error: ${res.status}`);
        setData([]);
        setIsLoading(false);
        return;
      }

      const json: GetVenuesResponse = await res.json();
      const venues = (json.venues ?? []).map(mapApiToSunExposureResult);
      setData(venues);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (fetchId !== fetchCountRef.current) return;
      setError('Network error');
      setData([]);
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
      setData([]);
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
