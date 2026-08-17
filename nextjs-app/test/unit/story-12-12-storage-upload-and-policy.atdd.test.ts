import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

const repoRoot = path.resolve(process.cwd(), '..');
const migrationPath = path.join(repoRoot, 'supabase', 'migrations', '20260719000000_venue_media_storage.sql');
const uploadScriptPath = path.join(process.cwd(), 'scripts', 'upload-venue-media.mjs');
const venueDocsPath = path.join(process.cwd(), 'docs', 'venue-data-load.md');
const browserWritePolicyPattern =
  /create\s+policy[\s\S]*?on\s+storage\.objects[\s\S]*?for\s+(insert|update|delete|all)[\s\S]*?to\s+[^;\n]*\b(public|anon|authenticated)\b/i;

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
  const vp8Chunk = makeTinyVp8Chunk();
  const buffer = Buffer.alloc(30 + vp8Chunk.length);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(buffer.byteLength - 8, 4);
  buffer.write('WEBP', 8, 'ascii');
  buffer.write('VP8X', 12, 'ascii');
  buffer.writeUInt32LE(10, 16);
  writeUInt24LE(buffer, 24, width - 1);
  writeUInt24LE(buffer, 27, height - 1);
  vp8Chunk.copy(buffer, 30);
  return buffer;
}

function makeVp8xOnlyWebp(width: number, height: number): Buffer {
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

function makeTinyVp8Chunk(): Buffer {
  return Buffer.from(
    '56503820160000003001009d012a010001000ec0fe25a400037000000000',
    'hex',
  );
}

function withMetadataChunk(buffer: Buffer, chunkType: 'EXIF' | 'XMP ' | 'ICCP'): Buffer {
  const chunk = Buffer.alloc(10);
  chunk.write(chunkType, 0, 'ascii');
  chunk.writeUInt32LE(2, 4);
  chunk.writeUInt16LE(0, 8);
  const riffSize = buffer.readUInt32LE(4) + chunk.length;
  const output = Buffer.concat([buffer, chunk]);
  output.writeUInt32LE(riffSize, 4);
  return output;
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
    expect(sql).not.toMatch(/for\s+(insert|update|delete)\s+to\s+(public|anon|authenticated)/i);
  });

  it('[P0] documents protected-policy evidence gaps instead of faking live Supabase verification', async () => {
    const sql = await readFile(migrationPath, 'utf8');

    expect(sql).toMatch(/public read/i);
    expect(sql).toMatch(/anon.*write.*den/i);
    expect(sql).toMatch(/service.?role/i);
  });

  it('[P0] local migration source permits browser public reads only for venue-media and no browser writes', async () => {
    const sql = await readFile(migrationPath, 'utf8');

    expect(sql).not.toMatch(/alter\s+table\s+storage\.objects\s+enable\s+row\s+level\s+security/i);
    expect(sql).toMatch(/from\s+pg_policies/i);
    expect(sql).toMatch(/roles\s*&&\s*array\['public'::name,\s*'anon'::name,\s*'authenticated'::name\]/i);
    expect(sql).toMatch(/drop\s+policy\s+if\s+exists\s+%I\s+on\s+storage\.objects/i);
    expect(sql).toMatch(
      /create\s+policy\s+"venue media public read"\s+on\s+storage\.objects\s+for\s+select\s+to\s+anon,\s*authenticated\s+using\s*\(\s*bucket_id\s*=\s*'venue-media'\s*\)/i,
    );
    expect(sql).not.toMatch(browserWritePolicyPattern);

    expect(
      `create policy "venue media service writes"
       on storage.objects
       for insert
       to service_role
       with check (bucket_id = 'venue-media')`,
    ).not.toMatch(
      browserWritePolicyPattern,
    );
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
          width: 640,
          height: 400,
          contentType: 'image/webp',
        });
        expect(plan.renditions.hero).toMatchObject({
          width: 1600,
          height: 900,
          contentType: 'image/webp',
        });
      },
    );
  });

  it('[P0] upload validation rejects header-only, malformed, and metadata-bearing WebP files', async () => {
    const script = await import(pathToFileURL(uploadScriptPath).href);
    const validCard = makeWebpWithDimensions(640, 400);
    const validHero = makeWebpWithDimensions(1600, 900);

    await withTempMediaFiles(
      { card: makeVp8xOnlyWebp(640, 400), hero: validHero },
      async ({ cardPath, heroPath }) => {
        await expect(
          script.validateVenueMediaUploadPlan({
            slug: 'test-venue-sunny',
            mediaVersion: 'v2026-07',
            cardPath,
            heroPath,
          }),
        ).rejects.toThrow(/image payload|decodable/i);
      },
    );

    const badRiffSize = Buffer.from(validCard);
    badRiffSize.writeUInt32LE(badRiffSize.byteLength, 4);
    await withTempMediaFiles(
      { card: badRiffSize, hero: validHero },
      async ({ cardPath, heroPath }) => {
        await expect(
          script.validateVenueMediaUploadPlan({
            slug: 'test-venue-sunny',
            mediaVersion: 'v2026-07',
            cardPath,
            heroPath,
          }),
        ).rejects.toThrow(/dimensions|WebP/i);
      },
    );

    for (const chunkType of ['EXIF', 'XMP ', 'ICCP'] as const) {
      await withTempMediaFiles(
        { card: withMetadataChunk(validCard, chunkType), hero: validHero },
        async ({ cardPath, heroPath }) => {
          await expect(
            script.validateVenueMediaUploadPlan({
              slug: 'test-venue-sunny',
              mediaVersion: 'v2026-07',
              cardPath,
              heroPath,
            }),
          ).rejects.toThrow(/metadata|EXIF|XMP|ICC/i);
        },
      );
    }
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

  it('[P0] upload workflow rolls back objects written by a failed invocation so the media version can be retried', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://sunnyseat.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-test-key');

    const objectKeys = new Set(['test-venue-sunny/v2026-07/original-note.txt']);
    let failNextHeroUpload = true;
    const list = vi.fn(async (prefix: string) => ({
      data: [...objectKeys]
        .filter((key) => key.startsWith(`${prefix}/`))
        .map((key) => ({ name: key.slice(prefix.length + 1) })),
      error: null,
    }));
    const upload = vi.fn(async (key: string) => {
      if (objectKeys.has(key)) {
        return { data: null, error: { message: 'Object already exists' } };
      }
      if (key.endsWith('/hero.webp') && failNextHeroUpload) {
        failNextHeroUpload = false;
        return { data: null, error: { message: 'network timeout' } };
      }
      objectKeys.add(key);
      return { data: { path: key }, error: null };
    });
    const remove = vi.fn(async (keys: string[]) => {
      for (const key of keys) {
        objectKeys.delete(key);
      }
      return { data: keys.map((name) => ({ name })), error: null };
    });
    const from = vi.fn(() => ({
      list,
      upload,
      remove,
      getPublicUrl: (key: string) => ({ data: { publicUrl: `https://cdn.sunnyseat.test/${key}` } }),
    }));
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({ storage: { from } })),
    }));

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
        ).rejects.toThrow(/hero\.webp.*network timeout/i);

        expect(objectKeys.has('test-venue-sunny/v2026-07/card.webp')).toBe(false);
        expect(objectKeys.has('test-venue-sunny/v2026-07/original-note.txt')).toBe(true);

        await expect(
          script.uploadVenueMediaRenditions({
            slug: 'test-venue-sunny',
            mediaVersion: 'v2026-07',
            cardPath,
            heroPath,
          }),
        ).resolves.toMatchObject({
          bucket: 'venue-media',
          cardPath: 'test-venue-sunny/v2026-07/card.webp',
          heroPath: 'test-venue-sunny/v2026-07/hero.webp',
        });
      },
    );

    expect(objectKeys).toEqual(
      new Set([
        'test-venue-sunny/v2026-07/original-note.txt',
        'test-venue-sunny/v2026-07/card.webp',
        'test-venue-sunny/v2026-07/hero.webp',
      ]),
    );
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
