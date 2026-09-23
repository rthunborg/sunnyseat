import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { computeGeometryInputHashG2, geometryInputG2Schema } from '@/lib/services/sun-geometry-hash-g2';
import { g2Input } from '../../fixtures/epic-15/g2-input';

function arrayWithPoisonedFirstEntry(length: number): unknown[] {
  const value = new Array<unknown>(length);
  Object.defineProperty(value, 0, {
    enumerable: true,
    get() {
      throw new Error('coordinate entry must not be read before admission');
    },
  });
  return value;
}

describe('g2 geometry admission', () => {
  it.each([0, 1, 2, 3])('rejects a %i-entry ring without reading coordinates or later rings/casters', (length) => {
    const shortRing = length === 0 ? [] : arrayWithPoisonedFirstEntry(length);
    const rings = [shortRing];
    Object.defineProperty(rings, 1, { get() { throw Error('later ring read'); } });
    const input = {
      ...g2Input,
      casters: [{ ...g2Input.casters[0], geometry: { type: 'Polygon', coordinates: rings } }],
    };
    Object.defineProperty(input.casters, 1, { get() { throw Error('later caster read'); } });
    const result = geometryInputG2Schema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0].message).toBe('Ring must contain at least 4 coordinates');
    }
  });

  it.each([null, {}, 'ring'])('rejects malformed ring shape %j before enumerating later rings', (ring) => {
    const rings = [ring];
    Object.defineProperty(rings, 1, { get() { throw Error('later ring read'); } });
    const result = geometryInputG2Schema.safeParse({ ...g2Input, seating: { type: 'Polygon', coordinates: rings } });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0].message).toBe('Ring must contain at least 4 coordinates');
    }
  });

  it.each([[], null, {}])('rejects empty/malformed ring collection %j before parsing casters', (coordinates) => {
    const result = geometryInputG2Schema.safeParse({
      ...g2Input, seating: { type: 'Polygon', coordinates }, casters: arrayWithPoisonedFirstEntry(5_000),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0].message).toBe('Polygon must contain at least one ring');
    }
  });

  it('returns one issue in both parse modes for 640,000 empty rings across 5,000 casters', () => {
    const coordinates = Array.from({ length: 128 }, () => []);
    const input = { ...g2Input, casters: Array.from({ length: 5_000 }, (_, index) => ({
      ...g2Input.casters[0], id: String(index), geometry: { type: 'Polygon', coordinates },
    })) };
    const result = geometryInputG2Schema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues).toHaveLength(1);
    expect.assertions(4);
    try {
      geometryInputG2Schema.parse(input);
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError);
      expect((error as ZodError).issues).toHaveLength(1);
    }
  });

  it('preserves the accepted fixture canonical identity', () => {
    expect(computeGeometryInputHashG2(g2Input)).toBe(
      'g2:6354c3ed89c4d41f062a2d5c92540a121a5302ee0a465e5667a064e3fd5e762e',
    );
  });

  it('rejects a per-ring overflow before parsing coordinate entries or topology', () => {
    const oversizedRing = arrayWithPoisonedFirstEntry(2_049);
    expect(() => computeGeometryInputHashG2({
      ...g2Input,
      seating: { type: 'Polygon', coordinates: [oversizedRing] },
    })).toThrow('Ring exceeds 2048 coordinates');
  });

  it('rejects a ring-count overflow before reading a ring', () => {
    const rings = arrayWithPoisonedFirstEntry(129);
    expect(() => computeGeometryInputHashG2({
      ...g2Input,
      seating: { type: 'Polygon', coordinates: rings },
    })).toThrow('Polygon exceeds 128 rings');
  });

  it('rejects a caster-count overflow before reading a caster', () => {
    expect(() => computeGeometryInputHashG2({
      ...g2Input,
      casters: arrayWithPoisonedFirstEntry(5_001),
    })).toThrow('Geometry exceeds 5000 casters');
  });

  it('rejects oversized caster source flags before reading their entries', () => {
    const sourceFlags = Array.from({ length: 129 }, (_, index) => `flag-${index}`);
    Object.defineProperty(sourceFlags, 128, { get: () => { throw Error('source flag parsed'); } });
    const input = { ...g2Input, casters: [{ ...g2Input.casters[0], sourceFlags }] };
    expect(() => geometryInputG2Schema.parse(input)).toThrow('128');
    const result = geometryInputG2Schema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues).toHaveLength(1);
  });

  it('rejects aggregate coordinate overflow without reading any coordinate entry', () => {
    const rings = Array.from({ length: 123 }, () => arrayWithPoisonedFirstEntry(2_048));
    expect(() => computeGeometryInputHashG2({
      ...g2Input,
      seating: { type: 'Polygon', coordinates: rings },
    })).toThrow('Geometry exceeds 250000 coordinates');
  });

  it('does not call topology with malformed rings that failed structural validation', () => {
    expect(() => computeGeometryInputHashG2({
      ...g2Input,
      seating: { type: 'Polygon', coordinates: [[]] },
    })).toThrow();
  });
});
