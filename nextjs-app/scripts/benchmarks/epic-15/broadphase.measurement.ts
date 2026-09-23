import {it,expect,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {calculateVenueShadowFromBuildings} from '../../../lib/solar/shadow-calculation-service';
import {calculateSolarPosition} from '../../../lib/solar/solar-calculation-service';
import {capturedFixtures,type Capture} from './capture-inputs';
import {pruneShadowCasters} from './shadow-broadphase';
import {localDay,stats} from './measurement';
import {artifactHashes,engineSources,publishLane,validateLaneCompletion} from './evidence.mjs';
const guard=vi.hoisted(()=>({attempts:0,lat:57.7089,lng:11.9746}));
vi.mock('@/lib/supabase/server',()=>({supabaseServiceRole:new Proxy({}, {get(){guard.attempts++;throw Error('Offline broadphase');}})}));
vi.mock('../../../lib/solar/solar-calculation-service',async original=>{const actual=await original<typeof import('../../../lib/solar/solar-calculation-service')>();return {...actual,calculateSolarPosition:(d:Date,lat=guard.lat,lng=guard.lng)=>actual.calculateSolarPosition(d,lat,lng)};});
it('compares spatially pruned engine calls with captured exact references',()=>{
  const out=process.env.E15_OUTPUT,root=process.env.E15_EVIDENCE_ROOT;
  if(!out||!root||![out,root].every(path.isAbsolute)||fs.existsSync(out))throw Error('New output and absolute evidence root required');
  const read=<T,>(dir:string,name:string):T=>JSON.parse(fs.readFileSync(path.join(root,dir,name),'utf8'));
  const capture=read<Capture>('capture-01','inputs.json'),fixtures=capturedFixtures(capture);
  const prior=read<{sourceHashes:Record<string,string>;captureHashes:Record<string,string>}>('run-09','environment.json');
  expect(artifactHashes(process.cwd(),Object.keys(prior.sourceHashes))).toEqual(prior.sourceHashes);
  expect(artifactHashes(path.join(root,'capture-01'),Object.keys(prior.captureHashes))).toEqual(prior.captureHashes);
  validateLaneCompletion(read('run-09','completion.json'),artifactHashes(path.join(root,'run-09'),['exact-reference.json','environment.json']),['34','8','47']);
  const main=read<{artifacts:Record<string,string>;cells:string[]}>('run-07','captured-completion.json');
  validateLaneCompletion(main,artifactHashes(path.join(root,'run-07'),Object.keys(main.artifacts)),main.cells);
  const sources=artifactHashes(process.cwd(),[...engineSources,'scripts/benchmarks/epic-15/shadow-broadphase.ts','scripts/benchmarks/epic-15/broadphase.measurement.ts','scripts/benchmarks/epic-15/capture-inputs.ts','node_modules/@turf/convex/dist/cjs/index.cjs','node_modules/concaveman/index.js','node_modules/polyclip-ts/dist/cjs/index.cjs']);
  const date=new Date().toISOString(),fetch=globalThis.fetch;
  globalThis.fetch=async()=>{guard.attempts++;throw Error('Offline broadphase');};vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-09-11T12:00:00Z'));
  try{
    const coarse=[],exact=[];
    const calculate=(f:typeof fixtures[number],t:number,prune:boolean)=>{
      const kept=prune?pruneShadowCasters(f.seating,f.casters,calculateSolarPosition(new Date(t)),f).retained:f.casters;
      return {value:calculateVenueShadowFromBuildings(f.seating,new Date(t),kept,f).sunlitAreaPercent,retained:kept.length};
    };
    for(const row of read<{id:string;date:string;points:{t:number;value:number}[]}[]>('run-07','M06-identical-dataset.json')){
      const f=fixtures.find(f=>f.id===row.id)!;Object.assign(guard,f.coordinate);const [midnight]=localDay(row.date);
      const start=performance.now(),points=row.points.map(p=>({t:p.t,...calculate(f,midnight+p.t,true)}));
      const wallMs=performance.now()-start;
      expect(points.map(p=>p.value)).toEqual(row.points.map(p=>p.value));
      coarse.push({id:f.id,casters:f.casters.length,points,wallMs,n:1});
    }
    for(const cell of read<{cells:{id:string;points:{t:number;value:number}[]}[]}>('run-09','exact-reference.json').cells){
      const f=fixtures.find(f=>f.id===cell.id)!;Object.assign(guard,f.coordinate);const observations=[];
      for(let repetition=-1;repetition<3;repetition++)for(const prune of repetition%2===0?[true,false]:[false,true]){
        const before=process.cpuUsage(),start=performance.now();const values=cell.points.map(p=>calculate(f,p.t,prune));const cpu=process.cpuUsage(before),wallMs=performance.now()-start;
        expect(values.map(v=>v.value)).toEqual(cell.points.map(p=>p.value));
        if(repetition>=0)observations.push({repetition,prune,wallMs,cpuMs:(cpu.user+cpu.system)/1000,retainedMin:Math.min(...values.map(v=>v.retained)),retainedMax:Math.max(...values.map(v=>v.retained))});
      }
      exact.push({id:f.id,samples:cell.points.length,observations,baseline:stats(observations.filter(o=>!o.prune).map(o=>o.wallMs)),pruned:stats(observations.filter(o=>o.prune).map(o=>o.wallMs))});
    }
    expect(coarse).toHaveLength(42);expect(exact).toHaveLength(3);expect(guard.attempts).toBe(0);
    fs.mkdirSync(out,{recursive:true});
    fs.writeFileSync(path.join(out,'spatial-pruning.json'),JSON.stringify({coarse,exact,scope:'Geometry percentage equality only; confidence/caster metadata intentionally not claimed. No temporal sample skipping.'},null,2));
    fs.writeFileSync(path.join(out,'environment.json'),JSON.stringify({date,sources,captureHashes:prior.captureHashes,mainArtifacts:main.artifacts,exactArtifacts:artifactHashes(path.join(root,'run-09'),['exact-reference.json','environment.json']),offlineAttempts:guard.attempts},null,2));
    const cells=[...coarse.map(c=>'day/'+c.id),...exact.map(c=>'exact/'+c.id)];
    publishLane(out,'completion.json',{complete:true,offlineAttempts:guard.attempts,cells},['spatial-pruning.json','environment.json'],cells);
  }finally{globalThis.fetch=fetch;vi.useRealTimers();}
});
