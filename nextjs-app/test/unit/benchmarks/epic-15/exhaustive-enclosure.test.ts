import {it,expect} from 'vitest';
import {exhaustiveEnclosure} from '../../../../scripts/benchmarks/epic-15/exhaustive-enclosure';
it('bounds every Date-representable instant, including a hidden one-millisecond gap',()=>{
  const adapter=exhaustiveEnclosure(t=>t===501?0:100,1000);
  expect(adapter.bound(0,1000)).toEqual({lower:0,upper:100});
  expect(adapter.samples()).toBe(1000);
});
it('covers fractional partition boundaries using Date TimeClip semantics',()=>{
  const seen:number[]=[];const adapter=exhaustiveEnclosure(t=>{seen.push(t);return t;},10);
  expect(adapter.bound(1.5,3.5)).toEqual({lower:1,upper:3});expect(seen).toEqual([1,2,3]);
  expect(adapter.bound(2,3)).toEqual({lower:2,upper:2});expect(adapter.samples()).toBe(3);
});
it('never publishes partial extrema on exhaustion or malformed values',()=>{
  const adapter=exhaustiveEnclosure(()=>100,2);
  expect(adapter.bound(0,3)).toBeNull();expect(adapter.samples()).toBe(2);
  expect(adapter.bound(0,2)).toEqual({lower:100,upper:100});
  expect(()=>exhaustiveEnclosure(()=>NaN,3).bound(0,1)).toThrow();
  expect(()=>adapter.bound(-1,2)).toThrow();
});
