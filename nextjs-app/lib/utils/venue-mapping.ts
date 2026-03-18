/**
 * Maps PascalCase DB venue rows to camelCase API responses.
 * The venues table uses PascalCase quoted columns ("Name", "Address", etc.)
 * but the frontend expects camelCase keys.
 */

const VENUE_TYPE_MAP: Record<number, string> = {
  0: 'restaurant',
  1: 'cafe',
  2: 'bar',
};

export function venueTypeFromInt(type: number): string {
  return VENUE_TYPE_MAP[type] ?? 'restaurant';
}

export function venueTypeToInt(type: string): number {
  switch (type) {
    case 'restaurant': return 0;
    case 'cafe': return 1;
    case 'bar': return 2;
    default: return 0;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dbVenueToApi(row: any) {
  return {
    id: row.Id,
    name: row.Name,
    slug: row.Slug ?? null,
    type: venueTypeFromInt(row.Type),
    neighborhood: row.Neighborhood ?? null,
    latitude: row.Location ? extractLat(row.Location) : null,
    longitude: row.Location ? extractLng(row.Location) : null,
    address: row.Address ?? null,
    website: row.Website ?? null,
    is_active: row.IsActive ?? true,
    is_mapped: row.IsMapped ?? false,
    is_partner: row.is_partner ?? false,
    booking_url: row.booking_url ?? null,
    website_url: row.website_url ?? null,
    verification_status: row.VerificationStatus ?? 1,
    osm_node_id: row.OsmNodeId ?? null,
    created_at: row.CreatedAt ?? null,
    updated_at: row.UpdatedAt ?? null,
  };
}

/**
 * PostGIS GEOGRAPHY columns are returned by Supabase as WKT strings
 * like "POINT(11.9746 57.7089)" or as GeoJSON objects.
 */
function extractLat(location: unknown): number | null {
  if (typeof location === 'string') {
    const match = location.match(/POINT\(\s*([\d.-]+)\s+([\d.-]+)\s*\)/);
    if (match) return parseFloat(match[2]);
  }
  // GeoJSON format: { type: "Point", coordinates: [lng, lat] }
  if (typeof location === 'object' && location !== null) {
    const geo = location as { coordinates?: number[] };
    if (geo.coordinates && geo.coordinates.length >= 2) {
      return geo.coordinates[1];
    }
  }
  return null;
}

function extractLng(location: unknown): number | null {
  if (typeof location === 'string') {
    const match = location.match(/POINT\(\s*([\d.-]+)\s+([\d.-]+)\s*\)/);
    if (match) return parseFloat(match[1]);
  }
  if (typeof location === 'object' && location !== null) {
    const geo = location as { coordinates?: number[] };
    if (geo.coordinates && geo.coordinates.length >= 2) {
      return geo.coordinates[0];
    }
  }
  return null;
}
