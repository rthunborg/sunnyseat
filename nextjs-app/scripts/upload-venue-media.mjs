#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const BUCKET = 'venue-media';
const CONTENT_TYPE = 'image/webp';
const CACHE_CONTROL_SECONDS = '31536000';
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MEDIA_VERSION_PATTERN = /^v[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const METADATA_CHUNKS = new Set(['EXIF', 'XMP ', 'ICCP']);
const DISALLOWED_CHUNKS = new Set(['ANIM', 'ANMF']);
const VP8X_METADATA_OR_ANIMATION_FLAGS = 0x20 | 0x08 | 0x04 | 0x02;
const RENDITIONS = {
  card: {
    fileName: 'card.webp',
    maxBytes: 120 * 1024,
    maxWidth: 640,
    maxHeight: 400,
  },
  hero: {
    fileName: 'hero.webp',
    maxBytes: 350 * 1024,
    maxWidth: 1600,
    maxHeight: 900,
  },
};

export async function validateVenueMediaUploadPlan(input) {
  const plan = normalizePlan(input);
  validateSlug(plan.slug);
  validateMediaVersion(plan.mediaVersion);
  validateRenditionPath(plan.cardPath, RENDITIONS.card.fileName, 'card');
  validateRenditionPath(plan.heroPath, RENDITIONS.hero.fileName, 'hero');

  const [card, hero] = await Promise.all([
    validateRenditionFile(plan.cardPath, 'card'),
    validateRenditionFile(plan.heroPath, 'hero'),
  ]);

  return {
    ...plan,
    bucket: BUCKET,
    cardObjectKey: objectKey(plan.slug, plan.mediaVersion, 'card'),
    heroObjectKey: objectKey(plan.slug, plan.mediaVersion, 'hero'),
    renditions: { card, hero },
  };
}

export async function uploadVenueMediaRenditions(input) {
  const supabaseUrl = requiredEnv('SUPABASE_URL') ?? requiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const plan = await validateVenueMediaUploadPlan(input);
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  const storage = supabase.storage.from(BUCKET);

  const existing = await storage.list(`${plan.slug}/${plan.mediaVersion}`, {
    limit: 100,
  });
  if (existing.error) {
    throw new Error(`Failed to check existing venue media objects: ${existing.error.message}`);
  }
  const existingNames = new Set((existing.data ?? []).map((entry) => entry.name));
  if (existingNames.has(RENDITIONS.card.fileName) || existingNames.has(RENDITIONS.hero.fileName)) {
    throw new Error(
      `Venue media version already exists: ${BUCKET}/${plan.slug}/${plan.mediaVersion}. Use a new mediaVersion.`,
    );
  }

  const uploadQueue = [
    { key: plan.cardObjectKey, buffer: plan.renditions.card.buffer },
    { key: plan.heroObjectKey, buffer: plan.renditions.hero.buffer },
  ];
  const uploadedKeys = [];
  try {
    for (const item of uploadQueue) {
      await uploadObject(storage, item.key, item.buffer);
      uploadedKeys.push(item.key);
    }
  } catch (error) {
    await rollbackUploadedObjects(storage, uploadedKeys, error);
  }

  return {
    bucket: BUCKET,
    cardPath: plan.cardObjectKey,
    heroPath: plan.heroObjectKey,
    cardUrl: storage.getPublicUrl(plan.cardObjectKey).data.publicUrl,
    heroUrl: storage.getPublicUrl(plan.heroObjectKey).data.publicUrl,
  };
}

function normalizePlan(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Upload plan must be an object');
  }
  const plan = input;
  return {
    slug: normalizeString(plan.slug, 'slug'),
    mediaVersion: normalizeString(plan.mediaVersion, 'mediaVersion'),
    cardPath: normalizeString(plan.cardPath, 'cardPath'),
    heroPath: normalizeString(plan.heroPath, 'heroPath'),
  };
}

function normalizeString(value, field) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

function validateSlug(slug) {
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error('slug must be lowercase URL-safe text, for example test-venue-sunny');
  }
}

function validateMediaVersion(mediaVersion) {
  if (!MEDIA_VERSION_PATTERN.test(mediaVersion)) {
    throw new Error('mediaVersion must be an immutable token such as v2026-07');
  }
}

function validateRenditionPath(filePath, expectedName, rendition) {
  if (path.basename(filePath) !== expectedName || path.extname(filePath).toLowerCase() !== '.webp') {
    throw new Error(`${rendition} rendition must be ${expectedName} with content type image/webp`);
  }
}

async function validateRenditionFile(filePath, rendition) {
  const buffer = await readFile(filePath);
  const rule = RENDITIONS[rendition];
  if (buffer.byteLength > rule.maxBytes) {
    throw new Error(`${rendition} rendition exceeds ${Math.round(rule.maxBytes / 1024)} KiB`);
  }
  if (!isWebp(buffer)) {
    throw new Error(`${rendition} rendition must be valid image/webp content`);
  }
  const webp = inspectWebp(buffer);
  if (!webp) {
    throw new Error(`${rendition} rendition dimensions could not be read from WebP metadata`);
  }
  if (webp.hasMetadata) {
    throw new Error(`${rendition} rendition must be stripped of EXIF, XMP, and ICC color profile metadata`);
  }
  if (!webp.hasImagePayload) {
    throw new Error(`${rendition} rendition must contain a decodable WebP image payload`);
  }
  if (webp.width > rule.maxWidth || webp.height > rule.maxHeight) {
    throw new Error(
      `${rendition} rendition exceeds ${rule.maxWidth}x${rule.maxHeight}: ${webp.width}x${webp.height}`,
    );
  }
  return {
    buffer,
    bytes: buffer.byteLength,
    width: webp.width,
    height: webp.height,
    contentType: CONTENT_TYPE,
  };
}

function isWebp(buffer) {
  return (
    buffer.byteLength >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  );
}

function inspectWebp(buffer) {
  if (!isWebp(buffer)) return null;
  if (buffer.readUInt32LE(4) !== buffer.byteLength - 8) return null;

  let offset = 12;
  let dimensions = null;
  let hasImagePayload = false;
  let hasMetadata = false;

  while (offset + 8 <= buffer.byteLength) {
    const chunkType = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;
    if (dataOffset + chunkSize > buffer.byteLength) return null;

    if (METADATA_CHUNKS.has(chunkType) || DISALLOWED_CHUNKS.has(chunkType)) {
      hasMetadata = true;
    }
    if (chunkType === 'VP8X' && chunkSize >= 10) {
      if ((buffer[dataOffset] & VP8X_METADATA_OR_ANIMATION_FLAGS) !== 0) {
        hasMetadata = true;
      }
      dimensions = {
        width: 1 + readUInt24LE(buffer, dataOffset + 4),
        height: 1 + readUInt24LE(buffer, dataOffset + 7),
      };
    }
    if (chunkType === 'VP8L' && chunkSize >= 5 && buffer[dataOffset] === 0x2f) {
      hasImagePayload = true;
      const b0 = buffer[dataOffset + 1];
      const b1 = buffer[dataOffset + 2];
      const b2 = buffer[dataOffset + 3];
      const b3 = buffer[dataOffset + 4];
      dimensions ??= {
        width: 1 + (((b1 & 0x3f) << 8) | b0),
        height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
      };
    }
    if (chunkType === 'VP8 ' && chunkSize >= 10) {
      if (
        buffer[dataOffset + 3] === 0x9d &&
        buffer[dataOffset + 4] === 0x01 &&
        buffer[dataOffset + 5] === 0x2a
      ) {
        hasImagePayload = true;
        dimensions ??= {
          width: buffer.readUInt16LE(dataOffset + 6) & 0x3fff,
          height: buffer.readUInt16LE(dataOffset + 8) & 0x3fff,
        };
      }
    }

    offset = dataOffset + chunkSize + (chunkSize % 2);
  }
  if (offset !== buffer.byteLength || !dimensions) return null;
  return {
    ...dimensions,
    hasImagePayload,
    hasMetadata,
  };
}

function readUInt24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function objectKey(slug, mediaVersion, rendition) {
  return `${slug}/${mediaVersion}/${RENDITIONS[rendition].fileName}`;
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    if (name === 'SUPABASE_URL' && process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
      return undefined;
    }
    throw new Error(`${name} is required`);
  }
  return value;
}

async function uploadObject(storage, key, buffer) {
  const result = await storage.upload(key, buffer, {
    contentType: CONTENT_TYPE,
    cacheControl: CACHE_CONTROL_SECONDS,
    upsert: false,
  });
  if (result.error) {
    throw new Error(`Failed to upload ${key}: ${result.error.message}`);
  }
}

async function rollbackUploadedObjects(storage, keys, uploadError) {
  if (keys.length === 0) {
    throw uploadError;
  }

  const result = await storage.remove([...keys].reverse());
  if (result.error) {
    const rollbackError = new Error(`Failed to roll back uploaded venue media objects: ${result.error.message}`);
    throw new AggregateError(
      [uploadError, rollbackError],
      `Failed to upload venue media and failed to roll back ${keys.length} uploaded object(s)`,
    );
  }

  throw uploadError;
}

async function main() {
  const [slug, mediaVersion, cardPath, heroPath] = process.argv.slice(2);
  if (!slug || !mediaVersion || !cardPath || !heroPath) {
    console.error(
      'Usage: node scripts/upload-venue-media.mjs <slug> <mediaVersion> <path/to/card.webp> <path/to/hero.webp>',
    );
    process.exitCode = 1;
    return;
  }
  const result = await uploadVenueMediaRenditions({
    slug,
    mediaVersion,
    cardPath,
    heroPath,
  });
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
