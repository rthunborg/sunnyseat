/**
 * ATDD RED-PHASE acceptance scaffolds - Story 12.5
 * Public display coordinate projection must not alter sun geometry inputs.
 */

import { describe, expect, test } from 'vitest';

type StoredVenueRow = {
  id: string;
  slug: string;
  lat: number;
  lng: number;
  display_lat?: number | null;
  display_lng?: number | null;
  seating_area?: unknown;
};

type PublicVenueProjection = {
  location: { lat: number; lng: number };
  routeTarget: { lat: number; lng: number };
  engineCoordinate: { lat: number; lng: number };
  geometryInputHash: string;
};

type PlannedDisplayCoordinateModule = {
  projectVenueForPublicResponse: (row: StoredVenueRow) => PublicVenueProjection;
  computeStory123GeometryInputHash: (row: StoredVenueRow) => string;
};

async function loadPlannedDisplayCoordinateModule(): Promise<PlannedDisplayCoordinateModule> {
  throw new Error('RED: implement display coordinate projection seams and import them here.');
}

const venueWithDisplayPair: StoredVenueRow = {
  id: '1',
  slug: 'test-venue-sunny',
  lat: 57.705,
  lng: 11.970,
  display_lat: 57.7065,
  display_lng: 11.9715,
  seating_area: {
    type: 'Polygon',
    coordinates: [[
      [11.9700, 57.7050],
      [11.9704, 57.7050],
      [11.9704, 57.7054],
      [11.9700, 57.7050],
    ]],
  },
};

describe.skip('Story 12.5 ATDD - display coordinate projection', () => {
  test('[P0] public DTO, markers, distance, route summaries, and native map URLs use display_lat/display_lng', async () => {
    const projection = await loadPlannedDisplayCoordinateModule();

    const dto = projection.projectVenueForPublicResponse(venueWithDisplayPair);

    expect(dto.location).toEqual({ lat: 57.7065, lng: 11.9715 });
    expect(dto.routeTarget).toEqual({ lat: 57.7065, lng: 11.9715 });
  });

  test('[P0] legacy lat/lng remain the fallback when the display pair is absent', async () => {
    const projection = await loadPlannedDisplayCoordinateModule();

    const dto = projection.projectVenueForPublicResponse({
      ...venueWithDisplayPair,
      display_lat: null,
      display_lng: null,
    });

    expect(dto.location).toEqual({ lat: 57.705, lng: 11.970 });
    expect(dto.routeTarget).toEqual({ lat: 57.705, lng: 11.970 });
  });

  test('[P0] half-populated display coordinates are rejected instead of silently mixing coordinate pairs', async () => {
    const projection = await loadPlannedDisplayCoordinateModule();

    expect(() =>
      projection.projectVenueForPublicResponse({
        ...venueWithDisplayPair,
        display_lat: 57.7065,
        display_lng: null,
      }),
    ).toThrow(/display.*pair/i);
  });

  test('[P0] dragging the display pin cannot change seating centroid or Story 12.3 geometry input hash', async () => {
    const projection = await loadPlannedDisplayCoordinateModule();
    const beforeHash = projection.computeStory123GeometryInputHash(venueWithDisplayPair);
    const beforeDto = projection.projectVenueForPublicResponse(venueWithDisplayPair);

    const afterRow = {
      ...venueWithDisplayPair,
      display_lat: 57.7100,
      display_lng: 11.9800,
    };
    const afterHash = projection.computeStory123GeometryInputHash(afterRow);
    const afterDto = projection.projectVenueForPublicResponse(afterRow);

    expect(afterDto.location).toEqual({ lat: 57.7100, lng: 11.9800 });
    expect(afterDto.engineCoordinate).toEqual(beforeDto.engineCoordinate);
    expect(afterHash).toBe(beforeHash);
  });
});
