import {it,expect} from 'vitest';
import {thresholdScan} from '../../../../scripts/benchmarks/epic-15/threshold-sampling';
import {filterWindows} from '../../../../scripts/benchmarks/epic-15/window-policy';
it('detects a near-threshold interior shade gap despite sunny five-minute endpoints',()=>{
  const r=thresholdScan(t=>t>=420000&&t<480000?49.7:52,0,1200000,5);
  expect(r.intervals.map(i=>i.sunny)).toEqual([true,false,true]);
  expect(filterWindows(r.intervals,50,true).intervals.map(i=>i.sunny)).toEqual([true,false,true]);
  expect(r.counts.base+r.counts.interior+r.counts.boundary).toBe(r.samples);
});
it('retains the known blind spot when neither endpoint triggers interior probes',()=>{
  const r=thresholdScan(t=>t>=420000&&t<480000?0:100,0,1200000,5);
  expect(r.intervals).toHaveLength(1);expect(r.certifiedContinuous).toBe(false);
});
it('shows that shortening triggered probes cannot fix an untriggered four-minute shade gap',()=>{
  for(const probeMs of [60000,30000,15000]){
    const r=thresholdScan(t=>t>=330000&&t<570000?0:100,0,1200000,5,probeMs);
    expect(r.counts.interior).toBe(0);expect(r.intervals).toHaveLength(1);
    expect(r.certifiedContinuous).toBe(false);
  }
});
it('suppresses repeated short sun bursts rather than invent a qualifying window',()=>{
  const r=thresholdScan(t=>(t>=60000&&t<240000)||(t>=300000&&t<480000)?52:48,0,600000,5);
  expect(filterWindows(r.intervals,50,true).intervals.every(i=>!i.sunny)).toBe(true);
});
it('fails without publishing a complete result when base work exhausts the budget',()=>{
  expect(()=>thresholdScan(()=>100,0,1200000,5,60000,2)).toThrow('base=2, interior=0, boundary=0');
  expect(()=>thresholdScan(()=>NaN,0,1200000,5)).toThrow('Invalid engine exposure');
});
it('treats equality as shade and includes exact support edges',()=>{
  const r=thresholdScan(()=>50,123,600123,0);
  expect(r.intervals).toEqual([{start:123,end:600123,sunny:false}]);
  expect(r.points[0].t).toBe(123);expect(r.points.at(-1)?.t).toBe(600123);
});
it('keeps 300-second duration uncertainty unresolved while separating 299 and 301 seconds',()=>{
  for(const [seconds,status] of [[299,'suppressed'],[300,'unresolved'],[301,'qualifies']] as const){
    const r=thresholdScan(t=>t>=120000&&t<120000+seconds*1000?52:48,0,600000,5);
    expect(filterWindows(r.intervals,50,true).windows[0].status).toBe(status);
  }
});
it('fails on adaptive exhaustion instead of interpreting unvisited time as shade',()=>{
  expect(()=>thresholdScan(()=>52,0,1200000,5,60000,7)).toThrow('base=5, interior=2, boundary=0');
});
