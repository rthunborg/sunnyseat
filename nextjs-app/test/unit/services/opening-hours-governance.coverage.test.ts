import { describe, expect, test } from 'vitest';
import {
  classifyHoursEvidence,
  planCanonicalHoursUpdate,
  remediateOpeningHoursRows,
} from '@/lib/services/opening-hours-governance';

const REVIEWED_AT = '2026-07-13T10:00:00.000Z';
const NEXT_REVIEW_AT = '2026-10-13T10:00:00.000Z';
const eligibleEvidence = {
  sourceType: 'venue_website',
  sourceReference: 'https://venue.example/oppettider',
  reviewedAt: REVIEWED_AT,
  nextReviewAt: NEXT_REVIEW_AT,
};

describe('[12.1 AC3/AC4] governance validation boundaries', () => {
  test('[P1] eligible provenance is normalized and receives the verified default', () => {
    const result = classifyHoursEvidence({
      ...eligibleEvidence,
      sourceReference: '  https://venue.example/oppettider  ',
      notes: '  owner attestation  ',
      schedule: { '1': { open: '00:00', close: '23:59' } },
    });

    expect(result).toMatchObject({
      kind: 'accepted',
      provenance: {
        sourceType: 'venue_website',
        sourceReference: 'https://venue.example/oppettider',
        reviewStatus: 'verified',
        notes: 'owner attestation',
      },
    });
  });

  test.each([
    ['ineligible source', { sourceType: 'google' }],
    ['blank source reference', { sourceReference: '   ' }],
    ['invalid review timestamp', { reviewedAt: 'not-a-timestamp' }],
    [
      'next review before review',
      {
        reviewedAt: '2026-07-13T10:00:00.000Z',
        nextReviewAt: '2026-07-12T10:00:00.000Z',
      },
    ],
  ])('[P1] rejects %s as invalid provenance', (_label, override) => {
    expect(
      classifyHoursEvidence({
        ...eligibleEvidence,
        ...override,
        schedule: { '1': { open: '11:00', close: '22:00' } },
      }),
    ).toEqual({ kind: 'failed', errorClass: 'invalid_provenance' });
  });

  test('[P1] accepts exact HH:MM boundaries and past-midnight ordering', () => {
    const schedule = {
      '1': { open: '00:00', close: '23:59' },
      '7': { open: '23:59', close: '00:00' },
    };

    expect(
      classifyHoursEvidence({ ...eligibleEvidence, schedule }),
    ).toMatchObject({ kind: 'accepted', schedule });
  });

  test.each([
    ['empty schedule', {}],
    [
      'weekday outside ISO range',
      { '8': { open: '11:00', close: '22:00' } },
    ],
    [
      'hour outside 24-hour range',
      { '1': { open: '24:00', close: '22:00' } },
    ],
    [
      'minute outside range',
      { '1': { open: '11:00', close: '12:60' } },
    ],
    [
      'extra interval field',
      { '1': { open: '11:00', close: '22:00', timezone: 'Europe/Stockholm' } },
    ],
  ])('[P1] rejects %s without partial coercion', (_label, schedule) => {
    expect(
      classifyHoursEvidence({ ...eligibleEvidence, schedule }),
    ).toEqual({ kind: 'failed', errorClass: 'malformed_schedule' });
  });
});

describe('[12.1 AC3/AC4] canonical update and remediation edges', () => {
  test('[P1] key ordering does not turn an identical canonical state into a write', () => {
    const outcome = classifyHoursEvidence({
      ...eligibleEvidence,
      schedule: {
        '1': { open: '11:00', close: '22:00' },
        '2': null,
      },
    });
    expect(outcome.kind).toBe('accepted');

    expect(
      planCanonicalHoursUpdate({
        current: {
          schedule: {
            '2': null,
            '1': { close: '22:00', open: '11:00' },
          },
          provenance: {
            reviewStatus: 'verified',
            nextReviewAt: NEXT_REVIEW_AT,
            reviewedAt: REVIEWED_AT,
            sourceReference: eligibleEvidence.sourceReference,
            sourceType: eligibleEvidence.sourceType,
          },
        },
        outcome,
      }),
    ).toEqual({ shouldWrite: false, idempotent: true });
  });

  test('[P1] accepted whole-field unknown writes null and provenance atomically', () => {
    const outcome = classifyHoursEvidence({
      ...eligibleEvidence,
      reviewStatus: 'unknown',
      schedule: null,
    });
    expect(outcome.kind).toBe('accepted');

    expect(
      planCanonicalHoursUpdate({ current: null, outcome }),
    ).toMatchObject({
      shouldWrite: true,
      schedule: null,
      provenance: expect.objectContaining({ reviewStatus: 'unknown' }),
    });
  });

  test('[P1] remediation preserves manual-review and failed schedules while updating accepted unknown', async () => {
    const result = await remediateOpeningHoursRows({
      rows: [
        {
          id: 'manual',
          slug: 'manual',
          openingHours: {
            '1': [
              { open: '11:00', close: '14:00' },
              { open: '17:00', close: '23:00' },
            ],
          },
          evidence: eligibleEvidence,
        },
        {
          id: 'failed',
          slug: 'failed',
          openingHours: { '1': { open: '11', close: '22:00' } },
          evidence: eligibleEvidence,
        },
        {
          id: 'unknown',
          slug: 'unknown',
          openingHours: null,
          evidence: { ...eligibleEvidence, reviewStatus: 'unknown' },
        },
      ],
    });

    expect(result.updates).toEqual([
      expect.objectContaining({
        id: 'unknown',
        openingHours: null,
        reviewStatus: 'unknown',
      }),
    ]);
    expect(result.outcomes).toEqual([
      expect.objectContaining({ venueId: 'manual', outcome: 'manual_review' }),
      expect.objectContaining({ venueId: 'failed', outcome: 'failed' }),
      expect.objectContaining({ venueId: 'unknown', outcome: 'retained' }),
    ]);
  });
});
