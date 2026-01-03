import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { internalServerError } from '@/lib/utils/api-errors';
import { requireAuth } from '@/lib/middleware/auth';
import type { AccuracyMetricsResponse } from '@/lib/types/api';
import { parseOptionalDateQuery } from '@/lib/utils/validation';

/**
 * GET /api/feedback/metrics
 * Get accuracy metrics for a date range (requires authentication)
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const venueIdParam = searchParams.get('venueId');

    // Default to last 14 days if no dates provided
    const endDate = endDateParam ? parseOptionalDateQuery(endDateParam) || new Date() : new Date();
    const startDate = startDateParam
      ? parseOptionalDateQuery(startDateParam) || new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    let query = supabaseAdmin
      .from('feedback')
      .select('*')
      .gte('BinnedTimestamp', startDate.toISOString())
      .lte('BinnedTimestamp', endDate.toISOString());

    if (venueIdParam) {
      const venueId = parseInt(venueIdParam, 10);
      if (!isNaN(venueId)) {
        query = query.eq('VenueId', venueId);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get accuracy metrics error:', error);
      return internalServerError('Failed to calculate accuracy metrics');
    }

    const feedback = data || [];

    // Calculate metrics
    const totalFeedback = feedback.length;
    const accuratePredictions = feedback.filter(
      (f) =>
        (f.WasSunny && f.PredictedState === 'Sunny') ||
        (!f.WasSunny && f.PredictedState !== 'Sunny')
    ).length;
    const accuracyPercentage = totalFeedback > 0 ? (accuratePredictions / totalFeedback) * 100 : 0;
    const averageConfidence =
      feedback.length > 0
        ? feedback.reduce((sum, f) => sum + (f.ConfidenceAtPrediction || 0), 0) / feedback.length
        : 0;

    const response: AccuracyMetricsResponse = {
      totalFeedback,
      accuratePredictions,
      accuracyPercentage: Math.round(accuracyPercentage * 100) / 100,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get accuracy metrics error:', error);
    return internalServerError('An error occurred while calculating accuracy metrics');
  }
}
