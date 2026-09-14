/** Benchmark-only conditional solver. It does NOT construct or verify geometric bounds.
 * An oracle must bound EVERY instant in [start,end), including numerical failures.
 * Passing observed sample minima/maxima violates this contract.
 */
export type Enclosure={lower:number;upper:number}|null;
type Partition={start:number;end:number;state:'sunny'|'shade'|'unresolved'};
export function encloseTimeline(oracle:(start:number,end:number)=>Enclosure,start:number,end:number,options:{minWidthMs?:number;maxCalls?:number}={}){
  const minWidth=options.minWidthMs??100,maxCalls=options.maxCalls??10000;
  if(!Number.isFinite(start)||!Number.isFinite(end)||start>=end||!Number.isFinite(minWidth)||minWidth<=0||!Number.isSafeInteger(maxCalls)||maxCalls<1)throw Error('Invalid interval budget');
  const stack=[{start,end}],partitions:Partition[]=[];let calls=0;
  while(stack.length){
    const cell=stack.pop()!;
    if(calls>=maxCalls){partitions.push({...cell,state:'unresolved'});continue;}
    const bounds=oracle(cell.start,cell.end);calls++;
    if(bounds&&(!Number.isFinite(bounds.lower)||!Number.isFinite(bounds.upper)||bounds.lower<0||bounds.upper>100||bounds.lower>bounds.upper))throw Error('Invalid enclosure');
    const state=bounds&&bounds.lower>50?'sunny':bounds&&bounds.upper<=50?'shade':null;
    if(state){partitions.push({...cell,state});continue;}
    const mid=cell.start+(cell.end-cell.start)/2;
    if(cell.end-cell.start<=minWidth||mid===cell.start||mid===cell.end){partitions.push({...cell,state:'unresolved'});continue;}
    stack.push({start:mid,end:cell.end},{start:cell.start,end:mid});
  }
  const merged:Partition[]=[];
  for(const cell of partitions){const last=merged.at(-1);if(last&&last.end===cell.start&&last.state===cell.state)last.end=cell.end;else merged.push({...cell});}
  return {calls,partitions:merged,complete:merged.every(p=>p.state!=='unresolved'),
    qualifying:merged.filter(p=>p.state==='sunny'&&p.end-p.start>=300000).map(({start,end})=>({start,end})),
    guarantee:'conditional on valid whole-interval oracle; no application adapter' as const};
}
