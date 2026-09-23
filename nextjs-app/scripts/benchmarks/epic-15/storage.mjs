/** Bounded, benchmark-only SQL experiment. Requires an already guard-owned container.
 * Creates a NEW e15_ database, refuses reuse, never touches application databases.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const [container,database,inputDirectory,outputDirectory]=process.argv.slice(2);
if(!container||!/^e15_[a-z0-9_]+$/.test(database??'')||!path.isAbsolute(inputDirectory??'')||!path.isAbsolute(outputDirectory??'')) throw Error('Usage: node storage.mjs <guard-owned-container-id> <new-e15_database> <absolute-input-dir> <absolute-output-dir>');
const docker=(args,input)=>{
  const r=spawnSync('docker',args,{input,encoding:'utf8',timeout:120000,maxBuffer:64*1024*1024});
  if(r.status!==0)throw Error(r.stderr||r.error?.message||`Docker exited ${r.status}`);return r.stdout;
};
const labels=JSON.parse(docker(['inspect',container,'--format','{{json .Config.Labels}}']));
if(labels['com.rasmus.resource-guard.managed']!=='true'||labels['com.docker.compose.service']!=='postgres'||labels['com.docker.compose.project.working_dir']?.toLowerCase()!==path.resolve('..').toLowerCase())throw Error('Expected guard-managed repository Postgres. Confirm actor ownership with guard List before invoking.');
fs.mkdirSync(outputDirectory,{recursive:true});
if(fs.existsSync(path.join(outputDirectory,'load.sql')))throw Error('Refusing evidence overwrite');
const rows=JSON.parse(fs.readFileSync(path.join(inputDirectory,'M06-identical-dataset.json'),'utf8'));
const fixtureManifest=JSON.parse(fs.readFileSync(path.join(inputDirectory,'fixtures.json'),'utf8'));
const editedRows=JSON.parse(fs.readFileSync(path.join(inputDirectory,'M06-edited-dataset.json'),'utf8'));
const editedManifest=JSON.parse(fs.readFileSync(path.join(inputDirectory,'M06-edited-fixtures.json'),'utf8'));
if(editedManifest.complete!==true||editedManifest.attempts!==0||editedRows.length!==rows.length||editedManifest.changedSamples<=0)throw Error('Incomplete changed-input evidence');
if(!Array.isArray(rows)||!rows.length||!Array.isArray(fixtureManifest.fixtures))throw Error('Invalid measurement dataset');
for(const row of [...rows,...editedRows]) {
  if(typeof row.id!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!Array.isArray(row.points)||!row.points.length||row.points.length>20000)throw Error('Invalid measured row');
  row.points.forEach((p,i)=>{
    if(!Number.isInteger(p.t)||p.t<0||p.t>90000000||!Number.isFinite(p.value)||p.value<0||p.value>100||(i>0&&p.t<=row.points[i-1].t))throw Error('Invalid measured sample');
  });
}
const payloadSql=(kind,points)=>{
  if(kind==='jsonb')return quote(JSON.stringify(points))+'::jsonb';
  if(kind==='arrays')return `ARRAY[${points.map(p=>p.t).join(',')}]::integer[],ARRAY[${points.map(p=>p.value).join(',')}]::double precision[]`;
  const bytes=Buffer.alloc(5+points.length*12);bytes[0]=1;bytes.writeUInt32LE(points.length,1);
  points.forEach((p,i)=>{bytes.writeUInt32LE(p.t,5+i*12);bytes.writeDoubleLE(p.value,9+i*12);});
  return `decode('${bytes.toString('hex')}','hex')`;
};
const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
const q=sql=>docker(['exec','-i',container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','sunnyseat','-d',database],sql);
docker(['exec',container,'createdb','-U','sunnyseat',database]);
const settings=q("SELECT json_build_object('version',version(),'fsync',current_setting('fsync'),'full_page_writes',current_setting('full_page_writes'),'synchronous_commit',current_setting('synchronous_commit'),'shared_buffers',current_setting('shared_buffers'),'block_size',current_setting('block_size'),'default_toast_compression',current_setting('default_toast_compression'),'baseline_database_bytes',pg_database_size(current_database()));");
fs.writeFileSync(path.join(outputDirectory,'settings.json'),settings);
const census=`SELECT json_build_object('at',clock_timestamp(),'database_bytes',pg_database_size(current_database()),'relations',(SELECT json_agg(x) FROM (SELECT n.nspname AS schema,c.relname AS relation,pg_relation_size(c.oid) AS heap_main_bytes,pg_table_size(c.oid) AS table_including_toast_forks_bytes,CASE WHEN c.reltoastrelid=0 THEN 0 ELSE pg_total_relation_size(c.reltoastrelid) END AS toast_total_including_index_bytes,pg_indexes_size(c.oid) AS table_indexes_bytes,pg_total_relation_size(c.oid) AS total_bytes FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('bench_jsonb','bench_arrays','bench_bytes') AND c.relkind='r' ORDER BY 1,2) x));`;
fs.writeFileSync(path.join(outputDirectory,'census.sql'),census+'\n');
const roles=['current','previous-season-simulation','rollback','failed-staging','evidence-protected'];
let sql='BEGIN;\n';
for(const kind of ['jsonb','arrays','bytes']) {
  const schema='bench_'+kind;
  sql+=`CREATE SCHEMA ${schema};
CREATE TABLE ${schema}.inputs (fixture text PRIMARY KEY, checksum text NOT NULL, payload jsonb NOT NULL);
CREATE TABLE ${schema}.generations (id text PRIMARY KEY, fixture text NOT NULL REFERENCES ${schema}.inputs, metadata jsonb NOT NULL);
CREATE TABLE ${schema}.releases (id text PRIMARY KEY, manifest jsonb NOT NULL);
CREATE TABLE ${schema}.days (generation text NOT NULL REFERENCES ${schema}.generations, date date NOT NULL, checksum text NOT NULL, sample_count int NOT NULL, ${kind==='jsonb'?'payload jsonb NOT NULL':kind==='arrays'?'offsets integer[] NOT NULL, exposure double precision[] NOT NULL, CHECK(cardinality(offsets)=cardinality(exposure))':'payload bytea NOT NULL'}, PRIMARY KEY(generation,date));\n`;
  for(const fixture of fixtureManifest.fixtures) {
    const json=JSON.stringify(fixture),checksum=createHash('sha256').update(json).digest('hex');
    sql+=`INSERT INTO ${schema}.inputs VALUES (${quote(fixture.id)},${quote(checksum)},${quote(json)}::jsonb);\n`;
    for(const role of roles)sql+=`INSERT INTO ${schema}.generations VALUES (${quote(fixture.id+'/'+role)},${quote(fixture.id)},${quote(JSON.stringify({role,fixture:fixture.id,engine:'HEAD recorded in environment',horizon:'experimental-5deg',decoder:'measurement-v1',retentionSimulation:true}))}::jsonb);\n`;
  }
  for(const role of roles)sql+=`INSERT INTO ${schema}.releases VALUES (${quote(role)},${quote(JSON.stringify(fixtureManifest.fixtures.map(f=>f.id+'/'+role)))}::jsonb);\n`;
  for(const row of rows) {
    const checksum=createHash('sha256').update(JSON.stringify(row.points)).digest('hex');
    let payload;
    if(kind==='jsonb') payload=quote(JSON.stringify(row.points))+'::jsonb';
    if(kind==='arrays') payload=`ARRAY[${row.points.map(p=>p.t).join(',')}]::integer[],ARRAY[${row.points.map(p=>p.value).join(',')}]::double precision[]`;
    if(kind==='bytes') {
      const bytes=Buffer.alloc(5+row.points.length*12);bytes[0]=1;bytes.writeUInt32LE(row.points.length,1);
      row.points.forEach((p,i)=>{bytes.writeUInt32LE(p.t,5+i*12);bytes.writeDoubleLE(p.value,9+i*12);});
      payload=`decode('${bytes.toString('hex')}','hex')`;
    }
    for(const role of roles)sql+=`INSERT INTO ${schema}.days VALUES (${quote(row.id+'/'+role)},${quote(row.date)},${quote(checksum)},${row.points.length},${payload});\n`;
  }
}
sql+='COMMIT;\nANALYZE;\n';
fs.writeFileSync(path.join(outputDirectory,'load.sql'),sql);
const lsnBefore=q('SELECT pg_current_wal_insert_lsn();').trim();
const start=performance.now();q(sql);const loadMs=performance.now()-start;
fs.writeFileSync(path.join(outputDirectory,'clean.json'),q(census));
const walBytes=Number(q(`SELECT pg_wal_lsn_diff(pg_current_wal_insert_lsn(),${quote(lsnBefore)}::pg_lsn);`).trim());
const reads=[];
for(const kind of ['jsonb','arrays','bytes']) {
  const schema='bench_'+kind;
  const read=`SELECT * FROM ${schema}.days WHERE date='2026-09-22' AND generation LIKE '%/current' ORDER BY generation;`;
  fs.writeFileSync(path.join(outputDirectory,`${kind}-plan.json`),q('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) '+read));
  for(let i=-5;i<30;i++) {
    const t=performance.now();const result=q(read);
    reads.push({kind,repetition:i,warmup:i<0,wallMs:performance.now()-t,returnedTextBytes:Buffer.byteLength(result),cache:'warm/uncontrolled OS cache; includes docker exec + psql startup + text transport'});
  }
}
fs.writeFileSync(path.join(outputDirectory,'reads.json'),JSON.stringify(reads,null,2));
let churn='';
for(let retry=0;retry<3;retry++) for(const kind of ['jsonb','arrays','bytes']) churn+=`UPDATE bench_${kind}.days SET checksum=checksum,${kind==='arrays'?'exposure=exposure':'payload=payload'} WHERE generation LIKE '%/current';\n`;
churn+='ANALYZE;\n';
const writePhases=[];
const measureWrite=(phase,kind,sql)=>{
  fs.writeFileSync(path.join(outputDirectory,`${phase}-${kind}.sql`),sql);
  const before=q('SELECT pg_current_wal_insert_lsn();').trim(),start=performance.now();
  q(sql);
  const wallMs=performance.now()-start;
  const walBytes=Number(q(`SELECT pg_wal_lsn_diff(pg_current_wal_insert_lsn(),${quote(before)}::pg_lsn);`).trim());
  writePhases.push({phase,kind,wallMs,walBytes,n:1,p95:null,scope:'Includes docker/psql transport; WAL is isolated-cluster LSN difference, not attributed production WAL.'});
};
fs.writeFileSync(path.join(outputDirectory,'churn.sql'),churn);measureWrite('noop-updates','all',churn);
fs.writeFileSync(path.join(outputDirectory,'churn.json'),q(census));
for(const kind of ['jsonb','arrays','bytes']){
  const schema='bench_'+kind;
  let edit='BEGIN;\n';
  for(const fixture of editedManifest.fixtures){
    const json=JSON.stringify(fixture),checksum=createHash('sha256').update(json).digest('hex');
    edit+=`INSERT INTO ${schema}.inputs VALUES (${quote(fixture.id+'/edit-1')},${quote(checksum)},${quote(json)}::jsonb);\n`;
    edit+=`INSERT INTO ${schema}.generations VALUES (${quote(fixture.id+'/edit-1')},${quote(fixture.id+'/edit-1')},${quote(JSON.stringify({role:'edited-retained',source:fixture.id,changedInputHash:checksum,decoder:'measurement-v1'}))}::jsonb);\n`;
  }
  for(const row of editedRows){
    const checksum=createHash('sha256').update(JSON.stringify(row.points)).digest('hex');
    edit+=`INSERT INTO ${schema}.days VALUES (${quote(row.id+'/edit-1')},${quote(row.date)},${quote(checksum)},${row.points.length},${payloadSql(kind,row.points)});\n`;
  }
  edit+=`INSERT INTO ${schema}.releases VALUES ('edited-retained',${quote(JSON.stringify(editedManifest.fixtures.map(f=>f.id+'/edit-1')))}::jsonb);\nCOMMIT;\nANALYZE;\n`;
  measureWrite('changed-input-generation',kind,edit);
  const proof=JSON.parse(q(`SELECT json_build_object('old_rows',(SELECT count(*) FROM ${schema}.days WHERE generation NOT LIKE '%/edit-1'),'new_rows',(SELECT count(*) FROM ${schema}.days WHERE generation LIKE '%/edit-1'),'changed_days',(SELECT count(*) FROM ${schema}.days n JOIN ${schema}.days o ON o.generation=replace(n.generation,'/edit-1','/current') AND o.date=n.date WHERE n.generation LIKE '%/edit-1' AND n.checksum<>o.checksum),'input_versions',(SELECT count(*) FROM ${schema}.inputs));`));
  if(proof.old_rows!==rows.length*roles.length||proof.new_rows!==editedRows.length||proof.changed_days===0||proof.input_versions!==fixtureManifest.fixtures.length*2)throw Error('Changed retained generation proof failed');
  fs.writeFileSync(path.join(outputDirectory,`${kind}-edit-proof.json`),JSON.stringify(proof,null,2));
}
fs.writeFileSync(path.join(outputDirectory,'edited.json'),q(census));
fs.writeFileSync(path.join(outputDirectory,'write-phases.json'),JSON.stringify(writePhases,null,2));
fs.writeFileSync(path.join(outputDirectory,'summary.json'),JSON.stringify({complete:true,database,loadMs,walBytes,rowsPerEncoding:rows.length*roles.length,inputFixtures:fixtureManifest.fixtures.length,roles,
  datasetSha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
  sqlSha256:createHash('sha256').update(sql).digest('hex'),
  status:'MEASURED LOCAL SYNTHETIC MATRIX ONLY',
  limits:['No actual application/production database baseline. Empty isolated DB baseline measured.','Retention copies are storage simulations; previous-season dates were NOT recomputed.','Not full-season or 500-venue capacity evidence.','All inputs validated by host measurement harness; SQL has experimental shape checks only, not production decoder validation.','No controlled cold cache or workload concurrency baseline.','No production budget acceptance.']},null,2));
console.log(JSON.stringify({database,loadMs,walBytes,rowsPerEncoding:rows.length*roles.length}));
