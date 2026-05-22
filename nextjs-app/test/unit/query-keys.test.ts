import { describe, expect, it } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

describe('queryKeys', () => {
  it('normalizes venue list filters by dropping undefined values and sorting keys', () => {
    const first = queryKeys.venues.list({
      lat: 57.7089,
      lng: 11.9746,
      radiusKm: 1.5,
      q: undefined,
    });
    const second = queryKeys.venues.list({
      radiusKm: 1.5,
      lng: 11.9746,
      lat: 57.7089,
    });

    expect(first).toEqual(second);
    expect(first).toEqual([
      'venues',
      'list',
      { lat: 57.7089, lng: 11.9746, radiusKm: 1.5 },
    ]);
  });

  it('sorts nested object keys recursively while preserving array order', () => {
    const first = queryKeys.venues.list({
      bounds: {
        east: 11.99,
        west: undefined,
        north: 57.72,
        south: 57.7,
      },
      tags: [
        { value: 'cafe', disabled: undefined },
        { value: 'open-now' },
      ],
    });
    const second = queryKeys.venues.list({
      tags: [
        { disabled: undefined, value: 'cafe' },
        { value: 'open-now' },
      ],
      bounds: {
        south: 57.7,
        north: 57.72,
        east: 11.99,
      },
    });

    expect(first).toEqual(second);
    expect(first).toEqual([
      'venues',
      'list',
      {
        bounds: { east: 11.99, north: 57.72, south: 57.7 },
        tags: [{ value: 'cafe' }, { value: 'open-now' }],
      },
    ]);
  });

  it('normalizes planner venue keys with date and time from the central factory', () => {
    const first = queryKeys.venues.planner({
      time: '14:00',
      date: '2026-06-14',
      lng: 11.9746,
      lat: 57.7089,
      radiusKm: 1.5,
      q: undefined,
    });
    const second = queryKeys.venues.planner({
      radiusKm: 1.5,
      lat: 57.7089,
      date: '2026-06-14',
      time: '14:00',
      lng: 11.9746,
    });

    expect(first).toEqual(second);
    expect(first).toEqual([
      'venues',
      'planner',
      { date: '2026-06-14', lat: 57.7089, lng: 11.9746, radiusKm: 1.5, time: '14:00' },
    ]);
  });
});
