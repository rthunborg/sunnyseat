---
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
lastSaved: '2026-04-09'
workflowType: 'testarch-test-design'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - 'nextjs-app/docs/design/DESIGN.md'
---

# Test Design for Architecture: SunnySeat Front-End

> **Superseded for active MVP scope (2026-05-19):** This architecture test-design document was produced before the MVP scope correction and still describes Season Pass/Swish as active. Preserve it for Future Monetization pickup only. Active MVP test architecture is captured in `_bmad-output/qa/mvp-test-design-scope-correction-2026-05-19.md` and current planning artifacts.

**Purpose:** Architectural concerns, testability gaps, and risk mitigations for review before front-end implementation begins. Serves as contract between planning and development on what must be addressed before test development starts.

**Date:** 2026-04-09
**Author:** TEA (Master Test Architect)
**Status:** Architecture Review Pending
**Project:** SunnySeat (Gothenburg)
**PRD Reference:** `_bmad-output/planning-artifacts/prd.md` (v3.0)
**ADR Reference:** `_bmad-output/planning-artifacts/architecture.md`

---

## Executive Summary

**Scope:** System-level test design covering the customer-facing front-end (Epic 8), growth/monetization features (Epic 9), and QA/polish (Epics 10-11). Backend Epics 1-7 complete with 22 existing tests.

**Business Context:** Sun prediction engine for Gothenburg outdoor venues. First-mover advantage — no competitor offers patio-level sun prediction. User trust depends on prediction accuracy (target >=85%).

**Architecture:** Next.js 16+ App Router, React 19, MapLibre GL JS, TanStack Query, Supabase/PostGIS, Tailwind v4, Vitest + Playwright. Session-based premium via Swish payments (no user accounts).

**Risk Summary:**
- **Total risks**: 16 (2 high-priority >=6, 8 medium, 6 low)
- **High-priority (>=6)**: MapLibre performance on low-end Android, shadow accuracy trust erosion
- **Test effort**: ~84 tests (~78-125 hours for solo developer)

---

## Quick Guide

### BLOCKERS - Decided

1. **External service mock strategy** — **Decision: Playwright `route.fulfill()`** for all external service mocking (Met.no, Swish, MapTiler). No MSW dependency needed — Playwright already in stack. Fixture JSON files per service in `test/fixtures/`. (Owner: Rasmus, before Epic 8 implementation)

2. **Time determinism for sun calculations** — **Decision: Hybrid approach.** `vi.useFakeTimers()` for unit/component tests. Precomputed fixture data for known dates (e.g., 2026-06-21 summer solstice in Gothenburg) for E2E tests. (Owner: Rasmus, before first frontend test)

### HIGH PRIORITY - Team Should Validate

1. **R-01: MapLibre mobile performance** — Test on a real budget Android device (BrowserStack or physical) before launching. Pin clustering strategy needed if >50 venues causes frame drops. (Implementation phase)

2. **R-02: Shadow accuracy feedback loop** — Feedback flow ("Var det soligt?") is the primary accuracy validator. Ensure feedback API correctly aggregates and surfaces accuracy trends. (Implementation phase)

3. **Database cleanup for E2E tests** — **Decision: Unique test identifiers + cleanup via admin API.** Test data tagged with `test-{uuid}` prefix. `afterEach`/`afterAll` hooks call admin cleanup endpoint. (Before E2E test development)

### INFO ONLY - Solutions Provided

1. **Test strategy**: 12 unit / 20 component / 14 API / 25 E2E / 13 perf+a11y (pyramid shape, E2E for critical paths only)
2. **Tooling**: Vitest (unit/component), Playwright (E2E/API), Lighthouse CI (performance/a11y), axe-core (accessibility)
3. **CI gates**: PR (<12 min), merge-to-main (<25 min), weekly (full P3 + cross-browser)
4. **Existing infrastructure**: `visual-validate.sh` (Claude API vision comparison), `sprint-status-gate.sh` (blocks story completion), `test-gate` skill (per-story test requirements)
5. **Quality gates**: P0 100%, P1 >=95%, bundle <=400KB, Lighthouse >=90 perf / >=95 a11y

---

## Risk Assessment

**Total risks identified**: 16 (2 high, 8 medium, 6 low)

### High-Priority Risks (Score >=6)

| Risk ID | Category | Description | P | I | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|---|---|-------|------------|-------|----------|
| **R-01** | **PERF** | MapLibre GL JS performance on low-end Android — 60fps map interaction may degrade with 50+ venue pins | 2 | 3 | **6** | Pin clustering >50 venues. Test on budget Android. Lighthouse mobile throttling in CI | Rasmus | Before map pin story |
| **R-02** | **BUS** | Shadow accuracy trust erosion — derived open-data shadow casters or unmodelled obstructions produce incorrect predictions, destroying user trust | 2 | 3 | **6** | Complete Epic 3 Prelude shadow-data trust stories before Story 3.1. Runtime uses filtered active casters only. High confidence requires cluster spot-check gates (10 checks/cluster, 70+ central checks, about 85-90% building-shadow agreement). Feedback loop surfaces bad predictions. | Rasmus | Before Epic 3 feature work resumes |

### Medium-Priority Risks (Score 3-5)

| Risk ID | Category | Description | P | I | Score | Mitigation |
|---------|----------|-------------|---|---|-------|------------|
| R-03 | OPS | Met.no API degradation — stale weather, capped confidence | 2 | 2 | 4 | Graceful degradation designed. Mock in tests |
| R-04 | TECH | Swish payment flow complexity — dual-flow, external API, timeout | 2 | 2 | 4 | Swish test environment. Mock in E2E |
| R-05 | PERF | Bundle size budget breach — 400KB ceiling with MapLibre ~200KB | 2 | 2 | 4 | Bundle analyzer CI gate. Async-load MapLibre |
| R-06 | PERF | CLS from custom font loading — Plus Jakarta Sans + Manrope | 2 | 2 | 4 | next/font self-hosts with size-adjust. Lighthouse CLS gate |
| R-07 | BUS | Accessibility on map-heavy SPA — MapLibre canvas inherently inaccessible | 2 | 2 | 4 | axe-core CI gate. Keyboard nav tests. ARIA labels. Shape differentiation |
| R-08 | TECH | Premium persistence loss — user clears browser data | 2 | 2 | 4 | Recovery flow via Swish txn ID lookup |
| R-09 | BUS | Geolocation denial — user denies location permission | 2 | 2 | 4 | Gothenburg centrum fallback designed |
| R-10 | TECH | Swish payment polling timeout — 5-min timeout race | 2 | 2 | 4 | Clear error + retry option |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | P | I | Score | Action |
|---------|----------|-------------|---|---|-------|--------|
| R-11 | DATA | Weather data staleness (Met.no reliable) | 1 | 3 | 3 | Monitor |
| R-12 | PERF | Rate limiting under sunny-day spikes | 1 | 3 | 3 | Monitor |
| R-13 | TECH | Cross-browser PWA install quirks | 2 | 1 | 2 | Manual test |
| R-14 | TECH | Visual regression (caught by existing gate) | 1 | 2 | 2 | Accept |
| R-15 | SEC | Premium JWT forgery (server-verified) | 1 | 2 | 2 | Accept |
| R-16 | BUS | i18n missing translations | 1 | 1 | 1 | Accept |

---

### Testability Concerns and Architectural Gaps

**ACTIONABLE CONCERNS**

#### Blockers to Fast Feedback

| Concern | Impact | What Must Be Provided | Owner | Timeline |
|---------|--------|-----------------------|-------|----------|
| **External service mocking** | Tests non-deterministic — Met.no responses vary, Swish unavailable in test | **Decided:** Playwright `route.fulfill()` with fixture JSON files in `test/fixtures/` | Rasmus | Before first E2E test |
| **Time-dependent sun calculations** | Same test produces different results at different times of day | **Decided:** `vi.useFakeTimers()` for unit/component + precomputed fixture data for E2E | Rasmus | Before first frontend test |
| **Database cleanup** | E2E tests that submit feedback/reviews pollute shared DB | **Decided:** Unique `test-{uuid}` identifiers + cleanup via admin API in afterEach/afterAll | Rasmus | Before E2E tests that mutate data |

### Testability Assessment Summary

#### What Works Well

- All business logic accessible via REST API — full headless test capability
- Zero PII + stateless serverless architecture — clean test isolation, no user-scoped data pollution
- Precomputed sun data deterministic within a day — reliable fixture source
- Playwright geolocation context option — deterministic location control
- Visual validation gate already operational (`sprint-status-gate.sh` + `visual-validate.sh`)
- Client state in localStorage/sessionStorage — easily injectable and clearable in tests
- TanStack Query stale time — observable and testable refresh behavior

#### Accepted Trade-offs

- **No structured error logging at launch** (Vercel Analytics only) — acceptable for initial launch, limits server-side error assertion in tests. Revisit if error visibility becomes a problem.
- **No dedicated test seeding endpoints** — production admin APIs and direct Supabase access sufficient for test data setup at current scale.

---

### Risk Mitigation Plans (High-Priority Risks >=6)

#### R-01: MapLibre Performance on Low-End Android (Score: 6)

**Mitigation Strategy:**
1. Implement pin clustering when venue count exceeds 50 visible pins
2. Lighthouse CI gate with mobile throttling (simulated 4G, 4x CPU slowdown)
3. Manual testing on a budget 2022 Android device before launch
4. Fallback: reduce pin visual detail at low zoom levels

**Owner:** Rasmus
**Timeline:** Before Epic 8 story that renders map pins
**Status:** Planned
**Verification:** 60fps map pan/zoom on test device with 50 pins. Lighthouse Performance >=90 mobile.

#### R-02: Shadow Accuracy Trust Erosion (Score: 6)

**Mitigation Strategy:**
1. Launch with 50 best-quality verified venues (highest polygon accuracy)
2. Implement feedback flow ("Var det soligt?") as primary accuracy signal
3. Admin polygon override capability for known inaccuracies
4. Rolling 14-day accuracy target >=85% — monitor via feedback API aggregation

**Owner:** Rasmus
**Timeline:** Ongoing — backend mitigations exist, frontend feedback flow in Epic 8
**Status:** Partially mitigated (backend ready, frontend not yet built)
**Verification:** Feedback API correctly aggregates accuracy. 14-day rolling accuracy displayed in admin (Phase 2).

---

### Assumptions and Dependencies

#### Assumptions

1. Backend APIs (Epics 1-7) remain stable — no breaking changes during front-end build
2. Supabase free/pro tier sufficient for test data volume
3. MapTiler free tier sufficient for development/testing tile requests
4. Swish test environment available before payment story implementation

#### Dependencies

1. **Vitest + Playwright configuration** — Must be set up in Epic 8 foundation story
2. **MSW or equivalent mock setup** — Required before E2E tests that hit external services
3. **CI pipeline (GitHub Actions)** — Required for merge gates (Lighthouse, bundle size, tests)

#### Risks to Plan

- **Risk**: Backend API changes during front-end build break existing 22 tests
  - **Impact**: Regression in sun/shadow engine
  - **Contingency**: Run existing backend tests in CI on every PR

---

**End of Architecture Document**

**Next Steps:**
1. Review Quick Guide blockers and make decisions on mock strategy + time determinism
2. Resolve testability concerns before first E2E test development
3. Refer to companion QA doc (`test-design-qa.md`) for test scenarios and execution recipe
