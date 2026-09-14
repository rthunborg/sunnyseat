import {sampleTimes,type Point,type Interval} from './measurement';
export type StoredDay={offsets:number[];exposure:number[];starts:number[];ends:number[];sunny:boolean[]};
export function validateStored(d:StoredDay){
  if(!d||!Array.isArray(d.offsets)||!Array.isArray(d.exposure)||!Array.isArray(d.starts)||!Array.isArray(d.ends)||!Array.isArray(d.sunny)||!d.offsets.length||!d.starts.length||d.offsets.length!==d.exposure.length||d.starts.length!==d.ends.length||d.starts.length!==d.sunny.length)throw Error('Invalid stored shape');
  d.offsets.forEach((t,i)=>{if(!Number.isInteger(t)||t<0||t>90000000||(i>0&&t<=d.offsets[i-1])||!Number.isFinite(d.exposure[i])||d.exposure[i]<0||d.exposure[i]>100)throw Error('Invalid stored point');});
  d.starts.forEach((t,i)=>{if(!Number.isFinite(t)||!Number.isFinite(d.ends[i])||t<0||d.ends[i]<=t||d.ends[i]>90000000||typeof d.sunny[i]!=='boolean'||(i>0&&(t!==d.ends[i-1]||d.sunny[i]===d.sunny[i-1])))throw Error('Invalid stored intervals');});
  if(d.offsets[0]!==d.starts[0]||d.offsets.at(-1)!==d.ends.at(-1))throw Error('Incomplete stored coverage');return d;
}
export function storedDay(points:Point[],intervals:Interval[],origin:number,compact=false):StoredDay{
  const selected=compact?new Set(sampleTimes(points[0].t,points.at(-1)!.t,300000)):null;
  const p=selected?points.filter(p=>selected.has(p.t)):points;
  if(selected&&p.length!==selected.size)throw Error('Missing base grid point');
  return validateStored({offsets:p.map(p=>p.t-origin),exposure:p.map(p=>p.value),starts:intervals.map(r=>r.start-origin),ends:intervals.map(r=>r.end-origin),sunny:intervals.map(r=>r.sunny)});
}
export function encodeStored(d:StoredDay){
  validateStored(d);const b=Buffer.alloc(9+d.offsets.length*12+d.starts.length*17);b[0]=1;b.writeUInt32LE(d.offsets.length,1);b.writeUInt32LE(d.starts.length,5);
  d.offsets.forEach((t,i)=>{b.writeUInt32LE(t,9+i*12);b.writeDoubleLE(d.exposure[i],13+i*12);});
  const start=9+d.offsets.length*12;d.starts.forEach((t,i)=>{b.writeDoubleLE(t,start+i*17);b.writeDoubleLE(d.ends[i],start+i*17+8);b[start+i*17+16]=Number(d.sunny[i]);});return b;
}
export function decodeStored(b:Buffer){
  if(b.length<9||b[0]!==1)throw Error('Unknown stored encoding');const n=b.readUInt32LE(1),m=b.readUInt32LE(5);
  if(b.length!==9+n*12+m*17)throw Error('Truncated stored encoding');
  const d:StoredDay={offsets:[],exposure:[],starts:[],ends:[],sunny:[]};
  for(let i=0;i<n;i++){d.offsets.push(b.readUInt32LE(9+i*12));d.exposure.push(b.readDoubleLE(13+i*12));}
  for(let i=0;i<m;i++){const at=9+n*12+i*17,v=b[at+16];if(v>1)throw Error('Invalid stored flag');d.starts.push(b.readDoubleLE(at));d.ends.push(b.readDoubleLE(at+8));d.sunny.push(v===1);}
  return validateStored(d);
}
