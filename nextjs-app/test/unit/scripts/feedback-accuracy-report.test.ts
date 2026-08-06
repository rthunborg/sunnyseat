import { describe, expect, it, vi } from 'vitest';

import { runFeedbackAccuracyReportCli } from '@/scripts/feedback-accuracy-report';

const CURRENT_HASH = 'g1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

type SupabaseQueryResult<Row> = {
  data: Row[] | null;
  error: { message: string } | null;
};

type QueryableSupabase = Parameters<typeof runFeedbackAccuracyReportCli>[0] extends {
  supabase?: infer Supabase;
}
  ? Supabase
  : never;

function createReportSupabaseMock({
  venues = [
    {
      id: '1',
      slug: 'test-venue-sunny',
      venue_name: 'Kafé Magasinet',
      neighborhood: 'Inom Vallgraven',
      venue_geometry_inputs: [{ current_geometry_input_hash: CURRENT_HASH }],
    },
  ],
  feedback = [
    {
      venue_id: '1',
      venue_slug: 'test-venue-sunny',
      user_timestamp: '2026-08-06T12:15:00.000Z',
      predicted_state: 'Partial',
      sun_accuracy: 'not_sunny',
      sun_exposure_percent: 60,
      public_sun_verdict: 'amber',
      weather_gated: false,
      weather_unknown: false,
      geometry_input_hash: CURRENT_HASH,
    },
  ],
  venueError = null,
  feedbackError = null,
}: {
  venues?: unknown[];
  feedback?: unknown[];
  venueError?: { message: string } | null;
  feedbackError?: { message: string } | null;
} = {}) {
  const venueEq = vi.fn(async (): Promise<SupabaseQueryResult<unknown>> => ({
    data: venues,
    error: venueError,
  }));
  const venueSelect = vi.fn(() => ({ eq: venueEq }));
  const feedbackSelect = vi.fn(async (): Promise<SupabaseQueryResult<unknown>> => ({
    data: feedback,
    error: feedbackError,
  }));
  const from = vi.fn((table: string) => {
    if (table === 'venues') return { select: venueSelect };
    if (table === 'feedback') return { select: feedbackSelect };
    throw new Error(`unexpected table ${table}`);
  });

  return {
    supabase: { from } as unknown as QueryableSupabase,
    from,
    venueSelect,
    venueEq,
    feedbackSelect,
  };
}

describe('feedback accuracy report CLI', () => {
  it('queries maintainer evidence and writes deterministic JSON report output', async () => {
    const supabase = createReportSupabaseMock();
    const stdout = { write: vi.fn() };
    const stderr = { write: vi.fn() };

    const exitCode = await runFeedbackAccuracyReportCli({
      supabase: supabase.supabase,
      env: { FEEDBACK_ACCURACY_MIN_SAMPLES: '1' },
      stdout,
      stderr,
    });

    expect(exitCode).toBe(0);
    expect(stderr.write).not.toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith('venues');
    expect(supabase.from).toHaveBeenCalledWith('feedback');
    expect(supabase.venueSelect).toHaveBeenCalledWith(
      'id, slug, venue_name, neighborhood, venue_geometry_inputs(current_geometry_input_hash)',
    );
    expect(supabase.venueEq).toHaveBeenCalledWith('hidden', false);
    expect(supabase.feedbackSelect).toHaveBeenCalledWith(
      expect.stringContaining('geometry_input_hash'),
    );

    const output = stdout.write.mock.calls[0]?.[0];
    expect(typeof output).toBe('string');
    const parsed = JSON.parse(output as string) as {
      minimum_sample_count: number;
      areas: Array<{
        area: string;
        current_sample_count: number;
        disagreement_count: number;
      }>;
      venues: Array<{
        venue_id: string;
        current_sample_count: number;
        disagreement_count: number;
        representative_wrong_windows: string[];
      }>;
    };
    expect(parsed.minimum_sample_count).toBe(1);
    expect(parsed.areas).toEqual([
      {
        area: 'Inom Vallgraven',
        venue_count: 1,
        current_sample_count: 1,
        agreement_count: 0,
        disagreement_count: 1,
        agreement_rate: 0,
        disagreement_rate: 1,
        unsure_count: 0,
        legacy_unscored_count: 0,
        stale_hash_count: 0,
        invalid_evidence_count: 0,
        latest_feedback_at: '2026-08-06T12:15:00.000Z',
        latest_disagreeing_feedback_at: '2026-08-06T12:15:00.000Z',
        representative_wrong_windows: ['12:00-12:59Z'],
        venues: [
          {
            venue_id: '1',
            venue_slug: 'test-venue-sunny',
            venue_name: 'Kafé Magasinet',
            disagreement_count: 1,
          },
        ],
      },
    ]);
    expect(parsed.venues).toEqual([
      {
        venue_id: '1',
        venue_slug: 'test-venue-sunny',
        venue_name: 'Kafé Magasinet',
        area: 'Inom Vallgraven',
        current_geometry_input_hash: CURRENT_HASH,
        current_sample_count: 1,
        agreement_count: 0,
        disagreement_count: 1,
        agreement_rate: 0,
        disagreement_rate: 1,
        unsure_count: 0,
        legacy_unscored_count: 0,
        stale_hash_count: 0,
        invalid_evidence_count: 0,
        latest_feedback_at: '2026-08-06T12:15:00.000Z',
        latest_disagreeing_feedback_at: '2026-08-06T12:15:00.000Z',
        representative_wrong_windows: ['12:00-12:59Z'],
      },
    ]);
  });

  it('returns non-zero and reports query failures without writing partial output', async () => {
    const supabase = createReportSupabaseMock({
      venueError: { message: 'permission denied' },
    });
    const stdout = { write: vi.fn() };
    const stderr = { write: vi.fn() };

    const exitCode = await runFeedbackAccuracyReportCli({
      supabase: supabase.supabase,
      stdout,
      stderr,
    });

    expect(exitCode).toBe(1);
    expect(stdout.write).not.toHaveBeenCalled();
    expect(stderr.write).toHaveBeenCalledWith('venue report query failed: permission denied\n');
  });
});
