---
baseline_commit: baf0d8b18df4b5542cf2ffa4b9c3528988dc338c
---

# Story 12.10: Venue Detail Preload - Instant "Mer info"

Status: ready-for-dev

## Story

As a **SunnySeat map user**,
I want venue detail to be ready when I tap **Mer info**,
so that browsing between places feels instant without breaking the Epic 11 request-count guarantees.

## Source Context From Epic

Story 12.10 exists because the venue detail route can be slower than the list route on cold paths.
The list already has nearby candidate venues, so the client can warm likely detail queries before the
user taps **Mer info**.

Effective requirements from the epic:

1. The client prefetches venue detail in the background for a bounded top-N candidate set.
2. Candidates include favourite-query rows when those rows are already part of the visible/settled
   surface, not only the main nearby list.
3. Prefetch uses the **exact** TanStack Query key and params that `useVenueDetail` will mount with:
   slug plus the current planner date/time and rounded user `lat`/`lng`.
4. A prefetched **Mer info** open must render from the client cache with no visible wait; a non-prefetched
   venue still opens the existing shell and falls back to live fetch.
5. The prefetch budget is bounded, yields to interaction, has a concurrency cap, and backs off on
   errors.
6. The route must continue to use the Story 12.3 persisted sun/detail path and Story 12.7 public venue
   visibility guard. Hidden/unknown venues must not be exposed by background prefetch.

## Superseded Epic Text

This story has mandatory supersession controls from `sprint-status.yaml`, architecture `E12-AD-09`,
and the Epic 12 test design. They override older options in the original epic text.

- **Post-scrub/date prefetch option is superseded.** The original Story 12.10 text allowed either
  (a) re-scope the Epic 11 request-count gate to list endpoints only and allow detail prefetch after
  scrub/date changes, or (b) keep those gates intact and exempt post-scrub/date opens from the instant
  guarantee. Implement **option (b)** only: initial-settle-only prefetch, no same-date scrub restart,
  no planner-date restart, and no request-count gate relaxation.
- **10 km expansion is superseded.** The original text discussed raising the venue list radius or adding
  a wider endpoint to find 10 km candidates. Do not do that. Use already-returned list/favourite rows
  only. Preserve `/api/venues` default radius `1.5` km and `MAX_RADIUS_KM = 3.0`.
- **Server cache warming language predates Story 12.3.** The current detail route should already use
  persisted geometry/weather outcomes. The primary win here is client detail cache warmth and no open-time
  wait. Do not reintroduce cold buildings RPC/shadow computation and do not attach `sunDaySeries` to detail
  DTOs just to satisfy this story.

## Acceptance Criteria

1. **Initial-settle-only candidate prefetch**
   - Given the initial location and list/favourites surface has settled,
   - when the prefetcher starts,
   - then it prefetches at most **six** unique venue detail candidates with at most **two** requests in
     flight, ordered by the current visible list/favourites order, then nearest fallback if needed.
   - It must not issue a new list/favourites discovery request solely for prefetch candidates.

2. **Exact mounted detail key**
   - Given `useVenueDetail` will mount for a slug and current planner/location inputs,
   - when prefetch warms that venue,
   - then prefetch uses the same shared query options/key builder as `useVenueDetail`, including
     `queryKeys.venues.detailAt(slug, { date, time, lat, lng })`, date/time normalization, and 4-decimal
     coordinate bucketing.
   - No duplicated slug-only or ad-hoc prefetch key is allowed.

3. **Epic 11 request-count invariants preserved**
   - Given the initial prefetch pass has either completed, failed, or been canceled,
   - when the user scrubs within the same date,
   - then no new `/api/venues` or `/api/venues/[slug]` request is started by detail prefetch.
   - Given the user changes planner date,
   - then the existing list/favourites date-change request behavior remains exactly one list/favourites
     day-series request, and detail prefetch does not restart for the new date.

4. **Interaction yield, cancellation, and error backoff**
   - Given prefetch is running,
   - when the user opens detail, changes selection, dismisses/opens overlays, changes list mode, or otherwise
     performs direct map/list interaction,
   - then pending prefetch work yields/cancels without delaying the interaction.
   - In-flight detail fetches must consume the TanStack Query `AbortSignal`; cancellation must use an exact
     query-key match for the candidate detail query.
   - Failed prefetches must not spin in a tight loop. Use the shared retry/backoff policy or an explicit
     cooldown.

5. **Public resolver convergence and hidden guard**
   - Given a detail request is made directly or through background prefetch,
   - when the identifier is a live Supabase id or slug for a public venue,
   - then `/api/venues/[slug]` resolves it through the Story 12.7 shared public resolver path.
   - Given the identifier is unknown, hidden, duplicated, blank/unsafe, or malformed,
   - then the route returns the same public not-found/error behavior it uses today, without leaking hidden
     venue existence and without adding an `includeHidden` public path.

6. **Instant open and cache-miss shell**
   - Given a prefetched venue is opened through **Mer info**,
   - when `useVenueDetail` mounts,
   - then it reads the warmed query data and no new detail network request is made for that key.
   - Given an unprefetched venue is opened,
   - then the existing identity shell appears immediately, close/back remains usable, the detail content is
     `aria-busy`, token skeletons remain stable, a polite Swedish loading announcement says
     `Laddar platsinformation` once, and an inline retry remains available for transient failures.
   - The loaded content replaces skeletons in place without a second entrance animation.

7. **Measurement and release evidence**
   - Record before/after **Mer info** open timing for a prefetched candidate and a non-prefetched candidate.
   - Deterministic CI must use local fixtures/mocks and must not depend on live Met.no or protected production.
   - Protected preview/live evidence, if credentials are available, is release evidence rather than a reason to
     hide local test failures.

## Design Gate Criteria

- **Visual:** No intended pixel change for the normal loaded detail surface. Cache-miss skeletons keep existing
  tokenized sizing and layout. Any visible detail-shell change must use design tokens from
  `nextjs-app/docs/design/DESIGN.md`.
- **Behaviour:** First initial-settle pass warms likely details; prefetched **Mer info** opens from cache;
  non-prefetched opens the existing shell and fetches live.
- **Animation:** Existing detail overlay entrance/exit behavior remains unchanged. Cache fill swaps content in
  place and respects `prefers-reduced-motion`.
- **Visual validation:** Not required if no visible UI changes are introduced. If a visible shell/skeleton/layout
  change is made, run the relevant `venue-detail` visual validation through `scripts/visual-validate.sh` and
  update `REBASELINE-LOG.md` only with human-approved reference changes.

## Pre-Implementation Dependency Gate

Start here before editing:

1. From `nextjs-app/`, run the baseline checks required by `AGENTS.md`:
   - `npx tsc --noEmit`
   - `npx eslint . --quiet`
   Stop for unrelated baseline failures instead of hiding them with `eslint-disable`, `@ts-ignore`, ignore globs,
   or shim fixes.
2. Confirm the branch contains the already-reviewed Epic 12 prerequisites:
   - Story 12.3 persisted detail/list sun path and 30s API caching.
   - Story 12.7 `resolvePublicVenueIdentifier` and the canonical `hidden boolean not null default false` migration
     contract.
   - Story 12.6 public sunny/not-sunny predicate and weather gate state.
   - Story 12.13 removal of user-facing confidence.
   - Story 12.12 final venue photo fallback contract.
   - Story 12.9 mobile row sheet/test migration, because request-count specs moved to the date-dialog path.
3. Read `nextjs-app/docs/design/DESIGN.md` before any detail shell or visible UI edit.
4. Do not add a package, API route, schema change, 10 km endpoint, public `includeHidden`, premium/paywall state,
   or direct client import from `lib/solar`, `lib/weather`, `lib/supabase`, `lib/middleware`, or `lib/buildings`.
5. Do not move the story to `review` by directly editing sprint status. After implementation and gates pass, use:
   `.\scripts\run-sh.ps1 scripts/story-review.sh 12-10-venue-detail-preload-instant-mer-info`.

## Tasks / Subtasks

- [ ] **Task 0 - Reconfirm sources, current seams, and baseline** (AC: all)
  - [ ] Run `npx tsc --noEmit` and `npx eslint . --quiet` from `nextjs-app/` before editing.
  - [ ] Read the current source files named in "Current Implementation Facts" before changing them.
  - [ ] Reconfirm `@tanstack/react-query` is still v5.x and that the current `useVenueDetail` query function still
        passes the provided `signal` to `fetch`.
  - [ ] Confirm the test file names and request-count selectors have not moved after Story 12.9.

- [ ] **Task 1 - Extract a shared venue-detail query contract** (AC: 2, 4, 6)
  - [ ] Create or refactor to a client-safe shared helper such as
        `nextjs-app/hooks/queries/venue-detail-query-options.ts`.
  - [ ] Move slug normalization, planner/date/time normalization, coordinate finite checks, 4-decimal bucketing,
        detail URL construction, `AbortSignal` forwarding, `staleTime`, retry policy, and placeholder compatibility
        decisions out of ad-hoc call sites.
  - [ ] Update `useVenueDetail` to consume the shared helper rather than keeping a private bucket/key/fetch
        implementation.
  - [ ] Ensure the helper returns or exposes the exact `queryKey` that prefetch and `useVenueDetail` both use.
  - [ ] Preserve current behavior: disabled empty slugs, planner polling disabled, live refetch interval unchanged,
        5-minute stale time, no placeholder data across slug changes, and 4xx no-retry behavior.

- [ ] **Task 2 - Add the bounded initial prefetch scheduler** (AC: 1, 2, 3, 4, 6)
  - [ ] Add a focused hook or local MapView helper, for example
        `nextjs-app/hooks/queries/useVenueDetailPrefetch.ts`, rather than burying a large scheduler inline in
        `MapView.tsx`.
  - [ ] Integrate from `MapView.tsx` after `listVenues`, `favouriteVenueRows`, `venueQuery`, `favouriteVenuesQuery`,
        `plannerTime.plannerQuery`, and `geolocation.coords` are available.
  - [ ] Capture the initial settled planner/location key once. Use refs or a guarded effect so React hook deps stay
        honest while later same-date scrub and date changes cannot start a second prefetch run.
  - [ ] Build candidates from already-returned visible rows: `listVenues` for nearby mode and
        `favouriteVenueRows` for favourites mode when that query has already settled. Deduplicate by canonical slug
        and id; skip rows without a safe slug.
  - [ ] Cap to six candidates and process with concurrency two. The implementation should be deterministic enough
        for unit tests to prove the cap and order.
  - [ ] Yield before scheduling work with `requestIdleCallback` when available or a small cancellable timer fallback.
        Do not block click/tap handlers.
  - [ ] Skip candidates whose exact detail key is already fresh in the TanStack cache.
  - [ ] Use `queryClient.prefetchQuery` or an equivalent TanStack v5 API with the shared detail query options.
        Important: in TanStack Query v5, `prefetchQuery` resolves `Promise<void>` and does not throw or return data.
        If the scheduler needs per-candidate error/cooldown state, inspect `queryClient.getQueryState(queryKey)` after
        prefetch or use an API that reports errors explicitly; do not rely on `.catch()` from `prefetchQuery`.
  - [ ] On direct interaction/open/dismiss/list-mode change, cancel queued work and call
        `queryClient.cancelQueries({ queryKey, exact: true }, { silent: true })` for in-flight candidate detail keys.

- [ ] **Task 3 - Converge detail route identity on the public resolver** (AC: 5)
  - [ ] Update `nextjs-app/app/api/venues/[slug]/route.ts` so live detail reads use
        `resolvePublicVenueIdentifier(decodedSlug)` from `lib/services/venue-store.ts`, not the older slug-only
        `getVenueBySlug(decodedSlug)` path.
  - [ ] Preserve malformed percent-decoding behavior and existing 400/404 response shape where applicable.
  - [ ] Preserve fixture-mode behavior: fixture fallback can match id/slug only in fixture mode; live Supabase uses the
        public resolver and rejects hidden or ambiguous rows.
  - [ ] Preserve the Story 12.3 persisted outcome path, `SunGeometryCoverageMissingError` -> 503 handling, distance
        computation, and `Cache-Control: public, max-age=30, s-maxage=30, must-revalidate`.
  - [ ] Do not change the public list route radius, list filtering behavior, or favourites discovery contract in this
        story unless needed to fix a failing Story 12.10 acceptance test.

- [ ] **Task 4 - Preserve and harden cache-miss shell behavior** (AC: 6; Design Gate)
  - [ ] Verify `VenueDetailOverlay` and `VenueDetailContent` still render fallback identity content immediately while
        detail is fetching.
  - [ ] Keep the close/favourite/share chrome and map back/dismiss path usable during loading and error states.
  - [ ] Keep `aria-busy` on the detail content while loading. If the current `role="status"` loading block can announce
        more than once across remounts or hidden desktop/mobile copies, adjust it so one visible polite announcement is
        emitted per cache-miss open.
  - [ ] Update copy through `next-intl` if needed so Swedish loading announcement is exactly
        `Laddar platsinformation`; add/adjust the English counterpart only to keep locale files structurally aligned.
  - [ ] Do not replace token skeletons with spinners or introduce raw colors/arbitrary spacing.

- [ ] **Task 5 - Unit and component coverage** (AC: 1, 2, 4, 5, 6)
  - [ ] Extend `test/unit/queries/useVenueDetail.test.ts` or add a dedicated helper test proving prefetch and
        `useVenueDetail` produce identical `detailAt` keys and URLs for slug, planner date/time, and bucketed coords.
  - [ ] Add scheduler tests proving top-six selection, candidate order, deduplication, concurrency two, cache-skip,
        cancellation, and no rerun on scrub/date changes.
  - [ ] Extend detail route tests so live Supabase id/slug public rows resolve through the Story 12.7 resolver and
        hidden/unknown/ambiguous rows produce indistinguishable public 404 behavior.
  - [ ] Keep existing route tests around malformed slug, planner params, freshness headers, distance, and missing
        geometry coverage green.
  - [ ] Add or update component tests only if cache-miss shell behavior changes; assert `aria-busy`, one polite status,
        close/back usability, and retry availability.

- [ ] **Task 6 - E2E request-count and instant-open coverage** (AC: 1, 2, 3, 6, 7)
  - [ ] Add or update Playwright request instrumentation to count both `/api/venues?...` list/favourites requests and
        `/api/venues/<slug>?...` detail requests. Do not leave detail prefetch invisible to the counter.
  - [ ] Assert same-date scrub starts zero venue/list/detail requests after the initial prefetch pass has settled or
        been canceled.
  - [ ] Assert planner-date change starts exactly the existing one list/favourites day-series request and no detail
        prefetch restart.
  - [ ] Assert opening a prefetched candidate through **Mer info** produces no new detail request for the warmed key.
  - [ ] Assert opening a non-prefetched candidate still opens the shell immediately and then fetches detail.
  - [ ] Include a favourites-mode case when favourite rows are already loaded, so candidate selection is not only the
        main nearby list.

- [ ] **Task 7 - Final gates and story review transition** (AC: all)
  - [ ] Run from `nextjs-app/`: `npx tsc --noEmit`.
  - [ ] Run from `nextjs-app/`: `npx eslint . --quiet`.
  - [ ] Run from `nextjs-app/`: `npx vitest run`. If Windows full Vitest times out from worker pressure, rerun with
        `VITEST_MAX_WORKERS=4` and report both attempts.
  - [ ] Run `npx playwright test` because this story changes shared query/request-count behavior and MapView
        interactions.
  - [ ] Run visual validation only if a visible detail-shell/layout change was introduced.
  - [ ] Record before/after **Mer info** open timing evidence in completion notes. If protected preview credentials are
        unavailable, state that live evidence is deferred to release-lane verification.
  - [ ] Move to `review` only through
        `.\scripts\run-sh.ps1 scripts/story-review.sh 12-10-venue-detail-preload-instant-mer-info`.

## Current Implementation Facts

- `nextjs-app/hooks/queries/useVenueDetail.ts` currently owns the detail params type, 4-decimal `bucket()` helper,
  planner/date/time normalization, key construction, fetch URL construction, `signal` forwarding, 5-minute stale time,
  retry policy, live polling, and same-slug placeholder behavior. This duplication must be removed or shared so
  prefetch cannot drift from mounted detail queries.
- `nextjs-app/lib/query-keys.ts` already exposes `queryKeys.venues.detailAt(slug, planner?)`. It normalizes filters,
  sorts favourite ids, and falls back to `detail(slug)` when no filters exist. Use this factory, never inline detail
  keys.
- `nextjs-app/lib/utils/venue-query-planner.ts` intentionally keeps list/favourites keys date-only. Do not put time
  back into list/favourites query keys while implementing detail prefetch.
- `nextjs-app/hooks/queries/useVenueSearch.ts` and `useFavouriteVenues.ts` already consume shared date-only planner
  helpers. `useFavouriteVenues` is enabled only when ids and coords exist; the current `MapView` enables the network
  favourite query only for favourites mode when rows are not already covered by the loaded list.
- `nextjs-app/components/custom/map/MapView.tsx` currently calls `useVenueDetail` for selected-preview refresh and
  for `?venue=` detail. It does not yet import `useQueryClient` or run a detail prefetch scheduler. It already derives
  `listVenues`, `favouriteVenueRows`, `activeFavouriteVenueRows`, `detailFallbackVenue`, and `isVenueDetailRequested`;
  those are the integration seams.
- `MapView.tsx` already opens the detail overlay from fallback rows while detail is fetching. Pure deep links can use
  a synthetic slug-derived fallback while `venueDetailQuery.isFetching` is true. Preserve this behavior.
- `nextjs-app/components/custom/venue/VenueDetailOverlay.tsx` renders both mobile and desktop shells with token chrome,
  close/favourite/share buttons, reduced-motion-aware Motion transitions, and `VenueDetailContent`.
- `nextjs-app/components/composed/venue/VenueDetailContent.tsx` already has `aria-busy={loading}`, token skeletons,
  `LoadingBlock` with `role="status"`, and `labels.detail.loading` currently set to Swedish `Laddar platsdetaljer`.
  Story 12.10 only needs hardening/copy alignment if the exact UX announcement is not met.
- `nextjs-app/app/api/venues/[slug]/route.ts` currently decodes slug and calls `getVenueBySlug(decodedSlug)`. That is
  the stale path this story must converge onto Story 12.7's public resolver.
- `nextjs-app/lib/services/venue-store.ts` already exports `resolvePublicVenueIdentifier(identifier)`. In fixture mode
  it matches id/venueId/slug/venueSlug; in Supabase mode it queries id or slug, rejects non-unique results, and returns
  only `hidden === false` rows.
- `nextjs-app/test/e2e/epic-11-scrub-zero-fetch.spec.ts` currently protects request-count behavior. After Story 12.9,
  date-change request-count coverage uses the planner date-dialog path, not the removed four-snap mobile sheet path.
- Existing tests already cover many detail-query and route basics:
  - `test/unit/queries/useVenueDetail.test.ts`
  - `test/unit/query-keys.test.ts`
  - `test/unit/api/venue-detail-route.test.ts`
  - `test/unit/api/venues-route-caching.atdd.test.ts`
  - `test/unit/services/story-12-7-public-venue-resolver.atdd.test.ts`
  - `test/unit/api/story-12-7-shared-resolver-convergence.automation.test.ts`

## Latest Technical Notes

- TanStack Query v5 is the installed query library (`@tanstack/react-query ^5.99.0` in `nextjs-app/package.json`).
- TanStack v5 `queryClient.prefetchQuery({ queryKey, queryFn })` is intended for loading data before it is needed. It
  resolves `Promise<void>` and does not return data or throw errors to the caller. Use query state inspection or a
  different query API if explicit per-candidate success/failure handling is needed.
- TanStack v5 cancellation works when the query function consumes the provided `AbortSignal`. The current
  `useVenueDetail` fetch already passes `signal`; the shared helper must preserve that.
- Exact cancellation should use an exact key filter, for example
  `queryClient.cancelQueries({ queryKey, exact: true }, { silent: true })`, so unrelated venue/list queries are not
  canceled.

## Previous Story Intelligence

- Story 12.9 moved request-count E2E coverage to stable date-dialog interactions and finished with the full gate green:
  typecheck, eslint, `VITEST_MAX_WORKERS=4 npx vitest run`, and the story-review wrapper. Reuse that worker cap if the
  Windows Vitest full suite is unstable.
- Story 12.7 created the canonical public resolver. It also recorded that downstream Story 12.10 must adopt the shared
  public guard for detail/prefetch paths.
- Story 12.3 moved list/detail sun computation to persisted venue geometry/weather snapshots and kept 503 behavior for
  missing geometry coverage. Do not re-add cold provider/building work in this story.
- Story 12.13 showed that stale source citations cause rework. Before coding, read the current files again and trust
  working-tree code over old prose when they conflict.
- Story 12.12 noted explicit `screen_id:` markers are only needed when a visual validation gate must be picked up.
  This story is behavior-first and should not add visual markers unless it introduces visible UI changes.

## Deferred Work Review

No active `deferred-work.md` item is targeted to Story 12.10. Overlapping notes to keep in mind, not reopen by default:

- The out-of-list detail preview can lack `sunDaySeries`; that accepted boundary is consistent with this story's
  "do not attach day series to detail DTOs" rule.
- A venue-detail route `peakTime` test was noted as vacuous/no-op. If this story touches route tests, add meaningful
  resolver/prefetch coverage rather than more no-op assertions.
- The detail-error actionless-combo invariant matters only if refactoring the error notice or retry/back behavior.
- The `quickInfoOpeningHours` local-midnight memo issue is unrelated unless this story edits quick-info time freshness.

## Expected File Impact

Likely edits:

- `nextjs-app/hooks/queries/useVenueDetail.ts`
- New or refactored `nextjs-app/hooks/queries/venue-detail-query-options.ts`
- New focused scheduler hook, likely under `nextjs-app/hooks/queries/`
- `nextjs-app/components/custom/map/MapView.tsx`
- `nextjs-app/app/api/venues/[slug]/route.ts`
- `nextjs-app/messages/sv/venue.json` and `nextjs-app/messages/en/venue.json` only if the exact loading announcement
  needs copy alignment
- Unit/component/E2E tests named above or close equivalents

Explicitly out of scope:

- New packages, new database migrations, new API endpoints, route radius expansion, MapLibre changes, premium/payment
  paths, broad visual rebaseline, and direct sprint-status review transition.

## Project Structure Notes

- Keep query behavior inside `hooks/queries/` and shared client-safe query helpers. Client components may fetch only
  through `app/api/*` and query hooks/helpers.
- Keep feature UI in `components/custom/`, composed venue display in `components/composed/venue/`, and primitives in
  `components/ui/`.
- Server-only venue resolver logic remains in `lib/services/venue-store.ts` and API routes. Do not import it from
  client components or client hooks.
- Swedish remains the default user-facing locale. Do not add English hardcoded copy to Swedish UI.

## References

- `AGENTS.md` - repo rules for commands, frontend design, API boundary, Swedish copy, sprint status, and story review.
- `project-context.md` - active Epic 12 invariants, Screen ID -> Route Map, request-count conventions.
- `_bmad-output/planning-artifacts/epics.md` - Story 12.10 source requirements.
- `_bmad-output/planning-artifacts/architecture.md` - `E12-AD-05`, `E12-AD-09`, cache/query-key strategy, release gates.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - `VenueDetailPreload` interaction and cache-miss shell.
- `_bmad-output/qa/epic-12-test-design-2026-07-12.md` - R-016 exact key/scheduler risk, request-count tests, hidden guard.
- `_bmad-output/auto-bmad/retro-notes/epic-12.md` - prior Epic 12 implementation/review lessons.
- `_bmad-output/implementation-artifacts/deferred-work.md` - overlap audit.
- `nextjs-app/docs/design/DESIGN.md` - required if visible detail shell changes are made.
- `nextjs-app/lib/query-keys.ts`
- `nextjs-app/hooks/queries/useVenueDetail.ts`
- `nextjs-app/hooks/queries/useVenueSearch.ts`
- `nextjs-app/hooks/queries/useFavouriteVenues.ts`
- `nextjs-app/lib/utils/venue-query-planner.ts`
- `nextjs-app/app/api/venues/[slug]/route.ts`
- `nextjs-app/lib/services/venue-store.ts`
- `nextjs-app/components/custom/map/MapView.tsx`
- `nextjs-app/components/custom/venue/VenueDetailOverlay.tsx`
- `nextjs-app/components/composed/venue/VenueDetailContent.tsx`

## Story File Audit

- PASS - Story status is `ready-for-dev`.
- PASS - Mandatory **Superseded Epic Text** section is present and controls post-scrub/date prefetch plus 10 km
  expansion.
- PASS - Acceptance criteria map to initial-settle-only prefetch, exact key, request-count invariants, cancellation,
  hidden guard, cache-miss shell, and measurement evidence.
- PASS - Tasks map to ACs and name likely files without assigning implementation outside the story.
- PASS - Current implementation facts identify existing helpers/routes/components/tests and stale detail resolver path.
- PASS - Prior story, retro, and deferred-work notes are folded in without reopening unrelated work.
- PASS - Test plan covers unit, component, E2E request-count, hidden route matrix, and final gates.

## Dev Agent Record

### Agent Model Used

TBD by dev agent

### Debug Log References

TBD by dev agent

### Completion Notes List

TBD by dev agent

### File List

TBD by dev agent
