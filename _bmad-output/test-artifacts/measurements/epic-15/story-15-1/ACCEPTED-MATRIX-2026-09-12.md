# Accepted-detector synthetic matrix — Story 15.1

Measured 2026-09-12T18:53:24.247Z: all 84 required fixture/date combinations completed with zero attempted external calls. Twelve fixtures include open, covered, courtyard, narrow street, all-excluded rooftop control, surviving rooftop/terrain casters, irregular, holed, overlapping, tiny and height/cap cases. Seven dates include both DST boundaries and the winter control.

Candidate: five-minute base, 5-percentage-point trigger, one-minute probes, detected crossings refined to <=100ms. Reference: independent unpruned one-minute engine grid with crossing refinement. Full supported daylight was evaluated. Raw and 300-second-filtered topology, matched boundary error and unresolved duration cases are retained in matrix.json. Cases failing those comparisons: 0.

All 84 cases matched the declared reference topology within the two-minute matched-transition bound, with no unresolved duration cases.

This completes the accepted candidate's required synthetic geometry/date comparison. It does not prove continuous discovery: a one-minute reference can itself miss sub-grid events. The owner-accepted missed-gap risk and retained adversarial counterexamples remain applicable. Winter is a control and remains outside seasonal publication eligibility. No runtime or weather behavior changed.

Reproduce from nextjs-app using the benchmark Vitest configuration and accepted-matrix.measurement.ts with a fresh absolute E15_OUTPUT. Regenerate this report with node scripts/benchmarks/epic-15/accepted-matrix-report.mjs <evidence-root>. Completion hashes and the exact 84-cell set are required before reporting.
