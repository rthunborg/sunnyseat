/**
 * ATDD RED-PHASE acceptance scaffolds — Story 12.1 (AC2, AC8)
 * Repository-authoritative migration and service-only schema contracts.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const repoRoot = join(process.cwd(), '..');
const migrationsDir = join(repoRoot, 'supabase', 'migrations');

function migrationFiles(): string[] {
  if (!existsSync(migrationsDir)) return [];
  return readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();
}

function readMigration(namePart: string): string {
  const file = migrationFiles().find((candidate) => candidate.includes(namePart));
  return file ? readFileSync(join(migrationsDir, file), 'utf8') : '';
}

const reconciliation = readMigration('reconcile_venue_place_identity');
const governance = readMigration('provider_neutral_hours_governance');
const grantHardening = readMigration('tighten_hours_review_service_grants');
const reviewHardening = readMigration('harden_hours_governance_review_fixes');
const verifiedState = readMigration('enforce_verified_public_hours_state');
const terminalHardening = readMigration(
  'complete_hours_governance_review_hardening',
);
const serializedPersistence = readMigration(
  'serialize_hours_review_persistence',
);
const allSql =
  reconciliation +
  '\n' +
  governance +
  '\n' +
  grantHardening +
  '\n' +
  reviewHardening +
  '\n' +
  verifiedState +
  '\n' +
  terminalHardening +
  '\n' +
  serializedPersistence;

describe('[12.1 AC2] canonical migration chain', () => {
  test('[P0] reconciliation precedes the forward provider-neutral migration', () => {
    const files = migrationFiles();
    const reconcileIndex = files.findIndex((file) =>
      file.includes('reconcile_venue_place_identity'),
    );
    const governanceIndex = files.findIndex((file) =>
      file.includes('provider_neutral_hours_governance'),
    );
    expect(reconcileIndex).toBeGreaterThanOrEqual(0);
    expect(governanceIndex).toBeGreaterThan(reconcileIndex);
  });

  test('[P0] migration is idempotent and keeps nullable indexed non-unique place_id only', () => {
    expect(allSql).toMatch(/IF\s+(?:NOT\s+)?EXISTS/i);
    expect(allSql).toMatch(/\bplace_id\b/i);
    expect(governance).toMatch(/DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+)?places_api_url/i);
    expect(governance).toMatch(/CREATE\s+INDEX[\s\S]*place_id/i);
    expect(governance).not.toMatch(/UNIQUE[\s\S]{0,80}place_id/i);
    expect(reviewHardening).toMatch(/ALTER\s+COLUMN\s+place_id\s+DROP\s+NOT\s+NULL/i);
    expect(reviewHardening).toMatch(/btrim\(place_id\)\s*<>\s*''/i);
  });

  test('[P0] venues gains checked provider-neutral provenance and review fields', () => {
    for (const field of [
      'hours_source_type',
      'hours_source_reference',
      'hours_review_status',
      'hours_reviewed_at',
      'hours_next_review_at',
      'hours_notes',
    ]) {
      expect(governance).toMatch(new RegExp('\\b' + field + '\\b', 'i'));
    }
    expect(governance).toMatch(/venue_confirmed/i);
    expect(governance).toMatch(/venue_website/i);
    expect(governance).toMatch(/licensed_provider/i);
    expect(governance).toMatch(/manual/i);
    expect(governance).toMatch(/verified/i);
    expect(governance).toMatch(/manual_review/i);
    expect(governance).toMatch(/unknown/i);
  });

  test('[P0] service-only run/outcome tables use checked statuses and bounded fields', () => {
    expect(governance).toMatch(/CREATE\s+TABLE[\s\S]*hours_review_runs/i);
    expect(governance).toMatch(/CREATE\s+TABLE[\s\S]*hours_review_outcomes/i);
    for (const outcome of ['due', 'unknown', 'conflict', 'split', 'failed', 'stale']) {
      expect(governance).toMatch(new RegExp('\\b' + outcome + '\\b', 'i'));
    }
    expect(governance).toMatch(/FOREIGN\s+KEY|REFERENCES/i);
    expect(governance).toMatch(/PRIMARY\s+KEY[\s\S]*(?:run_id|venue_id)/i);
  });

  test('[P0] both service tables enable RLS and deny public roles', () => {
    expect(governance).toMatch(
      /ALTER\s+TABLE[\s\S]*hours_review_runs[\s\S]*ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    );
    expect(governance).toMatch(
      /ALTER\s+TABLE[\s\S]*hours_review_outcomes[\s\S]*ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    );
    expect(governance).toMatch(/REVOKE[\s\S]*FROM\s+(?:PUBLIC|anon)/i);
    expect(governance).toMatch(/REVOKE[\s\S]*FROM\s+authenticated/i);
    expect(governance).not.toMatch(/CREATE\s+POLICY[\s\S]*TO\s+(?:anon|authenticated)/i);
  });

  test('[P0] service role receives explicit least-privilege grants separately from RLS', () => {
    expect(grantHardening).toMatch(/ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(grantHardening).toMatch(
      /REVOKE\s+ALL[\s\S]*FROM\s+public,\s*anon,\s*authenticated,\s*service_role/i,
    );
    expect(grantHardening).toMatch(
      /GRANT\s+select,\s*insert,\s*update,\s*delete[\s\S]*hours_review_runs\s+TO\s+service_role/i,
    );
    expect(grantHardening).toMatch(
      /GRANT\s+select,\s*insert,\s*update[\s\S]*hours_review_outcomes\s+TO\s+service_role/i,
    );
    expect(grantHardening).not.toMatch(
      /GRANT[\s\S]{0,80}delete[\s\S]{0,80}hours_review_outcomes/i,
    );
  });

  test('[P0] schema provides atomic non-overlap and deterministic 180-day cleanup seams', () => {
    expect(allSql).toMatch(/advisory|non.?overlap|active_run|lease/i);
    expect(governance).toMatch(/180\s*(?:days?|day)/i);
    expect(governance).toMatch(/DELETE\s+FROM[\s\S]*hours_review_(?:runs|outcomes)/i);
  });

  test('[P0] public venue reads use explicit safe columns while service metadata stays protected', () => {
    expect(reviewHardening).toMatch(/REVOKE\s+SELECT\s+ON\s+TABLE\s+public\.venues/i);
    expect(reviewHardening).toMatch(/GRANT\s+SELECT\s*\([\s\S]*opening_hours[\s\S]*\)[\s\S]*TO\s+anon,\s*authenticated/i);
    expect(reviewHardening).toMatch(/GRANT\s+SELECT\s+ON\s+TABLE\s+public\.venues\s+TO\s+service_role/i);
  });

  test('[P0] terminal migrations retain evidenced schedules while enforcing coherent review state', () => {
    expect(terminalHardening).toMatch(
      /hours_review_status\s+in\s*\(\s*'verified',\s*'due',\s*'manual_review',\s*'failed'/i,
    );
    expect(terminalHardening).toMatch(
      /hours_review_status\s+is\s+distinct\s+from\s+'unknown'[\s\S]*opening_hours\s+is\s+null/i,
    );
    expect(terminalHardening).toMatch(
      /hours_review_status\s+is\s+distinct\s+from\s+'manual_review'[\s\S]*hours_review_reason\s+is\s+not\s+null/i,
    );
    expect(terminalHardening).toMatch(
      /hours_review_status\s+is\s+distinct\s+from\s+'failed'[\s\S]*hours_last_error_class\s+is\s+not\s+null/i,
    );
  });

  test('[P0] database serializes outcome persistence with terminal transitions', () => {
    expect(serializedPersistence).toMatch(
      /enforce_active_hours_review_outcome_parent[\s\S]*for\s+update/i,
    );
    expect(serializedPersistence).toMatch(
      /before\s+insert\s+or\s+update[\s\S]*hours_review_outcomes/i,
    );
    expect(serializedPersistence).toMatch(
      /persist_hours_review_outcome[\s\S]*status\s*<>\s*'running'[\s\S]*lease_expires_at\s*<=\s*database_now/i,
    );
    expect(serializedPersistence).toMatch(
      /finish_hours_review_run[\s\S]*for\s+update[\s\S]*from\s+public\.hours_review_outcomes/i,
    );
  });

  test('[P0] leases, terminal status, and retention are database-time owned', () => {
    expect(serializedPersistence).toMatch(
      /claim_hours_review_run[\s\S]*database_now\s+timestamptz\s*:=\s*clock_timestamp\(\)/i,
    );
    expect(serializedPersistence).toMatch(
      /database_now\s*\+\s*interval\s+'15 minutes'/i,
    );
    expect(serializedPersistence).toMatch(
      /c\.failed_count\s*=\s*0[\s\S]*p_status\s*<>\s*'completed'[\s\S]*c\.failed_count\s*>\s*0[\s\S]*p_status\s*<>\s*'completed_with_failures'/i,
    );
    expect(serializedPersistence).toMatch(
      /database_cutoff\s+timestamptz\s*:=\s*clock_timestamp\(\)\s*-\s*interval\s+'180 days'/i,
    );
    expect(serializedPersistence).not.toMatch(
      /coalesce\(finished_at,\s*started_at\)\s*<\s*p_cutoff/i,
    );
  });

  test('[P0] remediation validates identity and an optimistic venue version', () => {
    expect(serializedPersistence).toMatch(/p_expected_updated_at\s+timestamptz/i);
    expect(serializedPersistence).toMatch(
      /canonical_slug\s+is\s+distinct\s+from\s+p_venue_slug/i,
    );
    expect(serializedPersistence).toMatch(
      /prior_updated_at\s+is\s+distinct\s+from\s+p_expected_updated_at/i,
    );
    expect(serializedPersistence).toMatch(
      /p_review_status\s*=\s*'verified'[\s\S]*p_outcome\s*=\s*'current'[\s\S]*p_reason\s*=\s*'review_current'/i,
    );
  });

  test('[P0] SQL authoring enforces canonical weekly hours after precise convergence', () => {
    expect(serializedPersistence).toMatch(
      /is_canonical_weekly_opening_hours[\s\S]*weekday\s*!~\s*'\^\[1-7\]\$'/i,
    );
    expect(serializedPersistence).toMatch(
      /jsonb_typeof\(interval_value\s*->\s*'open'\)\s*<>\s*'string'/i,
    );
    expect(serializedPersistence).toMatch(
      /interval_value\s*->>\s*'open'\)\s*=\s*\(interval_value\s*->>\s*'close'/i,
    );
    expect(serializedPersistence).toMatch(
      /story_12_1_convergence_inventory[\s\S]*diagnostic_codes[\s\S]*raise notice/i,
    );
    expect(serializedPersistence).toMatch(
      /validate\s+constraint\s+venues_opening_hours_shape_check/i,
    );
  });
});
