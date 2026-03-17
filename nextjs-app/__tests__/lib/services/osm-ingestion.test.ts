import { describe, it, expect } from 'vitest';
import {
  transformOsmData,
  CITY_BBOXES,
  type OsmElement,
} from '@/lib/services/osm-ingestion';

describe('osm-ingestion', () => {
  describe('CITY_BBOXES', () => {
    it('has a gothenburg bounding box', () => {
      expect(CITY_BBOXES.gothenburg).toBeDefined();
      expect(CITY_BBOXES.gothenburg.south).toBeLessThan(CITY_BBOXES.gothenburg.north);
      expect(CITY_BBOXES.gothenburg.west).toBeLessThan(CITY_BBOXES.gothenburg.east);
    });
  });

  describe('transformOsmData', () => {
    const sampleElements: OsmElement[] = [
      {
        type: 'node',
        id: 12345,
        lat: 57.70,
        lon: 11.97,
        tags: {
          name: 'Café Magasinet',
          amenity: 'cafe',
          outdoor_seating: 'yes',
          'addr:street': 'Tredje Långgatan',
          'addr:housenumber': '10',
          website: 'https://magasinet.se',
        },
      },
      {
        type: 'node',
        id: 67890,
        lat: 57.71,
        lon: 11.96,
        tags: {
          name: 'Restaurang Sjöbaren',
          amenity: 'restaurant',
          outdoor_seating: 'yes',
        },
      },
      {
        type: 'node',
        id: 99999,
        lat: 57.72,
        lon: 11.95,
        tags: {
          amenity: 'restaurant',
          outdoor_seating: 'yes',
          // No name — should be skipped
        },
      },
    ];

    it('transforms OSM elements to venue candidates', () => {
      const result = transformOsmData(sampleElements);
      expect(result).toHaveLength(2); // 1 skipped (no name)
    });

    it('extracts name, coordinates, and osm_node_id', () => {
      const result = transformOsmData(sampleElements);
      expect(result[0].name).toBe('Café Magasinet');
      expect(result[0].lat).toBe(57.70);
      expect(result[0].lng).toBe(11.97);
      expect(result[0].osm_node_id).toBe(12345);
    });

    it('generates a slug from name', () => {
      const result = transformOsmData(sampleElements);
      expect(result[0].slug).toBe('cafe-magasinet');
      expect(result[1].slug).toBe('restaurang-sjobaren');
    });

    it('extracts venue type from amenity tag', () => {
      const result = transformOsmData(sampleElements);
      expect(result[0].venue_type).toBe('cafe');
      expect(result[1].venue_type).toBe('restaurant');
    });

    it('sets verification_status to 0 (Candidate)', () => {
      const result = transformOsmData(sampleElements);
      for (const v of result) {
        expect(v.verification_status).toBe(0);
      }
    });

    it('extracts address from addr:street and addr:housenumber', () => {
      const result = transformOsmData(sampleElements);
      expect(result[0].address).toBe('Tredje Långgatan 10');
      expect(result[1].address).toBeUndefined();
    });

    it('extracts website', () => {
      const result = transformOsmData(sampleElements);
      expect(result[0].website).toBe('https://magasinet.se');
      expect(result[1].website).toBeUndefined();
    });

    it('skips elements without a name', () => {
      const noNameElements: OsmElement[] = [
        {
          type: 'node',
          id: 1,
          lat: 57.70,
          lon: 11.97,
          tags: { amenity: 'restaurant' },
        },
      ];
      const result = transformOsmData(noNameElements);
      expect(result).toHaveLength(0);
    });

    it('handles empty input', () => {
      expect(transformOsmData([])).toHaveLength(0);
    });

    it('extracts contact:website as fallback', () => {
      const elements: OsmElement[] = [
        {
          type: 'node',
          id: 1,
          lat: 57.70,
          lon: 11.97,
          tags: {
            name: 'Test Bar',
            amenity: 'bar',
            'contact:website': 'https://test.se',
          },
        },
      ];
      const result = transformOsmData(elements);
      expect(result[0].website).toBe('https://test.se');
    });
  });
});
