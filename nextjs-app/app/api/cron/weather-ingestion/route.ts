import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { internalServerError } from '@/lib/utils/api-errors';
import { getForecast } from '@/lib/weather/met-no-service';
import { GOTHENBURG } from '@/lib/solar/constants';

/**
 * POST /api/cron/weather-ingestion
 * Scheduled background job: Fetch weather from Met.no and store in Supabase
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    console.log('[Weather Ingestion] Starting weather data ingestion');

    const slices = await getForecast(GOTHENBURG.LATITUDE, GOTHENBURG.LONGITUDE);

    if (slices.length === 0) {
      const duration = Date.now() - startTime;
      console.warn('[Weather Ingestion] No data returned from Met.no');
      return NextResponse.json({
        success: false,
        duration,
        message: 'No weather data fetched from Met.no',
      });
    }

    const rows = slices.map((s, i) => ({
      Timestamp: new Date(Date.now() + i * 3600000).toISOString(),
      CloudCover: s.cloudCover,
      Temperature: s.temperature,
      Visibility: s.visibility ?? null,
      IsForecast: s.isForecast,
      Source: s.source,
      CreatedAt: new Date().toISOString(),
    }));

    const { error: insertError } = await supabaseAdmin
      .from('weather_slices')
      .upsert(rows, { onConflict: 'Timestamp,Source' });

    if (insertError) {
      console.error('[Weather Ingestion] Insert error:', insertError.message);
    }

    // Cleanup data older than 7 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    await supabaseAdmin
      .from('weather_slices')
      .delete()
      .lt('CreatedAt', cutoff.toISOString());

    const duration = Date.now() - startTime;
    console.log(`[Weather Ingestion] Stored ${rows.length} slices in ${duration}ms`);

    return NextResponse.json({
      success: true,
      duration,
      slicesIngested: rows.length,
      message: `Weather data ingested: ${rows.length} time slices from Met.no`,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Weather Ingestion] Error:', error);
    return internalServerError(`Weather ingestion failed after ${duration}ms: ${error}`);
  }
}
