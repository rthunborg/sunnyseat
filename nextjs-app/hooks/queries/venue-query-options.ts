export const VENUE_QUERY_RETRY_ATTEMPTS = 3;
export const VENUE_QUERY_RETRY_DELAY_MS = 1000;
export const VENUE_QUERY_RETRY_DELAY_MAX_MS = 30_000;

/**
 * Error carrying the originating HTTP status, so not-found / client-error
 * detection keys off the numeric status rather than the human-readable message
 * (Story 8.2, AC #4 — carried from Story 3.4 review R2-D2). The message text is
 * preserved verbatim so the message-regex fallback below still applies to any
 * error thrown without a status.
 */
export class HttpError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export function shouldRetryVenueQuery(failureCount: number, error: Error): boolean {
  if (isClientHttpError(error)) return false;
  return failureCount < VENUE_QUERY_RETRY_ATTEMPTS;
}

export function venueQueryRetryDelay(attemptIndex: number): number {
  return Math.min(
    VENUE_QUERY_RETRY_DELAY_MS * 2 ** attemptIndex,
    VENUE_QUERY_RETRY_DELAY_MAX_MS,
  );
}

function httpStatusFromError(error: unknown): number | undefined {
  // Only our deliberate HttpError carries a trusted HTTP status. A foreign
  // error that merely happens to expose a `status` field — or a non-integer /
  // negative one — is ignored and falls through to the message-regex fallback.
  // [Story 8.2 review R1-P5]
  if (error instanceof HttpError && Number.isInteger(error.status)) {
    return error.status;
  }
  return undefined;
}

function isClientHttpError(error: Error): boolean {
  const status = httpStatusFromError(error);
  if (status !== undefined) return status >= 400 && status <= 499;
  // Defensive fallback for errors thrown without a numeric status.
  return /failed:\s4\d\d\b/i.test(error.message);
}

export function isVenueNotFoundError(error: Error | null | undefined): boolean {
  if (!error) return false;
  const status = httpStatusFromError(error);
  if (status !== undefined) return status === 404;
  // Defensive fallback for errors thrown without a numeric status.
  return /failed:\s404\b/i.test(error.message);
}
