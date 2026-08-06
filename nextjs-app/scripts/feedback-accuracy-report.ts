import {
  buildFeedbackAccuracyReport,
  type FeedbackAccuracyFeedbackRow,
} from '@/lib/services/feedback-accuracy-report';
import { getSupabaseServiceRole } from '@/lib/supabase/server';

/**
 * Maintainer report contract:
 * - score only complete evidence where geometry_input_hash matches the venue's current_geometry_input_hash
 * - emit disagreement_count, latest_feedback_at, invalid_evidence_count, stale_hash_count,
 *   legacy_unscored_count, and unsure_count beside agreement_rate / disagreement_rate
 * - keep missing evidence and legacy rows in legacy_unscored_count, not in agreement_rate
 * - keep stale hashes in stale_hash_count and sunAccuracy === 'unsure' rows in unsure_count,
 *   not in agreement_rate
 * - use the shared public sunny predicate semantics: sunExposurePercent > 50 is amber unless
 *   weather_gated / weather_unknown forces the public verdict grey
 * - representative vectors: Partial 40 => grey/not_sunny, Partial 60 => amber/sunny, 50 => grey/not_sunny
 * - compare publicSunVerdict / public_sun_verdict with feedback, not raw predicted_state directly to sun_accuracy
 */
type VenueReportQueryRow = {
  id: string;
  slug: string;
  venue_name: string;
  neighborhood: string;
  venue_geometry_inputs:
    | { current_geometry_input_hash: string | null }
    | { current_geometry_input_hash: string | null }[]
    | null;
};

async function main() {
  const supabase = getSupabaseServiceRole();
  const [{ data: venues, error: venueError }, { data: feedback, error: feedbackError }] =
    await Promise.all([
      supabase
        .from('venues')
        .select('id, slug, venue_name, neighborhood, venue_geometry_inputs(current_geometry_input_hash)')
        .eq('hidden', false),
      supabase
        .from('feedback')
        .select([
          'venue_id',
          'venue_slug',
          'user_timestamp',
          'predicted_state',
          'sun_accuracy',
          'sun_exposure_percent',
          'public_sun_verdict',
          'weather_gated',
          'weather_unknown',
          'geometry_input_hash',
        ].join(', ')),
    ]);

  if (venueError) throw new Error(`venue report query failed: ${venueError.message}`);
  if (feedbackError) throw new Error(`feedback report query failed: ${feedbackError.message}`);

  const venueRows = (venues ?? []) as unknown as VenueReportQueryRow[];
  const feedbackRows = (feedback ?? []) as unknown as FeedbackAccuracyFeedbackRow[];

  const report = buildFeedbackAccuracyReport({
    venues: venueRows.map((row) => {
      const geometryInput = Array.isArray(row.venue_geometry_inputs)
        ? row.venue_geometry_inputs[0]
        : row.venue_geometry_inputs;
      return {
        venue_id: row.id,
        venue_slug: row.slug,
        venue_name: row.venue_name,
        area: row.neighborhood,
        current_geometry_input_hash: geometryInput?.current_geometry_input_hash ?? null,
      };
    }),
    feedback: feedbackRows,
    minimumSampleCount: Number.parseInt(process.env.FEEDBACK_ACCURACY_MIN_SAMPLES ?? '3', 10),
  });

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
