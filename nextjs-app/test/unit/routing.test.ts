import { describe, expect, it } from 'vitest';
import {
  buildAppleMapsDirectionsUrl,
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsSearchUrl,
  getRouteSummary,
  resolveRoutingPlatform,
  type RoutingVenue,
} from '@/lib/services/routing';

const VENUE: RoutingVenue = {
  venueName: 'Kafé Magasinet',
  location: { lat: 57.705, lng: 11.97 },
  distanceMeters: 950,
  address: 'Tredje Långgatan 9, Göteborg',
  neighborhood: 'Linné',
};

describe('routing service helpers', () => {
  it('builds Google Maps directions URLs with a walking navigation intent', () => {
    const url = buildGoogleMapsDirectionsUrl(VENUE);

    expect(url).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=57.705%2C11.97&travelmode=walking&dir_action=navigate',
    );
  });

  it('builds Apple Maps direction links from here with walking transport', () => {
    const url = buildAppleMapsDirectionsUrl(VENUE);

    expect(url).toBe('https://maps.apple.com/?daddr=57.705%2C11.97&dirflg=w');
  });

  it('builds map-search URLs from coordinates first and encoded address/name fallback second', () => {
    expect(buildGoogleMapsSearchUrl(VENUE)).toBe(
      'https://www.google.com/maps/search/?api=1&query=57.705%2C11.97',
    );

    expect(buildGoogleMapsSearchUrl({
      ...VENUE,
      location: { lat: Number.NaN, lng: Number.NaN },
    })).toBe(
      'https://www.google.com/maps/search/?api=1&query=Tredje%20L%C3%A5nggatan%209%2C%20G%C3%B6teborg',
    );

    expect(buildGoogleMapsSearchUrl({
      venueName: 'Sol & Skugga',
      location: { lat: Number.NaN, lng: Number.NaN },
    })).toBe('https://www.google.com/maps/search/?api=1&query=Sol%20%26%20Skugga');
  });

  it('falls back to address before venue name when direction coordinates are invalid', () => {
    expect(buildGoogleMapsDirectionsUrl({
      ...VENUE,
      location: { lat: Number.NaN, lng: Number.NaN },
    })).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=Tredje%20L%C3%A5nggatan%209%2C%20G%C3%B6teborg&travelmode=walking&dir_action=navigate',
    );

    expect(buildGoogleMapsDirectionsUrl({
      venueName: 'Sol & Skugga',
      location: { lat: Number.NaN, lng: Number.NaN },
    })).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=Sol%20%26%20Skugga&travelmode=walking&dir_action=navigate',
    );
  });

  it('uses API distance first for approximate walk and bike estimates', () => {
    expect(getRouteSummary({
      venue: VENUE,
      origin: { lat: 57.7089, lng: 11.9746 },
    })).toMatchObject({
      distanceMeters: 950,
      walkMinutes: 11,
      bikeMinutes: 4,
      direction: 'southwest',
    });
  });

  it('falls back to WGS84 great-circle distance when API distance is unavailable', () => {
    const summary = getRouteSummary({
      venue: {
        ...VENUE,
        distanceMeters: Number.NaN,
      },
      origin: { lat: 57.7089, lng: 11.9746 },
    });

    expect(summary.distanceMeters).toBeGreaterThan(500);
    expect(summary.distanceMeters).toBeLessThan(525);
    expect(summary.walkMinutes).toBe(6);
    expect(summary.bikeMinutes).toBe(2);
    expect(summary.direction).toBe('southwest');
  });

  it('returns unavailable estimates without leaking invalid numeric output', () => {
    expect(getRouteSummary({
      venue: {
        venueName: 'Okänd plats',
        location: { lat: Number.NaN, lng: Number.NaN },
        distanceMeters: Number.POSITIVE_INFINITY,
      },
      origin: { lat: Number.NaN, lng: Number.NaN },
    })).toEqual({
      distanceMeters: null,
      walkMinutes: null,
      bikeMinutes: null,
      direction: null,
    });

    expect(getRouteSummary({
      venue: {
        venueName: 'Orimlig plats',
        location: { lat: 999, lng: 999 },
        distanceMeters: Number.NaN,
      },
      origin: { lat: 57.7089, lng: 11.9746 },
    })).toEqual({
      distanceMeters: null,
      walkMinutes: null,
      bikeMinutes: null,
      direction: null,
    });
  });

  it('does not invent a cardinal direction for the current position', () => {
    expect(getRouteSummary({
      venue: {
        ...VENUE,
        distanceMeters: 0,
        location: { lat: 57.7089, lng: 11.9746 },
      },
      origin: { lat: 57.7089, lng: 11.9746 },
    })).toMatchObject({
      distanceMeters: 0,
      walkMinutes: 1,
      bikeMinutes: 1,
      direction: null,
    });
  });

  it('detects iOS-like browsers without treating desktop browsers as iOS', () => {
    expect(resolveRoutingPlatform({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)',
      maxTouchPoints: 5,
    })).toBe('ios');

    expect(resolveRoutingPlatform({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15',
      maxTouchPoints: 0,
    })).toBe('google');
  });
});
