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
lastSaved: '2026-07-13T19:10:00+02:00'
inputDocuments:
  - 'project-context.md'
  - '_bmad/tea/config.yaml'
  - '_bmad-output/planning-artifacts/epics.md (Epic 12, Stories 12.1-12.14)'
  - '_bmad-output/planning-artifacts/prd.md (FR/LR/NFR Epic 12 delta)'
  - '_bmad-output/planning-artifacts/architecture.md (E12-AD-01 through E12-AD-13)'
  - '_bmad-output/planning-artifacts/ux-design-specification.md (Epic 12 shared contracts and forced states)'
  - '_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-12.md'
  - '_bmad-output/planning-artifacts/research/technical-google-places-api-policy-epic-12-research-2026-07-12.md'
  - '_bmad-output/qa/epic-12-test-design-2026-07-12.md (existing approved system-delta QA input)'
  - 'nextjs-app/package.json and playwright.config.ts'
  - '.github/workflows/build-and-test-nextjs.yml'
  - 'nextjs-app/test/**/* (coverage and skip/fixme scan)'
  - 'resources/knowledge/{risk-governance,probability-impact,test-levels-framework,test-priorities-matrix,nfr-criteria,playwright-cli}.md'
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

---

# Test Design Progress — Epic 12 "Real-Venue Launch Readiness"

## Step 1 — Mode Detection
- Mode: **Epic-Level**. The delegated request explicitly requires Epic 12 plus its stories, and
  `_bmad-output/planning-artifacts/epics.md` contains Story 12.1 through Story 12.14 with acceptance criteria.
- Prerequisites: **PASS**. Epic/story requirements are available, with architecture context in
  `_bmad-output/planning-artifacts/architecture.md` and the active project invariants in `project-context.md`.

## Step 2 — Context Loaded
- Configuration: Playwright utilities enabled, Pact utilities enabled, browser mode `auto`, stack detected as
  **fullstack Next.js** (React UI plus App Router API routes/Supabase), artifacts under
  `_bmad-output/test-artifacts`. Pact CDC patterns are not selected because SunnySeat is one deployable and has
  no independently versioned consumer/provider contract; route/DB contracts use Vitest, SQL, and Playwright.
- Controlling inputs loaded: Epic 12 stories, PRD LR/NFR delta, UX shared contracts, architecture
  `E12-AD-01`…`E12-AD-13`, approved sprint-change proposal, provider-policy research, project context, and the
  existing dated Epic 12 QA system-delta plan.
- Existing strengths: broad Vitest unit/component coverage, deterministic Epic 10 weather/no-live-Met.no guards,
  Epic 11 scrub=0/date-change=1 request-count E2E, dedicated Chromium real-touch specs, desktop axe coverage,
  query-key tests, and pure opening-hours formatting coverage.
- Existing gaps: no Epic 12 persisted-geometry/hash/coverage/RLS tests; no live id/slug+visibility route matrix;
  no selected-instant availability predicate; no Google-content policy guard; no console/pageerror gate; no
  bounded detail-prefetch tests; no row-quantized sheet, coach-mark, media-rendition, or confidence-removal suite.
  Existing route tests are largely fixture/mock based and there is no current Compose-backed SQL/RLS gate.
- Accessibility warning: `a11y-mobile` is defined but deliberately absent from CI, and all of its current scenarios
  are `test.fixme`; a green run is vacuous until Epic 12 adds live mobile axe coverage and CI wiring.
- Browser exploration skipped: `playwright-cli` is not installed on this host, and no running target was needed;
  source, test, and canonical-design artifacts provide the required testability evidence.

## Step 3 — Risk & Testability
- Risk scale: probability 1–3 × impact 1–3. Score 9 blocks release; scores 6–8 require completed
  mitigation or an explicit owner/expiry waiver. The Epic 12 register contains **23 risks**, including **11 high
  risks (score >=6)**.
- Critical score-9 risks: cold 42+ venue request freeze/request-path fallback (`R-001`), public access or poisoning
  of service-only artifacts (`R-002`), hidden/live identity drift (`R-003`), selected-instant hours policy drift
  across surfaces (`R-004`), scrub/date request-count regression (`R-005`), and public-sunny predicate/comparator
  drift (`R-006`).
- High score-6 risks: non-production editor guard failure (`R-007`), hash/invalidation/atomic-promotion drift
  (`R-008`), weather snapshot budget/freshness/unknown errors (`R-009`), schema/type/DTO drift (`R-010`), and
  **vacuous mobile accessibility coverage (`R-023`)** because `a11y-mobile` is not invoked by CI and all current
  cases are `test.fixme`. `R-023` is mitigated only by live Epic 12 mobile axe scenarios plus non-vacuous CI wiring
  before affected UI stories can pass review.
- NFRs in scope: performance (cold p95 approximately <=5 s; warm/edge p95 <200 ms; 50-pin render <=100 ms),
  security (service-only RLS/role denial; editor production hard deny; Storage write denial), reliability (100%
  exact current-hash coverage across today..planner horizon+1; typed 503 on missing geometry; explicit weather
  unknown), scalability (coordinate-deduped weather snapshots, concurrency 4, 2 s timeout, <=2 transient retries),
  accessibility (WCAG 2.1 AA, 44x44 targets, keyboard/reduced-motion), compliance (zero Google hours/content path),
  maintainability (one shared resolver/hash/predicate/availability seam and empty post-apply schema diff), and
  visual governance (human-approved rebaseline with log update).
- Thresholds intentionally left **UNKNOWN**: numeric detail-preload latency, coach-mark transition timing beyond
  design tokens, and a numeric screenshot-diff tolerance. These remain qualitative evidence gates and are not
  assigned invented numbers.

## Step 4 — Coverage Plan
- P0 covers persisted geometry/hash/coverage/security, scheduled-run completeness, weather snapshot degradation,
  public identity/visibility, selected-instant availability, request-count/prefetch invariants, the shared sunny
  predicate/comparator, and the editor production deny. Pure rules stay at unit level; SQL/route boundaries use
  integration/API tests; only user-visible cross-surface behavior is repeated at component/E2E level.
- P1 covers confidence removal, provider-neutral hours/provenance and Google-policy guards, row-quantized touch,
  console hygiene, media rendition/security/fallback, coach marks, About/feedback contracts, migrations/schema drift,
  visual rebaselines, story supersession guards, and **non-vacuous mobile accessibility CI coverage**.
- P2/P3 cover synthetic 100-venue headroom, timezone/DST fuzzing, scheduled-run burn-in, repeated cold p95,
  physical devices, and exploratory recovery paths.
- Execution: deterministic functional, SQL/security, policy/static, and applicable Playwright coverage in PRs when
  under ~15 minutes; larger fixture/burn-in/fault-injection jobs nightly; production-like p95, physical-device,
  operational, and rebaseline sign-off weekly or at release candidate. Tests never call live providers.
- Estimate: P0 ~55–90 h; P1 ~50–85 h; P2 ~12–24 h; P3 ~8–16 h; total ~125–215 h (roughly 3–6 engineer-weeks,
  excluding implementation and human approval time).
- Gates: P0 100%; P1 >=95%; security/policy 100%; every score>=6 mitigation complete before launch; >=80% atomic
  scenario automation; every invoked Playwright project must collect at least one real test (zero/fixme-only is a
  failure); full NFR verdict deferred to post-implementation `nfr-assess`.

## Step 5 — Output Generated
- Execution mode: **sequential** (Epic-level single artifact; delegate nesting was explicitly disallowed).
- Output: `_bmad-output/test-artifacts/test-design/test-design-epic-12.md`.
- Validation: checklist structure reviewed; 23 unique risk IDs and all probability×impact scores verified; 11
  high risks confirmed; local markdown links resolve; no template placeholders remain; `git diff --check` passes.
- No browser session or temporary exploration artifact was created.
