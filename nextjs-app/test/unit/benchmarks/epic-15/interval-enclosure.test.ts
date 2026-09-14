import {it,expect} from 'vitest';
import {encloseTimeline,type Enclosure} from '../../../../scripts/benchmarks/epic-15/interval-enclosure';
const signal=(gapStart:number,gapEnd:number)=>(start:number,end:number):Enclosure=>
  end<=gapStart||start>=gapEnd?{lower:100,upper:100}:start>=gapStart&&end<=gapEnd?{lower:0,upper:0}:{lower:0,upper:100};
it('does not bridge a sub-second gap between two short bursts',()=>{
  const result=encloseTimeline(signal(299999,300000),0,599999,{minWidthMs:0.125,maxCalls:1000});
  expect(result.qualifying).toEqual([]);
  expect(result.partitions.some(p=>p.state!=='sunny')).toBe(true);
});
it('qualifies a proven 300-second span and rejects 299 seconds',()=>{
  expect(encloseTimeline(()=>({lower:51,upper:100}),0,300000).qualifying).toEqual([{start:0,end:300000}]);
  expect(encloseTimeline(()=>({lower:51,upper:100}),0,299000).qualifying).toEqual([]);
  expect(encloseTimeline(()=>({lower:50,upper:50}),0,300000).partitions[0].state).toBe('shade');
});
it('preserves unknown coverage under budgets and missing bounds',()=>{
  const result=encloseTimeline(()=>null,0,600000,{maxCalls:3,minWidthMs:1});
  expect(result.calls).toBe(3);expect(result.complete).toBe(false);expect(result.qualifying).toEqual([]);
  expect(result.partitions.reduce((n,p)=>n+p.end-p.start,0)).toBe(600000);
});
it('rejects malformed enclosures and budgets instead of certifying them',()=>{
  for(const bounds of [{lower:60,upper:50},{lower:NaN,upper:100},{lower:0,upper:101}])expect(()=>encloseTimeline(()=>bounds,0,600000)).toThrow();
  expect(()=>encloseTimeline(()=>null,0,600000,{maxCalls:0})).toThrow();
});
