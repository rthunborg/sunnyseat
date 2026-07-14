import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import {
  remediateOpeningHoursRows,
  type RemediationOutcome,
  type RemediationRow,
} from '../lib/services/opening-hours-governance';
import type { Database, Json } from '../lib/supabase/types';

const inputPath = requiredEnv('SUN_HOURS_REMEDIATION_INPUT');
const reportPath = requiredEnv('SUN_HOURS_REMEDIATION_REPORT');
const runId =
  process.env.SUN_HOURS_REMEDIATION_RUN_ID?.trim() ||
  'hours-remediation-' + randomUUID();
const startedAt = new Date();

const rows = parseRows(await readFile(inputPath, 'utf8'));
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

  for (const update of plan.updates) {
    const outcome = outcomesByVenue.get(update.id);
    if (!outcome) {
      throw new Error('Remediation plan omitted an outcome for venue ' + update.id);
    }
    const bounded = boundedAuditOutcome(outcome);
    const provenance = update.provenance;
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
    if (error) {
      throw new Error('Atomic remediation failed for venue ' + update.id + ': ' + error.message);
    }
    if (!data) throw new Error('Remediation venue was not found: ' + update.id);
    counts[bounded.outcome] += 1;
  }

  const finishedAt = new Date();
  const { data: finished, error: finishError } = await supabase.rpc(
    'finish_hours_review_run',
    {
      p_run_id: runId,
      p_status: counts.failed > 0 ? 'completed_with_failures' : 'completed',
      p_finished_at: finishedAt.toISOString(),
      p_total_count: plan.updates.length,
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

  // The report is deliberately bounded: no source references, schedules,
  // provider content, notes, or credentials are copied from the input.
  await writeFile(
    reportPath,
    JSON.stringify(
      {
        runId,
        total: plan.outcomes.length,
        counts,
        outcomes: plan.outcomes.map(({ venueId, venueSlug, outcome, reason }) => ({
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
} catch (error) {
  await supabase.rpc('fail_hours_review_run', {
    p_run_id: runId,
    p_finished_at: new Date().toISOString(),
  });
  throw error;
}

function parseRows(value: string): RemediationRow[] {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed)) {
    throw new Error('Remediation input must be a JSON array');
  }
  return parsed as RemediationRow[];
}

function boundedAuditOutcome(outcome: RemediationOutcome): {
  outcome: keyof ReturnType<typeof emptyCounts>;
  reason:
    | 'review_current'
    | 'hours_unknown'
    | 'unsupported_split'
    | 'classification_failed';
  errorClass: 'validation_failed' | null;
} {
  if (outcome.outcome === 'retained') {
    return { outcome: 'current', reason: 'review_current', errorClass: null };
  }
  if (outcome.outcome === 'unknown') {
    return { outcome: 'unknown', reason: 'hours_unknown', errorClass: null };
  }
  if (outcome.outcome === 'manual_review' && outcome.reason === 'split') {
    return { outcome: 'split', reason: 'unsupported_split', errorClass: null };
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
