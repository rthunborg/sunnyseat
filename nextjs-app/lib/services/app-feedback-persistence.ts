import type { AppFeedbackResponse } from '@/lib/types/api';

type AppFeedbackInsertRow = {
  rating: number;
  comment?: string;
  locale?: string;
};

type AppFeedbackInsertResult = {
  id?: string | null;
  created_at?: string | null;
};

const memoryAppFeedbackSubmissions: AppFeedbackResponse[] = [];

/**
 * Persist a general app-feedback submission (star rating + optional comment).
 *
 * Mirrors {@link persistVenueFeedback}: env-gated between an in-memory sink (dev
 * / test / fixture mode) and the Supabase `app_feedback` write-only sink, which
 * only the server service_role may touch. Reuses the same
 * `SUNNYSEAT_FEEDBACK_PERSISTENCE=supabase` flag as the venue feedback path.
 */
export async function persistAppFeedback(
  feedback: AppFeedbackResponse,
): Promise<AppFeedbackResponse> {
  if (!usesSupabaseFeedbackPersistence()) {
    memoryAppFeedbackSubmissions.push(feedback);
    return feedback;
  }

  if (!hasSupabaseServiceRoleConfig()) {
    throw new Error(
      'App feedback persistence is configured for Supabase but credentials are incomplete',
    );
  }

  const { getSupabaseServiceRole } = await import('@/lib/supabase/server');
  const { data, error } = await getSupabaseServiceRole()
    .from('app_feedback')
    .insert(toAppFeedbackInsertRow(feedback))
    .select('id, created_at')
    .single();

  if (error) {
    throw new Error(`App feedback persistence failed: ${error.message}`);
  }

  const row = data as AppFeedbackInsertResult | null;
  return {
    ...feedback,
    id: row?.id ?? feedback.id,
    createdAt: row?.created_at ?? feedback.createdAt,
  };
}

export function clearPersistedAppFeedbackForTests() {
  memoryAppFeedbackSubmissions.length = 0;
}

export function getPersistedAppFeedbackForTests(): AppFeedbackResponse[] {
  return [...memoryAppFeedbackSubmissions];
}

function usesSupabaseFeedbackPersistence(): boolean {
  return process.env.SUNNYSEAT_FEEDBACK_PERSISTENCE === 'supabase';
}

function hasSupabaseServiceRoleConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function toAppFeedbackInsertRow(feedback: AppFeedbackResponse): AppFeedbackInsertRow {
  return {
    rating: feedback.rating,
    ...(feedback.comment ? { comment: feedback.comment } : {}),
    ...(feedback.locale ? { locale: feedback.locale } : {}),
  };
}
