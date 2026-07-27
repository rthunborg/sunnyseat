---
baseline_commit: baf0d8b18df4b5542cf2ffa4b9c3528988dc338c
---

# Story 12.10: Venue Detail Preload - Instant "Mer info"

Status: review

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

- [x] **Task 0 - Reconfirm sources, current seams, and baseline** (AC: all)
  - [x] Run `npx tsc --noEmit` and `npx eslint . --quiet` from `nextjs-app/` before editing.
  - [x] Read the current source files named in "Current Implementation Facts" before changing them.
  - [x] Reconfirm `@tanstack/react-query` is still v5.x and that the current `useVenueDetail` query function still
        passes the provided `signal` to `fetch`.
  - [x] Confirm the test file names and request-count selectors have not moved after Story 12.9.

- [x] **Task 1 - Extract a shared venue-detail query contract** (AC: 2, 4, 6)
  - [x] Create or refactor to a client-safe shared helper such as
        `nextjs-app/hooks/queries/venue-detail-query-options.ts`.
  - [x] Move slug normalization, planner/date/time normalization, coordinate finite checks, 4-decimal bucketing,
        detail URL construction, `AbortSignal` forwarding, `staleTime`, retry policy, and placeholder compatibility
        decisions out of ad-hoc call sites.
  - [x] Update `useVenueDetail` to consume the shared helper rather than keeping a private bucket/key/fetch
        implementation.
  - [x] Ensure the helper returns or exposes the exact `queryKey` that prefetch and `useVenueDetail` both use.
  - [x] Preserve current behavior: disabled empty slugs, planner polling disabled, live refetch interval unchanged,
        5-minute stale time, no placeholder data across slug changes, and 4xx no-retry behavior.

- [x] **Task 2 - Add the bounded initial prefetch scheduler** (AC: 1, 2, 3, 4, 6)
  - [x] Add a focused hook or local MapView helper, for example
        `nextjs-app/hooks/queries/useVenueDetailPrefetch.ts`, rather than burying a large scheduler inline in
        `MapView.tsx`.
  - [x] Integrate from `MapView.tsx` after `listVenues`, `favouriteVenueRows`, `venueQuery`, `favouriteVenuesQuery`,
        `plannerTime.plannerQuery`, and `geolocation.coords` are available.
  - [x] Capture the initial settled planner/location key once. Use refs or a guarded effect so React hook deps stay
        honest while later same-date scrub and date changes cannot start a second prefetch run.
  - [x] Build candidates from already-returned visible rows: `listVenues` for nearby mode and
        `favouriteVenueRows` for favourites mode when that query has already settled. Deduplicate by canonical slug
        and id; skip rows without a safe slug.
  - [x] Cap to six candidates and process with concurrency two. The implementation should be deterministic enough
        for unit tests to prove the cap and order.
  - [x] Yield before scheduling work with `requestIdleCallback` when available or a small cancellable timer fallback.
        Do not block click/tap handlers.
  - [x] Skip candidates whose exact detail key is already fresh in the TanStack cache.
  - [x] Use `queryClient.prefetchQuery` or an equivalent TanStack v5 API with the shared detail query options.
        Important: in TanStack Query v5, `prefetchQuery` resolves `Promise<void>` and does not throw or return data.
        If the scheduler needs per-candidate error/cooldown state, inspect `queryClient.getQueryState(queryKey)` after
        prefetch or use an API that reports errors explicitly; do not rely on `.catch()` from `prefetchQuery`.
  - [x] On direct interaction/open/dismiss/list-mode change, cancel queued work and call
        `queryClient.cancelQueries({ queryKey, exact: true }, { silent: true })` for in-flight candidate detail keys.

- [x] **Task 3 - Converge detail route identity on the public resolver** (AC: 5)
  - [x] Update `nextjs-app/app/api/venues/[slug]/route.ts` so live detail reads use
        `resolvePublicVenueIdentifier(decodedSlug)` from `lib/services/venue-store.ts`, not the older slug-only
        `getVenueBySlug(decodedSlug)` path.
  - [x] Preserve malformed percent-decoding behavior and existing 400/404 response shape where applicable.
  - [x] Preserve fixture-mode behavior: fixture fallback can match id/slug only in fixture mode; live Supabase uses the
        public resolver and rejects hidden or ambiguous rows.
  - [x] Preserve the Story 12.3 persisted outcome path, `SunGeometryCoverageMissingError` -> 503 handling, distance
        computation, and `Cache-Control: public, max-age=30, s-maxage=30, must-revalidate`.
  - [x] Do not change the public list route radius, list filtering behavior, or favourites discovery contract in this
        story unless needed to fix a failing Story 12.10 acceptance test.

- [x] **Task 4 - Preserve and harden cache-miss shell behavior** (AC: 6; Design Gate)
  - [x] Verify `VenueDetailOverlay` and `VenueDetailContent` still render fallback identity content immediately while
        detail is fetching.
  - [x] Keep the close/favourite/share chrome and map back/dismiss path usable during loading and error states.
  - [x] Keep `aria-busy` on the detail content while loading. If the current `role="status"` loading block can announce
        more than once across remounts or hidden desktop/mobile copies, adjust it so one visible polite announcement is
        emitted per cache-miss open.
  - [x] Update copy through `next-intl` if needed so Swedish loading announcement is exactly
        `Laddar platsinformation`; add/adjust the English counterpart only to keep locale files structurally aligned.
  - [x] Do not replace token skeletons with spinners or introduce raw colors/arbitrary spacing.

- [x] **Task 5 - Unit and component coverage** (AC: 1, 2, 4, 5, 6)
  - [x] Extend `test/unit/queries/useVenueDetail.test.ts` or add a dedicated helper test proving prefetch and
        `useVenueDetail` produce identical `detailAt` keys and URLs for slug, planner date/time, and bucketed coords.
  - [x] Add scheduler tests proving top-six selection, candidate order, deduplication, concurrency two, cache-skip,
        cancellation, and no rerun on scrub/date changes.
  - [x] Extend detail route tests so live Supabase id/slug public rows resolve through the Story 12.7 resolver and
        hidden/unknown/ambiguous rows produce indistinguishable public 404 behavior.
  - [x] Keep existing route tests around malformed slug, planner params, freshness headers, distance, and missing
        geometry coverage green.
  - [x] Add or update component tests only if cache-miss shell behavior changes; assert `aria-busy`, one polite status,
        close/back usability, and retry availability.

- [x] **Task 6 - E2E request-count and instant-open coverage** (AC: 1, 2, 3, 6, 7)
  - [x] Add or update Playwright request instrumentation to count both `/api/venues?...` list/favourites requests and
        `/api/venues/<slug>?...` detail requests. Do not leave detail prefetch invisible to the counter.
  - [x] Assert same-date scrub starts zero venue/list/detail requests after the initial prefetch pass has settled or
        been canceled.
  - [x] Assert planner-date change starts exactly the existing one list/favourites day-series request and no detail
        prefetch restart.
  - [x] Assert opening a prefetched candidate through **Mer info** produces no new detail request for the warmed key.
  - [x] Assert opening a non-prefetched candidate still opens the shell immediately and then fetches detail.
  - [x] Include a favourites-mode case when favourite rows are already loaded, so candidate selection is not only the
        main nearby list. Covered by deterministic scheduler unit coverage because the legacy `/favoriter` E2E remains
        unstable outside this story scope.

- [x] **Task 7 - Final gates and story review transition** (AC: all)
  - [x] Run from `nextjs-app/`: `npx tsc --noEmit`.
  - [x] Run from `nextjs-app/`: `npx eslint . --quiet`.
  - [x] Run from `nextjs-app/`: `npx vitest run`. If Windows full Vitest times out from worker pressure, rerun with
        `VITEST_MAX_WORKERS=4` and report both attempts.
  - [x] Run `npx playwright test` because this story changes shared query/request-count behavior and MapView
        interactions. Final serialized full-suite rerun passed on port 3225: 150 passed, 63 skipped. Earlier
        full-suite failures were triaged as (a) a Next/Turbopack `/sv` startup overlay cleared by removing generated
        `.next`, (b) a Story 12.10 cold-shell timing race fixed by hardening the local cold-detail fixture delay, (c) a
        stale Story 12.9 map-primary E2E assertion corrected in the test layer, and (d) one non-reproducible
        `browserContext.newPage` setup timeout that passed in focused isolation and in the final full run.
  - [x] Run visual validation only if a visible detail-shell/layout change was introduced. No intended visible layout
        change was introduced, so visual validation was not required.
  - [x] Record before/after **Mer info** open timing evidence in completion notes. If protected preview credentials are
        unavailable, state that live evidence is deferred to release-lane verification.
  - [x] Move to `review` only through
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

## Dev Notes

### ATDD Artifacts

- Checklist: `_bmad-output/test-artifacts/atdd-checklist-12-10-venue-detail-preload-instant-mer-info.md`
- Unit tests: `nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts`
- API tests: `nextjs-app/test/unit/api/story-12-10-detail-public-resolver.atdd.test.ts`
- Component tests: `nextjs-app/test/components/story-12-10-venue-detail-cache-miss-shell.atdd.test.tsx`
- E2E tests: `nextjs-app/test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts`

### Traceability Artifacts

- Progress matrix: `_bmad-output/test-artifacts/traceability-matrix.md`
- Story report: `_bmad-output/test-artifacts/traceability/traceability-report-12-10-venue-detail-preload-instant-mer-info.md`
- Machine summary: `_bmad-output/test-artifacts/traceability/e2e-trace-summary-12-10-venue-detail-preload-instant-mer-info.json`
- Phase 1 matrix JSON: `_bmad-output/test-artifacts/traceability/tea-trace-coverage-matrix-12-10-2026-07-26T21-01-02+02-00.json`
- Advisory verdict: PASS. Ten traced items are `FULL`, with 6/6 P0 and 4/4 P1 full coverage. This advisory trace did not emit an enforced release gate or modify sprint status.

## Dev Agent Record

### Agent Model Used

Codex GPT-5 auto-bmad delegate

### Review Findings

- **HIGH - Map interactions bypass prefetch cancellation**
  - Triage: accepted.
  - Resolution: routed map-pin selection, map-canvas deselect, and QuickInfo dismiss through MapView-owned interaction callbacks so they bump the existing prefetch interaction token and cancel candidate work. `Mer info` still preserves the opened exact detail slug/key.
  - Files: `nextjs-app/components/custom/map/MapView.tsx`, `nextjs-app/components/custom/map/VenuePinLayer.tsx`, `nextjs-app/test/components/MapView.test.tsx`.
  - Tests: focused MapView regression tests for map-pin cancellation and QuickInfo-dismiss cancellation; full MapView component suite; full Vitest; Story 12.10 Playwright smoke/regression.

- **HIGH - Candidate order can differ from visible list**
  - Triage: accepted.
  - Resolution: MapView now derives prefetch rows from the same exported `sortVenuesForList` helper used by the rendered venue list and passes the sorted displayed near/favourite rows into the prefetch hook. The prefetch hook preserves caller order for the primary displayed surface and only applies the existing nearest fallback rule.
  - Files: `nextjs-app/components/custom/map/MapView.tsx`, `nextjs-app/test/components/MapView.test.tsx`.
  - Tests: MapView regression where API order differs from visible distance order and the user selects distance before the surface settles; full Vitest; Story 12.10 Playwright request-count/order spec.

- **MEDIUM - Route 400/404 response body lost existing `status`**
  - Triage: accepted.
  - Resolution: restored generic non-leaking malformed-slug and not-found bodies to `{ detail, status: 400|404 }`.
  - Files: `nextjs-app/app/api/venues/[slug]/route.ts`, `nextjs-app/test/unit/api/story-12-10-detail-public-resolver.atdd.test.ts`.
  - Tests: focused Story 12.10 route ATDD plus full Vitest.

- **Security review**
  - Result: PASS, 0 findings.

#### Human-feedback Re-review (2026-07-26)

- [x] [Review][Product Override][High] Explicit selected-intent detail prefetch is required and bounded [nextjs-app/components/custom/map/MapView.tsx:876]
  - Triage: superseded by direct product instruction on 2026-07-27. The stale review treated selected-intent prefetch as a defect, but explicit user pin/list selection must now immediately prefetch exactly that venue detail key so `Mer info` can reuse/adopt it.
  - Resolution: explicit MapView pin selection, list-row selection, and open-detail A-to-B pin switching cancel background candidate work, preserve the selected slug, and call `prefetchSelectedVenueDetail` for that exact slug/params. Passive/default/forced URL selection remains effect-driven and does not call selected-intent prefetch. The initial settled background preload remains bounded to at most six candidates with concurrency two; an explicit selected-intent request after real interaction may be the seventh and is deduplicated by TanStack Query.
  - Tests: `MapView.test.tsx` explicit-vs-passive selected-intent coverage and Story 12.10 desktop/mobile Playwright request-count checks.
- [x] [Review][Patch][Med] After-21 live results use the true wall-clock while the visible and ARIA slider still reports 21:00 [nextjs-app/components/composed/time/TimeSlider.tsx:64]
  - Triage: accepted.
  - Resolution: `TimeSlider` keeps the thumb clamped to the planner end while its visible top-panel badge and `aria-valuetext` report the true after-hours live selected time.
  - Tests: `TimeSlider.edge-cases.automate.test.tsx` after-hours label regression and Story 12.10 mobile exact-planner-param Playwright check.
- [x] [Review][Product Override][Med] Cold-detail loading requires a visible token scrim and spinner [_bmad-output/implementation-artifacts/12-10-venue-detail-preload-instant-mer-info.md:251]
  - Triage: superseded by direct product instruction on 2026-07-27. The stale no-visible-change/no-spinner constraint is overridden; a cold/loading venue detail must show a visible grey token scrim and loading spinner.
  - Resolution: restored a visible token-based `bg-text-primary/20` content scrim with `LoaderCircle` while retaining stable token skeletons underneath and one `sr-only` polite loading status. A later human-feedback refinement replaced the scrim blur token with `backdrop-blur-subtle` so loading remains unambiguous without making the underlying loading content unrecognizable. Close/favourite/share chrome stays outside the content scrim and remains usable.
  - Tests: `VenueDetailContent.test.tsx`, `VenueDetailOverlay.test.tsx`, Story 12.10 cache-miss shell ATDD, and Story 12.10 desktop/mobile Playwright check the busy shell/scrim path.

#### Final Human-Feedback Re-review (2026-07-27)

- [x] [Review][Patch][High] Bare-map detail dismissal leaves the previous venue selected, so closing detail can reveal QuickInfo instead of returning to the bare map. [nextjs-app/components/custom/map/MapView.tsx:958]
  - Triage: accepted. This matches the direct 2026-07-27 product direction that pin B switches an open A detail panel, while a bare-map click closes the detail state to the map.
  - Trigger: open detail for venue A, click bare map canvas, `handleMapCanvasDeselect` calls `handleDismissDetails()` and returns without `selectVenue(null)`; `selectedPinData && !isVenueDetailRequested` can then render QuickInfo for A.
  - Recommended: fix by clearing the selected venue when a bare-map click dismisses URL-owned detail, without regressing the pin A-to-B replacement path.
  - Resolution: `handleMapCanvasDeselect` now clears local selection after dismissing URL-owned detail from a bare-map click, while the existing open-detail A-to-B pin replacement path still returns before local selection changes.
  - Tests: `MapView.test.tsx` bare-canvas regression plus Story 12.10 desktop/mobile Playwright.
- [x] [Review][Patch][High] After-21 live slider display can snap back to 21:00 on blur/snap, dropping the true live label/ARIA and reintroducing planner params. [nextjs-app/components/composed/time/TimeSlider.tsx:211]
  - Triage: accepted. This matches the direct 2026-07-27 product direction that after-21 live label/ARIA remains the true wall-clock time while only the representational thumb is safely clamped.
  - Trigger: during an after-21 live session, `TimeSlider` displays `selectedMinutes` for label/ARIA, but `onBlur={() => onSnap()}` still calls `TimeContext.snapSelectedMinutes`, which snaps through planner clamping and can convert the live value to `21:00`.
  - Recommended: fix by making snap preserve after-hours live `selectedMinutes`/`isLiveNow` and only clamp the visual thumb.
  - Resolution: `TimeSlider` now treats after-hours live display as a protected controlled value on blur, preserving the true wall-clock label/ARIA while the native thumb remains visually clamped at the planner end.
  - Tests: `TimeSlider.edge-cases.automate.test.tsx` blur regression plus Story 12.10 desktop/mobile Playwright.

#### Post-Fix Re-review (2026-07-27)

- [x] [Review][Patch][High] Bare-map detail dismissal can be reselected by stale URL sync before `router.replace` clears `venue`. [nextjs-app/components/custom/map/MapView.tsx:793]
  - Triage: accepted as a surviving post-fix race, not as a stale product rule that the selected pin must always be cleared. Direct human intent requires the bare-map click to correctly dismiss URL-owned detail; the current patch clears local selection, but the old `venueSlugParam` can still drive URL selection sync until the async URL replace is reflected.
  - Evidence: the post-fix diff adds `selectVenue(null)` after `handleDismissDetails()` in `handleMapCanvasDeselect` [nextjs-app/components/custom/map/MapView.tsx:958]. `handleDismissDetails()` removes `venue` through `router.replace(...)` [nextjs-app/components/custom/map/MapView.tsx:914], but while the stale `venueSlugParam` is still present the URL-selection effect can match that slug and call `selectVenue(match.id, match)` [nextjs-app/components/custom/map/MapView.tsx:793]. Once the URL finally clears, `selectedPinData && !isVenueDetailRequested` can render the resurrected venue QuickInfo [nextjs-app/components/custom/map/MapView.tsx:1447].
  - Recommended: patch the URL-owned dismissal path with a transient dismissed-slug or pending-URL-clear guard so the URL-selection effect cannot reselect the just-dismissed slug while `router.replace` is pending. Clear the guard after the `venue` param changes/clears or when an explicit A-to-B pin/list interaction replaces the slug. Preserve explicit-interaction exact prefetch, visible loading scrim/spinner behavior, and open-detail A-to-B switching.
  - Resolution: `MapView` now records the bare-canvas dismissed slug while URL clearing is pending, skips same-slug URL selection during that transient window, clears the guard when the `venue` param changes/clears, and clears it when an explicit venue interaction takes over.
  - Tests: added a MapView regression that simulates bare-map dismiss, rerenders while the old `venue=...` search param is still present, then clears the URL and asserts the detail dismissal does not resurrect the old venue QuickInfo; A-to-B switching coverage remains green.

#### Final Acceptance Audit (2026-07-27)

- [x] Final commit `e234c29` contains the URL-sync dismissal guard; all latest Review Findings are resolved.
- [x] Final acceptance auditor result: Approve, 0 Critical / 0 High / 0 Medium / 0 Low; security review 0 findings at all severities.
- [x] No open findings, decisions, deferrals, or blockers remain. Story status remains `in-progress` until the canonical wrapper is rerun.

### Debug Log References

- Baseline before edits: `npx tsc --noEmit`; `npx eslint . --quiet`.
- Focused RED/GREEN and regression checks: Story 12.10 unit/API/component tests, `useVenueDetail` tests,
  venue-detail route tests, `MobileBottomSheet` tests, Story 12.10 E2E, Epic 11 request-count/touch guards,
  favourites mobile, axe venue-photo, and Story 12.4/visit-loop focused cases.
- Final local checks after implementation: `npx tsc --noEmit`; `npx eslint . --quiet`;
  `$env:VITEST_MAX_WORKERS='4'; npx vitest run` -> 197 files passed, 1804 tests passed, 15 skipped.
- Story 12.10 E2E after final hardening:
  `PLAYWRIGHT_PORT=3219 PLAYWRIGHT_BASE_URL=http://localhost:3219 npx playwright test test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts --project=desktop --project=mobile`
  -> 8 passed.
- Full Playwright attempt 1:
  `PLAYWRIGHT_PORT=3216 PLAYWRIGHT_BASE_URL=http://localhost:3216 npx playwright test`
  -> 149 passed, 63 skipped, 1 failed: `[mobile] map-primary.spec.ts:319` with Next dev overlay
  `SyntaxError: Unexpected end of JSON input` on `/sv`. Focus rerun of the exact test on port 3217 passed.
- Full Playwright attempt 2:
  `PLAYWRIGHT_PORT=3218 PLAYWRIGHT_BASE_URL=http://localhost:3218 npx playwright test`
  -> 148 passed, 63 skipped, 2 failed before the Story 12.10 fixture hardening: same `/sv` map-primary startup
  overlay plus a Story 12.10 desktop transient busy-shell assertion that was fixed by increasing the local mocked
  cold-detail delay to 1500 ms.
- Clean-cache serialized Full Playwright attempt:
  `PLAYWRIGHT_PORT=3220 PLAYWRIGHT_BASE_URL=http://localhost:3220 npx playwright test --workers=1`
  -> 149 passed, 63 skipped, 1 failed: stale `map-primary.spec.ts` mobile expectation still assumed the pre-Story 12.9
  visible `06:00` label/request pattern. The product UI had already moved to the approved slim badge/calendar contract.
- Focused stale-test correction:
  `PLAYWRIGHT_PORT=3222 PLAYWRIGHT_BASE_URL=http://localhost:3222 npx playwright test test/e2e/map-primary.spec.ts:607 --project=mobile --workers=1`
  -> 1 passed. The test now listens before the calendar date click and treats the subsequent `Home` key as a UI-only
  06:00 minimum assertion, preserving the Epic 11 same-date zero-fetch contract.
- Full Playwright attempt after stale-test correction:
  `PLAYWRIGHT_PORT=3223 PLAYWRIGHT_BASE_URL=http://localhost:3223 npx playwright test --workers=1`
  -> 149 passed, 63 skipped, 1 failed: non-reproducible Playwright setup stall before Story 12.4's mobile test body
  (`browserContext.newPage` timeout). Focused isolation
  `PLAYWRIGHT_PORT=3224 PLAYWRIGHT_BASE_URL=http://localhost:3224 npx playwright test test/e2e/story-12-4-console-hygiene.spec.ts:338 --project=mobile --workers=1`
  -> 1 passed.
- Final serialized Full Playwright gate:
  `PLAYWRIGHT_PORT=3225 PLAYWRIGHT_BASE_URL=http://localhost:3225 npx playwright test --workers=1`
  -> 150 passed, 63 skipped.
- Post-dev automate focused guard:
  `npx vitest run test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts`
  -> 1 file / 10 tests passed. `npx eslint test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts --quiet`
  -> 0 errors.
- Thin review fix focused guard:
  `npx vitest run test/components/MapView.test.tsx -t "detail prefetch|QuickInfo is dismissed|map pin selects|distance is selected"`
  -> 1 file / 3 tests passed, 108 skipped.
- Thin review fix route/scheduler guard:
  `npx vitest run test/unit/api/story-12-10-detail-public-resolver.atdd.test.ts test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts`
  -> 2 files / 13 tests passed.
- Thin review fix focused aggregate:
  `npx vitest run test/components/MapView.test.tsx test/unit/api/story-12-10-detail-public-resolver.atdd.test.ts test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts`
  -> 3 files / 124 tests passed.
- Thin review fix gates:
  `npx tsc --noEmit` -> passed. `npx eslint . --quiet` -> passed.
  `$env:VITEST_MAX_WORKERS='4'; npx vitest run` -> 197 files passed, 2 skipped; 1808 tests passed, 15 skipped.
- Thin review fix Story 12.10 Playwright check:
  `PLAYWRIGHT_PORT=3230 PLAYWRIGHT_BASE_URL=http://localhost:3230 npx playwright test test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts --project=desktop --project=mobile --workers=1`
  -> 8 passed.
- Canonical story review gate:
  `.\scripts\run-sh.ps1 scripts/story-review.sh 12-10-venue-detail-preload-instant-mer-info`
  -> lint PASS, typecheck PASS, Vitest 197 passed/2 skipped, 1808 tests passed/15 skipped; visual validation skipped
  because no mapped screen ID; sprint status moved to `review`; validation artifact:
  `_bmad-output/implementation-artifacts/validation/12-10-venue-detail-preload-instant-mer-info-review-20260726-211112.log`.
- Human remediation - night/live-time focused guard:
  `npx vitest run test/unit/TimeContext.test.tsx test/unit/services/sun-geometry-persisted-outcome.automate.test.ts`
  -> 2 files / 26 tests passed. `npx tsc --noEmit` -> passed. `npx eslint . --quiet` -> passed.
- Human-feedback re-review finish:
  `npx vitest run test/components/MapView.test.tsx test/components/TimeSlider.edge-cases.automate.test.tsx test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts`
  -> 3 files / 137 tests passed. `npx tsc --noEmit` -> passed. `npx eslint . --quiet` -> passed.
  `PLAYWRIGHT_PORT=3241 PLAYWRIGHT_BASE_URL=http://localhost:3241 npx playwright test test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts --project=desktop --workers=1`
  -> 6 passed.
  `PLAYWRIGHT_PORT=3242 PLAYWRIGHT_BASE_URL=http://localhost:3242 npx playwright test test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts --project=mobile --workers=1`
  -> 4 passed, 2 skipped.
- Product-direction reconciliation:
  `npx vitest run test/components/MapView.test.tsx test/components/TimeSlider.edge-cases.automate.test.tsx test/components/VenueDetailContent.test.tsx test/components/VenueDetailOverlay.test.tsx test/components/story-12-10-venue-detail-cache-miss-shell.atdd.test.tsx test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts`
  -> 6 files / 183 tests passed.
  `PLAYWRIGHT_PORT=3251 PLAYWRIGHT_BASE_URL=http://localhost:3251 npx playwright test test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts --project=desktop --workers=1`
  -> 6 passed.
  `PLAYWRIGHT_PORT=3252 PLAYWRIGHT_BASE_URL=http://localhost:3252 npx playwright test test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts --project=mobile --workers=1`
  -> 4 passed, 2 skipped (desktop-only tests).
  `npx tsc --noEmit` -> passed.
  `npx eslint . --quiet` -> passed.
- Final human-feedback high patch pass:
  `npx vitest run test/components/MapView.test.tsx test/components/TimeSlider.edge-cases.automate.test.tsx test/components/TimeSlider.test.tsx test/components/TimeSlider.dragdecouple.atdd.test.tsx`
  -> first run 1 MapView expectation failure after production fix; rerun after test assertion correction -> 4 files / 141 tests passed.
  `PLAYWRIGHT_PORT=3253 PLAYWRIGHT_BASE_URL=http://localhost:3253 npx playwright test test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts --project=desktop --workers=1`
  -> setup failed before app assertions because a stale same-app `next dev` lock reset/refused connections; process was gone on inspection.
  `PLAYWRIGHT_PORT=3254 PLAYWRIGHT_BASE_URL=http://localhost:3254 npx playwright test test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts --project=desktop --workers=1`
  -> 6 passed.
  `PLAYWRIGHT_PORT=3255 PLAYWRIGHT_BASE_URL=http://localhost:3255 npx playwright test test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts --project=mobile --workers=1`
  -> 4 passed, 2 skipped (desktop-only tests).
  `npx tsc --noEmit` -> passed.
  `npx eslint . --quiet` -> passed.
- Post-fix URL-sync race patch:
  `npx vitest run test/components/MapView.test.tsx -t "keeps a bare-canvas detail dismissal closed"` -> first run failed as expected before the guard; passing coverage came from the targeted 3-test rerun below.
  `npx vitest run test/components/MapView.test.tsx -t "bare-canvas detail dismissal|switches an open detail|dismisses an open detail from a bare canvas"` -> 1 file / 3 tests passed.
  `npx vitest run test/components/MapView.test.tsx test/components/VenueDetailContent.test.tsx test/components/VenueDetailOverlay.test.tsx test/components/story-12-10-venue-detail-cache-miss-shell.atdd.test.tsx test/components/TimeSlider.edge-cases.automate.test.tsx` -> 5 files / 174 tests passed.
  `PLAYWRIGHT_PORT=3261 PLAYWRIGHT_BASE_URL=http://localhost:3261 npx playwright test test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts --project=desktop --workers=1` -> setup failed before app assertions because an existing same-app `next dev` process held `.next/dev` and reset/refused connections; stopped PID 35732 after verifying it was `nextjs-app`'s dev server.
  `PLAYWRIGHT_PORT=3263 PLAYWRIGHT_BASE_URL=http://localhost:3263 npx playwright test test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts --project=desktop --workers=1` -> 6 passed.
  `PLAYWRIGHT_PORT=3264 PLAYWRIGHT_BASE_URL=http://localhost:3264 npx playwright test test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts --project=mobile --workers=1` -> 4 passed, 2 skipped (desktop-only tests).
  `npx tsc --noEmit` -> passed.
  `npx eslint . --quiet` -> passed.
- Final human-feedback verification after `e234c29` URL-sync guard:
  `npx tsc --noEmit` -> passed. `npx eslint . --quiet` -> passed.
  Full Vitest -> 197 files passed, 2 skipped; 1825 tests passed, 15 skipped.
  Focused Story 12.10 Playwright desktop+mobile -> 10 passed, 2 skipped.
  Individually green focused Playwright cases: mobile geometry contract, mobile planner params-to-venues, and desktop selected-intent prefetch-before-`Mer info`.
  Full Playwright -> 151 passed, 65 skipped, 1 failed; the only failure was mobile planner params-to-venues timing out in-suite, then the exact fresh-port rerun passed. This is recorded as a known suite-order/timing flake; the full suite itself is not claimed all-green.
  Final guard audit also ran focused Vitest `MapView` -> 6 passed, plus cache-miss/`TimeSlider` edge coverage -> 13 passed.
- Human-feedback blur refinement:
  Baseline before production edits: `npx tsc --noEmit` -> passed; `npx eslint . --quiet` -> passed.
  Focused guard: `npx vitest run test/components/story-12-10-venue-detail-cache-miss-shell.atdd.test.tsx test/components/VenueDetailContent.test.tsx`
  -> 2 files / 27 tests passed, including the regression that the loading scrim uses `backdrop-blur-subtle` and does not use `backdrop-blur-standard`.
  Final checks: `npx tsc --noEmit` -> passed; `npx eslint . --quiet` -> passed.

### Completion Notes List

- Extracted `venue-detail-query-options.ts` so mounted `useVenueDetail` and background prefetch share the exact
  `detailAt` key, URL normalization, planner/date/time handling, 4-decimal coordinate bucket, retry/backoff,
  stale-time, live polling, placeholder, and `AbortSignal` behavior.
- Added bounded initial-settle detail prefetch from already-loaded near/favourite rows: max six candidates,
  deterministic order, concurrency two, fresh-cache skip, exact-key cancellation, opened in-flight key preservation,
  no scrub/date restart, and no direct-venue speculative prefetch.
- Hardened prefetch pressure behavior: forced/dev routes (`_state`, `_time`, `_date`) do not prefetch unless they
  explicitly opt in with `_prefetch=venue-detail`; any background prefetch error/429 stops after the current two-request
  batch, clears failed background detail query state, enters a 60s cooldown, and stays app-console-silent.
- Updated `/api/venues/[slug]` live detail lookup to use the Story 12.7 public resolver while preserving fixture mode,
  persisted sun/detail behavior, public 404/400 behavior, distance, freshness headers, and 503 missing-geometry handling.
- Preserved the cache-miss detail shell and aligned the Swedish loading announcement to `Laddar platsinformation`.
- Added a post-dev automate unit guard proving fresh exact `detailAt` cache entries are skipped without changing the
  remaining prefetch candidate order.
- Corrected the stale mobile map-primary E2E assertion for the approved Story 12.9 slider/date UI: date selection is the
  `/api/venues` request boundary, while same-date `Home` movement is asserted only as local UI state.
- Review fix: map-pin selection, map-canvas deselect, and QuickInfo dismiss now all pass through MapView's prefetch
  cancellation boundary instead of bypassing it inside `VenuePinLayer`/inline QuickInfo handlers.
- Review fix: detail prefetch candidates now receive the same near/favourite visible ordering that the list renders,
  including distance sort selected before initial settlement, without restarting after the first prefetch pass.
- Review fix: malformed detail slug and public not-found responses again include the generic `status` field in their
  JSON body while preserving non-leaking public error text.
- Local timing evidence: `_bmad-output/implementation-artifacts/validation/story-12-10-mer-info-timing/20260726-local/evidence.json`
  with 1500 ms injected cold-detail delay. Desktop warmed open: 0 new detail requests from `Mer info`, 568 ms; desktop selected-intent cold open:
  selected row click starts the single detail request, `Mer info` adds 0 more, 1492.5 ms. Mobile warmed open:
  0 new detail requests from `Mer info`, 1763 ms; mobile selected-intent cold open: selected row click starts the single detail request,
  `Mer info` adds 0 more, 1537 ms.
- Advisory traceability completed for Story 12.10: 10/10 traced items `FULL`, P0 6/6, P1 4/4, no endpoint/auth/error/UI-state gaps, and machine summary written without `gate_status` because this trace is advisory-only.
- Protected preview/live evidence was not run in this delegate because no credentials were provided; defer to the
  release lane.
- Canonical story-review wrapper completed and moved sprint status to `review`; validation artifact:
  `_bmad-output/implementation-artifacts/validation/12-10-venue-detail-preload-instant-mer-info-review-20260726-211112.log`.
- Human remediation addendum - night/live-time correctness only: after-21:00 Stockholm live sessions now keep the true
  wall-clock selected time and omit planner query params instead of aliasing to 21:00; persisted selected-instant
  outcomes now return public `NoSun`/0 when the requested instant is actually below horizon, while preserving a genuine
  low-angle daylight 25% nearest planner step. This addendum did not move story or sprint status.
- Product-direction reconciliation: restored required explicit selected-intent detail prefetch for real pin/list/A-to-B
  interactions while keeping passive/default selection from starting the extra request; restored the required visible
  grey token scrim + spinner for cold/loading detail while preserving skeletons and one polite loading status.
- Final human-feedback high patch: bare-map canvas dismissal now returns from URL-owned detail to the bare map by
  clearing selected venue state; open detail A-to-B pin replacement remains URL-only and preserves the selected-intent
  prefetch path.
- Final human-feedback high patch: after-21 live slider blur no longer calls the planner snap seam that could coerce the
  live value to 21:00; visible label and `aria-valuetext` keep the true wall-clock time while the thumb stays clamped.
- Post-fix URL-sync race patch: bare-map detail dismissal now stays closed while the stale `venue` search param is still
  observable; the pending dismissed-slug guard clears on URL catch-up or explicit venue replacement, preserving A-to-B
  pin switching and selected-intent prefetch.
- Final acceptance evidence recorded after commit `e234c29`: all latest Review Findings resolved, final auditor approved
  with 0 severity findings including security, typecheck/lint/Vitest/focused Story 12.10 Playwright passed, the single
  full-Playwright mobile planner timeout is documented as a suite-order/timing flake with exact fresh-port rerun green,
  and no open findings, decisions, deferrals, or blockers remain.
- Canonical review sync completed with validation artifact
  `_bmad-output/implementation-artifacts/validation/12-10-venue-detail-preload-instant-mer-info-review-20260727-135556.log`:
  lint pass, typecheck pass, Vitest 197 files passed/2 skipped and 1825 tests passed/15 skipped, no mapped visual
  screen, and sprint transition to `review`.
- Human-feedback blur refinement: the cache-miss loading scrim now uses the existing `backdrop-blur-subtle` token while preserving `bg-text-primary/20`, spinner, stable skeletons, `aria-busy`, usable shell chrome, and the single polite `Laddar platsinformation` status; no reference PNG or `REBASELINE-LOG.md` change was made, and the story remains `in-progress` for orchestrator-owned review handoff.
- Human UAT visual evidence for the less-blur refinement was recorded at
  `_bmad-output/implementation-artifacts/validation/story-12-10-human-uat/20260727-less-blur/`.
  Mobile 390x844 and desktop 1440x900 captures both prove computed `backdrop-filter: blur(1.5px)`, token-grey
  `bg-text-primary/20` scrim, visible spinner, 6 visible skeletons, exactly one polite Swedish status,
  `aria-busy="true"` during the held cold-detail request and `aria-busy="false"` after release, with 0 console errors
  and 0 page errors. This was evidence-only; authoritative reference PNGs and `REBASELINE-LOG.md` were unchanged, and
  story status remained `in-progress` until the canonical wrapper reran.
- Canonical final review sync completed with validation artifact
  `_bmad-output/implementation-artifacts/validation/12-10-venue-detail-preload-instant-mer-info-review-20260727-145432.log`:
  lint pass, typecheck pass, Vitest 197 files passed/2 skipped and 1825 tests passed/15 skipped, no mapped visual
  screen, and sprint transition `in-progress` -> `review`. Story status is now `review`; human approval remains pending.

### File List

- `nextjs-app/lib/contexts/TimeContext.tsx`
- `nextjs-app/lib/services/sun-geometry-repository.ts`
- `nextjs-app/hooks/queries/venue-detail-query-options.ts`
- `nextjs-app/hooks/queries/useVenueDetail.ts`
- `nextjs-app/hooks/queries/useVenueDetailPrefetch.ts`
- `nextjs-app/components/custom/map/MapView.tsx`
- `nextjs-app/components/composed/time/TimeSlider.tsx`
- `nextjs-app/components/custom/map/VenuePinLayer.tsx`
- `nextjs-app/components/custom/sheets/MobileBottomSheet.tsx`
- `nextjs-app/app/api/venues/[slug]/route.ts`
- `nextjs-app/messages/sv/venue.json`
- `nextjs-app/messages/en/venue.json`
- `nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts`
- `nextjs-app/test/unit/TimeContext.test.tsx`
- `nextjs-app/test/unit/services/sun-geometry-persisted-outcome.automate.test.ts`
- `nextjs-app/test/unit/api/story-12-10-detail-public-resolver.atdd.test.ts`
- `nextjs-app/test/components/story-12-10-venue-detail-cache-miss-shell.atdd.test.tsx`
- `nextjs-app/test/components/TimeSlider.edge-cases.automate.test.tsx`
- `nextjs-app/test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts`
- `nextjs-app/test/e2e/map-primary.spec.ts`
- `nextjs-app/test/components/MapView.test.tsx`
- `nextjs-app/test/components/MobileBottomSheet.test.tsx`
- `nextjs-app/test/e2e/favourites.spec.ts`
- `nextjs-app/test/e2e/axe.spec.ts`
- `nextjs-app/test/e2e/epic-11-sheet-touch-gestures.spec.ts`
- `_bmad-output/test-artifacts/atdd-checklist-12-10-venue-detail-preload-instant-mer-info.md`
- `_bmad-output/test-artifacts/traceability-matrix.md`
- `_bmad-output/test-artifacts/traceability/traceability-report-12-10-venue-detail-preload-instant-mer-info.md`
- `_bmad-output/test-artifacts/traceability/e2e-trace-summary-12-10-venue-detail-preload-instant-mer-info.json`
- `_bmad-output/test-artifacts/traceability/tea-trace-coverage-matrix-12-10-2026-07-26T21-01-02+02-00.json`
- `_bmad-output/implementation-artifacts/validation/story-12-10-mer-info-timing/20260726-local/evidence.json`
- `_bmad-output/implementation-artifacts/validation/story-12-10-human-uat/20260727-less-blur/evidence.json`
- `_bmad-output/implementation-artifacts/validation/story-12-10-human-uat/20260727-less-blur/evidence.md`
- `_bmad-output/implementation-artifacts/validation/story-12-10-human-uat/20260727-less-blur/mobile-390x844-venue-detail-loading.png`
- `_bmad-output/implementation-artifacts/validation/story-12-10-human-uat/20260727-less-blur/desktop-1440x900-venue-detail-loading.png`
- `_bmad-output/implementation-artifacts/validation/12-10-venue-detail-preload-instant-mer-info-review-20260727-145432.log`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/12-10-venue-detail-preload-instant-mer-info.md`
