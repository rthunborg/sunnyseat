import {it,expect,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {fixtures,elevatedFixtures,origin} from '../../../test/fixtures/epic-15/geometries';
import {thresholdScan} from './threshold-sampling';
import {scanWindow} from './dense-sampling';
import {filterWindows} from './window-policy';
import {requiredDates,daylight,compareIntervals} from './measurement';
import {calculateVenueShadowFromBuildings} from '../../../lib/solar/shadow-calculation-service';
import {artifactHashes,engineSources,publishLane} from './evidence.mjs';
const guard=vi.hoisted(()=>({attempts:0}));
vi.mock('@/lib/supabase/server',()=>({supabaseServiceRole:new Proxy({}, {get(){guard.attempts++;throw Error('Offline synthetic matrix');}})}));
it('measures the accepted detector on every synthetic fixture and required date',()=>{
  const out=process.env.E15_OUTPUT;
  if(!out||!path.isAbsolute(out)||fs.existsSync(out))throw Error('Fresh absolute output required');
  const selected=[...fixtures,...elevatedFixtures],sources=artifactHashes(process.cwd(),[...engineSources,...['accepted-matrix.measurement.ts','threshold-sampling.ts','dense-sampling.ts','window-policy.ts','evidence.mjs'].map(n=>'scripts/benchmarks/epic-15/'+n),'test/fixtures/epic-15/geometries.ts']);
  const at=new Date().toISOString(),fetch=globalThis.fetch;globalThis.fetch=async()=>{guard.attempts++;throw Error('Offline matrix');};vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-09-12T12:00:00Z'));
  try{
    const cells=[];
    for(const f of selected)for(const date of requiredDates){
      const support=daylight(date,origin.lat,origin.lng,5),evaluate=(t:number)=>calculateVenueShadowFromBuildings(f.seating,new Date(t),f.casters,f).sunlitAreaPercent;
      const reference=scanWindow(evaluate,support.start,support.end,60000),candidate=thresholdScan(evaluate,support.start,support.end,5,60000);
      const filtered=filterWindows(candidate.intervals,50,true),refFiltered=filterWindows(reference.intervals,50,true);
      cells.push({id:f.id,date,support,reference,candidate,raw:compareIntervals(reference.intervals,candidate.intervals),filtered:compareIntervals(refFiltered.intervals,filtered.intervals),durationComplete:filtered.complete&&refFiltered.complete});
    }
    expect(cells).toHaveLength(84);expect(guard.attempts).toBe(0);fs.mkdirSync(out,{recursive:true});
    fs.writeFileSync(path.join(out,'matrix.json'),JSON.stringify({cells,fixtures:selected,scope:'Accepted detector versus unpruned independent minute grid with crossing refinement, all 12 synthetic fixtures x7 dates. Winter is a measurement control, not season eligibility. No continuous discovery claim; retain all failures and duration uncertainty.'}));
    fs.writeFileSync(path.join(out,'environment.json'),JSON.stringify({at,sources,offlineAttempts:guard.attempts},null,2));
    publishLane(out,'completion.json',{complete:true,offlineAttempts:guard.attempts,cells:cells.map(c=>`${c.id}/${c.date}`)},['matrix.json','environment.json'],selected.flatMap(f=>requiredDates.map(d=>`${f.id}/${d}`)));
  }finally{globalThis.fetch=fetch;vi.useRealTimers();}
});
