import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { runOpeningHoursAudit } from '@/lib/services/opening-hours-audit';

const NOW = new Date('2026-07-16T12:00:00.000Z');

function auditRepositories(overrides: Record<string, unknown> = {}) {
  return {
    claimRun: vi.fn().mockResolvedValue({ claimed: true, runId: 'run-5' }),
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

describe('[12.1 review iteration 5] audit terminal ordering and missing evidence', () => {
  test('records a bounded persistence failure after both identical outcome attempts fail', async () => {
    const recordOutcome = vi.fn().mockRejectedValue(new Error('response lost'));
    const repos = auditRepositories({ recordOutcome });

    await expect(
      runOpeningHoursAudit({
        enabled: true,
        now: NOW,
        clock: () => NOW,
        repositories: repos,
      }),
    ).rejects.toThrow(/outcome persistence/i);

    expect(repos.recordPersistenceFailure).toHaveBeenCalledWith({
      runId: 'run-5',
      venueId: 'venue-1',
      venueSlug: 'venue-1',
    });
    expect(repos.finishRun).not.toHaveBeenCalled();
    expect(repos.pruneBefore).not.toHaveBeenCalled();
    expect(repos.failRun).toHaveBeenCalledTimes(1);
  });

  test('finalizes a coherent successful run before pruning retained history', async () => {
    const repos = auditRepositories();

    await runOpeningHoursAudit({
      enabled: true,
      now: NOW,
      clock: () => NOW,
      repositories: repos,
    });

    expect(repos.finishRun.mock.invocationCallOrder[0]).toBeLessThan(
      repos.pruneBefore.mock.invocationCallOrder[0],
    );
  });
});

describe('[12.1 review iteration 5] database and operations contracts', () => {
  const repoRoot = join(process.cwd(), '..');
  const migration = readFileSync(
    join(
      repoRoot,
      'supabase',
      'migrations',
      '20260716121208_close_hours_review_iteration_5.sql',
    ),
    'utf8',
  );
  const remediationRunner = readFileSync(
    join(process.cwd(), 'scripts', 'remediate-opening-hours.ts'),
    'utf8',
  );
  const auditRunner = readFileSync(
    join(process.cwd(), 'scripts', 'audit-opening-hours.ts'),
    'utf8',
  );
  const fetchSetup = readFileSync(
    join(process.cwd(), 'test', 'setup', 'setup.ts'),
    'utf8',
  );
  const workflow = readFileSync(
    join(repoRoot, '.github', 'workflows', 'hours-review-audit.yml'),
    'utf8',
  );
  const operationsDoc = readFileSync(
    join(process.cwd(), 'docs', 'github-actions-scheduled-jobs.md'),
    'utf8',
  );
  const authoringDoc = readFileSync(
    join(process.cwd(), 'docs', 'venue-data-load.md'),
    'utf8',
  );
  const pivotContract = readFileSync(
    join(process.cwd(), 'docs', 'story-12-1-provider-pivot-contract.md'),
    'utf8',
  );

  test('binds remediation ownership and exact requests to the accepted input', () => {
    expect(migration).toMatch(/remediation_input_fingerprint/i);
    expect(migration).toMatch(/remediation_claim_identity/i);
    expect(migration).toMatch(/remediation_request_fingerprint/i);
    expect(migration).toMatch(/is_hours_review_run_active/i);
    expect(remediationRunner).toMatch(/inputFingerprint/);
    expect(remediationRunner).toMatch(/claimIdentity/);
    expect(remediationRunner).toMatch(/request_fingerprint/);
  });

  test('isolates stale remediation rows and explicitly rejects SQL null input', () => {
    expect(migration).toMatch(/p_requests\s+is\s+null/i);
    expect(migration).toMatch(/for\s+request[\s\S]*exception[\s\S]*continue/i);
    expect(migration).toMatch(/classification_failed/i);
    expect(migration).not.toMatch(/raise\s+serialization_failure/i);
  });

  test('converges future dates and disallowed references with bounded outcomes', () => {
    expect(migration).toMatch(/hours-review-time-convergence/i);
    expect(migration).toMatch(/hours-review-source-convergence/i);
    expect(migration).toMatch(/provenance_removed/i);
    expect(migration).toMatch(/before\s+insert\s+or\s+update\s+on\s+public\.venues/i);
    expect(migration).toMatch(/prior_status\s+in\s*\(\s*'verified'\s*,\s*'due'\s*\)/i);
  });

  test('keeps the population state fingerprint hours-specific', () => {
    const snapshotFunction =
      migration.match(
        /create or replace function public\.hours_venue_population_snapshot\(\)[\s\S]*?\$\$;/i,
      )?.[0] ?? '';
    expect(snapshotFunction).not.toMatch(/\bv\.updated_at\b/i);
  });

  test('persists bounded missing-outcome evidence and uses database-owned lease state', () => {
    expect(migration).toMatch(/outcome_persistence_failure_count/i);
    expect(migration).toMatch(/record_hours_review_persistence_failure/i);
    expect(auditRunner).toMatch(/is_hours_review_run_active/);
    expect(remediationRunner).toMatch(/is_hours_review_run_active/);
    expect(auditRunner).not.toMatch(/Date\.now\(\)/);
    expect(remediationRunner).not.toMatch(/Date\.now\(\)/);
  });

  test('keeps the production workflow main-only and removes the temporary procedure', () => {
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).not.toMatch(/refs\/heads\/story\//);
    expect(operationsDoc).not.toMatch(/pre-merge validation/i);
    expect(operationsDoc).not.toMatch(/allowlist the exact story branch/i);
  });

  test('hardens report paths, transient retry, and durable report evidence', () => {
    expect(remediationRunner).toMatch(/validateRunId/);
    expect(remediationRunner).toMatch(/temporaryNameHash/);
    expect(remediationRunner).toMatch(/normalizePathIdentity/);
    expect(remediationRunner).toMatch(/replacement-probe/i);
    expect(remediationRunner).toMatch(/isRetryableRpcError/);
    expect(remediationRunner).toMatch(/persistedRemediationReport/);
  });

  test('bounds redirect replay, cancels followed responses, and resolves relative URLs', () => {
    expect(fetchSetup).toMatch(/MAX_REDIRECT_BODY_BYTES/);
    expect(fetchSetup).toMatch(/response\.body\?\.cancel/);
    expect(fetchSetup).toMatch(/new URL\([^,]+,\s*window\.location\.href\)/);
  });

  test('documents stable venue upserts, valid state combinations, and the guarded RPC', () => {
    expect(authoringDoc).toMatch(/ON CONFLICT \(slug\)/i);
    expect(authoringDoc).toMatch(/hours_review_reason/);
    expect(authoringDoc).toMatch(/hours_last_error_class/);
    expect(authoringDoc).toMatch(/apply_hours_remediation_(?:batch|outcome)/);
    expect(pivotContract).toContain('E12-AD-12');
  });
});
