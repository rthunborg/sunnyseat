---
stepsCompleted:
  - step-01-load-context
  - step-02-discover-tests
  - step-03-map-criteria
  - step-04-analyze-gaps
  - step-05-gate-decision
lastStep: step-05-gate-decision
lastSaved: '2026-07-19'
scope: story-only
story: 12-6-simplify-map-pins-one-grey-not-sunny-pin-no-number
advisory: true
coverageBasis: acceptance_criteria
oracleResolutionMode: formal_requirements
oracleConfidence: high
externalPointerStatus: not_used
---

# Traceability Report - Story 12.6: Simplify Map Pins

**Scope:** Story 12.6 acceptance criteria plus the public-sun parity, honesty, accessibility, motion, and Story 12.3 prerequisite contracts.
**Mode:** Advisory. This report does not update sprint status, Auto-BMAD state, visual references, or an enforced quality gate.
**Story status at trace time:** `in-progress`; Task 7 remains open.

## What Was Run

This trace pass read the story, ATDD checklist, Epic 12 test design, architecture/UX/PRD context, implementation tests, and recorded verification evidence. Test discovery used Vitest and Playwright list mode only; implementation tests were not rerun by this advisory pass.

Recorded implementation evidence used by the trace includes green typecheck/lint, 1,758 passed Vitest tests with 15 skipped, 110 passed Playwright tests with 53 skipped, and the focused Tier-A sanitizer/route and adjacent public-sun suites. Two Playwright cases passed on retry due the recorded Next startup/hydration race.

## Advisory Verdict: CONCERNS

Functional, API, accessibility, and prerequisite coverage is strong: all 9 P0 items are fully covered and no item is uncovered. The verdict is `CONCERNS` because AC5 is still partial. The ten affected map-visible references have not received maintainer-approved rebaseline treatment, `REBASELINE-LOG.md` has not been updated for the change, and no passing mobile/desktop visual comparison exists. The recorded blockers are missing `ANTHROPIC_API_KEY` and unresolved maintainer approval.

## Coverage Summary

| Metric | Value |
|---|---:|
| Total traced items | 13 |
| Fully covered | 12 (92%) |
| Partially covered | 1 (8%) |
| Uncovered / `NONE` | 0 |
| Covered or partial | 13 (100%) |
| P0 full coverage | 9/9 (100%) |
| P1 full coverage | 3/4 (75%) |

## Test Inventory

| Level | Primary files | Direct active/runtime cases |
|---|---:|---:|
| Unit / service / static | 4 | 15 |
| API / route | 3 | 11 |
| Component | 2 | 13 |
| E2E | 2 | 5 |
| **Total** | **11** | **44** |

Twelve supporting Vitest files were inspected; their complete files contain 119 active cases, but those are supporting regressions and are not misreported as direct Story 12.6 cases. Story 12.3 additionally contributes four mobile/desktop request-count runtime cases.

## Traceability Matrix

| ID | Priority | Coverage | Contract | Principal evidence |
|---|---:|---|---|---|
| AC1 | P0 | FULL | Strict `>50` boundary; exact 50, low Partial, gated, and card copy agree | `public-sun.atdd.test.ts:41`; `VenuePin.public-sun.atdd.test.tsx:66`; `story-12-6-honesty.automation.test.tsx:110`; pin E2E `:97` |
| AC2 | P0 | FULL | Server/client comparator, visible order, top-50/window/peak parity | ordering ATDD `:8`; public-sun comparator `:75`; peak truncation `:170`; list-rank regression |
| AC3 | P0 | FULL | One grey pin while CloudObscured diagnostic survives and gated high exposure remains grey | cloud-gate API `:48/:57/:88`; pin component `:66`; pin E2E `:97` |
| AC4 | P0 | FULL | Grey cloud/no number, amber sun/percent, non-colour signal, exact accessible outcome | pin component `:66/:85`; i18n/a11y `:10`; pin E2E `:97`; axe `:52` |
| AC5 | P1 | PARTIAL | Approved reference rebaseline, log update, and mobile/desktop visual comparison | Functional visual semantics are automated; required visual artifacts and comparison pass are absent |
| K1 | P0 | FULL | Explicit tri-state gate and honest unknown/malformed/contradictory handling | gate-state `:5`; contract defects `:44/:68`; cloud-gate `:57`; honesty component `:138/:205` |
| K2 | P0 | FULL | Total comparator, top-50, window, peak, tie, cutoff, and unknown qualification parity | public-sun `:75/:91/:109`; reverse peak `:29`; truncation `:170/:209/:249/:286` |
| K3 | P0 | FULL | Card and QuickInfo not-sunny/unknown honesty with no grey percentage | honesty component `:110/:138/:161/:205` |
| K4 | P1 | FULL | Selection shape, in-place refresh, no flash, reduced/unresolved motion, 44px target | pin component `:98/:121/:140`; pin E2E `:117/:125` |
| K5 | P1 | FULL | Non-vacuous pin-bearing a11y-mobile coverage and CI invocation | i18n/a11y CI `:40`; axe-mobile `:52`; standing CI regression |
| K6 | P0 | FULL | Story 12.3 persisted geometry/read-time weather, no live provider or legacy 61-step request path | persisted-route `:47`; persisted-outcome `:77`; weather snapshot regressions |
| K7 | P0 | FULL | Same-date scrub = 0 list requests; date change = exactly 1 and no provider burst | Story 12.3 request-count E2E `:111/:133`, mobile and desktop |
| K8 | P1 | FULL | Static gates and full regressions green without live providers | Story Dev Agent Record final verification evidence |

### Exact Accessible Outcomes

The localized contract is explicitly traced: Swedish sunny `"{name} - soligt vid vald tid - {percent} procent sol"`, Swedish grey `"{name} - inte soligt vid vald tid"`, and the Swedish unknown-weather sunny form adds `"Väder saknas vid vald tid."`; English uses the equivalent sunny, not-sunny, and `"Weather unavailable at selected time."` forms. Grey names are percentage-free. Component/static tests and the mobile axe journey cover these outcomes.

## Coverage Heuristics

| Heuristic gap | Count |
|---|---:|
| Endpoints without tests | 0 |
| Missing auth negative paths | 0 (not applicable; no auth change) |
| Happy-path-only criteria | 0 |
| UI journeys without E2E | 0 |
| Functional UI states missing coverage | 0 |

## Partial And Uncovered

- **Partial:** AC5 only. Visual/rebaseline evidence is mandatory and cannot be inferred from functional tests.
- **Uncovered:** none.
- The older Story 12.3 protected-production cold-p95 evidence remains an upstream Story 12.3 residual. It does not reduce Story 12.6's local persisted/zero-fetch contract coverage.

## Manual / UAT Recommendations

1. Obtain maintainer approval for the ten affected reference targets; rebaseline mobile and desktop references and update `REBASELINE-LOG.md` in the same operation; run the canonical visual wrapper after the approved provider credential is available.
2. Inspect 40/50/51/gated/unknown pins on mobile and desktop, including selected and refreshed states, card/QuickInfo verdicts, and the 44px target.
3. Spot-check the exact Swedish accessible names with a screen reader and verify same-date scrub=0/date-change=1 in the browser network log.

## Advisory Decision

**CONCERNS**. No enforced gate was opened (`allow_gate=false`). All P0 requirements are fully covered, but the story remains `in-progress` until the AC5 visual/rebaseline lane is completed; Task 7 must not be marked complete from this trace.
