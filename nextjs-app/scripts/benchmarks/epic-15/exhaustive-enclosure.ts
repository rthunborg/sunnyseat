/** Exact finite-Date-domain reference for a deterministic, frozen engine callback.
 * Not physical continuous-time truth; intentionally expensive and bounded.
 */
export function exhaustiveEnclosure(evaluate:(epochMs:number)=>number,maxSamples:number){
  if(!Number.isSafeInteger(maxSamples)||maxSamples<1)throw Error('Invalid sample budget');
  const cache=new Map<number,number>();
  return {samples:()=>cache.size,bound(start:number,end:number){
    if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||start>=end||end>8640000000000000)throw Error('Invalid Date interval');
    let lower=100,upper=0;
    // Positive Date TimeClip truncates. [start,end) touches floor(start)..ceil(end)-1.
    for(let t=Math.floor(start);t<Math.ceil(end);t++){
      let value=cache.get(t);
      if(value===undefined){
        if(cache.size>=maxSamples)return null;
        value=evaluate(t);
        if(!Number.isFinite(value)||value<0||value>100)throw Error('Invalid engine value');
        cache.set(t,value);
      }
      lower=Math.min(lower,value);upper=Math.max(upper,value);
    }
    return {lower,upper};
  }};
}
