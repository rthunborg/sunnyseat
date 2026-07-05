---
stepsCompleted:
  - step-01-load-context
  - step-02-discover-tests
  - step-03-quality-evaluation
  - step-03f-aggregate-scores
  - step-04-generate-report
lastStep: step-04-generate-report
lastSaved: '2026-07-05'
review_scope: suite
scope_note: 'Tests added/modified across Epic 11 (51 test files, ~6,600 insertions vs epic-10 close 3911539)'
advisory: true
inputDocuments:
  - _bmad/tea/config.yaml
  - resources/knowledge/test-quality.md
  - _bmad-output/planning-artifacts/epics.md (Epic 11 section)
  - _bmad-output/test-artifacts/test-design/test-design-epic-11.md
detected_stack: fullstack
overall_score: 92
overall_grade: A
---

# Test Quality Review — Epic 11 Suite (Advisory)

**Scope:** `suite` — the tests authored and expanded across Epic 11's 8 stories.
**Stack:** fullstack (Next.js + Playwright + Vitest). **Mode:** advisory (report findings + score; non-blocking).
**Baseline:** 51 test files changed since epic-10 close (`3911539`), ~6,600 insertions / ~600 deletions.
**Runtime health (reported):** vitest 1361 tests / 143 files green; Playwright mobile 52 / desktop 35 / touch 3 / a11y 12 green.

Coverage scoring is intentionally out of scope for `test-review` (owned by `trace`; see `traceability-report-epic-11.md`).

---

## Score Summary

**Overall: 92 / 100 — Grade A** (weighted: determinism 0.30, isolation 0.30, maintainability 0.25, performance 0.15)

| Dimension | Score | Grade | Note |
|---|---|---|---|
| Determinism | 92 | A | Route-mock + forced `?_time=13:00` + live-Met.no forbidden everywhere; injected `now`/fixed fixtures; only justified `waitForTimeout` gesture-pacing |
| Isolation | 96 | A | No order deps, no shared mutable state, `fetch`/mock restored via try-finally, adapter-boundary mocking |
| Maintainability | 84 | B | Excellent per-test discipline; docked for stale RED-PHASE headers on 6 now-green ATDD files + a few very large single files |
| Performance | 94 | A | Pure client-derivation unit tests; API/route mocking over UI setup; CDP touch specs minimal; parallel-safe |

Weighted: `92*.3 + 96*.3 + 84*.25 + 94*.15 = 91.5 → 92`.

---

## What This Suite Does Exceptionally Well

- **Determinism by construction (the epic's whole thesis).** Every Epic-11 e2e (`epic-11-scrub-zero-fetch`, `-slider-touch-drag`, `-sheet-touch-gestures`, `-chip-filter-parity`) fulfils `**/api/venues?**` from a hand-built DTO, pins the wall clock with `?_time=13:00`, and installs a belt-and-braces `**://api.met.no/**` abort that FAILS the test on any live fetch. The acceptance signals are request COUNTERS and `data-state` attribute transitions — never latency asserts. This is textbook R-001 "REMOVE the fetch, don't dampen it" verification.
- **Real-touch proof, not emulated.** The touch specs drive raw CDP `Input.dispatchTouchEvent` (touchStart/Move/End) with realistic inter-event pacing so `@use-gesture` velocity math sees a genuine gesture — exactly the "emulated mouse-drag passes while a real finger fails" gap the test design (R-004/R-008) called out. They self-skip off no-touch projects via `hasTouch` rather than false-failing.
- **Behaviour, not magic numbers.** Boundary suites (`time-planner.window-boundaries.automate`, `recenter-padding`) inject a fixed `now`, assert reason-PRECEDENCE ordering, and cross-check constants (`PLANNER_START_MINUTES === 6*60`) instead of hard-coding 360. Monotonic-ordering and well-formed-shape invariants catch whole classes of regressions.
- **Guarding the invisible.** `hygiene-config-contracts.automate` and `epic-11-standing-gate-ci-wiring.automate` lock static contracts that produce byte-identical UI and therefore carry no runtime/visual guard: the vercel `installCommand` error-swallow, `.gitattributes` scope, the deleted `toSunStatusToken` mapper, and — critically — that CI keeps INVOKING `--project=touch/mobile/desktop/a11y` and that `playwright.config.ts` routing prevents a vacuous-green (0 specs matched). This directly answers Story 11.8's "shipped-but-insufficient" thesis.
- **Untested-branch expansion.** `venues-route-day-series-degrade` targets the exact try/catch degrade path the happy-path ATDD always stubbed to resolve, with per-venue isolation asserts. Mocking is done at the adapter boundary (`shouldUseRealSunEngine`/`applyRealSunEngine`/`computeVenueDaySeries`) — the correct pattern given the project's known concurrent-dynamic-import mock-bypass gotcha.
- **Explicit assertions in test bodies, testid-driven selectors** (selector-resilient across class refactors), self-cleaning `fetch` stubs, unique per-venue fixtures — all core-checklist items pass.

---

## Findings

### MEDIUM

- **M1 — Stale RED-PHASE headers on 6 now-green ATDD files.** These files' banner comments assert "Every block is `describe.skip`" / "why every block is `.skip`-ed", but every block is now a live `describe` (verified: `active_describe=2..4`, `describe.skip=0` in each). Affected:
  - `test/unit/utils/venue-day-series.derivation.atdd.test.ts`
  - `test/unit/utils/venue-day-series-query-key.atdd.test.ts`
  - `test/unit/api/venues-route-day-series.atdd.test.ts`
  - `test/unit/services/sun-engine-day-series-cache.atdd.test.ts`
  - `test/unit/services/sun-engine.day-series-parity.atdd.test.ts`
  - `test/components/TimeSlider.dragdecouple.atdd.test.tsx`

  Not a functional defect (the tests run and pass green), but the doc-vs-reality drift misleads a future reader into thinking the scaffolds are still red. Suggested fix: a one-line header edit per file ("RED-PHASE scaffold — now GREEN; all blocks live") when these files are next touched. Some also still carry `{...withMin(MIN)}` untyped-spread workarounds justified only by the red-phase (`minMinutes` "does not exist yet") — once the prop is typed, those can become typed props.

### LOW

- **L1 — A few very large single test files grew further.** `MapView.test.tsx` (3199 lines), `VenueQuickInfo.test.tsx` (986), `VenueDetailContent.test.tsx` (679), `useVenueSearch.test.ts` (699). The TEA guideline is <300 lines *per test* — every INDIVIDUAL test here is small and focused, so this is not a per-test violation — but these mega-files are hard to navigate and are natural split-by-feature candidates. Epic 11 appended rather than split. Advisory only.
- **L2 — Legitimate but present hard waits in e2e.** Five `waitForTimeout` calls across the touch/scrub specs: gesture inter-event pacing (16/20 ms — required so `@use-gesture` reads realistic velocity), a 120 ms release-settle, and 400/500 ms "give a wrongly-triggered fetch time to fire" before a NEGATIVE (zero-count) assertion. All are justified and documented, and none gate a positive assertion on elapsed time. Flagged for completeness only — the settle-before-negative-assertion pattern is inherently a small flake surface (a slow fetch firing after the window would be missed), though the `?_time` pin + route counter make that essentially impossible here.

---

## Non-Findings (checked, clean)

- No `test.only` / `it.only` / `fit` / `fdescribe` anywhere in the Epic-11 set.
- No `Math.random()`; no unmocked `Date.now()` / `new Date()` (all `new Date(...)` take fixed ISO string args).
- No lingering red-phase `describe.skip`/`it.skip`/`.fixme` in the Epic-11 files — the only `test.skip(...)` calls are `hasTouch`-project self-skips (correct), and the only `.fixme` references are string matches inside the standing-gate test asserting the deliberate `a11y-mobile` omission.
- No isolation leaks: every `fetch`/global stub is restored (try-finally / afterEach), adapter mocks reset.

---

## Context References

- Test design: `_bmad-output/test-artifacts/test-design/test-design-epic-11.md` (R-001/R-004/R-008 map cleanly onto the e2e + touch specs reviewed).
- Traceability + gate: `_bmad-output/test-artifacts/traceability/traceability-report-epic-11.md` (coverage lives there, not here).
- Automation summaries per story: `automation-summary-11-{2,3,4,5,8}.md`.

---

## Recommended Next Workflow

- No blockers. This is an advisory pass and the suite is A-grade and CI-green.
- Optional, low-priority: fold the M1 header refresh + L1 file splits into a future hygiene touch (mirrors the Epic-11 "stop re-deferring maintenance debt" posture). Route coverage questions to `trace`, not here.
