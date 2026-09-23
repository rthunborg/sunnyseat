import { describe, expect, it } from 'vitest';
import { daylight, localDay, sampleTimes, seasonDates, samplePolicy, compareIntervals, intervals, referenceIntervals, encode, decode, decodeArrays, decodeJson } from '../../../../scripts/benchmarks/epic-15/measurement';

describe('15.1 measurement integrity', () => {
  it('derives 23/25-hour Stockholm days and all 245 season dates', () => {
    expect((localDay('2026-03-29')[1] - localDay('2026-03-29')[0]) / 3600000).toBe(23);
    expect((localDay('2026-10-25')[1] - localDay('2026-10-25')[0]) / 3600000).toBe(25);
    expect(seasonDates(2026)).toHaveLength(245);
    expect(seasonDates(2027)[0]).toBe('2027-03-01');
  });
  it('keeps exact edges, including an interval without a regular sample', () => {
    expect(sampleTimes(1000, 2000, 900000)).toEqual([1000, 2000]);
    const spring = daylight('2026-03-01', 57.7089, 11.9746, 5);
    const summer = daylight('2026-06-21', 57.7089, 11.9746, 5);
    expect(summer.end - summer.start).toBeGreaterThan(spring.end - spring.start);
    expect(spring.roots.every(r => r.high - r.low <= 1000)).toBe(true);
  });
  it('exposes midpoint and endpoint misses against an independent short-run oracle', () => {
    const f = (t: number) => t >= 60000 && t < 120000 ? 100 : 0;
    const ref = [{ start: 60000, end: 120000, sunny: true }];
    for (const policy of ['endpoints', 'midpoint'] as const) {
      const actual = samplePolicy(f, 0, 900000, policy);
      expect(compareIntervals(ref, intervals(actual.points)).missedRuns).toBe(1);
    }
    const actual = samplePolicy(f, 0, 900000, 'minute');
    expect(compareIntervals(ref, intervals(actual.points)).missedRuns).toBe(0);
  });
  it('does not certify exhausted sample, depth, time or solver limits', () => {
    for (const limits of [{ maxSamples: 1 }, { maxDepth: 0 }, { maxMs: 0 }, { rootIterations: 0 }]) {
      const result = samplePolicy(t => t > 400000 ? 100 : 0, 0, 900000, 'minute', limits);
      expect(result.failures.length).toBeGreaterThan(0);
      expect(result.verified).toBe(false);
    }
  });
  it('strictly round trips the same precision and rejects corrupt bytes', () => {
    const points = [{ t: 0, value: 0 }, { t: 86400000, value: 50.125 }];
    expect(decode(encode(points))).toEqual(points);
    for (const corrupt of [Buffer.alloc(0), Buffer.from([99, 0, 0]), encode(points).subarray(0, 12)]) {
      expect(() => decode(corrupt)).toThrow();
    }
    expect(() => encode([{ t: 0, value: NaN }])).toThrow();
    expect(() => encode([{ t: 1, value: 0 }, { t: 1, value: 100 }])).toThrow();
    expect(() => encode([{ t: 0, value: 101 }])).toThrow();
    expect(decodeJson(JSON.stringify(points))).toEqual(points);
    expect(decodeArrays(JSON.stringify([points.map(p=>p.t),points.map(p=>p.value)]))).toEqual(points);
    expect(()=>decodeArrays('[[0,1],[10]]')).toThrow();
    expect(()=>decodeJson('[{"t":0,"value":101}]')).toThrow();
  });
  it('independently brackets transitions, preserves shade and exposes sub-minute blindness',()=>{
    expect(()=>referenceIntervals(()=>NaN,0,900000)).toThrow('Invalid reference engine value');
    const f=(t:number)=>t>=60000&&t<120000?100:0;
    const r=referenceIntervals(f,0,900000);
    expect(r.intervals.map(i=>i.sunny)).toEqual([false,true,false]);
    expect(Math.abs(r.intervals[1].start-60000)).toBeLessThanOrEqual(100);
    const hidden=referenceIntervals(t=>t>=70000&&t<80000?100:0,0,900000);
    expect(hidden.intervals.some(i=>i.sunny)).toBe(false);
    expect(intervals([{t:0,value:50},{t:1000,value:51}])).toEqual([{start:0,end:500,sunny:false},{start:500,end:1000,sunny:true}]);
  });
});
