import {it,expect} from 'vitest';
import {filterWindows,eligibleAt} from '../../../../scripts/benchmarks/epic-15/window-policy';
import {samplePolicy,intervals,compareIntervals} from '../../../../scripts/benchmarks/epic-15/measurement';
const around=(seconds:number)=>[{start:0,end:10000,sunny:false},{start:10000,end:10000+seconds*1000,sunny:true},{start:10000+seconds*1000,end:400000,sunny:false}];
it('suppresses 299 seconds and retains exact 300/301-second windows from their start',()=>{
  for(const seconds of [299,300,301]){
    const raw=around(seconds),before=JSON.stringify(raw),result=filterWindows(raw,0,true);
    expect(result.windows[0].status).toBe(seconds<300?'suppressed':'qualifies');
    expect(eligibleAt(result,10000,'likely')).toBe(seconds>=300);
    expect(eligibleAt(result,10000+seconds*1000,'likely')).toBe(false);
    expect(JSON.stringify(raw)).toBe(before);
  }
});
it('never bridges shade gaps or uses previous public state',()=>{
  const raw=[{start:0,end:290000,sunny:true},{start:290000,end:300000,sunny:false},{start:300000,end:590000,sunny:true}];
  const result=filterWindows(raw,0,true);
  expect(result.windows.every(w=>w.status==='suppressed')).toBe(true);
  expect(result.intervals).toEqual([{start:0,end:590000,sunny:false}]);
});
it('keeps uncertain duration and incomplete computation unverified',()=>{
  expect(filterWindows(around(300),50,true).windows[0].status).toBe('unresolved');
  const failed=filterWindows(around(301),0,false);
  expect(failed.complete).toBe(false);expect(eligibleAt(failed,20000,'likely')).toBe(false);
  expect(filterWindows(around(301),500,true).windows[0].status).toBe('qualifies');
});
it('retains exact supported edges and requires likely weather',()=>{
  const result=filterWindows([{start:123,end:600123,sunny:true}],500,true);
  expect(result.windows[0].minimumDurationMs).toBe(600000);
  expect(eligibleAt(result,122,'likely')).toBe(false);
  expect(eligibleAt(result,123,'likely')).toBe(true);
  expect(eligibleAt(result,123,'blocked')).toBe(false);
  expect(eligibleAt(result,123,'unknown')).toBe(false);
});
it('rejects malformed or incomplete interval coverage',()=>{
  for(const raw of [[],[{start:0,end:NaN,sunny:true}],[{start:0,end:10,sunny:true},{start:11,end:20,sunny:false}]])expect(()=>filterWindows(raw,0,true)).toThrow();
  expect(()=>filterWindows(around(300),-1,true)).toThrow();
});
it('demonstrates a missed shade gap falsely combining two sub-five-minute bursts',()=>{
  const f=(t:number)=>t>=290000&&t<300000?0:100;
  const raw=[{start:0,end:290000,sunny:true},{start:290000,end:300000,sunny:false},{start:300000,end:590000,sunny:true}];
  const candidate=samplePolicy(f,0,590000,'minute');
  const expected=filterWindows(raw,0,true),actual=filterWindows(intervals(candidate.points),500,candidate.verified);
  expect(compareIntervals(expected.intervals,actual.intervals).falseMs).toBeGreaterThan(0);
});
it('does not qualify equality at 50 percent or any exhausted computation',()=>{
  const equal=samplePolicy(()=>50,0,600000,'minute');
  expect(filterWindows(intervals(equal.points),500,equal.verified).windows).toHaveLength(0);
  for(const limit of [{maxSamples:1},{maxDepth:0},{maxMs:0},{rootIterations:0}]){
    const run=samplePolicy(t=>t>400000?100:0,0,900000,'minute',limit);
    expect(run.verified).toBe(false);
    if(run.points.length<2)expect(()=>filterWindows(intervals(run.points),500,false)).toThrow();
    else expect(eligibleAt(filterWindows(intervals(run.points),500,false),800000,'likely')).toBe(false);
  }
});
