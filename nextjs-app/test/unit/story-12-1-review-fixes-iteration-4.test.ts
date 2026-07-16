import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import {
  classifyHoursEvidence,
  remediateOpeningHoursRows,
} from '@/lib/services/opening-hours-governance';
import {
  classifyHoursAuditVenue,
  runOpeningHoursAudit,
} from '@/lib/services/opening-hours-audit';

const NOW = new Date('2026-07-16T10:00:00.000Z');
const EVIDENCE = {
  sourceType: 'venue_website',
  sourceReference: 'venue-site:test-venue:2026-07-16',
  reviewedAt: '2026-07-15T10:00:00.000Z',
  nextReviewAt: '2026-10-15T10:00:00.000Z',
};

function auditRepositories(overrides: Record<string, unknown> = {}) {
  return {
    claimRun: vi.fn().mockResolvedValue({ claimed: true, runId: 'run-4' }),
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
    finishRun: vi.fn().mockResolvedValue(undefined),
    failRun: vi.fn().mockResolvedValue(undefined),
    pruneBefore: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('[12.1 review iteration 4] lossless evidence classification', () => {
  test.each([
    ['one interval array', { '1': [{ open: '11:00', close: '14:00' }] }, 'split'],
    ['empty interval array', { '1': [] }, 'split'],
    [
      'equal-midnight full-day sentinel',
      { '1': { open: '00:00', close: '00:00' } },
      'unsupported_24_7',
    ],
  ])('routes unsupported %s wholesale to manual review', (_label, schedule, reason) => {
    expect(classifyHoursEvidence({ ...EVIDENCE, schedule }, NOW)).toMatchObject({
      kind: 'manual_review',
      reason,
    });
  });

  test.each([
    'https://venue.example/hours',
    '//venue.example/hours',
    'venue.example/hours',
    'venue-site:%2f%2fvenue.example',
    'api key: abc123',
    'Bearer abc.def.ghi',
    'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature',
  ])('rejects non-opaque source references: %s', (sourceReference) => {
    expect(
      classifyHoursEvidence(
        {
          ...EVIDENCE,
          sourceReference,
          schedule: { '1': { open: '11:00', close: '22:00' } },
        },
        NOW,
      ),
    ).toEqual({ kind: 'failed', errorClass: 'invalid_provenance' });
  });

  test('preserves provenance-removal as a distinct bounded remediation reason', async () => {
    const result = await remediateOpeningHoursRows({
      rows: [
        {
          id: 'venue-1',
          slug: 'venue-1',
          updatedAt: '2026-07-15T10:00:00.000Z',
          openingHours: { '1': { open: '11:00', close: '22:00' } },
          evidence: null,
        },
      ],
      now: NOW,
    });
    expect(result.outcomes).toEqual([
      expect.objectContaining({
        outcome: 'unknown',
        reason: 'provenance_removed',
      }),
    ]);
  });
});

describe('[12.1 review iteration 4] audit persistence and lease safety', () => {
  test('retries the identical outcome after an ambiguous write and never fabricates a replacement', async () => {
    const recordOutcome = vi
      .fn()
      .mockRejectedValueOnce(new Error('response lost'))
      .mockResolvedValueOnce(undefined);
    const repos = auditRepositories({ recordOutcome });

    const result = await runOpeningHoursAudit({
      enabled: true,
      now: NOW,
      clock: () => NOW,
      repositories: repos,
    });

    expect(recordOutcome).toHaveBeenCalledTimes(2);
    expect(recordOutcome.mock.calls[1]?.[0]).toEqual(
      recordOutcome.mock.calls[0]?.[0],
    );
    expect(result.counts).toMatchObject({ unknown: 1, failed: 0 });
  });

  test('heartbeats before reads and during outcome persistence', async () => {
    const repos = auditRepositories();
    await runOpeningHoursAudit({
      enabled: true,
      now: NOW,
      clock: () => NOW,
      repositories: repos,
    });
    expect(repos.renewLease).toHaveBeenCalled();
    expect(repos.renewLease.mock.invocationCallOrder[0]).toBeLessThan(
      repos.listVenues.mock.invocationCallOrder[0],
    );
  });

  test.each([
    {
      reviewStatus: 'due',
      reviewedAt: '2099-01-01T00:00:00.000Z',
      nextReviewAt: '2099-02-01T00:00:00.000Z',
    },
    {
      reviewStatus: 'due',
      reviewedAt: 'invalid',
      nextReviewAt: '2026-08-01T00:00:00.000Z',
    },
    {
      reviewStatus: 'due',
      reviewedAt: '2026-08-01T00:00:00.000Z',
      nextReviewAt: '2026-07-01T00:00:00.000Z',
    },
  ])('validates due-state timestamps before returning due: %j', (provenance) => {
    expect(
      classifyHoursAuditVenue({
        venue: {
          openingHours: { '1': { open: '11:00', close: '22:00' } },
          provenance,
        },
        now: NOW,
      }),
    ).toMatchObject({
      outcome: 'failed',
      reason: 'classification_failed',
      errorClass: 'validation_failed',
    });
  });
});

describe('[12.1 review iteration 4] final migration and runner contracts', () => {
  const repoRoot = join(process.cwd(), '..');
  const migrationDir = join(repoRoot, 'supabase', 'migrations');
  const migrationName = readdirSync(migrationDir).find((name) =>
    name.includes('finalize_hours_governance_review_safety'),
  );
  const migration = migrationName
    ? readFileSync(join(migrationDir, migrationName), 'utf8')
    : '';
  const auditRunner = readFileSync(
    join(process.cwd(), 'scripts', 'audit-opening-hours.ts'),
    'utf8',
  );
  const remediationRunner = readFileSync(
    join(process.cwd(), 'scripts', 'remediate-opening-hours.ts'),
    'utf8',
  );
  const workflow = readFileSync(
    join(repoRoot, '.github', 'workflows', 'hours-review-audit.yml'),
    'utf8',
  );
  const legacyWorkflow = readFileSync(
    join(repoRoot, '.github', 'workflows', 'scheduled-cron-jobs.yml'),
    'utf8',
  );

  test('migration makes lifecycle calls idempotent and binds terminal state to a population snapshot', () => {
    expect(migration).toMatch(/venue_population_count/i);
    expect(migration).toMatch(/venue_population_(?:identity|state)_fingerprint/i);
    expect(migration).toMatch(/claim_hours_review_run[\s\S]*status\s*=\s*'running'/i);
    expect(migration).toMatch(/finish_hours_review_run[\s\S]*parent_status\s+in\s*\(/i);
    expect(migration).toMatch(/apply_hours_remediation_batch/i);
  });

  test('migration replaces mismatched named integrity objects by definition', () => {
    expect(migration).toMatch(/pg_get_constraintdef/i);
    expect(migration).toMatch(/pg_get_indexdef/i);
    expect(migration).toMatch(/hours_review_outcomes_run_id_fkey/i);
    expect(migration).toMatch(/hours_review_outcomes_venue_id_fkey/i);
    expect(migration).toMatch(/hours_review_runs_one_active_run_idx/i);
  });

  test('remediation preflights distinct paths, publishes atomically, and uses one transactional batch RPC', () => {
    expect(remediationRunner).toMatch(/const inputPath = resolve\(/);
    expect(remediationRunner).toMatch(/const reportPath = resolve\(/);
    expect(remediationRunner).toMatch(/rename\(/);
    expect(remediationRunner).toMatch(/apply_hours_remediation_batch/);
    expect(remediationRunner).not.toMatch(/persist_hours_review_outcome/);
  });

  test('audit mapper retains source-less manual review and overlap summary promotes the active run', () => {
    expect(auditRunner).toMatch(/hours_review_status\s*===\s*['"]manual_review['"]/);
    expect(auditRunner).toMatch(/Attempted audit run/i);
    expect(auditRunner).toMatch(/result\.activeRunId/);
  });

  test('scheduled and manual production runs are main-only', () => {
    expect(workflow).toMatch(/github\.event_name\s*==\s*'schedule'[\s\S]*refs\/heads\/main/i);
    expect(workflow).not.toMatch(/refs\/heads\/story\//i);
    expect(workflow).toMatch(/environment:\s*Production/);
  });

  test('Story 12.1 removes only the obsolete OSM scheduled lane', () => {
    expect(legacyWorkflow).not.toMatch(/osm-ingestion/i);
    expect(legacyWorkflow).not.toMatch(/0 5 \* \* 1/);
    expect(legacyWorkflow).toMatch(/weather-ingestion/i);
    expect(legacyWorkflow).toMatch(/cleanup-old-data/i);
  });
});
