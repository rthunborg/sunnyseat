import { createHash } from 'node:crypto';
import { fromZonedTime } from 'date-fns-tz';
import { z } from 'zod';
import { geometryCanonicalJson } from './sun-geometry-hash-g2';

const finite = z.number().finite();
const values = z.array(finite).max(20000);
const rawSchema = z.strictObject({
  format: z.literal('f64-v1'), date: z.string(),
  horizon: z.tuple([finite, finite]).nullable(), offsets: values,
  exposure: z.array(finite.min(0).max(100)).max(20000),
  starts: values, ends: values, sunny: z.array(z.boolean()).max(20000),
  startUncertaintyMs: z.array(finite.min(0).max(100)).max(20000),
  endUncertaintyMs: z.array(finite.min(0).max(100)).max(20000),
});
export type GeometryDayPayload = z.infer<typeof rawSchema>;
export type GeometryDay = GeometryDayPayload & { checksum: string };
export interface GeometryDayValidationPolicy { readonly crossingBracketMs: number }
const MAX_DAY_VALUES = 20_000;
function preflightDay(input: unknown): void {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return;
  for (const key of ['offsets', 'exposure', 'starts', 'ends', 'sunny', 'startUncertaintyMs', 'endUncertaintyMs']) {
    const value = (input as Record<string, unknown>)[key];
    if (Array.isArray(value) && value.length > MAX_DAY_VALUES) throw new Error(`Day array exceeds ${MAX_DAY_VALUES} values`);
  }
}

/** Date-only arithmetic; local midnight length is never assumed to be 24h. */
export function stockholmDayBounds(date: string): { originMs: number; durationMs: number } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid Stockholm date');
  const utc = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(utc) || new Date(utc).toISOString().slice(0, 10) !== date) throw new Error('Invalid Stockholm date');
  const nextDate = new Date(utc + 86400000).toISOString().slice(0, 10);
  const originMs = fromZonedTime(`${date}T00:00:00`, 'Europe/Stockholm').getTime();
  const endMs = fromZonedTime(`${nextDate}T00:00:00`, 'Europe/Stockholm').getTime();
  return { originMs, durationMs: endMs - originMs };
}
export function seasonDates(year: number): string[] {
  if (!Number.isInteger(year) || year < 2000 || year > 9998) throw new Error('Invalid season year');
  const start = Date.parse(`${year}-03-01T00:00:00Z`);
  return Array.from({ length: 245 }, (_, i) => new Date(start + i * 86400000).toISOString().slice(0, 10));
}
export function geometryDigest(value: unknown): string {
  return createHash('sha256').update(geometryCanonicalJson(value), 'utf8').digest('hex');
}
function validatePayload(input: unknown, policy: GeometryDayValidationPolicy): GeometryDayPayload {
  preflightDay(input);
  const d = rawSchema.parse(input);
  if (!Number.isFinite(policy.crossingBracketMs) || policy.crossingBracketMs <= 0 || policy.crossingBracketMs > 100) {
    throw new Error('Invalid crossing-bracket policy');
  }
  const { originMs, durationMs } = stockholmDayBounds(d.date);
  if (!seasonDates(Number(d.date.slice(0, 4))).includes(d.date)) throw new Error('Outside supported season');
  const n = d.offsets.length, m = d.starts.length;
  if (n !== d.exposure.length || [d.ends, d.sunny, d.startUncertaintyMs, d.endUncertaintyMs].some(a => a.length !== m)) throw new Error('Array count mismatch');
  if (d.horizon === null) {
    if (n !== 0 || m !== 0) throw new Error('Supported negative must have empty arrays');
    return d;
  }
  const [rise, set] = d.horizon;
  if (rise < 0 || set <= rise || set > durationMs || n < 2 || m < 1) throw new Error('Invalid supported horizon');
  if (d.offsets[0] !== rise || d.offsets.at(-1) !== set || d.starts[0] !== rise || d.ends.at(-1) !== set) throw new Error('Incomplete endpoint coverage');
  d.offsets.forEach((v, i) => {
    if (v < rise || v > set || (i > 0 && v <= d.offsets[i - 1])) throw new Error('Invalid adaptive offset');
  });
  // Check the detector's required observations, not just matching array lengths.
  // UTC alignment is independent of local DST and fractional horizon endpoints.
  const samples = new Map(d.offsets.map((offset, i) => [offset, d.exposure[i]]));
  const grid = (start: number, end: number, step: number): number[] => {
    const result = [start];
    for (let utc = Math.floor((originMs + start) / step) * step + step; utc < originMs + end; utc += step) result.push(utc - originMs);
    result.push(end);
    return result;
  };
  const base = grid(rise, set, 300000);
  if (base.some(offset => !samples.has(offset))) throw new Error('Missing required base sample');
  for (let i = 1; i < base.length; i++) {
    const a = base[i - 1], b = base[i], av = samples.get(a)!, bv = samples.get(b)!;
    if (Math.min(Math.abs(av - 50), Math.abs(bv - 50)) <= 5 || (av > 50) !== (bv > 50)) {
      if (grid(a, b, 60000).some(offset => !samples.has(offset))) throw new Error('Missing required interior probe');
    }
  }
  if ((d.exposure[0] > 50) !== d.sunny[0] || (d.exposure[n - 1] > 50) !== d.sunny[m - 1]) throw new Error('Horizon endpoint contradicts raw interval');
  d.starts.forEach((start, i) => {
    const end = d.ends[i];
    if (start < rise || end > set || start >= end || (i > 0 && (start !== d.ends[i - 1] || d.sunny[i] === d.sunny[i - 1]))) throw new Error('Invalid raw interval partition');
    if (i > 0 && d.startUncertaintyMs[i] !== d.endUncertaintyMs[i - 1]) throw new Error('Boundary uncertainty mismatch');
    const uncertainty = d.startUncertaintyMs[i] + d.endUncertaintyMs[i];
    if (d.sunny[i] && end - start - uncertainty < 300000 && end - start + uncertainty >= 300000) throw new Error('Unresolved window-duration uncertainty');
  });
  // A boundary is not evidence of its own crossing. Require retained opposite
  // classifications strictly on both sides, within the declared uncertainty
  // and the accepted <=100ms bracket. This also covers boundaries on grid points.
  let crossingSample = 0;
  for (let i = 1; i < m; i++) {
    const edge = d.starts[i], uncertainty = d.startUncertaintyMs[i];
    while (crossingSample < n && d.offsets[crossingSample] < edge) crossingSample++;
    const left = crossingSample - 1;
    const right = d.offsets[crossingSample] === edge ? crossingSample + 1 : crossingSample;
    if (left < 0 || right >= n
      || edge - d.offsets[left] > uncertainty || d.offsets[right] - edge > uncertainty
      || d.offsets[right] - d.offsets[left] > policy.crossingBracketMs
      || (d.exposure[left] > 50) !== d.sunny[i - 1] || (d.exposure[right] > 50) !== d.sunny[i]) {
      throw new Error('Missing or inconsistent crossing bracket');
    }
  }
  let interval = 0;
  d.offsets.forEach((offset, i) => {
    while (interval < m - 1 && offset > d.ends[interval]) interval++;
    if (offset > d.starts[interval] + d.startUncertaintyMs[interval]
      && offset < d.ends[interval] - d.endUncertaintyMs[interval]
      && (d.exposure[i] > 50) !== d.sunny[interval]) {
      throw new Error('Raw interval contradicts adaptive sample');
    }
  });
  return d;
}

/** Database arrays use Float64 milliseconds relative to Stockholm local midnight.
 * Fractional offsets never pass through Date/timestamp integer conversion. */
export function encodeGeometryDay(input: unknown, policy: GeometryDayValidationPolicy): GeometryDay {
  const d = validatePayload(input, policy);
  // Big-endian IEEE754 bytes give PostgreSQL float8send and Node one exact
  // digest contract, independent of JSON number/exponent spellings.
  const hex = (xs: number[]) => xs.map(n => { const b = Buffer.alloc(8); b.writeDoubleBE(n === 0 ? 0 : n); return b.toString('hex'); }).join('');
  const material = ['f64-v1', d.date, d.horizon === null ? '-' : hex(d.horizon), hex(d.offsets), hex(d.exposure), hex(d.starts), hex(d.ends), d.sunny.map(v => v ? '1' : '0').join(''), hex(d.startUncertaintyMs), hex(d.endUncertaintyMs)].join('|');
  return { ...d, checksum: createHash('sha256').update(material, 'utf8').digest('hex') };
}
export function decodeGeometryDay(input: unknown, policy: GeometryDayValidationPolicy): GeometryDay {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Missing day');
  const { checksum, ...payload } = input as Record<string, unknown>;
  const d = encodeGeometryDay(payload, policy);
  if (checksum !== d.checksum) throw new Error('Day checksum mismatch');
  return d;
}
export function qualifyingGeometryWindows(input: GeometryDay, policy: GeometryDayValidationPolicy): [number, number][] {
  const d = decodeGeometryDay(input, policy);
  return d.starts.flatMap((start, i) => {
    const conservativeStart = start + d.startUncertaintyMs[i];
    const conservativeEnd = d.ends[i] - d.endUncertaintyMs[i];
    return d.sunny[i] && conservativeEnd - conservativeStart >= 300000 ? [[conservativeStart, conservativeEnd] as [number, number]] : [];
  });
}
export function validateSeasonCoverage(year: number, input: readonly GeometryDay[], policy: GeometryDayValidationPolicy): GeometryDay[] {
  const expected = seasonDates(year);
  if (!Array.isArray(input) || input.length !== expected.length) throw new Error('Incomplete exact season date set');
  const days = input.map(day => decodeGeometryDay(day, policy)).sort((a, b) => a.date.localeCompare(b.date));
  if (days.length !== expected.length || days.some((d, i) => d.date !== expected[i])) throw new Error('Incomplete exact season date set');
  return days;
}
export function generationChecksum(inputHash: string, year: number, input: readonly GeometryDay[], policy: GeometryDayValidationPolicy): string {
  if (!/^g2:[0-9a-f]{64}$/.test(inputHash)) throw new Error('Invalid g2 identity');
  const material = `${inputHash}|${year}|Europe/Stockholm|f64-v1|${validateSeasonCoverage(year, input, policy).map(d => `${d.date}:${d.checksum}`).join('\n')}`;
  return createHash('sha256').update(material, 'utf8').digest('hex');
}
