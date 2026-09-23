import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {thresholdSummary} from './threshold-report.mjs';
import {artifactHashes,validateLaneCompletion} from './evidence.mjs';
export function thresholdDecision(root){
  const s=thresholdSummary(root),chosen=s.calibration[5],f=n=>n.toFixed(2),mins=n=>f(n/60000),mb=n=>f(n/1e6);
  const dir=path.join(root,'run-15'),read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8')),cost=read('cost.json'),env=read('environment.json');
  const expected=['34','8','47','49'].flatMap(id=>Array.from({length:22},(_,i)=>i-2).flatMap(r=>['base','threshold'].map(m=>`${id}/${r}/${m}`)));
  const completion=read('completion.json'),hashes=artifactHashes(dir,['cost.json','environment.json']);
  validateLaneCompletion(completion,hashes,expected);validateLaneCompletion({...completion,cells:cost.rows.map(r=>`${r.id}/${r.repetition}/${r.method}`)},hashes,expected);
  if(env.offlineAttempts!==0||JSON.stringify(env.inputHashes)!==JSON.stringify(artifactHashes(path.join(root,'run-14'),['threshold.json','environment.json','completion.json'])))throw Error('Repeated cost input mismatch');
  const percentile=(rows,key,p)=>{const values=rows.map(r=>r[key]).sort((a,b)=>a-b);if(values.some(v=>!Number.isFinite(v)||v<0))throw Error('Invalid timing');return values[Math.ceil(values.length*p)-1];};
  const table=Object.entries(s.calibration).map(([m,r])=>`| ${m} | ${r.days} | ${r.rawFailures.length} | ${r.filteredFailures.length} | ${r.unresolved.length} | ${r.base} | ${r.interior} | ${r.boundary} | ${f(r.wallMs/1000)} |`).join('\n');
  const pairs=['34','8','47','49'].flatMap(id=>['base','threshold'].map(method=>{const rows=cost.rows.filter(r=>r.id===id&&r.method===method&&r.repetition>=0);return `| ${id} | ${rows[0].casters} | ${method} | ${f(percentile(rows,'wallMs',0.5))} | ${f(percentile(rows,'wallMs',0.95))} | ${f(percentile(rows,'cpuMs',0.95))} | ${rows[0].samples} |`;})).join('\n');
  const growth=s.growth.map(g=>`| ${g.venues} | ${mins(g.wallMs)} | ${mins(g.cpuMs)} | ${mb(g.estimatedSamples*12)} |`).join('\n');
  return `# Near-threshold five-minute candidate — Story 15.1

## Result and scope

Five-minute base samples with one-minute interior probes near the 50% boundary are implemented in benchmark tooling only. Probe when either endpoint is within the configured percentage-point margin of 50%, or endpoint sunny/shaded labels differ. Refine detected crossings to a <=100ms bracket. Raw sunshine still requires >50%; this does not add hysteresis, a five-minute display delay or a weather change.

The 5pp candidate has ${chosen.rawFailures.length} raw /${chosen.filteredFailures.length} filtered failures across the original 252 venue-days, and ${s.heldOut.rawFailures.length} raw /${s.heldOut.filteredFailures.length} filtered failures across 84 additional venue-days (all 42 venues on April 15 and August 15). Failure means topology mismatch or matched boundary error >2 minutes. Duration uncertainty remains unresolved in ${chosen.unresolved.length} original and ${s.heldOut.unresolved.length} additional cases. Posthotellet's previously missed October 25 shade gap: raw topology matches=${s.posthotellet.raw.topologyMatches}; filtered topology matches=${s.posthotellet.filtered.topologyMatches}.

All additional-date references use independent one-minute samples with detected-crossing bisection. Original references are hash-bound run-12 evidence; original focused one-second unpruned checks remain run-13 evidence. These are model calculations using September's captured geometry, not historical field observations. They do not prove absence of sub-minute gaps. The tested algorithm deliberately reports certifiedContinuous=false. A retained adversarial test shows a shade gap can still be missed when both five-minute endpoints are far from the trigger threshold.

## Margin comparison — measurements

All timings below are sums of individual fresh engine evaluations, n=1 per venue/date/margin. No exposure cache is shared across methods. Benchmark-only spatial pruning is used; runtime confidence metadata equivalence is not claimed. Margins were compared on the original six-date matrix; 5pp was selected in advance for the two additional dates, not selected using those results.

| Margin pp | Days | Raw failures | Filtered failures | Unresolved duration | Base calls | Interior calls | Boundary calls | Wall seconds |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
${table}

Additional dates at 5pp: ${s.heldOut.base} base +${s.heldOut.interior} interior +${s.heldOut.boundary} boundary calls; ${f(s.heldOut.wallMs/1000)} wall seconds /${f(s.heldOut.cpuMs/1000)} CPU seconds. Reference-generation cost is excluded from candidate timing.

## Paired computation check

Run-15 adds twenty measured repetitions after two warmups, alternating method order, on September 22 except Posthotellet (49) on October 25. Baseline is five-minute sampling plus detected-transition refinement; candidate adds 5pp-triggered one-minute probes. Percentiles use nearest rank (p95 is observation 19 of 20). These examples cover previously selected caster strata and the gap regression, not a citywide or production latency distribution. Raw heap snapshots are process heap, not isolated allocations. Earlier n=3 observations remain in run-14.

| Venue ID | Casters | Method | Wall p50 ms | Wall p95 ms | CPU p95 ms | Calls |
|---|---:|---|---:|---:|---:|---:|
${pairs}

## Seasonal computation and storage implications — extrapolations

Scale each venue's measured candidate cost per base sample across all eight surveyed dates to its actual 245-date season count. For 42 venues: ${s.season.base.toLocaleString('en-US')} base samples; estimated ${Math.round(s.season.estimatedSamples).toLocaleString('en-US')} total calls including adaptive probes; **${mins(s.season.wallMs)} wall minutes /${mins(s.season.cpuMs)} CPU minutes**. This is a linear same-machine extrapolation, not a measured season. It excludes horizon derivation, scheduling, input loading, DB writes, retries and read load. Current captured caster mix may not represent other dates or growth venues.

| Inventory scenario | Estimated wall minutes | Estimated CPU minutes | Logical numeric MB if every probe is persisted |
|---|---:|---:|---:|
| 42 captured | ${mins(s.season.wallMs)} | ${mins(s.season.cpuMs)} | ${mb(s.season.estimatedSamples*12)} |
${growth}

The stored representation remains undecided. Keeping every adaptive exposure point would use approximately ${mb(s.season.estimatedSamples*12)} MB of offset/float64 numeric payload per current-inventory season; this excludes headers, inputs, metadata, TOAST/indexes and retention. Keeping only base samples plus refined window boundaries could reduce this, but boundary precision and window representation require schema work after G1. Neither is a measured database total.

The previous 77.8-minute base/refinement estimate and this eight-date candidate estimate use different date mixes and one observation per venue-day, so their difference does not demonstrate that extra checks are faster. Use the paired observations above to assess added work.

The prior sql-05 actual-value storage measurements remain valid for base-grid arrays only. Its 19–23MB single-season /86–106MB five-retained day-table estimates must not be relabelled as measured sizes for this adaptive candidate. No new database workload or production access occurred in this experiment. Hosting allowance, usable headroom, representative p95/end-to-end generation and read/load budgets remain open.

## Gate disposition and next decision

${chosen.filteredFailures.length+s.heldOut.filteredFailures.length+s.heldOut.unresolved.length+chosen.unresolved.length===0?'The candidate meets the filtered comparisons in this bounded survey and is worth retaining for further validation.':'The candidate still fails or leaves uncertainty in the filtered comparisons; keep the failures open and investigate before recommending it.'} It is not a proven no-gap detector. Preserve the accepted rule: suppress sunny bursts shorter than 300s, retain intervening shade gaps, and leave duration-boundary uncertainty unresolved. Successful computation means all planned cells completed with zero attempted external calls and matching inputs; it does not mean unseen intervals have been ruled out. Missing/exhausted work must never be published as complete coverage.

No requirement amendment, production implementation, numerical budget approval or Story 15.1 acceptance is inferred from the owner's approval to investigate this candidate. G1 remains open; Story 15.2 remains blocked. Full-season actual-year completeness, the 5° convention and independent weather gate remain unchanged. Any decision to tolerate undetected shade gaps needs explicit owner approval of a concrete amendment; this report does not apply one. No fourth automatic review was performed.

## Reproduction

From nextjs-app, set E15_EVIDENCE_ROOT to the retained story evidence root and E15_OUTPUT to a new absolute directory. Run npx vitest run --config scripts/benchmarks/epic-15/vitest.config.ts scripts/benchmarks/epic-15/threshold.measurement.ts. The runner validates capture and original-survey input/source hashes before starting; completion is published only after all 872 planned cells and attempted-call assertions succeed. Run threshold-cost.measurement.ts with a separate fresh output for the 176 repeated-cost records, including warmups. For the retained run-14/run-15 layout, node scripts/benchmarks/epic-15/threshold-report.mjs <evidence-root> regenerates summary.json; threshold-decision.mjs regenerates this report. Preserve source versions named in environment.json.
`;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))process.stdout.write(thresholdDecision(process.argv[2]));
