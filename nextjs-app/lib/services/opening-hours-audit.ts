/**
 * Story 12.1 — deterministic weekly staleness/review audit.
 *
 * The audit is deliberately read-only with respect to canonical venue hours.
 * Persistence is injected so unit tests have no live Supabase dependency and
 * the repository runner can use the service-role client directly.
 */
import type { WeeklyOpeningHours } from '@/lib/types/api';
import {
  hoursAuditErrorClassSchema,
  hoursAuditOutcomeSchema,
  hoursAuditReasonSchema,
} from '@/lib/services/opening-hours-governance';

const RETENTION_DAYS = 180;
const STALE_AFTER_DAYS = 180;
const DAY_MS = 24 * 60 * 60 * 1000;

type AuditProvenance = {
  reviewStatus?: string;
  reviewedAt?: string;
  nextReviewAt?: string;
  conflict?: boolean;
  reason?: string;
  lastErrorClass?: string;
  throwForTest?: boolean;
} | null;

export type HoursAuditVenue = {
  id?: string;
  slug?: string;
  openingHours?: WeeklyOpeningHours | null;
  provenance?: AuditProvenance;
};

export type HoursAuditClassification = {
  outcome:
    | 'current'
    | 'missing_provenance'
    | 'due'
    | 'unknown'
    | 'conflicting'
    | 'split'
    | 'failed'
    | 'stale';
  reason:
    | 'review_current'
    | 'missing_provenance'
    | 'review_due'
    | 'hours_unknown'
    | 'provenance_conflict'
    | 'unsupported_split'
    | 'prior_failure'
    | 'review_stale'
    | 'classification_failed';
  errorClass?: 'read_failed' | 'validation_failed' | 'database_error' | 'unexpected';
};

export function classifyHoursAuditVenue(input: {
  venue: HoursAuditVenue;
  now: Date;
}): HoursAuditClassification {
  const { venue, now } = input;
  const provenance = venue.provenance;
  if (provenance?.throwForTest) {
    throw new Error('Deterministic classification failure');
  }
  if (!provenance) {
    return { outcome: 'missing_provenance', reason: 'missing_provenance' };
  }
  if (provenance.lastErrorClass) {
    return {
      outcome: 'failed',
      reason: 'prior_failure',
      errorClass: boundedErrorClass(provenance.lastErrorClass),
    };
  }
  if (provenance.reason === 'split') {
    return { outcome: 'split', reason: 'unsupported_split' };
  }
  if (provenance.conflict) {
    return { outcome: 'conflicting', reason: 'provenance_conflict' };
  }
  if (venue.openingHours == null || provenance.reviewStatus === 'unknown') {
    return { outcome: 'unknown', reason: 'hours_unknown' };
  }

  const reviewedAt = parseTimestamp(provenance.reviewedAt);
  if (
    provenance.reviewStatus === 'verified' &&
    reviewedAt !== undefined &&
    now.getTime() - reviewedAt >= STALE_AFTER_DAYS * DAY_MS
  ) {
    return { outcome: 'stale', reason: 'review_stale' };
  }

  const nextReviewAt = parseTimestamp(provenance.nextReviewAt);
  if (nextReviewAt !== undefined && nextReviewAt <= now.getTime()) {
    return { outcome: 'due', reason: 'review_due' };
  }

  return { outcome: 'current', reason: 'review_current' };
}

function parseTimestamp(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function boundedErrorClass(
  value: string,
): HoursAuditClassification['errorClass'] {
  const parsed = hoursAuditErrorClassSchema.safeParse(value);
  return parsed.success ? parsed.data : 'unexpected';
}

type ClaimedRun =
  | { claimed: true; runId: string }
  | { claimed: false; activeRunId?: string };

type AuditRepositories = {
  claimRun: (input?: Record<string, unknown>) => Promise<ClaimedRun>;
  listVenues?: () => Promise<HoursAuditVenue[]>;
  recordOutcome?: (input: Record<string, unknown>) => Promise<unknown>;
  finishRun?: (input: Record<string, unknown>) => Promise<unknown>;
  pruneBefore?: (cutoff: Date) => Promise<unknown>;
};

type AuditCounts = Record<
  HoursAuditClassification['outcome'],
  number
>;

export async function runOpeningHoursAudit(input: {
  enabled: boolean;
  now: Date;
  repositories: AuditRepositories;
}): Promise<{
  status:
    | 'disabled'
    | 'already_running'
    | 'completed'
    | 'completed_with_failures';
  runId?: string;
  activeRunId?: string;
  counts?: AuditCounts;
}> {
  if (!input.enabled) return { status: 'disabled' };

  const claim = await input.repositories.claimRun({ now: input.now });
  if (!claim.claimed) {
    return {
      status: 'already_running',
      ...(claim.activeRunId ? { activeRunId: claim.activeRunId } : {}),
    };
  }

  const counts = emptyCounts();
  const venues = await input.repositories.listVenues?.() ?? [];
  for (const venue of venues) {
    let classification: HoursAuditClassification;
    try {
      classification = classifyHoursAuditVenue({ venue, now: input.now });
    } catch {
      classification = {
        outcome: 'failed',
        reason: 'classification_failed',
        errorClass: 'unexpected',
      };
    }

    // Schema parsing keeps run summaries bounded even if a caller supplies a
    // malformed classifier or repository test double.
    const outcome = hoursAuditOutcomeSchema.parse(classification.outcome);
    const reason = hoursAuditReasonSchema.parse(classification.reason);
    counts[outcome] += 1;

    try {
      await input.repositories.recordOutcome?.({
        runId: claim.runId,
        venueId: venue.id,
        venueSlug: venue.slug,
        outcome,
        reason,
        errorClass: classification.errorClass,
      });
    } catch {
      if (outcome !== 'failed') {
        counts[outcome] -= 1;
        counts.failed += 1;
      }
    }
  }

  const status =
    counts.failed > 0 ? 'completed_with_failures' : 'completed';
  await input.repositories.finishRun?.({
    runId: claim.runId,
    status,
    totalCount: venues.length,
    counts,
    finishedAt: input.now,
  });
  await input.repositories.pruneBefore?.(
    new Date(input.now.getTime() - RETENTION_DAYS * DAY_MS),
  );

  return { status, runId: claim.runId, counts };
}

function emptyCounts(): AuditCounts {
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
