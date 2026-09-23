---
title: 'Epic 15 Implementation Readiness Assessment'
date: '2026-09-10'
project: SunnySeat
scope: 'Approved Epic 15 course correction only'
assessor: Codex
stepsCompleted: [document-discovery, prd-analysis, epic-coverage-validation, ux-alignment, epic-quality-review, final-assessment]
measurementVerdict: READY_TO_START_WITH_NORMAL_STORY_PREFLIGHT
implementationVerdict: NOT_READY_PENDING_MEASUREMENT_DECISION_LOCK
branch: main
head: ed13d76a6e214f5e9f66ef5b73f8202f4406033d
---

# Epic 15 readiness — 2026-09-10

## Verdicts

**Story 15.1 measurement work: READY TO START after normal story preparation and baseline checks.** No unresolved product or engineering decision prevents measuring the proposed alternatives. The horizon, sampling policy, encoding, budgets and completeness choice are outputs of this work, not prerequisites that must already be approved. This assessment does not start that story or certify its execution environment.

**Stories 15.2–15.6: NOT READY TO START.** Story 15.1 has no completed measurement evidence or owner decision lock. Each subsequent story also retains its explicit predecessor gate. Story 15.6 additionally needs separate production authorization. Planning approval is not approval of final engineering parameters, deployment, or launch.

The approved direction is aligned across the controlling sources. Required work is a bounded measurement and decision handoff, followed by staged implementation; it is not a return to product discovery or a reopening of Epic 12.

## Sources, scope and preservation

The installed `bmad-check-implementation-readiness` skill and its six assessment steps were consulted, with the review scoped to the user's explicitly selected Epic 15 delta. The user's source selection and request for a completed report resolve the generic discovery confirmation. Generic objections to technical epics do not override this explicitly approved brownfield course correction. No whole-product readiness or implementation-pass claim is made.

Controlling whole documents were found; no competing sharded PRD/architecture/epics/UX source was identified:

| Source | Assessment anchors |
| --- | --- |
| [PRD](prd.md) | NFR20 at line 490; NFR35 at 514; NFR40 at 520; dated supersession at 522; direct-sun correction at 585 |
| [Architecture](architecture.md) | E15-AD-01 at 1607; E15-AD-02 at 1705; release/launch gates at 1720 |
| [Epics](epics.md) | Epic 13/14 at 4521–4652; dependency amendments at 4661; Stories 15.1–15.6 at 4668–4750 |
| [UX](ux-design-specification.md) | Seasonal degradation note at 688; terminal direct-sun three-outcome matrix |
| [Sprint status](../implementation-artifacts/sprint-status.yaml) | Epic 12 done; Epic 13/13.1 in-progress; Epic 15 and six stories backlog at 357–364 |
| [Project context](../../project-context.md) and [AGENTS.md](../../AGENTS.md) | Current conventions, boundaries, story preflight and preserved history |

Decision/evidence sources: [approved September 9 proposal](sprint-change-proposal-2026-09-09.md), especially approval disposition §10; [direct-sun/weather decision](decisions/direct-sun-weather-truth-2026-09-03.md); [accuracy specification](../implementation-artifacts/spec-direct-sun-weather-accuracy.md), including September 7 conformance and September 9 production checkpoints; [launch handoff](../../docs/launch/launch-readiness-handoff-2026-08-24.md), including September 10 diagnostics limitations and seasonal addendum. The current/future split in the [schedule guide](../../nextjs-app/docs/github-actions-scheduled-jobs.md) and [venue guide](../../nextjs-app/docs/venue-data-load.md) is consistent with pending implementation.

The proposal is approved history, not a second living specification. Earlier Epic 12 evidence and old readiness reports remain unchanged. No dedicated Story 15.x implementation brief was found; the six acceptance-criteria sets currently live in epics.md.

Initial working tree: ten modified files (`.codex/config.toml`, sprint status, PRD, architecture, epics, UX, launch handoff, scheduled-jobs guide, venue-data guide and project context); untracked party-mode memory, September 9 proposal and protected documentation-contract test. This report is the only intended addition. No application/configuration edits, sprint regeneration, production access/mutation, resource launch, reset, revert, clean, commit, push, merge or deployment was performed.

## Requirements and coverage

The three changed NFRs all have explicit implementation coverage: **3/3 mapped, none missing**. This is specification coverage, not verification that the requirements pass.

| Requirement | Required outcome | Story coverage / remaining gate |
| --- | --- | --- |
| NFR20 | All non-deleted venues, explicit March–October season; venue/date daylight independent of hours/picker; exact edges; unchanged public projection; no unchanged-season recompute | 15.1 measurement, 15.2 versions, 15.3 generation, 15.4 reads/publication, 15.5 proof, 15.6 retirement. Horizon and completeness lock still open. |
| NFR35 | Exact-date/current-input/version/checksum-compatible complete release; atomic publication; staged old input/result compatibility; dirty committed inputs fail closed; deterministic unsupported intervals; continuous selectable-window coverage | 15.2 contract, 15.3 invalidation, 15.4 transaction/read validation, 15.5 negative/race/rollover tests, 15.6 coverage proof. Remaining-date generation cannot count as full-season completeness. |
| NFR40 | Bounded/resumable/idempotent generation, measured CPU and full relation/index footprint, progress, retained compatible rollback; independent weather gates | 15.1 budgets, 15.2 retention/schema, 15.3 shards/leases, 15.4 rollback, 15.5 recovery/performance, 15.6 observation. No measured budgets yet. |

Retained requirements are covered as regression obligations rather than new product scope:

| Retained PRD contract | Epic 15 trace |
| --- | --- |
| FR1/2/5/7/8/28, LR2, FR-LR-01/02: honest pins, ranking, exposure, peaks/windows | 15.4 AC3–4, 15.5 AC1/4; geometry >50% plus coherent likely, qualified potential and no confidence numbers |
| FR9–11/13/31: free planner/scrub/date/favourites | 15.4 AC3, project-context zero-fetch same-date scrub and date-only query keys; retain today→today+3, 06:00–21:00, 61 steps |
| FR12/12a/17: internal confidence, seating elevation, attributable feedback | 15.1 representative elevated cases; 15.2 AC2–3/5; 15.3 AC4–5; 14.3/14.5 dependency amendments |
| NFR28/34 and NFR-LR-01…05: provider-free reads and conservative weather/DTO boundaries | 15.4 AC4 and 15.5 AC4, including malformed evidence, contradictory DTOs, qualifying-run windows and provenance |
| NFR1/8/18/22–27/35: performance, cost, accessibility and coverage | 15.1 AC4–5, 15.5 AC4–5; established budgets retained |

No new FR, photo acquisition, payment, admin product, public season expansion or provider integration is needed. Other historical/deferred FRs are outside this delta assessment, not missing Epic 15 scope.

## Findings and required corrections

### F1 — Measurement decision lock is open (blocks 15.2 onward)

Architecture lines 1636 and 1711 and Story 15.1 AC6 explicitly require owner acceptance of measured behavior and cost. The 5° floor, >=10-point refinement trigger, <=2-minute transition target, <=10-second boundary solver target, candidate 5×14 shard, encoding and CPU/storage/read budgets are not measured guarantees. Do not copy proposal estimates into acceptance evidence or treat the word “approved” as a waiver.

**Required:** Architect and Test Architect deliver a versioned results/decision record, with Rasmus accepting the final horizon, detection/refinement policy, safety-limit behavior, completeness contract, encoding and budgets before 15.2. Failed bounds require an explicit amendment. This does not block running the experiment.

### F2 — The 5° boundary needs model-qualified evidence and UX acceptance (within F1)

The source supports the rationale: `shadow-geometry.ts:4–6` defines the 200 m cap and 5° floor; `shadow-calculation-service.ts:140–147` returns a low-confidence result below that floor, with 25% at line 758. `solar-calculation-service.ts:45–58` uses refraction-corrected elevation and visibility >0°. Changing the low-angle placeholder to deterministic zero changes geometric values even if the old >50% predicate already prevented amber.

A supported-model negative from 0° to <5° does **not** demonstrate absence of a physical direct beam. The UX seasonal note acknowledges this, but its reused “blocked by geometry / shade” treatment can still read as physical certainty. Existing copy must be reviewed against measured examples; this is a semantic acceptance risk, not permission to invent new copy or add a low-angle physics model.

**Required:** Report low-angle duration, old 25%→candidate value differences, exact first/last supported intervals, rounding/inclusion behavior and public/ARIA outcomes. Distinguish model parity from field accuracy. Retain separate 0° visibility and proposed 5° support boundaries, and do not use the existing sunrise helper's -0.833° event as either one. Obtain acceptance of the resulting presentation before read-path rollout; amend UX if it cannot honestly express the result. No reference rebaseline is authorized by this report.

### F3 — Endpoint-only refinement cannot establish the transition bound (within F1)

Architecture line 1632's endpoint trigger alone is insufficient; E15-AD-02 line 1715 and Story 15.1 AC2/6 correctly retain the gap. For illustration, both 12:00 and 12:15 can be 0% while an interior 12:06–12:09 run exceeds 50%; neither endpoint trigger fires. Equal high endpoints can similarly conceal a shade interval. Bisection improves a detected bracket; it cannot discover an unbracketed interior run. One midpoint probe can also miss an off-centre run.

**Required:** Compare complete reference intervals, both same-side cases and adversarial narrow windows. Report missed-window counts/durations, false windows, transition error, sample count, safety-limit failures and cost. State the reference's own limits: a one-minute grid can miss sub-minute runs and cannot prove arbitrary-duration detection. Lock a validated interior-probe/equivalent method and its supported claim; never infer physical accuracy from sample spacing. Measurements can start with candidate policies and failed cases.

### F4 — Remaining-season new venues cannot satisfy a full-season release (within F1)

E15-AD-01's new-venue bullet at line 1671 allows remaining dates before entering the current release, while NFR20/35 and the publication rules require full coverage. E15-AD-02 line 1716 expressly prevents interpreting that earlier bullet as publication permission. It is a documented unresolved gate, not an unrecognized reason to halt measurements.

**Required:** Before schema lock, select full March–October generation for every published non-deleted venue (including hidden), or seek explicit approval of effective-date applicability and historical replay rules. If the latter is chosen, define release denominator, pre-effective-date reads, feedback attribution, edits/deletions and rollover, then reconcile living PRD/architecture/story wording. Until then, remaining-season outputs are staging only. Benchmark both strategies without publishing either.

### F5 — Make the measurement brief reproducible (preparation, not a design blocker)

Story 15.1 is an adequate epic-level brief but bundles solar correctness, geometric reference tests, CPU distributions and database storage into one evidence spike. Its execution brief must identify datasets, repetitions, hardware/runtime, baseline revision, exact commands, raw outputs and owners; separate observation from extrapolation for current inventory and 50/100/500 growth cases.

Two concrete traps require attention:

1. The solar function accepts coordinates, but the current pure shadow entrypoint calls `calculateSolarPosition(timestamp)` with Gothenburg defaults (`shadow-calculation-service.ts:140`, also timeline line 432). E15 asks for actual venue/date boundaries. Measure and identify the current city-coordinate baseline separately from venue-coordinate boundary candidates; do not silently call coordinate differences “sampling error” or patch the application in this assessment.
2. The proposal describes duplicated historical input payloads, while the September 10 launch handoff at lines 1163–1168 states historical full payloads are unavailable. The historical migration still defines `input_payload`; its existence alone does not prove retained production contents. Benchmark the actual identified baseline and newly captured reproducible input fixtures, not an assumed historical replay. Preserve the proposal and production evidence as written.

**Required:** Draft 15.1 with deterministic open/courtyard/narrow/elevated/holed/overlapping cases plus representative current caster distributions. Record provenance/hash for captured inputs and observed inventory. Use the existing pure calculation seam with injected casters and mocked server infrastructure; never let a benchmark accidentally fetch live weather. SQL encoding experiments belong in an isolated benchmark environment, not an application migration. Report heap/TOAST/index/shared-input/metadata/retention/headroom totals as well as payload sizes. Missing real inputs or an unavailable isolated database would block those evidence lanes, not all solar/geometry measurement.

### F6 — Reconcile dependency tracking before implementation handoff (not a measurement blocker)

Epic 14 stories exist in epics.md but have no `development_status` keys in the inspected sprint file; its note explicitly defers their reconciliation. Do not infer Epic 14 completion from that omission or from the accuracy specification's `done` status. The epic's field and launch work remains distinct from the completed conservative-classifier correction.

**Required:** PM records the actual Epic 14 preparation/final-evidence dependencies when normal tracking reconciliation is authorized. Do not regenerate sprint status here. Retain the 13.1 baseline 42×61 cohort; any future inventory change needs explicit evidence-cohort treatment, not silent reuse of “42” for a different inventory.

## UX and dependency alignment

UX documentation exists and preserves the public planner, unknown-weather potential, coverage failure/retry behavior, Swedish-first accessibility, reduced motion and component/API boundaries. No new screen or layout is required. F2 is the specific semantic risk. Refined live lookup in 15.4 must preserve client cached-series consistency and zero-fetch scrubbing; decoder availability alone is not evidence that live and scrubbed surfaces agree.

The dependency chain is valid: **15.1 lock → 15.2 → 15.3 → 15.4 → 15.5 → 15.6**. Schema work has a bounded migration/rollback deliverable; it need not wait for production deployment to be complete. Generator and publication stories cover retries, dirty inputs, races, corrupt data and rollback rather than only the happy path. Numbered ACs are testable, although dedicated story briefs should split compound assertions and specify evidence artifacts. Technical sequencing is justified by the approved operational value: reduce avoidable coverage outages without increasing request compute or weakening truth.

- **13.1:** Keep provider-classified cold evidence, recovery and scheduling work independent. When seasonal reads replace the batch RPC, amend the observed dependency-path allowlist and prove bounded batching, no geometry/hash RPC and no Met.no. Earlier telemetry cannot certify a replacement path.
- **14.3:** Low-angle/transition field records must carry generation and input hash; physical geometry corrections still invalidate seasonal results.
- **14.5:** Geometry generation, weather evidence and classifier versions remain independently replayable; retain evidence-referenced generations.
- **14.6:** Preparation can proceed now; final seasonal launch evidence depends on 15.5 and the deployed compatible candidate. This is an explicit cross-epic release dependency, not a requirement to finish field calibration before measuring storage. Avoid a circular interpretation in which 15.5 requires final 14.6 approval before 14.6 can test the candidate.

## Production evidence and measurement feasibility

The latest recorded September 9 production verification reports 42 blocked venues, no weather-unavailable reasons, and list/detail agreement after the canonical-coordinate fix. It is an API consistency observation, not terrace ground truth. Recorded scheduled runs failed before refresh at 01:16, 05:01 and 09:33 UTC; a successful manual refresh does not prove reliable delivery. The September 10 diagnostics handoff is an implementation/prerequisite record, not evidence of a newly deployed diagnostics capability. No live status was rechecked for this report.

Neither weather scheduling failures nor incomplete Epic 14 field calibration blocks offline Story 15.1 measurement. Owner diagnostics deployment, production mutation and photo acquisition are unnecessary. A trusted guard context exists for this session, but no resource was needed or launched. Actual benchmark runner/data/database availability was not exercised, so no operational readiness pass is claimed. The existing test Compose file is a possible isolated lane subject to guard validation; its tmpfs and disabled durability settings must be reported and must not be represented as production performance evidence.

The non-negotiable regression contract remains: **geometry >50% plus coherent likely; no diffuse-as-direct claim; missing/stale/malformed/incomplete/unmatched/contradictory weather never fabricated clear; two-hour TTL; signed ±90-minute provider-valid-time matching; snapshot-only public list/detail reads with zero live Met.no calls.** Geometry coverage failures and unknown weather remain separate. Compatible rollback must match committed inputs and decoder/engine versions; otherwise fail closed rather than implicitly rolling back inputs or weather.

## Actionable handoff

1. Prepare Story 15.1's dedicated measurement brief in a fresh story session, incorporating F2–F5. Run required typecheck/lint from `nextjs-app/` before story work and surface unrelated baseline failures. Follow story-file-audit when creating that brief. This readiness assessment does not mark it ready-for-dev or start measurements.
2. Execute the isolated measurement lanes, retaining raw evidence and failures. Resolve F1–F4 with owner acceptance and synchronize only living specifications; preserve historical evidence.
3. Start 15.2 only after that lock; progress sequentially through 15.5 with required tests and compatible rollback proof. Address F6 in an authorized planning update.
4. Keep 15.6 behind separate production authorization and full-release proof. Retire routine geometry scheduling only after at least seven days **and** one real invalidation, whichever finishes later. Weather reliability and Epic 14 field correctness remain independent launch gates.

Six findings are recorded: four decision-lock concerns, one measurement-preparation concern and one dependency-tracking concern. None is an identified blocker to beginning offline measurement preparation. No application tests, benchmarks, browser checks or production verification were run in this documentation assessment; prior results are attributed history only.

Final preservation verification: SHA-256 comparisons matched all 13 pre-existing modified/untracked files, including the protected config, party-mode memory and documentation-contract test. This report was the only added file. Branch and HEAD remained unchanged. `git diff --check` passed, with only the existing config line-ending warning; no story status was changed.

## Current disposition addendum — 2026-09-15

The September 10 assessment above remains historical evidence. Story 15.1 is now done; G1a–G1d is accepted under September 10/12/14 decisions and CD15.1-v1/A1. [September 15 consolidation](decisions/epic-15-architecture-consolidation-2026-09-15.md) reconciles canonical E15-AD-01/02. F1–F4 measurement-choice concerns are resolved by those acceptances, including the explicit empirical missed-gap risk and full actual-year completeness. F5 is covered by retained measurement evidence subject to A1: controlled cold/combined read, no-op and writer-load proof at 15.5 I13 before O02; retained actual-year diversity/churn at 15.2/15.5; fresh capacity at O01/O02. Capacity admission remains held. F6 Epic 14 tracking remains independent; missing sprint keys do not imply completion. This addendum does not certify candidate readiness or start 15.2–15.6. Original findings and verification claims are unchanged.
