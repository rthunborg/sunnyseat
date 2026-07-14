/**
 * ATDD RED-PHASE acceptance scaffolds — Story 12.1 (AC3, AC4, AC8)
 * Provider-neutral classification, update planning, and remediation contracts.
 */
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

type GovernanceModule = {
  classifyHoursEvidence(input: Record<string, unknown>): {
    kind: 'accepted' | 'manual_review' | 'failed';
    schedule?: Record<string, { open: string; close: string } | null> | null;
    provenance?: Record<string, unknown>;
    reason?: string;
    errorClass?: string;
  };
  planCanonicalHoursUpdate(input: Record<string, unknown>): {
    shouldWrite: boolean;
    schedule?: Record<string, { open: string; close: string } | null> | null;
    preservesPriorSchedule?: boolean;
    idempotent?: boolean;
  };
  remediateOpeningHoursRows(input: Record<string, unknown>): Promise<{
    updates: Array<Record<string, unknown>>;
    outcomes: Array<Record<string, unknown>>;
  }>;
};

async function loadGovernance(): Promise<GovernanceModule> {
  const moduleUrl = pathToFileURL(
    join(process.cwd(), 'lib', 'services', 'opening-hours-governance.ts'),
  ).href;
  return (await import(/* @vite-ignore */ moduleUrl)) as GovernanceModule;
}

const eligibleEvidence = {
  sourceType: 'venue_website',
  sourceReference: 'https://venue.example/oppettider',
  reviewedAt: '2026-07-13T10:00:00.000Z',
  nextReviewAt: '2026-10-13T10:00:00.000Z',
};

describe('[12.1 AC4] provider-neutral adapter outcome union', () => {
  test('[P1] accepts one interval, explicit closed days, and past-midnight without changing shape', async () => {
    const { classifyHoursEvidence } = await loadGovernance();
    const schedule = {
      '1': { open: '11:00', close: '22:00' },
      '2': null,
      '5': { open: '18:00', close: '02:00' },
    };
    expect(classifyHoursEvidence({ ...eligibleEvidence, schedule })).toMatchObject({
      kind: 'accepted',
      schedule,
      provenance: expect.objectContaining({ sourceType: 'venue_website' }),
    });
  });

  test('[P1] preserves whole-field unknown as null rather than seven closed weekdays', async () => {
    const { classifyHoursEvidence } = await loadGovernance();
    const result = classifyHoursEvidence({ ...eligibleEvidence, schedule: null });
    expect(result).toMatchObject({ kind: 'accepted', schedule: null });
    expect(result.schedule).not.toEqual({
      '1': null,
      '2': null,
      '3': null,
      '4': null,
      '5': null,
      '6': null,
      '7': null,
    });
  });

  test.each([
    ['split', { '1': [{ open: '11:00', close: '14:00' }, { open: '17:00', close: '23:00' }] }],
    ['unsupported_24_7', { mode: '24/7' }],
    ['seasonal', { seasonal: true, schedule: { '1': { open: '11:00', close: '22:00' } } }],
    ['holiday_specific', { holidaySpecific: true, schedule: { '1': { open: '11:00', close: '22:00' } } }],
  ])('[P1] routes %s evidence wholesale to manual review', async (reason, schedule) => {
    const { classifyHoursEvidence } = await loadGovernance();
    const result = classifyHoursEvidence({ ...eligibleEvidence, schedule });
    expect(result.kind).toBe('manual_review');
    expect(result.reason).toMatch(new RegExp(String(reason).replace('_', '.?'), 'i'));
    expect(result.schedule).toBeUndefined();
  });

  test('[P1] malformed evidence fails with a bounded error class', async () => {
    const { classifyHoursEvidence } = await loadGovernance();
    expect(
      classifyHoursEvidence({ ...eligibleEvidence, schedule: { '1': { open: '11', close: 'tomorrow' } } }),
    ).toMatchObject({ kind: 'failed', errorClass: expect.any(String) });
  });
});

describe('[12.1 AC3/AC4] canonical update and remediation behavior', () => {
  test('[P1] only accepted outcomes write atomically and an identical rerun is idempotent', async () => {
    const { planCanonicalHoursUpdate } = await loadGovernance();
    const schedule = { '1': { open: '11:00', close: '22:00' } };
    const accepted = { kind: 'accepted', schedule, provenance: eligibleEvidence };
    expect(planCanonicalHoursUpdate({ current: null, outcome: accepted })).toMatchObject({
      shouldWrite: true,
      schedule,
    });
    expect(
      planCanonicalHoursUpdate({
        current: { schedule, provenance: eligibleEvidence },
        outcome: accepted,
      }),
    ).toMatchObject({ shouldWrite: false, idempotent: true });
  });

  test.each(['manual_review', 'failed'])(
    '[P1] %s never overwrites the prior independently verified schedule',
    async (kind) => {
      const { planCanonicalHoursUpdate } = await loadGovernance();
      const prior = { '1': { open: '11:00', close: '22:00' } };
      expect(
        planCanonicalHoursUpdate({
          current: { schedule: prior, provenance: eligibleEvidence },
          outcome: kind === 'failed'
            ? { kind, errorClass: 'provider_failure' }
            : { kind, reason: 'split' },
        }),
      ).toMatchObject({
        shouldWrite: false,
        preservesPriorSchedule: true,
      });
    },
  );

  test('[P1] remediation classifies every row and deletes unproven/restricted schedules to whole-field unknown', async () => {
    const { remediateOpeningHoursRows } = await loadGovernance();
    const result = await remediateOpeningHoursRows({
      rows: [
        { id: '1', slug: 'verified', openingHours: { '1': { open: '11:00', close: '22:00' } }, evidence: eligibleEvidence },
        { id: '2', slug: 'unproven', openingHours: { '1': { open: '11:00', close: '22:00' } }, evidence: null },
        { id: '3', slug: 'restricted', openingHours: { '1': { open: '11:00', close: '22:00' } }, evidence: { sourceType: 'google' } },
      ],
    });
    expect(result.outcomes).toHaveLength(3);
    expect(result.updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: '2', openingHours: null }),
        expect.objectContaining({ id: '3', openingHours: null }),
      ]),
    );
    expect(JSON.stringify(result)).not.toMatch(/seven closed|relabelled.*manual/i);
  });

  test('[P1] duplicate Place IDs remain distinct venue outcomes', async () => {
    const { remediateOpeningHoursRows } = await loadGovernance();
    const result = await remediateOpeningHoursRows({
      rows: [
        { id: '10', slug: 'seating-a', placeId: 'shared-place', openingHours: null, evidence: eligibleEvidence },
        { id: '11', slug: 'seating-b', placeId: 'shared-place', openingHours: null, evidence: eligibleEvidence },
      ],
    });
    expect(result.outcomes.map((outcome) => outcome.venueId)).toEqual(['10', '11']);
  });
});
