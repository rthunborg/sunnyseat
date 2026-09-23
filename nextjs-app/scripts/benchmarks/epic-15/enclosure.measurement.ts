import {it,expect} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {encloseTimeline} from './interval-enclosure';
import {scanWindow} from './dense-sampling';
import {filterWindows} from './window-policy';
import {artifactHashes,publishLane,engineSources} from './evidence.mjs';
it('records analytic enclosure feasibility without claiming an engine certificate',()=>{
  const out=process.env.E15_OUTPUT;
  if(!out||!path.isAbsolute(out)||fs.existsSync(out))throw Error('New absolute output required');
  const rows=[];
  for(const width of [10000,1000,100,1,0.125]){
    const gapStart=290000+width/4,gapEnd=gapStart+width,end=580000+width;
    const oracle=(a:number,b:number)=>b<=gapStart||a>=gapEnd?{lower:100,upper:100}:a>=gapStart&&b<=gapEnd?{lower:0,upper:0}:{lower:0,upper:100};
    const result=encloseTimeline(oracle,0,end,{minWidthMs:0.0625,maxCalls:1000});
    expect(result.qualifying).toEqual([]);
    const point=(t:number)=>t>=gapStart&&t<gapEnd?0:100;
    rows.push({gapStart,gapEnd,end,analyticEnclosure:result,pointSamples:[60000,10000,5000,1000].map(stepMs=>{
      const sample=scanWindow(point,0,end,stepMs),filtered=filterWindows(sample.intervals,50,true);
      return {stepMs,samples:sample.samples,qualifying:filtered.windows.filter(w=>w.status==='qualifies'),complete:filtered.complete};
    })});
  }
  const unavailable=encloseTimeline(()=>null,0,600000,{maxCalls:1000,minWidthMs:100});
  expect(unavailable.complete).toBe(false);expect(unavailable.qualifying).toEqual([]);
  const threshold=[299,300,301].map(s=>({seconds:s,result:encloseTimeline(()=>({lower:100,upper:100}),0,s*1000)}));
  fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'enclosure.json'),JSON.stringify({rows,threshold,unavailable,scope:'Exact analytic step-signal oracle only. No geometric bounds, no production CPU/storage extrapolation.'},null,2));
  fs.writeFileSync(path.join(out,'environment.json'),JSON.stringify({at:new Date().toISOString(),sourceHashes:artifactHashes(process.cwd(),[...engineSources,'scripts/benchmarks/epic-15/interval-enclosure.ts','scripts/benchmarks/epic-15/enclosure.measurement.ts','scripts/benchmarks/epic-15/dense-sampling.ts','scripts/benchmarks/epic-15/window-policy.ts'])},null,2));
  publishLane(out,'completion.json',{complete:true,offlineAttempts:0,cells:['analytic-five-gaps','thresholds','missing-oracle']},['enclosure.json','environment.json'],['analytic-five-gaps','thresholds','missing-oracle']);
});
