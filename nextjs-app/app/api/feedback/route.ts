import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { persistAppFeedback } from '@/lib/services/app-feedback-persistence';
import type { AppFeedbackResponse, SubmitAppFeedbackRequest } from '@/lib/types/api';
import { withRequestLogging } from '@/lib/middleware/request-logger';

const COMMENT_MAX_LENGTH = 500;

// Reject C0/C1-style control characters (except tab/newline) without a regex
// literal, which keeps the source free of embedded control bytes.
function hasUnsafeControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    const isControl =
      code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127;
    if (isControl) return true;
  }
  return false;
}

const appFeedbackSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z
      .string()
      .max(COMMENT_MAX_LENGTH)
      .transform((value) => value.replace(/\r\n?/g, '\n').trim())
      .optional(),
    locale: z.string().trim().min(2).max(10).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.comment && hasUnsafeControlCharacters(value.comment)) {
      ctx.addIssue({
        code: 'custom',
        path: ['comment'],
        message: 'comment contains invalid control characters',
      });
    }
  });

async function postFeedbackHandler(request: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError('Request body must be valid JSON', 400);
  }

  const parsed = appFeedbackSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        title: 'Invalid feedback payload',
        detail: 'App feedback payload failed validation',
        status: 400,
        errors: z.flattenError(parsed.error).fieldErrors,
      },
      { status: 400 },
    );
  }

  const body = parsed.data satisfies SubmitAppFeedbackRequest;
  const response: AppFeedbackResponse = {
    id: createFeedbackId(),
    rating: body.rating,
    ...(body.comment ? { comment: body.comment } : {}),
    ...(body.locale ? { locale: body.locale } : {}),
    createdAt: new Date().toISOString(),
  };

  try {
    const persisted = await persistAppFeedback(response);
    return NextResponse.json(persisted, { status: 201 });
  } catch {
    return jsonError('Feedback persistence unavailable', 503);
  }
}

export const POST = withRequestLogging(postFeedbackHandler);

function jsonError(detail: string, status: number) {
  return NextResponse.json({ detail, status }, { status });
}

function createFeedbackId() {
  return globalThis.crypto?.randomUUID?.() ?? `app_feedback_${Date.now()}`;
}
