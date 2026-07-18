import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { classifyHoursAuditVenue } from '@/lib/services/opening-hours-audit';

const NOW = new Date('2026-07-17T10:00:00.000Z');
const repoRoot = join(process.cwd(), '..');
const migration = readFileSync(
  join(
    repoRoot,
    'supabase',
    'migrations',
    '20260717120000_close_hours_review_iteration_8.sql',
  ),
  'utf8',
);

function migrationFunction(name: string): string {
  const marker = `create or replace function public.${name}(`;
  const start = migration.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = migration.indexOf('\ncreate or replace function public.', start + marker.length);
  return next === -1 ? migration.slice(start) : migration.slice(start, next);
}

describe('[12.1 review iteration 8] weekly audit classification precedence', () => {
  test('reports malformed non-null hours as validation failure before missing provenance', () => {
    expect(
      classifyHoursAuditVenue({
        venue: {
          openingHours: { '1': { open: 'not-a-time', close: '22:00' } },
          provenance: null,
        },
        now: NOW,
      }),
    ).toEqual({
      outcome: 'failed',
      reason: 'classification_failed',
      errorClass: 'validation_failed',
    });
  });
});

describe('[12.1 review iteration 8] remediation migration contracts', () => {
  test('reconciles exact retries without requiring the current venue updated_at', () => {
    const requestFunction = migrationFunction('apply_hours_remediation_request');

    expect(requestFunction).toMatch(
      /existing_outcome\.remediation_request_fingerprint\s*=\s*computed_fingerprint/i,
    );
    expect(requestFunction).not.toMatch(
      /existing_outcome\.resulting_venue_updated_at/i,
    );
  });

  test('preserves a manual-review schedule only with durable verification evidence', () => {
    const outcomeFunction = migrationFunction('apply_hours_remediation_outcome');

    expect(outcomeFunction).toMatch(/has_preserved_verification_history/i);
    expect(outcomeFunction).toMatch(
      /o\.prior_review_status\s+in\s+\('verified',\s*'due'\)/i,
    );
    expect(outcomeFunction).toMatch(/or\s+has_preserved_verification_history/i);
    expect(outcomeFunction).not.toMatch(
      /prior_status\s+in\s+\('verified',\s*'due',\s*'manual_review',\s*'failed'\)/i,
    );
  });

  test('does not turn missing venues or infrastructure exceptions into venue validation rows', () => {
    const batchFunction = migrationFunction('apply_hours_remediation_batch');

    expect(batchFunction).toMatch(/raise exception 'remediation venue disappeared during batch'/i);
    expect(batchFunction).toMatch(/raise exception 'remediation fallback outcome conflict'/i);
    expect(batchFunction).not.toMatch(/when\s+others/i);
    expect(batchFunction).toMatch(/on conflict \(run_id, venue_id\) do nothing/i);
  });
});
