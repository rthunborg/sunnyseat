/** Completion wrapper for the unchanged isolated SQL experiment. */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {artifactHashes,publishLane,validateLaneCompletion,jsonHash} from './evidence.mjs';
const [container,database,input,out]=process.argv.slice(2);
if(!input||!out||!path.isAbsolute(input)||!path.isAbsolute(out)||fs.existsSync(out))throw Error('Existing absolute replay and new SQL output required');
const read=(dir,name)=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
const completion=read(input,'captured-completion.json');
validateLaneCompletion(completion,artifactHashes(input,['fixtures.json','M06-identical-dataset.json','M06-edited-dataset.json','M06-edited-fixtures.json','captured-cost.json','captured-environment.json']),completion.cells);
const sourceHashes=artifactHashes(process.cwd(),['scripts/benchmarks/epic-15/storage.mjs','scripts/benchmarks/epic-15/captured-storage.mjs']);
const result=spawnSync(process.execPath,['scripts/benchmarks/epic-15/storage.mjs',container,database,input,out],{encoding:'utf8',timeout:600000,maxBuffer:4*1024*1024});
if(result.status!==0)throw Error(result.stderr||result.error?.message||'SQL failed');
const summary=read(out,'summary.json');
if(summary.complete!==true||summary.datasetSha256!==jsonHash(read(input,'M06-identical-dataset.json')))throw Error('SQL input mismatch');
validateLaneCompletion(completion,artifactHashes(input,Object.keys(completion.artifacts)),completion.cells);
fs.writeFileSync(path.join(out,'capture-sql-source.json'),JSON.stringify({sourceHashes,inputArtifacts:completion.artifacts},null,2),{flag:'wx'});
publishLane(out,'captured-sql-completion.json',{complete:true,offlineAttempts:0,cells:['local-sql']},fs.readdirSync(out).sort(),['local-sql']);
process.stdout.write(result.stdout);
