---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted:
  - 'step-01-detect-mode'
  - 'step-02-load-context'
  - 'step-03-risk-and-testability'
  - 'step-04-coverage-plan'
  - 'step-05-generate-output'
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-07-02'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (## Epic 10 section, lines 2645-2790)'
  - '_bmad/tea/config.yaml'
  - 'nextjs-app/lib/services/sun-engine.ts (status derivation, skyCondition, weather adapter)'
  - 'nextjs-app/lib/weather/met-no-service.ts (cloud_area_fraction ?? 0 default, compact endpoint)'
  - 'nextjs-app/lib/solar/confidence-calculator.ts (calcCloudCertainty ignores cloudCover)'
  - 'nextjs-app/lib/types/api.ts (VenueSunStatus union, skyCondition DTO field)'
  - 'nextjs-app/lib/types/design-tokens.ts (SunStatus / SkyCondition token unions)'
  - 'nextjs-app/lib/types/map.ts (sunStatus pin type)'
  - 'nextjs-app/lib/utils/venue-pin-mapping.ts'
  - 'nextjs-app/components (VenuePin, VenueCard, VenueQuickInfo, VenueDetailContent, VenueList, FeedbackFlow)'
  - 'nextjs-app/test/e2e/map-primary.spec.ts (?_time forcing, no weather-boundary mock today)'
  - 'project-context.md (Epic 9 ratified conventions, caching windows, prod-gate)'
  - 'resources/knowledge/risk-governance.md'
  - 'resources/knowledge/probability-impact.md'
  - 'resources/knowledge/test-levels-framework.md'
  - 'resources/knowledge/test-priorities-matrix.md'
---

# Test Design Progress — Epic 10 "Honest Sky" (Weather-Gated Two-Signal Sun Display)

## Step 1 — Mode Detection

- Mode: **Epic-Level** (user-requested EPIC-LEVEL mode for epic 10 AND
  `_bmad-output/implementation-artifacts/sprint-status.yaml` present → file-based detection also
  resolves Epic-Level).
- Epic: 10 — "Honest Sky", 5 stories (10.1–10.5).
- Prerequisite check PASS: epic + per-story acceptance criteria present in epics.md (lines 2645-2790);
  architecture context available via the live source tree. No per-story story-context files exist yet
  (they are created later in the pipeline); plan is grounded on epics.md AC + read of the live codebase
  that the epic targets.

## Step 2 — Context Loaded

- Stack detected: **frontend/fullstack** — Next.js 16 + React 19, Vitest (`test`) + Playwright (`test:e2e`),
  `@axe-core/playwright` a11y gate (ACTIVE and green as of Epic 9).
- Existing tests confirmed: vitest unit/component suites under `nextjs-app/test/{unit,components}`
  (incl. `sun-engine.test.ts`, `confidence-calculator.test.ts`, `met-no-service.test.ts`, `venues-route*.test.ts`,
  `venue-pin-mapping.test.ts`, and the four venue-surface component tests); 12 Playwright e2e specs under
  `nextjs-app/test/e2e` (smoke, map-primary, onboarding, favourites, feedback, review, visit-loop,
  responsive-layout, axe, axe-mobile, epic-9-mobile-regression).
- **Critical finding for determinism:** e2e specs today hit the REAL dev-server `/api/venues` (server computes
  state from the live Met.no fetch); there is NO deterministic weather-boundary mock in the e2e layer. `?_time=`
  forcing exists but only pins wall clock, not sky. Weather-state e2e (Story 10.5) MUST add a new deterministic
  weather mock (network `page.route` on `/api/venues`, or a dev-only weather-forcing param) or it will be sky-flaky.
- **Root causes independently confirmed in source** (all four cited by the epic): `met-no-service.ts:85`
  `cloud_area_fraction ?? 0`; `confidence-calculator.ts:151-157` `calcCloudCertainty` reads only
  freshness/forecast-flag/source; `sun-engine.ts:439-441` derives `currentSunStatus` from geometry (isSunVisible)
  only; `sun-engine.ts:451-453` computes `skyCondition` but no component consumes it. `VenueSunStatus` =
  `'Sunny' | 'Partial' | 'Shaded' | 'NoSun'` (api.ts:7). `design-tokens.ts` `SkyCondition` ALREADY carries `'rain'`;
  `SunStatus` has no cloud/obscured value yet.
- Config flags: `tea_use_playwright_utils=true`, `tea_pact_mcp=mcp`, `tea_browser_automation=auto`,
  `risk_threshold=p2`, `tea_execution_mode=auto`. Browser exploration skipped: this host cannot screenshot the dev
  server via the automated gate (ratified HOST TOOLING BUG), and the epic is predominantly engine/data — grounded
  on code + docs instead.
- Knowledge fragments loaded: risk-governance, probability-impact, test-levels-framework, test-priorities-matrix
  (Epic-Level required set). NFR loading triggered (reliability of external weather deps, performance of the
  cache/gate, maintainability of the tunable constants). Pact fragments N/A (no consumer/provider contract surface;
  Met.no/Nowcast are external third-party HTTP the app degrades from, not contract-tested partners).

## Step 3 — Risk & Testability

- 17 risks identified, classified TECH/SEC/PERF/DATA/BUS/OPS, scored P×I (1–9). See final doc.
- 6 high-priority risks (≥6): **R-001** the core failure returns — 100% cloud / rain renders FULL SOL on any
  surface (DATA/BUS 9, CRITICAL); **R-002** missing-cloud defaults to clear-sky (the wrong failure mode) (DATA 6);
  **R-003** incomplete `VenueSunStatus` union sweep → an unhandled 5th state crashes or silently mis-renders a
  consumer (TECH 6); **R-004** absence-of-rain leaks a positive sun signal, violating the hard constraint (BUS/DATA 6);
  **R-005** weather-state e2e is sky-flaky because no deterministic weather-boundary mock exists yet (TECH/OPS 6);
  **R-006** the gate mutates cached engine output but the 15-min cache pins an inconsistent status/weather pair (PERF/DATA 6).
- NFR planning captured for Reliability (Nowcast/complete-endpoint outage → silent Tier-0 degrade, never a throw/500),
  Performance (extra Nowcast fetch inside the request must respect dedupe/cache and not blow the sun-compute budget),
  Maintainability (single named tunable threshold + documented cloud-layer weighting formula), and a11y (the new muted
  Obscured state must keep the axe AA gate green). Unknown thresholds flagged, not invented.

## Step 4 — Coverage Plan

- P0/P1/P2/P3 scenarios mapped to Unit / Component / API / E2E levels with risk linkage, dedup-checked against the
  existing unit + e2e files. Red-first unit matrix is the acceptance signal for the engine stories (10.1/10.3/10.4);
  the two-signal UI (10.2) adds component tests across four visual states + a11y; 10.5 owns the deterministic mocked-
  weather e2e matrix + regression guards + the recorded live spot-check. Estimates as ranges. Quality gates defined.

## Step 5 — Output Generated

- Output: `_bmad-output/test-artifacts/test-design/test-design-epic-10.md` (epic-level single doc).
- Validated against `checklist.md` (Epic-Level path). Sequential execution mode (single artifact). No CLI browser
  sessions opened (none required); no temp artifacts outside `{test_artifacts}`.
