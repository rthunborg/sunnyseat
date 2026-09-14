import {it,expect,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {calculateVenueShadowFromBuildings} from '../../../lib/solar/shadow-calculation-service';
import {capturedFixtures,type Capture} from './capture-inputs';
import {daylight,localDay,sampleTimes,intervals,compareIntervals,stats} from './measurement';
import {scanWindow} from './dense-sampling';
import {filterWindows} from './window-policy';
import {artifactHashes,engineSources,publishLane} from './evidence.mjs';
const guard=vi.hoisted(()=>({attempts:0,lat:57.7089,lng:11.9746}));
vi.mock('@/lib/supabase/server',()=>({supabaseServiceRole:new Proxy({}, {get(){guard.attempts++;throw Error('Offline capture replay');}})}));
vi.mock('../../../lib/solar/solar-calculation-service',async importOriginal=>{
  const actual=await importOriginal<typeof import('../../../lib/solar/solar-calculation-service')>();
  return {...actual,calculateSolarPosition:(d:Date,lat=guard.lat,lng=guard.lng)=>actual.calculateSolarPosition(d,lat,lng)};
});
it('replays captured inputs and measures bounded finer sampling',()=>{
  const out=process.env.E15_OUTPUT,captureDir=process.env.E15_CAPTURE;
  if(!out||!captureDir||!path.isAbsolute(out)||!path.isAbsolute(captureDir)||fs.existsSync(out))throw Error('New absolute output and capture paths required');
  const capture:Capture=JSON.parse(fs.readFileSync(path.join(captureDir,'inputs.json'),'utf8'));
  const fixtures=capturedFixtures(capture),date='2026-09-22';
  const sourceHashes=artifactHashes(process.cwd(),[...engineSources,'scripts/benchmarks/epic-15/captured.measurement.ts','scripts/benchmarks/epic-15/capture-inputs.ts','scripts/benchmarks/epic-15/dense-sampling.ts','scripts/benchmarks/epic-15/window-policy.ts','scripts/benchmarks/epic-15/measurement.ts']);
  const measuredAt=new Date().toISOString(),originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>{guard.attempts++;throw Error('Offline capture replay');};
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-09-11T12:00:00Z'));
  try{
    const rows:{id:string;date:string;points:{t:number;value:number}[]}[]=[],edits=[],costs=[],changedFixtures=fixtures.map(f=>({...f,seatingElevationM:f.seatingElevationM+2}));
    let changedSamples=0;
    for(const [index,f] of fixtures.entries()){
      Object.assign(guard,f.coordinate);
      const day=daylight(date,f.coordinate.lat,f.coordinate.lng,5),times=sampleTimes(day.start,day.end,900000),observations=[];
      const calculate=(fixture:typeof f,t:number)=>calculateVenueShadowFromBuildings(fixture.seating,new Date(t),fixture.casters,fixture).sunlitAreaPercent;
      let values:number[]=[];
      for(let r=-1;r<5;r++){
        const start=performance.now(),before=process.cpuUsage();values=times.map(t=>calculate(f,t));const cpu=process.cpuUsage(before);
        if(r>=0)observations.push({wallMs:performance.now()-start,cpuMs:(cpu.user+cpu.system)/1000});
      }
      const [midnight]=localDay(date),points=times.map((t,i)=>({t:t-midnight,value:values[i]}));
      const changed=times.map(t=>({t:t-midnight,value:calculate(changedFixtures[index],t)}));
      changedSamples+=changed.filter((p,i)=>p.value!==points[i].value).length;
      rows.push({id:f.id,date,points});edits.push({id:f.id,date,points:changed});
      costs.push({id:f.id,casters:f.casters.length,samples:times.length,observations,wallMs:stats(observations.map(o=>o.wallMs)),cpuMs:stats(observations.map(o=>o.cpuMs))});
    }
    const eligible=fixtures.filter((f,i)=>rows[i].points.some((p,j,a)=>j>0&&(p.value>50)!==(a[j-1].value>50))).sort((a,b)=>a.casters.length-b.casters.length||a.id.localeCompare(b.id));
    const selected=[...new Set([eligible[0],eligible[Math.floor(eligible.length/2)],eligible.at(-1)])].filter((f):f is typeof fixtures[number]=>!!f);
    expect(selected).toHaveLength(3);
    const comparisons=[];
    for(const f of selected){
      Object.assign(guard,f.coordinate);
      const row=rows.find(r=>r.id===f.id)!,cross=row.points.findIndex((p,j,a)=>j>0&&(p.value>50)!==(a[j-1].value>50));
      const [midnight]=localDay(date),center=midnight+(row.points[cross-1].t+row.points[cross].t)/2;
      const start=Math.max(midnight+row.points[0].t,center-900000),end=Math.min(midnight+row.points.at(-1)!.t,center+900000);
      const calculate=(t:number)=>calculateVenueShadowFromBuildings(f.seating,new Date(t),f.casters,f).sunlitAreaPercent;
      const referenceStart=performance.now(),referencePoints=sampleTimes(start,end,250).map(t=>({t,value:calculate(t)})),reference=intervals(referencePoints),referenceWallMs=performance.now()-referenceStart;
      const expected=filterWindows(reference,125,true);
      for(const stepMs of [60000,10000,5000,1000]){
        const observations=[];let run=scanWindow(calculate,start,end,stepMs);
        for(let r=0;r<5;r++){
          const t=performance.now(),before=process.cpuUsage();run=scanWindow(calculate,start,end,stepMs);const cpu=process.cpuUsage(before);
          observations.push({wallMs:performance.now()-t,cpuMs:(cpu.user+cpu.system)/1000});
        }
        const candidate=filterWindows(run.intervals,50,true);
        comparisons.push({id:f.id,date,start,end,stepMs,referencePoints,reference,referenceWallMs,referenceBoundaryErrorMs:125,run,expected,candidate,raw:compareIntervals(reference,run.intervals),filtered:compareIntervals(expected.intervals,candidate.intervals),observations,wallMs:stats(observations.map(o=>o.wallMs))});
      }
    }
    expect(changedSamples).toBeGreaterThan(0);expect(guard.attempts).toBe(0);
    fs.mkdirSync(out,{recursive:true});const write=(name:string,value:unknown)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2),{flag:'wx'});
    write('fixtures.json',{fixtures});write('M06-identical-dataset.json',rows);write('M06-edited-dataset.json',edits);
    write('M06-edited-fixtures.json',{complete:true,attempts:guard.attempts,changedSamples,fixtures:changedFixtures,scope:'Simulated +2m seating edit to captured inputs; actual recomputation'});
    write('captured-cost.json',{costs,comparisons,selection:{eligible:eligible.map(f=>f.id),selected:selected.map(f=>f.id),rule:'Low/median/high caster count among venues with coarse crossings'},limitations:'One date. Clipped 30-minute windows. 250ms sampled reference cannot certify unseen gaps. n=5, no tail estimate or production capacity claim.'});
    write('captured-environment.json',{sourceHashes,captureHashes:artifactHashes(captureDir,['inputs.json','inputs.sql','census.json','census.sql']),capturedAt:capture.capturedAt,measuredAt,node:process.version,offlineAttempts:guard.attempts});
    const cells=[...fixtures.map(f=>f.id+'/'+date),...comparisons.map(c=>`${c.id}/${c.stepMs}`)];
    publishLane(out,'captured-completion.json',{complete:true,offlineAttempts:guard.attempts,cells},['fixtures.json','M06-identical-dataset.json','M06-edited-dataset.json','M06-edited-fixtures.json','captured-cost.json','captured-environment.json'],cells);
  }finally{globalThis.fetch=originalFetch;vi.useRealTimers();}
});
