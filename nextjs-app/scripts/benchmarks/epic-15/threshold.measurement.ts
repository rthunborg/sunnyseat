import {it,expect,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {capturedFixtures,type Capture} from './capture-inputs';
import {pruneShadowCasters} from './shadow-broadphase';
import {thresholdScan} from './threshold-sampling';
import {scanWindow} from './dense-sampling';
import {filterWindows} from './window-policy';
import {daylight,compareIntervals,referenceIntervals,type Interval} from './measurement';
import {calculateSolarPosition} from '../../../lib/solar/solar-calculation-service';
import {calculateVenueShadowFromBuildings} from '../../../lib/solar/shadow-calculation-service';
import {artifactHashes,engineSources,publishLane} from './evidence.mjs';
import {summarizeSurvey} from './survey-report.mjs';
const guard=vi.hoisted(()=>({attempts:0,lat:57.7089,lng:11.9746}));
vi.mock('@/lib/supabase/server',()=>({supabaseServiceRole:new Proxy({}, {get(){guard.attempts++;throw Error('Offline threshold study');}})}));
vi.mock('../../../lib/solar/solar-calculation-service',async original=>{const actual=await original<typeof import('../../../lib/solar/solar-calculation-service')>();return {...actual,calculateSolarPosition:(d:Date,lat=guard.lat,lng=guard.lng)=>actual.calculateSolarPosition(d,lat,lng)};});
it('measures threshold probes on captured calibration and held-out dates',()=>{
  const out=process.env.E15_OUTPUT,root=process.env.E15_EVIDENCE_ROOT;
  if(!out||!root||![out,root].every(path.isAbsolute)||fs.existsSync(out))throw Error('New output and absolute evidence root required');
  const read=(d:string,n:string)=>JSON.parse(fs.readFileSync(path.join(root,d,n),'utf8'));
  summarizeSurvey(path.join(root,'run-12'));
  const survey=read('run-12','survey.json'),env=read('run-12','environment.json');
  expect(artifactHashes(path.join(root,'capture-01'),Object.keys(env.captureHashes))).toEqual(env.captureHashes);
  expect(artifactHashes(process.cwd(),Object.keys(env.sources))).toEqual(env.sources);
  const fixtures=capturedFixtures(read('capture-01','inputs.json') as Capture);
  const sources=artifactHashes(process.cwd(),[...engineSources,...['threshold.measurement.ts','threshold-sampling.ts','shadow-broadphase.ts','dense-sampling.ts','window-policy.ts','capture-inputs.ts','survey-report.mjs','evidence.mjs'].map(n=>'scripts/benchmarks/epic-15/'+n)]);
  const at=new Date().toISOString(),fetch=globalThis.fetch;
  globalThis.fetch=async()=>{guard.attempts++;throw Error('Offline threshold study');};vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-09-11T12:00:00Z'));
  try{
    const timed=<T,>(fn:()=>T)=>{const cpu=process.cpuUsage(),begin=performance.now(),result=fn(),usage=process.cpuUsage(cpu);return {result,wallMs:performance.now()-begin,cpuMs:(usage.user+usage.system)/1000,n:1};};
    const evaluateFor=(id:string)=>{const f=fixtures.find(f=>f.id===id)!;Object.assign(guard,f.coordinate);return (t:number)=>{const d=new Date(t),kept=pruneShadowCasters(f.seating,f.casters,calculateSolarPosition(d),f).retained;return calculateVenueShadowFromBuildings(f.seating,d,kept,f).sunlitAreaPercent;};};
    const compare=(ref:Interval[],run:ReturnType<typeof thresholdScan>)=>{const filtered=filterWindows(run.intervals,50,true),referenceFiltered=filterWindows(ref,50,true);return {raw:compareIntervals(ref,run.intervals),filtered:compareIntervals(referenceFiltered.intervals,filtered.intervals),durationComplete:filtered.complete,referenceDurationComplete:referenceFiltered.complete};};
    const calibration=[];
    for(const c of survey.cells){
      const evaluate=evaluateFor(c.id);
      for(const margin of [1,5,10]){
        const measured=timed(()=>thresholdScan(evaluate,c.support.start,c.support.end,margin));
        calibration.push({id:c.id,date:c.date,margin,measured,comparison:compare(c.reference.result.intervals,measured.result)});
      }
      if(calibration.length%126===0)process.stdout.write(`Calibration ${calibration.length}/756 cells\n`);
    }
    const heldOut=[];
    for(const date of ['2026-04-15','2026-08-15'])for(const f of fixtures){
      const evaluate=evaluateFor(f.id),support=daylight(date,f.coordinate.lat,f.coordinate.lng,5);
      const reference=timed(()=>referenceIntervals(evaluate,support.start,support.end));
      const measured=timed(()=>thresholdScan(evaluate,support.start,support.end,5));
      heldOut.push({id:f.id,date,support,reference,measured,comparison:compare(reference.result.intervals,measured.result)});
      if(heldOut.length%14===0)process.stdout.write(`Held-out ${heldOut.length}/84 days\n`);
    }
    const paired=[];
    // Original caster-stratum examples, plus the observed no-gap regression.
    for(const id of ['34','8','47','49']){
      const date=id==='49'?'2026-10-25':'2026-09-22',c=survey.cells.find((c:{id:string;date:string})=>c.id===id&&c.date===date),evaluate=evaluateFor(id);
      for(let repetition=-1;repetition<3;repetition++){
        for(const method of repetition%2===0?['base','threshold']:['threshold','base']){
          const run=timed(()=>method==='base'?scanWindow(evaluate,c.support.start,c.support.end,300000):thresholdScan(evaluate,c.support.start,c.support.end,5));
          paired.push({id,date,repetition,method,...run});
        }
      }
    }
    expect(calibration).toHaveLength(756);expect(heldOut).toHaveLength(84);expect(paired).toHaveLength(32);expect(guard.attempts).toBe(0);
    fs.mkdirSync(out,{recursive:true});
    fs.writeFileSync(path.join(out,'threshold.json'),JSON.stringify({calibration,heldOut,paired,scope:'Five percentage-point margin preselected for held-out dates; 1/10pp sensitivity comparisons. 60s interior probes, 100ms detected boundary brackets. All timings are fresh engine evaluations with benchmark-only spatial pruning; no shared exposure cache across methods. Not certified continuous.'}));
    fs.writeFileSync(path.join(out,'environment.json'),JSON.stringify({at,sources,captureHashes:env.captureHashes,surveyHashes:artifactHashes(path.join(root,'run-12'),['survey.json','environment.json','completion.json']),offlineAttempts:guard.attempts},null,2));
    const expected=[...survey.cells.flatMap((c:{id:string;date:string})=>[1,5,10].map(m=>`cal/${c.id}/${c.date}/${m}`)),...fixtures.flatMap(f=>['2026-04-15','2026-08-15'].map(d=>`held/${f.id}/${d}`)),...['34','8','47','49'].flatMap(id=>[-1,0,1,2].flatMap(r=>['base','threshold'].map(m=>`paired/${id}/${r}/${m}`)))];
    const cells=[...calibration.map(c=>`cal/${c.id}/${c.date}/${c.margin}`),...heldOut.map(c=>`held/${c.id}/${c.date}`),...paired.map(c=>`paired/${c.id}/${c.repetition}/${c.method}`)];
    publishLane(out,'completion.json',{complete:true,offlineAttempts:guard.attempts,cells},['threshold.json','environment.json'],expected);
  }finally{globalThis.fetch=fetch;vi.useRealTimers();}
});
