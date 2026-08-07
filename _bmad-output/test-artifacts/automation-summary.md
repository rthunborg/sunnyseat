---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-identify-targets'
  - 'step-03-generate-tests'
  - 'step-03c-aggregate'
  - 'step-04-validate-and-summarize'
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-08-07T17:32:19+02:00'
inputDocuments:
  - '_bmad-output/implementation-artifacts/12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-12.md'
  - '_bmad-output/test-artifacts/atdd-checklist-12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours.md'
  - 'project-context.md'
  - 'nextjs-app/package.json'
  - 'nextjs-app/vitest.config.ts'
  - 'nextjs-app/playwright.config.ts'
  - '_bmad/tea/config.yaml'
  - '.agents/skills/bmad-testarch-automate/resources/tea-index.csv'
  - '_bmad-output/implementation-artifacts/11-9-venue-data-model-cleanup.md'
  - 'nextjs-app/lib/utils/opening-hours.ts'
  - 'nextjs-app/lib/services/venue-store.ts'
  - '_bmad-output/implementation-artifacts/11-6-venue-detail-clean-first-paint-content-polish.md'
  - 'nextjs-app/components/composed/venue/VenueDetailContent.tsx'
  - 'nextjs-app/components/custom/feedback/ReviewFlow.tsx'
  - 'nextjs-app/components/custom/map/MapView.tsx'
  - 'nextjs-app/components/custom/venue/ForcedVenueDetailInitialFrame.tsx'
  - 'nextjs-app/test/components/VenueDetailContent.test.tsx'
  - 'nextjs-app/test/components/ReviewFlow.test.tsx'
  - 'nextjs-app/test/unit/removed-i18n-keys.test.ts'
  - 'nextjs-app/test/unit/venue-detail-label-prune.test.ts'
  - '_bmad-output/implementation-artifacts/10-4-rain-now-signal-met-no-nowcast.md'
  - 'nextjs-app/lib/weather/nowcast-service.ts'
  - 'nextjs-app/test/unit/weather/nowcast-service.cloud-gate.atdd.test.ts'
  - '_bmad-output/implementation-artifacts/10-1-cloud-gated-sun-state-weather-truth-fixes.md'
  - '_bmad-output/implementation-artifacts/10-2-sun-behind-clouds-two-signal-ui-state.md'
  - '_bmad-output/implementation-artifacts/10-3-layered-cloud-detail-met-no-complete-endpoint.md'
  - 'nextjs-app/lib/solar/effective-cloud-cover.ts'
  - 'nextjs-app/test/unit/solar/effective-cloud-cover.test.ts'
  - 'nextjs-app/lib/services/sun-engine.ts'
  - 'nextjs-app/lib/solar/confidence-calculator.ts'
  - 'nextjs-app/lib/weather/met-no-service.ts'
  - 'nextjs-app/lib/utils/sun-status-presentation.ts'
  - 'nextjs-app/components/custom/venue/VenueList.tsx'
  - 'nextjs-app/components/composed/venue/VenueCard.tsx'
  - 'nextjs-app/components/composed/venue/VenueQuickInfo.tsx'
  - 'nextjs-app/components/composed/venue/VenueDetailContent.tsx'
  - 'nextjs-app/components/composed/venue/SunTimeline.tsx'
  - 'nextjs-app/test/unit/services/sun-engine.cloud-gate.atdd.test.ts'
  - 'nextjs-app/test/unit/weather/met-no-service.cloud-gate.atdd.test.ts'
  - 'nextjs-app/test/unit/confidence-calculator.cloud-gate.atdd.test.ts'
  - 'nextjs-app/test/unit/confidence-calculator.test.ts'
  - 'nextjs-app/test/unit/api/venues-route.cloud-gate.atdd.test.ts'
  - 'nextjs-app/test/unit/api/venues-route-real-engine.test.ts'
  - 'nextjs-app/test/unit/sun-status-presentation.test.ts'
  - 'nextjs-app/test/components/VenueList.test.tsx'
  - 'nextjs-app/test/components/VenueCard.test.tsx'
  - 'nextjs-app/test/components/VenueDetailContent.test.tsx'
  - '_bmad-output/implementation-artifacts/11-7-hygiene-deferred-debt.md'
  - 'nextjs-app/vercel.json'
  - 'nextjs-app/docs/vercel-deployment.md'
  - '.gitattributes'
  - 'nextjs-app/test/unit/map-legibility-tokens.automate.test.ts (precedent)'
  - '_bmad/tea/config.yaml'
  - '_bmad-output/implementation-artifacts/12-7-reviews-route-resolves-live-venues-fix-the-404-on-real-venues.md'
  - '_bmad-output/test-artifacts/atdd-checklist-12-7-reviews-route-resolves-live-venues-fix-the-404-on-real-venues.md'
  - 'nextjs-app/lib/services/venue-store.ts'
  - 'nextjs-app/app/api/reviews/route.ts'
  - 'nextjs-app/app/api/venues/[slug]/feedback/route.ts'
  - 'nextjs-app/lib/services/venue-reviews-persistence.ts'
  - 'nextjs-app/test/unit/services/story-12-7-public-venue-resolver.atdd.test.ts'
  - 'nextjs-app/test/unit/api/story-12-7-reviews-route-live-venues.atdd.test.ts'
  - 'nextjs-app/test/unit/api/story-12-7-feedback-route-live-venues.atdd.test.ts'
  - 'nextjs-app/test/unit/services/venue-store.test.ts'
  - 'nextjs-app/test/unit/api/reviews-route.test.ts'
  - 'nextjs-app/test/unit/api/venue-feedback-route.test.ts'
  - 'nextjs-app/test/unit/services/venue-reviews-persistence.test.ts'
  - 'nextjs-app/test/unit/services/story-12-7-public-venue-resolver.automation.test.ts'
  - 'nextjs-app/test/unit/api/story-12-7-shared-resolver-convergence.automation.test.ts'
  - '_bmad-output/implementation-artifacts/12-6-simplify-map-pins-one-grey-not-sunny-pin-no-number.md'
  - '_bmad-output/test-artifacts/atdd-checklist-12-6-simplify-map-pins-one-grey-not-sunny-pin-no-number.md'
  - 'nextjs-app/lib/utils/public-sun.ts'
  - 'nextjs-app/test/unit/utils/public-sun.atdd.test.ts'
  - 'nextjs-app/test/unit/services/story-12-6-weather-gate-state.atdd.test.ts'
  - 'nextjs-app/test/unit/api/story-12-6-public-sun-ordering.atdd.test.ts'
  - 'nextjs-app/test/components/VenuePin.public-sun.atdd.test.tsx'
  - 'nextjs-app/test/unit/story-12-6-i18n-a11y-ci.atdd.test.ts'
  - 'nextjs-app/test/e2e/story-12-6-public-sun-pins.atdd.spec.ts'
  - 'nextjs-app/test/e2e/story-12-6/axe-mobile.spec.ts'
  - '_bmad-output/implementation-artifacts/12-12-venue-photos-supabase-storage-hosting-render-fallback-fixes.md'
  - 'nextjs-app/lib/utils/venue-media.ts'
  - 'nextjs-app/scripts/upload-venue-media.mjs'
  - 'nextjs-app/test/unit/services/story-12-12-venue-media-contract.atdd.test.ts'
  - 'nextjs-app/test/unit/story-12-12-storage-upload-and-policy.atdd.test.ts'
  - 'nextjs-app/test/unit/story-12-12-visual-state-contract.atdd.test.ts'
  - 'nextjs-app/test/components/story-12-12-venue-photo-surfaces.atdd.test.tsx'
  - '_bmad-output/implementation-artifacts/12-9-mobile-bottom-sheet-row-quantized-drag-slim-time-slider.md'
  - 'nextjs-app/components/custom/sheets/MobileBottomSheet.tsx'
  - 'nextjs-app/test/components/MobileBottomSheet.test.tsx'
  - '_bmad-output/implementation-artifacts/12-2-feedback-driven-accuracy-loop-retire-the-coverage-cap-bypass.md'
  - 'nextjs-app/scripts/feedback-accuracy-report.ts'
  - 'nextjs-app/lib/services/feedback-accuracy-report.ts'
  - 'nextjs-app/test/unit/services/feedback-accuracy-report.test.ts'
  - 'nextjs-app/test/unit/scripts/feedback-accuracy-report.test.ts'
  - 'nextjs-app/test/unit/api/story-12-2-feedback-accuracy-loop.atdd.test.ts'
  - 'nextjs-app/test/unit/story-12-2-accuracy-ops-and-cap-cleanup.atdd.test.ts'
---

# Automation Expansion Summary - Story 12.2 (Feedback Accuracy Loop)

## Preflight And Context

- **Framework:** Vitest 4.1.4, Playwright, strict TypeScript, and ESLint are configured under `nextjs-app`; framework readiness passed.
- **Stack:** fullstack Next.js API/service/script contract plus feedback UI submission evidence. No public visual contract changed in this automate pass.
- **Mode:** BMad-integrated Create mode against `_bmad-output/implementation-artifacts/12-2-feedback-driven-accuracy-loop-retire-the-coverage-cap-bypass.md`, using implementation checkpoint `a9beae3` as provided context.
- **Execution:** sequential/local. The generic automate subagent fan-out was not used because this delegate is already the assigned automation worker and the useful scope was one narrow maintainer-report gap.
- **Knowledge loaded:** project context, TEA config, Story 12.2 file, test levels, priorities, deterministic data/testing quality, selective testing, CI/burn-in guidance, Playwright utility references, and existing Story 12.2 tests/source.

## Coverage Plan

| Priority | Level | Target | Decision |
| --- | --- | --- | --- |
| P0 | API/unit/component/E2E | Feedback route evidence validation, live resolver use, persistence mapping, public verdict vectors, stale-hash reset semantics, coverage-cap bypass removal, and browser feedback submission. | Existing Story 12.2 coverage is direct and green; rerun focused set rather than duplicate. |
| P1 | Unit/script | Maintainer CLI wrapper should be executable under mocked Supabase and prove query shape, hidden-venue filter, env-configured sample threshold, deterministic JSON output, and query-failure behavior. | Add focused script unit coverage and make the script runner injectable/exported. |

## Generated Coverage

- **UPDATED** `nextjs-app/scripts/feedback-accuracy-report.ts`
  - exported `runFeedbackAccuracyReportCli()` with injectable Supabase/env/stdout/stderr seams;
  - preserved direct script execution via `import.meta.url` guard;
  - returns explicit process-style status codes for query failures and avoids partial JSON output;
  - corrected the maintainer contract comment so weather-unknown remains explicit evidence rather than being described as a forced-grey state.
- **ADDED** `nextjs-app/test/unit/scripts/feedback-accuracy-report.test.ts`
  - verifies the CLI queries visible venues and feedback evidence fields, applies `FEEDBACK_ACCURACY_MIN_SAMPLES`, and writes deterministic report JSON;
  - verifies venue-query failure returns non-zero, writes stderr, and does not emit partial stdout.
- **Aggregate:** +1 test file / +2 deterministic unit tests. No fixtures, E2E files, live Supabase calls, visual artifacts, sprint status, or git state changed.

## Validation And Gate

- `npx vitest run test/unit/scripts/feedback-accuracy-report.test.ts` -> **1 file / 2 tests passed**.
- `npx tsc --noEmit` -> **passed**.
- `npx eslint . --quiet` -> **passed**.
- Focused Story 12.2 unit/component set:
  `npx vitest run test/unit/api/story-12-2-feedback-accuracy-loop.atdd.test.ts test/unit/story-12-2-accuracy-ops-and-cap-cleanup.atdd.test.ts test/unit/services/feedback-accuracy-report.test.ts test/unit/scripts/feedback-accuracy-report.test.ts test/unit/services/venue-feedback-persistence.test.ts test/unit/api/venue-feedback-route.test.ts test/components/FeedbackFlow.test.tsx test/unit/services/feedback-session.test.ts test/unit/mutations/useSubmitFeedback.test.tsx`
  -> **9 files / 54 tests passed**.
- Vitest emitted the existing non-fatal `--localstorage-file` warning; exit code was 0.

## Assumptions, Risks, And Deferred Coverage

- Full Vitest and targeted Playwright remain as already recorded in the story file from the implementation/review transition. This pass added one isolated unit/script test and reran the focused Story 12.2 unit/component set plus static checks.
- No visual validation was needed because public copy/layout/uncertainty labels were unchanged.
- No Pact/CDC coverage was generated because Story 12.2 has no external provider contract; Supabase access is mocked at the script boundary.

## Definition Of Done

- Existing Story 12.2 coverage was reviewed to avoid duplicate tests.
- The maintainer report script now has executable wrapper coverage rather than only source-presence assertions.
- Focused new test, focused Story 12.2 regression set, typecheck, and lint passed.
- Durable automation evidence was persisted in this summary.

## Next Recommended Workflow

Continue the orchestrator-owned Story 12.2 review/UAT/finalization flow.

---

# Automation Expansion Summary - Story 12.11 (First-Run Coach-Mark Guide)

## Preflight And Context

- **Framework:** Vitest 4.1.4 and Playwright are configured under `nextjs-app`; framework readiness passed.
- **Stack:** frontend PWA guide, persistence, settings relaunch, and forced-state behavior with no API/provider contract change.
- **Mode:** BMad-integrated from `_bmad-output/implementation-artifacts/12-11-first-run-coach-mark-guide-map-legend-feature-tour.md`.
- **Execution mode:** sequential. Existing component, E2E, axe, and message coverage was audited before adding tests.
- **Scope:** automated tests/evidence only; no production source, sprint status, auto-bmad state, visual references, or `REBASELINE-LOG.md` changed.

## Coverage Plan

| Priority | Level | Target | Decision |
| --- | --- | --- | --- |
| P0 | Component | Core map anchor fail-closed auto-start behavior. | Added a focused component regression. |
| P0 | Component | Requested step target visibility before rendering. | Added a focused component regression. |
| P0 | E2E | First-run journey, returning-user suppression, Settings relaunch, forced states, and no feedback-detail transition. | Existing coverage was sufficient; reran Story 12.11 browser spec. |
| P0 | Component/i18n | Settings row, MapView forced-state mapping, and Swedish/English message parity. | Existing coverage was sufficient; reran adjacent suite. |

## Generated Coverage

- **UPDATED** `nextjs-app/test/components/FirstRunCoachMarkGuide.test.tsx`:
  - added no-auto-start/no-seen-write coverage when required `map-surface` anchor is zero-size or unavailable;
  - added rendered-guide skip coverage from zero-size requested `time-slider` to visible `date-planner`;
  - changed a resolver-only test to use a detached container so it does not leave stale anchors in `document.body`.
- **Aggregate:** +2 focused component tests. No fixtures, helpers, API mocks, browser test files, live providers, visual artifacts, or product code changed.

## Validation And Gate

- `npx vitest run test/components/FirstRunCoachMarkGuide.test.tsx` -> **1 file / 17 tests passed**.
- `npx vitest run test/components/FirstRunCoachMarkGuide.test.tsx test/components/SettingsModal.test.tsx test/components/MapView.test.tsx test/unit/messages-parity.test.ts` -> **4 files / 162 tests passed**; non-fatal jsdom navigation warning.
- `npx tsc --noEmit` -> **passed**.
- `npx eslint . --quiet` -> **passed**.
- `npx playwright test test/e2e/story-12-11-coach-mark-guide.spec.ts --project=mobile --project=desktop --reporter=line` -> **10/10 passed**; known Next workspace-root warning and Motion reduced-motion warnings only.
- `npx vitest run` -> **207 passed / 2 skipped files; 1889 passed / 15 skipped tests**; non-fatal jsdom navigation warning.

## Assumptions, Risks, And Deferred Coverage

- No additional E2E, axe, or visual test was added because existing Story 12.11 browser, axe, and visual evidence already covers those surfaces.
- Visual validation/reference approval remains as previously recorded; no canonical reference PNG or rebaseline log changed.
- No API/Pact tests were generated because Story 12.11 has no provider contract change.

## Definition Of Done

- Existing coverage was audited and non-duplicative component gaps were filled.
- Focused, adjacent, static, Story 12.11 E2E, and full Vitest checks passed.
- Durable automation summary and story bookkeeping were refreshed.

---

# Automation Expansion Summary - Story 12.5 (Dev-Only Venue Editor)

## Preflight And Context

- **Framework:** Vitest 4.1.4 and Playwright are configured under `nextjs-app`; framework readiness passed.
- **Stack:** fullstack Next.js route handlers, service validation/store logic, TanStack Query hooks, component UI, and Playwright browser coverage.
- **Mode:** BMad-integrated from `_bmad-output/implementation-artifacts/12-5-dev-only-venue-editor-drag-pin-paste-polygon-persisted-hide-show-inline-fields.md`.
- **Execution:** sequential. The skill's worker model was not used because the active runtime instruction prohibits subagent delegation unless explicitly required.
- **Knowledge loaded:** project context, TEA config, test levels, risk priorities, test quality, data factories, fixture architecture, network-first safeguards, selector resilience, and Story 12.5 implementation/tests.

## Coverage Plan

| Priority | Level | Target | Decision |
| --- | --- | --- | --- |
| P0 | API guard | Forwarded host ambiguity was covered; forwarded proto ambiguity was not. | Add active route test and close the guard gap. |
| P1 | Query hook | Editor save by numeric id must invalidate public/editor roots and exact affected detail keys for both id and returned slug. | Add hook test and update mutation invalidation. |
| P0/P1 | Existing route/store/validator/component/E2E | Production hard deny, service-role writes, polygon/media validation, hidden public matrix, display-coordinate consumers, and editor UI already have active focused coverage. | Rerun the Story 12.5 focused suite rather than duplicate. |

## Generated Coverage

- **UPDATED** `nextjs-app/test/unit/api/story-12-5-dev-venue-editor-guard.atdd.test.ts`
  - Added forwarded-proto ambiguity coverage to the existing fail-closed guard route test.
- **UPDATED** `nextjs-app/lib/services/dev-venue-editor-guard.ts`
  - Treats `x-forwarded-proto` as ambiguous forwarded state, matching the story's fail-closed boundary.
- **NEW** `nextjs-app/test/unit/queries/useDevVenueEditor.automation.test.tsx`
  - Proves a save submitted by id invalidates `queryKeys.venues.all`, `queryKeys.venues.devVenueEditor.all()`, `queryKeys.venues.detail(id)`, and `queryKeys.venues.detail(returnedSlug)`.
- **UPDATED** `nextjs-app/hooks/queries/useDevVenueEditor.ts`
  - Invalidates exact detail keys for the submitted identifier, returned venue id, and returned venue slug.
- **Aggregate:** +1 new deterministic hook test and +1 expanded guard route assertion. No new fixtures, browser helpers, live Supabase/Met.no calls, visual references, or sprint-status edits.

## Validation And Gate

- Focused new/changed Vitest: `npx vitest run test/unit/api/story-12-5-dev-venue-editor-guard.atdd.test.ts test/unit/queries/useDevVenueEditor.automation.test.tsx` -> **2 files / 5 tests passed**.
- TypeScript: `npx tsc --noEmit` -> **0 errors**.
- Lint: `npx eslint . --quiet` -> **0 errors**.
- Focused Story 12.5 Vitest regression: `npx vitest run ...story-12-5... test/unit/queries/useDevVenueEditor.automation.test.tsx test/components/DevVenueEditor.test.tsx` -> **9 files / 36 tests passed**.
- Focused Story 12.5 Playwright: `npx playwright test test/e2e/story-12-5-dev-venue-editor.spec.ts` -> **4 tests passed** across mobile and desktop.
- Playwright emitted the existing Next workspace-root/multiple-lockfile warning; it did not fail the run.

## Assumptions, Risks, And Deferred Coverage

- No Pact/consumer contract tests were generated because Story 12.5 has no external service-provider contract; it is an internal guarded Next route/UI workflow.
- No new broad Playwright sweep was run. The story file already records the known unrelated Story 12.10 full-suite Playwright failure; this pass changed only guard and cache-invalidation behavior and reran focused Story 12.5 browser coverage.
- No visual validation was needed because gate-off user-facing UI was not changed.

## Definition Of Done

- Existing Story 12.5 coverage was reviewed to avoid duplicate tests.
- The forwarded-proto production-impossibility boundary and id-to-slug local invalidation gap are now automated.
- Focused Story 12.5 Vitest, focused Story 12.5 Playwright, typecheck, and lint passed.
- Durable automation result written here under the configured BMAD test-artifact directory.

## Next Recommended Workflow

Continue the orchestrator-owned review/test-review flow for Story 12.5.

---

# Automation Expansion Summary - Story 12.9 (Mobile Bottom-Sheet Row-Quantized Drag + Slim Time-Slider)

## Preflight And Context

- **Framework:** Vitest 4.1.4 and Playwright are configured in `nextjs-app`; framework readiness passed.
- **Stack:** frontend interaction and presentation work on the mobile row-count bottom sheet and mobile planner chrome.
- **Mode:** BMad-integrated from the Story 12.9 file. Execution was sequential because the active runtime instruction forbids proactive subagent delegation.
- **Scope:** add only meaningful, non-duplicative automated coverage for the already-reviewed Story 12.9 implementation. Story status, sprint status, auto-bmad state/report files, visual references, dev-server artifacts, and `nextjs-app/components/custom/onboarding/OnboardingGate.tsx` were not touched.
- **Knowledge loaded:** test levels, priorities, deterministic data/testing quality, selective execution, CI/burn-in guidance, fixture architecture, network-first guidance, and existing Story 12.9 component/E2E/recenter/slider-date coverage.

## Coverage Plan

| Priority | Level | Target | Decision |
| --- | --- | --- | --- |
| P0 | Component | Row-count bottom sheet must clamp caller state into `0..maxRows`, keep data hooks truthful, and notify the parent when the computed viewport cap is lower than requested rows. | Add one focused component boundary test. |
| P0 | E2E/touch | Real-touch row walking, row-origin drag, scroll ownership, fling, reduced motion, keyboard ladder, and map interactivity behind `N=0`. | Already covered by `epic-11-sheet-touch-gestures.spec.ts`; no duplicate browser test added. |
| P0 | Unit/component | Recenter padding, forced state handling, slider/date semantics, mobile panel geometry, and production-inert `_sheetRows`/`_sheetDrag` params. | Existing focused tests cover these surfaces; rerun full Vitest rather than manufacture overlap. |

## Generated Coverage

- **UPDATED** `nextjs-app/test/components/MobileBottomSheet.test.tsx` with one P0 test:
  - renders an intentionally out-of-range `visibleRows=9` against a computed `maxRows=3`,
  - asserts `data-max-rows`, `data-visible-rows`, and `data-sheet-height` reflect the capped row model,
  - asserts `onVisibleRowsChange(3)` is emitted so the parent state is corrected.
- **Aggregate:** +1 deterministic component test. No fixtures, helpers, browser sessions, API mocks, visual artifacts, or production source changes were introduced.

## Validation And Gate

- Baseline before edits: `npx tsc --noEmit` -> **0 errors**; `npx eslint . --quiet` -> **0 errors**.
- Focused suite: `npx vitest run test/components/MobileBottomSheet.test.tsx` -> **1 file / 14 tests passed**.
- TypeScript after edits: `npx tsc --noEmit` -> **0 errors**.
- Lint after edits: `npx eslint . --quiet` -> **0 errors**.
- Full unit/component suite: `$env:VITEST_MAX_WORKERS='4'; npx vitest run` -> **194 passed / 2 skipped files; 1,777 passed / 15 skipped tests**.
- Vitest emitted the existing jsdom `Not implemented: navigation to another Document` warning after the green summary; exit code was 0.

## Assumptions, Risks, And Deferred Coverage

- No missing Story 12.9 browser coverage was identified beyond the existing touch, map-primary, axe-mobile, MapView, recenter, and slider/date suites.
- Playwright was not rerun because this pass added a component-level boundary assertion only and the story file already records passing Story 12.9 browser gates.
- No deferred Story 12.9 automation work remains from this pass.

## Definition Of Done

- Existing Story 12.9 automated coverage was reviewed for duplication risk.
- One focused max-row cap boundary test was added.
- Focused test, typecheck, lint, and full Vitest passed.
- Durable automation result written here under the configured BMAD test-artifact directory.

## Next Recommended Workflow

Continue the orchestrator's review flow for Story 12.9.

# Automation Expansion Summary - Story 12.13 (Remove User-Facing Confidence Indicator)

## Preflight And Context

- **Framework:** Vitest 4.1.4 and Playwright are configured in `nextjs-app`; framework readiness passed.
- **Stack:** frontend/public presentation boundary with retained internal API/service confidence evidence.
- **Mode:** BMad-integrated from the Story 12.13 file. Execution was sequential to avoid concurrent edits in the shared worktree.
- **Scope:** expand automated coverage after the implementation removed public confidence from visible, accessible-name, sr-only, route-overlay, card/list, QuickInfo, detail, and i18n surfaces. Production code, sprint status, Auto-BMAD state, visual references, and git state remained outside this delegate's ownership.
- **Knowledge loaded:** test levels, risk priorities, deterministic data factories, selective execution, CI burn-in guidance, test quality, fixture architecture, network-first guidance, and selector-resilience guidance.

## Coverage Plan

| Priority | Level | Target | Decision |
| --- | --- | --- | --- |
| P0 | Component | Card/list, QuickInfo, detail, and route overlay expose no visible or sr-only confidence while preserving amber `N% sol`, weather, distance, sky, and uncertainty copy. | Existing implementation tests are already direct and broad; rerun targeted regression set rather than duplicate browser coverage. |
| P0 | Unit/source guard | Public UI and message namespaces must not reintroduce confidence display copy, helper imports, or confidence-specific props. | Add a narrow source/i18n boundary guard. |
| P0 | Unit/source guard | Internal confidence must remain available for API DTO transition data, feedback evidence, route schema compatibility, and server-side model computation. | Add positive retention assertions in the same boundary guard so a future cleanup cannot delete internal evidence by overfitting the no-public-confidence rule. |
| P1 | E2E/browser | Map/list/favourites/route/visual surfaces. | No new E2E added: existing MapView/component tests and the completed visual candidate/rebaseline workflow cover browser-facing behavior; adding another Playwright path would duplicate the visual gate. |

## Generated Coverage

- **UPDATED** `nextjs-app/test/unit/removed-i18n-keys.test.ts` with one additional Story 12.13 guard:
  - scans public UI source after stripping comments for numeric confidence display copy and removed display plumbing,
  - verifies `VenueDataDto.confidence` remains documented as non-rendering transition data,
  - verifies feedback-session still stamps `confidenceAtPrediction` from internal confidence,
  - verifies feedback route schema still accepts bounded `confidenceAtPrediction`,
  - verifies server-side confidence calculator exports remain intact.
- **Aggregate:** +1 P0 source-boundary test. No fixtures, factories, helpers, API mocks, browser sessions, live Met.no calls, or production Supabase calls were introduced.

## Validation And Gate

- **Targeted regression suite:** `npx vitest run test/unit/removed-i18n-keys.test.ts test/components/VenueCard.test.tsx test/components/VenueList.test.tsx test/components/VenueQuickInfo.test.tsx test/components/VenueDetailContent.test.tsx test/components/RouteOverlay.test.tsx test/unit/services/feedback-session.test.ts test/components/FeedbackFlow.test.tsx` → **8 files / 129 tests passed**.
- **TypeScript:** `npx tsc --noEmit` → **0 errors**.
- **Lint:** `npx eslint . --quiet` → **0 errors**.
- **Full unit/component suite:** `$env:VITEST_MAX_WORKERS='4'; npx vitest run` → **188 passed / 2 skipped files; 1,761 passed / 15 skipped tests**.
- Vitest emitted the existing jsdom `Not implemented: navigation to another Document` warning after the green summary; exit code was 0.
- No Playwright CLI sessions or browser exploration were opened, so no session cleanup was required.

## Assumptions, Risks, and Deferred Coverage

- The user-approved Story 12.13 visual rebaseline/candidate evidence is handled by the orchestrator; this automation pass did not copy reference PNGs or update visual artifacts.
- Public `confidence` remains in the DTO as explicitly documented non-rendering transition data for feedback evidence. Retiring the field is deferred until Story 12.2 feedback/evidence fields can replace it safely.
- No additional E2E was added because existing MapView, component, a11y, and visual evidence already cover the public surfaces; the new value is the cheap boundary guard against broad reintroduction.

## Definition Of Done

- Existing Story 12.13 coverage was reviewed to avoid duplicate tests.
- One deterministic P0 source-boundary guard was added.
- Focused tests, typecheck, lint, and full Vitest passed.
- Durable automation result written here under the configured BMAD test-artifact directory.

## Next Recommended Workflow

Run `test-review` or continue the orchestrator's Tier A review/landing flow for Story 12.13.


# Automation Expansion Summary — Story 10.1 (Cloud-Gated Sun State & Weather-Truth Fixes)

## Preflight & Context
- **Framework:** Vitest 4.1.4 (`nextjs-app/vitest.config.ts`) + Playwright present. Verified — no HALT.
- **Stack:** fullstack (Next.js frontend + server-only sun engine). Story 10.1 is the ENGINE half of Epic 10 — server-only, env-gated (`SUNNYSEAT_SUN_ENGINE=real`), zero UI. All targets are unit-level engine surfaces; no e2e (that is Story 10.5).
- **Mode:** BMad-Integrated (story with AC1–AC4 + rich Dev Notes / Test Surfaces). Sequential generation (single cohesive engine surface).

## Existing coverage reviewed (to avoid duplication)
The four AC-driven ATDD scaffolds + two supporting suites already prove all four ACs on their headline paths:
- `sun-engine.cloud-gate.atdd.test.ts` — `applyCloudGate` (Sunny/Partial-above ⇒ gated, NoSun/Shaded untouched, unknown/null no-gate, exact `>=` boundary), end-to-end gate + geometric-layer preservation, cache consistency.
- `met-no-service.cloud-gate.atdd.test.ts` — missing `cloud_area_fraction` ⇒ unknown, never 0/100/clear; known-cloud path preserved.
- `confidence-calculator.cloud-gate.atdd.test.ts` + `confidence-calculator.test.ts` — FR12 cloud sensitivity, **monotonicity across [0,25,50,75,100]**, unknown-neutral, byte-identical no-weather pin. Assessed as comprehensive — NOT expanded.
- `venues-route.cloud-gate.atdd.test.ts` + `venues-route-real-engine.test.ts` — sanitizer round-trip + `SUN_STATUS_ORDER` sort-rank invariant (no NaN), CloudObscured sorts between Partial and Shaded through the route.

## Gaps Identified & Filled
New file: **`nextjs-app/test/unit/services/sun-engine.cloud-gate.coverage.test.ts`** (9 tests). Residual branch/edge gaps the scaffolds intentionally left, no duplication:

| # | Gap | Priority |
| - | --- | -------- |
| 1 | `skyConditionFromCloudCover(undefined)` ⇒ `'unavailable'` — AC2 unknown branch of the pure mapper (existing pure-mapper test only covers 0..100 numeric boundaries; `undefined` never asserted). Also pins that `undefined` ≠ known `0`. | P1 |
| 2 | `applyCloudGate` idempotency — `CloudObscured` in ⇒ stays `CloudObscured` under overcast, below-threshold, and unknown (helper documents "already gated stays gated" but ATDD never re-feeds it). | P2 |
| 3 | `applyCloudGate` Partial-below-threshold stays `Partial` (ATDD only drove the Sunny-below case). | P2 |
| 4 | `applyCloudGate` defensive out-of-range cover: `>100` still gates (`>=` semantics), `<0` does not, no throw. | P3 |
| 5 | End-to-end FORECAST gating — overcast `isForecast:true` slice gates to `CloudObscured` (geometric layer preserved); clear forecast does not gate. Pins the Story-10.4 seam per Dev Notes ("Gating on forecast cloud is correct and intended… do not special-case forecast here"). Injected via `getForecastOverride` — the documented seam, no live Met.no. | P1 |

Mock boundary mirrors the ATDD scaffold (deepest adapters only). Threshold assertions read `CLOUD_GATE_THRESHOLD_PERCENT` so a re-tune cannot break them (epic-10 test-design "assert relative behaviour" discipline).

## Validation / Gate
- `npx tsc --noEmit` → **0 errors**
- `npx eslint <new file>` → **0 errors**
- `npx vitest run` → **112 files / 993 tests, all passing, 0 skipped** (story HEAD was 111 files / 984 tests → net **+1 file / +9 tests**, none dropped, none regressed).
- Default seed path (flag OFF, as CI runs it) untouched — no CI-path change; test-only addition.
- (`Not implemented: navigation to another Document` in vitest output is a benign pre-existing jsdom log, not a failure.)

---

# Automation Expansion Summary - Story 12.12 (Venue Photos Supabase Storage Hosting + Render/Fallback Fixes)

## Preflight And Context

- **Framework:** Vitest 4.1.4 and Playwright are configured in `nextjs-app`; framework readiness passed.
- **Stack:** fullstack Next.js with server DTO/sanitizer, Supabase Storage migration/tooling, React photo surfaces, forced visual states, and Playwright E2E/a11y coverage.
- **Mode:** BMad-integrated from the Story 12.12 file. Execution was sequential because the active delegate instructions constrain subagent use and the remaining gaps were tightly scoped.
- **Scope:** expand automated coverage for Story 12.12 without changing sprint status, visual references, or unrelated production behavior. One narrow production sanitizer correction was made because the new exact-path test exposed an acceptance-contract defect.
- **Knowledge loaded:** test levels, risk priorities, deterministic data factories, selective execution, CI/burn-in, test quality, fixture architecture, network-first safeguards, Playwright utility guidance, Pact guidance (not applicable), and project context.

## Coverage Plan

| Priority | Level | Target | Decision |
| --- | --- | --- | --- |
| P0 | Unit/service | Venue-media public URL convention must be exact: configured origin, bucket, slug, version, rendition filename, no query/hash, and no empty/trailing path segments. | Added direct sanitizer/build assertions and fixed the empty-segment acceptance defect. |
| P0 | Unit/source guard | Runtime venue photo sources must not reintroduce external legacy photo hosts such as Unsplash/Google/Pexels/Pixabay. | Added a focused source guard over runtime fixture/forced-state/render files. |
| P0 | Unit/tooling | Maintainer upload validation must prove real byte/dimension caps, optimized WebP metadata handling, raw-original path rejection, immutable object keys, and create-only duplicate-key refusal. | Added temp-file WebP metadata tests plus a mocked Supabase Storage duplicate-key test. |
| P1 | Browser/E2E | Loaded/fallback state journeys and desktop axe. | No new Playwright added: existing Story 12.12 E2E, desktop axe, and intentional mobile `fixme` coverage already cover browser behavior; this pass did not edit browser specs. |

## Generated Coverage

- **UPDATED** `nextjs-app/test/unit/services/story-12-12-venue-media-contract.atdd.test.ts` with 2 P0 tests:
  - exact Supabase public object URL build/sanitize contract, including query/hash, rendition drift, double slash, and trailing slash rejection,
  - runtime-source guard against external legacy photo hosts.
- **UPDATED** `nextjs-app/test/unit/story-12-12-storage-upload-and-policy.atdd.test.ts` with 4 P0 tests:
  - raw/original path rejection,
  - valid optimized card/hero rendition plan and immutable object key metadata,
  - over-size and over-dimension card/hero rejection,
  - create-only duplicate-key refusal before upload with mocked Supabase Storage.
- **UPDATED** `nextjs-app/lib/utils/venue-media.ts` to reject empty path segments in new Supabase `cardUrl`/`heroUrl` values; this closes the exact-key convention defect surfaced by the new test.
- **Aggregate:** +6 tests, bringing the focused Story 12.12 Vitest suite from 24 to 29 tests and the full suite from 1,785 to 1,790 tests.

## Validation And Gate

- Focused Story 12.12 suite: `npx vitest run test/unit/services/story-12-12-venue-media-contract.atdd.test.ts test/unit/story-12-12-storage-upload-and-policy.atdd.test.ts test/unit/story-12-12-visual-state-contract.atdd.test.ts test/components/story-12-12-venue-photo-surfaces.atdd.test.tsx` -> **4 files / 29 tests passed**.
- TypeScript: `npx tsc --noEmit` -> **0 errors**.
- Lint: `npx eslint . --quiet` -> **0 errors**.
- Full unit/component suite: `$env:VITEST_MAX_WORKERS='4'; npx vitest run` -> **192 passed / 2 skipped files; 1,790 passed / 15 skipped tests**.
- Vitest emitted the existing jsdom `Not implemented: navigation to another Document` warning after the green summary; exit code was 0.
- No Playwright CLI/browser sessions were opened because `playwright-cli` was not installed and no browser specs changed.

## Assumptions, Risks, And Deferred Coverage

- Protected Supabase live policy verification remains unavailable without credentials; local SQL/text tests and mocked Storage API coverage were expanded, but no live read/write proof is newly claimed.
- Existing Story 12.12 Playwright forced-state and desktop axe evidence remains the browser-layer signal; mobile photo axe scans intentionally remain `fixme` for inherited contrast debt and were not weakened.
- No sprint-status or visual-reference files were changed in this automation pass.

## Definition Of Done

- Existing ATDD, E2E, and a11y coverage was reviewed to avoid duplicate/no-value browser tests.
- Six deterministic P0 tests were added across existing Story 12.12 ATDD files.
- The single production change was the minimal sanitizer correction required by the accepted media URL convention.
- Focused tests, typecheck, lint, and full Vitest passed.
- Durable automation result written here under the configured BMAD test-artifact directory.

## Next Recommended Workflow

Run `test-review` or continue the orchestrator's post-review landing flow for Story 12.12.

---

# Automation Expansion Summary — Story 10.2 ("Sun Behind Clouds" Two-Signal UI State)

## Preflight & Context
- **Framework:** Vitest 4.1.4 (`nextjs-app/vitest.config.ts`) + Playwright present. Verified — no HALT.
- **Stack:** fullstack (Next.js). Story 10.2 is the **UI half** of Epic 10 — 100% client render + i18n + one dev-only forced-state normalizer; zero engine/route/store change (10.1 owned all of that). All targets are component- and unit-level. No new API endpoint or e2e journey; the obscured e2e/axe surface already exists (Task 5). E2E weather-mock remains Story 10.5.
- **Mode:** BMad-Integrated (story with AC1–AC4 + rich Dev Notes / Test Surfaces). **Execution mode: sequential** — a narrowly-scoped, purely-additive coverage top-up on existing component/unit surfaces; no API/E2E fan-out to farm to subagents, so tests were authored inline (the deterministic sequential fallback of step-03).

## Existing coverage reviewed (to avoid duplication)
Story 10.2 shipped strong AC-headline coverage already — NOT re-created:
- `sun-status-presentation.test.ts` — `toSunStatusToken` full mapping + distinctness, `isObscuredSunStatus` (incl. `undefined`), `skyConditionCopy` (known + `unavailable`/`undefined`/`rain`/unknown → null). **Comprehensive — not expanded.**
- `VenueList.test.tsx` — obscured sort RELATIVE ordering both ways (high-solläge obscured > low-solläge partial; low-solläge obscured < partial), muted label, single-aria de-dup — via full render.
- `VenueCard.test.tsx` — four states distinct on the compact card, AC2 position reframe on the non-compact card.
- `VenuePin` / `VenuePinLayer` — obscured pill distinct + no selection-morph; `pinObscuredAria` (exactly once, solläge preserved).
- `VenueQuickInfo` / `VenueDetailContent` — muted headline + sky line + `unavailable`→no-line + sunny-unchanged behaviour gate.
- `axe.spec.ts` (desktop) — obscured quick-info + detail scans active + green.

## Gaps Identified & Filled
Residual branch/boundary gaps the AC-headline (render-level) tests left, no duplication:

| # | Gap (previously uncovered) | Level | Priority | Where |
| - | -------------------------- | ----- | -------- | ----- |
| 1 | `getVenueSunRankForList` exact **tie boundaries**: 100%-solläge obscured **ties** Sunny (rank 2); 50% **ties** Partial (rank 1) → the render sort tests only proved strict `>`/`<`, never the equal-rank case where the **distance tiebreak** decides. | Unit | P1 | `VenueList.rank.test.ts` |
| 2 | `getVenueSunRankForList` **non-finite / undefined solläge** on an obscured venue → **0, never NaN** (a NaN rank would corrupt the `Array.sort` comparator → unstable order). | Unit | P1 | `VenueList.rank.test.ts` |
| 3 | `getVenueSunRankForList` **out-of-range clamp**: >100 does not exceed the Sunny(2) ceiling; <0 clamps to 0. | Unit | P2 | `VenueList.rank.test.ts` |
| 4 | `isVenueSunnyForList` **direct** assertion: obscured → `false` even at 100% solläge (the AC1 amber-chrome guard, only tested indirectly before). | Unit | P1 | `VenueList.rank.test.ts` |
| 5 | `sortVenuesForList` tie broken by **distance** for equal-rank obscured/Sunny (integration of #1). | Component/int | P2 | `VenueList.rank.test.ts` |
| 6 | `VenueCard` **confidence-chip suppression under the gate** (Completion Note #2 / AC1): the amber `text-amber-text` chip is hidden for obscured — a regression re-adding amber chrome would slip past the label-only headline tests. | Component | P1 | `VenueCard.test.tsx` |
| 7 | `VenueCard` obscured **thumbnail badge** uses `bg-pin-obscured` (cloud icon), never the amber sun badge (AC1). | Component | P2 | `VenueCard.test.tsx` |
| 8 | `VenueDetailContent` **fallback-timeline potential** (Completion Note #3 / AC2): an obscured venue with a `sunWindow` and **no loaded `detail`** → `timelineFromListVenue` maps the window to `Partial` so the "when it clears" potential renders (labelled "Delvis sol …") rather than a transparent shaded bar. The real-detail obscured test always passes an explicit `detail`, so this fallback branch was uncovered. | Component | P1 | `VenueDetailContent.test.tsx` |

All rank assertions are RELATIVE / boundary, never an absolute magic number (epic-10 "a gate re-tune survives" convention). No live Met.no / real-network weather in any added test; obscured state is constructed purely from props/fixtures.

## Files Created / Updated
- **NEW** `nextjs-app/test/components/VenueList.rank.test.ts` — 10 tests: obscured-solläge rank ties/clamps/NaN-guard + distance-tiebreak sort integration + `isVenueSunnyForList` amber guard (gaps #1–#5, #4).
- **UPDATED** `nextjs-app/test/components/VenueCard.test.tsx` — +2 tests: confidence-chip suppression under the gate; muted-slate thumbnail badge (gaps #6, #7).
- **UPDATED** `nextjs-app/test/components/VenueDetailContent.test.tsx` — +1 test: obscured fallback-timeline potential renders as Partial, not a shaded bar (gap #8).

## Validation / Gate
- `npx tsc --noEmit` → **0 errors**
- `npx eslint <changed test files>` → **0 errors / 0 warnings**
- `npx vitest run` → **114 files / 1026 tests, all passing, 0 skipped** (Story 10.2 completion HEAD was 113 files / 1013 tests → net **+1 file / +13 tests**, none dropped, none regressed).
- Test-only addition — no source, engine, route, store, i18n, or CI-path change.
- Observation (not in scope for this coverage pass): `VenueQuickInfo` keeps the amber `text-amber-text` confidence chip visible on an obscured card (line ~278), unlike `VenueCard` which suppresses it (Completion Note #2). Both are AA-gated by the existing desktop axe scan, but this is a minor amber-chrome inconsistency under the gate worth a maintainer glance.

## Next recommended workflow
`trace` (traceability matrix / quality-gate decision for Story 10.2) or `test-review` (quality validation of the new + existing obscured suites).

---

# Automation Expansion Summary — Story 10.3 (Layered Cloud Detail — Met.no `complete` + Effective Cover)

## Preflight & Context
- **Framework:** Vitest 4.1.4 (`nextjs-app/vitest.config.ts`) + Playwright present. Verified — no HALT.
- **Stack:** frontend/Next.js with server-only sun engine. Story 10.3 is **Tier 1** of Epic 10 "Honest Sky" — a backend/data story: switches the Met.no fetch to the `complete` endpoint, carries the three-layer cloud split on `WeatherSlice`, and feeds a layer-weighted **effective cloud cover** into BOTH the Story 10.1 gate and the FR12 confidence blend. **NO UI / i18n / e2e** (the deterministic mocked-weather e2e matrix is Story 10.5). All targets stayed UNIT-level.
- **Mode:** BMad-Integrated (story with AC1–AC3 + rich Dev Notes / Test Surfaces). **Sequential** — a narrow, additive top-up on the four existing 10.3 unit surfaces; no API/E2E fan-out to farm out.

## Existing coverage reviewed (to avoid duplication)
The story shipped a strong AC-driven matrix — NOT re-created:
- `effective-cloud-cover.test.ts` (14) — 100%-high-not-gating / 100%-low-gating / medium-gating / ordering / 100/100/100-clamp / 0-clear / full-vs-partial fallback / total-undefined ⇒ undefined / null slice.
- `sun-engine.cloud-gate.atdd.test.ts` [10.3 block, 3] — end-to-end cirrus-doesn't-gate (skyCondition still overcast) / low-deck-gates / partial-split Tier-0 fallback.
- `met-no-service.cloud-gate.atdd.test.ts` [10.3 block, 4] — `complete` URL / full-split mapping / partial-split ⇒ undefined bands / compact-shaped total-only.
- `confidence-calculator.cloud-gate.atdd.test.ts` [10.3 block, 3] — cirrus > low-deck confidence ordering / partial-split ≡ Tier-0 / unknown stays neutral. **Assessed comprehensive — not expanded.**

## Gaps Identified & Filled
Residual algebraic edges + per-entry-mapping gaps the AC matrix intentionally left. All RELATIVE to the weight constants / threshold (epic-10 "a re-tune survives" discipline), never a bare magic number:

| # | Gap (previously uncovered) | Level | Priority | Where |
| - | -------------------------- | ----- | -------- | ----- |
| 1 | Clamp **lower bound**: a sub-zero band glitch floors at 0 (`Math.max(0,…)` branch was untested) — never a negative gate input. | Unit | P2 | `effective-cloud-cover.test.ts` |
| 2 | **Additive** two-band weighting (low+high summed, not max'd) — the summed term is strictly > the low-only reading. | Unit | P1 | `effective-cloud-cover.test.ts` |
| 3 | **Medium ≡ Low** parity (both weight 1.0) — same coverage in either band yields the same effective cover; catches a silent divergence on re-tune. | Unit | P2 | `effective-cloud-cover.test.ts` |
| 4 | **Strict-undefined vs falsy**: all-three-layers present as `0` runs the weighting (→0), does NOT fall back to a non-zero total — guards the `=== undefined` check against a `0`-trips-fallback bug. | Unit | P1 | `effective-cloud-cover.test.ts` |
| 5 | **Weight-ordering invariant** meta-guard: `HIGH < LOW` and `HIGH < MEDIUM` (and `HIGH > 0`) — a re-tune inverting cirrus-vs-stratus intent fails at the constant level; plus the gate-vs-weights derivation. | Unit | P1 | `effective-cloud-cover.test.ts` |
| 6 | **Per-entry** three-layer mapping across a MULTI-hour `complete` forecast (full / cirrus-only / partial / compact-shaped hours) — one entry's missing band never bleeds into another. The AC1 mapping tests were all single-entry. | Unit | P1 | `met-no-service.cloud-gate.atdd.test.ts` |
| 7 | **Additive effective cover through the engine**: a full low deck under cirrus still gates; cirrus over a thin (20%) low haze stays below the gate (no false gate). Complements the helper-level additive test end-to-end. | Unit | P2 | `sun-engine.cloud-gate.atdd.test.ts` |

## Files Updated (all test-only, additive)
- **UPDATED** `nextjs-app/test/unit/solar/effective-cloud-cover.test.ts` — +6 tests (gaps #1–#5; imported `CLOUD_WEIGHT_LOW`/`_MEDIUM`).
- **UPDATED** `nextjs-app/test/unit/weather/met-no-service.cloud-gate.atdd.test.ts` — +1 test (gap #6).
- **UPDATED** `nextjs-app/test/unit/services/sun-engine.cloud-gate.atdd.test.ts` — +2 tests (gap #7).

## Validation / Gate
- `npx tsc --noEmit` → **0 errors**
- `npx eslint <the 3 changed test files>` → **0 errors / 0 warnings**
- `npx vitest run` → **115 files / 1060 tests, all passing, 0 skipped** (Story 10.3 completion HEAD was 115 files / 1051 tests → net **+9 tests**, none dropped, none regressed).
- Test-only addition — no source, engine, route, store, i18n, or CI-path change. Default seed path (flag OFF, as CI runs it) untouched.
- (`Not implemented: navigation to another Document` in vitest output remains a benign pre-existing jsdom log, not a failure.)

## Next recommended workflow
`trace` (traceability matrix / quality-gate decision for Story 10.3) or `test-review` (quality validation of the new + existing layered-cloud suites).

---

# Automation Expansion Summary — Story 10.4 (Rain-Now Signal — Met.no Nowcast 2.0)

## Preflight & Context
- **Framework:** Vitest 4.1.4 (`nextjs-app/vitest.config.ts`) + Playwright present. Verified — no HALT.
- **Stack:** fullstack (Next.js) with server-only sun engine. Story 10.4 is **Tier 2** of Epic 10 "Honest Sky" — a backend/data story: adds a Met.no Nowcast 2.0 client (`getNowcastPrecipitationRate`), a one-way additive rain gate (`applyCloudGate` rain OR-term), the `skyCondition='rain'` precedence + copy, an AC4 future-horizon skip, and a list-route nowcast deduper. **NO new screen** (rain reuses the 10.2 obscured chrome). All targets stayed UNIT-level; **e2e intentionally NOT touched** (the deterministic mocked-weather e2e matrix + live spot-check is Story 10.5).
- **Mode:** BMad-Integrated (story with AC1–AC4 + rich Dev Notes / Test Surfaces). **Sequential** — a narrow, additive top-up on the existing 10.4 unit surfaces; no API/E2E fan-out to farm out.

## Existing coverage reviewed (to avoid duplication)
The dev-story un-skipped a strong AC-driven matrix — NOT re-created:
- `nowcast-service.cloud-gate.atdd.test.ts` [AC1, 9] — `/nowcast/2.0/complete` URL + 4-dp coords / shared identifying UA / 0.4⇒0.4 / genuine 0 / absent field⇒undefined / non-`ok` coverage marker⇒undefined / non-OK HTTP / thrown fetch / empty timeseries — all single-entry synthetic responses, no network.
- `sun-engine.cloud-gate.atdd.test.ts` [10.4 AC2/AC3/AC4 blocks] — rain-forces-gate + `skyCondition='rain'` + geometry preserved / rain over below-horizon stays NoSun / no-rain(0)+overcast still CloudObscured / no-rain(0)+clear+below-horizon stays NoSun / undefined≡0 / no-override lazy path / beyond-`NOWCAST_HORIZON_MS` not called + not gated / inside-horizon called + gates / past `requestedAt` not called. **Assessed comprehensive — not expanded.**
- `sun-status-presentation.rain.cloud-gate.atdd.test.ts` + `sun-status-presentation.test.ts` — `skyConditionCopy('rain', …)` renders plain-language copy, no meteorology internals, others unchanged, unavailable/undefined/unknown → null.
- `messages-parity.test.ts` + the two component fixtures — sv/en `rain` sky keys, `sky` shape gains `rain`.

## Gaps Identified & Filled
Residual branch/edge gaps the AC matrix structurally could not reach (single-entry fixtures, an untested deduper twin, an optional-param back-compat contract). All assert INTENT / relative behaviour (unknown ≠ 0; re-tunable `NOWCAST_HORIZON_MS` never hard-coded):

| # | Gap (previously uncovered) | Level | Priority | Where |
| - | -------------------------- | ----- | -------- | ----- |
| 1 | `nearestToNowEntry` **multi-entry** selection — the near-now rate is the entry nearest the real clock, not the first or last; a nearer FUTURE step wins over a farther past one. The AC1 suite used only single-entry responses. | Unit | P1 | `nowcast-service.coverage.test.ts` |
| 2 | `nearestToNowEntry` **Invalid-Date defensiveness** — an unparseable `entry.time` is SKIPPED (nearest parseable selected, never the NaN slice's rate); all-unparseable falls back to the FIRST entry (never NaN-select / throw). [8.5-R1 folded-in guard] | Unit | P1 | `nowcast-service.coverage.test.ts` |
| 3 | **Unknown-vs-0 on the SELECTED near-now entry** — the nearest entry's absent `precipitation_rate` returns `undefined` (never a neighbour's 0, never a fabricated 0). Single-entry AC1 tests could not exercise the "which entry's field" question. | Unit | P1 | `nowcast-service.coverage.test.ts` |
| 4 | **Default-coordinate accessor** — `getNowcastPrecipitationRate()` with no args defaults to Gothenburg (4-dp truncated). The fixed-coordinate AC1 tests never hit the default-param path. | Unit | P2 | `nowcast-service.coverage.test.ts` |
| 5 | `createDedupedNowcastFetcher` **coalescing** — co-located venues share ONE upstream nowcast request per ≤4-dp key (TOS-hygiene, Task 5); only the forecast twin was tested. | Unit | P1 | `sun-engine.test.ts` |
| 6 | `createDedupedNowcastFetcher` **undefined pass-through / no-eviction** — a transient `undefined`-resolving underlying coalesces to the correct per-venue "unknown → non-gating" degrade for every co-located caller. | Unit | P1 | `sun-engine.test.ts` |
| 7 | `applyCloudGate` **3-arg back-compat** — the optional 4th `isRaining` defaults to `false` (dev-flagged deliberate deviation): a 3-arg call is byte-identical to an explicit `false` and never fabricates a rain gate. | Unit | P2 | `sun-engine.test.ts` |

## Files Created / Updated (all test-only, additive)
- **NEW** `nextjs-app/test/unit/weather/nowcast-service.coverage.test.ts` — 6 tests (gaps #1–#4).
- **UPDATED** `nextjs-app/test/unit/services/sun-engine.test.ts` — +4 tests (gaps #5–#7); added `applyCloudGate` + `createDedupedNowcastFetcher` imports.

## Validation / Gate
- `npx tsc --noEmit` → **0 errors**
- `npx eslint <changed test files>` → **0 errors / 0 warnings**
- `npx vitest run` → **118 files / 1099 tests, all passing, 0 skipped** (Story 10.4 completion HEAD was 117 files / 1089 tests → net **+1 file / +10 tests**, none dropped, none regressed).
- Test-only addition — no source, engine, route, store, client, or CI-path change. Default seed path (flag OFF, as CI runs it) untouched.
- Authoring note: initial "all-unparseable time" fixtures used strings (`garbage-1`) that JS `Date` partially parses to valid 2001 dates; switched to genuinely unparseable strings so gap #2's fallback branch is truly exercised.
- (`Not implemented: navigation to another Document` in vitest output remains a benign pre-existing jsdom log, not a failure.)

## Next recommended workflow
`trace` (traceability matrix / quality-gate decision for Story 10.4) or `test-review` (quality validation of the new + existing rain-now suites).

---

# Automation Expansion Summary — Story 11.1 (Client-Side Day-Series — Instant Time Scrubbing)

## Preflight & Context
- **Framework:** Vitest 4.1.4 (`nextjs-app/vitest.config.ts`) + Playwright present. Verified — no HALT.
- **Stack:** fullstack (Next.js frontend + server-only sun engine). Story 11.1 is the Epic-11 FOUNDATION: engine per-step day-series producer + whole-day cache, `sunDaySeries` on the real-engine list DTO, a pure client derivation helper, and a query-key decouple (scrub = 0 fetches; date change = 1). Landed with all 6 ATDD scaffolds green (1150 pass / 0 skip; tsc + eslint clean).
- **Mode:** BMad-Integrated (story + 6 ATDD scaffolds + Epic-11 test-design). **Sequential** — a tightly-scoped edge/error-path top-up on a small set of pure functions with clear untested branches; no API/E2E fan-out warranting subagents.

## Existing coverage reviewed (to avoid duplication — NOT re-created)
The 6 landed ATDD suites cover the AC-headline happy paths and are left untouched:
- `venue-day-series.derivation.atdd.test.ts` — pure exact-step lookup per output surface + purity/no-server-import.
- `sun-engine.day-series-parity.atdd.test.ts` — per-step byte-parity with the single-shot compute + per-step Epic-10 gate + explicit `isRaining` under the horizon rule.
- `venues-route-day-series.atdd.test.ts` — real-engine DTO carries the series, seed/detail byte-identical, ETag/304, gzipped payload measured (1769 B) + guard (8000 B).
- `sun-engine-day-series-cache.atdd.test.ts` — same-bucket hit / new-weather-bucket recompute / degraded-not-pinned (end-to-end through the producer).
- `venue-day-series-query-key.atdd.test.ts` — same-date scrub keeps the key; date/location flips it.
- `epic-11-scrub-zero-fetch.spec.ts` (e2e) — request-count invariant (owned/extended by Story 11.8; NOT expanded here per the story).

## Gaps Identified & Filled (edge cases / error paths / boundaries the scaffolds left open)

| # | Gap | Level | Priority | File |
|---|-----|-------|----------|------|
| G1 | `deriveVenueSunAtMinutes` **null/fallback branches** — the ATDD wrapper makes a `null` THROW, so the documented fallback (undefined/empty/non-array series, sparse-series missing step → `null` so MapView keeps the server single-instant fields) was never asserted; plus internal snapping of an unsnapped input, exact 06:00/21:00 boundaries, out-of-range clamp, and NaN-safe. | Unit | P1 | `test/unit/utils/venue-day-series.edge.test.ts` (9) |
| G3 | Cache **key builders** `weatherRefreshBucketMs` / `sunDaySeriesCacheKey` — the R-012 bucket floor at the exact window edge (no off-by-one), epoch-grid alignment, and full disambiguation (venue / day / weather-bucket / elevation variant) + the whole-day "no per-instant component" invariant. Only exercised indirectly before. | Unit | P1 | `test/unit/services/sun-engine-cache.day-series-key.test.ts` (9) |
| G4 | Route **degrade path** (the whole reason `sunDaySeries` is optional) — a THROWING `computeVenueDaySeries` must NOT 500, must OMIT the series for the affected venue (keeping the single-instant fields), must isolate the failure per-venue (others keep their 61-entry series), and still emit a valid ETag/304. The green DTO ATDD only stubbed the producer to RESOLVE. | API | P0 | `test/unit/api/venues-route-day-series-degrade.test.ts` (3) |
| G5 | `useVenueSearch` **`isLiveNow` boundary** (the BREAKING-CHANGE headline) — live-now OMITS date/time from the request yet keys on `date` and POLLS; flipping isLiveNow true→false on the SAME date fires ZERO additional fetches; off-live sends date+time and disables polling. The existing suite never passes `isLiveNow`. | Unit (hook) | P0 | `test/unit/queries/useVenueSearch.day-series-key.test.tsx` (6) |

(Deliberately NOT added: a standalone reference re-implementation of `applyDaySeriesDerivation`'s override rule — it is covered end-to-end by `MapView.test.tsx` + G1's derivation edges, and a duplicated reference would risk drift from the source. Engine parity/gate internals already byte-covered. Live p95 (AC4) is a maintainer `needs-human` per the story, not a CI test.)

## Files Created (all test-only, additive)
- **NEW** `test/unit/utils/venue-day-series.edge.test.ts` — 9 tests (G1).
- **NEW** `test/unit/services/sun-engine-cache.day-series-key.test.ts` — 9 tests (G3).
- **NEW** `test/unit/api/venues-route-day-series-degrade.test.ts` — 3 tests (G4).
- **NEW** `test/unit/queries/useVenueSearch.day-series-key.test.tsx` — 6 tests (G5).

## Validation / Gate
- `npx tsc --noEmit` → **0 errors**
- `npx eslint <the 4 new files>` → **0 errors / 0 warnings**
- `npx vitest run` → **130 files / 1175 tests, all passing, 0 skipped** (Story 11.1 HEAD was 126 files / 1150 tests → net **+4 files / +25 tests**, none dropped, none regressed).
- Test-only addition — no source, engine, route, store, client, hook, i18n, or CI-path change. Default seed path (flag OFF, as CI runs it) untouched.
- (`Not implemented: navigation to another Document` in vitest output remains a benign pre-existing jsdom log, not a failure.)

## Next recommended workflow
`trace` (traceability matrix / quality-gate decision for Story 11.1) or `test-review` (quality validation of the new + existing day-series suites).

---

# Automation Expansion Summary — Story 11.6 (Venue Detail — Clean First Paint & Content Polish)

## Preflight & Context
- **Framework:** Vitest 4.1.4 (`nextjs-app/vitest.config.ts`) + Playwright present. Verified — no HALT.
- **Stack:** frontend (Next.js + React). Story 11.6 is a pure UI-polish story: `VenueDetailContent` clean first paint (no-fabrication "ÖPPET" badge + detail-only skeletons), removal of the "Soltider idag" strip + its dead `SunTimeline`/`SunForecastBars`/`timelineWindowLabel` render path, symmetric i18n prune (venue `detail.timeline`/`sectionTitle`/`peakTime`/`bestWindow` in both locales), `ReviewFlow` centering + single "Inga omdömen", and the amber-badge token darken (`#6d5000`→`#5c4300`) for a deterministic axe green. Landed at `review` with vitest 1331/140 files, axe green.
- **Mode:** BMad-Integrated (story with AC1–AC3 + Design-Gate + rich Dev Notes). **Sequential** — a narrowly-scoped, purely-additive component/unit coverage top-up; no API/E2E fan-out to farm to subagents.

## Existing coverage reviewed (to avoid duplication — NOT re-created, NOT weakened)
The story shipped strong AC-headline coverage, left untouched:
- `VenueDetailContent.test.tsx` — AC1 skeleton-while-loading + no fabricated "ÖPPET · 22:00" + badge omit-when-no-`closesAt`; AC2 "Soltider idag"/"Solprognos idag"/timeline windows absent on BOTH breakpoints.
- `ReviewFlow.test.tsx` — AC3 single "Inga omdömen" at 0 reviews + centered header/message; `>0` count summary + no empty leak.
- `messages-parity.test.ts` — sv/en structural + ICU parity across every namespace.
- `removed-i18n-keys.test.ts` — established pruned-key deletion-pin pattern (Story 9.6 + 11.4 suites).
- `MapView.test.tsx` — AC2 section-removed assertion through the live overlay.
- `axe.spec.ts:82` (desktop venue-detail) — the ACTIVE AA gate the badge token keeps green.

## Gaps Identified & Filled (edge / boundary / regression-guard, no duplication)

| # | Gap (previously uncovered) | Level | Priority | Where |
|---|-----------------------------|-------|----------|-------|
| 1 | **fallback→detail swap in the SAME instance** (AC1 no-layout-jump): the two AC1 tests were separate renders — none re-rendered one mounted component from `detail=undefined`+loading to `detail` present to prove the badge skeleton → real badge and detail-region skeletons → real content with NO stale skeleton left behind. Also pins `aria-busy` toggling true→false (a Dev-Notes a11y signal previously unasserted anywhere). | Component | P1 | `VenueDetailContent.test.tsx` |
| 2 | **loading-gate boundary** `loading = isLoading && !detail`: `detail`-present + `isLoading=true` (a background refetch) must render CONTENT not skeletons + `aria-busy=false` — the gate's other side, previously untested. | Component | P1 | `VenueDetailContent.test.tsx` |
| 3 | **ReviewFlow loading boundary** (AC3): while `reviewsQuery.data` is undefined (pending fetch), NO "Inga omdömen" of either flavour may leak — the empty-state-flash class the AC3 fix closed, but only ever asserted at the resolved-empty state. | Component | P1 | `ReviewFlow.test.tsx` |
| 4 | **ReviewFlow error boundary** (AC3): a failed fetch shows the load-error alert exactly ONCE with no empty message co-rendering (error and empty are mutually-exclusive branches) + the retry affordance. | Component | P2 | `ReviewFlow.test.tsx` |
| 5 | **Pruned venue-detail i18n keys stay gone** (AC2): `venue.detail.timeline`/`sectionTitle`/`peakTime`/`bestWindow` deleted in BOTH locales, `openUntil` kept — a deletion-pin `messages-parity` cannot catch (parity passes if a key is re-added to both). Raw-scan scoped to `venue.json` (so `feedback.json#sectionTitle` "Omdömen" is not a false positive). | Unit | P1 | `removed-i18n-keys.test.ts` |
| 6 | **Label-builder / component prune regression guard** (AC2): a source-scan pin that the three surfaces that BUILD `VenueDetailContentLabels` (`MapView#venueDetailLabels`, `ForcedVenueDetailInitialFrame#venueDetailLabels`, `VenueDetailContent`) never re-introduce a `t('detail.timeline\|sectionTitle\|peakTime\|bestWindow')` read (the runtime-raw-key path the JSON scan can't see), the `VenueDetailContentLabels` type drops those fields + the `SunTimelineLabels` import, and `SunTimeline`/`SunForecastBars`/`timelineWindowLabel` stay fully removed. | Unit (source-scan) | P1 | `venue-detail-label-prune.test.ts` (NEW) |

Scope discipline: the ENGINE timeline data path (`detail.timeline` DTO, `[slug]` route, `sun-engine.ts`, `VenueSunTimelineDto`) is deliberately OUT of scope per AC2 — Story 11.1 consumes it. All new pins target the pruned i18n **presentation** keys + the render/label surfaces only, never the data path.

## Files Created / Updated (all test-only, additive)
- **UPDATED** `nextjs-app/test/components/VenueDetailContent.test.tsx` — +2 (gaps #1, #2).
- **UPDATED** `nextjs-app/test/components/ReviewFlow.test.tsx` — +2 (gaps #3, #4).
- **UPDATED** `nextjs-app/test/unit/removed-i18n-keys.test.ts` — +5 (gap #5: timeline-key deletion sv/en + kept `openUntil` sv/en + raw-scan).
- **NEW** `nextjs-app/test/unit/venue-detail-label-prune.test.ts` — +5 (gap #6).

## Validation / Gate
- `npx tsc --noEmit` → **0 errors**
- `npx eslint <the 3 changed + 1 new test file>` → **0 errors**
- `npx vitest run` → **141 files / 1345 tests, all passing, 0 skipped** (Story 11.6 completion HEAD was 140 files / 1331 tests → net **+1 file / +14 tests**, none dropped, none regressed).
- Test-only addition — no source, component, i18n, token, or CI-path change. The axe e2e badge gate is untouched (source unchanged).
- (`Not implemented: navigation to another Document` in vitest output remains a benign pre-existing jsdom log — it predates this change, emitted by ReviewFlow's `scrollIntoView` under jsdom — not a failure.)

## Next recommended workflow
`trace` (traceability matrix / quality-gate decision for Story 11.6) or `test-review` (quality validation of the new + existing venue-detail suites).

---

# Automation Expansion Summary — Story 11.7 (Hygiene — Three-Epics-Deferred Debt)

## Preflight & Context
- **Framework:** Vitest 4.1.4 (`nextjs-app/vitest.config.ts`) + Playwright present. Verified — no HALT.
- **Stack:** fullstack (Next.js). Story 11.7 is a HYGIENE story with three orthogonal fixes that are **byte-identical UI** (nothing renders): (1) `vercel.json` installCommand fail-loud — removed the `|| true` lightningcss error-swallow (AC1); (2) a **scoped** `.gitattributes` EOL policy + one-time renormalization (AC1); (3) deleted the orphaned `toSunStatusToken` mapper, never-guard surviving via `windowLabelTier` (AC2). AC3 (consolidated reference-PNG rebaseline) is a maintainer-blessed VISUAL checkpoint — not unit-automatable.
- **Mode:** BMad-Integrated (story + Epic-11 test-design R-016/R-017). **Sequential** — three tightly-scoped, jsdom-free STATIC config/source contracts; no runtime behaviour, so no API/E2E fan-out warranted. Authored one guard suite inline (the deterministic sequential path).

## Existing coverage reviewed (to avoid duplication — NOT re-created, NOT weakened)
- `sun-status-presentation.test.ts` — the surviving mapper exports (`isObscuredSunStatus`, `skyConditionCopy`); the `toSunStatusToken` block was already REMOVED by the dev-story. Left untouched.
- `map-legibility-tokens.automate.test.ts` — the **precedent** this suite follows: a `.automate.test.ts` that reads a config/source file from disk and asserts its structural contract (never a rendered pixel).
- **Pre-existing coverage of the three 11.7 contracts: NONE** — a repo-wide `test/` grep for `vercel.json` / `gitattributes` / `installCommand` / `toSunStatusToken` returned nothing. These were entirely uncovered because the changes render nothing (no runtime/e2e/visual guard).

## Gaps Identified & Filled (config/source contract guards — the genuinely automatable 11.7 debt)

| # | Gap (previously uncovered) | Level | Priority | Where |
|---|-----------------------------|-------|----------|-------|
| 1 | **AC1 vercel.json fail-loud** — `installCommand` must contain NO error-swallow (`\|\| true` / `; true` / `\|\| :` / `\|\| exit 0`). A re-added swallow silently ships a broken lightningcss build (the exact Epic-8 A2 regression). | Unit (config contract) | P1 | `hygiene-config-contracts.automate.test.ts` |
| 2 | **AC1 load-bearing fragments preserved** — removing the swallow must not gut the workaround: `--include=dev`, the `(cd .. && …)` root reach, `--no-package-lock`, pinned `lightningcss@1.31.1`, `2>&1`, and the `&&` chain all survive. | Unit (config contract) | P1 | same |
| 3 | **AC1 buildCommand stays clean** — the swallow was NEVER in `buildCommand`; pin it `npm run build` so nobody "fixes" the wrong line. | Unit | P2 | same |
| 4 | **AC1 doc↔config mirror** — `docs/vercel-deployment.md` quotes the exact `installCommand`; assert the doc contains the live string AND its mirrored quote carries no swallow (drift guard). | Unit | P1 | same |
| 5 | **AC1 `.gitattributes` no blanket sweep** — no `* text=auto` (R-016: a blanket rule re-poisons the renormalization diff by sweeping the ~113 `.log` artifacts + binaries). | Unit (config contract) | P1 | same |
| 6 | **AC1 `.log` stays excluded** — no `*.log` text/EOL rule (the review-capture/console artifacts stay untouched). | Unit | P2 | same |
| 7 | **AC1 source-extension LF pins** — `text eol=lf` on ts/tsx/js/jsx/json/css/md/yml/yaml/sql/sh (ends the recurring CRLF↔LF review churn). | Unit | P1 | same |
| 8 | **AC1 binary guards** — `-text` on png/jpg/ico/woff/woff2/ttf so the 12 rebaselined reference PNGs + fonts are NEVER EOL-normalized (a corrupted binary is a silent, invisible regression). | Unit | P1 | same |
| 9 | **AC2 `toSunStatusToken` stays deleted** (R-017 binary outcome) — source-scan proves the export is absent from `sun-status-presentation.ts` AND from its only former consumer (the unit test); a re-add resurrects the orphan + its misleading "single source of truth" comment. | Unit (source-scan) | P2 | same |
| 10 | **AC2 never-guard survives** — `windowLabelTier`'s `switch (status)` + `: never = status` default is preserved; this is the compile-time "a new VenueSunStatus breaks the build" property AC2 relies on inheriting from the deleted mapper. | Unit (source-scan) | P2 | same |

The shared `ERROR_SWALLOW` regex was **mutation-checked** against `\|\| true`, `; true`, `\|\| :`, `\|\| exit 0` (all caught) and the live clean commands (no false positives) — an initial `\|\| :` miss (a `\b` after the non-word `:`) was found and fixed. The blanket and `.log` regexes were likewise verified for word-boundary correctness.

## Files Created (test-only, additive)
- **NEW** `nextjs-app/test/unit/hygiene-config-contracts.automate.test.ts` — 11 tests, 3 describe blocks (vercel.json fail-loud + doc mirror; scoped `.gitattributes`; `toSunStatusToken` delete + never-guard survival).

## Deliberately NOT covered (not worth / not automatable at unit level — no fabricated coverage)
- Live Vercel deploy fail-loud behaviour → orchestrator/maintainer PR concern; the static installCommand contract is the automatable proxy.
- The `git add --renormalize` working-tree effect → a git operation owned by the orchestrator, not a code contract.
- AC3 reference-PNG rebaseline blessing → a maintainer visual checkpoint; dev is structurally forbidden from self-blessing and no unit test can assert a "correct" pixel.

## Validation / Gate
- `npx tsc --noEmit` → **0 errors** (no error references the new file).
- `npx eslint <new file>` → **0 errors** (exit 0).
- `npx vitest run` → **142 files / 1354 tests, all passing, 0 skipped** (Story 11.7 completion HEAD was 141 files / 1343 tests → net **+1 file / +11 tests**, none dropped, none regressed).
- Test-only addition — no source, config, component, or CI-path change. Byte-identical UI preserved (this suite reads config/source from disk; it renders nothing).
- (`Not implemented: navigation to another Document` in vitest output remains a benign pre-existing jsdom log, not a failure.)

## Next recommended workflow
`trace` (traceability matrix / quality-gate decision for Story 11.7) or `test-review` (quality validation of the new config-contract suite).

---

# Automation Expansion Summary — Story 11.9 (Venue Data Model Cleanup — IDs, Per-Weekday Hours, Dead-Field Removal)

## Preflight & Context
- **Framework:** Vitest 4.1.4 (`nextjs-app/vitest.config.ts`) + Playwright present. Verified — no HALT.
- **Stack:** fullstack (Next.js + server-only venue store). Story 11.9 is the data-model cleanup: per-weekday `opening_hours` (AC2) with a NEW pure formatter `lib/utils/opening-hours.ts`, a defensive store coercer `coerceOpeningHours` in `lib/services/venue-store.ts`, an auto-assigning text PK (AC1, DB-only), and the removal of `peak_time`/`shadow_warning_minutes` end-to-end (AC3/AC4).
- **Mode:** BMad-Integrated (story + 4 ATDD scaffolds, all un-skipped and green). **Sequential** — a narrow, purely-additive UNIT top-up on the two new pure-logic surfaces (formatter + coercer); no API/E2E fan-out warranted.

## Existing coverage reviewed (to avoid duplication — NOT re-created, NOT weakened)
- `opening-hours.atdd.test.ts` — `formatOpeningHours` headline AC2: open/closed/past-midnight/malformed/no-hours + gate-parity "22:00".
- `venue-store.opening-hours-shape.atdd.test.ts` — `VENUE_SELECT_COLUMNS` drops the dead columns; `coerceOpeningHours` well-formed/null/malformed-scalar; fixture present/absent branches + no `peakTime`/`shadowWarningMinutes`.
- `venue-detail-route.data-cleanup.atdd.test.ts` — detail DTO: `shadowWarningMinutes` gone, engine `timeline.peakTime` kept, new `openingHours` shape serializes, no fabricated absent-hours display.
- `VenueDetailContent.opening-hours-derived.atdd.test.tsx` — derived ÖPPET badge + Öppettider row (open/closed/loading same-box swap).
- E2E already exists (`epic-10-weather-matrix`, `map-primary`); pure weekday/coercion logic at E2E would be duplicate coverage (test-levels anti-pattern) — kept at UNIT.

## Gaps Identified & Filled (branch/boundary, no duplication)

| # | Gap (previously uncovered) | Level | Priority | Where |
|---|-----------------------------|-------|----------|-------|
| 1 | `stockholmIsoWeekday` — each of the 7 ISO weekdays asserted DIRECTLY (only indirectly exercised via the formatter before). | Unit | P1 | `opening-hours.coverage.test.ts` |
| 2 | `stockholmIsoWeekday` **DST correctness** — a WINTER instant (CET=UTC+1) + local-midnight crossing map to the ZONED weekday, not the UTC weekday. The honesty of weekday selection depends on this; scaffold only used summer instants. | Unit | P1 | same |
| 3 | `formatOpeningHours` **i18n `template` param** — the composition path the real render surfaces use (`labels.openUntilLine`); replaces EVERY `{time}`; default-template fallback. Scaffold only used the default. | Unit | P1 | same |
| 4 | `formatOpeningHours` edge branches — empty `{}` hours object → nothing; `open===close` derived honestly (no clamp); boundary `00:00`/`23:59` pass, out-of-range `24:00` → nothing (no throw). | Unit | P2 | same |
| 5 | `coerceOpeningHours` **all-malformed object** → undefined (the `hasEntry` gate — an object with zero recognizable weekday entries is "no hours"); non-weekday-only keys → undefined. The trust-boundary branch that stops a bad prod jsonb reaching render. | Unit | P1 | `venue-store.opening-hours-coerce.test.ts` |
| 6 | `coerceOpeningHours` **mixed validity** — valid intervals kept, malformed dropped, in one call; an explicit `null` weekday PRESERVED (closed-that-day is honest data); stray legacy keys (`display`/`timezone`) do not leak through. | Unit | P1 | same |
| 7 | `coerceOpeningHours` **interval time validation** — boundary (`00:00`/`23:59`) + past-midnight (`close<open`) accepted; out-of-range (`24:00`/`12:60`) + non-string times → undefined. | Unit | P2 | same |

All formatter tests inject a fixed `now` (offset-annotated) — wall-clock-deterministic, no `?_time=` flake. Coercer tests are pure structural assertions, no clock, no live Supabase.

## Files Created (test-only, additive)
- **NEW** `nextjs-app/test/unit/utils/opening-hours.coverage.test.ts` — 13 tests (gaps #1–#4).
- **NEW** `nextjs-app/test/unit/services/venue-store.opening-hours-coerce.test.ts` — 10 tests (gaps #5–#7).

## Validation / Gate
- `npx tsc --noEmit` → **0 errors**.
- `npx eslint <the 2 new files> --quiet` → **0 errors** (exit 0).
- `npx vitest run` → **152 files / 1439 tests, all passing, 0 skipped** (Story 11.9 handoff HEAD was 150 files / 1416 tests → net **+2 files / +23 tests**, none dropped, none regressed).
- Test-only addition — no source, store, formatter, DTO, i18n, or CI-path change. Default seed path (flag OFF, as CI runs it) untouched.
- (`Not implemented: navigation to another Document` in vitest output remains a benign pre-existing jsdom log, not a failure.)

## Next recommended workflow
`trace` (traceability matrix / quality-gate decision for Story 11.9) or `test-review` (quality validation of the new + existing opening-hours suites).

---

# Automation Expansion Summary — Story 12.1 (Provider-Neutral Opening-Hours Governance)

## Preflight & Context

- **Framework:** Vitest 4.1.4 (`nextjs-app/vitest.config.ts`) and Playwright 1.59.1 (`nextjs-app/playwright.config.ts`) are configured; framework readiness passed.
- **Stack:** fullstack by TEA manifest and target analysis (Next.js/React application with server-only governance/audit services in the same app).
- **Mode:** BMad-integrated from the Story 12.1 brief, Epic 12 test design, and ATDD checklist.
- **Scope:** expand deterministic automated coverage for the completed provider-neutral governance, direct weekly audit, migration/security contracts, and honest unknown-hours DTO boundary. Existing live migration/remediation evidence is accepted and not replayed; `public.spatial_ref_sys` remains an acknowledged PostGIS exception and is untouched.
- **Knowledge loaded:** test levels, priorities, factories, selective execution, burn-in, test quality, Playwright Utils UI/API profile, Pact MCP guidance, and Playwright CLI guidance.

## Coverage Plan

- **Browser exploration:** skipped after the configured CLI probe returned `NOT_INSTALLED`; this data/operations story has no new UI flow, and the existing API/browser/visual evidence already proves the no-pixel-change boundary.
- **Existing coverage retained:** 41 Story 12.1 ATDD contracts cover the headline provider-policy, migration, governance, audit, workflow/docs, and detail-DTO requirements. Existing list/store suites already cover list omission of unknown hours, so that route is not duplicated.
- **Unit P1 — governance boundary expansion:** strict provenance/date/reference validation, valid/invalid HH:MM and weekday boundaries, canonical update idempotency under object-key reordering, and remediation no-write behavior for manual-review/failed rows.
- **Unit P1 — audit boundary expansion:** exact due/stale cutoffs, classification precedence, bounded error classes, repository outcome-write failure isolation, redacted outcome payloads, and run-level read failure propagation.
- **P2 selective additions:** empty-run/optional repository behavior only where it covers an unexecuted branch without duplicating AC headline tests.
- **No E2E/component/Pact additions:** pure service/data contracts are most stable at unit level; UI pixels and external-provider interactions are explicitly unchanged/prohibited.

## Generated Coverage

- **NEW** `nextjs-app/test/unit/services/opening-hours-governance.coverage.test.ts` — 14 deterministic P1 tests covering provenance normalization/rejection, schedule boundaries, idempotent canonical planning, whole-field unknown writes, and remediation preservation.
- **NEW** `nextjs-app/test/unit/services/opening-hours-audit.coverage.test.ts` — 11 deterministic tests (9 P1, 2 P2) covering due/stale cutoffs, classification precedence, bounded error classes, outcome-write isolation/redaction, run-level read failure, concurrency bounding, and empty runs.
- **Fixtures/helpers:** none required; tests use local fixed inputs and Vitest spies only.
- **Execution mode:** sequential, consistent with the phase constraint against further delegation.
- **Aggregate:** 25 tests across 2 files; P1: 23, P2: 2, P0/P3: 0.

## Files Updated

- `nextjs-app/test/unit/services/opening-hours-governance.coverage.test.ts` — created.
- `nextjs-app/test/unit/services/opening-hours-audit.coverage.test.ts` — created.
- `_bmad-output/test-artifacts/automation-summary.md` — this coverage and validation record.

## Validation / Gate

- Focused generated suite: `npx vitest run test/unit/services/opening-hours-governance.coverage.test.ts test/unit/services/opening-hours-audit.coverage.test.ts` → **2 files / 25 tests passed**.
- Targeted lint: `npx eslint test/unit/services/opening-hours-governance.coverage.test.ts test/unit/services/opening-hours-audit.coverage.test.ts --quiet` → **0 errors**.
- TypeScript: `npx tsc --noEmit` → **0 errors**.
- Full unit/component suite: `npx vitest run` → **160 files / 1,512 tests passed, 0 failed**. This is the pre-expansion 158 files / 1,487 tests plus exactly 2 files / 25 tests.
- `git diff --check` → **passed**; the command emitted only the existing line-ending advisory for the orchestrator-owned Story 12.1 state YAML.
- Playwright CLI sessions: none opened, so no browser process cleanup was required. Temporary worker JSON files were deleted after aggregation; the durable result is stored here under the configured test-artifact directory.

## Assumptions, Risks, and Deferred Coverage

- The manually collected venue-website opening-hours provenance is authoritative input for this pre-launch story; these tests validate its governance and audit handling without replaying the live remediation.
- `public.spatial_ref_sys` is an acknowledged PostGIS-managed advisory exception. It was not altered, queried, or brought into the test scope.
- No UI, scheduled-provider call, live Supabase write, or Pact interaction was added. Existing migration/remediation evidence and the 41 headline ATDD contracts remain the integration proof; the new coverage targets deterministic service boundaries only.
- The remaining risk is operational rather than unit-level: future production audit execution still depends on deployment credentials and scheduler health already covered by the story's workflow/operations contracts.

## Definition of Done

- Framework, story, Epic 12 test design, and ATDD context reviewed.
- Existing coverage mapped and duplicate list/detail/UI coverage avoided.
- 25 priority-tagged deterministic unit tests created in the established test tree.
- No fixtures, factories, or helpers were introduced because the tests are pure/local and require no cleanup.
- Focused and full validation gates passed with no healing iteration or `fixme` needed.
- No application, database, migration, provider, UI, or sprint-status files changed by this workflow.

## Next Recommended Workflow

Run `test-review` for quality scoring of the combined Story 12.1 suites, then `trace` for the acceptance-criteria traceability and quality-gate decision.

---

# Automation Expansion Summary — Story 12.3 (Day-Series Compute at Real-Venue Scale / Cold-Start Freeze)

## Preflight & Context

- **Framework:** Vitest 4.1.4 (`nextjs-app/vitest.config.ts`) and Playwright are configured; baseline typecheck and lint passed before edits.
- **Stack:** fullstack/server-side Next.js services with Supabase-backed persisted sun geometry, weather snapshots, and scheduled precompute workflows.
- **Mode:** BMad-integrated from the Story 12.3 file and TEA automation workflow. Execution was sequential because this delegate session is under a no-subagent runtime constraint.
- **Scope:** expand deterministic automated coverage for the Story 12.3 implementation without live Supabase, Docker, Met.no, GitHub, or browser automation. Existing migration replay, full Playwright, and story-review-gate evidence in the story file were accepted and not replayed.

## Coverage Plan

- **Persisted outcome assembly:** verify exact geometry-input hash lookup, current coverage read, weather-bucket snapshot read, nearest-step selection, freshness metadata, confidence fallback, public prediction evidence, and coverage-missing failures.
- **Precompute publication semantics:** verify a repository with `publishGeometryGeneration` receives a complete planner-window batch and does not write per-day partial rows; invalid targets fail every date and publish nothing.
- **Weather snapshot gating:** verify layer-weighted effective cloud cover gates read-time status while preserving geometry percentages; verify explicit rain true/false handling; verify nearest fresh slice selection and stale-slice unknown fallback.
- **Coordinate normalization:** verify shared seating centroid behavior ignores duplicated closing coordinates, prefers seating polygon centroids over venue points, and rejects non-finite polygon coordinates.
- **No E2E/Pact additions:** this expansion targets deterministic service contracts; no public UI or consumer contract changed.

## Generated Coverage

- **NEW** `nextjs-app/test/unit/services/sun-geometry-persisted-outcome.automate.test.ts` — 5 tests covering persisted route outcome composition and failure classification.
- **NEW** `nextjs-app/test/unit/services/sun-geometry-coordinates.automate.test.ts` — 3 tests covering shared engine coordinate derivation.
- **NEW** `nextjs-app/test/unit/services/sun-geometry-precompute.automate.test.ts` — 2 tests covering complete generation publish behavior and invalid-target failure accounting.
- **NEW** `nextjs-app/test/unit/services/weather-snapshots.automate.test.ts` — 3 tests covering read-time weather gating and freshness-window selection.
- **Aggregate:** 13 tests across 4 new files; all are deterministic unit-level coverage with injected repositories or local pure inputs.

## Validation / Gate

- Baseline before edits: `npx tsc --noEmit` → **0 errors**; `npx eslint . --quiet` → **0 errors**.
- Focused generated suite: `npx vitest run test/unit/services/sun-geometry-persisted-outcome.automate.test.ts test/unit/services/sun-geometry-coordinates.automate.test.ts test/unit/services/sun-geometry-precompute.automate.test.ts test/unit/services/weather-snapshots.automate.test.ts` → **4 files / 13 tests passed**.
- Project validation after edits: `npx tsc --noEmit` → **0 errors**; `npx eslint . --quiet` → **0 errors**.
- Full unit/component suite: `npx vitest run` → **177 passed / 2 skipped files; 1,688 passed / 15 skipped tests**.
- Playwright was not rerun in this automate pass because no browser/UI/E2E coverage was added; the story file already records a passing full Playwright run under `CI=1`.

## Assumptions, Risks, and Deferred Coverage

- Production scheduler, protected production evidence, and GitHub environment proof remain operational evidence, not local unit coverage, and still require the external access already noted in the Story 12.3 Dev Agent Record.
- Migration replay was not rerun; the story file already records passing Compose test PostGIS replay evidence.
- No application source code, migrations, CI, route behavior, or sprint status was changed by this automation pass.

## Definition of Done

- Story and TEA context reviewed; existing Story 12.3 ATDD coverage mapped to avoid duplicating headline contracts.
- 13 deterministic service-layer tests added for previously uncovered branch/edge contracts.
- Focused tests, full Vitest, typecheck, and lint passed.
- Durable automation result written here under the configured BMAD test-artifact directory.

## Next Recommended Workflow

Run `test-review` or `trace` for Story 12.3 if a quality-gate update is needed after this coverage expansion.

---

# Automation Expansion Summary — Story 12.7 (Reviews Route Resolves Live Venues)

## Preflight & Context

- **Framework:** Vitest 4.1.4 (`nextjs-app/vitest.config.ts`) and Playwright are configured; framework readiness passed.
- **Stack:** fullstack/server-side Next.js API routes and services. Story 12.7 is backend/API identity resolution work; no UI/browser flow was changed.
- **Mode:** BMad-integrated from the Story 12.7 file and existing ATDD checklist. Execution was sequential in this delegate session; no subagents were launched.
- **Scope:** expand deterministic automated coverage for the implemented shared live venue identity/visibility resolver and its reviews/feedback route consumers. No production code, sprint status, auto-bmad state, or git operation was touched.

## Coverage Plan

- **Service-level resolver P0/P1:** quote/escape id-or-slug PostgREST filters, require visibility/deletion fields in the projection, reject hidden/deleted/private rows returned directly from Supabase, prevent visibility-column leakage into public DTOs, avoid miss/in-flight caching, fail closed on identity collisions, and propagate real store errors.
- **API route convergence P0:** mock the shared resolver seam and prove reviews GET, reviews POST, and feedback POST all call it with the expected identifier before persistence.
- **Regression preservation:** keep existing ATDD and fixture-mode route/persistence suites in the focused run so the durable automation does not weaken the story contract.
- **No E2E/Pact additions:** this story has no new browser UI and the provider is an internal Next.js route/service boundary, so focused Vitest unit/integration tests are the appropriate level.

## Generated Coverage

- **NEW** `nextjs-app/test/unit/services/story-12-7-public-venue-resolver.automation.test.ts` — 6 tests covering resolver filter escaping, live id/slug parity, visibility/deletion fail-closed behavior, DTO non-leakage, cache/race consistency, collision handling, and store error propagation.
- **NEW** `nextjs-app/test/unit/api/story-12-7-shared-resolver-convergence.automation.test.ts` — 4 tests covering shared resolver use by reviews GET/POST and feedback POST, zero-review `no-store` response, id-first review POST, decoded feedback path identifiers, and non-leaking not-found behavior before persistence.
- **Aggregate:** 10 tests across 2 new files; P0: 6, P1: 4, P2/P3: 0.

## Validation / Gate

- Focused automation + regression suite: `npx vitest run test/unit/services/story-12-7-public-venue-resolver.automation.test.ts test/unit/api/story-12-7-shared-resolver-convergence.automation.test.ts test/unit/services/story-12-7-public-venue-resolver.atdd.test.ts test/unit/api/story-12-7-reviews-route-live-venues.atdd.test.ts test/unit/api/story-12-7-feedback-route-live-venues.atdd.test.ts test/unit/services/venue-store.test.ts test/unit/api/reviews-route.test.ts test/unit/api/venue-feedback-route.test.ts test/unit/services/venue-reviews-persistence.test.ts` → **9 files / 92 tests passed**.
- Full unit/component suite: `npx vitest run` → **182 passed / 2 skipped files; 1,724 passed / 15 skipped tests**.
- Vitest printed the existing jsdom `Not implemented: navigation to another Document` warning after the green full-suite summary; exit code was 0.

## Assumptions, Risks, and Deferred Coverage

- The previously implemented resolver contract is accepted as story-scope production behavior; this pass only added durable tests around remaining branch/race/convergence gaps.
- Playwright was not run because no browser-visible behavior or UI was added in this automation pass.
- Downstream Story 12.5, 12.10, and 12.14 consumers still need to adopt the shared public guard when their routes are implemented or touched.

## Definition of Done

- Existing Story 12.7 ATDD and regression coverage reviewed to avoid duplicate tests.
- 10 deterministic Vitest tests added at service/API levels.
- Focused and full Vitest runs passed.
- Story file and TEA automation summary were updated.

## Next Recommended Workflow

Run `test-review` or `trace` for Story 12.7 if a quality-gate update is needed after this automation expansion.

---

# Automation Expansion Summary - Story 12.6 (Simplify Map Pins)

## Preflight And Context

- **Framework:** Vitest 4.1.4 and Playwright are configured in `nextjs-app`; framework readiness passed.
- **Stack:** frontend (`Next.js`/React with colocated API routes). Browser and API-contract tests are both present.
- **Mode:** BMad-integrated from the Story 12.6 file, Epic 12 test design, and completed ATDD checklist.
- **Scope:** assess the implemented public-sun predicate/comparator, tri-state weather propagation, two-state pin/card/quick-info semantics, ARIA/reduced-motion behavior, and genuinely executed mobile accessibility coverage. Production code, sprint status, Auto-BMAD state, git state, visual references, and capture recipes remain outside this delegate's ownership.
- **Knowledge loaded:** test levels, risk priorities, deterministic data factories, selective execution, test quality, Playwright utilities, burn-in guidance, resilient selectors, timing, and healing constraints.
- **Known external gate:** Story Task 7 remains open because the canonical visual wrapper cannot run without `ANTHROPIC_API_KEY`; no visual substitute or bypass is accepted.

## Coverage Plan

| Priority | Level | Target | Decision |
| --- | --- | --- | --- |
| P0 | Unit/domain | Strict `>50 && gate !== 'gated'` verdict, raw-status/confidence independence | Existing ATDD is exhaustive for the signed boundary; no duplicate test. |
| P0 | Unit/domain + API | Equal-peak earliest-minute tie independent of input order; server top-50 all-grey peak selection; explicit distance/ID comparator tie | Add focused guards. The reverse peak tie and all-grey cutoff are expected to expose implementation defects. |
| P0 | Service/unit | Matched but malformed weather and missing/malformed serialized gate values must resolve to `unknown` | Add fail-closed tests. Current code is expected to fail these honesty cases; expired snapshots retaining slices remain a separately documented gap. |
| P0 | Component | Low/exact-50 and gated list-card/QuickInfo remain percentage-free; unknown-high retains an explicit localized unavailable-weather qualifier | Add rendered-surface tests. Existing pin coverage is sufficient; current card/QuickInfo unknown qualification is expected to fail. |
| P0 | Component | Same marker ID with a gate-only refresh reuses marker/root, updates ARIA/state, and does not restart entrance opacity | Existing layer reconciliation and pin-state coverage make another passing test low-value in this defect-focused pass; retain as a documented direct-coverage gap. |
| P1 | Component/i18n | Exact Swedish low-Partial/gated ARIA excludes percentage and confidence; unknown ARIA includes weather-unavailable meaning | Existing pin and i18n coverage already proves the signed contract; add no duplicate test. |
| P1 | Browser/CI | Pin-bearing `a11y-mobile` scenario and CI project wiring | Coverage is already active and non-vacuous. Re-execute the project and record counts; add no duplicate axe scenario. |

Coverage remains selective: pure logic at unit level, route cutoff at API level, rendered semantics at component level, and one existing axe browser scenario for mobile accessibility. No Pact target exists because the feature has no consumer-driven external service contract.

## Generated Coverage

- **NEW** `nextjs-app/test/unit/story-12-6-contract-defects.automation.test.ts` - 3 P0 tests for reverse-ordered equal-peak ties, matched malformed weather fail-closed behavior, and missing/malformed DTO gate normalization.
- **NEW** `nextjs-app/test/components/story-12-6-honesty.automation.test.tsx` - 4 P0 rendered-surface tests for percentage-free grey list cards, unknown-weather card qualification, low/exact-50 QuickInfo not-sunny meaning, and unknown-weather QuickInfo qualification.
- **EXPANDED** `nextjs-app/test/unit/api/venues-route-peak-truncation.test.ts` - 1 P0 route regression proving the top-50 cutoff retains a stronger all-grey gated future peak rather than falling back to selected-instant ID order.
- **No new E2E or fixtures:** the existing five-state mobile/desktop pin journey and pin-bearing `a11y-mobile` axe scenario already cover the browser responsibility without duplication.
- **Aggregate:** 8 P0 tests across 2 new files and 1 augmented file; 0 P1/P2/P3 tests; 0 fixtures.

The new tests intentionally encode the signed Story 12.6 contract even where current production is expected to fail. Production fixes remain outside this test-only automate phase.

## Validation And Gate

- **Focused RED contract suite:** `npx vitest run test/unit/story-12-6-contract-defects.automation.test.ts test/unit/api/venues-route-peak-truncation.test.ts test/components/story-12-6-honesty.automation.test.tsx --reporter=verbose` executed **3 files / 10 tests: 7 failed, 3 passed** in 3.61s. No failure was skipped, marked `fixme`, or weakened.
- **TypeScript:** `npx tsc --noEmit` passed with 0 errors.
- **Focused lint:** `npx eslint test/unit/story-12-6-contract-defects.automation.test.ts test/unit/api/venues-route-peak-truncation.test.ts test/components/story-12-6-honesty.automation.test.tsx --quiet` passed with 0 errors.
- **Existing Story 12.6 Vitest regression:** six predicate, gate, pin, layer, rank, and CI-wiring files passed **35/35 tests** in 3.70s. The existing synchronous React root-unmount warnings remained non-fatal.
- **Focused browser/a11y regression:** under `CI=1`, the Story 12.6 public-pin and axe specs passed **5/5 tests** across `mobile`, `desktop`, and genuinely executed `a11y-mobile`, with one worker and zero retries, in 19.6s. The existing Next workspace-root and onboarding hydration warnings remained non-fatal. The Playwright web server exited; no listener remained on port 3000.
- The prior implementation record remains the latest all-suite evidence: **187 passed / 2 skipped Vitest files; 1,747 passed / 15 skipped tests; 112 passed / 53 skipped Playwright tests**. A new full run was not presented as green because the newly added contract regressions intentionally expose production defects.

## Confirmed Production Contract Gaps

The seven focused RED failures are durable P0 regressions for current production behavior:

1. Reverse-ordered equal exposure peaks choose the first array entry (minute 645) instead of the earlier minute (630).
2. Matched malformed weather slices resolve to `not_gated`, and non-finite cloud data can resolve to `clear`, rather than failing closed to `unknown`.
3. Missing or malformed DTO `weatherGateState` values are inferred as `not_gated` instead of normalized to `unknown`.
4. Route top-50 peak truncation drops a stronger all-grey gated future peak behind weaker grey ID ordering.
5. An unknown-weather sunny venue card omits the localized weather-unavailable qualifier.
6. Low and exact-50 QuickInfo states omit a localized, percentage-free not-sunny verdict.
7. Unknown-weather sunny QuickInfo omits the localized weather-unavailable qualifier.

Remaining non-automated risks are explicitly deferred rather than padded with speculative tests: expired/missing snapshot metadata retaining otherwise valid slices, preservation of an `unknown` qualifier in serialized `sunWindow`/`peakTime`, direct same-ID gate-only `VenuePinLayer` refresh behavior, and remote GitHub Actions artifact evidence. Local CI wiring and an actual `a11y-mobile` execution are proven, but remote CI execution is not claimed.

## Definition Of Done

- Existing ATDD, implementation, and full-suite evidence was reviewed before adding coverage; exhaustive predicate, two-state pin, ARIA, reduced-motion, and axe cases were not duplicated.
- Eight deterministic P0 tests were added across two new files and one existing route test file. No fixtures, hard waits, live providers, application source, CI workflow, visual/reference artifact, sprint status, Auto-BMAD state, or git state was changed.
- Focused lint, typecheck, existing Story 12.6 regression, and focused Playwright/a11y regression passed.
- The new defect suite was deliberately left RED at seven failures so production contract defects stay visible. This completes test generation and evidence capture, not story acceptance or review readiness.
- Story 12.6 remains `in-progress`; Task 7 remains open because `ANTHROPIC_API_KEY` is unavailable for the canonical visual gate.

## Next Recommended Workflow

Run the production fix/code-review pass for the seven RED contracts, rerun this focused suite until it is green, then rerun the required full Vitest/Playwright gates. Run canonical visual validation after `ANTHROPIC_API_KEY` is available before attempting the story-review transition.

---

# Automation Expansion Summary - Story 12.4 (Production Console Hygiene)

## Preflight And Context

- **Framework:** Vitest 4.1.4, Playwright, strict TypeScript, and ESLint are configured under `nextjs-app`; framework readiness passed.
- **Stack:** Next.js frontend with App Router and API routes. Story 12.4 changes are client/runtime hygiene and browser-console behavior, not an external API contract change.
- **Mode:** BMad-integrated Create mode against `_bmad-output/implementation-artifacts/12-4-production-console-hygiene-hydration-error-maplibre-null-warning.md`, using implementation commit `fa612a7` as the provided reference. The commit was not inspected with git because this delegate is not allowed to run git.
- **Scope:** post-dev TEA audit only. No app production code, story state, sprint status, Auto-BMAD state, visual references, or visual evidence was changed.
- **Browser exploration:** `playwright-cli --help` timed out after 10s before any browser session was opened; selector and route validation used source/test inspection plus the focused Playwright run.
- **Knowledge loaded:** project context, Story 12.4 file, TEA config, test levels, risk priorities, deterministic data guidance, selective execution, CI/burn-in guidance, Playwright utility references, test-quality rules, selector resilience, fixture architecture, and network-first guidance.

## Acceptance Coverage Map

| Story Contract | Priority | Existing Automated Coverage | TEA Decision |
| --- | --- | --- | --- |
| AC1: hydration error #418 cannot recur on first visit | P0 | `test/components/OnboardingGate.test.tsx` hydrates first-visit SSR output with `onRecoverableError`, verifies no portal topology, AppRouteFrame sibling placement, StrictMode stability, and app shell `inert`/`aria-hidden` behavior. `test/components/OnboardingGate.synchronous.atdd.test.tsx` covers first-frame real screen behavior, no placeholder, early CTA reachability, and forced-state behavior. `test/e2e/story-12-4-console-hygiene.spec.ts` covers cold first-user root navigation with the guard attached before `goto`. `test/e2e/onboarding.spec.ts` covers unblocking and route scope. | Adequately automated; no duplicate test added. |
| AC2: MapLibre `ref_length` warning is isolated to upstream Positron style data and not app null-coordinate handling | P0 | `test/components/MapView.test.tsx` covers null and non-finite selected venue coordinates, proves `map.project` is not called, and proves move/zoom listeners are not registered for invalid coordinates, with finite positive controls. `test/e2e/story-12-4-console-hygiene.spec.ts` allows only the exact Positron warning text from a page-origin worker blob, caps allowed warnings per worker, and treats the same text on the main thread as a failure through the synthetic self-test. | Adequately automated; no duplicate test added. |
| AC3: production console guard fails on app warnings/errors and page errors across core routes | P0 | `test/e2e/story-12-4-console-hygiene.spec.ts` attaches listeners before navigation, watches warnings/errors/page errors, includes a non-vacuous synthetic guard self-test, and runs cold first-user root, forced-time root, and venue-detail cold-entry routes across mobile and desktop projects. | Adequately automated; no duplicate test added. |
| Post-dev addendum: forced `_time` route must not emit stale planner request dates before client clock resolution | P0 | `test/unit/TimeContext.test.tsx` proves forced planner query params are suppressed during SSR/first client pass when seeded with stale 2026-05-20 and emitted from the resolved 2026-07-25 client clock after mount. `test/components/AppContextProviders.test.tsx` proves forcing sync keeps the child tree mounted once. | Adequately automated; no duplicate test added. |

## Generated Coverage

- **API worker result:** 0 API/contract tests. Story 12.4 has no changed API contract and no Pact/provider target.
- **E2E worker result:** 0 new E2E tests. The existing Story 12.4 console spec already covers the risk routes, listener timing, non-vacuous failure path, and exact third-party allowlist.
- **Unit/component result:** 0 new tests. Existing hydration, route-scope, first-frame, MapView null-coordinate, provider mount identity, and TimeContext request-hygiene tests cover the signed contract without padding.
- **Fixtures/helpers:** none required.
- **Provider calls:** no live Met.no or Supabase tests were added. Targeted inspection found no Story 12.4 test calls to live providers; shared setup blocks live `api.met.no` and Google provider calls.

## Validation And Gate

- `npx tsc --noEmit` from `nextjs-app` passed with 0 errors.
- `npx eslint . --quiet` from `nextjs-app` passed with 0 errors.
- `npx vitest run test/components/OnboardingGate.test.tsx test/components/OnboardingGate.synchronous.atdd.test.tsx test/components/OnboardingGateSessionLatch.test.tsx test/components/OnboardingScreen.test.tsx test/components/AppContextProviders.test.tsx test/unit/TimeContext.test.tsx` passed **6 files / 64 tests** in 3.09s.
- `npx playwright test test/e2e/story-12-4-console-hygiene.spec.ts --project=mobile --project=desktop --retries=0` passed **8/8 tests** in 15.8s.
- The Playwright web server emitted the known non-test-failing Next workspace-root warning about multiple lockfiles. No Story 12.4 console-hygiene failures occurred.
- The story file's existing evidence remains the latest full-suite evidence: console E2E **8/8**, final onboarding E2E **18/18**, 120/120 onboarding stress, and full Vitest **1790 tests** passed. A new full Vitest run was not repeated because no tests or production code were changed in this TEA pass.

## Residual Risks And Deferred Work

- Visual validation remains outside this delegate's ownership and was not self-approved.
- Story review transition was not run; sprint status was not edited.
- The implementation commit `fa612a7` was accepted as supplied context rather than verified with git.
- Browser CLI exploration was unavailable because the capability probe timed out; source inspection and focused Playwright execution provided the validation path.

## Definition Of Done

- The TEA workflow reviewed the Story 12.4 acceptance criteria, mapped the existing automated tests to each risk, and avoided adding low-value duplicate coverage.
- Focused typecheck, lint, unit/component, and Playwright validation passed.
- No app source, production behavior, visual artifacts, story status, or sprint state was changed.
- This automation summary was refreshed with the Story 12.4 coverage conclusion.

## Next Recommended Workflow

Continue with visual evidence/test-review/trace as required by the orchestrator; Story 12.4 does not need additional TEA-generated automated tests.

---

# Automation Expansion Summary - Story 12.10 (Venue Detail Preload - Instant Mer info)

## Preflight And Context

- **Framework:** Vitest 4.1.4 and Playwright are configured in `nextjs-app`; framework readiness passed.
- **Stack:** frontend query/cache scheduling with one internal Next.js detail route contract.
- **Mode:** BMad-integrated from `_bmad-output/implementation-artifacts/12-10-venue-detail-preload-instant-mer-info.md`. Execution was sequential because the active runtime instruction disallowed additional subagents unless strictly required.
- **Scope:** post-dev coverage expansion only. Production code, sprint status, Auto-BMAD state, visual references, and git state were not changed.
- **Knowledge loaded:** project context, TEA config, story/checklist artifacts, test levels, risk priorities, deterministic data guidance, selective execution, CI/burn-in, fixture architecture, network-first guidance, Playwright utility references, selector resilience, timing guidance, and test-quality rules.

## Coverage Plan

| Priority | Level | Target | Decision |
| --- | --- | --- | --- |
| P0 | Unit/API/component/E2E | Exact shared detail key, public resolver, one-shot prefetch, max six, concurrency two, cancellation, direct-link guardrails, no scrub/date restart, cache-miss shell, warmed/cold browser behavior. | Already covered by the active Story 12.10 ATDD files and final implementation gates; no duplicate E2E added. |
| P1 | Unit | Fresh exact-key cache skip should be proven behaviorally, not only by source inspection. | Add one focused scheduler test. |
| P1 | E2E | Favourites-mode candidate source. | Existing deterministic unit coverage is sufficient because the legacy `/favoriter` browser route remains unstable outside this story scope. |

## Generated Coverage

- **UPDATED** `nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts` with one P1 behavioral scheduler test:
  - seeds a fresh exact `queryKeys.venues.detailAt()` entry for the first candidate,
  - runs the real prefetch scheduler test seam,
  - asserts no network request is made for the fresh candidate,
  - asserts the remaining candidates are fetched in preserved order with the normalized planner/date/location URL,
  - asserts the fresh cache entry remains intact and the background path stays console-silent.
- **UPDATED** `_bmad-output/test-artifacts/atdd-checklist-12-10-venue-detail-preload-instant-mer-info.md` to record 15 local ATDD scenarios and the focused post-dev validation.
- **UPDATED** `_bmad-output/implementation-artifacts/12-10-venue-detail-preload-instant-mer-info.md` with the automate debug note and completion note.
- **Aggregate:** +1 deterministic unit test. No fixtures, helpers, API mocks, browser sessions, E2E tests, production source edits, or live-provider calls were added.

## Validation And Gate

- First focused run exposed a test bug from reusing one mocked `Response` object for multiple fetches; the mock now returns a fresh `Response` per call.
- Focused unit: `npx vitest run test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts` -> **1 file / 10 tests passed**.
- Focused lint: `npx eslint test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts --quiet` -> **0 errors**.
- Full Vitest and Playwright were not rerun in this delegate because the existing story record already has green full gates and this pass added one isolated unit assertion only.

## Assumptions, Risks, And Deferred Coverage

- The prior final full gates remain the release-confidence baseline: full Vitest 197 files / 1804 tests passed / 15 skipped; final serialized Playwright 150 passed / 63 skipped.
- No visual validation is needed because no visible UI or layout changed.
- Protected preview/live Mer info timing remains deferred to release-lane verification because no credentials were provided.

## Definition Of Done

- Existing Story 12.10 ATDD coverage was reviewed for duplication risk.
- One fresh-cache scheduler edge was added at the lowest reliable test level.
- Focused unit and focused lint checks passed.
- Story and test artifacts were updated while leaving Story 12.10 `in-progress`.

## Next Recommended Workflow

Continue the orchestrator-controlled Tier A review, trace-advisory, UAT, and canonical story-review transition for Story 12.10.

---

# Automation Expansion Summary - Story 12.8 (About Page Pin Legend + Sun Figure)

## Preflight And Context

- **Framework:** Vitest 4.1.4 and Playwright 1.59.1 are configured under `nextjs-app`; framework readiness passed.
- **Stack:** frontend static About route with component/i18n/a11y coverage; no API, persistence, Pact, or contract endpoint is in Story 12.8 scope.
- **Mode:** BMad-integrated from `_bmad-output/implementation-artifacts/12-8-about-page-pin-legend-so-reads-the-sun-figure.md`.
- **Execution mode:** sequential. The active task scope was a post-dev audit/addition for Story 12.8 only, and no subagent/browser-CLI session was needed for the static route coverage gap.
- **Loaded context:** story ACs, `project-context.md`, TEA config, existing About source/tests, Playwright config, message parity test, public-sun helper, runtime `VenuePin` semantics, and TEA knowledge fragments for test levels, priorities, deterministic quality, fixture/data guidance, selective execution, CI/burn-in, network-first E2E, selector resilience, and Playwright CLI usage.

## Coverage Plan

| Priority | Level | Target | Decision |
| --- | --- | --- | --- |
| P0 | Component/i18n | New About legend section order, selected-time wording, seating-share-not-probability example, Swedish/English parity. | Already covered by `AboutPage.test.tsx` and `messages-parity.test.ts`; rerun focused suite. |
| P0 | Component/source | Prevent fake `85%`/`ABOUT_ACCURACY_PLACEHOLDER` and public per-venue confidence numbers from returning. | Add a durable source-contract unit guard because the story log recorded ad hoc scans but no persisted automated source scan. |
| P0 | Source/component | Keep static About legend aligned with Story 12.6 public sunny predicate and runtime map-pin token semantics. | Add a source-contract unit guard against About-only thresholds/status rules and pin token divergence from `VenuePin.tsx`/`public-sun.ts`. |
| P1 | E2E a11y | About route remains axe-clean on desktop and mobile after the static legend/content changes. | Rerun the executable focused About scans in `a11y` and `a11y-mobile`. |
| N/A | API/CDC | No endpoint, provider, or request/response contract changed by this story. | No API, Pact, fixtures, factories, or network mocks generated. |

## Generated Coverage

- **ADDED** `nextjs-app/test/unit/story-12-8-about-copy-contract.automation.test.ts` with 3 focused unit/source-contract tests:
  - forbids `ABOUT_ACCURACY_PLACEHOLDER`, `AccuracyCountUp`, `about-accuracy-stat`, old `accuracyStat*` message keys, public `85%`/`Träffsäkerhet: 85 procent`, and visible `Säkerhet NN%` / `Confidence NN%` patterns from the About source/message corpus;
  - verifies the About legend wording maps to the shared public-sun predicate (`sunExposurePercent > 50` and `weatherGateState !== 'gated'`) without About-local threshold/status logic;
  - verifies static About swatches retain the same Story 12.6 token semantics as runtime map pins (`bg-amber-pin`, `border-t-amber-pin`, `bg-pin-shaded`, `border-t-pin-shaded`, sun/cloud icons).
- **Aggregate:** +1 test file / +3 unit tests. No production code, i18n production copy, fixtures, visual references, story status, sprint status, or live-provider integrations changed.

## Validation And Gate

- `npx vitest run test/components/AboutPage.test.tsx test/unit/messages-parity.test.ts test/unit/story-12-8-about-copy-contract.automation.test.ts` -> **3 files / 31 tests passed**.
- `$env:PLAYWRIGHT_BASE_URL='http://localhost:3238'; $env:PLAYWRIGHT_PORT='3238'; npx playwright test --project=a11y --project=a11y-mobile --grep "about page"` -> **2 tests passed**:
  - `a11y: about page (/about)`;
  - `a11y: about page mobile (/about)`.
- `npx tsc --noEmit` -> **passed**.
- `npx eslint . --quiet` -> **passed**.
- Playwright emitted the known non-failing Next workspace-root warning about multiple lockfiles; no test assertion failed.

## Checklist Validation

- Framework scaffolding exists (`playwright.config.ts`, Vitest tests, `package.json` scripts/dependencies).
- Acceptance criteria mapped to existing and newly added tests.
- Duplicate coverage avoided: no extra E2E journey was added for static content already covered by component/i18n/a11y tests.
- Test quality met: deterministic source/component assertions, no hard waits, no network/live service calls, no fixtures needed, and no brittle CSS selectors in E2E additions.
- CLI sessions cleaned up: N/A; no browser CLI session was opened.
- Temp artifacts: no `/tmp` worker outputs were created because no subagent/worker file generation was used.

## Assumptions, Risks, And Deferred Coverage

- Visual validation/reference promotion remains outside this TEA pass; Story 12.8 already records providerless visual candidate evidence and no reference PNGs were changed here.
- Existing full-suite story evidence remains the broader release-confidence baseline; this TEA pass reran only focused relevant checks plus typecheck/lint because it added one isolated unit/source test.
- The source-contract test intentionally pins Story 12.8's current "remove fake rate" decision. If a future story introduces a real measured public accuracy rate, this guard should be updated in that story with the real data-source contract.

## Definition Of Done

- Story 12.8 ACs were audited against existing automated coverage.
- One meaningful missing guardrail was added for fabricated accuracy/confidence and public-sun/pin semantic drift.
- Focused component/i18n/source, About a11y, typecheck, and lint checks passed.
- TEA automation evidence was persisted in this summary.

## Next Recommended Workflow

Continue orchestrator-owned review/test-review/trace gates as needed. Story 12.8 does not need additional API, contract, fixture, or broad E2E automation from this TEA pass.

---

# Automation Expansion Summary - Story 12.14 (Hide Closed Venues at Selected Time)

## Preflight And Context

- **Framework:** Vitest 4.1.4, Playwright, strict TypeScript, and ESLint are configured under `nextjs-app`; framework readiness passed.
- **Stack:** frontend selected-instant availability logic, search/favourites/detail components, and one internal `/api/venues` candidate-cap contract.
- **Mode:** BMad-integrated from `_bmad-output/implementation-artifacts/12-14-hide-closed-venues-open-at-selected-time-filter.md`.
- **Execution:** sequential/local. `playwright-cli` was unavailable, so browser exploration was skipped and source/test analysis was used. No CLI browser session was opened.
- **Scope:** post-dev coverage expansion only. Production source, visual references, sprint status, Auto-BMAD state, and git state were not changed.

## Coverage Plan

| Priority | Level | Target | Decision |
| --- | --- | --- | --- |
| P0 | Unit | Selected-instant utility should fail closed for malformed intervals and invalid instants without falling back to wall-clock time. | Added focused ATDD utility coverage. |
| P1 | Component | Exact closed search retention should include the intended normalized full-name equality, including accent/case differences, while still rejecting non-full-name matches. | Added focused search-shell component coverage. |
| P0 | Component/API/E2E | MapView filtering, favourites retention, detail copy, API candidate headroom, and browser no-provider paths. | Existing coverage was sufficient; reran focused Story 12.14 regression rather than duplicate. |

## Generated Coverage

- **UPDATED** `nextjs-app/test/unit/utils/opening-hours-selected-time.atdd.test.ts`
  - added malformed selected-weekday interval coverage;
  - added invalid selected-instant coverage proving no wall-clock fallback or fabricated open copy.
- **UPDATED** `nextjs-app/test/components/VenueSearchShell.test.tsx`
  - added closed exact-match retention for accent/case-normalized full-name input;
  - proves a non-full-name query remains filtered when the same venue is closed.
- **Aggregate:** +3 deterministic assertions across 2 existing test files. No new fixtures, helpers, E2E files, production code, live providers, or visual artifacts.

## Validation And Gate

- Baseline before edits: `npx tsc --noEmit` -> passed.
- Baseline before edits: `npx eslint . --quiet` -> passed.
- Focused new tests: `npx vitest run test/unit/utils/opening-hours-selected-time.atdd.test.ts test/components/VenueSearchShell.test.tsx` -> **2 files / 21 tests passed**.
- Focused Story 12.14 regression: `npx vitest run test/unit/utils/opening-hours-selected-time.atdd.test.ts test/unit/api/venues-route-candidate-cap.atdd.test.ts test/unit/api/venues-route.test.ts test/components/VenueCard.test.tsx test/components/VenueDetailContent.test.tsx test/components/FavouritesList.test.tsx test/components/VenueSearchShell.test.tsx test/components/VenueSearchCombobox.test.tsx test/components/MapView.test.tsx` -> **9 files / 250 tests passed**.
- Static checks after edits: `npx tsc --noEmit` -> passed; `npx eslint . --quiet` -> passed.

## Assumptions, Risks, And Deferred Coverage

- The story file's existing full Vitest, Playwright, and manual/provider-neutral visual validation remain the broader release-confidence baseline.
- No new Playwright/E2E test was added because the existing Story 12.14 E2E already covers closed discovery disappearance, retained exact closed search, retained closed favourite, detail state, and no provider fan-out.
- No Pact/CDC coverage was generated because Story 12.14 has no external provider contract change.

## Definition Of Done

- Existing Story 12.14 coverage was reviewed to avoid duplicate tests.
- Two concrete negative/normalization gaps were automated at the lowest reliable level.
- Focused new tests, focused Story 12.14 regression, typecheck, and lint passed.
- Durable automation evidence was persisted in this summary.

## Next Recommended Workflow

Continue orchestrator-owned test-review/trace/finalization for Story 12.14.

---

# Automation Expansion Summary - Epic 12 Gate Remediation Iteration 2

## Preflight And Context

- **Scope:** final allowed trace-gate remediation iteration for Stories 12.3, 12.7, 12.11, and 12.12.
- **Mode:** BMad-integrated `/bmad-testarch-automate`, sequential/local. No subagents were used.
- **Boundary:** evidence mapping and one narrow 12.11 Playwright test refinement only. Trace-gate files and the epic anchor were not modified.
- **Non-claims:** this pass does not claim protected GitHub Production, live Supabase, applied live migrations, protected Storage-policy verification, production p95, or broad-suite Playwright concurrency.

## Trace Evidence Mapping

| Story | Trace gap | Discoverable test / evidence surface | Result | Residual blocker |
| --- | --- | --- | --- | --- |
| 12.3 | 42-venue persisted-read/no-recompute route behavior | `nextjs-app/test/unit/api/story-12-3-persisted-geometry-route.atdd.test.ts` -> `42+ venue list requests read persisted current hashes and coverage without request-path recompute`; mapped in `_bmad-output/test-artifacts/atdd-checklist-12-3-day-series-compute-at-real-venue-scale-kill-the-cold-start-freeze.md` | Focused unit command passed 3 files / 29 tests, duration 3.77s. | Protected production p95 and protected GitHub environment evidence remain external. |
| 12.7 | Concurrent same-slug visibility/cache isolation | `nextjs-app/test/unit/services/story-12-7-public-venue-resolver.automation.test.ts` -> `[P1] isolates concurrent same-slug visibility reads without in-flight cache bleed`; mapped in `_bmad-output/test-artifacts/atdd-checklist-12-7-reviews-route-resolves-live-venues-fix-the-404-on-real-venues.md` | Focused unit command passed 3 files / 29 tests, duration 3.77s. | Live Supabase migration/schema visibility evidence remains external. |
| 12.11 | Exact successful future-date `/api/venues` response for the final selected planner date/time | `nextjs-app/test/e2e/map-primary.spec.ts` -> `mobile: selecting a future date sends planner params to the venues API`; mapped in Story 12.11 Dev Agent Record | Final serialized mobile repeat passed 3/3 in 18.4s after the test captured the final post-selection slider time. | Prior bounded parallel repeat still failed 2 passed / 1 failed and no broad-suite concurrency was exercised. |
| 12.12 | Local Storage migration public-read/no-browser-write policy matrix | `nextjs-app/test/unit/story-12-12-storage-upload-and-policy.atdd.test.ts` -> `[P0] local migration source permits browser public reads only for venue-media and no browser writes`; mapped in `_bmad-output/test-artifacts/atdd-checklist-12-12-venue-photos-supabase-storage-hosting-render-fallback-fixes.md` | Focused unit command passed 3 files / 29 tests, duration 3.77s. | Protected Supabase Storage applied-policy verification remains external. |

## Validation Results

- Focused units: `npx vitest run test/unit/api/story-12-3-persisted-geometry-route.atdd.test.ts test/unit/services/story-12-7-public-venue-resolver.automation.test.ts test/unit/story-12-12-storage-upload-and-policy.atdd.test.ts` -> **PASS**, 3 files / 29 tests, duration 3.77s.
- 12.11 bounded parallel probe before final fix: `npx playwright test test/e2e/map-primary.spec.ts --project=mobile --grep "mobile: selecting a future date sends planner params to the venues API" --repeat-each=3 --retries=0` -> **FAIL**, 2 passed / 1 failed. Failure occurred before the exact-response assertion at initial venue-pin readiness with a Next/Turbopack JSON parse warning. This was not broad-suite concurrency evidence.
- 12.11 serialized probe before final fix: `npx playwright test test/e2e/map-primary.spec.ts --project=mobile --grep "mobile: selecting a future date sends planner params to the venues API" --repeat-each=3 --workers=1 --retries=0` -> **FAIL**, 2 passed / 1 failed. Failure was a stale test oracle: the test matched the pre-click time while the selected-date UI had advanced to 13:00.
- 12.11 first post-refinement rerun: same serialized command -> **FAIL**, 3 failed, because the added wait compared the date-cell accessible label (`Välj 9 augusti 2026`) to the closed trigger text (`söndag 9 augusti`). The wait was corrected without changing product code.
- 12.11 final post-refinement rerun: same serialized command -> **PASS**, 3 passed, 18.4s. Playwright emitted the known non-failing Next multiple-lockfile workspace-root warning.

## Files Modified By This Pass

- `nextjs-app/test/e2e/map-primary.spec.ts`
- `_bmad-output/implementation-artifacts/12-11-first-run-coach-mark-guide-map-legend-feature-tour.md`
- `_bmad-output/test-artifacts/atdd-checklist-12-3-day-series-compute-at-real-venue-scale-kill-the-cold-start-freeze.md`
- `_bmad-output/test-artifacts/atdd-checklist-12-7-reviews-route-resolves-live-venues-fix-the-404-on-real-venues.md`
- `_bmad-output/test-artifacts/atdd-checklist-12-12-venue-photos-supabase-storage-hosting-render-fallback-fixes.md`
- `_bmad-output/test-artifacts/automation-summary.md`

## Definition Of Done

- Trace-discoverable evidence mapping was added for the already-verified Story 12.3, 12.7, and 12.12 unit tests.
- Story 12.11's future-date exact-response Playwright test now matches the final selected date/time, and the bounded serialized repeat passed after the fix.
- Failed bounded Playwright probes were recorded as failures, not reclassified as passes.
- Protected/live release evidence remains explicitly deferred to the release lane.

## Next Recommended Workflow

Re-run trace/test-review gates against the updated evidence surfaces. Do not treat this pass as satisfying protected production, live Supabase, protected Storage-policy, or production p95 evidence.

---
