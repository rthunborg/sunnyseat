# Sprint Change Proposal — Epic 12 Real-Venue Launch Readiness

- **Date:** 2026-07-12
- **Project:** SunnySeat
- **Change trigger:** `_bmad-output/planning-artifacts/epics.md` § Epic 12
- **Mode:** Batch
- **Scope classification:** Major planning/architecture alignment; stable implementation backlog
- **Recommended path:** Direct Adjustment
- **Approval:** Approved by Rasmus on 2026-07-12

## 1. Issue Summary

Epic 12, **“Real-Venue Launch Readiness”**, is the approved brownfield change signal. First production contact with 42 real venues proved that the product can be live on its real data path while still not be ready for a public launch. The most material evidence is the cold `/api/venues` path: the fixture-era day-series design performs 42 venues × 61 shadow steps on a single serverless CPU and has timed out after 120 seconds.

Epic 12 is internally viable and must remain one epic with Stories 12.1–12.14 unchanged and unrenumbered. Shipped Epics 1–11 are historical records and must not be rewritten. The planning baseline around those stories is stale: it still describes fixture-era scale, process-local compute-on-request as sufficient, visible confidence percentages as a core UX promise, fixed bottom-sheet snaps, direct-database-only venue maintenance, and an April implementation-readiness state.

The course correction is therefore not a new epic or a rollback. It is a focused reconciliation of the living PRD, UX, architecture, project context, active test design, and implementation-readiness position with the approved Epic 12 contract.

## 2. Impact Analysis

### 2.1 Epic and story impact

- **Epics 1–11:** No changes. Preserve them as shipped history.
- **Epic 12:** No redesign, split, merge, removal, or renumbering. Preserve Stories 12.1–12.14 verbatim.
- **Epic sequencing:** Preserve the recommended sequence in Epic 12. Story 12.3 remains the first launch-blocking implementation item when the epic is activated.
- **Sprint status:** No change. `sprint-status.yaml` already registers `epic-12` and all fourteen stories as `backlog`.
- **`epics.md` outside the Epic 12 section:** One surgical change is required because Story 12.13 explicitly mandates it: amend only the forward-looking Requirements Inventory, UX Design Requirements, and FR Coverage Map. Do not edit historical Epic 1–11 story text or the Epic 12 stories.

### 2.2 Contradictions found

| ID | Existing artifact statement | Approved Epic 12 signal | Required resolution |
|---|---|---|---|
| C-01 | `project-context.md` says `public.venues` contains 7 test/fixture venues and no bulk production data. | Epic 12 records 42 real Göteborg venues loaded on 2026-07-07. | Correct the factual current-state section immediately. |
| C-02 | Project context says the MVP is feature-complete and shipped, without distinguishing real-path cutover from public-launch readiness. | Epic 12 exists because the 42-venue production path is unusable cold and has live-route defects. | State “live on real data path, public launch readiness incomplete”; name Epic 12 as backlog. |
| C-03 | Architecture says process-scoped caches lost on cold start are “fine at MVP scale, 7 venues” and that precompute was disproportionate. | Story 12.3 mandates persisted ungated geometry and read-time weather gating because 42 venues freeze cold instances. | Supersede the fixture-era cache decision and document the persisted geometry architecture. |
| C-04 | PRD FR2/FR7/FR12, user journeys, UX principles/components/screens, `epics.md` inventory, and the active QA addendum promise visible confidence percentages. | Story 12.13 removes every visible and screen-reader confidence number while keeping the internal model and uncertainty signals. | Supersede the user-facing number consistently; retain internal confidence and weather/uncertainty honesty. |
| C-05 | UX says no teaching or legend is required and that the confidence percentage is self-explanatory. | Stories 12.8 and 12.11 add a map legend, explanation of sun %, and a first-run coach-mark guide. | Replace the no-teaching assumption with lightweight, skippable teaching. |
| C-06 | UX pin specs show shaded pins with a percentage and treat Sunny/Partial as amber. | Story 12.6 defines amber only when >50% sunlit and not weather-gated; all other pins are one grey cloud pin with no percentage. | Define one shared sunny predicate and update visual, copy, sorting, and accessible-name contracts. |
| C-07 | UX and project context bind the mobile sheet to peek/mid/full or peek/full/dismiss snaps. | Story 12.9 replaces the snap enum with a height-driven, row-quantized 0..maxRows model. | Replace fixed-snap behavior and update forced-state/recenter/test contracts. |
| C-08 | PRD/architecture/project context say venue changes are direct DB work only and no app editing API exists. | Story 12.5 adds a localhost/dev-only fail-closed editor and write route, while preserving the no-production-admin decision. | Clarify the exception: no production admin surface; a dev-only maintenance tool is permitted under a production hard deny. |
| C-09 | Story 11.9 context and UX display hours for the current wall-clock weekday and explicitly do not implement minute-precise open state. | Story 12.14 filters every venue source at the selected planner instant and aligns hours copy to that same instant. | Add selected-instant availability semantics, unknown-vs-closed behavior, and past-midnight handling. |
| C-10 | Architecture says the REST contracts require no changes. | Epic 12 changes feedback evidence fields, venue visibility resolution, persisted geometry, thumbnail rendition selection, and potentially list-cap behavior. | Replace “no changes” with versioned, validated contract evolution behind the existing API boundary. |
| C-11 | PRD NFR35 says daily precomputed sun data falls back to the previous day with reduced confidence. | Story 12.3 persists day-specific ungated geometry across the selectable window and never substitutes yesterday’s geometry; weather gates on read. | Rewrite NFR35 around coverage completeness, midnight rollover, explicit missing coverage, and current weather gating. |
| C-12 | PRD classifies the product as having no compliance constraints. | Story 12.1 is gated on current Google Places storage, attribution, and non-Google-map display terms or a provider pivot. | Record external-data licensing/terms as an integration constraint without recasting the domain as regulated. |
| C-13 | Active QA scope says confidence display is required and covers only Stories 2.5–2.7. | Epic 12 changes confidence, performance, data, routing, map, accessibility, cron, storage, and security contracts. | Add an Epic 12 system test-design delta and supersede the confidence-display clauses. |
| C-14 | April readiness says all planning artifacts align, no database tables are created, no critical gaps exist, and the next step is Epic 1. | Epics 1–11 are shipped; Epic 12 adds migrations/tables and unresolved cross-cutting decisions. | Preserve the April report as history, point it to a new Epic 12 readiness delta, and mark Epic 12 conditionally ready only after decisions are resolved. |

### 2.3 Technical impact

Epic 12 crosses six architectural seams:

1. **Computation:** split deterministic shadow geometry from weather gating; persist geometry across serverless instances.
2. **Data integrity:** introduce one geometry-input hash/version shared by cached geometry, feedback evidence, editor changes, and imports.
3. **Venue identity and visibility:** use one live id-or-slug resolver and one public-visibility guard across list, detail, reviews, feedback, and prefetch.
4. **Selected-instant truth:** one selected instant drives sun derivation, open/closed filtering, and hours copy without adding scrub requests.
5. **Presentation truth:** one >50%-and-not-gated predicate drives pins, cards, sorting, feedback mapping, About copy, and accessible names.
6. **Operations:** scheduled precompute and opening-hours jobs, RLS/service-role posture, run coverage, cron authentication, and production-console regression gates.

## 3. Recommended Approach

### Selected path: Direct Adjustment

Keep the approved Epic 12 backlog intact and update the living planning baseline before story implementation. This preserves delivered work and avoids inventing a replacement epic for already-understood brownfield problems.

### Alternatives rejected

- **Rollback Epics 9–11:** Not viable. Epic 12 depends on their real-data, weather-gating, day-series, touch, and opening-hours foundations. Rolling them back would increase risk and remove working invariants.
- **MVP scope reduction:** Not recommended. The core product goal remains valid. The failure is launch readiness at real-venue scale, not product-market scope. Individual non-blocking polish stories may be sequenced later, but the epic should remain intact as approved.
- **Split or renumber Epic 12:** Rejected by the approved epic decision and this change request.

### Effort, risk, and timeline

- **Planning alignment effort:** Medium. Six canonical artifact families plus a limited `epics.md` inventory amendment and a new readiness/test-design delta.
- **Implementation effort:** High. Story 12.3 is an architecture pivot; Stories 12.5, 12.9, 12.12, and 12.14 have broad cross-surface impact.
- **Risk:** High until the cross-cutting decisions below are recorded once. Medium after the shared seams are fixed and test gates exist.
- **Timeline impact:** Public-launch readiness must be re-gated. “Live on real data” is not a substitute for meeting the Epic 12 launch-critical exit criteria.

## 4. Detailed Change Proposals

### 4.1 PRD — update `_bmad-output/planning-artifacts/prd.md`

**Sections:** document status/corrections, Executive Summary, Project Classification, Success Criteria, Product Scope, journeys, risks, Functional Requirements, NFRs.

#### A. Current state and launch status

**OLD:**
> The backend engine is built and deployed; the MVP building-data foundation is being corrected. The product is feature-complete/live without a separate public-launch readiness statement.

**NEW:**
> SunnySeat is live on the real Supabase/sun-engine path with 42 real Göteborg venues. Public-launch readiness is not complete: real-venue scale exposed cold-start performance, live identity, venue-hours, presentation, and operational gaps governed by Epic 12. The launch target remains 50 verified venues; 42 loaded venues is current evidence, not a changed target.

**Rationale:** Reconciles real-path cutover with the approved launch-readiness epic and preserves the existing launch metric.

#### B. Confidence and sun semantics

**OLD:**
- FR2 requires a list showing a confidence score.
- FR7 requires a confidence percentage for any venue.
- FR12 requires displayed confidence scores.
- Journeys compare venues using visible confidence values.

**NEW:**
- **FR2:** The ranked list shows venue name, selected-instant sun information, distance, and availability; it does not show a user-facing confidence number.
- **FR7:** Users see the selected-instant sun state and sun-exposure percentage where the venue is sunny; internal model confidence is not displayed.
- **FR12:** The system computes confidence internally for diagnostics, coverage, uncertainty reasons, and maintainer prioritization. Public UI communicates weather obstruction and prediction uncertainty without a confidence percentage.
- Journey examples remove “85%/92%/78% confidence” and describe the sun-exposure figure, amber/grey verdict, and selected time instead.

**Rationale:** Prevents canonical requirements from reintroducing the Story 12.13 UI.

#### C. Launch-readiness functional requirements

Add an append-only **Epic 12 Launch Readiness Requirements** subsection; do not renumber existing FR1–FR50.

- **LR1 — Availability truth:** Map/list/favourites surfaces hide venues explicitly closed at the selected Stockholm instant; unknown hours remain visible; past-midnight sessions use the previous weekday where appropriate.
- **LR2 — Pin truth:** Amber means >50% of seating is sunlit and not weather-gated. Grey means not sunny and carries no percentage. Icons/accessibility distinguish states without color alone.
- **LR3 — Guided first use:** A skippable, accessible, responsive coach-mark guide explains actual mounted controls and can be reopened from Settings.
- **LR4 — Live venue identity:** Reviews and feedback resolve real venues by id or slug and reject hidden/unknown venues consistently.
- **LR5 — Venue media:** Photos use stable hosted renditions with deterministic surface selection and graceful fallback.
- **LR6 — Maintainer operations:** A localhost/dev-only venue editor is allowed only behind an unconditional production deny; this does not reinstate a production admin product surface.

**Rationale:** Captures net-new user/maintainer outcomes without disturbing historic numbering.

#### D. Non-functional and integration requirements

**OLD:**
- NFR1: `<200ms p95` without a cold/warm measurement class.
- NFR20: generic precomputed data for spikes.
- NFR34: stale weather caps and visibly marks confidence.
- NFR35: daily precompute; serve previous day with reduced confidence.

**NEW:**
- Clarify NFR1: retain `<200ms p95` for warm/edge-hit normal traffic; add a fully cold central-viewport target of `≤~5s p95` using persisted geometry plus current read-time weather gating.
- Rewrite NFR20 around persisted **ungated geometry** for every venue/date in the selectable planner window, with a continuous midnight-roll coverage guarantee.
- Rewrite NFR34 so stale/missing weather affects the public weather/uncertainty state, not a visible confidence number; missing weather remains unknown, never fabricated clear.
- Rewrite NFR35: never substitute another day’s geometry. Missing persisted coverage is an observable operational failure; current weather gating happens on read; scheduled coverage reports venue × date completeness.
- Add a Google Places integration constraint: verify current storage/attribution/non-Google-map terms before syncing, authenticate any HTTP trigger, or pivot source.
- Add an operational console requirement: supported cold map/detail flows produce no app-origin React errors or MapLibre warnings; explicit third-party allow-list only after attribution.

### 4.2 UX specification — update `_bmad-output/planning-artifacts/ux-design-specification.md`

**Sections:** Core Experience, principles, mechanics, journeys, component specifications, sheet behavior, degradation patterns, map conventions, screen inventory, accessibility, About.

#### A. Replace the confidence-first mental model

**OLD:**
> Confidence is a first-class visible element, self-explanatory, and a tiebreaker. No teaching is required.

**NEW:**
> The primary decision model is selected-instant availability plus an amber/grey sun verdict. The sun percentage is share of seating in direct sun, not probability. Internal confidence is not displayed. A short About legend and skippable coach-mark guide teach the distinction.

#### B. Replace the pin contract

**OLD:**
> Sunny/Partial amber pins show percentages; shaded pins are a separate grey style with percentage; obscured weather has another grey treatment.

**NEW:**
> Exactly two pin presentations: amber sun + exposure percentage when the shared predicate is `>50% sunlit && !weatherGated`; grey cloud with no percentage otherwise, including low-Partial, Shaded, NoSun, and CloudObscured. Accessible names follow the same predicate and remain percentage-free for grey pins.

#### C. Replace fixed sheet snaps

**OLD:**
> Peek/full/dismiss or collapsed/peek/mid/full fixed snap states.

**NEW:**
> Mobile list sheet height is handle + persistent chrome + N complete rows, with `N=0..maxRows`. Drag follows the finger while the bottom remains anchored; keyboard arrows move one row; the list scrolls internally at max; reduced motion preserves state changes without spring motion.

#### D. Selected-instant availability and hours

Add UX behavior stating:

- All venue sources and counts use the same open-at-selected-instant filter.
- Unknown hours remain visible; explicit closed weekdays do not.
- Quick-info/detail hours copy uses the selected instant or is suppressed in planned mode; it never shows current-day hours beside a future-time result.
- A closed venue can reappear when the planner moves to an open instant.

#### E. New/changed UX states

- Add first-run coach-mark first and middle steps for mobile/desktop; define focus trap, escape, skip, target existence, and Settings re-entry.
- Update About with pin legend, sun-percentage explanation, feedback loop, and no unqualified placeholder accuracy statistic.
- Update venue photo behavior for list, desktop quick-info, and detail hero, including broken/missing fallback.
- Remove visible and screen-reader confidence from QuickInfo, cards, detail, and route overlay while preserving uncertainty/weather copy.
- Update `map-panel-venues` forced state from “mid snap” to a named row-count equivalent.
- Add closed/open selected-time map/list variants needed for visual validation.

### 4.3 Architecture — update `_bmad-output/planning-artifacts/architecture.md`

**Sections:** Data Architecture, Caching Strategy, Authentication & Security, API Patterns, Frontend Architecture, Infrastructure & Deployment, Integration Points, validation/readiness appendix.

#### A. Supersede fixture-era caching

**OLD:**
> Process-scoped buildings/sun caches lost on cold start are fine at 7 venues; a precompute pipeline is disproportionate.

**NEW:**
> At real-venue scale, deterministic daily shadow geometry is split from weather gating. Ungated geometry is persisted in Supabase by venue, Stockholm date, elevation inputs, and one full geometry-input version/hash. Requests read persisted geometry and apply the current weather bucket on demand. Process-local caches may remain accelerators but are not the availability boundary.

Document:

- service-role-only table with RLS enabled and no anon/authenticated grants;
- scheduled GitHub Action for the full planner window plus midnight continuity;
- coverage metrics and explicit missing-coverage behavior;
- current-bucket weather gating and the day+3 forecast-horizon rule;
- invalidation on seating, elevation, caster geometry/id/z, and import changes.

#### B. Shared identity, visibility, and coordinate seams

Add one server-side venue resolver/guard that:

- accepts id or slug in live mode;
- enforces `hidden=false` on every public list/detail/review/feedback/prefetch path;
- supports a separately gated include-hidden dev read;
- defines cache invalidation/bounded staleness for hide/show.

Record the Story 12.5 coordinate decision once: public display/discovery/routing coordinate versus server-only engine/weather coordinate. Do not allow a pin drag to silently change the weather gate.

#### C. Data-model deltas

Architecture must enumerate the planned contracts rather than leaving them implicit in stories:

- `venues.hidden`;
- optional `place_id` / `places_api_url` plus sync provenance/review status;
- feedback evidence: exposure %, amber/grey verdict, weather-gated flag, geometry-input hash;
- persisted ungated geometry series and geometry version/hash;
- thumbnail rendition contract or deterministic rendition URL convention;
- selected-instant opening-hours predicate preserving absent-field unknown versus missing/null weekday closed.

#### D. API and infrastructure deltas

Replace “no changes to existing contracts” with controlled evolution through Zod/types/migrations and the existing API boundary. Add:

- weekly hours sync vehicle and auth posture;
- long-running geometry precompute outside Vercel request timeouts;
- Places policy/provider decision record;
- exact TanStack detail-prefetch key, bounded budget/concurrency, and the request-count gate choice;
- separate full-list candidate cap from favourites-by-id limits;
- zero app-origin console errors/warnings E2E gate;
- no live Met.no or Google Places calls in tests.

#### E. Validation appendix

Replace the unconditional “zero critical gaps / ready for implementation” conclusion with a dated Epic 12 delta. Keep the original historical text labeled as the pre-Epic-12 assessment.

### 4.4 Project context — update `project-context.md`

Use a two-phase update so planned work is not falsely described as shipped.

#### Immediate factual correction

**OLD:**
> `public.venues` currently holds 7 test/fixture venues; no bulk production venue data yet. MVP is feature-complete and shipped.

**NEW:**
> The real data path is live and `public.venues` holds the 42-venue real Göteborg set loaded 2026-07-07. Public-launch readiness remains incomplete because first real-scale contact exposed the Epic 12 backlog, led by cold-start performance and live identity defects.

Add Epic 12 to Current State and Key Documents. Clarify that the dev-only editor is a permitted maintenance exception, not a production admin surface.

#### Pending conventions section

Add **“Epic 12 Pending Decisions and Invariants”** containing the five epic preamble items:

1. opening-hours representation;
2. one public-visible venue guard;
3. one geometry-input hash/version;
4. scrub=0/date-change=1 request invariant;
5. one >50%-and-not-gated sunny predicate.

Mark this section explicitly **planned, not ratified**. As each story lands, move only its proven convention into a ratified Epic 12 section and remove/supersede conflicting older statements. In particular, the existing process-cache, visible-confidence, fixed-snap, and current-wall-clock hours notes must remain labeled as current behavior until their owning stories ship.

### 4.5 Test design — update the active QA pointer and add an Epic 12 delta

- **Existing artifact to amend:** `_bmad-output/qa/mvp-test-design-scope-correction-2026-05-19.md`
- **New companion artifact:** `_bmad-output/qa/epic-12-test-design-2026-07-12.md`

#### Existing active addendum amendment

**OLD:**
> Confidence display is active MVP scope; Story 2.6 tests require visible, tilde, and hidden confidence behavior.

**NEW:**
> Superseded by Story 12.13 for forward work: confidence remains computed internally, but no visible or screen-reader confidence number is expected. Weather and uncertainty honesty remain test obligations. Link to the Epic 12 test-design delta.

Do not update the April `test-design-architecture.md`, `test-design-progress.md`, or `test-design-qa.md`; they are already explicitly historical/Future Monetization inputs.

#### Required Epic 12 risk coverage

The new delta must include, at minimum:

| Risk | Priority | Required evidence |
|---|---:|---|
| Cold real-scale list freeze | P0 | 42+ venue cold p95, persisted geometry read, value parity, bucket re-gate, full planner horizon, midnight continuity |
| Persisted artifact poisoning/staleness | P0 | RLS/service-role denial tests, geometry-hash invalidation, missing-coverage behavior |
| Public hidden/identity drift | P0 | id+slug, list/detail/reviews GET+POST/feedback/prefetch parity tests |
| Selected-instant closed filter drift | P0 | all row sources, unknown vs closed, before/after, prior-day past-midnight, counts, tag AND semantics |
| Request-count regression | P0 | same-date scrub=0 and date-change=1 retained or deliberately re-scoped only where Epic 12 permits |
| 50% sunny predicate drift | P0 | server rank, client sort, pin, card, feedback mapping, About, aria, low-Partial boundary |
| Confidence-removal regression | P1 | visible + accessibility source scan/E2E; uncertainty row retained; stale tests removed |
| Dev editor exposure | P0 | unconditional production denial even with flag set; include-hidden fail-closed; API boundary |
| Hours sync correctness/policy | P1 | cron/trigger auth, split-period wholesale skip, provenance, per-venue failure isolation, no live Places calls in tests |
| Sheet/touch/accessibility regression | P1 | real-touch row ladder, body drag, keyboard to 0/max, internal scroll, recenter padding, reduced motion |
| Console regressions | P1 | cold map/detail `console` + `pageerror` guard for error and warning levels |
| Photo bandwidth/fallback | P1 | rendition selection/size contract and broken/missing fallback on every surface |
| Detail-prefetch traffic burst | P1 | exact key match, total/concurrency budget, cancellation/backoff, favourites candidates, chosen gate semantics |
| Coach-mark invalid target/focus | P1 | mobile/desktop target presence, skip, ESC, focus trap, re-open, persisted seen state |

The delta must require full Vitest and Playwright sweeps where cross-epic assertions change, including mobile, desktop, touch, and accessibility projects, plus story-specific visual rebaseline evidence.

### 4.6 Implementation readiness — preserve history and create a current delta

- **Existing artifact to amend only at its supersession notice:** `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-15.md`
- **New current artifact:** `_bmad-output/planning-artifacts/implementation-readiness-report-2026-07-12-epic-12.md`

Do not rewrite the April analysis as though it had known about Epic 12. Add a pointer that it is superseded for current implementation planning by the new delta.

The new readiness status should be:

> **CONDITIONALLY READY FOR STORY DRAFTING; NOT READY FOR EPIC 12 IMPLEMENTATION OR PUBLIC-LAUNCH SIGN-OFF.**

Before implementation, resolve and record these once:

1. Multi-interval/per-day-unknown hours prerequisite decision (12.1 ↔ 12.14).
2. Shared public-visibility resolver/guard ownership (natural home: 12.7).
3. Canonical geometry-input hash/version and invalidation ownership (12.3, consumed by 12.2/12.5/imports).
4. Story 12.10 request-count choice: list-only gate re-scope versus initial-settle-only prefetch.
5. Canonical sunny predicate home and sun-window label policy.
6. Story 12.5 display coordinate versus engine/weather coordinate option.
7. Story 12.12 card/hero rendition contract option.
8. Story 12.14 search and closed-favourite treatment.
9. Story 12.1 current Places policy/provider viability.
10. Story 12.10 near-list versus wider-discovery candidate source.

Public-launch critical path must identify at least Stories 12.3 and 12.7 as blockers. Story 12.2 is an ongoing accuracy loop rather than a hard launch gate, per its approved reframe. The readiness report should distinguish launch blockers from post-launch/polish work without splitting or renumbering the epic.

### 4.7 Limited `epics.md` alignment

Update only the forward-looking inventory sections required by Story 12.13:

- FR2, FR7, FR12;
- UX-DR5, UX-DR11, UX-DR23 and other inventory lines that explicitly promise visible confidence;
- corresponding FR Coverage Map rows;
- FR40/FR41 wording to clarify the dev-only, production-denied editor exception without reinstating production admin scope;
- NFR34/NFR35 wording if the inventory mirrors the PRD update.

Leave the Epic 12 section and all historical Epic 1–11 story sections unchanged.

## 5. Secondary Story-Owned Documentation

These are not prerequisites for approving this planning proposal, but their owning stories already require them:

- `nextjs-app/docs/venue-data-load.md` — Stories 12.1, 12.5, and 12.12.
- `nextjs-app/docs/github-actions-scheduled-jobs.md` — Stories 12.1 and 12.3.
- `nextjs-app/docs/design/references/REBASELINE-LOG.md` and affected PNGs — visual changes in 12.6, 12.8, 12.9, 12.11, 12.12, 12.13, and 12.14.
- `project-context.md` Screen ID → Route Map and state-forcing docs — Story 12.9 row-count state plus new visual states.
- Environment-variable documentation — Places key/cron vehicle and removal of `SUNNYSEAT_COVERAGE_CAP`.

`DESIGN.md` needs an update only if implementation introduces or changes a token. Epic 12 does not authorize ad-hoc token invention.

## 6. Implementation Handoff

### Classification

**Major planning/architecture alignment with a stable backlog.** The product goal and story set remain stable, but Story 12.3 replaces a load-bearing compute-on-request assumption and the epic changes multiple canonical UX/data contracts.

### Handoff recipients

- **Product Manager / Product Owner:** approve PRD supersessions, launch-blocker classification, and the unresolved user-policy choices for closed search/favourites.
- **Solution Architect:** own the persisted geometry, geometry-version, public-visibility resolver, coordinate, cache, and scheduled-job decisions.
- **Test Architect:** produce the Epic 12 risk-based test-design delta and preserve the standing Epic 11 gates.
- **UX Designer:** reconcile pin semantics, row-quantized sheet, coach marks, About explanation, confidence removal, photos, and closed-state references.
- **Developer:** implement stories only after their cross-cutting decision dependencies are recorded; preserve API boundary and shipped-story behavior not explicitly superseded.

### Success criteria

The course correction is implemented when:

1. The six canonical artifact families no longer contradict Epic 12.
2. The Epic 12 stories and shipped Epics 1–11 remain unchanged.
3. `epics.md` has only the forward-looking inventory amendments mandated by 12.13.
4. A current Epic 12 test-design delta exists.
5. A current readiness delta records the ten decisions and separates public-launch blockers from non-blocking polish.
6. `sprint-status.yaml` remains unchanged unless a later sprint-planning action schedules the epic.

## 7. Change Navigation Checklist Result

### 1. Trigger and context

- [x] 1.1 Trigger: Epic 12 approved section; first 42-venue production contact.
- [x] 1.2 Type: brownfield technical limitation plus maintainer-approved product/UX corrections.
- [x] 1.3 Evidence: 120 s client timeout, fixture-only reviews/feedback resolver, 42 real venues, documented artifact conflicts.

### 2. Epic impact

- [x] 2.1 Epic 12 remains viable as planned.
- [x] 2.2 No epic scope redesign required.
- [x] 2.3 Shipped Epics 1–11 preserved.
- [N/A] 2.4 No new or obsolete epic required.
- [x] 2.5 Preserve Epic 12’s recommended internal sequence; no epic renumbering.

### 3. Artifact conflict analysis

- [x] 3.1 PRD conflicts identified.
- [x] 3.2 Architecture conflicts identified.
- [x] 3.3 UX conflicts identified.
- [x] 3.4 Project context, test design, readiness, and secondary docs identified.

### 4. Path forward

- [x] 4.1 Direct Adjustment: viable; planning effort Medium, implementation effort High, risk High→Medium after decisions.
- [N/A] 4.2 Rollback: not viable or useful.
- [N/A] 4.3 MVP reduction: not required.
- [x] 4.4 Selected: Direct Adjustment.

### 5. Proposal components

- [x] 5.1 Issue summary.
- [x] 5.2 Epic and artifact impact.
- [x] 5.3 Recommended path and alternatives.
- [x] 5.4 MVP/public-launch impact and action plan.
- [x] 5.5 Handoff plan.

### 6. Final review

- [x] 6.1 Applicable checklist sections completed.
- [x] 6.2 Proposal checked for preservation constraints and actionability.
- [x] 6.3 Approved by Rasmus on 2026-07-12.
- [N/A] 6.4 Sprint status change not required; Epic 12 is already registered as backlog.
- [x] 6.5 Handoff recorded below.

## 8. Approval and Handoff Log

- **Approval received:** 2026-07-12
- **Approved approach:** Direct Adjustment
- **Approved scope:** Major planning/architecture alignment with Stories 12.1–12.14 and shipped Epics 1–11 preserved
- **Artifacts modified by this workflow:** This Sprint Change Proposal only
- **Canonical artifact updates authorized next:** PRD, UX specification, architecture, project context, active test-design pointer plus Epic 12 test-design delta, historical readiness pointer plus Epic 12 readiness delta, and the limited forward-looking `epics.md` inventory amendment

**Routed to:**

- Product Manager / Product Owner — PRD supersessions, public-launch blocker classification, and user-policy choices.
- Solution Architect — persisted geometry, shared hashes/resolvers, coordinates, caches, and scheduled jobs.
- Test Architect — Epic 12 risk-based test-design delta and standing-gate preservation.
- UX Designer — pin, sheet, guide, About, confidence-removal, photo, and closed-state alignment.
- Developer — implementation after prerequisite decisions and artifact reconciliation.

**Next action:** Reconcile the approved canonical artifacts before drafting or implementing Story 12.3. Do not change `sprint-status.yaml` until a separate sprint-planning action schedules Epic 12.
