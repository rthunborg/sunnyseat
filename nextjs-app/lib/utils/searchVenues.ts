import type { SunExposureResult } from '@/lib/types/venue';

export interface SearchResult {
  venueId: string;
  name: string;
  slug: string;
  neighborhood: string;
  lat: number;
  lng: number;
  currentStatus: 'sunny' | 'partial' | 'shaded' | 'upcoming';
}

/**
 * Case-insensitive substring match on venue name and neighborhood.
 * Returns up to `limit` results.
 */
export function searchVenues(
  venues: SunExposureResult[],
  query: string,
  limit = 5
): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const lower = trimmed.toLowerCase();

  return venues
    .filter(
      (v) =>
        v.venue.name.toLowerCase().includes(lower) ||
        v.venue.neighborhood.toLowerCase().includes(lower)
    )
    .slice(0, limit)
    .map((v) => ({
      venueId: v.venue.id,
      name: v.venue.name,
      slug: v.venue.slug,
      neighborhood: v.venue.neighborhood,
      lat: v.venue.lat,
      lng: v.venue.lng,
      currentStatus: v.current_status,
    }));
}
