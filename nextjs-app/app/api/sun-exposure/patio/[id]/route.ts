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
    const venueId = parseInt(id, 10);
    if (isNaN(venueId)) {
      return badRequest('Invalid venue ID');
    }

    const searchParams = request.nextUrl.searchParams;
    const timestampParam = searchParams.get('timestamp');
    const timestamp = timestampParam
      ? parseOptionalDateQuery(timestampParam) || new Date()
      : new Date();

    const { data: venue, error: venueError } = await supabaseAdmin
      .from('venues')
      .select('Id')
      .eq('Id', venueId)
      .single();

    if (venueError || !venue) {
      return notFound('Venue');
    }

    const result = await calculateSunExposure(venueId, timestamp);

    const response: PatioSunExposureResponse = {
      venueId: result.venueId,
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
      headers: { 'Cache-Control': 'public, s-maxage=300' },
    });
  } catch (error) {
    console.error('Get sun exposure error:', error);
    return internalServerError('An error occurred while calculating sun exposure');
  }
}
