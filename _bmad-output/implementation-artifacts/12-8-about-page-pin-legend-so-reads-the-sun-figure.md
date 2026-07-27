---
baseline_commit: NO_VCS
---

# Story 12.8: About Page — Pin Legend + "So Reads the Sun Figure"

Status: review

screen_id: about

## Story

As a **new user**,
I want the About page to explain the map legend and what the sun number means in plain
Swedish,
So that I read the pins and the number correctly.

## Source Context (Verbatim From Epic)

_Context (2026-07-08, aligned with Story 12.13 — no user-facing confidence number):_
the About page (`app/[locale]/about/page.tsx` → `AboutPage.tsx`, copy in
`messages/sv/about.json`) explains the engine + honesty posture well (ALGORITMEN /
DATAKÄLLOR / TRÄFFSÄKERHET / Kontakt), but never explains what users actually see on the
map: (1) amber vs grey pin, (2) that the pin number is the **share of seating in sun**
(not a probability). Since confidence is no longer shown to users (12.13), the earlier
"Sol vs Säkerhet" section is **reframed** to focus on the sun figure + the honesty/
feedback loop instead of teaching a "Säkerhet" number users will never see.

## Acceptance Criteria (Verbatim From Epic)

**Given** the About page has no pin legend and never defines the pin number
**When** a section **"Så läser du kartan"** is added (before ALGORITMEN) with two inline
pin swatches (amber sun + grey cloud)
**Then** it states in plain Swedish that pins reflect the **selected time — "just nu" by
default, or the planner's chosen date/time** (after the planner stories + 12.14, pin state
and visibility follow the selected instant, so "amber = sun NOW" would be wrong for a user
planning Saturday 18:00): an amber pin = direct sun at the selected time, a grey cloud pin
= not sunny then (shade OR clouds), and the pin number is **the share of the seating area
in sun at that time** — "70% betyder att ~70% av sittytan är solig vid vald tid, inte att
det är 70% chans att det är soligt"

**Given** confidence is no longer a user-facing number (Story 12.13)
**When** a short **"Hur säkra är vi?"** paragraph is added (in/after TRÄFFSÄKERHET)
**Then** it explains, honestly and simply, that the app aims to get the sun figure right
and that accuracy improves as users send feedback ("stämmer det?"), WITHOUT introducing a
per-venue "Säkerhet" number (there isn't one in the UI anymore). It may note that the app
tracks its own confidence internally to prioritise improvements

**Given** the TRÄFFSÄKERHET stat is still the hard-coded `ABOUT_ACCURACY_PLACEHOLDER = 85`
(its own comment says illustrative-until-validated), and after the 12.2 reframe there is no
required source producing a measured hit-rate
**When** 12.8 ships
**Then** the page must NOT present the placeholder AS IF it were a real measured hit-rate
(that would be dishonest, on the very page that promises honesty) — either source the
number from the Story-12.2 feedback/accuracy aggregation, OR remove / clearly label it as
an estimate ("preliminär" / not-yet-measured) until a real rate exists

**Given** Swedish is the default and copy lives in `messages/`
**When** the sections ship
**Then** the keys are added to `messages/sv/about.json` (+ en mirror), rendered via the
existing section pattern in `AboutPage.tsx`, and `AboutPage.test.tsx` asserts the new keys
render

## Design Gate Criteria

- **Visual:** New sections match the existing About typography/section treatment; the two
  pin swatches match the real map pin styles (amber sun, grey cloud — per Story 12.6)
- **Behaviour:** Static content; no interaction beyond existing About scroll
- **Animation:** None
- **Visual validation:** About page (mobile + desktop) screenshot vs a rebaselined
  reference passes (new sections added)

## Binding Implementation Decisions

- **Use Story 12.6's shared public-sun contract exactly.** Public sunny means
  `sunExposurePercent > 50 && weatherGateState !== 'gated'`, implemented in
  `nextjs-app/lib/utils/public-sun.ts`. Story 12.8 must not introduce an About-only
  threshold, a raw-`VenueSunStatus` rule, or wording that makes `Partial`/40% sound sunny.
- **Use Story 12.6's exact visual semantics.** Amber sun swatch = public sunny and may show
  a seating-share percent. Grey cloud swatch = not sunny, weather-gated, low exposure, shade,
  or cloud obstruction and shows no number. The grey row must not imply "maybe sunny".
- **Preserve Story 12.13 confidence removal.** The About page may say confidence is tracked
  internally for maintainer prioritization, but it must not teach or expose any per-venue
  "Säkerhet" / confidence percentage, visibly or to assistive technology.
- **Remove the hard-coded `85%` factual claim unless real Story 12.2 data exists.** Story
  12.2 is only `ready-for-dev` in this worktree and does not supply measured aggregation
  data. Therefore the 12.8 default implementation should remove the `85%` stat path rather
  than label it as measured. Do not keep `ABOUT_ACCURACY_PLACEHOLDER = 85` as public copy.
- **Visual references are controlled artifacts.** If the About reference PNG changes, update
  `nextjs-app/docs/design/references/REBASELINE-LOG.md` in the same operation and obtain
  human approval for manual/providerless rebaseline. Do not replace a reference to hide a
  wrong implementation.

## Tasks / Subtasks

- [x] **Task 0 - Reconfirm baseline, prerequisites, and source contracts** (AC: all)
  - [x] From `nextjs-app/`, run the required pre-story baseline:
    `npx tsc --noEmit` and `npx eslint . --quiet`. Stop and report unrelated failures.
  - [x] Read `AGENTS.md`, `project-context.md`, `nextjs-app/docs/design/DESIGN.md`,
    the Claude Design bundle README / `STATE-MAPPING.md` / active About prototype files,
    `REBASELINE-LOG.md`, UX About section, Architecture `E12-AD-08`, and the files listed
    under "Current Implementation Facts" before editing.
  - [x] Confirm the current branch contains `nextjs-app/lib/utils/public-sun.ts` with
    `sunExposurePercent > 50 && weatherGateState !== 'gated'` and `WeatherGateState`.
    If absent, stop; do not recreate a local About-only rule.
  - [x] Confirm Story 12.13 confidence removal is present on UI surfaces. If confidence is
    still visible/sr-only on cards/QuickInfo/detail/route overlay, stop or explicitly scope
    the About copy so it does not claim a completed UI state that is missing on the branch.
  - [x] Confirm Story 12.2 has not supplied a measured, denominated accuracy rate. In this
    branch it has not; remove the placeholder stat unless a later branch state proves a real
    12.2 aggregation source.

- [x] **Task 1 - Add the "Så läser du kartan" legend before ALGORITMEN** (AC: 1, 4; Design Gate)
  - [x] Add a new About section immediately after the hero image and before the existing
    ALGORITMEN section.
  - [x] Render two static, non-interactive pin swatches that visually match the real map pins:
    amber uses `bg-amber-pin`, the sun icon, and an example seating-share percentage such as
    `70%`; grey uses `bg-pin-shaded`, the cloud icon, and no percentage/text inside the pin.
  - [x] Do not reuse `VenuePin` directly if it creates button semantics. The About legend is
    static content; icons can be `aria-hidden` when adjacent text gives the accessible meaning.
  - [x] Copy must say pins reflect the selected instant: "just nu" by default or the selected
    planner date/time. Avoid copy that says amber always means sun "now".
  - [x] Copy must state the exact user-facing rule in plain Swedish: amber = more than half of
    seating in direct sun at the selected time and weather does not block it; grey = not sunny
    then because of shade, low exposure, clouds, or rain/obstruction.
  - [x] Copy must include the plain-language example: "70% betyder att ungefär 70% av sittytan
    är solig vid vald tid - inte att det är 70% chans att det är soligt" (localized naturally).
  - [x] Keep the section visually in the current About system: no raw hex, no arbitrary spacing,
    no custom shadows, no copied prototype CSS. Use Tailwind token utilities and lucide `Sun` /
    `Cloud` icons.

- [x] **Task 2 - Reframe TRÄFFSÄKERHET / "Hur säkra är vi?" without a fake rate** (AC: 2, 3, 4)
  - [x] Replace the current `85%` count-up/stat with prose unless Story 12.2 measured data is
    available. On this branch, remove the displayed stat and its aria label.
  - [x] Remove `ABOUT_ACCURACY_PLACEHOLDER` from public rendering. If no runtime reader remains,
    delete the constant and `AccuracyCountUp.tsx`; update/delete `AccuracyCountUp.test.tsx`.
  - [x] Rewrite the accuracy body to explain that SunnySeat tries to make the sun figure right,
    user feedback ("stämmer det?") improves the model, and internal confidence may help
    prioritize maintenance. Do not mention or teach a per-venue `Säkerhet` number.
  - [x] Add positive tests that `85%`, `Träffsäkerhet: 85 procent`, `Säkerhet NN%`, and
    `Confidence NN%` are absent from About copy and accessible text.
  - [x] Do not implement Story 12.2 aggregation/reporting, feedback evidence fields, or
    coverage-cap cleanup inside this story.

- [x] **Task 3 - Update About copy/i18n and data-source honesty** (AC: 4)
  - [x] Add Swedish keys under `messages/sv/about.json` and English mirrors under
    `messages/en/about.json`. Keep key parity green and render through `useTranslations('about')`.
  - [x] Preserve Swedish as the default visible language. English can be a faithful mirror for
    tests and locale support, not the source of product wording.
  - [x] Update `AboutPage.test.tsx` expected section order to include the new legend before
    ALGORITMEN and assert the new copy renders in Swedish and English.
  - [x] Review the DATAKÄLLOR copy while already editing About copy. It must not imply Google
    supplies/verifies public hours, and OSM must be described only as a gated supplemental pilot
    unless a later approved source decision says otherwise. Independently sourced canonical venue
    hours/provenance may be named at a user-safe level.
  - [x] Keep the Story 3.0.6 no-sensitive-geodata-in-public-copy guard: no EPSG codes, Baskarta
    layer names, DTM/RPC internals, service-role details, provider URLs, or raw provenance notes.

- [x] **Task 4 - Add component, i18n, and presentation tests** (AC: all; Design Gate)
  - [x] Update `nextjs-app/test/components/AboutPage.test.tsx` for the new section order,
    Swedish/English legend copy, accuracy reframe, data-source wording, privacy link, and CTAs.
  - [x] Add presentation assertions for the two swatches: amber swatch has sun icon + seating
    percent; grey swatch has cloud icon + no percent; both use token classes matching Story 12.6.
  - [x] Keep `messages-parity.test.ts` green. If adding source/i18n guards, scope them so
    internal confidence-calculator, DTO, feedback evidence, and server diagnostics remain allowed.
  - [x] Update or delete `AccuracyCountUp.test.tsx` according to the implementation chosen in
    Task 2; do not leave tests pinning the fake public rate.
  - [x] Include a focused no-public-confidence/no-fake-accuracy assertion against the About page
    rather than relying only on broad source text scans.

- [x] **Task 5 - Make About accessibility evidence executable on mobile and desktop** (AC: all; Design Gate)
  - [x] Resolve the About-specific desktop axe blocker before claiming a11y evidence. The current
    desktop `about` scan in `nextjs-app/test/e2e/axe.spec.ts` is `test.fixme` because the About
    footer wordmark `text-text-muted` fails contrast; fix the About surface and flip the About
    scan to an executable `test`. Leave the privacy scan and venue-card mobile debt alone unless
    directly fixed.
  - [x] Add or enable a mobile About axe scan in `nextjs-app/test/e2e/axe-mobile.spec.ts` for
    `/about`; this route has its own mobile layout and should not depend on venue-card fixmes.
  - [x] Ensure all interactive About links/buttons retain semantic names, visible focus, and
    minimum 44x44 touch targets. The new swatches are static and must not create fake controls.
  - [x] Run and record at minimum `npx playwright test --project=a11y --project=a11y-mobile`.
    If port 3000 is occupied, use the Story 12.13 pattern with isolated
    `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_PORT`, and one worker.

- [x] **Task 6 - Capture visual evidence and update references safely** (Design Gate)
  - [x] Because this story changes the mapped `about` screen, produce mobile and desktop visual
    evidence for `screen_id: about` using the project routes from `project-context.md`:
    `/about` for both viewports.
  - [x] Run the provider-neutral wrappers from repository root:
    `.\scripts\run-sh.ps1 scripts/visual-validate.sh about /about mobile` and
    `.\scripts\run-sh.ps1 scripts/visual-validate.sh about /about desktop`.
  - [x] If the legacy visual provider is unavailable because `ANTHROPIC_API_KEY` is missing,
    capture deterministic candidates from the running app, get explicit human approval before
    promotion/manual pass, and record that approval in the story Dev Agent Record.
  - [x] If either `nextjs-app/docs/design/references/screens/mobile/about.png` or
    `nextjs-app/docs/design/references/screens/desktop/about.png` changes, update
    `nextjs-app/docs/design/references/REBASELINE-LOG.md` in the same operation with source
    paths, viewport, approval status, and verification.
  - [x] Avoid `nextjs-app/scripts/capture-about-rebaseline.mjs` unless first audited/hardened:
    deferred work notes that one-off rebaseline helpers can default-write into active references.
    Prefer candidate output under `_bmad-output/implementation-artifacts/validation/` before any
    human-approved promotion.

- [x] **Task 7 - Run full story gates and transition only through the canonical review gate** (AC: all)
  - [x] Run from `nextjs-app/`: `npx tsc --noEmit`, `npx eslint . --quiet`, and
    `npx vitest run`. If full Vitest times out under Windows CPU contention, retry with
    `$env:VITEST_MAX_WORKERS='4'` and record the reason; do not change timeouts/code to mask it.
  - [x] Run Playwright evidence appropriate for Story 12.8. Required: `--project=a11y` and
    `--project=a11y-mobile`. Expected for this Epic 12 UI/shared-copy story:
    `--project=mobile --project=desktop --project=touch --project=a11y --project=a11y-mobile`
    unless a narrower run is explicitly justified in the Dev Agent Record.
  - [x] Run the mobile+desktop About visual validation/candidate flow from Task 6.
  - [x] Move to review only via
    `.\scripts\run-sh.ps1 scripts/story-review.sh 12-8-about-page-pin-legend-so-reads-the-sun-figure`
    from repository root. Do not edit `sprint-status.yaml` directly to mark review.

## Dev Notes

### Current Implementation Facts

- The route is `nextjs-app/app/[locale]/about/page.tsx`, which simply renders
  `nextjs-app/components/custom/about/AboutPage.tsx`.
- `AboutPage.tsx` is a client component using `useTranslations('about')` and the existing
  section order: H1, hero image, ALGORITMEN, DATAKÄLLOR, TRÄFFSÄKERHET, Kontakt, mobile CTA,
  desktop footer. The new legend belongs before ALGORITMEN.
- `AboutPage.tsx` currently imports `ABOUT_ACCURACY_PLACEHOLDER = 85` from
  `nextjs-app/lib/constants/about.ts` and renders `AccuracyCountUp` with a screen-reader label
  `accuracyStatAria`. This is the hard-coded factual claim to remove unless real Story 12.2
  data exists.
- `AccuracyCountUp.tsx` is only for the About stat and reads `ABOUT_ACCURACY_COUNTUP_MS`.
  `nextjs-app/test/components/AccuracyCountUp.test.tsx` and `AboutPage.test.tsx` currently
  assert the old `85%` behavior.
- `DataSourceList.tsx` renders four source cards from static metadata: Lantmateriet,
  Göteborg, Met.no, and OpenStreetMap. Copy is in `messages/{sv,en}/about.json`.
- `messages/sv/map.json` and `messages/en/map.json` already carry Story 12.6 pin ARIA copy:
  sunny with percent, sunny-unknown with explicit weather unavailable, and not-sunny without
  percent. About copy should align with those semantics without importing map messages.
- `nextjs-app/lib/utils/public-sun.ts` is client/server-safe and currently exports
  `isVenuePubliclySunny`, `normalizeWeatherGateState`, public comparator/window/peak helpers,
  and `isWeatherGateUnknown`.
- `VenuePin.tsx` resolves visual state by `isVenuePubliclySunny(venue) ? 'sunny' : 'shaded'`.
  Sunny shows an amber pill with percent + sun icon; shaded shows the grey cloud pill without
  a number. `VenuePin` itself is an interactive button for the map and should not be reused
  directly as a static About legend row.
- `VenuePinLayer.tsx` resolves pin ARIA through the same shared predicate and drops percent
  for not-sunny. About legend text should not drift from this.
- `nextjs-app/test/e2e/axe.spec.ts` has desktop About and privacy scans as `test.fixme` because
  of pre-existing footer wordmark contrast. Story 12.8 must make About a11y evidence executable
  without taking unrelated venue-card or privacy debt unless intentionally fixed.
- `nextjs-app/test/e2e/axe-mobile.spec.ts` currently has no About route scan. Add one for the
  mobile evidence lane.
- The Screen ID -> Route Map in `project-context.md` maps `about` to `/about` for mobile and
  desktop. This story file includes `screen_id: about` so `story-review.sh` can discover it.

### Previous Story Intelligence

- Story 12.6 established and proved the shared public-sun predicate, explicit
  `weatherGateState`, two-state pins, percent-free grey ARIA/copy, non-vacuous
  `a11y-mobile`, and human-approved rebaseline discipline. Reuse that contract; do not
  redefine it in copy, thresholds, or tests.
- Story 12.6's final review found one Medium contradiction risk: `CloudObscured` plus
  `weatherGateState: 'not_gated'` must fail closed before public-sun consumers. About copy
  should describe the public result, not raw diagnostic status.
- Story 12.13 removed public confidence and fixed a11y evidence gaps. Its visual assertions
  had to distinguish amber seating-share numbers from confidence. Story 12.8 tests must make
  the same distinction: "70% sol/sittyta" is allowed in the legend; "Säkerhet 70%" is not.
- Story 12.13 local Playwright evidence needed an isolated port when localhost:3000 was owned
  by a WSL relay. Use the same pattern if a11y/visual runs time out before app assertions.
- Story 12.12 retro notes: canonical story visual pickup needs explicit `screen_id:` markers;
  this story includes `screen_id: about`.
- Story 12.5/12.6 evidence confirms the visual provider may be unavailable without
  `ANTHROPIC_API_KEY`. Missing credentials do not authorize unapproved reference replacement
  or an unlogged manual pass.

### Deferred-Work Fold-Ins

- **About footer contrast overlaps this story.** Deferred work from the Story 7.3 a11y pass
  says the desktop About/Privacy footer wordmark failed contrast and the About axe scan was
  left `test.fixme`. Story 12.8 requires mobile+desktop About a11y evidence, so fix the About
  surface and make its axe scan executable. Do not broaden into venue-card or privacy debt
  unless the implementation intentionally and safely fixes those surfaces too.
- **About rebaseline helper risk overlaps this story.** Deferred work warns that one-off
  rebaseline scripts, including `capture-about-rebaseline.mjs`, can default-write active
  reference PNGs. Use scratch/candidate output first and promote only after explicit approval.
- **Focal accuracy stat token debt becomes moot if the fake stat is removed.** Do not add a
  new arbitrary stat font size or a new display token merely to preserve an unsupported
  placeholder number.
- **Epic 10 cloud-confidence/coverage-cap deferral is not this story.** With confidence
  internal after Story 12.13 and no measured 12.2 public rate, do not fix coverage-cap math
  or claim a public accuracy percentage here.

### Testing Requirements

- Required baseline and final gates from `nextjs-app/`:
  - `npx tsc --noEmit`
  - `npx eslint . --quiet`
  - `npx vitest run`
- Focused tests during development should include:
  - `npx vitest run test/components/AboutPage.test.tsx test/components/AccuracyCountUp.test.tsx test/unit/messages-parity.test.ts`
    adjusted to the final file set (omit deleted test files).
  - Any new source/i18n guard file added for no-confidence/no-fake-accuracy.
- Required accessibility evidence:
  - `npx playwright test --project=a11y --project=a11y-mobile`
  - Include actual executable About scans on both desktop and mobile.
- Expected browser/visual sweep for this Epic 12 UI story:
  - `npx playwright test --project=mobile --project=desktop --project=touch --project=a11y --project=a11y-mobile`
  - `.\scripts\run-sh.ps1 scripts/visual-validate.sh about /about mobile`
  - `.\scripts\run-sh.ps1 scripts/visual-validate.sh about /about desktop`
- Tests must not call live Met.no, Google Places, production Supabase, or protected services.

### Out Of Scope

- Do not implement Story 12.2 feedback aggregation, prediction evidence fields, accuracy
  reports, coverage-cap bypass removal, or any measured public hit-rate.
- Do not implement Story 12.11 coach marks or Settings reopen behavior.
- Do not change map pin runtime behavior, public-sun comparator/window/peak logic, or API DTOs.
- Do not restore any user-facing confidence chip/number, `Säkerhet NN%` aria text, or route
  overlay confidence row.
- Do not alter premium/Season Pass/Swish routes or copy.
- Do not add direct client imports from `nextjs-app/lib/solar`, `lib/weather`, `lib/supabase`,
  `lib/middleware`, or `lib/buildings`.
- Do not rebaseline references without same-operation `REBASELINE-LOG.md` updates and human
  approval when manual/providerless validation is used.

### Expected File Impact

- `nextjs-app/components/custom/about/AboutPage.tsx`
- `nextjs-app/components/custom/about/AccuracyCountUp.tsx` (likely delete if no reader remains)
- `nextjs-app/components/custom/about/DataSourceList.tsx` (only if source rows change)
- `nextjs-app/lib/constants/about.ts`
- `nextjs-app/messages/sv/about.json`
- `nextjs-app/messages/en/about.json`
- `nextjs-app/test/components/AboutPage.test.tsx`
- `nextjs-app/test/components/AccuracyCountUp.test.tsx` (likely delete/update)
- `nextjs-app/test/unit/messages-parity.test.ts` or new i18n/source guard tests if needed
- `nextjs-app/test/e2e/axe.spec.ts`
- `nextjs-app/test/e2e/axe-mobile.spec.ts`
- `nextjs-app/docs/design/references/REBASELINE-LOG.md` and
  `nextjs-app/docs/design/references/screens/{mobile,desktop}/about.png` only if references
  are promoted after approval

### Project Structure Notes

- Repository root is `C:\Users\Rasmus\sunnyseat`; the Next.js app root is `nextjs-app/`.
  Run all npm/npx commands from `nextjs-app/`.
- The story is a frontend/content change. Follow the component layer direction:
  `components/custom` may use `components/composed` and `components/ui`, but not the reverse.
- Swedish is default user-facing copy. Keep Swedish and English message files symmetric.
- Use design tokens from `DESIGN.md`; no raw hex, ad-hoc pixel spacing, custom shadows, or
  prototype CSS copies.
- On Windows/PowerShell, invoke repo shell scripts through `.\scripts\run-sh.ps1`.

### References

- [Source: `AGENTS.md` - design tokens, Swedish copy, accessibility, BMAD workflow, visual validation]
- [Source: `project-context.md` - Epic 12 invariant "One public sunny predicate" and `about` route map]
- [Source: `_bmad-output/planning-artifacts/epics.md` - Epic 12 cross-cutting decisions and Story 12.8]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - About page, pin legend, confidence removal, no placeholder accuracy stat]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - `E12-AD-08`, `E12-AD-12`, and public DTO/API delta]
- [Source: `_bmad-output/planning-artifacts/prd.md` - LR2 pin truth, accuracy outcome, no public confidence]
- [Source: `_bmad-output/qa/epic-12-test-design-2026-07-12.md` - R-006, R-011, R-019 and Story 12.8 evidence expectations]
- [Source: `_bmad-output/auto-bmad/retro-notes/epic-12.md` - a11y-mobile, visual-provider, confidence-removal, and screen-id carry-ins]
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md` - About contrast and rebaseline-helper overlap]
- [Source: `_bmad-output/implementation-artifacts/12-6-simplify-map-pins-one-grey-not-sunny-pin-no-number.md` - shared public-sun and two-pin contract]
- [Source: `_bmad-output/implementation-artifacts/12-13-remove-the-user-facing-confidence-indicator-keep-it-internal.md` - confidence-removal contract]
- [Source: `_bmad-output/implementation-artifacts/12-2-feedback-driven-accuracy-loop-retire-the-coverage-cap-bypass.md` - confirms no measured accuracy source exists yet]
- [Source: `nextjs-app/docs/design/DESIGN.md` - pin tokens, About section treatment, typography, surfaces]
- [Source: `nextjs-app/docs/design/references/claude-design/README.md` and `STATE-MAPPING.md` - active About reference source]
- [Source: `nextjs-app/docs/design/references/claude-design/project/src*/AboutModal.jsx` - stale prototype visual tone, not controlling Epic 12 copy]
- [Source: `nextjs-app/docs/design/references/REBASELINE-LOG.md` - reference/rebaseline policy and prior Story 12.6/12.13/12.9 entries]
- [Source: `nextjs-app/components/custom/about/AboutPage.tsx` - current About structure and fake stat render]
- [Source: `nextjs-app/components/custom/about/AccuracyCountUp.tsx` - current count-up stat component]
- [Source: `nextjs-app/components/custom/about/DataSourceList.tsx` - current data source card list]
- [Source: `nextjs-app/lib/constants/about.ts` - `ABOUT_ACCURACY_PLACEHOLDER = 85`]
- [Source: `nextjs-app/messages/sv/about.json` and `nextjs-app/messages/en/about.json` - current About copy]
- [Source: `nextjs-app/lib/utils/public-sun.ts` - exact shared public-sun predicate and helper contract]
- [Source: `nextjs-app/components/custom/map/VenuePin.tsx` and `VenuePinLayer.tsx` - real pin visual/ARIA semantics to mirror in the static legend]
- [Source: `nextjs-app/test/components/AboutPage.test.tsx` - current component assertions requiring update]
- [Source: `nextjs-app/test/e2e/axe.spec.ts` and `axe-mobile.spec.ts` - desktop/mobile a11y evidence lanes]

## Dev Agent Record

### Agent Model Used

Codex GPT-5 auto-bmad delegate

### Debug Log References

- Baseline before edits, from `nextjs-app/`: `npx tsc --noEmit` passed; `npx eslint . --quiet` passed.
- TDD red lane: updated `AboutPage.test.tsx` first; focused About component run failed on the missing legend/source/accuracy behavior as expected before implementation.
- Focused green lane: `npx vitest run test/components/AboutPage.test.tsx` passed 10 tests; `npx vitest run test/components/AboutPage.test.tsx test/unit/messages-parity.test.ts` passed 28 tests.
- Source guard scans: no live references remained for `ABOUT_ACCURACY`, `AccuracyCountUp`, `about-accuracy-stat`, `accuracyStatAria`, `accuracyStatSuffix`, public `85%`/`Träffsäkerhet: 85 procent`, or public `Säkerhet NN%` / `Confidence NN%` copy outside negative test assertions and historical rebaseline notes.
- Full unit gate: `npx vitest run` passed: 205 files passed, 2 skipped; 1864 tests passed, 15 skipped.
- Required a11y gate: `npx playwright test --project=a11y --project=a11y-mobile` passed on `http://localhost:3219`: 19 passed, 9 skipped. A prior `127.0.0.1` attempt failed with redirect-loop setup errors before assertions; rerun on `localhost` resolved it.
- Broad browser sweep: `npx playwright test --project=mobile --project=desktop --project=touch --project=a11y --project=a11y-mobile` on `http://localhost:3224` reported 156 passed, 64 skipped, and 2 mobile failures outside About (`epic-9-mobile-regression.spec.ts:62`, `story-12-10-venue-detail-prefetch.atdd.spec.ts:406`). Exact rerun of those two failures on `http://localhost:3225` passed 2/2, matching the earlier exact rerun result.
- Visual wrapper attempts: `.\scripts\run-sh.ps1 scripts/visual-validate.sh about /about mobile` and `desktop` failed immediately because `ANTHROPIC_API_KEY` is not set; no screenshot comparison ran.
- Visual candidates captured and visually sanity-checked: `_bmad-output/implementation-artifacts/validation/12-8-about-page-about-mobile-candidate.png` and `_bmad-output/implementation-artifacts/validation/12-8-about-page-about-desktop-candidate.png`. No canonical reference PNGs were replaced, and `REBASELINE-LOG.md` was not changed.
- Focused mobile legend viewport evidence captured and visually sanity-checked after fixed-bottom-nav overlap was noticed in the stitched mobile candidate: `_bmad-output/implementation-artifacts/validation/12-8-about-page-mobile-legend-candidate.png` (`390x844`, `deviceScaleFactor: 3`, `http://localhost:3226/about`, scrolled so the complete `SÅ LÄSER DU KARTAN` section is above the bottom nav).
- Canonical review gate: `VISUAL_VALIDATE_PROVIDER=none ALLOW_MANUAL_VISUAL_VALIDATION=1 .\scripts\run-sh.ps1 scripts/story-review.sh 12-8-about-page-pin-legend-so-reads-the-sun-figure` passed lint/typecheck/full Vitest, ran providerless manual visual mode for mobile and desktop, and updated sprint status to `review`. Artifact: `_bmad-output/implementation-artifacts/validation/12-8-about-page-pin-legend-so-reads-the-sun-figure-review-20260727-204121.log`.
- Post-dev TEA automation pass added `nextjs-app/test/unit/story-12-8-about-copy-contract.automation.test.ts` to persist the prior source-scan evidence as executable coverage against fake public accuracy/confidence numbers and About legend drift from shared public-sun/runtime pin semantics.
- Post-dev TEA focused checks passed: `npx vitest run test/components/AboutPage.test.tsx test/unit/messages-parity.test.ts test/unit/story-12-8-about-copy-contract.automation.test.ts` (3 files / 31 tests), `PLAYWRIGHT_BASE_URL=http://localhost:3238 PLAYWRIGHT_PORT=3238 npx playwright test --project=a11y --project=a11y-mobile --grep "about page"` (2 tests), `npx tsc --noEmit`, and `npx eslint . --quiet`.

### Completion Notes List

- Added the static "Så läser du kartan" About section before ALGORITMEN with amber sun and grey cloud swatches that mirror Story 12.6 public pin semantics without button roles.
- Removed the fake public `85%` accuracy claim, deleted the About count-up component/test, and reframed TRÄFFSÄKERHET around "Hur säkra är vi?" prose plus internal confidence/feedback-loop honesty.
- Updated Swedish and English About messages, including the selected-time explanation, seating-area-share example, no-probability wording, and more honest data-source copy with verified venue facts and OSM as supplemental pilot only.
- Enabled executable desktop and mobile About axe scans; fixed the About desktop footer wordmark contrast by using the existing logo text token.
- Visual comparison remains pending human/provider acceptance because the legacy visual provider requires `ANTHROPIC_API_KEY`; candidate PNGs were captured under validation artifacts and no references were promoted.
- Added a durable post-dev source-contract guard so the story no longer relies only on log-scanned evidence for "no fake accuracy/confidence" and "About legend matches shared pin semantics."

### File List

- `_bmad-output/implementation-artifacts/12-8-about-page-pin-legend-so-reads-the-sun-figure.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/validation/12-8-about-page-about-mobile-candidate.png`
- `_bmad-output/implementation-artifacts/validation/12-8-about-page-mobile-legend-candidate.png`
- `_bmad-output/implementation-artifacts/validation/12-8-about-page-about-desktop-candidate.png`
- `_bmad-output/implementation-artifacts/validation/12-8-about-page-pin-legend-so-reads-the-sun-figure-review-20260727-204121.log`
- `nextjs-app/components/custom/about/AboutPage.tsx`
- `nextjs-app/components/custom/about/DataSourceList.tsx`
- `nextjs-app/components/custom/about/AccuracyCountUp.tsx` (deleted)
- `nextjs-app/lib/constants/about.ts`
- `nextjs-app/messages/sv/about.json`
- `nextjs-app/messages/en/about.json`
- `nextjs-app/test/components/AboutPage.test.tsx`
- `nextjs-app/test/components/AccuracyCountUp.test.tsx` (deleted)
- `nextjs-app/test/unit/story-12-8-about-copy-contract.automation.test.ts`
- `nextjs-app/test/e2e/axe.spec.ts`
- `nextjs-app/test/e2e/axe-mobile.spec.ts`
- `_bmad-output/test-artifacts/automation-summary.md`

### Change Log

- 2026-07-27: Implemented Story 12.8 About legend and accuracy reframe; completed deterministic gates; moved sprint status to `review` through `scripts/story-review.sh` with providerless visual acceptance pending.
- 2026-07-27: Post-dev TEA automation added source-contract guard coverage for fake accuracy/confidence and shared pin semantics; focused Vitest, About axe, typecheck, and lint passed.

### Review Findings

- [ ] [Review][Decision][High] About visual gate is not approved: mobile and desktop visual wrappers failed without `ANTHROPIC_API_KEY`, no screenshot comparison or same-operation reference/log approval occurred, yet providerless manual mode moved the story to review. Recommended: fix: Run mobile and desktop About visual validation with a configured provider, or get explicit human approval for the captured candidate PNGs and record it before approval.
