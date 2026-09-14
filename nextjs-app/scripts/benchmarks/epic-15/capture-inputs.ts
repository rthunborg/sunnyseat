import type {Building} from '../../../lib/solar/types';
import {seatingCentroidWgs84} from '../../../lib/services/sun-geometry-coordinates';
export interface CaptureVenue {id:string;slug:string;hidden:boolean|null;seating_area:GeoJSON.Polygon;seating_elevation_m:number|null;ground_elevation_m:number|null;lat:number;lng:number;casterIds:number[]}
export interface CapturedCaster {Id:number;Geometry:string;Height:number;GroundZRh2000:number|null;Source:string;QualityScore:number|null;HeightSource:Building['heightSource'];SourcePriority:number|null;SourceFlags:string[];SourceObjectMetadata:Record<string,unknown>;ProvenanceMetadata:Record<string,unknown>}
export interface Capture {capturedAt:string;snapshot:string;counts:{venues:number;uniqueCasters:number;casterReferences:number};venues:CaptureVenue[];casters:CapturedCaster[]}
export function capturedFixtures(capture:Capture){
  if(capture.venues.length!==capture.counts.venues||capture.casters.length!==capture.counts.uniqueCasters||new Set(capture.casters.map(c=>c.Id)).size!==capture.casters.length||new Set(capture.venues.map(v=>v.id)).size!==capture.venues.length)throw Error('Incomplete captured inventory');
  if(capture.venues.reduce((n,v)=>n+v.casterIds.length,0)!==capture.counts.casterReferences)throw Error('Caster membership mismatch');
  const byId=new Map(capture.casters.map(c=>[c.Id,c]));
  return capture.venues.map(v=>{
    const coordinate=seatingCentroidWgs84(v.seating_area);
    if(Math.abs(coordinate.lat-v.lat)>1e-10||Math.abs(coordinate.lng-v.lng)>1e-10||new Set(v.casterIds).size!==v.casterIds.length)throw Error('Captured coordinate/membership mismatch');
    const rows=v.casterIds.map(id=>{const row=byId.get(id);if(!row)throw Error('Missing caster');return row;}).sort((a,b)=>(a.SourcePriority??Infinity)-(b.SourcePriority??Infinity)||(b.QualityScore??-Infinity)-(a.QualityScore??-Infinity)||a.Id-b.Id);
    const casters:Building[]=rows.map(c=>{
      const geometry=JSON.parse(c.Geometry);
      if(!Number.isSafeInteger(c.Id)||!Number.isFinite(c.Height)||c.Height<3||geometry.type!=='Polygon')throw Error('Unsupported captured caster');
      return {id:c.Id,geometry,height:c.Height,groundZRh2000:c.GroundZRh2000??undefined,source:c.Source,qualityScore:c.QualityScore??0.7,heightSource:c.HeightSource,sourceFlags:c.SourceFlags,sourceObjectMetadata:c.SourceObjectMetadata,provenanceMetadata:c.ProvenanceMetadata};
    });
    return {id:v.id,seating:v.seating_area,seatingElevationM:v.seating_elevation_m??0,venueGroundZ:v.ground_elevation_m??undefined,coordinate,casters,hidden:v.hidden!==false};
  });
}
