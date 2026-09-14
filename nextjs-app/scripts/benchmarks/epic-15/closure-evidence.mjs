// Offline closure arithmetic only; no timing, database, or network operations.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {acceptanceReport} from './acceptance-report.mjs';
import {workloadsReport} from './workloads-report.mjs';
import {acceptedMatrixReport} from './accepted-matrix-report.mjs';
import {legacyStorageReport} from './legacy-storage-report.mjs';

const root=path.resolve(process.argv[2]);
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const manifest=read('file-manifest.json');
for(const e of manifest){
  const bytes=fs.readFileSync(path.join(root,e.path));
  if(bytes.length!==e.bytes||crypto.createHash('sha256').update(bytes).digest('hex')!==e.sha256)throw Error('Evidence mismatch: '+e.path);
}
for(const [name,fn] of [
  ['ACCEPTANCE-PACKAGE-2026-09-12.md',acceptanceReport],
  ['WORKLOADS-2026-09-12.md',workloadsReport],
  ['ACCEPTED-MATRIX-2026-09-12.md',acceptedMatrixReport],
  ['LEGACY-STORAGE-2026-09-14.md',legacyStorageReport],
])if(fn(root)!==fs.readFileSync(path.join(root,name),'utf8'))throw Error('Report mismatch: '+name);

const summary=read('run-14/summary.json'),cost=read('run-15/cost.json');
const percentile=(values,q)=>values.toSorted((a,b)=>a-b)[Math.ceil(values.length*q)-1];
const strata=[...new Set(cost.rows.map(r=>r.id))].map(id=>{
  const rows=cost.rows.filter(r=>r.id===id&&r.method==='threshold'&&r.repetition>=0);
  return {id,casters:rows[0].casters,n:rows.length,wallP50Ms:percentile(rows.map(r=>r.wallMs),.5),wallP95Ms:percentile(rows.map(r=>r.wallMs),.95),cpuP95Ms:percentile(rows.map(r=>r.cpuMs),.95)};
});
// September 14 only measured application DB. Do not splice older cluster DBs into a current census.
const censusTool=read('legacy-01/census-tool.json');
const census=JSON.parse(JSON.parse(censusTool.content[0].text).result.split('\n').find(s=>s.startsWith('[{')))[0].json_build_object;
const pipeline=read('run-17/pipeline.json');
const relation=(snapshot,name)=>snapshot.relations.find(r=>r.relname===name).total_bytes;
const datedApplicationBytes=census.database_bytes;
const observedArrayWeekBytes=relation(pipeline.current,'arrays'),observedDays=pipeline.rows.length,seasonDays=read('capture-01/inputs.json').venues.length*245;
const observedSharedBytes=relation(pipeline.edited,'inputs')+relation(pipeline.edited,'generations');
const estimatedSeasonBytes=observedArrayWeekBytes*seasonDays/observedDays;
const proposedSeasonBudgetBytes=30000000,proposedSharedReserveBytes=5000000;
const models=[2,3,4,5].map(copies=>({copies,
  scope:'EXTRAPOLATED additive layout sensitivity; not actual previous-year geometry or current cluster headroom',
  projectedApplicationBytes:datedApplicationBytes+copies*estimatedSeasonBytes+observedSharedBytes,
  budgetedApplicationBytes:datedApplicationBytes+copies*proposedSeasonBudgetBytes+proposedSharedReserveBytes,
  remainingToAdmissionBytesBeforeOtherDatabases:400000000-(datedApplicationBytes+copies*proposedSeasonBudgetBytes+proposedSharedReserveBytes),
}));
const populations=[{venues:42,...summary.season},...summary.growth];
process.stdout.write(JSON.stringify({
  kind:'DERIVED_FROM_RETAINED_EVIDENCE_NOT_NEW_MEASUREMENT',
  sources:['run-14/summary.json','run-15/cost.json','run-17/pipeline.json','legacy-01/census-tool.json'],
  strata,seasonCosts:populations.map(p=>({venues:p.venues,datesPerVenue:245,estimatedComputeWallMinutes:p.wallMs/60000,estimatedNodeCpuMinutes:p.cpuMs/60000,proposedWallCeilingMinutes:120*p.venues/42,proposedNodeCpuCeilingMinutes:100*p.venues/42})),
  retainedCapacity:{datedApplicationBytes,observedArrayWeekBytes,observedDays,seasonDays,estimatedSeasonBytes,proposedSeasonBudgetBytes,proposedSharedReserveBytes,models},
},null,2)+'\n');
