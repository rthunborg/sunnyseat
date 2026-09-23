import { it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {publishLane,mainArtifacts} from './evidence.mjs';
import { fixtures, origin } from '../../../test/fixtures/epic-15/geometries';
import { calculateVenueShadowFromBuildings } from '../../../lib/solar/shadow-calculation-service';
import { calculateSolarPosition } from '../../../lib/solar/solar-calculation-service';
import { convertUtcToStockholm, convertStockholmToUtc } from '../../../lib/solar/timezone-utils';
import { daylight, localDay, localKey, sampleTimes, seasonDates, planSeason, requiredDates, samplePolicy, intervals, referenceIntervals as oracle, compareIntervals, encode, decode, decodeJson, decodeArrays, stats, type Point, type Policy } from './measurement';

const guards = vi.hoisted(()=>({attempts:0,coordinates:null as null | {lat:number;lng:number}}));
vi.mock('@/lib/supabase/server',()=>({supabaseServiceRole:new Proxy({}, {get(){guards.attempts++;throw Error('Offline benchmark attempted database access');}})}));
vi.mock('../../../lib/solar/solar-calculation-service', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../lib/solar/solar-calculation-service')>();
  return {...actual,calculateSolarPosition:(date:Date,lat?:number,lng?:number)=>actual.calculateSolarPosition(date,lat ?? guards.coordinates?.lat,lng ?? guards.coordinates?.lng)};
});
const hash = (data:string|Buffer)=>createHash('sha256').update(data).digest('hex');
const policies: Policy[] = ['endpoints','midpoint','minute'];

it('records offline measurement evidence without asserting candidate success', () => {
  const out = process.env.E15_OUTPUT;
  if (!out || !path.isAbsolute(out)) throw Error('Set E15_OUTPUT to a new absolute evidence directory');
  fs.mkdirSync(out,{recursive:true});
  if (fs.existsSync(path.join(out,'environment.json'))) throw Error('Evidence directory already contains a run; choose a new directory');
  const write = (name:string,data:unknown)=>fs.writeFileSync(path.join(out,name),JSON.stringify(data,null,2)+'\n');
  const started = new Date().toISOString();
  const root = path.resolve('..');
  const sources = ['AGENTS.md','project-context.md','nextjs-app/package-lock.json','.codex/config.toml',
    'nextjs-app/test/unit/services/direct-sun-documentation-contract.test.ts',
    ...['solar-calculation-service.ts','solar-math.ts','shadow-calculation-service.ts','shadow-geometry.ts','timezone-utils.ts','constants.ts'].map(n=>'nextjs-app/lib/solar/'+n),
    ...['measurement.ts','run.measurement.ts','vitest.config.ts'].map(n=>'nextjs-app/scripts/benchmarks/epic-15/'+n),
    'nextjs-app/test/fixtures/epic-15/geometries.ts',
    ...['prd.md','architecture.md','epics.md','implementation-readiness-report-2026-09-10-epic-15.md'].map(n=>'_bmad-output/planning-artifacts/'+n)];
  const lock = JSON.parse(fs.readFileSync('package-lock.json','utf8'));
  write('environment.json',{started,head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
    dirty:execFileSync('git',['status','--short'],{cwd:root,encoding:'utf8'}),
    sourceHashes:Object.fromEntries(sources.map(n=>[n,hash(fs.readFileSync(path.join(root,n)))])),
    node:process.version,versions:process.versions,platform:os.platform(),release:os.release(),cpu:os.cpus()[0],logicalCpus:os.cpus().length,ramBytes:os.totalmem(),
    dependencies:Object.fromEntries(['@turf/turf','date-fns-tz','date-fns','vitest','typescript'].map(n=>[n,lock.packages['node_modules/'+n]?.version])),
    command:'npx vitest run --config scripts/benchmarks/epic-15/vitest.config.ts',
    clock:'Date frozen at 2026-09-10T12:00:00Z; performance/process.cpuUsage real',seed:151,order:'fixture order rotated per repetition',warmups:5,repetitions:30,concurrency:1,
    reference:'1-minute grid plus exact supported edges; engine-bisected detected crossings <=1 second. Sub-minute blind spots remain.',
    database:'separate SQL lane; no database or provider calls in this process'});
  write('fixtures.json',{provenance:'synthetic generated 2026-09-10; no field-accuracy claim',hash:hash(JSON.stringify(fixtures)),fixtures,
    actualInventory:{status:'BLOCKED',nonDeleted:null,hidden:null,public:null,reason:'No captured current authorized inventory with resolved casters found locally; 42 is historical public cohort, not observed current total.'}});
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async()=>{guards.attempts++;throw Error('Offline benchmark attempted network');};
  vi.useFakeTimers({toFake:['Date']}); vi.setSystemTime(new Date('2026-09-10T12:00:00Z'));
  try {
    const rollover=['2026-11-15T12:00:00Z','2026-12-15T12:00:00Z'].map(request=>{
      const plan=planSeason(request,2027);
      const expected=Array.from({length:245},(_,i)=>new Date(Date.UTC(2027,2,1,12)+i*86400000).toISOString().slice(0,10));
      expect(plan.dates).toEqual(expected);
      expect(plan.dates).not.toContain('2027-02-28');expect(plan.dates).not.toContain('2027-11-01');
      expect(plan.requestLocalDate.startsWith('2026')).toBe(true);
      return {...plan,expectedDates:expected,exclusions:['2027-02-28','2027-11-01'],assertions:'PASS',scope:'benchmark explicit-year request; no application planner or publication changes'};
    });
    write('M01-rollover.json',rollover);
    const solar = [];
    for (const coord of [origin,{lat:57.68,lng:11.93},{lat:57.74,lng:12.03}]) {
      for (const date of [...requiredDates,'2026-02-28','2026-11-01','2027-03-01']) {
        for (const horizon of [0,5]) {
          const d = daylight(date,coord.lat,coord.lng,horizon);
          const times = sampleTimes(d.start,d.end,900000);
          solar.push({...d,coordinateProvenance:'synthetic coordinate control',durationMinutes:(d.end-d.start)/60000,
            baseAndEdgeCount:times.length,regularCount:times.filter(t=>t%900000===0).length,
            roots:d.roots.map(r=>({...r,utc:new Date(r.t).toISOString(),local:localKey(r.t),roundTrip:Date.parse(localKey(r.t))===r.t,
              repositoryRoundTrip:convertStockholmToUtc(convertUtcToStockholm(new Date(r.t))).getTime()===r.t,
              before:calculateSolarPosition(new Date(r.t-1000),coord.lat,coord.lng).elevation,
              after:calculateSolarPosition(new Date(r.t+1000),coord.lat,coord.lng).elevation}))});
        }
      }
    }
    write('M01-solar.json',solar);
    write('M01-dst.json',['2026-03-29T00:30:00Z','2026-03-29T01:30:00Z','2026-10-25T00:30:00Z','2026-10-25T01:30:00Z'].map(s=>({utc:s,local:localKey(Date.parse(s)),offsetRoundTrip:Date.parse(localKey(Date.parse(s)))===Date.parse(s),repositoryLossyRoundTrip:convertStockholmToUtc(convertUtcToStockholm(new Date(s))).toISOString()})));
    const season = seasonDates(2026).map(date=>{const d=daylight(date,origin.lat,origin.lng,5);return {...d,count:sampleTimes(d.start,d.end,900000).length,minuteCount:sampleTimes(d.start,d.end,60000).length};});
    write('M01-season.json',season);
    const geometry: {fixture:string;date:string;[key:string]:unknown}[] = [], deltas: unknown[] = [], sqlRows: {id:string;date:string;points:Point[]}[] = [];
    for (const fixture of fixtures) {
      const inputHash=hash(JSON.stringify(fixture));
      for (const date of requiredDates) {
        const d=daylight(date,origin.lat,origin.lng,5);
        const engine=(t:number)=>calculateVenueShadowFromBuildings(fixture.seating,new Date(t),fixture.casters,fixture).sunlitAreaPercent;
        guards.coordinates=origin;
        const reference=oracle(engine,d.start,d.end);
        const referenceIntervals=reference.intervals;
        const runs=policies.map(policy=>{
          const actual=samplePolicy(engine,d.start,d.end,policy);
          const actualIntervals=intervals(actual.points);
          return {...actual,intervals:actualIntervals,comparison:compareIntervals(referenceIntervals,actualIntervals)};
        });
        guards.coordinates=null;
        const [dayStart,dayEnd]=localDay(date);
        const baseline=sampleTimes(dayStart,dayEnd-1,900000).map(t=>({t,value:engine(t)}));
        const quarterHourDifferences=[];
        for (const b of baseline) {
          guards.coordinates=origin;
          const matched=engine(b.t);
          const candidate=calculateSolarPosition(new Date(b.t),origin.lat,origin.lng).elevation>=5?matched:0;
          if (matched!==candidate || b.value!==matched) {
            const delta={fixture:fixture.id,date,t:b.t,utc:new Date(b.t).toISOString(),inputHash,baseline:b.value,matchedCoordinate:matched,candidate,
              coordinateDelta:matched-b.value,horizonDelta:candidate-matched};
            deltas.push(delta);quarterHourDifferences.push(delta);
          }
        }
        geometry.push({fixture:fixture.id,inputHash,date,coordinateMode:'explicit synthetic origin',reference,referenceIntervals,runs,baseline,quarterHourDifferences});
        sqlRows.push({id:fixture.id,date,points:runs[2].points.map(p=>({t:p.t-dayStart,value:p.value}))});
      }
      console.log(`M02 completed ${fixture.id}`);
    }
    write('M02-M03-geometry.json',geometry);write('M04-low-angle-deltas.json',deltas);
    write('M06-identical-dataset.json',sqlRows);
    const adversaries=[
      {id:'12:06-12:09',f:(t:number)=>t>=360000&&t<540000?100:0,edges:[360000,540000]},
      {id:'off-centre-12:01-12:02',f:(t:number)=>t>=60000&&t<120000?100:0,edges:[60000,120000]},
      {id:'sub-minute-12:01:10-12:01:20',f:(t:number)=>t>=70000&&t<80000?100:0,edges:[70000,80000]},
      {id:'interior-shade',f:(t:number)=>t>=60000&&t<120000?0:100,edges:[60000,120000]},
      {id:'multiple-runs',f:(t:number)=>(t>=60000&&t<120000)||(t>=400000&&t<430000)?100:0,edges:[60000,120000,400000,430000]},
    ];
    write('M03-adversaries.json',adversaries.map(a=>{
      const edges=[0,...a.edges,900000];
      const exact=edges.slice(1).map((end,i)=>({start:edges[i],end,sunny:a.f((edges[i]+end)/2)>50}));
      return {id:a.id,provenance:'analytic signal; not claimed to be physical caster geometry',exact,runs:policies.map(p=>{const r=samplePolicy(a.f,0,900000,p);return {...r,comparison:compareIntervals(exact,intervals(r.points))};})};
    }));
    write('M03-limits.json',[{maxSamples:1},{maxDepth:0},{maxMs:0},{rootIterations:0}].map(limit=>({limit,result:samplePolicy(t=>t>400000?100:0,0,900000,'minute',limit)})));
    write('M03-trigger-boundaries.json',[9.999,10,10.001].map(delta=>({delta,result:samplePolicy(t=>20+delta*t/900000,0,900000,'endpoints')})));
    const cpu: {fixture:string;repetition:number;warmup:boolean;wallMs:number;cpuMs:number;rssBytes:number;samples:number}[]=[];
    const cpuDate=daylight('2026-09-22',origin.lat,origin.lng,5);
    const cpuTimes=sampleTimes(cpuDate.start,cpuDate.end,900000);
    for(let repetition=-5;repetition<30;repetition++) {
      for(let index=0;index<fixtures.length;index++) {
        const fixture=fixtures[(index+repetition+fixtures.length)%fixtures.length];
        guards.coordinates=origin;
        const before=process.cpuUsage(),start=performance.now();
        for(const t of cpuTimes) calculateVenueShadowFromBuildings(fixture.seating,new Date(t),fixture.casters,fixture);
        const usage=process.cpuUsage(before);
        cpu.push({fixture:fixture.id,repetition,warmup:repetition<0,wallMs:performance.now()-start,cpuMs:(usage.user+usage.system)/1000,rssBytes:process.memoryUsage().rss,samples:cpuTimes.length});
      }
    }
    write('M05-cpu-raw.json',cpu);
    write('M05-cpu-summary.json',fixtures.map(f=>{const rows=cpu.filter(c=>c.fixture===f.id&&!c.warmup);return {fixture:f.id,provenance:'SYNTHETIC',casters:f.casters.length,vertices:f.casters.reduce((n,c)=>n+c.geometry.coordinates.flat().length,0),wallMs:stats(rows.map(r=>r.wallMs)),cpuMs:stats(rows.map(r=>r.cpuMs)),rssBytes:stats(rows.map(r=>r.rssBytes)),samples:cpuTimes.length};}));
    const count=season.reduce((n,d)=>n+d.count,0),remaining=season.filter(d=>d.date>='2026-09-10');
    const syntheticMeanPerSample=cpu.filter(r=>!r.warmup).reduce((n,r)=>n+r.cpuMs,0)/(30*fixtures.length*cpuTimes.length);
    write('M05-M07-projections.json',{status:'EXTRAPOLATED',assumptions:'Equal synthetic fixture mixture; quarter-hour+edge only; excludes adaptive, DB, retries and concurrency. NOT observed venue inventory or operational budgets.',
      seasonDates:season.length,seasonSamplesPerVenue:count,remainingDates:remaining.length,remainingSamples:remaining.reduce((n,d)=>n+d.count,0),missingHistoricalDates:season.filter(d=>d.date<'2026-09-10').map(d=>d.date),
      stagingCompleteness:remaining.length/season.length,publicationCompleteness:1,
      scenarios:[50,100,500].map(venues=>({venues,samples:venues*count,cpuSeconds:venues*count*syntheticMeanPerSample/1000})),
      strategies:{rollingFiveDateSamples:season.filter(d=>d.date>='2026-09-10'&&d.date<='2026-09-14').reduce((n,d)=>n+d.count,0),fullSeasonSamples:count,remainingSamples:remaining.reduce((n,d)=>n+d.count,0),unchangedSeasonShadowSamples:0},
      realInventory:'BLOCKED',G1:'PENDING OWNER ACCEPTANCE'});
    const encoding=[];
    for(const row of sqlRows) {
      const bytes=encode(row.points);expect(decode(bytes)).toEqual(row.points);
      const json=JSON.stringify(row.points),arrays=JSON.stringify([row.points.map(p=>p.t),row.points.map(p=>p.value)]);
      const timing={json:[] as number[],arrays:[] as number[],bytes:[] as number[]};
      for(let r=-5;r<30;r++) for(const kind of ['json','arrays','bytes'] as const) {
        const t=performance.now();
        if(kind==='bytes') decode(bytes);else if(kind==='json') decodeJson(json);else decodeArrays(arrays);
        if(r>=0)timing[kind].push(performance.now()-t);
      }
      encoding.push({id:row.id,date:row.date,samples:row.points.length,serializedBytes:{json:Buffer.byteLength(json),arrays:Buffer.byteLength(arrays),bytes:bytes.length},decodeMs:Object.fromEntries(Object.entries(timing).map(([k,v])=>[k,stats(v)])),note:'Payload lengths are NOT database sizes. All three decoders include equivalent shape/order/range validation.'});
    }
    write('M06-payload-decode.json',encoding);
    expect(guards.attempts).toBe(0);
    publishLane(out,'completion.json',{complete:true,offlineAttempts:guards.attempts,cells:geometry.map(c=>`${c.fixture}/${c.date}`),geometryCells:geometry.length,syntheticOnly:true,ownerAcceptance:'PENDING',realCPU:'BLOCKED',database:'SEPARATE LANE',physicalAccuracy:'NOT MEASURED'},mainArtifacts,fixtures.flatMap(f=>requiredDates.map(d=>`${f.id}/${d}`)));
  } finally {globalThis.fetch=originalFetch;vi.useRealTimers();guards.coordinates=null;}
});
