import {it,expect,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {capturedFixtures,type Capture} from './capture-inputs';
import {pruneShadowCasters} from './shadow-broadphase';
import {thresholdScan} from './threshold-sampling';
import {scanWindow} from './dense-sampling';
import {filterWindows} from './window-policy';
import {compareIntervals} from './measurement';
import {calculateSolarPosition} from '../../../lib/solar/solar-calculation-service';
import {calculateVenueShadowFromBuildings} from '../../../lib/solar/shadow-calculation-service';
import {artifactHashes,engineSources,publishLane} from './evidence.mjs';
import {thresholdSummary} from './threshold-report.mjs';
const guard=vi.hoisted(()=>({attempts:0,lat:57.7089,lng:11.9746}));
vi.mock('@/lib/supabase/server',()=>({supabaseServiceRole:new Proxy({}, {get(){guard.attempts++;throw Error('Offline cadence');}})}));
vi.mock('../../../lib/solar/solar-calculation-service',async original=>{const actual=await original<typeof import('../../../lib/solar/solar-calculation-service')>();return {...actual,calculateSolarPosition:(d:Date,lat=guard.lat,lng=guard.lng)=>actual.calculateSolarPosition(d,lat,lng)};});
it('compares shorter probes on difficult full days against a five-second reference',()=>{
  const out=process.env.E15_OUTPUT,root=process.env.E15_EVIDENCE_ROOT;
  if(!out||!root||![out,root].every(path.isAbsolute)||fs.existsSync(out))throw Error('Fresh absolute output required');
  const read=(d:string,n:string)=>JSON.parse(fs.readFileSync(path.join(root,d,n),'utf8'));
  thresholdSummary(root);const env=read('run-14','environment.json'),survey=read('run-12','survey.json');
  expect(artifactHashes(path.join(root,'capture-01'),Object.keys(env.captureHashes))).toEqual(env.captureHashes);
  expect(artifactHashes(process.cwd(),Object.keys(env.sources))).toEqual(env.sources);
  const fixtures=capturedFixtures(read('capture-01','inputs.json') as Capture);
  const selected=[['35','2026-03-29'],['49','2026-10-25'],['35','2026-10-31'],['22','2026-10-31'],['34','2026-09-22'],['8','2026-09-22'],['47','2026-09-22']];
  const sources=artifactHashes(process.cwd(),[...engineSources,...['cadence.measurement.ts','threshold-sampling.ts','shadow-broadphase.ts','dense-sampling.ts','window-policy.ts','capture-inputs.ts'].map(n=>'scripts/benchmarks/epic-15/'+n)]);
  const at=new Date().toISOString(),fetch=globalThis.fetch;globalThis.fetch=async()=>{guard.attempts++;throw Error('Offline cadence');};
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-09-12T12:00:00Z'));
  try{
    const cells=[];
    for(const [id,date] of selected){
      const f=fixtures.find(f=>f.id===id)!;Object.assign(guard,f.coordinate);
      const c=survey.cells.find((c:{id:string;date:string})=>c.id===id&&c.date===date);
      const evaluate=(t:number)=>{const d=new Date(t),kept=pruneShadowCasters(f.seating,f.casters,calculateSolarPosition(d),f).retained;return calculateVenueShadowFromBuildings(f.seating,d,kept,f).sunlitAreaPercent;};
      const reference=scanWindow(evaluate,c.support.start,c.support.end,5000);
      const rows=[];
      for(const probeMs of [60000,30000,15000]){
        const cpu=process.cpuUsage(),begin=performance.now(),run=thresholdScan(evaluate,c.support.start,c.support.end,5,probeMs),usage=process.cpuUsage(cpu);
        const filtered=filterWindows(run.intervals,50,true),refFiltered=filterWindows(reference.intervals,50,true);
        rows.push({probeMs,run,wallMs:performance.now()-begin,cpuMs:(usage.user+usage.system)/1000,raw:compareIntervals(reference.intervals,run.intervals),filtered:compareIntervals(refFiltered.intervals,filtered.intervals),durationComplete:filtered.complete&&refFiltered.complete});
      }
      cells.push({id,date,support:c.support,reference,rows});process.stdout.write(`Cadence ${cells.length}/7\n`);
    }
    expect(cells).toHaveLength(7);expect(guard.attempts).toBe(0);fs.mkdirSync(out,{recursive:true});
    fs.writeFileSync(path.join(out,'cadence.json'),JSON.stringify({cells,scope:'Five-second full-day grid plus detected-crossing refinement is not proof of sub-grid continuity; cadence timings n=1.'}));
    fs.writeFileSync(path.join(out,'environment.json'),JSON.stringify({at,sources,inputHashes:artifactHashes(path.join(root,'run-14'),['threshold.json','environment.json','completion.json']),surveyHashes:env.surveyHashes,captureHashes:env.captureHashes,offlineAttempts:guard.attempts},null,2));
    const expected=selected.flatMap(([id,date])=>[60000,30000,15000].map(p=>`${id}/${date}/${p}`));
    publishLane(out,'completion.json',{complete:true,offlineAttempts:guard.attempts,cells:cells.flatMap(c=>c.rows.map(r=>`${c.id}/${c.date}/${r.probeMs}`))},['cadence.json','environment.json'],expected);
  }finally{globalThis.fetch=fetch;vi.useRealTimers();}
});
