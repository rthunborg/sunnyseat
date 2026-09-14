import {it,expect,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {capturedFixtures,type Capture} from './capture-inputs';
import {pruneShadowCasters} from './shadow-broadphase';
import {scanWindow} from './dense-sampling';
import {filterWindows} from './window-policy';
import {daylight,compareIntervals,referenceIntervals,sampleTimes,seasonDates,intervals,type Point} from './measurement';
import {calculateSolarPosition} from '../../../lib/solar/solar-calculation-service';
import {calculateVenueShadowFromBuildings} from '../../../lib/solar/shadow-calculation-service';
import {artifactHashes,engineSources,publishLane} from './evidence.mjs';
const guard=vi.hoisted(()=>({attempts:0,lat:57.7089,lng:11.9746}));
vi.mock('@/lib/supabase/server',()=>({supabaseServiceRole:new Proxy({}, {get(){guard.attempts++;throw Error('Offline survey');}})}));
vi.mock('../../../lib/solar/solar-calculation-service',async original=>{const actual=await original<typeof import('../../../lib/solar/solar-calculation-service')>();return {...actual,calculateSolarPosition:(d:Date,lat=guard.lat,lng=guard.lng)=>actual.calculateSolarPosition(d,lat,lng)};});
it('surveys captured venues across six season dates without publishing partial results',()=>{
  const out=process.env.E15_OUTPUT,root=process.env.E15_EVIDENCE_ROOT;
  if(!out||!root||![out,root].every(path.isAbsolute)||fs.existsSync(out))throw Error('New output and absolute evidence root required');
  const capture=JSON.parse(fs.readFileSync(path.join(root,'capture-01/inputs.json'),'utf8')) as Capture;
  const fixtures=capturedFixtures(capture);
  const prior=JSON.parse(fs.readFileSync(path.join(root,'run-09/environment.json'),'utf8'));
  expect(artifactHashes(path.join(root,'capture-01'),Object.keys(prior.captureHashes))).toEqual(prior.captureHashes);
  expect(artifactHashes(process.cwd(),Object.keys(prior.sourceHashes))).toEqual(prior.sourceHashes);
  const sources=artifactHashes(process.cwd(),[...engineSources,...['survey.measurement.ts','shadow-broadphase.ts','dense-sampling.ts','window-policy.ts','capture-inputs.ts'].map(n=>'scripts/benchmarks/epic-15/'+n)]);
  const dates=['2026-03-01','2026-03-29','2026-06-21','2026-09-22','2026-10-25','2026-10-31'];
  const at=new Date().toISOString(),fetch=globalThis.fetch;
  globalThis.fetch=async()=>{guard.attempts++;throw Error('Offline survey');};vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-09-11T12:00:00Z'));
  try{
    const cells=[];
    for(const date of dates){
      for(const f of fixtures){
        Object.assign(guard,f.coordinate);const support=daylight(date,f.coordinate.lat,f.coordinate.lng,5);
        const evaluate=(t:number)=>{const d=new Date(t),kept=pruneShadowCasters(f.seating,f.casters,calculateSolarPosition(d),f).retained;return calculateVenueShadowFromBuildings(f.seating,d,kept,f).sunlitAreaPercent;};
        const timed=<T,>(fn:()=>T)=>{const cpu=process.cpuUsage(),begin=performance.now(),result=fn(),usage=process.cpuUsage(cpu);return {result,wallMs:performance.now()-begin,cpuMs:(usage.user+usage.system)/1000,n:1};};
        const reference=timed(()=>referenceIntervals(evaluate,support.start,support.end));
        const map=new Map(reference.result.points.map(p=>[p.t,p.value]));
        const grid=sampleTimes(support.start,support.end,300000);
        const plainPoints=grid.map(t=>{const value=map.get(t);if(value===undefined)throw Error('Missing reference grid value');return {t,value};});
        const plain=intervals(plainPoints),points:Point[]=[];
        const refined=timed(()=>scanWindow(t=>{const value=evaluate(t);points.push({t,value});return value;},support.start,support.end,300000));
        cells.push({id:f.id,date,support,reference,plainPoints,plain,refined,points,
          plainComparison:compareIntervals(reference.result.intervals,plain),refinedComparison:compareIntervals(reference.result.intervals,refined.result.intervals),
          referenceFiltered:filterWindows(reference.result.intervals,50,true),refinedFiltered:filterWindows(refined.result.intervals,50,true)});
      }
      console.log(`Survey completed ${date}: ${cells.length}/252 venue-days`);
    }
    const season=fixtures.map(f=>({id:f.id,days:seasonDates(2026).map(date=>{const d=daylight(date,f.coordinate.lat,f.coordinate.lng,5);return {date,samples:sampleTimes(d.start,d.end,300000).length};})}));
    expect(fixtures).toHaveLength(42);expect(cells).toHaveLength(252);expect(guard.attempts).toBe(0);
    fs.mkdirSync(out,{recursive:true});
    fs.writeFileSync(path.join(out,'survey.json'),JSON.stringify({dates,cells,season,scope:'Captured geometry replay; minute reference can miss sub-minute intervals. Timings n=1 with benchmark-only spatial pruning. Season sample counts do not measure season computation.'}));
    fs.writeFileSync(path.join(out,'environment.json'),JSON.stringify({at,sources,captureHashes:prior.captureHashes,offlineAttempts:guard.attempts},null,2));
    const expected=fixtures.flatMap(f=>dates.map(d=>`${f.id}/${d}`));
    publishLane(out,'completion.json',{complete:true,offlineAttempts:guard.attempts,cells:cells.map(c=>`${c.id}/${c.date}`)},['survey.json','environment.json'],expected);
  }finally{globalThis.fetch=fetch;vi.useRealTimers();}
});
