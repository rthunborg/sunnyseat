export const VENUE_QUERY_RETRY_ATTEMPTS = 3;
export const VENUE_QUERY_RETRY_DELAY_MS = 1000;
export const VENUE_QUERY_RETRY_DELAY_MAX_MS = 30_000;

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

function isClientHttpError(error: Error): boolean {
  return /failed:\s4\d\d\b/i.test(error.message);
}
