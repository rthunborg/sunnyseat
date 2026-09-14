import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {artifactHashes,validateLaneCompletion} from './evidence.mjs';
import {summarizeSurvey} from './survey-report.mjs';
const median=xs=>{const s=[...xs].sort((a,b)=>a-b);return s[Math.floor(s.length/2)];};
export function thresholdSummary(root){
  const read=(d,n)=>JSON.parse(fs.readFileSync(path.join(root,d,n),'utf8'));
  summarizeSurvey(path.join(root,'run-12'));
  const survey=read('run-12','survey.json'),data=read('run-14','threshold.json'),env=read('run-14','environment.json');
  const surveyHashes=artifactHashes(path.join(root,'run-12'),['survey.json','environment.json','completion.json']);
  if(JSON.stringify(surveyHashes)!==JSON.stringify(env.surveyHashes)||env.offlineAttempts!==0)throw Error('Survey identity or attempt mismatch');
  const expected=[...survey.cells.flatMap(c=>[1,5,10].map(m=>`cal/${c.id}/${c.date}/${m}`)),...survey.season.flatMap(s=>['2026-04-15','2026-08-15'].map(d=>`held/${s.id}/${d}`)),...['34','8','47','49'].flatMap(id=>[-1,0,1,2].flatMap(r=>['base','threshold'].map(m=>`paired/${id}/${r}/${m}`)))];
  const cells=[...data.calibration.map(c=>`cal/${c.id}/${c.date}/${c.margin}`),...data.heldOut.map(c=>`held/${c.id}/${c.date}`),...data.paired.map(c=>`paired/${c.id}/${c.repetition}/${c.method}`)];
  const hashes=artifactHashes(path.join(root,'run-14'),['threshold.json','environment.json']),completion=read('run-14','completion.json');
  validateLaneCompletion(completion,hashes,expected);validateLaneCompletion({...completion,cells},hashes,expected);
  for(const c of [...data.calibration,...data.heldOut]){
    const r=c.measured.result;
    if(r.complete!==true||r.certifiedContinuous!==false||!Number.isInteger(r.samples)||r.samples!==r.counts.base+r.counts.interior+r.counts.boundary||Object.values(r.counts).some(n=>!Number.isInteger(n)||n<0)||r.points.length!==r.samples||![c.measured.wallMs,c.measured.cpuMs].every(n=>Number.isFinite(n)&&n>=0))throw Error('Invalid measurement counters or timing');
  }
  const group=rows=>({days:rows.length,rawFailures:rows.filter(c=>!c.comparison.raw.topologyMatches||c.comparison.raw.maxErrorMs>120000).map(c=>({id:c.id,date:c.date,...c.comparison.raw})),filteredFailures:rows.filter(c=>!c.comparison.filtered.topologyMatches||c.comparison.filtered.maxErrorMs>120000).map(c=>({id:c.id,date:c.date,...c.comparison.filtered})),unresolved:rows.filter(c=>!c.comparison.durationComplete||!c.comparison.referenceDurationComplete).map(c=>({id:c.id,date:c.date})),base:rows.reduce((n,c)=>n+c.measured.result.counts.base,0),interior:rows.reduce((n,c)=>n+c.measured.result.counts.interior,0),boundary:rows.reduce((n,c)=>n+c.measured.result.counts.boundary,0),wallMs:rows.reduce((n,c)=>n+c.measured.wallMs,0),cpuMs:rows.reduce((n,c)=>n+c.measured.cpuMs,0)});
  const calibration=Object.fromEntries([1,5,10].map(m=>[m,group(data.calibration.filter(c=>c.margin===m))]));
  const heldOut=group(data.heldOut),chosen=[...data.calibration.filter(c=>c.margin===5),...data.heldOut];
  const projected=survey.season.map(s=>{const rows=chosen.filter(c=>c.id===s.id),base=rows.reduce((n,c)=>n+c.measured.result.counts.base,0),seasonBase=s.days.reduce((n,d)=>n+d.samples,0),factor=seasonBase/base;return {id:s.id,base:seasonBase,estimatedSamples:factor*rows.reduce((n,c)=>n+c.measured.result.samples,0),wallMs:factor*rows.reduce((n,c)=>n+c.measured.wallMs,0),cpuMs:factor*rows.reduce((n,c)=>n+c.measured.cpuMs,0)};});
  const season=projected.reduce((a,p)=>({base:a.base+p.base,estimatedSamples:a.estimatedSamples+p.estimatedSamples,wallMs:a.wallMs+p.wallMs,cpuMs:a.cpuMs+p.cpuMs}),{base:0,estimatedSamples:0,wallMs:0,cpuMs:0});
  const pairs=['34','8','47','49'].map(id=>{const rows=data.paired.filter(c=>c.id===id&&c.repetition>=0),base=rows.filter(c=>c.method==='base'),threshold=rows.filter(c=>c.method==='threshold');return {id,n:base.length,baseWallMedianMs:median(base.map(c=>c.wallMs)),thresholdWallMedianMs:median(threshold.map(c=>c.wallMs)),baseSamples:base[0].result.samples,thresholdSamples:threshold[0].result.samples,p95:null};});
  const gap=data.calibration.find(c=>c.id==='49'&&c.date==='2026-10-25'&&c.margin===5);
  return {calibration,heldOut,pairs,season,growth:[50,100,500].map(venues=>({venues,wallMs:season.wallMs*venues/42,cpuMs:season.cpuMs*venues/42,baseSamples:season.base*venues/42,estimatedSamples:season.estimatedSamples*venues/42})),posthotellet:{raw:gap.comparison.raw,filtered:gap.comparison.filtered,intervals:gap.measured.result.intervals},scope:data.scope};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))process.stdout.write(JSON.stringify(thresholdSummary(process.argv[2]),null,2)+'\n');
