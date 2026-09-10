import { describe, expect, it } from 'vitest';
import {
  VENUE_DIAGNOSTICS_MAX_LIMIT,
  parseVenueDiagnosticsRequest,
} from '@/lib/services/venue-diagnostics-request';

const now = new Date('2026-09-09T22:30:00.000Z'); // 2026-09-10 00:30 Stockholm

describe('venue diagnostics request parsing', () => {
  it('captures the current instant exactly and defaults to a full bounded venue page', () => {
    expect(parseVenueDiagnosticsRequest(new URLSearchParams(), now)).toEqual({
      ok: true,
      value: {
        requestedAt: now,
        mode: 'current',
        offset: 0,
        limit: VENUE_DIAGNOSTICS_MAX_LIMIT,
      },
    });
  });

  it('uses the shared Stockholm planner convention across the UTC date boundary', () => {
    const result = parseVenueDiagnosticsRequest(
      new URLSearchParams('venue=test-venue-sunny&date=2026-09-10&time=06%3A00&limit=1'),
      now,
    );
    expect(result).toMatchObject({
      ok: true,
      value: { venueIdentifier: 'test-venue-sunny', mode: 'selected', limit: 1 },
    });
    if (result.ok) expect(result.value.requestedAt.toISOString()).toBe('2026-09-10T04:00:00.000Z');
  });

  it.each([
    ['date=2026-09-10', 'single date and a single time'],
    ['date=2026-09-10&time=05%3A59', 'Invalid planner time'],
    ['limit=101', 'limit must be between'],
    ['limit=1.5', 'limit must be a single integer'],
    ['offset=-1', 'offset must be a single integer'],
    ['wat=1', 'Unknown query parameter'],
    ['venue=a&venue=b', 'single venue'],
  ])('rejects invalid input %s', (query, detail) => {
    expect(parseVenueDiagnosticsRequest(new URLSearchParams(query), now)).toMatchObject({
      ok: false,
      detail: expect.stringContaining(detail),
    });
  });
});
