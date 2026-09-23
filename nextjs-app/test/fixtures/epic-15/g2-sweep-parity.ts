/**
 * Fixed-seed, small-coordinate Polygon specimens for the TypeScript/PostGIS
 * topology differential. They exercise the endpoint sweep without making a
 * timing claim; the same list is safe to pass as one JSONB query to PostGIS.
 */
export type TopologyParityCase = {
  id: string;
  category: 'random-shell' | 'random-hole' | 'self-crossing' | 'outside-hole' | 'near-collinear' | 'boundary' | 'equal-x' | 'order-change';
  coordinates: [number, number][][];
};

type Point = [number, number];

function closed(points: Point[]): Point[] {
  return [...points, [...points[0]] as Point];
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function radialRing(random: () => number, centerX: number, centerY: number, radius: number, vertices: number): Point[] {
  const phase = random() * Math.PI * 2;
  const points: Point[] = [];
  for (let index = 0; index < vertices; index++) {
    const angle = phase + index * Math.PI * 2 / vertices;
    const distance = radius * (0.65 + random() * 0.35);
    points.push([
      Number((centerX + Math.cos(angle) * distance).toFixed(12)),
      Number((centerY + Math.sin(angle) * distance).toFixed(12)),
    ]);
  }
  return closed(points);
}

function randomCenter(random: () => number): Point {
  return [Number(((random() - 0.5) * 100).toFixed(6)), Number(((random() - 0.5) * 100).toFixed(6))];
}

function square(x: number, y: number, side: number): Point[] {
  return closed([[x, y], [x + side, y], [x + side, y + side], [x, y + side]]);
}

function makeRandomCases(): TopologyParityCase[] {
  const random = seededRandom(0x15_2a_6d91);
  const cases: TopologyParityCase[] = [];

  for (let index = 0; index < 500; index++) {
    const [x, y] = randomCenter(random);
    cases.push({ id: `random-shell-${index}`, category: 'random-shell', coordinates: [radialRing(random, x, y, 1 + random() * 4, 3 + Math.floor(random() * 6))] });
  }
  for (let index = 0; index < 250; index++) {
    const [x, y] = randomCenter(random);
    const outer = radialRing(random, x, y, 8 + random() * 4, 5 + Math.floor(random() * 4));
    const hole = radialRing(random, x, y, 0.5 + random() * 0.75, 3 + Math.floor(random() * 4));
    cases.push({ id: `random-hole-${index}`, category: 'random-hole', coordinates: [outer, hole] });
  }
  for (let index = 0; index < 150; index++) {
    const [x, y] = randomCenter(random), side = 1 + random() * 4;
    cases.push({
      id: `self-crossing-${index}`,
      category: 'self-crossing',
      coordinates: [[[x, y], [x + side, y + side], [x, y + side], [x + side, y], [x, y]]],
    });
  }
  for (let index = 0; index < 50; index++) {
    const [x, y] = randomCenter(random), side = 4 + random() * 3;
    cases.push({
      id: `outside-hole-${index}`,
      category: 'outside-hole',
      coordinates: [square(x, y, side), square(x + side * 2, y + side * 2, side / 4)],
    });
  }
  for (let index = 0; index < 50; index++) {
    const [x, y] = randomCenter(random), side = 2 + random() * 3;
    // Both specimens have an exact Float64 predicate: one has a collinear
    // boundary vertex; the other is offset by one representable-scale value.
    const offset = index % 2 === 0 ? 0 : Number.EPSILON * (Math.abs(y) + side + 1) * 8;
    cases.push({
      id: `near-collinear-${index}`,
      category: 'near-collinear',
      coordinates: [[[x, y], [x + side / 2, y + offset], [x + side, y], [x + side, y + side], [x, y + side], [x, y]]],
    });
  }
  return cases;
}

const boundaryCases: TopologyParityCase[] = [
  {
    id: 'equal-x-vertical-stack-valid', category: 'equal-x',
    coordinates: [[[0, 0], [0, 8], [2, 8], [2, 6], [1, 6], [1, 2], [2, 2], [2, 0], [0, 0]]],
  },
  {
    id: 'order-change-crossing-before-endpoints', category: 'order-change',
    coordinates: [[[-4, -1], [4, 3], [-4, 3], [4, -1], [-4, -1]]],
  },
  {
    id: 'arbitrary-multi-segment-crossing', category: 'order-change',
    coordinates: [[[0, 0], [6, 5], [1, 6], [5, -1], [0, 0]]],
  },
  {
    id: 'boundary-shell-hole-single-point-touch', category: 'boundary',
    coordinates: [
      [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
      [[0, 5], [2, 4], [2, 6], [0, 5]],
    ],
  },
  {
    id: 'boundary-hole-hole-single-point-touch', category: 'boundary',
    coordinates: [
      [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
      [[2, 4], [5, 5], [2, 6], [2, 4]],
      [[8, 4], [8, 6], [5, 5], [8, 4]],
    ],
  },
  {
    id: 'boundary-three-holes-shared-tangency', category: 'boundary',
    coordinates: [
      [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
      [[5, 5], [3, 4], [3, 6], [5, 5]],
      [[5, 5], [7, 6], [7, 4], [5, 5]],
      [[5, 5], [4, 3], [6, 3], [5, 5]],
    ],
  },
];

const sharedEndpointRoundoffRing: Point[] = [
  [39.014597158105, 7.358797746181],
  [38.020926995267, 3.333339809808],
  [42.221211640942, 1.609599530458],
  [43.074592340625, 6.152020933641],
];
const sharedEndpointRoundoffCases: TopologyParityCase[] = [false, true].flatMap(reversed => {
  const ordered = reversed ? [...sharedEndpointRoundoffRing].reverse() : sharedEndpointRoundoffRing;
  return ordered.map((_, rotation) => ({
    id: `shared-endpoint-roundoff-${reversed ? 'reverse' : 'forward'}-${rotation}`,
    category: 'order-change' as const,
    coordinates: [closed([...ordered.slice(rotation), ...ordered.slice(0, rotation)])],
  }));
});

export const topologyParityCases = [...makeRandomCases(), ...boundaryCases, ...sharedEndpointRoundoffCases];
