import { it,expect,vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { caster,rect,origin,elevatedFixtures } from '../../../test/fixtures/epic-15/geometries';
import {publishLane,edgeArtifacts} from './evidence.mjs';
import { calculateVenueShadowFromBuildings } from '../../../lib/solar/shadow-calculation-service';
import { calculateSolarPosition } from '../../../lib/solar/solar-calculation-service';
import { daylight,requiredDates,samplePolicy,intervals,compareIntervals,sampleTimes,referenceIntervals,stats } from './measurement';
const guard=vi.hoisted(()=>({attempts:0}));
vi.mock('@/lib/supabase/server',()=>({supabaseServiceRole:new Proxy({}, {get(){guard.attempts++;throw Error('No DB access');}})}));
vi.mock('../../../lib/solar/solar-calculation-service',async importOriginal=>{
  const actual=await importOriginal<typeof import('../../../lib/solar/solar-calculation-service')>();
  return {...actual,calculateSolarPosition:(d:Date,lat=57.7089,lng=11.9746)=>actual.calculateSolarPosition(d,lat,lng)};
});
it('measures engine-backed thin street runs and supported edges',()=>{
  const out=process.env.E15_OUTPUT;
  if(!out||!path.isAbsolute(out))throw Error('E15_OUTPUT required');
  const filename=path.join(out,'M02-physical-slits.json');
  if(fs.existsSync(filename))throw Error('Refusing overwrite');
  const rows=[];
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>{guard.attempts++;throw Error('Offline edge measurement');};
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-09-10T12:00:00Z'));
  try {
    for(const date of requiredDates) {
      const d=daylight(date,origin.lat,origin.lng,5);
      let low=d.start,high=d.end;
      while(high-low>1000){const mid=Math.floor((low+high)/2);if(calculateSolarPosition(new Date(mid)).azimuth<180)low=mid;else high=mid;}
      const noon=Math.floor((low+high)/2);
      const start=Math.floor((noon-900000)/900000)*900000,end=start+2700000;
      for(const gap of [.1,.4,2]) {
        const seating=rect(-.01,-.1,.02,.2);
        const casters=[caster(1,rect(-5-gap/2,-100,5,200),20),caster(2,rect(gap/2,-100,5,200),20)];
        const f=(t:number)=>calculateVenueShadowFromBuildings(seating,new Date(t),casters).sunlitAreaPercent;
        const points=sampleTimes(start,end,1000).map(t=>({t,value:f(t)}));
        const reference=intervals(points);
        rows.push({date,gapMetres:gap,seating,casters,referenceStepMs:1000,reference,referencePoints:points,
          candidates:['endpoints','midpoint','minute'].map(policy=>{
            const r=samplePolicy(f,start,end,policy as 'endpoints'|'midpoint'|'minute');
            return {...r,comparison:compareIntervals(reference,intervals(r.points))};
          }),limits:'Synthetic extreme geometry, no surveyed fixture claim. One-second reference may miss shorter runs; +/-500 ms nearest-sample boundary resolution.'});
      }
      console.log(`Physical slit cases completed ${date}`);
    }
    const elevated=[];
    for(const fixture of elevatedFixtures)for(const date of requiredDates){
      const d=daylight(date,origin.lat,origin.lng,5);
      const f=(t:number)=>calculateVenueShadowFromBuildings(fixture.seating,new Date(t),fixture.casters,fixture).sunlitAreaPercent;
      const reference=referenceIntervals(f,d.start,d.end);
      expect(reference.intervals.some(i=>i.sunny)).toBe(true);
      expect(reference.intervals.some(i=>!i.sunny)).toBe(true);
      const candidates=(['endpoints','midpoint','minute'] as const).map(policy=>{
        const result=samplePolicy(f,d.start,d.end,policy);
        return {...result,comparison:compareIntervals(reference.intervals,intervals(result.points))};
      });
      const times=sampleTimes(d.start,d.end,900000),wallMs=[],cpuMs=[];
      for(let r=-5;r<30;r++){
        const before=process.cpuUsage(),start=performance.now();
        for(const t of times)f(t);
        const elapsed=performance.now()-start,usage=process.cpuUsage(before);
        if(r>=0){wallMs.push(elapsed);cpuMs.push((usage.user+usage.system)/1000);}
      }
      elevated.push({fixture:fixture.id,input:fixture,date,effectiveHeights:fixture.casters.map(c=>c.height-fixture.seatingElevationM+(c.groundZRh2000??0)-fixture.venueGroundZ),reference,candidates,cost:{samples:times.length,warmups:5,n:30,wallMs:stats(wallMs),cpuMs:stats(cpuMs),raw:{wallMs,cpuMs},scope:'synthetic base-plus-edge only; excludes adaptive and production overhead'}});
    }
    const edges=requiredDates.flatMap(date=>{
      const d=daylight(date,origin.lat,origin.lng,5);
      return d.roots.flatMap(root=>[-1000,0,1000].map(delta=>{
        const t=root.t+delta;
        const result=calculateVenueShadowFromBuildings(rect(-5,-5,10,10),new Date(t),[]);
        return {date,root,delta,t,elevation:result.solarPosition.elevation,old:result.sunlitAreaPercent,candidate:result.solarPosition.elevation>=5?result.sunlitAreaPercent:0};
      }));
    });
    expect(guard.attempts).toBe(0);
    expect(rows).toHaveLength(21);expect(edges).toHaveLength(42);expect(elevated).toHaveLength(14);
    fs.writeFileSync(filename,JSON.stringify(rows,null,2),{flag:'wx'});
    fs.writeFileSync(path.join(out,'M04-exact-edge-values.json'),JSON.stringify(edges,null,2),{flag:'wx'});
    fs.writeFileSync(path.join(out,'M02-elevated.json'),JSON.stringify(elevated,null,2),{flag:'wx'});
    const cells=[...rows.map(r=>`slit/${r.date}/${r.gapMetres}`),...edges.map(r=>`edge/${r.date}/${r.root.t}/${r.delta}`),...elevated.map(r=>`${r.fixture}/${r.date}`)];
    publishLane(out,'edges-completion.json',{complete:true,offlineAttempts:guard.attempts,cells},edgeArtifacts,cells);
  }finally{globalThis.fetch=originalFetch;vi.useRealTimers();}
});
