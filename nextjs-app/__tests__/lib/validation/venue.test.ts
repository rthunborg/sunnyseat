import { describe, it, expect } from 'vitest';
import {
  validateCreateVenue,
  slugify,
} from '@/lib/validation/venue';

describe('validateCreateVenue', () => {
  it('returns valid for a correct venue', () => {
    const result = validateCreateVenue({
      name: 'Café Magasinet',
      latitude: 57.7065,
      longitude: 11.9689,
    });
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it('requires name', () => {
    const result = validateCreateVenue({});
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  it('rejects empty string name', () => {
    const result = validateCreateVenue({ name: '  ' });
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  it('rejects non-string name', () => {
    const result = validateCreateVenue({ name: 123 });
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  it('rejects invalid latitude', () => {
    const result = validateCreateVenue({ name: 'Test', latitude: 200 });
    expect(result.valid).toBe(false);
    expect(result.errors.latitude).toBeDefined();
  });

  it('rejects invalid longitude', () => {
    const result = validateCreateVenue({ name: 'Test', longitude: -200 });
    expect(result.valid).toBe(false);
    expect(result.errors.longitude).toBeDefined();
  });

  it('accepts venue with only name', () => {
    const result = validateCreateVenue({ name: 'Test Venue' });
    expect(result.valid).toBe(true);
  });

  it('rejects non-string type', () => {
    const result = validateCreateVenue({ name: 'Test', type: 123 });
    expect(result.valid).toBe(false);
    expect(result.errors.type).toBeDefined();
  });

  it('rejects non-string neighborhood', () => {
    const result = validateCreateVenue({ name: 'Test', neighborhood: 42 });
    expect(result.valid).toBe(false);
    expect(result.errors.neighborhood).toBeDefined();
  });

  it('accepts null latitude and longitude', () => {
    const result = validateCreateVenue({ name: 'Test', latitude: null, longitude: null });
    expect(result.valid).toBe(true);
  });

  it('rejects non-string address', () => {
    const result = validateCreateVenue({ name: 'Test', address: 123 });
    expect(result.valid).toBe(false);
    expect(result.errors.address).toBeDefined();
  });

  it('accepts valid address', () => {
    const result = validateCreateVenue({ name: 'Test', address: 'Haga Nygata 24' });
    expect(result.valid).toBe(true);
  });

  it('rejects non-string phone', () => {
    const result = validateCreateVenue({ name: 'Test', phone: 123 });
    expect(result.valid).toBe(false);
    expect(result.errors.phone).toBeDefined();
  });

  it('rejects non-string website', () => {
    const result = validateCreateVenue({ name: 'Test', website: 123 });
    expect(result.valid).toBe(false);
    expect(result.errors.website).toBeDefined();
  });

  it('rejects non-string description', () => {
    const result = validateCreateVenue({ name: 'Test', description: 42 });
    expect(result.valid).toBe(false);
    expect(result.errors.description).toBeDefined();
  });

  it('accepts all optional string fields', () => {
    const result = validateCreateVenue({
      name: 'Full Venue',
      address: 'Kungsgatan 1',
      phone: '031-111 22 33',
      website: 'https://example.com',
      description: 'A nice place',
    });
    expect(result.valid).toBe(true);
  });

  it('accepts valid geometry on venue', () => {
    const result = validateCreateVenue({
      name: 'Test',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [11.9687, 57.7064],
            [11.9691, 57.7064],
            [11.9691, 57.7066],
            [11.9687, 57.7066],
            [11.9687, 57.7064],
          ],
        ],
      },
    });
    expect(result.valid).toBe(true);
  });

  it('rejects invalid geometry type on venue', () => {
    const result = validateCreateVenue({
      name: 'Test',
      geometry: { type: 'Point', coordinates: [11.9, 57.7] },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.geometry).toBeDefined();
  });

  it('accepts null geometry on venue', () => {
    const result = validateCreateVenue({ name: 'Test', geometry: null });
    expect(result.valid).toBe(true);
  });
});

describe('slugify', () => {
  it('converts Swedish characters', () => {
    expect(slugify('Café Ångström')).toBe('cafe-angstrom');
  });

  it('handles special characters', () => {
    expect(slugify('Linné Terrassen!')).toBe('linne-terrassen');
  });

  it('lowercases and replaces spaces', () => {
    expect(slugify('Bar Centro')).toBe('bar-centro');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  Test  ')).toBe('test');
  });

  it('handles ö correctly', () => {
    expect(slugify('Sjöbaren')).toBe('sjobaren');
  });
});
