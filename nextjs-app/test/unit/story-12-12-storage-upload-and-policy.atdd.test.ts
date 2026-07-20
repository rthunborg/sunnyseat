import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

const repoRoot = path.resolve(process.cwd(), '..');
const migrationPath = path.join(repoRoot, 'supabase', 'migrations', '20260719000000_venue_media_storage.sql');
const uploadScriptPath = path.join(process.cwd(), 'scripts', 'upload-venue-media.mjs');
const venueDocsPath = path.join(process.cwd(), 'docs', 'venue-data-load.md');

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock('@supabase/supabase-js');
  vi.resetModules();
});

async function withTempMediaFiles(
  files: { card: Buffer; hero: Buffer },
  callback: (paths: { dir: string; cardPath: string; heroPath: string }) => Promise<void>,
) {
  const dir = await mkdtemp(path.join(tmpdir(), 'sunnyseat-venue-media-'));
  const cardPath = path.join(dir, 'card.webp');
  const heroPath = path.join(dir, 'hero.webp');
  try {
    await Promise.all([
      writeFile(cardPath, files.card),
      writeFile(heroPath, files.hero),
    ]);
    await callback({ dir, cardPath, heroPath });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function makeWebpWithDimensions(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(30);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(buffer.byteLength - 8, 4);
  buffer.write('WEBP', 8, 'ascii');
  buffer.write('VP8X', 12, 'ascii');
  buffer.writeUInt32LE(10, 16);
  writeUInt24LE(buffer, 24, width - 1);
  writeUInt24LE(buffer, 27, height - 1);
  return buffer;
}

function writeUInt24LE(buffer: Buffer, offset: number, value: number) {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >> 8) & 0xff;
  buffer[offset + 2] = (value >> 16) & 0xff;
}

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

    await expect(
      script.validateVenueMediaUploadPlan({
        slug: 'test-venue-sunny',
        mediaVersion: 'v2026-07',
        cardPath: 'original.webp',
        heroPath: 'hero.webp',
      }),
    ).rejects.toThrow(/card\.webp|content.?type/i);
  });

  it('[P0] upload validation accepts optimized card and hero renditions and returns immutable object keys', async () => {
    const script = await import(pathToFileURL(uploadScriptPath).href);

    await withTempMediaFiles(
      {
        card: makeWebpWithDimensions(640, 400),
        hero: makeWebpWithDimensions(1600, 900),
      },
      async ({ cardPath, heroPath }) => {
        const plan = await script.validateVenueMediaUploadPlan({
          slug: 'test-venue-sunny',
          mediaVersion: 'v2026-07',
          cardPath,
          heroPath,
        });

        expect(plan.bucket).toBe('venue-media');
        expect(plan.cardObjectKey).toBe('test-venue-sunny/v2026-07/card.webp');
        expect(plan.heroObjectKey).toBe('test-venue-sunny/v2026-07/hero.webp');
        expect(plan.renditions.card).toMatchObject({
          bytes: 30,
          width: 640,
          height: 400,
          contentType: 'image/webp',
        });
        expect(plan.renditions.hero).toMatchObject({
          bytes: 30,
          width: 1600,
          height: 900,
          contentType: 'image/webp',
        });
      },
    );
  });

  it('[P0] upload validation rejects over-size and over-dimension card and hero renditions before upload', async () => {
    const script = await import(pathToFileURL(uploadScriptPath).href);
    const validCard = makeWebpWithDimensions(640, 400);
    const validHero = makeWebpWithDimensions(1600, 900);

    await withTempMediaFiles(
      { card: Buffer.alloc(120 * 1024 + 1), hero: validHero },
      async ({ cardPath, heroPath }) => {
        await expect(
          script.validateVenueMediaUploadPlan({
            slug: 'test-venue-sunny',
            mediaVersion: 'v2026-07',
            cardPath,
            heroPath,
          }),
        ).rejects.toThrow(/card.*120 KiB/i);
      },
    );

    await withTempMediaFiles(
      { card: validCard, hero: Buffer.alloc(350 * 1024 + 1) },
      async ({ cardPath, heroPath }) => {
        await expect(
          script.validateVenueMediaUploadPlan({
            slug: 'test-venue-sunny',
            mediaVersion: 'v2026-07',
            cardPath,
            heroPath,
          }),
        ).rejects.toThrow(/hero.*350 KiB/i);
      },
    );

    await withTempMediaFiles(
      { card: makeWebpWithDimensions(641, 400), hero: validHero },
      async ({ cardPath, heroPath }) => {
        await expect(
          script.validateVenueMediaUploadPlan({
            slug: 'test-venue-sunny',
            mediaVersion: 'v2026-07',
            cardPath,
            heroPath,
          }),
        ).rejects.toThrow(/card.*640x400/i);
      },
    );

    await withTempMediaFiles(
      { card: validCard, hero: makeWebpWithDimensions(1600, 901) },
      async ({ cardPath, heroPath }) => {
        await expect(
          script.validateVenueMediaUploadPlan({
            slug: 'test-venue-sunny',
            mediaVersion: 'v2026-07',
            cardPath,
            heroPath,
          }),
        ).rejects.toThrow(/hero.*1600x900/i);
      },
    );
  });

  it('[P0] upload workflow refuses duplicate existing rendition keys before writing objects', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://sunnyseat.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-test-key');

    const upload = vi.fn();
    const list = vi.fn().mockResolvedValue({
      data: [{ name: 'card.webp' }],
      error: null,
    });
    const from = vi.fn(() => ({
      list,
      upload,
      getPublicUrl: vi.fn(),
    }));
    const createClient = vi.fn(() => ({
      storage: { from },
    }));
    vi.doMock('@supabase/supabase-js', () => ({ createClient }));

    const script = await import(pathToFileURL(uploadScriptPath).href);

    await withTempMediaFiles(
      {
        card: makeWebpWithDimensions(640, 400),
        hero: makeWebpWithDimensions(1600, 900),
      },
      async ({ cardPath, heroPath }) => {
        await expect(
          script.uploadVenueMediaRenditions({
            slug: 'test-venue-sunny',
            mediaVersion: 'v2026-07',
            cardPath,
            heroPath,
          }),
        ).rejects.toThrow(/already exists|new mediaVersion/i);
      },
    );

    expect(createClient).toHaveBeenCalledWith(
      'https://sunnyseat.supabase.co',
      'service-role-test-key',
      expect.any(Object),
    );
    expect(from).toHaveBeenCalledWith('venue-media');
    expect(list).toHaveBeenCalledWith('test-venue-sunny/v2026-07', { limit: 100 });
    expect(upload).not.toHaveBeenCalled();
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
