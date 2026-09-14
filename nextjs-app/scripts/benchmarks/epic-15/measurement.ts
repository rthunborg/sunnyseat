/** Experimental measurement helpers. Never imported by application runtime. */
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { calculateSolarPosition } from '../../../lib/solar/solar-calculation-service';

export type Point = { t: number; value: number };
export type Interval = { start: number; end: number; sunny: boolean };
export const TZ = 'Europe/Stockholm';
export const requiredDates = ['2026-03-01', '2026-03-29', '2026-06-21', '2026-09-22', '2026-10-25', '2026-10-31', '2026-12-21'];
export function nextDate(date: string) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + 86400000).toISOString().slice(0, 10);
}
export function localDay(date: string): [number, number] {
  return [fromZonedTime(`${date}T00:00:00`, TZ).getTime(), fromZonedTime(`${nextDate(date)}T00:00:00`, TZ).getTime()];
}
export function seasonDates(year: number) {
  const dates: string[] = [];
  for (let d = `${year}-03-01`; d <= `${year}-10-31`; d = nextDate(d)) dates.push(d);
  return dates;
}
export function planSeason(requestUtc:string,seasonYear:number) {
  if(!Number.isFinite(Date.parse(requestUtc))||!Number.isInteger(seasonYear)||seasonYear<2000||seasonYear>2100)throw Error('Invalid explicit season request');
  return {requestUtc,requestLocalDate:localKey(Date.parse(requestUtc)).slice(0,10),seasonYear,dates:seasonDates(seasonYear)};
}
export function localKey(t: number) { return formatInTimeZone(t, TZ, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"); }
export function sampleTimes(start: number, end: number, step: number): number[] {
  if (!Number.isFinite(start + end + step) || end < start || step <= 0) throw Error('Invalid grid');
  const times = [start];
  for (let t = Math.ceil(start / step) * step; t < end; t += step) if (t > start) times.push(t);
  if (end > start) times.push(end);
  return times;
}
export function daylight(date: string, lat: number, lng: number, horizon: number) {
  const [start, end] = localDay(date);
  const elevation = (t: number) => calculateSolarPosition(new Date(t), lat, lng).elevation;
  const roots: { low: number; high: number; t: number; rising: boolean; residual: number }[] = [];
  let previous = start;
  for (let t = start + 600000; t <= end; t += 600000) {
    if ((elevation(previous) >= horizon) !== (elevation(t) >= horizon)) {
      let low = previous, high = t;
      const rising = elevation(t) >= horizon;
      while (high - low > 1) {
        const mid = Math.floor((low + high) / 2);
        if ((elevation(mid) >= horizon) === rising) high = mid; else low = mid;
      }
      // Boundary representative is on the supported side, with the full bracket retained.
      const root = rising ? high : low;
      roots.push({ low, high, t: root, rising, residual: elevation(root) - horizon });
    }
    previous = t;
  }
  if (roots.length !== 2) throw Error(`Expected two horizon crossings: ${date}/${lat}/${horizon}`);
  return { date, lat, lng, horizon, start: roots[0].t, end: roots[1].t, roots,
    dayHours: (end - start) / 3600000, supported: date.slice(5) >= '03-01' && date.slice(5) <= '10-31' };
}

export type Policy = 'endpoints' | 'midpoint' | 'minute';
type Limits = { maxSamples: number; maxDepth: number; maxMs: number; rootIterations: number };
export function samplePolicy(f: (t: number) => number, start: number, end: number, policy: Policy, overrides: Partial<Limits> = {}) {
  const limits: Limits = { maxSamples: 20000, maxDepth: 20, maxMs: 120000, rootIterations: 30, ...overrides };
  const begin = performance.now();
  const values = new Map<number, number>();
  const failures: string[] = [];
  const fail = (reason: string) => { if (!failures.includes(reason)) failures.push(reason); };
  const at = (t: number): number | undefined => {
    if (values.has(t)) return values.get(t);
    if (values.size >= limits.maxSamples) { fail('sample-limit'); return; }
    if (performance.now() - begin >= limits.maxMs) { fail('time-limit'); return; }
    const value = f(t);
    if (!Number.isFinite(value) || value < 0 || value > 100) { fail('invalid-engine-value'); return; }
    values.set(t, value); return value;
  };
  const refine = (a: number, b: number, depth: number) => {
    const av = at(a), bv = at(b);
    if (av === undefined || bv === undefined) return;
    const crossing = (av > 50) !== (bv > 50);
    if (!crossing && Math.abs(av - bv) < 10) return;
    if (b - a <= (crossing ? 1000 : 120000)) return;
    if (depth >= limits.maxDepth) { fail('depth-limit'); return; }
    if (depth >= limits.rootIterations) { fail('solver-nonconvergence'); return; }
    const mid = Math.floor((a + b) / 2);
    if (at(mid) === undefined) return;
    refine(a, mid, depth + 1); refine(mid, b, depth + 1);
  };
  const base = sampleTimes(start, end, 900000);
  let probes = [...base];
  if (policy === 'minute') probes = [...new Set([...probes, ...sampleTimes(start, end, 60000)])].sort((a,b) => a-b);
  if (policy === 'midpoint') probes = [...new Set([...probes, ...base.slice(1).map((b,i) => Math.floor((base[i]+b)/2))])].sort((a,b) => a-b);
  for (const t of probes) at(t);
  for (let i = 1; i < probes.length; i++) refine(probes[i-1], probes[i], 0);
  const completedBaseSamples=base.filter(t=>values.has(t)).length;
  return { policy, points: [...values].sort((a,b) => a[0]-b[0]).map(([t,value]) => ({t,value})),
    baseSamples: base.length, completedBaseSamples, baseGridComplete:completedBaseSamples===base.length,
    additionalSamples: values.size - completedBaseSamples, failures,
    // This means computation completed; detection is only validated against the declared oracle.
    verified: failures.length === 0, detectionGuarantee: 'NONE for arbitrary sub-minute runs' };
}
/** Nearest-sample reconstruction; exact ties choose the earlier sample. */
export function intervals(points: Point[]): Interval[] {
  if (points.length < 2) return [];
  const result: Interval[] = [];
  let start = points[0].t, sunny = points[0].value > 50;
  for (let i=1;i<points.length;i++) {
    const next = points[i].value > 50;
    if (next !== sunny) {
      const edge = (points[i-1].t + points[i].t)/2;
      result.push({ start, end: edge, sunny }); start = edge; sunny = next;
    }
  }
  result.push({ start, end: points[points.length-1].t, sunny });
  return result;
}
/** Independent oracle: visit EVERY minute, then bisect ONLY detected changes.
 * No candidate trigger, recursion or candidate sampling code is used here.
 * This still cannot discover arbitrary unbracketed sub-minute windows.
 */
export function referenceIntervals(f: (t:number)=>number,start:number,end:number) {
  const grid=sampleTimes(start,end,60000);
  const evaluate=(t:number)=>{
    const value=f(t);
    if(!Number.isFinite(value)||value<0||value>100)throw Error('Invalid reference engine value');
    return value;
  };
  const points=grid.map(t=>({t,value:evaluate(t)}));
  const runs: Interval[]=[];
  let runStart=start;
  for(let i=1;i<points.length;i++) {
    const left=points[i-1],right=points[i];
    if((left.value>50)===(right.value>50)) continue;
    let low=left.t,high=right.t;
    while(high-low>100) {
      const t=Math.floor((low+high)/2),value=evaluate(t);
      if((value>50)===(left.value>50)) low=t;else high=t;
    }
    const edge=(low+high)/2;
    runs.push({start:runStart,end:edge,sunny:left.value>50});runStart=edge;
  }
  runs.push({start:runStart,end,sunny:points.at(-1)!.value>50});
  return {points,intervals:runs,referenceGridMs:60000,detectedBoundaryBracketMs:100};
}
export function decodeJson(json:string): Point[] {
  const points:Point[]=JSON.parse(json);validatePoints(points);return points;
}
export function decodeArrays(json:string): Point[] {
  const arrays:unknown=JSON.parse(json);
  if(!Array.isArray(arrays)||arrays.length!==2||!Array.isArray(arrays[0])||!Array.isArray(arrays[1])||arrays[0].length!==arrays[1].length) throw Error('Invalid aligned arrays');
  const points=arrays[0].map((t,i)=>({t,value:arrays[1][i]}));validatePoints(points);return points;
}
export function compareIntervals(reference: Interval[], candidate: Interval[]) {
  const sun = (runs: Interval[]) => runs.filter(r => r.sunny);
  const overlap = (a: Interval,b: Interval) => Math.max(0, Math.min(a.end,b.end)-Math.max(a.start,b.start));
  const refs = sun(reference), actual = sun(candidate);
  const missed = refs.filter(r => !actual.some(c => overlap(r,c)>0));
  const falseRuns = actual.filter(c => !refs.some(r => overlap(r,c)>0));
  const missedMs = refs.reduce((n,r) => n+r.end-r.start-actual.reduce((v,c)=>v+overlap(r,c),0),0);
  const falseMs = actual.reduce((n,c) => n+c.end-c.start-refs.reduce((v,r)=>v+overlap(r,c),0),0);
  const relations = refs.map(r => ({ reference: r, candidates: actual.filter(c => overlap(r,c)>0) }));
  const signedErrorsMs = relations.flatMap(({reference:r,candidates:c}) => c.length === 1 && refs.filter(other=>overlap(other,c[0])>0).length===1 ? [c[0].start-r.start,c[0].end-r.end] : []);
  const topologyMatches=reference.length>0 && reference.length===candidate.length &&
    reference[0].start===candidate[0]?.start && reference.at(-1)?.end===candidate.at(-1)?.end &&
    reference.every((r,i)=>r.sunny===candidate[i].sunny && overlap(r,candidate[i])>0 &&
      candidate.filter(c=>c.sunny===r.sunny&&overlap(r,c)>0).length===1 &&
      reference.filter(other=>other.sunny===r.sunny&&overlap(other,candidate[i])>0).length===1);
  return { missedRuns: missed.length, missedMs, maxMissedRunMs: Math.max(0,...missed.map(r=>r.end-r.start)),
    falseRuns: falseRuns.length, falseMs, splits: relations.filter(r=>r.candidates.length>1).length,
    merges: actual.filter(c=>refs.filter(r=>overlap(r,c)>0).length>1).length,
    signedErrorsMs, maxErrorMs: Math.max(0,...signedErrorsMs.map(Math.abs)), relations,
    topologyMatches, transitionCount:Math.max(0,reference.length-1) };
}
export function validatePoints(points: Point[]) {
  if (!points.length || points.length > 20000) throw Error('Invalid sample count');
  points.forEach((p,i) => {
    if (!Number.isInteger(p.t) || p.t < 0 || p.t > 90000000 || !Number.isFinite(p.value) || p.value < 0 || p.value > 100 || (i>0 && p.t<=points[i-1].t)) throw Error('Invalid sample');
  });
}
/** Benchmark v1: uint32 millisecond offsets + float64 exposure, lossless engine precision. */
export function encode(points: Point[]) {
  validatePoints(points);
  const bytes = Buffer.alloc(5 + points.length * 12);
  bytes[0] = 1; bytes.writeUInt32LE(points.length,1);
  points.forEach((p,i) => { bytes.writeUInt32LE(p.t,5+i*12); bytes.writeDoubleLE(p.value,9+i*12); });
  return bytes;
}
export function decode(bytes: Buffer): Point[] {
  if (bytes.length < 5 || bytes[0] !== 1 || bytes.readUInt32LE(1)*12+5 !== bytes.length) throw Error('Invalid encoding');
  const points = Array.from({length: bytes.readUInt32LE(1)}, (_,i)=>({t:bytes.readUInt32LE(5+i*12),value:bytes.readDoubleLE(9+i*12)}));
  validatePoints(points); return points;
}
export function stats(values: number[]) {
  const sorted = [...values].sort((a,b)=>a-b);
  const q = (p: number) => sorted[Math.max(0,Math.ceil(sorted.length*p)-1)];
  return {n:values.length,p50:q(.5),p95:values.length>=20?q(.95):null,max:q(1)};
}
