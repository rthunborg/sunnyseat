import { describe, expect, it } from 'vitest';
import { canonicalGeometryInputG2, computeGeometryInputHashG2, inspectPolygonTopologyG2 } from '@/lib/services/sun-geometry-hash-g2';
import { g2Input } from '../../fixtures/epic-15/g2-input';

type Point = [number, number];
type Ring = Point[];

function circle(entries: number, radius: number, centerX = 0, centerY = 0): Ring {
  const points: Point[] = [];
  for (let index = 0; index < entries - 1; index++) {
    const angle = (2 * Math.PI * index) / (entries - 1);
    points.push([centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle)]);
  }
  points.push(points[0]);
  return points;
}

/** The Round-6 within-cap construction: 122 rings / 249,856 coordinate entries. */
function separatedHighResolutionHoles(): Ring[] {
  const coordinates = [circle(2_048, 80)];
  for (let y = -50; y <= 50; y += 10) {
    for (let x = -50; x <= 50; x += 10) coordinates.push(circle(2_048, 2, x, y));
  }
  expect(coordinates).toHaveLength(122);
  expect(coordinates.reduce((total, ring) => total + ring.length, 0)).toBe(249_856);
  return coordinates;
}

/** A simple serpentine whose horizontal edges are simultaneously active at x=50. */
function denseSerpentine(levels = 1_021): Ring {
  const points: Point[] = [[0, 0], [100, 0]];
  for (let level = 1; level <= levels; level++) {
    if (level % 2 === 1) points.push([100, level / 20], [1, level / 20]);
    else points.push([1, level / 20], [100, level / 20]);
  }
  points.push([0, levels / 20], [0, 0]);
  return points;
}

function rotatedAndReversed(ring: Ring): Ring {
  const open = ring.slice(0, -1).toReversed();
  const rotated = [...open.slice(2), ...open.slice(0, 2)];
  return [...rotated, rotated[0]];
}

describe('Round 6 topology-work regression', () => {
  it('keeps exact vertical, T-contact, overlap, and near-collinear classifications stable', () => {
    const shell: Ring = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
    const validVerticalTangent: Ring = [[0, 5], [2, 4], [2, 6], [0, 5]];
    const invalidTwoTangencies: Ring = [[0, 3], [2, 4], [2, 6], [0, 7], [0, 3]];
    const invalidVerticalCrossing: Ring = [[5, -1], [6, 5], [5, 11], [4, 5], [5, -1]];
    const invalidNonAdjacentT: Ring = [[0, 0], [4, 0], [4, 4], [0, 4], [2, 0], [1, 2], [0, 0]];
    const invalidBacktrack: Ring = [[0, 0], [4, 0], [2, 0], [4, 4], [0, 4], [0, 0]];
    // Four ulps at y=2 survives Float64 rounding. It must remain a thin,
    // nonzero valid triangle rather than fall through an epsilon classifier.
    const nearCollinearHole: Ring = [[2, 2], [6, 2 + 4 * Number.EPSILON], [4, 2], [2, 2]];

    expect(inspectPolygonTopologyG2([shell, validVerticalTangent]).valid).toBe(true);
    expect(inspectPolygonTopologyG2([shell, nearCollinearHole]).valid).toBe(true);
    expect(inspectPolygonTopologyG2([shell, invalidTwoTangencies]).valid).toBe(false);
    expect(inspectPolygonTopologyG2([shell, invalidVerticalCrossing]).valid).toBe(false);
    expect(inspectPolygonTopologyG2([invalidNonAdjacentT]).valid).toBe(false);
    expect(inspectPolygonTopologyG2([invalidBacktrack]).valid).toBe(false);
  });

  it('keeps valid topology and canonical identity under ring rotation and reversal', () => {
    const shell: Ring = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
    const hole: Ring = [[0, 5], [2, 4], [2, 6], [0, 5]];
    const original = structuredClone(g2Input);
    original.seating = { type: 'Polygon', coordinates: [shell, hole] };
    const transformed = structuredClone(original);
    transformed.seating.coordinates = [rotatedAndReversed(shell), rotatedAndReversed(hole)];

    expect(inspectPolygonTopologyG2(transformed.seating.coordinates as Point[][]).valid).toBe(true);
    expect(computeGeometryInputHashG2(transformed)).toBe(computeGeometryInputHashG2(original));
  });

  it('uses a balanced active status for a valid dense serpentine', () => {
    const inspected = inspectPolygonTopologyG2([denseSerpentine()]);
    expect(inspected.valid).toBe(true);
    expect(inspected.work.maxActive).toBeGreaterThanOrEqual(1_020);
    // 2,046 entries approach the ring cap; all-pairs would exceed two million.
    expect(inspected.work.segmentChecks).toBeLessThan(16_000);
    expect(inspected.work.treeComparisons).toBeLessThan(200_000);
  });

  it('validates the complete Round-6 within-cap separated-hole polygon with bounded deterministic work', () => {
    const inspected = inspectPolygonTopologyG2(separatedHighResolutionHoles());
    expect(inspected.valid).toBe(true);
    expect(inspected.work.events).toBe(249_734);
    // The old nested loops require 31,183,410,511 segment-pair relations here.
    // Exact sweep neighbour checks remain far below the former 31-billion loop count.
    expect(inspected.work.segmentChecks).toBeLessThan(1_000_000);
    // Two point-in-ring scans per unordered ring pair: 7,381 pairs × two
    // 2,047-edge rings. This is the bounded R*N containment term, replacing
    // the former repeated per-edge midpoint/containment scans.
    expect(inspected.work.containmentEdges).toBe(7_381 * 4_094);
    expect(inspected.work.maxActive).toBeLessThan(1_000);
  }, 20_000);

  it('keeps total validation bounded across 5,000 casters near the aggregate coordinate limit', () => {
    const input = structuredClone(g2Input);
    const geometries = Array.from({ length: 5_000 }, (_, index) => [circle(49, 0.001, 2 + index / 10_000, 0)]);
    const totalCoordinates = input.seating.coordinates[0].length
      + geometries.reduce((total, coordinates) => total + coordinates[0].length, 0);
    expect(totalCoordinates).toBe(245_004);
    expect(totalCoordinates).toBeLessThanOrEqual(250_000);
    const work = geometries.map(coordinates => inspectPolygonTopologyG2(coordinates));
    expect(work.every(result => result.valid)).toBe(true);
    const totalSegmentChecks = work.reduce((total, result) => total + result.work.segmentChecks, 0);
    const totalTreeComparisons = work.reduce((total, result) => total + result.work.treeComparisons, 0);
    expect(totalSegmentChecks).toBeLessThan(1_000_000);
    expect(totalTreeComparisons).toBeLessThan(10_000_000);
    input.casters = geometries.map((coordinates, index) => ({
      ...g2Input.casters[0],
      id: String(index + 1),
      geometry: { type: 'Polygon' as const, coordinates },
    }));
    expect(() => canonicalGeometryInputG2(input)).not.toThrow();
  }, 20_000);
});
