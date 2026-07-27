import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Story 12.5 schema and query-cache contracts', () => {
  const repoRoot = join(process.cwd(), '..');
  const migrationsDir = join(repoRoot, 'supabase', 'migrations');
  const storyMigrationName = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .find((file) => file.includes('dev_venue_editor'));
  const storyMigration = storyMigrationName
    ? readFileSync(join(migrationsDir, storyMigrationName), 'utf8')
    : '';
  const generatedTypes = readFileSync(
    join(process.cwd(), 'lib', 'supabase', 'types.ts'),
    'utf8',
  );
  const queryKeys = readFileSync(join(process.cwd(), 'lib', 'query-keys.ts'), 'utf8');
  const devEditorHook = readFileSync(
    join(process.cwd(), 'hooks', 'queries', 'useDevVenueEditor.ts'),
    'utf8',
  );
  const venueDataDocs = readFileSync(join(repoRoot, 'nextjs-app', 'docs', 'venue-data-load.md'), 'utf8');

  it('[P0] adds nullable display coordinates with pair and Gothenburg-bound constraints', () => {
    expect(storyMigration).toMatch(/add\s+column\s+if\s+not\s+exists\s+display_lat\s+double\s+precision/i);
    expect(storyMigration).toMatch(/add\s+column\s+if\s+not\s+exists\s+display_lng\s+double\s+precision/i);
    expect(storyMigration).toMatch(/venues_display_coordinate_pair_check/i);
    expect(storyMigration).toMatch(/display_lat\s+between\s+57\.6\s+and\s+57\.8/i);
    expect(storyMigration).toMatch(/display_lng\s+between\s+11\.8\s+and\s+12\.1/i);
  });

  it('[P0] exposes the atomic dev editor RPC without granting public write access', () => {
    expect(storyMigration).toMatch(/create\s+or\s+replace\s+function\s+public\.apply_dev_venue_editor_patch/i);
    expect(storyMigration).toMatch(/perform\s+public\.mark_venue_geometry_dirty/i);
    expect(storyMigration).toMatch(/grant\s+execute\s+on\s+function\s+public\.apply_dev_venue_editor_patch/i);
    expect(storyMigration).not.toMatch(/grant\s+.*update.*public\.venues.*\bto\s+(anon|authenticated)\b/i);
  });

  it('[P1] generated Supabase types and central query keys know about the editor surface', () => {
    expect(generatedTypes).toMatch(/display_lat:\s*number\s*\|\s*null/i);
    expect(generatedTypes).toMatch(/display_lng:\s*number\s*\|\s*null/i);
    expect(generatedTypes).toMatch(/apply_dev_venue_editor_patch:\s*{/i);
    expect(queryKeys).toMatch(/devVenueEditor/i);
    expect(devEditorHook).toMatch(/invalidateQueries\(\{\s*queryKey:\s*queryKeys\.venues\.all/i);
    expect(devEditorHook).toMatch(/invalidateQueries\(\{\s*queryKey:\s*queryKeys\.venues\.devVenueEditor\.all\(\)/i);
  });

  it('[P1] venue loading docs describe display-only pin edits and the dirty geometry publish workflow', () => {
    expect(venueDataDocs).toMatch(/display_lat/i);
    expect(venueDataDocs).toMatch(/display_lng/i);
    expect(venueDataDocs).toMatch(/SUNNYSEAT_ADMIN=dev/i);
    expect(venueDataDocs).toMatch(/mark_venue_geometry_dirty/i);
  });
});
