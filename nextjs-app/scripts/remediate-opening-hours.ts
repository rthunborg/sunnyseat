import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import {
  assertCompleteRemediationPopulation,
  parseRemediationRows,
  remediateOpeningHoursRows,
  type RemediationOutcome,
} from '../lib/services/opening-hours-governance';
import type { Database, Json } from '../lib/supabase/types';

const VENUE_PAGE_SIZE = 500;

const inputPath = requiredEnv('SUN_HOURS_REMEDIATION_INPUT');
const reportPath = requiredEnv('SUN_HOURS_REMEDIATION_REPORT');
const runId =
  process.env.SUN_HOURS_REMEDIATION_RUN_ID?.trim() ||
  'hours-remediation-' + randomUUID();
const startedAt = new Date();

const rows = parseRemediationRows(await readFile(inputPath, 'utf8'));
const supabase = createClient<Database>(
  requiredEnv('SUPABASE_URL'),
  requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const { data: claimed, error: claimError } = await supabase.rpc(
  'claim_hours_review_run',
  {
    p_run_id: runId,
    p_trigger_type: 'remediation',
    p_started_at: startedAt.toISOString(),
  },
);
if (claimError) {
  throw new Error('Remediation claim failed: ' + claimError.message);
}
if (!claimed) throw new Error('Another hours review run is already active');

const counts = emptyCounts();
const reportOutcomes: RemediationOutcome[] = [];
try {
  const liveVenueIds = await listLiveVenueIds();
  assertCompleteRemediationPopulation({ rows, liveVenueIds });

  const plan = await remediateOpeningHoursRows({ rows, now: startedAt });
  const outcomesByVenue = new Map(
    plan.outcomes.map((outcome) => [outcome.venueId, outcome]),
  );
  let outcomePersistenceFailed = false;

  for (const update of plan.updates) {
    const outcome = outcomesByVenue.get(update.id);
    if (!outcome) {
      throw new Error('Remediation plan omitted an outcome for venue ' + update.id);
    }
    const bounded = boundedAuditOutcome(outcome);
    const provenance = update.provenance;
    if (!update.expectedUpdatedAt) {
      throw new Error(
        'Remediation plan omitted expected updatedAt for venue ' + update.id,
      );
    }
    let applyFailed = false;
    try {
      await renewRemediationLease();
      const { data, error } = await supabase.rpc(
        'apply_hours_remediation_outcome',
        {
          p_run_id: runId,
          p_venue_id: update.id,
          p_venue_slug: outcome.venueSlug,
          p_opening_hours: update.openingHours as Json,
          p_source_type: (provenance?.sourceType ?? null) as never,
          p_source_reference: (provenance?.sourceReference ?? null) as never,
          p_review_status: update.reviewStatus,
          p_reviewed_at: (provenance?.reviewedAt ?? null) as never,
          p_next_review_at: (provenance?.nextReviewAt ?? null) as never,
          p_notes: (provenance?.notes ?? null) as never,
          p_review_reason: (update.reviewReason ?? null) as never,
          p_last_error_class: (update.lastErrorClass ?? null) as never,
          p_outcome: bounded.outcome,
          p_reason: bounded.reason,
          p_error_class: bounded.errorClass as never,
          p_expected_updated_at: update.expectedUpdatedAt,
        } as never,
      );
      applyFailed = Boolean(error) || !data;
    } catch {
      applyFailed = true;
    }

    if (applyFailed) {
      const { data: fallbackPersisted, error: fallbackError } =
        (await supabase.rpc(
          'persist_hours_review_outcome' as never,
          {
            p_run_id: runId,
            p_venue_id: update.id,
            p_venue_slug: outcome.venueSlug,
            p_outcome: 'failed',
            p_reason: 'classification_failed',
            p_error_class: 'database_error',
            p_prior_review_status: null,
            p_resulting_review_status: null,
          } as never,
        )) as { data: boolean | null; error: { message: string } | null };
      if (fallbackError || !fallbackPersisted) {
        outcomePersistenceFailed = true;
      } else {
        counts.failed += 1;
      }
      reportOutcomes.push({
        venueId: update.id,
        venueSlug: outcome.venueSlug,
        outcome: 'failed',
        reason: 'database_error',
      });
      continue;
    }

    counts[bounded.outcome] += 1;
    reportOutcomes.push(outcome);
  }

  await writeRemediationReport({
    status: 'provisional',
    counts,
    reportOutcomes,
  });

  if (outcomePersistenceFailed) {
    throw new Error('Remediation outcome persistence failed for one or more venues');
  }

  await renewRemediationLease();
  const finishedAt = new Date();
  const terminalStatus =
    counts.failed > 0 ? 'completed_with_failures' : 'completed';
  const { data: finished, error: finishError } = await supabase.rpc(
    'finish_hours_review_run',
    {
      p_run_id: runId,
      p_status: terminalStatus,
      p_finished_at: finishedAt.toISOString(),
      p_total_count: reportOutcomes.length,
      p_current_count: counts.current,
      p_missing_provenance_count: counts.missing_provenance,
      p_due_count: counts.due,
      p_unknown_count: counts.unknown,
      p_conflicting_count: counts.conflicting,
      p_split_count: counts.split,
      p_failed_count: counts.failed,
      p_stale_count: counts.stale,
    },
  );
  if (finishError) {
    throw new Error('Remediation finish failed: ' + finishError.message);
  }
  if (!finished) {
    throw new Error('Remediation finish rejected inconsistent counts');
  }
  await writeRemediationReport({
    status: terminalStatus,
    counts,
    reportOutcomes,
    finishedAt,
  });
} catch (error) {
  const failedAt = new Date();
  const { data: failed, error: failureError } = await supabase.rpc(
    'fail_hours_review_run',
    {
      p_run_id: runId,
      p_finished_at: failedAt.toISOString(),
    },
  );
  if (failureError || !failed) {
    const finalizerError = new Error(
      failureError
        ? 'Remediation failure finalizer rejected: ' + failureError.message
        : 'Remediation failure finalizer rejected the active run',
    );
    throw new AggregateError(
      [error, finalizerError],
      `Remediation failed: ${errorMessage(error)}; failure finalizer rejected: ${finalizerError.message}`,
    );
  }

  try {
    await writeRemediationReport({
      status: 'failed',
      counts,
      reportOutcomes,
      finishedAt: failedAt,
    });
  } catch (reportError) {
    throw new AggregateError(
      [error, reportError],
      `Remediation failed: ${errorMessage(error)}; terminal report write also failed: ${errorMessage(reportError)}`,
    );
  }
  throw error;
}

async function writeRemediationReport(input: {
  status: 'provisional' | 'completed' | 'completed_with_failures' | 'failed';
  counts: ReturnType<typeof emptyCounts>;
  reportOutcomes: RemediationOutcome[];
  finishedAt?: Date;
}): Promise<void> {
  // Deliberately bounded: no source references, schedules, provider content,
  // notes, or credentials are copied from the input.
  await writeFile(
    reportPath,
    JSON.stringify(
      {
        runId,
        status: input.status,
        ...(input.finishedAt
          ? { finishedAt: input.finishedAt.toISOString() }
          : {}),
        total: input.reportOutcomes.length,
        counts: input.counts,
        outcomes: input.reportOutcomes.map(
          ({ venueId, venueSlug, outcome, reason }) => ({
            venueId,
            venueSlug,
            outcome,
            reason,
          }),
        ),
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );
}

function boundedAuditOutcome(outcome: RemediationOutcome): {
  outcome: keyof ReturnType<typeof emptyCounts>;
  reason:
    | 'review_current'
    | 'hours_unknown'
    | 'unsupported_split'
    | 'unsupported_24_7'
    | 'unsupported_seasonal'
    | 'unsupported_holiday_specific'
    | 'classification_failed';
  errorClass: 'validation_failed' | null;
} {
  if (outcome.outcome === 'retained') {
    return { outcome: 'current', reason: 'review_current', errorClass: null };
  }
  if (outcome.outcome === 'unknown') {
    return { outcome: 'unknown', reason: 'hours_unknown', errorClass: null };
  }
  if (outcome.outcome === 'manual_review') {
    if (outcome.reason === 'split') {
      return { outcome: 'split', reason: 'unsupported_split', errorClass: null };
    }
    const reason = {
      unsupported_24_7: 'unsupported_24_7',
      seasonal: 'unsupported_seasonal',
      holiday_specific: 'unsupported_holiday_specific',
    }[outcome.reason];
    if (reason) {
      return {
        outcome: 'failed',
        reason: reason as
          | 'unsupported_24_7'
          | 'unsupported_seasonal'
          | 'unsupported_holiday_specific',
        errorClass: 'validation_failed',
      };
    }
  }
  return {
    outcome: 'failed',
    reason: 'classification_failed',
    errorClass: 'validation_failed',
  };
}

function emptyCounts() {
  return {
    current: 0,
    missing_provenance: 0,
    due: 0,
    unknown: 0,
    conflicting: 0,
    split: 0,
    failed: 0,
    stale: 0,
  };
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error('Missing required environment variable: ' + name);
  return value;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function listLiveVenueIds(): Promise<string[]> {
  const ids: string[] = [];
  let lastId: string | undefined;
  for (;;) {
    let query = supabase
      .from('venues')
      .select('id')
      .order('id')
      .limit(VENUE_PAGE_SIZE);
    if (lastId !== undefined) {
      query = query.gt('id', lastId);
    }
    const { data, error } = await query;
    if (error) {
      throw new Error(
        'Remediation venue population read failed: ' + error.message,
      );
    }
    const page = data ?? [];
    ids.push(...page.map((row) => row.id));
    if (page.length < VENUE_PAGE_SIZE) break;
    lastId = page.at(-1)?.id;
    if (lastId === undefined) {
      throw new Error('Remediation venue pagination returned an invalid page');
    }
  }
  return ids;
}

async function renewRemediationLease(): Promise<void> {
  const { data, error } = await supabase.rpc('renew_hours_review_run_lease', {
    p_run_id: runId,
  });
  if (error || !data) {
    throw new Error('Remediation run lease is no longer active');
  }
}
