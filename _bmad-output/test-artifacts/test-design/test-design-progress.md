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
lastSaved: '2026-07-04'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (## Epic 11 section, lines ~2791-3021)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (8 Epic-11 stories registered)'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-10.md (house style + regression-guard pattern)'
  - 'nextjs-app/components/composed/time/TimeSlider.tsx (11.2 pointer-events + per-step commit root cause verified)'
  - 'nextjs-app/components/custom/map/MapContainer.tsx (11.5 sand+gradient overlay root cause verified)'
  - 'nextjs-app/components/custom/map/UserPin.tsx (11.5 static dot / raw hex verified)'
  - 'nextjs-app/app/api/venues/route.ts (11.1 single-instant compute; no day-series; sunListRank verified)'
  - 'nextjs-app/components/composed/venue/VenueQuickInfo.tsx (11.4 Säkerhet/sunTimeRange/estimateLabel content verified)'
  - 'nextjs-app/components/custom/layout/DesktopNavBar.tsx (11.3 desktop-only chip row, overflow-hidden clip verified)'
  - 'nextjs-app/components/custom/sheets/MobileBottomSheet.tsx (11.3 peek/mid/full/dismissed snap machine verified)'
  - 'nextjs-app/lib/utils/sun-status-presentation.ts (11.7 orphaned toSunStatusToken verified)'
  - 'nextjs-app/vercel.json (11.7 A2 lightningcss || true swallow verified) + .gitattributes (11.7 A3 EOL gap verified)'
  - 'nextjs-app/test/e2e/* (epic-10-weather-matrix, axe, axe-mobile, map-primary, responsive-layout, epic-9-mobile-regression)'
  - 'resources/knowledge/{risk-governance,probability-impact,test-levels-framework,test-priorities-matrix}.md'
---

# Test Design Progress — Epic 11 "Feels Instant, Reads Clear"

## Step 1 — Mode Detection
- Mode: **Epic-Level** (user-requested EPIC-LEVEL for epic 11 AND `sprint-status.yaml` present → file-based
  detection also resolves Epic-Level). Epic 11 = 8 stories (11.1–11.8). Prereq PASS: per-story ACs + Design
  Gate Criteria present in epics.md; the app is LIVE in prod so the target surfaces are real, readable source.

## Step 2 — Context Loaded
- Stack: **fullstack** — Next.js 16 / React 19, Vitest + Playwright, `@axe-core/playwright` AA gate ACTIVE/green.
- **All six named root causes + hygiene targets independently confirmed in HEAD source** (not taken on faith):
  1. `TimeSlider.tsx` — value badge (:52-61) + thumb `div` (:104-118) absolutely positioned OVER the invisible
     `<input type=range>` (:73-103) with NO `pointer-events-none`; `onChange`→`adjust`→`onMinutesChange` commits
     PER STEP (settle on onPointerUp/onBlur via `onSnap`); no today-min clamp, no date-range rule here.
  2. `app/api/venues/route.ts` — computes ONE `requestedAt` per request (`resolveRequestedAt`); no day-series
     field in `GetVenuesResponse`; every scrub re-buys the whole per-venue engine walk. `sunListRank` (client+server
     mirror) exists and must stay in lock-step (Epic-10 carry-in).
  3. `MapContainer.tsx` — `bg-surface-sand/80` div (zIndex:1, :169-173) + `gradient-map-overlay` (zIndex:2, :174-178)
     wash over the basemap.
  4. `DesktopNavBar.tsx` — data-driven chip row (`collectTags`/`localizeTag` + `TagFilterContext`) renders ONLY here,
     inside an `overflow-hidden` flex row (:104) → hard mid-chip clip; mobile has NO chip UI.
  5. `VenueQuickInfo.tsx` — "Säkerhet: NN%" (:285), "Sol HH:mm–HH:mm" via `sunTimeRange` (:273), `estimateLabel`
     into RouteButton (:330); NO `openingHours` prop today (must be surfaced on the list DTO).
  6. `MobileBottomSheet.tsx` — snap machine is peek/mid/full/dismissed; `dismissed` is pointer-events-none (NOT a
     handle-only interactive collapsed snap); no chip row in the header (children only).
  Hygiene: `UserPin.tsx` static 18px dot, STATIC halo, raw `#d97706` (no token); `toSunStatusToken`
  (sun-status-presentation.ts:15) orphaned — only its own unit test consumes it; `vercel.json` installCommand
  ends `... || true` (swallows lightningcss failure); root `.gitattributes` covers only `/.gitattributes` + `*.sh`
  — no LF normalization for `.ts/.tsx/.json/.css`; nextjs-app has none (Epic-10 confidence-calculator.ts EOL churn).
- Knowledge fragments loaded: risk-governance, probability-impact, test-levels-framework, test-priorities-matrix.
  Pact fragments N/A (no consumer/provider contract surface). Browser-exploration skipped (test PLAN, live prod app,
  ratified host screenshot-tooling bug).

## Step 3 — Risk & Testability
- 18 risks, TECH/SEC/PERF/DATA/BUS/OPS, scored P×I (1–9). 6 high (≥6) incl. one CRITICAL:
  **R-001** the ~9.6 s time-change stall persists / "shipped-but-insufficient" repeats (PERF/BUS 9);
  **R-002** per-step commit still floods requests during drag (PERF 6);
  **R-003** day-series payload/geometry drift — client-derived values disagree with the old server-per-instant truth,
  or the gzipped payload bloats (DATA/PERF 6);
  **R-004** thumb-grab drag still dead on real touch — emulated e2e passes, physical finger fails (BUS/TECH 6);
  **R-005** date-change unmounts/reloads markers or Epic-10 weather-gating regresses in the client-derived path (BUS/DATA 6);
  **R-006** map de-dull drops pin/label contrast below the axe AA gate (SEC/BUS 6, a11y).

## Step 4 — Coverage Plan
- P0/P1/P2/P3 matrices with risk linkage + dedup discipline (client series math = UNIT; DTO series contract = API;
  slider/sheet/chip/quick-info/detail render + a11y = COMPONENT; instant-scrub / date-change / touch-drag = E2E incl.
  a REAL-touch profile + a request-count guard). Estimates as ranges; quality gates defined. The live-perf number
  (date-change p95 < 3 s) is wall-clock-measured (Story 11.8) and CANNOT be a CI gate — the CI gate is the
  request-count invariant (scrub = 0 fetches, date change = 1).

## Step 5 — Output Generated
- `_bmad-output/test-artifacts/test-design/test-design-epic-11.md` (epic-level single doc). Validated against
  `checklist.md`. Sequential mode (single artifact). No CLI browser sessions opened; all artifacts under test-artifacts/.
