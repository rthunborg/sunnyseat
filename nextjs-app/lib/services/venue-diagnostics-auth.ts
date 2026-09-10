import { createHash, timingSafeEqual } from 'node:crypto';

export const VENUE_DIAGNOSTICS_TOKEN_ENV = 'SUNNYSEAT_OWNER_DIAGNOSTICS_TOKEN';
const MINIMUM_TOKEN_LENGTH = 43;
const MAXIMUM_TOKEN_LENGTH = 256;
const SAFE_TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/u;

export type VenueDiagnosticsAuthorization =
  | { status: 'authorized'; ownerId: string }
  | { status: 'unauthorized' }
  | { status: 'forbidden'; subjectId?: string }
  | { status: 'unconfigured' };

export async function authorizeVenueDiagnosticsOwner(
  request: Request,
): Promise<VenueDiagnosticsAuthorization> {
  const configuredToken = process.env[VENUE_DIAGNOSTICS_TOKEN_ENV];
  if (!isSafeConfiguredToken(configuredToken)) return { status: 'unconfigured' };

  const suppliedToken = bearerToken(request.headers.get('authorization'));
  if (!suppliedToken) return { status: 'unauthorized' };

  const expectedDigest = createHash('sha256').update(configuredToken, 'utf8').digest();
  const suppliedDigest = createHash('sha256').update(suppliedToken, 'utf8').digest();
  return timingSafeEqual(expectedDigest, suppliedDigest)
    ? { status: 'authorized', ownerId: 'configured-owner-token' }
    : { status: 'unauthorized' };
}

function isSafeConfiguredToken(value: string | undefined): value is string {
  return typeof value === 'string' &&
    value.length >= MINIMUM_TOKEN_LENGTH &&
    value.length <= MAXIMUM_TOKEN_LENGTH &&
    SAFE_TOKEN_PATTERN.test(value);
}

function bearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = /^Bearer ([A-Za-z0-9_-]+)$/iu.exec(authorization);
  const token = match?.[1];
  return token && token.length <= MAXIMUM_TOKEN_LENGTH ? token : null;
}
