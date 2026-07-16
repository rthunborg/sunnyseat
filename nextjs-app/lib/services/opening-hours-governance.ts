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
  .superRefine((schedule, context) => {
    for (const [weekday, interval] of Object.entries(schedule)) {
      if (interval === undefined) {
        context.addIssue({
          code: 'custom',
          message: 'Explicitly undefined weekdays are not canonical JSON',
          path: [weekday],
        });
      }
    }
  });

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
  'provenance_removed',
  'provenance_conflict',
  'unsupported_split',
  'unsupported_24_7',
  'unsupported_seasonal',
  'unsupported_holiday_specific',
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

export const offsetDateTimeSchema = z.iso.datetime({ offset: true });

const SAFE_SOURCE_REFERENCE_PATTERN =
  /^[a-z][a-z0-9_-]{1,31}:[A-Za-z0-9][A-Za-z0-9._-]{0,199}(?::[A-Za-z0-9][A-Za-z0-9._-]{0,199}){0,3}$/;
const SAFE_NOTE_PATTERN = /^note:[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;

export const hoursSourceReferenceSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .regex(SAFE_SOURCE_REFERENCE_PATTERN, {
    message:
      'Source references must be colon-delimited opaque identifiers using letters, digits, dots, underscores, and hyphens only',
  });

export const hoursNoteSchema = z
  .string()
  .trim()
  .min(6)
  .max(205)
  .regex(SAFE_NOTE_PATTERN, {
    message: 'Notes must be bounded opaque note: identifiers',
  });

const hoursProvenanceBaseSchema = z
  .object({
    sourceType: hoursSourceTypeSchema,
    sourceReference: hoursSourceReferenceSchema,
    reviewedAt: offsetDateTimeSchema,
    nextReviewAt: offsetDateTimeSchema,
    reviewStatus: hoursReviewStatusSchema.optional().default('verified'),
    reviewReason: hoursAuditReasonSchema.optional(),
    lastErrorClass: hoursAuditErrorClassSchema.optional(),
    notes: hoursNoteSchema.optional(),
  })
  .strict()
  .superRefine((provenance, context) => {
    const reviewedAt = new Date(provenance.reviewedAt).getTime();
    const nextReviewAt = new Date(provenance.nextReviewAt).getTime();
    if (nextReviewAt < reviewedAt) {
      context.addIssue({
        code: 'custom',
        message: 'nextReviewAt must be on or after reviewedAt',
        path: ['nextReviewAt'],
      });
    }
    if (
      provenance.reviewStatus === 'verified' &&
      (provenance.reviewReason !== undefined ||
        provenance.lastErrorClass !== undefined)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Verified evidence cannot carry a review reason or error',
        path: ['reviewStatus'],
      });
    }
    if (
      provenance.reviewStatus === 'manual_review' &&
      provenance.reviewReason === undefined
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Manual-review evidence requires a review reason',
        path: ['reviewReason'],
      });
    }
    if (
      provenance.reviewStatus === 'failed' &&
      provenance.lastErrorClass === undefined
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Failed evidence requires an error class',
        path: ['lastErrorClass'],
      });
    }
  });

export function createHoursProvenanceSchema(now: Date) {
  return hoursProvenanceBaseSchema.superRefine((provenance, context) => {
    if (new Date(provenance.reviewedAt).getTime() > now.getTime()) {
      context.addIssue({
        code: 'custom',
        message: 'reviewedAt must not be future-dated',
        path: ['reviewedAt'],
      });
    }
  });
}

export type HoursProvenance = z.infer<typeof hoursProvenanceBaseSchema>;

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
export function classifyHoursEvidence(
  input: EvidenceInput,
  now: Date = new Date(),
): HoursEvidenceResult {
  const provenance = safeParseHoursProvenance(
    {
      sourceType: input.sourceType,
      sourceReference: input.sourceReference,
      reviewedAt: input.reviewedAt,
      nextReviewAt: input.nextReviewAt,
      reviewStatus:
        input.schedule == null && input.reviewStatus === undefined
          ? 'unknown'
          : input.reviewStatus,
      reviewReason: input.reviewReason,
      lastErrorClass: input.lastErrorClass,
      notes: input.notes,
    },
    now,
  );
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
    if (provenance.data.reviewStatus !== 'unknown') {
      return { kind: 'failed', errorClass: 'invalid_provenance' };
    }
    return {
      kind: 'accepted',
      schedule: null,
      provenance: {
        ...provenance.data,
        reviewStatus: 'unknown',
        reviewReason: undefined,
        lastErrorClass: undefined,
      },
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
  const flags = {
    split: false,
    fullDay: false,
    seasonal: false,
    holiday: false,
  };
  const seen = new Set<object>();

  function inspect(value: unknown, parentKey = ''): void {
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, '');
      if (
        normalized === '24/7' ||
        normalized === '24x7' ||
        normalized === '24hours' ||
        normalized === 'open24hours'
      ) {
        flags.fullDay = true;
      }
      return;
    }
    if (!value || typeof value !== 'object') return;
    if (seen.has(value)) return;
    seen.add(value);

    if (Array.isArray(value)) {
      const key = parentKey.toLowerCase();
      if (
        /^[1-7]$/.test(parentKey) ||
        /period|interval|openinghour|servicehour/.test(key) ||
        value.some(
          (item) =>
            item !== null &&
            typeof item === 'object' &&
            !Array.isArray(item) &&
            ('open' in item || 'close' in item),
        )
      ) {
        flags.split = true;
      }
      for (const item of value) inspect(item, parentKey);
      return;
    }

    const record = value as Record<string, unknown>;
    const open = record.open;
    const close = record.close;
    if (
      open === '00:00' &&
      (close === '00:00' || close === '24:00')
    ) {
      flags.fullDay = true;
    }

    for (const [key, nested] of Object.entries(record)) {
      const normalizedKey = key.toLowerCase().replace(/[\s_-]+/g, '');
      if (
        (normalizedKey.includes('season') ||
          normalizedKey === 'summer' ||
          normalizedKey === 'winter') &&
        nested !== false &&
        nested != null
      ) {
        flags.seasonal = true;
      }
      if (
        (normalizedKey.includes('holiday') ||
          normalizedKey.includes('specialdate') ||
          normalizedKey.includes('exceptiondate')) &&
        nested !== false &&
        nested != null
      ) {
        flags.holiday = true;
      }
      if (
        (normalizedKey.includes('24hour') ||
          normalizedKey.includes('twentyfourseven') ||
          normalizedKey === 'alwaysopen') &&
        nested !== false &&
        nested != null
      ) {
        flags.fullDay = true;
      }
      inspect(nested, key);
    }
  }

  inspect(schedule);
  if (flags.split) return 'split';
  if (flags.fullDay) return 'unsupported_24_7';
  if (flags.seasonal) return 'seasonal';
  if (flags.holiday) return 'holiday_specific';
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
  /** Required for file-based remediation; optional for direct planner callers. */
  updatedAt?: string;
  placeId?: string | null;
  openingHours: unknown;
  evidence?: EvidenceInput | null;
};

export type RemediationUpdate = {
  id: string;
  expectedUpdatedAt?: string;
  openingHours: WeeklyOpeningHours | null;
  provenance: HoursProvenance | null;
  reviewStatus: HoursProvenance['reviewStatus'] | 'unknown';
  reviewReason?: z.infer<typeof hoursAuditReasonSchema> | null;
  lastErrorClass?: z.infer<typeof hoursAuditErrorClassSchema> | null;
  preservesPriorSchedule?: boolean;
};

export type RemediationOutcome = {
  venueId: string;
  venueSlug: string;
  outcome: 'retained' | 'unknown' | 'manual_review' | 'failed';
  reason: string;
};

const remediationEvidenceInputSchema = z
  .object({
    sourceType: z.string(),
    sourceReference: z.string(),
    reviewedAt: z.string(),
    nextReviewAt: z.string(),
    reviewStatus: z.string().optional(),
    reviewReason: z.string().optional(),
    lastErrorClass: z.string().optional(),
    notes: z.string().optional(),
  })
  .strict();

const remediationRowSchema = z
  .object({
    id: z.string().trim().min(1).max(200),
    slug: z.string().trim().min(1).max(200),
    updatedAt: z.iso.datetime({ offset: true }),
    placeId: z.string().trim().min(1).max(500).nullable().optional(),
    openingHours: z.union([z.record(z.string(), z.unknown()), z.null()]),
    evidence: remediationEvidenceInputSchema.nullable().optional(),
  })
  .strict();

const remediationRowsSchema = z
  .array(remediationRowSchema)
  .min(1, 'Remediation input must contain at least one venue')
  .superRefine((rows, context) => {
    const seen = new Set<string>();
    for (const [index, row] of rows.entries()) {
      if (seen.has(row.id)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate remediation venue id: ${row.id}`,
          path: [index, 'id'],
        });
      }
      seen.add(row.id);
    }
  });

export function parseRemediationRows(value: string): RemediationRow[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('Invalid remediation input: expected valid JSON');
  }
  const result = remediationRowsSchema.safeParse(parsed);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => {
        const path = issue.path.join('.');
        return path ? `${path}: ${issue.message}` : issue.message;
      })
      .join('; ');
    throw new Error(`Invalid remediation input: ${detail}`);
  }
  return result.data;
}

export function assertCompleteRemediationPopulation(input: {
  rows: RemediationRow[];
  liveVenueIds: string[];
}): void {
  if (input.liveVenueIds.length === 0) {
    throw new Error('Live venue population is empty');
  }

  const inputIds = new Set(input.rows.map((row) => row.id));
  const liveIds = new Set(input.liveVenueIds);
  const isExactPopulation =
    inputIds.size === input.rows.length &&
    liveIds.size === input.liveVenueIds.length &&
    inputIds.size === liveIds.size &&
    [...inputIds].every((id) => liveIds.has(id));

  if (!isExactPopulation) {
    throw new Error(
      `Remediation population mismatch: input=${inputIds.size}, live=${liveIds.size}`,
    );
  }
}

/**
 * Deterministic one-time remediation planner. Database callers apply each
 * returned update atomically with its provenance and persist every outcome.
 * Venue identity is never de-duplicated, even when Place IDs are shared.
 */
export async function remediateOpeningHoursRows(input: {
  rows: RemediationRow[];
  now?: Date;
}): Promise<{
  updates: RemediationUpdate[];
  outcomes: RemediationOutcome[];
}> {
  const updates: RemediationUpdate[] = [];
  const outcomes: RemediationOutcome[] = [];
  const now = input.now ?? new Date();

  for (const row of input.rows) {
    if (
      !row.evidence ||
      !hoursSourceTypeSchema.safeParse(row.evidence.sourceType).success
    ) {
      updates.push({
        id: row.id,
        expectedUpdatedAt: row.updatedAt,
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
        reason: 'provenance_removed',
      });
      continue;
    }

    const classified = classifyHoursEvidence(
      {
        ...row.evidence,
        schedule: row.openingHours,
      },
      now,
    );
    if (classified.kind === 'accepted') {
      updates.push({
        id: row.id,
        expectedUpdatedAt: row.updatedAt,
        openingHours: classified.schedule,
        provenance: classified.provenance,
        reviewStatus: classified.provenance.reviewStatus,
        reviewReason: classified.provenance.reviewReason ?? null,
        lastErrorClass: classified.provenance.lastErrorClass ?? null,
      });
      outcomes.push({
        venueId: row.id,
        venueSlug: row.slug,
        outcome: classified.schedule === null ? 'unknown' : 'retained',
        reason: classified.schedule === null ? 'hours_unknown' : 'verified_evidence',
      });
    } else if (classified.kind === 'manual_review') {
      const reviewReason = {
        split: 'unsupported_split',
        unsupported_24_7: 'unsupported_24_7',
        seasonal: 'unsupported_seasonal',
        holiday_specific: 'unsupported_holiday_specific',
      }[classified.reason] as z.infer<typeof hoursAuditReasonSchema>;
      updates.push({
        id: row.id,
        expectedUpdatedAt: row.updatedAt,
        openingHours: null,
        provenance: {
          ...classified.provenance,
          reviewStatus: 'manual_review',
          reviewReason,
        },
        reviewStatus: 'manual_review',
        reviewReason,
        lastErrorClass: null,
        preservesPriorSchedule: true,
      });
      outcomes.push({
        venueId: row.id,
        venueSlug: row.slug,
        outcome: 'manual_review',
        reason: classified.reason,
      });
    } else {
      const parsedProvenance = safeParseHoursProvenance(
        {
          sourceType: row.evidence.sourceType,
          sourceReference: row.evidence.sourceReference,
          reviewedAt: row.evidence.reviewedAt,
          nextReviewAt: row.evidence.nextReviewAt,
          reviewStatus: 'failed',
          reviewReason: 'classification_failed',
          lastErrorClass: 'validation_failed',
          notes: row.evidence.notes,
        },
        now,
      );
      updates.push({
        id: row.id,
        expectedUpdatedAt: row.updatedAt,
        openingHours: null,
        provenance: parsedProvenance.success ? parsedProvenance.data : null,
        reviewStatus: 'failed',
        reviewReason: 'classification_failed',
        lastErrorClass: 'validation_failed',
        preservesPriorSchedule: true,
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

function safeParseHoursProvenance(
  value: unknown,
  now: Date,
):
  | { success: true; data: HoursProvenance }
  | { success: false } {
  return createHoursProvenanceSchema(now).safeParse(value);
}
