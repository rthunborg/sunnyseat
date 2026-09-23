import type { Building } from '../../../lib/solar/types';

// Synthetic local metre-like coordinates mapped into WGS84. Not surveyed terraces.
export const origin = { lat: 57.7089, lng: 11.9746 };
export function polygon(points: number[][]): GeoJSON.Polygon {
  const ring = points.map(([x,y])=>[origin.lng+x/(111320*Math.cos(origin.lat*Math.PI/180)),origin.lat+y/111320]);
  return {type:'Polygon',coordinates:[[...ring,ring[0]]]};
}
export const rect = (x:number,y:number,w:number,h:number) => polygon([[x,y],[x+w,y],[x+w,y+h],[x,y+h]]);
export function caster(id:number, geometry:GeoJSON.Polygon,height=15,groundZRh2000=0): Building {
  return {id,geometry,height,groundZRh2000,source:'synthetic-story-15-1',qualityScore:1,heightSource:'ManualOverride'};
}
const seating = rect(-5,-5,10,10);
const walls = [caster(1,rect(-15,-15,5,30)),caster(2,rect(10,-15,5,30)),caster(3,rect(-10,-15,20,5)),caster(4,rect(-10,10,20,5))];
// Separate from the original all-excluded rooftop control. One east caster permits
// sun/shade transitions even in winter; two terrain offsets exercise effective Z.
export const elevatedFixtures = [
  {id:'rooftop-surviving',seating,casters:[caster(1,rect(10,-100,5,200),20,8)],seatingElevationM:10,venueGroundZ:8},
  {id:'terrain-surviving',seating,casters:[caster(1,rect(10,-100,5,200),15,15)],seatingElevationM:10,venueGroundZ:8},
];
export const fixtures = [
  {id:'open',seating,casters:[] as Building[],seatingElevationM:0,venueGroundZ:0},
  {id:'fully-covered',seating,casters:[caster(1,rect(-10,-10,20,20),50)],seatingElevationM:0,venueGroundZ:0},
  {id:'courtyard',seating,casters:walls,seatingElevationM:0,venueGroundZ:0},
  {id:'narrow-street',seating:rect(-2,-8,4,16),casters:walls.slice(0,2),seatingElevationM:0,venueGroundZ:0},
  {id:'rooftop-terrain',seating,casters:walls,seatingElevationM:10,venueGroundZ:8},
  {id:'irregular',seating:polygon([[-5,-5],[5,-5],[5,0],[0,0],[0,5],[-5,5]]),casters:walls.slice(0,3),seatingElevationM:0,venueGroundZ:0},
  {id:'holed',seating:{type:'Polygon',coordinates:[seating.coordinates[0],rect(-2,-2,4,4).coordinates[0].toReversed()]} as GeoJSON.Polygon,casters:walls.slice(0,2),seatingElevationM:0,venueGroundZ:0},
  {id:'overlapping',seating,casters:[...walls.slice(0,2),caster(5,walls[0].geometry),caster(6,rect(-14,-14,5,28))],seatingElevationM:0,venueGroundZ:0},
  {id:'tiny',seating:rect(0,0,.2,.2),casters:walls.slice(0,1),seatingElevationM:0,venueGroundZ:0},
  {id:'cap-and-height-boundaries',seating,casters:[caster(1,rect(-5,-199,10,5),80),caster(2,rect(8,0,5,5),2.999),caster(3,rect(-12,0,5,5),3)],seatingElevationM:0,venueGroundZ:0},
];
