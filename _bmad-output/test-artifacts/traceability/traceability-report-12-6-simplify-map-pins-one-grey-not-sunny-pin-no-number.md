---
stepsCompleted:
  - step-01-load-context
  - step-02-discover-tests
  - step-03-map-criteria
  - step-04-analyze-gaps
  - step-05-gate-decision
lastStep: step-05-gate-decision
lastSaved: '2026-07-19'
refreshedAt: '2026-07-19T14:46:26+02:00'
advisoryVerdict: PASS
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
**Story status at refresh time:** `review`; Task 7 is complete.

## What Was Run

This trace refresh read the story, ATDD checklist, Epic 12 test design, architecture/UX/PRD context, implementation tests, approved candidate evidence, authoritative reference hashes, rebaseline audit entry, and canonical review-gate artifact. Implementation tests were not rerun by this trace refresh.

Recorded implementation evidence includes green typecheck/lint, 110 passed Playwright tests with 53 skipped, the focused Tier-A sanitizer/route and adjacent public-sun suites, and the canonical review gate's 1,760 passed Vitest tests with 15 skipped. The visual closure evidence includes ten human-approved candidate captures, 10/10 promoted reference SHA-256 matches, the same-operation `REBASELINE-LOG.md` entry, and 12 story-extracted mapped visual validations exiting 0 in explicitly authorized manual mode.

## Advisory Verdict: PASS

All 13 traced items are fully covered. AC5 is now `FULL`: Rasmus explicitly approved the ten-reference mobile/desktop rebaseline, the authoritative PNG hashes match the reviewed candidates, the audit entry is present, and the canonical story-review gate passed all mapped manual visual validations. The unavailable legacy Anthropic provider is an operational note, not a residual coverage gap, because manual validation and rebaseline were explicitly authorized and recorded.

## Coverage Summary

| Metric | Value |
|---|---:|
| Total traced items | 13 |
| Fully covered | 13 (100%) |
| Partially covered | 0 (0%) |
| Uncovered / `NONE` | 0 |
| Covered or partial | 13 (100%) |
| P0 full coverage | 9/9 (100%) |
| P1 full coverage | 4/4 (100%) |

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
| AC5 | P1 | FULL | Approved reference rebaseline, log update, and mobile/desktop visual comparison | Candidate evidence `evidence.md:1`; human-approved rebaseline `REBASELINE-LOG.md:46`; canonical manual gate log `:171`; 10/10 promoted hashes verified and 12 mapped validations exited 0 |
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

- **Partial:** none.
- **Uncovered:** none.
- The older Story 12.3 protected-production cold-p95 evidence remains an upstream Story 12.3 residual. It does not reduce Story 12.6's local persisted/zero-fetch contract coverage.

## Manual / UAT Recommendations

1. Preserve the approved candidate evidence, promoted SHA-256 set, rebaseline audit entry, and canonical review log together for release traceability.
2. Retain the Story 12.3 request-count journey and Story 12.6 strict-boundary, honesty, motion, and accessibility suites in standing CI.
3. Re-run capture and visual review only when a re-evaluation trigger recorded in `REBASELINE-LOG.md` changes these map-visible surfaces.

## Advisory Decision

**PASS**. No separate enforced trace gate was opened (`allow_gate=false`), but the advisory result meets full coverage: 13/13 items `FULL`, P0 9/9, P1 4/4, and no partial or uncovered requirements. Story status is `review`, and AC5/Task 7 are closed.
