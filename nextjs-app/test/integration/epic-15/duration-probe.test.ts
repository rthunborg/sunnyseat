import { expect, it, vi } from 'vitest';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { capturedFixtures, type Capture } from '@/scripts/benchmarks/epic-15/capture-inputs';
import { daylight, localDay } from '@/scripts/benchmarks/epic-15/measurement';
import { thresholdScan } from '@/scripts/benchmarks/epic-15/threshold-sampling';
import { pruneShadowCasters } from '@/scripts/benchmarks/epic-15/shadow-broadphase';
import { calculateSolarPosition } from '@/lib/solar/solar-calculation-service';
import { calculateVenueShadowFromBuildings } from '@/lib/solar/shadow-calculation-service';
import { encodeGeometryDay as encodeDay } from '@/lib/services/sun-geometry-season-codec';
import { createHash } from 'node:crypto';
import { refineStorageDuration } from '../../fixtures/epic-15/refine-storage-duration';
import { correctG2SubsecondPosition } from '@/lib/solar/g2-solar-position';

const guard = vi.hoisted(() => ({ lat: 0, lng: 0, g2: false }));
const encodeGeometryDay = (input: unknown) => encodeDay(input, { crossingBracketMs: 100 });
vi.mock('@/lib/supabase/server', () => ({ supabaseServiceRole: new Proxy({}, { get() { throw Error('Provider forbidden'); } }) }));
vi.mock('@/lib/solar/solar-calculation-service', async original => {
  const actual = await original<typeof import('@/lib/solar/solar-calculation-service')>();
  return { ...actual, calculateSolarPosition: (d: Date, lat = guard.lat, lng = guard.lng) => {
    const position = actual.calculateSolarPosition(d, lat, lng);
    return guard.g2 ? correctG2SubsecondPosition(position) : position;
  } };
});

it('computes the same captured date with consistent subsecond g2 time and accepted duration rules', () => {
  const output = process.env.E15_DB_OUTPUT;
  if (!output || !path.isAbsolute(output)) throw Error('Explicit evidence output required');
  const capture = JSON.parse(readFileSync('../_bmad-output/test-artifacts/measurements/epic-15/story-15-1/capture-01/inputs.json', 'utf8')) as Capture;
  const fixture = capturedFixtures(capture).find(f => f.id === '19')!;
  Object.assign(guard, fixture.coordinate, { g2: true });
  try {
    const date = '2026-09-09', horizon = daylight(date, fixture.coordinate.lat, fixture.coordinate.lng, 5);
    const evaluate = (t: number) => {
      const instant = new Date(t);
      return calculateVenueShadowFromBuildings(fixture.seating, instant, pruneShadowCasters(fixture.seating, fixture.casters, calculateSolarPosition(instant), fixture).retained, fixture).sunlitAreaPercent;
    };
    const initial = thresholdScan(evaluate, horizon.start, horizon.end, 5);
    const refined = refineStorageDuration(initial, evaluate);
    const origin = localDay(date)[0];
    const day = encodeGeometryDay({ format: 'f64-v1', date, horizon: [horizon.start-origin,horizon.end-origin], offsets: refined.points.map(p=>p.t-origin), exposure: refined.points.map(p=>p.value), starts: refined.intervals.map(i=>i.start-origin), ends: refined.intervals.map(i=>i.end-origin), sunny: refined.intervals.map(i=>i.sunny), startUncertaintyMs: refined.startUncertaintyMs, endUncertaintyMs: refined.endUncertaintyMs });
    for (const p of initial.points) expect(refined.points).toContainEqual(p);
    mkdirSync(output, { recursive: true });
    writeFileSync(path.join(output, 'g2-duration-probe.json'), JSON.stringify({ status: 'PASS', fixture: '19', date, initial, refined, day, correction: 'Millisecond UTC-minute term added to hour angle in isolated g2 adapter; g1 unchanged.' }, null, 2));
  } finally { guard.g2 = false; }
});
it('records the captured unresolved 300-second duration as a blocked storage case', () => {
  const output = process.env.E15_DB_OUTPUT;
  if (!output || !path.isAbsolute(output)) throw Error('Explicit evidence output required');
  const capture = JSON.parse(readFileSync('../_bmad-output/test-artifacts/measurements/epic-15/story-15-1/capture-01/inputs.json', 'utf8')) as Capture;
  const fixture = capturedFixtures(capture).find(f => f.id === '19')!;
  Object.assign(guard, fixture.coordinate);
  const date = '2026-09-09', horizon = daylight(date, fixture.coordinate.lat, fixture.coordinate.lng, 5);
  const evaluate = (t: number) => {
    const instant = new Date(t);
    return calculateVenueShadowFromBuildings(fixture.seating, instant, pruneShadowCasters(fixture.seating, fixture.casters, calculateSolarPosition(instant), fixture).retained, fixture).sunlitAreaPercent;
  };
  const initial = thresholdScan(evaluate, horizon.start, horizon.end, 5);
  const origin = localDay(date)[0];
  const payload = { format: 'f64-v1', date, horizon: [horizon.start - origin, horizon.end - origin], offsets: initial.points.map(p => p.t - origin), exposure: initial.points.map(p => p.value), starts: initial.intervals.map(i => i.start - origin), ends: initial.intervals.map(i => i.end - origin), sunny: initial.intervals.map(i => i.sunny), startUncertaintyMs: initial.intervals.map((_, i) => i === 0 ? 0 : 50), endUncertaintyMs: initial.intervals.map((_, i) => i === initial.intervals.length - 1 ? 0 : 50) };
  expect(() => encodeGeometryDay(payload)).toThrow('Unresolved window-duration uncertainty');
  let failure: unknown;
  try { refineStorageDuration(initial, evaluate); } catch (error) { failure = error; }
  expect(failure).toBeInstanceOf(Error);
  expect((failure as Error).message).toBe('Unresolved duration at integer-ms engine resolution');
  const details = (failure as Error & { details: { interval: { start: number; end: number }; startUncertaintyMs: number; endUncertaintyMs: number; extraSamples: number; points: { t: number; value: number }[] } }).details;
  for (const p of initial.points) expect(details.points).toContainEqual(p);
  mkdirSync(output, { recursive: true });
  const sources = ['lib/solar/solar-math.ts', 'scripts/benchmarks/epic-15/threshold-sampling.ts', 'test/fixtures/epic-15/refine-storage-duration.ts', 'test/integration/epic-15/duration-probe.test.ts'];
  writeFileSync(path.join(output, 'duration-probe.json'), JSON.stringify({ status: 'BLOCKED_UNRESOLVED_DURATION', regressionResult: 'PASS_EXPECTED_REJECTION', fixture: '19', date, initial, payload, refinementFailure: { message: (failure as Error).message, ...details }, sources: Object.fromEntries(sources.map(p => [p, createHash('sha256').update(readFileSync(p)).digest('hex')])), limitation: 'Original full storage run remains failed. This regression proves rejection, not accepted coverage or storage budgets. Diagnostic refinement is test-only; no engine or accepted rule changed.' }, null, 2));
});
