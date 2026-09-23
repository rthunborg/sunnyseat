import { expect,it,vi } from 'vitest';
import { fixtures,elevatedFixtures } from '../../../fixtures/epic-15/geometries';
import { daylight,sampleTimes,requiredDates } from '../../../../scripts/benchmarks/epic-15/measurement';
import { calculateVenueShadowFromBuildings } from '@/lib/solar/shadow-calculation-service';
vi.mock('@/lib/supabase/server',()=>({supabaseServiceRole:new Proxy({}, {get(){throw Error('Unexpected fixture I/O');}})}));
it('sanity-checks independent open/covered/elevated geometry and duplicate-union invariance',()=>{
  const at=new Date('2026-06-21T10:30:00Z');
  const compute=(f:typeof fixtures[number])=>calculateVenueShadowFromBuildings(f.seating,at,f.casters,f);
  expect(compute(fixtures[0]).sunlitAreaPercent).toBe(100);
  expect(compute(fixtures[1]).sunlitAreaPercent).toBe(0);
  expect(compute(fixtures[4]).sunlitAreaPercent).toBe(100);
  const courtyard=fixtures[2];
  expect(compute({...courtyard,casters:[...courtyard.casters,...courtyard.casters]}).sunlitAreaPercent).toBeCloseTo(compute(courtyard).sunlitAreaPercent,9);
  const unavailable=calculateVenueShadowFromBuildings(fixtures[0].seating,at,null);
  expect(unavailable.sunlitAreaPercent).not.toBe(100);
});
it('exercises surviving elevated casters with actual daylight transitions',()=>{
  expect(elevatedFixtures).toHaveLength(2);
  for(const fixture of elevatedFixtures){
    expect(fixture.casters.some(c=>c.height-fixture.seatingElevationM+(c.groundZRh2000??0)-fixture.venueGroundZ>=3)).toBe(true);
    for(const date of requiredDates){
      const d=daylight(date,57.7089,11.9746,5);
      const values=sampleTimes(d.start,d.end,900000).map(t=>calculateVenueShadowFromBuildings(fixture.seating,new Date(t),fixture.casters,fixture).sunlitAreaPercent);
      expect(values.some(v=>v>50),`${fixture.id}/${date} sun`).toBe(true);
      expect(values.some(v=>v<=50),`${fixture.id}/${date} shade`).toBe(true);
    }
  }
});
