# Visual Source Refresh Audit — 2026-05-21

## Decision

The refreshed MVP visual references supersede stale story text for visual composition. Active MVP validation uses only:

- `nextjs-app/docs/design/references/claude-design/project/SunnySeat MVP Mobile Unlocked.html`
- `nextjs-app/docs/design/references/claude-design/project/SunnySeat MVP Desktop Unlocked.html`

Post-MVP Unlocked/Locked prototypes are future-only. They must not drive MVP planner/date/favourites review gates and must not reintroduce Season Pass, Swish, paywall, lock badge, payment, or recovery runtime paths.

## Story 2.5 Scope

Keep:

- `TimeContext` planner model, deterministic initialization, live/current mode, and date/time helpers.
- `/api/venues` and `/api/venues/[slug]` planner params and validation.
- Central query-key additions and API-boundary approach.
- Reusable time/date controls and Swedish i18n.
- No-premium runtime quarantine.

Fixed during this refresh:

- Live `Idag` clock now advances while the planner remains live/current.
- Live venue search and live venue detail now poll every 5 minutes.
- Explicit planner date/time searches do not poll.
- Venue detail keeps previous data visible while planner params change.
- Mobile planner/date chrome moved to the refreshed top-overlay composition.
- Mobile venue sheet now supports `peek`/`mid`/`full`, with `mid` as the default map state and the forced `full` visual state aligned to the refreshed 320px list composition for `map-panel-venues`.
- Mobile selected-venue QuickInfo now renders as a map-anchored callout.
- Mobile bottom nav now follows the MVP two-tab `Nära mig`/`Favoriter` reference.
- Map canvas tint was warmed toward the MVP sand treatment.
- Desktop map controls now follow the refreshed split: location/settings live in the desktop header, while the floating map-control stack is mobile-only.
- Desktop venue list now uses the refreshed 340px overlay width.
- Venue detail mobile/desktop now matches the refreshed MVP first-viewport composition, including detail facts, tags, forecast subtitle, and desktop `SOL NU`/timeline treatment.

Final Story 2.5 visual disposition:

- The refreshed `map-primary`, `map-with-selected-venue`, `map-panel-venues`, and `venue-detail` MVP gates now pass with the Anthropic provider.
- Visual metadata used to match current MVP references remains local display metadata until future API-backed stories define persistence/contracts.

Defer only with explicit owner:

- Confidence/percentage final display: Story 2.6.
- Persisted free favourite actions/states: Story 2.7.
- Amenity/tag chips: Story 3.2 or first venue-attribute story.
- Ratings/reviews/price metadata: Story 3.3.
- Partner `SOL NU` badges: Story 5.2.
- Share action chrome: Story 6.5.
- Season Pass / Swish / payment / locked states: Future Monetization.

## Completed-Story Audit

| Story | Screen IDs | Known accepted drift or skipped gate | Current risk | Recommended action |
|---|---|---|---|---|
| 1.3 Layout Shell | `map-primary`, nav states | Reference/nav labels have alternated between `Karta` and `Nära mig`; bottom nav model predates refreshed references. | Reduced: Story 2.5 correction now uses `Nära mig`/`Favoriter` for MVP mobile. | Keep current route accessibility for `/about`; revisit settings/about entry point in the about/settings story. |
| 1.4 Map Canvas & Pins | `map-primary` | Warm/sand map palette and floating control stack did not match current OpenFreeMap/tile styling. | Reduced: refreshed `map-primary` mobile/desktop gates pass; desktop controls moved to header while mobile retains floating controls. | Keep current split unless a future map-control story changes it. |
| 1.5 Onboarding | `onboarding` | Desktop baseline is implementation-derived; mobile was previously recaptured after story patches. | Medium: mobile onboarding regenerated from MVP bundle, desktop still curated. | Keep logged desktop baseline until Rasmus accepts a new desktop onboarding design. |
| 1.6 Quality Gates | multiple | Rebaseline log already contains prior implementation/prototype entries. | Low if log remains accurate. | No action beyond current 2026-05-21 rebaseline entry. |
| 2.1 Selected Venue | `map-with-selected-venue` | Missing time/date chrome, bottom sheet/list composition, selected map callout, warm map treatment were accepted as future debt or stale reference. | Closed for Story 2.5: refreshed mobile gate passes. | Do not reuse the old future-debt rationale. |
| 2.2 Venue List | `map-panel-venues`, `map-with-selected-venue` | Missing planner chrome, percentage/rating/favourite metadata, warm map, and selected-state composition. | Closed for Story 2.5 composition: refreshed gates pass. Metadata/favourites remain future contract work. | Future owners should replace local visual metadata with API-backed contracts where applicable. |
| 2.3 Venue Detail | `venue-detail` | Missing global planner sync, percentage pins, ratings, tags, `SOL NU`, favourites/share chrome. | Closed for Story 2.5 composition: mobile/desktop gates pass. Some metadata/action persistence remains future work. | Future stories own persisted favourites, review data, attributes, partner badges, and share behaviour. |
| 2.4 Venue Search | `map-primary`, `map-panel-venues`, `map-with-selected-venue`, `venue-detail` | Search/list chrome shipped while composite visual failures were accepted as downstream planner or future scope. | Reduced for mobile map screenshots because old mobile search chrome is no longer shown in the refreshed MVP map composition. | Preserve desktop search; decide later whether mobile search returns via settings/sheet/search affordance. |

## Future-Story Audit

| Future story/epic | Drift risk | Required amendment before implementation |
|---|---|---|
| 2.6 Confidence Display & Auto-Refresh | References show percentage-first pins/cards and status labels. | AC must define final confidence/sun-percentage contract across pins, list, QuickInfo, and detail. |
| 2.7 Save & View Favourites | MVP refs show free heart affordances, not locks. | AC must state favourites are free and remove old lock/paywall expectations. |
| 3.2 Sun Accuracy Feedback / attributes | References show amenity/tag chips. | Decide source of truth for tags before drafting. |
| 3.3 Venue Reviews | References show ratings/review counts/price metadata. | Decide list/detail surfaces and API fields before drafting. |
| 5.2 `SOL NU` Badge | References show partner/sunny-now badge in detail. | Seed fixture/partner state or explicitly rebaseline if not applicable. |
| 6.5 Share Venue Sun Status | Detail references show share/action chrome. | Define screenshot-scope action chrome and native share fallback. |
| Epic 4 Future Monetization | Post-MVP files are no longer MVP refs. | Draft only from Post-MVP Unlocked/Locked prototypes when monetization is reactivated. |
| Offline / 404 | MVP bundle lacks active routed states for some utility screens. | Keep curated references or first implementation-driven baseline with `REBASELINE-LOG.md`. |

## Correction Roadmap

1. Completed: replace active bundle from `sunnyseat-claude-design-2026-05-21/`, preserve curated docs, regenerate 13 MVP references, update `REBASELINE-LOG.md`.
2. Completed: update `project-context.md`, PRD, epics, architecture, UX spec, Story 2.5, and deferred-work notes to name the MVP/Post-MVP split.
3. Completed: fix live `Idag` refresh and venue-detail previous-data behavior.
4. Completed: Story 2.5 absorbed the refreshed map-composition correction for planner placement, default/forced sheet state, selected callout, nav labels, warm map tint, desktop header controls, desktop 340px list, and venue-detail composition.
5. Next: run the canonical `story-review.sh` gate when ready to move Story 2.5 to review; do not bypass it.

## Validation Plan

Already run:

- `cd nextjs-app && node scripts/capture-claude-design-refs.mjs` -> captured 13, skipped 0, failed 0.
- `cd nextjs-app && npx tsc --noEmit` -> pass.
- `cd nextjs-app && npx eslint . --quiet` -> pass.
- `cd nextjs-app && npx vitest run` -> 34 files, 239 tests passed.
- `cd nextjs-app && npx playwright test` -> 39 passed, 26 skipped.
- After visual composition correction: `cd nextjs-app && npx tsc --noEmit` -> pass.
- After visual composition correction: `cd nextjs-app && npx eslint . --quiet` -> pass.
- After visual composition correction: `cd nextjs-app && npx vitest run test/components/TimeSlider.test.tsx test/components/TimeSliderPanel.test.tsx test/components/MobileNavBar.test.tsx test/components/MapView.test.tsx` -> 4 files, 41 tests passed.
- Final Story 2.5 deterministic verification: `cd nextjs-app && npx tsc --noEmit` -> pass; `cd nextjs-app && npx eslint . --quiet` -> pass; `cd nextjs-app && npx vitest run` -> 34 files, 241 tests passed; `cd nextjs-app && npx playwright test` -> 39 passed, 26 skipped.
- Final monetization quarantine scan returned no active runtime hits.
- Final visual validation with `VISUAL_VALIDATE_PROVIDER=anthropic` and persisted `ANTHROPIC_API_KEY`:
  - `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-primary "/?_time=14:00" mobile` -> pass.
  - `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-primary "/?_time=16:30" desktop` -> pass.
  - `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-with-selected-venue "/?venue=test-venue-sunny&_state=map-with-selected-venue&_time=14:00" mobile` -> pass.
  - `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-panel-venues "/?_state=map-panel-venues&_time=14:00" mobile` -> pass.
  - `.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail&_time=14:00" mobile` -> pass.
  - `.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail&_time=16:30" desktop` -> pass.
