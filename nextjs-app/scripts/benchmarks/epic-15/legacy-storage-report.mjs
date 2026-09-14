import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {artifactHashes,validateLaneCompletion} from './evidence.mjs';
export function legacyStorageReport(root){
  const dir=path.join(root,'sql-06'),read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8')),data=read('storage.json'),env=read('environment.json');
  validateLaneCompletion(read('completion.json'),artifactHashes(dir,['storage.json','environment.json']),['actual-three','replicated-111','coexisting-array-294']);
  const captureDir=path.join(root,'legacy-01');
  const captureCompletion=JSON.parse(fs.readFileSync(path.join(captureDir,'completion.json'),'utf8'));
  const captureHashes=artifactHashes(captureDir,['rows.json','rows.sql','census-tool.json','census.sql','branches-tool.json']);
  if(captureCompletion.complete!==true||captureCompletion.mode!=='authorized-read-only-capture'||JSON.stringify(captureCompletion.artifacts)!==JSON.stringify(captureHashes)||JSON.stringify(captureCompletion.cells)!==JSON.stringify(['read-only-census','three-row-capture','branch-inventory']))throw Error('Incomplete read-only capture');
  const branchTool=JSON.parse(fs.readFileSync(path.join(captureDir,'branches-tool.json'),'utf8'));
  const branches=JSON.parse(branchTool.content[0].text).branches;
  if(branches.length!==1||!branches[0].is_default||branches[0].project_ref!=='hhnbxrhfhlzxgllxukzj')throw Error('Branch availability changed; update scoped conclusion');
  for(const [key,folder] of [['captureHashes','legacy-01'],['workloadHashes','run-18']]){
    if(!env[key]||JSON.stringify(env[key])!==JSON.stringify(artifactHashes(path.join(root,folder),Object.keys(env[key]))))throw Error('Changed storage evidence input');
  }
  if(data.actualRows!==3||data.replicatedRows!==111||data.arrayRows!==294)throw Error('Incomplete storage experiment');
  const raw=JSON.parse(fs.readFileSync(path.join(root,'legacy-01/census-tool.json'),'utf8'));
  const census=JSON.parse(JSON.parse(raw.content[0].text).result.split('\n').find(s=>s.startsWith('[{')))[0].json_build_object;
  const n=(c,k)=>{const r=c.relations.find(r=>r.name===k);if(!r||!Number.isFinite(r.total_bytes)||r.total_bytes<0)throw Error('Missing relation');return r.total_bytes;};
  const f=x=>(x/1e6).toFixed(3),share=c=>n(c,'shared_days')+n(c,'shared_inputs');
  return `# Legacy storage and shared inputs — September 14, 2026

## Finding

Shared inputs are the dominant opportunity in the captured legacy layout. This supports the existing full-array/shared-input recommendation; it does not approve an application migration, retention policy or production budget.

Read-only production census at ${census.at}: ${census.rows} legacy rows, ${census.first_date} through ${census.last_date}; total legacy relation ${f(census.relation_bytes)} MB; application database ${f(census.database_bytes)} MB. Stored input_payload column values total ${f(census.inputs_stored_bytes)} MB and series values ${f(census.series_stored_bytes)} MB. Inputs account for ${(100*census.inputs_stored_bytes/(census.inputs_stored_bytes+census.series_stored_bytes)).toFixed(2)}% of those two stored column totals. This percentage is not a fraction of total database size. Relation totals additionally include row/page/TOAST/index overhead and existing bloat; do not add diagnostic columns to the relation total.

## Local physical-layout experiment

Three actual rows (venues34/8/47, September18) were captured through read-only SQL. A fresh guard-owned PG15 scratch database reproduced every original row column and both index column orders. Business CHECK functions, the public-venue foreign key and RLS were deliberately not cloned; this compares physical storage, not application-schema correctness. The split variant stores input_payload once by geometry_input_hash and reconstructs every original value exactly; bidirectional EXCEPT ALL checks passed.

| Dataset | Legacy relation bytes | Shared day + input relation bytes |
|---|---:|---:|
| Three actual captured rows | ${n(data.actual,'legacy')} | ${share(data.actual)} |
| 111 rows: synthetic 37-date repetition | ${n(data.replicated,'legacy')} | ${share(data.replicated)} |

The tiny three-row case costs more when split because of extra table/index pages. With repeated inputs, the synthetic repetition uses ${(100*(1-share(data.replicated)/n(data.replicated,'legacy'))).toFixed(2)}% less total relation space. The repetition reuses original series/input/timestamps across changed date keys; it is not 37 days of measured sunlight, a production-population sample, or a full-season result. PostgreSQL15 local and PostgreSQL17 production compression/page behavior may differ.

| Write phase | Wall ms including local command transport, n=1 | WAL bytes |
|---|---:|---:|
${data.phases.map(p=>`| ${p.name} | ${p.wallMs.toFixed(2)} | ${p.walBytes} |`).join('\n')}

The repeated legacy writes and shared writes carry the same reconstructed values. WAL can include background cluster activity; these timings are not production throughput measurements.

## Coexistence and limits

Adding the previously measured 294 array venue-days consumed ${n(data.coexistence,'arrays')} bytes of array relation space. Whole scratch database grew from ${data.replicated.database_bytes} to ${data.coexistence.database_bytes} bytes. Both legacy and split alternatives remain present in that total. The array dates/population differ from the three captured legacy rows: this measures additive coexistence occupancy, not equal-payload compression or an exact production migration.

This narrows the formerly missing legacy baseline: the current table layout, three real complete payloads, exact reconstruction, repeated-input costs and a bounded coexistence case are now measured. Full production-volume migration coexistence, retained real input-version diversity, cold reads and hosted-platform performance remain unmeasured. Supabase branch inspection on September14 returned only the default main production project; no separate hosted benchmark branch was available. No production write experiment was attempted.

Full-cohort season calculations remain extrapolated; full-season publication coverage is still required. Existing owner acceptance covers horizon, detector risk and completeness semantics. G1d and combined Story15.1 acceptance remain pending; no requirement is waived here.

## Reproduce

From nextjs-app: node scripts/benchmarks/epic-15/legacy-storage.mjs <guard-owned-container> <fresh-e15_database> <absolute-evidence-root> <fresh-absolute-output>. E15_GUARD_RESOURCE is required; the caller must verify ownership through the guard first. Retained layout uses legacy-01 inputs and sql-06 output. Regenerate this document with node scripts/benchmarks/epic-15/legacy-storage-report.mjs <evidence-root>. The report requires completion and hash-bound captures/workload inputs. Raw SQL, settings, relation totals and write observations are retained. No application runtime, migration, weather contract or production state was changed.
`;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))process.stdout.write(legacyStorageReport(process.argv[2]));
