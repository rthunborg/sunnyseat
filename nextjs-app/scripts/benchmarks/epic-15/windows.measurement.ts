import {it,expect,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {fixtures,elevatedFixtures,origin} from '../../../test/fixtures/epic-15/geometries';
import {calculateVenueShadowFromBuildings} from '../../../lib/solar/shadow-calculation-service';
import {filterWindows} from './window-policy';
import {intervals,compareIntervals,samplePolicy,daylight,requiredDates,seasonDates,stats,type Interval} from './measurement';
import {artifactHashes,engineSources,jsonHash,mainArtifacts,edgeArtifacts,validateLaneCompletion,publishLane,scoreComparison} from './evidence.mjs';
const guard=vi.hoisted(()=>({attempts:0}));
vi.mock('@/lib/supabase/server',()=>({supabaseServiceRole:new Proxy({}, {get(){guard.attempts++;throw Error('Offline window benchmark');}})}));
vi.mock('../../../lib/solar/solar-calculation-service',async importOriginal=>{
  const actual=await importOriginal<typeof import('../../../lib/solar/solar-calculation-service')>();
  return {...actual,calculateSolarPosition:(d:Date,lat=57.7089,lng=11.9746)=>actual.calculateSolarPosition(d,lat,lng)};
});
type Run=ReturnType<typeof samplePolicy>;
it('measures the accepted minimum-window policy without changing runtime',()=>{
  const out=process.env.E15_OUTPUT,main=process.env.E15_MAIN_INPUT;
  if(!out||!main||!path.isAbsolute(out)||!path.isAbsolute(main)||out===main)throw Error('New absolute output and existing main input required');
  if(fs.existsSync(out))throw Error('Refusing evidence directory reuse');
  const read=<T,>(name:string):T=>JSON.parse(fs.readFileSync(path.join(main,name),'utf8'));
  const mainCompletion=read<{artifacts:Record<string,string>;cells:string[]}>('completion.json');
  validateLaneCompletion(mainCompletion,artifactHashes(main,mainArtifacts),fixtures.flatMap(f=>requiredDates.map(d=>`${f.id}/${d}`)));
  const edgeCompletion=read<{artifacts:Record<string,string>;cells:string[]}>('edges-completion.json');
  const solar=read<{date:string;lat:number;horizon:number;roots:{t:number}[]}[]>('M01-solar.json');
  const edgeCells=[...requiredDates.flatMap(d=>[.1,.4,2].map(g=>`slit/${d}/${g}`)),...solar.filter(r=>r.lat===origin.lat&&r.horizon===5&&requiredDates.includes(r.date)).flatMap(r=>r.roots.flatMap(root=>[-1000,0,1000].map(delta=>`edge/${r.date}/${root.t}/${delta}`))),...elevatedFixtures.flatMap(f=>requiredDates.map(d=>`${f.id}/${d}`))];
  validateLaneCompletion(edgeCompletion,artifactHashes(main,edgeArtifacts),edgeCells);
  const environment=read<{sourceHashes:Record<string,string>}>('environment.json');
  expect(artifactHashes(process.cwd(),engineSources)).toEqual(Object.fromEntries(engineSources.map(n=>[n,environment.sourceHashes['nextjs-app/'+n]])));
  expect(read<{fixtures:unknown}>('fixtures.json').fixtures).toEqual(fixtures);
  const sourceHashes=artifactHashes(process.cwd(),['scripts/benchmarks/epic-15/window-policy.ts','scripts/benchmarks/epic-15/windows.measurement.ts','scripts/benchmarks/epic-15/window-report.mjs','test/unit/benchmarks/epic-15/window-policy.test.ts','test/fixtures/epic-15/geometries.ts',...engineSources]);
  fs.mkdirSync(out,{recursive:true});
  const write=(name:string,value:unknown)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2),{flag:'wx'});
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>{guard.attempts++;throw Error('Offline window benchmark');};
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-09-10T12:00:00Z'));
  try{
    const ledger:unknown[]=[];
    const filterTimes:number[]=[];
    const processCell=(id:string,reference:Interval[],referenceErrorMs:number,runs:Run[])=>{
      const expected=filterWindows(reference,referenceErrorMs,true);
      for(const run of runs){
        // 500 ms bounds only the bisected detected crossing. It does not bound
        // undiscovered transitions; comparisons retain those failures explicitly.
        const actual=filterWindows(intervals(run.points),500,run.verified);
        const comparison=compareIntervals(expected.intervals,actual.intervals);
        ledger.push({id,policy:run.policy,reference:expected,candidate:actual,comparison,result:scoreComparison(comparison,[...run.failures,...(!expected.complete||!actual.complete?['duration-unresolved']:[])])});
      }
      for(let r=-5;r<30;r++){
        const start=performance.now();let checksum=0;
        for(let i=0;i<1000;i++)checksum+=filterWindows(reference,referenceErrorMs,true).windows.length;
        if(r>=0)filterTimes.push((performance.now()-start)/1000);
        expect(checksum).toBe(expected.windows.length*1000);
      }
    };
    for(const c of read<{fixture:string;date:string;referenceIntervals:Interval[];runs:Run[]}[]>('M02-M03-geometry.json'))processCell(`${c.fixture}/${c.date}`,c.referenceIntervals,50,c.runs);
    for(const c of read<{fixture:string;date:string;reference:{intervals:Interval[]};candidates:Run[]}[]>('M02-elevated.json'))processCell(`${c.fixture}/${c.date}`,c.reference.intervals,50,c.candidates);
    for(const c of read<{date:string;gapMetres:number;reference:Interval[];candidates:Run[]}[]>('M02-physical-slits.json'))processCell(`slit/${c.date}/${c.gapMetres}`,c.reference,500,c.candidates);
    expect(ledger).toHaveLength(315);
    const signals=[299,300,301].map(seconds=>({id:`duration-${seconds}`,reference:[{start:0,end:10000,sunny:false},{start:10000,end:10000+seconds*1000,sunny:true},{start:10000+seconds*1000,end:400000,sunny:false}]}));
    signals.push({id:'missed-shade-gap',reference:[{start:0,end:290000,sunny:true},{start:290000,end:300000,sunny:false},{start:300000,end:590000,sunny:true}]});
    const analytic=signals.map(s=>{
      const end=s.reference.at(-1)!.end,f=(t:number)=>s.reference.find(r=>t>=r.start&&t<r.end)?.sunny?100:0;
      const expected=filterWindows(s.reference,0,true);
      return {id:s.id,scope:'analytic signal, not physical caster measurement',expected,candidates:(['endpoints','midpoint','minute'] as const).map(policy=>{
        const run=samplePolicy(f,0,end,policy),actual=filterWindows(intervals(run.points),500,run.verified);
        return {policy,actual,comparison:compareIntervals(expected.intervals,actual.intervals)};
      })};
    });
    const cost=[];
    for(const fixture of [fixtures[2],fixtures[3],elevatedFixtures[0]])for(const date of requiredDates){
      const d=daylight(date,origin.lat,origin.lng,5),observations=[];
      for(let r=-1;r<5;r++){
        const start=performance.now(),before=process.cpuUsage();
        const sampled=samplePolicy(t=>calculateVenueShadowFromBuildings(fixture.seating,new Date(t),fixture.casters,fixture).sunlitAreaPercent,d.start,d.end,'minute');
        const filtered=filterWindows(intervals(sampled.points),500,sampled.verified),usage=process.cpuUsage(before);
        if(r>=0)observations.push({wallMs:performance.now()-start,cpuMs:(usage.user+usage.system)/1000,samples:sampled.points.length,complete:filtered.complete,failures:sampled.failures});
      }
      cost.push({fixture:fixture.id,date,n:5,warmups:1,observations,wallMs:stats(observations.map(r=>r.wallMs)),cpuMs:stats(observations.map(r=>r.cpuMs))});
    }
    const fullFixture=elevatedFixtures[0],fullStart=performance.now(),fullBefore=process.cpuUsage(),fullDates=[];
    for(const date of seasonDates(2026)){
      const d=daylight(date,origin.lat,origin.lng,5);
      const sampled=samplePolicy(t=>calculateVenueShadowFromBuildings(fullFixture.seating,new Date(t),fullFixture.casters,fullFixture).sunlitAreaPercent,d.start,d.end,'minute');
      const filtered=filterWindows(intervals(sampled.points),500,sampled.verified);
      fullDates.push({date,samples:sampled.points.length,failures:sampled.failures,complete:filtered.complete});
    }
    const fullUsage=process.cpuUsage(fullBefore);
    const fullSeason={fixture:fullFixture,n:1,p95:null,dates:fullDates,wallMs:performance.now()-fullStart,cpuMs:(fullUsage.user+fullUsage.system)/1000};
    expect(fullDates.map(d=>d.date)).toEqual(seasonDates(2026));
    expect(guard.attempts).toBe(0);
    write('M03-window-policy.json',ledger);write('M07-window-analytic.json',analytic);
    write('M05-window-cost.json',{cost,fullSeason,filterOnly:{n:filterTimes.length,batchSize:1000,perCallWallMs:stats(filterTimes),raw:filterTimes},limitations:'Synthetic only. Daily n=5 p95 is descriptive, not a stable tail estimate. Full-season n=1 excludes database/scheduler/concurrency. Completion does not prove discovery. No production budgets.'});
    write('window-environment.json',{sourceHashes,mainArtifacts:mainCompletion.artifacts,edgeArtifacts:edgeCompletion.artifacts,fixtureHash:jsonHash(fixtures),ownerDecisionSha256:artifactHashes(path.resolve('..'),['_bmad-output/planning-artifacts/decisions/epic-15-owner-policy-2026-09-10.md']),offlineAttempts:guard.attempts,node:process.version,selectedMain:main,scope:'Existing engine references reanalysed; new synthetic adaptive/filter CPU measurements. No database or provider calls.'});
    const cells=[...fixtures.flatMap(f=>requiredDates.map(d=>`${f.id}/${d}`)),...elevatedFixtures.flatMap(f=>requiredDates.map(d=>`${f.id}/${d}`)),...requiredDates.flatMap(d=>[.1,.4,2].map(g=>`slit/${d}/${g}`))];
    publishLane(out,'window-completion.json',{complete:true,offlineAttempts:guard.attempts,cells},['M03-window-policy.json','M07-window-analytic.json','M05-window-cost.json','window-environment.json'],cells);
  }finally{globalThis.fetch=originalFetch;vi.useRealTimers();}
});
