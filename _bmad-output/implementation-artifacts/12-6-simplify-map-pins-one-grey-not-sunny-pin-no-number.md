---
baseline_commit: NO_VCS
---

# Story 12.6: Simplify Map Pins — One Grey "Not Sunny" Pin, No Number

Status: ready-for-dev

## Story

As a **user scanning the map**,
I want one obvious "sunny" pin and one obvious "not sunny" pin, without a confusing
number on the not-sunny ones,
So that I instantly see where the sun is without misreading the percentage.

## Source Context (Verbatim From Epic)

_Context (2026-07-08, maintainer decision):_ today the map has THREE pin visuals
(`VenuePin.tsx`): amber (Sunny/Partial), light-grey shaded (Shaded/NoSun), and a
slate-grey "sol bakom moln" obscured pill (CloudObscured, Story 10.2) — and every
pin shows a number. The number is **sun-exposure %** (share of seating in sun), NOT
confidence. Two greys + a number on the not-sunny pins confuse users, who read the
number as a probability. Simplify to a binary the map can answer at a glance: **can I
sit in the sun here right now — yes (amber) or no (grey)?**

## Acceptance Criteria (Verbatim From Epic)

**Given** the amber-vs-grey decision today keys off the Sunny/Partial/Shaded
thresholds (amber at ≥30% sunlit)
**When** the pin colour rule is changed per the MAINTAINER DECISION (2026-07-08) to a
**50% cut**: a pin is **amber (sunny)** only when **more than 50%** of the seating is
in sun AND it is not weather-gated; **grey (not sunny)** when **50% or less** is sunlit
**Then** a venue at e.g. 40% sunlit (amber today) shows GREY, and the card/label copy
that says "sunny"/highlights the sun figure tracks the SAME 50% line so a grey-pinned
venue is never described as sunny (reconcile the pin, the card "% sol" emphasis, and
any "soligt" wording to one 50% boundary)

**Given** "Mest sol" ordering ranks sunny-first on BOTH sides: the SERVER `SUN_STATUS_RANK`
(`route.ts:75-84`; `Sunny=2, Partial=1, Shaded/NoSun=0`) via `sunListRank`/`venuePeakSunRank`
(`route.ts:89,110`), AND a co-equal CLIENT mirror `getVenueSunRankForList` +
`isVenueSunnyForList` (`VenueList.tsx:174-199`) that drives the VISIBLE `sortVenuesForList`
order and the card's `isSunny` — so a `Partial` venue at 40% currently sorts ABOVE not-sunny
ones on the rendered list
**When** the 50% cut lands
**Then** the ORDERING predicates are updated to the same boundary on BOTH sides — the server
rank AND the client `getVenueSunRankForList`/`isVenueSunnyForList` (they are required to stay
in lock-step) — so a grey venue (≤50% sunlit OR weather-gated) is never promoted into the
sunny-first / "Mest sol" band above genuinely sunny (>50%, not-gated) venues; the sort, the
pin, and the card copy all agree on one line (covered by a server test AND a client
list-order test)

**Given** there are two grey pin visuals (light-grey shaded + slate-grey obscured)
**When** they are merged into ONE grey "not sunny" pin (cloud icon)
**Then** `Shaded`, `NoSun`, AND `CloudObscured` all render the SAME single grey pin;
the underlying `CloudObscured` STATUS is preserved (so the card can still explain
"sol bakom moln" vs shade, feedback `predicted_state` and the DB CHECK are untouched)
— only the PIN PRESENTATION merges. The Epic-10 honesty is preserved: a cloudy-but-
geometrically-sunny venue stays grey (never falsely amber)

**Given** every pin shows a number today
**When** the grey pin is finalized
**Then** the **grey pin shows the cloud icon and NO number**; the **amber pin keeps
the sun icon + the sun-exposure %**. Colour is never the only signal (sun vs cloud
icon still differentiates — NFR27), and the accessible name drops the percentage — which
requires flipping the i18n keys + tests, NOT just the visual + screenshots: `pinShadedAria`
/ `pinObscuredAria` still interpolate `{percent}` (both locales) and `VenuePinLayer.test.tsx`
asserts the obscured aria contains the number (e.g. "88"), so the grey-pin variants are
updated to a percent-free "inte soligt" contract and those pin-aria tests are flipped (else
SR users still hear the old percentage). CRITICALLY, the presentation/aria RESOLVER keys on
the shared **>50% predicate, not raw status**: a 35–50% venue keeps
`currentSunStatus='Partial'`, and `VenuePin`/`VenuePinLayer` branch on STATUS today — so
without this, a grey 40% venue would still get the sunny presentation + `pinPartialAria`
with `{percent}`. The low-Partial case explicitly gets the grey percent-free contract,
covered by a test at e.g. 40% Partial

**Given** this changes the shipped pin treatment (supersedes Story 10.2's three-way
pins at the PIN level only)
**When** it lands
**Then** the reference PNGs for the map (mobile + desktop, sunny + not-sunny states)
are rebaselined and `REBASELINE-LOG.md` updated in the same operation

**Design Gate Criteria:**
- **Visual:** Two pin states only — amber sun pill with % (sunny), grey cloud pill
  with no number (not sunny); matches the design-token palette (`--color-amber-pin`,
  `--color-pin-*`)
- **Behaviour:** amber ⟺ >50% sunlit and not weather-gated; grey otherwise (incl.
  cloudy/rain-gated); the card never labels a grey-pinned venue "sunny"
- **Animation:** No entrance flash when a venue crosses the gate on refresh (keep the
  existing `initial={false}` / duration-0 treatment on the grey pill)
- **Visual validation:** Screenshot comparison of the map (mobile + desktop) against
  the rebaselined reference passes — one grey pin, no number, correct 50% split

## Pre-Implementation Dependency Gate

Story 12.6 owns the shared public-sun contract. It consumes, but must not duplicate or
replace, these already-landed Epic 12 seams:

1. **Story 12.3 persisted geometry/read-time weather:** `buildPersistedSunOutcome`
   reads the exact current geometry series and `gateGeometrySeriesWithWeatherSnapshots`
   emits the client day series. The persisted artifact remains ungated
   `{minutes, sunExposurePercent}` geometry. This story adds the explicit public
   `weatherGateState` only at the read-time DTO boundary; no schema migration or
   request-path shadow recompute belongs here.
2. **Story 12.7 public visibility:** public venue reads retain the canonical
   `hidden === false` contract and the shared live id-or-slug resolver. Do not query
   Supabase directly from pin/list code, restore fixture fallback in live mode, or
   invent another visibility vocabulary. Applying and verifying Story 12.7's
   canonical `hidden` migration remains a deployment prerequisite, not Story 12.6
   implementation scope.
3. **Current design hierarchy:** adopted Architecture `E12-AD-08` and the revised UX
   `VenuePin` contract supersede the old Claude prototype and current reference PNGs.
   Those stale sources are rebaseline inputs, not reasons to retain `>=35%`, numbered
   grey pins, slate obscured pins, or a selected-circle third presentation.

If the Story 12.3 or 12.7 seams are absent on the implementation branch, stop and report
the missing prerequisite. Do not recreate them locally inside map components.

## Tasks / Subtasks

- [ ] **Task 0 - Reconfirm the implementation baseline and binding sources** (AC: all)
  - [ ] From `nextjs-app/`, run `npx tsc --noEmit` and `npx eslint . --quiet` before editing. Stop and report unrelated failures; do not suppress them.
  - [ ] Confirm the current branch contains Story 12.3's persisted geometry/read-time weather path and Story 12.7's canonical visible-only venue store/resolver. Record any missing deployment-only Story 12.7 migration evidence without reimplementing the resolver.
  - [ ] Read `AGENTS.md`, `project-context.md`, `nextjs-app/docs/design/DESIGN.md`, the Claude Design bundle README/`STATE-MAPPING.md`/active `Pins.jsx`, the current map PNGs, `REBASELINE-LOG.md`, UX `VenuePin`/`VenueQuickInfo`/`SunTimeline`/accessibility/motion sections, Architecture `E12-AD-08`, and the Epic 12 test design before changing frontend code.
  - [ ] Confirm no new package is needed. Keep MapLibre dynamically loaded and preserve the existing marker-reconciliation/performance boundary.

- [ ] **Task 1 - Establish one pure public-sun domain contract** (AC: 1, 2, 3, 4)
  - [ ] Add `WeatherGateState = 'gated' | 'not_gated' | 'unknown'` to the public API type contract and one client/server-safe pure public-sun module, preferably `nextjs-app/lib/utils/public-sun.ts`. It must not import server-only solar, weather, Supabase, middleware, or building modules.
  - [ ] Implement the single predicate exactly as `sunExposurePercent > 50 && weatherGateState !== 'gated'`. Exactly `50` is false/grey; `unknown` is not silently rewritten to `not_gated`.
  - [ ] Keep the helper's inputs limited to exposure and gate state. `confidence`, `VenueSunStatus`, partner state, selected state, and sky-condition strings must not affect the verdict. Preserve the raw 30%/70% `VenueSunStatus` classifier as diagnostic engine data; do not retune `classifySunStatus`, change the status union, or change feedback's `predicted_state` DB CHECK.
  - [ ] Provide one shared total `Mest sol` comparator: public-sunny first, `sunExposurePercent` descending, distance ascending, then stable venue ID ascending. Prefer importing the same pure helper on server and client; if a mirror is unavoidable, add parity golden vectors that make drift fail.
  - [ ] Centralize public window/peak extraction in this pure domain layer or a small adjacent pure module rather than leaving another raw-status/30% predicate. Its contract is detailed in Task 3.

- [ ] **Task 2 - Emit and propagate explicit weather-gate state** (AC: 1, 2, 3, 4)
  - [ ] Add required `weatherGateState` fields to every public selected-instant `VenueDataDto` and every `VenueDaySeriesEntry`; add it to `VenuePinData` and any narrow ranking/window input types. Missing/malformed weather at a normalization boundary maps to `unknown`, never known-clear.
  - [ ] In `gateGeometrySeriesWithWeatherSnapshots`, emit `unknown` for missing/expired/unavailable weather, `gated` when the known cloud/rain gate applies, and `not_gated` when weather is known and the gate does not apply. Copy the selected step's value to the top-level DTO in `buildPersistedSunOutcome`.
  - [ ] Preserve `sunExposurePercent` as ungated geometric seating share and preserve `CloudObscured` as the diagnostic headline status when the gate applies. Do not persist gate state into `venue_sun_geometry_series` and do not reconstruct it downstream from `CloudObscured` strings.
  - [ ] Thread the field through `deriveVenueSunAtMinutes`, `MapView.applyDaySeriesDerivation`, `mapVenueDtoToPinData`, list/favourite top-up rows, fixtures/store normalization, planner/fixture weather adapters, fallback DTOs, and forced visual normalizers. Forced sunny states are `not_gated`; forced obscured states are `gated`; weather-unavailable fixtures are `unknown`.
  - [ ] Retain explicit unknown-weather honesty (`skyCondition: 'unavailable'`, geometry-only freshness, and localized weather/uncertainty copy). An `unknown` step above 50 may use the amber geometric-potential presentation under `E12-AD-08`, but the same visible/accessible surface must not imply known-clear weather.

- [ ] **Task 3 - Make ordering, cards, windows, and peaks consume the same contract** (AC: 1, 2, 3, 4)
  - [ ] Replace server `SUN_STATUS_RANK`/`sunListRank` and client `getVenueSunRankForList`/`isVenueSunnyForList` decisions with the shared predicate/comparator. The response sort, client `Mest sol` sort, card `isSunny`, and server pre-slice behavior must agree.
  - [ ] Preserve day-stable top-50 selection: update `venuePeakSunRank` (or replace it with a typed peak comparison) so the best per-series public verdict/exposure drives truncation, then use distance and stable ID for deterministic ties. A high-exposure weather-gated venue remains in the grey band but its geometric exposure orders it deterministically within that band. `Nära mig` and other explicit sort modes may keep their own primary order but may not redefine sunny.
  - [ ] Extract an unqualified sun window only from contiguous day-series steps satisfying the shared predicate. Choose the longest run; equal-length runs choose the earlier one; gaps in planner minutes break a run; display the first and last qualifying sample minutes, not the next interval boundary.
  - [ ] Extract peak only from qualifying steps. Highest exposure wins and equal exposure chooses the earlier minute. A series with only `<=50%` or gated steps has no unqualified window/peak.
  - [ ] Update `sun-engine`/persisted outcome/detail-route/list-card consumers and `sun-status-presentation` helpers so a grey venue never exposes an unqualified `Sol HH:MM–HH:MM`, peak, or "soligt" label. Lower/gated geometry may remain only as localized `viss sol`/potential copy; unknown-weather windows/peaks retain an explicit unknown qualifier.
  - [ ] Do not mutate Story 12.3's persisted geometry, add a provider fetch, or break the Epic 11 same-date scrub=0/date-change=1 request gates.

- [ ] **Task 4 - Collapse map and map-adjacent presentation to two honest states** (AC: 1, 3, 4)
  - [ ] Make `VenuePin` and `VenuePinLayer` resolve presentation and ARIA through the shared predicate, never raw `sunStatus`. Cover contradictory/low diagnostic statuses explicitly: a `Partial` 40% pin is the grey branch.
  - [ ] Keep the existing amber pointer/pill treatment for sunny: `color-amber-pin`, sun icon, rounded seating-share percentage. This story is not an unrelated amber border/text restyle.
  - [ ] Use the canonical `color-pin-shaded` treatment for the one not-sunny map pin: cloud icon and no visible percentage/text node. `Shaded`, `NoSun`, low `Partial`, and gated `CloudObscured` render the same subtree. Retain `color-pin-obscured` for non-pin weather explanation where still used; do not delete it blindly.
  - [ ] Selection, hover, focus, partner decoration, and clustering may add only non-semantic emphasis. A selected amber remains the same amber pointer/pill and a selected grey remains the same grey cloud; remove the current selected-circle third data shape/morph.
  - [ ] Make grey list cards and QuickInfo selected-instant verdicts percentage-free and not-sunny. Preserve a localized `Sol bakom moln` explanation for underlying `CloudObscured` without restoring the number; shade and low exposure use the localized not-sunny contract. Amber cards may show the seating-share percentage.
  - [ ] Keep confidence completely outside the verdict, comparator, pin content, and pin accessible name. Do not implement Story 12.13's repository-wide confidence removal here, but do not add or relabel confidence as sun exposure.

- [ ] **Task 5 - Complete i18n, accessibility, focus, and motion behavior** (AC: 4; Design Gate)
  - [ ] Replace the raw-status pin ARIA split with two localized outcomes in both `messages/sv/map.json` and `messages/en/map.json`: amber names the venue, "soligt vid vald tid", and seating-share percentage; grey names the venue and "inte soligt vid vald tid" with no percent interpolation. Remove stale `pinPartialAria`/`pinShadedAria`/`pinObscuredAria` readers only after a repo-wide source/test/mock scan.
  - [ ] When amber is backed by `weatherGateState='unknown'`, append or associate localized weather-unavailable/uncertainty text so assistive users do not hear it as known-clear. Do not expose a confidence number.
  - [ ] Keep Sun/Cloud icons decorative to assistive technology while the pin button has the complete accessible name. Preserve semantic button behavior, visible focus, keyboard activation, and an actual minimum 44x44 mobile hit target after the grey label is removed.
  - [ ] Existing-marker updates that cross 50% or change gate state must update in place without an entrance/remount flash. Add gate state to the marker render fingerprint, retain `initial={false}`/duration 0 for data-state replacement, and keep any initial-arrival fade separate from refresh transitions.
  - [ ] Under `prefers-reduced-motion`, initial pin fades, selection motion, and data-state transitions are instant. Preserve the current fail-safe treatment of an unresolved motion preference.

- [ ] **Task 6 - Add deterministic boundary, parity, browser, and non-vacuous mobile-a11y evidence** (AC: 1, 2, 3, 4; Design Gate)
  - [ ] Add pure golden vectors for exactly 50, just above 50, 40% `Partial`, >50 not-gated, >50 gated/`CloudObscured`, and >50 unknown. Prove confidence changes do not change verdict/rank and unknown never loses its explicit signal.
  - [ ] Add server and client comparator tests for the complete tuple, including equal-exposure distance and stable-ID ties, weather-gated ordering inside the grey band, and top-50 day-peak truncation parity.
  - [ ] Add window/peak tests for qualifying/non-qualifying samples, missing-minute gaps, longest-run selection, equal-length earliest-run tie, first/last sample endpoints, equal-peak earliest-minute tie, gated high exposure, exactly 50, and unknown-weather qualification.
  - [ ] Update `VenuePin.test.tsx`, `VenuePinLayer.test.tsx`, `VenueList`/`VenueCard`/`VenueQuickInfo` tests, MapView/day-series tests, API route tests, and Epic 10 weather tests. Assert exact localized ARIA for a 40% `Partial` and a 95% gated venue, no grey percentage, amber percentage retained, selected shape unchanged, 44x44 hit target, no refresh flash, and reduced-motion parity.
  - [ ] Add mobile and desktop E2E coverage with deterministic API/fixture vectors; do not rely on `map-primary` screenshots alone to prove the 50% boundary because its forced visual normalization is not a boundary harness. Automated tests must not call live Met.no or production Supabase.
  - [ ] Turn at least one pin-relevant `a11y-mobile` scenario into an executed `test` (or add a focused executed scenario), wire `--project=a11y-mobile` into `.github/workflows/build-and-test-nextjs.yml`, and update `epic-11-standing-gate-ci-wiring.automate.test.ts` so CI invocation, `testMatch`, and a non-zero/non-fixme executable scenario are guarded. Remove the obsolete assertion that CI must omit the project.
  - [ ] Run full cross-epic regression from `nextjs-app/`: `npx tsc --noEmit`, `npx eslint . --quiet`, `npx vitest run`, and `npx playwright test --project=mobile --project=desktop --project=touch --project=a11y --project=a11y-mobile`, recording executed/pass/fixme counts. In PowerShell, set `$env:CI='1'` for the Playwright run when an unrelated port-3000 server could otherwise be reused, then restore/unset it.

- [ ] **Task 7 - Reconcile design docs, capture the implementation, and pass the visual gate** (AC: 5; Design Gate)
  - [ ] Update `DESIGN.md` to describe exactly two map-pin data presentations and the canonical `color-pin-shaded` map use while retaining `color-pin-obscured` for honest non-pin weather surfaces. Preserve the accepted production amber chrome; do not copy stale prototype pixels or add raw colors/arbitrary spacing/shadows.
  - [ ] Prepare the `project-context.md` forced-state description and Claude `STATE-MAPPING.md`/capture-tooling corrections needed so the old prototype `>=35%`/numbered-grey recipe cannot overwrite implementation-driven map references. Apply any route/capture-recipe change together with the explicitly authorized reference update and same-operation rebaseline log entry.
  - [ ] Assert each forced DOM state before capture. Minimum semantic visual gates are `map-primary` mobile resting `peek`, `map-primary` desktop, `map-with-obscured-venue` mobile+desktop, `map-with-selected-venue` mobile, and `map-panel-venues` mobile `mid`. Cover desktop selection through component/E2E interaction; no mapped desktop selected reference exists.
  - [ ] Produce deterministic candidate captures for all ten map-visible references named by the current `REBASELINE-LOG.md` trigger: mobile `map-primary`, `map-panel-venues`, `map-with-selected-venue`, `map-with-obscured-venue`, `favourites-tab`; desktop `map-primary`, `map-with-obscured-venue`, `favourites-tab`, `venue-detail`, `venue-detail-obscured`. Keep implementing-agent candidates outside the authoritative reference paths and present the before/after set to Rasmus.
  - [ ] Per `project-context.md`, the implementing agent must not replace or self-bless reference PNGs. Rasmus, or an explicitly authorized reference-update operation, replaces the approved PNGs and updates `nextjs-app/docs/design/references/REBASELINE-LOG.md` in the same operation with source, routes, viewports, DOM-state assertions, reason, and blessing status. Never replace a reference merely to make a wrong implementation pass.
  - [ ] After the prepared references are approved, run the provider-neutral visual wrapper for all affected mapped pairs from the repository root, for example `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-primary '/?_state=map-primary&_time=14:00' mobile`, using each route/viewport in the table below. A mismatch caused by implementation is fixed in code; a mismatch caused by out-of-scope reference content requires Rasmus's explicit accept-with-rationale.
  - [ ] When every functional, browser, accessibility, visual, and maintainer-approval gate is satisfied, transition through `.\scripts\run-sh.ps1 scripts/story-review.sh 12-6-simplify-map-pins-one-grey-not-sunny-pin-no-number`. Do not edit `sprint-status.yaml` directly to mark implementation review.

## Dev Notes

### Binding Contract Summary

- Public sunny is exactly `sunExposurePercent > 50 && weatherGateState !== 'gated'`.
  Exactly 50 is grey. Raw `VenueSunStatus` and confidence are not inputs.
- `weatherGateState` is required and explicit: `gated | not_gated | unknown`.
  Unknown may expose >50 geometric potential, but unknown-weather/uncertainty remains
  visible and accessible; it is never reconstructed as clear weather.
- Amber retains a seating-share percentage. Every grey map pin/card/accessible name is
  percentage-free. `CloudObscured` remains available for explanatory copy and feedback.
- `Mest sol` uses one total tuple: public-sunny, exposure descending, distance
  ascending, stable ID ascending. Server selection and client rendering must agree.
- Public windows and peaks use the same predicate. Longest contiguous run and earliest
  ties are binding, not optional implementation detail.

### Current Implementation Facts

- `nextjs-app/lib/types/api.ts` has no `weatherGateState`; the selected DTO and
  `VenueDaySeriesEntry` expose only raw status, percentage, and optional sky condition.
- `nextjs-app/lib/services/weather-snapshots.ts` already distinguishes
  `weatherUnknown` while gating the Story 12.3 geometry series, but discards that
  distinction before returning the DTO.
- `nextjs-app/lib/services/sun-geometry-repository.ts` selects a gated series entry and
  returns peak exposure without the >50/gate predicate. Detail still consumes a
  separate `sunWindow`/status projection.
- `nextjs-app/lib/services/sun-engine.ts` uses the internal 30% Partial threshold for
  `extractSunlitWindow` and `peakTimeFromTimeline`. Preserve that diagnostic classifier
  where needed, but stop using it for public unqualified window/peak labels.
- `VenuePin.tsx` currently has sunny, shaded, and obscured subtrees and morphs selected
  sunny pins into a circle. `VenuePinLayer.tsx` resolves ARIA from raw status, and both
  grey locale keys still interpolate a percentage.
- `app/api/venues/route.ts` and `VenueList.tsx` duplicate raw-status ranking. The server
  pre-slice and client render order can therefore drift and lack the stable-ID final tie.
- `VenueCard`/QuickInfo retain Story 10.2's numbered obscured "solläge" treatment.
  Story 12.6 supersedes that percentage at the public grey presentation level while
  retaining the underlying weather explanation.
- `a11y-mobile` is defined in `playwright.config.ts`, but every venue-bearing scenario
  is currently `test.fixme`, CI does not invoke the project, and a standing unit test
  enforces that omission. This story must reverse all three parts of that stale posture.

### Visual Source Reconciliation

- Adopted Architecture/UX and this story supersede the active Claude prototype's
  `pct >= 0.35`, numbered light-grey pins, numbered slate obscured pins, and selected
  shape/motion. Read the prototype to match surrounding composition, not its old data
  rule or inline pixels.
- Use `color-pin-shaded` as the single map-pin grey because it is the design system's
  canonical not-sunny pin treatment. Keep `color-pin-obscured` for non-pin
  `Sol bakom moln` surfaces that still require it.
- Current PNGs intentionally show the old state and must fail after a correct change
  until the implementation-driven rebaseline is approved and applied by Rasmus or an
  explicitly authorized reference-update operation. The prototype capture recipe is
  stale for these map screens; do not regenerate it blindly.
- Visual snapshots prove composition/two-state appearance. Boundary truth comes from
  deterministic unit/component/API/E2E vectors, not from reading percentages in a
  forced screenshot.

### Required Screen IDs And Modes

| Screen ID | Route | Viewport / required mode |
|---|---|---|
| `map-primary` | `/?_state=map-primary&_time=14:00` | Mobile, resting `peek` |
| `map-primary` | `/?_time=16:30` | Desktop |
| `map-with-obscured-venue` | `/?_state=map-with-obscured-venue&_time=14:00` | Mobile + desktop, gated grey no-number pins |
| `map-with-selected-venue` | `/?venue=test-venue-sunny&_state=map-with-selected-venue&_time=14:00` | Mobile, selected emphasis without a third data shape |
| `map-panel-venues` | `/?_state=map-panel-venues&_time=14:00` | Mobile, `mid`, cards visible |
| `favourites-tab` | `/favoriter?_state=favourites-tab&_time=14:00` | Mobile + desktop rebaseline ripple |
| `venue-detail` | `/?venue=test-venue-sunny&_state=venue-detail&_time=16:30` | Desktop map-visible rebaseline ripple |
| `venue-detail-obscured` | `/?venue=test-venue-sunny&_state=venue-detail-obscured&_time=16:30` | Desktop map-visible gated ripple |

Mobile detail sheets cover the map and are not in the current pin-change recapture trigger.
There is no desktop `map-with-selected-venue` mapping; do not invent a screen ID without
updating the route map and rebaseline log through the normal process.

### Downstream Contracts

- **Story 12.2** imports this story's server-safe predicate and gate tri-state for
  `public_sun_verdict`, `weather_gated`, and `weather_unknown`; it must not rebuild the
  logic from `predicted_state`.
- **Story 12.8** consumes the same two real pin swatches and predicate for the About
  legend. Do not implement the About page in this story, but leave a stable reusable
  presentation contract rather than duplicated JSX.
- **Story 12.11** uses the real amber/grey swatches in the first coach mark. Do not build
  the guide here; ensure the pin component can be reused without map-only semantics.
- **Story 12.13** owns repository-wide visible/screen-reader confidence removal. This
  story only proves confidence cannot affect or masquerade as the public sun verdict.

### Testing Requirements

- Story risks from the Epic 12 test design: R-006 (score 9 predicate/comparator drift),
  R-019 (wrong rebaseline), R-011 (confidence/accessibility leakage), and R-023
  (vacuous mobile accessibility).
- Required final commands from `nextjs-app/`: `npx tsc --noEmit`,
  `npx eslint . --quiet`, `npx vitest run`, and
  `npx playwright test --project=mobile --project=desktop --project=touch --project=a11y --project=a11y-mobile`.
  Record actual framework counts.
- Keep the Epic 11 scrub=0/date-change=1, touch slider/sheet, chip parity, day-series,
  opening-hours, and recenter gates green. Re-run the Epic 10 weather matrix and
  no-live-Met.no guards because this story changes weather/public-sun interpretation.
- Maintain the <=600 KB total / <=280 KB initial route / <=320 KB MapLibre chunk budgets.
  Add no dependency for this pure logic and do not move MapLibre into the initial bundle.
- Visual validation is mandatory on both viewports after approved rebaseline. The
  story-review shell gate does not replace the explicit Playwright/a11y evidence.
- `project-context.md` records a Windows temp-path failure in the legacy visual
  provider. Run the canonical wrapper first; if that exact host-tooling failure occurs,
  record it and use only the documented explicitly allowed manual validation path.
  Do not modify the gate script or report manual mode as an automated provider pass.

### Expected File Impact

Likely core implementation files:

- `nextjs-app/lib/utils/public-sun.ts` (new shared pure predicate/comparator/extraction contract)
- `nextjs-app/lib/types/api.ts`, `nextjs-app/lib/types/map.ts`
- `nextjs-app/lib/services/weather-snapshots.ts`, `nextjs-app/lib/services/sun-geometry-repository.ts`, `nextjs-app/lib/services/sun-engine.ts`, `nextjs-app/lib/services/weather-freshness-fixture.ts`
- `nextjs-app/lib/services/venues-fixture.ts`, `nextjs-app/lib/services/venue-store.ts`, `nextjs-app/lib/services/venue-planner.ts` where required by the new DTO field
- `nextjs-app/lib/utils/venue-day-series.ts`, `nextjs-app/lib/utils/venue-pin-mapping.ts`, `nextjs-app/lib/utils/sun-status-presentation.ts`
- `nextjs-app/app/api/venues/route.ts`, `nextjs-app/app/api/venues/[slug]/route.ts`
- `nextjs-app/components/custom/map/MapView.tsx`, `VenuePin.tsx`, `VenuePinLayer.tsx`
- `nextjs-app/components/custom/venue/VenueList.tsx`
- `nextjs-app/components/composed/venue/VenueCard.tsx`, `VenueQuickInfo.tsx`, and any detail/window label consumer proven active by source search
- `nextjs-app/messages/sv/map.json`, `nextjs-app/messages/en/map.json`, plus scoped venue keys changed by percentage-free grey copy

Likely evidence/config/docs files:

- Existing pin/list/card/MapView/API/weather/window tests plus focused Story 12.6 tests under `nextjs-app/test/`
- `nextjs-app/test/e2e/axe-mobile.spec.ts`, `nextjs-app/playwright.config.ts`, `.github/workflows/build-and-test-nextjs.yml`, `nextjs-app/test/unit/epic-11-standing-gate-ci-wiring.automate.test.ts`
- `nextjs-app/docs/design/DESIGN.md`, `project-context.md`, Claude reference mapping/capture docs or script where the stale map recipe is retired
- Candidate capture evidence from the implementing agent; the ten affected PNGs under `nextjs-app/docs/design/references/screens/{mobile,desktop}/` and `REBASELINE-LOG.md` only in the explicit maintainer/reference-update operation

This is a DTO/presentation change, not a database schema story. A Supabase migration or
generated database-type change is not expected.

### Out Of Scope

- Do not change the solar/shadow geometry algorithm, persisted geometry schema/hash,
  cloud/rain thresholds, raw 30%/70% diagnostic status classifier, or weather provider.
- Do not remove `CloudObscured`, alter feedback `predicted_state`, or change its DB CHECK.
- Do not implement Story 12.2 feedback evidence/aggregation, Story 12.8 About legend,
  Story 12.11 coach marks, Story 12.13 full confidence removal, or Story 12.14 opening-hours filtering.
- Do not add premium/payment behavior, a public Supabase read, a new screen ID, or a new
  dependency for predicate/presentation logic.
- Do not bless reference images as the implementing agent. Prepare deterministic
  captures and documentation for maintainer approval.

### Project Structure Notes

- Repository root is `C:\Users\Rasmus\sunnyseat`; the Next.js app root is
  `nextjs-app/`. Run all npm/npx app commands from `nextjs-app/`.
- Client components may import the new pure public-sun helper but must not import
  `lib/solar`, `lib/weather`, `lib/supabase`, `lib/middleware`, `lib/buildings`, or
  server service modules. Data still arrives through `app/api/*` and query hooks.
- Preserve `components/custom -> components/composed -> components/ui` dependency
  direction. Keep presentation resolution reusable; do not make composed cards import
  custom map components.
- Use Tailwind v4 theme utilities/project tokens only. No raw hex, arbitrary spacing,
  custom shadow, copied prototype CSS, or English hardcoded into Swedish UI.

### References

- [Source: `AGENTS.md` - Critical Rules, Accessibility, Performance, BMAD Story Workflow, Visual Validation]
- [Source: `project-context.md` - active Epic 12 invariants, reference-PNG convention, Screen ID -> Route Map]
- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 12.6, verbatim ACs and Design Gate]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - E12-AD-08 and Public DTO/API Delta]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR7, FR12, LR2, NFR28, NFR34]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - VenuePin, VenueQuickInfo, SunTimeline, Public Confidence Removal, motion/accessibility]
- [Source: `_bmad-output/test-artifacts/test-design/test-design-epic-12.md` - R-006, R-011, R-019, R-023 and Story 12.6 evidence]
- [Source: `nextjs-app/docs/design/DESIGN.md` - amber/neutral pin tokens and map-pin component patterns]
- [Source: `nextjs-app/docs/design/references/claude-design/README.md`, `STATE-MAPPING.md`, and active MVP `src/Pins.jsx` - stale visual implementation context only]
- [Source: `nextjs-app/docs/design/references/screens/{mobile,desktop}/map-primary.png` and `map-with-obscured-venue.png` - old references requiring rebaseline]
- [Source: `nextjs-app/docs/design/references/REBASELINE-LOG.md` - ten-reference map-visible trigger and maintainer blessing convention]
- [Source: `_bmad-output/implementation-artifacts/12-3-day-series-compute-at-real-venue-scale-kill-the-cold-start-freeze.md` - landed geometry/read-time weather contract]
- [Source: `_bmad-output/implementation-artifacts/12-7-reviews-route-resolves-live-venues-fix-the-404-on-real-venues.md` - landed canonical public visibility resolver]
- [Source: `_bmad-output/auto-bmad/retro-notes/epic-12.md` - a11y-mobile, local Playwright server, and visibility-schema carry-ins]

## Dev Agent Record

### Agent Model Used

Codex GPT-5

### Debug Log References

- 2026-07-18: Create-story baseline `cd nextjs-app && npx tsc --noEmit` passed.
- 2026-07-18: Create-story baseline `cd nextjs-app && npx eslint . --quiet` passed.
- 2026-07-18: Confirmed Story 12.3 persisted geometry/read-time weather code and Story 12.7 shared visible-only resolver are present in the current workspace; Story 12.7 migrated-database/live verification remains a separate deployment evidence lane.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- No implementation code, tests, reference images, capture recipes, or auto-bmad state were changed during story creation.

### File List

- `_bmad-output/implementation-artifacts/12-6-simplify-map-pins-one-grey-not-sunny-pin-no-number.md`
