import { it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fixtures, origin } from '../../../test/fixtures/epic-15/geometries';
import { calculateVenueShadowFromBuildings } from '../../../lib/solar/shadow-calculation-service';
import { daylight, sampleTimes, seasonDates } from './measurement';
import { expectedStrategyCells,validateStrategyEvidence,strategyIdentity,artifactHashes,engineSources,jsonHash,validateLaneCompletion,mainArtifacts } from './evidence.mjs';
const guard=vi.hoisted(()=>({attempts:0}));
vi.mock('@/lib/supabase/server',()=>({supabaseServiceRole:new Proxy({}, {get(){guard.attempts++;throw Error('No DB access');}})}));
vi.mock('../../../lib/solar/solar-calculation-service',async importOriginal=>{
  const actual=await importOriginal<typeof import('../../../lib/solar/solar-calculation-service')>();
  return {...actual,calculateSolarPosition:(d:Date,lat=57.7089,lng=11.9746)=>actual.calculateSolarPosition(d,lat,lng)};
});
it('measures synthetic full-season and staging strategies without publication',()=>{
  const out=process.env.E15_OUTPUT;
  if(!out||!path.isAbsolute(out))throw Error('E15_OUTPUT required');
  const main=process.env.E15_MAIN_INPUT??out;
  const read=(name:string)=>JSON.parse(fs.readFileSync(path.join(main,name),'utf8'));
  const inputs=read('fixtures.json').fixtures,mainSeason=read('M01-season.json');
  const completion=read('completion.json');
  validateLaneCompletion(completion,artifactHashes(main,mainArtifacts),inputs.flatMap((f:{id:string})=>['2026-03-01','2026-03-29','2026-06-21','2026-09-22','2026-10-25','2026-10-31','2026-12-21'].map(d=>`${f.id}/${d}`)));
  const identity=strategyIdentity(inputs,read('environment.json'),mainSeason);
  if(jsonHash(fixtures)!==identity.fixturesHash||jsonHash(artifactHashes(process.cwd(),engineSources))!==jsonHash(identity.engineHashes)||jsonHash(origin)!==jsonHash(identity.coordinate))throw Error('Loaded strategy inputs differ from main run');
  fs.mkdirSync(out,{recursive:true});
  const target=path.join(out,'M05-strategies.json');
  if(fs.existsSync(target))throw Error('Refusing evidence overwrite');
  const season=seasonDates(2026).map(date=>{const d=daylight(date,origin.lat,origin.lng,5);return {date,times:sampleTimes(d.start,d.end,900000)};});
  expect(season.map(d=>({date:d.date,times:d.times}))).toEqual(mainSeason.map((d:{date:string;start:number;end:number})=>({date:d.date,times:sampleTimes(d.start,d.end,900000)})));
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>{guard.attempts++;throw Error('Offline strategy measurement');};
  const records:unknown[]=[];
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-09-10T12:00:00Z'));
  try {
    for(const fixture of fixtures) {
      const selections={full:season,remaining:season.filter(d=>d.date>='2026-09-10'),rolling:season.filter(d=>d.date>='2026-09-10'&&d.date<='2026-09-14'),repair:season.filter(d=>d.date==='2026-09-10')};
      for(const [strategy,days] of Object.entries(selections)) {
        const before=process.cpuUsage(),start=performance.now();let count=0;let checksum=0;
        for(const d of days)for(const t of d.times){const result=calculateVenueShadowFromBuildings(fixture.seating,new Date(t),fixture.casters,fixture);checksum+=result.sunlitAreaPercent;count++;}
        const cpu=process.cpuUsage(before);
        records.push({fixture:fixture.id,strategy,dates:days.length,samples:count,checksum,wallMs:performance.now()-start,cpuMs:(cpu.user+cpu.system)/1000,rssBytes:process.memoryUsage().rss,n:1,p95:null});
      }
      fs.writeFileSync(target+'.incomplete',JSON.stringify({complete:false,records,attempts:guard.attempts},null,2));
    }
    expect(guard.attempts).toBe(0);
    const evidence={complete:true,identity,mainArtifacts:completion.artifacts,status:'MEASURED SYNTHETIC; base quarter-hours + edges ONLY',coordinate:origin,concurrency:1,adaptiveCost:'Not included',currentInventory:'BLOCKED',records,attempts:guard.attempts};
    validateStrategyEvidence(evidence,expectedStrategyCells(fixtures.map(f=>f.id),season.map(d=>({date:d.date,count:d.times.length}))),identity);
    fs.writeFileSync(target+'.tmp',JSON.stringify(evidence,null,2),{flag:'wx'});
    fs.renameSync(target+'.tmp',target);
  }finally{globalThis.fetch=originalFetch;vi.useRealTimers();}
});
