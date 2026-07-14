import { appendFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { runOpeningHoursAudit } from '../lib/services/opening-hours-audit';
import type { Database, Json } from '../lib/supabase/types';
import type { WeeklyOpeningHours } from '../lib/types/api';

const enabled = process.env.SUN_HOURS_AUDIT_ENABLED === 'true';
const now = new Date();

if (!enabled) {
  await writeSummary([
    '## SunnySeat hours review audit',
    '',
    '- Status: disabled by SUN_HOURS_AUDIT_ENABLED',
  ]);
  console.log('Hours review audit disabled');
  process.exit(0);
}

const url = requiredEnv('SUPABASE_URL');
const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient<Database>(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const triggerType =
  process.env.GITHUB_EVENT_NAME === 'workflow_dispatch' ? 'manual' : 'scheduled';
const runId = [
  'hours-review',
  process.env.GITHUB_RUN_ID ?? randomUUID(),
  process.env.GITHUB_RUN_ATTEMPT ?? '1',
].join('-');

const result = await runOpeningHoursAudit({
  enabled: true,
  now,
  repositories: {
    claimRun: async () => {
      const { data, error } = await supabase.rpc('claim_hours_review_run', {
        p_run_id: runId,
        p_trigger_type: triggerType,
        p_started_at: now.toISOString(),
      });
      if (error) throw new Error('Run claim failed: ' + error.message);
      if (data) return { claimed: true as const, runId };
      const { data: active } = await supabase
        .from('hours_review_runs')
        .select('id')
        .eq('status', 'running')
        .maybeSingle();
      return {
        claimed: false as const,
        ...(active?.id ? { activeRunId: active.id } : {}),
      };
    },
    listVenues: async () => {
      const { data, error } = await supabase
        .from('venues')
        .select(
          'id, slug, opening_hours, hours_review_status, hours_reviewed_at, hours_next_review_at, hours_source_type, hours_source_reference, hours_notes',
        )
        .order('id');
      if (error) throw new Error('Venue read failed: ' + error.message);
      return (data ?? []).map((row) => ({
        id: row.id,
        slug: row.slug,
        openingHours: asOpeningHours(row.opening_hours),
        provenance:
          row.hours_source_type && row.hours_source_reference
            ? {
                reviewStatus: row.hours_review_status ?? undefined,
                reviewedAt: row.hours_reviewed_at ?? undefined,
                nextReviewAt: row.hours_next_review_at ?? undefined,
                ...reviewFlags(row.hours_notes),
              }
            : null,
      }));
    },
    recordOutcome: async (outcome) => {
      const { error } = await supabase.from('hours_review_outcomes').upsert(
        {
          run_id: String(outcome.runId),
          venue_id: String(outcome.venueId),
          venue_slug: String(outcome.venueSlug),
          outcome: String(outcome.outcome),
          reason: String(outcome.reason),
          error_class:
            typeof outcome.errorClass === 'string' ? outcome.errorClass : null,
        },
        { onConflict: 'run_id,venue_id' },
      );
      if (error) throw new Error('Outcome write failed: ' + error.message);
    },
    finishRun: async (summary) => {
      const counts = summary.counts as Record<string, number>;
      const { data, error } = await supabase.rpc('finish_hours_review_run', {
        p_run_id: runId,
        p_status: String(summary.status),
        p_finished_at: now.toISOString(),
        p_total_count: Number(summary.totalCount),
        p_current_count: counts.current ?? 0,
        p_missing_provenance_count: counts.missing_provenance ?? 0,
        p_due_count: counts.due ?? 0,
        p_unknown_count: counts.unknown ?? 0,
        p_conflicting_count: counts.conflicting ?? 0,
        p_split_count: counts.split ?? 0,
        p_failed_count: counts.failed ?? 0,
        p_stale_count: counts.stale ?? 0,
      });
      if (error) throw new Error('Run finish failed: ' + error.message);
      if (!data) throw new Error('Run finish did not update the active run');
    },
    pruneBefore: async (cutoff) => {
      const { error } = await supabase.rpc('prune_hours_review_history', {
        p_cutoff: cutoff.toISOString(),
      });
      if (error) throw new Error('History pruning failed: ' + error.message);
    },
  },
});

const counts: Record<string, number> = result.counts ?? {};
await writeSummary([
  '## SunnySeat hours review audit',
  '',
  '- Status: ' + result.status,
  '- Run: ' + (result.runId ?? result.activeRunId ?? 'none'),
  '- Total: ' + sumCounts(counts),
  '- Current: ' + (counts.current ?? 0),
  '- Missing provenance: ' + (counts.missing_provenance ?? 0),
  '- Due: ' + (counts.due ?? 0),
  '- Unknown: ' + (counts.unknown ?? 0),
  '- Conflicting: ' + (counts.conflicting ?? 0),
  '- Split: ' + (counts.split ?? 0),
  '- Failed: ' + (counts.failed ?? 0),
  '- Stale: ' + (counts.stale ?? 0),
]);
console.log(
  JSON.stringify({
    status: result.status,
    runId: result.runId ?? result.activeRunId,
    counts,
  }),
);

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error('Missing required environment variable: ' + name);
  return value;
}

function asOpeningHours(value: Json | null): WeeklyOpeningHours | null {
  return value === null ? null : (value as WeeklyOpeningHours);
}

function reviewFlags(notes: string | null): {
  conflict?: boolean;
  reason?: string;
  lastErrorClass?: string;
} {
  if (!notes) return {};
  if (notes === 'review-reason:split') return { reason: 'split' };
  if (notes === 'review-reason:conflict') return { conflict: true };
  if (notes.startsWith('review-error:')) {
    return { lastErrorClass: notes.slice('review-error:'.length) };
  }
  return {};
}

function sumCounts(counts: Record<string, number>): number {
  return Object.values(counts).reduce((total, value) => total + value, 0);
}

async function writeSummary(lines: string[]): Promise<void> {
  const target = process.env.GITHUB_STEP_SUMMARY;
  if (!target) return;
  await appendFile(target, lines.join('\n') + '\n', 'utf8');
}
