import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { z } from 'zod';
import {
  getVenueReviewsFromPersistence,
  persistVenueReview,
  summarizeReviews,
} from '@/lib/services/venue-reviews-persistence';
import {
  isSafePublicVenueIdentifier,
  resolvePublicVenueIdentifier,
} from '@/lib/services/venue-store';
import type {
  GetReviewsResponse,
  ReviewDto,
  SubmitReviewRequest,
  SubmitReviewResponse,
} from '@/lib/types/api';

const REVIEW_TEXT_MAX_LENGTH = 1000;
const PHOTO_NAME_MAX_LENGTH = 120;
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const REVIEW_JSON_MAX_BYTES = 16 * 1024;
const UNSAFE_REVIEW_TEXT_CONTROL_CHARACTER_PATTERN =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const RATE_LIMIT_SWEEP_INTERVAL_MS = RATE_LIMIT_WINDOW_MS;
const MISSING_CLIENT_RATE_LIMIT_KEY = 'missing-client-ip';
let lastRateLimitSweepAt = 0;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const rateLimitBuckets = new Map<string, RateLimitBucket>();

const reviewSchema = z.object({
  venueId: z.string().trim().min(1).max(80)
    .refine(isSafePublicVenueIdentifier, 'venueId contains invalid control characters')
    .optional(),
  venueSlug: z.string().trim().min(1).max(120)
    .refine(isSafePublicVenueIdentifier, 'venueSlug contains invalid control characters')
    .optional(),
  text: z.string()
    .max(REVIEW_TEXT_MAX_LENGTH)
    .transform((value) => value.replace(/\r\n?/g, '\n').trim()),
  rating: z.number().int().min(1).max(5).optional(),
  photo: z.object({
    name: z.string().trim().min(1).max(PHOTO_NAME_MAX_LENGTH),
    type: z.string().trim().min(1).max(80),
    size: z.number().int().min(1).max(PHOTO_MAX_BYTES),
    lastModified: z.number().int().nonnegative().optional(),
  }).strict().optional(),
}).strict().superRefine((value, ctx) => {
  if (!value.venueId && !value.venueSlug) {
    ctx.addIssue({
      code: 'custom',
      path: ['venueId'],
      message: 'venueId or venueSlug is required',
    });
  }
  if (!value.text) {
    ctx.addIssue({
      code: 'custom',
      path: ['text'],
      message: 'text is required',
    });
  }
  if (UNSAFE_REVIEW_TEXT_CONTROL_CHARACTER_PATTERN.test(value.text)) {
    ctx.addIssue({
      code: 'custom',
      path: ['text'],
      message: 'text contains invalid control characters',
    });
  }
  if (value.photo && !value.photo.type.toLowerCase().startsWith('image/')) {
    ctx.addIssue({
      code: 'custom',
      path: ['photo', 'type'],
      message: 'photo type must be an image content type',
    });
  }
});

export async function GET(request: NextRequest) {
  const identifier = request.nextUrl.searchParams.get('venueId')?.trim();
  if (!identifier) return jsonError('venueId query parameter is required', 400);
  if (!isSafePublicVenueIdentifier(identifier)) {
    return jsonError('venueId contains invalid control characters', 400);
  }

  let venue;
  try {
    venue = await resolvePublicVenueIdentifier(identifier);
  } catch {
    return jsonError('Venue store unavailable', 503);
  }
  if (!venue) return jsonError(`Venue not found: ${identifier}`, 404);

  let reviews: ReviewDto[];
  try {
    reviews = await getVenueReviewsFromPersistence(venue);
  } catch {
    return jsonError('Review persistence unavailable', 503);
  }
  const response: GetReviewsResponse = {
    reviews,
    summary: summarizeReviews(reviews),
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST(request: NextRequest) {
  if (!isJsonRequest(request)) {
    return jsonError('Content-Type must be application/json', 415);
  }

  const contentLength = contentLengthBytes(request);
  if (contentLength !== null && contentLength > REVIEW_JSON_MAX_BYTES) {
    return jsonError('Review payload is too large', 413);
  }

  const clientKey = clientKeyFromRequest(request);
  if (clientKey === 'invalid') return jsonError('Invalid X-Forwarded-For header', 400);
  if (!checkRateLimit(clientKey)) {
    return NextResponse.json(
      { detail: 'Too many review requests', status: 429 },
      { status: 429 },
    );
  }

  const bodyRead = await readRequestTextWithLimit(request, REVIEW_JSON_MAX_BYTES);
  if (!bodyRead.ok) return jsonError(bodyRead.detail, bodyRead.status);
  const rawText = bodyRead.text;

  let rawBody: unknown;
  try {
    rawBody = JSON.parse(rawText) as unknown;
  } catch {
    return jsonError('Request body must be valid JSON', 400);
  }

  const parsed = reviewSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        title: 'Invalid review payload',
        detail: 'Review payload failed validation',
        status: 400,
        errors: z.flattenError(parsed.error).fieldErrors,
      },
      { status: 400 },
    );
  }

  const body = parsed.data satisfies SubmitReviewRequest;
  const primaryIdentifier = body.venueId ?? body.venueSlug ?? '';
  let venue;
  try {
    venue = await resolvePublicVenueIdentifier(primaryIdentifier);
  } catch {
    return jsonError('Venue store unavailable', 503);
  }
  if (!venue) return jsonError(`Venue not found: ${primaryIdentifier}`, 404);
  if (body.venueId && !identifierMatchesVenue(body.venueId, venue)) {
    return jsonError('Body venueId does not match venueSlug', 409);
  }
  if (body.venueSlug && !identifierMatchesVenue(body.venueSlug, venue)) {
    return jsonError('Body venueSlug does not match venueId', 409);
  }

  const review: ReviewDto = {
    id: createReviewId(),
    venueId: venue.id,
    venueSlug: venue.slug,
    text: body.text,
    ...(body.rating !== undefined ? { rating: body.rating } : {}),
    ...(body.photo ? { photo: body.photo } : {}),
    createdAt: new Date().toISOString(),
  };

  try {
    const persisted = await persistVenueReview(review);
    const response: SubmitReviewResponse = {
      review: persisted,
      summary: await summarizeVenueAfterPersist(venue, persisted),
      timestamp: new Date().toISOString(),
    };
    return NextResponse.json(response, { status: 201 });
  } catch {
    return jsonError('Review persistence unavailable', 503);
  }
}

export function clearReviewRateLimitForTests() {
  rateLimitBuckets.clear();
  lastRateLimitSweepAt = 0;
}

function jsonError(detail: string, status: number) {
  return NextResponse.json({ detail, status }, { status });
}

function isJsonRequest(request: NextRequest): boolean {
  const contentType = request.headers.get('content-type') ?? '';
  return contentType.toLowerCase().split(';')[0].trim() === 'application/json';
}

function contentLengthBytes(request: NextRequest): number | null {
  const raw = request.headers.get('content-length');
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

async function readRequestTextWithLimit(
  request: NextRequest,
  maxBytes: number,
): Promise<
  | { ok: true; text: string }
  | { ok: false; detail: string; status: number }
> {
  const body = request.body;
  if (!body) return { ok: true, text: '' };
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let byteLength = 0;
  let text = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > maxBytes) {
        await reader.cancel();
        return { ok: false, detail: 'Review payload is too large', status: 413 };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return { ok: true, text };
  } catch {
    return { ok: false, detail: 'Request body could not be read', status: 400 };
  }
}

function createReviewId() {
  return globalThis.crypto?.randomUUID?.() ?? `review_${Date.now()}`;
}

function clientKeyFromRequest(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor?.trim()) return hashedClientKeyFromForwardedFor(forwardedFor);
  const realIp = request.headers.get('x-real-ip');
  if (realIp?.trim()) return hashedClientKeyFromForwardedFor(realIp);
  return MISSING_CLIENT_RATE_LIMIT_KEY;
}

function hashedClientKeyFromForwardedFor(value: string): string {
  const [first] = value.split(',');
  const candidate = first.trim();
  if (!candidate || /[\r\n]/.test(candidate) || candidate.length > 64) return 'invalid';
  if (isIP(candidate) === 0) return 'invalid';
  return createHash('sha256')
    .update(candidate.toLowerCase())
    .digest('base64url');
}

function checkRateLimit(key: string, now = Date.now()): boolean {
  if (now - lastRateLimitSweepAt >= RATE_LIMIT_SWEEP_INTERVAL_MS) {
    for (const [bucketKey, bucket] of rateLimitBuckets) {
      if (bucket.resetAt <= now) rateLimitBuckets.delete(bucketKey);
    }
    lastRateLimitSweepAt = now;
  }
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) return false;
  bucket.count += 1;
  return true;
}

function identifierMatchesVenue(identifier: string, venue: {
  id: string;
  venueId: string;
  slug: string;
  venueSlug: string;
}): boolean {
  return identifier === venue.id ||
    identifier === venue.venueId ||
    identifier === venue.slug ||
    identifier === venue.venueSlug;
}

async function summarizeVenueAfterPersist(
  venue: Parameters<typeof getVenueReviewsFromPersistence>[0],
  persisted: ReviewDto,
) {
  try {
    return summarizeReviews(await getVenueReviewsFromPersistence(venue));
  } catch {
    return summarizeReviews([persisted]);
  }
}
