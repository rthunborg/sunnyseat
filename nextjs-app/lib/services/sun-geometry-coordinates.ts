import type { StoredVenue } from '@/lib/services/venue-store';

export type Wgs84Coordinate = {
  lat: number;
  lng: number;
};

/**
 * Story 12.3 shared engine coordinate: arithmetic mean of the non-duplicated
 * outer ring. Do not round here; provider/cache callers round only at their own
 * boundary.
 */
export function seatingCentroidWgs84(polygon: GeoJSON.Polygon): Wgs84Coordinate {
  const ring = polygon.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 4) {
    throw new Error('Invalid seating polygon: missing outer ring');
  }
  const hasClosingPoint = samePosition(ring[0], ring.at(-1));
  const count = ring.length - (hasClosingPoint ? 1 : 0);
  if (count <= 0) {
    throw new Error('Invalid seating polygon: empty outer ring');
  }

  let lng = 0;
  let lat = 0;
  for (let i = 0; i < count; i++) {
    const point = ring[i];
    const pointLng = point?.[0];
    const pointLat = point?.[1];
    if (!Number.isFinite(pointLng) || !Number.isFinite(pointLat)) {
      throw new Error('Invalid seating polygon: non-finite coordinate');
    }
    lng += pointLng;
    lat += pointLat;
  }
  return { lng: lng / count, lat: lat / count };
}

export function venueEngineCoordinate(
  venue: Pick<StoredVenue, 'seatingArea' | 'location' | 'engineLocation'>,
): Wgs84Coordinate {
  return venue.seatingArea
    ? seatingCentroidWgs84(venue.seatingArea)
    : {
        lat: (venue.engineLocation ?? venue.location).lat,
        lng: (venue.engineLocation ?? venue.location).lng,
      };
}

function samePosition(a: number[] | undefined, b: number[] | undefined): boolean {
  return Boolean(a && b && a[0] === b[0] && a[1] === b[1]);
}
