import { NextResponse } from 'next/server';
import { withRequestLogging } from '@/lib/middleware/request-logger';
import { createHealthClient } from '@/lib/supabase/health';

/**
 * GET /api/health
 * Returns app version, Supabase connectivity, and last weather ingestion timestamp.
 */
export const GET = withRequestLogging(async () => {
  let supabaseStatus: 'connected' | 'error' = 'error';
  let lastWeatherIngestion: string | null = null;

  try {
    const supabase = createHealthClient();
    if (supabase) {
      const { error } = await supabase.from('venues').select('"Id"').limit(1);
      if (!error) {
        supabaseStatus = 'connected';
      }

      const { data: weatherData } = await supabase
        .from('weather_slices')
        .select('"CreatedAt"')
        .order('"CreatedAt"', { ascending: false })
        .limit(1);

      if (weatherData && weatherData.length > 0) {
        lastWeatherIngestion = weatherData[0].CreatedAt;
      }
    }
  } catch {
    supabaseStatus = 'error';
  }

  return NextResponse.json({
    status: 'ok',
    version: process.env.npm_package_version || '0.1.0',
    timestamp: new Date().toISOString(),
    supabase: supabaseStatus,
    lastWeatherIngestion,
  });
});
