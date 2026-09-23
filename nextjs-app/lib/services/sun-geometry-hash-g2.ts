import { createHash } from 'node:crypto';
import { orient2d } from 'robust-predicates';
import { z } from 'zod';

const finite = z.number().finite();
const databaseJsonString = z.string().superRefine((value, ctx) => {
  for (let index = 0; index < value.length; index++) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit === 0) {
      ctx.addIssue({ code: 'custom', message: 'String contains a NUL character' });
      return;
    }
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      if (index + 1 >= value.length || value.charCodeAt(index + 1) < 0xdc00 || value.charCodeAt(index + 1) > 0xdfff) {
        ctx.addIssue({ code: 'custom', message: 'String contains an unpaired UTF-16 surrogate' });
        return;
      }
      index++;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      ctx.addIssue({ code: 'custom', message: 'String contains an unpaired UTF-16 surrogate' });
      return;
    }
  }
});
const version = databaseJsonString.refine(value => {
  const length = Array.from(value).length;
  return length >= 1 && length <= 256;
}, 'String must contain 1 to 256 Unicode characters');
const position = z.tuple([finite.min(-180).max(180), finite.min(-90).max(90)]);
const MAX_RING_POINTS = 2_048;
const MAX_POLYGON_RINGS = 128;
const MAX_CASTERS = 5_000;
const MAX_TOTAL_COORDINATES = 250_000;
const MAX_SOURCE_FLAGS = 128;
const MAX_MANIFEST_MAP_ENTRIES = 128;
const MAX_MANIFEST_ENTRIES = 256;
type Point = [number, number];
type PolygonInput = { type: 'Polygon'; coordinates: Point[][] };

/**
 * The outer input guard is deliberately limited to collection shapes/lengths. Zod's
 * array `.max()` and parent refinements still parse child values, so they do
 * not prevent a nested topology refinement from running first. This guard is
 * piped ahead of the structural schema and rejects malformed/oversized rings
 * without reading a coordinate entry or constructing topology intermediates.
 */
function geometryAdmissionIssue(input: unknown): string | undefined {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const value = input as Record<string, unknown>;
  const manifest = value.manifest;
  if (manifest !== null && typeof manifest === 'object' && !Array.isArray(manifest)) {
    let totalEntries = 0;
    for (const key of ['solarConstants', 'shadowConstants', 'numericalDependencies']) {
      const map = (manifest as Record<string, unknown>)[key];
      if (map !== null && typeof map === 'object' && !Array.isArray(map)) {
        const entries = Reflect.ownKeys(map).length;
        if (entries > MAX_MANIFEST_MAP_ENTRIES) return `Manifest map exceeds ${MAX_MANIFEST_MAP_ENTRIES} entries`;
        totalEntries += entries;
      }
    }
    if (totalEntries > MAX_MANIFEST_ENTRIES) return `Manifest maps exceed ${MAX_MANIFEST_ENTRIES} aggregate entries`;
  }
  let totalCoordinates = 0;

  const inspectPolygon = (candidate: unknown): string | undefined => {
    if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) return 'Polygon must be an object';
    const coordinates = (candidate as Record<string, unknown>).coordinates;
    if (!Array.isArray(coordinates) || coordinates.length === 0) return 'Polygon must contain at least one ring';
    if (coordinates.length > MAX_POLYGON_RINGS) {
      return `Polygon exceeds ${MAX_POLYGON_RINGS} rings`;
    }
    for (const ring of coordinates) {
      // Empty rings do not consume the coordinate budget. Reject here rather
      // than allowing up to 5000 * 128 nested structural issues to accumulate.
      if (!Array.isArray(ring) || ring.length < 4) return 'Ring must contain at least 4 coordinates';
      if (ring.length > MAX_RING_POINTS) {
        return `Ring exceeds ${MAX_RING_POINTS} coordinates`;
      }
      totalCoordinates += ring.length;
      if (totalCoordinates > MAX_TOTAL_COORDINATES) {
        return `Geometry exceeds ${MAX_TOTAL_COORDINATES} coordinates`;
      }
    }
    return undefined;
  };

  const seatingIssue = inspectPolygon(value.seating);
  if (seatingIssue) return seatingIssue;

  if (!Array.isArray(value.casters)) return undefined;
  if (value.casters.length > MAX_CASTERS) {
    return `Geometry exceeds ${MAX_CASTERS} casters`;
  }
  for (const casterInput of value.casters) {
    if (casterInput === null || typeof casterInput !== 'object' || Array.isArray(casterInput)) continue;
    const casterValue = casterInput as Record<string, unknown>;
    const sourceFlags = casterValue.sourceFlags;
    if (Array.isArray(sourceFlags) && sourceFlags.length > MAX_SOURCE_FLAGS) {
      return `Caster source flags exceed ${MAX_SOURCE_FLAGS} entries`;
    }
    const casterIssue = inspectPolygon(casterValue.geometry);
    if (casterIssue) return casterIssue;
  }
  return undefined;
}

const ringStructure = z.array(position).min(4).max(MAX_RING_POINTS);
const ring = ringStructure.pipe(z.custom<Point[]>().superRefine((points, ctx) => {
  const first = points[0], last = points.at(-1)!;
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ctx.addIssue({ code: 'custom', message: 'Ring must be closed' });
  }
}));
const polygonStructure = z.strictObject({
  type: z.literal('Polygon'),
  coordinates: z.array(ring).min(1).max(MAX_POLYGON_RINGS),
});
const polygon = polygonStructure.pipe(z.custom<PolygonInput>().superRefine((value, ctx) => {
  if (!hasPostgisCompatiblePolygonTopology(value.coordinates)) {
    ctx.addIssue({ code: 'custom', message: 'Polygon topology is invalid' });
  }
}));
// Zod records omit __proto__ before parsing keys/values. Check the raw map
// first so no admitted manifest field can disappear from its g2 identity.
const manifestMapInput = z.unknown().superRefine((value, ctx) => {
  if (value !== null && typeof value === 'object' && Object.hasOwn(value, '__proto__')) {
    ctx.addIssue({ code: 'custom', message: 'Invalid engine manifest map key: __proto__' });
  }
});
const nonemptyNumbers = manifestMapInput.pipe(z.record(version, finite).refine(v => Object.keys(v).length > 0));
const numericalDependencies = manifestMapInput.pipe(z.record(version, version).superRefine((value, ctx) => {
  for (const dependency of ['turf', 'polyclip', 'node', 'robust-predicates']) {
    if (!(dependency in value)) {
      ctx.addIssue({ code: 'custom', message: `Missing required numerical dependency: ${dependency}` });
    }
  }
}));

type Segment = readonly [Point, Point];
type PointLocation = 'inside' | 'boundary' | 'outside';
type SegmentRelation = 'none' | 'touch' | 'cross' | 'overlap';

/**
 * Mirrors the OGC validity rules used by PostGIS/GEOS for Polygon rings.
 * Isolated tangencies are valid; crossings, shared linework, contained holes,
 * and contacts that split the polygon interior are not. orient2d avoids an
 * arbitrary epsilon when classifying nearly-collinear Float64 coordinates.
 */
function hasPostgisCompatiblePolygonTopology(coordinates: Point[][]): boolean {
  return inspectPolygonTopologyG2(coordinates).valid;
}

/** Deterministic work evidence for structurally admitted polygons; no global instrumentation. */
export function inspectPolygonTopologyG2(coordinates: Point[][]): {
  valid: boolean; work: { events: number; sortComparisons: number; treeComparisons: number; segmentChecks: number; containmentEdges: number; maxActive: number };
} {
  const work = { events: 0, sortComparisons: 0, treeComparisons: 0, segmentChecks: 0, containmentEdges: 0, maxActive: 0 };
  const rings = coordinates.map(openRing);
  const result = (valid: boolean) => ({ valid, work });
  if (rings.some(points => points.length < 3 || !isNondegenerateRing(points))) return result(false);
  const contacts = sweepRingContacts(rings, work);
  if (contacts === null) return result(false);
  for (let firstIndex = 0; firstIndex < rings.length; firstIndex++) {
    for (let secondIndex = firstIndex + 1; secondIndex < rings.length; secondIndex++) {
      const first = rings[firstIndex], second = rings[secondIndex];
      const contact = contacts.get(firstIndex * rings.length + secondIndex);
      // Simple Jordan boundaries with <=1 isolated contact cannot change sides.
      // A non-contact vertex therefore represents the entire boundary. No
      // interpolated midpoint (and no rounded/epsilon predicate) is necessary.
      const firstPoint = first.find(point => !samePoint(point, contact))!;
      const secondPoint = second.find(point => !samePoint(point, contact))!;
      work.containmentEdges += first.length + second.length;
      const secondInFirst = locatePointInRing(secondPoint, first);
      const firstInSecond = locatePointInRing(firstPoint, second);
      if (firstInSecond !== 'outside' || secondInFirst !== (firstIndex === 0 ? 'inside' : 'outside')) return result(false);
    }
  }
  return result(true);
}

type SweepEdge = { id: number; ring: number; index: number; length: number; left: Point; right: Point };
type SweepNode = { edge: SweepEdge; height: number; left: SweepNode | null; right: SweepNode | null };
type TopologyWork = ReturnType<typeof inspectPolygonTopologyG2>['work'];
function pointOrder(a: Point, b: Point): number { return a[0] - b[0] || a[1] - b[1]; }

/**
 * Endpoint sweep / intersection decision, not intersection enumeration.
 * A future proper crossing or overlap is rejected as soon as its segments
 * become neighbours, BEFORE it can invalidate the status order. Lexicographic
 * (x,y) events are an infinitesimal shear, including vertical segments. Status
 * comparisons use exact orientation signs, never division or an epsilon.
 *
 * Endpoint-on-interior and multiway contacts are handled as one event: gather
 * the contiguous incident status range, remove it, then insert continuing and
 * starting edges. AVL range lookup costs O(log N + incident edges), not a scan.
 * Connected-interior checks bound admitted contacts by a forest over R rings.
 * Total cost O(N log N + R^2); storage O(N + R^2). Containment separately costs
 * O(R*N), R <=128. These bounds sum over ALL polygons/casters, N <=250000.
 */
function sweepRingContacts(rings: Point[][], work: TopologyWork): Map<number, Point> | null {
  const events: { point: Point; edge: SweepEdge; start: boolean }[] = [];
  let nextId = 0;
  for (let ring = 0; ring < rings.length; ring++) {
    const points = rings[ring];
    for (let index = 0; index < points.length; index++) {
      const a = points[index], b = points[(index + 1) % points.length];
      const [left, right] = pointOrder(a, b) < 0 ? [a, b] : [b, a];
      const edge = { id: nextId++, ring, index, length: points.length, left, right };
      events.push({ point: left, edge, start: true }, { point: right, edge, start: false });
    }
  }
  events.sort((a, b) => { work.sortComparisons++; return pointOrder(a.point, b.point) || a.edge.id - b.edge.id; });
  let sweepPoint: Point = [-Infinity, -Infinity];
  let sweepSide: -1 | 1 = -1;
  const compareEdges = (a: SweepEdge, b: SweepEdge): number => {
    work.treeComparisons++;
    if (a.id === b.id) return 0;
    const aAtPoint = pointOnSegment(sweepPoint, a.left, a.right);
    const bAtPoint = pointOnSegment(sweepPoint, b.left, b.right);
    // Every status search is driven by an edge incident to the current event.
    // Compare that event point to the other segment with the exact predicate;
    // rounded ordinate interpolation can otherwise search the wrong AVL branch.
    if (aAtPoint && bAtPoint) {
      const slopeOrder = orientation(
        [0, 0],
        [a.right[0] - a.left[0], a.right[1] - a.left[1]],
        [b.right[0] - b.left[0], b.right[1] - b.left[1]],
      );
      if (slopeOrder !== 0) return slopeOrder * sweepSide;
      return a.id - b.id;
    }
    if (aAtPoint !== bAtPoint) {
      if (aAtPoint) {
        if (b.left[0] === b.right[0]) return sweepPoint[1] < b.left[1] ? -1 : 1;
        return -orientation(b.left, b.right, sweepPoint);
      }
      if (a.left[0] === a.right[0]) return sweepPoint[1] < a.left[1] ? 1 : -1;
      return orientation(a.left, a.right, sweepPoint);
    }
    const ordinate = (edge: SweepEdge): number => edge.left[0] === edge.right[0]
      ? sweepPoint[1]
      : edge.left[1] + ((sweepPoint[0] - edge.left[0]) * (edge.right[1] - edge.left[1])) / (edge.right[0] - edge.left[0]);
    const ay = ordinate(a), by = ordinate(b);
    if (ay !== by) return ay < by ? -1 : 1;
    const adx = a.right[0] - a.left[0], bdx = b.right[0] - b.left[0];
    const slopeOrder = (a.right[1] - a.left[1]) * bdx - (b.right[1] - b.left[1]) * adx;
    if (slopeOrder !== 0) return (slopeOrder < 0 ? -1 : 1) * sweepSide;
    return a.id - b.id;
  };
  const status = new SweepStatus(compareEdges);
  const contacts = new Map<number, Point>();
  const parents = rings.map((_, index) => index);
  const root = (index: number): number => {
    while (parents[index] !== index) { parents[index] = parents[parents[index]]; index = parents[index]; }
    return index;
  };
  const allowedPair = (a: SweepEdge | undefined, b: SweepEdge | undefined): boolean => {
    if (!a || !b) return true;
    work.segmentChecks++;
    const relation = segmentRelation([a.left, a.right], [b.left, b.right]);
    if (relation === 'cross' || relation === 'overlap') return false;
    const adjacent = (a.index + 1) % a.length === b.index || (b.index + 1) % b.length === a.index;
    return relation !== 'touch' || a.ring !== b.ring || adjacent;
  };
  for (let eventIndex = 0; eventIndex < events.length;) {
    const point = events[eventIndex].point;
    sweepPoint = point;
    sweepSide = -1;
    const starting: SweepEdge[] = [];
    let end = eventIndex;
    while (end < events.length && samePoint(events[end].point, point)) {
      if (events[end].start) starting.push(events[end].edge);
      end++;
    }
    work.events++;
    const incident = status.atPoint(point, work);
    const all = [...incident, ...starting];
    // First establish at most two adjacent edges from each simple ring. This
    // also prevents a malicious repeated-vertex group from doing quadratic work.
    const byRing = new Map<number, SweepEdge[]>();
    for (const edge of all) {
      const previous = byRing.get(edge.ring);
      if (previous) {
        if (previous.length === 2 || !allowedPair(previous[0], edge)) return null;
        previous.push(edge);
      } else byRing.set(edge.ring, [edge]);
    }
    const ringIds = [...byRing.keys()];
    // One event is ONE contact node. Join a star, not all ring pairs: three
    // rings touching at one point form a valid star, not a ring-only K3 cycle.
    if (ringIds.length > 1) {
      const base = root(ringIds[0]);
      for (const ring of ringIds.slice(1)) {
        const other = root(ring);
        if (base === other) return null;
        parents[other] = base;
      }
      for (let i = 0; i < ringIds.length; i++) {
        for (let j = i + 1; j < ringIds.length; j++) {
          const lo = Math.min(ringIds[i], ringIds[j]), hi = Math.max(ringIds[i], ringIds[j]);
          contacts.set(lo * rings.length + hi, point);
          for (const a of byRing.get(lo)!) for (const b of byRing.get(hi)!) if (!allowedPair(a, b)) return null;
        }
      }
    }
    // Check the gap when an incident range is removed. Insertions check each
    // new neighbour, including a vertical edge active between same-x events.
    let below: SweepEdge | undefined, above: SweepEdge | undefined;
    if (incident.length) {
      below = status.neighbours(incident[0]).below;
      above = status.neighbours(incident[incident.length - 1]).above;
    }
    for (const edge of incident) status.remove(edge);
    if (!allowedPair(below, above)) return null;
    sweepSide = 1;
    for (const edge of [...incident.filter(edge => !samePoint(edge.right, point)), ...starting]) {
      status.insert(edge);
      const neighbours = status.neighbours(edge);
      if (!allowedPair(neighbours.below, edge) || !allowedPair(edge, neighbours.above)) return null;
    }
    work.maxActive = Math.max(work.maxActive, status.size);
    eventIndex = end;
  }
  return contacts;
}

/** Deterministically balanced status: random priorities cannot give a hard bound. */
class SweepStatus {
  private tree: SweepNode | null = null;
  size = 0;
  constructor(private readonly compare: (a: SweepEdge, b: SweepEdge) => number) {}
  private height(node: SweepNode | null): number { return node?.height ?? 0; }
  private update(node: SweepNode): SweepNode { node.height = 1 + Math.max(this.height(node.left), this.height(node.right)); return node; }
  private rotateLeft(node: SweepNode): SweepNode {
    const top = node.right!; node.right = top.left; top.left = this.update(node); return this.update(top);
  }
  private rotateRight(node: SweepNode): SweepNode {
    const top = node.left!; node.left = top.right; top.right = this.update(node); return this.update(top);
  }
  private balance(node: SweepNode): SweepNode {
    this.update(node);
    if (this.height(node.left) - this.height(node.right) > 1) {
      if (this.height(node.left!.right) > this.height(node.left!.left)) node.left = this.rotateLeft(node.left!);
      return this.rotateRight(node);
    }
    if (this.height(node.right) - this.height(node.left) > 1) {
      if (this.height(node.right!.left) > this.height(node.right!.right)) node.right = this.rotateRight(node.right!);
      return this.rotateLeft(node);
    }
    return node;
  }
  insert(edge: SweepEdge): void {
    const visit = (node: SweepNode | null): SweepNode => {
      if (!node) return { edge, height: 1, left: null, right: null };
      if (this.compare(edge, node.edge) < 0) node.left = visit(node.left); else node.right = visit(node.right);
      return this.balance(node);
    };
    this.tree = visit(this.tree); this.size++;
  }
  remove(edge: SweepEdge): void {
    const path: number[] = [];
    const visit = (node: SweepNode | null, target: SweepEdge): SweepNode | null => {
      if (!node) throw new Error(`Topology sweep status invariant violated while removing edge ${target.id}; path ${path.join(',')}`);
      path.push(node.edge.id);
      const order = this.compare(target, node.edge);
      if (order < 0) node.left = visit(node.left, target);
      else if (order > 0) node.right = visit(node.right, target);
      else {
        if (!node.left) return node.right;
        if (!node.right) return node.left;
        let successor = node.right;
        while (successor.left) successor = successor.left;
        node.edge = successor.edge;
        const removeMinimum = (current: SweepNode): SweepNode | null => {
          if (!current.left) return current.right;
          current.left = removeMinimum(current.left);
          return this.balance(current);
        };
        node.right = removeMinimum(node.right);
      }
      return this.balance(node);
    };
    this.tree = visit(this.tree, edge); this.size--;
  }
  neighbours(edge: SweepEdge): { below?: SweepEdge; above?: SweepEdge } {
    let node = this.tree, below: SweepEdge | undefined, above: SweepEdge | undefined;
    while (node) {
      const order = this.compare(edge, node.edge);
      if (order < 0) { above = node.edge; node = node.left; }
      else if (order > 0) { below = node.edge; node = node.right; }
      else {
        let lower = node.left, upper = node.right;
        if (lower) { while (lower.right) lower = lower.right; below = lower.edge; }
        if (upper) { while (upper.left) upper = upper.left; above = upper.edge; }
        break;
      }
    }
    return { below, above };
  }
  atPoint(point: Point, work: TopologyWork): SweepEdge[] {
    const found: SweepEdge[] = [];
    const visit = (node: SweepNode | null): void => {
      if (!node) return;
      work.treeComparisons++;
      const order = orientation(node.edge.left, node.edge.right, point);
      if (order >= 0) visit(node.left);
      if (order === 0) found.push(node.edge);
      if (order <= 0) visit(node.right);
    };
    visit(this.tree);
    return found;
  }
}

function openRing(closed: Point[]): Point[] {
  const points: Point[] = [];
  for (let index = 0; index < closed.length - 1; index++) {
    const point = closed[index];
    if (!samePoint(point, points.at(-1))) points.push(point);
  }
  if (points.length > 1 && samePoint(points[0], points.at(-1))) points.pop();
  return points;
}

function isNondegenerateRing(points: Point[]): boolean {
  const first = points[0];
  const second = points.find(point => !samePoint(point, first));
  return second !== undefined && points.some(point => orientation(first, second, point) !== 0);
}

function segmentRelation([a, b]: Segment, [c, d]: Segment): SegmentRelation {
  const abc = orientation(a, b, c), abd = orientation(a, b, d);
  const cda = orientation(c, d, a), cdb = orientation(c, d, b);
  if (abc === 0 && abd === 0 && cda === 0 && cdb === 0) {
    const endpoints = intersectionEndpoints([a, b], [c, d]);
    return endpoints.length === 0 ? 'none' : endpoints.length === 1 ? 'touch' : 'overlap';
  }
  if (abc !== 0 && abd !== 0 && cda !== 0 && cdb !== 0) {
    return abc !== abd && cda !== cdb ? 'cross' : 'none';
  }
  return intersectionEndpoints([a, b], [c, d]).length > 0 ? 'touch' : 'none';
}

function intersectionEndpoints([a, b]: Segment, [c, d]: Segment): Point[] {
  const points = [a, b, c, d].filter((point, index, values) =>
    pointOnSegment(point, a, b) && pointOnSegment(point, c, d)
      && values.findIndex(candidate => samePoint(candidate, point)) === index,
  );
  return points;
}

function locatePointInRing(point: Point, ring: Point[]): PointLocation {
  let inside = false;
  for (let index = 0; index < ring.length; index++) {
    const start = ring[index], end = ring[(index + 1) % ring.length];
    if (pointOnSegment(point, start, end)) return 'boundary';
    const upwardCrossing = start[1] <= point[1] && end[1] > point[1] && orientation(start, end, point) < 0;
    const downwardCrossing = end[1] <= point[1] && start[1] > point[1] && orientation(start, end, point) > 0;
    if (upwardCrossing || downwardCrossing) inside = !inside;
  }
  return inside ? 'inside' : 'outside';
}

function pointOnSegment(point: Point, start: Point, end: Point): boolean {
  return orientation(start, end, point) === 0
    && point[0] >= Math.min(start[0], end[0]) && point[0] <= Math.max(start[0], end[0])
    && point[1] >= Math.min(start[1], end[1]) && point[1] <= Math.max(start[1], end[1]);
}

function orientation(a: Point, b: Point, c: Point): -1 | 0 | 1 {
  const value = orient2d(a[0], a[1], b[0], b[1], c[0], c[1]);
  return value < 0 ? -1 : value > 0 ? 1 : 0;
}

function samePoint(first: Point | undefined, second: Point | undefined): boolean {
  return first !== undefined && second !== undefined && first[0] === second[0] && first[1] === second[1];
}

// No defaults: producers must identify all numerical policies explicitly. Additional
// algorithms/constants must be bound here before a producer can use this contract.
export const geometryEngineManifestSchema = z.strictObject({
  canonicalization: z.literal('g2-jcs-rings-v1'), coordinateDerivation: version, selectionAlgorithm: version,
  solarAlgorithm: version, refractionAlgorithm: version, shadowAlgorithm: version,
  horizonVersion: z.literal('solar-centre-refracted-5deg-v1'), samplingVersion: version, decoderVersion: z.literal('f64-v1'),
  searchRadiusM: finite.positive(), maxShadowDistanceM: finite.positive(), minimumHeightM: finite.nonnegative(),
  supportedElevationDegrees: z.literal(5), baseStepMs: z.literal(300000), probeStepMs: z.literal(60000),
  proximityPercent: z.literal(5), thresholdPercent: z.literal(50),
  crossingBracketMs: finite.positive().max(100), horizonRootMs: finite.positive().max(10000), minimumWindowMs: z.literal(300000),
  maxEvaluations: z.literal(20000), solarConstants: nonemptyNumbers,
  shadowConstants: nonemptyNumbers, numericalDependencies,
});
export type GeometryEngineManifest = z.infer<typeof geometryEngineManifestSchema>;

const caster = z.strictObject({
  id: version, geometry: polygon, effectiveHeightM: finite.nonnegative(),
  groundElevationM: finite.nullable(), roofElevationM: finite.nullable(),
  importGeneration: version, heightSource: z.enum(['Surveyed', 'Osm', 'Heuristic', 'ManualOverride']), source: version,
  qualityScore: finite, sourcePriority: finite.nullable(), tier: z.enum(['primary', 'secondary', 'uncertain', 'unknown']),
  filterDecision: z.enum(['include', 'review', 'exclude', 'unknown']),
  casterClass: z.enum(['building', 'manual_override', 'structure', 'vegetation', 'unknown']),
  active: z.boolean(),
  sourceFlags: z.array(version).max(MAX_SOURCE_FLAGS),
});
// Known display/weather/product fields are explicitly stripped. Everything else
// fails closed so a future engine-affecting input cannot escape g2 identity.
const geometryInputG2StructureSchema = z.strictObject({
  seating: polygon, engineCoordinate: z.strictObject({ lng: finite.min(-180).max(180), lat: finite.min(-90).max(90) }),
  seatingElevationM: finite, groundElevationM: finite.nullable(),
  casters: z.array(caster).max(MAX_CASTERS).refine(v => new Set(v.map(c => c.id)).size === v.length, 'Duplicate caster identity'),
  manifest: geometryEngineManifestSchema,
  displayPin: z.unknown().optional(), openingHours: z.unknown().optional(), metadata: z.unknown().optional(),
  weather: z.unknown().optional(), plannerLength: z.unknown().optional(),
}).transform(value => ({
  seating: value.seating, engineCoordinate: value.engineCoordinate,
  seatingElevationM: value.seatingElevationM, groundElevationM: value.groundElevationM,
  casters: value.casters, manifest: value.manifest,
}));

// `.pipe()` is significant: Zod does not invoke the structural schema after
// this refinement emits an issue, so topology only receives admitted geometry.
export const geometryInputG2Schema = z.unknown().superRefine((input, ctx) => {
  const issue = geometryAdmissionIssue(input);
  if (issue) ctx.addIssue({ code: 'custom', message: issue });
}).pipe(geometryInputG2StructureSchema);
export type GeometryInputG2 = z.infer<typeof geometryInputG2Schema>;

function canonicalNumber(value: number): string {
  const encoded = JSON.stringify(value === 0 ? 0 : value);
  if (!/[eE]/.test(encoded)) return encoded;
  const match = /^(-?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/.exec(encoded);
  if (!match) throw new Error('Unsupported canonical number');
  const [, sign, integer, fraction = '', exponentText] = match;
  const digits = integer + fraction;
  const decimalIndex = integer.length + Number(exponentText);
  if (decimalIndex <= 0) return `${sign}0.${'0'.repeat(-decimalIndex)}${digits}`;
  if (decimalIndex >= digits.length) return `${sign}${digits}${'0'.repeat(decimalIndex - digits.length)}`;
  return `${sign}${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`;
}

/** Locale-independent sorted JSON with PostgreSQL-jsonb-compatible decimal spelling. */
export function geometryCanonicalJson(value: unknown): string {
  if (value === null || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'string') return JSON.stringify(databaseJsonString.parse(value));
  if (typeof value === 'number' && Number.isFinite(value)) return canonicalNumber(value);
  if (Array.isArray(value)) return `[${value.map(geometryCanonicalJson).join(',')}]`;
  if (typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype) {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj).map(key => databaseJsonString.parse(key)).sort(compare).map(k => `${JSON.stringify(k)}:${geometryCanonicalJson(obj[k])}`).join(',')}}`;
  }
  throw new Error('Unsupported canonical value');
}

function normalizePolygon(value: GeometryInputG2['seating']): GeometryInputG2['seating'] {
  const rings = value.coordinates.map(closed => {
    const points = closed.slice(0, -1).map(p => p.map(v => v === 0 ? 0 : v) as [number, number]);
    // Booth-style least rotation keeps canonicalization linear in ring size.
    // Repeated minima and winding cannot affect identity. Shell stays shell;
    // holes sort independently.
    const forward = leastRotation(points);
    const reverse = leastRotation(points.toReversed());
    const canonical = compare(geometryCanonicalJson(forward), geometryCanonicalJson(reverse)) <= 0 ? forward : reverse;
    return [...canonical, canonical[0]];
  });
  // Serialize each hole key once. Re-encoding whole rings in the comparison
  // callback otherwise allocates O(N log R) temporary strings and UTF-8 buffers.
  const holes = rings.slice(1).map(points => ({ points, key: Buffer.from(geometryCanonicalJson(points), 'utf8') }));
  holes.sort((a, b) => Buffer.compare(a.key, b.key));
  return { type: 'Polygon', coordinates: [rings[0], ...holes.map(hole => hole.points)] };
}
function compare(a: string, b: string): number { return Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8')); }
function leastRotation(points: [number, number][]): [number, number][] {
  const keys = points.map(geometryCanonicalJson);
  const n = keys.length;
  let i = 0, j = 1, k = 0;
  while (i < n && j < n && k < n) {
    const order = compare(keys[(i + k) % n], keys[(j + k) % n]);
    if (order === 0) { k++; continue; }
    if (order > 0) { i += k + 1; if (i <= j) i = j + 1; }
    else { j += k + 1; if (j <= i) j = i + 1; }
    k = 0;
  }
  const start = Math.min(i, j);
  return [...points.slice(start), ...points.slice(0, start)];
}

export function canonicalGeometryInputG2(input: unknown): string {
  const parsed = geometryInputG2Schema.parse(input);
  return geometryCanonicalJson({
    ...parsed, seating: normalizePolygon(parsed.seating),
    casters: parsed.casters.map(c => ({ ...c, geometry: normalizePolygon(c.geometry), sourceFlags: [...new Set(c.sourceFlags)].sort(compare) }))
      .sort((a, b) => compare(a.id, b.id)),
  });
}

export function computeGeometryInputHashG2(input: unknown): string {
  return `g2:${createHash('sha256').update(canonicalGeometryInputG2(input), 'utf8').digest('hex')}`;
}
