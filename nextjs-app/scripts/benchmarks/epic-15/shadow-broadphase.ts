/** Benchmark-only geometric rejection. No temporal skipping or confidence equivalence. */
import type {Building,SolarPosition} from '../../../lib/solar/types';
import {calculateShadowLength,MAX_SHADOW_DISTANCE,MIN_MEANINGFUL_HEIGHT,MIN_RELIABLE_ELEVATION} from '../../../lib/solar/shadow-geometry';
type Box=[number,number,number,number];
function box(points:number[][]|undefined):Box|null{
  if(!points?.length||points.some(p=>p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1])))return null;
  return [Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
}
export function pruneShadowCasters(seating:GeoJSON.Polygon,casters:Building[],solar:SolarPosition,options:{seatingElevationM?:number;venueGroundZ?:number}={}){
  const retained:Building[]=[],rejected:Building[]=[];
  const target=box(seating.coordinates.flat());
  if(!target||!Number.isFinite(solar.elevation)||!Number.isFinite(solar.azimuth)||solar.elevation<MIN_RELIABLE_ELEVATION)return {retained:casters,rejected};
  const seatingHeight=Math.max(0,options.seatingElevationM??0);
  for(const caster of casters){
    const source=box(caster.geometry.coordinates[0]?.slice(0,-1));
    const groundDelta=Number.isFinite(options.venueGroundZ)&&Number.isFinite(caster.groundZRh2000)?caster.groundZRh2000!-options.venueGroundZ!:0;
    const height=caster.height-seatingHeight+groundDelta;
    if(!source||!Number.isFinite(height)||height<MIN_MEANINGFUL_HEIGHT){retained.push(caster);continue;}
    const distance=Math.min(calculateShadowLength(height,solar.elevation),MAX_SHADOW_DISTANCE);
    const direction=(solar.azimuth+180)%360;
    const radians=-(direction-90)*(Math.PI/180);
    // Operation order and constants match projectPolygonInDirection exactly.
    const dx=distance*Math.cos(radians)/55800,dy=distance*Math.sin(radians)/111300;
    const swept:Box=[Math.min(source[0],source[0]+dx),Math.min(source[1],source[1]+dy),Math.max(source[2],source[2]+dx),Math.max(source[3],source[3]+dy)];
    if(swept.some(v=>!Number.isFinite(v))){retained.push(caster);continue;}
    // Strict separation: touching bounds stay with the original engine.
    if(swept[2]<target[0]||target[2]<swept[0]||swept[3]<target[1]||target[3]<swept[1])rejected.push(caster);
    else retained.push(caster);
  }
  return {retained,rejected};
}
