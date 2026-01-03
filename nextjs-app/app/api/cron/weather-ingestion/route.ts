import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { internalServerError } from '@/lib/utils/api-errors';

/**
 * POST /api/cron/weather-ingestion
 * Scheduled background job: Weather data ingestion
 * Schedule: Daily at 2 AM UTC (triggered by GitHub Actions)
 * Workflow: .github/workflows/scheduled-jobs-weather.yml
 *
 * Fetches weather data from external APIs and stores in Supabase
 */
export async function POST(request: NextRequest) {
  // Verify cron secret (Vercel Cron sends this header)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    console.log('[Weather Ingestion] Starting weather data ingestion');

    // Get Gothenburg coordinates
    const gothenburgLat = 57.7089;
    const gothenburgLon = 11.9746;

    // Fetch weather data from primary source (Met.no)
    // Note: Weather service implementation will be added in a future story
    // For now, this is a placeholder structure
    let weatherDataFetched = false;

    try {
      // TODO: Implement Met.no weather service
      // const metNoService = new MetNoWeatherService();
      // const weatherData = await metNoService.getForecastAsync(gothenburgLat, gothenburgLon);
      // await storeWeatherData(weatherData);
      // weatherDataFetched = true;

      console.log('[Weather Ingestion] Weather service not yet implemented - placeholder');
    } catch (error) {
      console.error('[Weather Ingestion] Primary source failed, trying fallback:', error);

      // Fallback to OpenWeatherMap
      try {
        // TODO: Implement OpenWeatherMap weather service
        // const openWeatherService = new OpenWeatherMapService();
        // const weatherData = await openWeatherService.getForecastAsync(gothenburgLat, gothenburgLon);
        // await storeWeatherData(weatherData);
        // weatherDataFetched = true;
      } catch (fallbackError) {
        console.error('[Weather Ingestion] Fallback source also failed:', fallbackError);
      }
    }

    // Cleanup old weather data
    const retentionDays = 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // TODO: Implement weather data cleanup
    // await cleanupOldWeatherData(cutoffDate);

    const duration = Date.now() - startTime;

    if (weatherDataFetched) {
      console.log(`[Weather Ingestion] Completed successfully in ${duration}ms`);
      return NextResponse.json({
        success: true,
        duration: duration,
        message: 'Weather data ingested successfully',
      });
    } else {
      console.warn(`[Weather Ingestion] Completed but no data fetched in ${duration}ms`);
      return NextResponse.json({
        success: false,
        duration: duration,
        message: 'Weather ingestion completed but no data was fetched (service not implemented)',
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Weather Ingestion] Error:', error);
    return internalServerError(`Weather ingestion failed after ${duration}ms: ${error}`);
  }
}
