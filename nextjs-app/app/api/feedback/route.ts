import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { badRequest, internalServerError } from '@/lib/utils/api-errors';
import type { SubmitFeedbackRequest, FeedbackResponse } from '@/lib/types/api';
import { validateRequiredString } from '@/lib/utils/validation';

/**
 * POST /api/feedback
 * Submit user feedback on sun prediction accuracy
 */
export async function POST(request: NextRequest) {
  try {
    const body: SubmitFeedbackRequest = await request.json();

    // Validate required fields
    if (!body.venueId) {
      return badRequest('Venue ID is required');
    }

    const stateValidation = validateRequiredString(body.predictedState, 'predictedState');
    if (!stateValidation.success) {
      return badRequest(stateValidation.error);
    }

    // Validate predicted state
    const validStates = ['Sunny', 'Partial', 'Shaded'];
    if (!validStates.includes(body.predictedState)) {
      return badRequest(`Predicted state must be one of: ${validStates.join(', ')}`);
    }

    // Get IP address from request
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Calculate binned timestamp (round to nearest 10 minutes)
    const userTimestamp = new Date(body.userTimestamp);
    const binnedTimestamp = new Date(
      Math.round(userTimestamp.getTime() / (10 * 60 * 1000)) * (10 * 60 * 1000)
    );

    // Insert feedback
    const { data, error } = await supabaseAdmin
      .from('feedback')
      .insert({
        VenueId: body.venueId,
        UserTimestamp: userTimestamp.toISOString(),
        BinnedTimestamp: binnedTimestamp.toISOString(),
        PredictedState: body.predictedState,
        WasSunny: body.wasSunny,
        ConfidenceAtPrediction: body.confidenceAtPrediction,
        IpAddress: ipAddress,
      })
      .select()
      .single();

    if (error) {
      console.error('Feedback insert error:', error);
      return internalServerError('Failed to submit feedback');
    }

    const response: FeedbackResponse = {
      id: data.Id,
      venueId: data.VenueId,
      userTimestamp: data.UserTimestamp,
      predictedState: data.PredictedState,
      wasSunny: data.WasSunny,
      confidenceAtPrediction: data.ConfidenceAtPrediction,
      createdAt: data.CreatedAt,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Submit feedback error:', error);
    return internalServerError('An error occurred while submitting feedback');
  }
}

/**
 * GET /api/feedback
 * Query feedback data with optional filters (requires authentication)
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Verify authentication token
    // For now, this is a placeholder - authentication middleware will be added

    const searchParams = request.nextUrl.searchParams;
    const venueId = searchParams.get('venueId')
      ? parseInt(searchParams.get('venueId')!, 10)
      : undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = supabaseAdmin.from('feedback').select('*');

    if (venueId) {
      query = query.eq('VenueId', venueId);
    }
    if (startDate) {
      query = query.gte('BinnedTimestamp', startDate);
    }
    if (endDate) {
      query = query.lte('BinnedTimestamp', endDate);
    }

    query = query.order('BinnedTimestamp', { ascending: false }).range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Get feedback error:', error);
      return internalServerError('Failed to retrieve feedback');
    }

    const feedback: FeedbackResponse[] = (data || []).map((item) => ({
      id: item.Id,
      venueId: item.VenueId,
      userTimestamp: item.UserTimestamp,
      predictedState: item.PredictedState,
      wasSunny: item.WasSunny,
      confidenceAtPrediction: item.ConfidenceAtPrediction,
      createdAt: item.CreatedAt,
    }));

    return NextResponse.json(feedback);
  } catch (error) {
    console.error('Get feedback error:', error);
    return internalServerError('An error occurred while retrieving feedback');
  }
}
