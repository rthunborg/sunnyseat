import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  authorizeVenueDiagnosticsOwner,
  VENUE_DIAGNOSTICS_TOKEN_ENV,
} from '@/lib/services/venue-diagnostics-auth';

const ownerToken = 'owner_diagnostics_token_abcdefghijklmnopqrstuvwxyz0123456789';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('venue diagnostics owner bearer authentication', () => {
  it.each([undefined, '', 'too-short', 'contains spaces but is deliberately long enough to fail']) (
    'fails closed when server configuration is unsafe: %s',
    async (configured) => {
      if (configured !== undefined) vi.stubEnv(VENUE_DIAGNOSTICS_TOKEN_ENV, configured);
      else vi.stubEnv(VENUE_DIAGNOSTICS_TOKEN_ENV, '');
      await expect(authorizeVenueDiagnosticsOwner(request(ownerToken))).resolves.toEqual({
        status: 'unconfigured',
      });
    },
  );

  it.each([
    [null, 'missing'],
    ['Basic abc', 'wrong scheme'],
    ['Bearer short', 'wrong token'],
    [`Bearer ${ownerToken} extra`, 'malformed'],
    [`Bearer ${'a'.repeat(257)}`, 'oversized'],
  ])('rejects %s without revealing credential details', async (authorization, _label) => {
    vi.stubEnv(VENUE_DIAGNOSTICS_TOKEN_ENV, ownerToken);
    await expect(authorizeVenueDiagnosticsOwner(request(authorization))).resolves.toEqual({
      status: 'unauthorized',
    });
  });

  it('accepts only the exact configured owner token', async () => {
    vi.stubEnv(VENUE_DIAGNOSTICS_TOKEN_ENV, ownerToken);
    await expect(authorizeVenueDiagnosticsOwner(request(ownerToken))).resolves.toEqual({
      status: 'authorized',
      ownerId: 'configured-owner-token',
    });
    await expect(authorizeVenueDiagnosticsOwner(request(`${ownerToken}x`))).resolves.toEqual({
      status: 'unauthorized',
    });
  });
});

function request(tokenOrHeader: string | null): Request {
  const authorization = tokenOrHeader === null
    ? undefined
    : tokenOrHeader.includes(' ')
      ? tokenOrHeader
      : `Bearer ${tokenOrHeader}`;
  return new Request('https://sunnyseat.example/api/owner/venue-diagnostics', {
    headers: authorization ? { authorization } : undefined,
  });
}
