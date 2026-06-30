---
stepsCompleted: ['step-05-generate-output']
lastStep: 'step-05-generate-output'
lastSaved: '2026-06-30'
---

# Test Design: Epic 9 - "Live-App Hardening & Clean-Up"

**Date:** 2026-06-30
**Author:** Rasmus
**Status:** Draft

---

## Executive Summary

**Scope:** Epic-level test design for Epic 9 (post-launch remediation of the LIVE SunnySeat app).
Covers all 11 stories (9.0–9.10): clean-app content sweep, CTA design-token fix, server-side sun-compute
caching, client query hygiene + time-debounce, location/onboarding reliability, map-chrome consolidation,
real tag filtering (with an additive Supabase migration), venue sharing, mobile quick-info rework, and a
mobile verification + regression-guard pass.

> **Context note:** the app is already in **Production** on the real data path (Supabase venue store +
> real sun engine + persisted feedback/reviews). These are fixes to a live product, so the dominant risk
> theme is **regression and data-integrity on the live path**, not greenfield feature risk. Two stories
> (9.3, 9.4) are pure performance/behaviour with **no visual change** — for those, performance/behaviour
> regression coverage is the acceptance signal, not screenshots. One story (9.7) performs an **additive
> schema migration against the live DB** (which currently holds only the 7 test/fixture venues, no
> production data) — low data-loss risk but it must remain additive and backward-compatible.

**Risk Summary:**

- Total risks identified: **18**
- High-priority risks (score ≥6): **6** (one CRITICAL, score 9 — R-002)
- Critical categories: **PERF** (uncached double-RPC engine), **DATA/BUS** (fabricated metadata that
  contradicts the real engine), **TECH/SEC** (production planner-forcing URL leak), **DATA** (live-DB
  additive migration)

**Coverage Summary:**

- P0 scenarios: **9** (~14–22 hours)
- P1 scenarios: **17** (~18–30 hours)
- P2/P3 scenarios: **14** (~7–16 hours)
- **Total effort:** ~**39–68 hours** (~**1–1.75 weeks** for one engineer, much of it riding existing
  fixtures/specs)

> **Reading the priority columns:** P0/P1/P2/P3 denote **priority / risk class**, NOT execution timing.
> Execution timing (PR vs nightly) is handled separately in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
| ---- | --------- | ---------- |
| **Real venue photos** (all cards show "PLATSHÅLLARBILD" placeholders) | Epic explicitly flags this as a separate data-population task, not an Epic 9 story | Logged for visibility in epics.md addendum; no code/test risk in this epic |
| **Date-picker month-edge "no effect" report** | Verified NOT broken (last-day-of-month month-view edge); date picker works as designed | Story 9.10 AC explicitly regression-tests clean-URL date selection still refetches |
| **Venue-detail "SOLTIDER IDAG" read-only strip** | Verified NOT broken — read-only by design, matches reference | No change; do not regress it during the 9.1 content sweep |
| **Search bar full submit/keyboard UX overhaul** | Working autocomplete; only a low-priority Enter-to-select-first polish is in 9.6 | Single P2 scenario in 9.6 coverage; not a deep redesign |
| **Production data migration risk for tags** | Live `venues` table holds only 7 test/fixture rows, no production data | Additive migration + seed of 7 test venues is in-scope dev; tested at API/contract level (R-006) |
| **Pixel-perfect visual diffing** | Project's "Visual validation" gate is an LLM eyeball comparison (sonnet) that ignores sizing/spacing — width/proportion regressions can slip (see MEMORY: Story 2.5 full-width time-picker) | Add explicit layout/overlap assertions (9.9 card-vs-planner overlap, 9.1 no-orphaned-separators) as code tests, not relying on the visual gate alone |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- | -------- |
| **R-002** | PERF | **Uncached, double-RPC sun engine.** `computeRealSunEngine` (`sun-engine.ts`) calls `calculateVenueShadowForGeometry` (RPC#1, line 285) AND `calculateVenueShadowTimelineForGeometry` (RPC#2, line 319), each fetching `get_buildings_near_point` (~145–440 ms each). N venues × 2 RPCs + ~41 projections, **no server cache**, on every list AND detail load. Comment at lines 51/317 already FALSELY claims "one buildings fetch reused internally". The biggest live UX problem. (Story 9.3) | 3 | 3 | **9** | Fetch building set once, reuse for both shadow + timeline; wrap `get_buildings_near_point` in a centroid+radius keyed server cache; cache per-(venue, time-bucket, day) compute; verify byte-identical sun outputs before/after; capture before/after timings | Dev | Story 9.3 |
| **R-001** | SEC / TECH | **Production planner-forcing URL leak.** `AppContextProviders.tsx` reads `?_time`/`?_date` straight from the URL (lines 51-52) with **no NODE_ENV gate**, unlike the sibling `use-forced-state.ts` (which returns null in prod, line 16). Any production URL can pin the planner and silently disable the live clock → users see stale/wrong sun for a fixed time without knowing. (Story 9.0) | 2 | 3 | **6** | Gate `forcedTime`/`forcedDate` to `undefined` when `NODE_ENV === 'production'` (mirror `use-forced-state.ts`); keep forcing in dev/preview so e2e `?_time=` specs stay stable; add a regression test asserting ignored-in-prod / honoured-otherwise | Dev | Story 9.0 |
| **R-003** | DATA / BUS | **Fabricated venue metadata contradicts the real engine.** `venue-visual-metadata.ts` invents `exposure`, `tags`, distance, `bestAt`, `seats`, `price` per slug + `DEFAULT_METADATA`. Live example: "BÄST KL. 18:00" card vs the real Solprognos "Bäst 08:30–14:00" — a visible self-contradiction that erodes trust in the whole app. Card aria-labels duplicate confidence ("Säkerhet: 60% Säkerhet 60%"). (Stories 9.1, 9.7) | 2 | 3 | **6** | Remove the fabricated/contradictory fact cards (EXPONERING, BÄST KL., Platser ute, uncertainty paragraph); preserve only truthful signals (confidence %, real distance); replace placeholder `tags` with real Supabase-sourced data (9.7); clean aria-labels; remove dead i18n keys + uncertainty render branches | Dev | Stories 9.1, 9.7 |
| **R-004** | BUS | **Onboarding gate first-paint flash + dead "Use my location" click.** `OnboardingGate.tsx` renders a non-interactive placeholder on first paint and portals the real screen in only after a `localStorage`-gated client effect → "map flashes before welcome overlay" + intermittent dead-click; compounded by a stale precached SW shell after deploy. A clean Playwright context loaded straight to the map (no overlay) — a NEW user can miss onboarding entirely. (Story 9.5) | 2 | 3 | **6** | Read "onboarded" state synchronously on first render (server-readable cookie / `useSyncExternalStore`); wire the real locate button immediately; force/prompt reload on activated SW update; honest fallback labelling when geolocation denied | Dev | Story 9.5 |
| **R-005** | PERF | **Time→query-key refetch storm + redundant Favoriter/double-fetch.** `selectedMinutes` feeds the TanStack query key on every snapped 15-min change → a fresh `/api/venues` round-trip per change over the heavy uncached engine (compounds R-002). Favoriter uses a separate non-shared query that refetches loaded venues; initial load double-fetches (fallback coords then real GPS). (Story 9.4) | 3 | 2 | **6** | Debounce/commit-on-settle the time→query coupling (`onSnap`/`useDeferredValue`); source Favoriter from the `venues.list` cache; gate first fetch until geolocation settles or widen the coord bucket; keep slider thumb visually decoupled | Dev | Story 9.4 |
| **R-006** | DATA | **Additive `tags` migration against the LIVE DB.** Story 9.7 must add a `tags` column to `public.venues` (no such column today; 24 columns, no `orientation` either) + update the `.sql` contract + `lib/supabase/types.ts` + `VENUE_SELECT_COLUMNS` + seed the 7 test venues. A non-additive or column-name-mismatched migration breaks the live `getVenues` SELECT and 500s the list route. | 2 | 3 | **6** | Migration must be strictly additive (`tags text[] not null default '{}'` or jsonb per the contract convention); update DTO + types + select-columns in lockstep; contract test asserts column presence + DTO round-trip; backward-compat test that absent/empty tags still render | Dev | Story 9.7 |

### Medium-Priority Risks (Score 3-5)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- |
| **R-007** | TECH | CTA gradient token fix (`--gradient-route-button` olive→gold) may be applied to only the 3 known CTAs and miss other amber-gradient surfaces (detail sun-% badge, "ÖPPET" badge) that share the legacy `--color-amber-dark` start. (Story 9.2) | 2 | 2 | 4 | Audit EVERY amber-gradient surface, not just the 3 CTAs; assert contrast on `amber-cta-text` at the brighter stop; snapshot/CSS-var assertion test | Dev |
| **R-008** | TECH | Content-sweep deletions (9.1) leave orphaned separators / middots / empty rows / dangling labels after reflow on one breakpoint but not the other. | 2 | 2 | 4 | Component tests asserting removed elements absent AND no orphaned separators in both mobile + desktop render; update `prediction-uncertainty-display.test.ts` | Dev |
| **R-009** | BUS | Tag filter state (9.7) shared incorrectly between nav and venue surfaces → chips toggle but list/pins don't filter, or empty-state never shows. | 2 | 2 | 4 | Component/integration tests: single-select filters, multi-select intersects, empty state when no match, chip "on" style toggles | Dev |
| **R-010** | BUS | Venue sharing (9.8): `navigator.share()` unavailable on desktop / non-secure context → must degrade to copy-link + targets, not throw or no-op. Deep-link must resolve to the right venue. | 2 | 2 | 4 | Unit/component: feature-detect `navigator.share`; desktop copy-link path; e2e/unit deep-link slug resolution | Dev |
| **R-011** | DATA | Stale seed cleanup (9.1): nulling `bistro-bakgarden.shadow_warning_minutes=0` and removing the `shadowWarningMinutes` render branch must not break venues that legitimately have null. | 1 | 2 | 2 | Covered by R-008 component tests + a store/DTO test for null `shadowWarningMinutes`; (listed here as DATA hygiene) | Dev |
| **R-012** | PERF | Story 9.3 caching introduces a staleness window: a cached sun bucket could show outdated sun state past the agreed freshness window. | 2 | 2 | 4 | Choose + document a bounded staleness window; assert cache key includes the rounded time-bucket+day so a new bucket recomputes | Dev |
| **R-013** | TECH | CDN-cache vs rate-limit conflict: `/api/venues` reads `x-forwarded-for` (route.ts line 217) for rate-limiting, forcing the route dynamic and killing `s-maxage=30` (comment at lines 381-384). Story 9.3 must resolve this without dropping rate-limiting or DoS protection. | 2 | 2 | 4 | Move rate-limiting to an edge layer/middleware OR adopt the precompute follow-up; document chosen approach; assert rate-limit still enforced + cacheable response path | Dev |
| **R-014** | BUS | Map-chrome consolidation (9.6) removes the floating mobile locate+settings but the kept top-bar settings gear (currently hard-`disabled`) isn't wired to `useSettings().openSettings`, leaving NO working settings entry on mobile. | 2 | 2 | 4 | Component test: top-bar gear opens settings modal; locate button still requests location; floating pair removed; zoom +/- remain | Dev |
| **R-015** | BUS | Mobile quick-info card (9.9) overlaps the "Planera soltid" planner panel (sun-% badge jammed under slider) — a layout/overlap bug the LLM visual gate may miss (it ignores sizing/spacing). | 2 | 2 | 4 | Explicit non-overlap / vertical-spacing assertion at common mobile heights as a CODE test, not relying on the visual gate; render across sun states without overflow | Dev |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ------ |
| **R-016** | TECH | MapLibre console warnings: 3× "Expected value to be of type number, but found null" from the map blob (likely a null coord/expression in a layer). Warnings, not errors. (Story 9.10) | 2 | 1 | 2 | Investigate source + guard the null; assert no such console warning in the map e2e |
| **R-017** | BUS | Swedish chip label "Takt" → "Takterrass" (`messages/sv/common.json`) and the duplicated fixture string in `DesktopNavBar.test.tsx` drift out of sync. (Stories 9.2, 9.7) | 2 | 1 | 2 | Update both in lockstep; messages-parity + DesktopNavBar component test catch drift |
| **R-018** | OPS | `?_time=` e2e determinism: gating the planner-forcing param in prod (9.0) must NOT break the non-prod e2e specs that rely on `?_time=` for deterministic sun assertions (see MEMORY: e2e sun-specs force `?_time=13:00`). | 1 | 2 | 2 | R-001 mitigation keeps forcing in non-prod; run full e2e sun-spec suite in CI to confirm no regression |

### Risk Category Legend

- **TECH**: Technical / Architecture (token/CSS drift, integration, dynamic-vs-cacheable routing)
- **SEC**: Security (production behaviour leak via URL param)
- **PERF**: Performance (RPC volume, uncached compute, refetch storm)
- **DATA**: Data Integrity (fabricated/contradictory metadata, live-DB migration)
- **BUS**: Business Impact (trust, dead controls, onboarding, UX correctness)
- **OPS**: Operations (e2e determinism, deploy/SW shell)

---

## Entry Criteria

- [ ] Epic 9 story-context files created (per-story `create-story` outputs) before each story is dev'd
- [ ] Local dev able to run with `SUNNYSEAT_SUN_ENGINE=real` + Supabase service-role config (R-002/R-003
      verification needs the real engine path; otherwise unit-mock the adapter boundary)
- [ ] Baseline warm/cold list + detail timings captured BEFORE Story 9.3 (the perf acceptance signal)
- [ ] Live DB schema snapshot of `public.venues` confirmed before the 9.7 migration (24 columns, no `tags`)
- [ ] Existing 92 unit + 11 e2e suites green at HEAD (establish the regression baseline)
- [ ] Known pre-existing Playwright a11y RED (venue-card amber labels ≈1.63 contrast, about/privacy footer
      ≈3.13 — deferred to Story 5.1) is acknowledged so it is not mistaken for an Epic 9 regression

## Exit Criteria

- [ ] All P0 tests passing (100%)
- [ ] All P1 tests passing or failures triaged + waived
- [ ] R-001..R-006 (all high-priority ≥6) mitigations verified complete
- [ ] Story 9.3: warm-cache list + detail measurably faster than baseline AND sun outputs byte-identical
      to pre-fix for the same inputs
- [ ] Story 9.4: a settled time change issues exactly ONE `/api/venues` request; Favoriter↔Närmast issues
      no redundant fetch
- [ ] Story 9.0: `?_time`/`?_date` proven ignored under simulated production env, honoured in non-prod;
      existing e2e sun specs still stable
- [ ] Story 9.7: live `getVenues` SELECT still succeeds after the additive `tags` migration; absent/empty
      tags render without error
- [ ] Mobile-viewport pass (Playwright mobile profile + manual real-device spot-check) confirms every
      Epic 9 fix on mobile; mobile-only gaps logged
- [ ] No new MapLibre console warnings/errors on the map surface
- [ ] No open high-severity regressions in previously-passing flows (map, onboarding, favourites,
      feedback, review, visit-loop, responsive-layout)

---

## Test Coverage Plan

> P0/P1/P2/P3 = priority / risk class, NOT execution timing. Coverage is deliberately weighted toward
> Unit + Component (fast, deterministic) with E2E reserved for the live-path user journeys that the
> existing suite already exercises. Dedup-checked against the 92 unit + 11 e2e files already in the repo —
> new tests extend existing specs where one exists (e.g. `VenueQuickInfo.test.tsx`, `MapControls.test.tsx`,
> `onboarding.spec.ts`, `prediction-uncertainty-display.test.ts`).

### P0 (Critical) — Highest risk, no workaround

**Criteria:** Blocks core journey / live-path correctness + High risk (≥6) + No workaround

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| `?_time`/`?_date` ignored under simulated `NODE_ENV=production`, honoured otherwise (9.0) | Unit | R-001, R-018 | 2 | Dev | New `use-app-context-time-gate` test; mirror `use-forced-state.test.ts` pattern |
| Engine fetches building set ONCE, reuses for shadow + timeline; byte-identical sun outputs (9.3) | Unit | R-002 | 2 | Dev | Spy on `get_buildings_near_point`; assert call count halved + output snapshot equal (mock adapter boundary — see MEMORY vitest dynamic-import gotcha) |
| `get_buildings_near_point` server-cache hit on repeat (centroid+radius key) + per-bucket compute cache (9.3) | Unit/API | R-002, R-012 | 3 | Dev | Cache hit on 2nd call within bucket; new time-bucket recomputes; staleness window bounded |
| Fabricated/contradictory fact cards removed; confidence % preserved (9.1) | Component | R-003 | 2 | Dev | Extend `VenueDetailContent.test.tsx` + `VenueQuickInfo.test.tsx`: EXPONERING/BÄST KL./Platser ute/uncertainty paragraph absent; Säkerhet % + real distance present |

**Total P0:** ~9 tests, ~14–22 hours

### P1 (High) — Important live-path correctness

**Criteria:** Important features + Medium/high risk + Common workflows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| Settled time change issues exactly ONE `/api/venues` request (debounce) (9.4) | Component/Integration | R-005 | 2 | Dev | Drag enqueues ≤1 request after settle; return-to-now reads as "live now" |
| Favoriter sourced from `venues.list` cache — no refetch; toggle instant (9.4) | Component/Integration | R-005 | 2 | Dev | Entering Favoriter issues no fresh request when venues loaded |
| Initial load issues a single venue request (no fallback→GPS double-fetch) (9.4) | Component/Integration | R-005 | 1 | Dev | Gate first fetch until geolocation settles / widen bucket |
| Onboarding gate shows correct screen from first frame; new user reliably sees welcome (9.5) | Component + E2E | R-004 | 3 | Dev | Extend `OnboardingGate.test.tsx`; clean-localStorage Playwright context sees overlay (the smoke-test gap) |
| "Use my location" wired immediately; early click triggers permission prompt (9.5) | Component | R-004 | 2 | Dev | Real button present on first render, not after hydration |
| User-location amber `UserPin` marker drawn on geolocation success, hidden on fallback (9.5) | Component | R-004 | 2 | Dev | Marker layer renders at coords, updates on change, absent for Gothenburg fallback |
| Additive `tags` migration: live `getVenues` SELECT succeeds; DTO exposes real tags (9.7) | API/Contract/Unit | R-006 | 3 | Dev | Extend `venue-store.test.ts` + sql-contract test; absent/empty tags render OK |
| Tag chips filter list + map; multi-select intersects; empty state shown (9.7) | Component/Integration | R-009 | 3 | Dev | Data-driven chip row from union of venue tags; "on" pill style |
| Top-bar settings gear wired to `openSettings`; floating mobile pair removed (9.6) | Component | R-014 | 2 | Dev | Extend `MapControls.test.tsx`; gear no longer disabled; zoom +/- remain |
| Disabled placeholder controls (nav chevrons, category buttons) hidden/removed (9.6) | Component | R-014 | 1 | Dev | No inert control reads as broken |

**Total P1:** ~17 tests (across ~10 requirements), ~18–30 hours

### P2 (Medium) — Secondary correctness + design fidelity

**Criteria:** Secondary features + Low/medium risk + Edge cases

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| CTA token `--gradient-route-button` corrected to gold→amber; audit ALL amber surfaces (9.2) | Component/Unit | R-007 | 3 | Dev | RouteButton/AboutPage/NotFoundPage render corrected ramp; no olive start anywhere; contrast holds |
| No orphaned separators/middots/empty rows after content sweep, both breakpoints (9.1) | Component | R-008 | 2 | Dev | Update `prediction-uncertainty-display.test.ts`; remove dead i18n keys; clean aria-labels |
| Venue share enabled: `navigator.share` on mobile, copy-link+targets on desktop, deep-link resolves (9.8) | Component/Unit | R-010 | 3 | Dev | Feature-detect share; degrade gracefully; slug deep-link round-trip |
| Mobile quick-info card sits clear of planner panel; no overlap/overflow across sun states (9.9) | Component | R-015 | 2 | Dev | Explicit non-overlap assertion (do NOT rely on the LLM visual gate for spacing) |
| Mobile-viewport verification across all Epic 9 surfaces; mobile-only gaps logged (9.10) | E2E (mobile profile) | R-004, R-015 | 1 | Dev | Playwright mobile profile pass + manual real-device spot-check |
| Regression-guard suite: clean-URL date refetch, one-request-per-settled-time, no Favoriter refetch, location dot on success, prod planner-leak gate (9.10) | E2E/Integration | R-001, R-004, R-005 | 1 | Dev | The named Story 9.10 AC regression set, wired into CI |

**Total P2:** ~12 tests, ~6–13 hours

### P3 (Low) — Polish + benchmarks

**Criteria:** Nice-to-have + Exploratory + cosmetic

| Requirement | Test Level | Test Count | Owner | Notes |
| ----------- | ---------- | ---------- | ----- | ----- |
| Enter selects first visible search result (low-priority polish) (9.6) | Component/Unit | 1 | Dev | Type-then-Enter pans map to first result |
| "Takt"→"Takterrass" sv label + fixture string sync (9.2/9.7) | Unit | 1 | Dev | messages-parity + `DesktopNavBar.test.tsx` fixture in lockstep |

**Total P3:** ~2 tests, ~1–3 hours

---

## Execution Strategy

**Philosophy:** Run everything in PRs. The full Vitest suite + Playwright e2e already runs in
`<15 min` with parallelization; Epic 9 adds mostly fast unit/component tests, so keep them all on the PR
gate. Defer only genuinely expensive/long-running checks.

- **Every PR (`build-and-test-nextjs.yml`):** `tsc --noEmit`, `eslint`, `vitest run` (all new unit +
  component tests), `playwright test` (e2e incl. the new mobile-profile + regression specs), axe a11y gate
  (serious/critical only). All Epic 9 functional + regression coverage runs here.
- **Per-story (manual, during dev):** Story 9.3 before/after warm+cold latency capture against the real
  engine (recorded in the story file as the perf acceptance signal) — manual measurement, not a CI assert,
  to avoid flaky timing gates in CI.
- **Nightly / on-demand:** none required for this epic — no k6/chaos/large-dataset suites are in scope.
  The lighthouse/bundle gate (NFR8, ~420 KB budget excluding the lazy MapLibre chunk — see MEMORY) runs as
  today; confirm the 9.x changes don't regress it.

> Note: Playwright sun-dependent specs force `?_time=` for determinism (MEMORY). Story 9.0's prod-gate must
> preserve this in non-prod — verify by running the full e2e sun-spec suite in CI after 9.0 lands.

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test (range) | Total Hours | Notes |
| -------- | ----- | ------------------ | ----------- | ----- |
| P0 | 9 | 1.5–2.5 | ~14–22 | RPC-spy + cache + byte-identical snapshot setup; mock the adapter boundary (vitest dynamic-import gotcha) |
| P1 | 17 | 1.0–1.8 | ~18–30 | Mostly extend existing specs (OnboardingGate, MapControls, venue-store); migration contract test |
| P2 | 12 | 0.5–1.1 | ~6–13 | CSS-var/token assertions, overlap assertion, share feature-detect, mobile e2e profile |
| P3 | 2 | 0.5–1.5 | ~1–3 | Small polish |
| **Total** | **40** | **—** | **~39–68** | **~1–1.75 weeks** for one engineer; heavily leverages existing fixtures/specs |

### Prerequisites

**Test Data:**

- Existing venue fixtures / `venues-fixture.ts` + the 7 seeded test venues in the live DB
- New: representative `tags` seed for the 7 test venues (in-scope dev work, Story 9.7)
- A `get_buildings_near_point` RPC mock/spy for the engine cache + call-count tests (mock at the adapter
  boundary, not via `vi.mock` of a concurrently dynamic-imported module — see MEMORY gotcha)

**Tooling:**

- Vitest (unit + component) and Playwright (e2e, incl. mobile device profile e.g. iPhone 390×844)
- `process.env.NODE_ENV` simulation in the 9.0 prod-gate test
- `navigator.share` / clipboard mocks for the 9.8 share tests

**Environment:**

- Local/preview able to set `SUNNYSEAT_SUN_ENGINE=real` + Supabase service-role for end-to-end engine
  verification (R-002/R-003); otherwise unit-level adapter mocking
- A clean (empty-localStorage) Playwright browser context to reproduce the 9.5 onboarding-gate gap
- Live DB access for the 9.7 additive migration + contract test (IPv4 session pooler per MEMORY)

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate:** 100% (no exceptions)
- **P1 pass rate:** ≥95% (waivers required for any failure, with owner + reason)
- **P2/P3 pass rate:** ≥90% (informational)
- **High-risk mitigations (R-001..R-006):** 100% complete or approved waiver before the epic ships

### Coverage Targets

- **Live-path correctness (sun outputs, planner-leak gate, migration round-trip):** ≥90%
- **Behavioural regression set (Story 9.10 named scenarios):** 100% present + green
- **Performance (Story 9.3):** warm-cache list + detail measurably faster than baseline; sun outputs
  byte-identical for identical inputs
- **Visual fidelity:** design-gate "Visual validation" screenshots pass per story — BUT spacing/overlap
  correctness (9.9 card-vs-planner, 9.1 orphaned separators) is additionally asserted in code, because the
  visual gate is an LLM eyeball that ignores sizing/spacing (MEMORY)

### Non-Negotiable Requirements

- [ ] All P0 tests pass
- [ ] No high-risk (≥6) item unmitigated
- [ ] R-001 prod planner-leak proven gated (SEC)
- [ ] R-002 engine RPC volume halved + cache verified (PERF) with byte-identical sun outputs
- [ ] R-006 additive migration leaves live `getVenues` SELECT working (DATA)
- [ ] Full pre-existing suite (92 unit + 11 e2e) still green — no regression to map/onboarding/favourites/
      feedback/review/visit-loop/responsive-layout (excluding the known-RED a11y contrast deferred to 5.1)

---

## Mitigation Plans

### R-002: Uncached double-RPC sun engine (Score: 9 — CRITICAL)

**Mitigation Strategy:**
1. Refactor `computeRealSunEngine` to fetch the building set once and pass it to both
   `calculateVenueShadowForGeometry` and `calculateVenueShadowTimelineForGeometry`; correct the stale
   "one buildings fetch reused internally" comments (lines 51/317).
2. Wrap `get_buildings_near_point` in a server cache keyed on rounded centroid + radius (long revalidate —
   building geometry rarely changes).
3. Cache the per-(venue, rounded-time-bucket, day) sun computation; apply to BOTH `/api/venues` and
   `/api/venues/[slug]`.
4. Resolve the CDN-cache-vs-rate-limit conflict (R-013): move rate-limiting off the request-header read or
   adopt the precompute follow-up; document the staleness window (R-012).
**Owner:** Dev · **Timeline:** Story 9.3 · **Status:** Planned
**Verification:** RPC-call-count spy shows ~14→7 for 7 venues; cache-hit unit test; before/after warm+cold
timings recorded in the story; output snapshot equal to pre-fix for identical inputs.

### R-001: Production planner-forcing URL leak (Score: 6)

**Mitigation Strategy:** In `AppContextProviders.tsx`, force `forcedTime`/`forcedDate` to `undefined`
when `process.env.NODE_ENV === 'production'`, mirroring `use-forced-state.ts`; keep forcing in dev/preview.
**Owner:** Dev · **Timeline:** Story 9.0 · **Status:** Planned
**Verification:** Unit test asserts ignored under simulated prod env, honoured otherwise; full e2e
sun-spec suite still green in non-prod CI.

### R-003: Fabricated metadata contradicts the real engine (Score: 6)

**Mitigation Strategy:** Remove EXPONERING, BÄST KL., Platser ute, uncertainty paragraph + dead render
branches; preserve confidence % + real distance; replace placeholder tags with real Supabase data (9.7);
clean duplicated aria-labels; delete dead i18n keys; null the stale `shadow_warning_minutes` seed.
**Owner:** Dev · **Timeline:** Stories 9.1, 9.7 · **Status:** Planned
**Verification:** Component tests assert removed elements absent, truthful signals present, no orphaned
separators in either breakpoint; updated `prediction-uncertainty-display.test.ts`.

### R-004: Onboarding-gate hydration flash + dead locate click (Score: 6)

**Mitigation Strategy:** Synchronous first-render read of "onboarded" state (cookie / `useSyncExternalStore`);
wire the real locate button immediately; force/prompt reload on activated SW update; honest fallback labels.
**Owner:** Dev · **Timeline:** Story 9.5 · **Status:** Planned
**Verification:** Clean-localStorage Playwright context reliably shows the welcome overlay (closes the
smoke-test gap); component test for immediate locate-button presence + UserPin on success.

### R-005: Time→query refetch storm + redundant fetches (Score: 6)

**Mitigation Strategy:** Debounce/commit-on-settle the time→query key; source Favoriter from the list
cache; single initial fetch (gate on geolocation settle / widen bucket); keep slider thumb decoupled.
**Owner:** Dev · **Timeline:** Story 9.4 · **Status:** Planned
**Verification:** Tests assert ≤1 request per settled time, no Favoriter refetch, single initial request.

### R-006: Additive `tags` migration on the live DB (Score: 6)

**Mitigation Strategy:** Strictly additive migration (`tags` with default), update `.sql` contract +
`lib/supabase/types.ts` + `VENUE_SELECT_COLUMNS` in lockstep; seed 7 test venues.
**Owner:** Dev · **Timeline:** Story 9.7 · **Status:** Planned
**Verification:** Contract/store test asserts column presence + DTO round-trip; live `getVenues` SELECT
succeeds post-migration; absent/empty tags render without error.

---

## Assumptions and Dependencies

### Assumptions

1. Per-story story-context files (created later by `create-story`) will not materially change the AC
   already in epics.md; this plan tracks the epics.md AC and is grounded against the live source tree.
2. The 7 test/fixture venues are the only rows in live `public.venues` (per the maintainer note verified
   against project ref `hhnbxrhfhlzxgllxukzj`), so the 9.7 migration carries no production-data-loss risk.
3. The real sun engine path (`SUNNYSEAT_SUN_ENGINE=real`) is reachable in dev/preview for verification;
   where it is not, the adapter boundary is mocked.
4. The project's "Visual validation" gate remains an LLM-eyeball comparison that ignores sizing/spacing —
   so spacing/overlap correctness must be asserted in code (drives R-015, R-008 test design).
5. The known pre-existing a11y contrast RED (deferred to Story 5.1) stays out of scope and is not treated
   as an Epic 9 regression.

### Dependencies

1. Story 9.1 (content sweep) and Story 9.7 (real tags) both remove/replace `venue-visual-metadata.ts`
   placeholders — sequence so 9.7's real tags land after/with 9.1's removals to avoid churn.
2. Story 9.2's corrected CTA token is a prerequisite for Story 9.9's quick-info "VISA RUTT" CTA fidelity.
3. Story 9.4's debounce mitigation amplifies Story 9.3's caching benefit (and vice-versa) — they jointly
   resolve the live "stalls on every load" symptom; test 9.4 with 9.3 in place where possible.
4. Story 9.10's regression suite depends on 9.0/9.4/9.5 landing first (it asserts their behaviours).
5. Live DB access via the IPv4 session pooler (MEMORY) for the 9.7 migration + contract test.

### Risks to Plan

- **Risk:** Story 9.3 caching changes sun outputs subtly (not byte-identical) and breaks existing
  sun-engine unit tests.
  - **Impact:** Perf fix blocked / hidden correctness regression on the live path.
  - **Contingency:** Gate 9.3 on a byte-identical-output snapshot test against the pre-fix engine before
    landing; treat any diff as a FAIL, not a "rebaseline".
- **Risk:** The 9.0 prod-gate inadvertently disables `?_time=` in the CI e2e environment (if CI builds run
  as `production`).
  - **Impact:** Sun-dependent e2e specs go flaky/red.
  - **Contingency:** Confirm CI e2e runs as non-prod (or preview); the gate keys on `NODE_ENV`, so verify
    the CI build mode explicitly before merging 9.0.

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests (R-001 prod-gate, R-002 RPC-count/cache, R-003 content sweep)
  — separate workflow, not auto-run.
- Run `*automate` for broader coverage once each story's implementation exists.
- Run `*trace` per story (and at epic boundary) for the requirement→test traceability + gate decision.
- Run `*nfr` for the Story 9.3 performance NFR evidence audit (latency before/after, staleness window).

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: {name} Date: {date}
- [ ] Tech Lead: {name} Date: {date}
- [ ] QA Lead: {name} Date: {date}

**Comments:** Draft generated autonomously by the TEA test-design workflow from epics.md Epic 9 AC,
grounded against the live source tree (sun-engine.ts, AppContextProviders.tsx, venues/route.ts,
venue-visual-metadata.ts, OnboardingGate.tsx). Awaiting human review of risk scores + estimate ranges.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| ----------------- | ------ | ---------------- |
| **`/api/venues` (list route)** | 9.3 caching/CDN; 9.4 query hygiene; 9.7 tags column in SELECT | `venues-route.test.ts`, `venues-route-real-engine.test.ts`, `venue-store.test.ts` must pass |
| **`/api/venues/[slug]` (detail route)** | 9.3 caching applied equally | `venue-detail-route.test.ts` must pass |
| **`sun-engine.ts`** | 9.3 single building-fetch + cache | `services/sun-engine.test.ts`, `shadow-*` + `solar/*` specs; byte-identical outputs |
| **`AppContextProviders.tsx` / `TimeContext`** | 9.0 prod gate; 9.4 debounce | `TimeContext.test.tsx`, `use-forced-state.test.ts`, e2e sun specs (`?_time=`) |
| **`OnboardingGate` / `useGeolocation` / SW shell** | 9.5 sync first-paint + UserPin + SW reload | `OnboardingGate.test.tsx`, `useGeolocation.test.ts`, `onboarding.spec.ts`, `useOnlineStatus.test.ts` |
| **`MapControls` / `VenueSearchShell` / `MapView`** | 9.6 chrome consolidation; 9.5 UserPin layer | `MapControls.test.tsx`, `MapView.test.tsx`, `MapContainer.test.tsx`, `map-primary.spec.ts` |
| **`VenueQuickInfo` / `VenueDetailContent` / `VenueCard`** | 9.1 content sweep; 9.9 card rework | `VenueQuickInfo.test.tsx`, `VenueDetailContent.test.tsx`, `VenueCard.test.tsx`, `prediction-uncertainty-display.test.ts` |
| **`DesktopNavBar` / `VenueListControls` (chips/filters)** | 9.6 dead controls; 9.7 tag filter | `DesktopNavBar.test.tsx`, `VenueList.test.tsx`, `FavouritesList.test.tsx` |
| **`RouteButton` / `AboutPage` / `NotFoundPage` (CTA token)** | 9.2 gradient token | `AboutPage.test.tsx`, `NotFoundPage.test.tsx`, `RouteOverlay.test.tsx` |
| **i18n messages (`sv`/`en`)** | 9.1 key removals; 9.2/9.7 label fixes | `messages-parity.test.ts`, `uncertainty-copy.test.ts` |
| **Favourites query/cache** | 9.4 source Favoriter from list cache | `useFavouriteVenues.test.ts`, `venue-query-options.test.ts`, `query-keys.test.ts`, `favourites.spec.ts` |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — Risk classification framework + gate decision engine
- `probability-impact.md` — P×I (1–9) scoring + DOCUMENT/MONITOR/MITIGATE/BLOCK thresholds
- `test-levels-framework.md` — Unit / Component / API / E2E selection + duplicate-coverage guard
- `test-priorities-matrix.md` — P0–P3 prioritization + risk-score→priority mapping

### Related Documents

- Epic: `_bmad-output/planning-artifacts/epics.md` (## Epic 9, lines 2339-2644)
- PRD: `_bmad-output/planning-artifacts/prd.md`
- Architecture: `_bmad-output/planning-artifacts/architecture.md`
- Sprint status: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Grounding source files: `nextjs-app/lib/services/sun-engine.ts`,
  `nextjs-app/components/custom/layout/AppContextProviders.tsx`, `nextjs-app/app/api/venues/route.ts`,
  `nextjs-app/lib/utils/venue-visual-metadata.ts`, `nextjs-app/lib/dev/use-forced-state.ts`,
  `nextjs-app/components/custom/onboarding/OnboardingGate.tsx`

---

**Generated by:** BMad TEA Agent - Test Architect Module
**Workflow:** `bmad-testarch-test-design`
**Version:** 4.0 (BMad v6) — Epic-Level mode
