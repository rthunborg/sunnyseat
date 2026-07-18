---
stepsCompleted:
  - step-01-load-context
  - step-02-discover-tests
  - step-03-map-criteria
  - step-04-analyze-gaps
  - step-05-gate-decision
lastStep: step-05-gate-decision
lastSaved: '2026-07-19'
workflowType: testarch-trace
scope: story-only
story: 12-6-simplify-map-pins-one-grey-not-sunny-pin-no-number
advisory: true
coverageBasis: acceptance_criteria
oracleResolutionMode: formal_requirements
oracleConfidence: high
oracleSources:
  - _bmad-output/implementation-artifacts/12-6-simplify-map-pins-one-grey-not-sunny-pin-no-number.md
  - _bmad-output/test-artifacts/atdd-checklist-12-6-simplify-map-pins-one-grey-not-sunny-pin-no-number.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-12.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/prd.md
  - project-context.md
externalPointerStatus: not_used
traceReportPath: _bmad-output/test-artifacts/traceability/traceability-report-12-6-simplify-map-pins-one-grey-not-sunny-pin-no-number.md
tempCoverageMatrixPath: 'C:/tmp/tea-trace-coverage-matrix-2026-07-18T23-32-25-884Z.json'
---

# Traceability Matrix - Story 12.6

This is the BMAD trace workflow progress file for the Story 12.6 advisory pass.

## Coverage Oracle

The formal Story 12.6 acceptance criteria are the primary oracle. They are augmented by the completed ATDD checklist, Epic 12 test design risks R-006/R-019/R-011/R-023, architecture decision E12-AD-08, the UX accessibility/motion contracts, and the Story 12.3 persisted-series prerequisite. Confidence is high because these sources agree on the strict public-sun predicate, server/client parity, two-state presentation, accessible naming, zero-fetch day-series use, and mandatory visual rebaseline.

No external requirements pointer is needed. The visual/rebaseline requirement remains part of the formal oracle and must not be inferred from functional automation.

## Test Inventory

### Primary Story 12.6 Evidence

| Level | Files | Active cases |
|---|---:|---:|
| Unit / service / static contract | 4 | 15 |
| API / route contract | 3 | 11 |
| Component | 2 | 13 |
| E2E | 2 | 5 runtime cases |
| **Total** | **11** | **44** |

Primary Vitest files: `public-sun.atdd.test.ts`, `story-12-6-weather-gate-state.atdd.test.ts`, `story-12-6-public-sun-ordering.atdd.test.ts`, `VenuePin.public-sun.atdd.test.tsx`, `story-12-6-i18n-a11y-ci.atdd.test.ts`, `story-12-6-contract-defects.automation.test.ts`, `story-12-6-honesty.automation.test.tsx`, `venues-route-peak-truncation.test.ts`, and `venues-route.cloud-gate.atdd.test.ts`.

Primary browser files: `story-12-6-public-sun-pins.atdd.spec.ts` contributes four runtime cases across mobile and desktop; `story-12-6/axe-mobile.spec.ts` contributes one executed `a11y-mobile` case. No primary suite contains `skip`, `fixme`, `todo`, or `only` markers.

### Supporting Regression Evidence

Twelve supporting Vitest files expose 119 active cases in their complete files. The directly relevant cases cover `VenuePin`, marker reconciliation/ARIA/reduced motion, list ranking, cards, QuickInfo, Story 12.3 persisted route/outcome/weather snapshots, day-series derivation/query keys, and standing CI wiring. Four additional runtime Playwright cases in `story-12-3-persisted-geometry-request-count.atdd.spec.ts` cover same-date scrub=0 and date-change=1 on mobile and desktop.

## Coverage Heuristics

- **Endpoint coverage:** `/api/venues` public DTO normalization, instant ordering, day-peak top-50 truncation, malformed/contradictory gate values, and persisted route behavior have direct API tests. Detail window/peak serialization is covered by persisted-outcome/detail regression tests.
- **Auth/authz:** no authentication flow is introduced by Story 12.6. Story 12.7 retains the public visibility boundary; no client component imports a server data module.
- **Error/edge coverage:** exact 50, 40 Partial, 51, gated high exposure, unknown high exposure, malformed/missing gate data, malformed weather, expired/missing snapshots, reverse-order peak ties, grey cutoff ties, and contradictory `CloudObscured + not_gated` are covered.
- **UI journey coverage:** deterministic mobile and desktop map journeys cover 40/50/51/gated/unknown pins and selection stability. The executed mobile axe journey is non-vacuous. Functional E2E does not substitute for the missing screenshot/rebaseline lane.
- **UI state coverage:** two pin states, percentage/no-percentage content, exact localized accessible outcomes, unknown-weather qualification, selected shape, in-place refresh, reduced/unresolved motion, card verdicts, and QuickInfo verdicts are automated. Visual token fidelity and approved before/after composition remain manual/visual evidence gaps.

## Requirement-to-Test Matrix

The five acceptance criteria are traced separately from eight key design, honesty, parity, accessibility, and prerequisite contracts. `FULL` means the requirement has direct evidence at the level implied by its oracle; `PARTIAL` means some required evidence is absent even when adjacent functional behavior is automated.

| ID | Oracle item | Priority | Coverage | Test levels | Stable evidence IDs | Heuristic result |
|---|---|---:|---|---|---|---|
| AC1 | Amber iff exposure is strictly `> 50` and not gated; exact 50/low Partial/gated states and card wording use the same boundary | P0 | FULL | Unit, component, E2E | T-U01, T-C01, T-C03, T-E01 | Boundary and alternate-state coverage present; mobile and desktop journey present |
| AC2 | Server and client ordering share the same total comparator and never promote a grey venue into the sunny band | P0 | FULL | Unit/static, API, component | T-U02, T-U04, T-A01, T-A02, S-C01 | Endpoint and visible-list coverage present; stable tie-breaks and top-50 behavior covered |
| AC3 | Shaded, NoSun, and CloudObscured share one grey pin while CloudObscured remains diagnostic and gated high exposure never appears amber | P0 | FULL | Unit, API, component, E2E | T-U01, T-U03, T-A03, T-C01, T-E01 | Diagnostic preservation, contradiction fail-closed, and public presentation covered |
| AC4 | Grey uses a cloud icon and no number; amber uses sun icon plus exposure; exact localized accessible names are percent-free for grey | P0 | FULL | Component, static/i18n, E2E | T-C01, T-C02, T-U05, T-E01, T-E03 | Color-independent icon signal, exact names, 44px target, and non-vacuous mobile axe coverage present |
| AC5 | Rebaseline mobile/desktop sunny/not-sunny references, update `REBASELINE-LOG.md`, and pass screenshot comparison | P1 | PARTIAL | Component/E2E semantics only | T-C01, T-E01 | Functional visual semantics are covered; approved reference images, log entry, and screenshot-comparison pass are absent |
| K1 | Gate state is explicit tri-state; unknown retains geometric potential; malformed/missing/contradictory producer data fails closed without false certainty | P0 | FULL | Unit, API, component | T-U01, T-U03, T-U06, T-A03, T-C04 | Positive, alternate, and malformed/error paths present; no auth path is applicable |
| K2 | Instant comparator, peak extraction, window extraction, top-50 truncation, ties, endpoints, and unknown qualification stay in parity | P0 | FULL | Unit, API | T-U02, T-A01, T-A02 | Endpoint coverage present; reverse-order ties, exact-50 cutoff, all-grey cutoff, and peak-vs-instant order covered |
| K3 | Card and QuickInfo distinguish not-sunny from unknown-weather sunny potential without showing a percentage for grey states | P0 | FULL | Component | T-C03, T-C04, S-C02 | Low, exact-50, gated, and unknown-weather states covered with localized assertions |
| K4 | Selection keeps semantic shape; grey-to-amber refresh is in place with no entrance flash; reduced/unresolved motion is instant; touch target is 44px | P1 | FULL | Component, E2E | T-C01, T-E01, T-E02 | Selected and refresh states covered at component and browser levels; motion alternates covered |
| K5 | Accessibility mobile CI is executable and non-vacuous, with a pin-bearing scenario and the expected CI invocation | P1 | FULL | Static/CI, E2E | T-U05, T-E03, S-U03 | Runtime assertion prevents a vacuous axe pass; CI wiring is statically asserted |
| K6 | Story 12.3 persisted geometry remains the source; read-time weather re-gates without live geometry/provider work or the legacy 61-step path | P0 | FULL | Unit/API, E2E regression | S-A01, S-A02, S-E01 | Local route/source and persisted-outcome evidence is complete; upstream protected-production cold-p95 evidence remains an external Story 12.3 residual |
| K7 | Same-date scrub emits zero `/api/venues` requests; a date change emits exactly one list request and no provider burst | P0 | FULL | E2E | S-E01 | Executed on mobile and desktop; explicit request counting covers both sides of the invariant |
| K8 | Required static gates and full regression suites remain green without live weather providers | P1 | FULL | Typecheck, lint, Vitest, Playwright | G-01 | Recorded final evidence: typecheck/lint green, 1,758 Vitest passed with 15 skipped, and 110 Playwright passed with 53 skipped; two cases passed on retry |

### Stable Evidence Catalog

| Evidence ID | Test identity (`title`; `file:line`) | Level | Status flags |
|---|---|---|---|
| T-U01 | `[P0]` public-sun predicate vectors plus confidence/status invariant; `nextjs-app/test/unit/utils/public-sun.atdd.test.ts:41` | Unit | active, direct, parameterized (6 cases) |
| T-U02 | total comparator, longest qualifying window, and qualifying peak tests; `nextjs-app/test/unit/utils/public-sun.atdd.test.ts:75` | Unit | active, direct (3 cases) |
| T-U03 | `[P0] emits not_gated, gated, and unknown without mutating geometric exposure`; `nextjs-app/test/unit/services/story-12-6-weather-gate-state.atdd.test.ts:5` | Unit/service | active, direct |
| T-U04 | shared comparator import, client/server safety, and explicit tri-state DTO tests; `nextjs-app/test/unit/api/story-12-6-public-sun-ordering.atdd.test.ts:8` | Unit/static | active, direct (3 cases) |
| T-U05 | exact Swedish/English outcome keys and active a11y-mobile CI contract; `nextjs-app/test/unit/story-12-6-i18n-a11y-ci.atdd.test.ts:10` | Unit/static | active, direct (2 cases) |
| T-U06 | reverse-order peak tie plus malformed weather/DTO fail-closed tests; `nextjs-app/test/unit/story-12-6-contract-defects.automation.test.ts:29` | Unit | active, direct (3 cases) |
| T-A01 | peak-based top-50 truncation and final instant-order response tests; `nextjs-app/test/unit/api/venues-route-peak-truncation.test.ts:170` | API/route | active, direct (4 cases) |
| T-A02 | CloudObscured preservation, contradictory-producer rejection, and grey ordering tests; `nextjs-app/test/unit/api/venues-route.cloud-gate.atdd.test.ts:48` | API/route | active, direct (4 cases) |
| T-A03 | Public tri-state DTO contract in route/list consumers; `nextjs-app/test/unit/api/story-12-6-public-sun-ordering.atdd.test.ts:29` and `nextjs-app/test/unit/api/venues-route.cloud-gate.atdd.test.ts:57` | API/route | active, direct |
| T-C01 | canonical grey/amber vectors, selected shape, no-flash refresh, and reduced/unresolved motion; `nextjs-app/test/components/VenuePin.public-sun.atdd.test.tsx:66` | Component | active, direct, parameterized (9 cases) |
| T-C02 | localized pin names exercised through the two pin presentations; `nextjs-app/test/components/VenuePin.public-sun.atdd.test.tsx:66` and `nextjs-app/test/unit/story-12-6-i18n-a11y-ci.atdd.test.ts:10` | Component/static | active, direct |
| T-C03 | percentage-free low/exact-50/gated cards and unknown-weather card qualifier; `nextjs-app/test/components/story-12-6-honesty.automation.test.tsx:110` | Component | active, direct (2 cases) |
| T-C04 | percentage-free low/exact-50 QuickInfo and unknown-weather qualifier; `nextjs-app/test/components/story-12-6-honesty.automation.test.tsx:161` | Component | active, direct (2 cases) |
| T-E01 | `[P0] renders the 40/50/51/gated/unknown matrix honestly on mobile and desktop`; `nextjs-app/test/e2e/story-12-6-public-sun-pins.atdd.spec.ts:97` | E2E | active, direct, 2 runtime cases |
| T-E02 | `[P0] selection preserves the same amber semantic shape and marker root`; `nextjs-app/test/e2e/story-12-6-public-sun-pins.atdd.spec.ts:125` | E2E | active, direct, 2 runtime cases |
| T-E03 | `[P1] pin-bearing a11y-mobile coverage is executable and non-vacuous`; `nextjs-app/test/e2e/story-12-6/axe-mobile.spec.ts:52` | E2E/accessibility | active, direct, 1 runtime case |
| S-C01 | visible-list rank and stable tie regressions; `nextjs-app/test/components/VenueList.rank.test.tsx:29` | Component | active, supporting |
| S-C02 | existing card/QuickInfo diagnostic and reduced-motion regressions; `nextjs-app/test/components/VenueCard.test.tsx:132` and `nextjs-app/test/components/VenueQuickInfo.test.tsx:517` | Component | active, supporting |
| S-U03 | standing CI command and suite wiring assertions; `nextjs-app/test/unit/epic-11-standing-ci.test.ts:57` | Unit/static | active, supporting |
| S-A01 | persisted-route source invariants, canonical caster, exact-hash failure, and read-time weather re-gating; `nextjs-app/test/unit/api/venues-route.persisted-series.test.ts:47` | API/route | active, supporting |
| S-A02 | persisted outcome hash/weather/nearest evidence and geometry-only degradation; `nextjs-app/test/unit/services/persisted-sun-outcome.test.ts:77` | Unit/service | active, supporting |
| S-E01 | same-date zero-request and date-change exactly-one request contracts; `nextjs-app/test/e2e/story-12-3-persisted-geometry-request-count.atdd.spec.ts:111` | E2E | active, supporting, 4 runtime cases |
| G-01 | Story 12.6 final verification record in the story file | Static/full-suite gate | recorded pass; not rerun by this advisory trace |

## Coverage Logic Validation

- All nine P0 items are `FULL`. The strict 50 boundary, gate alternates, malformed inputs, comparator ties, endpoint behavior, card/QuickInfo honesty, and Story 12.3 request counts are not happy-path-only.
- Three of four P1 items are `FULL`; AC5 is `PARTIAL` because visual validation evidence is mandatory and cannot be substituted by component or browser semantic assertions.
- API-impacting items have endpoint-level route tests. Authentication is not introduced or changed, so denied-path auth coverage is not applicable to this story.
- Repeated unit/component/E2E evidence is intentional: predicate algebra is proved at unit level, presentation is proved at component level, and the critical mobile/desktop map journey is proved at E2E level.
- No synthetic UI journey is marked `FULL` on static evidence alone. The map matrix, selection behavior, and non-vacuous accessibility path each have executed browser cases in the recorded verification evidence.

## Phase 1 Gap Analysis

**Execution mode:** configuration requested `auto`; runtime agent-team capability was available, so heuristic extraction was delegated read-only and merged deterministically with the local matrix.

### Statistics

| Metric | Result |
|---|---:|
| Total traced items | 13 |
| Fully covered | 12 (92%) |
| Partially covered | 1 (8%) |
| Uncovered | 0 |
| Covered or partial | 13 (100%) |
| P0 full coverage | 9/9 (100%) |
| P1 full coverage | 3/4 (75%) |
| P2 full coverage | 0/0 (100% by convention) |
| P3 full coverage | 0/0 (100% by convention) |

### Gap Classification

- **Critical P0 gaps:** none.
- **Uncovered P1/P2/P3 gaps:** none.
- **Partial:** AC5 only. The functional two-state presentation is automated, but the ten affected map-visible reference captures have not been maintainer-approved/rebaselined, `REBASELINE-LOG.md` has not been updated for this change, and no passing mobile/desktop screenshot comparison exists. The story records missing `ANTHROPIC_API_KEY` plus the maintainer-approval requirement as the unresolved conditions.
- **Unit-only items:** none. Every UI-critical contract has component or browser coverage; route-impacting contracts have endpoint tests.

### Heuristic Gap Counts

| Heuristic | Count |
|---|---:|
| Endpoints without tests | 0 |
| Missing auth negative paths | 0 (not applicable) |
| Happy-path-only criteria | 0 |
| UI journeys without E2E | 0 |
| Functional UI states missing coverage | 0 |

### Recommendations

1. **MEDIUM / required before story review:** obtain maintainer approval for the ten affected map reference targets, configure the approved visual provider credential, rebaseline mobile and desktop references with the same-operation `REBASELINE-LOG.md` update, and run the canonical visual-validation wrapper until the comparisons pass.
2. **MEDIUM / UAT:** manually inspect the 40/50/51/gated/unknown matrix on mobile and desktop, including selected pins, card/QuickInfo verdicts, the 44px target, and a screen-reader spot check of the exact percent-free grey and qualified unknown-weather names.
3. **LOW / regression observation:** retain the Story 12.3 network-count journey and watch the recorded Next startup/hydration retries; the two retried Playwright cases passed and do not currently represent a coverage gap.

The complete Phase 1 JSON is saved at `C:/tmp/tea-trace-coverage-matrix-2026-07-18T23-32-25-884Z.json` for the advisory gate decision.

## Advisory Decision

**CONCERNS** (advisory; no enforced gate was opened). Thirteen items were traced: 12 `FULL`, 1 `PARTIAL`, and 0 `NONE`. All 9 P0 items are `FULL`. AC5 is the sole partial item because the maintainer-approved visual rebaseline, same-operation `REBASELINE-LOG.md` update, and passing mobile/desktop screenshot comparisons remain unresolved. The story stays `in-progress` and Task 7 remains open.
