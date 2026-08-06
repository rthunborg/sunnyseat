# Story 12.14: Hide Closed Venues (Open-at-Selected-Time Filter)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a SunnySeat visitor,
I want venue visibility and hours copy to match the date and time I selected,
so that closed venues do not clutter discovery results and retained closed favourites/search matches are clearly labelled.

## Superseded Epic Text

The following older Story 12.14 epic wording is intentionally superseded by the later product/architecture decision captured in E12-AD-07 and the UX selected-instant availability section:

- Superseded filtering wording: the epic AC said `/favoriter` should apply the same open-at-selected-time filter to "ALL sources" and hide closed venues from every map/list/favourites source.
- Superseded open questions: the epic asked whether search and favourites should hide closed venues.

Controlling replacement for implementation:

- Discovery map pins, ranked discovery rows, area/partial/fuzzy search results, counts, tag-filtered lists, and map selection previews exclude venues that are closed at the selected instant.
- Exact by-name search matches are retained when closed, labelled `Stängt vid vald tid`, and can open detail.
- Saved favourites are retained when closed, greyed/labeled accessibly, and can open detail.
- Retained closed exact/favourite venues must not restore a map pin, ranked discovery row, or open-state claim.
- Unknown hours remain visible and must not be announced as closed.

[Source: _bmad-output/planning-artifacts/epics.md#Story-12.14; _bmad-output/planning-artifacts/architecture.md#E12-AD-07; _bmad-output/planning-artifacts/ux-design-specification.md#Selected-Instant-Availability--Hours]

## Acceptance Criteria

1. A shared client-safe availability predicate exists for selected-time filtering.
   - Add or extend a pure utility near `nextjs-app/lib/utils/opening-hours.ts` that exposes `isVenueOpenAt(openingHours, selectedInstant, 'Europe/Stockholm')`.
   - It returns a tri-state result: `open`, `closed`, or `unknown`.
   - Whole `openingHours === undefined` means `unknown`.
   - Missing or `null` selected weekday means `closed`.
   - A venue is open when `open <= selected local minutes < close`.
   - Prior weekday spillover is open when the prior weekday interval has `close < open` and selected local minutes are before that prior close.
   - The helper must not use `new Date()` internally except through an explicit selected-instant argument.

2. Discovery filtering happens before map pins, ranked rows, counts, tags, and public-sun ordering.
   - Closed venues are removed from nearby/city discovery lists and all MapView pin sources.
   - Unknown-hours venues remain visible.
   - The filter stacks with active tag filters and Story 12.6 public sunny/grey logic.
   - Public sunny logic remains `sunExposurePercent > 50 && weatherGateState !== 'gated'`; do not reintroduce confidence or percentages on grey/not-sunny pins.

3. Favourites retain closed saved venues but do not pin them.
   - `/favoriter` and the map favourites sheet keep saved closed venues visible.
   - Closed favourite rows are visually greyed/labeled, have a non-color-only status label, have an accessible name including `Stängt vid vald tid`, and remain actionable for detail navigation.
   - Closed favourite rows must not be disabled-looking in a way that implies they cannot be opened.
   - Closed favourite rows are not included in `activeFavouriteVenueRows`/map pin data.

4. Search retains only exact closed name matches.
   - Exact by-name results are retained when closed and labelled `Stängt vid vald tid`.
   - Area, partial-name, fuzzy, and normal discovery search results exclude closed venues.
   - Selecting a retained closed exact-name result opens detail without restoring a map pin.
   - Exact matching must use normalized full-name equality, not substring matching.

5. Hours copy and detail state use the same selected instant as the filter.
   - Live open detail may render `Öppet till HH:MM`.
   - Planned/open detail renders `Öppet vid vald tid · till HH:MM`.
   - Quick info and constrained map/list surfaces suppress the hours line when they cannot qualify it correctly for the selected instant.
   - Closed retained exact/favourite detail renders `Stängt vid vald tid` and removes any open badge or `Öppet till` claim.
   - Unknown-hours venues suppress open/closed copy; they must not show `Stängt vid vald tid`.
   - Swedish is primary and English translations must carry the same meaning and tone.

6. Selection continuity is correct when planner time changes.
   - If a same-date time scrub makes the selected discovery venue closed, remove its pin, ranked row, and quick-info preview.
   - If that venue detail is already open, keep the detail context visible, replace open claims with `Stängt vid vald tid`, and announce the change politely.
   - Clicking a different available pin still replaces the detail panel with that venue, and clicking the map canvas still closes detail.

7. API candidate caps are separated from favourite ID caps.
   - Do not raise or remove the existing favourite ID guard by reusing `MAX_RESULTS`.
   - Keep the favourites-by-ID cap and query-length cap bounded independently.
   - Introduce a separately named bounded list/search candidate cap so closed venues cannot starve the client-side open-at-selected-time filter.
   - Do not add provider fetches or server-side weather/hour recomputation for same-date time scrubs.

8. Request-count invariants from Stories 12.3 and 12.10 remain true.
   - Same-date time scrub causes zero `/api/venues` list/favourites requests and zero Met.no/provider requests after settle.
   - Date change causes exactly one relevant list/favourites request for the new selected date.
   - The TanStack query key remains date-based, not time-based.
   - Detail prefetch remains bounded and must not restart just because the user scrubs time on the same date.

9. Visual and accessibility acceptance covers the new selected-time states.
   - Add visual coverage for `screen_id: map-selected-time-open` on mobile and desktop.
   - Add visual coverage for `screen_id: map-selected-time-closed` on mobile and desktop.
   - Closed absent-from-discovery state must show no closed map pin/ranked discovery row/count contribution.
   - Retained closed favourite/search row must be visibly labelled and accessible.
   - Pin fade respects `prefers-reduced-motion`; all interactive rows/buttons remain at least 44x44 px.

## Tasks / Subtasks

- [ ] Implement the selected-instant availability utility (AC: 1, 5)
  - [ ] Extend `nextjs-app/lib/utils/opening-hours.ts` or add a colocated client-safe helper that reuses the existing canonical `WeeklyOpeningHours` shape.
  - [ ] Export a tri-state availability type and a helper for selected-instant close-time formatting.
  - [ ] Use Stockholm-local weekday and minutes for the supplied instant; handle DST through existing project date/time utilities or `date-fns-tz`.
  - [ ] Cover same-day intervals, open boundary, close boundary, before-open, after-close, missing/null day, undefined whole object, and prior-day spillover.

- [ ] Wire selected instant into MapView without making time a network key (AC: 2, 6, 8)
  - [ ] Derive one selected instant from the existing planner date and selected minutes.
  - [ ] Apply availability filtering to discovery venues before active tags, sorting, row counts, and pin data.
  - [ ] Split "all favourite rows" from "favourite rows eligible for pins" so closed favourites remain inspectable but unpinned.
  - [ ] Ensure `selectedVenuePreviewForMap`, active favourite pin rows, and regular discovery rows cannot leak a closed pin.
  - [ ] Preserve existing map click-to-close-detail and different-pin-replaces-detail behaviours while updating closed-selection continuity.

- [ ] Update retained closed favourite UI (AC: 3, 5, 9)
  - [ ] Pass availability state through `FavouritesList`, `VenueList`, and `VenueCard` without violating the component layering rule.
  - [ ] Add Swedish/English copy for `Stängt vid vald tid`.
  - [ ] Add a subdued/grey visual treatment using design tokens only; do not use raw hex, ad-hoc shadows, or arbitrary Tailwind colors outside the design system.
  - [ ] Keep the row/button actionable and keyboard/screen-reader clear.

- [ ] Update retained exact-name search behaviour (AC: 4, 5, 9)
  - [ ] Classify search results in `VenueSearchShell` after API data arrives using the same availability helper and selected instant.
  - [ ] Retain only normalized full-name exact matches when closed; filter out closed partial/area/fuzzy results.
  - [ ] Extend `VenueSearchCombobox` result rows to show the closed-at-selected-time status where applicable.
  - [ ] Ensure selecting a retained closed result opens detail but does not inject a map pin.

- [ ] Update quick-info and detail hours copy (AC: 5, 6)
  - [ ] Replace `new Date()` usage in `MapView` quick-info opening-hours derivation with the selected instant.
  - [ ] Replace `new Date()` usage in `VenueDetailContent` opening-hours derivation with the selected instant passed from the parent.
  - [ ] Remove open badges/open lines when availability is `closed`.
  - [ ] Add planned open detail copy: `Öppet vid vald tid · till HH:MM` and English equivalent.
  - [ ] Add a polite live-region announcement when an already-open detail changes to closed because selected time changed.

- [ ] Separate venue list/search caps from favourite ID caps (AC: 7)
  - [ ] In `nextjs-app/app/api/venues/route.ts`, keep favourite ID count and query-length guards bounded and independently named.
  - [ ] Add a separately named bounded list/search candidate limit used only for normal candidate responses.
  - [ ] Update route tests so a closed-heavy candidate set does not starve open visible results while favourite ID limits still reject excessive IDs.

- [ ] Add visual-state plumbing and references (AC: 9)
  - [ ] Add `map-selected-time-open` and `map-selected-time-closed` to the Screen ID -> Route Map in `project-context.md`.
  - [ ] Add deterministic forced-state handling/fixtures for both states.
  - [ ] Update `nextjs-app/scripts/capture-claude-design-refs.mjs` if needed to capture implementation-derived references.
  - [ ] Update `nextjs-app/docs/design/references/REBASELINE-LOG.md` when reference PNGs or capture recipes change.
  - [ ] Include explicit `screen_id:` markers in any validation artifact so Story 12.11's negative-scope visual extraction issue does not repeat.

- [ ] Add and run tests (AC: 1-9)
  - [ ] Unit-test the selected-instant availability boundary table.
  - [ ] Add component/integration coverage for all MapView pin/list sources, favourites retention, exact-name search retention, and selected detail state.
  - [ ] Add or extend E2E coverage for zero-fetch time scrub and one-fetch date change.
  - [ ] Add mobile and desktop visual validations for `map-selected-time-open` and `map-selected-time-closed`.
  - [ ] Run the required story checks and record exact commands/results in the Dev Agent Record.

## Dev Notes

### Existing implementation state to preserve

- The Next.js app root is `nextjs-app/`; run app commands there. Do not run `npm` or `npx` from the repository root. [Source: AGENTS.md#Stack]
- Client components must not import from backend engine modules such as `lib/solar`, `lib/weather`, `lib/supabase`, `lib/middleware`, or `lib/buildings`; all data access must stay behind API routes and query hooks. [Source: AGENTS.md#API-Boundary]
- Design tokens are binding. Read `nextjs-app/docs/design/DESIGN.md` before UI work and use Tailwind v4 token utilities/shadcn primitives instead of raw colors or copied prototype CSS. [Source: AGENTS.md#Design-Tokens]
- Swedish is the default user-facing language; add scoped `next-intl` keys and keep English parity. [Source: AGENTS.md#Swedish-Copy]

Current code facts that matter for this story:

- `nextjs-app/lib/utils/opening-hours.ts` currently formats display copy from an injected `now`, but it does not expose an open-at-selected-time predicate and does not check prior-day spillover.
- `MapView` currently builds pin DTOs from `tagFilteredVenues`, `activeFavouriteVenueRows`, and `selectedVenuePreviewForMap`; all three sources must be availability-filtered or split carefully.
- `MapView` quick-info currently derives hours from `new Date()` and can go stale across local midnight.
- `VenueDetailContent` currently derives hours from `new Date()` and can show open claims that do not match the selected planner time.
- `FavouritesList` currently filters only by saved IDs and passes rows through without availability state.
- `VenueSearchShell` currently displays API results directly and has no exact-closed retained-result state.
- `/api/venues` currently aliases list result cap and favourite ID cap through `MAX_RESULTS`; Story 12.14 must separate these concerns.

### Architecture and UX guardrails

- Canonical venue hours remain provider-neutral and use `Mon`-`Sun` single-interval rows; absent whole field means unknown, missing/null weekday means closed, and `close < open` means an overnight interval. Do not introduce Google/provider URLs, provider names, or raw source strings. [Source: _bmad-output/planning-artifacts/architecture.md#E12-AD-01]
- The open-at-selected-time predicate must run before tags, ordering, counts, pins, ranked discovery rows, exact-name search handling, favourites handling, and selection-preview handling. [Source: _bmad-output/planning-artifacts/architecture.md#E12-AD-07]
- Exact by-name closed search results and saved closed favourites are intentionally retained and labelled; this supersedes the older epic wording. [Source: _bmad-output/planning-artifacts/architecture.md#E12-AD-07]
- Planned/open detail copy is qualified as selected-time copy; constrained map/list quick surfaces suppress hours copy unless they can qualify it correctly. [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Selected-Instant-Availability--Hours]
- Unknown hours must remain visible and must not be treated or announced as closed. [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Selected-Instant-Availability--Hours]
- If a time scrub closes an already-selected venue, discovery surfaces remove it but an open detail pane preserves context and updates its availability claim. [Source: _bmad-output/planning-artifacts/architecture.md#E12-AD-07]

### Cross-story context and regression traps

- Story 12.3 established persisted day-series data and the request-count invariant: same-date time scrub is local, date change fetches once. Do not add selected time to venue/favourite query keys. [Source: _bmad-output/implementation-artifacts/12-3-persist-sun-exposure-geometry-hash-weather-snapshot-and-cold-start-path.md]
- Story 12.6 established the shared public sun predicate and removed user-facing grey-pin percentages. Do not show percentages on not-sunny/grey pins and do not create another public-sun predicate. [Source: _bmad-output/implementation-artifacts/12-6-change-map-pins-to-sunny-vs-not-sunny-colours.md; nextjs-app/lib/utils/public-sun.ts]
- Story 12.7 established the shared public venue resolver and hidden-row rule. Do not introduce an `includeHidden` public path or an alternate hidden vocabulary. [Source: _bmad-output/implementation-artifacts/12-7-hide-not-validated-venues-from-public-surfaces.md]
- Story 12.10 added bounded detail prefetching. Do not restart prefetch just because same-date time changes; only update the visible candidate list. [Source: _bmad-output/implementation-artifacts/12-10-prefetch-details-for-visible-venue-list-items.md]
- Story 12.11 found that visual extraction can accidentally match unrelated `_state=feedback`; use explicit `screen_id:` markers for new visual artifacts. [Source: _bmad-output/auto-bmad/retro-notes/epic-12.md]
- Story 12.13 removed public-facing confidence; do not add confidence copy, confidence ARIA text, or hidden screen-reader confidence. [Source: _bmad-output/implementation-artifacts/12-13-remove-confidence-language-from-public-ui.md]

### Deferred-work items this story activates

- The existing `ÖPPET` badge and `Öppet till HH:MM` line do not currently check whether the selected/current instant is inside the interval. This story must close that bug.
- `MapView` quick-info hours memo can go stale because it currently captures `new Date()` and depends only on venue/locale/translation references. This story must derive from selected instant instead.
- Closed-day and past-midnight shapes are documented/unit-tested in isolation but not seeded into a live/CI fixture. Add deterministic fixture coverage for both.

[Source: _bmad-output/implementation-artifacts/deferred-work.md]

### Suggested implementation shape

- Prefer extending `opening-hours.ts` over creating a parallel availability module unless separation materially improves clarity. The goal is one canonical selected-instant hours/availability implementation.
- Keep the utility pure and serializable. It should consume `WeeklyOpeningHours`, a `Date` selected instant, and an optional IANA timezone string. It should not reach into React state, query hooks, browser APIs, or network APIs.
- Treat the API DTO as already sanitized by venue-store coercion. If an invalid interval still reaches the helper, never fabricate open copy; tests should document the chosen fallback.
- Use one availability derivation per venue ID per selected instant in `MapView` so the map, list, favourites, quick-info, and detail paths cannot drift.
- Split datasets by intent:
  - `discoveryVenues`: raw API venues with `availability !== 'closed'`.
  - `tagFilteredVenues`: discovery venues after active tag filters.
  - `favouriteVenueRows`: all saved favourites, including closed retained rows.
  - `favouritePinRows`: favourite rows with `availability !== 'closed'`.
  - `selectedVenuePreviewForMap`: only include when selected venue is not closed for discovery/pin purposes.
- Keep retained closed detail context separate from map pin eligibility. A closed favourite/exact result may open detail, but that does not make it a discovery row.
- Do not construct query keys inline; use `nextjs-app/lib/query-keys.ts` and existing planner query helpers.

### File impact guide

Likely files to update:

- `nextjs-app/lib/utils/opening-hours.ts`
- `nextjs-app/app/api/venues/route.ts`
- `nextjs-app/components/custom/map/MapView.tsx`
- `nextjs-app/components/custom/favourites/FavouritesList.tsx`
- `nextjs-app/components/custom/venue/VenueList.tsx`
- `nextjs-app/components/composed/venue/VenueCard.tsx`
- `nextjs-app/components/composed/venue/VenueQuickInfo.tsx`
- `nextjs-app/components/composed/venue/VenueDetailContent.tsx`
- `nextjs-app/components/custom/search/VenueSearchShell.tsx`
- `nextjs-app/components/composed/search/VenueSearchCombobox.tsx`
- `nextjs-app/messages/sv/venue.json`
- `nextjs-app/messages/en/venue.json`
- `nextjs-app/messages/sv/favourites.json`
- `nextjs-app/messages/en/favourites.json`
- `project-context.md`
- `nextjs-app/scripts/capture-claude-design-refs.mjs`
- `nextjs-app/docs/design/references/REBASELINE-LOG.md`
- Focused unit/component/E2E/visual tests under `nextjs-app/test/`

Do not edit `sprint-status.yaml` directly. The story-review script owns transition to `review`.

### Testing

Before editing, run the baseline checks from `nextjs-app/`:

- `npx tsc --noEmit`
- `npx eslint . --quiet`

Required verification before review:

- `npx tsc --noEmit`
- `npx eslint . --quiet`
- `npx vitest run`
- Focused unit tests for selected-instant hours boundaries.
- Focused component/integration tests for MapView all-source filtering, favourites retention, exact search retention, and detail state.
- E2E coverage for same-date scrub zero-fetch and date-change one-fetch.
- `npx playwright test` for the affected map/search/favourites/detail paths. If full Playwright has unrelated mobile timing instability, run the focused suite plus document the unrelated failing spec exactly.
- Visual validation through `.\scripts\run-sh.ps1 scripts/visual-validate.sh <screen-id> <route> mobile|desktop` for:
  - `screen_id: map-selected-time-open`
  - `screen_id: map-selected-time-closed`
- Accessibility coverage should include desktop and mobile where supported. Use the existing a11y projects if present; Story 12.6/12.11 retro notes identified mobile a11y as an easy gap to miss.

If Vitest wedges on Windows, retry with a bounded worker count, for example:

- `$env:VITEST_MAX_WORKERS='4'; npx vitest run`

### Visual Review Guidance

For `map-selected-time-open`, review that:

- open venues still appear normally in pins, ranked rows, counts, and detail;
- selected-time open copy is qualified correctly when the planner is not live-now;
- no confidence copy appears;
- grey/not-sunny pins do not show percentages.

For `map-selected-time-closed`, review that:

- the closed venue is absent from discovery pins and ranked rows;
- counts and tag-filtered rows reflect only open/unknown discovery venues;
- a saved closed favourite remains visible, labelled `Stängt vid vald tid`, visually subdued, and clearly actionable;
- an exact closed name search result is retained and labelled;
- opening that retained result shows detail context without restoring a pin or showing an open badge.

## Dev Agent Record

### Agent Model Used

TBD by dev-story agent.

### Debug Log References

TBD by dev-story agent.

### Completion Notes List

- Story context created from Epic 12 planning artifacts, architecture E12-AD-07, UX selected-instant availability rules, prior Story 12 implementation files, retro notes, and deferred-work entries.
- Sprint status intentionally not edited by this create-story delegate; auto-bmad orchestration owns state transitions.

### File List

- `_bmad-output/implementation-artifacts/12-14-hide-closed-venues-open-at-selected-time-filter.md`
