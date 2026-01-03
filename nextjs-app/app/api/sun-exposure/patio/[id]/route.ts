import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { notFound, badRequest, internalServerError } from '@/lib/utils/api-errors';
import type { PatioSunExposureResponse } from '@/lib/types/api';
import { parseOptionalDateQuery } from '@/lib/utils/validation';

/**
 * GET /api/sun-exposure/patio/[id]
 * Get sun exposure for a specific patio at given timestamp
 * Query param: timestamp (optional, defaults to current time)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const patioId = parseInt(id, 10);
    if (isNaN(patioId)) {
      return badRequest('Invalid patio ID');
    }

    // Parse optional timestamp
    const searchParams = request.nextUrl.searchParams;
    const timestampParam = searchParams.get('timestamp');
    const timestamp = timestampParam
      ? parseOptionalDateQuery(timestampParam) || new Date()
      : new Date();

    // Get patio
    const { data: patio, error: patioError } = await supabaseAdmin
      .from('patios')
      .select('*')
      .eq('Id', patioId)
      .single();

    if (patioError || !patio) {
      return notFound('Patio');
    }

    // TODO: Calculate sun exposure
    // This is a placeholder - full sun exposure calculation will be migrated in Story 6.5
    // For now, return a basic response structure

    const response: PatioSunExposureResponse = {
      patioId,
      timestamp: timestamp.toISOString(),
      state: 'Shaded', // Placeholder
      sunExposurePercent: 0, // Placeholder
      confidence: 0, // Placeholder
      solarElevation: 0, // Placeholder
      solarAzimuth: 0, // Placeholder
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get sun exposure error:', error);
    return internalServerError('An error occurred while calculating sun exposure');
  }
}
