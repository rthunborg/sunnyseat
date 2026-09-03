import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const migration = readFileSync(
  join(
    process.cwd(),
    '..',
    'supabase',
    'migrations',
    '20260903103516_normalize_shadow_caster_provenance.sql',
  ),
  'utf8',
);
const compact = migration.replace(/\s+/g, ' ').trim();

describe('shadow-caster provenance normalization', () => {
  test('moves shared provenance onto the import batch', () => {
    for (const column of [
      'z_semantics',
      'source_collection_metadata',
      'source_update_metadata',
      'source_object_shared_metadata',
      'provenance_metadata',
    ]) {
      expect(compact).toContain(`add column if not exists ${column}`);
    }
    expect(compact).toContain('update public.shadow_caster_import_batches batch');
  });

  test('fails closed if batch or row provenance cannot be reconstructed', () => {
    expect(compact).toContain('create temporary table shadow_caster_provenance_checksums');
    expect(compact).toContain('normalization aborted without data loss');
    expect(compact).toContain(
      'sc.source_object_metadata || batch.source_object_shared_metadata',
    );
  });

  test('removes only batch-constant object metadata keys from caster rows', () => {
    expect(compact).toMatch(/update public\.shadow_casters sc set source_object_metadata =/i);
    for (const key of [
      'candidateSource',
      'dtmTileIds',
      'matchBufferM',
      'rawSourceFiles',
      'sourceDataset',
      'sourceFileChecksums',
    ]) {
      expect(migration).toContain(`'${key}'`);
    }
    expect(migration).not.toMatch(/source_object_metadata\s*=\s*'\{\}'::jsonb/i);
  });

  test('keeps the deployed g1 hash RPC compatible while adding a lean successor', () => {
    expect(compact).toContain(
      'create or replace function public.get_shadow_caster_hash_records(',
    );
    expect(compact).toContain(
      "sc.source_object_metadata || coalesce(batch.source_object_shared_metadata, '{}'::jsonb)",
    );
    expect(compact).toContain(
      'create or replace function public.get_shadow_caster_hash_records_v2(',
    );

    const v2 = compact.split(
      'create or replace function public.get_shadow_caster_hash_records_v2(',
    )[1]?.split('revoke all on function public.get_buildings_near_point')[0] ?? '';
    expect(v2).not.toContain('source_object_metadata jsonb');
    expect(v2).not.toContain('provenance_metadata jsonb');
  });

  test('keeps both hash RPCs service-role only', () => {
    expect(compact).toMatch(
      /revoke all on function public\.get_shadow_caster_hash_records_v2[^;]+from public, anon, authenticated, service_role;/i,
    );
    expect(compact).toMatch(
      /grant execute on function public\.get_shadow_caster_hash_records_v2[^;]+to service_role;/i,
    );
  });

  test('drops redundant caster columns only after compatibility functions are replaced', () => {
    const dropIndex = compact.indexOf('alter table public.shadow_casters drop column');
    expect(dropIndex).toBeGreaterThan(
      compact.indexOf('create or replace function public.get_shadow_caster_hash_records_v2'),
    );
    for (const column of [
      'source_collection_metadata',
      'source_update_metadata',
      'provenance_metadata',
      'z_semantics',
    ]) {
      expect(compact.slice(dropIndex)).toContain(`drop column ${column}`);
    }
  });
});
