import { NextRequest, NextResponse } from 'next/server';
import { badRequest, notFound, internalServerError } from '@/lib/utils/api-errors';
import { parseOptionalDateQuery } from '@/lib/utils/validation';
import { calculateSunExposure } from '@/lib/solar/sun-exposure-service';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { PatioSunExposureResponse } from '@/lib/types/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const patioId = parseInt(id, 10);
    if (isNaN(patioId)) {
      return badRequest('Invalid patio ID');
    }

    const searchParams = request.nextUrl.searchParams;
    const timestampParam = searchParams.get('timestamp');
    const timestamp = timestampParam
      ? parseOptionalDateQuery(timestampParam) || new Date()
      : new Date();

    const { data: patio, error: patioError } = await supabaseAdmin
      .from('patios')
      .select('Id')
      .eq('Id', patioId)
      .single();

    if (patioError || !patio) {
      return notFound('Patio');
    }

    const result = await calculateSunExposure(patioId, timestamp);

    const response: PatioSunExposureResponse = {
      patioId: result.patioId,
      timestamp: result.timestamp.toISOString(),
      state: result.state,
      sunExposurePercent: result.sunExposurePercent,
      confidence: result.confidence,
      solarElevation: result.solarElevation,
      solarAzimuth: result.solarAzimuth,
      weatherData: result.weatherData
        ? {
            cloudCover: result.weatherData.cloudCover,
            temperature: result.weatherData.temperature,
            precipitationProbability: 0,
            visibility: result.weatherData.visibility,
            source: result.weatherData.source,
            isForecast: result.weatherData.isForecast,
          }
        : undefined,
    };

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch (error) {
    console.error('Get sun exposure error:', error);
    return internalServerError('An error occurred while calculating sun exposure');
  }
}
