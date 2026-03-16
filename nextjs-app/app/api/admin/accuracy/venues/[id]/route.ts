import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { badRequest, internalServerError, notFound } from '@/lib/utils/api-errors';
import type { AuthUser } from '@/lib/middleware/auth';

interface VenueFeedbackEntry {
  date: string;
  predictedState: string;
  wasSunny: boolean;
  confidenceAtPrediction: number | null;
}

interface VenueAccuracyResponse {
  venueId: number;
  venueName: string;
  accuracyPercentage: number;
  totalFeedback: number;
  accurateCount: number;
  feedback: VenueFeedbackEntry[];
}

function isAccurate(predictedState: string, wasSunny: boolean): boolean {
  return (
    (wasSunny && predictedState === 'Sunny') ||
    (!wasSunny && predictedState !== 'Sunny')
  );
}

async function handleGet(
  _request: NextRequest,
  _user: AuthUser,
  ...args: unknown[]
): Promise<NextResponse> {
  try {
    const params = args[0] as { params: Promise<{ id: string }> };
    const { id } = await params.params;
    const venueId = parseInt(id, 10);
    if (isNaN(venueId)) {
      return badRequest('Invalid venue ID');
    }

    // Fetch venue name
    const { data: venue } = await supabaseAdmin
      .from('venues')
      .select('Id, Name')
      .eq('Id', venueId)
      .single();

    if (!venue) {
      return notFound('Venue');
    }

    // Fetch feedback for this venue (last 30 days)
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: feedbackData, error } = await supabaseAdmin
      .from('feedback')
      .select('*')
      .eq('VenueId', venueId)
      .gte('BinnedTimestamp', thirtyDaysAgo)
      .order('BinnedTimestamp', { ascending: false });

    if (error) {
      console.error('Venue accuracy query error:', error);
      return internalServerError('Failed to fetch venue accuracy');
    }

    const feedback = feedbackData || [];
    const totalFeedback = feedback.length;
    const accurateCount = feedback.filter((f) =>
      isAccurate(f.PredictedState, f.WasSunny)
    ).length;
    const accuracyPercentage =
      totalFeedback > 0
        ? Math.round((accurateCount / totalFeedback) * 10000) / 100
        : 0;

    const entries: VenueFeedbackEntry[] = feedback.map((f) => ({
      date: f.BinnedTimestamp,
      predictedState: f.PredictedState,
      wasSunny: f.WasSunny,
      confidenceAtPrediction: f.ConfidenceAtPrediction,
    }));

    const response: VenueAccuracyResponse = {
      venueId,
      venueName: venue.Name,
      accuracyPercentage,
      totalFeedback,
      accurateCount,
      feedback: entries,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Venue accuracy error:', error);
    return internalServerError('Failed to load venue accuracy');
  }
}

export const GET = withAdminAuth(handleGet);
