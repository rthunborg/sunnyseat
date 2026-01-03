import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { notFound, internalServerError, badRequest } from '@/lib/utils/api-errors';
import { requireAuth } from '@/lib/middleware/auth';
import type { FeedbackResponse } from '@/lib/types/api';

/**
 * GET /api/feedback/[id]
 * Get a specific feedback entry by ID (requires authentication)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Require authentication
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return badRequest('Invalid feedback ID');
    }

    const { data, error } = await supabaseAdmin.from('feedback').select('*').eq('Id', id).single();

    if (error || !data) {
      return notFound('Feedback');
    }

    const response: FeedbackResponse = {
      id: data.Id,
      patioId: data.PatioId,
      venueId: data.VenueId,
      userTimestamp: data.UserTimestamp,
      predictedState: data.PredictedState,
      wasSunny: data.WasSunny,
      confidenceAtPrediction: data.ConfidenceAtPrediction,
      createdAt: data.CreatedAt,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get feedback by ID error:', error);
    return internalServerError('An error occurred while retrieving feedback');
  }
}
