import { appendFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { runOpeningHoursAudit } from '../lib/services/opening-hours-audit';
import type { Database } from '../lib/supabase/types';

const VENUE_PAGE_SIZE = 500;
type AuditVenueRow = Pick<
  Database['public']['Tables']['venues']['Row'],
  | 'id'
  | 'slug'
  | 'opening_hours'
  | 'hours_review_status'
  | 'hours_reviewed_at'
  | 'hours_next_review_at'
  | 'hours_source_type'
  | 'hours_source_reference'
  | 'hours_review_reason'
  | 'hours_last_error_class'
>;

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

const runId = [
  'hours-review',
  process.env.GITHUB_RUN_ID ?? randomUUID(),
  process.env.GITHUB_RUN_ATTEMPT ?? '1',
].join('-');
const triggerType =
  process.env.GITHUB_EVENT_NAME === 'workflow_dispatch' ? 'manual' : 'scheduled';

let result: Awaited<ReturnType<typeof runOpeningHoursAudit>>;
try {
  const supabase = createClient<Database>(
    requiredEnv('SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  result = await runOpeningHoursAudit({
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
      const { data: active, error: activeError } = await supabase
        .from('hours_review_runs')
        .select('id')
        .eq('status', 'running')
        .limit(1)
        .maybeSingle();
      if (activeError) {
        throw new Error('Active run lookup failed: ' + activeError.message);
      }
      if (!active?.id) {
        throw new Error('Run claim was rejected but no active run was found');
      }
      return {
        claimed: false as const,
        activeRunId: active.id,
      };
    },
    listVenues: async () => {
      const rows: AuditVenueRow[] = [];
      let lastId: string | undefined;
      for (;;) {
        let query = supabase
          .from('venues')
          .select(
            'id, slug, opening_hours, hours_review_status, hours_reviewed_at, hours_next_review_at, hours_source_type, hours_source_reference, hours_review_reason, hours_last_error_class',
          )
          .order('id')
          .limit(VENUE_PAGE_SIZE);
        if (lastId !== undefined) {
          query = query.gt('id', lastId);
        }
        const { data, error } = await query;
        if (error) throw new Error('Venue read failed: ' + error.message);
        const page = data ?? [];
        rows.push(...page);
        if (page.length < VENUE_PAGE_SIZE) break;
        lastId = page.at(-1)?.id;
        if (lastId === undefined) {
          throw new Error('Venue keyset pagination returned an invalid page');
        }
      }
      return rows.map((row) => {
        const hasExplicitSource = Boolean(
          row.hours_source_type && row.hours_source_reference,
        );
        const preservesExplicitReviewState =
          row.hours_review_status === 'unknown' ||
          row.hours_review_status === 'failed';
        return {
          id: row.id,
          slug: row.slug,
          openingHours: row.opening_hours,
          provenance:
            hasExplicitSource || preservesExplicitReviewState
              ? {
                  reviewStatus: row.hours_review_status ?? undefined,
                  reviewedAt: row.hours_reviewed_at ?? undefined,
                  nextReviewAt: row.hours_next_review_at ?? undefined,
                  reviewReason: row.hours_review_reason ?? undefined,
                  lastErrorClass: row.hours_last_error_class ?? undefined,
                }
              : null,
        };
      });
    },
    recordOutcome: async (outcome) => {
      const { data, error } = (await supabase.rpc(
        'persist_hours_review_outcome' as never,
        {
          p_run_id: String(outcome.runId),
          p_venue_id: String(outcome.venueId),
          p_venue_slug: String(outcome.venueSlug),
          p_outcome: String(outcome.outcome),
          p_reason: String(outcome.reason),
          p_error_class:
            typeof outcome.errorClass === 'string' ? outcome.errorClass : null,
          p_prior_review_status:
            typeof outcome.priorReviewStatus === 'string'
              ? outcome.priorReviewStatus
              : null,
          p_resulting_review_status:
            typeof outcome.resultingReviewStatus === 'string'
              ? outcome.resultingReviewStatus
              : null,
        } as never,
      )) as { data: boolean | null; error: { message: string } | null };
      if (error) throw new Error('Outcome write failed: ' + error.message);
      if (!data) throw new Error('Outcome write rejected inactive audit run');
    },
    finishRun: async (summary) => {
      const counts = summary.counts as Record<string, number>;
      const { data, error } = await supabase.rpc('finish_hours_review_run', {
        p_run_id: runId,
        p_status: String(summary.status),
        p_finished_at: (summary.finishedAt as Date).toISOString(),
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
    failRun: async (summary) => {
      const { data, error } = await supabase.rpc('fail_hours_review_run', {
        p_run_id: runId,
        p_finished_at: (summary.finishedAt as Date).toISOString(),
      });
      if (error) throw new Error('Run failure finalization failed: ' + error.message);
      if (!data) throw new Error('Run failure finalizer did not update the active run');
    },
    pruneBefore: async (cutoff) => {
      const { error } = await supabase.rpc('prune_hours_review_history', {
        p_cutoff: cutoff.toISOString(),
      });
      if (error) throw new Error('History pruning failed: ' + error.message);
    },
    },
  });
} catch (error) {
  await writeSummary([
    '## SunnySeat hours review audit',
    '',
    '- Status: failed',
    '- Audit run: ' + runId,
    ...workflowSummaryLine(),
    '- Error class: audit_failed',
  ]).catch((summaryError: unknown) => {
    console.error('Failed to write bounded audit failure summary', summaryError);
  });
  throw error;
}

const counts: Record<string, number> = result.counts ?? {};
await writeSummary([
  '## SunnySeat hours review audit',
  '',
  '- Status: ' + result.status,
  '- Audit run: ' + runId,
  ...(result.activeRunId
    ? ['- Active audit run: ' + result.activeRunId]
    : []),
  ...workflowSummaryLine(),
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
    runId,
    activeRunId: result.activeRunId,
    counts,
  }),
);

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error('Missing required environment variable: ' + name);
  return value;
}

function sumCounts(counts: Record<string, number>): number {
  return Object.values(counts).reduce((total, value) => total + value, 0);
}

function currentGitHubRunUrl(): string | undefined {
  const server = process.env.GITHUB_SERVER_URL?.replace(/\/$/, '');
  const repository = process.env.GITHUB_REPOSITORY?.trim();
  const githubRunId = process.env.GITHUB_RUN_ID?.trim();
  if (!server || !repository || !githubRunId) return undefined;
  return `${server}/${repository}/actions/runs/${githubRunId}`;
}

function workflowSummaryLine(): string[] {
  const githubRunUrl = currentGitHubRunUrl();
  if (!githubRunUrl) return [];
  const githubRunId = process.env.GITHUB_RUN_ID?.trim() ?? 'current';
  return [`- Workflow run: [${githubRunId}](${githubRunUrl})`];
}

async function writeSummary(lines: string[]): Promise<void> {
  const target = process.env.GITHUB_STEP_SUMMARY;
  if (!target) return;
  await appendFile(target, lines.join('\n') + '\n', 'utf8');
}
