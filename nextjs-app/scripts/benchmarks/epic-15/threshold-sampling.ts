/** Experimental exposure sampler; endpoint proximity is a heuristic, not a continuity proof. */
import {sampleTimes,type Interval} from './measurement';
export function thresholdScan(f:(t:number)=>number,start:number,end:number,margin:number,probeMs=60000,maxSamples=20000){
  if(!Number.isFinite(start+end+margin+probeMs)||start>=end||margin<0||margin>50||probeMs<=0||probeMs>300000||!Number.isInteger(maxSamples)||maxSamples<1)throw Error('Invalid threshold configuration');
  const values=new Map<number,number>(),counts={base:0,interior:0,boundary:0};
  const at=(t:number,kind:keyof typeof counts):number=>{
    const cached=values.get(t);if(cached!==undefined)return cached;
    if(values.size>=maxSamples)throw Error(`Sample limit: base=${counts.base}, interior=${counts.interior}, boundary=${counts.boundary}`);
    const value=f(t);if(!Number.isFinite(value)||value<0||value>100)throw Error('Invalid engine exposure');
    values.set(t,value);counts[kind]++;return value;
  };
  const base=sampleTimes(start,end,300000);base.forEach(t=>at(t,'base'));
  const detection=new Set(base);let triggeredCells=0;
  for(let i=1;i<base.length;i++){
    const a=base[i-1],b=base[i],av=at(a,'base'),bv=at(b,'base');
    if(Math.min(Math.abs(av-50),Math.abs(bv-50))<=margin||(av>50)!==(bv>50)){
      triggeredCells++;
      for(const t of sampleTimes(a,b,probeMs)){at(t,'interior');detection.add(t);}
    }
  }
  const grid=[...detection].sort((a,b)=>a-b),runs:Interval[]=[];
  let runStart=start,sunny=at(start,'base')>50;
  for(let i=1;i<grid.length;i++){
    const next=at(grid[i],'interior')>50;
    if(next!==sunny){let low=grid[i-1],high=grid[i];while(high-low>100){const mid=Math.floor((low+high)/2);if((at(mid,'boundary')>50)===sunny)low=mid;else high=mid;}
      const edge=(low+high)/2;runs.push({start:runStart,end:edge,sunny});runStart=edge;sunny=next;
    }
  }
  runs.push({start:runStart,end,sunny});
  return {complete:true as const,intervals:runs,counts,samples:values.size,triggeredCells,margin,probeMs,boundaryErrorMs:50,certifiedContinuous:false as const,points:[...values].sort((a,b)=>a[0]-b[0]).map(([t,value])=>({t,value}))};
}
