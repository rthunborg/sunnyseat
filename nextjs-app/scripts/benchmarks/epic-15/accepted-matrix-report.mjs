import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {artifactHashes,validateLaneCompletion} from './evidence.mjs';
export function acceptedMatrixReport(root){
  const dir=path.join(root,'run-19'),read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8')),data=read('matrix.json'),env=read('environment.json'),completion=read('completion.json');
  const ids=['open','fully-covered','courtyard','narrow-street','rooftop-terrain','irregular','holed','overlapping','tiny','cap-and-height-boundaries','rooftop-surviving','terrain-surviving'];
  const dates=['2026-03-01','2026-03-29','2026-06-21','2026-09-22','2026-10-25','2026-10-31','2026-12-21'],expected=ids.flatMap(id=>dates.map(d=>`${id}/${d}`)),hashes=artifactHashes(dir,['matrix.json','environment.json']);
  validateLaneCompletion(completion,hashes,expected);
  validateLaneCompletion({...completion,cells:data.cells.map(c=>`${c.id}/${c.date}`)},hashes,expected);
  if(env.offlineAttempts!==0||!env.sources['test/fixtures/epic-15/geometries.ts'])throw Error('Missing fixture identity');
  const failures=data.cells.filter(c=>!c.raw.topologyMatches||!Number.isFinite(c.raw.maxErrorMs)||c.raw.maxErrorMs>120000||!c.filtered.topologyMatches||!Number.isFinite(c.filtered.maxErrorMs)||c.filtered.maxErrorMs>120000||!c.durationComplete);
  return `# Accepted-detector synthetic matrix — Story 15.1

Measured ${env.at}: all ${data.cells.length} required fixture/date combinations completed with zero attempted external calls. Twelve fixtures include open, covered, courtyard, narrow street, all-excluded rooftop control, surviving rooftop/terrain casters, irregular, holed, overlapping, tiny and height/cap cases. Seven dates include both DST boundaries and the winter control.

Candidate: five-minute base, 5-percentage-point trigger, one-minute probes, detected crossings refined to <=100ms. Reference: independent unpruned one-minute engine grid with crossing refinement. Full supported daylight was evaluated. Raw and 300-second-filtered topology, matched boundary error and unresolved duration cases are retained in matrix.json. Cases failing those comparisons: ${failures.length}.

${failures.length?failures.map(c=>`- ${c.id} / ${c.date}`).join('\n'):'All 84 cases matched the declared reference topology within the two-minute matched-transition bound, with no unresolved duration cases.'}

This completes the accepted candidate's required synthetic geometry/date comparison. It does not prove continuous discovery: a one-minute reference can itself miss sub-grid events. The owner-accepted missed-gap risk and retained adversarial counterexamples remain applicable. Winter is a control and remains outside seasonal publication eligibility. No runtime or weather behavior changed.

Reproduce from nextjs-app using the benchmark Vitest configuration and accepted-matrix.measurement.ts with a fresh absolute E15_OUTPUT. Regenerate this report with node scripts/benchmarks/epic-15/accepted-matrix-report.mjs <evidence-root>. Completion hashes and the exact 84-cell set are required before reporting.
`;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))process.stdout.write(acceptedMatrixReport(process.argv[2]));
