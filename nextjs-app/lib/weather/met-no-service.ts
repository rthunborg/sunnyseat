import { GOTHENBURG } from '@/lib/solar/constants';
import type { WeatherSlice } from '@/lib/solar/types';

const API_BASE = 'https://api.met.no/weatherapi';
const USER_AGENT = 'SunnySeat/1.0 github.com/sunnyseat/app';

interface MetNoResponse {
  properties?: {
    timeseries?: Array<{
      time: string;
      data?: {
        instant?: {
          details?: {
            air_temperature?: number;
            cloud_area_fraction?: number;
            fog_area_fraction?: number;
          };
        };
        next_1_hours?: {
          details?: {
            precipitation_amount?: number;
          };
        };
      };
    }>;
  };
}

export async function getCurrentWeather(
  latitude = GOTHENBURG.LATITUDE,
  longitude = GOTHENBURG.LONGITUDE
): Promise<WeatherSlice | null> {
  const forecast = await getForecast(latitude, longitude);
  return forecast[0] ?? null;
}

export async function getForecast(
  latitude = GOTHENBURG.LATITUDE,
  longitude = GOTHENBURG.LONGITUDE
): Promise<WeatherSlice[]> {
  try {
    const url = `${API_BASE}/locationforecast/2.0/compact?lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(4)}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.warn(`Met.no returned ${res.status} for lat=${latitude}, lon=${longitude}`);
      return [];
    }

    const data: MetNoResponse = await res.json();
    const timeseries = data.properties?.timeseries;
    if (!timeseries?.length) return [];

    const now = Date.now();
    const slices: WeatherSlice[] = [];

    for (const entry of timeseries.slice(0, 48)) {
      const instant = entry.data?.instant?.details;
      if (!instant) continue;

      const entryTime = new Date(entry.time).getTime();
      const isForecast = entryTime > now + 30 * 60000;

      const precip = entry.data?.next_1_hours?.details?.precipitation_amount;
      const fogFraction = instant.fog_area_fraction;
      const visibility =
        fogFraction != null ? (100 - fogFraction) / 10.0 : undefined;

      slices.push({
        cloudCover: instant.cloud_area_fraction ?? 0,
        temperature: instant.air_temperature ?? 0,
        visibility,
        isForecast,
        source: 'metno',
        createdAt: new Date(),
      });
    }

    return slices;
  } catch (err) {
    console.error('Met.no fetch error:', err);
    return [];
  }
}

export async function isAvailable(): Promise<boolean> {
  try {
    const url = `${API_BASE}/locationforecast/2.0/compact?lat=57.7089&lon=11.9746`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
