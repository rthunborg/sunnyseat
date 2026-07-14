import { existsSync, readFileSync, readdirSync } from 'node:fs';
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

const NOW = new Date('2026-07-14T10:00:00.000Z');
const FINISHED_AT = new Date('2026-07-14T10:05:00.000Z');
const VERIFIED_PROVENANCE = {
  reviewStatus: 'verified',
  reviewedAt: '2026-07-13T10:00:00.000Z',
  nextReviewAt: '2026-10-13T10:00:00.000Z',
};
const ELIGIBLE_EVIDENCE = {
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

describe('[12.1 review] weekly audit cannot silently report false health', () => {
  test.each([
    ['due', { ...VERIFIED_PROVENANCE, reviewStatus: 'due' }, 'due'],
    [
      'manual split',
      {
        ...VERIFIED_PROVENANCE,
        reviewStatus: 'manual_review',
        reviewReason: 'unsupported_split',
      },
      'split',
    ],
    [
      'manual conflict',
      {
        ...VERIFIED_PROVENANCE,
        reviewStatus: 'manual_review',
        reviewReason: 'provenance_conflict',
      },
      'conflicting',
    ],
    [
      'failed',
      {
        ...VERIFIED_PROVENANCE,
        reviewStatus: 'failed',
        lastErrorClass: 'read_failed',
      },
      'failed',
    ],
  ])('classifies explicit %s state instead of current', (_label, provenance, outcome) => {
    expect(
      classifyHoursAuditVenue({
        venue: {
          openingHours: { '1': { open: '11:00', close: '22:00' } },
          provenance,
        },
        now: NOW,
      }),
    ).toMatchObject({ outcome });
  });

  test.each([
    ['missing reviewedAt', { nextReviewAt: '2026-10-13T10:00:00.000Z' }],
    [
      'invalid reviewedAt',
      {
        reviewedAt: 'not-a-date',
        nextReviewAt: '2026-10-13T10:00:00.000Z',
      },
    ],
    [
      'future reviewedAt',
      {
        reviewedAt: '2027-01-01T00:00:00.000Z',
        nextReviewAt: '2027-02-01T00:00:00.000Z',
      },
    ],
    [
      'invalid nextReviewAt',
      {
        reviewedAt: '2026-07-13T10:00:00.000Z',
        nextReviewAt: 'not-a-date',
      },
    ],
  ])('does not treat %s as current', (_label, dates) => {
    expect(
      classifyHoursAuditVenue({
        venue: {
          openingHours: { '1': { open: '11:00', close: '22:00' } },
          provenance: { reviewStatus: 'verified', ...dates },
        },
        now: NOW,
      }),
    ).toMatchObject({
      outcome: 'failed',
      reason: 'classification_failed',
      errorClass: 'validation_failed',
    });
  });

  test.each([
    {},
    { '1': { open: '11', close: '22:00' } },
    { '1': { open: '11:00', close: '11:00' } },
  ])('rejects malformed persisted schedules during audit', (openingHours) => {
    expect(
      classifyHoursAuditVenue({
        venue: { openingHours, provenance: VERIFIED_PROVENANCE },
        now: NOW,
      }),
    ).toMatchObject({ outcome: 'failed', errorClass: 'validation_failed' });
  });

  test('requires the full repository contract and finalizes run-level failures', async () => {
    const repos = repositories({
      listVenues: vi.fn().mockRejectedValue(new Error('database offline')),
    });
    await expect(
      runOpeningHoursAudit({
        enabled: true,
        now: NOW,
        clock: () => FINISHED_AT,
        repositories: repos,
      }),
    ).rejects.toThrow('database offline');
    expect(repos.failRun).toHaveBeenCalledWith(
      expect.objectContaining({ runId: 'run-1', finishedAt: FINISHED_AT }),
    );
  });

  test('persists a bounded failed replacement when an outcome write fails once', async () => {
    const recordOutcome = vi
      .fn()
      .mockRejectedValueOnce(new Error('write failed'))
      .mockResolvedValueOnce(undefined);
    const repos = repositories({
      listVenues: vi.fn().mockResolvedValue([
        {
          id: 'venue-1',
          slug: 'venue-1',
          openingHours: { '1': { open: '11:00', close: '22:00' } },
          provenance: VERIFIED_PROVENANCE,
        },
      ]),
      recordOutcome,
    });
    const result = await runOpeningHoursAudit({
      enabled: true,
      now: NOW,
      clock: () => FINISHED_AT,
      repositories: repos,
    });
    expect(recordOutcome).toHaveBeenCalledTimes(2);
    expect(recordOutcome).toHaveBeenLastCalledWith(
      expect.objectContaining({
        venueId: 'venue-1',
        outcome: 'failed',
        reason: 'classification_failed',
        errorClass: 'database_error',
      }),
    );
    expect(result.counts).toMatchObject({ current: 0, failed: 1 });
  });

  test('uses completion time for finish and retention boundaries', async () => {
    const repos = repositories();
    await runOpeningHoursAudit({
      enabled: true,
      now: NOW,
      clock: () => FINISHED_AT,
      repositories: repos,
    });
    expect(repos.finishRun).toHaveBeenCalledWith(
      expect.objectContaining({ finishedAt: FINISHED_AT }),
    );
    expect(repos.pruneBefore).toHaveBeenCalledWith(
      new Date('2026-01-15T10:05:00.000Z'),
    );
  });
});

describe('[12.1 review] governance writes only coherent, policy-safe state', () => {
  test('maps omitted whole-field hours to unknown and never defaults them verified', () => {
    expect(classifyHoursEvidence({ ...ELIGIBLE_EVIDENCE })).toMatchObject({
      kind: 'accepted',
      schedule: null,
      provenance: { reviewStatus: 'unknown' },
    });
  });

  test.each([
    { '1': { open: '11:00', close: '11:00' } },
    { '1': undefined },
  ])('rejects zero-length or effectively empty schedules', (schedule) => {
    expect(
      classifyHoursEvidence({ ...ELIGIBLE_EVIDENCE, schedule }),
    ).toMatchObject({ kind: 'failed', errorClass: 'malformed_schedule' });
  });

  test.each(['due', 'manual_review', 'unknown', 'failed'])(
    'does not accept a canonical schedule with %s review state',
    (reviewStatus) => {
      expect(
        classifyHoursEvidence({
          ...ELIGIBLE_EVIDENCE,
          reviewStatus,
          schedule: { '1': { open: '11:00', close: '22:00' } },
        }),
      ).toMatchObject({ kind: 'failed', errorClass: 'invalid_provenance' });
    },
  );

  test.each([
    'https://venue.example/oppettider',
    'provider-payload:{"hours":"11-22"}',
    'owner-attested:key=secret-value',
  ])('rejects unsafe source references: %s', (sourceReference) => {
    expect(
      classifyHoursEvidence({
        ...ELIGIBLE_EVIDENCE,
        sourceReference,
        schedule: { '1': { open: '11:00', close: '22:00' } },
      }),
    ).toMatchObject({ kind: 'failed', errorClass: 'invalid_provenance' });
  });

  test('persists manual-review and invalid eligible evidence as observable review state', async () => {
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
          evidence: ELIGIBLE_EVIDENCE,
        },
        {
          id: 'invalid',
          slug: 'invalid',
          openingHours: { '1': { open: '11:00', close: '22:00' } },
          evidence: { ...ELIGIBLE_EVIDENCE, reviewedAt: 'invalid' },
        },
      ],
    });
    expect(result.updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'manual',
          openingHours: null,
          reviewStatus: 'manual_review',
        }),
        expect.objectContaining({
          id: 'invalid',
          openingHours: null,
          reviewStatus: 'failed',
        }),
      ]),
    );
  });
});

describe('[12.1 review] deployment contracts are explicit and recoverable', () => {
  const repoRoot = join(process.cwd(), '..');
  const migrationName = readdirSync(join(repoRoot, 'supabase', 'migrations')).find(
    (name) => name.includes('harden_hours_governance_review_fixes'),
  );
  const migration = migrationName
    ? readFileSync(join(repoRoot, 'supabase', 'migrations', migrationName), 'utf8')
    : '';
  const runner = readFileSync(
    join(process.cwd(), 'scripts', 'audit-opening-hours.ts'),
    'utf8',
  );
  const workflow = readFileSync(
    join(repoRoot, '.github', 'workflows', 'hours-review-audit.yml'),
    'utf8',
  );
  const fixture = readFileSync(
    join(process.cwd(), 'test', 'sql', 'story-12-1-hours-governance-fixture.sql'),
    'utf8',
  );

  test('migration applies column grants, protects metadata, and keeps service access', () => {
    expect(migration).toMatch(/revoke\s+select\s+on\s+(?:table\s+)?public\.venues[\s\S]*anon[\s\S]*authenticated/i);
    expect(migration).toMatch(/grant\s+select\s*\([\s\S]*opening_hours[\s\S]*\)[\s\S]*to\s+anon,\s*authenticated/i);
    expect(migration).not.toMatch(/grant\s+select\s*\([\s\S]{0,500}(?:place_id|hours_source_reference|hours_notes)[\s\S]{0,500}\)[\s\S]*to\s+anon/i);
    expect(migration).toMatch(/grant\s+select[\s\S]*public\.venues[\s\S]*service_role/i);
  });

  test('migration repairs drift and enforces coherent bounded rows', () => {
    expect(migration).toMatch(/alter\s+column\s+place_id\s+drop\s+not\s+null/i);
    expect(migration).toMatch(/place_id[\s\S]*(?:pg_constraint|pg_index)[\s\S]*(?:drop constraint|drop index)/i);
    expect(migration).toMatch(/char_length\s*\(hours_source_reference\)[\s\S]*500/i);
    expect(migration).toMatch(/char_length\s*\(hours_notes\)[\s\S]*1000/i);
    expect(migration).toMatch(/total_count[\s\S]*current_count[\s\S]*missing_provenance_count/i);
    expect(migration).toMatch(/prior_review_status/i);
    expect(migration).toMatch(/resulting_review_status/i);
    expect(migration).toMatch(/classification_failed[\s\S]*error_class\s+is\s+not\s+null/i);
    expect(migration).toMatch(/add\s+column\s+if\s+not\s+exists/i);
  });

  test('migration provides lease recovery, failure finalization, and atomic remediation', () => {
    expect(migration).toMatch(/lease_expires_at/i);
    expect(migration).toMatch(/claim_hours_review_run[\s\S]*(?:lease_expires_at|interval\s+'15 minutes')/i);
    expect(migration).toMatch(/fail_hours_review_run/i);
    expect(migration).toMatch(/apply_hours_remediation_outcome/i);
  });

  test('runner paginates, separates machine state from notes, and checks overlap lookup errors', () => {
    expect(runner).toMatch(/\.range\(/);
    expect(runner).toMatch(/activeError|active.*error/i);
    expect(runner).not.toMatch(/reviewFlags\(row\.hours_notes\)|hours_notes[\s\S]{0,100}review-error:/i);
    expect(runner).toMatch(/hours_review_reason/);
    expect(runner).toMatch(/hours_last_error_class/);
  });

  test('production workflow pins actions and forbids npx network fallback', () => {
    expect(workflow).toMatch(/actions\/checkout@[0-9a-f]{40}/);
    expect(workflow).toMatch(/actions\/setup-node@[0-9a-f]{40}/);
    expect(workflow).toMatch(/npx\s+--no-install\s+esbuild/);
  });

  test('destructive SQL fixture proves a disposable database before DROP', () => {
    const guardIndex = fixture.search(/current_database\(\)|sunnyseat_test/i);
    const dropIndex = fixture.search(/drop\s+table/i);
    expect(guardIndex).toBeGreaterThanOrEqual(0);
    expect(dropIndex).toBeGreaterThan(guardIndex);
    expect(existsSync(join(process.cwd(), 'scripts', 'remediate-opening-hours.ts'))).toBe(true);
  });
});
