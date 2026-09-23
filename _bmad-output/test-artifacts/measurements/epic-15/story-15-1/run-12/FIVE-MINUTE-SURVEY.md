# Five-minute seasonal survey — September 11, 2026

Five-minute precomputation looks modest in storage and feasible as a background batch for the captured 42 venues. A plain five-minute grid does not meet the existing transition/no-gap requirements. Keep five minutes as the candidate base cadence, refine transitions, and investigate additional checks near the 50% exposure threshold. This is a recommendation for the next measurement experiment, not an accepted production detector or budget.

## Measured discovery results

Replayed all 42 captured venues on March 1, March 29, June 21, September 22, October 25 and October 31, 2026: 252 venue-days. Supported daylight uses the approved 5° horizon. Independent one-minute reference samples refine detected crossings to 100ms brackets. Capture represents September geometry replayed on other dates, not historical physical observations.

- Reference contains 771 alternating intervals, including 486 shaded intervals. Only one interior shaded interval is shorter than five minutes: Posthotellet (ID49), October 25, approximately 60 seconds. Other short shaded intervals touch a supported-day boundary; they are not interior gaps.
- Four short interior intervals were checked again at one second with the original, unpruned shadow engine. All four reproduced their reference topology. Three were sunny bursts (approximately 29, 105 and 231 seconds); the accepted policy suppresses those.
- Posthotellet reaches 49.73446% sunlit seating, briefly crossing below the 50% classification threshold. This is not a complete loss of sunlight across the terrace. Neighbouring five-minute samples are 50.53% and 52.94%, so checking only differing endpoint labels misses the dip.
- Plain and transition-refined five-minute sampling both miss two raw topologies: the suppressed 29-second sunny burst and this 60-second shade gap. The latter incorrectly joins two qualifying sunny windows and violates the accepted no-bridging rule.
- Plain midpoint transition estimates exceed the existing two-minute boundary tolerance in 85/252 venue-days. Refining detected crossings reduces that count to 0, but cannot recover an undiscovered gap.

Neither a one-minute reference nor the focused one-second checks proves absence of shorter unseen intervals. The observed one-gap frequency is specific to this six-date cohort, not a seasonal or citywide probability. The 50% classification remains unchanged; changing it or adding hysteresis is a separate product decision.

## Computation and sample counts

All 245 actual-year season dates were evaluated for solar support and grid counts, yielding **1,619,044 five-minute samples** for 42 venues. These cover all supported daylight, including shade: sunny windows cannot be known before calculation. Counts exclude adaptive probes.

The six-date refined candidate took **92.77 seconds wall / 93.90 CPU seconds**, summed over 252 individually timed venue-days, n=1 each. Timings use benchmark-only spatial pruning, validated previously for exposure values; runtime confidence metadata is not equivalent. The independent reference is excluded from candidate cost.

Scaling each venue's measured cost per base sample to its actual season count estimates **77.8 wall minutes / 78.8 CPU minutes** for all 42 venues. This assumes the six dates represent seasonal caster cost and refinement frequency. It excludes additional gap-detection work, database writes, scheduling, retries and production hardware differences. This is not a measured full-season run, latency percentile or approved operating budget.

## Storage: measurements and extrapolations

Compact offsets plus float64 exposure consume **19.43 MB logical numeric payload** for one full season; array headers, rows, indexes, input versions and retained generations are additional.

New guard-managed PostgreSQL 15 scratch database, actual 252 measured five-minute day rows:

| Measurement | One generation | Five identical retained copies |
|---|---:|---:|
| Day rows | 252 | 1260 |
| Stored samples | 32173 | 160865 |
| Day relations, including TOAST/index | 458752 B | 2113536 B |
| Captured inputs, stored once | 622592 B | 622592 B |
| Whole scratch database | 8917807 B | 10695471 B |

Empty database baseline: 7705391 B. Initial load: 415.1ms including transport; cluster WAL delta 1247464 B, n=1. Retention copies simulate retained values, not recomputed previous years. This scratch layout is not an application migration. Earlier sql-04 supplies separate changed-input/WAL/warm-read evidence; it was not rerun here.

Linear extrapolation of measured day-relation bytes gives roughly **18.73–23.09 MB for one full season**, or **86.30–106.36 MB for five retained seasons**. The two estimates scale by day rows or sample counts; they are sensitivity examples, not confidence bounds. Compression, page filling, larger indexes and future input versions can change the result. Add input/metadata overhead separately.

The September 10 production census measured **306,498,707 B total database size**, including 161,595,392 B in the existing geometry-series relation. Do not subtract or replace that existing data without a retention/migration plan. Five new compact seasons would therefore suggest a rough additive total around 393–414 MB plus extra metadata/growth, not a verified future database size. Current hosting allowance and usable disk headroom were not captured, so “plenty of room” is plausible at this inventory but not yet confirmed against a plan limit. No production writes were performed. Scratch resource stop was requested; saved data is retained.

## Recommendation and unchanged gates

Use a five-minute base as the next candidate, with refined detected boundaries and extra interior checks near 50% (and potentially rapid exposure changes). Validate that rule against the captured matrix before accepting it; merely detecting label changes already failed. Keep the accepted suppression of short sunny bursts and preservation of shade gaps. Do not introduce a five-minute UI delay or weather smoothing.

Full-season completeness still means every relevant date for every nondeleted venue, including hidden venues, with successful computation and known input identity. A missing/failed calculation is not shade and is not complete. The earlier one-second amendment proposal remains unaccepted; this investigation does not apply it. Encoding, production detector, operational budgets and owner acceptance remain open. Story 15.1 remains in-progress; 15.2 remains blocked.

Reproduce from nextjs-app with the isolated benchmark config: survey.measurement.ts into a fresh directory, then survey-focus.measurement.ts (expects the retained run-12 layout). survey-storage.mjs requires a guard-verified local container and a new e15_ database. Regenerate summary with survey-report.mjs <run-12>; regenerate this report with survey-decision.mjs <evidence-root>. Completion gates bind all measurement dependencies by SHA256. No fourth automatic review was run.
