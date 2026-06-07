import { greatCircleMeters } from '@/lib/utils/geo';

export type RoutingCoordinates = {
  lat: number;
  lng: number;
};

export type RoutingVenue = {
  venueName: string;
  location: RoutingCoordinates;
  distanceMeters?: number;
  address?: string;
  neighborhood?: string;
};

export type RoutingPlatform = 'google' | 'ios';

export type CardinalDirection =
  | 'north'
  | 'northeast'
  | 'east'
  | 'southeast'
  | 'south'
  | 'southwest'
  | 'west'
  | 'northwest';

export type RouteSummary = {
  distanceMeters: number | null;
  walkMinutes: number | null;
  bikeMinutes: number | null;
  direction: CardinalDirection | null;
};

const GOOGLE_SEARCH_URL = 'https://www.google.com/maps/search/';
const GOOGLE_DIRECTIONS_URL = 'https://www.google.com/maps/dir/';
const APPLE_MAPS_URL = 'https://maps.apple.com/';
const WALK_METERS_PER_MINUTE = 85;
const BIKE_METERS_PER_MINUTE = 250;
const DIRECTION_SECTORS: CardinalDirection[] = [
  'north',
  'northeast',
  'east',
  'southeast',
  'south',
  'southwest',
  'west',
  'northwest',
];

export function buildGoogleMapsSearchUrl(venue: RoutingVenue): string {
  return `${GOOGLE_SEARCH_URL}?api=1&query=${encodeURIComponent(destinationQuery(venue))}`;
}

export function buildGoogleMapsDirectionsUrl(venue: RoutingVenue): string {
  return [
    `${GOOGLE_DIRECTIONS_URL}?api=1`,
    `destination=${encodeURIComponent(destinationQuery(venue, { preferAddress: false }))}`,
    'travelmode=walking',
    'dir_action=navigate',
  ].join('&');
}

export function buildAppleMapsDirectionsUrl(venue: RoutingVenue): string {
  return `${APPLE_MAPS_URL}?daddr=${encodeURIComponent(destinationQuery(venue, {
    preferAddress: false,
  }))}&dirflg=w`;
}

export function buildNativeDirectionsUrl(
  venue: RoutingVenue,
  platform: RoutingPlatform = 'google',
): string {
  return platform === 'ios'
    ? buildAppleMapsDirectionsUrl(venue)
    : buildGoogleMapsDirectionsUrl(venue);
}

export function resolveRoutingPlatform(input: {
  userAgent?: string;
  maxTouchPoints?: number;
}): RoutingPlatform {
  const userAgent = input.userAgent ?? '';
  if (/\b(iPad|iPhone|iPod)\b/i.test(userAgent)) return 'ios';
  if (/\bMacintosh\b/i.test(userAgent) && (input.maxTouchPoints ?? 0) > 1) {
    return 'ios';
  }
  return 'google';
}

export function getRouteSummary({
  venue,
  origin,
}: {
  venue: RoutingVenue;
  origin?: RoutingCoordinates | null;
}): RouteSummary {
  const distanceMeters = resolveDistanceMeters(venue, origin);
  return {
    distanceMeters,
    walkMinutes: estimateMinutes(distanceMeters, WALK_METERS_PER_MINUTE),
    bikeMinutes: estimateMinutes(distanceMeters, BIKE_METERS_PER_MINUTE),
    direction: getCardinalDirectionOrNull(origin, venue.location),
  };
}

export function hasValidCoordinates(
  coordinates: RoutingCoordinates | null | undefined,
): coordinates is RoutingCoordinates {
  if (!coordinates) return false;
  return (
    Number.isFinite(coordinates.lat) &&
    coordinates.lat >= -90 &&
    coordinates.lat <= 90 &&
    Number.isFinite(coordinates.lng) &&
    coordinates.lng >= -180 &&
    coordinates.lng <= 180
  );
}

function resolveDistanceMeters(
  venue: RoutingVenue,
  origin: RoutingCoordinates | null | undefined,
): number | null {
  if (Number.isFinite(venue.distanceMeters) && (venue.distanceMeters ?? 0) >= 0) {
    return Math.round(venue.distanceMeters ?? 0);
  }
  if (!hasValidCoordinates(origin) || !hasValidCoordinates(venue.location)) {
    return null;
  }
  return Math.round(greatCircleMeters(
    origin.lat,
    origin.lng,
    venue.location.lat,
    venue.location.lng,
  ));
}

function estimateMinutes(distanceMeters: number | null, metersPerMinute: number): number | null {
  if (distanceMeters === null) return null;
  return Math.max(1, Math.round(distanceMeters / metersPerMinute));
}

function getCardinalDirectionOrNull(
  origin: RoutingCoordinates | null | undefined,
  destination: RoutingCoordinates,
): CardinalDirection | null {
  if (!hasValidCoordinates(origin) || !hasValidCoordinates(destination)) {
    return null;
  }
  const distanceMeters = greatCircleMeters(
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng,
  );
  if (distanceMeters < 5) return null;
  return getCardinalDirection(origin, destination);
}

function getCardinalDirection(
  origin: RoutingCoordinates,
  destination: RoutingCoordinates,
): CardinalDirection {
  const bearing = bearingDegrees(origin, destination);
  const sector = Math.round(bearing / 45) % DIRECTION_SECTORS.length;
  return DIRECTION_SECTORS[sector];
}

function bearingDegrees(
  origin: RoutingCoordinates,
  destination: RoutingCoordinates,
): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const toDeg = (radians: number) => (radians * 180) / Math.PI;
  const originLat = toRad(origin.lat);
  const destinationLat = toRad(destination.lat);
  const deltaLng = toRad(destination.lng - origin.lng);
  const y = Math.sin(deltaLng) * Math.cos(destinationLat);
  const x = Math.cos(originLat) * Math.sin(destinationLat) -
    Math.sin(originLat) * Math.cos(destinationLat) * Math.cos(deltaLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function destinationQuery(
  venue: RoutingVenue,
  options: { preferAddress?: boolean } = {},
): string {
  if (hasValidCoordinates(venue.location)) {
    return `${venue.location.lat},${venue.location.lng}`;
  }
  const fallback = options.preferAddress === false
    ? normalizeQuery(venue.address) || normalizeQuery(venue.venueName)
    : normalizeQuery(venue.address) || normalizeQuery(venue.venueName);
  return fallback || 'SunnySeat';
}

function normalizeQuery(value: string | undefined): string {
  return value?.trim() ?? '';
}
