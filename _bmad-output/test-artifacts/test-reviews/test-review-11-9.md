---
stepsCompleted:
  - step-01-load-context
  - step-02-discover-tests
  - step-03-quality-evaluation
  - step-03f-aggregate-scores
  - step-04-generate-report
lastStep: step-04-generate-report
lastSaved: '2026-07-06'
workflowType: 'testarch-test-review'
review_scope: suite
scope_note: 'Story 11.9 tests — 6 focus files (4 un-skipped ATDD + 2 coverage) + 12 sibling files 11.9 migrated. Follows epic-end test-review-epic-11.md (11.1–11.8, 92/A).'
advisory: true
inputDocuments:
  - _bmad/tea/config.yaml
  - resources/knowledge/test-quality.md
  - nextjs-app/lib/utils/opening-hours.ts (SUT — assertion honesty cross-check)
detected_stack: fullstack
overall_score: 96
overall_grade: A
execution_mode: sequential
---

# Test Quality Review — Story 11.9 Tests (Advisory)

**Quality Score**: 96/100 (A — Excellent)
**Review Date**: 2026-07-06
**Review Scope**: suite (Story 11.9 additions + sibling migrations)
**Reviewer**: TEA Agent (Master Test Architect)

> Follows the epic-end suite review `test-review-epic-11.md` (stories 11.1–11.8, scored 92/A). This review targets only the tests Story 11.9 added or migrated.
> Coverage mapping/gates are out of scope here — route those to `trace`.

---

## Executive Summary

**Overall Assessment**: Excellent

**Recommendation**: Approve

### Key Strengths

✅ Pure, injected-`now` formatter contract — zero wall-clock reads in the core unit tests (`opening-hours.atdd`/`.coverage`), directly honouring the epic-wide wall-clock-flake lesson.
✅ Full-week fixtures (`OPEN_TODAY`/`CLOSED_TODAY`, and the sibling migrations) make derive-at-render tests run-day-independent even though the SUT reads the real weekday.
✅ Exemplary auditability: every test carries a `[11.9 ACx]` tag, rich intent docblocks, `it.each` weekday tables, and inline UTC-offset annotations on each fixed instant.

### Key Weaknesses

❌ A couple of vestigial red-phase / `.skip` comments outlived the green transition (cosmetic).
❌ One derived-badge component file leans on the SUT's real `new Date()` (safe only via weekday-uniform fixtures — documented, but implicit).
❌ The store `detailFromRow` fixture asserts only weekday keys `'1'` and `'7'` present — a narrow (though sufficient) structural check.

### Summary

Story 11.9's test set is high quality and passes green (49/49 across the 6 focus files). The centrepiece — the pure `formatOpeningHours` / `stockholmIsoWeekday` contract — is a model of deterministic unit testing: `now` is injected, DST is explicitly exercised (a winter CET instant), the never-fabricate rule is pinned on closed/absent/malformed/out-of-range inputs, and the global `Intl` stub used to simulate ICU token drift is restored in a `finally`. The 12 sibling migrations are uniform and self-documenting, swapping the dead `{display, closesAt}` string for per-weekday jsonb and asserting the dropped `peak_time`/`shadow_warning_minutes` are gone. All findings are LOW (cosmetic or defensive-nuance); none block. Score 96/A, consistent with the 92/A epic-end suite.

---

## Quality Criteria Assessment

| Criterion                            | Status  | Violations | Notes |
| ------------------------------------ | ------- | ---------- | ----- |
| BDD Format (Given-When-Then)         | ✅ PASS | 0 | Descriptive `it(...)` names encode expected behaviour + rule (e.g. "closed today → NO badge"). |
| Test IDs                             | ✅ PASS | 0 | `[11.9 ACx]` tags on every describe/test. |
| Priority Markers (P0/P1/P2/P3)       | ⚠️ WARN | — | No explicit P-markers, consistent with the rest of this Vitest suite; not a project convention here. |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS | 0 | None — pure unit/component. |
| Determinism (no conditionals)        | ✅ PASS | 1 (LOW) | One benign `if (windows.length > 0)` guard in the peakTime regression assertion; component derive relies on SUT clock (weekday-uniform fixtures). |
| Isolation (cleanup, no shared state) | ✅ PASS | 1 (LOW) | Global `Intl` stub restored via `finally`; `useRealTimers`/`unstubAllEnvs` in afterEach. |
| Fixture Patterns                     | ✅ PASS | 0 | Small static fixtures; typed `buildDetail()` shim; full-week uniform data for clock-independence. |
| Data Factories                       | ✅ PASS | 0 | Inline literal fixtures appropriate at this level; no faker needed (deterministic-by-design). |
| Network-First Pattern                | N/A     | — | No browser/network tests in scope. |
| Explicit Assertions                  | ✅ PASS | 0 | All `expect()` in test bodies; no hidden-assertion helpers. |
| Test Length (≤300 lines)             | ✅ PASS | 0 | Largest is 186 lines. |
| Test Duration (≤1.5 min)             | ✅ PASS | 0 | 49 tests, ~392ms test time. |
| Flakiness Patterns                   | ✅ PASS | 0 | No wall-clock reads in unit layer; API-route path faked. |

**Total Violations**: 0 Critical, 0 High, 0 Medium, 5 Low

---

## Quality Score Breakdown

```
Dimension            Score  Weight  Contribution
Determinism           96     0.30      28.8
Isolation             98     0.30      29.4
Maintainability       90     0.25      22.5
Performance          100     0.15      15.0
                                      ------
Weighted Overall                       95.7  →  96 / 100  (Grade A)

Violations: HIGH 0 · MEDIUM 0 · LOW 5
```

---

## Critical Issues (Must Fix)

No critical issues detected. ✅

---

## Recommendations (Should Fix)

### 1. Sweep vestigial red-phase / `.skip` comments (LOW · maintainability)

**Location**: `venue-store.opening-hours-shape.atdd.test.ts:~60`, `VenueDetailContent.opening-hours-derived.atdd.test.tsx:62–66`
The STATUS blocks correctly say GREEN/un-skipped and the bodies import statically, but residual prose still narrates the red phase ("probe via a dynamic require and tolerate absence in the red phase"; "Cast through `unknown` so the `.skip`-ed file compiles ... drop the cast"). Task 3.1 landed the per-weekday type, so the cast/comment is now vestigial. Trim the stale narration (and optionally the now-unnecessary `as unknown` in `buildDetail`) so a future reader isn't misled.

### 2. Make the component derive-test's clock dependency explicit (LOW · determinism)

**Location**: `VenueDetailContent.opening-hours-derived.atdd.test.tsx:82`
These tests are deterministic ONLY because `OPEN_TODAY`/`CLOSED_TODAY` are weekday-uniform, so the SUT's real render-time `new Date()` (`VenueDetailContent.tsx:141`) can't pick a "wrong" day. That is sound and documented. If a weekday-specific badge assertion is ever added here, freeze the clock with `vi.useFakeTimers()` + `setSystemTime` like `venue-detail-route.data-cleanup.atdd.test.ts` already does — don't rely on the uniform-fixture trick for a day-sensitive case.

### 3. Optionally broaden the store `detailFromRow` structural assertion (LOW · coverage-nuance → defer to trace)

**Location**: `venue-store.test.ts` (migrated `detailFromRow` expectation)
The migrated expected `openingHours` names only keys `'1'` and `'7'`, so the equality check proves those two weekdays survive mapping. This is sufficient for the AC (structure passes through), but a `toMatchObject` over all present keys would guard against a mapper that silently drops mid-week entries. Coverage-completeness — route to `trace` if pursued.

---

## Best Practices Found

### 1. Pure formatter with injected `now` + explicit DST proof

**Location**: `opening-hours.coverage.test.ts:34–78`
`stockholmIsoWeekday` is walked across all 7 ISO weekdays via `it.each`, PLUS a winter CET instant and a local-midnight-crossing instant that prove the derivation reads the ZONED weekday, not the UTC weekday. The never-fabricate contract is pinned by stubbing `Intl.DateTimeFormat` to emit an out-of-range token and asserting `undefined` (not a defaulted Monday). This is the reference pattern for the whole opening-hours surface.

### 2. Defensive coercer boundary fully exercised

**Location**: `venue-store.opening-hours-coerce.test.ts:26–96`
The trust boundary between raw DB jsonb and the pure formatter is tested at every branch: all-malformed → `undefined`, mixed-validity cleaned (valid kept / invalid dropped in one call), explicit `null` weekday PRESERVED (closed-that-day is honest data), non-weekday keys ignored, boundary + out-of-range times validated. Directly proves a bad production row degrades to "closed" rather than crashing render.

### 3. Assertions verified honest against the SUT

Cross-checked `formatOpeningHours`/`coerceOpeningHours`/`stockholmIsoWeekday` in `lib/utils/opening-hours.ts` and `lib/services/venue-store.ts`: the expected values (e.g. `closesAt "02:00"` for past-midnight, `undefined` for `24:00`) match the implementation exactly — no tautological or over-loose assertions.

---

## Test File Analysis

### Files In Scope

**Story-11.9 focus (7 named — 6 test files, 1 is the SUT):**
- `test/unit/utils/opening-hours.atdd.test.ts` (133 lines, 9 tests) — primary AC2 formatter contract
- `test/unit/utils/opening-hours.coverage.test.ts` (142 lines) — weekday/DST/template/edge branches
- `test/unit/services/venue-store.opening-hours-shape.atdd.test.ts` (120 lines) — coercer + column-drop + fixture-seam
- `test/unit/services/venue-store.opening-hours-coerce.test.ts` (96 lines) — defensive coercer boundary
- `test/unit/api/venue-detail-route.data-cleanup.atdd.test.ts` (110 lines) — DTO serialization (faked clock)
- `test/components/VenueDetailContent.opening-hours-derived.atdd.test.tsx` (186 lines) — derived badge/row render
- (`lib/utils/opening-hours.ts` is the SUT, not a test — the 7th named file)

**Sibling migrations (12):** FeedbackFlow, MapView, ReviewFlow, VenueDetailContent, VenueDetailOverlay, VenueQuickInfo (components); venue-detail-route, venues-route, venues-route-real-engine (api); useSubmitReview (mutations); useVenueDetail (queries); venue-store (services). All swap the dead `{display,closesAt}` string for per-weekday jsonb and/or assert dropped `peak_time`/`shadow_warning_minutes`; consistently annotated `// Story 11.9 (AC…)`.

- **Framework**: Vitest (+ @testing-library/react)
- **Language**: TypeScript
- **Verification**: 6 focus files ran GREEN — 49 passed / 49, ~392ms test time.

---

## Context and Integration

### Related Artifacts

- **Prior review**: `_bmad-output/test-artifacts/test-reviews/test-review-epic-11.md` (Epic 11 suite 11.1–11.8, 92/A)
- **ATDD checklist**: `_bmad-output/test-artifacts/atdd-checklist-11-9.md`
- **Automation summary**: (11.9 coverage expansion — `cba92e2`)

---

## Knowledge Base References

- `test-quality.md` — Definition of Done (no hard waits, <300 lines, <1.5 min, self-cleaning, explicit assertions)

For coverage mapping/gates, consult the `trace` workflow.

---

## Next Steps

### Immediate Actions (Before Merge)

None required — approve as-is. The 5 LOW findings are cosmetic/defensive-nuance.

### Follow-up Actions (Future PRs)

1. Trim vestigial red-phase / `.skip` comments in the two ATDD files (P3, backlog).
2. If a weekday-specific badge assertion is added, freeze the clock explicitly (P3).
3. Optionally broaden the `detailFromRow` structural assertion — route to `trace` (P3).

### Re-Review Needed?

✅ No re-review needed — approve as-is.

---

## Decision

**Recommendation**: Approve

**Rationale**: Story 11.9's tests score 96/100 (A), consistent with the 92/A epic-end suite. The pure-formatter contract, defensive coercer coverage, and uniform sibling migrations are production-grade; all findings are LOW and none affect determinism, isolation, or correctness. Tests are green (49/49) and assertions are honest against the shipped source.

---

## Appendix — Violation Summary by Location

| File:Line | Severity | Dimension | Issue | Fix |
| --------- | -------- | --------- | ----- | --- |
| venue-store.opening-hours-shape.atdd.test.ts:~60 | P3 (LOW) | maintainability | Residual red-phase "probe via dynamic require" prose | Trim stale narration |
| VenueDetailContent.opening-hours-derived.atdd.test.tsx:62 | P3 (LOW) | maintainability | Vestigial `.skip`/cast comment (type landed) | Drop `as unknown` framing + `.skip` reference |
| VenueDetailContent.opening-hours-derived.atdd.test.tsx:82 | P3 (LOW) | determinism | Relies on SUT real `new Date()` (safe via uniform fixtures) | Fake clock if a day-sensitive case is added |
| opening-hours.coverage.test.ts:67 | P3 (LOW) | isolation | Global `Intl` mutation (restored in `finally`) | No change needed; optional `vi.stubGlobal` |
| venue-store.test.ts (detailFromRow) | P3 (LOW) | maintainability | Structural assertion names only keys '1'/'7' | Optional `toMatchObject` over all keys (→ trace) |

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review (sequential mode)
**Review ID**: test-review-11-9-20260706
**Overall**: 96/100 (A)
