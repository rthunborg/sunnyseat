import { createHash, randomUUID } from 'node:crypto';
import {
  access,
  constants,
  open,
  readFile,
  realpath,
  rename,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import {
  createClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import {
  assertCompleteRemediationPopulation,
  parseRemediationRows,
  remediateOpeningHoursRows,
  type RemediationOutcome,
} from '../lib/services/opening-hours-governance';
import type { Database, Json } from '../lib/supabase/types';

const VENUE_PAGE_SIZE = 500;
type HoursClient = SupabaseClient<Database>;
type Counts = ReturnType<typeof emptyCounts>;
type ReportOutcome = {
  venueId: string;
  venueSlug: string;
  outcome: keyof Counts;
  reason: string;
};
type ReportStatus =
  | 'provisional'
  | 'completed'
  | 'completed_with_failures'
  | 'failed';

const inputPath = resolve(requiredEnv('SUN_HOURS_REMEDIATION_INPUT'));
const reportPath = resolve(requiredEnv('SUN_HOURS_REMEDIATION_REPORT'));
await preflightRemediationPaths(inputPath, reportPath);

const inputText = await readFile(inputPath, 'utf8');
const rows = parseRemediationRows(inputText);
const inputFingerprint = createHash('sha256').update(inputText).digest('hex');
const runId = validateRunId(
  process.env.SUN_HOURS_REMEDIATION_RUN_ID?.trim() ||
    `hours-remediation-${inputFingerprint.slice(0, 32)}`,
);
const claimIdentity = createHash('sha256')
  .update(
    process.env.SUN_HOURS_REMEDIATION_CLAIM_TOKEN?.trim() ||
      `${runId}\0${inputFingerprint}`,
  )
  .digest('hex');
const startedAt = new Date();

const supabase = createClient<Database>(
  requiredEnv('SUPABASE_URL'),
  requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

await claimRemediationRun(supabase);

let counts = emptyCounts();
let reportOutcomes: ReportOutcome[] = [];
let databaseTerminal = false;
let terminalStatus: 'completed' | 'completed_with_failures' | undefined;
let terminalFinishedAt: Date | undefined;

try {
  const liveVenueIds = await listLiveVenueIds(supabase);
  assertCompleteRemediationPopulation({ rows, liveVenueIds });

  const plan = await remediateOpeningHoursRows({ rows, now: startedAt });
  const outcomesByVenue = new Map(
    plan.outcomes.map((outcome) => [outcome.venueId, outcome]),
  );
  const requests: Record<string, Json | string | null>[] = [];

  for (const update of plan.updates) {
    const outcome = outcomesByVenue.get(update.id);
    if (!outcome) {
      throw new Error(
        'Remediation plan omitted an outcome for venue ' + update.id,
      );
    }
    if (!update.expectedUpdatedAt) {
      throw new Error(
        'Remediation plan omitted expected updatedAt for venue ' + update.id,
      );
    }

    const bounded = boundedAuditOutcome(outcome);
    const provenance = update.provenance;
    counts[bounded.outcome] += 1;
    reportOutcomes.push({
      venueId: outcome.venueId,
      venueSlug: outcome.venueSlug,
      outcome: bounded.outcome,
      reason: bounded.reason,
    });
    const request: Record<string, Json | string | null> = {
      venue_id: update.id,
      venue_slug: outcome.venueSlug,
      opening_hours: update.openingHours as Json,
      source_type: provenance?.sourceType ?? null,
      source_reference: provenance?.sourceReference ?? null,
      review_status: update.reviewStatus,
      reviewed_at: provenance?.reviewedAt ?? null,
      next_review_at: provenance?.nextReviewAt ?? null,
      notes: opaqueHoursNote(provenance?.notes),
      review_reason: update.reviewReason ?? null,
      last_error_class: update.lastErrorClass ?? null,
      outcome: bounded.outcome,
      reason: bounded.reason,
      error_class: bounded.errorClass,
      expected_updated_at: update.expectedUpdatedAt,
    };
    request.request_fingerprint = fingerprintRequest(request);
    requests.push(request);
  }

  await writeRemediationReport({
    status: 'provisional',
    counts,
    reportOutcomes,
    evidence: 'planned',
  });

  await renewRunLease(supabase);
  await applyRemediationBatch(supabase, requests);
  await renewRunLease(supabase);
  const persistedReport = await persistedRemediationReport(supabase);
  counts = persistedReport.counts;
  reportOutcomes = persistedReport.outcomes;

  terminalStatus =
    counts.failed > 0 ? 'completed_with_failures' : 'completed';
  terminalFinishedAt = new Date();
  await finishRemediationRun(supabase, {
    status: terminalStatus,
    finishedAt: terminalFinishedAt,
    totalCount: reportOutcomes.length,
    counts,
  });
  databaseTerminal = true;
} catch (error) {
  if (!databaseTerminal) {
    const failedAt = new Date();
    try {
      await failRemediationRun(supabase, failedAt);
    } catch (finalizerError) {
      throw new AggregateError(
        [error, finalizerError],
        `Remediation failed: ${errorMessage(error)}; failure finalizer rejected: ${errorMessage(finalizerError)}`,
      );
    }

    try {
      const persistedReport = await persistedRemediationReport(supabase).catch(
        () => ({ counts: emptyCounts(), outcomes: [] }),
      );
      await writeRemediationReport({
        status: 'failed',
        counts: persistedReport.counts,
        reportOutcomes: persistedReport.outcomes,
        evidence: 'persisted',
        finishedAt: failedAt,
      });
    } catch (reportError) {
      throw new AggregateError(
        [error, reportError],
        `Remediation failed: ${errorMessage(error)}; terminal report write also failed: ${errorMessage(reportError)}`,
      );
    }
  }
  throw error;
}

if (!terminalStatus || !terminalFinishedAt) {
  throw new Error('Remediation reached no terminal database state');
}

try {
  await writeRemediationReport({
    status: terminalStatus,
    counts,
    reportOutcomes,
    evidence: 'persisted',
    finishedAt: terminalFinishedAt,
  });
} catch (reportError) {
  throw new Error(
    `Remediation database run ${runId} completed as ${terminalStatus}, but the terminal report could not be published atomically. The provisional report remains recovery evidence: ${errorMessage(reportError)}`,
    { cause: reportError },
  );
}

async function claimRemediationRun(client: HoursClient): Promise<void> {
  const claim = await callBooleanRpcWithRetry(
    client,
    'claim_hours_review_run',
    {
      p_run_id: runId,
      p_trigger_type: 'remediation',
      p_started_at: startedAt.toISOString(),
      p_remediation_input_fingerprint: inputFingerprint,
      p_remediation_claim_identity: claimIdentity,
    },
  );
  if (claim.data) return;

  if (await isRemediationRunActive(client)) return;
  if (claim.error) {
    throw new Error('Remediation claim failed: ' + claim.error.message);
  }
  throw new Error('Another hours review run is already active');
}

async function applyRemediationBatch(
  client: HoursClient,
  requests: Record<string, Json | string | null>[],
): Promise<void> {
  const applied = await callBooleanRpcWithRetry(
    client,
    'apply_hours_remediation_batch',
    {
      p_run_id: runId,
      p_remediation_input_fingerprint: inputFingerprint,
      p_remediation_claim_identity: claimIdentity,
      p_requests: requests as Json,
    },
  );
  if (applied.data) return;

  const { data: stored, error } = await client
    .from('hours_review_outcomes')
    .select(
      'venue_id, venue_slug, outcome, reason, error_class, resulting_review_status, remediation_input_fingerprint, remediation_request_fingerprint',
    )
    .eq('run_id', runId);
  if (error) {
    throw new Error(
      'Remediation batch reconciliation failed: ' + error.message,
    );
  }
  const byVenue = new Map((stored ?? []).map((row) => [row.venue_id, row]));
  const reconciled = requests.every((request) => {
    const row = byVenue.get(String(request.venue_id));
    return (
      row?.venue_slug === request.venue_slug &&
      row.remediation_input_fingerprint === inputFingerprint &&
      row.remediation_request_fingerprint === request.request_fingerprint
    );
  });
  if (reconciled && byVenue.size === requests.length) return;
  if (applied.error) {
    throw new Error('Remediation batch failed: ' + applied.error.message);
  }
  throw new Error('Remediation batch rejected stale or incoherent input');
}

async function finishRemediationRun(
  client: HoursClient,
  input: {
    status: 'completed' | 'completed_with_failures';
    finishedAt: Date;
    totalCount: number;
    counts: Counts;
  },
): Promise<void> {
  const args = {
    p_run_id: runId,
    p_status: input.status,
    p_finished_at: input.finishedAt.toISOString(),
    p_total_count: input.totalCount,
    p_current_count: input.counts.current,
    p_missing_provenance_count: input.counts.missing_provenance,
    p_due_count: input.counts.due,
    p_unknown_count: input.counts.unknown,
    p_conflicting_count: input.counts.conflicting,
    p_split_count: input.counts.split,
    p_failed_count: input.counts.failed,
    p_stale_count: input.counts.stale,
  };
  const finished = await callBooleanRpcWithRetry(
    client,
    'finish_hours_review_run',
    args,
  );
  if (finished.data) return;

  const { data: stored, error } = await client
    .from('hours_review_runs')
    .select(
      'status, total_count, current_count, missing_provenance_count, due_count, unknown_count, conflicting_count, split_count, failed_count, stale_count',
    )
    .eq('id', runId)
    .maybeSingle();
  if (error) {
    throw new Error(
      'Remediation finish reconciliation failed: ' + error.message,
    );
  }
  if (
    stored?.status === args.p_status &&
    stored.total_count === args.p_total_count &&
    stored.current_count === args.p_current_count &&
    stored.missing_provenance_count === args.p_missing_provenance_count &&
    stored.due_count === args.p_due_count &&
    stored.unknown_count === args.p_unknown_count &&
    stored.conflicting_count === args.p_conflicting_count &&
    stored.split_count === args.p_split_count &&
    stored.failed_count === args.p_failed_count &&
    stored.stale_count === args.p_stale_count
  ) {
    return;
  }
  if (finished.error) {
    throw new Error('Remediation finish failed: ' + finished.error.message);
  }
  throw new Error('Remediation finish rejected inconsistent counts');
}

async function failRemediationRun(
  client: HoursClient,
  failedAt: Date,
): Promise<void> {
  const failed = await callBooleanRpcWithRetry(client, 'fail_hours_review_run', {
    p_run_id: runId,
    p_finished_at: failedAt.toISOString(),
  });
  if (failed.data) return;
  const { data: stored, error } = await client
    .from('hours_review_runs')
    .select('status')
    .eq('id', runId)
    .maybeSingle();
  if (error) {
    throw new Error(
      'Remediation failure reconciliation failed: ' + error.message,
    );
  }
  if (stored?.status === 'failed') return;
  if (failed.error) {
    throw new Error(
      'Remediation failure finalizer rejected: ' + failed.error.message,
    );
  }
  throw new Error('Remediation failure finalizer rejected the active run');
}

async function renewRunLease(client: HoursClient): Promise<void> {
  const renewed = await callBooleanRpcWithRetry(
    client,
    'renew_hours_review_run_lease',
    {
      p_run_id: runId,
      p_remediation_input_fingerprint: inputFingerprint,
      p_remediation_claim_identity: claimIdentity,
    },
  );
  if (renewed.data) return;
  if (await isRemediationRunActive(client)) return;
  if (renewed.error) {
    throw new Error(
      'Remediation lease renewal failed: ' + renewed.error.message,
    );
  }
  throw new Error('Remediation run lease is no longer active');
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

async function writeRemediationReport(input: {
  status: ReportStatus;
  counts: Counts;
  reportOutcomes: ReportOutcome[];
  evidence: 'planned' | 'persisted';
  finishedAt?: Date;
}): Promise<void> {
  const contents =
    JSON.stringify(
      {
        runId,
        inputFingerprint,
        status: input.status,
        evidence: input.evidence,
        ...(input.finishedAt
          ? { finishedAt: input.finishedAt.toISOString() }
          : {}),
        total: input.reportOutcomes.length,
        counts: input.counts,
        outcomes: input.reportOutcomes,
      },
      null,
      2,
    ) + '\n';
  const temporaryNameHash = createHash('sha256')
    .update(runId)
    .digest('hex')
    .slice(0, 24);
  const temporaryPath = join(
    dirname(reportPath),
    `.hours-remediation-${temporaryNameHash}.${process.pid}.${randomUUID()}.tmp`,
  );
  try {
    await writeFile(temporaryPath, contents, { encoding: 'utf8', flag: 'wx' });
    await rename(temporaryPath, reportPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

async function persistedRemediationReport(
  client: HoursClient,
): Promise<{ counts: Counts; outcomes: ReportOutcome[] }> {
  const { data, error } = await client
    .from('hours_review_outcomes')
    .select('venue_id, venue_slug, outcome, reason')
    .eq('run_id', runId)
    .order('venue_id');
  if (error) {
    throw new Error(
      'Persisted remediation report read failed: ' + error.message,
    );
  }
  const counts = emptyCounts();
  const outcomes: ReportOutcome[] = [];
  for (const row of data ?? []) {
    if (!(row.outcome in counts)) {
      throw new Error(
        'Persisted remediation report contains an unbounded outcome',
      );
    }
    const outcome = row.outcome as keyof Counts;
    counts[outcome] += 1;
    outcomes.push({
      venueId: row.venue_id,
      venueSlug: row.venue_slug,
      outcome,
      reason: row.reason,
    });
  }
  return { counts, outcomes };
}

async function preflightRemediationPaths(
  input: string,
  report: string,
): Promise<void> {
  const inputRealPath = await realpath(input);
  const reportDirectory = dirname(report);
  const reportDirectoryRealPath = await realpath(reportDirectory);
  let reportComparisonPath = join(
    reportDirectoryRealPath,
    report.slice(reportDirectory.length + 1),
  );
  try {
    const reportStats = await stat(report);
    if (reportStats.isDirectory()) {
      throw new Error('Remediation report path must be a file');
    }
    reportComparisonPath = await realpath(report);
  } catch (error) {
    if (
      error instanceof Error &&
      !('code' in error && error.code === 'ENOENT')
    ) {
      throw error;
    }
  }
  if (
    normalizePathIdentity(inputRealPath) ===
    normalizePathIdentity(reportComparisonPath)
  ) {
    throw new Error('Remediation input and report paths must be distinct');
  }

  await access(reportDirectoryRealPath, constants.W_OK);
  if (await pathExists(report)) {
    await access(report, constants.W_OK);
  }
  const replacementProbeSource = join(
    reportDirectoryRealPath,
    `.hours-remediation-replacement-probe-source-${process.pid}-${randomUUID()}`,
  );
  const replacementProbeTarget = join(
    reportDirectoryRealPath,
    `.hours-remediation-replacement-probe-target-${process.pid}-${randomUUID()}`,
  );
  try {
    const sourceProbe = await open(replacementProbeSource, 'wx');
    await sourceProbe.close();
    const targetProbe = await open(replacementProbeTarget, 'wx');
    await targetProbe.close();
    await rename(replacementProbeSource, replacementProbeTarget);
  } finally {
    await unlink(replacementProbeSource).catch(() => undefined);
    await unlink(replacementProbeTarget).catch(() => undefined);
  }
}

async function isRemediationRunActive(client: HoursClient): Promise<boolean> {
  const active = await callBooleanRpcWithRetry(
    client,
    'is_hours_review_run_active',
    {
      p_run_id: runId,
      p_expected_trigger_type: 'remediation',
      p_remediation_input_fingerprint: inputFingerprint,
      p_remediation_claim_identity: claimIdentity,
    },
  );
  if (active.error) {
    throw new Error(
      'Remediation active-state reconciliation failed: ' +
        active.error.message,
    );
  }
  return active.data === true;
}

function fingerprintRequest(
  request: Record<string, Json | string | null>,
): string {
  return createHash('sha256').update(JSON.stringify(request)).digest('hex');
}

function opaqueHoursNote(value: string | null | undefined): string | null {
  const note = value?.trim();
  return note && /^note:[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(note)
    ? note
    : null;
}

function validateRunId(value: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(value)) {
    throw new Error(
      'SUN_HOURS_REMEDIATION_RUN_ID must be 1-120 safe identifier characters',
    );
  }
  return value;
}

function normalizePathIdentity(value: string): string {
  const normalized = resolve(value).replace(/[\\/]+$/, '');
  return process.platform === 'win32' ? normalized.toLocaleLowerCase('en-US') : normalized;
}

async function pathExists(value: string): Promise<boolean> {
  try {
    await stat(value);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
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

function boundedAuditOutcome(outcome: RemediationOutcome): {
  outcome: keyof Counts;
  reason:
    | 'review_current'
    | 'hours_unknown'
    | 'provenance_removed'
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
    return {
      outcome: 'unknown',
      reason:
        outcome.reason === 'provenance_removed'
          ? 'provenance_removed'
          : 'hours_unknown',
      errorClass: null,
    };
  }
  if (outcome.outcome === 'manual_review') {
    if (outcome.reason === 'split') {
      return {
        outcome: 'split',
        reason: 'unsupported_split',
        errorClass: null,
      };
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
  if (!value) {
    throw new Error('Missing required environment variable: ' + name);
  }
  return value;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function listLiveVenueIds(client: HoursClient): Promise<string[]> {
  const ids: string[] = [];
  let lastId: string | undefined;
  for (;;) {
    await renewRunLease(client);
    let query = client.from('venues').select('id').order('id').limit(VENUE_PAGE_SIZE);
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
