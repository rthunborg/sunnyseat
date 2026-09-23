/** Benchmark-only point sampler. Finer cadence never certifies unseen gaps. */
import {sampleTimes,type Interval} from './measurement';
export function scanWindow(f:(t:number)=>number,start:number,end:number,stepMs:number,maxSamples=200000){
  if(!Number.isFinite(start+end+stepMs)||start>=end||stepMs<=0||maxSamples<1)throw Error('Invalid sampling window');
  const values=new Map<number,number>();
  const at=(t:number)=>{
    if(values.has(t))return values.get(t)!;
    if(values.size>=maxSamples)throw Error('Sample budget exhausted');
    const value=f(t);if(!Number.isFinite(value)||value<0||value>100)throw Error('Invalid engine value');
    values.set(t,value);return value;
  };
  const grid=sampleTimes(start,end,stepMs),runs:Interval[]=[];
  let runStart=start,sunny=at(start)>50;
  for(let i=1;i<grid.length;i++){
    const next=at(grid[i])>50;
    if(next!==sunny){
      let low=grid[i-1],high=grid[i];
      while(high-low>100){const mid=Math.floor((low+high)/2);if((at(mid)>50)===sunny)low=mid;else high=mid;}
      const edge=(low+high)/2;runs.push({start:runStart,end:edge,sunny});runStart=edge;sunny=next;
    }
  }
  runs.push({start:runStart,end,sunny});
  return {intervals:runs,samples:values.size,stepMs,boundaryErrorMs:50,certifiedContinuous:false as const};
}
