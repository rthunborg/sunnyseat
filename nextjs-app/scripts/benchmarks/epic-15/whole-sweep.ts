/** All-direction enclosure, conditional on corrected elevation remaining in [5,90].
 * Safe but deliberately loose: no sampled endpoints, no temporal smoothness claim.
 */
import type {Building} from '../../../lib/solar/types';
import {MAX_SHADOW_DISTANCE,MIN_MEANINGFUL_HEIGHT} from '../../../lib/solar/shadow-geometry';
function box(points:number[][]){
  if(!points.length||points.some(p=>p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1])))return null;
  return [Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
}
export function wholeSweepBound(seating:GeoJSON.Polygon,casters:Building[],supportedRange:boolean,options:{seatingElevationM?:number;venueGroundZ?:number}={}){
  const target=box(seating.coordinates.flat()),overlapping:number[]=[];
  if(!supportedRange||!target)return {bounds:null,overlapping,reason:'unsupported-or-invalid' as const};
  const elevation=Math.max(0,options.seatingElevationM??0);
  const rx=MAX_SHADOW_DISTANCE/55800,ry=MAX_SHADOW_DISTANCE/111300;
  for(const caster of casters){
    const delta=Number.isFinite(options.venueGroundZ)&&Number.isFinite(caster.groundZRh2000)?caster.groundZRh2000!-options.venueGroundZ!:0;
    const height=caster.height-elevation+delta;
    if(!Number.isFinite(height))return {bounds:null,overlapping,reason:'invalid-height' as const};
    if(height<MIN_MEANINGFUL_HEIGHT)continue;
    const source=box(caster.geometry.coordinates[0]?.slice(0,-1)??[]);
    if(!source)return {bounds:null,overlapping,reason:'invalid-footprint' as const};
    const swept=[source[0]-rx,source[1]-ry,source[2]+rx,source[3]+ry];
    if(swept.some(v=>!Number.isFinite(v)))return {bounds:null,overlapping,reason:'invalid-envelope' as const};
    if(!(swept[2]<target[0]||target[2]<swept[0]||swept[3]<target[1]||target[3]<swept[1]))overlapping.push(caster.id);
  }
  return {bounds:overlapping.length?null:{lower:100,upper:100},overlapping,reason:overlapping.length?'overlap-unresolved' as const:'all-directions-clear' as const};
}
