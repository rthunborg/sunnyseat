# Story 12.7: Reviews Route Resolves Live Venues (Fix the 404 on Real Venues)

Status: ready-for-dev

## Story

As a **user (and the maintainer)**,
I want reviews to load for the real venues,
So that a live venue with no reviews shows an empty reviews section (not a 404 error).

## Source Context (Verbatim From Epic)

_Context (2026-07-08, confirmed bug — adversarially verified):_ opening a
newly-seeded venue's detail logs a 404 fetching reviews. **Root cause is NOT "zero
reviews" — it is a venue-identity source mismatch.** `resolveReviewVenueIdentifier`
(`nextjs-app/lib/services/venue-reviews-persistence.ts:113-122`) resolves the venue
ONLY against the hardcoded 7-row `VENUE_FIXTURE`; a live venue (ids "8"–"49") is
absent, so `/api/reviews` returns `404 Venue not found` at
`app/api/reviews/route.ts:87-88` BEFORE the (correct, empty-list-returning) review
lookup is reached. The detail route (`/api/venues/[slug]`) resolves the same venue
fine because it uses `getVenueBySlug` → the live Supabase store. Both the GET and
POST review paths gate on the fixture resolver.

## Acceptance Criteria (Verbatim From Epic)

**Given** the review route resolves venue identity against the fixture-only
`resolveReviewVenueIdentifier`, while `/api/venues/[slug]` resolves via
`getVenueBySlug` (the live store, gated on `SUNNYSEAT_VENUE_STORE=supabase`)
**When** the review route (GET + POST) is switched to a live venue-identity resolver
that accepts **id OR slug** (in supabase mode, look the venue up in the live store by
EITHER) — this is REQUIRED because POST resolves `body.venueId ?? body.venueSlug`, so a
live venue's numeric id (`"8"`–`"49"`) is tried FIRST and a slug-only lookup would still
404 on submit; fall back to the fixture only in fixture mode
**Then** a live venue with zero reviews resolves and returns **200** with
`reviews: []` / `reviewCount: 0` (the empty-list path at `route.ts:96-100` already
does this once resolution succeeds), and a genuinely unknown identifier still 404s

**Given** the client requests `GET /api/reviews?venueId=<slug>` (`useVenueReviews.ts`,
identifier = `venue.slug`)
**When** the fix lands
**Then** the two endpoints share ONE venue-identity source (no duplicated Supabase
query), and posting a review for a live venue also resolves (POST path at
`route.ts:153-154`)

**Given** the app is LIVE on `SUNNYSEAT_VENUE_STORE=supabase` +
`SUNNYSEAT_REVIEW_PERSISTENCE=supabase`
**When** the resolver change ships
**Then** a regression test seeds/mocks a live venue absent from the fixture and asserts
`GET /api/reviews` returns 200 empty (not 404), plus a fixture-mode test still passes

**Given** the **`/api/venues/[slug]/feedback` POST route has the IDENTICAL bug** — it
imports `VENUE_FIXTURE` and resolves the path slug against the fixture, so real-venue
feedback submissions 404 (this blocks the Story-12.2 accuracy loop, which needs those rows)
**When** this story ships
**Then** the feedback POST route is switched to the SAME live id/slug resolver, so
submitting feedback for a live venue (ids `"8"`–`"49"`) succeeds — covered by a route test

## Design Gate Criteria

_(Backend-only; no design gate. Effort: small. Scope now = reviews GET/POST **and** the
feedback POST route — one shared live resolver for all three.)_

## Tasks / Subtasks

- [ ] **Task 0 - Preflight the current branch before coding** (AC: 1, 2, 4)
  - [ ] Run from `nextjs-app/`: `npx tsc --noEmit` and `npx eslint . --quiet`. If failures are outside this story's scope, stop and report them before editing.
  - [ ] Confirm the starting bug seams still exist: `nextjs-app/lib/services/venue-reviews-persistence.ts` exports fixture-only `resolveReviewVenueIdentifier`, `nextjs-app/app/api/reviews/route.ts` calls it for GET and POST, and `nextjs-app/app/api/venues/[slug]/feedback/route.ts` imports `VENUE_FIXTURE`.
  - [ ] Inspect the live venue visibility schema/types before changing the resolver. Architecture names the public guard as visible-only (`hidden = false`), while current precompute code already reads `is_hidden`, `visibility`, and `deleted_at`. Reconcile to the actual project schema in this branch; do not implement a public resolver that treats an unmodeled hidden/deleted row as visible.

- [ ] **Task 1 - Add one shared server-only public venue identity resolver** (AC: 1, 2, 3, 4)
  - [ ] Prefer `nextjs-app/lib/services/venue-store.ts` unless a small adjacent server-only module better fits the existing dependency direction. The resolver must be the single identity source used by reviews GET, reviews POST, and feedback POST.
  - [ ] Export an async helper with a narrow public contract, for example `resolvePublicVenueIdentifier(identifier: string): Promise<StoredVenue | null>`. Keep it server-only and do not expose visibility/admin fields in public DTOs.
  - [ ] In fixture mode, resolve against the existing fixture/in-memory seed by `id`, `venueId`, `slug`, or `venueSlug`; this is the only mode where fixture fallback is allowed.
  - [ ] In Supabase mode, resolve live venues by **id OR slug** against the live venue store. Reject blank identifiers, unknown venues, hidden venues, and deleted venues by returning `null` so public routes produce the same 404 class.
  - [ ] Apply the public visibility guard in the resolver, not in each route. Public route handlers must not accept `includeHidden`.
  - [ ] Avoid ad hoc duplicated Supabase queries in route handlers. If the Supabase filter uses `.or(...)`, centralize safe filter-value escaping instead of interpolating raw identifiers.
  - [ ] Fail closed on corrupt identity collisions rather than choosing an arbitrary row. The expected healthy case is a single row because `id` and `slug` are unique.
  - [ ] Preserve the existing `getVenues()` / `getVenueBySlug()` behavior unless the resolver needs a shared internal helper. Do not implement Story 12.5 editor/admin visibility flows here.

- [ ] **Task 2 - Rewire reviews GET and POST to the shared resolver** (AC: 1, 2, 3)
  - [ ] Replace `resolveReviewVenueIdentifier` usage in `nextjs-app/app/api/reviews/route.ts` with the shared async resolver. Make both GET and POST await it.
  - [ ] Keep current request validation, JSON/content-size checks, per-IP rate limiting, mismatch `409` handling, and `Cache-Control: no-store`.
  - [ ] For GET, a live venue with no persisted reviews must return `200` with `reviews: []` and summary `reviewCount: 0`, not `404`.
  - [ ] For POST, keep `primaryIdentifier = body.venueId ?? body.venueSlug` so numeric live IDs are tried before slug. Then keep the existing body id/slug mismatch checks against the resolved venue.
  - [ ] Unknown, hidden, deleted, and malformed identifiers must not hit review persistence. They should return the same public not-found behavior.
  - [ ] Remove or demote the old fixture-only review resolver from `nextjs-app/lib/services/venue-reviews-persistence.ts`; that file should remain focused on review persistence after this change.

- [ ] **Task 3 - Rewire feedback POST to the same resolver** (AC: 4)
  - [ ] Replace the route-local `VENUE_FIXTURE` import/find in `nextjs-app/app/api/venues/[slug]/feedback/route.ts` with the shared resolver.
  - [ ] Resolve the decoded path identifier by id or slug in live mode and by fixture identity only in fixture mode.
  - [ ] Keep the existing body `venueId`/`venueSlug` mismatch checks, Zod validation, feedback persistence error mapping, and public response shape.
  - [ ] Hidden, deleted, and unknown venues must return the same 404 class before `persistVenueFeedback` is called.
  - [ ] Do not implement Story 12.2 prediction-evidence fields, accuracy aggregation, or coverage-cap cleanup in this story. This story only unblocks Story 12.2 by fixing live venue identity for feedback POST.

- [ ] **Task 4 - Add route and resolver regression coverage** (AC: 1, 2, 3, 4)
  - [ ] Add focused resolver tests in `nextjs-app/test/unit/services/venue-store.test.ts` or a new adjacent resolver test. Cover fixture mode, Supabase live id, Supabase live slug, unknown, hidden, deleted, blank identifier, and any safe `.or(...)` escaping helper.
  - [ ] Update `nextjs-app/test/unit/api/reviews-route.test.ts` so a Supabase-mode venue absent from `VENUE_FIXTURE` returns `200` empty on GET and can resolve on POST. Include id-first and slug-based cases.
  - [ ] Keep or update fixture-mode review tests to prove local fixture fallback still works outside Supabase venue-store mode.
  - [ ] Update `nextjs-app/test/unit/api/venue-feedback-route.test.ts` so a Supabase-mode venue absent from `VENUE_FIXTURE` can submit feedback by id or slug and hidden/unknown live venues 404 before persistence.
  - [ ] Update `nextjs-app/test/unit/services/venue-reviews-persistence.test.ts` if the old resolver export is removed or replaced.
  - [ ] If useful, unskip or replace only the Story 12.2 ATDD checks that assert feedback no longer imports/uses `VENUE_FIXTURE`; leave non-12.7 feedback-evidence tests scoped to Story 12.2.
  - [ ] Tests must mock Supabase/service-role behavior deterministically. Do not call live Supabase or external providers.

- [ ] **Task 5 - Check the Epic 12 identity/visibility matrix without widening story scope** (AC: 1, 2, 4)
  - [ ] Confirm reviews GET, reviews POST, and feedback POST all consume the same shared resolver and have no route-local `VENUE_FIXTURE.find` or duplicated Supabase venue lookup.
  - [ ] Confirm hidden and unknown live identifiers are indistinguishable from the public API perspective.
  - [ ] Confirm no public endpoint in this story accepts or forwards `includeHidden`.
  - [ ] Record in the Dev Agent Record that downstream Story 12.5, 12.10, and 12.14 consumers still need to adopt the shared guard where their routes are touched. Do not implement those downstream stories here unless their code must be minimally adjusted to keep this story compiling.
  - [ ] Preserve review cache behavior (`no-store`) and do not add wider route caching around identity resolution.

- [ ] **Task 6 - Run required checks and transition through the story review gate** (AC: all)
  - [ ] Run from `nextjs-app/`: `npx tsc --noEmit`, `npx eslint . --quiet`, and `npx vitest run`.
  - [ ] Run focused tests while developing, at minimum the review route, feedback route, resolver/store, and review persistence test files touched by this story.
  - [ ] Run `npx playwright test` only if implementation changes client-visible behavior, shared DTOs used by browser flows, route status handling that existing browser tests cover, or if the story review gate requires it.
  - [ ] No visual validation is required for the intended backend-only fix. If UI/copy changes become necessary, stop and add normal design-token, Swedish copy, accessibility, and visual validation evidence for affected screens.
  - [ ] Move the story to review only through `.\scripts\run-sh.ps1 scripts/story-review.sh 12-7-reviews-route-resolves-live-venues-fix-the-404-on-real-venues` from repository root.

## Dev Notes

### Current Implementation Facts

- `nextjs-app/lib/services/venue-reviews-persistence.ts` currently imports `VENUE_FIXTURE` and exports `resolveReviewVenueIdentifier(identifier)`, which trims an identifier and matches only fixture `id`, `venueId`, `slug`, or `venueSlug`.
- `nextjs-app/app/api/reviews/route.ts` currently calls that fixture resolver before review persistence. A live venue with no fixture row returns `404 Venue not found` before empty-review handling can run.
- Reviews GET receives `venueId` as a query parameter. `nextjs-app/hooks/queries/useVenueReviews.ts` passes the venue slug as that identifier today, so the fixed server route must accept a slug even though the query parameter is named `venueId`.
- Reviews POST already computes `primaryIdentifier = body.venueId ?? body.venueSlug ?? ''`, then checks body id/slug consistency after venue resolution. Keep that order because AC1 explicitly expects numeric live ids `"8"`-`"49"` to be tried first.
- `nextjs-app/app/api/venues/[slug]/feedback/route.ts` has the same fixture-only identity bug. It imports `VENUE_FIXTURE`, resolves the path identifier against fixtures only, and returns 404 before `persistVenueFeedback` for real venues.
- `nextjs-app/lib/services/venue-store.ts` is the existing server-only live/fixture store seam. `getVenues()` and `getVenueBySlug()` already switch on `SUNNYSEAT_VENUE_STORE=supabase`, but `getVenueBySlug()` matches slug only and does not provide the id-or-slug public guard this story needs.
- `nextjs-app/lib/services/sun-geometry-precompute.ts` already models live visibility/deletion for precompute targets with `is_hidden`, `visibility`, and `deleted_at`; `nextjs-app/lib/supabase/types.ts` may not yet include those fields. Reconcile this before coding the public guard.
- Story 12.3 is already in review and owns persisted geometry, `geometry_input_hash`, shared seating centroid, service-only geometry freshness, and prediction-evidence hash seams. Do not alter those contracts for this story.

### Public Resolver Contract

- Input: one user-supplied route/body/query identifier string.
- Output: a visible public venue row compatible with existing review and feedback persistence needs, or `null`.
- Fixture mode: match the existing fixture/in-memory seed by `id`, `venueId`, `slug`, or `venueSlug`.
- Supabase mode: query the live venue store by `id OR slug`; accept numeric ids such as `"8"` and slugs such as `test-venue-sunny`.
- Public visibility: hidden/deleted rows resolve as `null`, identical to unknown identifiers. Do not expose whether an identifier exists but is hidden.
- Error handling: missing Supabase service-role configuration or Supabase read failures should use the repository's existing server route error style, not silently fall back to fixtures in Supabase venue-store mode.
- Security: route handlers should not build their own venue queries, accept `includeHidden`, or import Supabase clients directly when they only need public identity resolution.

### Data And Schema Notes

- Architecture E12-AD-05 says Story 12.7 owns one asynchronous server-only public resolver/guard, Supabase/live mode accepts id or slug, fixture fallback exists only in fixture mode, public mode returns only non-hidden venues, and unknown/hidden identifiers return the same public 404.
- Architecture public API deltas say reviews GET/POST and feedback POST accept the shared live id-or-slug identity contract and never resolve fixtures in live mode.
- The planning artifacts describe `hidden = false`, while current implementation seams reference `is_hidden`, `visibility`, and `deleted_at`. Use the schema actually present in this branch/live migration set and update generated/local types if required. Do not invent a second visibility concept.
- Do not widen `VENUE_SELECT_COLUMNS` unless tests and downstream code are updated deliberately. A separate resolver projection may be safer if visibility fields are server-only and not part of the public venue DTO.

### Testing Requirements

- Required story gate commands from `nextjs-app/`: `npx tsc --noEmit`, `npx eslint . --quiet`, and `npx vitest run`.
- Focused test commands should include the exact files changed, for example:
  - `npx vitest run test/unit/api/reviews-route.test.ts test/unit/api/venue-feedback-route.test.ts`
  - `npx vitest run test/unit/services/venue-store.test.ts test/unit/services/venue-reviews-persistence.test.ts`
- If a new resolver test file is added, include it in the focused run and report it in the Dev Agent Record.
- Run `npx playwright test` only if the implementation changes browser-visible behavior or shared API DTOs used by browser flows. This story should not need Playwright or visual validation if it remains backend-only.
- The final review transition must use the canonical wrapper from repository root: `.\scripts\run-sh.ps1 scripts/story-review.sh 12-7-reviews-route-resolves-live-venues-fix-the-404-on-real-venues`.

### Out Of Scope

- Do not implement Story 12.2 feedback prediction evidence, maintainer accuracy aggregation, or coverage-cap bypass removal.
- Do not implement Story 12.5 venue editor/admin visibility controls, `includeHidden` editor mode, hide/show mutation, or editor cache invalidation.
- Do not implement Story 12.10 detail prefetch, Story 12.14 availability filtering, Story 12.6 public pin predicate, or any UI copy/visual changes.
- Do not add client imports from `nextjs-app/lib/solar`, `nextjs-app/lib/weather`, `nextjs-app/lib/supabase`, `nextjs-app/lib/middleware`, or `nextjs-app/lib/buildings`.
- Do not add a route-local Supabase query in reviews or feedback as a quick patch; the acceptance criteria require one shared venue-identity source.

### Expected File Impact

- `nextjs-app/lib/services/venue-store.ts` or a new adjacent server-only resolver module.
- `nextjs-app/app/api/reviews/route.ts`.
- `nextjs-app/lib/services/venue-reviews-persistence.ts`.
- `nextjs-app/app/api/venues/[slug]/feedback/route.ts`.
- `nextjs-app/test/unit/api/reviews-route.test.ts`.
- `nextjs-app/test/unit/api/venue-feedback-route.test.ts`.
- `nextjs-app/test/unit/services/venue-store.test.ts` or a new resolver unit test.
- `nextjs-app/test/unit/services/venue-reviews-persistence.test.ts`.
- `nextjs-app/lib/supabase/types.ts` and/or a schema migration only if the implementation branch lacks the visibility fields required for the public hidden/deleted guard.

### Project Structure Notes

- Repository root is `C:\Users\Rasmus\sunnyseat`; the Next.js app root is `nextjs-app/`. Run npm/npx commands from `nextjs-app/`.
- Client components continue to use API routes and hooks. The shared resolver is server-only.
- This story is backend/API contract work. Swedish UI copy, design tokens, and visual reference matching should be untouched unless the implementation discovers an unavoidable UI change.
- On Windows/PowerShell, run repository shell scripts through `.\scripts\run-sh.ps1`, not `bash` from `PATH`.

### References

- [Source: `AGENTS.md` - repo rules, API boundary, BMAD workflow, and backend-only visual-validation convention]
- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 12.7]
- [Source: `project-context.md` - Active Epic 12 invariants and Screen ID -> Route Map]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR17, FR19, FR20, LR4, launch-readiness defects]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - no intended UI change; frontend checks only if UI/copy changes]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - E12-AD-05 and Epic 12 public DTO/API deltas]
- [Source: `_bmad-output/planning-artifacts/implementation-readiness-report.md` - LR4 / Story 12.7 readiness mapping]
- [Source: `_bmad-output/test-artifacts/test-design/test-design-epic-12.md` - Story 12.7 R-003/R-007 risk and route matrix coverage]
- [Source: `_bmad-output/test-artifacts/atdd-checklist-12-2-feedback-driven-accuracy-loop-retire-the-coverage-cap-bypass.md` - Story 12.2 dependency on Story 12.7 feedback resolver]
- [Source: `_bmad-output/implementation-artifacts/12-2-feedback-driven-accuracy-loop-retire-the-coverage-cap-bypass.md` - downstream dependency gate]
- [Source: `_bmad-output/implementation-artifacts/12-3-day-series-compute-at-real-venue-scale-kill-the-cold-start-freeze.md` - geometry/hash contracts not owned by this story]
- [Source: `nextjs-app/lib/services/venue-reviews-persistence.ts` - current fixture-only review resolver]
- [Source: `nextjs-app/app/api/reviews/route.ts` - current review GET/POST identity gate]
- [Source: `nextjs-app/app/api/venues/[slug]/feedback/route.ts` - current fixture-only feedback identity gate]
- [Source: `nextjs-app/lib/services/venue-store.ts` - current live/fixture venue store seam]
- [Source: `nextjs-app/lib/services/sun-geometry-precompute.ts` - current hidden/deleted venue visibility seam]
- [Source: `nextjs-app/hooks/queries/useVenueReviews.ts` - client passes venue slug via `venueId` query parameter]
- [Source: `nextjs-app/docs/design/DESIGN.md` - N/A for planned backend-only work; required only if UI changes are introduced]

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent._

### Debug Log References

_To be filled by dev agent._

### Completion Notes List

_To be filled by dev agent._

### File List

_To be filled by dev agent._

### Change Log

_To be filled by dev agent._
