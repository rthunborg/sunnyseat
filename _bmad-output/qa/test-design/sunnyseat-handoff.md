---
title: 'TEA Test Design -> BMAD Handoff Document'
version: '1.0'
workflowType: 'testarch-test-design-handoff'
sourceWorkflow: 'testarch-test-design'
generatedBy: 'TEA Master Test Architect'
generatedAt: '2026-04-09'
projectName: 'sunnyseat'
---

# TEA -> BMAD Integration Handoff

> **Superseded for active MVP scope (2026-05-19):** This handoff contains pre-correction premium/Swish/payment priorities. Keep it as Future Monetization reference only. Use `_bmad-output/qa/mvp-test-design-scope-correction-2026-05-19.md` for the free MVP test plan.

## Purpose

This document bridges TEA's test design outputs with BMAD's epic/story decomposition workflow (`create-epics-and-stories`). It provides structured integration guidance so that quality requirements, risk assessments, and test strategies flow into implementation planning.

## TEA Artifacts Inventory

| Artifact | Path | BMAD Integration Point |
|----------|------|----------------------|
| Architecture Test Design | `_bmad-output/qa/test-design-architecture.md` | Epic quality requirements, testability blockers |
| QA Test Design | `_bmad-output/qa/test-design-qa.md` | Story acceptance criteria, test scenarios per story |
| Risk Assessment | (embedded in both documents) | Epic risk classification, story priority |
| Coverage Strategy | (embedded in QA doc) | Story test requirements (P0-P3) |
| Test Design Progress | `_bmad-output/qa/test-design-progress.md` | Workflow audit trail |

## Epic-Level Integration Guidance

### Risk References

The following risks should appear as epic-level quality gates:

**Epic 8 (Front-End Implementation):**
- R-01 (PERF, score 6): MapLibre performance — pin rendering benchmark must pass before map stories complete
- R-02 (BUS, score 6): Shadow accuracy — feedback flow must be implemented and tested
- R-07 (BUS, score 4): Accessibility — axe-core scan must pass per screen
- R-09 (BUS, score 4): Geolocation denial — fallback must work before onboarding story completes

**Epic 9 (Growth & Monetization):**
- R-04 (TECH, score 4): Swish payment complexity — both mobile + desktop flows must have E2E tests
- R-08 (TECH, score 4): Premium persistence — recovery flow must be tested
- R-10 (TECH, score 4): Swish polling timeout — timeout + retry must be tested

### Quality Gates

| Epic | Gate Criteria |
|------|--------------|
| Epic 8 | All P0 E2E tests passing. Visual validation passing per screen. Bundle <=400KB. Lighthouse Performance >=90 |
| Epic 9 | Swish payment E2E (mobile + desktop). Premium recovery E2E. Payment failure/timeout E2E |
| Epic 10 (QA) | All P1 tests passing. axe-core zero critical/serious. P2 coverage complete |
| Epic 11 (UX Polish) | Visual validation passing all screens at both viewports. P3 a11y suite passing |

## Story-Level Integration Guidance

### P0/P1 Test Scenarios -> Story Acceptance Criteria

The following test scenarios MUST appear as acceptance criteria in their respective stories:

| Test ID | Scenario | Target Story | Acceptance Criterion |
|---------|----------|-------------|---------------------|
| P0-E-01 | Map loads with amber pins after granting location | Map + pins story | "Map displays amber pins on sunny venues within 10 seconds of granting location" |
| P0-E-03 | Feedback flow completes | Feedback story | "User can submit sun accuracy feedback. Duplicate submissions from same session rejected" |
| P0-E-04 | Geolocation denied fallback | Onboarding story | "If location denied, map centers on Gothenburg centrum. Venues visible and interactive" |
| P1-E-01 | Time slider updates pins | Time slider story | "Moving time slider updates venue pin colours to reflect sun state at selected time" |
| P1-E-02 | Swish mobile purchase | Payment story | "User completes Swish purchase via mobile deep-link. Premium features unlocked within seconds" |
| P1-E-03 | Swish desktop purchase | Payment story | "QR code rendered for desktop. Payment confirmation activates premium" |
| P1-E-04 | Premium recovery | Premium recovery story | "User enters Swish transaction ID. Valid current-season ID restores premium status" |
| P1-E-07 | Met.no degradation | Weather integration story | "When weather API unavailable, sun predictions still display with capped confidence and staleness indicator" |

### Data-TestId Requirements

Stories that implement frontend components should include these `data-testid` attributes for testability:

| Component | Required data-testid | Used By |
|-----------|---------------------|---------|
| Map container | `map-loaded` | P0-E-01: wait for map initialization |
| Venue pin (sunny) | `venue-pin-sunny` | P0-E-01: assert amber pins visible |
| Venue pin (shaded) | `venue-pin-shaded` | P0-E-01: assert grey pins |
| Venue pin (partner) | `venue-pin-partner` | P2-E-06: partner Golden Pin |
| Feedback prompt | `feedback-prompt` | P0-E-03: feedback flow |
| Feedback yes/no | `feedback-yes`, `feedback-no` | P0-E-03: feedback submission |
| Time slider | `time-slider` | P1-E-01: time scrubbing |
| Premium paywall | `premium-paywall` | P1-E-02/03: Swish purchase |
| Payment status | `payment-status` | P1-E-02/03: payment confirmation |
| Search input | `search-input` | P2-E-09: venue search |

## Risk-to-Story Mapping

| Risk ID | Category | P x I | Recommended Story/Epic | Test Level |
|---------|----------|-------|----------------------|------------|
| R-01 | PERF | 2x3=6 | Epic 8: Map pin rendering story | E2E + Perf benchmark |
| R-02 | BUS | 2x3=6 | Epic 8: Feedback flow story | Unit + API + E2E |
| R-03 | OPS | 2x2=4 | Epic 8: Weather integration story | E2E (mock failure) |
| R-04 | TECH | 2x2=4 | Epic 9: Swish payment story | API + E2E (mobile + desktop) |
| R-05 | PERF | 2x2=4 | Epic 8: Foundation/scaffold story | CI gate (bundle analyzer) |
| R-06 | PERF | 2x2=4 | Epic 8: Font/design system story | CI gate (Lighthouse CLS) |
| R-07 | BUS | 2x2=4 | All Epic 8 frontend stories | A11y (axe-core per screen) |
| R-08 | TECH | 2x2=4 | Epic 9: Premium recovery story | API + E2E |
| R-09 | BUS | 2x2=4 | Epic 8: Onboarding story | E2E |
| R-10 | TECH | 2x2=4 | Epic 9: Payment status story | E2E (timeout scenario) |

## Recommended BMAD -> TEA Workflow Sequence

1. **TEA Test Design** (`TD`) -> produces this handoff document (DONE)
2. **BMAD Create Epics & Stories** -> consumes this handoff, embeds quality requirements
3. **TEA ATDD** (`AT`) -> generates acceptance tests per story (P0 scenarios first)
4. **BMAD Implementation** -> developers implement with test-first guidance
5. **TEA Automate** (`TA`) -> expands test suite beyond acceptance tests
6. **TEA Trace** (`TR`) -> validates coverage completeness before launch

## Phase Transition Quality Gates

| From Phase | To Phase | Gate Criteria |
|-----------|----------|--------------|
| Test Design | Epic/Story Creation | All P0 risks have mitigation strategy (DONE). All 3 test blockers decided (DONE) |
| Epic/Story Creation | ATDD | Stories have acceptance criteria from test design |
| ATDD | Implementation | Failing acceptance tests exist for all P0/P1 scenarios |
| Implementation | Test Automation | All acceptance tests pass. Visual validation passing |
| Test Automation | Release | >=80% coverage of P0/P1 requirements. All quality gates green |
