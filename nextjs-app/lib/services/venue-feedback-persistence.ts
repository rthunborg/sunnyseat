import type { FeedbackResponse } from '@/lib/types/api';

type FeedbackInsertRow = {
  venue_id: string;
  venue_slug: string;
  user_timestamp: string;
  predicted_state: string;
  sun_accuracy?: string;
  confidence_at_prediction?: number;
  was_sunny?: boolean;
  outdoor_seating_confirmed?: boolean;
  note?: string;
};

type FeedbackInsertResult = {
  id?: string | null;
  created_at?: string | null;
};

const memoryFeedbackSubmissions: FeedbackResponse[] = [];

export async function persistVenueFeedback(
  feedback: FeedbackResponse,
): Promise<FeedbackResponse> {
  if (!usesSupabaseFeedbackPersistence()) {
    memoryFeedbackSubmissions.push(feedback);
    return feedback;
  }

  if (!hasSupabaseServiceRoleConfig()) {
    throw new Error('Feedback persistence is configured for Supabase but credentials are incomplete');
  }

  const { getSupabaseServiceRole } = await import('@/lib/supabase/server');
  const { data, error } = await getSupabaseServiceRole()
    .from('feedback')
    .insert(toFeedbackInsertRow(feedback))
    .select('id, created_at')
    .single();

  if (error) {
    throw new Error(`Feedback persistence failed: ${error.message}`);
  }

  const row = data as FeedbackInsertResult | null;
  return {
    ...feedback,
    id: row?.id ?? feedback.id,
    createdAt: row?.created_at ?? feedback.createdAt,
  };
}

export function clearPersistedVenueFeedbackForTests() {
  memoryFeedbackSubmissions.length = 0;
}

export function getPersistedVenueFeedbackForTests(): FeedbackResponse[] {
  return [...memoryFeedbackSubmissions];
}

function usesSupabaseFeedbackPersistence(): boolean {
  return process.env.SUNNYSEAT_FEEDBACK_PERSISTENCE === 'supabase';
}

function hasSupabaseServiceRoleConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function toFeedbackInsertRow(feedback: FeedbackResponse): FeedbackInsertRow {
  const wasSunny = feedback.wasSunny ?? wasSunnyFromSunAccuracy(feedback.sunAccuracy);
  return {
    venue_id: feedback.venueId,
    venue_slug: feedback.venueSlug,
    user_timestamp: feedback.userTimestamp,
    predicted_state: feedback.predictedState,
    ...(feedback.sunAccuracy ? { sun_accuracy: feedback.sunAccuracy } : {}),
    ...(feedback.confidenceAtPrediction !== undefined
      ? { confidence_at_prediction: feedback.confidenceAtPrediction }
      : {}),
    ...(wasSunny !== undefined ? { was_sunny: wasSunny } : {}),
    ...(feedback.outdoorSeatingConfirmed !== undefined
      ? { outdoor_seating_confirmed: feedback.outdoorSeatingConfirmed }
      : {}),
    ...(feedback.note ? { note: feedback.note } : {}),
  };
}

function wasSunnyFromSunAccuracy(
  sunAccuracy: FeedbackResponse['sunAccuracy'],
): boolean | undefined {
  if (sunAccuracy === 'sunny') return true;
  if (sunAccuracy === 'not_sunny') return false;
  return undefined;
}
