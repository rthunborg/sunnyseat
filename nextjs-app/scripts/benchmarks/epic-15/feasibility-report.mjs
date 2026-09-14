import fs from 'node:fs';
import path from 'node:path';
import {artifactHashes,validateLaneCompletion} from './evidence.mjs';
const [run]=process.argv.slice(2);
if(!run||!path.isAbsolute(run))throw Error('Absolute run path required');
const root=path.dirname(run),read=(dir,name)=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
const data=read(run,'feasibility.json'),env=read(run,'environment.json'),capture=read(path.join(root,'capture-01'),'inputs.json');
const cells=[...capture.venues.map(f=>'bound/'+f.id),...['34','8','47'].flatMap(id=>[5000,1000].map(s=>`${id}/${s}`))];
validateLaneCompletion(read(run,'completion.json'),artifactHashes(run,['feasibility.json','environment.json']),cells);
if(JSON.stringify(env.sources)!==JSON.stringify(artifactHashes(process.cwd(),Object.keys(env.sources)))||JSON.stringify(env.captureHashes)!==JSON.stringify(artifactHashes(path.join(root,'capture-01'),Object.keys(env.captureHashes))))throw Error('Source/input identity mismatch');
if(data.bounds.length!==42||data.days.length!==3||data.days.some(d=>d.runs.length!==2))throw Error('Incomplete experiment');
const unresolved=data.bounds.reduce((n,b)=>n+b.unresolvedMs,0),duration=data.bounds.reduce((n,b)=>n+b.support.end-b.support.start,0),clear=data.bounds.filter(b=>b.bound.bounds).length;
console.log(`# Whole-interval feasibility checkpoint — Story 15.1

## Decision

The tested bound does not establish a viable seasonal method. ${clear}/42 captured venue-days were entirely clear under the all-direction bound; ${(100*unresolved/duration).toFixed(2)}% of aggregate supported duration remained unresolved. This is a failure of this conservative candidate, not proof that every efficient interval method is impossible.

## Whole-interval experiment

The rectangle envelope covers the footprint and every translation allowed by the engine's 200m shadow cap, conditional on corrected elevation staying in [5,90] degrees. Any possible seating overlap returns unresolved; only all-caster disjointness yields [100,100]. It does not use sunny endpoint samples as continuity evidence. Terrain/effective-height rules match the existing gate. Invalid inputs remain unresolved. The supported-day intervals come from the existing daylight helper; this experiment does not add a formal solar-range proof.

The bound is independent of interval width. Subdivision cannot tighten it, so the harness evaluates it once per day and retains unresolved coverage instead of spending a subdivision budget on identical bounds. Total measured bound evaluation wall time across the 42 venues: ${data.bounds.reduce((n,b)=>n+b.wallMs,0).toFixed(3)}ms, one observation per venue. No complete generation is claimed.

Tests cover positive distant-caster rejection, nearby overlap, unsupported horizon, terrain exclusion and invalid height. The captured exact-window outputs are checked wherever a non-null bound exists; none of the three exact-window fixtures receives a non-null bound, so those comparisons provide no positive exact-window certification. The one clear venue-day belongs to the wider 42-venue cohort. Prior analytic missed-gap tests remain applicable and unchanged.

## Full-day diagnostics and cost

Measured full supported September 22 days on three captured venues. Spatial pruning is enabled; each candidate visits every base grid point and refines detected crossings. One run per cell, no warmup or p95. These are observed desktop wall/CPU times, not production budgets. Stored points, intervals and filtered outcomes are retained in feasibility.json.

| Venue | Grid seconds | Engine samples | Wall seconds | CPU seconds | Filter duration resolved | Raw topology vs 1s grid |
|---|---:|---:|---:|---:|---|---|
${data.days.flatMap(d=>d.runs.map(r=>`| ${d.id} | ${r.stepMs/1000} | ${r.run.samples} | ${(r.wallMs/1000).toFixed(2)} | ${(r.cpuMs/1000).toFixed(2)} | ${r.filtered.complete} | ${r.stepMs===1000?'reference grid':d.diagnosticOnly.topologyMatches} |`)).join('\n')}

The 1-second grid is a diagnostic comparison, not continuous truth. Neither grid proves absence of shorter gaps. Filter duration resolution refers only to reconstructed detected intervals, not discovery completeness. No full-season or 50/100/500 capacity extrapolation is presented from this three-venue, single-date experiment.

## Concrete owner checkpoint — no amendment applied

Two distinct paths remain:

1. **Retain the current no-gap assurance requirement.** Commission a separate, explicitly bounded effort to validate solar-motion and polygon-area interval bounds. The existing exact oracle can falsify proposed bounds on short windows. Cost and completion date for a practical rigorous method remain unknown; this story stays blocked at method acceptance.
2. **Amend public-window temporal fidelity to a one-second sampled model.** This would explicitly allow sub-second shade gaps or sun bursts to go unrepresented. Preserve the >=5-degree convention, >50% predicate, >=300-second minimum, separation at every detected shade interval, weather independence and exact year/season coverage. Detected transitions can still be refined; near-threshold duration uncertainty stays unresolved. This is a proposed change to the accepted no-gap contract, not an assertion that the old contract has been met. It also requires an explicit amendment to raw-transition claims insofar as they currently require every sub-second transition.

My recommended practical path is option 2, conditional on explicit owner acceptance of that limitation. The measured one-second costs justify evaluating this candidate further, not approving its production budgets. The five-second scan provides a cheaper comparison but permits a larger blind interval and is not the recommended amendment here.

If option 2 is approved, first synchronize the controlling requirements and specify near-threshold/unresolved-window completeness semantics. Then run representative full-season computation and retained-storage measurements for that defined model before numerical budget acceptance. Do not silently treat unresolved filtering as complete coverage. The accepted policy file and all living requirements remain unchanged in this experiment.

If option 1 is preferred, do not keep adding isolated speedups without a bounded proof objective and a new checkpoint. The current experiment has reached its agreed stop/decision point.

## Reproduction and scope

From C:\\DEV\\sunnyseat\\nextjs-app set E15_EVIDENCE_ROOT to this story's measurement root and E15_OUTPUT to a new absolute directory, then run:

~~~powershell
npx vitest run --config scripts/benchmarks/epic-15/vitest.config.ts scripts/benchmarks/epic-15/feasibility.measurement.ts
node scripts/benchmarks/epic-15/feasibility-report.mjs <absolute-new-run>
~~~

Both raw artifacts are hash-bound by successful completion with zero attempted external calls. No production access, database resources, runtime changes, migrations or fourth automatic review. Story 15.1 remains in-progress; 15.2 remains blocked. This report is for owner decision, not owner acceptance.
`);
