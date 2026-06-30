import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  checkRateLimit,
  clearVenueRateLimitForTests,
  clientKeyFromForwardedFor,
  clientKeyFromHeaders,
  MISSING_CLIENT_RATE_LIMIT_KEY,
  RATE_LIMIT_MAX_REQUESTS,
} from '@/lib/utils/rate-limit';

describe('rate-limit (Story 9.3 — extracted from the venues route to Edge middleware)', () => {
  beforeEach(() => clearVenueRateLimitForTests());
  afterEach(() => clearVenueRateLimitForTests());

  describe('clientKeyFromForwardedFor — Edge-safe IP validation (no node:net)', () => {
    it('accepts a valid IPv4 and lowercases it', () => {
      expect(clientKeyFromForwardedFor('203.0.113.8')).toBe('203.0.113.8');
    });

    it('takes the first IP from a comma-separated chain', () => {
      expect(clientKeyFromForwardedFor('203.0.113.8, 70.41.3.18')).toBe('203.0.113.8');
    });

    it('accepts valid IPv6 (full, compressed, and v4-mapped)', () => {
      expect(clientKeyFromForwardedFor('2001:db8:85a3:0:0:8a2e:370:7334')).toBe(
        '2001:db8:85a3:0:0:8a2e:370:7334',
      );
      expect(clientKeyFromForwardedFor('2001:db8::1')).toBe('2001:db8::1');
      expect(clientKeyFromForwardedFor('::1')).toBe('::1');
      expect(clientKeyFromForwardedFor('::ffff:192.168.1.1')).toBe('::ffff:192.168.1.1');
    });

    it('rejects malformed addresses as "invalid"', () => {
      expect(clientKeyFromForwardedFor('999.999.999.999')).toBe('invalid');
      expect(clientKeyFromForwardedFor('not-an-ip')).toBe('invalid');
      expect(clientKeyFromForwardedFor('1.2.3')).toBe('invalid');
      expect(clientKeyFromForwardedFor('1.2.3.4.5')).toBe('invalid');
      expect(clientKeyFromForwardedFor('2001:db8::1::2')).toBe('invalid'); // two "::"
      expect(clientKeyFromForwardedFor('gggg::1')).toBe('invalid');
    });

    it('rejects header-injection / overlong values', () => {
      expect(clientKeyFromForwardedFor('1.2.3.4\r\nX: y')).toBe('invalid');
      expect(clientKeyFromForwardedFor('a'.repeat(65))).toBe('invalid');
    });

    it('maps a null header to the missing-client sentinel', () => {
      expect(clientKeyFromForwardedFor(null)).toBe(MISSING_CLIENT_RATE_LIMIT_KEY);
    });
  });

  describe('clientKeyFromHeaders', () => {
    it('prefers x-forwarded-for, falls back to x-real-ip, else the sentinel', () => {
      expect(
        clientKeyFromHeaders(new Headers({ 'x-forwarded-for': '203.0.113.8' })),
      ).toBe('203.0.113.8');
      expect(
        clientKeyFromHeaders(new Headers({ 'x-forwarded-for': '   ', 'x-real-ip': '203.0.113.44' })),
      ).toBe('203.0.113.44');
      expect(clientKeyFromHeaders(new Headers())).toBe(MISSING_CLIENT_RATE_LIMIT_KEY);
    });
  });

  describe('checkRateLimit token bucket', () => {
    it('allows up to the quota then blocks within the window', () => {
      const key = 'test-bucket';
      const now = 1_000_000;
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        expect(checkRateLimit(key, now)).toBe(true);
      }
      expect(checkRateLimit(key, now)).toBe(false); // quota exhausted
    });

    it('resets after the window elapses', () => {
      const key = 'test-bucket-reset';
      const start = 2_000_000;
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) checkRateLimit(key, start);
      expect(checkRateLimit(key, start)).toBe(false);
      // A full window later the bucket is swept/reset.
      expect(checkRateLimit(key, start + 61_000)).toBe(true);
    });

    it('tracks distinct keys independently', () => {
      const now = 3_000_000;
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) checkRateLimit('ip-a', now);
      expect(checkRateLimit('ip-a', now)).toBe(false);
      expect(checkRateLimit('ip-b', now)).toBe(true); // independent bucket
    });
  });
});
