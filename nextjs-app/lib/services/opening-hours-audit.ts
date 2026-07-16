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
  hoursReviewStatusSchema,
  weeklyOpeningHoursSchema,
} from '@/lib/services/opening-hours-governance';

const RETENTION_DAYS = 180;
const STALE_AFTER_DAYS = 180;
const DAY_MS = 24 * 60 * 60 * 1000;

type AuditProvenance = {
  reviewStatus?: string;
  reviewedAt?: string;
  nextReviewAt?: string;
  reviewReason?: string;
  lastErrorClass?: string;
  throwForTest?: boolean;
} | null;

export type HoursAuditVenue = {
  id?: string;
  slug?: string;
  openingHours?: WeeklyOpeningHours | null | unknown;
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
    | 'provenance_removed'
    | 'provenance_conflict'
    | 'unsupported_split'
    | 'unsupported_24_7'
    | 'unsupported_seasonal'
    | 'unsupported_holiday_specific'
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

  if (venue.openingHours != null) {
    const schedule = weeklyOpeningHoursSchema.safeParse(venue.openingHours);
    if (!schedule.success) {
      return {
        outcome: 'failed',
        reason: 'classification_failed',
        errorClass: 'validation_failed',
      };
    }
  }

  const reviewStatus = hoursReviewStatusSchema.safeParse(
    provenance.reviewStatus,
  );
  if (!reviewStatus.success) {
    return {
      outcome: 'failed',
      reason: 'classification_failed',
      errorClass: 'validation_failed',
    };
  }

  const hasAnyReviewDate =
    provenance.reviewedAt !== undefined ||
    provenance.nextReviewAt !== undefined;
  const reviewedAt = parseTimestamp(provenance.reviewedAt);
  const nextReviewAt = parseTimestamp(provenance.nextReviewAt);
  if (
    (hasAnyReviewDate &&
      (reviewedAt === undefined ||
        nextReviewAt === undefined ||
        reviewedAt > now.getTime() ||
        nextReviewAt < reviewedAt)) ||
    ((reviewStatus.data === 'verified' || reviewStatus.data === 'due') &&
      (reviewedAt === undefined || nextReviewAt === undefined))
  ) {
    return {
      outcome: 'failed',
      reason: 'classification_failed',
      errorClass: 'validation_failed',
    };
  }

  if (reviewStatus.data === 'failed') {
    return {
      outcome: 'failed',
      reason: 'prior_failure',
      errorClass: boundedErrorClass(provenance.lastErrorClass ?? 'unexpected'),
    };
  }
  if (reviewStatus.data === 'manual_review') {
    if (provenance.reviewReason === 'unsupported_split') {
      return { outcome: 'split', reason: 'unsupported_split' };
    }
    if (provenance.reviewReason === 'provenance_conflict') {
      return { outcome: 'conflicting', reason: 'provenance_conflict' };
    }
    if (
      provenance.reviewReason === 'unsupported_24_7' ||
      provenance.reviewReason === 'unsupported_seasonal' ||
      provenance.reviewReason === 'unsupported_holiday_specific'
    ) {
      return {
        outcome: 'failed',
        reason: provenance.reviewReason,
        errorClass: 'validation_failed',
      };
    }
    return {
      outcome: 'failed',
      reason: 'classification_failed',
      errorClass: 'validation_failed',
    };
  }
  if (reviewStatus.data === 'unknown' || venue.openingHours == null) {
    return { outcome: 'unknown', reason: 'hours_unknown' };
  }
  if (reviewStatus.data === 'due') {
    return { outcome: 'due', reason: 'review_due' };
  }

  if (reviewedAt === undefined || nextReviewAt === undefined) {
    return {
      outcome: 'failed',
      reason: 'classification_failed',
      errorClass: 'validation_failed',
    };
  }
  if (now.getTime() - reviewedAt >= STALE_AFTER_DAYS * DAY_MS) {
    return { outcome: 'stale', reason: 'review_stale' };
  }

  if (nextReviewAt <= now.getTime()) {
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
  renewLease?: () => Promise<unknown>;
  listVenues: () => Promise<HoursAuditVenue[]>;
  recordOutcome: (input: Record<string, unknown>) => Promise<unknown>;
  finishRun: (input: Record<string, unknown>) => Promise<unknown>;
  failRun: (input: Record<string, unknown>) => Promise<unknown>;
  pruneBefore: (cutoff: Date) => Promise<unknown>;
};

type AuditCounts = Record<
  HoursAuditClassification['outcome'],
  number
>;

export async function runOpeningHoursAudit(input: {
  enabled: boolean;
  now: Date;
  clock?: () => Date;
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
  const clock = input.clock ?? (() => new Date());
  let finalized = false;
  let outcomePersistenceFailed = false;
  try {
    await input.repositories.renewLease?.();
    const venues = await input.repositories.listVenues();
    if (venues.length === 0) {
      throw new Error('Audit venue population is empty');
    }
    for (const venue of venues) {
      await input.repositories.renewLease?.();
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
      const priorReviewStatus = boundedReviewStatus(
        venue.provenance?.reviewStatus,
      );
      const record = {
        runId: claim.runId,
        venueId: venue.id,
        venueSlug: venue.slug,
        outcome,
        reason,
        errorClass: classification.errorClass,
        priorReviewStatus,
        resultingReviewStatus: priorReviewStatus,
      };

      try {
        await input.repositories.recordOutcome(record);
        counts[outcome] += 1;
      } catch {
        try {
          // The first RPC may have committed and only lost its response.
          // Repeating the identical idempotent request lets the database
          // confirm that fact without replacing it with a fabricated failure.
          await input.repositories.recordOutcome(record);
          counts[outcome] += 1;
        } catch {
          // Continue classifying later venues even when the identical retry
          // remains indeterminate. The run is finalized failed after
          // retention maintenance and cannot advertise incomplete evidence.
          outcomePersistenceFailed = true;
        }
      }
    }

    const status =
      counts.failed > 0 ? 'completed_with_failures' : 'completed';
    const finishedAt = clock();
    await input.repositories.pruneBefore(
      new Date(finishedAt.getTime() - RETENTION_DAYS * DAY_MS),
    );

    if (outcomePersistenceFailed) {
      throw new Error('One or more audit outcome persistence attempts failed');
    }

    await input.repositories.finishRun({
      runId: claim.runId,
      status,
      totalCount: venues.length,
      counts,
      finishedAt,
    });
    finalized = true;

    return { status, runId: claim.runId, counts };
  } catch (error) {
    if (!finalized) {
      try {
        await input.repositories.failRun({
          runId: claim.runId,
          status: 'failed',
          totalCount: sumCounts(counts),
          counts,
          finishedAt: clock(),
        });
      } catch (finalizationError) {
        throw new AggregateError(
          [error, finalizationError],
          `Opening-hours audit failed: ${errorMessage(error)}; failure finalization also failed: ${errorMessage(finalizationError)}`,
        );
      }
    }
    throw error;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function boundedReviewStatus(value: string | undefined): string | undefined {
  const parsed = hoursReviewStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function sumCounts(counts: AuditCounts): number {
  return Object.values(counts).reduce((total, count) => total + count, 0);
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
