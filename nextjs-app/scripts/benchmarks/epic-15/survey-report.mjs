import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {artifactHashes,validateLaneCompletion} from './evidence.mjs';
export function summarizeSurvey(dir){
  const read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'));
  const data=read('survey.json'),env=read('environment.json');
  const ids=data.season.map(s=>s.id),dates=['2026-03-01','2026-03-29','2026-06-21','2026-09-22','2026-10-25','2026-10-31'];
  if(ids.length!==42||new Set(ids).size!==42||JSON.stringify(data.dates)!==JSON.stringify(dates))throw Error('Invalid survey matrix');
  const expected=ids.flatMap(id=>dates.map(date=>`${id}/${date}`));
  const hashes=artifactHashes(dir,['survey.json','environment.json']);
  validateLaneCompletion(read('completion.json'),hashes,expected);
  validateLaneCompletion({...read('completion.json'),cells:data.cells.map(c=>`${c.id}/${c.date}`)},hashes,expected);
  if(env.offlineAttempts!==0)throw Error('External attempts');
  const seasonDates=Array.from({length:245},(_,i)=>new Date(Date.UTC(2026,2,1+i)).toISOString().slice(0,10));
  for(const s of data.season)if(JSON.stringify(s.days.map(d=>d.date))!==JSON.stringify(seasonDates)||s.days.some(d=>!Number.isInteger(d.samples)||d.samples<2))throw Error('Incomplete season counts');
  const short=[];let runs=0,shade=0;
  for(const c of data.cells)for(const [index,r] of c.reference.result.intervals.entries()){
    runs++;if(!r.sunny)shade++;
    if(r.end-r.start<300000)short.push({id:c.id,date:c.date,index,sunny:r.sunny,seconds:(r.end-r.start)/1000,interior:index>0&&index<c.reference.result.intervals.length-1,start:r.start,end:r.end});
  }
  const samples=data.season.reduce((n,s)=>n+s.days.reduce((n,d)=>n+d.samples,0),0);
  const projection=data.season.map(s=>{const cells=data.cells.filter(c=>c.id===s.id),base=cells.reduce((n,c)=>n+c.plainPoints.length,0),factor=s.days.reduce((n,d)=>n+d.samples,0)/base;return {id:s.id,cpuMs:factor*cells.reduce((n,c)=>n+c.refined.cpuMs,0),wallMs:factor*cells.reduce((n,c)=>n+c.refined.wallMs,0)};});
  return {venueDays:data.cells.length,runs,shadeRuns:shade,short,plainTopologyFailures:data.cells.filter(c=>!c.plainComparison.topologyMatches).map(c=>({id:c.id,date:c.date})),refinedTopologyFailures:data.cells.filter(c=>!c.refinedComparison.topologyMatches).map(c=>({id:c.id,date:c.date})),plainOverTwoMinutes:data.cells.filter(c=>c.plainComparison.maxErrorMs>120000).length,refinedOverTwoMinutes:data.cells.filter(c=>c.refinedComparison.maxErrorMs>120000).length,seasonSamples:samples,logicalArrayBytes:samples*12,measuredRefinedWallMs:data.cells.reduce((n,c)=>n+c.refined.wallMs,0),measuredRefinedCpuMs:data.cells.reduce((n,c)=>n+c.refined.cpuMs,0),projectedSeasonWallMs:projection.reduce((n,p)=>n+p.wallMs,0),projectedSeasonCpuMs:projection.reduce((n,p)=>n+p.cpuMs,0),projection};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))process.stdout.write(JSON.stringify(summarizeSurvey(process.argv[2]),null,2)+'\n');
