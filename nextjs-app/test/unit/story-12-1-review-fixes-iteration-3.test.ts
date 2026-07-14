import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import {
  assertCompleteRemediationPopulation,
  classifyHoursEvidence,
  parseRemediationRows,
} from '@/lib/services/opening-hours-governance';
import { runOpeningHoursAudit } from '@/lib/services/opening-hours-audit';

const NOW = new Date('2026-07-14T10:00:00.000Z');
const EVIDENCE = {
  sourceType: 'venue_website',
  sourceReference: 'owner-attested:2026-07-14:test-venue',
  reviewedAt: '2026-07-14T10:01:00.000Z',
  nextReviewAt: '2026-10-14T10:01:00.000Z',
  schedule: { '1': { open: '11:00', close: '22:00' } },
};

function auditRepositories(overrides: Record<string, unknown> = {}) {
  return {
    claimRun: vi.fn().mockResolvedValue({ claimed: true, runId: 'run-3' }),
    listVenues: vi.fn().mockResolvedValue([
      {
        id: 'venue-1',
        slug: 'venue-1',
        openingHours: null,
        provenance: { reviewStatus: 'unknown' },
      },
    ]),
    recordOutcome: vi.fn().mockResolvedValue(undefined),
    finishRun: vi.fn().mockResolvedValue(undefined),
    failRun: vi.fn().mockResolvedValue(undefined),
    pruneBefore: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('[12.1 review iteration 3] deterministic governance and complete populations', () => {
  test('uses the injected clock for future-evidence validation', () => {
    expect(classifyHoursEvidence(EVIDENCE, NOW)).toEqual({
      kind: 'failed',
      errorClass: 'invalid_provenance',
    });
    expect(
      classifyHoursEvidence(EVIDENCE, new Date('2026-07-14T10:02:00.000Z')),
    ).toMatchObject({ kind: 'accepted' });
  });

  test('requires remediation input to carry a concurrency snapshot', () => {
    expect(() =>
      parseRemediationRows(
        JSON.stringify([
          {
            id: 'venue-1',
            slug: 'venue-1',
            openingHours: null,
            evidence: null,
          },
        ]),
      ),
    ).toThrow(/updatedAt/i);
  });

  test('accepts only the exact non-empty live venue ID population', () => {
    const rows = [
      { id: 'venue-1', slug: 'one', openingHours: null, evidence: null },
      { id: 'venue-2', slug: 'two', openingHours: null, evidence: null },
    ];
    expect(() =>
      assertCompleteRemediationPopulation({ rows, liveVenueIds: [] }),
    ).toThrow(/empty/i);
    expect(() =>
      assertCompleteRemediationPopulation({
        rows: rows.slice(0, 1),
        liveVenueIds: ['venue-1', 'venue-2'],
      }),
    ).toThrow(/population mismatch/i);
    expect(() =>
      assertCompleteRemediationPopulation({
        rows,
        liveVenueIds: ['venue-2', 'venue-1'],
      }),
    ).not.toThrow();
  });
});

describe('[12.1 review iteration 3] reliable audit failure finalization', () => {
  test('rejects an empty venue population and finalizes the run as failed', async () => {
    const repos = auditRepositories({ listVenues: vi.fn().mockResolvedValue([]) });
    await expect(
      runOpeningHoursAudit({
        enabled: true,
        now: NOW,
        clock: () => NOW,
        repositories: repos,
      }),
    ).rejects.toThrow(/population.*empty/i);
    expect(repos.finishRun).not.toHaveBeenCalled();
    expect(repos.failRun).toHaveBeenCalledTimes(1);
  });

  test('preserves the root failure when failure finalization also rejects', async () => {
    const rootFailure = new Error('venue read root cause');
    const finalizerFailure = new Error('failure finalizer rejected');
    const repos = auditRepositories({
      listVenues: vi.fn().mockRejectedValue(rootFailure),
      failRun: vi.fn().mockRejectedValue(finalizerFailure),
    });

    const rejection = await runOpeningHoursAudit({
      enabled: true,
      now: NOW,
      clock: () => NOW,
      repositories: repos,
    }).catch((error: unknown) => error);

    expect(rejection).toBeInstanceOf(AggregateError);
    expect(String(rejection)).toMatch(/venue read root cause/i);
    expect((rejection as AggregateError).errors).toEqual([
      rootFailure,
      finalizerFailure,
    ]);
  });
});

describe('[12.1 review iteration 3] runner source contracts', () => {
  const auditRunner = readFileSync(
    join(process.cwd(), 'scripts', 'audit-opening-hours.ts'),
    'utf8',
  );
  const remediationRunner = readFileSync(
    join(process.cwd(), 'scripts', 'remediate-opening-hours.ts'),
    'utf8',
  );

  test('uses serialized outcome persistence and preserves explicit unknown/failed state', () => {
    expect(auditRunner).toMatch(/persist_hours_review_outcome/);
    expect(auditRunner).toMatch(/hours_review_status\s*===\s*['"]unknown['"]/);
    expect(auditRunner).toMatch(/hours_review_status\s*===\s*['"]failed['"]/);
  });

  test('writes bounded failure summaries with its own run id and labels overlaps separately', () => {
    expect(auditRunner).toMatch(/Status:\s*failed/);
    expect(auditRunner).toMatch(/Audit run:\s*['"]?\s*\+\s*runId/);
    expect(auditRunner).toMatch(/Active audit run/);
    expect(auditRunner).toMatch(/Workflow run/);
  });

  test('checks the exact live population and optimistic-concurrency timestamp', () => {
    expect(remediationRunner).toMatch(/assertCompleteRemediationPopulation/);
    expect(remediationRunner).toMatch(/p_expected_updated_at/);
    expect(remediationRunner).toMatch(/\.gt\(\s*['"]id['"]/);
  });

  test('marks reports provisional before finalization and terminal afterwards', () => {
    expect(remediationRunner).toMatch(/status:\s*['"]provisional['"]/);
    expect(remediationRunner).toMatch(/status:\s*terminalStatus/);
    expect(remediationRunner).toMatch(/failure finalizer rejected/i);
  });
});
