/** Scratch-only physical layout comparison using three captured legacy rows. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {artifactHashes,publishLane} from './evidence.mjs';
import {workloadsReport} from './workloads-report.mjs';
const [container,database,root,out]=process.argv.slice(2);
if(!container||!process.env.E15_GUARD_RESOURCE||!/^e15_[a-z0-9_]+$/.test(database??'')||![root,out].every(p=>p&&path.isAbsolute(p))||fs.existsSync(out))throw Error('Guard resource, fresh e15 database/output and absolute root required');
workloadsReport(root);
const captured=JSON.parse(fs.readFileSync(path.join(root,'legacy-01/rows.json'),'utf8'));
assert.equal(captured.rows.length,3);assert.equal(new Set(captured.rows.map(r=>r.venue_id)).size,3);
const docker=(args,input)=>{const r=spawnSync('docker',args,{input,encoding:'utf8',timeout:120000,maxBuffer:16*1024*1024});if(r.status!==0)throw Error(r.stderr||r.error?.message||'Docker failed');return r.stdout;};
const labels=JSON.parse(docker(['inspect',container,'--format','{{json .Config.Labels}}']));
if(labels['com.rasmus.resource-guard.managed']!=='true'||labels['com.docker.compose.service']!=='postgres'||labels['com.docker.compose.project.working_dir']?.toLowerCase()!==path.resolve('..').toLowerCase())throw Error('Caller must verify owned repository Postgres');
docker(['exec',container,'createdb','-U','sunnyseat',database]);
const q=sql=>docker(['exec','-i',container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','sunnyseat','-d',database],sql),quote=s=>"'"+s.replaceAll("'","''")+"'";
const at=new Date().toISOString(),phases=[];
const census=()=>JSON.parse(q("SELECT json_build_object('database_bytes',pg_database_size(current_database()),'relations',(SELECT json_agg(x ORDER BY name) FROM (SELECT c.relname AS name,pg_total_relation_size(c.oid) AS total_bytes,pg_table_size(c.oid) AS table_bytes,pg_indexes_size(c.oid) AS index_bytes FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='bench' AND c.relkind='r')x));"));
const phase=(name,sql)=>{const lsn=q('SELECT pg_current_wal_insert_lsn();').trim(),start=performance.now();q(sql);phases.push({name,wallMs:performance.now()-start,walBytes:Number(q(`SELECT pg_wal_lsn_diff(pg_current_wal_insert_lsn(),${quote(lsn)}::pg_lsn);`))});};
const settings=JSON.parse(q("SELECT json_build_object('version',version(),'fsync',current_setting('fsync'),'full_page_writes',current_setting('full_page_writes'));")),empty=census();
q(`CREATE SCHEMA bench;
CREATE TABLE bench.legacy(venue_id text NOT NULL,stockholm_date date NOT NULL,geometry_input_hash text NOT NULL,series jsonb NOT NULL,input_payload jsonb,run_id text,created_at timestamptz NOT NULL,updated_at timestamptz NOT NULL,PRIMARY KEY(venue_id,stockholm_date,geometry_input_hash));
CREATE INDEX legacy_lookup ON bench.legacy(stockholm_date,geometry_input_hash,venue_id);
CREATE TABLE bench.shared_inputs(geometry_input_hash text PRIMARY KEY,input_payload jsonb);
CREATE TABLE bench.shared_days(venue_id text NOT NULL,stockholm_date date NOT NULL,geometry_input_hash text NOT NULL REFERENCES bench.shared_inputs,series jsonb NOT NULL,run_id text,created_at timestamptz NOT NULL,updated_at timestamptz NOT NULL,PRIMARY KEY(venue_id,stockholm_date,geometry_input_hash));
CREATE INDEX shared_lookup ON bench.shared_days(stockholm_date,geometry_input_hash,venue_id);`);
const exactRows=JSON.stringify(captured.rows);
phase('three-actual-legacy-rows',`INSERT INTO bench.legacy SELECT * FROM jsonb_populate_recordset(NULL::bench.legacy,${quote(exactRows)}::jsonb);`);
phase('three-shared-rows',`INSERT INTO bench.shared_inputs SELECT geometry_input_hash,input_payload FROM bench.legacy; INSERT INTO bench.shared_days SELECT venue_id,stockholm_date,geometry_input_hash,series,run_id,created_at,updated_at FROM bench.legacy;`);
const check=()=>{
  const differences=Number(q(`SELECT count(*) FROM ((SELECT * FROM bench.legacy EXCEPT ALL SELECT d.venue_id,d.stockholm_date,d.geometry_input_hash,d.series,i.input_payload,d.run_id,d.created_at,d.updated_at FROM bench.shared_days d JOIN bench.shared_inputs i USING(geometry_input_hash)) UNION ALL (SELECT d.venue_id,d.stockholm_date,d.geometry_input_hash,d.series,i.input_payload,d.run_id,d.created_at,d.updated_at FROM bench.shared_days d JOIN bench.shared_inputs i USING(geometry_input_hash) EXCEPT ALL SELECT * FROM bench.legacy)) x;`));
  assert.equal(differences,0);
};check();const actual=census();
// Repetition is a layout experiment, not historical/future solar calculation.
phase('replicate-legacy-36-more-dates',`INSERT INTO bench.legacy SELECT venue_id,stockholm_date+n,geometry_input_hash,series,input_payload,run_id,created_at,updated_at FROM bench.legacy CROSS JOIN generate_series(1,36)n;`);
phase('replicate-shared-36-more-dates',`INSERT INTO bench.shared_days SELECT venue_id,stockholm_date+n,geometry_input_hash,series,run_id,created_at,updated_at FROM bench.shared_days CROSS JOIN generate_series(1,36)n;`);
check();assert.equal(Number(q('SELECT count(*) FROM bench.legacy;')),111);const replicated=census();
// Quantify coexistence with a separate measured candidate sample, not data parity.
q('CREATE TABLE bench.arrays(generation text,venue text,date date,offsets integer[],exposure double precision[],starts double precision[],ends double precision[],sunny boolean[],PRIMARY KEY(generation,venue,date));');
const workload=JSON.parse(fs.readFileSync(path.join(root,'run-18/workloads.json'),'utf8')).workloads.find(w=>w.name==='initial-seven');
phase('coexisting-measured-array-week',workload.cells.map(r=>{const d=r.data;return `INSERT INTO bench.arrays VALUES ('sample',${quote(r.id)},${quote(r.date)},ARRAY[${d.offsets}]::integer[],ARRAY[${d.exposure}]::double precision[],ARRAY[${d.starts}]::double precision[],ARRAY[${d.ends}]::double precision[],ARRAY[${d.sunny}]::boolean[]);`;}).join('\n'));
assert.equal(Number(q('SELECT count(*) FROM bench.arrays;')),294);const coexistence=census();
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'storage.json'),JSON.stringify({at,settings,empty,actual,replicated,coexistence,phases,capturedAt:captured.at,actualRows:3,replicatedRows:111,arrayRows:294,scope:'Three actual September18 legacy rows for venues34/8/47, with every original column and both physical index layouts. Business CHECK functions, public-venue FK and RLS are not cloned; this is physical storage evidence only. Shared variant reconstructs every original value exactly. 37-date repetition reuses original series/input/timestamps and is explicitly synthetic, not recalculated sun. Candidate arrays are 294 different measured venue-days; coexistence is additive occupancy, not an equivalent-payload compression comparison. Scratch PG15 differs from production PG17; small-table page granularity and compression limit generalization. No application migration or production write.'},null,2));
fs.writeFileSync(path.join(out,'environment.json'),JSON.stringify({guardResourceId:process.env.E15_GUARD_RESOURCE,database,sources:artifactHashes(process.cwd(),['scripts/benchmarks/epic-15/legacy-storage.mjs','scripts/benchmarks/epic-15/evidence.mjs','scripts/benchmarks/epic-15/workloads-report.mjs']),captureHashes:artifactHashes(path.join(root,'legacy-01'),['rows.json','rows.sql','census-tool.json','census.sql']),workloadHashes:artifactHashes(path.join(root,'run-18'),['workloads.json','environment.json','completion.json'])},null,2));
publishLane(out,'completion.json',{complete:true,offlineAttempts:0,cells:['actual-three','replicated-111','coexisting-array-294']},['storage.json','environment.json'],['actual-three','replicated-111','coexisting-array-294']);
process.stdout.write(JSON.stringify({actual,replicated,coexistence,phases})+'\n');
