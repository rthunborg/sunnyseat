import {it,expect} from 'vitest';
import {scanWindow} from '../../../../scripts/benchmarks/epic-15/dense-sampling';
import {filterWindows} from '../../../../scripts/benchmarks/epic-15/window-policy';
it('locates detected boundaries without treating cadence as a discovery guarantee',()=>{
  const result=scanWindow(t=>t>=350123?100:0,0,900000,5000);
  expect(Math.abs(result.intervals[0].end-350123)).toBeLessThanOrEqual(50);
  expect(result.certifiedContinuous).toBe(false);
});
it('demonstrates sub-grid shade gaps at every tested cadence',()=>{
  for(const step of [60000,10000,5000,1000]){
    const start=300000+step/4,end=start+step/4;
    const result=scanWindow(t=>t>=start&&t<end?0:100,0,600000,step);
    expect(result.intervals).toEqual([{start:0,end:600000,sunny:true}]);
    expect(filterWindows(result.intervals,50,true).windows[0].status).toBe('qualifies');
    expect(result.certifiedContinuous).toBe(false);
  }
});
it('fails closed on exhausted or invalid evaluation',()=>{
  expect(()=>scanWindow(()=>100,0,900000,1000,5)).toThrow('budget');
  expect(()=>scanWindow(()=>NaN,0,900000,1000)).toThrow('value');
  expect(()=>scanWindow(()=>100,0,900000,0)).toThrow();
});
