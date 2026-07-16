/**
 * ATDD RED-PHASE acceptance scaffolds — Story 12.1 (AC5, AC8)
 * Deterministic weekly hours-review audit service contract.
 */
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { describe, expect, test, vi } from 'vitest';

type AuditModule = {
  classifyHoursAuditVenue(input: Record<string, unknown>): {
    outcome: string;
    reason: string;
  };
  runOpeningHoursAudit(input: Record<string, unknown>): Promise<{
    status: string;
    runId?: string;
    counts?: Record<string, number>;
  }>;
};

async function loadAudit(): Promise<AuditModule> {
  const moduleUrl = pathToFileURL(
    join(process.cwd(), 'lib', 'services', 'opening-hours-audit.ts'),
  ).href;
  return (await import(/* @vite-ignore */ moduleUrl)) as AuditModule;
}

const NOW = new Date('2026-07-13T10:00:00.000Z');

describe('[12.1 AC5] weekly audit classification', () => {
  test.each([
    ['missing_provenance', { openingHours: { '1': { open: '11:00', close: '22:00' } }, provenance: null }],
    ['due', { openingHours: { '1': { open: '11:00', close: '22:00' } }, provenance: { reviewStatus: 'due', reviewedAt: '2026-07-12T10:00:00.000Z', nextReviewAt: '2026-07-13T09:00:00.000Z' } }],
    ['unknown', { openingHours: null, provenance: { reviewStatus: 'unknown' } }],
    ['conflicting', { openingHours: { '1': { open: '11:00', close: '22:00' } }, provenance: { reviewStatus: 'manual_review', reviewReason: 'provenance_conflict' } }],
    ['split', { openingHours: { '1': { open: '11:00', close: '22:00' } }, provenance: { reviewStatus: 'manual_review', reviewReason: 'unsupported_split' } }],
    ['failed', { openingHours: { '1': { open: '11:00', close: '22:00' } }, provenance: { reviewStatus: 'failed', lastErrorClass: 'read_failed' } }],
    ['stale', { openingHours: { '1': { open: '11:00', close: '22:00' } }, provenance: { reviewStatus: 'verified', reviewedAt: '2025-01-01T00:00:00.000Z', nextReviewAt: '2026-10-01T00:00:00.000Z' } }],
  ])('[P1] classifies %s without changing canonical hours', async (expected, venue) => {
    const { classifyHoursAuditVenue } = await loadAudit();
    expect(classifyHoursAuditVenue({ venue, now: NOW })).toMatchObject({
      outcome: expected,
      reason: expect.any(String),
    });
  });
});

describe('[12.1 AC5] audit runner isolation, overlap, retention, and idempotency', () => {
  test('[P1] emergency stop is fail-closed and claims no run', async () => {
    const { runOpeningHoursAudit } = await loadAudit();
    const claimRun = vi.fn();
    await expect(
      runOpeningHoursAudit({ enabled: false, now: NOW, repositories: { claimRun } }),
    ).resolves.toMatchObject({ status: 'disabled' });
    expect(claimRun).not.toHaveBeenCalled();
  });

  test('[P1] a non-overlap claim prevents a second active run', async () => {
    const { runOpeningHoursAudit } = await loadAudit();
    const recordOutcome = vi.fn();
    const result = await runOpeningHoursAudit({
      enabled: true,
      now: NOW,
      repositories: {
        claimRun: vi.fn().mockResolvedValue({ claimed: false, activeRunId: 'run-active' }),
        listVenues: vi.fn(),
        recordOutcome,
      },
    });
    expect(result).toMatchObject({ status: 'already_running' });
    expect(recordOutcome).not.toHaveBeenCalled();
  });

  test('[P1] one venue failure is isolated and canonical hours are never written', async () => {
    const { runOpeningHoursAudit } = await loadAudit();
    const writeCanonicalHours = vi.fn();
    const recordOutcome = vi.fn().mockResolvedValue(undefined);
    const result = await runOpeningHoursAudit({
      enabled: true,
      now: NOW,
      repositories: {
        claimRun: vi.fn().mockResolvedValue({ claimed: true, runId: 'run-1' }),
        listVenues: vi.fn().mockResolvedValue([
          { id: '1', slug: 'ok', openingHours: null, provenance: { reviewStatus: 'unknown' } },
          { id: '2', slug: 'broken', openingHours: null, provenance: { throwForTest: true } },
          { id: '3', slug: 'due', openingHours: { '1': { open: '11:00', close: '22:00' } }, provenance: { reviewStatus: 'due', reviewedAt: '2026-07-12T10:00:00.000Z', nextReviewAt: '2026-07-13T09:00:00.000Z' } },
        ]),
        recordOutcome,
        finishRun: vi.fn().mockResolvedValue(undefined),
        pruneBefore: vi.fn().mockResolvedValue(undefined),
        writeCanonicalHours,
      },
    });
    expect(recordOutcome).toHaveBeenCalledTimes(3);
    expect(result.counts).toMatchObject({ unknown: 1, failed: 1, due: 1 });
    expect(writeCanonicalHours).not.toHaveBeenCalled();
  });

  test('[P1] repeated input produces stable counts and a 180-day retention cutoff', async () => {
    const { runOpeningHoursAudit } = await loadAudit();
    const pruneBefore = vi.fn().mockResolvedValue(undefined);
    const base = {
      enabled: true,
      now: NOW,
      clock: () => NOW,
      venues: [
        { id: '1', openingHours: null, provenance: { reviewStatus: 'unknown' } },
      ],
      repositories: {
        claimRun: vi.fn()
          .mockResolvedValueOnce({ claimed: true, runId: 'run-1' })
          .mockResolvedValueOnce({ claimed: true, runId: 'run-2' }),
        listVenues: vi.fn().mockResolvedValue([
          { id: '1', openingHours: null, provenance: { reviewStatus: 'unknown' } },
        ]),
        recordOutcome: vi.fn().mockResolvedValue(undefined),
        finishRun: vi.fn().mockResolvedValue(undefined),
        pruneBefore,
      },
    };
    const first = await runOpeningHoursAudit(base);
    const second = await runOpeningHoursAudit(base);
    expect(first.counts).toEqual(second.counts);
    expect(pruneBefore).toHaveBeenCalledWith(
      new Date('2026-01-14T10:00:00.000Z'),
    );
  });
});
