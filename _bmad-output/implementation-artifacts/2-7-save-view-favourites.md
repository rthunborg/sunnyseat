# Story 2.7: Save & View Favourites

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **MVP scope correction (2026-05-19):** Favourites are free MVP functionality. Do not reintroduce Season Pass, Swish, paywall, premium context, lock badges, or premium copy into active runtime paths.
>
> **Visual source refresh (2026-05-21):** Active MVP references come only from `SunnySeat MVP Mobile Unlocked.html` and `SunnySeat MVP Desktop Unlocked.html`. Post-MVP Unlocked/Locked pages are future-only.

## Story

As a **user**,
I want to save my favourite venues for quick access,
So that I can return to venues I like without searching again.

## Acceptance Criteria

**Given** the user is viewing a venue detail or VenueQuickInfo card
**When** they tap the favourite/heart button
**Then** the venue is saved to their favourites list in localStorage
**And** the heart button fills to indicate favourited state (GlassButton with `color-glass-lavender` background)
**And** tapping again removes the venue from favourites (toggle behaviour)
**And** no premium gate, lock badge, Season Pass prompt, or payment UI appears

**Given** the user navigates to the Favoriter tab (mobile bottom nav) or favourites section
**When** the favourites list renders
**Then** it shows all saved venues as VenueCards with current sun state data
**And** venues are sorted by sun exposure relevance (sunny first, then closest)
**And** each card shows the same information as the venue list (thumbnail, name, sun range, confidence, distance)

**Given** the user has no saved favourites
**When** the favourites section renders
**Then** an empty state message appears: "Du har inga sparade platser än."

**Given** favourites are stored in localStorage
**When** the user returns to the app in a later session
**Then** their favourites persist (no account needed)
**And** no PII is stored — only venue IDs

**Given** the favourite button needs accessibility
**When** the button renders
**Then** it has an `aria-label` ("Spara som favorit" / "Ta bort favorit") and visible focus indicator

**Given** Story 2.7 is ready for review
**When** the implementation is scanned for active monetization dependencies
**Then** favourites code paths do not import or call `PremiumContext`, `usePremiumStatus`, `queryKeys.premium`, `/api/payments/*`, Swish helpers, paywall components, lock-badge components, Season Pass copy, or premium JSON messages
**And** saved favourite state is available to every user without account, payment, premium flag, or recovery flow

**Design Gate Criteria:**
- **Visual:** Matches active visual reference `favourites-tab` after MVP rebaseline removes any lock-badge/paywall expectations.
- **Behaviour:** All interactions and states defined in UX spec §favourites are implemented as free MVP functionality.
- **Animation:** Heart toggle fill and favourites list entrance animations match spec timings (±50 ms tolerance)
- **Visual validation:** Screenshot comparison against `favourites-tab` passes before QA handoff.

## Tasks / Subtasks

- [x] **Task 1: Baseline and source-context check** (AC: all)
  - [x] 1.1 Run `cd nextjs-app && npx tsc --noEmit` before editing. Stop and surface any errors outside story scope.
  - [x] 1.2 Run `cd nextjs-app && npx eslint . --quiet` before editing. Stop and surface any errors outside story scope.
  - [x] 1.3 Read `AGENTS.md`, `project-context.md`, `nextjs-app/docs/design/DESIGN.md`, `nextjs-app/docs/design/references/claude-design/README.md`, `STATE-MAPPING.md`, `REBASELINE-LOG.md`, and UX spec sections for navigation, venue list, venue detail, loading/empty states, and visual source rules.
  - [x] 1.4 Read active MVP prototype sources for visual intent only: `project/src/App.jsx`, `project/src/BottomSheet.jsx`, `project/src/VenueDetail.jsx`, `project/src/QuickInfo.jsx`, `project/src-desktop/App.jsx`, `project/src-desktop/Sidebar.jsx`, `project/src-desktop/QuickInfo.jsx`, and `project/src-desktop/VenueDetail.jsx`. Do not copy DOM structure, inline CSS values, prototype-only state names, or Post-MVP locked/paywall code.
  - [x] 1.5 Review Story 2.6 completion notes before editing. Preserve its confidence/freshness contract: `confidence` is prediction certainty, `sunExposurePercent` is direct-sun amount, live queries poll every 5 minutes, planner queries do not poll, and forced visual states remain deterministic.

- [x] **Task 2: Add free local favourites state and storage** (AC: #1, #3, #4, #5, #6)
  - [x] 2.1 Add `nextjs-app/lib/services/favourites-storage.ts` as a React-free localStorage adapter. Store only a JSON array of venue ID strings under the SunnySeat-specific key `sunnyseat_favourite_ids`. Sanitize invalid values, de-dupe IDs, preserve insertion order for deterministic display fallback, and catch `SecurityError` / quota / malformed JSON without crashing the app.
  - [x] 2.2 Add focused unit coverage for the storage adapter: empty state, read/write persistence, toggle add/remove, duplicate IDs, malformed JSON reset, non-string array members ignored, storage read failure, and storage write failure.
  - [x] 2.3 Add `nextjs-app/lib/contexts/FavouritesContext.tsx` plus `nextjs-app/hooks/useFavourites.ts` for shared client state. The hook exposes `favouriteIds`, `isFavourite(id)`, `toggleFavourite(id)`, `addFavourite(id)`, and `removeFavourite(id)`.
  - [x] 2.4 Mount `FavouritesProvider` in `nextjs-app/components/custom/layout/AppContextProviders.tsx` inside the existing client provider tree. It must not depend on premium/payment state and must not import backend modules.
  - [x] 2.5 Ensure server render/hydration is stable: the provider starts from an empty deterministic snapshot, hydrates from localStorage in an effect, and does not write storage during dev-only forced visual rendering unless the user actually toggles a favourite.
  - [x] 2.6 Add unit/component tests for `useFavourites` persistence and same-session state propagation across multiple consumers.

- [x] **Task 3: Fetch saved favourite venues by ID through the API boundary** (AC: #2, #4, #6)
  - [x] 3.1 Extend `nextjs-app/lib/query-keys.ts` with a favourites/list key factory, e.g. `queryKeys.venues.favourites({ ids, lat, lng, date, time })`. Normalize/sort query-key filter fields consistently with existing key factories; do not construct query keys inline.
  - [x] 3.2 Extend `nextjs-app/app/api/venues/route.ts` with an `ids` filter for favourite venue IDs. The filter must bypass the radius inclusion check so saved venues outside the current nearby radius still appear, while still requiring `lat`/`lng` so distance can be computed.
  - [x] 3.3 Validate the `ids` parameter defensively: support comma-separated IDs from the hook, trim/de-dupe, reject control characters, cap the list to the existing venue result limit, and keep q/search behaviour separate from favourite-ID filtering.
  - [x] 3.4 Preserve the existing venue response contract, cache headers, freshness headers, rate limit, planner date/time handling, geometry-only weather handling, and server-side sorting helpers. Do not let client components import `VENUE_FIXTURE`, `lib/solar`, Supabase clients, weather adapters, or middleware.
  - [x] 3.5 Add `nextjs-app/hooks/queries/useFavouriteVenues.ts`. It calls `/api/venues` with `ids`, `lat`, `lng`, optional free planner `date`/`time`, and the same freshness/header enrichment pattern as `useVenueSearch`.
  - [x] 3.6 For live/current-time favourites, use the same 5-minute stale/refetch interval and retry/backoff policy as `useVenueSearch`. For explicit planner date/time, keep non-polling behaviour from Story 2.6.
  - [x] 3.7 Add API route tests for `ids`: returns all requested saved venues regardless of radius, computes distance, keeps current sun state/confidence fields, rejects malformed IDs, de-dupes duplicate IDs, returns an empty list for unknown IDs, and preserves freshness headers.
  - [x] 3.8 Add query hook tests for `useFavouriteVenues`: enabled only with valid coordinates and non-empty IDs, URL/query-key normalization, abort-signal forwarding, freshness metadata, previous data during planner changes, live 5-minute polling, planner non-polling, and retry policy.

- [x] **Task 4: Wire heart toggle surfaces across QuickInfo, detail, and venue cards** (AC: #1, #5, #6)
  - [x] 4.1 Update `VenueQuickInfo` to render an active favourite heart affordance in the image/header area matching the refreshed MVP visual outcome. Because `VenueQuickInfo` lives in `components/composed/venue/`, keep the implementation local or use composed/ui dependencies only; do not import from `components/custom/`.
  - [x] 4.2 Update `VenueQuickInfo` props and `MapView` wiring so selected-venue quick info receives `isFavourite`, `onFavouriteToggle`, and the Swedish labels `Spara som favorit` / `Ta bort favorit`.
  - [x] 4.3 Update `VenueDetailOverlay` so its existing disabled heart chrome becomes an active toggle on both mobile and desktop. Filled state uses token-backed `bg-glass-lavender` / current-color fill or the closest mapped token utilities from `DESIGN.md`; do not copy the prototype's pink gradient heart.
  - [x] 4.4 Wire venue detail favourite state by `fallbackVenue.id` / `detail.id`, not slug. Toggling from detail must update the same shared state used by QuickInfo, VenueCard, and `/favoriter`.
  - [x] 4.5 Update `VenueList` to pass `isFavourite` and `onFavouriteToggle` into existing `VenueCard` heart props. Remove the current disabled favourite button state when a toggle handler is available.
  - [x] 4.6 Update `VenueCard` labels so the heart accessible name switches between `"Spara som favorit"` and `"Ta bort favorit"` while still preserving card selection labels. Keep `aria-pressed`, visible focus, and minimum `size-11` target.
  - [x] 4.7 Add component tests for QuickInfo, VenueDetailOverlay, and VenueCard toggle behaviour: initial unfilled state, filled state, click calls toggle with the correct venue ID, click does not also select/open the venue, aria-label changes, `aria-pressed` changes where applicable, and focus ring class remains present.

- [x] **Task 5: Implement the `/favoriter` map-backed favourites destination** (AC: #2, #3, #4, #6)
  - [x] 5.1 Add `nextjs-app/app/[locale]/favoriter/page.tsx`. It should render the same persistent map shell as the home route, not a marketing/standalone page. Reuse `MapViewDynamic` and `OnboardingGateWithSuspense` or extract a tiny shared route shell if needed.
  - [x] 5.2 Teach `MapView` to derive list mode from the current pathname: `/favoriter` opens the favourites list/section, `/` opens the nearby list. Preserve locale-prefix stripping the same way `MobileNavBar` does.
  - [x] 5.3 Enable the desktop `Favoriter` segment in `VenueListControls` and route/switch to the favourites section. The mobile bottom nav already links to `/favoriter`; keep it as the primary mobile entry point.
  - [x] 5.4 Broaden `MobileNavBar` active-state matching from strict equality to pathname-prefix matching with explicit root handling, so `/favoriter` and future nested favourites routes highlight the Favoriter tab without making `/` match every page.
  - [x] 5.5 Add `components/custom/favourites/FavouritesList.tsx` or an equivalent MapView branch that renders saved venues with `VenueCard` using the same metadata as the normal venue list: thumbnail, name, sun range, confidence, and distance.
  - [x] 5.6 Sort favourite venues by the existing venue-list relevance order: sunny/current sun exposure first, then closest. Reuse `sortVenuesForList(venues, 'sun')` unless Story 2.6's confidence/sun-exposure separation requires a stricter helper; do not duplicate sorting logic silently.
  - [x] 5.7 Render the exact empty-state message from AC #3 when `favouriteIds.length === 0`: `"Du har inga sparade platser än."` Add optional helper copy only if it is token-backed, Swedish, and does not replace the required sentence.
  - [x] 5.8 If favourite IDs exist but venue data fetch fails, use the existing matter-of-fact inline retry/error pattern. Do not show a full-page spinner; use shadcn `Skeleton` for initial list loading if needed.
  - [x] 5.9 Add `messages/sv/favourites.json` and `messages/en/favourites.json` or extend an existing scoped namespace deliberately. If new files are used, add `favourites` to `SCOPES` in `nextjs-app/i18n/request.ts`.

- [x] **Task 6: Dev-only visual state and MVP reference alignment** (AC: design gate, #1, #2, #3, #6)
  - [x] 6.1 Ensure `project-context.md` already maps `favourites-tab` to `/favoriter` for both mobile and desktop. Do not change the route map unless the implementation genuinely needs a new route; any route-map/capture recipe change must update `REBASELINE-LOG.md`.
  - [x] 6.2 Make the `favourites-tab` visual state deterministic. The reference capture recipe seeds prototype key `sunny_favs`, but the implementation visual validator currently seeds only `sunnyseat_onboarded`. Update `.claude/scripts/visual-validate.sh` so `SCREEN_ID=favourites-tab` also seeds `sunnyseat_favourite_ids` with fixture venue IDs such as `["1","2"]` before the screenshot.
  - [x] 6.3 Because the visual-validator storage state is a capture-recipe change, update `nextjs-app/docs/design/references/REBASELINE-LOG.md` in the same operation. No reference PNG needs to change unless the visual comparison proves the active reference itself is obsolete.
  - [x] 6.4 Verify old locked-favourites or lock-badge expectations are not present in the active MVP implementation. If a reference PNG still depicts obsolete lock/paywall chrome, stop and ask Rasmus for explicit accept-with-rationale or rebaseline direction before moving to review.
  - [x] 6.5 Keep Post-MVP Unlocked/Locked prototype files out of MVP implementation decisions. They are future-only for Season Pass, Swish, payment, premium recovery, and locked flows.
  - [x] 6.6 Use `DESIGN.md` tokens only. In particular, favourite glass state comes from `color-glass-lavender`; loading states use shadcn `Skeleton`; buttons retain `radius-pill`, token shadows, and 44x44 px targets.

- [x] **Task 7: MVP monetization quarantine and accessibility** (AC: #1, #5, #6)
  - [x] 7.1 Run the MVP monetization quarantine scan before review: `rg -n "PremiumContext|usePremiumStatus|queryKeys\\.premium|/api/payments|Swish|swish|paywall|premium gate|lock badge|Season Pass|Säsongskortet" nextjs-app/app nextjs-app/components nextjs-app/hooks nextjs-app/lib nextjs-app/messages`.
  - [x] 7.2 Remove active-runtime hits in favourites code paths. If a match is an inactive Future Monetization reference, document why it is non-runtime in the story completion notes.
  - [x] 7.3 Every favourite toggle must have a semantic button, stateful accessible name, visible focus ring, `aria-pressed` where applicable, and a minimum 44x44 px target.
  - [x] 7.4 Favourite state must not be communicated by color alone. The filled heart icon, `aria-pressed`, and label change must all reflect the state.
  - [x] 7.5 Respect `prefers-reduced-motion`: heart fill/list entrance transitions use token durations and degrade to instant/no non-essential animation under reduced motion.

- [x] **Task 8: Tests, visual validation, and review gate** (AC: all)
  - [x] 8.1 Add/extend unit tests for `favourites-storage`, `useFavourites`, `queryKeys.venues.favourites`, `/api/venues?ids=...`, and `useFavouriteVenues`.
  - [x] 8.2 Add/extend component tests for `MobileNavBar`, `VenueListControls`, `VenueCard`, `VenueQuickInfo`, `VenueDetailOverlay`, `MapView`, and `FavouritesList`/favourites branch.
  - [x] 8.3 Add Playwright coverage for a user saving a venue, navigating to `/favoriter`, seeing the saved venue with current sun metadata, toggling it off, and seeing the empty state. Seed localStorage in one test to prove persistence across reload.
  - [x] 8.4 Run `cd nextjs-app && npx tsc --noEmit`.
  - [x] 8.5 Run `cd nextjs-app && npx eslint . --quiet`.
  - [x] 8.6 Run `cd nextjs-app && npx vitest run`.
  - [x] 8.7 Run `cd nextjs-app && npx playwright test` because this story adds a real route, navigation state, localStorage persistence, and cross-surface UI behaviour.
  - [x] 8.8 Run `.\scripts\run-sh.ps1 scripts/visual-validate.sh favourites-tab "/favoriter" mobile`.
  - [x] 8.9 Run `.\scripts\run-sh.ps1 scripts/visual-validate.sh favourites-tab "/favoriter" desktop`.
  - [x] 8.10 Run parent-screen visual sanity checks for favourite affordances and obsolete lock-badge removal: `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-panel-venues "/?_state=map-panel-venues&_time=14:00" mobile`, `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-with-selected-venue "/?venue=test-venue-sunny&_state=map-with-selected-venue&_time=14:00" mobile`, `.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail&_time=14:00" mobile`, and `.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail&_time=16:30" desktop`.
  - [x] 8.11 Run the MVP monetization quarantine scan from Task 7.1.
  - [x] 8.12 Before changing sprint status to `review`, run `.\scripts\run-sh.ps1 scripts/story-review.sh 2-7-save-view-favourites`. Do not directly edit sprint status to `review`.

### Review Findings

- [x] [Review][Patch] Out-of-radius favourite cards cannot become selected map venues [nextjs-app/components/custom/map/MapView.tsx:388] — resolved by passing the selected `VenueDataDto` preview into `selectVenue`.
- [x] [Review][Patch] Blocked `window.localStorage` access can still crash favourites hydration [nextjs-app/lib/services/favourites-storage.ts:3] — resolved by guarding the `window.localStorage` getter and covering blocked getter/read/write paths.
- [x] [Review][Patch] Favourite venue fetch failures render as the empty favourites state instead of inline retry/error UI [nextjs-app/components/custom/favourites/FavouritesList.tsx:37] — resolved with an inline Swedish retry/error state.
- [x] [Review][Patch] Removed favourites can remain visible while `keepPreviousData` serves stale venue rows [nextjs-app/hooks/queries/useFavouriteVenues.ts:68] — resolved with current-ID-filtered placeholder data.
- [x] [Review][Patch] Persisted favourite IDs are not capped/sanitized before URL/API parsing, and the API cap is off by one [nextjs-app/app/api/venues/route.ts:115] — resolved with shared storage sanitization/capping and API cap correction.
- [x] [Review][Patch] Favourites ordering can switch to distance-only, violating the required sunny-first relevance order [nextjs-app/components/custom/favourites/FavouritesList.tsx:49] — resolved by forcing favourites cards through sunny-first list ordering.
- [x] [Review][Patch] Desktop `Nära mig` segment is inert on `/favoriter` because route-forced list mode ignores the state update [nextjs-app/components/custom/map/MapView.tsx:113] — resolved with route-aware desktop segment switching.
- [x] [Review][Patch] `favourites-tab` is not deterministic in the route map and was skipped by the canonical story-review visual gate [project-context.md:181] — resolved with `/favoriter?_state=favourites-tab`, a REBASELINE-LOG entry, and `screen_id: favourites-tab` in this story record.
- [x] [Review][Patch] Venue detail close buttons expose `aria-pressed` as if they were toggle buttons [nextjs-app/components/custom/venue/VenueDetailOverlay.tsx:242] — resolved by separating visual active state from toggle pressed state.
- [x] [Review][Patch] Required Playwright save-flow coverage is missing; the added E2E test only seeds storage directly [nextjs-app/test/e2e/favourites.spec.ts:19] — resolved with a mobile save-from-list flow before navigating to `/favoriter`.
- [x] [Review][Patch] Active favourite controls lack direct component regression coverage for QuickInfo/detail/card toggle behaviour [nextjs-app/components/composed/venue/VenueQuickInfo.tsx:353] — resolved with direct component toggle tests for all three surfaces.
- [x] [Review][Patch] Repeated venue-card favourite buttons have duplicate generic accessible names [nextjs-app/components/composed/venue/VenueCard.tsx:206] — resolved by appending the venue name to generic card favourite labels.
- [x] [Review][Patch] Story header status still says `in-progress` while sprint status and the review gate moved the story to `review` [_bmad-output/implementation-artifacts/2-7-save-view-favourites.md:3] — resolved by syncing sprint status back to `in-progress`
- [x] [Review][Patch] Direct detail heart can persist a URL slug instead of the venue ID [nextjs-app/components/custom/map/MapView.tsx:273] — resolved by deriving detail favourite state only from real venue DTO IDs and disabling URL-slug fallback toggles.
- [x] [Review][Patch] Mobile `/favoriter` can remain stuck in selected-venue peek state [nextjs-app/components/custom/map/MapView.tsx:299] — resolved by clearing stale selection when entering `/favoriter` and forcing the favourites sheet to list mode.
- [x] [Review][Patch] `favourites-tab` visual validation route is not time-pinned [project-context.md:181] — resolved by pinning both route-map rows to `_time=14:00` and re-running the canonical visual gate.
- [x] [Review][Patch] Favourites sort controls can show distance as active while the list stays sunny-first [nextjs-app/components/custom/favourites/FavouritesList.tsx:84] — resolved by keeping favourites controls and list ordering on the effective sunny-first mode.
- [x] [Review][Patch] Toggling a 51st favourite creates memory/storage divergence [nextjs-app/lib/services/favourites-storage.ts:37] — resolved by sanitizing and capping the add result before updating memory and storage.
- [x] [Review][Patch] Malformed favourites storage is ignored but not reset [nextjs-app/lib/services/favourites-storage.ts:8] — resolved by removing malformed storage before returning an empty state.
- [x] [Review][Patch] Empty `ids` parameter suppresses normal venue search [nextjs-app/app/api/venues/route.ts:117] — resolved by treating an empty parsed IDs list as an absent ID filter.
- [x] [Review][Patch] Save-flow E2E does not prove the saved ID reached localStorage [nextjs-app/test/e2e/favourites.spec.ts:29] — resolved by asserting the save-flow test persists at least one string ID in `sunnyseat_favourite_ids`.
- [x] [Review][Patch] Favourite venue query runs and polls while favourites are not visible [nextjs-app/components/custom/map/MapView.tsx:130] — resolved by adding a hook-level `enabled` flag and enabling favourite venue polling only while the favourites section is visible.
- [x] [Review][Patch] Returning users can see or overwrite pre-hydration favourite state [nextjs-app/lib/contexts/FavouritesContext.tsx:40] — resolved with `isHydrated`, skeleton rendering during hydration, and pre-hydration updates based on the persisted storage snapshot.
- [x] [Review][Patch] Favourite IDs lack per-ID and raw-query length caps [nextjs-app/app/api/venues/route.ts:101] — resolved with shared per-ID storage sanitization and API raw-query/per-ID length guards before splitting large `ids` payloads.
- [x] [Review][Patch] Favourites sort controls remain interactive while distance sorting is ignored [nextjs-app/components/composed/venue/VenueListControls.tsx:65] — resolved by disabling the distance sort affordance while favourites force sunny-first ordering.
- [x] [Review][Patch] `/favoriter` remount can retain stale selected QuickInfo [nextjs-app/components/custom/map/MapView.tsx:320] — resolved by clearing selected venue state on any favourites-route render, including direct remounts.
- [x] [Review][Patch] VenueCard heart fill lacks token-timed transition [nextjs-app/components/composed/venue/VenueCard.tsx:216] — resolved by adding token-timed colour transitions and reduced-motion handling to the card favourite button.
- [x] [Review][Patch] `/favoriter` clears legitimate favourite selections [nextjs-app/components/custom/map/MapView.tsx:320] — resolved by clearing stale route-entry selection only once per favourites-route entry, so user selections made inside `/favoriter` persist.
- [x] [Review][Patch] New favourite fetches can flash the false empty state [nextjs-app/components/custom/map/MapView.tsx:502] — resolved by treating an in-flight current-ID fetch with no visible current favourites as loading instead of true-empty.
- [x] [Review][Patch] QuickInfo favourite and close controls overlap on desktop/non-anchored QuickInfo [nextjs-app/components/composed/venue/VenueQuickInfo.tsx:122] — resolved by moving the close target to the opposite side when a favourite target is present.
- [x] [Review][Patch] Stored favourite IDs can contain the API delimiter [nextjs-app/lib/services/favourites-storage.ts:62] — resolved by rejecting comma-containing favourite IDs before storage/query serialization.

## Dev Notes

### Current Implementation Snapshot

- There is no real `/favoriter` route yet. `nextjs-app/app/[locale]/page.tsx` renders the map shell and onboarding gate; the new route should reuse that same shell so the map remains the product surface.
- `MobileNavBar` already links `Favoriter` to `/favoriter`, but its active predicate is strict `normalizedPath === href`; broaden it with explicit root handling as carried from deferred work.
- `DesktopNavBar` is header/search/filter chrome only. The desktop favourites section is currently represented by the disabled `Favoriter` segment in `VenueListControls`; this story should enable that path instead of adding a marketing-style desktop page.
- `VenueCard` already has `onFavouriteToggle` and `isFavourite` props plus a heart button, but `VenueList` never passes a toggle handler, so the heart renders disabled today.
- `VenueDetailOverlay` renders favourite/share chrome as disabled `ChromeButton`s. Make the heart active and stateful; leave share behaviour for Story 6.4.
- `VenueQuickInfo` currently has no favourite heart in production, even though the MVP prototype shows favourite affordances in selected venue contexts. Add the heart without breaking existing route/more-info controls.
- `MapView` is the orchestration point for venue list, selected QuickInfo, detail overlay, planner params, geolocation, and forced visual states. This is the right integration point for favourites state and route-derived list mode.
- `useVenueSearch` and `useVenueDetail` already implement the Story 2.6 freshness/polling contract. Mirror those patterns in `useFavouriteVenues`; do not create a second data-fetching style.
- `app/api/venues/route.ts` currently supports lat/lng/radius/q/date/time and fixture-backed sun state. It has no by-ID filter. Add the smallest compatible `ids` filter instead of making the client issue one request per favourite.

### Architecture Guardrails

- Client components must not import `nextjs-app/lib/solar`, `nextjs-app/lib/weather`, `nextjs-app/lib/supabase`, `nextjs-app/lib/middleware`, or `nextjs-app/lib/buildings`.
- Server state stays in TanStack Query hooks under `hooks/queries/`. Favourite venue details/current sun data are server state; favourite ID membership is client state.
- Query keys must come from `nextjs-app/lib/query-keys.ts`.
- Keep the component dependency direction: `components/custom/` may use `components/composed/` and `components/ui/`; `components/composed/` must not import from `components/custom/`.
- Prefer pure helpers in `lib/services/` for localStorage parsing/writing and React hooks/contexts for UI state.
- MVP code must not depend on premium/payment state. Favourites are available to every user without account, payment, recovery, or future paid-status JWT.
- Use existing dependencies only: Next.js 16.2.2, React 19.2.5, TanStack Query 5.99.0, Motion 12.38.0, MapLibre 5.23.0, next-intl 4.9.1, lucide-react 1.8.0. No new package is required for this story.

### Data Contract Notes

- localStorage stores only venue IDs. Do not store venue names, coordinates, distance, confidence, visited timestamps, user profile data, or payment data in favourites storage.
- Use venue `id` / `venueId` for storage and toggling. Slugs remain URL/display identifiers and should not be the persisted favourite key.
- The API `ids` filter should return current API-backed `VenueDataDto` records so favourites inherit Story 2.6 confidence, freshness, planner, and geometry-only behaviour.
- Saved venues may be outside the current 1.5 km radius. That is why the API filter should not apply the radius inclusion check when `ids` are supplied. Distance should still be computed from current/fallback coordinates for sorting and display.
- If no favourite IDs exist, do not fetch favourite venues. Render the AC empty state immediately.
- If favourite IDs exist but the API returns no matching venues, render the same empty-state surface or a short missing-data state using Swedish copy; do not leak raw IDs.

### UX And Visual Notes

- Visual validation source: `favourites-tab` mobile and desktop references in `nextjs-app/docs/design/references/screens/{mobile,desktop}/`.
- MVP prototype state mapping: mobile seeds `sunny_favs` and clicks `Favoriter`; desktop clicks `Favoriter`. Production uses `sunnyseat_favourite_ids`, so the implementation visual-validator storage state must seed that key for `favourites-tab`.
- The UX spec does not currently have a standalone `Screen: favourites-tab` section. Use the preserved design gate from `epics.md`, the active Claude Design `favourites-tab` source/reference, and UX spec navigation/venue-list/empty-state/button patterns together.
- The required empty sentence is exact: `"Du har inga sparade platser än."`
- Favourite filled state should read as the token-backed glass/lavender heart state, not the old locked/paywall prototype gradient.
- Keep bottom nav copy from `common.nav`: `Nära mig` / `Favoriter`; no lock badge.
- Existing Story 2.6 product decision: venue-detail keeps confidence available to assistive tech but avoids duplicate visible `Säkerhet xx%`; do not reintroduce the removed duplicate line while adding favourites.
- Motion timings should use existing constants/tokens (`duration-fast`, `duration-default`, etc.) and respect `motion-reduce`.

### Previous Story Intelligence

- Story 2.6 made forced visual states deterministic and kept confidence display accessible without duplicate visible percentage text in venue-detail. Favourites visual states must not undo that.
- Story 2.6 review repeatedly caught route/visual mismatches. Use the canonical `project-context.md` routes, especially `/?venue=test-venue-sunny&_state=venue-detail&_time=14:00` for mobile detail and `/?venue=test-venue-sunny&_state=venue-detail&_time=16:30` for desktop detail.
- Story 2.6 gates sometimes needed temporary shell-only `npm`/`npx`/`jq` shims and bundled Node first on PATH. If normal `npx` is unavailable, document the alternate command path in completion notes instead of skipping checks.
- Story 2.6's final gate passed typecheck, lint, full Vitest, Playwright, and visual validation after correcting stale visual/reference assumptions. Continue that discipline; do not mark review by direct sprint-status editing.

### File Impact Expectations

Likely new files:

- `nextjs-app/app/[locale]/favoriter/page.tsx`
- `nextjs-app/components/custom/favourites/FavouritesList.tsx`
- `nextjs-app/lib/contexts/FavouritesContext.tsx`
- `nextjs-app/lib/services/favourites-storage.ts`
- `nextjs-app/hooks/useFavourites.ts`
- `nextjs-app/hooks/queries/useFavouriteVenues.ts`
- `nextjs-app/messages/sv/favourites.json`
- `nextjs-app/messages/en/favourites.json`
- Tests for the new storage, hook, query, route, route page, and favourites UI

Likely updated files:

- `nextjs-app/app/api/venues/route.ts`
- `nextjs-app/components/custom/layout/AppContextProviders.tsx`
- `nextjs-app/components/custom/layout/MobileNavBar.tsx`
- `nextjs-app/components/composed/venue/VenueCard.tsx`
- `nextjs-app/components/composed/venue/VenueQuickInfo.tsx`
- `nextjs-app/components/composed/venue/VenueListControls.tsx`
- `nextjs-app/components/custom/map/MapView.tsx`
- `nextjs-app/components/custom/venue/VenueDetailOverlay.tsx`
- `nextjs-app/components/custom/venue/VenueList.tsx`
- `nextjs-app/i18n/request.ts`
- `nextjs-app/lib/query-keys.ts`
- `.claude/scripts/visual-validate.sh`
- `nextjs-app/docs/design/references/REBASELINE-LOG.md`
- Existing relevant component/unit/e2e tests

Do not modify for this story unless a failing check proves it is necessary:

- `nextjs-app/lib/solar/`
- `nextjs-app/lib/weather/`
- `nextjs-app/lib/supabase/`
- Future monetization routes/components/hooks/messages
- Partner/review/share/push-notification implementation

### References

- `AGENTS.md` — design tokens, API boundary, Swedish copy, accessibility, frontend visual validation, and story-review gate rules.
- `project-context.md` — Screen ID -> Route Map and MVP scope correction.
- `_bmad-output/planning-artifacts/epics.md` — Story 2.7 ACs and deferred items.
- `_bmad-output/planning-artifacts/prd.md` — FR31, MVP adoption loop, no-account/no-payment favourites.
- `_bmad-output/planning-artifacts/architecture.md` — state management, localStorage favourites, query keys, component/file structure, provider guidance.
- `_bmad-output/planning-artifacts/ux-design-specification.md` — navigation, venue list/detail, button hierarchy, empty/loading states, motion/reduced-motion rules.
- `nextjs-app/docs/design/DESIGN.md` — `color-glass-lavender`, button, nav, card, motion, spacing, and accessibility token rules.
- `nextjs-app/docs/design/references/claude-design/README.md` and `STATE-MAPPING.md` — active MVP prototype and `favourites-tab` capture recipe.
- `nextjs-app/docs/design/references/REBASELINE-LOG.md` — MVP source refresh and required rebaseline/acceptance process.
- `_bmad-output/implementation-artifacts/2-6-confidence-display-auto-refresh.md` — confidence/freshness contract and visual-gate learnings.
- `_bmad-output/implementation-artifacts/deferred-work.md` — Story 2.7 carried entries for nested favourites active state and persisted free favourites.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex (Amelia)

### Debug Log References

- 2026-05-28: Baseline passed before edits via `cd nextjs-app && npx.cmd tsc --noEmit` and `cd nextjs-app && npx.cmd eslint . --quiet`; PowerShell blocked `npx.ps1`, so `.cmd` shim was used.
- 2026-05-28: Red focused tests failed as expected for missing `favourites-storage`, `FavouritesContext`, `useFavouriteVenues`, `queryKeys.venues.favourites`, and `/api/venues?ids=...`; green focused rerun passed 44 tests.
- 2026-05-28: `npx.cmd tsc --noEmit` passed; `npx.cmd eslint . --quiet` passed.
- 2026-05-28: `npx.cmd vitest run --pool=threads --maxWorkers=1` passed (40 files, 314 tests).
- 2026-05-28: `npx.cmd playwright test --workers=1` passed (40 passed, 27 skipped).
- 2026-05-28: MVP monetization quarantine scan returned no active-runtime hits.
- 2026-05-28: First visual gate attempt with `.\scripts\run-sh.ps1` was blocked by PowerShell execution policy; rerun used `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-sh.ps1 ...`.
- 2026-05-28: `favourites-tab` mobile visual gate failed after deterministic seeding because active reference expected the empty `0 favoriter` state while Story 2.7 Task 6.2 requires seeding `sunnyseat_favourite_ids=["1","2"]` and implementation correctly renders saved venue cards.
- 2026-05-28: Rasmus approved rebaselining `favourites-tab` to the seeded saved-favourites state. Mobile and desktop reference PNGs were regenerated from `/favoriter` with `sunnyseat_favourite_ids=["1","2"]`; both visual gates passed after rebaseline.
- 2026-05-28: Parent visual sanity check `map-panel-venues` mobile passed. Parent visual sanity check `map-with-selected-venue` mobile failed because the active reference did not include the Story 2.7 QuickInfo favourite affordance and still expected older selected-venue popup/list details; Rasmus approved rebaseline, the mobile reference was regenerated, and the gate passed.
- 2026-05-28: Parent visual sanity checks `venue-detail` mobile and desktop passed.
- 2026-05-28: Canonical review gate passed via `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-sh.ps1 scripts/story-review.sh 2-7-save-view-favourites`; it ran lint, typecheck, Vitest, parent visual gates, wrote validation artifact `2-7-save-view-favourites-review-20260528-153033.log`, and moved sprint status to `review`.
- 2026-05-28: Review-fix baseline passed via `npx.cmd tsc --noEmit` and `npx.cmd eslint . --quiet`.
- 2026-05-28: Focused review-regression suite passed: `npx.cmd vitest run test/unit/favourites-storage.test.ts test/unit/api/venues-route.test.ts test/unit/queries/useFavouriteVenues.test.ts test/components/FavouritesList.test.tsx test/components/MapView.test.tsx test/components/VenueCard.test.tsx test/components/VenueQuickInfo.test.tsx test/components/VenueDetailOverlay.test.tsx` (8 files, 116 tests).
- 2026-05-28: Full post-fix gates passed: `npx.cmd tsc --noEmit`, `npx.cmd eslint . --quiet`, `npx.cmd vitest run` (40 files, 327 tests), and `npx.cmd playwright test --workers=1` (41 passed, 28 skipped).
- 2026-05-28: MVP monetization quarantine scan returned no active-runtime hits.
- 2026-05-28: Canonical review gate passed via `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-sh.ps1 scripts/story-review.sh 2-7-save-view-favourites`; it ran lint, typecheck, Vitest, `favourites-tab` mobile/desktop visual validation, parent visual gates, wrote validation artifact `2-7-save-view-favourites-review-20260528-164421.log`, and moved sprint status to `review`.
- 2026-05-28: Round 2 red focused regression suite failed as expected for direct-detail slug toggling, stale mobile `/favoriter` peek state, favourites sort-control drift, malformed storage reset, favourite cap divergence, and empty-`ids` search suppression.
- 2026-05-28: Round 2 focused regression suite passed: `npx.cmd vitest run test/components/MapView.test.tsx test/unit/favourites-storage.test.ts test/unit/api/venues-route.test.ts` (3 files, 84 tests).
- 2026-05-28: Round 2 full gates passed: `npx.cmd tsc --noEmit`, `npx.cmd eslint . --quiet`, `npx.cmd vitest run` (40 files, 332 tests), and `npx.cmd playwright test --workers=1` (41 passed, 28 skipped).
- 2026-05-28: Round 2 MVP monetization quarantine scan returned no active-runtime hits.
- 2026-05-28: Round 2 canonical review gate passed via `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-sh.ps1 scripts/story-review.sh 2-7-save-view-favourites`; it ran lint, typecheck, Vitest, `favourites-tab` mobile/desktop visual validation on `/favoriter?_state=favourites-tab&_time=14:00`, parent visual gates, and wrote validation artifact `2-7-save-view-favourites-review-20260528-172041.log`. Story was already marked `review`, so no sprint-status update was needed.
- 2026-05-29: Round 3 baseline passed before edits via `npx.cmd tsc --noEmit` and `npx.cmd eslint . --quiet`.
- 2026-05-29: Round 3 red focused regression suite failed as expected for hidden favourites polling, pre-hydration state, ID length caps, inert sort controls, stale `/favoriter` selection, and VenueCard heart transition timing.
- 2026-05-29: Round 3 focused regression suite passed: `npx.cmd vitest run test/components/MapView.test.tsx test/unit/favourites-storage.test.ts test/unit/api/venues-route.test.ts test/unit/queries/useFavouriteVenues.test.ts test/unit/useFavourites.test.tsx test/components/VenueCard.test.tsx --pool=threads --maxWorkers=1` (6 files, 106 tests).
- 2026-05-29: Round 3 full gates passed: `npx.cmd tsc --noEmit`, `npx.cmd eslint . --quiet`, `npx.cmd vitest run --pool=threads --maxWorkers=1` (40 files, 337 tests), and `npx.cmd playwright test --workers=1` (41 passed, 28 skipped).
- 2026-05-29: Round 3 MVP monetization quarantine scan returned no active-runtime hits.
- 2026-05-29: Round 3 canonical review gate passed via `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-sh.ps1 scripts/story-review.sh 2-7-save-view-favourites`; it ran lint, typecheck, Vitest, `favourites-tab` mobile/desktop visual validation, parent visual gates, wrote validation artifact `2-7-save-view-favourites-review-20260529-092540.log`, and moved sprint status to `review`.
- 2026-05-29: Round 4 override review found 4 patch findings and 1 dismissed cap finding; focused regression suite passed: `npx.cmd vitest run test/components/MapView.test.tsx test/components/VenueQuickInfo.test.tsx test/unit/favourites-storage.test.ts test/unit/queries/useFavouriteVenues.test.ts --pool=threads --maxWorkers=1` (4 files, 71 tests).
- 2026-05-29: Round 4 post-fix gates passed: `npx.cmd tsc --noEmit`, `npx.cmd eslint . --quiet`, and `npx.cmd vitest run --pool=threads --maxWorkers=1` (40 files, 338 tests).
- 2026-05-29: Round 4 MVP monetization quarantine scan returned no active-runtime hits.
- 2026-05-29: Round 4 canonical story-review gate passed via `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-sh.ps1 scripts/story-review.sh 2-7-save-view-favourites`; it ran lint, typecheck, Vitest, `favourites-tab` mobile/desktop visual validation, parent visual gates, wrote validation artifact `2-7-save-view-favourites-review-20260529-102224.log`, and left sprint status at `review`.
- 2026-05-29: Human approval from Rasmus moved Story 2.7 from `review` to `done`.

### Completion Notes List

- Story drafted by John / Product Manager on 2026-05-28.
- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story preserves Story 2.7 ACs verbatim from `epics.md`.
- Story carries the targeted deferred-work entries for nested favourites active-state matching and persisted free favourites.
- Story explicitly requires MVP monetization quarantine before review.
- Task 1 complete: baseline typecheck/lint passed, design token docs, active MVP Claude Design sources, state mapping, rebaseline log, UX navigation/list/detail/loading sections, and Story 2.6 freshness/confidence notes were loaded before product-code edits.
- Tasks 2-3 complete: favourites now store only sanitized venue ID strings under `sunnyseat_favourite_ids`, hydrate through `FavouritesProvider`, and fetch saved venue DTOs through `/api/venues?ids=...` via centralized `queryKeys.venues.favourites`.
- Tasks 4-5 complete: `VenueCard`, `VenueQuickInfo`, and `VenueDetailOverlay` expose active token-backed favourite toggles; `/favoriter` renders the same map shell and shows saved venue cards or the exact empty-state sentence.
- Task 6 complete: visual-validator storage seeding and viewport-specific wait selectors were added, `favourites-tab` references were rebaselined to seeded saved favourites after Rasmus approval, and the route map/log now describe that saved-favourites state.
- Task 7 complete: favourite toggles have semantic buttons, `aria-pressed`, stateful labels, non-color state via filled heart, focus rings, 44 px targets, and reduced-motion-safe token transitions. Monetization quarantine scan had no hits.
- Task 8 automated code gates pass through Playwright, `favourites-tab` mobile/desktop visual validation passes after the approved seeded-reference rebaseline, and parent-screen visual sanity checks pass after the approved `map-with-selected-venue` QuickInfo rebaseline.
- Canonical story-review gate passed and transitioned Story 2.7 to `review`.
- Review patches complete: favourite list selection now carries out-of-radius preview data, blocked storage access is guarded, favourite query placeholder data is filtered to current IDs, API/storage ID caps are aligned, and `/favoriter` desktop segment switching is route-aware.
- Review patches complete: favourites list fetch failures now render an inline retry state, favourites always stay sunny-first, venue detail close/share buttons no longer expose toggle pressed state, and repeated card favourite labels include the venue name.
- Review patches complete: direct component regression coverage now exists for `VenueCard`, `VenueQuickInfo`, and `VenueDetailOverlay`; Playwright now covers saving from the live map list before `/favoriter` navigation. `screen_id: favourites-tab` is present so the canonical story-review visual gate discovers the seeded favourites reference.
- Review patch follow-up: MapLibre `areTilesLoaded()` is now guarded because Playwright exposed a route-transition crash while validating the new save-flow E2E.
- Round 2 review patches complete: detail favourite toggles no longer persist URL slugs, `/favoriter` clears stale selected-venue peek state, favourites controls cannot advertise distance sorting, storage cap/reset behavior is consistent, empty `ids=` no longer suppresses normal search, and the save-flow E2E proves localStorage persistence.
- Round 2 verification complete: focused regressions, typecheck, lint, full Vitest, Playwright, MVP monetization quarantine scan, and the canonical story-review visual gate all passed. The `favourites-tab` route map is now time-pinned to `_time=14:00`.
- Round 3 review patches complete: favourite venue queries no longer poll while hidden, pre-hydration favourites state no longer flashes true-empty or overwrites saved IDs, favourite IDs have per-ID and raw-query length caps, inert distance-sort controls are disabled in favourites mode, direct `/favoriter` remounts clear stale QuickInfo selection, and VenueCard favourite hearts use token-timed reduced-motion-safe transitions.
- Round 3 verification complete: focused regressions, typecheck, lint, full Vitest, Playwright, MVP monetization quarantine scan, and the canonical story-review visual gate all passed. Story 2.7 is back in `review`.
- Round 4 review patches complete: `/favoriter` now clears stale route-entry selection only once, newly added favourites show loading instead of a false empty state while their venue rows fetch, QuickInfo close/favourite targets no longer overlap, and comma-containing IDs are rejected before favourites storage/query serialization.
- Round 4 verification complete: focused regressions, typecheck, lint, full Vitest, MVP monetization quarantine scan, and the canonical story-review visual gate all passed. Story 2.7 moved to `done` after Rasmus approval.

### File List

- `_bmad-output/implementation-artifacts/2-7-save-view-favourites.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `.claude/scripts/visual-validate.sh`
- `nextjs-app/app/[locale]/favoriter/page.tsx`
- `nextjs-app/app/api/venues/route.ts`
- `nextjs-app/components/composed/venue/VenueCard.tsx`
- `nextjs-app/components/composed/venue/VenueListControls.tsx`
- `nextjs-app/components/composed/venue/VenueQuickInfo.tsx`
- `nextjs-app/components/custom/favourites/FavouritesList.tsx`
- `nextjs-app/components/custom/layout/AppContextProviders.tsx`
- `nextjs-app/components/custom/layout/MobileNavBar.tsx`
- `nextjs-app/components/custom/map/MapView.tsx`
- `nextjs-app/components/custom/venue/VenueDetailOverlay.tsx`
- `nextjs-app/components/custom/venue/VenueList.tsx`
- `nextjs-app/docs/design/references/REBASELINE-LOG.md`
- `nextjs-app/hooks/queries/useFavouriteVenues.ts`
- `nextjs-app/hooks/useFavourites.ts`
- `nextjs-app/i18n/request.ts`
- `nextjs-app/lib/contexts/FavouritesContext.tsx`
- `nextjs-app/lib/query-keys.ts`
- `nextjs-app/lib/services/favourites-storage.ts`
- `nextjs-app/messages/en/favourites.json`
- `nextjs-app/messages/en/venue.json`
- `nextjs-app/messages/sv/favourites.json`
- `nextjs-app/messages/sv/venue.json`
- `nextjs-app/test/components/FavouritesList.test.tsx`
- `nextjs-app/test/components/MapView.test.tsx`
- `nextjs-app/test/components/VenueCard.test.tsx`
- `nextjs-app/test/components/VenueDetailOverlay.test.tsx`
- `nextjs-app/test/components/VenueQuickInfo.test.tsx`
- `nextjs-app/test/e2e/favourites.spec.ts`
- `nextjs-app/test/setup/test-utils.tsx`
- `nextjs-app/test/unit/api/venues-route.test.ts`
- `nextjs-app/test/unit/favourites-storage.test.ts`
- `nextjs-app/test/unit/queries/useFavouriteVenues.test.ts`
- `nextjs-app/test/unit/query-keys.test.ts`
- `nextjs-app/test/unit/useFavourites.test.tsx`
- `project-context.md`

## Change Log

| Date       | Author    | Note |
|------------|-----------|------|
| 2026-05-28 | John (PM) | Story drafted from epics.md Story 2.7, PRD v3.1, architecture, UX spec, design tokens, Claude Design MVP sources, Story 2.6 learnings, current code reconnaissance, and deferred-work entries targeted at 2.7. Status -> ready-for-dev. |
| 2026-05-28 | Dev (Amelia) | Started implementation, transitioned status to in-progress, and began Task 1 baseline/source-context gate. |
| 2026-05-28 | Dev (Amelia) | Implemented free local favourites, API-backed favourite venue fetching, route-backed `/favoriter` map shell, active heart toggles, tests, and visual-validator storage seeding; story remains in-progress pending `favourites-tab` visual reference decision. |
| 2026-05-28 | Dev (Amelia) | Rebaselined `favourites-tab` mobile/desktop references to the approved seeded saved-favourites state; mobile and desktop visual gates passed. |
| 2026-05-28 | Dev (Amelia) | Rebaselined `map-with-selected-venue` mobile to preserve the approved QuickInfo favourite heart; all parent visual sanity checks passed. |
| 2026-05-28 | Dev (Amelia) | Addressed 12 review findings with regression coverage for storage/query/API hygiene, stale favourite rows, inline error retry, route-aware desktop sections, out-of-radius selected favourites, active toggle accessibility, canonical `favourites-tab` visual discovery, and save-flow E2E coverage. |
| 2026-05-28 | Dev (Amelia) | Canonical story-review gate passed after review fixes; story status -> review. |
| 2026-05-28 | Dev (Amelia) | Addressed 8 Round 2 review findings covering detail-ID safety, mobile favourites route state, time-pinned visual validation, favourites sort affordance consistency, storage cap/reset hygiene, empty `ids=` API behavior, and stronger save-flow persistence proof. |
| 2026-05-28 | Review (Amelia) | Round 3 automatic code review found 6 unresolved patch findings; story status -> in-progress. |
| 2026-05-29 | Dev (Amelia) | Addressed all 6 Round 3 review findings with regression coverage and canonical story-review gate pass; story status -> review. |
| 2026-05-29 | Review/Dev (Amelia) | Rasmus overrode the three-round cap for Round 4; addressed all 4 patch findings with regression coverage. |
| 2026-05-29 | Rasmus / Amelia | Human approval received; Story 2.7 status -> done. |
