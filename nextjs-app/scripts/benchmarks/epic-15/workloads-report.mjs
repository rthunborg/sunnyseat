import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {artifactHashes,validateLaneCompletion,jsonHash} from './evidence.mjs';
export function validateWorkloads(data,completion,hashes,capture){
  const names=['initial-seven','staged-seven','rolling-five','repair-one','venue-edit','local-import','all-invalidation','single-venue-full-season'];
  const dates=Array.from({length:7},(_,i)=>`2026-09-${21+i}`),season=Array.from({length:245},(_,i)=>new Date(Date.UTC(2026,2,1+i)).toISOString().slice(0,10));
  const changed=new Set(capture.venues.find(v=>v.id==='49').casterIds);
  const affected=capture.venues.filter(v=>v.casterIds.some(id=>changed.has(id))).map(v=>v.id);
  const expected=[...names,...[1,4,8].flatMap(n=>Array.from({length:22},(_,i)=>i-2).flatMap(r=>Array.from({length:n},(_,c)=>`read/${n}/${r}/${c}`))),'noop'];
  validateLaneCompletion(completion,hashes,expected);
  validateLaneCompletion({...completion,cells:[...data.workloads.map(w=>w.name),...data.reads.map(r=>`read/${r.clients}/${r.round}/${r.client}`),'noop']},hashes,expected);
  for(const w of data.workloads){
    const ids=['repair-one','venue-edit','single-venue-full-season'].includes(w.name)?['49']:w.name==='local-import'?affected:capture.venues.map(v=>v.id);
    const ds=w.name==='single-venue-full-season'?season:w.name==='repair-one'?['2026-09-22']:w.name==='rolling-five'?dates.slice(2):dates;
    const cells=ids.flatMap(id=>ds.map(d=>`${id}/${d}`)),actual=w.cells.map(c=>`${c.id}/${c.date}`);
    if(!w.complete||w.days!==cells.length||actual.length!==cells.length||new Set(actual).size!==cells.length||cells.some(c=>!actual.includes(c))||jsonHash(w.cells)!==w.outputHash||!Number.isFinite(w.wallMs)||w.wallMs<0)throw Error('Incomplete workload '+w.name);
    const batches=data.batches.filter(b=>b.workload===w.name);
    if(batches.reduce((s,b)=>s+b.days,0)!==cells.length||batches.some((b,i)=>b.index!==i||['wallMs','cpuMs','samples','sampledHeapPeakBytes','processMaxRssKiB','walBytes'].some(k=>!Number.isFinite(b[k])||b[k]<0)))throw Error('Invalid batch accounting');
  }
  if(data.reads.some(r=>['transportMs','decodeMs','bytes'].some(k=>!Number.isFinite(r[k])||r[k]<0)))throw Error('Invalid read timing');
  return data;
}
export function workloadsReport(root){
  const dir=path.join(root,'run-18'),read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'));
  const env=read('environment.json'),capture=JSON.parse(fs.readFileSync(path.join(root,'capture-01/inputs.json'),'utf8'));
  if(env.offlineAttempts!==0||JSON.stringify(env.captureHashes)!==JSON.stringify(artifactHashes(path.join(root,'capture-01'),Object.keys(env.captureHashes)))||JSON.stringify(env.inputHashes)!==JSON.stringify(artifactHashes(path.join(root,'run-14'),Object.keys(env.inputHashes))))throw Error('Unbound workload inputs');
  const data=validateWorkloads(read('workloads.json'),read('completion.json'),artifactHashes(dir,['workloads.json','environment.json']),capture);
  const f=n=>n.toFixed(2),p=(xs,n)=>xs.toSorted((a,b)=>a-b)[Math.ceil(xs.length*n)-1];
  const rows=data.workloads.map(w=>{const bs=data.batches.filter(b=>b.workload===w.name);return `| ${w.name} | ${w.days} | ${f(w.wallMs/1000)} | ${f(bs.reduce((s,b)=>s+b.cpuMs,0)/1000)} | ${f(Math.max(...bs.map(b=>b.wallMs))/1000)} | ${bs.reduce((s,b)=>s+b.walBytes,0)} |`;}).join('\n');
  const reads=[1,4,8].map(c=>{const r=data.reads.filter(r=>r.clients===c&&r.round>=0);return `| ${c} | ${r.length} | ${f(p(r.map(x=>x.transportMs),.5))} | ${f(p(r.map(x=>x.transportMs),.95))} | ${f(p(r.map(x=>x.decodeMs),.95))} |`;}).join('\n');
  const staged=data.batches.filter(b=>b.workload!=='initial-seven'),max=Math.max(...staged.map(b=>b.wallMs));
  return `# Array-only workload measurements — Story 15.1

Measured at ${data.at}. Fresh guard-managed scratch database; captured September input geometry, accepted detector. All ${data.workloads.length} workloads completed. This report does not approve G1d or close Story 15.1.

| Workload | Venue-days | End-to-end wall seconds | Node batch CPU seconds | Slowest batch seconds | Batch WAL bytes |
|---|---:|---:|---:|---:|---:|
${rows}

End-to-end includes input write/load, horizon and exposure calculation, array serialization, local Docker/psql transport, storage and completion checks. Batch wall excludes input setup, WAL inspection and completion checks. CPU covers Node only, not Postgres/child processes. WAL is measured around each compute/store batch in the isolated workload; background cluster activity can contribute. Workloads are n=1 and run sequentially; initial versus staged differences include cache/order effects, not a controlled speedup claim.

There were ${staged.length} directly timed bounded batches (at most five venues by three dates). Maximum ${f(max/1000)} seconds; ${staged.filter(b=>b.wallMs>60000).length} exceeded the proposed 60-second ceiling. This measures the candidate batch size locally; it does not implement deadline admission or establish hosted-platform limits. No-op completion lookup took ${f(data.noOpMs)} ms; it did not recompute geometry or perform writes. This is a known unchanged-input scenario, not a production invalidation detector.

The full season was actually calculated for venue 49: all 245 dates. Other full-season cohort costs remain projections. Local-import perturbation raises ${data.changedCasterIds.length} caster heights by 2m and invalidates all ${data.affectedVenueIds.length} captured venues sharing those IDs, across seven dates. Payload change is asserted. It does not measure spatial re-resolution for new/removed buildings or real ingestion. All-invalidation recalculates seven dates for the entire captured cohort; it is not an inventory-wide full-season rebuild.

## Memory

Maximum observed heap ${f(Math.max(...data.batches.map(b=>b.sampledHeapPeakBytes))/1e6)} MB; OS process-lifetime high-water RSS ${f(Math.max(...data.batches.map(b=>b.processMaxRssKiB))*1024/1e6)} MB. Heap is sampled every 100 evaluations and at batch edges and may miss peaks. RSS includes the Vitest harness, captured data and accumulated results; neither value is isolated per-batch allocation or Postgres memory. This is evidence for local process sizing, not a deployment memory guarantee.

## Controlled concurrent reads

| Concurrent connections | Measured reads after warmups | Transport p50 ms | Transport p95 ms | Decode p95 ms |
|---|---:|---:|---:|---:|
${reads}

Two warmup rounds then twenty measured rounds per concurrency level; each connection returns all 42 venue rows for September 22 and is checked against calculated arrays. Transport includes process/connection startup and JSON serialization. The cache was not evicted: these are warm local contention observations, not cold-cache or production API latency. Plans and buffers are retained in workloads.json. The proposed 100ms query-plus-decode target is not evaluated by this transport metric.

Whole scratch database: ${data.census.database_bytes} bytes, including all alternative workload generations and shared inputs. This is not a current-plus-rollback retention estimate. No application tables, migrations, production writes or cleanup were used.

## Reproduce and outstanding gates

Run workloads.measurement.ts from nextjs-app with the benchmark Vitest configuration, absolute E15_EVIDENCE_ROOT, a fresh E15_OUTPUT, fresh e15_ E15_DATABASE and an actor-verified guard resource/container. The runner refuses existing outputs/databases and publishes completion only after expected workload sets, readbacks and zero external attempts. node scripts/benchmarks/epic-15/workloads-report.mjs <evidence-root> validates hashes and exact venue/date/read sets before reporting.

Cold-cache/hosted-platform measurement, actual full-cohort season generation, production ingestion/resolution costs, exact legacy-row replacement/coexistence and final numerical-budget approval remain open. Local results cannot close those gates. No fourth automatic review was run.
`;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))process.stdout.write(workloadsReport(process.argv[2]));
