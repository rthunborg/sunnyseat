import {it,expect,afterEach} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {summarizeSurvey} from '../../../../scripts/benchmarks/epic-15/survey-report.mjs';
import {artifactHashes} from '../../../../scripts/benchmarks/epic-15/evidence.mjs';
const dirs:string[]=[];
afterEach(()=>{for(const d of dirs.splice(0)){for(const n of fs.readdirSync(d))fs.unlinkSync(path.join(d,n));fs.rmdirSync(d);}});
function fixture(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'e15-survey-'));dirs.push(dir);
  const dates=['2026-03-01','2026-03-29','2026-06-21','2026-09-22','2026-10-25','2026-10-31'];
  const season=Array.from({length:42},(_,id)=>({id:String(id),days:Array.from({length:245},(_,i)=>({date:new Date(Date.UTC(2026,2,1+i)).toISOString().slice(0,10),samples:100}))}));
  const cells=season.flatMap(s=>dates.map(date=>({id:s.id,date,reference:{result:{intervals:[{start:0,end:600000,sunny:true},{start:600000,end:660000,sunny:false},{start:660000,end:1260000,sunny:true}]}},plainPoints:[{t:0,value:100}],plainComparison:{topologyMatches:false,maxErrorMs:140000},refinedComparison:{topologyMatches:false,maxErrorMs:0},refined:{wallMs:10,cpuMs:9}})));
  const data={dates,season,cells};
  const write=()=>{fs.writeFileSync(path.join(dir,'survey.json'),JSON.stringify(data));fs.writeFileSync(path.join(dir,'environment.json'),JSON.stringify({offlineAttempts:0}));fs.writeFileSync(path.join(dir,'completion.json'),JSON.stringify({complete:true,offlineAttempts:0,cells:cells.map(c=>`${c.id}/${c.date}`),artifacts:artifactHashes(dir,['survey.json','environment.json'])}));};
  write();return {dir,data,write};
}
it('counts interior shade separately and preserves missed topology despite precise matched edges',()=>{
  const {dir}=fixture(),s=summarizeSurvey(dir);
  expect(s.short).toHaveLength(252);expect(s.short.every((r:{sunny:boolean;interior:boolean})=>!r.sunny&&r.interior)).toBe(true);
  expect(s.refinedTopologyFailures).toHaveLength(252);expect(s.refinedOverTwoMinutes).toBe(0);
});
it('refuses a freshly hash-bound incomplete venue-day matrix',()=>{
  const {dir,data,write}=fixture();data.cells.pop();write();expect(()=>summarizeSurvey(dir)).toThrow('Incomplete lane cells');
});
it('refuses incomplete season projections even when the measured matrix is complete',()=>{
  const {dir,data,write}=fixture();data.season[0].days.pop();write();expect(()=>summarizeSurvey(dir)).toThrow('Incomplete season counts');
});
