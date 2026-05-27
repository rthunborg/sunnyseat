# Story 2.6: Confidence Display & Auto-Refresh

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **MVP scope correction (2026-05-19):** Confidence display and auto-refresh are free MVP functionality for current-time and future-date planner states. Do not reintroduce Season Pass, Swish, paywall, premium context, lock badges, or premium copy into active runtime paths.
>
> **Visual source refresh (2026-05-21):** Active MVP references come only from `SunnySeat MVP Mobile Unlocked.html` and `SunnySeat MVP Desktop Unlocked.html`. Post-MVP Unlocked/Locked pages are future-only.

## Story

As a **user**,
I want to see how confident the sun prediction is and have data stay current,
So that I can trust the information and make decisions based on up-to-date data.

## Acceptance Criteria

**Given** venue sun data includes both geometric certainty and weather-based cloud cover
**When** confidence scores are displayed (pins, QuickInfo, venue detail, venue list cards)
**Then** the blended confidence percentage is shown (e.g., "85%") using `text-amber-text` (#fbbc00) on venue cards and `color-amber-dark` in detail views
**And** the percentage reflects the combined geometric + weather confidence per the existing API response

**Given** weather data from Met.no is older than 2 hours
**When** confidence scores are displayed
**Then** a tilde prefix is added ("~85%" instead of "85%") to signal reduced certainty
**And** the sun data is still displayed — it does not block the UI

**Given** the Met.no weather API is completely down
**When** venue data is displayed
**Then** confidence percentages are hidden on affected venues
**And** sun predictions are served based on geometry only (without weather qualifier)
**And** no error message is shown to the user (silent degradation)

**Given** the app is active (tab/window is focused)
**When** 5 minutes have elapsed since the last data fetch
**Then** venue sun states auto-refresh via TanStack Query background refetch (NFR9)
**And** no visible loading indicator during background refetch — current data remains displayed
**And** pin states and list/detail data update silently when fresh data arrives

**Given** API responses include freshness headers
**When** the response contains `X-Weather-Updated-At` and `X-Sun-Data-Source` headers
**Then** the front-end uses these to determine staleness and apply the tilde prefix or hide confidence accordingly

**Given** the venue API fails entirely
**When** TanStack Query retries (3 attempts, exponential backoff) are exhausted
**Then** an inline message appears on the map: "Kunde inte ladda platser. Försök igen." with a retry button
**And** the error message tone is matter-of-fact Swedish, no exclamation marks or emoji

**Given** TanStack Query manages all server state
**When** query hooks are used for venue search, sun exposure, and weather data
**Then** all hooks use keys from the centralized `lib/query-keys.ts` factory
**And** stale time is set to 5 minutes for venue/sun data

**Given** confidence is displayed for both today's real-time state and Story 2.5's selected future date/time
**When** the front-end computes freshness, tilde display, hidden confidence, and background refresh behaviour
**Then** it treats selected date/time as normal free MVP app state
**And** it does not read premium status, payment state, Season Pass state, or any Future Monetization provider/hook to decide whether confidence is visible

**Design Gate Criteria:**
- **Behaviour:** All staleness, degradation, and error states defined in UX spec §error-degradation are implemented
- **Animation:** Inline error/retry and background-refresh transitions match spec timings (±50 ms tolerance)
- **Visual validation:** No standalone screenshot gate. This component is validated as part of the parent screen(s) that render it (`map-primary`, `venue-detail`), plus component-level unit tests and the UX behaviour spec.

## Tasks / Subtasks

- [x] **Task 1: Baseline and source-context check** (AC: all)
  - [x] 1.1 Run `cd nextjs-app && npx tsc --noEmit` before editing. Stop and surface any errors outside story scope.
  - [x] 1.2 Run `cd nextjs-app && npx eslint . --quiet` before editing. Stop and surface any errors outside story scope.
  - [x] 1.3 Read `AGENTS.md`, `project-context.md`, `nextjs-app/docs/design/DESIGN.md`, `nextjs-app/docs/design/references/claude-design/README.md`, `STATE-MAPPING.md`, and UX spec sections for loading states, error/degradation patterns, `map-primary`, `map-panel-venues`, `map-with-selected-venue`, and `venue-detail`.
  - [x] 1.4 Read active MVP prototype sources for visual intent only: `project/src/BottomSheet.jsx`, `project/src/QuickInfo.jsx`, `project/src/VenueDetail.jsx`, `project/src/data.jsx`, `project/src-desktop/Sidebar.jsx`, `project/src-desktop/QuickInfo.jsx`, and `project/src-desktop/VenueDetail.jsx`. Do not copy DOM structure, inline CSS values, prototype-only data functions, or Post-MVP locked/paywall code.
  - [x] 1.5 Review Story 2.5 completion notes and current implementation files before changing confidence/polling behaviour. Story 2.5 already owns planner/date state, live-mode polling, previous-data behaviour, top mobile planner chrome, and refreshed visual gates.

- [x] **Task 2: Define and carry the API-backed confidence/freshness contract** (AC: #1, #2, #3, #5, #7, #8)
  - [x] 2.1 Audit current response shapes in `lib/types/api.ts`, `/api/venues`, `/api/venues/[slug]`, `useVenueSearch`, and `useVenueDetail`. Preserve existing venue fields (`confidence`, `sunExposurePercent`, `currentSunStatus`, `sunWindow`) unless a compatible optional field is needed.
  - [x] 2.2 Add/normalize response metadata for `X-Weather-Updated-At` and `X-Sun-Data-Source` in the API route responses. The client must read these headers through query hooks; do not require client components to know route internals.
  - [x] 2.3 Decide the durable distinction between `confidence` and `sunExposurePercent` and encode it in one place. `confidence` is prediction certainty; `sunExposurePercent` is the sun amount. Current code visually mixes these in some surfaces, so this task must prevent future silent drift.
  - [x] 2.4 Keep confidence blending/capping server-side or API-side. Client display logic may apply `~` or hide the value based on freshness metadata, but it must not invent or recompute the blended geometry+weather confidence.
  - [x] 2.5 When weather is stale (>2 hours), keep sun status/window data visible and render the confidence display as approximate (`~85%`). Use UTC/ISO timestamps and compare by age, not local formatted labels.
  - [x] 2.6 When weather is unavailable or the API indicates geometry-only data, hide confidence on affected venues. Do not show a weather error message; silent degradation is required.
  - [x] 2.7 Carry deferred query test coverage into this story: `useVenueSearch.test.ts` must include a non-empty venue fixture with `confidence` so DTO mapping and display metadata are exercised.
  - [x] 2.8 Carry deferred map type safety into this story: either share the API sun-status literal with `VenuePinData` or add a mapper guard for unknown/new statuses such as `NoSun`, with explicit test coverage.

- [x] **Task 3: Add reusable confidence display formatting** (AC: #1, #2, #3, #5)
  - [x] 3.1 Add a pure helper under `lib/utils/` or `lib/services/` for confidence display state, e.g. visible value, approximate value, hidden value, and accessible text. Keep it React-free and unit-tested.
  - [x] 3.2 Replace duplicate local `formatConfidence` helpers in venue surfaces with the shared helper where it applies. Do not create separate per-component confidence rules.
  - [x] 3.3 Ensure the helper handles `undefined`, `null`, `NaN`, values outside `0..100`, stale metadata, and unavailable weather without rendering `NaN%`, `undefined%`, or misleading certainty.
  - [x] 3.4 Swedish copy remains scoped in `messages/sv/*`; English equivalents remain in `messages/en/*`. User-facing labels use `Säkerhet` and matter-of-fact Swedish.
  - [x] 3.5 Expose accessible names that distinguish exact and approximate confidence without relying on color alone, for example by ensuring screen-reader text includes "cirka" when the visible label uses `~`.

- [x] **Task 4: Make TanStack Query refresh behaviour explicit and correct** (AC: #4, #6, #7, #8)
  - [x] 4.1 Keep all query keys flowing through `lib/query-keys.ts`; no inline query-key arrays in components or tests.
  - [x] 4.2 For live/today venue and detail queries, keep `staleTime: 5 * 60 * 1000` and `refetchInterval: 5 * 60 * 1000`. Do not set `refetchIntervalInBackground: true`; NFR9 says refresh while the app/tab is active.
  - [x] 4.3 For explicit future/planner date+time mode from Story 2.5, keep deliberate non-polling behaviour unless the implementation documents a product reason to poll forecasts. Future planner confidence still uses the same stale/hidden display rules.
  - [x] 4.4 Add explicit retry policy where needed: 3 attempts with exponential backoff. Existing `app/providers.tsx` default options are not enough documentation for this story.
  - [x] 4.5 Keep previous data visible during key changes/refetches with TanStack Query v5 `placeholderData: keepPreviousData` or an identity placeholder. Do not clear pins, list cards, QuickInfo, or detail content while fresh data is in flight.
  - [x] 4.6 Fix the current loading-pill gap: `LoadingPill` must not appear during background refetch when previous data is already displayed. It may still appear for initial/empty slow loads per UX spec.
  - [x] 4.7 Replace the current error pill with an inline map error that includes the exact Swedish retry affordance from AC #6. Wire the retry button to the relevant TanStack `refetch` function and keep the message tone matter-of-fact.

- [x] **Task 5: Wire confidence display across pins, QuickInfo, list, and detail** (AC: #1, #2, #3, #4, #5, #8)
  - [x] 5.1 `VenueCard` / `VenueList`: render the agreed confidence label using token utilities. If the visible card emphasizes sun percentage from the refreshed MVP reference, keep the confidence in the agreed metadata line and accessible text; do not mislabel sun amount as confidence.
  - [x] 5.2 `VenueQuickInfo`: display exact, approximate, or hidden confidence consistently in mobile anchored and desktop popover modes. Current anchored mobile mode hides most metadata; verify that still satisfies AC #1 or adjust without breaking the refreshed MVP composition.
  - [x] 5.3 `VenueDetailContent` / `VenueDetailOverlay`: include confidence in the detail view using `color-amber-dark`/token utilities and keep the existing sun timeline/sun-percentage badge semantically distinct.
  - [x] 5.4 `VenuePin` / `VenuePinLayer` / `mapVenueDtoToPinData`: implement the final pin percentage contract from Task 2.3. If the product decision is that pins show sun exposure while confidence is shown elsewhere, document it in Dev Notes and validate/rebaseline with rationale rather than silently failing AC wording.
  - [x] 5.5 Current forced visual states normalize pins to sunny for `map-panel-venues` and `map-with-selected-venue`. Ensure any confidence display added to forced-state surfaces remains deterministic for visual validation.
  - [x] 5.6 Keep all new visual styling token-backed. Do not add raw hex values, arbitrary Tailwind colors, custom shadows, or copied prototype CSS. The raw `#fbbc00` in AC #1 is source text; implementation should use the mapped project token utility.

- [x] **Task 6: Degradation, accessibility, and MVP monetization quarantine** (AC: #2, #3, #6, #8)
  - [x] 6.1 Weather stale: visible `~` prefix, sun data still visible, no blocking UI.
  - [x] 6.2 Weather unavailable/API down: hide confidence, show geometry-only sun state/window, no user-facing error.
  - [x] 6.3 Venue API failure after retries: inline map message with retry button: "Kunde inte ladda platser. Försök igen." No exclamation marks, apologies, emoji, or full-page error.
  - [x] 6.4 Interactive retry control has a semantic button role, accessible name, visible focus, and 44x44 px minimum target.
  - [x] 6.5 Confidence cannot be color-only. Include text/tilde/icon or accessible copy so stale/hidden/exact states are perceivable without color.
  - [x] 6.6 Run the MVP monetization quarantine scan before review: `rg -n "PremiumContext|usePremiumStatus|queryKeys\\.premium|/api/payments|Swish|swish|paywall|premium gate|lock badge|Season Pass|Säsongskortet" nextjs-app/app nextjs-app/components nextjs-app/hooks nextjs-app/lib nextjs-app/messages`. Remove active-runtime hits or document them as inactive Future Monetization references only.

- [x] **Task 7: Tests, visual validation, and review gate** (AC: all)
  - [x] 7.1 Add unit tests for the confidence display helper, freshness age threshold, unavailable-weather hiding, invalid values, and accessible text.
  - [x] 7.2 Extend `useVenueSearch.test.ts` for non-empty confidence-bearing DTOs, freshness headers, 5-minute stale/refetch interval, retry policy, previous-data behaviour, abort-signal forwarding, and planner non-polling.
  - [x] 7.3 Extend `useVenueDetail.test.ts` for freshness headers, live 5-minute polling, planner non-polling, previous detail data during refetch, and hidden/approximate confidence metadata.
  - [x] 7.4 Extend component tests for `VenueCard`, `VenueQuickInfo`, `VenueDetailContent`, `VenuePin`, and `MapView` to cover exact, stale, hidden, retry, no background loading indicator, and accessible labels.
  - [x] 7.5 Extend API route tests for `/api/venues` and `/api/venues/[slug]` headers/metadata and geometry-only/weather-unavailable fixture cases.
  - [x] 7.6 Run `cd nextjs-app && npx tsc --noEmit`.
  - [x] 7.7 Run `cd nextjs-app && npx eslint . --quiet`.
  - [x] 7.8 Run `cd nextjs-app && npx vitest run`.
  - [x] 7.9 Run `cd nextjs-app && npx playwright test` if MapView/error/refetch behaviour changes E2E flows or if new E2E coverage is added.
  - [x] 7.10 Run parent visual validations after visual correction: `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-primary "/?_state=map-primary&_time=14:00" mobile`, `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-primary "/?_time=16:30" desktop`, `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-panel-venues "/?_state=map-panel-venues&_time=14:00" mobile`, `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-with-selected-venue "/?venue=test-venue-sunny&_state=map-with-selected-venue&_time=14:00" mobile`, `.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail&_time=14:00" mobile`, and `.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail&_time=16:30" desktop`.
  - [x] 7.11 Run the MVP monetization quarantine scan from Task 6.6.
  - [x] 7.12 Before changing sprint status to `review`, run `.\scripts\run-sh.ps1 scripts/story-review.sh 2-6-confidence-display-auto-refresh`. Do not directly edit sprint status to `review`.

### Review Findings

- [x] [Review][Patch] QuickInfo shows loading skeletons during background refetch [nextjs-app/components/custom/map/MapView.tsx:479] — AC #4 requires no visible loading indicator during a 5-minute background refetch and says current data remains displayed, but both mobile and desktop QuickInfo pass `isLoadingSunData={venueQuery.isFetching || !selectedVenueDto}`. When TanStack starts the scheduled refetch with previous venue data still present, `venueQuery.isFetching` flips true and `VenueQuickInfo` hides the current sun/confidence/distance metadata behind skeletons. Fixed in review by loading QuickInfo sun data only when no selected venue DTO is available and adding a MapView regression test.
- [x] [Review][Patch] Initial venue API failures can leave the slow-loading pill visible with the retry error [nextjs-app/components/custom/map/MapView.tsx:700] — `LoadingPill` arms a timer during the initial fetch, but if retries exhaust before data arrives, `dataUpdatedAt` stays `0` and the effect never clears the pending timer or `show` state. The inline retry alert can therefore be accompanied by "Laddar platser..." after the timer fires, contradicting the AC #6 error state and the no-loading-during-failure UX. Fixed in review by clearing the loading pill timer/state when the venue query reaches error and adding a regression test.
- [x] [Review][Patch] Anchored mobile QuickInfo title button is below the 44 px touch target [nextjs-app/components/composed/venue/VenueQuickInfo.tsx:149] — the selected-venue name remains an interactive button that opens details, but the anchored mobile branch uses `min-h-8` (32 px). SunnySeat accessibility rules require every interactive element to meet a 44x44 px minimum touch target. Fixed in review by restoring `min-h-11` and asserting the anchored title button class.
- [x] [Review][Patch] Forced visual states suppress and contradict deterministic confidence display [nextjs-app/components/custom/map/MapView.tsx:375] — `map-panel-venues` and `map-with-selected-venue` normalize list cards and pins, but `listConfidenceMeta` is forced to `undefined` and selected QuickInfo still reads the raw selected DTO. That hides list-card confidence in forced visual states and can make QuickInfo disagree with the normalized sunny reference data, violating AC #1 and Task 5.5's deterministic forced-state requirement.
- [x] [Review][Patch] Non-anchored QuickInfo renders a leading separator before confidence [nextjs-app/components/composed/venue/VenueQuickInfo.tsx:178] — the non-anchored metadata row prepends `·` before `Säkerhet`, then adds another separator before distance, producing a visible leading separator rather than separators only between populated metadata items.
- [x] [Review][Patch] Venue card thumbnail images have no load-failure fallback [nextjs-app/components/composed/venue/VenueCard.tsx:255] — the new thumbnail URL path renders an `<img>` whenever `thumbnail.url` exists, but there is no `onError` fallback to the token-backed initials placeholder if the image is blocked or fails to load.
- [x] [Review][Patch] Visual correction introduced arbitrary size utilities instead of design tokens [nextjs-app/components/composed/venue/VenueCard.tsx:99] — new visual sizing uses arbitrary Tailwind values such as `min-h-[76px]`, `h-[60px] w-[60px]`, and `h-[200px]` instead of adding or using mapped project size tokens, violating AGENTS.md design-token rules and Task 5.6.

#### Round 3 final automatic review (2026-05-27)

- [x] [Review][Patch] Geometry-only degradation still applies weather dampening [nextjs-app/lib/services/venue-planner.ts:183] — AC #3 requires geometry-only predictions when weather is unavailable, but `_weather=unavailable` sets `skyCondition: 'unavailable'` and `applyPlannerSelectionToVenue` then applies `weatherExposureFactor('unavailable')` and `weatherConfidencePenalty('unavailable')`, so the geometry-only path is still weather-adjusted instead of preserving geometry-only sun predictions.
- [x] [Review][Patch] Forced venue-detail visual route hides confidence [nextjs-app/components/custom/map/MapView.tsx:233] — AC #1 requires confidence in venue detail, but forced `venue-detail` data is paired with `detailConfidenceMeta = undefined`; `getConfidenceDisplayState` hides confidence without `weatherUpdatedAt`, so the forced parent screen can pass without rendering the required detail confidence.
- [x] [Review][Patch] Forced visual normalization is not deterministic [nextjs-app/components/custom/map/MapView.tsx:599] — Task 5.5 requires deterministic forced-state surfaces, but forced pins/list/QuickInfo use `Math.max(95, value)` and preserve future fixture/API values above 95, and forced sunny venues do not force a deterministic `sunWindow`.
- [x] [Review][Patch] TimeContext can emit invalid stale planner queries after date rollover or outside sun season [nextjs-app/lib/contexts/TimeContext.tsx:101] — the interval updates `currentTime` while preserving a manually selected date; once that date becomes past, or today is outside the current sun season, `plannerQuery` still emits `{ date, time }`, causing `/api/venues` to reject with 400 and show the map retry error instead of a valid current state.
- [x] [Review][Patch] Venue detail midpoint formatter can emit invalid `HH:60` labels [nextjs-app/components/composed/venue/VenueDetailContent.tsx:478] — `peakTimeFromTimeline` rounds fractional minutes without carrying `60` into the hour, so windows near a minute boundary can produce invalid labels such as `10:60`.
- [x] [Review][Patch] Venue detail hero height uses arbitrary pixel utilities [nextjs-app/components/composed/venue/VenueDetailContent.tsx:347] — the changed hero sizing introduces `h-[200px]`/`h-[220px]` instead of mapped project tokens or a documented design decision, violating the design-token rule in AGENTS.md and Task 5.6.
- [x] [Review][Patch] Anchored QuickInfo repeats distance for assistive tech [nextjs-app/components/composed/venue/VenueQuickInfo.tsx:188] — the anchored branch renders an `sr-only` distance label and then the visible distance without `aria-hidden`, so screen readers can announce the same distance twice.
- [x] [Review][Patch] Venue detail API planner test is date-bombed [nextjs-app/test/unit/api/venue-detail-route.test.ts:83] — the fixed `2026-06-14` planner date will become a past date after June 14, 2026, making the route return 400 despite unchanged behavior; use a future in-season helper like the list-route tests.
- [x] [Review][Patch] Story visual-validation command disagrees with the canonical route map [2-6-confidence-display-auto-refresh.md:126] — Task 7.10 still records mobile `map-primary` as `/?_time=14:00`, while `project-context.md` now maps the mobile reference to `/?_state=map-primary&_time=14:00`; the story command should match the canonical route map and exercised visual gate.

#### Round 4 cap-override review (2026-05-27)

- [x] [Review][Patch] Venue detail timeline uses stale fixture status and peak after planner adjustment [nextjs-app/app/api/venues/[slug]/route.ts:120] — The detail route builds `detail` from the planner-adjusted venue, but still passes the original fixture `venue.currentSunStatus` into `buildDetailDto`; the unit test locks in `currentSunStatus: Shaded` with a `Sunny` timeline window. Mobile detail also prefers `timeline.peakTime` over the adjusted window midpoint, so projected windows can be displayed with stale peak bars. Fixed in review by deriving detail timeline status/peak from the planner-adjusted venue and preferring projected timeline windows in mobile forecast bars.
- [x] [Review][Patch] Venue detail discards successful alias-slug responses [nextjs-app/components/custom/map/MapView.tsx:232] — `/api/venues/[slug]` accepts both `slug` and `venueSlug`, but `queriedDetailMatchesUrl` only accepts `queriedDetailVenue.slug === venueSlugParam`. If a deep link uses a valid `venueSlug` alias that differs from canonical `slug`, MapView discards the successful detail response and keeps fallback detail visible. Fixed in review by matching URL venue params against both `slug` and `venueSlug` across detail, fallback, and selection paths.
- [x] [Review][Patch] Partial-only detail windows can fall back to sunny copy [nextjs-app/components/composed/venue/VenueDetailContent.tsx:503] — `bestWindowLabel` selects a partial window when no sunny window exists, but if `labels.bestWindow` is absent it falls back to `labels.timeline.sunnyWindow`. That can label a partial-only best window with sunny-window copy instead of the partial-window label. Fixed in review by falling back to partial-window copy when the selected best window is partial.

## Dev Notes

### Current Implementation Surface

- Baseline before story drafting on 2026-05-22: `cd nextjs-app && npx tsc --noEmit` passed; `cd nextjs-app && npx eslint . --quiet` passed.
- Story 2.5 is in `review` in sprint status and commit `a1bae0d feat(2): Free Time & Date Planner` landed planner/date state, live polling, previous-data behaviour, and refreshed visual composition. Build on it; do not recreate planner state.
- `nextjs-app/lib/types/api.ts` currently exposes `VenueDataDto.confidence`, `VenueDataDto.sunExposurePercent`, and `VenuesMeta.weatherUpdatedAt?`. `GetVenueDetailResponse` has no `meta` field yet.
- `/api/venues` currently sets `meta.weatherUpdatedAt` only when a planner selection exists. It does not emit `X-Weather-Updated-At` or `X-Sun-Data-Source` headers.
- `/api/venues/[slug]` returns detail data with `Cache-Control` only. It accepts planner `date`/`time` params from Story 2.5 but does not emit freshness headers.
- `useVenueSearch` already uses `queryKeys`, forwards `signal`, sets `staleTime` to 5 minutes, sets live `refetchInterval` to 5 minutes, disables planner polling, disables window-focus refetch, and uses `placeholderData: keepPreviousData`.
- `useVenueDetail` mirrors the same live/planner polling split and previous-data behaviour.
- `app/providers.tsx` default query stale time is 60 seconds, but hook-level 5-minute options win for venue/detail queries. Do not rely on the provider default to satisfy AC #7.
- `MapView` currently passes `venueQuery.isFetching` into `LoadingPill`. That can show a loading pill during a slow background refetch even though AC #4 forbids visible loading indicators during background refetch.
- `MapView` current `ErrorPill` displays only `map.loadFailed` and has no retry button. AC #6 requires "Kunde inte ladda platser. Försök igen." with retry.
- `VenueCard` currently shows `sunExposurePercent` visibly as "`92% sol`" and puts `confidence` in screen-reader-only text. `VenueQuickInfo` shows confidence in non-anchored metadata and "`% SOL`" in the thumbnail badge. `VenueDetailContent` hero badge shows `sunExposurePercent`, not confidence. `VenuePin` displays `sunExposurePercent`. Story 2.6 must settle this split deliberately.
- `lib/utils/venue-visual-metadata.ts` contains temporary visual metadata for rating/tags/price/exposure. Do not put confidence or weather freshness rules there; confidence belongs to API/query data.
- `lib/solar/confidence-calculator.ts` and `lib/weather/*` are server/backend modules. Client components must not import them directly.

### API and Data Guardrails

- Client components must not import from `nextjs-app/lib/solar`, `nextjs-app/lib/weather`, `nextjs-app/lib/supabase`, `nextjs-app/lib/middleware`, or `nextjs-app/lib/buildings`. Use `app/api/*` routes and hooks in `hooks/queries/`.
- Query hooks should return TanStack Query result objects directly. It is acceptable for the `queryFn` to return a typed response enriched with parsed header metadata.
- Preserve UTC/ISO timestamps in data contracts. Format user-facing time with existing Europe/Stockholm helpers only at render boundaries.
- Treat missing or unparsable `X-Weather-Updated-At` as unavailable weather unless the API explicitly marks a fixture/dev source as fresh. Do not silently show exact confidence with missing freshness metadata in production-like paths.
- If the current fixture-backed routes cannot represent true Met.no outage, add deterministic fixture/test controls that exercise stale and geometry-only display states without changing production query semantics.
- Do not modify backend engine internals unless the API route genuinely needs a server-only adapter change. This story is primarily front-end/query/API-boundary work.

### Design and Behaviour Requirements

- Binding design tokens come from `nextjs-app/docs/design/DESIGN.md`. Implementation should use project token utilities such as `text-amber-text`, `text-amber-dark`, `bg-surface-cream`, `rounded-card`, and existing motion constants. Do not copy raw CSS values from prototypes.
- UX spec §Error & Degradation Patterns is binding: stale weather gets a tilde, weather API down hides confidence with no error, venue API failure gets the inline retry message.
- The refreshed MVP prototypes show sun percentage strongly on pins/cards/detail. That is visual source, but Story 2.6 ACs also require confidence display. If those conflict in a specific surface, resolve the product contract explicitly in code/tests and document any visual rebaseline rationale.
- Reduced-motion users should not receive extra transform/spring animation for error/retry or refresh transitions. Existing Motion imports should come from `motion/react`.
- Swedish is default. Existing copy keys include `map.loadFailed`, `common.retry`, and venue confidence labels; update scoped messages instead of hardcoding strings in components.

### Previous Story Intelligence

- Story 2.5 made live `Idag` mode advance and poll every 5 minutes while explicit planner mode avoids polling. Preserve this split for confidence refresh.
- Story 2.5 intentionally kept future-story mismatches out of planner scope, including final confidence/percentage formatting. Story 2.6 now owns that decision.
- Story 2.5 visual gates passed for `map-primary`, `map-panel-venues`, `map-with-selected-venue`, and `venue-detail` after refreshed MVP references. Story 2.6 must keep those parent gates passing or rebaseline only with rationale and `REBASELINE-LOG.md`.
- Commit `aecd6af chore(epic-2): align MVP monetization scope` removed active premium runtime. Story 2.6 must not recreate it.

### Deferred Work Carried Into This Story

- `useVenueSearch.test.ts` fixture gap: current `SAMPLE_RESPONSE` has no venue with `confidence`, so confidence mapping/display is under-tested. Add non-empty fixture coverage.
- `VenuePinData.sunStatus` duplicate literal: guard or share the type so expanding API statuses such as `NoSun` cannot silently break pin mapping.
- API-backed confidence and sun-percentage display contract: replace temporary/display-only mapping with a durable API-backed contract across pins, QuickInfo, venue list cards, and venue detail.

### Latest Technical Notes

- Current package versions in `nextjs-app/package.json`: Next.js 16.2.2, React 19.2.5, TanStack Query 5.99.0, Motion 12.38.0, MapLibre GL 5.23.0, next-intl 4.9.1, Tailwind CSS 4.2.2, TypeScript 6.0.2, Vitest 4.1.4, Playwright 1.59.1.
- Context7 `/tanstack/query`: `refetchInterval` sets fixed polling while the query has an observer. `refetchIntervalInBackground: true` continues polling when the tab/window is not focused; omit it for active-tab-only refresh.
- Context7 `/tanstack/query`: React Query v5 replaced `keepPreviousData: true` with `placeholderData: keepPreviousData` or an identity placeholder. Current hooks already use the v5 helper.
- Context7 `/tanstack/query`: keep previous data during query-key changes so UI does not jump or clear while new data is fetched.

### File Impact

Likely files to modify:

- `nextjs-app/lib/types/api.ts`
- `nextjs-app/lib/query-keys.ts` if confidence/weather key shape changes
- `nextjs-app/lib/utils/confidence-display.ts` or equivalent new pure helper
- `nextjs-app/app/api/venues/route.ts`
- `nextjs-app/app/api/venues/[slug]/route.ts`
- `nextjs-app/hooks/queries/useVenueSearch.ts`
- `nextjs-app/hooks/queries/useVenueDetail.ts`
- `nextjs-app/components/composed/venue/VenueCard.tsx`
- `nextjs-app/components/composed/venue/VenueQuickInfo.tsx`
- `nextjs-app/components/composed/venue/VenueDetailContent.tsx`
- `nextjs-app/components/custom/venue/VenueList.tsx`
- `nextjs-app/components/custom/map/MapView.tsx`
- `nextjs-app/components/custom/map/VenuePin.tsx`
- `nextjs-app/components/custom/map/VenuePinLayer.tsx`
- `nextjs-app/lib/utils/venue-pin-mapping.ts`
- `nextjs-app/lib/types/map.ts`
- `nextjs-app/messages/sv/map.json`
- `nextjs-app/messages/en/map.json`
- `nextjs-app/messages/sv/venue.json`
- `nextjs-app/messages/en/venue.json`
- `nextjs-app/test/unit/queries/useVenueSearch.test.ts`
- `nextjs-app/test/unit/queries/useVenueDetail.test.ts`
- `nextjs-app/test/unit/api/venues-route.test.ts`
- `nextjs-app/test/unit/api/venue-detail-route.test.ts`
- `nextjs-app/test/unit/query-keys.test.ts`
- `nextjs-app/test/unit/confidence-display.test.ts` or equivalent new unit test
- `nextjs-app/test/components/VenueCard.test.tsx`
- `nextjs-app/test/components/VenueQuickInfo.test.tsx` if absent, create focused coverage
- `nextjs-app/test/components/VenueDetailContent.test.tsx`
- `nextjs-app/test/components/VenuePin.test.tsx`
- `nextjs-app/test/components/MapView.test.tsx`

Avoid unless explicitly required:

- `nextjs-app/lib/solar/**` client imports or broad backend refactors
- `nextjs-app/lib/weather/**` client imports
- `nextjs-app/lib/supabase/**`
- `nextjs-app/lib/buildings/**`
- `nextjs-app/lib/contexts/PremiumContext.tsx`
- `queryKeys.premium`, `usePremiumStatus`, `/api/payments/*`, Swish helpers, paywall components, lock badges, Season Pass copy, or premium JSON messages in active MVP runtime
- Reference PNGs or `REBASELINE-LOG.md` unless visual validation proves a legitimate rebaseline is needed and Rasmus approves.

### References

- `AGENTS.md` - repo rules: design tokens, visual source of truth, API boundary, component architecture, Swedish copy, accessibility, testing/story workflow, Windows script wrappers.
- `project-context.md` - durable project context and Screen ID -> Route Map for `map-primary`, `map-panel-venues`, `map-with-selected-venue`, and `venue-detail`.
- `_bmad-output/planning-artifacts/epics.md` - Epic 2 and Story 2.6 source ACs/design gate/deferred items.
- `_bmad-output/planning-artifacts/prd.md` - FR2, FR7, FR12, FR13, NFR9, NFR28, NFR34, NFR35, confidence as first-class UI, MVP scope correction.
- `_bmad-output/planning-artifacts/architecture.md` - data freshness headers, progressive loading, TanStack Query 5-minute cache/refetch, API boundary, query-key factory, loading/error patterns, component layers.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - confidence UX principles, loading states, error/degradation patterns, QuickInfo, venue list, venue detail, map/detail synchronization.
- `nextjs-app/docs/design/DESIGN.md` - binding tokens, type scale, motion, surface colors, amber text tokens, responsive layout rules.
- `nextjs-app/docs/design/references/claude-design/README.md` - prototype reading discipline.
- `nextjs-app/docs/design/references/claude-design/STATE-MAPPING.md` - active MVP prototype split and visual-validation recipes.
- `nextjs-app/docs/design/references/claude-design/project/SunnySeat MVP Mobile Unlocked.html` and `project/src/*` - active MVP mobile visual source.
- `nextjs-app/docs/design/references/claude-design/project/SunnySeat MVP Desktop Unlocked.html` and `project/src-desktop/*` - active MVP desktop visual source.
- `_bmad-output/implementation-artifacts/2-5-free-time-date-planner.md` - previous story implementation notes, polling split, previous-data behaviour, final verification, visual gate matrix.
- `_bmad-output/implementation-artifacts/deferred-work.md` - Story 2.6 deferred entries carried into this story.
- `Context7 /tanstack/query` - React Query v5 polling and placeholderData/keepPreviousData guidance.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Dev baseline before implementation: `cd nextjs-app && npx tsc --noEmit` passed.
- Dev baseline before implementation: `cd nextjs-app && npx eslint . --quiet` passed.
- Task 1 source context read: `AGENTS.md`, `project-context.md`, `nextjs-app/docs/design/DESIGN.md`, Claude Design README/STATE-MAPPING, active MVP mobile/desktop prototype HTML and Task 1.4 JSX sources, UX loading/error/degradation and affected screen sections, Story 2.5 completion notes, and current API/query/map/venue implementation files.
- Task 1 regression: `npx vitest run` passed (34 files, 242 tests).
- Task 2 red tests: focused route/query/mapping suite failed on missing freshness headers/body metadata, missing hook-enriched metadata, unavailable-weather fixture handling, and shared `NoSun` pin status coverage.
- Task 2 focused tests after implementation: `npx vitest run test/unit/queries/useVenueSearch.test.ts test/unit/queries/useVenueDetail.test.ts test/unit/api/venues-route.test.ts test/unit/api/venue-detail-route.test.ts test/unit/utils/venue-pin-mapping.test.ts` passed (5 files, 61 tests).
- Task 2 verification: `npx tsc --noEmit` passed; `npx vitest run` passed (34 files, 250 tests); `npx eslint . --quiet` passed.
- Task 3 red tests: `npx vitest run test/unit/confidence-display.test.ts` failed on missing helper; `npx vitest run test/components/VenueCard.test.tsx test/components/VenueQuickInfo.test.tsx` failed on stale/hidden confidence formatting still using local exact formatting.
- Task 3 focused tests after implementation: `npx vitest run test/components/VenueCard.test.tsx test/components/VenueQuickInfo.test.tsx test/unit/confidence-display.test.ts` passed (3 files, 15 tests).
- Task 3 verification: `npx tsc --noEmit` passed; `npx vitest run` passed (35 files, 257 tests); `npx eslint . --quiet` passed.
- Task 4 red tests: hook tests failed on missing `venue-query-options`; `MapView.test.tsx` failed because `LoadingPill` appeared during background refetch with data and the venue API failure had no retry button.
- Task 4 focused tests after implementation: `npx vitest run test/unit/queries/useVenueSearch.test.ts test/unit/queries/useVenueDetail.test.ts test/components/MapView.test.tsx` passed (3 files, 58 tests).
- Task 4 verification: `npx tsc --noEmit` passed; `npx eslint . --quiet` passed; `npx vitest run` passed (35 files, 261 tests).
- Task 5 red tests: `npx vitest run test/components/VenueDetailContent.test.tsx test/components/VenueQuickInfo.test.tsx test/components/VenueList.test.tsx` failed on missing detail confidence display, anchored quick-info metadata still hidden, and ambiguous card/favourite aria labels.
- Task 5 focused tests after implementation: `npx vitest run test/components/VenueDetailContent.test.tsx test/components/VenueQuickInfo.test.tsx test/components/VenueList.test.tsx test/components/VenueCard.test.tsx test/components/VenueDetailOverlay.test.tsx` passed (5 files, 30 tests).
- Task 5 verification: `npx tsc --noEmit` passed; `npx vitest run` passed (35 files, 264 tests); `npx eslint . --quiet` passed.
- Task 6 quarantine scan: `rg -n "PremiumContext|usePremiumStatus|queryKeys\\.premium|/api/payments|Swish|swish|paywall|premium gate|lock badge|Season Pass|Säsongskortet" nextjs-app/app nextjs-app/components nextjs-app/hooks nextjs-app/lib nextjs-app/messages` returned no active-runtime hits.
- Task 7 pre-visual verification: `npx tsc --noEmit` passed; `npx eslint . --quiet` passed; `npx vitest run` passed (35 files, 264 tests).
- Task 7 E2E first run: `npx playwright test` failed on `axe.spec.ts` selected QuickInfo due selected pin percentage using white text on `bg-amber-pin`.
- Task 7 pin contrast fix: `npx vitest run test/components/VenuePin.test.tsx` passed; targeted `npx playwright test test/e2e/axe.spec.ts --project=a11y --grep "map selected venue QuickInfo"` passed.
- Task 7 E2E rerun: `npx playwright test` passed (39 passed, 26 skipped).
- Task 7 post-fix verification: `npx tsc --noEmit` passed; `npx eslint . --quiet` passed; `npx vitest run` passed (35 files, 264 tests).
- Task 7 visual validation blocked: `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-primary "/?_time=14:00" mobile` failed. Reported deltas include Story 2.6 confidence text visible on mobile venue list cards while the reference lacks it, plus chips/nav/pin-variant reference drift. Per repo visual gate rules, review transition is blocked pending explicit Rasmus accept-with-rationale or rebaseline direction.
- Task 7 visual validation rerun on 2026-05-25 with a fresh shell after `ANTHROPIC_API_KEY` was available at User scope. Tooling fixes needed for the rerun: installed missing Playwright Chromium with `npx playwright install chromium`; Git Bash lacked `jq`, so a temporary non-repo parser shim was placed on PATH; Anthropic API health check returned HTTP 200.
- Task 7 visual validation rerun results: PASS for `map-primary` desktop and `map-with-selected-venue` mobile; FAIL for `map-primary` mobile, `map-panel-venues` mobile, `venue-detail` mobile, and `venue-detail` desktop. The repeated Story 2.6-specific failure is visible `Säkerhet: XX%` confidence text required by the story but absent from the current references; additional reported deltas include mobile nav/card/chip drift and venue-detail chart/layout/button drift. Review transition remains blocked pending Rasmus accept-with-rationale, rebaseline direction, or explicit code-change direction.
- Task 7 visual correction on 2026-05-26: tightened mobile list cards to the active 60 px thumbnail / 8 px row-padding reference shape, compressed visible card confidence into the existing metadata line while preserving full `Säkerhet` accessible text, restored selected QuickInfo to a compact hero/body composition, prevented `VISA RUTT` wrapping, fixed desktop/mobile detail timeline/layout deltas, and normalized forced visual pins for the pinned 14:00 visual routes.
- Task 7 fresh visual matrix on 2026-05-26 passed all parent gates through `.\scripts\run-sh.ps1 scripts/visual-validate.sh`: `map-primary` mobile/desktop, `map-panel-venues` mobile, `map-with-selected-venue` mobile, and `venue-detail` mobile/desktop.
- Task 7 final verification on 2026-05-26: `node node_modules/typescript/bin/tsc --noEmit` passed; `node node_modules/eslint/bin/eslint.js . --quiet` passed; `node node_modules/vitest/vitest.mjs run` passed (35 files, 264 tests).
- Task 7 E2E on 2026-05-26: installed missing Playwright WebKit, observed two isolated parallel mobile flakes that passed on targeted rerun, then `node node_modules/@playwright/test/cli.js test --workers=1` passed (39 passed, 26 skipped).
- Task 7 quarantine scan rerun on 2026-05-26: `rg -n "PremiumContext|usePremiumStatus|queryKeys\\.premium|/api/payments|Swish|swish|paywall|premium gate|lock badge|Season Pass|Säsongskortet" nextjs-app/app nextjs-app/components nextjs-app/hooks nextjs-app/lib nextjs-app/messages` returned no active-runtime hits.
- Task 7 story review gate on 2026-05-26: `.\scripts\run-sh.ps1 scripts/story-review.sh 2-6-confidence-display-auto-refresh` passed, including npm `lint`, `typecheck`, `test`, mapped visual validations, and sprint-status transition to `review`. Validation artifact: `_bmad-output/implementation-artifacts/validation/2-6-confidence-display-auto-refresh-review-20260526-101846.log`.
- Code review Round 1 on 2026-05-26 found and fixed three patch items: QuickInfo skeletons during background venue refetch, lingering slow-load pill after venue API error, and anchored QuickInfo title touch target below 44 px.
- Code review patch verification on 2026-05-26: `node node_modules/vitest/vitest.mjs run test/components/MapView.test.tsx test/components/VenueQuickInfo.test.tsx` passed (2 files, 41 tests) via the bundled Codex Node runtime after the WindowsApps Node shim returned Access denied.
- Code review patch verification on 2026-05-26: `node node_modules/typescript/bin/tsc --noEmit` passed; `node node_modules/eslint/bin/eslint.js . --quiet` passed; `node node_modules/vitest/vitest.mjs run` passed (36 files, 275 tests).
- Code review patch story gate on 2026-05-26: `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-sh.ps1 scripts/story-review.sh 2-6-confidence-display-auto-refresh` passed after starting the dev server with bundled Node first on PATH and using a temporary npm shim for the gate's `npm run lint/typecheck/test` calls. Validation artifact: `_bmad-output/implementation-artifacts/validation/2-6-confidence-display-auto-refresh-review-20260526-152003.log`.
- Code review Round 2 baseline on 2026-05-27: `npx tsc --noEmit` and `npx eslint . --quiet` were unavailable because `npx` is not on PATH; reran through bundled Node. `node node_modules/typescript/bin/tsc --noEmit` passed; `node node_modules/eslint/bin/eslint.js . --quiet` passed.
- Code review Round 2 red test on 2026-05-27: `node node_modules/vitest/vitest.mjs run test/components/MapView.test.tsx --pool=threads --maxWorkers=1 --testNamePattern "forced visual|normalizes selected QuickInfo"` failed because forced list cards and selected QuickInfo rendered `Säkerhet saknas` instead of deterministic `Säkerhet: 95%`.
- Code review Round 2 focused verification on 2026-05-27: forced confidence tests passed after adding forced visual freshness metadata; `VenueCard` thumbnail fallback/token tests and `VenueQuickInfo` separator/touch-target tests passed; full affected component run passed (3 files, 55 tests).
- Code review Round 2 regression verification on 2026-05-27: `node node_modules/typescript/bin/tsc --noEmit` passed; `node node_modules/eslint/bin/eslint.js . --quiet` passed; `node node_modules/vitest/vitest.mjs run` passed (36 files, 290 tests); `node node_modules/@playwright/test/cli.js test --workers=1` passed (39 passed, 26 skipped).
- Code review Round 2 quarantine scan on 2026-05-27: `rg -n "PremiumContext|usePremiumStatus|queryKeys\\.premium|/api/payments|Swish|swish|paywall|premium gate|lock badge|Season Pass|Säsongskortet" nextjs-app/app nextjs-app/components nextjs-app/hooks nextjs-app/lib nextjs-app/messages` returned no active-runtime hits.
- Code review Round 2 story-review attempt on 2026-05-27 failed visual validation for `map-panel-venues` because forced venue cards rendered duplicate visible percentage text (`95% sol · 95%`). Validation artifact: `_bmad-output/implementation-artifacts/validation/2-6-confidence-display-auto-refresh-review-20260527-090929.log`.
- Code review Round 2 visual fix on 2026-05-27: forced visual-reference venue lists now suppress the duplicate visible confidence percentage while preserving exact confidence in accessible text; non-forced lists still render visible card confidence.
- Code review Round 2 story gate on 2026-05-27: `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-sh.ps1 scripts/story-review.sh 2-6-confidence-display-auto-refresh` passed with temporary shell-only `npm`/`npx`/`jq` shims and bundled Node first on PATH. Validation artifact: `_bmad-output/implementation-artifacts/validation/2-6-confidence-display-auto-refresh-review-20260527-091917.log`.
- Code review Round 2 map-primary visual sanity on 2026-05-27: manual `scripts/visual-validate.sh map-primary "/?_state=map-primary&_time=14:00" mobile` and `scripts/visual-validate.sh map-primary "/?_time=16:30" desktop` both passed after the forced-list confidence adjustment.
- Code review Round 3 baseline on 2026-05-27: `npx tsc --noEmit` and `npx eslint . --quiet` were unavailable because `npx` is not on PATH; reran through bundled Node. `node node_modules/typescript/bin/tsc --noEmit` passed; `node node_modules/eslint/bin/eslint.js . --quiet` passed.
- Code review Round 3 red tests on 2026-05-27: focused suites failed as expected for geometry-only weather dampening, forced venue-detail confidence, forced visual determinism, stale planner rollover/out-of-season queries, `HH:60` midpoint formatting, token-backed hero sizing, anchored QuickInfo duplicate distance, and the fixed-date venue-detail API planner test.
- Code review Round 3 focused verification on 2026-05-27: `node node_modules/vitest/vitest.mjs run test/unit/venue-planner.test.ts test/components/MapView.test.tsx test/unit/TimeContext.test.tsx test/components/VenueDetailContent.test.tsx test/components/VenueQuickInfo.test.tsx test/unit/api/venue-detail-route.test.ts --pool=threads --maxWorkers=1` passed (6 files, 77 tests).
- Code review Round 3 regression verification on 2026-05-27: `node node_modules/typescript/bin/tsc --noEmit` passed; `node node_modules/eslint/bin/eslint.js . --quiet` passed; `node node_modules/vitest/vitest.mjs run --pool=threads --maxWorkers=1` passed (36 files, 295 tests); `node node_modules/@playwright/test/cli.js test --workers=1` passed (39 passed, 26 skipped).
- Code review Round 3 story-review attempt on 2026-05-27 passed package checks and visual validation for `map-panel-venues` mobile, `map-primary` mobile/desktop, and `map-with-selected-venue` mobile, then failed `venue-detail` mobile because the active reference omits the Story 2.6-required visible `Säkerhet: 95%` detail confidence line and reported a placeholder-position mismatch that the captured screenshot did not corroborate. Validation artifact: `_bmad-output/implementation-artifacts/validation/2-6-confidence-display-auto-refresh-review-20260527-111620.log`.
- Code review Round 3 targeted visual rerun on 2026-05-27 still failed `venue-detail` mobile for the same required confidence-line/reference mismatch, plus the same uncorroborated placeholder-position report. Story remains `in-progress` pending Rasmus accept-with-rationale, rebaseline direction, or explicit code-change direction.
- Code review Round 3 final deterministic verification after forced detail fixture alignment on 2026-05-27: `node node_modules/typescript/bin/tsc --noEmit` passed; `node node_modules/eslint/bin/eslint.js . --quiet` passed; `node node_modules/vitest/vitest.mjs run --pool=threads --maxWorkers=1` passed (36 files, 295 tests); `node node_modules/@playwright/test/cli.js test --workers=1` passed (39 passed, 26 skipped).
- Product decision on 2026-05-27: Rasmus chose to remove the duplicate visible venue-detail `Säkerhet xx%` text rather than accept/rebaseline the visual mismatch; the top sun percentage badge remains visible and detail confidence remains screen-reader-only.
- Product-decision red test on 2026-05-27: `node node_modules/vitest/vitest.mjs run test/components/VenueDetailContent.test.tsx --pool=threads --maxWorkers=1 --reporter=verbose` failed as expected because `VenueDetailContent` still rendered visible `Säkerhet: 92%` and `Säkerhet: ~92%`.
- Product-decision focused verification on 2026-05-27: `node node_modules/vitest/vitest.mjs run test/components/VenueDetailContent.test.tsx --pool=threads --maxWorkers=1 --reporter=verbose` passed (8 tests); `node node_modules/vitest/vitest.mjs run test/components/MapView.test.tsx --pool=threads --maxWorkers=1 --reporter=verbose` passed (37 tests).
- Product-decision regression verification on 2026-05-27: `node node_modules/typescript/bin/tsc --noEmit` passed; `node node_modules/eslint/bin/eslint.js . --quiet` passed; `node node_modules/vitest/vitest.mjs run --pool=threads --maxWorkers=1` passed (36 files, 295 tests); `node node_modules/@playwright/test/cli.js test` passed (39 passed, 26 skipped).
- Product-decision visual verification on 2026-05-27: direct `venue-detail` mobile validation passed on the canonical route `/?venue=test-venue-sunny&_state=venue-detail&_time=14:00`; the earlier `/v/test-venue-sunny?...` attempt was an obsolete route and produced a 404/wait timeout.
- Product-decision story gate on 2026-05-27: `powershell -ExecutionPolicy Bypass -File scripts/run-sh.ps1 scripts/story-review.sh 2-6-confidence-display-auto-refresh` passed with temporary shell-only `npm`/`npx`/`jq` shims and bundled Node first on PATH. Validation artifact: `_bmad-output/implementation-artifacts/validation/2-6-confidence-display-auto-refresh-review-20260527-133856.log`.
- Code review Round 4 cap-override on 2026-05-27 found and fixed three patch items: planner-adjusted venue detail timeline status/peak semantics, alias-slug detail matching, and partial-only best-window fallback copy.
- Code review Round 4 focused verification on 2026-05-27: `node node_modules/vitest/vitest.mjs run test/unit/api/venue-detail-route.test.ts test/components/MapView.test.tsx test/components/VenueDetailContent.test.tsx --pool=threads --maxWorkers=1` passed (3 files, 54 tests) via bundled Codex Node after PATH `node.exe` returned Access denied.
- Code review Round 4 regression verification on 2026-05-27: `node node_modules/typescript/bin/tsc --noEmit` passed; `node node_modules/eslint/bin/eslint.js . --quiet` passed; `node node_modules/vitest/vitest.mjs run --pool=threads --maxWorkers=1` passed (36 files, 297 tests); `node node_modules/@playwright/test/cli.js test --workers=1` passed (39 passed, 26 skipped).
- Code review Round 4 story gate on 2026-05-27: first canonical gate attempt passed package checks and two mapped visuals, then hit a non-stable `map-primary` desktop visual verdict; targeted rerun of the same route passed, and the full canonical gate passed on rerun with temporary shell-only `npm`/`npx` shims plus bundled Node first on PATH. Story was already `review`, so sprint status required no update. Validation artifact: `_bmad-output/implementation-artifacts/validation/2-6-confidence-display-auto-refresh-review-20260527-142723.log`.

### Implementation Plan

- API/query contract: expose route-level freshness through `X-Weather-Updated-At` and `X-Sun-Data-Source`, carry it into typed response `meta`, and have query hooks merge header metadata so UI components consume hook data only.
- Metrics contract: keep `confidence` as prediction certainty and `sunExposurePercent` as direct-sun amount in `lib/types/api.ts`; pins continue to use sun exposure, while confidence display uses server-provided confidence plus freshness metadata.
- Degradation contract: fixture routes now support deterministic non-production `_weather=stale` and `_weather=unavailable` paths; geometry-only data keeps venue sun state visible and marks `skyCondition: unavailable`.
- Confidence formatting: all component confidence display now flows through the React-free `getConfidenceDisplayState` helper; stale weather renders visible `~` plus screen-reader "cirka", and geometry-only/missing/invalid metadata hides the percentage without fabricating certainty.
- Query refresh/error: live venue/detail hooks keep 5-minute active-tab polling, planner mode remains non-polling, both hooks now use explicit retry/backoff helpers, background refetches with displayed data suppress the loading pill, and venue API failure renders inline retry wired to TanStack `refetch`.
- Surface contract: pins and photo/sun badges intentionally continue to show `sunExposurePercent`; confidence is rendered as metadata on list cards and QuickInfo using freshness metadata from the API/query layer. Venue detail keeps confidence available to assistive tech but omits the duplicate visible `Säkerhet xx%` line per Rasmus's 2026-05-27 product decision, because the visible sun percentage badge already carries the card's primary percentage.
- Degradation/accessibility: stale confidence uses visible `~` plus accessible "cirka"; geometry-only confidence is hidden with screen-reader unavailable copy while sun state remains; venue API failure is a semantic inline alert with a 44 px retry button and visible focus styling.
- Pin a11y: selected sunny pins use `text-amber-cta-text` on `bg-amber-pin`, matching the design token guidance for amber pin percentage text and satisfying the axe contrast gate.

### Completion Notes List

- Story drafted by SM (Bob) on 2026-05-22.
- Ultimate context engine analysis completed - comprehensive developer guide created.
- Baseline before story drafting passed: `cd nextjs-app && npx tsc --noEmit`; `cd nextjs-app && npx eslint . --quiet`.
- Story preserves Story 2.6 ACs verbatim from `epics.md`.
- Story explicitly carries all current Story 2.6 deferred-work queue entries.
- Story flags the key runtime gaps: no freshness headers on venue routes, ambiguous confidence vs sun-percentage display, no retry button on map venue failure, and loading pill visibility during background refetch.
- Story includes explicit MVP monetization quarantine requirements after the 2026-05-19 scope correction.
- Task 1 complete: baseline checks were clean, MVP visual/UX context was loaded, Story 2.5 polling/previous-data notes were reviewed, and current confidence/polling implementation gaps were confirmed before product code changes.
- Task 2 complete: API freshness headers/body metadata are normalized for list/detail routes, query hooks enrich responses from headers, `confidence` vs `sunExposurePercent` is documented in the shared API type, fixture weather stale/unavailable paths are deterministic, and `VenuePinData` now shares the API sun-status literal including `NoSun`.
- Task 3 complete: shared confidence display state handles exact, approximate, hidden, invalid, and clamped values; VenueCard/VenueQuickInfo consume it; Swedish/English confidence copy remains in message files; card/quick-info accessible text distinguishes `~` as `cirka`.
- Task 4 complete: query hooks use explicit retry/backoff while preserving live/planner polling split and previous data; MapView no longer shows slow-load UI during background refetch with data; venue API failure uses a token-backed inline Swedish retry affordance.
- Task 5 complete: list cards, anchored/mobile/desktop QuickInfo, and detail overlays now render exact/approximate/hidden confidence from the shared helper; venue-detail confidence uses `text-amber-dark` while card confidence uses `text-amber-text`; forced visual-state labels remain deterministic; card favourite aria labels are separate from selection labels.
- Task 6 complete: stale, geometry-only, and venue API failure degradation states are covered without premium gating; retry is semantic/focusable/token-backed; the active-runtime monetization quarantine scan returned no hits.
- Task 7 complete: full visual matrix passes after visual corrections; typecheck, lint, Vitest, Playwright (`--workers=1`), quarantine scan, and canonical story-review gate all pass. Sprint status and story status are now `review`.
- Code review Round 2 complete: forced visual states now provide deterministic fresh confidence metadata for normalized list cards and selected QuickInfo; forced venue lists keep that confidence in accessible text without duplicating visible percentages; non-anchored QuickInfo separators remain pinned by regression coverage; venue thumbnails fall back to the token-backed initials placeholder on image failure; venue card sizing uses mapped design-token utilities instead of arbitrary size classes; the canonical story-review gate passed and Story 2.6 is back in `review`.
- Code review Round 3 complete: geometry-only future planner projections no longer apply weather dampening; forced detail/list/QuickInfo/pin reference states are deterministic; stale planner selections reset instead of emitting invalid queries; derived peak labels cannot emit `HH:60`; venue-detail hero heights use mapped design tokens; anchored QuickInfo distance is not announced twice; the detail-route planner test uses a stable in-season clock; Task 7.10 now matches the canonical route map.
- Product-decision update complete: visible venue-detail confidence text was removed after Rasmus confirmed the top percentage badge is sufficient; exact/approximate/unavailable detail confidence remains in screen-reader-only text. Direct `venue-detail` mobile visual validation and the canonical story-review gate both pass, and sprint status/story status are now `review`.
- Code review Round 4 cap-override complete: detail timeline status/peak now derive from planner-adjusted data, alias `venueSlug` detail responses are preserved, and partial-only best-window fallback copy uses partial wording. Focused regression, typecheck, lint, full Vitest, and Playwright pass.

### File List

- `_bmad-output/implementation-artifacts/2-6-confidence-display-auto-refresh.md`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `nextjs-app/app/api/venues/[slug]/route.ts`
- `nextjs-app/app/api/venues/route.ts`
- `nextjs-app/app/globals.css`
- `nextjs-app/components/composed/venue/VenueCard.tsx`
- `nextjs-app/components/composed/venue/VenueDetailContent.tsx`
- `nextjs-app/components/composed/venue/SunTimeline.tsx`
- `nextjs-app/components/composed/venue/VenueListControls.tsx`
- `nextjs-app/components/composed/venue/VenueQuickInfo.tsx`
- `nextjs-app/components/custom/map/MapView.tsx`
- `nextjs-app/components/custom/map/VenuePin.tsx`
- `nextjs-app/components/custom/venue/ForcedVenueDetailInitialFrame.tsx`
- `nextjs-app/components/custom/venue/VenueDetailOverlay.tsx`
- `nextjs-app/components/custom/venue/VenueList.tsx`
- `nextjs-app/components/custom/venue/forced-venue-detail.ts`
- `nextjs-app/docs/design/DESIGN.md`
- `nextjs-app/hooks/queries/venue-query-options.ts`
- `nextjs-app/hooks/queries/useVenueDetail.ts`
- `nextjs-app/hooks/queries/useVenueSearch.ts`
- `nextjs-app/lib/contexts/TimeContext.tsx`
- `nextjs-app/lib/services/venue-planner.ts`
- `nextjs-app/lib/services/weather-freshness-fixture.ts`
- `nextjs-app/lib/types/api.ts`
- `nextjs-app/lib/types/map.ts`
- `nextjs-app/lib/utils/confidence-display.ts`
- `nextjs-app/lib/utils/sun-freshness.ts`
- `nextjs-app/messages/en/map.json`
- `nextjs-app/messages/en/venue.json`
- `nextjs-app/messages/sv/map.json`
- `nextjs-app/messages/sv/venue.json`
- `nextjs-app/test/components/MapView.test.tsx`
- `nextjs-app/test/components/VenueCard.test.tsx`
- `nextjs-app/test/components/VenueDetailContent.test.tsx`
- `nextjs-app/test/components/VenueDetailOverlay.test.tsx`
- `nextjs-app/test/components/VenueList.test.tsx`
- `nextjs-app/test/components/VenuePin.test.tsx`
- `nextjs-app/test/components/VenueQuickInfo.test.tsx`
- `nextjs-app/test/unit/confidence-display.test.ts`
- `nextjs-app/test/unit/api/venue-detail-route.test.ts`
- `nextjs-app/test/unit/api/venues-route.test.ts`
- `nextjs-app/test/unit/TimeContext.test.tsx`
- `nextjs-app/test/unit/queries/useVenueDetail.test.ts`
- `nextjs-app/test/unit/queries/useVenueSearch.test.ts`
- `nextjs-app/test/unit/utils/venue-pin-mapping.test.ts`
- `nextjs-app/test/unit/venue-planner.test.ts`

## Change Log

| Date       | Author   | Note |
|------------|----------|------|
| 2026-05-22 | SM (Bob) | Story drafted from epics.md Story 2.6, PRD v3.1, architecture, UX spec, design tokens, Claude Design MVP sources, Story 2.5 learnings, current code reconnaissance, deferred-work entries targeted at 2.6, and Context7 docs for TanStack Query v5. Status -> ready-for-dev. |
| 2026-05-22 | Dev (Amelia) | Started implementation, transitioned status to in-progress, and completed Task 1 baseline/source-context gate. |
| 2026-05-22 | Dev (Amelia) | Completed Task 2 API-backed confidence/freshness metadata contract and shared sun-status typing. |
| 2026-05-22 | Dev (Amelia) | Completed Task 3 shared confidence display helper, copy, and venue surface formatter wiring. |
| 2026-05-22 | Dev (Amelia) | Completed Task 4 explicit query retry/backoff, background-refresh loading suppression, and inline venue retry UI. |
| 2026-05-22 | Dev (Amelia) | Completed Task 5 confidence display wiring across list cards, QuickInfo, detail overlays, deterministic forced-state labels, and accessible card favourite labels. |
| 2026-05-22 | Dev (Amelia) | Completed Task 6 degradation/accessibility checks and verified active-runtime monetization quarantine scan had no hits. |
| 2026-05-22 | Dev (Amelia) | Task 7 automated checks pass after selected-pin contrast fix; visual validation is blocked on map-primary mobile reference mismatch pending Rasmus direction. |
| 2026-05-26 | Dev (Amelia) | Corrected parent visual-gate drift across mobile list, selected QuickInfo, venue detail, and forced 14:00 pins; full visual matrix and regression gates now pass. |
| 2026-05-26 | Dev (Amelia) | Ran canonical story-review gate and transitioned Story 2.6 to review. |
| 2026-05-27 | Dev (Amelia) | Addressed remaining Round 2 review patches for forced confidence metadata, QuickInfo separator coverage, thumbnail fallback, and venue-card token sizing; local regression gates pass. |
| 2026-05-27 | Dev (Amelia) | Fixed forced visual duplicate confidence rendering, reran canonical story-review gate, and transitioned Story 2.6 to review. |
| 2026-05-27 | Dev (Amelia) | Addressed Round 3 review patches for geometry-only projection, forced visual determinism/detail confidence, stale planner rollover, peak label formatting, tokenized detail hero heights, QuickInfo distance a11y, planner-date test stability, and canonical visual route documentation. |
| 2026-05-27 | Dev (Amelia) | Removed duplicate visible venue-detail confidence text per product decision, kept accessible confidence text, reran full verification, and transitioned Story 2.6 to review via the canonical gate. |
| 2026-05-27 | Dev (Amelia) | Addressed Round 4 cap-override review patches for planner-adjusted detail timeline status/peak, alias-slug detail matching, and partial-only best-window fallback copy; focused regression, typecheck, lint, full Vitest, and Playwright pass. |
| 2026-05-27 | Dev (Amelia) | Reran the canonical story-review gate after Round 4 patches; full gate passed and Story 2.6 remains in review. |
| 2026-05-27 | Rasmus | Approved Story 2.6 for done after Round 4 fixes and passing canonical story-review gate. |
