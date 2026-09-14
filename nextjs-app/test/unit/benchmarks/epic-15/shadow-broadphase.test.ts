import {it,expect} from 'vitest';
import {pruneShadowCasters} from '../../../../scripts/benchmarks/epic-15/shadow-broadphase';
import {fixtures} from '../../../fixtures/epic-15/geometries';
import {projectBuildingShadow} from '../../../../lib/solar/shadow-geometry';
import {calculateSolarPosition} from '../../../../lib/solar/solar-calculation-service';
it('never rejects a projected hull whose bounding box overlaps seating',()=>{
  for(const f of fixtures)for(const hour of [6,9,12,15,18]){
    const solar=calculateSolarPosition(new Date(`2026-06-21T${String(hour).padStart(2,'0')}:00:00Z`));
    const result=pruneShadowCasters(f.seating,f.casters,solar,f);
    for(const rejected of result.rejected){
      const projection=projectBuildingShadow(rejected.geometry,rejected.height-f.seatingElevationM,solar);
      if(!projection)continue;
      const bb=(p:GeoJSON.Polygon)=>{const a=p.coordinates.flat();return [Math.min(...a.map(p=>p[0])),Math.min(...a.map(p=>p[1])),Math.max(...a.map(p=>p[0])),Math.max(...a.map(p=>p[1]))];};
      const a=bb(projection),b=bb(f.seating);
      expect(a[2]<b[0]||b[2]<a[0]||a[3]<b[1]||b[3]<a[1]).toBe(true);
    }
  }
});
it('retains invalid geometry and unsupported solar inputs for the original engine',()=>{
  const f=fixtures[0],solar=calculateSolarPosition(new Date('2026-06-21T12:00:00Z'));
  expect(pruneShadowCasters(f.seating,f.casters,{...solar,elevation:NaN},f).retained).toEqual(f.casters);
  const invalid={...f.casters[0],geometry:{type:'Polygon' as const,coordinates:[]}};
  expect(pruneShadowCasters(f.seating,[invalid],solar,f).retained).toEqual([invalid]);
});
