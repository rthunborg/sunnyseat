import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { persistVenueFeedback } from '@/lib/services/venue-feedback-persistence';
import {
  isSafePublicVenueIdentifier,
  resolvePublicVenueIdentifier,
} from '@/lib/services/venue-store';
import {
  buildPersistedSunOutcome,
  SunGeometryCoverageMissingError,
} from '@/lib/services/sun-geometry-repository';
import { publicSunVerdictFor } from '@/lib/utils/public-sun';
import type {
  FeedbackResponse,
  FeedbackSunAccuracy,
  SubmitFeedbackRequest,
  VenueSunStatus,
  WeatherGateState,
} from '@/lib/types/api';
import { withRequestLogging } from '@/lib/middleware/request-logger';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

const NOTE_MAX_LENGTH = 500;
const VENUE_IDENTIFIER_MAX_LENGTH = 120;
const UNSAFE_NOTE_CONTROL_CHARACTER_PATTERN =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;
const GEOMETRY_INPUT_HASH_PATTERN = /^g1:[0-9a-f]{64}$/u;
// STORY 10 review [Patch][High]: `predictedState` MUST accept the FULL
// VenueSunStatus union — on the live real-engine path a detail view's
// `predictedState` can be `'CloudObscured'` (weather-gated), and that value is
// POSTed here verbatim by FeedbackFlow. A `satisfies VenueSunStatus[]` check
// only verifies MEMBERSHIP, not EXHAUSTIVENESS, so a union value missing from the
// literal array is NOT a type error (that is exactly how `'CloudObscured'` slipped
// through). Deriving the array from a `Record<VenueSunStatus, true>` makes it
// exhaustiveness-forcing: adding a member to the union without listing it here is
// now a compile error, so this boundary can never silently drop a future value.
const PREDICTED_STATE_MEMBERS = {
  Sunny: true,
  Partial: true,
  Shaded: true,
  NoSun: true,
  CloudObscured: true,
} as const satisfies Record<VenueSunStatus, true>;
const PREDICTED_STATES = Object.keys(PREDICTED_STATE_MEMBERS) as [VenueSunStatus, ...VenueSunStatus[]];
const SUN_ACCURACY_VALUES = ['sunny', 'not_sunny', 'unsure'] as const satisfies FeedbackSunAccuracy[];

const feedbackSchema = z.object({
  venueId: z.string().trim().min(1).max(80)
    .refine(isSafePublicVenueIdentifier, 'venueId contains invalid control characters')
    .optional(),
  venueSlug: z.string().trim().min(1).max(120)
    .refine(isSafePublicVenueIdentifier, 'venueSlug contains invalid control characters')
    .optional(),
  userTimestamp: z.iso.datetime({ offset: true }),
  predictedState: z.enum(PREDICTED_STATES),
  sunExposurePercent: z.number().int().min(0).max(100),
  publicSunVerdict: z.enum(['amber', 'grey']),
  weatherGated: z.boolean(),
  weatherUnknown: z.boolean(),
  geometryInputHash: z.string().regex(GEOMETRY_INPUT_HASH_PATTERN),
  confidenceAtPrediction: z.number().min(0).max(100).optional(),
  sunAccuracy: z.enum(SUN_ACCURACY_VALUES).optional(),
  wasSunny: z.boolean().optional(),
  outdoorSeatingConfirmed: z.boolean().optional(),
  note: z.string()
    .max(NOTE_MAX_LENGTH)
    .transform((value) => value.replace(/\r\n?/g, '\n').trim())
    .optional(),
}).strict().superRefine((value, ctx) => {
  if (
    value.sunAccuracy === undefined &&
    value.wasSunny === undefined &&
    value.outdoorSeatingConfirmed === undefined &&
    !value.note
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['feedback'],
      message: 'At least one feedback answer or note is required',
    });
  }
  if (value.note && UNSAFE_NOTE_CONTROL_CHARACTER_PATTERN.test(value.note)) {
    ctx.addIssue({
      code: 'custom',
      path: ['note'],
      message: 'note contains invalid control characters',
    });
  }
  if (value.weatherGated && value.weatherUnknown) {
    ctx.addIssue({
      code: 'custom',
      path: ['weatherGated'],
      message: 'weatherGated and weatherUnknown cannot both be true',
    });
  }
  const weatherGateState = weatherGateStateFromFeedbackEvidence(value);
  const expectedVerdict = publicSunVerdictFor({
    sunExposurePercent: value.sunExposurePercent,
    weatherGateState,
  });
  if (value.publicSunVerdict !== expectedVerdict) {
    ctx.addIssue({
      code: 'custom',
      path: ['publicSunVerdict'],
      message: 'publicSunVerdict does not match prediction evidence',
    });
  }
  if (
    (value.sunAccuracy === 'sunny' && value.wasSunny === false) ||
    (value.sunAccuracy === 'not_sunny' && value.wasSunny === true) ||
    (value.sunAccuracy === 'unsure' && value.wasSunny !== undefined)
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['sunAccuracy'],
      message: 'sunAccuracy does not match wasSunny',
    });
  }
});

async function postVenueFeedbackHandler(request: NextRequest, context: RouteContext) {
  let identifier: string;
  try {
    identifier = decodeURIComponent((await context.params).slug);
  } catch {
    return jsonError('Invalid venue identifier', 400);
  }
  if (
    identifier.length > VENUE_IDENTIFIER_MAX_LENGTH ||
    !isSafePublicVenueIdentifier(identifier)
  ) {
    return jsonError('Invalid venue identifier', 400);
  }

  let venue;
  try {
    // Fixture mode fallback is centralized in the Story 12.7 resolver. This route
    // never does route-local VENUE_FIXTURE matching in live mode.
    venue = await resolvePublicVenueIdentifier(identifier);
  } catch {
    return jsonError('Venue store unavailable', 503);
  }
  if (!venue) return jsonError(`Venue not found: ${identifier}`, 404);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError('Request body must be valid JSON', 400);
  }

  const parsed = feedbackSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        title: 'Invalid feedback payload',
        detail: 'Feedback payload failed validation',
        status: 400,
        errors: z.flattenError(parsed.error).fieldErrors,
      },
      { status: 400 },
    );
  }

  const body = parsed.data satisfies SubmitFeedbackRequest;
  if (body.venueId && body.venueId !== venue.id && body.venueId !== venue.venueId) {
    return jsonError('Body venueId does not match path venue', 409);
  }
  if (body.venueSlug && body.venueSlug !== venue.slug && body.venueSlug !== venue.venueSlug) {
    return jsonError('Body venueSlug does not match path venue', 409);
  }
  let predictionEvidence: PredictionEvidence;
  try {
    const requestedAt = new Date(body.userTimestamp);
    const outcome = await buildPersistedSunOutcome(venue, requestedAt, new Date());
    predictionEvidence = {
      predictedState: outcome.venue.currentSunStatus,
      sunExposurePercent: outcome.venue.sunExposurePercent,
      weatherGated: outcome.venue.weatherGateState === 'gated',
      weatherUnknown: outcome.venue.weatherGateState === 'unknown',
      geometryInputHash: outcome.venue.predictionEvidence?.geometryInputHash,
      publicSunVerdict: publicSunVerdictFor(outcome.venue),
    };
  } catch (error) {
    if (error instanceof SunGeometryCoverageMissingError) {
      return jsonError('Current prediction evidence unavailable', 503);
    }
    throw error;
  }
  if (!isCompletePredictionEvidence(predictionEvidence)) {
    return jsonError('Current prediction evidence unavailable', 503);
  }
  if (!feedbackMatchesServerPrediction(body, predictionEvidence)) {
    return jsonError('Feedback prediction evidence is stale or invalid', 409);
  }

  const wasSunny = body.wasSunny ?? wasSunnyFromSunAccuracy(body.sunAccuracy);

  const response: FeedbackResponse = {
    id: createFeedbackId(),
    venueId: venue.id,
    venueSlug: venue.slug,
    userTimestamp: body.userTimestamp,
    predictedState: predictionEvidence.predictedState,
    sunExposurePercent: predictionEvidence.sunExposurePercent,
    publicSunVerdict: predictionEvidence.publicSunVerdict,
    weatherGated: predictionEvidence.weatherGated,
    weatherUnknown: predictionEvidence.weatherUnknown,
    geometryInputHash: predictionEvidence.geometryInputHash,
    ...(body.sunAccuracy !== undefined ? { sunAccuracy: body.sunAccuracy } : {}),
    ...(wasSunny !== undefined ? { wasSunny } : {}),
    ...(body.outdoorSeatingConfirmed !== undefined
      ? { outdoorSeatingConfirmed: body.outdoorSeatingConfirmed }
      : {}),
    ...(body.confidenceAtPrediction !== undefined
      ? { confidenceAtPrediction: body.confidenceAtPrediction }
      : {}),
    ...(body.note ? { note: body.note } : {}),
    createdAt: new Date().toISOString(),
  };

  try {
    const persisted = await persistVenueFeedback(response);
    return NextResponse.json(persisted, { status: 201 });
  } catch {
    return jsonError('Feedback persistence unavailable', 503);
  }
}

function jsonError(detail: string, status: number) {
  return NextResponse.json({ detail, status }, { status });
}

function createFeedbackId() {
  return globalThis.crypto?.randomUUID?.() ?? `feedback_${Date.now()}`;
}

function wasSunnyFromSunAccuracy(
  sunAccuracy: SubmitFeedbackRequest['sunAccuracy'],
): boolean | undefined {
  if (sunAccuracy === 'sunny') return true;
  if (sunAccuracy === 'not_sunny') return false;
  return undefined;
}

export const POST = withRequestLogging(postVenueFeedbackHandler);

function weatherGateStateFromFeedbackEvidence(
  value: Pick<SubmitFeedbackRequest, 'weatherGated' | 'weatherUnknown'>,
): WeatherGateState {
  if (value.weatherGated) return 'gated';
  if (value.weatherUnknown) return 'unknown';
  return 'not_gated';
}

type PredictionEvidence = {
  predictedState: VenueSunStatus;
  sunExposurePercent: number;
  publicSunVerdict: SubmitFeedbackRequest['publicSunVerdict'];
  weatherGated: boolean;
  weatherUnknown: boolean;
  geometryInputHash: string | undefined;
};

function isCompletePredictionEvidence(
  evidence: PredictionEvidence,
): evidence is PredictionEvidence & { geometryInputHash: string } {
  return GEOMETRY_INPUT_HASH_PATTERN.test(evidence.geometryInputHash ?? '');
}

function feedbackMatchesServerPrediction(
  body: SubmitFeedbackRequest,
  evidence: PredictionEvidence & { geometryInputHash: string },
): boolean {
  return body.predictedState === evidence.predictedState &&
    body.sunExposurePercent === evidence.sunExposurePercent &&
    body.publicSunVerdict === evidence.publicSunVerdict &&
    body.weatherGated === evidence.weatherGated &&
    body.weatherUnknown === evidence.weatherUnknown &&
    body.geometryInputHash === evidence.geometryInputHash;
}
