import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import {
  classifyHoursEvidence,
} from '@/lib/services/opening-hours-governance';
import {
  classifyHoursAuditVenue,
  runOpeningHoursAudit,
} from '@/lib/services/opening-hours-audit';

const NOW = new Date('2026-07-16T12:00:00.000Z');
const HOURS = { '1': { open: '11:00', close: '22:00' } };
const PROVENANCE = {
  sourceType: 'venue_website',
  sourceReference: 'venue-site:test-venue:2026-07-16',
  reviewStatus: 'verified',
  reviewedAt: '2026-07-15T12:00:00.000Z',
  nextReviewAt: '2026-10-15T12:00:00.000Z',
};

function auditRepositories(overrides: Record<string, unknown> = {}) {
  return {
    claimRun: vi.fn().mockResolvedValue({ claimed: true, runId: 'run-6' }),
    renewLease: vi.fn().mockResolvedValue(undefined),
    listVenues: vi.fn().mockResolvedValue([
      {
        id: 'venue-1',
        slug: 'venue-1',
        openingHours: null,
        provenance: { reviewStatus: 'unknown' },
      },
    ]),
    recordOutcome: vi.fn().mockResolvedValue(undefined),
    recordPersistenceFailure: vi.fn().mockResolvedValue(undefined),
    finishRun: vi.fn().mockResolvedValue(undefined),
    failRun: vi.fn().mockResolvedValue(undefined),
    pruneBefore: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('[12.1 review iteration 6] lossless shared evidence contract', () => {
  test('uses the database note identifier contract without silently dropping safe free-form text', () => {
    expect(
      classifyHoursEvidence(
        {
          ...PROVENANCE,
          notes: 'owner confirmed these hours',
          schedule: HOURS,
        },
        NOW,
      ),
    ).toEqual({ kind: 'failed', errorClass: 'invalid_provenance' });

    expect(
      classifyHoursEvidence(
        {
          ...PROVENANCE,
          notes: 'note:owner-confirmation-2026-07-16',
          schedule: HOURS,
        },
        NOW,
      ),
    ).toMatchObject({
      kind: 'accepted',
      provenance: { notes: 'note:owner-confirmation-2026-07-16' },
    });
  });

  test.each([
    [
      'nested split periods',
      { regular: { '1': { periods: [{ open: '11:00', close: '14:00' }] } } },
      'split',
    ],
    [
      'nested full-day marker',
      { regular: { '1': { open: '00:00', close: '24:00' } } },
      'unsupported_24_7',
    ],
    [
      'nested seasonal marker',
      { schedule: { variants: [{ seasonal: true }] } },
      'seasonal',
    ],
    [
      'nested holiday marker',
      { schedule: { exceptions: [{ holidaySpecific: true }] } },
      'holiday_specific',
    ],
  ])('routes %s wholesale to bounded manual review', (_label, schedule, reason) => {
    expect(
      classifyHoursEvidence({ ...PROVENANCE, schedule }, NOW),
    ).toMatchObject({ kind: 'manual_review', reason });
  });
});

describe('[12.1 review iteration 6] complete weekly audit state validation', () => {
  test.each([
    {
      label: 'unknown carrying a schedule',
      venue: {
        openingHours: HOURS,
        provenance: { reviewStatus: 'unknown' },
      },
    },
    {
      label: 'failed without a valid error class',
      venue: {
        openingHours: null,
        provenance: {
          reviewStatus: 'failed',
          reviewReason: 'classification_failed',
        },
      },
    },
    {
      label: 'due carrying incompatible reason metadata',
      venue: {
        openingHours: HOURS,
        provenance: {
          ...PROVENANCE,
          reviewStatus: 'due',
          reviewReason: 'review_due',
        },
      },
    },
    {
      label: 'verified missing source identifiers',
      venue: {
        openingHours: HOURS,
        provenance: {
          reviewStatus: 'verified',
          reviewedAt: PROVENANCE.reviewedAt,
          nextReviewAt: PROVENANCE.nextReviewAt,
        },
      },
    },
  ])('classifies $label as a bounded integrity failure', ({ venue }) => {
    expect(classifyHoursAuditVenue({ venue, now: NOW })).toEqual({
      outcome: 'failed',
      reason: 'classification_failed',
      errorClass: 'validation_failed',
    });
  });

  test('accepts only the complete provider-neutral verified state', () => {
    expect(
      classifyHoursAuditVenue({
        venue: { openingHours: HOURS, provenance: PROVENANCE },
        now: NOW,
      }),
    ).toEqual({ outcome: 'current', reason: 'review_current' });
  });
});

describe('[12.1 review iteration 6] audit lifecycle evidence', () => {
  test('rejects an invalid audit clock before claiming a run', async () => {
    const repositories = auditRepositories();
    await expect(
      runOpeningHoursAudit({
        enabled: true,
        now: new Date(Number.NaN),
        repositories,
      }),
    ).rejects.toThrow(/invalid audit clock/i);
    expect(repositories.claimRun).not.toHaveBeenCalled();
  });

  test('rejects an incomplete repository contract before claiming a run', async () => {
    const claimRun = vi
      .fn()
      .mockResolvedValue({ claimed: true, runId: 'must-not-claim' });
    await expect(
      runOpeningHoursAudit({
        enabled: true,
        now: NOW,
        repositories: {
          claimRun,
          listVenues: vi.fn().mockResolvedValue([]),
          recordOutcome: vi.fn(),
          finishRun: vi.fn(),
          failRun: vi.fn(),
          pruneBefore: vi.fn(),
        } as never,
      }),
    ).rejects.toThrow(/repository contract/i);
    expect(claimRun).not.toHaveBeenCalled();
  });

  test('keeps the durably completed audit terminal when retention pruning fails', async () => {
    const repositories = auditRepositories({
      pruneBefore: vi.fn().mockRejectedValue(new Error('maintenance unavailable')),
    });

    await expect(
      runOpeningHoursAudit({
        enabled: true,
        now: NOW,
        clock: () => NOW,
        repositories,
      }),
    ).resolves.toMatchObject({
      status: 'completed',
      maintenanceWarning: 'retention_prune_failed',
    });
    expect(repositories.finishRun).toHaveBeenCalledTimes(1);
    expect(repositories.failRun).not.toHaveBeenCalled();
  });
});

describe('[12.1 review iteration 6] runner and migration contracts', () => {
  const repoRoot = join(process.cwd(), '..');
  const remediationRunner = readFileSync(
    join(process.cwd(), 'scripts', 'remediate-opening-hours.ts'),
    'utf8',
  );
  const auditRunner = readFileSync(
    join(process.cwd(), 'scripts', 'audit-opening-hours.ts'),
    'utf8',
  );
  const migration = readFileSync(
    join(
      repoRoot,
      'supabase',
      'migrations',
      '20260716185235_close_hours_review_iteration_6.sql',
    ),
    'utf8',
  );

  test('keeps unreadable failure evidence distinct from persisted evidence and uses a root-safe basename', () => {
    expect(remediationRunner).toMatch(/evidence\s*=\s*['"]unavailable['"]/);
    expect(remediationRunner).toMatch(/\bbasename\(report\)/);
    expect(remediationRunner).not.toMatch(
      /persistedRemediationReport\(supabase\)\.catch\(\s*\(\)\s*=>\s*\(\{\s*counts:\s*emptyCounts\(\)/,
    );
  });

  test('omits fabricated zero counts for an already-running audit', () => {
    expect(auditRunner).toMatch(
      /result\.counts\s*\?[\s\S]*Total:[\s\S]*:\s*\[\]/,
    );
  });

  test('binds every remediation run and canonical request at the database boundary', () => {
    expect(migration).toMatch(/hours_remediation_request_fingerprint/i);
    expect(migration).toMatch(/security\s+definer/i);
    expect(migration).toMatch(
      /revoke\s+insert\s*,\s*update\s*,\s*delete[\s\S]*hours_review_runs/i,
    );
    expect(migration).toMatch(/jsonb_object_keys/i);
    expect(migration).toMatch(/on\s+conflict[\s\S]*do\s+update/i);
  });
});
