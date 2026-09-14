import fs from 'node:fs';
import path from 'node:path';
import {artifactHashes,validateLaneCompletion,jsonHash} from './evidence.mjs';
const [root,run='run-06']=process.argv.slice(2);
if(!root||!path.isAbsolute(root))throw Error('Absolute evidence root required');
const directory=path.join(root,run),read=name=>JSON.parse(fs.readFileSync(path.join(directory,name),'utf8'));
const env=read('window-environment.json');
const dates=['2026-03-01','2026-03-29','2026-06-21','2026-09-22','2026-10-25','2026-10-31','2026-12-21'];
const fixtures=JSON.parse(fs.readFileSync(path.join(env.selectedMain,'fixtures.json'),'utf8')).fixtures;
if(jsonHash(fixtures)!==env.fixtureHash||env.offlineAttempts!==0)throw Error('Window input mismatch');
for(const [name,hashes] of [['completion.json',env.mainArtifacts],['edges-completion.json',env.edgeArtifacts]]){
  const completion=JSON.parse(fs.readFileSync(path.join(env.selectedMain,name),'utf8'));
  if(completion.complete!==true||completion.offlineAttempts!==0||jsonHash(completion.artifacts)!==jsonHash(hashes)||jsonHash(artifactHashes(env.selectedMain,Object.keys(hashes)))!==jsonHash(hashes))throw Error('Changed reference lane');
}
if(jsonHash(artifactHashes(process.cwd(),Object.keys(env.sourceHashes)))!==jsonHash(env.sourceHashes))throw Error('Window source changed');
if(jsonHash(artifactHashes(path.resolve('..'),Object.keys(env.ownerDecisionSha256)))!==jsonHash(env.ownerDecisionSha256))throw Error('Owner policy changed');
const expected=[...fixtures.flatMap(f=>dates.map(d=>`${f.id}/${d}`)),...['rooftop-surviving','terrain-surviving'].flatMap(f=>dates.map(d=>`${f}/${d}`)),...dates.flatMap(d=>[.1,.4,2].map(g=>`slit/${d}/${g}`))];
const completion=read('window-completion.json');
validateLaneCompletion(completion,artifactHashes(directory,['M03-window-policy.json','M07-window-analytic.json','M05-window-cost.json','window-environment.json']),expected);
const ledger=read('M03-window-policy.json'),cost=read('M05-window-cost.json'),analytic=read('M07-window-analytic.json');
const keys=ledger.map(r=>`${r.id}/${r.policy}`),expectedKeys=expected.flatMap(id=>['endpoints','midpoint','minute'].map(p=>`${id}/${p}`));
if(keys.length!==expectedKeys.length||new Set(keys).size!==keys.length||expectedKeys.some(k=>!keys.includes(k)))throw Error('Incomplete window matrix');
const fixed=n=>Number(n.toFixed(3));
let report='# Story 15.1 — accepted five-minute window policy measurements\n\nProduct direction is accepted. Measurement acceptance remains OPEN; Story 15.2 remains BLOCKED. No runtime/schema/production changes. This supplement does not rewrite the prior v5 report or historical failed detection evidence.\n\n## Reference reanalysis\n\n105 retained engine-backed cases (70 original, 14 elevated, 21 slit) × three policies. Main/elevated references have a one-minute discovery grid and <=100 ms detected brackets; slit references use a one-second grid. Duration uncertainty is propagated; threshold-overlapping bounds are unresolved. This cannot certify undiscovered shade gaps or field accuracy.\n\n| Policy | PASS against declared filtered reference | FAIL/unresolved |\n|---|---:|---:|\n';
for(const policy of ['endpoints','midpoint','minute']){
  const rows=ledger.filter(r=>r.policy===policy),passed=rows.filter(r=>r.result!=='FAIL').length;
  report+=`| ${policy} | ${passed} | ${rows.length-passed} |\n`;
}
report+='\n## Analytic counterexamples\n\nExact 299/300/301-second input intervals test the duration threshold. Qualifying intervals start immediately; raw input values are preserved. Two 290-second sun bursts separated by a 10-second shade gap must both be suppressed. These are analytic signals, not physical terrace observations.\n\n| Signal | Candidate | False sunny ms after filtering | Missed sunny ms | Candidate complete |\n|---|---|---:|---:|---|\n';
for(const row of analytic)for(const c of row.candidates)report+=`| ${row.id} | ${c.policy} | ${c.comparison.falseMs} | ${c.comparison.missedMs} | ${c.actual.complete} |\n`;
report+='\nA missed shade gap can merge separate short bursts into a falsely qualifying window. Five-minute filtering therefore does not by itself fix the discovery limitation. Unresolved duration means no certified result; complete computation is not a detection guarantee. Reference-grid blind spots remain explicit.\n\n## New computation measurements\n\nExisting shadow engine plus minute/adaptive samples and filtering, three synthetic caster configurations × seven dates. One warmup and five observations per cell; p95 is descriptive with n=5, not a stable production tail estimate. Windows CPU accounting is coarse. No field inventory weighting.\n\n| Fixture | Date | Wall p50 ms | Wall p95 ms | CPU p95 ms | Incomplete observations |\n|---|---|---:|---:|---:|---:|\n';
for(const c of cost.cost)report+=`| ${c.fixture} | ${c.date} | ${fixed(c.wallMs.p50)} | ${fixed(c.wallMs.p95)} | ${fixed(c.cpuMs.p95)} | ${c.observations.filter(r=>!r.complete||r.failures.length).length} |\n`;
const full=cost.fullSeason;
report+=`\nFull 2026 March–October adaptive calculation for one synthetic ${full.fixture.id} fixture: ${full.dates.length} dates, ${full.dates.reduce((n,d)=>n+d.samples,0)} samples, ${fixed(full.wallMs/1000)} seconds wall, ${fixed(full.cpuMs/1000)} seconds CPU, n=1 (no p95); ${full.dates.filter(d=>!d.complete||d.failures.length).length} incomplete/unresolved dates. Excludes SQL, invalidation orchestration, concurrency and recovery. No inventory/growth extrapolation is made from this single fixture.\n\nFilter-only processing of retained interval lists: per-call wall p50 ${fixed(cost.filterOnly.perCallWallMs.p50)} ms, p95 ${fixed(cost.filterOnly.perCallWallMs.p95)} ms; ${cost.filterOnly.n} batch observations, 1,000 calls per batch, five warmup batches per case. This is filtering overhead only, not shadow computation.\n`;
report+='\n## Budget disposition and remaining work\n\nNo suitable current inventory with resolved venue/caster inputs or actual database baseline was found in the inspected local fixture/evidence locations. Building geodata alone is not that capture. Representative initial/repair/invalidation costs, growth/retention/headroom and controlled read/load budgets remain BLOCKED/NOT MEASURED. Prior sql-03 relation/whole-database measurements remain valid for their unchanged synthetic dataset; no new database-size result is claimed. A derived window representation has not been selected or measured in SQL, and serialized bytes cannot substitute for total database size.\n\nRetain the owner-approved rule and provisional arrays, but do not approve the current minute sampler or production budgets. A method must detect qualifying windows without joining them across missed shade gaps; near-300-second uncertainty needs resolved bounds. Additional representative data and implementation-independent discovery evidence are required before combined G1 acceptance. No fourth automatic review or Story 15.2 work was performed.\n';
fs.writeFileSync(path.join(directory,'WINDOW-POLICY.md'),report);
console.log('Wrote hash-validated WINDOW-POLICY.md');
