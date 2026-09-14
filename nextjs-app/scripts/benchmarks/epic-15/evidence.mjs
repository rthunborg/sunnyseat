/** Shared fail-closed report gates. A small boundary error never waives missing transitions. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const artifactHashes=(directory,names)=>Object.fromEntries(names.map(name=>[name,createHash('sha256').update(fs.readFileSync(path.join(directory,name))).digest('hex')]));
export function publishLane(directory,name,completion,names,expectedCells){
  const evidence={...completion,artifacts:artifactHashes(directory,names)};
  validateLaneCompletion(evidence,evidence.artifacts,expectedCells);
  const target=path.join(directory,name);
  if(fs.existsSync(target))throw Error('Refusing completion overwrite');
  fs.writeFileSync(target+'.tmp',JSON.stringify(evidence,null,2),{flag:'wx'});
  fs.renameSync(target+'.tmp',target);
}
export function validateLaneCompletion(completion,artifacts,cells) {
  if(completion?.complete!==true||completion.offlineAttempts!==0||!completion.artifacts||!Array.isArray(completion.cells))throw Error('Incomplete or tainted measurement lane');
  if(Object.keys(completion.artifacts).length!==Object.keys(artifacts).length||Object.entries(artifacts).some(([name,hash])=>completion.artifacts[name]!==hash))throw Error('Missing or substituted lane artifact');
  if(new Set(cells).size!==cells.length||completion.cells.length!==cells.length||new Set(completion.cells).size!==cells.length||cells.some(c=>!completion.cells.includes(c)))throw Error('Incomplete lane cells');
}
export const mainArtifacts=['environment.json','fixtures.json','M01-rollover.json','M01-solar.json','M01-dst.json','M01-season.json','M02-M03-geometry.json','M04-low-angle-deltas.json','M06-identical-dataset.json','M03-adversaries.json','M03-limits.json','M03-trigger-boundaries.json','M05-cpu-raw.json','M05-cpu-summary.json','M05-M07-projections.json','M06-payload-decode.json'];
export const edgeArtifacts=['M02-physical-slits.json','M04-exact-edge-values.json','M02-elevated.json'];
export const semanticCells=[25,0,100].flatMap(p=>['likely','blocked','unknown'].map(s=>`${p}/${s}`));
export const semanticSources=['components/custom/map/VenuePin.tsx','lib/utils/public-sun.ts','messages/sv/map.json','messages/sv/venue.json','test/unit/benchmarks/epic-15/semantics.test.tsx'];
export const engineSources=['package-lock.json','scripts/benchmarks/epic-15/measurement.ts',...['solar-calculation-service.ts','solar-math.ts','shadow-calculation-service.ts','shadow-geometry.ts','timezone-utils.ts','constants.ts'].map(n=>'lib/solar/'+n)];
export const jsonHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function strategyIdentity(fixtures,environment,season){
  const engineHashes=Object.fromEntries(engineSources.map(n=>{
    const hash=environment.sourceHashes?.['nextjs-app/'+n];
    if(typeof hash!=='string'||!/^[a-f0-9]{64}$/.test(hash))throw Error('Missing engine identity');
    return [n,hash];
  }));
  return {fixturesHash:jsonHash(fixtures),engineHashes,seasonHash:jsonHash(season),coordinate:{lat:57.7089,lng:11.9746}};
}
export function validateSemanticEvidence(completion,hashes,semantic,sources){
  validateLaneCompletion(completion,hashes,semanticCells);
  validateLaneCompletion({...completion,cells:semantic.rows?.map(r=>`${r.percent}/${r.state}`)},hashes,semanticCells);
  if(jsonHash(semantic.sourceHashes)!==jsonHash(sources)||semantic.rows.some(r=>typeof r.html!=='string'||!r.html||typeof r.aria!=='string'||!r.aria||typeof r.currentDetailCopyExample!=='string'))throw Error('Invalid semantic source evidence');
}
export function scoreComparison(c,failures) {
  const boundaryToleranceMs=120000;
  const durationToleranceMs=c.transitionCount*boundaryToleranceMs;
  return failures.length || !c.topologyMatches || c.missedRuns || c.falseRuns || c.splits || c.merges ||
    !Number.isFinite(c.maxErrorMs) || c.maxErrorMs>boundaryToleranceMs ||
    !Number.isFinite(c.missedMs+c.falseMs) || c.missedMs+c.falseMs>durationToleranceMs
    ? 'FAIL':'PASS_AGAINST_DECLARED_REFERENCE_ONLY';
}
export function expectedStrategyCells(fixtureIds,season) {
  const selections={full:season,remaining:season.filter(d=>d.date>='2026-09-10'),rolling:season.filter(d=>d.date>='2026-09-10'&&d.date<='2026-09-14'),repair:season.filter(d=>d.date==='2026-09-10')};
  return fixtureIds.flatMap(fixture=>Object.entries(selections).map(([strategy,days])=>({fixture,strategy,dates:days.length,samples:days.reduce((n,d)=>n+d.count,0)})));
}
export function validateStrategyEvidence(evidence,expected,identity) {
  if(!identity||!evidence.identity||jsonHash(evidence.identity)!==jsonHash(identity))throw Error('Strategy input identity mismatch');
  if(evidence.complete!==true||evidence.attempts!==0||!Array.isArray(evidence.records)||evidence.records.length!==expected.length)throw Error('Incomplete or tainted strategy evidence');
  const seen=new Set();
  for(const row of evidence.records) {
    const key=JSON.stringify([row.fixture,row.strategy]);
    const cell=expected.find(e=>e.fixture===row.fixture&&e.strategy===row.strategy);
    if(seen.has(key)||!cell||row.dates!==cell.dates||row.samples!==cell.samples||row.n!==1||row.p95!==null||
      !['wallMs','cpuMs','rssBytes','checksum'].every(k=>Number.isFinite(row[k])&&row[k]>=0))throw Error('Invalid strategy cell');
    seen.add(key);
  }
  return evidence;
}
