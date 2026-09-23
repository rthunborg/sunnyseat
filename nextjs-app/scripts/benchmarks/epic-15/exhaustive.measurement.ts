import {it,expect,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {calculateVenueShadowFromBuildings} from '../../../lib/solar/shadow-calculation-service';
import {capturedFixtures,type Capture} from './capture-inputs';
import {exhaustiveEnclosure} from './exhaustive-enclosure';
import {artifactHashes,engineSources,publishLane,validateLaneCompletion} from './evidence.mjs';
import {stats,type Interval} from './measurement';
const guard=vi.hoisted(()=>({attempts:0,lat:57.7089,lng:11.9746}));
vi.mock('@/lib/supabase/server',()=>({supabaseServiceRole:new Proxy({}, {get(){guard.attempts++;throw Error('Offline exact reference');}})}));
vi.mock('../../../lib/solar/solar-calculation-service',async original=>{
  const actual=await original<typeof import('../../../lib/solar/solar-calculation-service')>();
  return {...actual,calculateSolarPosition:(d:Date,lat=guard.lat,lng=guard.lng)=>actual.calculateSolarPosition(d,lat,lng)};
});
it('measures exact finite-Date reference cost on captured transitions',()=>{
  const out=process.env.E15_OUTPUT,captureDir=process.env.E15_CAPTURE,main=process.env.E15_MAIN_INPUT;
  if(!out||!captureDir||!main||![out,captureDir,main].every(path.isAbsolute)||fs.existsSync(out))throw Error('New output and absolute capture/main paths required');
  const read=<T,>(dir:string,name:string):T=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
  const fixtures=capturedFixtures(read<Capture>(captureDir,'inputs.json'));
  const mainCompletion=read<{artifacts:Record<string,string>;cells:string[]}>(main,'captured-completion.json');
  validateLaneCompletion(mainCompletion,artifactHashes(main,Object.keys(mainCompletion.artifacts)),mainCompletion.cells);
  const environment=read<{captureHashes:Record<string,string>;sourceHashes:Record<string,string>}>(main,'captured-environment.json');
  expect(artifactHashes(captureDir,Object.keys(environment.captureHashes))).toEqual(environment.captureHashes);
  expect(artifactHashes(process.cwd(),Object.keys(environment.sourceHashes))).toEqual(environment.sourceHashes);
  const selected=read<{selection:{selected:string[]};comparisons:{id:string;reference:Interval[]}[]}>(main,'captured-cost.json');
  expect(selected.selection.selected).toHaveLength(3);
  const dayRows=read<{id:string;points:{t:number}[]}[]>(main,'M06-identical-dataset.json');
  const sourceHashes=artifactHashes(process.cwd(),[...engineSources,'scripts/benchmarks/epic-15/capture-inputs.ts','scripts/benchmarks/epic-15/exhaustive-enclosure.ts','scripts/benchmarks/epic-15/exhaustive.measurement.ts']);
  const at=new Date().toISOString(),fetch=globalThis.fetch;
  globalThis.fetch=async()=>{guard.attempts++;throw Error('Offline exact reference');};
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-09-11T12:00:00Z'));
  try{
    const cells=[];
    for(const id of selected.selection.selected){
      const f=fixtures.find(f=>f.id===id)!;Object.assign(guard,f.coordinate);
      const reference=selected.comparisons.find(c=>c.id===id)!.reference;
      expect(reference.length).toBeGreaterThan(1);
      const start=Math.floor(reference[0].end)-250,end=start+500,observations=[];
      let points:{t:number;value:number}[]=[],bounds:{lower:number;upper:number}|null=null;
      for(let r=-1;r<3;r++){
        points=[];
        const adapter=exhaustiveEnclosure(t=>{const value=calculateVenueShadowFromBuildings(f.seating,new Date(t),f.casters,f).sunlitAreaPercent;points.push({t,value});return value;},500);
        const before=process.cpuUsage(),begin=performance.now();bounds=adapter.bound(start,end);const cpu=process.cpuUsage(before);
        if(r>=0)observations.push({wallMs:performance.now()-begin,cpuMs:(cpu.user+cpu.system)/1000});
        expect(bounds).not.toBeNull();expect(adapter.samples()).toBe(500);
        expect(adapter.bound(start,end+1)).toBeNull();
      }
      const day=dayRows.find(row=>row.id===id)!,dayInstants=day.points.at(-1)!.t-day.points[0].t;
      const wall=stats(observations.map(o=>o.wallMs));
      cells.push({id,start,end,casters:f.casters.length,points,bounds,observations,wallMs:wall,sampleCount:500,
        exactPredicateTransitions:points.filter((p,i)=>i>0&&(p.value>50)!==(points[i-1].value>50)).map(p=>p.t),
        extrapolation:{label:'Not measured: same per-instant cost throughout this venue/date; excludes IO, scheduling, memory growth and concurrency',dayInstants,wallHours:dayInstants*(wall.p50/500)/3600000}});
    }
    expect(guard.attempts).toBe(0);
    fs.mkdirSync(out,{recursive:true});
    fs.writeFileSync(path.join(out,'exact-reference.json'),JSON.stringify({cells,scope:'500ms per venue, all Date-representable instants; frozen captured inputs. n=3 plus one warmup; no p95. No physical continuity guarantee.'},null,2));
    fs.writeFileSync(path.join(out,'environment.json'),JSON.stringify({at,node:process.version,sourceHashes,captureHashes:environment.captureHashes,mainArtifacts:mainCompletion.artifacts,offlineAttempts:guard.attempts},null,2));
    publishLane(out,'completion.json',{complete:true,offlineAttempts:guard.attempts,cells:cells.map(c=>c.id)},['exact-reference.json','environment.json'],selected.selection.selected);
  }finally{globalThis.fetch=fetch;vi.useRealTimers();}
});
