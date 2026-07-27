import { getSupabaseServiceRole } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/types';
import type { VenueThumbnailDto } from '@/lib/types/api';
import type { DevEditorVenueDto } from '@/lib/types/dev-venue-editor';
import {
  PUBLIC_VENUE_RESOLVER_SELECT_COLUMNS,
  isSafePublicVenueIdentifier,
} from '@/lib/services/venue-store';
import { seatingCentroidWgs84 } from '@/lib/services/sun-geometry-coordinates';
import {
  VENUE_MEDIA_BUCKET,
  VENUE_MEDIA_CARD_MAX_BYTES,
  VENUE_MEDIA_HERO_MAX_BYTES,
  type VenueMediaRendition,
} from '@/lib/utils/venue-media';
import {
  mediaObjectPathFromPublicUrl,
  parseDevVenueEditorPatch,
  type ParsedDevVenueEditorPatch,
} from '@/lib/services/dev-venue-editor-validation';

export class DevVenueEditorError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'DevVenueEditorError';
  }
}

type DevVenueEditorRow = {
  id?: string | null;
  slug?: string | null;
  venue_name?: string | null;
  lat?: number | null;
  lng?: number | null;
  display_lat?: number | null;
  display_lng?: number | null;
  hidden?: boolean | null;
  seating_area?: GeoJSON.Polygon | null;
  tags?: unknown;
  description?: string | null;
  thumbnail?: VenueThumbnailDto | null;
};

type StorageListFile = {
  name?: string | null;
  metadata?: {
    mimetype?: string | null;
    size?: number | null;
  } | null;
};

export async function listDevEditorVenues(): Promise<DevEditorVenueDto[]> {
  const client = getSupabaseServiceRole();
  const { data, error } = await client
    .from('venues')
    .select(PUBLIC_VENUE_RESOLVER_SELECT_COLUMNS)
    .order('slug', { ascending: true });
  if (error) throw new DevVenueEditorError(`Venue editor read failed: ${error.message}`, 503);
  return ((data ?? []) as DevVenueEditorRow[]).map(rowToDevEditorVenue);
}

export async function patchDevEditorVenue(
  identifier: string,
  body: unknown,
): Promise<DevEditorVenueDto> {
  const normalizedIdentifier = identifier.trim();
  if (!isSafePublicVenueIdentifier(normalizedIdentifier)) {
    throw new DevVenueEditorError('Invalid venue identifier', 400);
  }

  const client = getSupabaseServiceRole();
  const current = await resolveDevEditorVenueRow(client, normalizedIdentifier);
  if (!current) throw new DevVenueEditorError('Venue not found', 404);

  const parsed = parseDevVenueEditorPatch(body, {
    slug: requiredString(current.slug, 'slug'),
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
  if (!parsed.ok) {
    throw new DevVenueEditorError(
      'Venue editor payload failed validation',
      400,
      parsed.errors,
    );
  }

  await verifyThumbnailMediaIfNeeded(client, current, parsed.patch);
  const thumbnailForWrite = buildThumbnailForWrite(current, parsed.patch);
  const { data, error } = await client.rpc('apply_dev_venue_editor_patch', {
    p_venue_id: requiredString(current.id, 'id'),
    p_update_display_coordinates: parsed.patch.updateDisplayLocation,
    p_display_lat: parsed.patch.displayLat ?? null,
    p_display_lng: parsed.patch.displayLng ?? null,
    p_update_hidden: parsed.patch.updateHidden,
    p_hidden: parsed.patch.hidden ?? null,
    p_update_seating_area: parsed.patch.updateSeatingArea,
    p_seating_area: (parsed.patch.seatingArea ?? null) as Json | null,
    p_update_tags: parsed.patch.updateTags,
    p_tags: parsed.patch.tags ?? null,
    p_update_description: parsed.patch.updateDescription,
    p_description: parsed.patch.description ?? null,
    p_update_thumbnail: parsed.patch.updateThumbnail,
    p_thumbnail: thumbnailForWrite as Json | null,
    p_dirty_reason: 'dev-venue-editor-seating-area',
  });
  if (error) {
    throw new DevVenueEditorError(`Venue editor write failed: ${error.message}`, 503);
  }
  if (data !== true) throw new DevVenueEditorError('Venue not found', 404);

  const updated = await readDevEditorVenueRowById(client, requiredString(current.id, 'id'));
  if (!updated) throw new DevVenueEditorError('Venue not found after update', 503);
  return rowToDevEditorVenue(updated);
}

function buildThumbnailForWrite(
  row: DevVenueEditorRow,
  patch: ParsedDevVenueEditorPatch,
): VenueThumbnailDto | null {
  if (!patch.updateThumbnail || !patch.thumbnail) return null;
  const legacyUrl = row.thumbnail?.url?.trim();
  return legacyUrl
    ? { ...patch.thumbnail, url: legacyUrl }
    : patch.thumbnail;
}

async function resolveDevEditorVenueRow(
  client: ReturnType<typeof getSupabaseServiceRole>,
  identifier: string,
): Promise<DevVenueEditorRow | null> {
  const operand = postgrestOrFilterValue(identifier);
  const { data, error } = await client
    .from('venues')
    .select(PUBLIC_VENUE_RESOLVER_SELECT_COLUMNS)
    .or(`id.eq.${operand},slug.eq.${operand}`)
    .limit(2);
  if (error) throw new DevVenueEditorError(`Venue editor read failed: ${error.message}`, 503);
  const rows = (data ?? []) as DevVenueEditorRow[];
  if (rows.length !== 1) return null;
  return rows[0];
}

async function readDevEditorVenueRowById(
  client: ReturnType<typeof getSupabaseServiceRole>,
  id: string,
): Promise<DevVenueEditorRow | null> {
  const { data, error } = await client
    .from('venues')
    .select(PUBLIC_VENUE_RESOLVER_SELECT_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new DevVenueEditorError(`Venue editor read failed: ${error.message}`, 503);
  return data as DevVenueEditorRow | null;
}

function rowToDevEditorVenue(row: DevVenueEditorRow): DevEditorVenueDto {
  const id = requiredString(row.id, 'id');
  const slug = requiredString(row.slug, 'slug');
  const venueName = requiredString(row.venue_name, 'venue_name');
  const lat = requiredNumber(row.lat, 'lat');
  const lng = requiredNumber(row.lng, 'lng');
  const seatingArea = isPolygon(row.seating_area) ? row.seating_area : undefined;
  const persistedLocation = { lat, lng };
  const displayLocation =
    isFiniteNumber(row.display_lat) && isFiniteNumber(row.display_lng)
      ? { lat: row.display_lat, lng: row.display_lng }
      : persistedLocation;
  const engineLocation = seatingArea
    ? seatingCentroidWgs84(seatingArea)
    : persistedLocation;
  return {
    id,
    slug,
    venueName,
    hidden: row.hidden === true,
    displayLocation,
    engineLocation,
    persistedLocation,
    ...(seatingArea ? { seatingArea } : {}),
    tags: normalizeTags(row.tags),
    description: row.description ?? null,
    thumbnail: row.thumbnail ?? null,
  };
}

async function verifyThumbnailMediaIfNeeded(
  client: ReturnType<typeof getSupabaseServiceRole>,
  row: DevVenueEditorRow,
  patch: ParsedDevVenueEditorPatch,
): Promise<void> {
  if (!patch.updateThumbnail || !patch.thumbnail) return;
  const slug = requiredString(row.slug, 'slug');
  const errors: Record<string, string[]> = {};
  await verifyRendition(client, slug, 'card', patch.thumbnail.cardUrl, errors);
  await verifyRendition(client, slug, 'hero', patch.thumbnail.heroUrl, errors);
  if (Object.keys(errors).length > 0) {
    throw new DevVenueEditorError('Venue media failed validation', 400, errors);
  }
}

async function verifyRendition(
  client: ReturnType<typeof getSupabaseServiceRole>,
  slug: string,
  rendition: VenueMediaRendition,
  url: string | undefined,
  errors: Record<string, string[]>,
): Promise<void> {
  if (!url) return;
  const path = mediaObjectPathFromPublicUrl(url, {
    slug,
    rendition,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
  if (!path) {
    addMediaError(errors, rendition, 'media URL is not managed by venue-media');
    return;
  }
  const { data, error } = await client.storage
    .from(VENUE_MEDIA_BUCKET)
    .list(`${slug}/${path.version}`, {
      limit: 1,
      search: path.filename,
    });
  if (error) {
    addMediaError(errors, rendition, `storage lookup failed: ${error.message}`);
    return;
  }

  const file = ((data ?? []) as StorageListFile[])
    .find((entry) => entry.name === path.filename);
  if (!file) {
    addMediaError(errors, rendition, 'storage object is missing');
    return;
  }
  const mimetype = file.metadata?.mimetype;
  if (mimetype !== 'image/webp') {
    addMediaError(errors, rendition, 'storage object must be image/webp');
  }
  const size = file.metadata?.size;
  const maxBytes = rendition === 'card'
    ? VENUE_MEDIA_CARD_MAX_BYTES
    : VENUE_MEDIA_HERO_MAX_BYTES;
  if (!isFiniteNumber(size) || size > maxBytes) {
    addMediaError(errors, rendition, `storage object must be at most ${maxBytes} bytes`);
  }
}

function addMediaError(
  errors: Record<string, string[]>,
  rendition: VenueMediaRendition,
  message: string,
): void {
  const key = `thumbnail.${rendition}Url`;
  errors[key] = [...(errors[key] ?? []), message];
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    tags.push(trimmed);
  }
  return tags;
}

function isPolygon(value: unknown): value is GeoJSON.Polygon {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    (value as GeoJSON.Polygon).type === 'Polygon' &&
    Array.isArray((value as GeoJSON.Polygon).coordinates)
  );
}

function requiredString(value: string | null | undefined, field: string): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new DevVenueEditorError(`Venue row missing ${field}`, 503);
  return trimmed;
}

function requiredNumber(value: number | null | undefined, field: string): number {
  if (!isFiniteNumber(value)) {
    throw new DevVenueEditorError(`Venue row missing ${field}`, 503);
  }
  return value;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function postgrestOrFilterValue(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
