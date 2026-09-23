# Epic 15 detector selection and residual-risk acceptance — September 12, 2026

Status: **Rasmus accepts the tested detector and its documented residual risk.** This is a scoped G1b requirements amendment, not acceptance of all G1 gates or Story 15.1 completion.

## Explicit approval and scope

After the September 12 decision package and the explanation that the detector can miss an untriggered four-minute shade interval, Rasmus answered: **“accept this tested candidate’s documented risk”**. The question explicitly distinguished retaining strict no-gap from accepting this candidate's risk. Approval therefore replaces the strict guarantee of discovering every interior shade gap with the empirical detector described below. It does not authorize deliberate merging of detected shade gaps.

The September 10 policy remains authoritative except for this scoped detection/continuity amendment. Horizon, minimum reconstructed sunny-window duration, weather gating and actual-year full-season completeness remain unchanged. No runtime, schema/migration, rollout, final encoding, retention count, operating budget, review round or later story is approved by this record.

## Accepted detector

- Five-minute base samples on the UTC-aligned grid, plus exact supported-day endpoints at the calculated 5° horizon.
- Add one-minute interior samples when either endpoint is within **five percentage points of 50%** (inclusive, 45–55%) or the endpoints' sunny/shaded classifications differ. This does not change the raw >50% sunny predicate.
- Refine detected crossings to a <=100ms bracket. This is conditional precision for discovered transitions, not a continuous discovery certificate. The <=2-minute transition target remains applicable to detected/matched reference transitions; the <=10-second horizon-root target remains unchanged.
- Apply the >=300-second public-window rule to reconstructed raw intervals, from their calculated start to end. Suppress shorter reconstructed sunny intervals and preserve every detected intervening shade interval. Retain raw exposure separately. Do not add hysteresis, previous-display-state logic, a real-time five-minute wait or new weather smoothing.

Selected benchmark: `nextjs-app/scripts/benchmarks/epic-15/threshold-sampling.ts`, SHA256 `c1be42ab6cce2d7d1b9ec90daf41552f8e0243a8e3c00c989cad223027598bd9`, configured with margin=5 and probeMs=60000. This identifies the accepted measured algorithm, not an authorization to wire it into runtime during Story 15.1.

## Accepted residual risk and unchanged failure handling

The detector can miss interior sun or shade intervals when five-minute endpoints do not trigger probes; a synthetic four-minute shade counterexample is retained. Even triggered one-minute grids can miss shorter between-sample events. Consequently reconstructed windows can appear continuous across undetected shade and can differ from the underlying engine's complete trajectory. These are accepted sampling risks, not guaranteed error-duration bounds or measured occurrence probabilities.

The candidate matched the declared one-minute references on 336 captured venue-days; all tested 15/30/60-second interior cadences also matched five-second references on seven difficult full days. The observed Posthotellet gap remains detected and must remain a regression case. Finite success does not establish physical or continuous geometric truth. Do not advertise the method as guaranteed gap-free or claim a measured percentage accuracy from this evidence.

This risk acceptance does **not** permit calling failed/exhausted computation, missing inputs, missing dates, non-finite values or unresolved 300-second duration uncertainty complete. Computational completion still requires the expected venue/date set, validated source identity and successful checks. Sampling completeness is not continuous-truth completeness. Preserve the known-miss counterexamples as diagnostics with accepted-risk status; do not rewrite historical measurements or relabel their discovery failures as successful detection.

## Evidence and gate disposition

- `_bmad-output/test-artifacts/measurements/epic-15/story-15-1/ACCEPTANCE-PACKAGE-2026-09-12.md`: package presented before this approval; its pending-owner wording remains historical.
- `run-14` / `run-15`: 336-day candidate comparisons and repeated cost.
- `run-16`: shorter-cadence comparisons; `run-17`: bounded local workflow and representations.
- `nextjs-app/test/unit/benchmarks/epic-15/threshold-sampling.test.ts`: known-gap, duration and untriggered four-minute counterexample regressions.

G1b detector selection and residual-risk acceptance are **ACCEPTED**. Remaining implementation/regression verification is still required. G1a/G1c product decisions remain accepted. G1d final encoding, retention and numerical production budgets remain pending; approval of detector risk is not approval of the package's other recommendations. Combined G1 remains open, Story 15.1 remains in-progress, and Story 15.2 remains blocked. No fourth automatic review is authorized.
