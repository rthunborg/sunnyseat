import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import type { Database, Json } from '@/lib/supabase/types';

const repoRoot = join(process.cwd(), '..');
const migration = readFileSync(
  join(
    repoRoot,
    'supabase',
    'migrations',
    '20260717161000_close_hours_review_iteration_10.sql',
  ),
  'utf8',
);
const generatedTypes = readFileSync(
  join(process.cwd(), 'lib', 'supabase', 'types.ts'),
  'utf8',
);

function migrationFunction(name: string): string {
  const marker = `create or replace function public.${name}(`;
  const start = migration.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = migration.indexOf('\ncreate or replace function public.', start + marker.length);
  return next === -1 ? migration.slice(start) : migration.slice(start, next);
}

type RemediationOutcomeArgs =
  Database['public']['Functions']['apply_hours_remediation_outcome']['Args'];
type FingerprintBoundOutcomeArgs = Extract<
  RemediationOutcomeArgs,
  {
    p_remediation_claim_identity: string;
    p_remediation_input_fingerprint: string;
    p_request_fingerprint: string;
  }
>;

describe('[12.1 review iteration 10] remediation retry and generated types', () => {
  test('same-run invalid fallback retries reconcile only when bounded evidence still matches', () => {
    const batchFunction = migrationFunction('apply_hours_remediation_batch');

    expect(batchFunction).toMatch(/existing_fallback/i);
    expect(batchFunction).toMatch(
      /existing_fallback\.remediation_input_fingerprint\s*=\s*p_remediation_input_fingerprint/i,
    );
    expect(batchFunction).toMatch(
      /existing_fallback\.remediation_request_fingerprint\s*=\s*canonical_request_fingerprint/i,
    );
    expect(batchFunction).toMatch(
      /existing_fallback\.resulting_review_status\s+is\s+not\s+distinct\s+from\s+prior_status/i,
    );
    expect(batchFunction).toMatch(
      /existing_fallback\.resulting_venue_updated_at\s+is\s+not\s+distinct\s+from\s+prior_updated_at/i,
    );
    expect(batchFunction).toMatch(/continue;\s*end if;\s*raise exception 'remediation fallback outcome conflict'/i);
  });

  test('generated Supabase types include the fingerprint-bound outcome overload', () => {
    const supportedArgs: FingerprintBoundOutcomeArgs = {
      p_run_id: 'run',
      p_remediation_input_fingerprint: 'a'.repeat(64),
      p_remediation_claim_identity: 'b'.repeat(64),
      p_request_fingerprint: 'c'.repeat(64),
      p_venue_id: 'venue-1',
      p_venue_slug: 'venue-one',
      p_opening_hours: null as Json,
      p_source_type: 'venue_website',
      p_source_reference: 'venue-site:venue-one:2026-07-17',
      p_review_status: 'verified',
      p_reviewed_at: '2026-07-17T10:00:00.000Z',
      p_next_review_at: '2026-10-15T10:00:00.000Z',
      p_notes: 'note:verified',
      p_review_reason: 'provenance_conflict',
      p_last_error_class: 'validation_failed',
      p_outcome: 'current',
      p_reason: 'review_current',
      p_error_class: 'validation_failed',
      p_expected_updated_at: '2026-07-17T10:00:00.000Z',
    };

    expect(supportedArgs.p_request_fingerprint).toBe('c'.repeat(64));
    expect(generatedTypes).toMatch(/p_remediation_input_fingerprint: string/);
    expect(generatedTypes).toMatch(/p_remediation_claim_identity: string/);
    expect(generatedTypes).toMatch(/p_request_fingerprint: string/);
  });
});
