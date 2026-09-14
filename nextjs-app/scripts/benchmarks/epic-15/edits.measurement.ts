import { it,expect,vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { calculateVenueShadowFromBuildings } from '../../../lib/solar/shadow-calculation-service';
import { localDay,type Point } from './measurement';
import { fixtures } from '../../../test/fixtures/epic-15/geometries';
const guard=vi.hoisted(()=>({attempts:0}));
vi.mock('@/lib/supabase/server',()=>({supabaseServiceRole:new Proxy({}, {get(){guard.attempts++;throw Error('No DB access');}})}));
vi.mock('../../../lib/solar/solar-calculation-service',async importOriginal=>{
  const actual=await importOriginal<typeof import('../../../lib/solar/solar-calculation-service')>();
  return {...actual,calculateSolarPosition:(d:Date,lat=57.7089,lng=11.9746)=>actual.calculateSolarPosition(d,lat,lng)};
});
it('recomputes actual changed-elevation payloads for the retained storage edit workload',()=>{
  const out=process.env.E15_OUTPUT;
  if(!out||!path.isAbsolute(out))throw Error('E15_OUTPUT required');
  const target=path.join(out,'M06-edited-dataset.json');if(fs.existsSync(target))throw Error('Refusing overwrite');
  const rows: {id:string;date:string;points:Point[]}[]=JSON.parse(fs.readFileSync(path.join(out,'M06-identical-dataset.json'),'utf8'));
  const changedFixtures=fixtures.map(f=>({...f,seatingElevationM:f.seatingElevationM+2}));
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>{guard.attempts++;throw Error('No network access');};
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-09-10T12:00:00Z'));
  try{
    const edited=rows.map(row=>{
      const fixture=changedFixtures.find(f=>f.id===row.id)!;const [start]=localDay(row.date);
      return {...row,points:row.points.map(p=>({t:p.t,value:calculateVenueShadowFromBuildings(fixture.seating,new Date(start+p.t),fixture.casters,fixture).sunlitAreaPercent}))};
    });
    const changedSamples=edited.reduce((n,row,i)=>n+row.points.filter((p,j)=>p.value!==rows[i].points[j].value).length,0);
    expect(changedSamples).toBeGreaterThan(0);expect(guard.attempts).toBe(0);
    fs.writeFileSync(target,JSON.stringify(edited,null,2));
    fs.writeFileSync(path.join(out,'M06-edited-fixtures.json'),JSON.stringify({complete:true,attempts:guard.attempts,changedSamples,fixtures:changedFixtures,
      inputHash:createHash('sha256').update(JSON.stringify(changedFixtures)).digest('hex'),
      scope:'Synthetic seating elevation +2m, actual engine recomputation at original sample instants; storage workload only, not revised adaptive coverage proof.'},null,2));
  }finally{globalThis.fetch=originalFetch;vi.useRealTimers();}
});
