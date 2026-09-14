import {it,expect,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync,execFile} from 'node:child_process';
import {capturedFixtures,type Capture} from './capture-inputs';
import {pruneShadowCasters} from './shadow-broadphase';
import {thresholdScan} from './threshold-sampling';
import {storedDay,type StoredDay} from './representation';
import {daylight,localDay,seasonDates} from './measurement';
import {calculateSolarPosition} from '../../../lib/solar/solar-calculation-service';
import {calculateVenueShadowFromBuildings} from '../../../lib/solar/shadow-calculation-service';
import {artifactHashes,engineSources,publishLane,jsonHash} from './evidence.mjs';
import {thresholdSummary} from './threshold-report.mjs';
const guard=vi.hoisted(()=>({attempts:0,lat:57.7089,lng:11.9746}));
vi.mock('@/lib/supabase/server',()=>({supabaseServiceRole:new Proxy({}, {get(){guard.attempts++;throw Error('Offline workload');}})}));
vi.mock('../../../lib/solar/solar-calculation-service',async original=>{const actual=await original<typeof import('../../../lib/solar/solar-calculation-service')>();return {...actual,calculateSolarPosition:(d:Date,lat=guard.lat,lng=guard.lng)=>actual.calculateSolarPosition(d,lat,lng)};});

it('measures array-only workload batches and controlled concurrent reads',async()=>{
  const out=process.env.E15_OUTPUT,root=process.env.E15_EVIDENCE_ROOT,container=process.env.E15_CONTAINER,database=process.env.E15_DATABASE;
  if(!out||!root||![out,root].every(path.isAbsolute)||fs.existsSync(out)||!container||!process.env.E15_GUARD_RESOURCE||!/^e15_[a-z0-9_]+$/.test(database??''))throw Error('Fresh output and guard-verified scratch database required');
  thresholdSummary(root);
  const prior=JSON.parse(fs.readFileSync(path.join(root,'run-14/environment.json'),'utf8'));
  expect(artifactHashes(process.cwd(),Object.keys(prior.sources))).toEqual(prior.sources);
  expect(artifactHashes(path.join(root,'capture-01'),Object.keys(prior.captureHashes))).toEqual(prior.captureHashes);
  const capture=JSON.parse(fs.readFileSync(path.join(root,'capture-01/inputs.json'),'utf8')) as Capture;
  const fixtures=capturedFixtures(capture);
  const docker=(args:string[],input?:string)=>{const r=spawnSync('docker',args,{input,encoding:'utf8',timeout:120000,maxBuffer:64*1024*1024});if(r.status!==0)throw Error(r.stderr||r.error?.message||'Docker failed');return r.stdout;};
  const labels=JSON.parse(docker(['inspect',container,'--format','{{json .Config.Labels}}']));
  if(labels['com.rasmus.resource-guard.managed']!=='true'||labels['com.docker.compose.service']!=='postgres'||labels['com.docker.compose.project.working_dir']?.toLowerCase()!==path.resolve('..').toLowerCase())throw Error('Not repository guard-owned postgres');
  docker(['exec',container,'createdb','-U','sunnyseat',database!]);
  const args=['exec','-i',container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','sunnyseat','-d',database!];
  const q=(sql:string)=>docker(args,sql),quote=(s:string)=>"'"+s.replaceAll("'","''")+"'";
  const aq=(sql:string)=>new Promise<string>((resolve,reject)=>{const child=execFile('docker',args,{timeout:120000,maxBuffer:64*1024*1024},(e,stdout)=>e?reject(e):resolve(stdout));child.stdin!.end(sql);});
  q('CREATE SCHEMA bench; CREATE TABLE bench.inputs(hash text PRIMARY KEY,payload jsonb NOT NULL); CREATE TABLE bench.generations(id text PRIMARY KEY,input text REFERENCES bench.inputs,expected integer NOT NULL,complete boolean NOT NULL DEFAULT false); CREATE TABLE bench.days(generation text REFERENCES bench.generations,venue text,date date,offsets integer[],exposure double precision[],starts double precision[],ends double precision[],sunny boolean[],PRIMARY KEY(generation,venue,date));');
  const settings=JSON.parse(q("SELECT json_build_object('version',version(),'fsync',current_setting('fsync'),'full_page_writes',current_setting('full_page_writes'),'shared_buffers',current_setting('shared_buffers'),'database_bytes',pg_database_size(current_database()));"));
  const sources=artifactHashes(process.cwd(),[...engineSources,...['workloads.measurement.ts','threshold-sampling.ts','shadow-broadphase.ts','capture-inputs.ts','representation.ts','evidence.mjs'].map(n=>'scripts/benchmarks/epic-15/'+n)]);
  const at=new Date().toISOString(),fetch=globalThis.fetch;
  globalThis.fetch=async()=>{guard.attempts++;throw Error('No external workload calls');};vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-09-12T12:00:00Z'));
  try{
    type Fixture=typeof fixtures[number];
    type Cell={id:string;date:string;data:StoredDay;samples:number};
    const batches:{workload:string;index:number;days:number;wallMs:number;cpuMs:number;samples:number;sampledHeapPeakBytes:number;processMaxRssKiB:number;walBytes:number}[]=[];
    const workloads:{name:string;days:number;wallMs:number;inputHash:string;outputHash:string;complete:boolean;cells:Cell[]}[]=[];
    const dates=Array.from({length:7},(_,i)=>`2026-09-${21+i}`);
    const workload=async(name:string,selected:Fixture[],selectedDates:string[],staged:boolean)=>{
      const started=performance.now(),hash=jsonHash(selected);
      q(`INSERT INTO bench.inputs VALUES (${quote(hash)},${quote(JSON.stringify(selected))}::jsonb) ON CONFLICT DO NOTHING; INSERT INTO bench.generations(id,input,expected) VALUES (${quote(name)},${quote(hash)},${selected.length*selectedDates.length});`);
      const loaded=capturedFixtures(capture);expect(loaded).toHaveLength(42);
      // Read and validate the actual selected input payload for each workload.
      const fromDb=JSON.parse(q(`SELECT payload FROM bench.inputs WHERE hash=${quote(hash)};`)) as Fixture[];expect(fromDb).toEqual(selected);
      const cells:Cell[]=[];let batchIndex=0;
      for(let v=0;v<fromDb.length;v+=staged?5:fromDb.length)for(let d=0;d<selectedDates.length;d+=staged?3:selectedDates.length){
        const vs=fromDb.slice(v,v+(staged?5:fromDb.length)),ds=selectedDates.slice(d,d+(staged?3:selectedDates.length));
        const lsn=q('SELECT pg_current_wal_insert_lsn();').trim(),cpu=process.cpuUsage(),begin=performance.now();let heap=process.memoryUsage().heapUsed,calls=0;
        const rows:Cell[]=[];
        for(const f of vs)for(const date of ds){
          Object.assign(guard,f.coordinate);const support=daylight(date,f.coordinate.lat,f.coordinate.lng,5);
          const run=thresholdScan(t=>{if(++calls%100===0)heap=Math.max(heap,process.memoryUsage().heapUsed);const time=new Date(t),kept=pruneShadowCasters(f.seating,f.casters,calculateSolarPosition(time),f).retained;return calculateVenueShadowFromBuildings(f.seating,time,kept,f).sunlitAreaPercent;},support.start,support.end,5,60000);
          rows.push({id:f.id,date,data:storedDay(run.points,run.intervals,localDay(date)[0]),samples:run.samples});
        }
        const sql=rows.map(r=>{const x=r.data;return `INSERT INTO bench.days VALUES (${quote(name)},${quote(r.id)},${quote(r.date)},ARRAY[${x.offsets}]::integer[],ARRAY[${x.exposure}]::double precision[],ARRAY[${x.starts}]::double precision[],ARRAY[${x.ends}]::double precision[],ARRAY[${x.sunny}]::boolean[]);`;}).join('\n');
        q('BEGIN;'+sql+'COMMIT;');
        const usage=process.cpuUsage(cpu),wallMs=performance.now()-begin;
        heap=Math.max(heap,process.memoryUsage().heapUsed);
        const walBytes=Number(q(`SELECT pg_wal_lsn_diff(pg_current_wal_insert_lsn(),${quote(lsn)}::pg_lsn);`));
        batches.push({workload:name,index:batchIndex++,days:rows.length,wallMs,cpuMs:(usage.user+usage.system)/1000,samples:calls,sampledHeapPeakBytes:heap,processMaxRssKiB:process.resourceUsage().maxRSS,walBytes});
        cells.push(...rows);process.stdout.write(`${name}: ${cells.length}/${selected.length*selectedDates.length} venue-days\n`);
      }
      const keys=cells.map(c=>`${c.id}/${c.date}`);expect(new Set(keys).size).toBe(selected.length*selectedDates.length);
      expect(Number(q(`SELECT count(*) FROM bench.days WHERE generation=${quote(name)};`))).toBe(keys.length);
      q(`UPDATE bench.generations SET complete=true WHERE id=${quote(name)} AND expected=(SELECT count(*) FROM bench.days WHERE generation=${quote(name)});`);
      expect(q(`SELECT complete FROM bench.generations WHERE id=${quote(name)};`).trim()).toBe('t');
      workloads.push({name,days:keys.length,wallMs:performance.now()-started,inputHash:hash,outputHash:jsonHash(cells),complete:true,cells});
    };
    await workload('initial-seven',fixtures,dates,false);
    await workload('staged-seven',fixtures,dates,true);
    expect(workloads[1].cells.toSorted((a,b)=>(a.id+a.date).localeCompare(b.id+b.date))).toEqual(workloads[0].cells.toSorted((a,b)=>(a.id+a.date).localeCompare(b.id+b.date)));
    await workload('rolling-five',fixtures,dates.slice(2),true);
    await workload('repair-one',fixtures.filter(f=>f.id==='49'),['2026-09-22'],true);
    const edited=fixtures.filter(f=>f.id==='49').map(f=>({...f,seatingElevationM:f.seatingElevationM+2}));
    await workload('venue-edit',edited,dates,true);
    expect(workloads.at(-1)!.cells.some(c=>jsonHash(c.data)!==jsonHash(workloads[0].cells.find(b=>b.id===c.id&&b.date===c.date)!.data))).toBe(true);
    // Synthetic local import mutation: raise every captured caster used by venue 49;
    // invalidate all cohort venues sharing any of those caster IDs, not just 49.
    const changedIds=new Set(fixtures.find(f=>f.id==='49')!.casters.map(c=>c.id));
    const affected=fixtures.filter(f=>f.casters.some(c=>changedIds.has(c.id))).map(f=>({...f,casters:f.casters.map(c=>changedIds.has(c.id)?{...c,height:c.height+2}:c)}));
    await workload('local-import',affected,dates,true);
    expect(workloads.at(-1)!.cells.some(c=>jsonHash(c.data)!==jsonHash(workloads[0].cells.find(b=>b.id===c.id&&b.date===c.date)!.data))).toBe(true);
    await workload('all-invalidation',fixtures,dates,true);
    await workload('single-venue-full-season',fixtures.filter(f=>f.id==='49'),seasonDates(2026),true);
    const noOpStart=performance.now(),noOp=q("SELECT complete AND expected=(SELECT count(*) FROM bench.days WHERE generation='initial-seven') FROM bench.generations WHERE id='initial-seven';").trim();expect(noOp).toBe('t');
    const noOpMs=performance.now()-noOpStart;
    q('ANALYZE bench.days;');
    const readSql="SELECT json_agg(x ORDER BY venue) FROM (SELECT venue,offsets,exposure,starts,ends,sunny FROM bench.days WHERE generation='initial-seven' AND date='2026-09-22') x;";
    const expected=workloads[0].cells.filter(c=>c.date==='2026-09-22').map(c=>({venue:c.id,...c.data})).sort((a,b)=>a.venue.localeCompare(b.venue));
    const reads:{clients:number;round:number;client:number;transportMs:number;decodeMs:number;bytes:number}[]=[];
    for(const clients of [1,4,8])for(let round=-2;round<20;round++)await Promise.all(Array.from({length:clients},async(_,client)=>{
      const begin=performance.now(),raw=await aq(readSql),transportMs=performance.now()-begin,start=performance.now(),decoded=JSON.parse(raw),decodeMs=performance.now()-start;
      expect(decoded).toEqual(expected);reads.push({clients,round,client,transportMs,decodeMs,bytes:Buffer.byteLength(raw)});
    }));
    const plans=JSON.parse(q('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) '+readSql));
    const census=JSON.parse(q("SELECT json_build_object('database_bytes',pg_database_size(current_database()),'relations',(SELECT json_agg(x) FROM (SELECT c.relname,pg_total_relation_size(c.oid) AS total_bytes FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='bench' AND c.relkind='r') x));"));
    expect(guard.attempts).toBe(0);
    const names=['initial-seven','staged-seven','rolling-five','repair-one','venue-edit','local-import','all-invalidation','single-venue-full-season'];
    expect(workloads.map(w=>w.name)).toEqual(names);
    fs.mkdirSync(out,{recursive:true});
    fs.writeFileSync(path.join(out,'workloads.json'),JSON.stringify({at,settings,workloads,batches,reads,plans,census,noOpMs,changedCasterIds:[...changedIds],affectedVenueIds:affected.map(f=>f.id),scope:'Array-only scratch PG15. Workload wall includes input write/read, computation, serialization, local Docker/psql and completion checks. Batch wall includes compute/serialization/store, excludes input loading and WAL instrumentation. CPU is Node process only, not database or child processes. Heap is sampled every 100 evaluations and at batch edges; maxRSS is OS process-lifetime high-water mark including harness and retained results, not isolated batch allocation. Read concurrency is local parallel Docker/psql connections; cache not evicted, no production latency claim. All-invalidation is seven dates, full season measured for venue49 only. No scheduler, publication API or application schema.'}));
    fs.writeFileSync(path.join(out,'environment.json'),JSON.stringify({sources,captureHashes:prior.captureHashes,inputHashes:artifactHashes(path.join(root,'run-14'),['threshold.json','environment.json','completion.json']),database,guardResourceId:process.env.E15_GUARD_RESOURCE,offlineAttempts:guard.attempts},null,2));
    const expectedCells=[...names,...[1,4,8].flatMap(n=>Array.from({length:22},(_,i)=>i-2).flatMap(r=>Array.from({length:n},(_,c)=>`read/${n}/${r}/${c}`))),'noop'];
    publishLane(out,'completion.json',{complete:true,offlineAttempts:guard.attempts,cells:[...workloads.map(w=>w.name),...reads.map(r=>`read/${r.clients}/${r.round}/${r.client}`),'noop']},['workloads.json','environment.json'],expectedCells);
  }finally{globalThis.fetch=fetch;vi.useRealTimers();}
});
