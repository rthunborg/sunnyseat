---
title: 'Epic 15 readiness reassessment — entry to Story 15.2'
date: '2026-09-15'
project: SunnySeat
assessor: Codex
scope: 'Story 15.2 entry after reviewed Story 15.1 and accepted measurement decisions'
stepsCompleted: [document-discovery, prd-analysis, epic-coverage-validation, ux-alignment, epic-quality-review, final-assessment]
assessmentStatus: completed
story15_2Readiness: READY_WITH_NORMAL_STORY_PREFLIGHT
measurementDecisionLock: ACCEPTED_CD15_1_V1_A1
capacityAdmission: HELD
productionReadiness: NOT_ASSESSED_AS_READY
branch: epic/15-seasonal-clear-sky-geometry-materialization
head: d51687c03732ad799971ecdc2f0d726a3621cf6f
---

# Epic 15 readiness reassessment — September 15, 2026

## Verdict

**READY to begin Story 15.2 after normal dedicated-story preparation and baseline checks.** The reviewed Story 15.1 and explicit G1a–G1d/CD15.1-v1/A1 acceptance satisfy its decision-lock prerequisite. Horizon/refinement, completeness, encoding, retention and operating-budget choices agree across the current controlling sources. No unresolved specification decision requires reopening 15.1 before schema work.

This is an entry-readiness verdict, not completion of 15.2, a runtime/capacity pass, or authorization to perform production operations. This task does not start implementation. Stories 15.3–15.6 retain their predecessor gates; **capacity admission remains held** and all unpassed A1 evidence remains mandatory.

## Sources and method

This reassessment uses the installed `bmad-check-implementation-readiness` skill, scoped to the explicitly requested Epic 15 delta. The user's source selection resolves discovery confirmation; no whole-product reassessment or additional product discovery is necessary. The installed customization resolver succeeded; no activation overrides were present. Root AGENTS.md and project-context.md govern the assessment. The architecture update's `history/` copies are audit snapshots, not competing specifications or additional current project-context instructions.

Controlling documents:

- [PRD](prd.md): NFR20/NFR35/NFR40 and current September 15 disposition.
- [Architecture](architecture.md): canonical E15-AD-01/02 and accepted operating envelope.
- [Epics](epics.md): all six Epic 15 stories and Epic 13/14 dependency amendments.
- [Sprint status](../implementation-artifacts/sprint-status.yaml): Epic 15 in-progress, 15.1 done, 15.2–15.6 backlog; 13.1 in-progress.
- [September 10 readiness](implementation-readiness-report-2026-09-10-epic-15.md): original F1–F6 plus its September 15 addendum, preserved as history.
- [Epic 15 test design](../test-artifacts/test-design/test-design-epic-15.md): G1, I01–I16, O01–O05, AC mappings and A1.
- [Story 15.1](../implementation-artifacts/15-1-measure-daylight-transition-accuracy-cpu-and-storage.md): reviewed measurement work and subsequent closure.
- [Architecture consolidation execution](architecture/epic-15-update-2026-09-15/EXECUTION.md), its reviews, lint and preservation manifest: supporting audit, not a second architecture.

Decision precedence: [September 9 proposal](sprint-change-proposal-2026-09-09.md) is approved history; [September 10 owner policy](decisions/epic-15-owner-policy-2026-09-10.md), [September 12 detector-risk acceptance](decisions/epic-15-detector-risk-acceptance-2026-09-12.md), [September 14 closure acceptance](decisions/epic-15-closure-acceptance-2026-09-14.md) and [September 15 consolidation acceptance](decisions/epic-15-architecture-consolidation-2026-09-15.md) progressively settle the choices. The immutable [CD15.1-v1 package](../test-artifacts/measurements/epic-15/story-15-1/CLOSURE-DECISION-2026-09-14-v1.md) retains its submitted pending wording; its recorded acceptance controls that disposition.

Supporting requirements: [UX specification](ux-design-specification.md), [direct-sun/weather decision](decisions/direct-sun-weather-truth-2026-09-03.md), [accuracy specification](../implementation-artifacts/spec-direct-sun-weather-accuracy.md), and [launch handoff](../../docs/launch/launch-readiness-handoff-2026-08-24.md). No external/current production state is inferred from these dated records.

## PRD extraction and coverage

The three changed requirements are reproduced below. Other product requirements remain regression obligations; historical/deferred features are not newly missing Epic 15 scope.

**NFR20:** Persist versioned ungated clear-sky geometry for every non-deleted venue across the explicitly supported March–October season. Compute date-dependent model-supported daylight independently of UI opening hours and planner limits, preserve exact supported-horizon boundary instants, and project the existing 06:00–21:00 15-minute public series from the seasonal artifact. Routine reads and unchanged seasons do not recompute shadow geometry; changed inputs publish a complete compatible generation before becoming current.

**NFR35:** Persisted geometry is day-specific and another day's geometry is never substituted. Missing venue × date coverage is an observable operational failure. Current weather gating is applied at read time, and scheduled coverage reporting exposes completeness for every venue and date across the selectable window, including continuous midnight rollover. A season release is current only when every referenced venue generation has exact date coverage, a matching current input hash, compatible engine/horizon/storage versions and verified checksums. Partial builds never become current. Staged edits keep the last complete generation current; committed out-of-band input changes remain fail-closed until recomputed. Legitimate below-supported-horizon no-direct-sun intervals are deterministic coverage, not missing coverage or weather staleness.

**NFR40 — Seasonal geometry lifecycle:** Seasonal geometry generation is bounded, resumable, idempotent and rollback-capable. It records measured compute time, total database relation/index size, expected/completed counts and retained versions. At least one previous verified compatible release is retained. Weather refresh, freshness and scheduler reliability remain independent launch gates.

| Requirement | Architecture / story coverage | Planned evidence |
| --- | --- | --- |
| NFR20 | E15-AD-01 Lifecycle 1–4; 15.2 schema, 15.3 generation/invalidation, 15.4 projection | I01/I02/I04/I07/I10; O01/O02 |
| NFR35 | Exact requested-year pointer, exact-set coverage, compatible manifests, transactional rechecks and dirty-input failure; 15.2/15.4/15.5 | I02/I07–I10; scheduled selectable-window/midnight reporting; O02/O03 |
| NFR40 | E15 operating envelope, one-worker queue, resume, complete rollback manifests and protected retention; 15.2–15.6 | I05/I13–I16; O01–O05 |

**3/3 changed NFRs mapped; no missing requirement found in this delta.** All 29 remaining ACs (15.2–15.6: 6+6+5+6+6) have planned scenario mappings. Mapping is not executed coverage.

Retained functional contracts are covered by 15.4 AC3–4 and 15.5 AC1/4/5: honest pins/ranking/peaks/windows and geometric potential; free planner/favourites; 61 ordered steps, today through today+3, date-only keys and zero-fetch same-date scrub; internal confidence and attributable feedback. NFR28/34 weather boundaries, established API/JS performance budgets, Swedish-first accessibility and component/API boundaries remain mandatory through I10–I15 and O05.

## Decision lock and original findings

| Original finding | Current evidence and disposition |
| --- | --- |
| F1 — measurement decision lock | **Resolved for 15.2 entry.** September 14 explicitly accepts the hash-identified CD15.1-v1 numerical table, encoding, retention and A1. September 15 consolidates those choices in E15-AD-01/02. Story 15.1 is done in both story and sprint state. |
| F2 — horizon and presentation | **Resolved as a product/model decision.** Refraction-corrected solar-centre >=5°; <=10-second UTC roots at actual venue/date; >0° visibility remains separate. Below 5° means not sunny in SunnySeat, without a special per-pin warning; it does not establish physical beam absence. Low-angle/raw-placeholder and Swedish/ARIA evidence are retained. |
| F3 — endpoint-only detector cannot guarantee discovery | **Resolved by an explicit risk amendment, not proof of universal discovery.** Five-minute UTC base plus exact endpoints; inclusive 45–55% endpoint proximity or a >50% classification change triggers one-minute probes; detected crossings refine to <=100ms brackets. <=2-minute target applies to detected/matched transitions. The untriggered four-minute shade counterexample and shorter between-probe misses remain accepted diagnostics. |
| F4 — remaining-season completeness | **Resolved.** All 245 March–October dates of the selected actual year for every non-deleted venue, including hidden/new venues and past dates. Remaining-date builds are staging only. No effective-date exemption or alternate-year substitution. |
| F5 — reproducible measurement brief | **Completed for measurement selection under A1.** Retained fixture/capture identities, raw runs, finite comparisons, cost/layout reports and explicit limitations support the choice. Unpassed cold/load/actual-year retention evidence remains mandatory at named later gates. |
| F6 — Epic 14 tracking | **Independent tracking concern remains.** Missing Epic 14 sprint keys do not establish completion. PM should reconcile tracking in an authorized planning update; this does not block schema work or waive 14.3/14.5/14.6. |

Raw geometry stays separate from public eligibility. A reconstructed >=5° and >50% interval must last >=300 seconds to qualify, applies from calculated start to end, and preserves every detected shade gap. Do not infer continuity from endpoints, wait five real minutes, or overwrite short-window raw exposure with zero. Missing/exhausted/nonfinite computation and unresolved duration uncertainty fail completion. Fresh coherent likely-weather is independently necessary; blocked/unknown weather removes the recommendation without a new hold.

Full Float64 adaptive arrays retain every computed point and raw boundary, including half-millisecond midpoints. Shared immutable inputs, exact dates, checksums and engine/horizon/detector/decoder identity are binding. Historical replay requires retained original geometry/input, weather and classifier evidence; recomputation using today's inputs is counterfactual. Preserve g1 attribution and disclose unavailable legacy evidence.

### Measurements agree with the accepted contract, within their declared scope

The accepted package SHA256 is `8135743c74d8777f4e6e3d3bfdc00c88508c390596b6e0a2b9d62571627a657e`. Its submitted pending wording and old candidate defaults are historical; they do not reopen accepted G1.

| Retained result | What it supports / does not support |
| --- | --- |
| 84 synthetic cells; 336 captured venue-days; seven difficult full days with finer references | Empirical detector selection, finite matched-transition evidence and retained failures; not universal detection or field accuracy. |
| 42 captured venues, 1,566 distinct resolved casters; 20 measured repeats per cost cell | Representative bounded complexity evidence, not a refreshed live inventory. Zero hidden venues in the capture does not remove hidden venues from completeness. |
| One actual 245-date venue season; 161 bounded shards; weighted 42-venue season estimate 75.30 wall /75.11 Node CPU minutes | Accepted measurement scope. Full-cohort implemented throughput remains unproved; the estimate is not a timed 42×245 execution. |
| 294 measured day rows: arrays 655,360 B, JSONB 671,744 B, bytes 737,280 B | Equal-data layout comparison supporting arrays; not actual current/previous-year diversity or guaranteed production footprint. |
| Four-copy application-only model 406,752,403 B; budget-allocation model 439,330,259 B | Both exceed 400 MB before auxiliary databases/protected growth. This confirms the admission hold; neither is a fresh aggregate census. |

The complete accepted numerical table controls, not this summary: initial/all-invalidation 120 active wall/100 Node CPU minutes for 42×245; venue-season 180/150 seconds; one-day repair 15/10 seconds; one worker, <=5×3 shards, 60-second ceilings and 45-second admission cutoff; 120-second lease/15-second heartbeat; <=3 attempts/<=60-second backoff; <=20,000 evaluations/day; <=512 MB RSS. Storage limits are decimal 30 MB day relations per generation set, 5 MB total shared metadata, 375 MB aggregate warning and 400 MB admission ceiling. Read targets are 100 ms combined batch p95, 5 ms decode p95, 100 ms no-op DB p95 and <=20% matched writer-load increase at 1/5 readers with zero new errors/timeouts. Preserve the package's units, active-work boundaries, CPU exclusions and growth limitations. These are accepted targets and safety limits, not deployed compliance.

## Story quality, dependencies and precise 15.2 handoff

The approved brownfield epic has concrete user value: avoid preventable geometry-coverage outages and repeated expensive work while retaining honest sun predictions. Its technical sequencing is justified; a generic objection to infrastructure epics does not override this approved course correction. No starter-template or broad schema setup is needed.

The dependency chain remains **15.1 decision lock → 15.2 → 15.3 → 15.4 → 15.5 → 15.6**. A1 deliberately moves candidate measurements to where the implemented candidate can supply them; it does not create a circular prerequisite for the schema. Story 15.2 can deliver and validate its schema/decoder/g2/migration contract in isolation without wiring later production reads or running a production generator.

| Story 15.2 AC | Required handoff and evidence |
| --- | --- |
| AC1 — immutable model | Seasons, venue generations, full-precision day results, release manifests and season pointers; canonical input stored once; no shadow polygons. I02 validates exact membership and malformed representations. |
| AC2 — g2 identity | Golden vectors for all geometry/selection/algorithm/constants/numerical-version inputs; stable equivalent ordering/normalization. I01. |
| AC3 — exclusions and legacy attribution | Pins, hours, metadata, weather and planner length remain hash-stable; real geometry changes invalidate; g1 attribution remains. I01/I15. |
| AC4 — isolated migration/storage validation | Replay migrations from clean/supported existing state; real constraints, checksums, decoder compatibility, indexes and role-specific RLS/force-RLS/grant tests. I02/I03/I13. **Include A1 actual current/previous-year values, distinct retained input versions, evidence references, staging/failed occupancy and realistic churn. Same-value copies do not satisfy this evidence.** |
| AC5 — staged edits and rollback | Specify consistent input revisions, transaction rechecks, dirty committed inputs and compatible pointer rollback. Retain each season's complete current and compatible rollback manifests plus all referenced/evidence-protected generations; per-venue fallback rows alone are insufficient. I02/I08/I14/I15. |
| AC6 — review before production | Review migration and rollback evidence; production mutation remains separately authorized. I03/I14 and G3. |

Dedicated 15.2 story preparation remains to be done; no such brief was found. Carry these obligations into its tasks rather than copying only the short AC bullets. Split compound AC assertions into testable cases and identify the isolated environment and actual-year/version fixture provenance. Its availability was not exercised here. An unavailable representative data/DB lane blocks the affected validation and story completion; it does not reopen G1 or justify fabricated evidence.

The September 15 seam corrections are present and enforceable: exactly one active geometry worker with independently queueable urgent work (15.3 AC3/I05); complete compatible rollback manifests (15.4 AC5/I14/I15); season pointer derived from requested Stockholm date, not wall clock (I02/I10); and scheduled selectable-window/midnight coverage reporting without recomputation (15.4 AC2/15.5). Older generic scenario wording is constrained by these explicit current assertions.

No critical or major story-structure defect blocks 15.2. Numbered ACs are testable through the scenario families despite not using literal Given/When/Then formatting. Story 15.5 AC2's representative-transition wording must be read with the accepted detected/matched scope; it is not a reinstated universal-discovery requirement. Historical pending headings, unchecked historical review decisions and the original readiness frontmatter remain dated history, not competing current gates.

## UX, weather and cross-epic alignment

UX documentation exists and includes the accepted horizon/window/detector amendments. Story 15.2 adds no screen or visual behavior. Its storage must preserve the information later consumers need for raw potential versus qualifying windows; 15.4/15.5 must prove common-instant parity across live lookup, cached planner, pins, list, detail, ranking and favourites. No new warning, reference rebaseline, public planner expansion or five-minute weather smoothing is needed for schema entry.

The invariant remains geometry >50% plus coherent `directSunState === 'likely'`; diffuse daylight is not direct sun. Missing/stale/malformed/incomplete/unmatched/legacy/contradictory weather never becomes clear. Preserve two-hour expiry, signed ±90-minute provider-valid-time matching, unknown precedence, qualifying-run window semantics and snapshot-only public reads with zero live Met.no or request geometry/hash/caster computation.

- **Epic 13/13.1:** in-progress. Replacement seasonal reads need their own bounded dependency-path and provider-classified cold evidence, plus independent recovery/scheduling gates. Preserve the named 42×61 cohort; inventory changes need explicit evidence treatment.
- **Epic 14.3:** field records carry generation/input identity and low-angle/transition cases. Geometry corrections invalidate dependent seasonal evidence.
- **Epic 14.5:** geometry, weather and classifier versions remain separately replayable within retained-data limits.
- **Epic 14.6:** preparation need not wait for 15.2; final seasonal launch proof follows 15.5 and the deployed compatible candidate. Field/weather launch gates are not schema-entry prerequisites.

Latest recorded public API findings in the accuracy specification are September 9: 42 blocked venues, zero weather-unavailable reasons and list/detail agreement after the canonical-coordinate fix. These are API consistency observations, not outdoor ground truth. The recorded failed scheduled deliveries and successful manual refresh do not establish reliable scheduling. The September 10 diagnostics handoff is not evidence of subsequent production activation or complete historical replay. September 14 storage evidence narrows earlier assumptions about retained input payloads for its measured cohort; it does not reconstruct every historical prediction. No live production verification was attempted in this reassessment.

## Outstanding gates and ownership

These are mandatory future obligations, not new unresolved measurement choices or optional recommendations.

| Gate / owner | Required proof and blocking point |
| --- | --- |
| 15.2 AC4 / Architect, Developer, Test Architect | Actual current/previous-year retention diversity, changed input versions, protected references and realistic churn in isolated schema/storage validation. Missing evidence prevents completing that validation; repeat against the implemented candidate at 15.5 I13. |
| 15.3/15.5 / Developer, Test Architect | Full-cohort implemented throughput, real new/removed-caster spatial influence or conservative full invalidation, operational bounds and failure recovery. Bounded 15.1 measurements are not these passes. |
| 15.5 I13 before 15.6 O02 / Architect, Test Architect | Controlled cold and combined query+decode p95, no-op DB p95, matched generator-on/off load at 1/5 readers, >=20 valid observations per defined cohort and retained cache/plan/buffer evidence. All remain NOT RUN. |
| Capacity admission; O01/O02 / Maintainer with Architect, Test Architect | Fresh consistent aggregate census, disk/WAL/plan headroom and all retained/staged/failed/evidence-protected data. Resolve the >400 MB hold before generation admission on the target; recheck before publication. Lower actual distinct-generation occupancy or a separately authorized capacity/legacy change must supply the resolution. No retention reduction or deletion is implied. |
| 15.4/15.5 → O02 / Developer, Test Architect | Exact 245-date/all-non-deleted coverage, current inputs, checksums, decoder compatibility, ordinary public parity with individually approved attributed corrections, weather matrix and a complete compatible rollback drill. |
| 15.6 / Maintainer, PM | Separate production migration/publication/rollback authorization. Partial canary never replaces a complete production release. Retire routine geometry work only after >=7 days AND one real invalidation with required clean observations; retain weather refresh, coverage reporting and recovery operations. |
| Epic 13/14 / Existing owners | Provider-classified cold/recovery, weather delivery/freshness and generation-attributed field/direct-beam evidence remain separate release/launch gates. |

The capacity hold does not prohibit ordinary local schema design, golden-vector work or bounded approved isolated validation. It does prohibit interpreting this READY verdict as permission to admit an over-budget target build. An isolated lane still needs its own suitability and resource checks; no target was certified or launched here.

## Recommended next step

In a fresh story context, use **[CS] Create Story — `bmad-create-story`, action `create`, Story 15.2**. This recommendation follows the installed `bmad-help` catalog; it was not executed. Carry the six ACs and A1/seam obligations above into the brief and apply `story-file-audit`. Run the required typecheck and lint from `C:\DEV\sunnyseat\nextjs-app\` before story edits; stop for unrelated baseline errors. Identify the isolated migration/role/storage evidence lane before attempting its dependent work.

There are **zero new blocking planning findings for 15.2 entry**. The existing capacity hold, carried evidence lanes and independent Epic 14 tracking concern remain visible above. This report supersedes the September 10 entry verdict for 15.2 only; it does not rewrite that assessment or its original evidence.

## Verification and preservation

Fresh checks in this reassessment:

- From `nextjs-app/`, `node scripts/benchmarks/epic-15/closure-evidence.mjs ../_bmad-output/test-artifacts/measurements/epic-15/story-15-1` passed all **347** manifest byte-length/SHA256 checks and reproduced four retained reports in memory. This was offline integrity/arithmetic verification, not a new timed experiment or database measurement.
- Accepted CD15.1-v1 SHA256 independently matched the acceptance record.
- From `nextjs-app/`, `npx vitest run test/unit/services/direct-sun-documentation-contract.test.ts`: **1 file, 3 tests passed**. The protected test was not edited.
- The retained September 14 canonical review log ends in PASS (251 files /2,291 tests), followed by recorded human story approval. Those are prior results, not reruns here. No additional Story 15.1 code-review round was performed.
- `git diff --check` passed for the existing tracked diff, with line-ending notices only. The new report received a separate whitespace/local-link check.
- SHA256 comparisons confirmed **1,027 pre-existing files unchanged**, covering all existing `_bmad-output/` files, AGENTS.md, project-context.md, `.codex/config.toml` and the protected documentation-contract test. Party-mode files, architecture audit/history, sprint status, Story 15.1 and the old readiness report are preserved.

Branch and HEAD remained `epic/15-seasonal-clear-sky-geometry-materialization` / `d51687c03732ad799971ecdc2f0d726a3621cf6f`. The only repository addition from this assessment is this report. Initial shell calls landed at C:\ despite the requested directory and failed read-only; subsequent commands explicitly selected the repository/application root. No reset, revert, clean, commit, push, merge, deployment, story-status change, runtime edit or production access occurred.

Full typecheck/lint/Vitest, E2E and visual validation were not repeated for this documentation-only reassessment. No story was started or moved to review; future story preflight remains required. No managed resource was needed or launched. The assessment does not certify execution-environment availability, production headroom, deployed performance, weather reliability or physical accuracy.
