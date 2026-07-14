import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import {
  classifyHoursEvidence,
  parseRemediationRows,
  remediateOpeningHoursRows,
} from '@/lib/services/opening-hours-governance';
import { runOpeningHoursAudit } from '@/lib/services/opening-hours-audit';

const NOW = new Date('2026-07-14T10:00:00.000Z');
const EVIDENCE = {
  sourceType: 'venue_website',
  sourceReference: 'owner-attested:2026-07-14:test-venue',
  reviewedAt: '2026-07-13T10:00:00.000Z',
  nextReviewAt: '2026-10-13T10:00:00.000Z',
};

function repositories(overrides: Record<string, unknown> = {}) {
  return {
    claimRun: vi.fn().mockResolvedValue({ claimed: true, runId: 'run-1' }),
    listVenues: vi.fn().mockResolvedValue([]),
    recordOutcome: vi.fn().mockResolvedValue(undefined),
    finishRun: vi.fn().mockResolvedValue(undefined),
    failRun: vi.fn().mockResolvedValue(undefined),
    pruneBefore: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('[12.1 review iteration 2] governance input coherence', () => {
  test.each([
    { reviewStatus: 'verified', reviewReason: 'classification_failed' },
    { reviewStatus: 'verified', lastErrorClass: 'validation_failed' },
    { reviewStatus: 'failed' },
    { reviewStatus: 'manual_review' },
  ])('rejects application states PostgreSQL rejects: %j', (override) => {
    expect(
      classifyHoursEvidence({
        ...EVIDENCE,
        ...override,
        schedule: { '1': { open: '11:00', close: '22:00' } },
      }),
    ).toEqual({ kind: 'failed', errorClass: 'invalid_provenance' });
  });

  test('rejects future-dated evidence', () => {
    expect(
      classifyHoursEvidence({
        ...EVIDENCE,
        reviewedAt: '2100-01-01T00:00:00.000Z',
        nextReviewAt: '2100-04-01T00:00:00.000Z',
        schedule: { '1': { open: '11:00', close: '22:00' } },
      }),
    ).toEqual({ kind: 'failed', errorClass: 'invalid_provenance' });
  });

  test.each([
    'https://venue.example/notes',
    'provider payload: regular_opening_hours=11-22',
    'credential api_key=secret-value',
  ])('rejects unsafe remediation notes: %s', (notes) => {
    expect(
      classifyHoursEvidence({
        ...EVIDENCE,
        notes,
        schedule: { '1': { open: '11:00', close: '22:00' } },
      }),
    ).toEqual({ kind: 'failed', errorClass: 'invalid_provenance' });
  });

  test('accepts an all-closed empty object but rejects explicit undefined values', () => {
    expect(classifyHoursEvidence({ ...EVIDENCE, schedule: {} })).toMatchObject({
      kind: 'accepted',
      schedule: {},
    });
    expect(
      classifyHoursEvidence({ ...EVIDENCE, schedule: { '1': undefined } }),
    ).toEqual({ kind: 'failed', errorClass: 'malformed_schedule' });
  });

  test('does not rewrite explicit failed/manual states on unknown hours to current', () => {
    expect(
      classifyHoursEvidence({
        ...EVIDENCE,
        reviewStatus: 'failed',
        reviewReason: 'classification_failed',
        lastErrorClass: 'validation_failed',
        schedule: null,
      }),
    ).toEqual({ kind: 'failed', errorClass: 'invalid_provenance' });
  });

  test('records accepted whole-field unknown as unknown, not current', async () => {
    const result = await remediateOpeningHoursRows({
      rows: [
        {
          id: 'unknown',
          slug: 'unknown',
          openingHours: null,
          evidence: { ...EVIDENCE, reviewStatus: 'unknown' },
        },
      ],
    });
    expect(result.outcomes).toEqual([
      expect.objectContaining({ outcome: 'unknown', reason: 'hours_unknown' }),
    ]);
  });

  test.each([
    [
      'manual_review',
      {
        '1': [
          { open: '11:00', close: '14:00' },
          { open: '17:00', close: '23:00' },
        ],
      },
    ],
    ['failed', { '1': { open: '11', close: '22:00' } }],
  ])('marks %s remediation to preserve an existing verified schedule', async (_status, openingHours) => {
    const result = await remediateOpeningHoursRows({
      rows: [{ id: 'venue-1', slug: 'venue-1', openingHours, evidence: EVIDENCE }],
    });
    expect(result.updates[0]).toMatchObject({ preservesPriorSchedule: true });
  });

  test.each([
    ['unsupported_24_7', { mode: '24/7' }],
    ['seasonal', { seasonal: true }],
    ['holiday_specific', { holidaySpecific: true }],
  ])('retains the actionable %s remediation reason', async (reason, openingHours) => {
    const result = await remediateOpeningHoursRows({
      rows: [{ id: reason, slug: reason, openingHours, evidence: EVIDENCE }],
    });
    expect(result.outcomes[0]).toMatchObject({ outcome: 'manual_review', reason });
    expect(result.updates[0]?.reviewReason).toMatch(new RegExp(reason));
  });
});

describe('[12.1 review iteration 2] remediation file validation', () => {
  test('requires a non-empty array with structurally valid unique venue IDs', () => {
    expect(() => parseRemediationRows('[]')).toThrow(/at least one|non-empty/i);
    expect(() =>
      parseRemediationRows(
        JSON.stringify([
          { id: 'same', slug: 'one', openingHours: null, evidence: null },
          { id: 'same', slug: 'two', openingHours: null, evidence: null },
        ]),
      ),
    ).toThrow(/duplicate/i);
    expect(() =>
      parseRemediationRows(JSON.stringify([{ id: '', slug: 'missing-hours' }])),
    ).toThrow(/invalid remediation input/i);
  });
});

describe('[12.1 review iteration 2] audit terminal ordering and isolation', () => {
  test('a fallback write failure does not skip later venues and fails the run after pruning', async () => {
    const recordOutcome = vi
      .fn()
      .mockRejectedValueOnce(new Error('primary write failed'))
      .mockRejectedValueOnce(new Error('fallback write failed'))
      .mockResolvedValueOnce(undefined);
    const repos = repositories({
      listVenues: vi.fn().mockResolvedValue([
        { id: '1', slug: 'one', openingHours: null, provenance: { reviewStatus: 'unknown' } },
        { id: '2', slug: 'two', openingHours: null, provenance: { reviewStatus: 'unknown' } },
      ]),
      recordOutcome,
    });

    await expect(
      runOpeningHoursAudit({ enabled: true, now: NOW, clock: () => NOW, repositories: repos }),
    ).rejects.toThrow(/outcome persistence/i);

    expect(recordOutcome).toHaveBeenCalledTimes(3);
    expect(recordOutcome).toHaveBeenLastCalledWith(
      expect.objectContaining({ venueId: '2', outcome: 'unknown' }),
    );
    expect(repos.pruneBefore).toHaveBeenCalledTimes(1);
    expect(repos.failRun).toHaveBeenCalledTimes(1);
    expect(repos.finishRun).not.toHaveBeenCalled();
    expect(repos.pruneBefore.mock.invocationCallOrder[0]).toBeLessThan(
      repos.failRun.mock.invocationCallOrder[0],
    );
  });

  test('prunes retention history before marking a successful run completed', async () => {
    const repos = repositories();
    await runOpeningHoursAudit({ enabled: true, now: NOW, clock: () => NOW, repositories: repos });
    expect(repos.pruneBefore.mock.invocationCallOrder[0]).toBeLessThan(
      repos.finishRun.mock.invocationCallOrder[0],
    );
  });
});

describe('[12.1 review iteration 2] deployment source contracts', () => {
  const repoRoot = join(process.cwd(), '..');
  const migrations = join(repoRoot, 'supabase', 'migrations');
  const hardeningName = readdirSync(migrations).find((name) =>
    name.includes('complete_hours_governance_review_hardening'),
  );
  const hardening = hardeningName
    ? readFileSync(join(migrations, hardeningName), 'utf8')
    : '';
  const forward = readFileSync(
    join(migrations, '20260714073831_provider_neutral_hours_governance.sql'),
    'utf8',
  );
  const auditRunner = readFileSync(join(process.cwd(), 'scripts', 'audit-opening-hours.ts'), 'utf8');
  const remediationRunner = readFileSync(
    join(process.cwd(), 'scripts', 'remediate-opening-hours.ts'),
    'utf8',
  );

  test('validates null-safe venue, counter, and outcome coherence constraints', () => {
    expect(hardening).toMatch(/hours_review_status\s+in\s*\([\s\S]*verified/i);
    expect(hardening).toMatch(/validate\s+constraint\s+venues_hours_state_coherence_check/i);
    expect(hardening).toMatch(/validate\s+constraint\s+hours_review_runs_counter_sum_check/i);
    expect(hardening).toMatch(/validate\s+constraint\s+hours_review_outcomes_coherence_check/i);
  });

  test('finish derives and compares every counter to persisted outcomes', () => {
    expect(hardening).toMatch(/finish_hours_review_run[\s\S]*from\s+public\.hours_review_outcomes/i);
    expect(hardening).toMatch(/p_total_count\s*<>\s*(?:c\.)?total_count/i);
  });

  test('remediation RPC validates a live remediation lease and preserves first prior status', () => {
    expect(hardening).toMatch(/renew_hours_review_run_lease/i);
    expect(hardening).toMatch(/trigger_type\s*=\s*'remediation'/i);
    expect(hardening).toMatch(/lease_expires_at\s*>\s*(?:clock_timestamp|statement_timestamp)\(\)/i);
    expect(hardening).toMatch(/prior_review_status\s*=\s*existing\.prior_review_status/i);
  });

  test('remediation runner renews leases, isolates RPC errors, and writes report before finish', () => {
    expect(remediationRunner).toMatch(/renew_hours_review_run_lease/i);
    expect(remediationRunner).toMatch(/hours_review_outcomes[\s\S]*upsert/i);
    expect(remediationRunner).toMatch(/continue;/i);
    expect(remediationRunner.indexOf('writeFile(')).toBeGreaterThanOrEqual(0);
    expect(remediationRunner.indexOf('finish_hours_review_run')).toBeGreaterThan(
      remediationRunner.indexOf('writeFile('),
    );
  });

  test('audit runner uses keyset pagination and emits an inspectable GitHub run link', () => {
    expect(auditRunner).toMatch(/\.gt\(\s*['"]id['"]/i);
    expect(auditRunner).not.toMatch(/\.range\(/);
    expect(auditRunner).toMatch(/GITHUB_SERVER_URL[\s\S]*GITHUB_REPOSITORY[\s\S]*actions\/runs/i);
    expect(auditRunner).toMatch(/\[[^\]]+\]\([^\)]+\)/);
  });

  test('initial forward migration repairs partial tables before dependent objects and converges identity', () => {
    const repairIndex = forward.search(/alter\s+table\s+public\.hours_review_runs[\s\S]*add\s+column\s+if\s+not\s+exists/i);
    const dependentIndex = forward.search(/create\s+index\s+if\s+not\s+exists\s+hours_review_runs_started_at_idx/i);
    expect(repairIndex).toBeGreaterThanOrEqual(0);
    expect(dependentIndex).toBeGreaterThan(repairIndex);
    expect(forward).toMatch(/attidentity|add\s+generated\s+by\s+default\s+as\s+identity/i);
  });
});
