import { describe, expect, test, vi } from 'vitest';
import {
  classifyHoursAuditVenue,
  runOpeningHoursAudit,
} from '@/lib/services/opening-hours-audit';

const NOW = new Date('2026-07-13T10:00:00.000Z');
const HOURS = { '1': { open: '11:00', close: '22:00' } };

describe('[12.1 AC5] audit classification boundaries', () => {
  test('[P1] a verified row before both cutoffs is current', () => {
    expect(
      classifyHoursAuditVenue({
        venue: {
          openingHours: HOURS,
          provenance: {
            reviewStatus: 'verified',
            reviewedAt: '2026-07-12T10:00:00.000Z',
            nextReviewAt: '2026-07-14T10:00:00.000Z',
          },
        },
        now: NOW,
      }),
    ).toEqual({ outcome: 'current', reason: 'review_current' });
  });

  test('[P1] next-review equality is due while one millisecond later is current', () => {
    const venue = {
      openingHours: HOURS,
      provenance: {
        reviewStatus: 'verified',
        reviewedAt: '2026-07-12T10:00:00.000Z',
      },
    };

    expect(
      classifyHoursAuditVenue({
        venue: {
          ...venue,
          provenance: {
            ...venue.provenance,
            nextReviewAt: NOW.toISOString(),
          },
        },
        now: NOW,
      }),
    ).toEqual({ outcome: 'due', reason: 'review_due' });

    expect(
      classifyHoursAuditVenue({
        venue: {
          ...venue,
          provenance: {
            ...venue.provenance,
            nextReviewAt: new Date(NOW.getTime() + 1).toISOString(),
          },
        },
        now: NOW,
      }),
    ).toEqual({ outcome: 'current', reason: 'review_current' });
  });

  test('[P1] the 180-day staleness boundary is inclusive', () => {
    const boundary = new Date(NOW.getTime() - 180 * 24 * 60 * 60 * 1000);

    expect(
      classifyHoursAuditVenue({
        venue: {
          openingHours: HOURS,
          provenance: {
            reviewStatus: 'verified',
            reviewedAt: boundary.toISOString(),
          },
        },
        now: NOW,
      }),
    ).toEqual({ outcome: 'stale', reason: 'review_stale' });

    expect(
      classifyHoursAuditVenue({
        venue: {
          openingHours: HOURS,
          provenance: {
            reviewStatus: 'verified',
            reviewedAt: new Date(boundary.getTime() + 1).toISOString(),
          },
        },
        now: NOW,
      }),
    ).toEqual({ outcome: 'current', reason: 'review_current' });
  });

  test.each([
    [
      'prior failure before all review states',
      {
        openingHours: null,
        provenance: {
          lastErrorClass: 'unbounded-provider-error',
          reason: 'split',
          conflict: true,
        },
      },
      {
        outcome: 'failed',
        reason: 'prior_failure',
        errorClass: 'unexpected',
      },
    ],
    [
      'split before conflict and unknown',
      {
        openingHours: null,
        provenance: { reason: 'split', conflict: true },
      },
      { outcome: 'split', reason: 'unsupported_split' },
    ],
    [
      'conflict before unknown',
      {
        openingHours: null,
        provenance: { conflict: true },
      },
      { outcome: 'conflicting', reason: 'provenance_conflict' },
    ],
    [
      'stale before due',
      {
        openingHours: HOURS,
        provenance: {
          reviewStatus: 'verified',
          reviewedAt: '2025-01-01T00:00:00.000Z',
          nextReviewAt: '2026-07-12T00:00:00.000Z',
        },
      },
      { outcome: 'stale', reason: 'review_stale' },
    ],
  ])('[P1] applies %s precedence', (_label, venue, expected) => {
    expect(classifyHoursAuditVenue({ venue, now: NOW })).toEqual(expected);
  });
});

describe('[12.1 AC5] audit repository failure behavior', () => {
  test('[P1] an outcome-write failure is isolated, counted, and redacted from later summaries', async () => {
    const recordOutcome = vi
      .fn()
      .mockRejectedValueOnce(new Error('database unavailable'))
      .mockResolvedValueOnce(undefined);
    const finishRun = vi.fn().mockResolvedValue(undefined);
    const pruneBefore = vi.fn().mockResolvedValue(undefined);

    const result = await runOpeningHoursAudit({
      enabled: true,
      now: NOW,
      repositories: {
        claimRun: vi.fn().mockResolvedValue({
          claimed: true,
          runId: 'run-write-failure',
        }),
        listVenues: vi.fn().mockResolvedValue([
          {
            id: '1',
            slug: 'current',
            openingHours: HOURS,
            provenance: {
              reviewStatus: 'verified',
              reviewedAt: '2026-07-12T10:00:00.000Z',
              nextReviewAt: '2026-07-14T10:00:00.000Z',
            },
          },
          {
            id: '2',
            slug: 'due',
            openingHours: HOURS,
            provenance: { nextReviewAt: NOW.toISOString() },
          },
        ]),
        recordOutcome,
        finishRun,
        pruneBefore,
      },
    });

    expect(result).toMatchObject({
      status: 'completed_with_failures',
      counts: { current: 0, due: 1, failed: 1 },
    });
    expect(recordOutcome).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(recordOutcome.mock.calls)).not.toMatch(
      /openingHours|provenance|sourceReference/,
    );
    expect(finishRun).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-write-failure',
        status: 'completed_with_failures',
        totalCount: 2,
        counts: expect.objectContaining({ due: 1, failed: 1 }),
      }),
    );
    expect(pruneBefore).toHaveBeenCalledWith(
      new Date('2026-01-14T10:00:00.000Z'),
    );
  });

  test('[P1] a run-level venue read failure rejects without a false completion', async () => {
    const finishRun = vi.fn();
    const pruneBefore = vi.fn();

    await expect(
      runOpeningHoursAudit({
        enabled: true,
        now: NOW,
        repositories: {
          claimRun: vi.fn().mockResolvedValue({
            claimed: true,
            runId: 'run-read-failure',
          }),
          listVenues: vi.fn().mockRejectedValue(new Error('venue read failed')),
          finishRun,
          pruneBefore,
        },
      }),
    ).rejects.toThrow('venue read failed');
    expect(finishRun).not.toHaveBeenCalled();
    expect(pruneBefore).not.toHaveBeenCalled();
  });

  test('[P2] an unclaimed run without an active id stays bounded', async () => {
    const listVenues = vi.fn();

    await expect(
      runOpeningHoursAudit({
        enabled: true,
        now: NOW,
        repositories: {
          claimRun: vi.fn().mockResolvedValue({ claimed: false }),
          listVenues,
        },
      }),
    ).resolves.toEqual({ status: 'already_running' });
    expect(listVenues).not.toHaveBeenCalled();
  });

  test('[P2] an empty run succeeds with stable zero counts and optional repositories', async () => {
    await expect(
      runOpeningHoursAudit({
        enabled: true,
        now: NOW,
        repositories: {
          claimRun: vi.fn().mockResolvedValue({
            claimed: true,
            runId: 'run-empty',
          }),
        },
      }),
    ).resolves.toEqual({
      status: 'completed',
      runId: 'run-empty',
      counts: {
        current: 0,
        missing_provenance: 0,
        due: 0,
        unknown: 0,
        conflicting: 0,
        split: 0,
        failed: 0,
        stale: 0,
      },
    });
  });
});
