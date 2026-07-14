import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import {
  parseRemediationRows,
  remediateOpeningHoursRows,
  type RemediationOutcome,
} from '../lib/services/opening-hours-governance';
import type { Database, Json } from '../lib/supabase/types';

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
if (claimError) throw new Error('Remediation claim failed: ' + claimError.message);
if (!claimed) throw new Error('Another hours review run is already active');

try {
  const plan = await remediateOpeningHoursRows({ rows });
  const outcomesByVenue = new Map(
    plan.outcomes.map((outcome) => [outcome.venueId, outcome]),
  );
  const counts = emptyCounts();
  const reportOutcomes: RemediationOutcome[] = [];
  let outcomePersistenceFailed = false;

  for (const update of plan.updates) {
    const outcome = outcomesByVenue.get(update.id);
    if (!outcome) {
      throw new Error('Remediation plan omitted an outcome for venue ' + update.id);
    }
    const bounded = boundedAuditOutcome(outcome);
    const provenance = update.provenance;
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
        },
      );
      applyFailed = Boolean(error) || !data;
    } catch {
      applyFailed = true;
    }

    if (applyFailed) {
      const { error: fallbackError } = await supabase
        .from('hours_review_outcomes')
        .upsert(
          {
            run_id: runId,
            venue_id: update.id,
            venue_slug: outcome.venueSlug,
            outcome: 'failed',
            reason: 'classification_failed',
            error_class: 'database_error',
            prior_review_status: null,
            resulting_review_status: null,
          },
          { onConflict: 'run_id,venue_id' },
        );
      if (fallbackError) outcomePersistenceFailed = true;
      else counts.failed += 1;
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

  // The report is deliberately bounded: no source references, schedules,
  // provider content, notes, or credentials are copied from the input.
  await writeFile(
    reportPath,
    JSON.stringify(
      {
        runId,
        total: reportOutcomes.length,
        counts,
        outcomes: reportOutcomes.map(({ venueId, venueSlug, outcome, reason }) => ({
          venueId,
          venueSlug,
          outcome,
          reason,
        })),
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );

  if (outcomePersistenceFailed) {
    throw new Error('Remediation outcome persistence failed for one or more venues');
  }

  await renewRemediationLease();
  const finishedAt = new Date();
  const { data: finished, error: finishError } = await supabase.rpc(
    'finish_hours_review_run',
    {
      p_run_id: runId,
      p_status: counts.failed > 0 ? 'completed_with_failures' : 'completed',
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
  if (finishError) throw new Error('Remediation finish failed: ' + finishError.message);
  if (!finished) throw new Error('Remediation finish rejected inconsistent counts');
} catch (error) {
  await supabase.rpc('fail_hours_review_run', {
    p_run_id: runId,
    p_finished_at: new Date().toISOString(),
  });
  throw error;
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

async function renewRemediationLease(): Promise<void> {
  const { data, error } = await supabase.rpc('renew_hours_review_run_lease', {
    p_run_id: runId,
  });
  if (error || !data) {
    throw new Error('Remediation run lease is no longer active');
  }
}
