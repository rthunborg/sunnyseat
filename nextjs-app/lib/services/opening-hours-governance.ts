/**
 * Story 12.1 — provider-neutral opening-hours governance.
 *
 * This module is server-only by architecture: it validates reviewed evidence
 * and plans atomic canonical writes. It never fetches a provider, and none of
 * its provenance types belong in the public API DTO layer.
 */
import { z } from 'zod';
import type { WeeklyOpeningHours } from '@/lib/types/api';

const hhmmSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const openingIntervalSchema = z
  .object({
    open: hhmmSchema,
    close: hhmmSchema,
  })
  .strict()
  .refine(({ open, close }) => open !== close, {
    message: 'Opening and closing times must differ',
  });

export const weeklyOpeningHoursSchema = z
  .object({
    '1': openingIntervalSchema.nullable().optional(),
    '2': openingIntervalSchema.nullable().optional(),
    '3': openingIntervalSchema.nullable().optional(),
    '4': openingIntervalSchema.nullable().optional(),
    '5': openingIntervalSchema.nullable().optional(),
    '6': openingIntervalSchema.nullable().optional(),
    '7': openingIntervalSchema.nullable().optional(),
  })
  .strict()
  .refine(
    (schedule) =>
      Object.values(schedule).some((weekday) => weekday !== undefined),
    {
    message: 'A schedule object must contain at least one ISO weekday',
    },
  );

export const hoursSourceTypeSchema = z.enum([
  'venue_confirmed',
  'venue_website',
  'licensed_provider',
  'manual',
]);

export const hoursReviewStatusSchema = z.enum([
  'verified',
  'due',
  'manual_review',
  'unknown',
  'failed',
]);

export const hoursAuditOutcomeSchema = z.enum([
  'current',
  'missing_provenance',
  'due',
  'unknown',
  'conflicting',
  'split',
  'failed',
  'stale',
]);

export const hoursAuditReasonSchema = z.enum([
  'review_current',
  'missing_provenance',
  'review_due',
  'hours_unknown',
  'provenance_conflict',
  'unsupported_split',
  'prior_failure',
  'review_stale',
  'classification_failed',
]);

export const hoursAuditErrorClassSchema = z.enum([
  'read_failed',
  'validation_failed',
  'database_error',
  'unexpected',
]);

const safeSourceReferenceSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine((value) => !/[\r\n]/.test(value), {
    message: 'Source references must be a single bounded identifier',
  })
  .refine(
    (value) =>
      !/(?:https?:\/\/|www\.|provider-payload|regular.?opening.?hours|(?:^|[?&;:_-])(?:api[_-]?key|key|token|secret)=)/i.test(
        value,
      ),
    {
      message:
        'Source references must be opaque evidence identifiers, not URLs, payloads, or credentials',
    },
  );

export const hoursProvenanceSchema = z
  .object({
    sourceType: hoursSourceTypeSchema,
    sourceReference: safeSourceReferenceSchema,
    reviewedAt: z.iso.datetime({ offset: true }),
    nextReviewAt: z.iso.datetime({ offset: true }),
    reviewStatus: hoursReviewStatusSchema.optional().default('verified'),
    reviewReason: hoursAuditReasonSchema.optional(),
    lastErrorClass: hoursAuditErrorClassSchema.optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine(
    ({ reviewedAt, nextReviewAt }) =>
      new Date(nextReviewAt).getTime() >= new Date(reviewedAt).getTime(),
    {
      message: 'nextReviewAt must be on or after reviewedAt',
      path: ['nextReviewAt'],
    },
  );

export type HoursProvenance = z.infer<typeof hoursProvenanceSchema>;

export type AcceptedHoursEvidence = {
  kind: 'accepted';
  schedule: WeeklyOpeningHours | null;
  provenance: HoursProvenance;
};

export type ManualReviewHoursEvidence = {
  kind: 'manual_review';
  reason: 'split' | 'unsupported_24_7' | 'seasonal' | 'holiday_specific';
  provenance: HoursProvenance;
};

export type FailedHoursEvidence = {
  kind: 'failed';
  errorClass: 'invalid_provenance' | 'malformed_schedule';
};

export type HoursEvidenceResult =
  | AcceptedHoursEvidence
  | ManualReviewHoursEvidence
  | FailedHoursEvidence;

type EvidenceInput = {
  schedule?: unknown;
  sourceType?: unknown;
  sourceReference?: unknown;
  reviewedAt?: unknown;
  nextReviewAt?: unknown;
  reviewStatus?: unknown;
  reviewReason?: unknown;
  lastErrorClass?: unknown;
  notes?: unknown;
};

/**
 * Validate reviewed, independently permitted evidence without coercing it.
 * Unsupported shapes route the entire venue to review; malformed canonical
 * data fails rather than dropping a weekday or fabricating a closed day.
 */
export function classifyHoursEvidence(input: EvidenceInput): HoursEvidenceResult {
  const provenance = hoursProvenanceSchema.safeParse({
    sourceType: input.sourceType,
    sourceReference: input.sourceReference,
    reviewedAt: input.reviewedAt,
    nextReviewAt: input.nextReviewAt,
    reviewStatus: input.reviewStatus,
    reviewReason: input.reviewReason,
    lastErrorClass: input.lastErrorClass,
    notes: input.notes,
  });
  if (!provenance.success) {
    return { kind: 'failed', errorClass: 'invalid_provenance' };
  }

  const unsupportedReason = unsupportedScheduleReason(input.schedule);
  if (unsupportedReason) {
    return {
      kind: 'manual_review',
      reason: unsupportedReason,
      provenance: provenance.data,
    };
  }

  if (input.schedule == null) {
    return {
      kind: 'accepted',
      schedule: null,
      provenance: { ...provenance.data, reviewStatus: 'unknown' },
    };
  }

  const schedule = weeklyOpeningHoursSchema.safeParse(input.schedule);
  if (!schedule.success) {
    return { kind: 'failed', errorClass: 'malformed_schedule' };
  }

  if (provenance.data.reviewStatus !== 'verified') {
    return { kind: 'failed', errorClass: 'invalid_provenance' };
  }

  return {
    kind: 'accepted',
    schedule: schedule.data,
    provenance: provenance.data,
  };
}

function unsupportedScheduleReason(
  schedule: unknown,
): ManualReviewHoursEvidence['reason'] | undefined {
  if (!schedule || typeof schedule !== 'object') return undefined;
  const record = schedule as Record<string, unknown>;
  if (record.mode === '24/7') return 'unsupported_24_7';
  if (record.seasonal === true) return 'seasonal';
  if (record.holidaySpecific === true) return 'holiday_specific';
  if (
    Object.values(record).some(
      (value) => Array.isArray(value) && value.length > 1,
    )
  ) {
    return 'split';
  }
  return undefined;
}

type CanonicalHoursState = {
  schedule?: WeeklyOpeningHours | null;
  provenance?: Record<string, unknown> | null;
};

export function planCanonicalHoursUpdate(input: {
  current?: CanonicalHoursState | null;
  outcome: HoursEvidenceResult;
}): {
  shouldWrite: boolean;
  schedule?: WeeklyOpeningHours | null;
  provenance?: HoursProvenance;
  preservesPriorSchedule?: boolean;
  idempotent?: boolean;
} {
  if (input.outcome.kind !== 'accepted') {
    return {
      shouldWrite: false,
      preservesPriorSchedule: input.current?.schedule !== undefined,
    };
  }

  const next = {
    schedule: input.outcome.schedule,
    provenance: input.outcome.provenance,
  };
  const unchanged =
    stableJson(input.current?.schedule) === stableJson(next.schedule) &&
    stableJson(input.current?.provenance) === stableJson(next.provenance);
  if (unchanged) {
    return { shouldWrite: false, idempotent: true };
  }

  return {
    shouldWrite: true,
    schedule: next.schedule,
    provenance: next.provenance,
  };
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, nested) => {
    if (!nested || typeof nested !== 'object' || Array.isArray(nested)) {
      return nested;
    }
    return Object.fromEntries(
      Object.entries(nested as Record<string, unknown>).sort(([a], [b]) =>
        a.localeCompare(b),
      ),
    );
  });
}

export type RemediationRow = {
  id: string;
  slug: string;
  placeId?: string | null;
  openingHours: unknown;
  evidence?: EvidenceInput | null;
};

export type RemediationUpdate = {
  id: string;
  openingHours: WeeklyOpeningHours | null;
  provenance: HoursProvenance | null;
  reviewStatus: HoursProvenance['reviewStatus'] | 'unknown';
  reviewReason?: z.infer<typeof hoursAuditReasonSchema> | null;
  lastErrorClass?: z.infer<typeof hoursAuditErrorClassSchema> | null;
};

export type RemediationOutcome = {
  venueId: string;
  venueSlug: string;
  outcome: 'retained' | 'unknown' | 'manual_review' | 'failed';
  reason: string;
};

/**
 * Deterministic one-time remediation planner. Database callers apply each
 * returned update atomically with its provenance and persist every outcome.
 * Venue identity is never de-duplicated, even when Place IDs are shared.
 */
export async function remediateOpeningHoursRows(input: {
  rows: RemediationRow[];
}): Promise<{
  updates: RemediationUpdate[];
  outcomes: RemediationOutcome[];
}> {
  const updates: RemediationUpdate[] = [];
  const outcomes: RemediationOutcome[] = [];

  for (const row of input.rows) {
    if (!row.evidence || !hoursSourceTypeSchema.safeParse(row.evidence.sourceType).success) {
      updates.push({
        id: row.id,
        openingHours: null,
        provenance: null,
        reviewStatus: 'unknown',
        reviewReason: null,
        lastErrorClass: null,
      });
      outcomes.push({
        venueId: row.id,
        venueSlug: row.slug,
        outcome: 'unknown',
        reason: 'missing_or_ineligible_provenance',
      });
      continue;
    }

    const classified = classifyHoursEvidence({
      ...row.evidence,
      schedule: row.openingHours,
    });
    if (classified.kind === 'accepted') {
      updates.push({
        id: row.id,
        openingHours: classified.schedule,
        provenance: classified.provenance,
        reviewStatus: classified.provenance.reviewStatus,
        reviewReason: classified.provenance.reviewReason ?? null,
        lastErrorClass: classified.provenance.lastErrorClass ?? null,
      });
      outcomes.push({
        venueId: row.id,
        venueSlug: row.slug,
        outcome: 'retained',
        reason: classified.schedule === null ? 'hours_unknown' : 'verified_evidence',
      });
    } else if (classified.kind === 'manual_review') {
      const reviewReason =
        classified.reason === 'split'
          ? 'unsupported_split'
          : 'classification_failed';
      updates.push({
        id: row.id,
        openingHours: null,
        provenance: {
          ...classified.provenance,
          reviewStatus: 'manual_review',
          reviewReason,
        },
        reviewStatus: 'manual_review',
        reviewReason,
        lastErrorClass: null,
      });
      outcomes.push({
        venueId: row.id,
        venueSlug: row.slug,
        outcome: 'manual_review',
        reason: classified.reason,
      });
    } else {
      const parsedProvenance = hoursProvenanceSchema.safeParse({
        sourceType: row.evidence.sourceType,
        sourceReference: row.evidence.sourceReference,
        reviewedAt: row.evidence.reviewedAt,
        nextReviewAt: row.evidence.nextReviewAt,
        reviewStatus: 'failed',
        reviewReason: 'classification_failed',
        lastErrorClass: 'validation_failed',
        notes: row.evidence.notes,
      });
      updates.push({
        id: row.id,
        openingHours: null,
        provenance: parsedProvenance.success ? parsedProvenance.data : null,
        reviewStatus: 'failed',
        reviewReason: 'classification_failed',
        lastErrorClass: 'validation_failed',
      });
      outcomes.push({
        venueId: row.id,
        venueSlug: row.slug,
        outcome: 'failed',
        reason: classified.errorClass,
      });
    }
  }

  return { updates, outcomes };
}
