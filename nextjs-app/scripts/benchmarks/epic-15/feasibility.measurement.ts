import {it,expect,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {capturedFixtures,type Capture} from './capture-inputs';
import {wholeSweepBound} from './whole-sweep';
import {pruneShadowCasters} from './shadow-broadphase';
import {scanWindow} from './dense-sampling';
import {filterWindows} from './window-policy';
import {daylight,compareIntervals} from './measurement';
import {calculateSolarPosition} from '../../../lib/solar/solar-calculation-service';
import {calculateVenueShadowFromBuildings} from '../../../lib/solar/shadow-calculation-service';
import {artifactHashes,engineSources,publishLane,validateLaneCompletion} from './evidence.mjs';
const guard=vi.hoisted(()=>({attempts:0,lat:57.7089,lng:11.9746}));
vi.mock('@/lib/supabase/server',()=>({supabaseServiceRole:new Proxy({}, {get(){guard.attempts++;throw Error('Offline feasibility');}})}));
vi.mock('../../../lib/solar/solar-calculation-service',async original=>{const actual=await original<typeof import('../../../lib/solar/solar-calculation-service')>();return {...actual,calculateSolarPosition:(d:Date,lat=guard.lat,lng=guard.lng)=>actual.calculateSolarPosition(d,lat,lng)};});
it('measures one bounded whole-interval feasibility checkpoint',()=>{
  const out=process.env.E15_OUTPUT,root=process.env.E15_EVIDENCE_ROOT;
  if(!out||!root||![out,root].every(path.isAbsolute)||fs.existsSync(out))throw Error('New output and absolute evidence root required');
  const read=<T,>(dir:string,name:string):T=>JSON.parse(fs.readFileSync(path.join(root,dir,name),'utf8'));
  const fixtures=capturedFixtures(read<Capture>('capture-01','inputs.json'));
  const exactEnv=read<{captureHashes:Record<string,string>;sourceHashes:Record<string,string>}>('run-09','environment.json');
  expect(artifactHashes(path.join(root,'capture-01'),Object.keys(exactEnv.captureHashes))).toEqual(exactEnv.captureHashes);
  expect(artifactHashes(process.cwd(),Object.keys(exactEnv.sourceHashes))).toEqual(exactEnv.sourceHashes);
  validateLaneCompletion(read('run-09','completion.json'),artifactHashes(path.join(root,'run-09'),['exact-reference.json','environment.json']),['34','8','47']);
  const sources=artifactHashes(process.cwd(),[...engineSources,...['whole-sweep.ts','feasibility.measurement.ts','shadow-broadphase.ts','dense-sampling.ts','window-policy.ts','capture-inputs.ts'].map(n=>'scripts/benchmarks/epic-15/'+n)]);
  const at=new Date().toISOString(),fetch=globalThis.fetch;
  globalThis.fetch=async()=>{guard.attempts++;throw Error('Offline feasibility');};vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-09-11T12:00:00Z'));
  try{
    const date='2026-09-22',bounds=[],days=[];
    for(const f of fixtures){
      Object.assign(guard,f.coordinate);const support=daylight(date,f.coordinate.lat,f.coordinate.lng,5);
      const begin=performance.now(),bound=wholeSweepBound(f.seating,f.casters,true,f),wallMs=performance.now()-begin;
      bounds.push({id:f.id,support,bound,wallMs,unresolvedMs:bound.bounds?0:support.end-support.start});
    }
    const exact=read<{cells:{id:string;points:{t:number;value:number}[]}[]}>('run-09','exact-reference.json');
    for(const cell of exact.cells){
      const b=bounds.find(b=>b.id===cell.id)!.bound.bounds;
      if(b)for(const point of cell.points){expect(point.value).toBeGreaterThanOrEqual(b.lower);expect(point.value).toBeLessThanOrEqual(b.upper);}
    }
    for(const id of ['34','8','47']){
      const f=fixtures.find(f=>f.id===id)!;Object.assign(guard,f.coordinate);const support=bounds.find(b=>b.id===id)!.support;
      const runs=[];
      for(const stepMs of [5000,1000]){
        const points:{t:number;value:number;retained:number}[]=[];
        const before=process.cpuUsage(),begin=performance.now();
        const run=scanWindow(t=>{
          const solar=calculateSolarPosition(new Date(t)),kept=pruneShadowCasters(f.seating,f.casters,solar,f).retained;
          const value=calculateVenueShadowFromBuildings(f.seating,new Date(t),kept,f).sunlitAreaPercent;
          points.push({t,value,retained:kept.length});return value;
        },support.start,support.end,stepMs,100000);
        const filtered=filterWindows(run.intervals,50,true),usage=process.cpuUsage(before),wallMs=performance.now()-begin;
        runs.push({stepMs,run,filtered,points,wallMs,cpuMs:(usage.user+usage.system)/1000,n:1,p95:null});
      }
      days.push({id,support,runs,diagnosticOnly:compareIntervals(runs[1].run.intervals,runs[0].run.intervals)});
    }
    expect(bounds).toHaveLength(42);expect(days).toHaveLength(3);expect(guard.attempts).toBe(0);
    fs.mkdirSync(out,{recursive:true});
    fs.writeFileSync(path.join(out,'feasibility.json'),JSON.stringify({bounds,days,scope:'All-direction bounds conditional on supported elevation; 1s/5s full-day scans are diagnostics, not certified temporal coverage. No full-season extrapolation.'},null,2));
    fs.writeFileSync(path.join(out,'environment.json'),JSON.stringify({at,sources,captureHashes:exactEnv.captureHashes,exactArtifacts:artifactHashes(path.join(root,'run-09'),['exact-reference.json','environment.json']),offlineAttempts:guard.attempts},null,2));
    const cells=[...bounds.map(b=>'bound/'+b.id),...days.flatMap(d=>d.runs.map(r=>`${d.id}/${r.stepMs}`))];
    publishLane(out,'completion.json',{complete:true,offlineAttempts:guard.attempts,cells},['feasibility.json','environment.json'],cells);
  }finally{globalThis.fetch=fetch;vi.useRealTimers();}
});
