/**
 * Shared OGC/PostGIS topology boundary specimens for the g2 TypeScript/SQL
 * differential contract. Rings are intentionally not canonicalized here.
 */
export const g2TopologyBoundaries = {
  validShellHoleSinglePointTouch: [
    [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
    [[0, 5], [2, 4], [2, 6], [0, 5]],
  ],
  validHoleHoleSinglePointTouch: [
    [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
    [[2, 4], [5, 5], [2, 6], [2, 4]],
    [[8, 4], [8, 6], [5, 5], [8, 4]],
  ],
  validThreeHolesSamePointTouch: [
    [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
    [[5, 5], [3, 4], [3, 6], [5, 5]],
    [[5, 5], [7, 6], [7, 4], [5, 5]],
    [[5, 5], [4, 3], [6, 3], [5, 5]],
  ],
  invalidHoleOutsideShell: [
    [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
    [[20, 1], [21, 1], [21, 2], [20, 2], [20, 1]],
  ],
  invalidNestedHoles: [
    [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
    [[2, 2], [8, 2], [8, 8], [2, 8], [2, 2]],
    [[3, 3], [4, 3], [4, 4], [3, 4], [3, 3]],
  ],
  invalidNestedHoleBoundaryVertex: [
    [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
    [[2, 2], [8, 2], [8, 8], [2, 8], [2, 2]],
    [[2, 3], [4, 3], [4, 4], [2, 3]],
  ],
  invalidOverlappingHoles: [
    [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
    [[2, 2], [6, 2], [6, 6], [2, 6], [2, 2]],
    [[4, 4], [8, 4], [8, 8], [4, 8], [4, 4]],
  ],
  invalidShellHoleMultiPointTouch: [
    [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
    [[0, 3], [2, 4], [2, 6], [0, 7], [0, 3]],
  ],
  invalidThreeRingTouchCycle: [
    [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
    [[3, 1], [5, 5], [2, 3], [3, 1]],
    [[5, 5], [7, 1], [8, 3], [5, 5]],
    [[3, 1], [7, 1], [5, 0], [3, 1]],
  ],
  invalidAdjacentBacktrack: [
    [[0, 0], [4, 0], [2, 0], [4, 4], [0, 4], [0, 0]],
  ],
  invalidShellNotchHole: [
    [[0, 0], [10, 0], [10, 10], [6, 10], [6, 4], [4, 4], [4, 10], [0, 10], [0, 0]],
    [[3, 5], [5, 4], [7, 5], [3, 5]],
  ],
} as const;
