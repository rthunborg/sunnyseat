# Story 2.5: Free Time & Date Planner

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **MVP scope correction (2026-05-19):** Planner, future date simulation, and time scrubbing are free MVP functionality. Do not reintroduce Season Pass, Swish, paywall, premium context, lock badges, or premium copy into active planner/date runtime paths.
>
> **Visual source refresh (2026-05-21):** Active MVP references were regenerated from `SunnySeat MVP Mobile Unlocked.html` and `SunnySeat MVP Desktop Unlocked.html`. Where older task text conflicts with these refreshed references, the visual reference supersedes the stale task text for visual composition. Post-MVP Unlocked/Locked pages remain future-only.

## Story

As a **user**,
I want to scrub through time and select a future date for sun predictions,
So that I can plan when to visit a venue for optimal sun exposure without a paywall.

## Acceptance Criteria

**Given** the planner is visible on the map screen
**When** it renders on mobile
**Then** a TimeSliderPanel appears as a floating glass panel: `color-glass-slider` (rgba(255,255,255,0.9)), `blur-heavy` (12px), `radius-panel` (32px), `shadow-card-up`
**And** contains a time scrubber track (`size-slider-track-h` 6px, `color-surface-slider-track`, `radius-pill`) with a thumb (`size-slider-thumb` 14.1px, `color-amber-dark` background, 2.35px white border)
**And** the current time is displayed in `text-time` styling
**And** the selected date is visible as an interactive date control

**Given** the planner renders on desktop
**When** the layout is desktop (>= 1024px)
**Then** the planner is integrated into the bottom bar spanning full width
**And** includes selected date on the left and selected time on the right

**Given** the user drags the slider thumb for today
**When** the thumb moves to a new time position
**Then** all venue pins on the map update their sun state (amber/grey) to reflect the selected time
**And** VenueQuickInfo and venue list cards update their sun data to match
**And** the thumb snaps to tick marks on release with spring easing (`easing-spring`, 200ms)

**Given** the time slider tick marks are displayed
**When** the slider renders
**Then** tick labels show at key time intervals in `text-label-xs-medium` / `color-text-muted`
**And** the active/current tick uses `color-amber-dark`

**Given** the user opens the date picker
**When** they select any future date within the current sun season
**Then** no premium gate, lock badge, Season Pass prompt, or payment UI appears
**And** all venue pins update to show predicted sun exposure states for the selected date
**And** the time slider allows scrubbing through the selected future date's hours

**Given** the user scrubs time on a selected future date
**When** the slider moves to a new time position
**Then** venue pins, VenueQuickInfo, venue list cards, and venue detail all update to reflect the predicted sun states for that date+time combination

**Given** future date predictions include weather confidence
**When** confidence scores are displayed
**Then** they reflect weather forecast uncertainty for the future date
**And** the same staleness/tilde rules apply from Story 2.6

**Given** the user returns to today's date
**When** "Idag" or the current date is selected
**Then** the map reverts to real-time sun states with auto-refresh
**And** the time slider returns to the current time position

**Given** the user releases the slider at a new time
**When** the map data needs to update
**Then** venue sun states are fetched for the selected date/time via the existing sun exposure API
**And** if the response is slow, current pin states remain visible (no loading spinner on the map)

**Given** all planner UI uses i18n keys
**When** the locale is Swedish or English
**Then** date formatting follows 24-hour Swedish convention and month/day names are localised

**Given** Story 2.5 is ready for review
**When** the implementation is scanned for active monetization dependencies
**Then** planner/date code paths do not import or call `PremiumContext`, `usePremiumStatus`, `queryKeys.premium`, `/api/payments/*`, Swish helpers, paywall components, lock-badge components, Season Pass copy, or premium JSON messages
**And** any reusable Future Monetization snippets discovered during implementation are moved out of live runtime paths and preserved in the Future Monetization archive instead of being left as unused app code

**Given** `prefers-reduced-motion` is enabled
**When** the slider thumb snaps on release
**Then** the snap is instant (no spring animation)

**Design Gate Criteria:**
- **Behaviour:** All interactions and states defined in UX spec §TimeSliderPanel are implemented
- **Animation:** Thumb snap, calendar open/close, pin update, and panel entrance animations match spec timings (±50 ms tolerance)
- **Visual validation:** Parent screen gates must pass against the refreshed MVP references for `map-primary`, `map-with-selected-venue`, `map-panel-venues`, and `venue-detail` where the planner/date chrome is visible. Do not accept visual drift as "future Story 2.5 debt" now that Story 2.5 owns the planner.

## Tasks / Subtasks

- [x] **Task 1: Baseline and source-context check** (AC: all)
  - [x] 1.1 Run `cd nextjs-app && npx tsc --noEmit` before editing. Stop and surface any errors outside story scope.
  - [x] 1.2 Run `cd nextjs-app && npx eslint . --quiet` before editing. Stop and surface any errors outside story scope.
  - [x] 1.3 Read `AGENTS.md`, `project-context.md`, `nextjs-app/docs/design/DESIGN.md`, `nextjs-app/docs/design/references/claude-design/README.md`, and UX spec sections for Journey 3, `TimeSliderPanel`, `map-primary`, `map-with-selected-venue`, `map-panel-venues`, and `venue-detail`.
  - [x] 1.4 Read prototype sources for visual intent only: originally `src-free/TopPanel.jsx`, `src-free/DatePicker.jsx`, `src-desktop/TimeScrubber.jsx`, plus the relevant `App.jsx` call sites. After the 2026-05-21 refresh, re-read MVP sources under `project/src/` and `project/src-desktop/` from the two MVP Unlocked pages. Do not copy DOM structure, inline CSS values, premium tags, lock states, Swish copy, or old gated-favourites behaviour into production.

- [x] **Task 2: Make TimeContext deterministic and feature-complete** (AC: #3, #5, #6, #8, #10, #11)
  - [x] 2.1 Replace `TimeProvider`'s current `useState(() => new Date())` initializer with a hydration-safe approach before any component consumes `currentTime`. Acceptable options: a server-provided ISO prop or a client-only effect that initializes after mount while rendering a deterministic fallback.
  - [x] 2.2 Extend the context value to represent selected date, selected time, mode (`today` vs future date), snapped slider position, and reset-to-now behaviour.
  - [x] 2.3 Keep TimeContext client-derived only. Do not put API response data, venue DTOs, weather, or confidence data into Context; those stay in TanStack Query.
  - [x] 2.4 Add pure date/time helpers under `lib/services/` or `lib/utils/` for Europe/Stockholm date normalization, current sun-season bounds, tick generation, snap rounding, URL-safe ISO/date/time values, and "Idag" detection.
  - [x] 2.5 Add unit coverage proving no SSR/CSR mismatch, today's date resets to current time, future date preserves the selected time, out-of-season dates are rejected/disabled, and tick snapping is deterministic.

- [x] **Task 3: Add the API/query boundary for selected date+time sun states** (AC: #3, #5, #6, #7, #8, #9)
  - [x] 3.1 Audit the current runtime gap: there is no `nextjs-app/app/api/sun-exposure/*` route today even though architecture references sun-exposure endpoints. Add the minimal Next.js API route(s) needed so clients fetch date/time predictions through `app/api/*`, never by importing `lib/solar`, `lib/weather`, `lib/supabase`, `lib/middleware`, or `lib/buildings`.
  - [x] 3.2 Prefer a query shape that updates all map/list/QuickInfo surfaces without an N+1 client fetch. If extending `/api/venues` with optional `date` and `time` params is chosen, keep the response shape compatible with `VenueDataDto`. If adding `/api/sun-exposure/*`, wrap it in a query hook and merge results at the custom orchestration layer.
  - [x] 3.3 Validate `date` and `time` with Zod or existing validation utilities: Swedish/Gothenburg timezone semantics, 24-hour time, no malformed dates, no control chars, and future dates limited to the current sun season.
  - [x] 3.4 Add/extend `queryKeys` for planner state. Include normalized date/time params from the central key factory only; no inline query-key arrays in components or tests.
  - [x] 3.5 Add a TanStack Query wrapper such as `useSunExposureFuture` or extend `useVenueSearch` deliberately. Preserve abort-signal forwarding and use TanStack Query v5 `placeholderData: keepPreviousData` or an equivalent identity placeholder so existing pins/cards remain visible while a new date/time fetch is in flight.
  - [x] 3.6 Preserve real-time auto-refresh for today's current-time mode. Future selected date/time mode should not silently poll as if it were live-now unless a deliberate stale-time/refetch policy is documented in the hook.
  - [x] 3.7 Add API and query tests for date/time validation, key normalization, slow-response placeholder behaviour, abort propagation, and weather-confidence/staleness metadata when available.

- [x] **Task 4: Build reusable planner controls with project tokens** (AC: #1, #2, #4, #10, #11)
  - [x] 4.1 Add composed controls under `components/composed/time/`: `TimeSlider`, `DatePicker` or `DatePickerDialog`, and any small date navigation control. Keep them reusable and prop-driven.
  - [x] 4.2 Add `components/custom/time/TimeSliderPanel.tsx` as the feature orchestrator that consumes `useTimeContext`, composes the time controls, and exposes mobile/desktop layout variants.
  - [x] 4.3 Mobile panel uses token utilities only: `bg-glass-slider`, `backdrop-blur-[var(--blur-heavy)]` or a token utility, `rounded-panel`, `shadow-card-up`, slider track `h-slider-track-h`/`bg-surface-slider-track`/`rounded-pill`, thumb sized from `size-slider-thumb`, `bg-amber-dark`, and white border. If a needed utility is missing, add it through `@theme`/`@utility` in `globals.css` rather than raw values in components.
  - [x] 4.4 Desktop renders as a full-width bottom bar overlay, not inside the 84px desktop navbar. It includes date controls on the left, the scrubber through the center, and the selected time on the right.
  - [x] 4.5 Use lucide icons (`Calendar`, `ChevronLeft`, `ChevronRight`) for date controls. Every button must have a Swedish/English accessible name and at least a 44x44px touch target.
  - [x] 4.6 The date picker opens/closes with token-backed Motion timing. Reduced motion uses instant/opacity-only behaviour; no transform spring when `useReducedMotion()` returns true.
  - [x] 4.7 Remove any copied premium visual elements from the prototype: no `Säsongskortet` pill, sparkle premium label, lock icon, locked forecast banner, paywall trigger, or Swish/payment CTA.

- [x] **Task 5: Wire planner state through map, list, QuickInfo, and detail** (AC: #3, #5, #6, #8, #9)
  - [x] 5.1 Render the mobile `TimeSliderPanel` in `MapView` below QuickInfo and above the bottom nav/peek sheet, preserving the existing Story 2.1 QuickInfo spacing contract and Story 2.2 venue-list peek/full behaviour.
  - [x] 5.2 Render the desktop planner bottom bar while keeping the refreshed 340px left venue panel, 390px detail panel, search navbar, map controls, and MapLibre canvas layered correctly.
  - [x] 5.3 Feed selected date/time into the chosen venue/sun query path. Map pins must update `currentSunStatus` and `sunExposurePercent`, and `VenuePinLayer` must receive changed fingerprints without remounting `MapContainer`.
  - [x] 5.4 Update `VenueList`, `VenueQuickInfo`, and `VenueDetailOverlay` to display selected-date/time sun data consistently. Avoid duplicating API data into local component state.
  - [x] 5.5 Replace `currentTimeLabel()` in venue detail orchestration with the selected planner time where appropriate. Today's "current time" marker and future selected time marker must both use Europe/Stockholm 24-hour formatting.
  - [x] 5.6 Slow date/time fetches keep the previous pin/card state visible. Do not show a full-map spinner or clear pins while a new time selection is loading.
  - [x] 5.7 Returning to "Idag" resets the planner to current time and restores the current real-time venue query/auto-refresh path.

- [x] **Task 6: i18n, accessibility, and no-premium quarantine** (AC: #5, #10, #11)
  - [x] 6.1 Add scoped planner keys in `messages/sv/*` and `messages/en/*` for date button labels, previous/next day, calendar open/close, selected date, selected time, tick labels if needed, today/reset copy, unavailable/out-of-season dates, loading/error status, and screen-reader descriptions.
  - [x] 6.2 Swedish is default. Use Swedish month/day names and 24-hour time; no hardcoded English user-facing copy.
  - [x] 6.3 Slider is keyboard operable (`ArrowLeft/Right`, `Home`, `End` where appropriate), exposes an accessible name/value, and has visible focus.
  - [x] 6.4 Date picker traps focus only while modal/open if it uses a modal pattern; Escape and outside-click dismissal must be covered without keyboard traps.
  - [x] 6.5 Add a planner runtime scan before review: `rg -n "PremiumContext|usePremiumStatus|queryKeys\\.premium|/api/payments|Swish|swish|paywall|premium gate|lock badge|Season Pass|Säsongskortet" nextjs-app/app nextjs-app/components nextjs-app/hooks nextjs-app/lib nextjs-app/messages`. Remove active-runtime hits or document them as inactive Future Monetization references only.

- [x] **Task 7: Regenerated-reference reconciliation** (AC: all)
  - [x] 7.1 Refresh active MVP references from the 2026-05-21 Claude Design split, using only `SunnySeat MVP Mobile Unlocked.html` and `SunnySeat MVP Desktop Unlocked.html`; log the rebaseline in `REBASELINE-LOG.md`.
  - [x] 7.2 Re-read the refreshed `map-primary`, `map-with-selected-venue`, `map-panel-venues`, and `venue-detail` PNGs plus MVP source files and classify every mismatch as implementation defect, stale story text, future story scope, obsolete reference, or Post-MVP-only.
  - [x] 7.3 Treat the mobile planner placement in old Task 5.1 as stale where it conflicts with refreshed references. Mobile planner/date chrome should render as top overlay chrome on map screens unless a new explicit product decision supersedes the reference.
  - [x] 7.4 Bring `map-with-selected-venue` toward the refreshed MVP composition: top planner overlay, selected venue map callout anchored to the pin, bottom venue sheet/list visible, Swedish copy, no premium/paywall/lock chrome, and selected-date/time data sync.
  - [x] 7.5 Bring `map-panel-venues` toward the refreshed MVP composition: top planner overlay, warm/sand map treatment, bottom sheet list with filter chips and free favourite affordances where in scope, and no overlap with map controls/bottom nav.
  - [x] 7.6 Bring `venue-detail` mobile/desktop toward refreshed MVP composition where Story 2.5 owns it: selected date/time sync, desktop planner bottom bar, previous-data behaviour while planner params change, and no payment/Season Pass runtime.
  - [x] 7.7 Keep future-story mismatches out of Story 2.5 unless the refreshed reference makes them necessary for planner composition: confidence/percentage final formatting (Story 2.6), free favourites persistence (Story 2.7), tags/attributes (Story 3.2), ratings/reviews/price (Story 3.3), `SOL NU` partner badges (Story 5.2), and share action chrome (Story 6.4).

- [x] **Task 8: Tests, visual validation, and review gate** (AC: all)
  - [x] 8.1 Add component tests for `TimeSlider`, date picker, and `TimeSliderPanel`: render, keyboard adjustment, pointer drag/snap, tick labels, active tick, today reset, future date selection, reduced motion, accessible names, and no premium copy.
  - [x] 8.2 Extend `MapView.test.tsx` for planner query params, slow-response previous-data behaviour, selected venue/list/detail data updates, full-sheet spacing, and today's auto-refresh restoration.
  - [x] 8.3 Add API/query tests for the selected date/time route or `/api/venues` extension, including malformed date/time, out-of-season date, and future weather-confidence metadata.
  - [x] 8.4 Extend Playwright coverage because this story changes core map chrome, pointer/keyboard slider interaction, responsive layering, and selected venue/detail surfaces.
  - [x] 8.5 Run `cd nextjs-app && npx tsc --noEmit`.
  - [x] 8.6 Run `cd nextjs-app && npx eslint . --quiet`.
  - [x] 8.7 Run `cd nextjs-app && npx vitest run`.
  - [x] 8.8 Run `cd nextjs-app && npx playwright test`.
  - [x] 8.9 Run `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-primary "/?_time=14:00" mobile` and `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-primary "/?_time=16:30" desktop` after visual correction.
  - [x] 8.10 Run `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-with-selected-venue "/?venue=test-venue-sunny&_state=map-with-selected-venue&_time=14:00" mobile` against the refreshed MVP reference. Do not carry forward the previous "reference-scope drift" acceptance without reclassification.
  - [x] 8.11 Run `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-panel-venues "/?_state=map-panel-venues&_time=14:00" mobile` against the refreshed MVP reference.
  - [x] 8.12 Run `.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail&_time=14:00" mobile`.
  - [x] 8.13 Run `.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail&_time=16:30" desktop`.
  - [x] 8.14 Run the MVP monetization quarantine scan from Task 6.5.
  - [x] 8.15 Before changing sprint status to `review`, run `.\scripts\run-sh.ps1 scripts/story-review.sh 2-5-free-time-date-planner`. Do not directly edit sprint status to `review`.

### Review Findings

- [x] [Review][Patch] Future-date predictions are not actually date- or weather-driven [nextjs-app/lib/services/venue-planner.ts:63]
- [x] [Review][Patch] Planner chrome hides the selected date and reverses the desktop date/time layout [nextjs-app/components/custom/time/TimeSliderPanel.tsx:51]
- [x] [Review][Patch] Past in-season dates are accepted as future planner inputs [nextjs-app/lib/utils/time-planner.ts:99]
- [x] [Review][Patch] Live times outside 06:00-21:00 can create out-of-range slider/API state [nextjs-app/lib/contexts/TimeContext.tsx:229]
- [x] [Review][Patch] Venue detail can show stale placeholder data across slug or planner transitions [nextjs-app/components/custom/map/MapView.tsx:216]
- [x] [Review][Patch] Full and mid mobile bottom-sheet states render at the same height [nextjs-app/app/globals.css:164]
- [x] [Review][Patch] Venue thumbnails are ignored even when fixture/API URLs exist [nextjs-app/components/composed/venue/VenueCard.tsx:220]
- [x] [Review][Patch] Enabled favourite/share/settings controls have no behavior [nextjs-app/components/custom/venue/VenueDetailOverlay.tsx:102]
- [x] [Review][Patch] `_time=14:00` forces all map pins sunny outside explicit visual states [nextjs-app/components/custom/map/MapView.tsx:190]
- [x] [Review][Patch] Calendar button accessible name omits the selected date [nextjs-app/components/custom/time/TimeSliderPanel.tsx:136]

#### Round 2 follow-up review (2026-05-26)

- [x] [Review][Decision] Story 2.6 is transitioned to review inside the Story 2.5 diff - resolved by Rasmus: keep it because Story 2.6 was intentionally moved to review separately. [`_bmad-output/implementation-artifacts/sprint-status.yaml:78`]
- [x] [Review][Decision] `map-panel-venues` forced state conflicts with the canonical route-map contract - resolved by Rasmus: keep the partial list/mid snap because it matches the desired starting state, and update the canonical route-map note. [`nextjs-app/components/custom/map/MapView.tsx:255`]
- [x] [Review][Decision] Live after-hours planner state displays a clamped slider time while querying live conditions - resolved by Rasmus: query the clamped planner boundary (`06:00`/`21:00`) so UI and API match outside planner hours. [`nextjs-app/lib/contexts/TimeContext.tsx:186`]
- [x] [Review][Patch] Anchored mobile QuickInfo title target is below 44 px [nextjs-app/components/composed/venue/VenueQuickInfo.tsx:150]
- [x] [Review][Patch] Mobile TimeSliderPanel uses `shadow-card` instead of required `shadow-card-up` [nextjs-app/components/custom/time/TimeSliderPanel.tsx:44]
- [x] [Review][Patch] Desktop planner is constrained to map-panel remainder instead of spanning the bottom bar [nextjs-app/components/custom/map/MapView.tsx:388]
- [x] [Review][Patch] Negative seasonal sun-window expansion can collapse short venue windows [nextjs-app/lib/services/venue-planner.ts:149]
- [x] [Review][Patch] `--color-surface-slider-track` does not match the canonical DESIGN.md token [nextjs-app/app/globals.css:24]
- [x] [Review][Patch] After-hours today mode must send the clamped planner query instead of live-now data [nextjs-app/lib/contexts/TimeContext.tsx:186]

#### Round 3 final automatic review (2026-05-26)

- [x] [Review][Patch] [High] Projected sun windows do not propagate to displayed ranges/timelines [nextjs-app/lib/services/venue-planner.ts:100]
- [x] [Review][Patch] [Medium] Geometry-only weather requests are projected before the unavailable-weather override is applied [nextjs-app/app/api/venues/route.ts:278]
- [x] [Review][Patch] [Medium] Projection regression tests use past planner dates that UI/API validation now rejects [nextjs-app/test/unit/venue-planner.test.ts:30]
- [x] [Review][Patch] [Medium] Planner-updated venue surfaces still hardcode Swedish sun copy outside i18n [nextjs-app/components/custom/map/MapView.tsx:523]
- [x] [Review][Patch] [Medium] Future-story controls remain enabled with no behavior and compact favourite targets are below 44 px [nextjs-app/components/composed/venue/VenueCard.tsx:193]
- [x] [Review][Patch] [Low] Visual correction introduced arbitrary size utilities instead of design tokens [nextjs-app/components/composed/venue/VenueCard.tsx:99]
- [x] [Review][Patch] [Low] Venue thumbnail images have no load-failure fallback [nextjs-app/components/composed/venue/VenueCard.tsx:249]
- [x] [Review][Patch] [Low] Non-anchored QuickInfo renders a leading metadata separator before confidence [nextjs-app/components/composed/venue/VenueQuickInfo.tsx:178]
- [x] [Review][Patch] [Low] Forced selected-venue visual state normalizes pins/list but not QuickInfo data [nextjs-app/components/custom/map/MapView.tsx:465]

#### Round 4 override review (2026-05-26)

- [x] [Review][Patch] [High] Missing current `map-primary` visual-gate evidence [nextjs-app/docs/design/references/screens/mobile/map-primary.png]
- [x] [Review][Patch] [Medium] Mobile venue detail ignores projected sun windows [nextjs-app/components/composed/venue/VenueDetailContent.tsx:197]
- [x] [Review][Patch] [Medium] Weather-dampened exposure can still classify as `Sunny` [nextjs-app/lib/services/venue-planner.ts:98]
- [x] [Review][Patch] [Medium] Desktop tick labels use `text-text-body` instead of `text-text-muted` [nextjs-app/components/composed/time/TimeSlider.tsx:120]
- [x] [Review][Patch] [Medium] Venue card sun copy bypasses i18n [nextjs-app/components/composed/venue/VenueCard.tsx:86]
- [x] [Review][Patch] [Medium] Future-story `SOL NU` badge remains active in venue detail [nextjs-app/components/composed/venue/VenueDetailContent.tsx:114]
- [x] [Review][Patch] [Low] API planner tests are date-time-bombed by fixed June 2026 dates [nextjs-app/test/unit/api/venues-route.test.ts:234]
- [x] [Review][Patch] [Low] Past in-season dates are announced as outside-season dates [nextjs-app/components/composed/time/DatePickerDialog.tsx:131]
- [x] [Review][Patch] [Low] Thumbnail error fallback can miss fast failed images [nextjs-app/components/composed/venue/VenueCard.tsx:260]

#### Final readiness rereview (2026-05-27)

- [x] [Review][Patch] [High] Bare mobile `?_time=14:00` still forced visual-reference venue data outside explicit `_state` [nextjs-app/components/custom/map/MapView.tsx:103]
- [x] [Review][Patch] [Medium] Mobile venue detail best-window copy was hard-coded instead of using the projected timeline window [nextjs-app/components/composed/venue/VenueDetailContent.tsx:177]

## Dev Notes

### Current Implementation Surface

- `nextjs-app/lib/contexts/TimeContext.tsx` exists but is only a Story 1.3 stub: `{ currentTime, setCurrentTime }` with `useState(() => new Date())`. This is the deferred hydration-risk item targeted at Story 2.5.
- `nextjs-app/components/custom/layout/AppContextProviders.tsx` already mounts `TimeProvider` inside `GeolocationProvider > MapInstanceProvider > MapSelectionProvider`. Recent commit `aecd6af` removed `PremiumContext`; do not add it back for planner work.
- `nextjs-app/app/api/venues/route.ts` is still fixture-backed and currently accepts `lat`, `lng`, optional `radiusKm`, and optional `q`; it does not accept date/time.
- `nextjs-app/app/api/venues/[slug]/route.ts` provides fixture-backed venue detail and timeline data for today's static fixture state; it does not accept selected date/time.
- There is currently no `nextjs-app/app/api/sun-exposure/*` route and no `hooks/queries/useSunExposureFuture.ts`. The backend solar/weather services exist under `lib/solar` and `lib/weather`, but client components must not import them directly.
- `nextjs-app/hooks/queries/useVenueSearch.ts` wraps `/api/venues`, forwards TanStack's `signal`, has 5-minute stale time, disables window-focus refetch, and normalizes `q`. It is the main route feeding pins/list.
- `nextjs-app/lib/query-keys.ts` has `queryKeys.sun.exposure(venueId, time?)`, but no date-aware or all-venue future key yet.
- `nextjs-app/components/custom/map/MapView.tsx` owns venue search, venue list, selected venue QuickInfo, detail overlay orchestration, and the visual-validation forced states. Story 2.5 will likely touch this file.
- `VenuePinLayer` fingerprints `id|name|sunStatus|sunExposurePercent|lat|lng`, so changing sun state/percent through DTO updates should update markers without remounting the map.
- `MapView` currently passes `currentTimeLabel()` into `VenueDetailOverlay`; Story 2.5 must wire selected planner time instead of static helper output.
- Story 2.4 added `VenueSearchShell`, `VenueSearchCombobox`, `VenueListControls`, desktop search, mobile top chrome, and explicit sort/filter controls. Preserve these and keep them non-overlapping with the planner panel.

### Data and API Guardrails

- Client components must not import from `nextjs-app/lib/solar`, `nextjs-app/lib/weather`, `nextjs-app/lib/supabase`, `nextjs-app/lib/middleware`, `nextjs-app/lib/buildings`, or fixture services. All data access flows through `app/api/*` routes and hooks under `hooks/queries/`.
- API responses should continue to use `VenueDataDto` fields (`currentSunStatus`, `confidence`, `sunExposurePercent`, `sunWindow`) so existing pins/list/QuickInfo/detail components can update without duplicate data models.
- If future weather confidence cannot be fully finalized until Story 2.6, preserve the API field shape and document placeholder/fixture limitations clearly; do not fake certainty. AC #7 requires future confidence semantics to align with Story 2.6's staleness/tilde rules once that story lands.
- Preserve today's real-time path. When selected date is today/current time, the app should use the existing live/current query semantics and 5-minute auto-refresh. Future date/time planning is an explicit selected-state query, not a premium gate.
- URL state already supports `?venue=[slug]`; architecture references `?t=14:30`. Story 2.5 may add URL sync for selected time/date if needed, but avoid page reloads and use locale-aware navigation wrappers from `i18n/navigation`.

### Design and Behaviour Requirements

- Binding tokens include `color-glass-slider`, `blur-heavy`, `radius-panel`, `shadow-card-up`, `size-slider-track-h`, `color-surface-slider-track`, `size-slider-thumb`, `color-amber-dark`, `color-white`, `text-time`, `text-date`, `text-label-xs-medium`, `color-text-muted`, `duration-fast`, `duration-default`, and `ease-spring`.
- The refreshed MVP prototypes in `project/src/` and `project/src-desktop/` are the active visual source for planner/date composition. Older `src-free`/Post-MVP sources are no longer active MVP references.
- Mobile layering target after the 2026-05-21 refresh: planner/date chrome appears as top overlay chrome on map states, selected venue uses a map-anchored callout, the venue list remains in a bottom sheet, map controls stay reachable, and no payment/Season Pass/lock affordance appears.
- Desktop layering target: fixed top navbar remains 84px, left venue list follows the refreshed 340px MVP reference, right detail panel remains 390px, and the planner bottom bar spans the map viewport without shrinking the canvas.
- Reduced motion: Motion docs support `useReducedMotion`; in this codebase import from `motion/react`. When reduced motion is true, slider snap is instant and panel/date picker transitions avoid transform/spring motion.

### Previous Story Intelligence

- Story 2.1 accepted selected-venue visual drift because global time/date chrome was future scope. After the 2026-05-21 visual refresh, that rationale must be reclassified: Story 2.5 owns planner/date chrome, and the refreshed reference may supersede the older QuickInfo bottom-card composition for selected map state.
- Story 2.2 accepted venue-list visual drift because time/date chrome was future scope. After the 2026-05-21 visual refresh, Story 2.5 owns planner/date chrome and must re-evaluate bottom-sheet/list composition against the current MVP reference.
- Story 2.3 established venue detail overlays, `useVenueDetail`, `SunTimeline`, `VenueDetailOverlay`, and desktop detail coexistence with the left list panel. Story 2.5 must synchronize selected time/date with detail data and timeline marker.
- Story 2.4 established search, list controls, and accepted that remaining `map-with-selected-venue`, `map-panel-venues`, and desktop `venue-detail` visual failures were downstream time/date chrome. That acceptance cannot be reused blindly after the 2026-05-21 reference refresh; this story must classify and fix or explicitly retarget each mismatch.
- Commit `aecd6af chore(epic-2): align MVP monetization scope` removed `PremiumContext`, `queryKeys.premium`, premium messages, and payment types from active runtime. Story 2.5 must not recreate those dependencies.

### Deferred Work Carried Into This Story

- `TimeProvider` initial `new Date()` hydration mismatch risk from Story 1.3 review.
- Story 2.1/2.2/2.3/2.4 visual acceptances that referenced missing time/date chrome are now carried into Task 7 as refreshed-reference reconciliation. Do not treat them as future debt without a fresh classification.
- Refreshed MVP references no longer make lock badges/paywalls/Season Pass part of MVP planner/favourites states. Any old lock-badge visual debt is obsolete for MVP and should not be implemented.
- Refreshed MVP references still show warm/sand map treatment, top planner chrome, map-anchored selected venue callout, bottom venue sheet/list composition, and desktop planner/detail coexistence; these are active design-intent candidates for Story 2.5 correction unless explicitly retargeted.

### Latest Technical Notes

- Current package versions in `nextjs-app/package.json`: Next.js 16.2.2, React 19.2.5, TanStack Query 5.99.0, Motion 12.38.0, `@use-gesture/react` 10.3.1, MapLibre GL 5.23.0, next-intl 4.9.1, date-fns-tz 3.2.0, cmdk 1.1.1, Tailwind CSS 4.2.2.
- Context7 `/tanstack/query`: React Query v5 replaced `keepPreviousData` option with `placeholderData: keepPreviousData` or an identity function. Use this for date/time query-key changes so previous pins/cards remain visible during fetches.
- Context7 `/marnusw/date-fns-tz`: `formatInTimeZone(date, 'Europe/Stockholm', format, { locale })` formats a date in the target timezone regardless of system timezone. Use this or `Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', hour12: false })` consistently for planner labels.
- Context7 `/websites/motion_dev_react`: `useReducedMotion()` returns a boolean and should replace transform/spring animations with opacity-only or instant state changes for reduced-motion users. Use the codebase's `motion/react` import style.

### File Impact

Likely files to modify:

- `nextjs-app/lib/contexts/TimeContext.tsx`
- `nextjs-app/lib/query-keys.ts`
- `nextjs-app/lib/types/api.ts`
- `nextjs-app/lib/services/time-planner.ts` or `nextjs-app/lib/utils/time-planner.ts` (new)
- `nextjs-app/app/api/venues/route.ts` and/or new `nextjs-app/app/api/sun-exposure/**/route.ts`
- `nextjs-app/hooks/queries/useVenueSearch.ts`
- `nextjs-app/hooks/queries/useSunExposureFuture.ts` or equivalent (new)
- `nextjs-app/components/composed/time/TimeSlider.tsx` (new)
- `nextjs-app/components/composed/time/DatePicker.tsx` or `DatePickerDialog.tsx` (new)
- `nextjs-app/components/custom/time/TimeSliderPanel.tsx` (new)
- `nextjs-app/components/custom/map/MapView.tsx`
- `nextjs-app/components/custom/venue/VenueList.tsx`
- `nextjs-app/components/composed/venue/VenueQuickInfo.tsx`
- `nextjs-app/components/custom/venue/VenueDetailOverlay.tsx`
- `nextjs-app/components/composed/venue/VenueDetailContent.tsx`
- `nextjs-app/components/composed/venue/SunTimeline.tsx`
- `nextjs-app/app/globals.css` only for missing token utilities, not raw component styling
- `nextjs-app/messages/sv/venue.json`, `nextjs-app/messages/en/venue.json`, or new scoped planner message files if the project pattern supports them
- `nextjs-app/test/components/MapView.test.tsx`
- `nextjs-app/test/components/TimeSlider.test.tsx` (new)
- `nextjs-app/test/components/TimeSliderPanel.test.tsx` (new)
- `nextjs-app/test/unit/query-keys.test.ts`
- `nextjs-app/test/unit/queries/useVenueSearch.test.ts`
- `nextjs-app/test/unit/api/venues-route.test.ts` and/or new sun-exposure route tests
- `nextjs-app/test/unit/time-planner.test.ts` (new)
- `nextjs-app/test/e2e/map-primary.spec.ts`
- `nextjs-app/test/e2e/planner.spec.ts` (new or future-ready)

Avoid unless explicitly required:

- `nextjs-app/lib/solar/**` implementation internals
- `nextjs-app/lib/weather/**` implementation internals
- `nextjs-app/lib/supabase/**`
- `nextjs-app/lib/buildings/**`
- Reintroducing `nextjs-app/lib/contexts/PremiumContext.tsx`
- Reintroducing `queryKeys.premium`, `usePremiumStatus`, `/api/payments/*`, `payment.ts`, `premium.json`, paywall components, or Swish helpers in active runtime
- Reference PNGs or `REBASELINE-LOG.md` unless visual validation proves a legitimate rebaseline is needed and Rasmus approves.

### References

- `AGENTS.md` - repo rules: design tokens, visual source of truth, API boundary, component architecture, Swedish copy, accessibility, testing/story workflow, Windows script wrappers.
- `project-context.md` - durable context and Screen ID -> Route Map for `map-primary`, `map-with-selected-venue`, `map-panel-venues`, and `venue-detail`.
- `_bmad-output/planning-artifacts/epics.md` - Epic 2 and Story 2.5 source ACs/design gate/deferred items.
- `_bmad-output/planning-artifacts/prd.md` - PRD v3.1, Sara journey, FR9-FR12, NFR8/NFR22-NFR28, MVP scope correction.
- `_bmad-output/planning-artifacts/architecture.md` - free planner/date state, API boundary, TimeContext, TanStack Query, query keys, component layers, performance budget, dormant monetization relocation.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Journey 3, `TimeSliderPanel`, map-primary mobile/desktop, map-with-selected-venue, overlay behaviour, loading/error patterns, future monetization inactive note.
- `nextjs-app/docs/design/DESIGN.md` - binding time slider panel tokens, type scale, z-index, motion, responsive rules.
- `nextjs-app/docs/design/references/claude-design/README.md` - prototype reading discipline.
- `nextjs-app/docs/design/references/claude-design/project/SunnySeat MVP Mobile Unlocked.html` and `project/src/*` - active MVP mobile visual source.
- `nextjs-app/docs/design/references/claude-design/project/SunnySeat MVP Desktop Unlocked.html` and `project/src-desktop/*` - active MVP desktop visual source.
- `nextjs-app/docs/design/references/claude-design/STATE-MAPPING.md` - current recipe/source mapping and MVP/Post-MVP split.
- `_bmad-output/implementation-artifacts/2-4-venue-search.md` - previous story implementation notes, visual acceptance, review findings, file list, and downstream obligations.
- `_bmad-output/implementation-artifacts/deferred-work.md` - Story 2.5 queue entries carried into this story.
- `Context7 /tanstack/query` - React Query v5 placeholderData/keepPreviousData guidance.
- `Context7 /marnusw/date-fns-tz` - timezone formatting guidance.
- `Context7 /websites/motion_dev_react` - reduced-motion guidance.

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- Baseline before story drafting: `cd nextjs-app && npx tsc --noEmit` passed.
- Baseline before story drafting: `cd nextjs-app && npx eslint . --quiet` passed.
- Dev baseline before implementation: `cd nextjs-app && npx tsc --noEmit` passed.
- Dev baseline before implementation: `cd nextjs-app && npx eslint . --quiet` passed.
- Task 1 source context read: `AGENTS.md`, `project-context.md`, `nextjs-app/docs/design/DESIGN.md`, Claude Design README/prototype sources, and relevant UX spec sections.
- Task 2 red tests: `npx vitest run test/unit/time-planner.test.ts` failed on missing helper module; `npx vitest run test/unit/TimeContext.test.tsx` failed against the Story 1.3 stub.
- Task 2 focused tests after implementation: `npx vitest run test/unit/time-planner.test.ts` passed; `npx vitest run test/unit/TimeContext.test.tsx` passed.
- Task 2 regression: `npx vitest run` passed (31 files, 213 tests).
- Task 3 red tests: query key, `useVenueSearch`, `/api/venues`, and `/api/venues/[slug]` planner tests failed against the pre-planner runtime.
- Task 3 focused tests after implementation: `npx vitest run test/unit/query-keys.test.ts`, `test/unit/queries/useVenueSearch.test.ts`, `test/unit/api/venues-route.test.ts`, and `test/unit/api/venue-detail-route.test.ts` passed.
- Task 3 regression: `npx vitest run` passed (31 files, 221 tests); `npx tsc --noEmit` passed.
- Task 4 red tests: `TimeSlider`, `DatePickerDialog`, and `TimeSliderPanel` component tests failed on missing components.
- Task 4 focused tests after implementation: `npx vitest run test/components/TimeSlider.test.tsx`, `test/components/DatePickerDialog.test.tsx`, and `test/components/TimeSliderPanel.test.tsx` passed.
- Task 4 regression: `npx vitest run` passed (34 files, 229 tests); `npx tsc --noEmit` passed; `npx eslint . --quiet` passed.
- Task 5 red tests: `npx vitest run test/components/MapView.test.tsx` failed before planner UI/query wiring was added to `MapView`.
- Task 5 focused tests after implementation: `npx vitest run test/components/MapView.test.tsx` passed (29 tests).
- Task 5 regression: `npx vitest run` passed (34 files, 231 tests); `npx tsc --noEmit` passed; `npx eslint . --quiet` passed.
- Task 6 focused tests after i18n adjustment: `npx vitest run test/components/DatePickerDialog.test.tsx test/components/TimeSliderPanel.test.tsx` passed.
- Task 6 monetization quarantine scan: `rg -n "PremiumContext|usePremiumStatus|queryKeys\\.premium|/api/payments|Swish|swish|paywall|premium gate|lock badge|Season Pass|Säsongskortet" nextjs-app/app nextjs-app/components nextjs-app/hooks nextjs-app/lib nextjs-app/messages` returned no active runtime hits.
- Task 7/8 targeted Playwright: mobile selected-venue planner, future-date API params, expanded venue panel planner, desktop venue-detail planner, pin selection, pin morph, and canvas deselect targeted checks passed after layering/test updates.
- Task 8 final checks: `npx tsc --noEmit` passed; `npx eslint . --quiet` passed; `npx vitest run` passed (34 files, 233 tests); `npx playwright test` passed (39 passed, 26 skipped).
- Task 8 visual validation before refresh: `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-with-selected-venue "/?venue=test-venue-sunny&_state=map-with-selected-venue" mobile` failed. Output cited missing top-overlay time slider, missing bottom sheet list view, missing tooltip-style map callout, and map warm/sand tint mismatch. After the 2026-05-21 reference refresh, do not treat this as accepted reference-scope drift; Task 7 must reclassify and correct before review.
- Visual source refresh: regenerated 13 active MVP PNGs from the two MVP Unlocked prototypes and logged the rebaseline in `nextjs-app/docs/design/references/REBASELINE-LOG.md` on 2026-05-21.
- Functional correction after visual refresh: live `Idag` clock tick, 5-minute live venue search/detail polling, explicit planner non-polling, and venue-detail previous-data behaviour were added. Focused tests passed: `npx vitest run test/unit/TimeContext.test.tsx test/unit/queries/useVenueSearch.test.ts test/unit/queries/useVenueDetail.test.ts` (3 files, 30 tests).
- Refresh verification after correction: `npx tsc --noEmit` passed; `npx eslint . --quiet` passed; `npx vitest run` passed (34 files, 239 tests); `npx playwright test` passed (39 passed, 26 skipped). Automated visual validation was initially blocked until `ANTHROPIC_API_KEY` was persisted.
- Visual composition correction after refreshed MVP references: mobile planner moved to top chrome, mobile sheet now supports `peek`/`mid`/`full` with mid as default, selected mobile QuickInfo is a pin-anchored callout, the map tint is warmer, and mobile bottom nav now matches the MVP `Nära mig`/`Favoriter` reference. Focused checks passed: `npx tsc --noEmit`, `npx eslint . --quiet`, and `npx vitest run test/components/TimeSlider.test.tsx test/components/TimeSliderPanel.test.tsx test/components/MobileNavBar.test.tsx test/components/MapView.test.tsx` (4 files, 41 tests).
- Final refreshed visual gate matrix with `VISUAL_VALIDATE_PROVIDER=anthropic` passed: `map-primary` mobile `/?_time=14:00`, `map-primary` desktop `/?_time=16:30`, `map-with-selected-venue` mobile `/?venue=test-venue-sunny&_state=map-with-selected-venue&_time=14:00`, `map-panel-venues` mobile `/?_state=map-panel-venues&_time=14:00`, `venue-detail` mobile `/?venue=test-venue-sunny&_state=venue-detail&_time=14:00`, and `venue-detail` desktop `/?venue=test-venue-sunny&_state=venue-detail&_time=16:30`.
- Final verification after visual fixes: `npx tsc --noEmit` passed; `npx eslint . --quiet` passed; `npx vitest run` passed (34 files, 241 tests); `npx playwright test` passed (39 passed, 26 skipped); monetization quarantine scan returned no active runtime hits.
- Review-gate correction: the canonical `story-review.sh` preflight initially exposed a `map-panel-venues` visual instability. Fixed the zero-height top-panel slider track, aligned mobile filter-chip icons, raised MapLibre marker wrappers above the warm map overlay, tightened sunny pin composition, and normalized forced visual-reference map pins for `_state=map-panel-venues` / `_state=map-with-selected-venue` without changing unforced runtime data. Focused check passed: `npx vitest run test/components/MapView.test.tsx test/components/TimeSlider.test.tsx test/components/VenueList.test.tsx test/components/VenuePin.test.tsx test/components/VenuePinLayer.test.tsx` (5 files, 54 tests), then `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-panel-venues "/?_state=map-panel-venues&_time=14:00" mobile` passed.
- Canonical review gate passed: `.\scripts\run-sh.ps1 scripts/story-review.sh 2-5-free-time-date-planner` with `VISUAL_VALIDATE_PROVIDER=anthropic` ran lint, typecheck, `npx vitest run` (34 files, 242 tests), visual validation for `map-panel-venues`, `map-with-selected-venue`, and `venue-detail` mobile/desktop, then transitioned sprint status to `review`. Artifact: `_bmad-output/implementation-artifacts/validation/2-5-free-time-date-planner-review-20260522-103716.log`.
- 2026-05-26 review-finding red tests: focused Vitest coverage failed before implementation across planner date/weather projection, planner chrome, past-date rejection, live-time clamping, venue-detail placeholder reuse, bottom-sheet snap sizing, thumbnails, and inert chrome controls.
- 2026-05-26 review-finding focused green: `node ./node_modules/vitest/vitest.mjs run test/unit/time-planner.test.ts test/unit/venue-planner.test.ts test/unit/TimeContext.test.tsx test/components/TimeSliderPanel.test.tsx test/unit/queries/useVenueDetail.test.ts test/components/MobileBottomSheet.test.tsx test/components/VenueCard.test.tsx test/components/VenueDetailOverlay.test.tsx test/components/MapControls.test.tsx` passed (9 files, 64 tests).
- 2026-05-26 deterministic verification: `node ./node_modules/typescript/bin/tsc --noEmit` passed; `node ./node_modules/eslint/bin/eslint.js . --quiet` passed; `node ./node_modules/vitest/vitest.mjs run` passed (36 files, 272 tests); the Task 6.5 monetization quarantine scan returned no active runtime hits.
- 2026-05-26 visual-gate correction: the first canonical gate attempt was blocked by local visual-parser tooling, the second exposed `map-panel-venues` reference drift after full-sheet/thumbnail fixes, and the final direct visual check for `map-panel-venues` passed after restoring reference-safe forced-state list chrome.
- 2026-05-26 canonical review gate passed: `.\scripts\run-sh.ps1 scripts/story-review.sh 2-5-free-time-date-planner` with `VISUAL_VALIDATE_PROVIDER=anthropic` ran lint, typecheck, `npx vitest run` (36 files, 272 tests), visual validation for `map-panel-venues`, `map-with-selected-venue`, and `venue-detail` mobile/desktop, then transitioned sprint status to `review`. Artifact: `_bmad-output/implementation-artifacts/validation/2-5-free-time-date-planner-review-20260526-120829.log`.
- 2026-05-26 E2E verification: `node ./node_modules/@playwright/test/cli.js test --workers=1` passed (39 passed, 26 skipped) after updating mobile forced-sheet specs to start at the visual-reference `mid` snap and explicitly expand to `full`; post-E2E `tsc --noEmit` and `eslint . --quiet` passed.
- 2026-05-26 Round 2 follow-up red tests: focused Vitest coverage failed before implementation for anchored QuickInfo target size, mobile planner shadow token, full-width desktop planner placement, seasonal short-window collapse, and after-hours planner query semantics.
- 2026-05-26 Round 2 follow-up focused green: `node ./node_modules/vitest/vitest.mjs run test/components/VenueQuickInfo.test.tsx test/components/TimeSliderPanel.test.tsx test/components/MapView.test.tsx test/unit/venue-planner.test.ts test/unit/TimeContext.test.tsx` passed (5 files, 59 tests).
- 2026-05-26 Round 2 static/unit verification: `node ./node_modules/typescript/bin/tsc --noEmit` passed; `node ./node_modules/eslint/bin/eslint.js . --quiet` passed; `node ./node_modules/vitest/vitest.mjs run` passed (36 files, 277 tests); the Task 6.5 monetization quarantine scan returned no active runtime hits.
- 2026-05-26 Round 2 E2E verification: initial `node ./node_modules/@playwright/test/cli.js test --workers=1` exposed a desktop planner assertion mismatch and axe contrast failures on desktop tick labels; after correction, the targeted rerun passed and the full command passed (39 passed, 26 skipped).
- 2026-05-26 canonical review gate retry: `powershell -ExecutionPolicy Bypass -File .\scripts\run-sh.ps1 scripts/story-review.sh 2-5-free-time-date-planner` required `C:\Program Files\nodejs` on PATH, then ran lint, typecheck, and `npm run test` successfully (36 files, 277 tests) but halted at `map-panel-venues` visual validation because Git Bash could not find `jq`, so the script could not parse Anthropic's JSON response. Artifact: `_bmad-output/implementation-artifacts/validation/2-5-free-time-date-planner-review-20260526-163446.log`.
- 2026-05-26 visual provider diagnostic: a text-only Anthropic API probe returned HTTP 200 for `claude-sonnet-4-6`, confirming the key/model/provider were reachable. Re-running `scripts/visual-validate.sh map-panel-venues "/?_state=map-panel-venues&_time=14:00" mobile` with a temporary `%TEMP%` `jq` parser shim passed.
- 2026-05-26 canonical review gate passed with the temporary parser shim: `scripts/story-review.sh 2-5-free-time-date-planner` ran lint, typecheck, `npm run test` (36 files, 277 tests), visual validation for `map-panel-venues`, `map-with-selected-venue`, and `venue-detail` mobile/desktop, then transitioned sprint status to `review`. Artifact: `_bmad-output/implementation-artifacts/validation/2-5-free-time-date-planner-review-20260526-164648.log`.
- 2026-05-26 Round 3 red tests: focused Vitest coverage failed before implementation for projected sun-window propagation, geometry-only projection ordering, future-safe seasonal fixtures, localized QuickInfo sun ranges, disabled compact favourite controls, tokenized VenueCard sizing, thumbnail load-failure fallback, non-anchored QuickInfo separators, and forced visual QuickInfo normalization.
- 2026-05-26 Round 3 focused green: `node ./node_modules/vitest/vitest.mjs run test/unit/venue-planner.test.ts test/unit/api/venues-route.test.ts test/unit/api/venue-detail-route.test.ts test/components/VenueCard.test.tsx test/components/VenueQuickInfo.test.tsx test/components/MapView.test.tsx` passed (6 files, 88 tests).
- 2026-05-26 Round 3 deterministic verification: `node ./node_modules/typescript/bin/tsc --noEmit` passed; `node ./node_modules/eslint/bin/eslint.js . --quiet` passed; `node ./node_modules/vitest/vitest.mjs run` passed (36 files, 284 tests); the Task 6.5 monetization quarantine scan returned no active runtime hits.
- 2026-05-26 Round 3 E2E verification: initial `node ./node_modules/@playwright/test/cli.js test --workers=1` had one onboarding-state race in the first mobile map smoke; focused rerun passed, then the full command passed (39 passed, 26 skipped).
- 2026-05-26 canonical review gate passed with `VISUAL_VALIDATE_PROVIDER=anthropic`: `scripts/story-review.sh 2-5-free-time-date-planner` ran lint, typecheck, `npm run test` (36 files, 284 tests), visual validation for `map-panel-venues`, `map-with-selected-venue`, and `venue-detail` mobile/desktop, then transitioned sprint status to `review`. Artifact: `_bmad-output/implementation-artifacts/validation/2-5-free-time-date-planner-review-20260526-190624.log`.
- 2026-05-27 Round 4 red tests: focused Vitest coverage failed before implementation for past-date calendar labels, desktop slider label contrast, localized venue-card sun copy, fast thumbnail fallback, projected venue-detail mobile timelines, future `SOL NU` badge quarantine, and weather-dampened sun status.
- 2026-05-27 Round 4 focused green: `node ./node_modules/vitest/vitest.mjs run test/unit/venue-planner.test.ts test/components/TimeSlider.test.tsx test/components/VenueCard.test.tsx test/components/DatePickerDialog.test.tsx test/components/VenueDetailContent.test.tsx test/unit/api/venues-route.test.ts` passed (6 files, 52 tests). Additional focused checks passed for `TimeSliderPanel`, `MapView`, and `VenueDetailContent` regressions.
- 2026-05-27 Round 4 deterministic verification: `node ./node_modules/typescript/bin/tsc --noEmit` passed; `node ./node_modules/eslint/bin/eslint.js . --quiet` passed; `node ./node_modules/vitest/vitest.mjs run` passed (36 files, 289 tests); the Task 6.5 monetization quarantine scan returned no active runtime hits.
- 2026-05-27 Round 4 E2E verification: Playwright project shards passed with `node ./node_modules/@playwright/test/cli.js test --project=mobile --workers=1` (22 passed, 9 skipped), `--project=desktop --workers=1` (14 passed, 17 skipped), and `--project=a11y --workers=1` (3 passed). The unsharded command timed out before useful output in this Windows session, so shard results are the recorded evidence.
- 2026-05-27 canonical review gate passed with `VISUAL_VALIDATE_PROVIDER=anthropic`: `scripts/story-review.sh 2-5-free-time-date-planner` ran lint, typecheck, `npm run test` (36 files, 289 tests), visual validation for `map-panel-venues`, `map-primary` mobile/desktop, `map-with-selected-venue`, and `venue-detail` mobile/desktop, then transitioned sprint status to `review`. Artifact: `_bmad-output/implementation-artifacts/validation/2-5-free-time-date-planner-review-20260527-075144.log`.
- 2026-05-27 final rereview focused green: `node ./node_modules/vitest/vitest.mjs run test/components/MapView.test.tsx test/components/VenueDetailContent.test.tsx` passed (2 files, 43 tests) after adding regressions for bare mobile `?_time=14:00` preserving real pin/list data, explicit `_state=map-primary` visual normalization, and projected best-window detail copy.
- 2026-05-27 final rereview deterministic verification: `node ./node_modules/typescript/bin/tsc --noEmit` passed; `node ./node_modules/eslint/bin/eslint.js . --quiet` passed; `node ./node_modules/vitest/vitest.mjs run` passed (36 files, 290 tests); the Task 6.5 monetization quarantine scan returned no active runtime hits.
- 2026-05-27 final rereview visual diagnostics: canonical gate attempt `_bmad-output/implementation-artifacts/validation/2-5-free-time-date-planner-review-20260527-081759.log` exposed that bare `?_time=14:00` no longer matched the reference after removing runtime data normalization; `_bmad-output/implementation-artifacts/validation/2-5-free-time-date-planner-review-20260527-082034.log` then exposed the missing `bestWindow` next-intl placeholders. Both were fixed before completion.
- 2026-05-27 final canonical review gate passed with `VISUAL_VALIDATE_PROVIDER=anthropic`: `scripts/story-review.sh 2-5-free-time-date-planner` ran lint, typecheck, `npm run test` (36 files, 290 tests), visual validation for `map-panel-venues`, `map-primary` mobile/desktop, `map-with-selected-venue`, and `venue-detail` mobile/desktop. Artifact: `_bmad-output/implementation-artifacts/validation/2-5-free-time-date-planner-review-20260527-082227.log`.
- 2026-05-27 final E2E verification after the rereview fixes: Playwright project shards passed with `node ./node_modules/@playwright/test/cli.js test --project=mobile --workers=1` (22 passed, 9 skipped), `--project=desktop --workers=1` (14 passed, 17 skipped), and `--project=a11y --workers=1` (3 passed).

### Completion Notes List

- Story drafted by SM (Bob) on 2026-05-20.
- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story preserves Story 2.5 ACs verbatim from `epics.md`.
- Story explicitly carries all current Story 2.5 deferred-work queue entries.
- Story flags the current runtime gap: no `app/api/sun-exposure/*` route exists yet, so implementation must add/choose an API boundary before client planner wiring.
- Story includes explicit MVP monetization quarantine requirements after the 2026-05-19 scope correction.
- Task 1 complete: baseline checks were clean and frontend/planner visual context was loaded before implementation.
- Task 2 complete: `TimeProvider` now uses a deterministic ISO seed, exposes selected date/time/mode/live query state, and pure Stockholm planner helpers cover sun-season bounds, snapping, URL-safe values, and today reset behaviour.
- Task 3 complete: `/api/venues` and `/api/venues/[slug]` now accept optional `date`/`time` planner params, validate Gothenburg sun-season semantics, adjust fixture-backed sun state/confidence through the API boundary, and `useVenueSearch` keeps previous venue data visible across planner query changes.
- Task 4 complete: reusable `TimeSlider`, `DatePickerDialog`, and `TimeSliderPanel` controls use design-token utilities, Swedish i18n, 44px controls, lucide date icons, reduced-motion handling, and no active premium/payment copy or affordances.
- Task 5 complete: `MapView` renders mobile and desktop planner chrome, feeds selected planner params into venue search/detail hooks, keeps `MapContainer` stable while pin/list/detail data changes, and passes the selected Stockholm-formatted time into venue detail timeline orchestration.
- Task 6 complete: planner strings are scoped in Swedish/English message files, date picker weekdays now derive from locale instead of Swedish literals, keyboard/focus behaviours are covered by component tests, and the active-runtime monetization scan is clean.
- 2026-05-21 refresh complete: active MVP Claude Design references were regenerated from the two MVP Unlocked pages, planning/story docs now record the MVP/Post-MVP split, and `_bmad-output/implementation-artifacts/visual-source-refresh-audit-2026-05-21.md` captures the completed-story/future-story drift audit.
- Functional gap closure complete: live `Idag` mode now advances and polls, explicit planner mode avoids polling, and venue detail keeps previous data while new planner params fetch.
- Visual composition correction implemented against the refreshed MVP references: top mobile planner/date chrome, mid/default venue sheet, selected-venue map callout, warm map tint, two-tab MVP bottom nav, desktop header-owned location/settings controls, 340px desktop venue list, and mobile/desktop venue detail composition. Automated visual gates now pass against the refreshed MVP reference set.
- 2026-05-26 review patch complete: future-date predictions now vary by selected date/weather fixture, past dates and live out-of-range times are rejected/clamped, planner chrome exposes the selected date, and venue detail no longer reuses stale cross-slug placeholders.
- 2026-05-26 UI correction complete: full sheet sizing is distinct from mid while visual-reference routes open at the reference-safe mid snap, venue cards render real thumbnail URLs in normal runtime, and favourite/share/settings controls are disabled until their owning behavior stories land.
- 2026-05-26 Round 2 follow-up patch complete: anchored mobile QuickInfo title uses a 48px target, mobile planner uses `shadow-card-up`, desktop planner spans the bottom bar, seasonal fixture projection no longer shrinks short low-season windows, the slider-track token matches `DESIGN.md`, and after-hours today mode sends the clamped planner query. The canonical review gate passed after restoring the missing local JSON parser dependency via a temporary shim.
- 2026-05-26 Round 3 patch complete: projected future sun windows now flow into list/detail ranges and timelines, geometry-only weather is applied before fixture projection, projection tests use future in-season dates, QuickInfo sun ranges use locale keys, compact favourite controls are disabled at a 44px target until Story 2.7, VenueCard thumbnail sizes are tokenized with load-failure fallback, QuickInfo metadata no longer starts with a separator, and forced selected-venue QuickInfo uses normalized visual-reference data. The canonical review gate passed.
- 2026-05-27 Round 4 patch complete: current `map-primary` visual evidence was restored, mobile venue detail now renders projected sun windows, weather-dampened exposure no longer classifies as sunny, desktop slider labels use AA-safe muted token styling, venue-card sun units are localized, future detail headers no longer show `SOL NU`, API planner tests use date-stable in-season values, past in-season calendar dates have distinct labels, and fast thumbnail failures fall back reliably. The canonical review gate passed.
- 2026-05-27 final rereview complete: bare mobile `?_time=14:00` now preserves real API-derived venue states, `map-primary` visual normalization is scoped behind dev-only `_state=map-primary`, mobile detail best-window copy uses projected timeline windows, the visual route recipe change is logged, all deterministic/E2E/visual gates passed, and Rasmus approved moving the story to done.

### File List

- `_bmad-output/implementation-artifacts/2-5-free-time-date-planner.md`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/visual-source-refresh-audit-2026-05-21.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `project-context.md`
- `_bmad-output/implementation-artifacts/validation/2-5-free-time-date-planner-review-20260526-115637.log`
- `_bmad-output/implementation-artifacts/validation/2-5-free-time-date-planner-review-20260526-120159.log`
- `_bmad-output/implementation-artifacts/validation/2-5-free-time-date-planner-review-20260526-120829.log`
- `_bmad-output/implementation-artifacts/validation/2-5-free-time-date-planner-review-20260526-163212.log`
- `_bmad-output/implementation-artifacts/validation/2-5-free-time-date-planner-review-20260526-163446.log`
- `_bmad-output/implementation-artifacts/validation/2-5-free-time-date-planner-review-20260526-164648.log`
- `_bmad-output/implementation-artifacts/validation/2-5-free-time-date-planner-review-20260526-190624.log`
- `_bmad-output/implementation-artifacts/validation/2-5-free-time-date-planner-review-20260527-074900.log`
- `_bmad-output/implementation-artifacts/validation/2-5-free-time-date-planner-review-20260527-075144.log`
- `_bmad-output/implementation-artifacts/validation/2-5-free-time-date-planner-review-20260527-081759.log`
- `_bmad-output/implementation-artifacts/validation/2-5-free-time-date-planner-review-20260527-082034.log`
- `_bmad-output/implementation-artifacts/validation/2-5-free-time-date-planner-review-20260527-082227.log`
- `nextjs-app/lib/contexts/TimeContext.tsx`
- `nextjs-app/lib/query-keys.ts`
- `nextjs-app/lib/services/venue-planner.ts`
- `nextjs-app/lib/utils/time-planner.ts`
- `nextjs-app/app/globals.css`
- `nextjs-app/docs/design/DESIGN.md`
- `nextjs-app/docs/design/references/REBASELINE-LOG.md`
- `nextjs-app/app/api/venues/route.ts`
- `nextjs-app/app/api/venues/[slug]/route.ts`
- `nextjs-app/components/composed/time/DatePickerDialog.tsx`
- `nextjs-app/components/composed/time/TimeSlider.tsx`
- `nextjs-app/components/composed/venue/VenueCard.tsx`
- `nextjs-app/components/composed/venue/VenueDetailContent.tsx`
- `nextjs-app/components/composed/venue/SunTimeline.tsx`
- `nextjs-app/components/composed/venue/VenueListControls.tsx`
- `nextjs-app/components/composed/venue/VenueQuickInfo.tsx`
- `nextjs-app/components/custom/layout/MobileNavBar.tsx`
- `nextjs-app/components/custom/map/MapContainer.tsx`
- `nextjs-app/components/custom/map/MapControls.tsx`
- `nextjs-app/components/custom/map/MapView.tsx`
- `nextjs-app/components/custom/sheets/MobileBottomSheet.tsx`
- `nextjs-app/components/custom/time/TimeSliderPanel.tsx`
- `nextjs-app/components/custom/venue/VenueDetailOverlay.tsx`
- `nextjs-app/components/custom/venue/VenueList.tsx`
- `nextjs-app/hooks/queries/useVenueSearch.ts`
- `nextjs-app/hooks/queries/useVenueDetail.ts`
- `nextjs-app/messages/en/common.json`
- `nextjs-app/messages/en/map.json`
- `nextjs-app/messages/en/venue.json`
- `nextjs-app/messages/sv/common.json`
- `nextjs-app/messages/sv/map.json`
- `nextjs-app/messages/sv/venue.json`
- `nextjs-app/test/components/DatePickerDialog.test.tsx`
- `nextjs-app/test/components/MapView.test.tsx`
- `nextjs-app/test/components/MapControls.test.tsx`
- `nextjs-app/test/components/MobileNavBar.test.tsx`
- `nextjs-app/test/components/MobileBottomSheet.test.tsx`
- `nextjs-app/test/components/TimeSlider.test.tsx`
- `nextjs-app/test/components/TimeSliderPanel.test.tsx`
- `nextjs-app/test/components/VenueCard.test.tsx`
- `nextjs-app/test/components/VenueDetailContent.test.tsx`
- `nextjs-app/test/components/VenueDetailOverlay.test.tsx`
- `nextjs-app/test/components/VenueQuickInfo.test.tsx`
- `nextjs-app/test/e2e/map-primary.spec.ts`
- `nextjs-app/test/e2e/smoke.spec.ts`
- `nextjs-app/test/e2e/responsive-layout.spec.ts`
- `nextjs-app/test/unit/TimeContext.test.tsx`
- `nextjs-app/test/unit/api/venue-detail-route.test.ts`
- `nextjs-app/test/unit/api/venues-route.test.ts`
- `nextjs-app/test/unit/queries/useVenueSearch.test.ts`
- `nextjs-app/test/unit/queries/useVenueDetail.test.ts`
- `nextjs-app/test/unit/query-keys.test.ts`
- `nextjs-app/test/unit/time-planner.test.ts`
- `nextjs-app/test/unit/venue-planner.test.ts`

## Change Log

| Date       | Author   | Note |
|------------|----------|------|
| 2026-05-20 | SM (Bob) | Story drafted from epics.md Story 2.5, PRD v3.1, architecture, UX spec, design tokens, Claude Design planner sources, Story 2.4 learnings, current code reconnaissance, deferred-work entries targeted at 2.5, and Context7 docs for TanStack Query/date-fns-tz/Motion. Status -> ready-for-dev. |
| 2026-05-26 | Dev (Amelia) | Addressed review findings for date/weather future predictions, planner chrome, date/time validation, stale detail data, sheet sizing, thumbnails, inert controls, and forced visual-reference sheet/list behavior. Canonical gate passed and status -> review. |
| 2026-05-26 | Dev (Amelia) | Addressed Round 2 follow-up findings for QuickInfo target size, planner shadow/layout tokens, seasonal short-window projection, slider-track token, and after-hours clamped planner queries. Canonical gate passed after restoring the missing local `jq` parser via a temporary shim. Status -> review. |
| 2026-05-26 | Dev (Amelia) | Addressed Round 3 follow-up findings for projected sun-window display/timelines, geometry-only projection order, i18n sun range copy, disabled compact favourite controls, tokenized thumbnails with load fallback, QuickInfo metadata separators, and forced visual QuickInfo normalization. Canonical gate passed and status -> review. |
| 2026-05-27 | Dev (Amelia) | Addressed Round 4 override findings for map-primary visual evidence, mobile detail projected-window chart, weather-dampened status, desktop tick accessibility, i18n sun copy, future badge quarantine, date-stable API tests, past-date calendar labels, and fast thumbnail fallback. Canonical gate passed and status -> review. |
| 2026-05-27 | Dev (Amelia) | Addressed final readiness rereview findings for bare `_time` runtime data, explicit `map-primary` visual state forcing, and projected best-window detail copy. Canonical gate and Playwright shards passed. Rasmus approved status -> done. |
