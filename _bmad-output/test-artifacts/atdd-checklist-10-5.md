---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: 2026-07-03
workflowType: testarch-atdd
inputDocuments:
  - _bmad-output/implementation-artifacts/10-5-weather-reality-verification-pass-regression-guards.md
  - nextjs-app/test/unit/services/sun-engine.cloud-gate.atdd.test.ts
  - nextjs-app/test/setup/setup.ts
  - nextjs-app/test/e2e/map-primary.spec.ts
  - nextjs-app/test/e2e/axe.spec.ts
  - nextjs-app/lib/types/api.ts
  - nextjs-app/lib/services/venues-fixture.ts
  - _bmad/tea/config.yaml
  - _bmad-output/auto-bmad/retro-notes/epic-10.md (referenced via story)
---

# ATDD Checklist - Epic 10, Story 10.5: Weather-Reality Verification Pass & Regression Guards

**Date:** 2026-07-03
**Author:** Rasmus
**Primary Test Level:** E2E (presentation matrix) + Unit (cross-tier invariants)
**Detected Stack:** fullstack (Next.js + Playwright + Vitest) — TEA config `test_stack_type: auto`
**Generation Mode:** AI generation (ACs are clear; no browser recording — the render surfaces already exist, this is a verification story)

---

## Story Summary

Story 10.5 is the LAST story of Epic 10 "Honest Sky" — a cross-story verification +
regression-guard pass, not a feature. Epic 10 made the headline sun state weather-honest across
four tiers (cloud gate, obscured UI, layered cloud detail, rain-now radar). 10.5 closes the two
gaps the epic left open: (1) there is NO deterministic end-to-end weather-boundary e2e matrix, and
(2) the whole tier stack lacks a consolidated cross-tier regression net plus a live reality check.

**As a** maintainer
**I want** the weather-gated display verified against the real sky and protected by deterministic regression tests
**So that** "the app said sunny while it rained" can never silently return.

---

## Acceptance Criteria

1. **AC1** — Deterministic mocked-weather e2e matrix (the R-005 fix): five weather scenarios
   (overcast ≥ threshold / clear / high-cirrus-only / active-rain / weather-missing) rendered
   end-to-end and asserted on card + pin + detail, wall-clock- and sky-independent (no live Met.no
   in CI), at a forced `?_time=`.
2. **AC2** — Live reality spot-check recorded in the story record — a **maintainer / `needs-human`**
   step. The dev provides the exact protocol + comparison table; the maintainer records the
   observation. NOT self-fabricated by the dev agent.
3. **AC3** — About copy still truthfully describes the two-signal model (`sv`/`en` parity),
   updated only if a claim became stale. VERIFY-first; likely no change.
4. **AC4** — Regression guards for the historical failure mode: 100% cloud never FULL SOL;
   missing cloud never clear; confidence-100%-cloud < confidence-0%-cloud; rain forces obscured;
   no-rain changes nothing; and the geometric fields (`sunExposurePercent`, `sunWindow`) remain
   **byte-identical across weather variations** for the same geometry + instant. Plus the
   epic-wide **no-live-Met.no shared-setup fetch guard**.

---

## Test Strategy — AC → level → priority

| AC | What it protects | Level | Priority | Home |
| --- | --- | --- | --- | --- |
| AC1 | End-to-end presentation of all 5 weather states on card+pin+detail | **E2E** (both breakpoints) | P0 | `test/e2e/epic-10-weather-matrix.spec.ts` (NEW) |
| AC2 | Live sky matches displayed state | **Manual / `needs-human`** | P0 | Dev Agent Record protocol (this checklist §"AC2 Protocol") |
| AC3 | About copy truthful, sv/en parity | Verify existing | P1 | `test/unit/messages-parity.test.ts` + `test/components/AboutPage.test.tsx` (existing — verify green) |
| AC4 100%-cloud ⇒ obscured / no amber | Cloud gate | Unit + Component (existing) | P0 | `sun-engine.cloud-gate.atdd.test.ts` + 10.2 component tests — **verify green** |
| AC4 missing-cloud ⇒ never clear | Unknown-never-fabricated | Unit (existing) | P0 | `sun-engine.cloud-gate.atdd.test.ts` [10.1 AC2] — **verify green** |
| AC4 confidence 100% < 0% | FR12 blend | Unit (existing + net-new cross-tier) | P0 | 10.1 AC3 + NEW two-signal test |
| AC4 rain forces obscured / no-rain inert | Tier 2 | Unit (existing) | P0 | `sun-engine.cloud-gate.atdd.test.ts` [10.4 AC2/AC3] — **verify green** |
| AC4 **geometry byte-identical across weather** (NET-NEW #1) | Two-signal guarantee | **Unit** | P0 | `test/unit/services/sun-engine.two-signal-invariants.atdd.test.ts` (NEW) |
| AC4 **no-live-Met.no fetch guard** (NET-NEW #2) | Masked-live-call class | **Unit + shared setup** | P0 | `test/unit/no-live-metno-fetch-guard.atdd.test.ts` (NEW) + `test/setup/setup.ts` (dev edits) |

**Coverage discipline (no duplication):** most AC4 invariants ALREADY have isolated coverage from
10.1–10.4. The RED-phase scaffolds authored here add ONLY the two genuine gaps (byte-identical
geometry + the shared fetch guard) and the e2e presentation matrix. The dev VERIFIES the
already-covered invariants are green rather than re-writing them.

---

## Failing Tests Created (RED Phase)

All scaffolds are `.skip` / `describe.skip` / `test.describe.skip`-gated so `vitest run` and the
Playwright suite are GREEN on HEAD. tsc `--noEmit` is 0 errors; eslint is clean; vitest collects
the two unit files as 8 skipped tests; Playwright lists the e2e matrix as 10 tests (5 × 2 projects).
The dev un-skips each block as it authors the corresponding guard/mock and confirms it goes green
(or triages a genuine RED to a root cause).

### E2E Tests (1 file, 5 scenarios × 2 breakpoints = 10 tests)

**File:** `nextjs-app/test/e2e/epic-10-weather-matrix.spec.ts` (~245 lines) — **NEW, `test.describe.skip`**

- **Test:** scenario "overcast" ⇒ muted "Sol bakom moln" obscured chrome on card + pin + detail
  - **Status:** RED — the DTO builders (`buildVenuesResponse`/`buildVenueDetailResponse`) are
    throwing stubs the dev fleshes out; the matrix is `.skip`-gated.
  - **Verifies:** overcast ≥ threshold renders obscured chrome, geometric % still visible.
- **Test:** scenario "clear" ⇒ amber Sunny, obscured testids ABSENT.
- **Test:** scenario "high-cirrus-only" ⇒ Sunny NOT gated (10.3 differentiator), sky line NOT overcast.
- **Test:** scenario "active-rain" ⇒ obscured chrome + "Regn"/"Rain" sky copy.
- **Test:** scenario "weather-missing" ⇒ ungated (geometry governs), NO sky line.
- **Belt-and-braces (all scenarios):** FAILS if any outbound `api.met.no` request is observed
  (`page.route('**://api.met.no/**', abort)` + assert zero hits).

**Deterministic mechanism:** `page.route` DTO fulfillment of `**/api/venues*` (list) +
`**/api/venues/<slug>*` (detail) → the venues route handler / engine / Met.no never run. `?_time=13:00`
pins the wall clock; the route mock pins the sky. Runs under `--project=desktop --project=mobile`.

### Unit Tests (2 files, net-new)

**File:** `nextjs-app/test/unit/services/sun-engine.two-signal-invariants.atdd.test.ts` (~250 lines) — **NEW, `describe.skip`**

- **Test:** `sunExposurePercent` IDENTICAL across all five weather variations (same geometry + instant).
  - **Status:** RED (skip-gated) — un-skip to confirm the two-signal guarantee holds end-to-end.
  - **Verifies:** weather NEVER perturbs the geometric layer — THE invariant the epic exists to protect.
- **Test:** `sunWindow` IDENTICAL (deep-equal serialization) across all five variations.
- **Test:** weather DOES change ONLY status/sky/confidence (proves the variations are real, not a no-op).
- **Test:** confidence at 100% effective cloud < confidence at 0% cloud (FR12 blend, guarded cross-tier).
- **Test:** weather-missing never fabricates clear ⇒ NOT gated + `skyCondition === 'unavailable'`.
  - **Harness:** mirrors `sun-engine.cloud-gate.atdd.test.ts` — deepest-adapter mocks (supabase rpc,
    met-no-service, nowcast-service), rain injected via the loose-cast `applyRealSunEngineWithNowcast`.
    NO network.

**File:** `nextjs-app/test/unit/no-live-metno-fetch-guard.atdd.test.ts` (~75 lines) — **NEW, `describe.skip`**

- **Test:** outbound `fetch('https://api.met.no/…locationforecast…')` THROWS/rejects once the shared guard is active.
  - **Status:** RED (skip-gated) — the guard does NOT exist in `setup.ts` on HEAD; the dev adds it (Task 4).
  - **Verifies:** a masked live Met.no call becomes a HARD failure instead of a silent pass (retro-note 10.4 R1).
- **Test:** outbound nowcast host (`…nowcast/2.0/complete…`) also THROWS/rejects (the exact 10.4 R1 path).
- **Test:** relative/same-origin URL (`/api/venues`) is NOT trapped by the guard (surgical — legitimate mocks still work).

### Component Tests

N/A as net-new — the 10.2 obscured component tests (`VenueQuickInfo.test.tsx`,
`VenueDetailContent.test.tsx`) already assert no amber under the gate on each surface. The dev
VERIFIES these are green; the e2e matrix carries the both-breakpoint presentation assertions
(MapView jsdom tests hardcode a 390×700 mobile canvas — retro-note 9-9/9-10, so breakpoint
assertions belong in Playwright, not a jsdom MapView test).

---

## Mock Requirements

### Met.no (locationforecast `complete`) — MUST NOT be reached in any test

- **Endpoint:** `GET https://api.met.no/weatherapi/locationforecast/2.0/complete`
- **Handling:** e2e — never reached (route-mock fulfills the DTO, engine never runs); unit — deepest
  adapter mocked (`@/lib/weather/met-no-service` `getForecast`); shared-setup guard THROWS on any hit.

### Met.no (nowcast `2.0/complete`) — MUST NOT be reached in any test

- **Endpoint:** `GET https://api.met.no/weatherapi/nowcast/2.0/complete`
- **Handling:** unit — `@/lib/weather/nowcast-service` mocked (default `undefined` = non-gating);
  rain injected via `getNowcastOverride`; shared-setup guard THROWS on any hit.

### Venues API — `page.route` DTO fulfillment (e2e only)

- **Endpoints:** `GET /api/venues` (list, `GetVenuesResponse`) + `GET /api/venues/{slug}` (detail,
  `GetVenueDetailResponse`).
- **Success body:** the seed venue (`test-venue-sunny`) DTO merged with the per-scenario override.
  GEOMETRY fields (`sunExposurePercent`, `sunWindow`) identical across scenarios; only
  `currentSunStatus` / `skyCondition` / `confidence` / freshness meta differ. `skyCondition` ABSENT
  for weather-missing. **DEV: build from `lib/services/venues-fixture.ts` + `lib/types/api.ts`.**

---

## Required data-testid Attributes (all ALREADY implemented — reuse, do NOT add)

### Map / QuickInfo (card + pin)
- `venue-pin` — the map pins (wait target).
- `venue-quick-info` — the selected-venue quick-info card.
- `quick-info-obscured` — the muted "Sol bakom moln" obscured chrome on the card (10.2).

### Venue detail
- `desktop-venue-detail-panel` — desktop detail overlay (branch by `testInfo.project.name`).
- `venue-detail-panel` — mobile detail sheet (DEV: confirm the mobile testid; adjust if named otherwise).
- `venue-detail-obscured` — the obscured chrome on the detail surface (10.2).

**No NEW `data-testid` is expected** — 10.5 adds no UI. If the dev finds the mobile detail panel
testid differs from `venue-detail-panel`, correct the scaffold to the shipped id (do NOT add one).

---

## AC2 Protocol — Live Reality Spot-Check (maintainer / `needs-human`)

The dev agent CANNOT self-fabricate a live sky observation. The dev's job is to hand the maintainer
this exact protocol; the maintainer performs it on a real grey-or-clear day and pastes the result
into the story's Dev Agent Record. The epic does not close AC2 until the maintainer records it.

**Steps for the maintainer:**

1. On a real day, open the LIVE production site (real-engine flag ON): the map (`/`) and one venue
   detail on the current day. Screenshot each showing the headline sun state + sky line.
2. Fetch the raw Met.no responses for central Gothenburg (`57.7089, 11.9746`) with the identifying
   User-Agent (`sunnyseat/… rasmus.thunborg@enhancior.se`):
   - Cloud split: `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=57.7089&lon=11.9746`
     → read `cloud_area_fraction` + `cloud_area_fraction_low/medium/high`.
   - Precipitation: `https://api.met.no/weatherapi/nowcast/2.0/complete?lat=57.7089&lon=11.9746`
     → read `precipitation_rate`.
3. Fill the comparison table below and paste screenshots + fetched values into the story's Dev Agent Record.
4. If the observable sky, the displayed state, and the fetched values disagree, TRIAGE to a root
   cause before the epic closes (may spawn a follow-up story).

**Comparison table (maintainer fills):**

| Observable sky (eyeball) | Displayed headline state | Displayed sky line | Fetched effective cloud (low+med+0.25·high) | Fetched precip_rate | Match? | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| _(grey/clear/rain)_ | _(Sunny / CloudObscured / …)_ | _(Sol bakom moln / Regn / none)_ | _(value)_ | _(value)_ | _(Y/N)_ | _(triage if N)_ |

---

## Implementation Checklist (map each RED scaffold to green-phase tasks)

### AC1 — e2e weather matrix (`epic-10-weather-matrix.spec.ts`)
- [ ] Implement `buildVenuesResponse` / `buildVenueDetailResponse` from the seed fixture + scenario
      override (match `GetVenuesResponse` / `GetVenueDetailResponse` in `lib/types/api.ts`).
- [ ] Confirm the mobile detail-panel `data-testid` and fix the branch if it differs.
- [ ] Add the sky-line copy assertions (rain "Regn"/"Rain"; weather-missing NO sky line;
      high-cirrus-only NOT overcast copy) against the 10.2 sky-line testid.
- [ ] Remove `test.describe.skip`. Run `npx playwright test --project=desktop --project=mobile test/e2e/epic-10-weather-matrix.spec.ts`.
- [ ] Confirm all 10 tests pass and ZERO `api.met.no` hits fired.

### AC4 net-new #1 — byte-identical geometry (`sun-engine.two-signal-invariants.atdd.test.ts`)
- [ ] Remove `describe.skip`. Run `npx vitest run test/unit/services/sun-engine.two-signal-invariants.atdd.test.ts`.
- [ ] Confirm geometry is byte-identical across all five variations; triage any RED to a two-signal defect
      (do NOT weaken the assertion).

### AC4 net-new #2 — shared no-live-Met.no fetch guard
- [ ] Add a `beforeEach`/`afterEach` guard in `test/setup/setup.ts` that `vi.stubGlobal('fetch', …)`
      and THROWS on any outbound `api.met.no` request; allow relative/same-origin/MSW. Verify against
      the FULL suite; if trapping all external hosts breaks tests, scope to `api.met.no` only + note it.
- [ ] Remove `describe.skip` from `test/unit/no-live-metno-fetch-guard.atdd.test.ts`. Run it green.

### AC4 already-covered — VERIFY GREEN (do NOT rewrite)
- [ ] `sun-engine.cloud-gate.atdd.test.ts` [10.1 AC1/AC2/AC3] + [10.4 AC2/AC3] all green.
- [ ] 10.2 obscured component tests (no amber under the gate) all green.

### AC3 — About copy verify
- [ ] Read `messages/{sv,en}/about.json` + the About page. Confirm the two-signal blend copy is
      truthful (already is) with no over-claim of per-venue cloud precision. Confirm `messages-parity`
      + `AboutPage.test.tsx` green. Record "verified truthful — no change" OR edit BOTH locales if stale.

### AC2 — hand to maintainer (`needs-human`)
- [ ] Paste the AC2 protocol + comparison table into the story's Dev Agent Record; mark AC2 a recorded
      `needs-human` maintainer step. Do NOT fabricate a PASS.

---

## Running Tests

```bash
# From nextjs-app/
# The two net-new unit scaffolds (skipped until un-skipped):
npx vitest run test/unit/services/sun-engine.two-signal-invariants.atdd.test.ts test/unit/no-live-metno-fetch-guard.atdd.test.ts

# The e2e matrix (both breakpoints, not part of the vitest gate):
npx playwright test --project=desktop --project=mobile test/e2e/epic-10-weather-matrix.spec.ts

# Full four-command gate on every test-file write:
npx tsc --noEmit && npx eslint . && npx vitest run   # + messages-parity green
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete for this ATDD pass) ✅
- ✅ E2E matrix scaffold created (`test.describe.skip`, DTO-mock helpers stubbed, both breakpoints, met.no-abort guard).
- ✅ Byte-identical-geometry cross-tier unit scaffold created (`describe.skip`, deepest-adapter mocks, no network).
- ✅ Shared no-live-Met.no fetch-guard acceptance scaffold created (`describe.skip`).
- ✅ AC2 maintainer protocol + comparison table authored.
- ✅ Gates verified: tsc 0 errors, eslint clean, vitest collects (8 skipped), Playwright lists 10 tests. NO collection break.

### GREEN Phase (DEV — next)
Work one scaffold at a time: flesh out the DTO builders / add the setup guard / un-skip / run / confirm
green (or triage a genuine RED). VERIFY the already-covered AC4 invariants are green rather than re-writing.

---

## Notes

- **This is a verification/regression story — EVERY referenced module already exists.** Per the epic
  retro-note, static imports are therefore fine; the loose-cast `.skip` accessor pattern is used ONLY
  where robustness to an exported signature helps (`applyRealSunEngineWithNowcast`). No red scaffold
  references a not-yet-existent module, so no runtime-variable `import()` specifier was needed. (Had
  one been required, the retro-note mandates `const M = '@/…'; await import(M)` to dodge
  `vite:import-analysis` resolving a string-literal specifier inside `describe.skip`.)
- **tsc CI gate ignores `.skip` — honored.** All scaffolds compile clean under `tsc --noEmit`; the
  future-signature access uses a loose cast so the compiler never sees an arity/missing-export error.
- **Relative-boundary discipline:** no scaffold hardcodes the `80` threshold, layer weights, or a magic
  mm/h rain rate — assertions are RELATIVE (obscured-vs-amber, sky-line present-vs-absent,
  geometry-equal) so a future re-tune survives.
- **No live Met.no anywhere:** e2e never runs the engine (route-mock); unit mocks the deepest adapters;
  the new shared guard turns any masked call into a hard failure; the e2e also aborts + asserts zero
  `api.met.no` hits.
- **Design Gate (verification story — no new UI):** the 10.2 obscured reference PNGs
  (`map-with-obscured-venue`, `venue-detail-obscured`) do NOT exist and host `/tmp` visual tooling is
  broken (retro-note 9-2) — the "10.2 references pass at both breakpoints" gate is BLOCKED on a
  MAINTAINER rebaseline (an already-open 10.2 follow-up). The dev is FORBIDDEN from creating/editing
  reference PNGs. This ATDD pass adds NO new screenshot target.

---

**Generated by BMad TEA Agent (ATDD, red phase)** — 2026-07-03
