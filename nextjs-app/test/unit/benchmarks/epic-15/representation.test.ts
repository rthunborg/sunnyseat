import {it,expect} from 'vitest';
import {storedDay,encodeStored,decodeStored} from '../../../../scripts/benchmarks/epic-15/representation';
it('preserves half-millisecond boundaries and raw exposure without rounding',()=>{
  const d=storedDay([{t:0,value:51.123456789},{t:300000,value:49.7},{t:600000,value:100}],[{start:0,end:299999.5,sunny:true},{start:299999.5,end:600000,sunny:false}],0);
  expect(decodeStored(encodeStored(d))).toEqual(d);
  expect(()=>decodeStored(encodeStored(d).subarray(0,-1))).toThrow('Truncated');
});
it('compact mode retains raw intervals while explicitly discarding interior exposure probes',()=>{
  const points=[{t:0,value:52},{t:60000,value:49},{t:300000,value:52},{t:600000,value:52}],runs=[{start:0,end:30000.5,sunny:true},{start:30000.5,end:120000.5,sunny:false},{start:120000.5,end:600000,sunny:true}];
  const d=storedDay(points,runs,0,true);expect(d.offsets).toEqual([0,300000,600000]);expect(d.starts).toEqual(runs.map(r=>r.start));
});
it('refuses missing base samples and invented continuity',()=>{
  expect(()=>storedDay([{t:0,value:52},{t:600000,value:52}],[{start:0,end:600000,sunny:true}],0,true)).toThrow('Missing base');
  expect(()=>storedDay([{t:0,value:52},{t:600000,value:52}],[{start:0,end:100000,sunny:true},{start:200000,end:600000,sunny:false}],0)).toThrow('Invalid stored intervals');
});
