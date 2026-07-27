import { describe, expect, test } from 'vitest';
import {
  seatingCentroidWgs84,
  venueEngineCoordinate,
} from '@/lib/services/sun-geometry-coordinates';

describe('Story 12.3 automated coverage - shared venue engine coordinates', () => {
  test('computes the seating centroid without double-counting the duplicated closing point', () => {
    const polygon: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [11.9, 57.7],
          [12.1, 57.7],
          [12.1, 57.9],
          [11.9, 57.9],
          [11.9, 57.7],
        ],
      ],
    };

    const centroid = seatingCentroidWgs84(polygon);
    expect(centroid.lng).toBeCloseTo(12);
    expect(centroid.lat).toBeCloseTo(57.8);
  });

  test('uses the seating polygon centroid before falling back to the venue point', () => {
    const polygon: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [11.96, 57.7],
          [11.98, 57.7],
          [11.98, 57.72],
          [11.96, 57.72],
          [11.96, 57.7],
        ],
      ],
    };

    expect(
      venueEngineCoordinate({
        seatingArea: polygon,
        location: { lat: 1, lng: 2 },
      }),
    ).toEqual({ lat: 57.71, lng: 11.97 });
    expect(
      venueEngineCoordinate({
        location: { lat: 57.705, lng: 11.97 },
      }),
    ).toEqual({ lat: 57.705, lng: 11.97 });
    expect(
      venueEngineCoordinate({
        location: { lat: 57.7065, lng: 11.9715 },
        engineLocation: { lat: 57.705, lng: 11.97 },
      }),
    ).toEqual({ lat: 57.705, lng: 11.97 });
  });

  test('rejects non-finite coordinates instead of emitting an invalid hash input point', () => {
    const polygon: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [11.9, 57.7],
          [Number.NaN, 57.7],
          [12.1, 57.9],
          [11.9, 57.7],
        ],
      ],
    };

    expect(() => seatingCentroidWgs84(polygon)).toThrow(
      'Invalid seating polygon: non-finite coordinate',
    );
  });
});
