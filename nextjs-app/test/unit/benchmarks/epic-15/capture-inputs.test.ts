import {it,expect} from 'vitest';
import {capturedFixtures,type Capture} from '../../../../scripts/benchmarks/epic-15/capture-inputs';
const capture:Capture={capturedAt:'2026-09-10',snapshot:'test',counts:{venues:1,uniqueCasters:0,casterReferences:0},casters:[],venues:[{id:'v',slug:'v',hidden:false,seating_area:{type:'Polygon',coordinates:[[[11,57],[12,57],[12,58],[11,58],[11,57]]]},lat:57.5,lng:11.5,seating_elevation_m:2,ground_elevation_m:10,casterIds:[]}]};
it('retains captured coordinates and elevations',()=>{expect(capturedFixtures(capture)[0]).toMatchObject({coordinate:{lat:57.5,lng:11.5},seatingElevationM:2,venueGroundZ:10,hidden:false});});
it('rejects incomplete or substituted membership and coordinates',()=>{
  expect(()=>capturedFixtures({...capture,counts:{...capture.counts,venues:2}})).toThrow();
  expect(()=>capturedFixtures({...capture,venues:[{...capture.venues[0],lat:58}]})).toThrow();
  expect(()=>capturedFixtures({...capture,counts:{...capture.counts,casterReferences:1},venues:[{...capture.venues[0],casterIds:[1]}]})).toThrow();
});
