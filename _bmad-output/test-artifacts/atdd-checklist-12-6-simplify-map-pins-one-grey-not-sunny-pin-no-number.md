---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-07-18'
workflowType: 'testarch-atdd'
storyId: '12.6'
storyKey: '12-6-simplify-map-pins-one-grey-not-sunny-pin-no-number'
storyFile: '_bmad-output/implementation-artifacts/12-6-simplify-map-pins-one-grey-not-sunny-pin-no-number.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-12-6-simplify-map-pins-one-grey-not-sunny-pin-no-number.md'
generatedTestFiles:
  - 'nextjs-app/test/unit/api/story-12-6-public-sun-ordering.atdd.test.ts'
  - 'nextjs-app/test/e2e/story-12-6-public-sun-pins.atdd.spec.ts'
  - 'nextjs-app/test/e2e/story-12-6/axe-mobile.spec.ts'
  - 'nextjs-app/test/components/VenuePin.public-sun.atdd.test.tsx'
  - 'nextjs-app/test/unit/utils/public-sun.atdd.test.ts'
  - 'nextjs-app/test/unit/services/story-12-6-weather-gate-state.atdd.test.ts'
  - 'nextjs-app/test/unit/story-12-6-i18n-a11y-ci.atdd.test.ts'
inputDocuments:
  - 'AGENTS.md'
  - 'project-context.md'
  - '_bmad/tea/config.yaml'
  - '_bmad-output/implementation-artifacts/12-6-simplify-map-pins-one-grey-not-sunny-pin-no-number.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-12.md'
  - 'nextjs-app/docs/design/DESIGN.md'
  - 'nextjs-app/docs/design/references/claude-design/README.md'
  - 'nextjs-app/playwright.config.ts'
  - 'nextjs-app/vitest.config.ts'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/data-factories.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/component-tdd.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/test-quality.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/test-healing-patterns.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/selector-resilience.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/timing-debugging.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/overview.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/api-request.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/network-recorder.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/auth-session.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/intercept-network-call.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/recurse.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/log.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/file-utils.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/network-error-monitor.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/fixtures-composition.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/playwright-cli.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/pact-mcp.md'
---

# ATDD Checklist - Epic 12, Story 12.6: Simplify Map Pins

**Date:** 2026-07-18
**Author:** Rasmus
**Primary test level:** Unit/component with targeted API-contract and browser acceptance coverage

## Preflight And Context

- Detected stack: `frontend` (Next.js, React, Vitest, and Playwright).
- Story status: `ready-for-dev`, with testable acceptance criteria and explicit architecture/UX contracts.
- Test infrastructure: `nextjs-app/vitest.config.ts` and `nextjs-app/playwright.config.ts` are present; local dependencies are installed.
- Existing patterns inspected: deterministic `page.route()` API mocks, fixed `_time` state, onboarding bypass, component Motion mocks, venue ordering tests, pin-layer lifecycle tests, and mobile axe coverage.
- Risk basis: Epic 12 risks R-006 (public predicate drift), R-011 (confidence/accessibility leakage), R-019 (unauthorized visual rebaseline), and R-023 (vacuous mobile accessibility coverage).
- Contract precedence: Story 12.6 and architecture decision E12-AD-08 supersede stale prototype pin thresholds and numbered grey-pin visuals.

## Story Contract Summary

Story 12.6 establishes one reusable public verdict: a venue is publicly sunny only when `sunExposurePercent > 50` and `weatherGateState !== 'gated'`. `unknown` weather retains geometric sunny potential with honest uncertainty; `gated` weather suppresses the public verdict without mutating geometric exposure. Confidence and raw diagnostic status are excluded from the verdict.

All server/client ordering and downstream consumers must share that contract. Map presentation collapses to amber percentage pins versus a single canonical `color-pin-shaded` grey cloud pin without a percentage, while selection, refresh, localization, accessibility, and reduced-motion behavior preserve semantics and data shape.

## Generation Mode

**Selected:** AI generation.

The acceptance criteria define exact predicate boundaries, ordering ties, visual tokens, localized meaning, and deterministic state transitions. Browser coverage will use fixed time and intercepted API responses rather than recorded traffic or live providers, so no recording session is required.

## Test Strategy

| Priority | Level | Scenario and unique responsibility | Intended red seam |
| --- | --- | --- | --- |
| P0 | Unit/domain | Public predicate matrix: exact 50%, low `Partial`, explicit `gated`, `unknown`, and confidence/raw-status exclusion | Shared public-sun module does not exist |
| P0 | Unit/domain | One total comparator: public-sunny band, exposure descending, distance ascending, stable ID ascending; deterministic tie vectors | Server and client still use separate raw-status ranks |
| P0 | Unit/domain | Public window and peak extraction: qualifying-only, gaps, earliest ties, boundary endpoints, gated exclusion, unknown retention | No reusable downstream contract exists |
| P0 | Service/unit | Read-time weather output exposes `gated`/`not_gated`/`unknown` while preserving ungated `sunExposurePercent` | Weather gate state is currently dropped from output |
| P0 | API contract | `/api/venues` and visible list consumers import the same client/server-safe public comparator; top-50 selection uses public peak and stable ties | Route and `VenueList` contain independent legacy comparators |
| P0 | Component | Amber pin only above 50% when not explicitly gated; exact 50%, 40% `Partial`, and 95% gated all use the canonical grey cloud pin without a number | `VenuePin` still branches on diagnostic status and renders four variants with percentages |
| P0 | Component | Selection adds emphasis without changing semantic state, data shape, icon, percentage policy, or tail | Selected sunny pin currently morphs into a third circular variant |
| P0 | Component | Refresh uses `initial={false}` and duration zero; reduced or unresolved motion is instant | Current amber/gate transitions animate for 200 ms |
| P1 | Unit/i18n | Swedish and English accessible-name contracts say sunny/not sunny at selected time, remove percentages from grey, retain non-colour icon/status, and expose weather-unknown honesty without confidence | Existing raw-status keys still announce grey percentages and no explicit unknown gate contract exists |
| P0 | E2E | Fixed-time, intercepted map payload proves amber/grey parity across 40%, 50%, 51%, gated-high, and unknown-high cases; validates stable selection and 44x44 targets | Current shipped map presents low `Partial` and obscured pins incorrectly |
| P1 | E2E/a11y | A pin-bearing mobile axe case executes, asserts meaningful pin content, and CI invokes the `a11y-mobile` project | Current pin-bearing mobile axe cases are `fixme`, and CI omits the project |

### Coverage Boundaries

- Exhaustive numeric and tie behavior stays at the pure-unit level; browser coverage samples only the five representative public states.
- Component tests inspect token/icon/content/motion semantics; E2E checks rendered parity, persistence through selection, touch bounds, and browser accessibility rather than re-testing every unit vector.
- API coverage verifies shared-helper consumption and top-50 ordering integration; it does not duplicate weather-provider behavior.
- `CloudObscured` remains diagnostic data and `sunExposurePercent` remains geometric. Tests reject presentation drift without changing those preserved engine contracts.
- No reference PNG or rebaseline-log assertion is generated because visual rebaseline is explicitly outside this ATDD ownership boundary.

### Red-Phase Rule

Scaffolds are active, deterministic tests rather than skipped placeholders. Each must fail for a missing Story 12.6 contract or an observable legacy behavior, never because of a live provider, wall-clock dependency, random data, or unavailable selector.

## Aggregated Red Scaffolds

- 24 unit/component/API acceptance cases cover predicate boundaries, confidence exclusion, total comparator ties, public window/peak extraction, weather tri-state propagation, DTO/source convergence, two pin presentations, selection stability, refresh/reduced motion, localization, and CI wiring.
- 3 browser cases cover the deterministic five-venue matrix, selected marker stability, and a pin-bearing `a11y-mobile` scan.
- Test data is local and fixed. Browser routes are intercepted before navigation and outbound Met.no requests are aborted/recorded.
- No shared fixture file was needed; each narrow scaffold owns its deterministic data and cleanup-free route mock.
- Aggregation validation passed with every scaffold initially marked skipped and every assertion non-placeholder. Step 5 explicitly activates them to produce genuine RED evidence before implementation.

## Test Execution Evidence

### Focused Vitest RED Run

```powershell
npx vitest run test/unit/utils/public-sun.atdd.test.ts test/unit/services/story-12-6-weather-gate-state.atdd.test.ts test/unit/api/story-12-6-public-sun-ordering.atdd.test.ts test/components/VenuePin.public-sun.atdd.test.tsx test/unit/story-12-6-i18n-a11y-ci.atdd.test.ts
```

- Test files: 5 failed.
- Tests: 24 executed, 22 failed, 2 passed, 0 skipped.
- Nine domain cases fail because `lib/utils/public-sun.ts` does not exist.
- Three API/source cases fail because the shared imports/module and tri-state DTO fields do not exist.
- One service case fails because read-time weather output omits `weatherGateState` while preserving the expected geometric exposure/status.
- Seven component cases fail on the legacy low-Partial/exact-50 sunny branch, distinct obscured branch, selected-circle morph, 200 ms refresh fade, and selected reduced-motion shape.
- Two localization/CI cases fail because raw-status percentage ARIA remains and CI still omits `a11y-mobile`.
- The two already-green controls are the current 51% and unknown-high amber icon/percentage presentations.

### Focused Playwright RED Run

```powershell
$env:CI='1'
npx playwright test test/e2e/story-12-6-public-sun-pins.atdd.spec.ts test/e2e/story-12-6/axe-mobile.spec.ts --project=mobile --project=desktop --project=a11y-mobile --workers=1 --retries=0
Remove-Item Env:CI
```

- Tests: 5 executed, 5 failed, 0 passed, 0 skipped.
- Mobile and desktop matrix cases both reached five mocked pins, then failed because the 40% `Partial` pin lacked the new Swedish percent-free not-sunny accessible name.
- Mobile and desktop selection cases reached the mocked map, then failed because the 51% pin lacked the new Swedish selected-time sunny accessible name.
- The `a11y-mobile` case executed non-vacuously, loaded the mocked pin route, and failed because its 40% `Partial` pin lacked the new not-sunny accessible name.
- The final run used a fresh Playwright-owned server; port 3000 was free after teardown. No reference image or live provider was used.

## Validation And Handoff

- Prerequisites, deterministic data, active assertions, metadata links, and owned paths validated.
- No `test.skip`/`test.fixme` remains in the generated Story 12.6 files.
- No CLI/browser session or dev-server listener remains.
- Production code, sprint status, auto-bmad state, reference PNGs, and `REBASELINE-LOG.md` were not changed.
- Next workflow: `bmad-dev-story` implements Story 12.6 against these active RED contracts; broader automation follows implementation.
