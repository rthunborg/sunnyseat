import { expect,it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import * as evidenceGates from '../../../../scripts/benchmarks/epic-15/evidence.mjs';
import { compareIntervals,samplePolicy,planSeason } from '../../../../scripts/benchmarks/epic-15/measurement';
import { scoreComparison,validateStrategyEvidence,validateLaneCompletion } from '../../../../scripts/benchmarks/epic-15/evidence.mjs';

it('rejects absent, failed, tainted, truncated and substituted lane evidence',()=>{
  const outputs={'matrix.json':'abc'};
  const good={complete:true,offlineAttempts:0,artifacts:outputs,cells:['a','b']};
  expect(()=>validateLaneCompletion(good,outputs,['a','b'])).not.toThrow();
  for(const bad of [null,{...good,complete:false},{...good,offlineAttempts:1},{...good,artifacts:{}},{...good,artifacts:{'matrix.json':'other'}},{...good,cells:['a','a']},{...good,cells:['a']}])expect(()=>validateLaneCompletion(bad,outputs,['a','b'])).toThrow();
});
it('requires successful hash-bound nine-cell semantics with matching sources',()=>{
  const rows=evidenceGates.semanticCells.map(cell=>{const [percent,state]=cell.split('/');return {percent:Number(percent),state,html:'<button/>',aria:'svenska',currentDetailCopyExample:'källa'};});
  const sources={pin:'original'},hashes={'M04-pin-semantics.json':'measured'};
  const completion={complete:true,offlineAttempts:0,cells:evidenceGates.semanticCells,artifacts:hashes};
  const semantic={rows,sourceHashes:sources};
  expect(()=>evidenceGates.validateSemanticEvidence(completion,hashes,semantic,sources)).not.toThrow();
  for(const bad of [null,{...completion,complete:false},{...completion,offlineAttempts:1},{...completion,artifacts:{}}])expect(()=>evidenceGates.validateSemanticEvidence(bad,hashes,semantic,sources)).toThrow();
  for(const bad of [{...semantic,rows:rows.slice(1)},{...semantic,rows:[...rows.slice(1),rows[1]]},{...semantic,sourceHashes:{pin:'changed'}}])expect(()=>evidenceGates.validateSemanticEvidence(completion,hashes,bad,sources)).toThrow();
});
it('changes input identity when caster heights change without changing fixture IDs',()=>{
  const environment={sourceHashes:Object.fromEntries(evidenceGates.engineSources.map(n=>['nextjs-app/'+n,'a'.repeat(64)]))};
  const original=[{id:'same-id',casters:[{height:15}],seatingElevationM:10}];
  const changed=[{...original[0],casters:[{height:115}]}];
  expect(evidenceGates.strategyIdentity(original,environment,[]).fixturesHash).not.toBe(evidenceGates.strategyIdentity(changed,environment,[]).fixturesHash);
});
it('does not report semantic conclusions when the semantic artifact is missing',()=>{
  const source=fs.readFileSync(path.resolve('scripts/benchmarks/epic-15/summarize.mjs'),'utf8').replace(/^import .*;\r?$/gm,'');
  const dates=['2026-03-01','2026-03-29','2026-06-21','2026-09-22','2026-10-25','2026-10-31','2026-12-21'];
  const solar=dates.map(date=>({date,lat:57.7089,horizon:5,roots:[{t:100},{t:200}]}));
  const slits=dates.flatMap(date=>[.1,.4,2].map(gapMetres=>({date,gapMetres})));
  const edges=solar.flatMap(r=>r.roots.flatMap(root=>[-1000,0,1000].map(delta=>({date:r.date,root,delta}))));
  const elevated=['rooftop-surviving','terrain-surviving'].flatMap(fixture=>dates.map(date=>({fixture,date})));
  const hashes=(names:string[])=>Object.fromEntries(names.map(n=>[n,'hash']));
  const main={complete:true,offlineAttempts:0,cells:dates.map(d=>`a/${d}`),artifacts:hashes(evidenceGates.mainArtifacts)};
  const edge={complete:true,offlineAttempts:0,artifacts:hashes(evidenceGates.edgeArtifacts),cells:[...slits.map(r=>`slit/${r.date}/${r.gapMetres}`),...edges.map(r=>`edge/${r.date}/${r.root.t}/${r.delta}`),...elevated.map(r=>`${r.fixture}/${r.date}`)]};
  const files:Record<string,unknown>={'fixtures.json':{fixtures:[{id:'a'}]},'M01-solar.json':solar,'M02-M03-geometry.json':dates.map(date=>({fixture:'a',date})),'completion.json':main,'edges-completion.json':edge,'M02-physical-slits.json':slits,'M04-exact-edge-values.json':edges,'M02-elevated.json':elevated};
  let writes=0;
  const fakeFs={readFileSync:(file:string)=>{if(path.basename(file)==='M04-pin-semantics.json')throw Error('Missing semantic artifact');return JSON.stringify(files[path.basename(file)]??[]);},writeFileSync:()=>{writes++;}};
  expect(()=>vm.runInNewContext(source,{...evidenceGates,artifactHashes:(_directory:string,names:string[])=>hashes(names),fs:fakeFs,path,createHash,process:{argv:['node','summarize',path.resolve('virtual-evidence')]},console})).toThrow('Missing semantic artifact');
  expect(writes).toBe(0);
});
it('blocks all derived report writes when main or edge completion is absent or tainted',()=>{
  const source=fs.readFileSync(path.resolve('scripts/benchmarks/epic-15/summarize.mjs'),'utf8').replace(/^import .*;\r?$/gm,'');
  const dates=['2026-03-01','2026-03-29','2026-06-21','2026-09-22','2026-10-25','2026-10-31','2026-12-21'];
  const main={complete:true,offlineAttempts:0,cells:dates.map(d=>`a/${d}`),artifacts:Object.fromEntries(evidenceGates.mainArtifacts.map(n=>[n,'hash']))};
  for(const lane of ['completion.json','edges-completion.json'])for(const missing of [true,false]){
    const write=()=>{throw Error('Unexpected derived write');};
    let writes=0;
    const fakeFs={readFileSync:(file:string)=>{
      const name=path.basename(file);
      if(name===lane){if(missing)throw Error('Missing completion');return JSON.stringify({...main,offlineAttempts:1});}
      if(name==='completion.json')return JSON.stringify(main);
      if(name==='fixtures.json')return JSON.stringify({fixtures:[{id:'a'}]});
      if(name==='M02-M03-geometry.json')return JSON.stringify(dates.map(date=>({fixture:'a',date})));
      return '[]';
    },writeFileSync:()=>{writes++;write();}};
    expect(()=>vm.runInNewContext(source,{...evidenceGates,artifactHashes:(_directory:string,names:string[])=>Object.fromEntries(names.map(n=>[n,'hash'])),fs:fakeFs,path,createHash,process:{argv:['node','summarize',path.resolve('virtual-evidence'),'run-test','sql-test']},console})).toThrow(missing?'Missing completion':'Incomplete or tainted measurement lane');
    expect(writes).toBe(0);
  }
});

it('rejects a completely missed shade interval and excludes merged boundary matches',()=>{
  const reference=[{start:0,end:30000,sunny:true},{start:30000,end:60000,sunny:false},{start:60000,end:90000,sunny:true}];
  const merged=[{start:0,end:90000,sunny:true}];
  const c=compareIntervals(reference,merged);
  expect(c.signedErrorsMs).toEqual([]);
  expect(scoreComparison(c,[])).toBe('FAIL');
  expect(scoreComparison(compareIntervals(merged,reference),[])).toBe('FAIL');
  expect(scoreComparison(compareIntervals(reference,reference),[])).toBe('PASS_AGAINST_DECLARED_REFERENCE_ONLY');
});
it('permits bounded matched transitions but rejects excessive duration and safety failures',()=>{
  const ref=[{start:0,end:300000,sunny:true},{start:300000,end:600000,sunny:false}];
  const moved=[{start:0,end:301000,sunny:true},{start:301000,end:600000,sunny:false}];
  const c=compareIntervals(ref,moved);
  expect(scoreComparison(c,[])).toBe('PASS_AGAINST_DECLARED_REFERENCE_ONLY');
  expect(scoreComparison({...c,falseMs:999999},[])).toBe('FAIL');
  expect(scoreComparison(c,['time-limit'])).toBe('FAIL');
});
it('rejects interrupted, duplicate, missing and network-tainted strategy evidence',()=>{
  const expected=[{fixture:'a',strategy:'full',dates:245,samples:123}];
  const row={...expected[0],cpuMs:1,wallMs:2,rssBytes:100,checksum:1,n:1,p95:null};
  const identity={fixturesHash:'original',engineHashes:{engine:'v1'},seasonHash:'dates',coordinate:{lat:57,lng:12}};
  const evidence={complete:true,attempts:0,records:[row],identity};
  expect(()=>validateStrategyEvidence(evidence,expected,identity)).not.toThrow();
  for(const bad of [{...evidence,complete:false},{...evidence,records:[]},{...evidence,records:[row,row]},{...evidence,attempts:1},{...evidence,records:[{...row,samples:122}]}])expect(()=>validateStrategyEvidence(bad,expected,identity)).toThrow();
  for(const changed of [{...identity,fixturesHash:'same IDs but taller casters'},{...identity,engineHashes:{engine:'v2'}},{...identity,seasonHash:'other dates'},{...identity,coordinate:{lat:58,lng:12}}])expect(()=>validateStrategyEvidence(evidence,expected,changed)).toThrow();
});
it('reports actual base and probe counts under sample and time exhaustion',()=>{
  for(const limit of [{maxSamples:1},{maxMs:0}]){
    const r=samplePolicy(()=>100,0,900000,'minute',limit);
    expect(r.additionalSamples).toBeGreaterThanOrEqual(0);
    expect(r.completedBaseSamples+r.additionalSamples).toBe(r.points.length);
    expect(r.baseGridComplete).toBe(false);
    expect(r.verified).toBe(false);
  }
});
it('selects explicit 2027 coverage for November and December 2026 requests',()=>{
  for(const request of ['2026-11-15T12:00:00Z','2026-12-15T12:00:00Z']){
    const p=planSeason(request,2027);
    expect(p.requestLocalDate.startsWith('2026')).toBe(true);
    expect(p.dates).toHaveLength(245);
    expect(p.dates[0]).toBe('2027-03-01');expect(p.dates.at(-1)).toBe('2027-10-31');
    expect(p.dates.every(d=>d.startsWith('2027'))).toBe(true);
    expect(p.dates).not.toContain('2027-02-28');expect(p.dates).not.toContain('2027-11-01');
  }
});
