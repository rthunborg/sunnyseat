import type { VenueThumbnailDto } from '@/lib/types/api';
import {
  GOTHENBURG_BOUNDS,
  isWithinGothenburgBounds,
} from '@/lib/constants/geography';
import {
  normalizeVenueMediaRenditionUrl,
  type VenueMediaRendition,
} from '@/lib/utils/venue-media';

export type DevVenueEditorValidationContext = {
  slug: string;
  supabaseUrl?: string | null;
};

export type ParsedDevVenueEditorPatch = {
  updateDisplayLocation: boolean;
  displayLat?: number | null;
  displayLng?: number | null;
  updateHidden: boolean;
  hidden?: boolean;
  updateSeatingArea: boolean;
  seatingArea?: GeoJSON.Polygon;
  requiresGeometryDirty: boolean;
  updateTags: boolean;
  tags?: string[];
  updateDescription: boolean;
  description?: string | null;
  updateThumbnail: boolean;
  thumbnail?: VenueThumbnailDto | null;
};

export type DevVenueEditorValidationResult =
  | { ok: true; patch: ParsedDevVenueEditorPatch }
  | { ok: false; errors: Record<string, string[]> };

const MAX_DESCRIPTION_LENGTH = 700;
const MAX_THUMBNAIL_ALT_LENGTH = 120;
const MAX_THUMBNAIL_INITIALS_LENGTH = 3;
const LINEAR_RING_MIN_AREA_DEGREES = 1e-12;

export function parseDevVenueEditorPatch(
  body: unknown,
  context: DevVenueEditorValidationContext,
): DevVenueEditorValidationResult {
  const errors: Record<string, string[]> = {};
  const patch: ParsedDevVenueEditorPatch = {
    updateDisplayLocation: false,
    updateHidden: false,
    updateSeatingArea: false,
    requiresGeometryDirty: false,
    updateTags: false,
    updateDescription: false,
    updateThumbnail: false,
  };

  if (!isPlainObject(body)) {
    return { ok: false, errors: { body: ['Request body must be an object'] } };
  }

  if ('displayLocation' in body) {
    const parsed = parseDisplayLocation(body.displayLocation);
    if (parsed.ok) {
      patch.updateDisplayLocation = true;
      patch.displayLat = parsed.lat;
      patch.displayLng = parsed.lng;
    } else {
      addErrors(errors, 'displayLocation', parsed.errors);
    }
  }

  if ('hidden' in body) {
    if (typeof body.hidden === 'boolean') {
      patch.updateHidden = true;
      patch.hidden = body.hidden;
    } else {
      addErrors(errors, 'hidden', ['hidden must be a boolean']);
    }
  }

  if ('seatingAreaText' in body || 'seatingArea' in body) {
    const value = 'seatingAreaText' in body ? body.seatingAreaText : body.seatingArea;
    const field = 'seatingAreaText' in body ? 'seatingAreaText' : 'seatingArea';
    const parsed = parseSeatingArea(value);
    if (parsed.ok) {
      patch.updateSeatingArea = true;
      patch.requiresGeometryDirty = true;
      patch.seatingArea = parsed.polygon;
    } else {
      addErrors(errors, field, parsed.errors);
    }
  }

  if ('tags' in body) {
    const parsed = parseTags(body.tags);
    if (parsed.ok) {
      patch.updateTags = true;
      patch.tags = parsed.tags;
    } else {
      addErrors(errors, 'tags', parsed.errors);
    }
  }

  if ('description' in body) {
    const parsed = parseDescription(body.description);
    if (parsed.ok) {
      patch.updateDescription = true;
      patch.description = parsed.description;
    } else {
      addErrors(errors, 'description', parsed.errors);
    }
  }

  if ('thumbnail' in body) {
    const parsed = parseThumbnail(body.thumbnail, context);
    if (parsed.ok) {
      patch.updateThumbnail = true;
      patch.thumbnail = parsed.thumbnail;
    } else {
      addErrors(errors, 'thumbnail', parsed.errors);
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  if (
    !patch.updateDisplayLocation &&
    !patch.updateHidden &&
    !patch.updateSeatingArea &&
    !patch.updateTags &&
    !patch.updateDescription &&
    !patch.updateThumbnail
  ) {
    return { ok: false, errors: { body: ['At least one editable venue field is required'] } };
  }

  return { ok: true, patch };
}

export function mediaObjectPathFromPublicUrl(
  url: string,
  {
    slug,
    rendition,
    supabaseUrl,
  }: {
    slug: string;
    rendition: VenueMediaRendition;
    supabaseUrl?: string | null;
  },
): { version: string; objectPath: string; filename: string } | null {
  const normalized = normalizeVenueMediaRenditionUrl(url, {
    slug,
    rendition,
    supabaseUrl,
  });
  if (!normalized) return null;
  const parsed = new URL(normalized);
  const segments = parsed.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const prefix = ['storage', 'v1', 'object', 'public', 'venue-media'];
  const version = segments[prefix.length + 1];
  const filename = segments[prefix.length + 2];
  if (!version || filename !== `${rendition}.webp`) return null;
  return {
    version,
    filename,
    objectPath: `${slug}/${version}/${filename}`,
  };
}

function parseDisplayLocation(
  value: unknown,
): { ok: true; lat: number | null; lng: number | null } | { ok: false; errors: string[] } {
  if (value === null) return { ok: true, lat: null, lng: null };
  if (!isPlainObject(value)) {
    return { ok: false, errors: ['displayLocation must be an object or null'] };
  }
  const lat = value.lat;
  const lng = value.lng;
  if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) {
    return { ok: false, errors: ['displayLocation requires finite lat and lng'] };
  }
  if (!isWithinGothenburgBounds(lat, lng)) {
    return {
      ok: false,
      errors: [
        `displayLocation must stay inside Gothenburg (${GOTHENBURG_BOUNDS.minLatitude}-${GOTHENBURG_BOUNDS.maxLatitude}, ${GOTHENBURG_BOUNDS.minLongitude}-${GOTHENBURG_BOUNDS.maxLongitude})`,
      ],
    };
  }
  return { ok: true, lat, lng };
}

function parseSeatingArea(
  value: unknown,
): { ok: true; polygon: GeoJSON.Polygon } | { ok: false; errors: string[] } {
  let parsed = value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return { ok: false, errors: ['seatingAreaText cannot be empty'] };
    try {
      parsed = JSON.parse(trimmed) as unknown;
    } catch {
      return { ok: false, errors: ['seatingAreaText must be valid JSON'] };
    }
  }

  const polygon = coercePolygonLike(parsed);
  if (!polygon) {
    return {
      ok: false,
      errors: ['seating area must be a GeoJSON Polygon or a raw outer ring'],
    };
  }

  const errors = validatePolygon(polygon);
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, polygon };
}

function coercePolygonLike(value: unknown): GeoJSON.Polygon | null {
  if (Array.isArray(value)) {
    return { type: 'Polygon', coordinates: [value as number[][]] };
  }
  if (!isPlainObject(value)) return null;
  if (value.type === 'Feature' && isPlainObject(value.geometry)) {
    return coercePolygonLike(value.geometry);
  }
  if (value.type !== 'Polygon' || !Array.isArray(value.coordinates)) return null;
  return { type: 'Polygon', coordinates: value.coordinates as number[][][] };
}

function validatePolygon(polygon: GeoJSON.Polygon): string[] {
  const errors: string[] = [];
  if (!Array.isArray(polygon.coordinates) || polygon.coordinates.length === 0) {
    return ['Polygon requires an outer ring'];
  }
  for (let i = 0; i < polygon.coordinates.length; i++) {
    const ringErrors = validateRing(polygon.coordinates[i], i === 0);
    errors.push(...ringErrors);
  }
  return errors;
}

function validateRing(ring: unknown, isOuter: boolean): string[] {
  if (!Array.isArray(ring) || ring.length < 4) {
    return [`${isOuter ? 'outer' : 'inner'} ring must contain at least four positions`];
  }

  const normalized: number[][] = [];
  for (const position of ring) {
    if (
      !Array.isArray(position) ||
      position.length < 2 ||
      !isFiniteNumber(position[0]) ||
      !isFiniteNumber(position[1])
    ) {
      return [`${isOuter ? 'outer' : 'inner'} ring coordinates must be finite [lng, lat] pairs`];
    }
    const lng = position[0];
    const lat = position[1];
    if (!isWithinGothenburgBounds(lat, lng)) {
      return [
        `${isOuter ? 'outer' : 'inner'} ring coordinates must stay inside Gothenburg bounds`,
      ];
    }
    normalized.push([lng, lat]);
  }

  if (!samePosition(normalized[0], normalized.at(-1))) {
    return [`${isOuter ? 'outer' : 'inner'} ring must be closed`];
  }
  if (isOuter && Math.abs(ringArea(normalized)) <= LINEAR_RING_MIN_AREA_DEGREES) {
    return ['outer ring must not be degenerate'];
  }
  return [];
}

function parseTags(value: unknown): { ok: true; tags: string[] } | { ok: false; errors: string[] } {
  const raw = typeof value === 'string'
    ? value.split(',')
    : Array.isArray(value)
      ? value
      : null;
  if (!raw) return { ok: false, errors: ['tags must be an array or comma-separated string'] };

  const tags: string[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (typeof entry !== 'string') {
      return { ok: false, errors: ['tags may contain strings only'] };
    }
    const trimmed = entry.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    tags.push(trimmed);
  }
  return { ok: true, tags };
}

function parseDescription(
  value: unknown,
): { ok: true; description: string | null } | { ok: false; errors: string[] } {
  if (value === null) return { ok: true, description: null };
  if (typeof value !== 'string') {
    return { ok: false, errors: ['description must be a string or null'] };
  }
  const trimmed = value.replace(/\r\n?/g, '\n').trim();
  if (Array.from(trimmed).length > MAX_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      errors: [`description must be at most ${MAX_DESCRIPTION_LENGTH} characters`],
    };
  }
  return { ok: true, description: trimmed || null };
}

function parseThumbnail(
  value: unknown,
  context: DevVenueEditorValidationContext,
): { ok: true; thumbnail: VenueThumbnailDto | null } | { ok: false; errors: string[] } {
  if (value === null) return { ok: true, thumbnail: null };
  if (!isPlainObject(value)) {
    return { ok: false, errors: ['thumbnail must be an object or null'] };
  }
  if ('url' in value) {
    return { ok: false, errors: ['legacy thumbnail url writes are not accepted'] };
  }

  const alt = normalizeBoundedText(value.alt, MAX_THUMBNAIL_ALT_LENGTH);
  const initials = normalizeBoundedText(value.initials, MAX_THUMBNAIL_INITIALS_LENGTH)?.toUpperCase();
  const cardUrl = normalizeOptionalMediaUrl(value.cardUrl, {
    ...context,
    rendition: 'card',
  });
  const heroUrl = normalizeOptionalMediaUrl(value.heroUrl, {
    ...context,
    rendition: 'hero',
  });

  const errors: string[] = [];
  if (value.alt !== undefined && !alt) errors.push('thumbnail alt cannot be empty');
  if (value.initials !== undefined && !initials) errors.push('thumbnail initials cannot be empty');
  if (value.cardUrl !== undefined && !cardUrl) errors.push('thumbnail cardUrl must be a managed venue-media card.webp URL for this slug');
  if (value.heroUrl !== undefined && !heroUrl) errors.push('thumbnail heroUrl must be a managed venue-media hero.webp URL for this slug');
  if (errors.length > 0) return { ok: false, errors };

  const thumbnail: VenueThumbnailDto = {
    alt: alt ?? '',
    initials: initials ?? '',
    ...(cardUrl ? { cardUrl } : {}),
    ...(heroUrl ? { heroUrl } : {}),
  };
  return { ok: true, thumbnail };
}

function normalizeOptionalMediaUrl(
  value: unknown,
  context: DevVenueEditorValidationContext & { rendition: VenueMediaRendition },
): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return normalizeVenueMediaRenditionUrl(value, {
    slug: context.slug,
    rendition: context.rendition,
    supabaseUrl: context.supabaseUrl,
  });
}

function normalizeBoundedText(value: unknown, maxLength: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return Array.from(trimmed).slice(0, maxLength).join('');
}

function addErrors(
  target: Record<string, string[]>,
  field: string,
  errors: string[],
): void {
  target[field] = [...(target[field] ?? []), ...errors];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function samePosition(a: number[] | undefined, b: number[] | undefined): boolean {
  return Boolean(a && b && Math.abs(a[0] - b[0]) <= 1e-12 && Math.abs(a[1] - b[1]) <= 1e-12);
}

function ringArea(ring: number[][]): number {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const current = ring[i];
    const next = ring[i + 1];
    area += current[0] * next[1] - next[0] * current[1];
  }
  return area / 2;
}
