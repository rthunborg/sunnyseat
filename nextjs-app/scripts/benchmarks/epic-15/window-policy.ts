/** Benchmark-only implementation of the accepted public-window rule.
 * Inputs must already cover model-supported daylight. Completion is NOT proof
 * that a sampling method discovered every interval. Never imported by runtime.
 */
import type {Interval} from './measurement';
export function filterWindows(raw:Interval[],boundaryErrorMs:number,computationComplete:boolean){
  if(!raw.length||!Number.isFinite(boundaryErrorMs)||boundaryErrorMs<0)throw Error('Invalid window evidence');
  raw.forEach((r,i)=>{
    if(!Number.isFinite(r.start)||!Number.isFinite(r.end)||r.end<=r.start||typeof r.sunny!=='boolean'||(i>0&&(r.start!==raw[i-1].end||r.sunny===raw[i-1].sunny)))throw Error('Invalid interval coverage');
  });
  const windows=raw.flatMap((r,i)=>{
    if(!r.sunny)return [];
    // Outer supported edges are exact here; internal boundaries carry declared
    // reconstruction uncertainty, conditional on discovery of the transitions.
    const error=(i===0?0:boundaryErrorMs)+(i===raw.length-1?0:boundaryErrorMs);
    const durationMs=r.end-r.start,minimumDurationMs=Math.max(0,durationMs-error),maximumDurationMs=durationMs+error;
    const status=!computationComplete?'unresolved':minimumDurationMs>=300000?'qualifies':maximumDurationMs<300000?'suppressed':'unresolved';
    return [{...r,durationMs,minimumDurationMs,maximumDurationMs,status}];
  });
  const complete=computationComplete&&windows.every(w=>w.status!=='unresolved');
  const result:Interval[]=[];
  for(const r of raw){
    const sunny=r.sunny&&windows.some(w=>w.start===r.start&&w.status==='qualifies');
    const previous=result.at(-1);
    if(previous?.sunny===sunny)previous.end=r.end;else result.push({...r,sunny});
  }
  return {complete,windows,intervals:result,detectionGuarantee:'NONE beyond supplied reference/discovery evidence'};
}
export function eligibleAt(result:ReturnType<typeof filterWindows>,t:number,weather:'likely'|'blocked'|'unknown'){
  return result.complete&&weather==='likely'&&result.intervals.some(r=>r.sunny&&t>=r.start&&t<r.end);
}
