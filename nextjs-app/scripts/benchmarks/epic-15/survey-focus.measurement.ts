import {it,expect,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {capturedFixtures,type Capture} from './capture-inputs';
import {scanWindow} from './dense-sampling';
import {compareIntervals} from './measurement';
import {calculateVenueShadowFromBuildings} from '../../../lib/solar/shadow-calculation-service';
import {artifactHashes,engineSources,publishLane} from './evidence.mjs';
import {summarizeSurvey} from './survey-report.mjs';
const guard=vi.hoisted(()=>({attempts:0,lat:57.7089,lng:11.9746}));
vi.mock('@/lib/supabase/server',()=>({supabaseServiceRole:new Proxy({}, {get(){guard.attempts++;throw Error('Offline focus');}})}));
vi.mock('../../../lib/solar/solar-calculation-service',async original=>{const actual=await original<typeof import('../../../lib/solar/solar-calculation-service')>();return {...actual,calculateSolarPosition:(d:Date,lat=guard.lat,lng=guard.lng)=>actual.calculateSolarPosition(d,lat,lng)};});
it('checks the twelve shortest captured interior intervals with the unpruned engine at one second',()=>{
  const out=process.env.E15_OUTPUT,root=process.env.E15_EVIDENCE_ROOT;
  if(!out||!root||![out,root].every(path.isAbsolute)||fs.existsSync(out))throw Error('New output and absolute evidence root required');
  const input=path.join(root,'run-12'),summary=summarizeSurvey(input);
  const survey=JSON.parse(fs.readFileSync(path.join(input,'survey.json'),'utf8'));
  const surveyEnv=JSON.parse(fs.readFileSync(path.join(input,'environment.json'),'utf8'));
  expect(artifactHashes(path.join(root,'capture-01'),Object.keys(surveyEnv.captureHashes))).toEqual(surveyEnv.captureHashes);
  expect(artifactHashes(process.cwd(),Object.keys(surveyEnv.sources))).toEqual(surveyEnv.sources);
  const fixtures=capturedFixtures(JSON.parse(fs.readFileSync(path.join(root,'capture-01/inputs.json'),'utf8')) as Capture);
  const candidates=summary.short.filter((r:{interior:boolean})=>r.interior).sort((a:{seconds:number},b:{seconds:number})=>a.seconds-b.seconds).slice(0,12);
  const sources=artifactHashes(process.cwd(),[...engineSources,'scripts/benchmarks/epic-15/survey-focus.measurement.ts','scripts/benchmarks/epic-15/survey-report.mjs','scripts/benchmarks/epic-15/dense-sampling.ts','scripts/benchmarks/epic-15/capture-inputs.ts']);
  const at=new Date().toISOString(),fetch=globalThis.fetch;
  globalThis.fetch=async()=>{guard.attempts++;throw Error('Offline focus');};vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-09-11T12:00:00Z'));
  try{
    const results=[];
    for(const c of candidates){
      const f=fixtures.find(f=>f.id===c.id)!;Object.assign(guard,f.coordinate);
      const cell=survey.cells.find((r:{id:string;date:string})=>r.id===c.id&&r.date===c.date);
      const start=Math.max(cell.support.start,c.start-60000),end=Math.min(cell.support.end,c.end+60000);
      const points:{t:number;value:number}[]=[],begin=performance.now();
      const run=scanWindow(t=>{const value=calculateVenueShadowFromBuildings(f.seating,new Date(t),f.casters,f).sunlitAreaPercent;points.push({t,value});return value;},start,end,1000,1000);
      const reference=cell.reference.result.intervals.filter((r:{start:number;end:number})=>r.end>start&&r.start<end).map((r:{start:number;end:number;sunny:boolean})=>({...r,start:Math.max(start,r.start),end:Math.min(end,r.end)}));
      results.push({candidate:c,start,end,run,points,wallMs:performance.now()-begin,comparison:compareIntervals(reference,run.intervals)});
      console.log(`Focus completed ${results.length}/${candidates.length}`);
    }
    expect(guard.attempts).toBe(0);fs.mkdirSync(out,{recursive:true});
    fs.writeFileSync(path.join(out,'focus.json'),JSON.stringify({selection:'Twelve shortest interior reference intervals below five minutes, or all if fewer. One-second unpruned engine; not physical ground truth.',results}));
    fs.writeFileSync(path.join(out,'environment.json'),JSON.stringify({at,sources,inputHashes:artifactHashes(input,['survey.json','environment.json','completion.json']),captureHashes:artifactHashes(path.join(root,'capture-01'),['inputs.json']),offlineAttempts:guard.attempts},null,2));
    const expected=candidates.map((c:{id:string;date:string;index:number})=>`${c.id}/${c.date}/${c.index}`);
    publishLane(out,'completion.json',{complete:true,offlineAttempts:guard.attempts,cells:expected},['focus.json','environment.json'],expected);
  }finally{globalThis.fetch=fetch;vi.useRealTimers();}
});
