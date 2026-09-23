import { describe, expect, it } from 'vitest';
import { computeGeometryInputHashG2, canonicalGeometryInputG2, geometryCanonicalJson, geometryEngineManifestSchema, geometryInputG2Schema } from '@/lib/services/sun-geometry-hash-g2';
import { g2Input } from '../../fixtures/epic-15/g2-input';
import { g2TopologyBoundaries } from '../../fixtures/epic-15/g2-topology-boundaries';

describe('I01 g2 identity', () => {
  it.each(['solarConstants', 'shadowConstants', 'numericalDependencies'] as const)('rejects an own __proto__ key in %s before record parsing can discard it', (map) => {
    const input = structuredClone(g2Input);
    Object.defineProperty(input.manifest[map], '__proto__', {
      value: map === 'numericalDependencies' ? '1.0.0' : 1,
      enumerable: true,
    });
    // Exercise actual JSON input, not the object-literal prototype setter.
    const jsonInput = JSON.parse(JSON.stringify(input));
    expect(Object.hasOwn(jsonInput.manifest[map], '__proto__')).toBe(true);
    expect(geometryEngineManifestSchema.safeParse(jsonInput.manifest).success).toBe(false);
    expect(geometryInputG2Schema.safeParse(jsonInput).success).toBe(false);
    expect(() => geometryEngineManifestSchema.parse(jsonInput.manifest)).toThrow('manifest map key');
    expect(() => canonicalGeometryInputG2(jsonInput)).toThrow('manifest map key');
    expect(() => computeGeometryInputHashG2(jsonInput)).toThrow('manifest map key');
  });
  it.each(['solarConstants', 'shadowConstants', 'numericalDependencies'] as const)('preserves and hashes ordinary prototype-named keys in %s', (map) => {
    const input = structuredClone(g2Input);
    for (const key of ['constructor', 'prototype']) {
      Object.defineProperty(input.manifest[map], key, {
        value: map === 'numericalDependencies' ? '1.0.0' : 1,
        enumerable: true,
      });
    }
    const canonical = JSON.parse(canonicalGeometryInputG2(input));
    expect(canonical.manifest[map]).toEqual(input.manifest[map]);
    expect(computeGeometryInputHashG2(input)).not.toBe(computeGeometryInputHashG2(g2Input));
    expect(computeGeometryInputHashG2(canonical)).toBe(computeGeometryInputHashG2(input));
  });
  it('matches a literal SHA256 vector', () => {
    // Independently verified with Python hashlib + sorted compact JSON; the
    // fixture's rings and caster ordering are already canonical.
    expect(computeGeometryInputHashG2(g2Input)).toBe('g2:6354c3ed89c4d41f062a2d5c92540a121a5302ee0a465e5667a064e3fd5e762e');
    const predicateUpgrade = structuredClone(g2Input);
    predicateUpgrade.manifest.numericalDependencies['robust-predicates'] = '2.0.5';
    expect(computeGeometryInputHashG2(predicateUpgrade)).not.toBe(computeGeometryInputHashG2(g2Input));
    const upgraded = structuredClone(g2Input);
    upgraded.manifest.numericalDependencies.turf = '7.3.6';
    expect(computeGeometryInputHashG2(upgraded)).toBe('g2:3b66276d724f99ae0afbfcd050bb1e2785fdfe1250c079ff34b52fc2b54b2b1f');
  });
  it('normalizes ring start, orientation, caster order, object order and negative zero', () => {
    const b = structuredClone(g2Input);
    b.seating.coordinates[0] = [[1, 1], [1, 0], [-0, 0], [1, 1]];
    b.seatingElevationM = -0;
    expect(computeGeometryInputHashG2(b)).toBe(computeGeometryInputHashG2(g2Input));
    const a = { ...b, casters: [...b.casters, { ...b.casters[0], id: '2' }] };
    expect(computeGeometryInputHashG2(a)).toBe(computeGeometryInputHashG2({ ...a, casters: a.casters.toReversed() }));
  });
  it.each(['displayPin', 'openingHours', 'metadata', 'weather', 'plannerLength'])('excludes %s', (field) => {
    expect(computeGeometryInputHashG2({ ...g2Input, [field]: { changed: true } })).toBe(computeGeometryInputHashG2(g2Input));
  });
  it('rejects unknown top-level fields instead of silently dropping future engine inputs', () => {
    expect(() => computeGeometryInputHashG2({ ...g2Input, geometrySelectionPolicy: 'future-policy' })).toThrow();
  });
  it('uses PostgreSQL-compatible decimal spelling and UTF-8/C key ordering', () => {
    expect(geometryCanonicalJson({ small: 1e-7, large: 1e21 })).toBe('{"large":1000000000000000000000,"small":0.0000001}');
    expect(geometryCanonicalJson({ '𐀀': 1, '': 2 })).toBe('{"":2,"𐀀":1}');
  });
  it('normalizes holes and eligibility-flag set ordering', () => {
    const a = structuredClone(g2Input);
    a.seating.coordinates.push([[0.4,0.1],[0.5,0.1],[0.5,0.2],[0.4,0.1]], [[0.7,0.1],[0.8,0.1],[0.8,0.2],[0.7,0.1]]);
    const b = structuredClone(a);
    b.seating.coordinates = [b.seating.coordinates[0], ...b.seating.coordinates.slice(1).toReversed().map(r=>r.toReversed())];
    expect(computeGeometryInputHashG2(a)).toBe(computeGeometryInputHashG2(b));
    const withFlags = { ...a, casters: [{ ...a.casters[0], sourceFlags: ['source-b','source-a'] }] };
    expect(computeGeometryInputHashG2(withFlags)).toBe(computeGeometryInputHashG2({ ...withFlags, casters: [{ ...withFlags.casters[0], sourceFlags: ['source-a','source-b','source-a'] }] }));
  });
  it('binds every manifest leaf independently', () => {
    const fixedPolicy = new Set(['canonicalization', 'horizonVersion', 'decoderVersion', 'supportedElevationDegrees', 'baseStepMs', 'probeStepMs', 'proximityPercent', 'thresholdPercent', 'crossingBracketMs', 'horizonRootMs', 'minimumWindowMs', 'maxEvaluations']);
    for (const [key, value] of Object.entries(g2Input.manifest)) {
      const mutations = typeof value === 'object'
        ? Object.entries(value).map(([k, v]) => ({ ...value, [k]: typeof v === 'number' ? v + 1 : `${v}-changed` }))
        : [typeof value === 'number' ? value + 1 : `${value}-changed`];
      for (const mutation of mutations) {
        const changed = { ...g2Input, manifest: { ...g2Input.manifest, [key]: mutation } };
        if (fixedPolicy.has(key)) expect(() => computeGeometryInputHashG2(changed), key).toThrow();
        else expect(computeGeometryInputHashG2(changed), key).not.toBe(computeGeometryInputHashG2(g2Input));
      }
    }
  });
  it('binds every caster field and venue elevation/coordinate/polygon', () => {
    for (const [key, value] of Object.entries(g2Input.casters[0])) {
      if (key === 'geometry') continue;
      const validAlternates: Record<string, unknown> = {
        heightSource: 'Osm', tier: 'secondary', filterDecision: 'review', casterClass: 'structure',
      };
      const changed = key in validAlternates ? validAlternates[key]
        : typeof value === 'boolean' ? !value : typeof value === 'number' ? value + 1 : Array.isArray(value) ? ['corrected'] : `${value}-changed`;
      expect(computeGeometryInputHashG2({ ...g2Input, casters: [{ ...g2Input.casters[0], [key]: changed }] }), key).not.toBe(computeGeometryInputHashG2(g2Input));
    }
    for (const key of ['seatingElevationM', 'groundElevationM'] as const) {
      expect(computeGeometryInputHashG2({ ...g2Input, [key]: 11 })).not.toBe(computeGeometryInputHashG2(g2Input));
    }
    const changedCaster = structuredClone(g2Input);
    changedCaster.casters[0].geometry.coordinates[0][1][0] += 0.1;
    expect(computeGeometryInputHashG2(changedCaster)).not.toBe(computeGeometryInputHashG2(g2Input));
    expect(computeGeometryInputHashG2({ ...g2Input, engineCoordinate: { lng: 1, lat: 1 } })).not.toBe(computeGeometryInputHashG2(g2Input));
    const changedSeating = structuredClone(g2Input);
    changedSeating.seating.coordinates[0][1][0] += 0.1;
    expect(computeGeometryInputHashG2(changedSeating)).not.toBe(computeGeometryInputHashG2(g2Input));
  });
  it.each([NaN, Infinity, -Infinity, null, '10'])('rejects malformed numeric input %s', (value) => {
    expect(() => computeGeometryInputHashG2({ ...g2Input, seatingElevationM: value })).toThrow();
  });
  it('rejects missing dependencies, unclosed/degenerate/3D rings and duplicate caster IDs', () => {
    expect(() => computeGeometryInputHashG2({ ...g2Input, manifest: {} })).toThrow();
    for (const ring of [[[0, 0], [1, 0], [1, 1]], [[0, 0], [1, 0], [2, 0], [0, 0]], [[0, 0, 2], [1, 0, 2], [1, 1, 2], [0, 0, 2]]]) {
      expect(() => computeGeometryInputHashG2({ ...g2Input, seating: { type: 'Polygon', coordinates: [ring] } })).toThrow();
    }
    expect(() => computeGeometryInputHashG2({ ...g2Input, casters: [g2Input.casters[0], g2Input.casters[0]] })).toThrow();
  });
  it('requires named numerical dependencies and valid caster eligibility enums', () => {
    expect(() => computeGeometryInputHashG2({ ...g2Input, manifest: { ...g2Input.manifest, numericalDependencies: { node: '22' } } })).toThrow();
    expect(() => computeGeometryInputHashG2({ ...g2Input, casters: [{ ...g2Input.casters[0], tier: 'invented' }] })).toThrow();
    expect(() => computeGeometryInputHashG2({ ...g2Input, casters: [{ ...g2Input.casters[0], filterDecision: 'maybe' }] })).toThrow();
  });
  it('bounds manifest maps before record parsing and canonicalization', () => {
    const tooLarge = Object.fromEntries(Array.from({ length: 129 }, (_, index) => [`k${index}`, index]));
    expect(() => computeGeometryInputHashG2({ ...g2Input, manifest: { ...g2Input.manifest, solarConstants: tooLarge } })).toThrow('128');
    const eightySix = Object.fromEntries(Array.from({ length: 86 }, (_, index) => [`k${index}`, index]));
    expect(() => computeGeometryInputHashG2({ ...g2Input, manifest: {
      ...g2Input.manifest, solarConstants: eightySix, shadowConstants: eightySix,
      numericalDependencies: { ...Object.fromEntries(Object.keys(eightySix).map(key => [key, '1'])), turf: '7.3.5', polyclip: '0.16.8', node: '22.23.2', 'robust-predicates': '2.0.4' },
    } })).toThrow('256');
  });
  it('rejects invalid topology and bounded-input overflows', () => {
    const bowTie = [[0, 0], [3, 3], [0, 3], [2, 0], [0, 0]];
    expect(() => computeGeometryInputHashG2({ ...g2Input, seating: { type: 'Polygon', coordinates: [bowTie] } })).toThrow('topology');
    for (const coordinates of [
      g2TopologyBoundaries.invalidHoleOutsideShell,
      g2TopologyBoundaries.invalidNestedHoles,
      g2TopologyBoundaries.invalidNestedHoleBoundaryVertex,
      g2TopologyBoundaries.invalidOverlappingHoles,
      g2TopologyBoundaries.invalidShellHoleMultiPointTouch,
      g2TopologyBoundaries.invalidThreeRingTouchCycle,
      g2TopologyBoundaries.invalidAdjacentBacktrack,
      g2TopologyBoundaries.invalidShellNotchHole,
    ]) {
      expect(() => computeGeometryInputHashG2({ ...g2Input, seating: { type: 'Polygon', coordinates } })).toThrow('topology');
    }
    for (const coordinates of [
      g2TopologyBoundaries.validShellHoleSinglePointTouch,
      g2TopologyBoundaries.validHoleHoleSinglePointTouch,
      g2TopologyBoundaries.validThreeHolesSamePointTouch,
    ]) {
      expect(() => computeGeometryInputHashG2({ ...g2Input, seating: { type: 'Polygon', coordinates } })).not.toThrow();
    }
    const rotatedNested = g2TopologyBoundaries.invalidNestedHoleBoundaryVertex.map((ring, index) =>
      index === 2 ? [ring[1], ring[0], ring[2], ring[1]] : ring,
    );
    expect(() => computeGeometryInputHashG2({ ...g2Input, seating: { type: 'Polygon', coordinates: rotatedNested } })).toThrow('topology');
    expect(() => computeGeometryInputHashG2({ ...g2Input, casters: Array.from({ length: 5001 }, (_, i) => ({ ...g2Input.casters[0], id: String(i) })) })).toThrow();
    expect(() => computeGeometryInputHashG2({ ...g2Input, seating: { type: 'Polygon', coordinates: [[...Array.from({ length: 2049 }, (_, i) => [i / 10000, 0]), [0, 0]]] } })).toThrow();
  });
  it('rejects strings PostgreSQL jsonb cannot represent, including arbitrary canonical JSON keys', () => {
    expect(() => computeGeometryInputHashG2({ ...g2Input, manifest: { ...g2Input.manifest, canonicalization: ['bad', String.fromCharCode(0), 'value'].join('') } })).toThrow();
    expect(() => computeGeometryInputHashG2({ ...g2Input, casters: [{ ...g2Input.casters[0], sourceFlags: [String.fromCharCode(0xd800)] }] })).toThrow();
    expect(() => geometryCanonicalJson({ [String.fromCharCode(0)]: 'valid' })).toThrow();
    expect(() => geometryCanonicalJson(String.fromCharCode(0xdc00))).toThrow();
    expect(computeGeometryInputHashG2({ ...g2Input, manifest: { ...g2Input.manifest, samplingVersion: '😀'.repeat(256) } })).toBeTruthy();
  });
});
