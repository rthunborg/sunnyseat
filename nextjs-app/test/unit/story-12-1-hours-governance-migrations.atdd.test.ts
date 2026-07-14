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
const allSql = reconciliation + '\n' + governance + '\n' + grantHardening;

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
    expect(governance).toMatch(/advisory|non.?overlap|active_run|lease/i);
    expect(governance).toMatch(/180\s*(?:days?|day)/i);
    expect(governance).toMatch(/DELETE\s+FROM[\s\S]*hours_review_(?:runs|outcomes)/i);
  });
});
