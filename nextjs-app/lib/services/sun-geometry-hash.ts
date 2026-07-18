import { createHash } from 'node:crypto';
import {
  PLANNER_END_MINUTES,
  PLANNER_MAX_FUTURE_DAYS,
  PLANNER_START_MINUTES,
  PLANNER_STEP_MINUTES,
} from '@/lib/utils/time-planner';

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

const HASH_VERSION = 'g1';

const STORY_123_BASE_INPUT = {
  version: 'g1',
  plannerStepMinutes: 15,
  venue: {
    id: 'venue-1',
    seatingElevationM: 18.25,
    groundElevationM: 11.5,
    seatingArea: {
      type: 'Polygon',
      coordinates: [
        [
          [11.9701, 57.7051],
          [11.9704, 57.7051],
          [11.9704, 57.7054],
          [11.9701, 57.7054],
          [11.9701, 57.7051],
        ],
      ],
    },
  },
  casters: [
    {
      id: 'b-2',
      importGeneration: '2026-07-12',
      footprintEwkbHex: '0103000020E6100000010000000500000000',
      groundZ: 10,
      roofZ: 32.5,
    },
    {
      id: 'b-1',
      importGeneration: '2026-07-12',
      footprintEwkbHex: '0103000020E6100000010000000500000001',
      groundZ: 10.2,
      roofZ: 28,
    },
  ],
};

export const GEOMETRY_INPUT_HASH_GOLDEN_VECTORS = {
  story123RealVenueScaleBase: computeGeometryInputHashSync(STORY_123_BASE_INPUT),
} as const;

export async function computeGeometryInputHash(input: unknown): Promise<string> {
  return computeGeometryInputHashSync(input);
}

function computeGeometryInputHashSync(input: unknown): string {
  const canonicalInput = canonicalizeGeometryInput(input);
  const canonical = jcsStringify(canonicalInput);
  const digest = createHash('sha256').update(canonical, 'utf8').digest('hex');
  return `${HASH_VERSION}:${digest}`;
}

export function canonicalizeGeometryInput(input: unknown): JsonValue {
  return canonicalizeValue(input, undefined);
}

export function buildPlannerHashContract(): JsonValue {
  return {
    plannerStartMinutes: PLANNER_START_MINUTES,
    plannerEndMinutes: PLANNER_END_MINUTES,
    plannerStepMinutes: PLANNER_STEP_MINUTES,
    plannerMaxFutureDays: PLANNER_MAX_FUTURE_DAYS,
  };
}

function canonicalizeValue(value: unknown, key: string | undefined): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    return key && /ewkb/i.test(key) ? value.toUpperCase() : value;
  }
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('Cannot hash non-finite numeric geometry input');
    }
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeValue(item, undefined));
  }
  if (typeof value !== 'object') {
    throw new Error(`Unsupported geometry input type: ${typeof value}`);
  }

  const source = value as Record<string, unknown>;
  if (source.type === 'Polygon' && Array.isArray(source.coordinates)) {
    return canonicalizePolygon(source as { type: 'Polygon'; coordinates: unknown });
  }

  const keys = Object.keys(source).sort();
  const normalized: Record<string, JsonValue> = {};
  for (const objectKey of keys) {
    const child = source[objectKey];
    if (objectKey === 'casters' && Array.isArray(child)) {
      const casters = child.map((caster) => canonicalizeValue(caster, objectKey));
      casters.sort((a, b) => {
        const aRecord = a && typeof a === 'object' && !Array.isArray(a) ? a as Record<string, JsonValue> : {};
        const bRecord = b && typeof b === 'object' && !Array.isArray(b) ? b as Record<string, JsonValue> : {};
        const idCompare = String(aRecord.id ?? '').localeCompare(String(bRecord.id ?? ''));
        if (idCompare !== 0) return idCompare;
        const ewkbCompare = String(aRecord.footprintEwkbHex ?? '').localeCompare(
          String(bRecord.footprintEwkbHex ?? ''),
        );
        if (ewkbCompare !== 0) return ewkbCompare;
        return jcsStringify(a).localeCompare(jcsStringify(b));
      });
      normalized[objectKey] = casters;
    } else {
      normalized[objectKey] = canonicalizeValue(child, objectKey);
    }
  }
  return normalized;
}

function canonicalizePolygon(polygon: { type: 'Polygon'; coordinates: unknown }): JsonValue {
  if (!Array.isArray(polygon.coordinates) || polygon.coordinates.length === 0) {
    throw new Error('Invalid seating polygon: missing coordinates');
  }
  const rings = polygon.coordinates.map((ring, index) =>
    canonicalizeRing(ring, index === 0 ? 'outer' : 'hole'),
  );
  const [outer, ...holes] = rings;
  if (!outer) throw new Error('Invalid seating polygon: missing outer ring');
  holes.sort((a, b) => jcsStringify(a).localeCompare(jcsStringify(b)));
  return {
    type: 'Polygon',
    coordinates: [outer, ...holes],
  };
}

function canonicalizeRing(value: unknown, role: 'outer' | 'hole'): JsonValue[] {
  if (!Array.isArray(value)) {
    throw new Error('Invalid seating polygon: ring is not an array');
  }
  const ring = value.map((point) => {
    if (!Array.isArray(point) || point.length < 2) {
      throw new Error('Invalid seating polygon: point is not a 2D position');
    }
    const lng = canonicalNumber(point[0]);
    const lat = canonicalNumber(point[1]);
    return [lng, lat] as [number, number];
  });
  const open = ring.length > 1 && samePoint(ring[0], ring.at(-1)) ? ring.slice(0, -1) : ring;
  if (open.length < 3) {
    throw new Error('Invalid seating polygon: ring must contain at least three positions');
  }
  const area = signedArea(open);
  const wantsCounterClockwise = role === 'outer';
  const oriented =
    (wantsCounterClockwise && area < 0) || (!wantsCounterClockwise && area > 0)
      ? [...open].reverse()
      : open;
  const rotated = rotateToLexicographicMinimum(oriented);
  return [...rotated, rotated[0]].map((point) => [point[0], point[1]]);
}

function canonicalNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Cannot hash non-finite numeric geometry input');
  }
  return Object.is(value, -0) ? 0 : value;
}

function samePoint(a: [number, number] | undefined, b: [number, number] | undefined): boolean {
  return Boolean(a && b && a[0] === b[0] && a[1] === b[1]);
}

function signedArea(ring: readonly [number, number][]): number {
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

function rotateToLexicographicMinimum(ring: readonly [number, number][]): [number, number][] {
  let minIndex = 0;
  for (let i = 1; i < ring.length; i++) {
    if (comparePoint(ring[i], ring[minIndex]) < 0) minIndex = i;
  }
  return Array.from({ length: ring.length }, (_, offset) => ring[(minIndex + offset) % ring.length]);
}

function comparePoint(a: [number, number], b: [number, number]): number {
  if (a[0] !== b[0]) return a[0] - b[0];
  return a[1] - b[1];
}

function jcsStringify(value: JsonValue): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Cannot canonicalize non-finite number');
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(jcsStringify).join(',')}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${jcsStringify(value[key])}`)
    .join(',')}}`;
}
