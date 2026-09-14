import {it,expect,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {capturedFixtures,type Capture} from './capture-inputs';
import {pruneShadowCasters} from './shadow-broadphase';
import {thresholdScan} from './threshold-sampling';
import {scanWindow} from './dense-sampling';
import {calculateSolarPosition} from '../../../lib/solar/solar-calculation-service';
import {calculateVenueShadowFromBuildings} from '../../../lib/solar/shadow-calculation-service';
import {artifactHashes,engineSources,publishLane} from './evidence.mjs';
import {thresholdSummary} from './threshold-report.mjs';
const guard=vi.hoisted(()=>({attempts:0,lat:57.7089,lng:11.9746}));
vi.mock('@/lib/supabase/server',()=>({supabaseServiceRole:new Proxy({}, {get(){guard.attempts++;throw Error('Offline repeated cost');}})}));
vi.mock('../../../lib/solar/solar-calculation-service',async original=>{const actual=await original<typeof import('../../../lib/solar/solar-calculation-service')>();return {...actual,calculateSolarPosition:(d:Date,lat=guard.lat,lng=guard.lng)=>actual.calculateSolarPosition(d,lat,lng)};});
it('collects twenty paired cost observations per selected caster stratum and gap case',()=>{
  const out=process.env.E15_OUTPUT,root=process.env.E15_EVIDENCE_ROOT;
  if(!out||!root||![out,root].every(path.isAbsolute)||fs.existsSync(out))throw Error('New output and absolute evidence root required');
  const read=(d:string,n:string)=>JSON.parse(fs.readFileSync(path.join(root,d,n),'utf8'));
  thresholdSummary(root);
  const env=read('run-14','environment.json'),survey=read('run-12','survey.json');
  expect(artifactHashes(path.join(root,'capture-01'),Object.keys(env.captureHashes))).toEqual(env.captureHashes);
  expect(artifactHashes(process.cwd(),Object.keys(env.sources))).toEqual(env.sources);
  const fixtures=capturedFixtures(read('capture-01','inputs.json') as Capture);
  const sources=artifactHashes(process.cwd(),[...engineSources,...['threshold-cost.measurement.ts','threshold-sampling.ts','shadow-broadphase.ts','dense-sampling.ts','capture-inputs.ts','threshold-report.mjs','survey-report.mjs','evidence.mjs'].map(n=>'scripts/benchmarks/epic-15/'+n)]);
  const at=new Date().toISOString(),fetch=globalThis.fetch;
  globalThis.fetch=async()=>{guard.attempts++;throw Error('Offline repeated cost');};vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-09-11T12:00:00Z'));
  try{
    const rows=[];
    for(const id of ['34','8','47','49']){
      const f=fixtures.find(f=>f.id===id)!;Object.assign(guard,f.coordinate);
      const date=id==='49'?'2026-10-25':'2026-09-22',c=survey.cells.find((c:{id:string;date:string})=>c.id===id&&c.date===date);
      const evaluate=(t:number)=>{const d=new Date(t),kept=pruneShadowCasters(f.seating,f.casters,calculateSolarPosition(d),f).retained;return calculateVenueShadowFromBuildings(f.seating,d,kept,f).sunlitAreaPercent;};
      for(let repetition=-2;repetition<20;repetition++)for(const method of repetition%2===0?['base','threshold']:['threshold','base']){
        const cpu=process.cpuUsage(),begin=performance.now();
        const result=method==='base'?scanWindow(evaluate,c.support.start,c.support.end,300000):thresholdScan(evaluate,c.support.start,c.support.end,5);
        const usage=process.cpuUsage(cpu),wallMs=performance.now()-begin;
        rows.push({id,date,casters:f.casters.length,repetition,method,wallMs,cpuMs:(usage.user+usage.system)/1000,samples:result.samples,intervals:result.intervals,heapUsedBytes:process.memoryUsage().heapUsed});
      }
      process.stdout.write(`Repeated cost completed venue ${id}\n`);
    }
    expect(rows).toHaveLength(176);expect(guard.attempts).toBe(0);fs.mkdirSync(out,{recursive:true});
    fs.writeFileSync(path.join(out,'cost.json'),JSON.stringify({rows,scope:'Twenty measured repetitions per method/case after two warmups, alternating order. Heap snapshots are process heap, not isolated per-cell allocations. Shared Windows host, benchmark-only spatial pruning.'}));
    fs.writeFileSync(path.join(out,'environment.json'),JSON.stringify({at,sources,inputHashes:artifactHashes(path.join(root,'run-14'),['threshold.json','environment.json','completion.json']),surveyHashes:env.surveyHashes,captureHashes:env.captureHashes,offlineAttempts:guard.attempts},null,2));
    const expected=['34','8','47','49'].flatMap(id=>Array.from({length:22},(_,i)=>i-2).flatMap(r=>['base','threshold'].map(m=>`${id}/${r}/${m}`)));
    publishLane(out,'completion.json',{complete:true,offlineAttempts:guard.attempts,cells:rows.map(r=>`${r.id}/${r.repetition}/${r.method}`)},['cost.json','environment.json'],expected);
  }finally{globalThis.fetch=fetch;vi.useRealTimers();}
});
