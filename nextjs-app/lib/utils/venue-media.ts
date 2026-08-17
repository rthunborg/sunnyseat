import type { VenueThumbnailDto } from '@/lib/types/api';

export const VENUE_MEDIA_BUCKET = 'venue-media';
export const VENUE_MEDIA_CARD_RENDITION = 'card';
export const VENUE_MEDIA_HERO_RENDITION = 'hero';
export const VENUE_MEDIA_CARD_MAX_WIDTH = 640;
export const VENUE_MEDIA_CARD_MAX_HEIGHT = 400;
export const VENUE_MEDIA_CARD_MAX_BYTES = 120 * 1024;
export const VENUE_MEDIA_HERO_MAX_WIDTH = 1600;
export const VENUE_MEDIA_HERO_MAX_HEIGHT = 900;
export const VENUE_MEDIA_HERO_MAX_BYTES = 350 * 1024;

export type VenueMediaRendition =
  | typeof VENUE_MEDIA_CARD_RENDITION
  | typeof VENUE_MEDIA_HERO_RENDITION;

const VENUE_MEDIA_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VENUE_MEDIA_VERSION_PATTERN = /^v[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const PUBLIC_OBJECT_PATH_PREFIX = ['storage', 'v1', 'object', 'public', VENUE_MEDIA_BUCKET];

export function selectVenueCardImageUrl(
  thumbnail?: VenueThumbnailDto | null,
): string | undefined {
  return normalizeImageUrlForRender(thumbnail?.cardUrl) ?? normalizeImageUrlForRender(thumbnail?.url);
}

export function selectVenueHeroImageUrl(
  thumbnail?: VenueThumbnailDto | null,
): string | undefined {
  return normalizeImageUrlForRender(thumbnail?.heroUrl) ?? normalizeImageUrlForRender(thumbnail?.url);
}

export function buildVenueMediaPublicUrl({
  origin = process.env.NEXT_PUBLIC_SUPABASE_URL,
  slug,
  mediaVersion,
  rendition,
}: {
  origin?: string | null;
  slug: string;
  mediaVersion: string;
  rendition: VenueMediaRendition;
}): string {
  const configuredOrigin = normalizeConfiguredOrigin(origin);
  if (!configuredOrigin) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required to build venue media URLs');
  }
  if (!isValidVenueMediaSlug(slug)) {
    throw new Error(`Invalid venue media slug: ${slug}`);
  }
  if (!isValidVenueMediaVersion(mediaVersion)) {
    throw new Error(`Invalid venue mediaVersion: ${mediaVersion}`);
  }
  return `${configuredOrigin}/storage/v1/object/public/${VENUE_MEDIA_BUCKET}/${slug}/${mediaVersion}/${rendition}.webp`;
}

export function normalizeVenueMediaRenditionUrl(
  value: unknown,
  {
    slug,
    rendition,
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
  }: {
    slug: string;
    rendition: VenueMediaRendition;
    supabaseUrl?: string | null;
  },
): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!isValidVenueMediaSlug(slug)) return undefined;

  const configuredOrigin = normalizeConfiguredOrigin(supabaseUrl);
  if (!configuredOrigin) return undefined;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
    if (url.origin !== configuredOrigin) return undefined;
    if (url.search || url.hash) return undefined;

    const rawSegments = url.pathname.split('/');
    if (rawSegments[0] !== '' || rawSegments.slice(1).some((segment) => segment.length === 0)) {
      return undefined;
    }
    const segments = rawSegments.slice(1).map(decodePathSegment);
    if (segments.some((segment) => segment === null)) return undefined;
    const decodedSegments = segments as string[];
    if (decodedSegments.length !== PUBLIC_OBJECT_PATH_PREFIX.length + 3) return undefined;
    if (!PUBLIC_OBJECT_PATH_PREFIX.every((segment, index) => decodedSegments[index] === segment)) {
      return undefined;
    }
    const [pathSlug, mediaVersion, filename] = decodedSegments.slice(PUBLIC_OBJECT_PATH_PREFIX.length);
    if (pathSlug !== slug) return undefined;
    if (!isValidVenueMediaVersion(mediaVersion)) return undefined;
    if (filename !== `${rendition}.webp`) return undefined;

    return url.toString();
  } catch {
    return undefined;
  }
}

export function isValidVenueMediaSlug(value: string): boolean {
  return VENUE_MEDIA_SLUG_PATTERN.test(value);
}

export function isValidVenueMediaVersion(value: string): boolean {
  return VENUE_MEDIA_VERSION_PATTERN.test(value);
}

function normalizeConfiguredOrigin(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    return url.origin;
  } catch {
    return undefined;
  }
}

function normalizeImageUrlForRender(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function decodePathSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}
