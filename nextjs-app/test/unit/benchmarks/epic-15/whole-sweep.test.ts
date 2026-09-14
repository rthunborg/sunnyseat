import {it,expect} from 'vitest';
import {wholeSweepBound} from '../../../../scripts/benchmarks/epic-15/whole-sweep';
import type {Building} from '../../../../lib/solar/types';
const square=(x:number):GeoJSON.Polygon=>({type:'Polygon',coordinates:[[[x,57],[x+.0001,57],[x+.0001,57.0001],[x,57.0001],[x,57]]]});
const caster:Building={id:1,geometry:square(12.02),height:20,qualityScore:1,heightSource:'Surveyed',source:'synthetic'};
it('proves no overlap across all capped shadow directions for a distant caster',()=>{
  expect(wholeSweepBound(square(12),[caster],true).bounds).toEqual({lower:100,upper:100});
});
it('does not infer whole-interval sun from an overlapping envelope or unsupported horizon',()=>{
  expect(wholeSweepBound(square(12),[{...caster,geometry:square(12.001)}],true).bounds).toBeNull();
  expect(wholeSweepBound(square(12),[],false).bounds).toBeNull();
});
it('honours terrain height gates and retains malformed inputs as unresolved',()=>{
  expect(wholeSweepBound(square(12),[{...caster,geometry:square(12),groundZRh2000:0}],true,{venueGroundZ:30}).bounds).toEqual({lower:100,upper:100});
  expect(wholeSweepBound(square(12),[{...caster,height:NaN}],true).bounds).toBeNull();
});
