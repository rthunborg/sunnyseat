import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { persistVenueFeedback } from '@/lib/services/venue-feedback-persistence';
import { VENUE_FIXTURE } from '@/lib/services/venues-fixture';
import type {
  FeedbackResponse,
  FeedbackSunAccuracy,
  SubmitFeedbackRequest,
  VenueSunStatus,
} from '@/lib/types/api';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

const NOTE_MAX_LENGTH = 500;
const UNSAFE_CONTROL_CHARACTER_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;
const PREDICTED_STATES = ['Sunny', 'Partial', 'Shaded', 'NoSun'] as const satisfies VenueSunStatus[];
const SUN_ACCURACY_VALUES = ['sunny', 'not_sunny', 'unsure'] as const satisfies FeedbackSunAccuracy[];

const feedbackSchema = z.object({
  venueId: z.string().trim().min(1).max(80).optional(),
  venueSlug: z.string().trim().min(1).max(120).optional(),
  userTimestamp: z.iso.datetime({ offset: true }),
  predictedState: z.enum(PREDICTED_STATES),
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
  if (value.note && UNSAFE_CONTROL_CHARACTER_PATTERN.test(value.note)) {
    ctx.addIssue({
      code: 'custom',
      path: ['note'],
      message: 'note contains invalid control characters',
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

export async function POST(request: NextRequest, context: RouteContext) {
  let identifier: string;
  try {
    identifier = decodeURIComponent((await context.params).slug);
  } catch {
    return jsonError('Invalid venue identifier', 400);
  }

  const venue = VENUE_FIXTURE.find((candidate) =>
    candidate.id === identifier ||
    candidate.venueId === identifier ||
    candidate.slug === identifier ||
    candidate.venueSlug === identifier,
  );
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
  const wasSunny = body.wasSunny ?? wasSunnyFromSunAccuracy(body.sunAccuracy);

  const response: FeedbackResponse = {
    id: createFeedbackId(),
    venueId: venue.id,
    venueSlug: venue.slug,
    userTimestamp: body.userTimestamp,
    predictedState: body.predictedState,
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
