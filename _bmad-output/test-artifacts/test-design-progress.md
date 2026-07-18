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
lastSaved: '2026-07-18'
---

# Test Design Progress

## Step 1: Detect Mode & Prerequisites

Mode: Epic-Level Mode.

Rationale: The requested scope is explicitly "epic 12 (epic + its stories)" and asks for an epic test plan / risk matrix. System-level PRD/ADR gate work was not requested for this run.

Prerequisites:

- Epic/story requirements with acceptance criteria: available in `_bmad-output/planning-artifacts/epics.md` and story files under `_bmad-output/implementation-artifacts/`.
- Architecture context: available in `_bmad-output/planning-artifacts/architecture.md` and durable project context in `project-context.md`.

Next step: load context for Epic 12.

## Step 2: Load Context

Loaded inputs:

- `_bmad-output/planning-artifacts/epics.md`, Epic 12 and Stories 12.1–12.14.
- `_bmad-output/implementation-artifacts/12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours.md`, status done.
- `_bmad-output/planning-artifacts/prd.md`, `_bmad-output/planning-artifacts/architecture.md`, `_bmad-output/planning-artifacts/ux-design-specification.md`, and Google Places policy research.
- `project-context.md`, including Epic 12 invariants and the 2026-07-13 closed-search/favourite product decision.
- Existing Epic 12 test-design drafts plus Epic 11 design, traceability, and NFR evidence.
- Current test/CI wiring: `nextjs-app/playwright.config.ts`, `.github/workflows/build-and-test-nextjs.yml`, `nextjs-app/test/e2e/axe-mobile.spec.ts`, and coverage scan results.

Detected stack: fullstack Next.js/Supabase application with Playwright, Vitest, PostGIS/Supabase, scheduled workflows, and frontend visual/accessibility gates. Pact fragments were loaded because the TEA config enables Pact utilities, but no consumer/provider contract output was required for Epic 12's current architecture.

Browser exploration: skipped. `playwright-cli` was not installed, and this run is a document-level test design refresh rather than UI behavior verification.

## Step 3: Testability & Risk Assessment

Testability concerns:

- Persisted geometry, hash coverage, RLS, lease/atomic promotion, and schema-diff evidence need Compose test PostGIS or an isolated preview Supabase lane.
- Reviews and feedback still show fixture-only resolver seams in the current code scan, so Story 12.7 remains a concrete launch blocker.
- Mobile accessibility evidence is currently vacuous: `a11y-mobile` exists, but CI omits it and current mobile axe scenarios are `test.fixme`.
- Several Epic 12 stories touch shared public predicates and query/request-count contracts, so focused story tests are insufficient whenever DTOs, query keys, availability, sunny semantics, or mobile interactions change.

Testability strengths:

- Existing Epic 10/Epic 11 no-live-provider, scrub/date request-count, touch, query-key, and opening-hours formatter coverage gives a strong regression base.
- Story 12.1 is complete and provides Epic 12-specific provider-neutral hours, provenance, governance migration, policy-scan, and protected production remediation evidence.
- Playwright projects are already split across `mobile`, `desktop`, `touch`, `a11y`, and `a11y-mobile`, giving a clear route to non-vacuous accessibility enforcement.

ASRs:

- ACTIONABLE: service-only persisted geometry/weather/run artifacts with exact RLS/REST denial.
- ACTIONABLE: canonical `geometry_input_hash` and atomic generation promotion.
- ACTIONABLE: one public live venue resolver for slug/id across list, detail, reviews, feedback, favourites, and prefetch.
- ACTIONABLE: one selected-instant availability predicate and one public sunny predicate.
- ACTIONABLE: no Google `regularOpeningHours` persistence or live provider calls in tests.
- ACTIONABLE: non-vacuous mobile WCAG automation for affected Epic 12 UI.
- FYI: Epic 12 remains an MVP launch-readiness pass; planner/premium/future monetization flows stay out of scope.

Risk summary:

- Total risks: 23.
- High-priority risks: 11.
- Score-9 release blockers: R-001 through R-006.
- Score-6 risks: R-007, R-008, R-009, R-010, R-023.
- Highest priorities before public launch: persisted geometry performance/security, live venue identity, selected-time availability, scrub/date request-count preservation, shared sunny semantics, schema drift, and non-vacuous mobile accessibility.

NFR planning summary:

- In scope: security, performance, reliability, scalability, accessibility, compliance/policy, maintainability, and UX/visual evidence.
- Known thresholds include cold p95 approximately <=5s for 42+ venues, warm/edge p95 <200ms, pin render <=100ms, service-only RLS denial, zero provider fan-out on public request paths, 44x44 interactive targets, and WCAG 2.1 AA.
- Unknown thresholds remain explicit: no numeric instant-detail latency for Story 12.10, no numeric coach-mark transition duration beyond UX tokens, and no numeric visual-diff tolerance.

## Step 4: Coverage Plan & Execution Strategy

Coverage plan:

- P0: 10 launch-blocking scenario groups, approximately 70–110 atomic checks, covering persisted geometry, service-only artifact security, canonical hash, scheduled coverage, weather budget/degradation, live venue identity, selected-instant availability, public sunny semantics, scrub/date request counts, and confidence removal.
- P1: 13 high-value scenario groups, approximately 70–113 atomic checks, covering hours governance, policy guard, mobile sheet/touch/a11y, console hygiene, media, coach marks, About explanation, feedback accuracy, schema drift, visual rebaseline, mobile accessibility CI, and supersession guards.
- P2/P3: synthetic headroom, timezone fuzz, physical devices, repeated cold p95 observation, and exploratory recovery.

Execution strategy:

- PR: typecheck, lint, full Vitest, deterministic Playwright projects, SQL/security/migration tests where isolated infrastructure is available, plus static policy/routing guards.
- Nightly: longer deterministic scheduled-job, lease/atomicity, retry/deadline, and migration replay evidence.
- Weekly/release-candidate: production-like cold p95, physical-device checks, visual rebaseline review, and public-launch sign-off.

Quality gates:

- P0 pass rate 100%; no waiver for score-9 risks.
- P1 pass rate at least 95%.
- Security/policy scenarios pass 100%.
- Requirements/risk traceability covers Stories 12.1–12.14.
- Final NFR PASS/CONCERNS/FAIL remains deferred to the NFR assessment after implementation evidence exists.

## Step 5: Generate Output & Validate

Execution mode: sequential Epic-Level mode. No subagents were used.

Output file:

- `_bmad-output/test-artifacts/test-design/test-design-epic-12.md`

Validation:

- Used the bundled epic-level `test-design-template.md` structure.
- Included risk matrix, NFR planning, coverage matrix, NFR evidence map, execution strategy, ranges-only estimates, quality gates, traceability, evidence lanes, and assumptions.
- Corrected a corrupted coverage-table row that contained literal truncation text in the prior generated artifact.
- CLI/browser cleanup: no browser sessions were opened.
- Temp/progress artifacts are under `_bmad-output/test-artifacts/`.
