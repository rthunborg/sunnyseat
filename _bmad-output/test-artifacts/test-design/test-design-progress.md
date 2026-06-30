---
stepsCompleted:
  - 'step-01-detect-mode'
  - 'step-02-load-context'
  - 'step-03-risk-and-testability'
  - 'step-04-coverage-plan'
  - 'step-05-generate-output'
lastStep: 'step-05-generate-output'
lastSaved: '2026-06-30'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (## Epic 9 section, lines 2339-2644)'
  - '_bmad/tea/config.yaml'
  - 'nextjs-app/lib/dev/use-forced-state.ts'
  - 'nextjs-app/components/custom/layout/AppContextProviders.tsx'
  - 'nextjs-app/lib/services/sun-engine.ts'
  - 'nextjs-app/app/api/venues/route.ts'
  - 'nextjs-app/lib/utils/venue-visual-metadata.ts'
  - 'nextjs-app/components/custom/onboarding/OnboardingGate.tsx'
  - 'resources/knowledge/risk-governance.md'
  - 'resources/knowledge/probability-impact.md'
  - 'resources/knowledge/test-levels-framework.md'
  - 'resources/knowledge/test-priorities-matrix.md'
---

# Test Design Progress — Epic 9 "Live-App Hardening & Clean-Up"

## Step 1 — Mode Detection

- Mode: **Epic-Level** (user-requested AND `_bmad-output/implementation-artifacts/sprint-status.yaml`
  present → file-based detection also resolves Epic-Level).
- Epic: 9 — "Live-App Hardening & Clean-Up", 11 stories (9.0–9.10).
- Prerequisite check PASS: epic + per-story acceptance criteria present in epics.md; architecture context
  available via the live source tree. Per-story story-context files do not exist yet (created later in the
  pipeline) — plan is based on epics.md AC + grounded against the live codebase.

## Step 2 — Context Loaded

- Stack detected: **frontend/fullstack** — Next.js 16 + React 19, Playwright (`test:e2e`) + Vitest (`test`).
- Existing tests: 92 vitest unit/component files under `nextjs-app/test/{unit,components}`; 11 Playwright
  e2e specs under `nextjs-app/test/e2e` (smoke, map-primary, onboarding, favourites, feedback, review,
  visit-loop, responsive-layout, axe, axe-mobile). axe gate fails only on serious/critical impact.
- Config flags: `tea_use_playwright_utils=true`, `tea_browser_automation=auto`, `risk_threshold=p2`,
  `tea_execution_mode=auto`. Browser exploration skipped (no running local server; grounded on code + docs +
  the live mobile/desktop triage already captured in epics.md instead).
- Knowledge fragments loaded: risk-governance, probability-impact, test-levels-framework,
  test-priorities-matrix (Epic-Level required set). Pact fragments N/A (no microservice contract surface).

## Step 3 — Risk & Testability

- 18 risks identified, classified TECH/SEC/PERF/DATA/BUS/OPS, scored P×I (1–9). See final doc.
- 6 high-priority risks (≥6): R-001 prod planner-leak (SEC/TECH 6), R-002 double-RPC + uncached engine
  (PERF 9), R-003 fabricated/contradictory venue metadata (DATA/BUS 6), R-004 onboarding-gate hydration +
  stale SW shell (BUS 6), R-005 time→query-key non-debounce refetch storm (PERF 6), R-006 tag-column
  additive migration on the live DB (DATA 6).

## Step 4 — Coverage Plan

- P0/P1/P2/P3 scenarios mapped to Unit / Component / API / E2E levels with risk linkage, dedup-checked
  against the existing 92 unit + 11 e2e files. Estimates as ranges. Quality gates defined.

## Step 5 — Output Generated

- Output: `_bmad-output/test-artifacts/test-design/test-design-epic-9.md` (epic-level single doc).
- Validated against `checklist.md` (Epic-Level path). Sequential execution mode (single artifact).
