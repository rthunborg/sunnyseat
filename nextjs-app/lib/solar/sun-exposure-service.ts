import { calculateSolarPosition } from './solar-calculation-service';
import { calculateVenueShadow } from './shadow-calculation-service';
import { calculateConfidenceFactors, calculateDisplayConfidence } from './confidence-calculator';
import { getCurrentWeather } from '@/lib/weather/met-no-service';
import type { SunState, WeatherSlice } from './types';

export interface SunExposureResult {
  venueId: number;
  timestamp: Date;
  state: SunState;
  sunExposurePercent: number;
  confidence: number;
  solarElevation: number;
  solarAzimuth: number;
  weatherData?: {
    cloudCover: number;
    temperature: number;
    visibility?: number;
    source: string;
    isForecast: boolean;
  };
}

export async function calculateSunExposure(
  venueId: number,
  timestamp: Date
): Promise<SunExposureResult> {
  const solarPosition = calculateSolarPosition(timestamp);

  if (!solarPosition.isSunVisible) {
    return {
      venueId,
      timestamp,
      state: 'NoSun',
      sunExposurePercent: 0,
      confidence: 100,
      solarElevation: solarPosition.elevation,
      solarAzimuth: solarPosition.azimuth,
    };
  }

  const shadowInfo = await calculateVenueShadow(venueId, timestamp);
  const sunExposurePercent = shadowInfo.sunlitAreaPercent;
  const state = classifySunState(sunExposurePercent);

  let weather: WeatherSlice | null = null;
  try {
    weather = await getCurrentWeather();
  } catch {
    // Weather is optional — proceed without it
  }

  const factors = calculateConfidenceFactors(
    1.0, // default polygon quality
    shadowInfo,
    solarPosition,
    weather
  );
  const displayConfidence = calculateDisplayConfidence(factors);

  return {
    venueId,
    timestamp,
    state,
    sunExposurePercent: Math.round(sunExposurePercent * 10) / 10,
    confidence: displayConfidence,
    solarElevation: Math.round(solarPosition.elevation * 1000) / 1000,
    solarAzimuth: Math.round(solarPosition.azimuth * 1000) / 1000,
    weatherData: weather
      ? {
          cloudCover: weather.cloudCover,
          temperature: weather.temperature,
          visibility: weather.visibility,
          source: weather.source,
          isForecast: weather.isForecast,
        }
      : undefined,
  };
}

export async function calculateBatchSunExposure(
  venueIds: number[],
  timestamp: Date
): Promise<Map<number, SunExposureResult>> {
  const results = new Map<number, SunExposureResult>();

  for (const id of venueIds) {
    try {
      results.set(id, await calculateSunExposure(id, timestamp));
    } catch (err) {
      console.error(`Failed sun exposure for venue ${id}:`, err);
      const pos = calculateSolarPosition(timestamp);
      results.set(id, {
        venueId: id,
        timestamp,
        state: 'Shaded',
        sunExposurePercent: 0,
        confidence: 0,
        solarElevation: pos.elevation,
        solarAzimuth: pos.azimuth,
      });
    }
  }

  return results;
}

function classifySunState(sunlitPercent: number): SunState {
  if (sunlitPercent >= 70) return 'Sunny';
  if (sunlitPercent >= 30) return 'Partial';
  return 'Shaded';
}
