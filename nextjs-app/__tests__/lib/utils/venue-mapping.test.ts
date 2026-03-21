import { describe, it, expect } from 'vitest';
import {
  dbVenueToApi,
  venueTypeFromInt,
  venueTypeToInt,
} from '@/lib/utils/venue-mapping';

describe('venueTypeFromInt', () => {
  it('maps 0 to restaurant', () => expect(venueTypeFromInt(0)).toBe('restaurant'));
  it('maps 1 to cafe', () => expect(venueTypeFromInt(1)).toBe('cafe'));
  it('maps 2 to bar', () => expect(venueTypeFromInt(2)).toBe('bar'));
  it('defaults unknown to restaurant', () => expect(venueTypeFromInt(99)).toBe('restaurant'));
});

describe('venueTypeToInt', () => {
  it('maps restaurant to 0', () => expect(venueTypeToInt('restaurant')).toBe(0));
  it('maps cafe to 1', () => expect(venueTypeToInt('cafe')).toBe(1));
  it('maps bar to 2', () => expect(venueTypeToInt('bar')).toBe(2));
  it('defaults unknown to 0', () => expect(venueTypeToInt('unknown')).toBe(0));
});

describe('dbVenueToApi', () => {
  it('maps PascalCase DB row to camelCase API response', () => {
    const row = {
      Id: 1,
      Name: 'Café Husaren',
      Slug: 'cafe-husaren',
      Type: 1,
      Neighborhood: 'Haga',
      Latitude: 57.7065,
      Longitude: 11.9689,
      Address: 'Haga Nygata 24',
      Phone: '031-123 45 67',
      Website: 'https://husaren.se',
      Description: 'Great fika',
      IsActive: true,
      IsMapped: true,
      is_partner: false,
      booking_url: null,
      website_url: null,
      VerificationStatus: 1,
      OsmNodeId: null,
      CreatedAt: '2026-01-01T00:00:00Z',
      UpdatedAt: '2026-01-01T00:00:00Z',
    };

    const result = dbVenueToApi(row);
    expect(result.id).toBe(1);
    expect(result.name).toBe('Café Husaren');
    expect(result.slug).toBe('cafe-husaren');
    expect(result.type).toBe('cafe');
    expect(result.neighborhood).toBe('Haga');
    expect(result.latitude).toBe(57.7065);
    expect(result.longitude).toBe(11.9689);
    expect(result.address).toBe('Haga Nygata 24');
    expect(result.phone).toBe('031-123 45 67');
    expect(result.website).toBe('https://husaren.se');
    expect(result.description).toBe('Great fika');
    expect(result.is_active).toBe(true);
    expect(result.is_mapped).toBe(true);
  });

  it('handles null/missing fields gracefully', () => {
    const row = {
      Id: 2,
      Name: 'Test',
      Type: 0,
    };

    const result = dbVenueToApi(row);
    expect(result.id).toBe(2);
    expect(result.latitude).toBeNull();
    expect(result.longitude).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.description).toBeNull();
    expect(result.slug).toBeNull();
  });

  it('maps geometry fields from PascalCase DB row', () => {
    const row = {
      Id: 3,
      Name: 'Geo Venue',
      Type: 0,
      Geometry: { type: 'Polygon', coordinates: [[[11.9, 57.7], [11.91, 57.7], [11.91, 57.71], [11.9, 57.7]]] },
      HeightM: 3.5,
      HeightSource: 1,
      PolygonQuality: 0.85,
      Orientation: 'south',
      Notes: 'Some notes',
      ReviewNeeded: false,
    };

    const result = dbVenueToApi(row);
    expect(result.geometry).toBeDefined();
    expect(result.geometry.type).toBe('Polygon');
    expect(result.height_m).toBe(3.5);
    expect(result.height_source).toBe(1);
    expect(result.polygon_quality).toBe(0.85);
    expect(result.orientation).toBe('south');
    expect(result.notes).toBe('Some notes');
    expect(result.review_needed).toBe(false);
  });

  it('defaults geometry fields to null/false when missing', () => {
    const row = {
      Id: 4,
      Name: 'No Geo',
      Type: 0,
    };

    const result = dbVenueToApi(row);
    expect(result.geometry).toBeNull();
    expect(result.height_m).toBeNull();
    expect(result.height_source).toBeNull();
    expect(result.polygon_quality).toBeNull();
    expect(result.orientation).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.review_needed).toBe(false);
  });
});
