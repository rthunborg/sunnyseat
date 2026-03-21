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
    latitude: row.Latitude ?? null,
    longitude: row.Longitude ?? null,
    address: row.Address ?? null,
    phone: row.Phone ?? null,
    website: row.Website ?? null,
    description: row.Description ?? null,
    is_active: row.IsActive ?? true,
    is_mapped: row.IsMapped ?? false,
    is_partner: row.is_partner ?? false,
    booking_url: row.booking_url ?? null,
    website_url: row.website_url ?? null,
    verification_status: row.VerificationStatus ?? 1,
    osm_node_id: row.OsmNodeId ?? null,
    geometry: row.Geometry ?? null,
    height_m: row.HeightM ?? null,
    height_source: row.HeightSource ?? null,
    polygon_quality: row.PolygonQuality ?? null,
    orientation: row.Orientation ?? null,
    notes: row.Notes ?? null,
    review_needed: row.ReviewNeeded ?? false,
    created_at: row.CreatedAt ?? null,
    updated_at: row.UpdatedAt ?? null,
  };
}
