import { appendFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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
type HoursClient = SupabaseClient<Database>;

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
      const claimArgs = {
        p_run_id: runId,
        p_trigger_type: triggerType,
        p_started_at: now.toISOString(),
      };
      const claim = await callBooleanRpcWithRetry(
        supabase,
        'claim_hours_review_run',
        claimArgs,
      );
      if (claim.data) return { claimed: true as const, runId };

      const sameRunActive = await isHoursReviewRunActive(supabase, {
        runId,
        triggerType,
      });
      if (sameRunActive) {
        return { claimed: true as const, runId };
      }
      if (claim.error) {
        throw new Error('Run claim failed: ' + claim.error.message);
      }

      const { data: activeRun, error: activeError } = await supabase
        .from('hours_review_runs')
        .select('id')
        .eq('status', 'running')
        .limit(1)
        .maybeSingle();
      if (activeError) {
        throw new Error('Active run lookup failed: ' + activeError.message);
      }
      if (!activeRun?.id) {
        throw new Error('Run claim was rejected but no active run was found');
      }
      return {
        claimed: false as const,
        activeRunId: activeRun.id,
      };
    },
    renewLease: async () => {
      await renewAuditLease(supabase);
    },
    listVenues: async () => {
      const rows: AuditVenueRow[] = [];
      let lastId: string | undefined;
      for (;;) {
        await renewAuditLease(supabase);
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
          row.hours_review_status === 'failed' ||
          row.hours_review_status === 'manual_review';
        return {
          id: row.id,
          slug: row.slug,
          openingHours: row.opening_hours,
          provenance:
            hasExplicitSource || preservesExplicitReviewState
              ? {
                  sourceType: row.hours_source_type ?? undefined,
                  sourceReference: row.hours_source_reference ?? undefined,
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
      const record = {
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
      };
      const persisted = await callBooleanRpcWithRetry(
        supabase,
        'persist_hours_review_outcome',
        record,
      );
      if (persisted.data) return;

      const { data: stored, error: readError } = await supabase
        .from('hours_review_outcomes')
        .select(
          'venue_slug, outcome, reason, error_class, prior_review_status, resulting_review_status',
        )
        .eq('run_id', record.p_run_id)
        .eq('venue_id', record.p_venue_id)
        .maybeSingle();
      if (readError) {
        throw new Error('Outcome reconciliation failed: ' + readError.message);
      }
      if (
        stored &&
        stored.venue_slug === record.p_venue_slug &&
        stored.outcome === record.p_outcome &&
        stored.reason === record.p_reason &&
        stored.error_class === record.p_error_class &&
        stored.prior_review_status === record.p_prior_review_status &&
        stored.resulting_review_status === record.p_resulting_review_status
      ) {
        return;
      }
      if (persisted.error) {
        throw new Error('Outcome write failed: ' + persisted.error.message);
      }
      throw new Error('Outcome write rejected inactive audit run');
    },
    recordPersistenceFailure: async (failure) => {
      const recorded = await callBooleanRpcWithRetry(
        supabase,
        'record_hours_review_persistence_failure',
        {
          p_run_id: String(failure.runId),
          p_venue_id:
            typeof failure.venueId === 'string' ? failure.venueId : null,
          p_venue_slug:
            typeof failure.venueSlug === 'string' ? failure.venueSlug : null,
        },
      );
      if (recorded.data) return;
      if (recorded.error) {
        throw new Error(
          'Outcome persistence-failure marker rejected: ' +
            recorded.error.message,
        );
      }
      throw new Error(
        'Outcome persistence-failure marker rejected inactive audit run',
      );
    },
    finishRun: async (summary) => {
      const counts = summary.counts as Record<string, number>;
      const finishArgs = {
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
      };
      const finished = await callBooleanRpcWithRetry(
        supabase,
        'finish_hours_review_run',
        finishArgs,
      );
      if (finished.data) return;
      const { data: stored, error: readError } = await supabase
        .from('hours_review_runs')
        .select(
          'status, total_count, current_count, missing_provenance_count, due_count, unknown_count, conflicting_count, split_count, failed_count, stale_count',
        )
        .eq('id', runId)
        .maybeSingle();
      if (readError) {
        throw new Error('Run finish reconciliation failed: ' + readError.message);
      }
      if (
        stored &&
        stored.status === finishArgs.p_status &&
        stored.total_count === finishArgs.p_total_count &&
        stored.current_count === finishArgs.p_current_count &&
        stored.missing_provenance_count === finishArgs.p_missing_provenance_count &&
        stored.due_count === finishArgs.p_due_count &&
        stored.unknown_count === finishArgs.p_unknown_count &&
        stored.conflicting_count === finishArgs.p_conflicting_count &&
        stored.split_count === finishArgs.p_split_count &&
        stored.failed_count === finishArgs.p_failed_count &&
        stored.stale_count === finishArgs.p_stale_count
      ) {
        return;
      }
      if (finished.error) {
        throw new Error('Run finish failed: ' + finished.error.message);
      }
      throw new Error('Run finish did not update the active run');
    },
    failRun: async (summary) => {
      const failed = await callBooleanRpcWithRetry(
        supabase,
        'fail_hours_review_run',
        {
        p_run_id: runId,
        p_finished_at: (summary.finishedAt as Date).toISOString(),
        },
      );
      if (failed.data) return;
      const { data: stored, error: readError } = await supabase
        .from('hours_review_runs')
        .select('status')
        .eq('id', runId)
        .maybeSingle();
      if (readError) {
        throw new Error(
          'Run failure reconciliation failed: ' + readError.message,
        );
      }
      if (stored?.status === 'failed') return;
      if (failed.error) {
        throw new Error(
          'Run failure finalization failed: ' + failed.error.message,
        );
      }
      throw new Error('Run failure finalizer did not update the active run');
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

const counts = result.counts;
const inspectableRunId =
  result.status === 'already_running' ? result.activeRunId : result.runId;
const countSummaryLines = result.counts
  ? [
      '- Total: ' + sumCounts(result.counts),
      '- Current: ' + result.counts.current,
      '- Missing provenance: ' + result.counts.missing_provenance,
      '- Due: ' + result.counts.due,
      '- Unknown: ' + result.counts.unknown,
      '- Conflicting: ' + result.counts.conflicting,
      '- Split: ' + result.counts.split,
      '- Failed: ' + result.counts.failed,
      '- Stale: ' + result.counts.stale,
    ]
  : [];
try {
  await writeSummary([
    '## SunnySeat hours review audit',
    '',
    '- Status: ' + result.status,
    ...(inspectableRunId ? ['- Audit run: ' + inspectableRunId] : []),
    ...(result.status === 'already_running'
      ? ['- Attempted audit run: ' + runId]
      : []),
    ...workflowSummaryLine(),
    ...countSummaryLines,
    ...(result.maintenanceWarning
      ? ['- Maintenance warning: ' + result.maintenanceWarning]
      : []),
  ]);
} catch (summaryError) {
  console.error(
    'Database audit completed, but the bounded GitHub summary could not be published',
    errorMessage(summaryError),
  );
}
console.log(
  JSON.stringify({
    status: result.status,
    runId: inspectableRunId,
    attemptedRunId: result.status === 'already_running' ? runId : undefined,
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

type RpcError = {
  message: string;
  code?: string;
};

async function callBooleanRpcWithRetry(
  client: HoursClient,
  functionName: string,
  args: Record<string, unknown>,
): Promise<{ data: boolean | null; error: RpcError | null }> {
  let last: { data: boolean | null; error: RpcError | null } = {
    data: null,
    error: null,
  };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      last = (await client.rpc(
        functionName as never,
        args as never,
      )) as typeof last;
    } catch (error) {
      if (attempt === 0 && isRetryableRpcError(error)) {
        await retryBackoff();
        continue;
      }
      throw error;
    }
    if (last.data) return last;
    if (!last.error) return last;
    if (attempt === 0 && isRetryableRpcError(last.error)) {
      await retryBackoff();
      continue;
    }
    return last;
  }
  return last;
}

async function renewAuditLease(client: HoursClient): Promise<void> {
  const renewed = await callBooleanRpcWithRetry(
    client,
    'renew_hours_review_run_lease',
    { p_run_id: runId },
  );
  if (renewed.data) return;
  if (await isHoursReviewRunActive(client, { runId, triggerType })) return;
  if (renewed.error) {
    throw new Error('Audit lease renewal failed: ' + renewed.error.message);
  }
  throw new Error('Audit run lease is no longer active');
}

async function isHoursReviewRunActive(
  client: HoursClient,
  input: { runId: string; triggerType: string },
): Promise<boolean> {
  const result = await callBooleanRpcWithRetry(
    client,
    'is_hours_review_run_active',
    {
      p_run_id: input.runId,
      p_expected_trigger_type: input.triggerType,
      p_remediation_input_fingerprint: null,
      p_remediation_claim_identity: null,
    },
  );
  if (result.error) {
    throw new Error(
      'Audit active-state reconciliation failed: ' + result.error.message,
    );
  }
  return result.data === true;
}

function isRetryableRpcError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : '';
  return new Set([
    '08000',
    '08003',
    '08006',
    '40001',
    '40P01',
    '55P03',
    '57014',
  ]).has(code);
}

async function retryBackoff(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 50));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
