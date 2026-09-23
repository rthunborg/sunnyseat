import { describe, expect, it } from 'vitest';
import { encodeGeometryDay as encodeDay, decodeGeometryDay as decodeDay, seasonDates, stockholmDayBounds, qualifyingGeometryWindows as geometryWindows, generationChecksum as checksumGeneration, validateSeasonCoverage as validateCoverage, type GeometryDayValidationPolicy } from '@/lib/services/sun-geometry-season-codec';
import { crossingDay, unsupportedWindowDay } from '../../fixtures/epic-15/crossing-day';

const day = (duration = 300000) => ({
  format: 'f64-v1', date: '2026-03-29', horizon: [10000.5, 10000.5 + duration],
  offsets: [10000.5, 11000.5, 300000, 10000.5 + duration], exposure: [60.125, 75.0625, 70, 61.5],
  starts: [10000.5], ends: [10000.5 + duration], sunny: [true],
  startUncertaintyMs: [0], endUncertaintyMs: [0],
});
const policy: GeometryDayValidationPolicy = { crossingBracketMs: 100 };
const encodeGeometryDay = (input: unknown, selected: GeometryDayValidationPolicy = policy) => encodeDay(input, selected);
const decodeGeometryDay = (input: unknown, selected: GeometryDayValidationPolicy = policy) => decodeDay(input, selected);
const qualifyingGeometryWindows = (input: Parameters<typeof geometryWindows>[0], selected: GeometryDayValidationPolicy = policy) => geometryWindows(input, selected);
const validateSeasonCoverage = (year: number, input: Parameters<typeof validateCoverage>[1], selected: GeometryDayValidationPolicy = policy) => validateCoverage(year, input, selected);
const generationChecksum = (hash: string, year: number, input: Parameters<typeof checksumGeneration>[2], selected: GeometryDayValidationPolicy = policy) => checksumGeneration(hash, year, input, selected);
describe('I02 full Float64 day representation', () => {
  it('preflights oversized arrays and season collections before child decoding', () => {
    const poisoned = Array.from({ length: 20_001 }, () => 0);
    Object.defineProperty(poisoned, 20_000, { get: () => { throw Error('child parsed'); } });
    expect(() => encodeGeometryDay({ ...day(), offsets: poisoned })).toThrow('20000');
    expect(() => validateSeasonCoverage(2026, Array.from({ length: 246 }, () => null) as never)).toThrow('exact season');
  });
  it('rejects unsupported sunny windows and shade gaps on sample boundaries', () => {
    const d = unsupportedWindowDay();
    expect(() => encodeGeometryDay(d)).toThrow('crossing bracket');
    expect(() => decodeGeometryDay({ ...d, checksum: '6b2dd1e8f85cdb4b358109f63a0bba27f6d4f61386b1f56afb377fe2bb065a8e' })).toThrow('crossing bracket');
    expect(() => encodeGeometryDay({ ...d, exposure: d.exposure.map(() => 100), sunny: d.sunny.map(v => !v) })).toThrow('crossing bracket');
  });
  it.each(['2026-03-29', '2026-10-25'])('retains supported 100ms crossing brackets on %s', date => {
    const d = encodeGeometryDay({ ...crossingDay(), date });
    expect(decodeGeometryDay(d)).toEqual(d);
    expect(qualifyingGeometryWindows(d)).toEqual([[300100.5, 600200.5]]);
  });
  it('enforces the crossing bracket declared by the bound engine policy', () => {
    expect(() => encodeGeometryDay(crossingDay(), { crossingBracketMs: 10 })).toThrow('crossing bracket');
    expect(() => encodeGeometryDay(crossingDay(), { crossingBracketMs: 100 })).not.toThrow();
    expect(() => encodeGeometryDay(crossingDay(), { crossingBracketMs: 101 })).toThrow('policy');
  });
  it('rejects missing, reversed, too-wide or understated crossing evidence', () => {
    const d = crossingDay();
    const withoutRight = d.offsets.filter(t => t !== 300100.5);
    expect(() => encodeGeometryDay({ ...d, offsets: withoutRight, exposure: d.exposure.filter((_, i) => d.offsets[i] !== 300100.5) })).toThrow('crossing bracket');
    expect(() => encodeGeometryDay({ ...d, exposure: d.exposure.map((v, i) => d.offsets[i] === 300100.5 ? 0 : v) })).toThrow('crossing bracket');
    expect(() => encodeGeometryDay({ ...d, startUncertaintyMs: [0, 49, 50], endUncertaintyMs: [49, 50, 0] })).toThrow('crossing bracket');
    expect(() => encodeGeometryDay({ ...d, offsets: d.offsets.map(t => t === 300100.5 ? 300101.5 : t), startUncertaintyMs: [0, 51, 50], endUncertaintyMs: [51, 50, 0] })).toThrow('crossing bracket');
  });
  it('allows an exact-edge observation only alongside both crossing witnesses', () => {
    const d = crossingDay();
    const points = d.offsets.map((t, i) => ({ t, v: d.exposure[i] }));
    points.push({ t: 300050.5, v: 50 });
    points.sort((a, b) => a.t - b.t);
    const withEdge = { ...d, offsets: points.map(p => p.t), exposure: points.map(p => p.v) };
    expect(() => encodeGeometryDay(withEdge)).not.toThrow();
    const missingLeft = points.filter(p => p.t !== 300000.5);
    expect(() => encodeGeometryDay({ ...withEdge, offsets: missingLeft.map(p => p.t), exposure: missingLeft.map(p => p.v) })).toThrow('crossing bracket');
  });
  it('preserves half-millisecond uncertainty after tighter crossing refinement', () => {
    const d = crossingDay();
    const moved = new Map([[300000.5, 300050], [300100.5, 300051], [600200.5, 600250], [600300.5, 600251]]);
    const refined = { ...d, offsets: d.offsets.map(t => moved.get(t) ?? t), startUncertaintyMs: [0, 0.5, 0.5], endUncertaintyMs: [0.5, 0.5, 0] };
    expect(decodeGeometryDay(encodeGeometryDay(refined))).toMatchObject(refined);
  });
  it('retains every sample and half-ms boundary across JSON transport', () => {
    const encoded = encodeGeometryDay(day());
    expect(decodeGeometryDay(JSON.parse(JSON.stringify(encoded)))).toEqual(encoded);
    expect(encoded.offsets).toEqual(day().offsets);
  });
  it.each([299000, 300000, 301000])('separates raw %s ms runs from window qualification', duration => {
    const encoded = encodeGeometryDay(day(duration));
    expect(encoded.sunny).toEqual([true]);
    expect(qualifyingGeometryWindows(encoded)).toHaveLength(duration < 300000 ? 0 : 1);
  });
  it('rejects unresolved threshold-duration uncertainty', () => {
    expect(() => encodeGeometryDay({ ...day(), endUncertaintyMs: [0.5] })).toThrow();
    expect(() => encodeGeometryDay({ ...day(301000), endUncertaintyMs: [0.5] })).not.toThrow();
  });
  it('preserves detected shade gaps between qualifying runs', () => {
    const d = encodeGeometryDay({ ...day(601200), offsets: [10000.5, 300000, 310050.5, 310150.5, 310500.5, 311050.5, 311150.5, 600000, 611200.5], exposure: [80, 80, 80, 0, 0, 0, 80, 80, 80], starts: [10000.5, 310100.5, 311100.5], ends: [310100.5, 311100.5, 611200.5], sunny: [true, false, true], startUncertaintyMs: [0, 50, 50], endUncertaintyMs: [50, 50, 0] });
    expect(qualifyingGeometryWindows(d)).toEqual([[10000.5, 310050.5], [311150.5, 611200.5]]);
  });
  it('distinguishes deterministic supported negative from missing/failed', () => {
    const negative = { ...day(), horizon: null, offsets: [], exposure: [], starts: [], ends: [], sunny: [], startUncertaintyMs: [], endUncertaintyMs: [] };
    expect(decodeGeometryDay(encodeGeometryDay(negative)).horizon).toBeNull();
    expect(() => encodeGeometryDay({ ...negative, status: 'exhausted' })).toThrow();
    expect(() => encodeGeometryDay(null)).toThrow();
  });
  it('rejects corrupt or incompatible transport', () => {
    const encoded = encodeGeometryDay(day());
    expect(() => decodeGeometryDay({ ...encoded, checksum: '0'.repeat(64) })).toThrow();
    expect(() => decodeGeometryDay({ ...encoded, format: 'f64-v2' })).toThrow();
    for (const mutation of [
      { offsets: [10000.5, 10000.5, 310000.5] }, { offsets: [10000.5, 9999, 310000.5] },
      { offsets: [[10000.5, 11000.5, 310000.5]] }, { exposure: [NaN, 50, 60] },
      { exposure: [101, 50, 60] }, { exposure: [50] }, { horizon: [0, Infinity] },
      { horizon: [310000.5, 10000.5] }, { horizon: [10000.5, 90000000] },
      { starts: [] }, { ends: [300000] }, { sunny: [null] }, { date: '2026-02-30' },
    ]) expect(() => encodeGeometryDay({ ...day(), ...mutation })).toThrow();
  });
  it('rejects raw intervals contradicting samples outside boundary uncertainty', () => {
    expect(() => encodeGeometryDay({ ...day(), sunny: [false] })).toThrow('contradicts');
  });
  it('rejects the two-zero-sample twelve-hour sunny-window regression', () => {
    expect(() => encodeGeometryDay({ ...day(), horizon: [21600000, 64800000], offsets: [21600000, 64800000], exposure: [0, 0], starts: [21600000], ends: [64800000] })).toThrow('Missing required base sample');
  });
  it.each(['2026-03-29', '2026-10-25'])('rejects a missing base sample on DST date %s', date => {
    const complete = { ...day(), date };
    expect(() => encodeGeometryDay(complete)).not.toThrow();
    expect(() => encodeGeometryDay({ ...complete, offsets: [10000.5, 11000.5, 310000.5], exposure: [60.125, 75.0625, 61.5] })).toThrow('Missing required base sample');
  });
  it.each([45, 50, 55])('requires all minute probes at inclusive proximity boundary %s', value => {
    const offsets = [10000.5, 60000, 120000, 180000, 240000, 300000, 310000.5];
    const complete = { ...day(), offsets, exposure: offsets.map(() => value), sunny: [value > 50] };
    expect(() => encodeGeometryDay(complete)).not.toThrow();
    expect(() => encodeGeometryDay({ ...complete, offsets: offsets.filter(t => t !== 120000), exposure: complete.exposure.slice(1) })).toThrow('Missing required interior probe');
  });
  it('requires probes for a classification change even outside the proximity band', () => {
    expect(() => encodeGeometryDay({ ...day(), exposure: [0, 0, 100, 100] })).toThrow('Missing required interior probe');
  });
  it('checks horizon classifications even when no interior grid point is needed', () => {
    const short = { ...day(), horizon: [10000.5, 11000.5], offsets: [10000.5, 11000.5], exposure: [0, 0], starts: [10000.5], ends: [11000.5], sunny: [false] };
    expect(() => encodeGeometryDay(short)).not.toThrow();
    expect(() => encodeGeometryDay({ ...short, sunny: [true] })).toThrow('Horizon endpoint contradicts');
    expect(() => encodeGeometryDay({ ...short, exposure: [0, 100] })).toThrow('Horizon endpoint contradicts');
  });
  it('uses actual Stockholm date boundaries including 23/25-hour DST', () => {
    expect(stockholmDayBounds('2026-03-29').durationMs).toBe(23 * 3600000);
    expect(stockholmDayBounds('2026-10-25').durationMs).toBe(25 * 3600000);
    expect(seasonDates(2026)).toHaveLength(245);
    expect(seasonDates(2025)[0]).toBe('2025-03-01');
    expect(seasonDates(2027).at(-1)).toBe('2027-10-31');
    for (const date of ['2026-02-28', '2026-11-01']) expect(() => encodeGeometryDay({ ...day(), date })).toThrow();
  });
  it('rejects count-only coverage and binds all dates/checksums', () => {
    const days = seasonDates(2026).map(date => encodeGeometryDay({ ...day(), date }));
    expect(() => validateSeasonCoverage(2026, days)).not.toThrow();
    const checksum = generationChecksum('g2:' + 'a'.repeat(64), 2026, days);
    expect(generationChecksum('g2:' + 'a'.repeat(64), 2026, days.toReversed())).toBe(checksum);
    expect(() => validateSeasonCoverage(2026, [...days.slice(1), days[1]])).toThrow();
    expect(() => validateSeasonCoverage(2026, [...days.slice(1), encodeGeometryDay({ ...day(), date: '2025-03-01' })])).toThrow();
    expect(() => validateSeasonCoverage(2026, days.slice(1))).toThrow();
  });
});
