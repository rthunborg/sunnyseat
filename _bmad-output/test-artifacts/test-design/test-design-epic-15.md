---
title: 'Epic 15 risk-based verification plan'
date: '2026-09-10'
author: 'Codex — Test Architect'
designLevel: epic
status: 'Measurement decisions accepted; candidate validation and capacity admission pending'
workflowStatus: completed
totalSteps: 5
stepsCompleted: [step-01-detect-mode, step-02-load-context, step-03-risk-and-testability, step-04-coverage-plan, step-05-generate-output]
lastStep: step-05-generate-output
nextStep: ''
lastSaved: '2026-09-10'
branch: main
head: ed13d76a6e214f5e9f66ef5b73f8202f4406033d
inputDocuments:
  - AGENTS.md
  - project-context.md
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/implementation-readiness-report-2026-09-10-epic-15.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-09-09.md
  - _bmad-output/planning-artifacts/decisions/direct-sun-weather-truth-2026-09-03.md
  - _bmad-output/implementation-artifacts/spec-direct-sun-weather-accuracy.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - docs/launch/launch-readiness-handoff-2026-08-24.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-12.md
  - .agents/skills/bmad-testarch-test-design/SKILL.md
  - .agents/skills/test-gate/SKILL.md
---

# Test Design: Epic 15 — Seasonal Clear-sky Geometry Materialization

## Executive summary and decision boundary

This is a verification design, not measurement evidence, a dedicated story brief, implementation approval, or a launch verdict. The [readiness report](../../planning-artifacts/implementation-readiness-report-2026-09-10-epic-15.md) permits Story 15.1 preparation and measurement after normal story preflight. The measurement decision lock is satisfied under CD15.1-v1/A1; Stories 15.2–15.6 retain their ordered predecessors and explicit story-start boundary. Story 15.6 additionally requires separate maintainer authorization for production operations.

The controlling requirements are [PRD](../../planning-artifacts/prd.md) NFR20/NFR35/NFR40, [architecture](../../planning-artifacts/architecture.md) E15-AD-01/02, [Epic 15 and the Epic 13/14 amendments](../../planning-artifacts/epics.md), and [sprint state](../../implementation-artifacts/sprint-status.yaml). The [September 9 proposal](../../planning-artifacts/sprint-change-proposal-2026-09-09.md) is approved decision history; its estimates and earlier remaining-season wording are not a competing specification. Story 15.1 is done; 15.2–15.6 remain backlog. The September 15 disposition below governs current decisions; the original protocol and historical alternatives remain traceable. Epic 12 is done; Epic 13/13.1 is in progress. Missing Epic 14 sprint keys do not mean completion.

The plan has **14 risks, 11 high risks (score >=6)**, and **28 scenario families: 7 measurement, 16 implementation/proof, 5 rollout**. Priorities are 10 P0, 17 P1 and 1 P2 families; each expands into the parameterized cases below. No P3 work is necessary. P0 is intentionally concentrated on truth, coverage and irreversible data-integrity exposure rather than a generic percentage quota. Every required AC remains mandatory at any priority.

The horizon, detector risk, completeness, encoding and operating budgets are accepted under CD15.1-v1/A1. Implementation verification and capacity admission remain outstanding. Measurements may expose failed candidates. They must not convert an unsupported bound into an accepted accuracy reduction.

## Non-negotiable contract and exclusions

- Public affirmative sun requires **geometry >50% plus coherent `directSunState === 'likely'`**. Clear-sky percentage is geometric potential, never a probability or weather-adjusted value. Diffuse brightness is not direct sun.
- Missing, stale, malformed, incomplete, unmatched, legacy or contradictory weather never becomes clear. Geometry <=50% can independently establish a geometric block; unknown weather is not fabricated as known even in that case.
- Keep the **two-hour snapshot TTL**, expiry at the exact boundary, and **signed ±90-minute provider-valid-time matching**. A convenience minute key cannot bypass provider timestamps. Public list/detail reads use saved geometry/weather only: **zero live Met.no calls, zero request geometry or hash/caster computation**.
- Preserve the public 61 ordered quarter-hours, 06:00–21:00, today-through-today+3 client planner, date-only query keys and zero-fetch same-date scrub. Server bookmark validation retains its existing window opt-out; do not add a new server today+3 rejection. March–October storage does not expand public selection.
- Preserve Swedish-first copy, qualified unknown-weather potential, no public confidence numbers, WCAG 2.1 AA, reduced motion, tokens and component/API boundaries.

| Excluded here | How the dependency remains visible |
| --- | --- |
| Application tests/scaffolds, runtime edits, migrations, benchmarks or resource launches | This document specifies future evidence only. No story is started. |
| Production reads/operations/configuration, commit/push/merge/deploy | Use recorded production findings; authorization for future production operations remains separate. |
| New low-angle physics, terrain/observer horizon or irradiance provider | Model limitations remain explicit; a failed claim returns for amendment. |
| Venue-photo acquisition, Epic 12 reopening, premium/payment functionality | Outside the Epic 15 delta. |
| New weather scheduling or field-calibration work | Independent Epic 13/14 launch gates, not discharged by geometry verification. |

## Risk assessment

Probability: 1 unlikely, 2 possible, 3 likely/known gap. Impact: 1 minor, 2 degraded with workaround, 3 core truth, availability, security or evidence integrity. Score = probability × impact. Scores >=6 require evidenced mitigation; score 9 prevents the affected downstream gate while open. These are planning judgments, not incident-frequency measurements. The original risk scores below are retained. Measurement-choice dispositions for R-01/R-02/R-03 and budget selection for R-08 follow the accepted September 15 consolidation; residual and implementation risks remain subject to their candidate gates. Owners are existing role responsibilities, not dispatched assignments.

| ID | Category | Failure and basis | P | I | Score | Mitigation / scenarios | Owner; deadline |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-01 | TECH | Equal endpoints conceal a sun/shade run; readiness F3 identifies a detection gap that bisection cannot fix | 3 | 3 | 9 | Full interval oracle, off-centre probes and supported detection claim; M02/M03, I04 | Architect + Test Architect; 15.1 lock, reprove 15.5 |
| R-02 | BUS | 0–5° model negative reads as physical shade; city coordinates get mistaken for venue-boundary accuracy (F2/F5) | 3 | 3 | 9 | Separate coordinate/horizon lanes and semantic acceptance; M01/M04, I12 | Architect + PM/Rasmus; lock and before 15.4 rollout |
| R-03 | DATA | Remaining-season new venue or omitted hidden venue passes a full-season gate (F4) | 3 | 3 | 9 | Exact inventory/date denominator, explicit completeness decision; M07, I02/I07/I08 | Architect + PM/Rasmus; before 15.2 |
| R-04 | DATA | g2 omits exposure inputs or dirty committed revision serves old geometry | 2 | 3 | 6 | Golden vectors, dependency mutations, consistent snapshots and runtime-aligned spatial proof; I01/I06/I08/I09 | Developer + Architect; 15.2–15.4 |
| R-05 | DATA | Competing publishers expose mixed, partial or corrupt release | 2 | 3 | 6 | Real transaction races, immutable manifests and rechecks; I02/I08/I09 | Developer + Test Architect; 15.4, proof 15.5 |
| R-06 | TECH | DST, exact-edge or season-key leakage silently substitutes another instant/day | 2 | 3 | 6 | UTC round trips, 23/25-hour days, edge-only windows and exact date keys; M01, I04/I07/I10 | Developer + Test Architect; 15.1 and 15.5 |
| R-07 | BUS | Seasonal DTO path revives fabricated clear or contradictory likely; recent real coordinate regression | 2 | 3 | 6 | Admitted-weather matrix plus list/detail canonical-coordinate proof; I11/I12 | Developer + Test Architect; 15.4–15.5 |
| R-08 | PERF | Payload estimates hide TOAST/index/retention cost or unrealistic database timing (F5) | 3 | 2 | 6 | Actual relation census and cold/warm measured workloads; M05/M06, I13 | Architect + Test Architect; budgets at 15.1, remeasure 15.5 |
| R-09 | OPS | Interrupted workers, expired leases or duplicate retry damage current coverage | 2 | 3 | 6 | Controlled crash points, fencing and resume evidence; I05/I16 | Developer; 15.3, proof 15.5 |
| R-10 | DATA | Rollback restores wrong inputs/decoder or retention destroys feedback evidence | 2 | 3 | 6 | Compatible-only pointer drill and reference-protected retention; I14/I15 | Architect + Developer; 15.2 design, 15.5 drill |
| R-11 | SEC | New tables/functions expose canonical inputs or allow unauthorized publication | 2 | 3 | 6 | RLS/force-RLS/grants and actual denied operations with role-specific connections; I03 | Developer + Architect; 15.2 |
| R-12 | PERF | Refined lookup adds fan-out, client payload or scrub requests | 2 | 2 | 4 | Batched reads, observed call paths, JS budgets and cached/live agreement; I10/I12/I13 | Developer + Test Architect; 15.4–15.5 |
| R-13 | OPS | Geometry success is misused to retire weather monitoring or certify field accuracy | 2 | 2 | 4 | Separate launch evidence and observation gates; O03–O05 | Maintainer + PM; 15.6 / 14.6 |
| R-14 | OPS | Missing historical inputs or flaky inherited tests produce overstated evidence | 2 | 2 | 4 | Reproducible captured fixtures, excluded-sample ledger and explicit blocked lanes; M05/M06, I16 | Test Architect; 15.1 preparation and 15.5 |

No low-risk cosmetic work is added. Residual risks remain even after deterministic tests: unmodelled vegetation/awnings, caster quality, the 200 m shadow cap, low-angle physical beams, weather-grid uncertainty, finite-reference blind spots and provider scheduling. Epic 14 field evidence owns physical accuracy; this plan does not silently waive it.

## Existing coverage and testability

Read-only inspection found reusable Vitest unit/route tests and Playwright DTO-intercept patterns. Presence is not a fresh pass. Historical ATDD headers can still say RED/skip after implementation; inspect executable declarations rather than trusting comments.

| Existing seam (paths relative to `nextjs-app/`) | Reuse and limitation |
| --- | --- |
| `lib/solar/solar-calculation-service.ts` and `lib/solar/shadow-calculation-service.ts` | `calculateSolarPosition` accepts venue coordinates. Pure `calculateVenueShadowFromBuildings` accepts injected casters but currently invokes solar position with Gothenburg defaults. Measure that deployed baseline separately from venue-coordinate boundary candidates; do not label coordinate differences sampling error. Mock server infrastructure on import. |
| `test/unit/shadow-calculation-service.test.ts`, `test/unit/shadow-geometry-confidence.test.ts`, `test/unit/services/sun-engine.day-series-parity.atdd.test.ts` | Reuse geometry/elevation and ordinary-step parity fixtures; no complete-season/interior-window guarantee follows. |
| `test/unit/services/sun-geometry-hash.atdd.test.ts` | g1 order/orientation/-0/non-finite/caster vectors provide regression patterns; new g2 manifests and excluded UI dependencies require separate vectors. Preserve g1 attribution. |
| `test/unit/story-12-3-geometry-migrations-and-leases.atdd.test.ts` | SQL source assertions and a local state-machine model do not prove real transaction isolation, grants or competing sessions. New lifecycle proof needs isolated PostgreSQL/PostGIS. |
| `test/unit/services/persisted-sun-read-batching.automate.test.ts`, `test/unit/api/story-12-3-persisted-geometry-route.atdd.test.ts` | Existing 42-venue batching, exact-date failures, unknown weather and no-provider patterns. Adapt assertions to the reviewed replacement path, not blanket path allowances. |
| `test/unit/services/direct-sun-classifier.test.ts`, `weather-snapshots.direct-sun.test.ts`, `sun-geometry-persisted-outcome.automate.test.ts` | Keep the conservative classifier, malformed evidence, provenance, qualifying windows and timestamp admission; extend them through seasonal reads. |
| `test/unit/services/venue-store.test.ts`, `test/unit/api/venues-route-real-engine.test.ts` | Canonical engine/weather coordinates versus display pins, list/detail agreement and server-only DTO stripping. |
| `test/e2e/epic-10-weather-matrix.spec.ts`, `test/e2e/story-12-3-persisted-geometry-request-count.atdd.spec.ts` | DTO-intercept presentation and request-count proof; mock before navigation and reject provider calls. Not proof of database publication. |
| `test/setup/setup.ts`, `vitest.config.ts`, `playwright.config.ts` | Existing provider guard and test harnesses. Use deterministic clocks and network assertions; swallowed provider errors must still fail a call-count assertion. No new framework/Pact broker required for this monolith. |
| `test/unit/services/direct-sun-documentation-contract.test.ts` | Protected untracked documentation regression; preserve it. Its local presence explains historical local/CI count differences. |

The [accuracy specification](../../implementation-artifacts/spec-direct-sun-weather-accuracy.md) records September 9 production list/detail agreement after the canonical-coordinate fix: 42 blocked venues and no weather-unavailable reasons. It records schedule failures at 01:16, 05:01 and 09:33 UTC and successful manual refresh; manual success does not prove scheduling. It also records one chip-filter retry, 51 existing E2E skips, and a unit timeout under full concurrency. None is a new result from this planning run or a waiver for new coverage.

The [September 10 launch handoff](../../../docs/launch/launch-readiness-handoff-2026-08-24.md) states historical full input payloads are unavailable. An old migration's `input_payload` column cannot prove retained production contents. Diagnostics deployment prerequisites remain separate; do not deploy diagnostics just to run 15.1.

## Entry criteria and owner decision gates

| Gate | Required evidence and disposition | Owner |
| --- | --- | --- |
| G0 — start 15.1 | Dedicated measurement brief, recorded branch/HEAD/dirty state, typecheck and lint from `nextjs-app/`, fixture provenance and isolated lane availability. Unrelated baseline failures stop story edits. Not run here. | Architect + Test Architect |
| G1a — horizon/presentation | Actual 0°/5° boundaries, low-angle durations, placeholder deltas, rounding/inclusion and Swedish/ARIA examples. Accept the model-qualified claim, not physical darkness. F1/F2. | Rasmus with PM/Architect |
| G1b — detection policy | Complete interval comparisons, missed/false-window durations, worst transition errors, sample costs and safety-limit outcome. Lock an interior-probe/equivalent method and the supported claim. F1/F3. | Rasmus with Architect/Test Architect |
| G1c — completeness | ACCEPTED: full actual-year March–October for every non-deleted venue including hidden/new venues. No effective-date exemption or cross-year substitution; remaining dates are staging only. F4 resolved by owner policy; I02/I07/I08 still required. | Rasmus + PM/Architect; before schema |
| G1d — encoding and budgets | Observed arrays/bytes/JSONB comparisons, initial/incremental CPU, storage/retention/headroom, decode/batch/read measurements. The complete CD15.1-v1 budgets and shard/limit choices are ACCEPTED under A1; cold/load/retained-diversity proof remains NOT RUN at the specified candidate gates and capacity admission remains held. F1/F5. | Rasmus + Architect/Test Architect |
| G2 — implementation sequence | Accepted versioned G1 record precedes 15.2; then 15.2 → 15.3 → 15.4 → 15.5. Each story retains its own review/human completion gate. | PM + story owners |
| G3 — production and launch | 15.5 evidence, approved candidate, separately scoped production migration/publication/rollback/retirement authorization. Independent Epic 14 field correctness and weather scheduler reliability remain open. | Maintainer + PM |

G1 is one combined decision lock: partial acceptance does not unlock schema work. Failed bounds require an explicit amendment; neither elapsed time nor this plan is approval. G1 is now accepted under CD15.1-v1/A1; this does not pass carried measurements or start another story. PM must reconcile Epic 14 sprint tracking when authorized (readiness F6); this task does not regenerate it.

## Story 15.1 measurement protocol — retained original experiment design

**Purpose:** characterize alternatives and deliver a decision record. No production schema, pointer, runtime or schedule changes. A failed candidate is a valid experimental finding, not successful implementation evidence. M01–M07 below retain the original experiment protocol and alternatives; current results and scope transfers are governed by CD15.1-v1/A1. They must not be read as a new pending measurement decision or as completed candidate tests.

### Reproducibility and reference contract

Record repository revision and hashes of relevant dirty source files, fixture manifest/hash and source date, caster count/vertex/overlap/elevation distributions, coordinate mode, engine and numeric dependency versions, timezone data/runtime versions, machine CPU/RAM/OS, Node version, database version/settings, cache state, exact commands and random seed. Capture fresh reproducible inputs only through an authorized source; retain their provenance. Synthetic fixtures must be labelled synthetic. Missing actual inputs blocks real-inventory cost evidence, not the pure solar lane.

Freeze the same fixture, engine and requested instant for each comparison. Keep three causes of difference separate: baseline city versus venue solar coordinates, supported-horizon convention versus old 25% placeholder, and sampling/encoding versus the matched engine oracle. Quarter-hour parity must use the existing output as baseline, not a candidate-derived expected result. Analytic/synthetic shape checks provide an independent sanity oracle; an exact-engine evaluation proves model parity only.

### Dates and geometries

| Dimension | Required cases and assertions |
| --- | --- |
| Dates | 2026-03-01, 2026-03-29, 2026-06-21, **2026-09-22 as the chosen September transition fixture**, 2026-10-25, 2026-10-31; winter control 2026-12-21. Winter evaluates model behavior without making the date publicly selectable. Add 2026-02-28/11-01 for season exclusion and an explicit next-year rollover fixture. |
| DST | Spring local day maps 2026-03-28T23:00Z → 2026-03-29T22:00Z (23 hours); autumn maps 2026-10-24T22:00Z → 2026-10-25T23:00Z (25 hours). Verify both sides of the UTC transition, absent spring 02:30 and repeated autumn 02:30 distinguished by UTC/offset. No local-key duplication or fixed-24-hour iteration. Derive and assert through the repository timezone functions at execution. |
| Solar edges | Solve refraction-corrected centre 0° and 5° separately for actual date/location. At each rising/setting edge evaluate before/exact/after; report root bracket and residual. Proposed <=10-second solver error remains a decision target. Preserve exact edge records, no inward quarter-hour rounding; test an edge-only interval with no regular point. The -0.833° sunrise helper is neither boundary. |
| Coordinates/elevations | Gothenburg baseline and representative venue engine coordinates across the scoped inventory. Pair identical coordinates with changed seating/ground elevation: caster math can change, solar event time must not. No terrain skyline/observer-height dip added. |
| Seating | Open/no casters, fully shaded control, enclosed courtyard, narrow street/slit, rooftop/elevated with terrain delta, concave/irregular outline, polygon with hole. Include tiny but valid seating and orientations facing distinct solar azimuths. |
| Casters | Sparse/typical/dense observed sets, overlapping/duplicate footprints without double-counted shade, tall distant caster near search/shadow cap, effective-height near zero/minimum, radius just inside/exact/outside, eligible versus quarantined/inactive records. Null/unavailable casters must not be confused with an empty valid set. |

Use the full representative geometry × required-date matrix for oracle correctness. Add current-inventory cases by caster-count and complexity strata, recording counts rather than assuming all 42 public venues equal the non-deleted generation inventory. Derive season date and sample counts for every included venue/date; 245 calendar dates for March–October is not a fixed daylight sample count.

### Measurement families

Priority means risk, not execution timing. Detailed variants within each family are individually identifiable in the future evidence manifest.

| ID | Priority / level | Existing AC | Protocol and expected evidence | Risk |
| --- | --- | --- | --- | --- |
| M01 | P1 / offline solar experiment | 15.1 AC1, AC3 | Apply the date/edge matrix above. Record date keys, UTC/local round trips, both 0°/5° edges, supported duration, base/adaptive/edge sample counts and unsupported intervals. Compare changing opening hours/picker bounds: generation outputs unchanged. | R-02/R-06 |
| M02 | P0 / offline geometry experiment | 15.1 AC2, AC3 | Evaluate complete supported daylight at one-minute spacing with exact edges; compare complete ordered >50% runs, not just triggered brackets. Add off-grid sub-minute probes/exact-engine bracketing for seeded narrow runs. Include 0% at 12:00 and 12:15 with >50% at 12:06–12:09, plus an off-centre run that also evades a midpoint; equal high endpoints hiding shade; several crossings and equality at 50%. | R-01 |
| M03 | P1 / offline sampling experiment | 15.1 AC2, AC3, AC6 | Compare endpoint-only, midpoint and candidate interior-probe/equivalent policies. Exercise <10, exactly 10 and >10 percentage-point endpoint deltas, >50 crossings, nearest-sample ties, recursion/sample/time limits and solver non-convergence. Report each failure; never mark a safety-limited undecidable interval as verified. Owner locks safe failure semantics. | R-01/R-08 |
| M04 | P1 / model and semantic review | 15.1 AC3, AC6 | Compare old low-angle 25% with candidate deterministic zero; record every changed value and first/last supported interval. Show clear, blocked and unknown weather presentation at model boundaries; review visible and ARIA meaning. Do not infer physically absent beam from 0–5° or count diffuse light as direct. | R-02 |
| M05 | P1 / CPU experiment | 15.1 AC4 | Measure per sample/day/shard and end-to-end CPU/wall time, memory, warmup and retry overhead by caster complexity. Compare rolling five-date baseline, full season and staged builds, initial build, one venue edit, local caster import, conservative all-venue invalidation and unchanged-season no-op. Produce current inventory plus 50/100/500 scenarios. | R-08/R-14 |
| M06 | P1 / isolated SQL and decode benchmark | 15.1 AC5 | Compare current identified JSONB baseline, compact arrays and versioned bytes on identical measured dates/inputs. Measure full footprint and decode/batched reads as below, including rejected malformed encodings. Experimental SQL belongs only in a separately prepared isolated benchmark environment, not an app migration. | R-08/R-14 |
| M07 | P0 / decision and completeness experiment | 15.1 AC6 | Compare full-season new venue and remaining-date staging cost. Demonstrate missing historical dates against the full-season denominator; document effective-date alternative effects. Produce G1 record accepting policy/encoding/budgets/completeness or requesting measured amendment. No schema lock while unresolved. | R-01/R-02/R-03 |

For M02/M03 record each reference/candidate run's start/end, matching relation, maximum and distribution of signed/absolute transition error, missed-run count and total/max duration, false-run count/duration, splits/merges, ordinary quarter-hour differences, sample amplification and safety-limit failures. Compare both sun and shade intervals; averages cannot hide a worst-case failure. A one-minute grid can miss sub-minute runs; bisection only refines detected brackets. Report reference resolution and residual uncertainty for each claim. No arbitrary-duration discovery guarantee follows from finite probes, and no physical-accuracy guarantee follows from temporal resolution.

For M05 use paired repetitions with fixed seed/order rotation; proposed protocol is at least five untimed warmups followed by 30 measured repetitions per bounded cost cell. Publish raw n/p50/p95/max, failures and warmup exclusions; increase n if tails are unstable. Full-season runs may be fewer due to cost: report their actual n and do not manufacture a p95 from too few observations. This repetition design is a planning choice, not a product acceptance threshold. Report measured current-inventory runs separately from extrapolated growth estimates. Compute full-season estimates by summing actual date-dependent sample counts weighted by observed caster strata; do not multiply one summer day or 61 points across all dates. Distinguish CPU totals, serial elapsed time and measured bounded-concurrency elapsed time.

For M06 retain the same rows, precision, metadata and validation guarantees for every encoding. Measure row/sample distributions and input sizes using newly captured fixtures if historical inputs are absent. Report heap, TOAST (including its index), table indexes, shared inputs counted once, season/generation/release metadata, current and previous season, at least two verified releases, staged/failed builds, evidence-protected generations and operational headroom. Include baseline database footprint separately from incremental E15 footprint; never double-count indexes already included in total relation size. Compare clean load and realistic edit/retry/retention churn, planner query plans/buffers, cold/warm decode/read latency, index usefulness and write/WAL overhead where representative. Log exact queries such as `pg_total_relation_size`/`pg_indexes_size` with a consistent census time and explain TOAST accounting. Serialized JSON length or byte-array payload length alone is not database-size evidence.

The checked-in `compose.test.yaml` uses a 512 MB tmpfs and disables fsync, full-page writes and synchronous commit. It may support logical isolated checks if guard-approved; its timing is not durable production write/recovery evidence and its capacity cannot be assumed sufficient for 500-venue/retained-season runs. Later benchmark preparation must obtain a representative isolated durable database lane or mark that part blocked. No Compose changes or launches are authorized by this plan.

Deliver a measurement package containing fixture manifest, raw solar/interval/CPU/SQL results, difference ledger, environment and exact-command record, explicit observed-versus-extrapolated columns, limitations, proposed numerical budgets and G1 signatures. Do not fill this package with proposal scenario estimates labelled as observations.

## Later implementation and proof coverage — Stories 15.2–15.5

These families execute only after G1 and their story predecessors. Unit tests own deterministic math/validation; database integration owns real constraints/races; API tests own routing/serialization/dependency paths; component tests own semantic copy; E2E owns a small set of integrated journeys. Cross-layer checks assert distinct seams rather than duplicate all permutations in browsers. DB integration is explicitly required even though ordinary Vitest is configured for unit/components.

| ID | Priority / primary level | Existing AC mapping | Cases and required outcome | Risk / owner |
| --- | --- | --- | --- | --- |
| I01 | P1 / unit golden vectors | 15.2 AC2–3; 15.5 AC3 | g2 changes independently for seating geometry/engine-coordinate derivation, seating/ground elevation, resolved caster ID/geometry/height/ground/roof/import/eligibility, selection rules, solar/refraction/shadow algorithms and constants, numerical dependency, canonicalization, sampling and decoder versions. Ring start/orientation, caster ordering and normalized equivalent values stay stable. Display pin, hours/name/tags/photos, weather and UI planner length stay stable; base sampling policy does not. Preserve g1 vectors and reject non-finite/invalid inputs. | R-04; Developer |
| I02 | P0 / unit + DB integration | 15.2 AC1, AC4–5; 15.4 AC1–2; 15.5 AC3 | Immutable records, canonical input once/generation, no intermediate polygons; unique keys and exact generation/date membership. Reject missing/extra/duplicate date, hidden venue omission, wrong season/timezone/hash, malformed horizon, non-monotonic/duplicate/out-of-range offsets, mismatched array lengths/counts, exposure outside 0–100, corrupt bytes/checksums or incompatible engine/horizon/format/decoder. Counts alone never prove exact set completeness; recompute/check digest chain. | R-03/R-05; Developer |
| I03 | P0 / isolated DB integration | 15.2 AC4, AC6; 15.5 AC3 | Migration replay from clean and supported existing state; constraints/indexes/grants survive replay. Verify RLS and force-RLS as designed, PUBLIC/anon/authenticated denials for inputs/builds/publication and service-role-only operations with actual role connections. Public DTOs reveal no canonical input/caster payload; source-text grants are not sufficient proof. Review migration/rollback artifacts before production authorization. | R-11; Developer + Architect |
| I04 | P1 / unit + engine integration | 15.3 AC1; 15.5 AC1–2 | Rerun M01–M04 against the implemented generator/decoder and locked policy. Deterministic below-horizon coverage avoids expensive caster math, retains exact edges and differs from missing coverage. Prove 100% ordinary quarter-hour parity outside individually approved corrections; every delta carries venue/date/instant/hash/generation/reason/approval. Live lookup must meet the locked interval bound on all representative cases. | R-01/R-02/R-06; Test Architect |
| I05 | P1 / real worker/DB integration | 15.3 AC2–3; 15.5 AC3 | Deterministic shard key and measured bounds; duplicate delivery, retry after day commit/before checkpoint, failure before write/during write/before ready, heartbeat/lease expiry and stale worker resume. Resume verified days without duplicate results or false counts; old lease owner cannot complete after replacement. Same generation excludes competing builders; unrelated venue builders progress; failed build leaves current release unchanged. | R-09; Developer |
| I06 | P1 / unit + DB integration | 15.3 AC4; 15.5 AC3 | Seating/elevation/caster edits produce all affected generations. Spatial import selection matches runtime radius/eligibility including exact boundary cases; absent proof and algorithm changes invalidate all. Read a consistent input snapshot; mutation during snapshot/build is detected at publication. No invalidation for weather/display-only edits. | R-04; Developer |
| I07 | P1 / DB + date integration | 15.3 AC5; 15.5 AC2–3 | New/hidden/non-deleted/deleted inventory, full-season staged edit, restore/unhide and explicit-year rollover obey G1c. Remaining-season work never masquerades as full coverage. February/March and October/November boundaries plus December/January explicit next-year preparation never substitute year/date. Continuous selectable-window midnight coverage uses exact dates without nightly recomputation; retained previous season remains attributable. | R-03/R-06; Developer |
| I08 | P0 / multi-session DB integration | 15.2 AC5; 15.3 AC3–4; 15.4 AC1–2; 15.5 AC3 | Shadow-read candidate without pointer writes. Pause after validation, concurrently change inventory/input revision/delete/add venue or compete to publish, then release the barrier. Transaction rechecks reject stale candidate. Concurrent readers see a complete old or complete new compatible manifest, never mixed rows. Abort before/inside flip leaves old pointer; lost acknowledgement after commit is idempotently reconciled. Same inputs may reuse verified generations without treating mixed compatible generation IDs as failure. | R-03/R-04/R-05; Developer + Test Architect |
| I09 | P0 / API + DB integration | 15.4 AC2; 15.5 AC3 | Staged input edit retains matching committed old inputs/results. Direct committed edit sets dirty and fails closed with typed `SUN_GEOMETRY_COVERAGE_MISSING` 503 until matching release exists. Missing release/day, wrong date/hash or decoder/checksum corruption rejects; no nearest-day/current fallback or request recompute. Assert both list/detail behavior and unchanged pointer on failed candidate. | R-04/R-05; Developer |
| I10 | P1 / API integration | 15.4 AC3; 15.5 AC1, AC5 | Exact 61 ordered 06:00–21:00 steps and retained validation rules. Assert bounded batch calls for 1/current/50/100/500 inventories, no per-venue growth in call count within approved batching contract, no hash/caster RPC, no provider/geometry compute. Serialize public-safe DTOs only, use canonical engine/weather location despite moved display pin. Test empty public set and list/detail exact-instant agreement. | R-06/R-12; Developer |
| I11 | P0 / unit admission + API integration | 15.4 AC4; 15.5 AC4 | Execute weather matrix below through seasonal snapshots. Count attempted provider calls and geometry/hash/caster invocations (all zero), including failure paths. Weather absence yields honest unknown/potential for positive geometry, not geometry-coverage 503; invalid geometry remains a separate coverage failure. | R-07; Developer + Test Architect |
| I12 | P1 / component + targeted E2E | 15.4 AC3–4; 15.5 AC4 | Current/live selected instant, cached same-date scrub, list/card/pin/QuickInfo/detail, ranking/peaks/windows and favourites consume coherent state. Same-date scrub makes zero list fetches; date change uses existing key/de-dup behavior. Refined live lookup agrees at common instants with API/decoded semantics and does not make cached coarse series promise unsupported precision. Cover weather refresh/cache ETag transitions, unknown overriding legacy obscured ARIA, qualifying-run window status, Swedish copy, keyboard/focus/44 px targets, mobile+desktop axe and reduced motion. Review low-angle semantics under G1a. | R-02/R-07/R-12; Developer + Test Architect |
| I13 | P1 / DB and API performance + build | 15.2 AC4; 15.5 AC5 | Re-run actual candidate footprint/retention and batch/decoder costs against G1d. Measure uncached origin, hot origin and edge-hit cohorts separately; cold is provider-classified only. Verify approximately five-second cold gate, warm <200 ms target and JS <=600/280/320 KB total/initial/MapLibre. No synthetic size or local latency substitutes for deployment evidence. | R-08/R-12; Test Architect |
| I14 | P0 / DB + candidate API drill | 15.2 AC5–6; 15.4 AC5; 15.5 AC6 | Flip to retained verified release compatible with committed input hashes and engine/decoder; concurrent readers see coherent release. Reject target with stale hash, missing generation, bad checksum or incompatible decoder; remain fail-closed if none safe. Weather and input digests remain unchanged; do not restore input revisions implicitly. Rolling operation availability is not automatic compatibility of an old release. | R-10; Architect + Developer |
| I15 | P1 / DB integration | 15.2 AC3, AC5; 15.3 AC5; 15.5 AC3 | Retain current/previous season, at least two verified releases and all referenced generations. g1 feedback and g2 field/replay references survive; retained weather/classifier evidence versioned independently. Retention cannot remove a current, rollback or evidence-referenced generation; test concurrent reference creation/retention transaction. Pruning proof uses isolated fixtures only, not host teardown or user-file cleanup. | R-10; Developer |
| I16 | P2 / isolated operational rehearsal | 15.3 AC6; 15.5 AC6 | Verify implemented build/invalidate/resume/rollover/retention runbook against an isolated target, expected/completed counts/checksums, failure diagnostics, sanitized logs and bounded resource lifecycle. Keep existing rolling operations available until retirement gate; no invented commands. Preserve raw failures/retries/skips and evidence manifests with exact revision/environment. | R-09/R-14; Developer + Test Architect |

### Weather truth matrix for I11/I12

Use geometry values below/exactly/above 50% (49/50/51) and a high 95% fixture. Admission uses a fixed clock; current and each day-series step match their own requested UTC instant. UI consumes serialized results, never independently classifies weather.

| Matrix cell | Oracle / boundary |
| --- | --- |
| Complete clear/fair | Fresh, valid, coherent total/layers/fog <=20%, explicit zero forecast precipitation, not-gated and no contradictory reasons allow likely only above 50%. |
| Broken/partial cloud | Intermediate obstruction and broken-cloud symbols produce unknown unless an independent definite blocker exists. Exercise exact 20/80 and either side; never retune thresholds. |
| Complete overcast and high-only raw overcast | 95% geometry with total 100 / low 0 / medium 100 / high 0 is blocked, not amber/ranked/window/peak. Raw total >=80 remains blocking even when weighted high cloud is lower. |
| Rain and fog | Positive forecast amount/precipitation symbol or admitted Nowcast rain blocks. Missing rain is not dry evidence. Dense fog/symbol blocks; partial fog unknown. Include near-hour Nowcast timestamp attachment to one bounded closest slice, not every horizon slice. |
| Missing/legacy/incomplete | Omitted total/layer/fog/precipitation/symbol, absent row and legacy slices never become clear. No synthetic zero or visibility/irradiance. |
| Stale/invalid timestamps | At expiry minus 1 ms snapshot remains temporally admissible; exact two-hour expiry and plus 1 ms are stale. Invalid update/expiry and request-irrelevant evidence cannot claim weather provenance/full confidence. DST cannot extend TTL. |
| Signed provider match | Test -90 min -1 ms, exactly -90, -90 +1 ms, +90 -1 ms, exactly +90 and +90 +1 ms. Exact ±90 is admitted; outside rejected; preserve sign in diagnostics. Repeat across both DST changes and midnight, including forged convenience-minute keys. |
| Malformed/ties | Null/primitives/out-of-range fields/all-malformed and mixed arrays; malformed present `weatherUnknown`/`isRaining` retain timestamped unknown so nearby clear cannot replace them. Duplicate equal-distance slices in both input orders retain conservative unknown precedence. |
| Contradictory DTO/evidence | Clear symbol versus overcast, likely with gated/CloudObscured/contradictory sky or nonempty/malformed reasons cannot be affirmative. Independent blocker precedence follows the existing classifier. Unknown overrides legacy definite obscured text and accessible names. |
| Cache/window regression | Clear → expired/unknown → refreshed transitions change relevant cached output/ETag; 304 must not resurrect clear evidence. A later valid window uses its qualifying run's status, not selected shaded instant. Weather-only refresh leaves g2 generation unchanged. |

## Story 15.6 rollout evidence — separately authorized later

| ID | Priority / level | Existing AC | Required evidence / stop condition | Risk / owner |
| --- | --- | --- | --- | --- |
| O01 | P1 / candidate comparison | 15.6 AC1 | Full-season candidate built without publication; comparison and representative open/dense/elevated/edge canary only in non-production or expressly approved isolated canary lane. A partial canary never replaces production's full release. | R-03/R-05; Maintainer + Developer |
| O02 | P0 / release gate | 15.6 AC2–3 | 100% eligible venue × exact date × current input coverage under G1c, all compatibility/checksum/parity/budget evidence, successful compatible rollback drill and separate authorization before atomic full flip. Record manifest and evidence checksums. | R-03/R-05/R-10; Maintainer |
| O03 | P0 / observed recovery | 15.6 AC3 | Unexplained affirmative difference, missing/wrong-hash/incompatible coverage, coverage-503 rate increase over recorded baseline, latency/load breach, checksum/decoder/DST/date leakage or atomicity failure triggers authorized compatible rollback. If no compatible target exists, fail closed; no automatic input/weather rollback. Preserve failure evidence. | R-05/R-07/R-10; Maintainer |
| O04 | P1 / observation and retirement | 15.6 AC4–5 | At least seven days **AND** one real input invalidation, whichever completes later, with zero unexplained parity/coverage failures. Synthetic invalidation does not satisfy the real-event requirement. Only then approve routine geometry schedule retirement; verify manual/invalidation/explicit-year rollover/recovery/emergency switches/retention remain available. Weather refresh stays enabled and monitored. | R-09/R-13; Maintainer + PM |
| O05 | P1 / independent launch review | 15.6 AC6 | Keep weather delivery/freshness/recovery proof separate from geometry observation. Epic 14 field/direct-beam evidence must reference deployed compatible generation and be revalidated after corrections. Issue human-reviewed launch disposition only when both independent gates are satisfactory. | R-13; PM + Maintainer |

The plan creates no rollout automation, schedule or operational command. Future O03 authorization must include the rollback seam and compatibility check; authorization to publish is not a blanket authorization to change production inputs, weather or configuration.

## Acceptance-criteria traceability

AC numbers refer to the existing numbered lists in `epics.md`; scenario descriptions decompose them without replacing them. All **35 ACs** have planned evidence (6+6+6+5+6+6). This is 100% planned mapping, **not executed coverage**.

| Story | AC → scenario family |
| --- | --- |
| 15.1 | AC1 → M01; AC2 → M02/M03; AC3 → M01–M04; AC4 → M05; AC5 → M06; AC6 → M03/M04/M07 + G1 |
| 15.2 | AC1 → I02; AC2 → I01; AC3 → I01/I15; AC4 → I02/I03/I13; AC5 → I02/I08/I14/I15; AC6 → I03/I14 + G3 |
| 15.3 | AC1 → I04; AC2 → I05; AC3 → I05/I08; AC4 → I06/I08; AC5 → I07/I15; AC6 → I16 |
| 15.4 | AC1 → I02/I08; AC2 → I02/I08/I09; AC3 → I10/I12; AC4 → I11/I12; AC5 → I14 |
| 15.5 | AC1 → I04/I10; AC2 → I04/I07; AC3 → I01/I02/I03/I05–I09/I15; AC4 → I11/I12; AC5 → I10/I13; AC6 → I14/I16 |
| 15.6 | AC1 → O01; AC2 → O02; AC3 → O02/O03; AC4 → O04; AC5 → O04; AC6 → O05 |

| Cross-epic amendment | Planned verification and dependency |
| --- | --- |
| 13.1 | I10/I13 retain the named 42 unique public venues ×61 ordered steps cohort and bounded replacement dependency-path telemetry; no Met.no/hash/caster RPC. An inventory change needs an explicit evidence-cohort amendment, not reuse of “42” for another population. Provider true-cold n>=20 and isolated restore evidence remain 13.1 responsibilities; prior path telemetry cannot certify the replacement. |
| 14.3 | M04/I04/I15 provide low-angle/transition cases and generation/input-hash provenance for field validation; real geometry corrections invalidate seasonal evidence. |
| 14.5 | I01/I15 keep geometry generations, weather evidence and classifier versions independently attributable/replayable, within actual retained-data limits. Protect evidence references. |
| 14.6 | O05 uses Story 15.5 proof and the deployed candidate. Field preparation can proceed earlier; final launch evidence follows candidate availability, avoiding a circular prerequisite for 15.1. Maximum acceptable affirmative false-positive rate remains an Epic 14 owner decision, not invented here. |

## NFR evidence plan and budgets

| Requirement/category | Threshold or unresolved value | Planned evidence / scenarios |
| --- | --- | --- |
| NFR20 — coverage/compute | Every non-deleted venue, exact explicit March–October season; actual venue/date daylight independent of hours/picker; no read/unchanged-season shadow recompute | Solar/sample report M01; no-op/CPU M05; generator/read proof I04/I07/I10 |
| NFR35 — integrity/availability | 100% compatible current-input exact-date release; partial/corrupt rejected; supported-model negative distinct from missing geometry; continuous selectable midnight coverage | Exact-set/checksum/mutation/race ledger I02/I07–I09, publication evidence O02/O03 |
| NFR40 — lifecycle/reliability | Bounded/resumable/idempotent; current and previous season plus >=2 verified releases and evidence references; safe compatible rollback | Raw shard/recovery/retention/drill results I05/I14–I16; observation O04 |
| Performance/scalability | Existing approximately 5-second cold gate and warm <200 ms target; <=600 KB gzipped total JS, <=280 KB initial route, <=320 KB MapLibre; NFR18 <=10,000 MAU within $100/month and NFR19 5× baseline traffic remain constraints | CPU/size/decode M05/M06, candidate DB/query/load/build I13. Define exact latency measurement boundaries/cache cohorts and baseline concurrency in G1d; do not imply arbitrary 500-VU load or provider cold from local timing. |
| New E15 budgets | **Accepted under CD15.1-v1/A1:** full numerical table in canonical E15-AD-01/02; capacity remains held and candidate compliance remains unproved | Measurement decision record with units, workload, environment and approving owner; I13/O02 compare actual candidate results |
| Accuracy/model convention | Accepted >=5° / 5pp endpoint-proximity or classification-change trigger / one-minute probes / <=100ms detected brackets / <=2-minute matched transitions / <=10-second roots; accepted missed-gap risk, not universal or physical guarantees | M01–M04 decision evidence then I04; independent physical field evidence O05 |
| Weather NFR28/NFR34 | Two-hour TTL, signed ±90-minute matching, coherent likely only, zero live public provider calls | I11 truth/admission matrix and attempted-call counters; I12 semantic/cached behavior |
| Security and maintainability | Service-role boundary, no secrets/server inputs in DTOs/logs, compatible migrations, normal typecheck/lint/tests and documentation gates | I03/I10/I16 role and boundary evidence; required story checks; no unrelated new compliance/product features |
| Accessibility NFR22–27 | WCAG 2.1 AA, Swedish accessible uncertainty, keyboard/focus, 44×44 touch, contrast, no colour-only status, reduced motion | I12 component/E2E/axe and human low-angle semantic review; existing visual gate when a frontend story has mapped screens |

Performance reports must retain correctness failures as failures: exclude them from latency statistics **and fail the lane**, with n/exclusion reasons visible. Capture environment/deployment/region/cache cohort, request correlation, status, venue/step count and directly observed Supabase call count. Never relabel MISS as cold. At current scale retain the 13.1 provider-classified n>=20 true-cold lane; local restart experiments are separately named. Growth tests use declared populations and representative distribution/retention, not copies of one cheap venue. Cost projections identify assumptions and do not claim the monthly operational budget is proven by storage bytes alone.

## Execution strategy and resources

No commands below are executed by this planning artifact. Existing runtime/browser/database resources were not started. Future managed resources require that future actor's latest trusted guard context, structured JSON via Windows PowerShell 5.1, native exit/`ok` checks, and guard Stop when finished. Do not copy this session's identity into a future run or publish it in evidence. Stop preserves saved state; no Docker down/reset/prune/profile deletion as teardown. A `stop_requested` acknowledgment is not verified shutdown and is not a reason to poll as a completion gate.

| Lane | Execution after authorization/predecessors |
| --- | --- |
| Story 15.1 | Bounded offline solar/geometry and isolated measurement runs, then G1. Freeze fixture/policy results before implementation. Real-input/database lane unavailable → record that lane blocked and continue independent pure measurements. |
| PR | Run all relevant functional tests if the measured suite fits the ~15-minute planning target; fast integrity/truth cases first for feedback. Unit/API/components plus bounded DB tests and targeted mobile/desktop E2E. Parallelize only isolated fixtures/connections; deterministic transaction barriers instead of sleeps. Never move a required failing test out of a gate to obtain green. |
| Nightly | Longer full-season oracle matrix, multi-session recovery/fault tests and realistic size/performance runs. This is an intended future test lane, not a new schedule. Every required candidate run must finish before its release gate regardless of cadence. |
| Weekly / release candidate | Growth/retention churn and durable recovery/load rehearsals; human semantic/field review as available. Production cold/rollout observation requires separately authorized target and evidence. |

At future story start, run `npx tsc --noEmit` and `npx eslint . --quiet` **from `C:\DEV\sunnyseat\nextjs-app\`**. At review run those plus `npx vitest run`, story-required Playwright/DB/benchmark checks, and applicable visual validation. Use the repo-root Windows wrapper `./scripts/run-sh.ps1 scripts/story-review.sh <story-id>` for review transition, never edit sprint status to review. The review command is not part of this task. No suppressions, skip inflation, reference replacement or invented manual pass. Reference scope mismatch goes to explicit accept-with-rationale under AGENTS.md. New story briefs use the project story-file audit; this plan is not such a brief.

| Effort component | Planning range (test engineering and measurement, not feature implementation) |
| --- | --- |
| P0 families | ~45–80 hours |
| P1 families | ~40–75 hours |
| P2 operational-documentation family | ~4–8 hours |
| Total | ~89–163 hours, roughly 2.5–4.5 focused engineer-weeks |

The total includes fixture/oracle setup, isolated DB setup, measurement analysis, regression adaptation and evidence review. Story 15.1 accounts for approximately 24–48 hours **within**, not additional to, that total. Implementation latency, data access, owner decisions, physical observations and at least seven calendar days plus the real invalidation wait are additional elapsed time; there is no delivery-date commitment. Re-estimate after M05/M06 and G1. No performance benchmark is demoted to P3 merely because it is expensive: it directly gates NFR40 and release.

## Exit criteria, evidence ledger and validation disposition

For measurement completion, all M families have reproducible evidence, failures and limitations recorded; G1 is explicitly signed before schema. For implemented candidate completion, all required ACs are evidenced, **100% P0 and 100% required P1/P2 assertions pass**, all high-risk mitigations are complete and there are no unexplained parity/coverage/affirmative differences. This is stricter than the generic TEA 95% P1 example because these families encode mandatory Epic 15 criteria. No generic waiver reduces a direct-sun invariant or substitutes for an explicit specification amendment. Planned AC coverage target is 100%; no invented line-coverage quota substitutes for exact-date/set, race or interval assertions.

Each future evidence row records scenario/variant ID, AC and risk IDs, candidate/baseline revisions, fixture hash, season/venue/date/UTC instant, generation/input/engine/horizon/encoding/decoder identifiers, expected and actual output, raw artifact path/checksum, tool/environment/command, result, limitations and reviewer. Failures include reproduction and responsible owner. Approved parity corrections additionally include exact scope and owner decision reference. Separate PASS, FAIL, BLOCKED, NOT RUN and EXTRAPOLATED; never aggregate missing lanes into a pass.

Final release evidence should include measurement/G1 record, full exact-set coverage manifest, quarter-hour difference ledger, transition/window report, g2 vectors, DB migration/security/concurrency/recovery outputs, weather and provider-call matrix, candidate size/performance/build reports, compatible rollback drill, evidence-retention check, and O01–O05 authorization/observation/launch disposition. These are future artifact types, not files claimed to exist today. `bmad-testarch-trace` and NFR assessment can consume them later; neither is invoked here.

Planning checklist disposition: controlling sources and readiness F1–F6 mapped; all 35 ACs mapped; risk owners/deadlines and unknown thresholds explicit; measurement/implementation/rollout separated; inherited coverage limits and production history attributed; no production or application work performed. G1 choices are now accepted; downstream implementation still owes the carried candidate evidence and capacity admission. Test design approval, measurement decision lock and launch approval are **not granted** by workflow completion.

## Method and handoff

Used the installed `bmad-testarch-test-design` epic template/steps/checklist and its risk-governance, probability-impact, test-levels, test-priorities and NFR guidance; consulted SunnySeat `test-gate`. The template's execution-timing headings and generic thresholds were adapted to the workflow checklist and binding Epic 15 requirements. Sequential epic output is appropriate; no agents were dispatched. Python customization resolution was unavailable, so base/team/user customization files were checked using the documented fallback (base project-context fact, no team/user overrides found). No browser/Pact exploration or utility/framework installation is necessary for this bounded document/code assessment.

Measurement preparation/execution and owner lock are complete under CD15.1-v1/A1. Next implementation work requires a separately started Story 15.2 and normal preflight; all carried candidate gates remain mandatory. Do not scaffold later implementation tests, update sprint state, or start production from this handoff. Preserve the historical proposal, readiness report and existing user work.

### Current Epic 15 disposition — consolidated 2026-09-15

Rasmus explicitly accepted consolidation of the reviewed measurement choices into canonical architecture.md E15-AD-01/02. G1a–G1d is accepted under the September 10/12/14 decisions and CD15.1-v1/A1; Story 15.1 is done, while 15.2–15.6 remain backlog and are not started by this update. Earlier dated pending/default statements are historical and superseded by this disposition.

The binding contract is >=5° supported-model horizon, <=10s UTC roots, five-minute UTC base/endpoints, 5pp endpoint-proximity or classification-change trigger, one-minute probes, <=100ms detected brackets, <=2-minute matched-transition target, and >=300s reconstructed public windows. Preserve every detected shade gap and the accepted four-minute missed-gap risk; finite comparisons do not prove universal discovery or physical accuracy. Missing/exhausted computation and unresolved duration fail completion. Below 5° does not prove physical absence of direct sunlight; independent fresh coherent likely-weather remains necessary.

Require all 245 actual-year March–October dates for every non-deleted venue including hidden/new venues; remaining dates are staging only. Use full Float64 adaptive arrays/raw boundaries and shared immutable versioned inputs. Historical replay requires original retained geometry/input, weather and classifier evidence; recomputation with new inputs is not the historical prediction.

The complete accepted CD15.1-v1 numerical table controls, including one worker, <=5 venues×3 dates per shard and 375MB warning/400MB aggregate admission. Retain current and previous actual-year seasons, each with current plus compatible rollback generations, and all evidence-referenced generations; count shared physical generations once. **Capacity admission remains held**, and accepted targets are not deployed compliance.

A1 retains NOT RUN cold/combined-read, no-op DB p95 and matched writer-load proof at **15.5 I13 before 15.6 O02**; actual-year retained diversity/churn at **15.2 storage validation and 15.5 I13**; fresh aggregate/disk/WAL headroom at **O01/O02**. Full-cohort implemented throughput and new/removed-caster spatial resolution remain **15.3/15.5**. Public DTO parity, compatible rollback, Epic 13 cold/recovery and Epic 14 weather/field gates remain mandatory. No runtime or production operation is authorized.

Candidate seam assertions: I05 must enforce one active geometry worker across the pilot while unrelated/urgent work can queue; duplicate builders and publication races remain tested. I14/I15 must retain a complete compatible rollback release manifest and every referenced generation for each retained season, not merely per-venue fallback rows. I02/I10 must derive season_year from the requested Stockholm date, never the wall-clock year, and return typed coverage 503 when that compatible requested-season release is absent. These clarify existing accepted invariants without increasing concurrency, reducing retention or expanding the public planner.

Acceptance trace: [September 15 consolidation](../../planning-artifacts/decisions/epic-15-architecture-consolidation-2026-09-15.md).

### Owner policy amendment — accepted 2026-09-10

Rasmus accepted the [Epic 15 owner policy](../../planning-artifacts/decisions/epic-15-owner-policy-2026-09-10.md). This supersedes earlier pending product-choice wording for NFR20/NFR35/NFR40 and E15-AD-01/02; it does not certify measurements or deployed behavior.

- Below 5° means not sunny in SunnySeat. Retain the documented model-support/physical-light distinction; no special per-pin warning is required.
- A public geometric sun window reconstructed by the accepted empirical detector must satisfy >=5° elevation and >50% sunlit seating for **at least 300 seconds**. Suppress shorter reconstructed windows; qualifying windows apply from calculated start to end. Preserve every detected shade gap; undetected-gap risk is explicitly accepted by the September 12 amendment below. Do not use previous displayed state or claim continuity is proven by two endpoint observations. Retain raw geometry separately. Suitable current weather remains mandatory; blocked/unknown evidence removes the sunny recommendation without a five-minute hold.
- Require full March 1–October 31 coverage for every non-deleted venue including hidden venues, using the actual selected year. No past-date or effective-date exemption and no cross-year substitution; remaining dates are staging only.
- Arrays are provisionally preferred. Final precision/schema and numeric production computation/storage/read budgets await representative measurements.

The five-minute minimum duration and the separately accepted five-minute base cadence are independent choices; neither is a weather-refresh promise. Preserve the <=2-minute target for detected/matched transitions and <=10-second horizon-root target. Test reconstructed windows, detected gaps, known missed-gap risks, 299/300/301-second boundaries and uncertainty separately. Combined G1 remains open and 15.2 stays blocked.

### Detector risk amendment — accepted 2026-09-12

Rasmus explicitly accepted the tested candidate's documented risk after the four-minute untriggered shade counterexample was explained. Controlling decision: `_bmad-output/planning-artifacts/decisions/epic-15-detector-risk-acceptance-2026-09-12.md`. G1b detector selection/residual risk is accepted: five-minute UTC-aligned base samples plus supported-day endpoints; one-minute interior probes when either endpoint is within 5 percentage points of 50% or endpoint classifications differ; refine detected crossings to <=100ms brackets. This supersedes earlier Epic 15 quarter-hour/10-point candidate defaults and universal interior-discovery/no-gap guarantees, not public DTO parity requirements.

Continuity is reconstructed under this empirical method. It can miss untriggered sub-five-minute sun/shade events (including the documented four-minute shade example) and shorter events between interior samples. Preserve every detected shade gap; never deliberately merge it. Retain known misses as accepted-risk diagnostics without rewriting historical failures as successful detection. A finite reference comparison is not a gap-free or physical-accuracy certificate. Missing/exhausted computations, missing dates/inputs and unresolved duration uncertainty still fail completion. This approval does not change weather, raw >50% classification, actual-year full-season completeness, final encoding/retention/budget approval or story status.
M02/M03/M04 follow-through: retain raw failure ledgers and separately test filtering of 299/300/301-second intervals, sustained sun, repeated bursts, unmerged shade gaps, uncertain duration bounds, exact edges, all safety-limit outputs, and identical selected-instant eligibility across presentations. Weather blocked/unknown must override a qualifying geometric interval. New benchmark results and representative computation/read/storage measurements are NOT RUN for this amended policy; historical passes cannot satisfy them.


### Story 15.1 closure acceptance — September 14, 2026

Rasmus accepted CD15.1-v1 and amendment A1 in the [authoritative closure acceptance](../../planning-artifacts/decisions/epic-15-closure-acceptance-2026-09-14.md). This supersedes earlier pending G1d/combined-measurement-lock wording only. G1a–G1c remain accepted; full Float64 adaptive arrays/raw boundaries, shared versioned inputs, retention and the complete numerical pilot budget table in the hash-identified package are now accepted. These are design targets/safety limits, not measured deployed compliance. Story review/done and starting 15.2 remain separate.

Retain current and immediately previous actual-year seasons, each with current plus compatible rollback generation, and all evidence-referenced generations; count shared physical generations once. The conservative four-copy legacy-coexistence model exceeds the accepted 400MB aggregate admission ceiling. Capacity admission remains held pending fresh measured capacity and a separately authorized resolution. No deletion, migration, upgrade or production operation is approved.

A1 explicitly transfers the still-NOT-RUN M06 controlled cold/combined read p95, no-op DB p95 and matched writer-load proof to **15.5 I13 before 15.6 O02**. Actual-year retained-version diversity/churn belongs to **15.2 storage validation and 15.5 I13**, with fresh aggregate/disk/WAL headroom at **O01/O02**. The accepted bounded M05 measurements and weighted full-cohort extrapolations close measurement selection; full-cohort implemented throughput and new/removed-caster spatial resolution remain **15.3/15.5** proof. These are mandatory carried gates, not passes or waivers. Publication still requires exact full actual-year coverage, compatibility, parity, budget proof and rollback. Epic13 provider-cold and Epic14 weather/field gates remain independent.

The accepted detector's known missed-gap risk, preservation of every detected shade gap, >=300-second reconstructed-window rule, failure on unresolved duration/missing/exhausted computation, and independent fresh coherent likely-weather gate remain unchanged. No runtime behavior is changed by this amendment.
