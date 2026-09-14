import {it,expect,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {capturedFixtures,type Capture} from './capture-inputs';
import {pruneShadowCasters} from './shadow-broadphase';
import {thresholdScan} from './threshold-sampling';
import {storedDay,encodeStored,decodeStored,type StoredDay} from './representation';
import {daylight,localDay} from './measurement';
import {calculateSolarPosition} from '../../../lib/solar/solar-calculation-service';
import {calculateVenueShadowFromBuildings} from '../../../lib/solar/shadow-calculation-service';
import {artifactHashes,engineSources,publishLane,jsonHash} from './evidence.mjs';
import {thresholdSummary} from './threshold-report.mjs';
const guard=vi.hoisted(()=>({attempts:0,lat:57.7089,lng:11.9746}));
vi.mock('@/lib/supabase/server',()=>({supabaseServiceRole:new Proxy({}, {get(){guard.attempts++;throw Error('Production access forbidden in local pipeline');}})}));
vi.mock('../../../lib/solar/solar-calculation-service',async original=>{const actual=await original<typeof import('../../../lib/solar/solar-calculation-service')>();return {...actual,calculateSolarPosition:(d:Date,lat=guard.lat,lng=guard.lng)=>actual.calculateSolarPosition(d,lat,lng)};});
it('measures bounded local input-load calculate store retry edit and read phases',()=>{
  const out=process.env.E15_OUTPUT,root=process.env.E15_EVIDENCE_ROOT,container=process.env.E15_CONTAINER,database=process.env.E15_DATABASE;
  if(!out||!root||![out,root].every(path.isAbsolute)||fs.existsSync(out)||!container||!/^e15_[a-z0-9_]+$/.test(database??''))throw Error('Fresh absolute output and isolated e15 database required');
  thresholdSummary(root);
  const prior=JSON.parse(fs.readFileSync(path.join(root,'run-14/environment.json'),'utf8'));
  expect(artifactHashes(process.cwd(),Object.keys(prior.sources))).toEqual(prior.sources);
  expect(artifactHashes(path.join(root,'capture-01'),Object.keys(prior.captureHashes))).toEqual(prior.captureHashes);
  const captureText=fs.readFileSync(path.join(root,'capture-01/inputs.json'),'utf8');
  const docker=(args:string[],input?:string)=>{const r=spawnSync('docker',args,{input,encoding:'utf8',timeout:120000,maxBuffer:64*1024*1024});if(r.status!==0)throw Error(r.stderr||r.error?.message||'Docker failed');return r.stdout;};
  const labels=JSON.parse(docker(['inspect',container,'--format','{{json .Config.Labels}}']));
  if(labels['com.rasmus.resource-guard.managed']!=='true'||labels['com.docker.compose.service']!=='postgres'||labels['com.docker.compose.project.working_dir']?.toLowerCase()!==path.resolve('..').toLowerCase())throw Error('Expected guard-owned repository postgres; caller must verify current actor ownership');
  docker(['exec',container,'createdb','-U','sunnyseat',database!]);
  const q=(sql:string)=>docker(['exec','-i',container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','sunnyseat','-d',database!],sql);
  const quote=(s:string)=>"'"+s.replaceAll("'","''")+"'";
  const baseline=JSON.parse(q("SELECT json_build_object('database_bytes',pg_database_size(current_database()),'version',version(),'fsync',current_setting('fsync'),'full_page_writes',current_setting('full_page_writes'));"));
  const kinds=['jsonb','arrays','bytes','compact'] as const;
  q(`CREATE SCHEMA bench; CREATE TABLE bench.inputs (hash text PRIMARY KEY,payload jsonb NOT NULL); CREATE TABLE bench.generations (id text PRIMARY KEY,input text REFERENCES bench.inputs,metadata jsonb NOT NULL); INSERT INTO bench.inputs VALUES (${quote(jsonHash(JSON.parse(captureText)))},${quote(captureText)}::jsonb);`);
  for(const kind of kinds)q(`CREATE TABLE bench.${kind} (generation text REFERENCES bench.generations,venue text,date date,payload ${kind==='bytes'?'bytea':kind==='jsonb'?'jsonb':"jsonb"},${kind==='arrays'||kind==='compact'?'offsets integer[],exposure double precision[],starts double precision[],ends double precision[],sunny boolean[],':''} PRIMARY KEY(generation,venue,date));`);
  const sources=artifactHashes(process.cwd(),[...engineSources,...['pipeline.measurement.ts','representation.ts','threshold-sampling.ts','shadow-broadphase.ts','capture-inputs.ts','threshold-report.mjs'].map(n=>'scripts/benchmarks/epic-15/'+n)]);
  const at=new Date().toISOString(),fetch=globalThis.fetch;globalThis.fetch=async()=>{guard.attempts++;throw Error('No external pipeline calls');};vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-09-12T12:00:00Z'));
  try{
    const phases:{name:string;wallMs:number;walBytes:number}[]=[];
    const phase=(name:string,fn:()=>void)=>{const lsn=q('SELECT pg_current_wal_insert_lsn();').trim(),begin=performance.now();fn();phases.push({name,wallMs:performance.now()-begin,walBytes:Number(q(`SELECT pg_wal_lsn_diff(pg_current_wal_insert_lsn(),${quote(lsn)}::pg_lsn);`))});};
    const census=()=>JSON.parse(q("SELECT json_build_object('database_bytes',pg_database_size(current_database()),'relations',(SELECT json_agg(x) FROM (SELECT c.relname,pg_total_relation_size(c.oid) AS total_bytes,pg_table_size(c.oid) AS table_including_toast_bytes,pg_indexes_size(c.oid) AS indexes_bytes FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='bench' AND c.relkind='r' ORDER BY c.relname) x));"));
    const wallStart=performance.now(),loadStart=performance.now();
    const loaded=JSON.parse(q('SELECT payload FROM bench.inputs;')) as Capture;
    // PostgreSQL JSONB changes key order; compare structure, not serialized key order.
    expect(loaded).toEqual(JSON.parse(captureText));
    const fixtures=capturedFixtures(loaded),inputLoadMs=performance.now()-loadStart,inputHash=jsonHash(JSON.parse(captureText));
    const dates=Array.from({length:7},(_,i)=>`2026-09-${21+i}`);
    type Row={id:string;date:string;full:StoredDay;compact:StoredDay;cpuMs:number;wallMs:number;samples:number};
    const rows:Row[]=[];
    const measure=(f:ReturnType<typeof capturedFixtures>[number],date:string):Row=>{
      Object.assign(guard,f.coordinate);const cpu=process.cpuUsage(),begin=performance.now(),support=daylight(date,f.coordinate.lat,f.coordinate.lng,5);
      const run=thresholdScan(t=>{const d=new Date(t),kept=pruneShadowCasters(f.seating,f.casters,calculateSolarPosition(d),f).retained;return calculateVenueShadowFromBuildings(f.seating,d,kept,f).sunlitAreaPercent;},support.start,support.end,5,60000);
      const origin=localDay(date)[0],full=storedDay(run.points,run.intervals,origin),compact=storedDay(run.points,run.intervals,origin,true),usage=process.cpuUsage(cpu);
      expect(decodeStored(encodeStored(full))).toEqual(full);
      return {id:f.id,date,full,compact,cpuMs:(usage.user+usage.system)/1000,wallMs:performance.now()-begin,samples:run.samples};
    };
    const insert=(kind:typeof kinds[number],generation:string,r:Row)=>{
      const d=kind==='compact'?r.compact:r.full,base=`${quote(generation)},${quote(r.id)},${quote(r.date)}`;
      if(kind==='jsonb')return `INSERT INTO bench.jsonb VALUES (${base},${quote(JSON.stringify(d))}::jsonb) ON CONFLICT DO NOTHING;`;
      if(kind==='bytes')return `INSERT INTO bench.bytes VALUES (${base},decode('${encodeStored(d).toString('hex')}','hex')) ON CONFLICT DO NOTHING;`;
      return `INSERT INTO bench.${kind} VALUES (${base},NULL,ARRAY[${d.offsets}]::integer[],ARRAY[${d.exposure}]::double precision[],ARRAY[${d.starts}]::double precision[],ARRAY[${d.ends}]::double precision[],ARRAY[${d.sunny}]::boolean[]) ON CONFLICT DO NOTHING;`;
    };
    q(`INSERT INTO bench.generations VALUES ('g1',${quote(inputHash)},'{"expectedVenueDays":294,"role":"current-simulation"}');`);
    for(const date of dates){
      const daily=fixtures.map(f=>measure(f,date));rows.push(...daily);
      phase('store/'+date,()=>q('BEGIN;'+daily.flatMap(r=>kinds.map(k=>insert(k,'g1',r))).join('\n')+'COMMIT;'));
      process.stdout.write(`Pipeline generated/stored ${rows.length}/294 days\n`);
    }
    const initialPipelineWallMs=performance.now()-wallStart;q('ANALYZE;');const current=census();
    expect(rows).toHaveLength(294);
    for(const kind of kinds)expect(Number(q(`SELECT count(*) FROM bench.${kind} WHERE generation='g1';`))).toBe(294);
    phase('interrupted-staging-rollback',()=>q(`BEGIN; INSERT INTO bench.generations VALUES ('failed',${quote(inputHash)},'{}'); INSERT INTO bench.compact SELECT 'failed',venue,date,payload,offsets,exposure,starts,ends,sunny FROM bench.compact WHERE generation='g1' AND date='2026-09-22'; ROLLBACK;`));
    expect(Number(q("SELECT count(*) FROM bench.generations WHERE id='failed';"))).toBe(0);
    phase('idempotent-retry',()=>q('BEGIN;'+rows.filter(r=>r.date==='2026-09-22').flatMap(r=>kinds.map(k=>insert(k,'g1',r))).join('\n')+'COMMIT;'));
    for(const kind of kinds)expect(Number(q(`SELECT count(*) FROM bench.${kind};`))).toBe(294);
    phase('four-retained-copies',()=>{
      for(let i=2;i<=5;i++){
        q(`INSERT INTO bench.generations VALUES ('g${i}',${quote(inputHash)},'{"role":"retention-simulation","expectedVenueDays":294}');`);
        for(const kind of kinds)q(`INSERT INTO bench.${kind} SELECT 'g${i}',venue,date,payload${kind==='arrays'||kind==='compact'?',offsets,exposure,starts,ends,sunny':''} FROM bench.${kind} WHERE generation='g1';`);
      }
    });q('ANALYZE;');const retained=census();
    const editedFixture={...fixtures.find(f=>f.id==='49')!,seatingElevationM:(fixtures.find(f=>f.id==='49')!.seatingElevationM)+2},editedRows:Row[]=[];
    phase('venue-edit-recompute-and-store',()=>{
      const h=jsonHash(editedFixture);q(`INSERT INTO bench.inputs VALUES (${quote(h)},${quote(JSON.stringify(editedFixture))}::jsonb); INSERT INTO bench.generations VALUES ('edit',${quote(h)},'{"venue":"49","expectedVenueDays":7,"seatingElevationDeltaM":2}');`);
      editedRows.push(...dates.map(d=>measure(editedFixture,d)));
      q('BEGIN;'+editedRows.flatMap(r=>kinds.map(k=>insert(k,'edit',r))).join('\n')+'COMMIT;');
    });
    const changedDays=editedRows.filter(r=>JSON.stringify(r.full)!==JSON.stringify(rows.find(o=>o.id===r.id&&o.date===r.date)!.full)).length;
    expect(changedDays).toBeGreaterThan(0);q('ANALYZE;');const edited=census();
    const reads=[];const plans:Record<string,unknown>={};
    for(const kind of kinds){
      const payload=kind==='bytes'?"encode(payload,'hex')":kind==='jsonb'?'payload':"json_build_object('offsets',offsets,'exposure',exposure,'starts',starts,'ends',ends,'sunny',sunny)";
      const sql=`SELECT json_agg(x ORDER BY venue) FROM (SELECT venue,${payload} AS data FROM bench.${kind} WHERE generation='g1' AND date='2026-09-22') x;`;
      plans[kind]=JSON.parse(q('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) '+sql));
      for(let repetition=-2;repetition<20;repetition++){
        const begin=performance.now(),raw=q(sql),transportMs=performance.now()-begin,decodeStart=performance.now();
        const decoded=JSON.parse(raw).map((r:{venue:string;data:StoredDay|string})=>({id:r.venue,data:kind==='bytes'?decodeStored(Buffer.from(r.data as string,'hex')):r.data}));
        const decodeMs=performance.now()-decodeStart;expect(decoded).toHaveLength(42);
        for(const r of decoded){const expected=rows.find(x=>x.id===r.id&&x.date==='2026-09-22')!;expect(r.data).toEqual(kind==='compact'?expected.compact:expected.full);}
        reads.push({kind,repetition,transportMs,decodeMs,returnedBytes:Buffer.byteLength(raw),rows:decoded.length});
      }
    }
    for(const kind of kinds)expect(Number(q(`SELECT count(*) FROM bench.${kind};`))).toBe(1477);
    expect(guard.attempts).toBe(0);fs.mkdirSync(out,{recursive:true});
    fs.writeFileSync(path.join(out,'pipeline.json'),JSON.stringify({at,dates,baseline,inputLoadMs,initialPipelineWallMs,rows,editedRows,changedDays,phases,current,retained,edited,reads,plans,scope:'Fresh isolated PG15 database; 42 venues x7 actual dates, 5 identical retention generations and one actual +2m venue edit. Initial pipeline includes input fetch/parse, horizon/geometry, representation, serialization and four encodings stored, including local docker/psql transport. Schema/input seeding excluded. Serial warm reads, not concurrent production load. No season-long run.'}));
    fs.writeFileSync(path.join(out,'environment.json'),JSON.stringify({sources,guardResourceId:process.env.E15_GUARD_RESOURCE,inputHashes:artifactHashes(path.join(root,'run-14'),['threshold.json','environment.json','completion.json']),captureHashes:prior.captureHashes,offlineAttempts:guard.attempts,database},null,2));
    const expected=[...fixtures.flatMap(f=>dates.map(d=>`initial/${f.id}/${d}`)),...dates.map(d=>`edit/49/${d}`),...kinds.flatMap(k=>Array.from({length:22},(_,i)=>`read/${k}/${i-2}`)), 'retry','rollback','retention'];
    const cells=[...rows.map(r=>`initial/${r.id}/${r.date}`),...editedRows.map(r=>`edit/${r.id}/${r.date}`),...reads.map(r=>`read/${r.kind}/${r.repetition}`),'retry','rollback','retention'];
    publishLane(out,'completion.json',{complete:true,offlineAttempts:guard.attempts,cells},['pipeline.json','environment.json'],expected);
  }finally{globalThis.fetch=fetch;vi.useRealTimers();}
});
