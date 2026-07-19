import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

const repoRoot = path.resolve(process.cwd(), '..');
const migrationPath = path.join(repoRoot, 'supabase', 'migrations', '20260719000000_venue_media_storage.sql');
const uploadScriptPath = path.join(process.cwd(), 'scripts', 'upload-venue-media.mjs');
const venueDocsPath = path.join(process.cwd(), 'docs', 'venue-data-load.md');

describe('Story 12.12 ATDD - Supabase Storage migration, upload tooling, and docs', () => {
  it('[P0] defines an idempotent public-read venue-media bucket migration with no anon write policies', async () => {
    const sql = await readFile(migrationPath, 'utf8');

    expect(sql).toMatch(/venue-media/);
    expect(sql).toMatch(/insert\s+into\s+storage\.buckets/i);
    expect(sql).toMatch(/public\s*=\s*true/i);
    expect(sql).toMatch(/allowed_mime_types/i);
    expect(sql).toMatch(/image\/webp/i);
    expect(sql).toMatch(/file_size_limit/i);
    expect(sql).toMatch(/350\s*\*\s*1024|358400/);
    expect(sql).toMatch(/create\s+policy/i);
    expect(sql).toMatch(/\bselect\b/i);
    expect(sql).not.toMatch(/for\s+(insert|update|delete)\s+to\s+(anon|authenticated)/i);
  });

  it('[P0] documents protected-policy evidence gaps instead of faking live Supabase verification', async () => {
    const sql = await readFile(migrationPath, 'utf8');

    expect(sql).toMatch(/public read/i);
    expect(sql).toMatch(/anon.*write.*den/i);
    expect(sql).toMatch(/service.?role/i);
  });

  it('[P0] maintainer upload validation enforces slug, mediaVersion, mime, dimensions, byte caps, and create-only keys', async () => {
    const script = await import(pathToFileURL(uploadScriptPath).href);

    await expect(
      script.validateVenueMediaUploadPlan({
        slug: 'Test Venue',
        mediaVersion: 'v2026-07',
        cardPath: 'card.webp',
        heroPath: 'hero.webp',
      }),
    ).rejects.toThrow(/slug/i);

    await expect(
      script.validateVenueMediaUploadPlan({
        slug: 'test-venue-sunny',
        mediaVersion: '../bad',
        cardPath: 'card.webp',
        heroPath: 'hero.webp',
      }),
    ).rejects.toThrow(/mediaVersion/i);

    await expect(
      script.validateVenueMediaUploadPlan({
        slug: 'test-venue-sunny',
        mediaVersion: 'v2026-07',
        cardPath: 'card.jpg',
        heroPath: 'hero.webp',
      }),
    ).rejects.toThrow(/webp|content.?type/i);
  });

  it('[P0] upload tooling refuses missing service-role configuration without leaking secrets', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://sunnyseat.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    const script = await import(pathToFileURL(uploadScriptPath).href);

    await expect(
      script.uploadVenueMediaRenditions({
        slug: 'test-venue-sunny',
        mediaVersion: 'v2026-07',
        cardPath: 'card.webp',
        heroPath: 'hero.webp',
      }),
    ).rejects.toThrow(/SUPABASE_SERVICE_ROLE_KEY/i);
  });

  it('[P1] venue data docs record the bucket, immutable key convention, rendition limits, initials fallback, and no-hotlink rule', async () => {
    const docs = await readFile(venueDocsPath, 'utf8');

    expect(docs).toMatch(/venue-media/);
    expect(docs).toMatch(/\{slug\}\/\{mediaVersion\}\/card\.webp/);
    expect(docs).toMatch(/\{slug\}\/\{mediaVersion\}\/hero\.webp/);
    expect(docs).toMatch(/640x400/);
    expect(docs).toMatch(/120\s*KiB/i);
    expect(docs).toMatch(/1600x900/);
    expect(docs).toMatch(/350\s*KiB/i);
    expect(docs).toMatch(/initials/i);
    expect(docs).toMatch(/hotlink|external/i);
    expect(docs).toMatch(/raw originals/i);
  });
});
