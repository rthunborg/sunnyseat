import {describe,it,expect} from 'vitest';
import {validateWorkloads} from '../../../../scripts/benchmarks/epic-15/workloads-report.mjs';
import {jsonHash} from '../../../../scripts/benchmarks/epic-15/evidence.mjs';
function fixture(){
  const capture={venues:[{id:'49',casterIds:[1]},{id:'8',casterIds:[2]}]};
  const names=['initial-seven','staged-seven','rolling-five','repair-one','venue-edit','local-import','all-invalidation','single-venue-full-season'];
  const dates=Array.from({length:7},(_,i)=>`2026-09-${21+i}`),season=Array.from({length:245},(_,i)=>new Date(Date.UTC(2026,2,1+i)).toISOString().slice(0,10));
  const workloads=names.map(name=>{const ids=['repair-one','venue-edit','local-import','single-venue-full-season'].includes(name)?['49']:['49','8'],ds=name==='single-venue-full-season'?season:name==='repair-one'?['2026-09-22']:name==='rolling-five'?dates.slice(2):dates,cells=ids.flatMap(id=>ds.map(date=>({id,date})));return {name,cells,days:cells.length,complete:true,outputHash:jsonHash(cells),wallMs:1};});
  const reads=[1,4,8].flatMap(clients=>Array.from({length:22},(_,i)=>i-2).flatMap(round=>Array.from({length:clients},(_,client)=>({clients,round,client,transportMs:1,decodeMs:1,bytes:1}))));
  const batches=workloads.map(w=>({workload:w.name,index:0,days:w.days,wallMs:1,cpuMs:1,samples:1,sampledHeapPeakBytes:1,processMaxRssKiB:1,walBytes:1}));
  const data={workloads,reads,batches},hashes={'workloads.json':'a','environment.json':'b'},completion={complete:true,offlineAttempts:0,artifacts:hashes,cells:[...names,...reads.map(r=>`read/${r.clients}/${r.round}/${r.client}`),'noop']};
  return {data,hashes,completion,capture};
}
describe('workload evidence publication',()=>{
  it('accepts the exact declared workload/date/read sets',()=>{const f=fixture();expect(validateWorkloads(f.data,f.completion,f.hashes,f.capture)).toBe(f.data);});
  it('rejects an unfinished or externally tainted run',()=>{for(const change of [{complete:false},{offlineAttempts:1}]){const f=fixture();expect(()=>validateWorkloads(f.data,{...f.completion,...change},f.hashes,f.capture)).toThrow();}});
  it('rejects omitted or duplicate season dates even with recomputed output hashes',()=>{for(const duplicate of [false,true]){const f=fixture(),w=f.data.workloads.at(-1)!;if(duplicate)w.cells[0]=w.cells[1];else w.cells.pop();w.outputHash=jsonHash(w.cells);expect(()=>validateWorkloads(f.data,f.completion,f.hashes,f.capture)).toThrow();}});
  it('rejects missing concurrent observations and invalid CPU accounting',()=>{const f=fixture();f.data.reads.pop();expect(()=>validateWorkloads(f.data,f.completion,f.hashes,f.capture)).toThrow();const g=fixture();g.data.batches[0].cpuMs=-1;expect(()=>validateWorkloads(g.data,g.completion,g.hashes,g.capture)).toThrow();});
});
