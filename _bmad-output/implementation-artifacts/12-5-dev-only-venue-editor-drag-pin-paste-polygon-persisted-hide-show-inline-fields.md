---
baseline_commit: NO_VCS
---

# Story 12.5: Dev-Only Venue Editor - Drag Pin, Paste Polygon, Persisted Hide/Show, Inline Fields

Status: ready-for-dev

## Story

As a **maintainer field-verifying Gothenburg venues in development**,
I want a localhost-only editor on the map for display position, seating polygon,
visibility, and small text/media fields,
So that I can correct launch data without reintroducing a production admin surface or
breaking persisted sun predictions.

## Source Context

Story 12.5 is the controlled exception to the retired production-admin plan. The editor is
maintenance-only, available only on local/dev hosts with an explicit developer flag, and must
fail closed in production before it inspects flags, request bodies, Supabase state, or client
input.

The original epic left one coordinate option open. Architecture decision `E12-AD-06` is now
binding: draggable pins edit public display coordinates only. Engine/weather coordinates come
from the validated seating polygon centroid owned by Story 12.3. A display-coordinate edit
must not move the prediction, weather bucket, geometry hash, or persisted coverage.

## Acceptance Criteria

1. **Dev/localhost-only and fail-closed.** If `NODE_ENV === 'production'`, every editor UI
   entrypoint and editor read/write route rejects first, even when `SUNNYSEAT_ADMIN=dev` is
   set. In non-production, the editor additionally requires `SUNNYSEAT_ADMIN=dev` and a
   loopback host/origin (`localhost`, `127.0.0.1`, or `[::1]`); ambiguous forwarded-host or
   origin state fails closed. Client code never receives a service-role key. Tests cover a
   production-config request with the dev flag set.
2. **Drag save persists display-only coordinates.** Dragging a venue pin saves only
   `venues.display_lat` / `venues.display_lng` through a service-role Next route. Public DTO
   `location`, discovery/radius/distance sorting, markers, route summaries, native map URLs,
   and routing handoff use the display pair with legacy `lat`/`lng` fallback. Engine/weather
   uses the shared `seatingCentroidWgs84()` helper from `seating_area`; dragging the display
   marker cannot move predictions or `geometry_input_hash`.
3. **Pasted polygon is validated server-side.** The textarea accepts a closed outer ring in
   `[lng, lat]` order or a GeoJSON `Polygon`. The server validates Polygon type, closed ring,
   at least four positions, finite numbers, and Gothenburg bounds before any write. Invalid
   input returns a specific validation error and writes nothing.
4. **Hide/show is persisted and public-wide.** The canonical `venues.hidden boolean not null
   default false` field controls public visibility. Hidden venues disappear from `/api/venues`,
   `/api/venues/[slug]`, reviews GET and POST, feedback POST, and detail prefetch. Showing a
   venue restores the same public paths. Unknown and hidden remain indistinguishable in public
   responses.
5. **Cache behavior is explicit.** Public list/detail responses retain their documented
   `Cache-Control: public, max-age=30, s-maxage=30, must-revalidate` bound. Editor mutations
   invalidate the editing browser's `queryKeys.venues.all` and any editor-owned detail/list
   keys immediately. If no server cache tags exist, document the cross-browser visibility
   staleness bound as at most 30 seconds and test that local editor state invalidates without
   waiting for the CDN bound.
6. **Editor can read hidden venues.** The only include-hidden read path is an explicitly typed
   editor list/detail mode behind the same dev guard. Production and public handlers never
   accept `includeHidden`, and hidden venues can be unhidden without SQL only through this
   guarded editor path.
7. **Inline field edits use the same guarded route.** The editor can update `tags text[]`,
   `description`, and `thumbnail jsonb` through validated service-role routes. Tags are
   trimmed/deduplicated clean text values. `thumbnail` must use the Story 12.12 contract
   `{ alt, initials, cardUrl?, heroUrl?, url? }`; new `cardUrl`/`heroUrl` values must match
   the configured Supabase origin, public `venue-media` bucket, exact
   `{slug}/{mediaVersion}/{card|hero}.webp` key, and object content-type/byte limits before
   save. The legacy external `url` field is read fallback only, not editor-created.
8. **Maintainer docs are updated.** `nextjs-app/docs/venue-data-load.md` documents the
   editor, display-coordinate pair, hidden column, polygon paste contract, thumbnail edit
   contract, cache bound, and production-impossible guard.

## Design Gate Criteria

- **Visual:** With the dev flag off, normal map and venue-detail user screens are pixel
  unchanged. The editor chrome appears only under the dev guard and uses existing design
  tokens, semantic controls, Swedish labels where user-facing text is shown, visible focus,
  and 44x44 px minimum interactive targets.
- **Behaviour:** Pin drag moves the marker/distance/routing display only, not the prediction
  coordinate. Hidden venues vanish from all public paths and can be restored through the
  editor. Invalid polygon/media/tag input produces a non-destructive inline error.
- **Animation:** No new animation beyond existing map marker/panel behavior.
- **Visual validation:** Gate-off map and venue-detail references must remain unchanged. Do
  not add or replace reference PNGs unless implementation intentionally introduces a mapped
  visual state and follows the visual-validation/rebaseline workflow.

## Adopted Architecture Controls

- `E12-AD-03` controls geometry input publication. Seating geometry, elevation, and shadow
  caster corrections must use the Story 12.3 hash/publication seam. Normal operation stages
  proposed inputs, computes full planner-window artifacts, then atomically publishes the
  input change, exact series, and `venue_geometry_inputs.current_geometry_input_hash`.
  Direct/out-of-band changes must call the dirty seam and intentionally yield the typed
  fail-closed 503 until recomputed.
- `E12-AD-05` controls public identity and visibility. Public handlers use one shared
  hidden-aware resolver and never accept `includeHidden`. The editor's include-hidden read
  mode is the only exception and must sit behind the Story 12.5 dev guard.
- `E12-AD-06` selects display coordinates. Add `venues.display_lat` and
  `venues.display_lng`; public `location` coalesces display pair then legacy `lat`/`lng`.
  Engine/weather remains server-only from `seatingCentroidWgs84(seating_area)`.
- `E12-AD-10` controls media edits. The editor consumes `normalizeVenueMediaRenditionUrl`
  and Storage object verification; it does not upload files, create external hotlinks, or
  edit the legacy `url` fallback.
- `E12-AD-11` controls production impossibility. Every server handler begins with the
  production hard deny before flags, host/origin checks, schema parsing, or Supabase access.
  UI entrypoints use the existing dev-only dynamic/DCE pattern so production builds never
  render active editor controls.
- `E12-AD-12` controls migration shape. Versioned production migrations live under
  repository-root `supabase/migrations/`; `_bmad-output` SQL is evidence only. Regenerate
  `nextjs-app/lib/supabase/types.ts` when public schema changes.

## Pre-Implementation Dependency Gate

1. Run the required baseline from `nextjs-app/`: `npx tsc --noEmit` and
   `npx eslint . --quiet`. If failures are outside this story's scope, stop and report them
   before editing. These checks passed for the create-story run on 2026-07-27, but dev-story
   must rerun them before code changes.
2. Confirm the branch contains the Story 12.3 modules
   `lib/services/sun-geometry-hash.ts`, `lib/services/sun-geometry-coordinates.ts`,
   `lib/services/sun-geometry-precompute.ts`, and `lib/services/sun-geometry-repository.ts`.
   If the canonical `g1:` hash or `seatingCentroidWgs84()` contract is absent or changed,
   stop and reconcile with 12.3 before implementing editor writes.
3. Confirm Story 12.7's canonical hidden resolver is present and uses `hidden === false`.
   Do not reintroduce `is_hidden`, `visibility`, or `deleted_at` vocabularies unless a later
   migration has explicitly superseded the 12.7 contract.
4. Confirm Story 12.12's media helpers are present in `lib/utils/venue-media.ts` and that
   `VenueThumbnailDto` includes `cardUrl` and `heroUrl`.
5. Because this story adds frontend editor chrome, read `nextjs-app/docs/design/DESIGN.md`
   before UI edits and keep all styling on project tokens. The default user map/detail
   surfaces must remain visually unchanged when the dev gate is off.

## Tasks / Subtasks

- [ ] **Task 0 - Preflight source, schema, and safety boundaries** (AC: all)
  - [ ] Run baseline typecheck and lint from `nextjs-app/`; stop for unrelated failures.
  - [ ] Inspect current files before changing them: `nextjs-app/lib/services/venue-store.ts`,
    `/app/api/venues/route.ts`, `/app/api/venues/[slug]/route.ts`,
    `/app/api/reviews/route.ts`, `/app/api/venues/[slug]/feedback/route.ts`,
    `lib/services/sun-geometry-*`, `lib/utils/venue-media.ts`, `lib/query-keys.ts`,
    `hooks/queries/useVenueSearch.ts`, `hooks/queries/useVenueDetail.ts`,
    `components/custom/map/MapView.tsx`, and `components/custom/map/MapViewDynamic.tsx`.
  - [ ] Add red-first tests for production hard deny, loopback/dev flag checks, public hidden
    route matrix, display-coordinate isolation, polygon validation, media URL/object
    validation, and query invalidation.
  - [ ] Confirm no live Met.no, Google, production Supabase, or Storage calls occur in
    default tests. Use deterministic mocks or disposable local DB/Storage abstractions.

- [ ] **Task 1 - Add display-coordinate schema, types, and store mapping** (AC: 2, 8)
  - [ ] Add a versioned, idempotent repository-root migration for `venues.display_lat` and
    `venues.display_lng` with WGS84/Gothenburg bounds checks and a both-null-or-both-non-null
    pair check. Keep `venues.hidden` as the existing Story 12.7 column, not a duplicate.
  - [ ] Update/generated-sync `nextjs-app/lib/supabase/types.ts`, server row types, Zod
    schemas, DTO mapping tests, and any public API types impacted by the additive schema.
  - [ ] Update `VENUE_SELECT_COLUMNS`/row mapping so `StoredVenue.location` for public DTOs
    coalesces `display_lat/display_lng` first and legacy `lat/lng` second.
  - [ ] Preserve server-only engine data. Do not serialize `seating_area`,
    `seating_elevation_m`, `ground_elevation_m`, engine coordinates, geometry hashes beyond
    the existing prediction-evidence seam, caster rows, or provider provenance.
  - [ ] Add tests proving display coordinates affect public location, distance sort, radius
    inclusion, map marker positions, route summaries, and native map URLs, while engine
    weather/prediction coordinates remain the seating centroid.

- [ ] **Task 2 - Implement fail-closed editor guard and service-role routes** (AC: 1, 6, 7)
  - [ ] Create a small server-only guard helper for editor routes. First branch:
    `NODE_ENV === 'production'` returns a generic production deny (prefer 404/no-store for
    page/API surfaces) before reading `SUNNYSEAT_ADMIN`, request body, host/origin, or
    Supabase.
  - [ ] In non-production, require `SUNNYSEAT_ADMIN=dev` and loopback host/origin. Reject
    missing/remote/ambiguous forwarded-host or forwarded-proto combinations before any write.
  - [ ] Add typed editor API routes, for example `GET /api/dev/venues`,
    `GET /api/dev/venues/[idOrSlug]`, and `PATCH /api/dev/venues/[idOrSlug]`, or an
    equivalent narrowly scoped internal path. All responses use `Cache-Control: no-store`.
  - [ ] Routes use only the server-side Supabase service-role client. Client components never
    import Supabase clients and never see service-role credentials.
  - [ ] Editor read mode may include hidden venues; public route handlers and public query
    hooks never accept `includeHidden` or route-local visibility overrides.
  - [ ] Add route tests for production deny with dev flag set, non-prod missing flag, remote
    host/origin, forwarded-host ambiguity, body parse after deny, and service-role-not-called
    assertions on denied requests.

- [ ] **Task 3 - Add editor UI behind the dev-only split** (AC: 1, 2, 3, 6, 7; Design Gate)
  - [ ] Mount editor chrome only through a dev-only dynamic/DCE pattern, such as a
    `process.env.NODE_ENV === 'production' ? null : dynamic(...)` entry from the map shell or
    a dedicated dev page that returns `notFound()` in production before importing editor UI.
  - [ ] Keep the normal first screen the existing map. With `SUNNYSEAT_ADMIN` unset, no editor
    entrypoint or extra chrome is visible and reference screenshots remain unchanged.
  - [ ] Provide editor controls a maintainer naturally expects for this scope: venue select
    including hidden rows, draggable display pin, coordinate save/reset, polygon paste
    textarea, hide/show toggle, tags input, description field, thumbnail JSON/URL fields,
    validation errors, pending/saved/error states, and query invalidation after save.
  - [ ] Use existing project tokens, shadcn primitives where useful, lucide icons for common
    actions, semantic controls, visible focus, 44x44 px minimum touch targets, and
    `prefers-reduced-motion` safe behavior. New labels/default UI copy should be Swedish
    unless an internal technical field name is clearer for maintainers.
  - [ ] Do not import server-only modules (`lib/supabase`, `lib/solar`, `lib/weather`,
    `lib/buildings`, middleware) into client components. Client data access goes through the
    guarded API and TanStack hooks/mutations.

- [ ] **Task 4 - Validate and publish seating polygon edits through the 12.3 seam** (AC: 3)
  - [ ] Add a shared server validator for pasted polygons. It accepts only a linear ring or
    GeoJSON `Polygon`, normalizes to canonical GeoJSON, enforces closure, finite `[lng, lat]`
    pairs, at least four positions including closure, no degenerate ring, and Gothenburg
    bounds. Reuse or extract bounds from existing project geography constants rather than
    hardcoding multiple copies.
  - [ ] After a valid seating/elevation-affecting edit, call the Story 12.3 publication seam:
    stage inputs, compute the full planner-window geometry artifacts and
    `computeGeometryInputHash()`, then atomically publish via the existing
    `publish_venue_geometry_generation` path. If implementation cannot complete that publish
    in the interactive route without unacceptable latency, use a deliberate dirty/staged
    workflow that calls `mark_venue_geometry_dirty` and makes public reads fail closed until
    the protected precompute run publishes ready coverage.
  - [ ] Do not compute or approximate `geometry_input_hash` in a route/component. The only
    acceptable hash implementation is Story 12.3's server-only hash module.
  - [ ] Add tests for valid ring and Polygon input, unclosed rings, too few positions,
    lat/lng order mistakes that fall outside bounds, non-finite values, malformed JSON,
    holes if supported, no-write-on-error, dirty-state fail-closed, and ready publish using
    exact current hash.
  - [ ] Hidden venues are still precompute targets. A hidden venue with invalid geometry is a
    precompute/editor error, not silently excluded from persisted geometry coverage.

- [ ] **Task 5 - Implement hide/show and public visibility convergence** (AC: 4, 5, 6)
  - [ ] Update the public list path so Supabase mode returns only `hidden === false` rows.
    Detail, reviews, feedback, and prefetch already use the shared resolver; keep them on
    that resolver and add regression coverage for the full matrix.
  - [ ] Editor hide/show writes `venues.hidden` only through the guarded service route and
    never exposes whether a hidden row exists through public responses.
  - [ ] In the editing browser, invalidate `queryKeys.venues.all`, active editor queries,
    and exact detail keys for the affected slug/id after a successful mutation.
  - [ ] If no Next server tag cache is present, document the route header bound as the
    cross-browser staleness guarantee. If a server tag/cache mechanism is added, keep it
    route-local and add tests for invalidation.
  - [ ] Add route tests: hidden venue absent from `/api/venues`; hidden detail 404; reviews
    GET/POST 404 before persistence; feedback POST 404 before persistence; detail prefetch
    sees the same public not-found class; show restores visibility.

- [ ] **Task 6 - Implement inline field validation and media object checks** (AC: 7, 8)
  - [ ] Reuse existing tag coercion semantics from `venue-store.ts`: trim, drop empty or
    non-string values, dedupe while preserving first-seen order, and always emit `[]` as the
    honest no-tags value.
  - [ ] For unknown tag vocabulary, do not silently create broken chips. Either surface an
    editor warning and test the existing `localizeTag()` fallback remains legible, or update
    `TAG_DISPLAY_EN` in the same change when adding an intentional new canonical tag.
  - [ ] Validate `description` as bounded text and keep it optional/null-safe.
  - [ ] Validate `thumbnail` with the Story 12.12 helper. Preserve existing external legacy
    `url` as read-only fallback; reject editor attempts to create/edit external `url`.
  - [ ] For each new `cardUrl`/`heroUrl`, verify the object exists in Supabase Storage with
    the expected `venue-media` bucket/key, content type, and byte ceiling before writing the
    venue row. Tests mock Storage deterministically; protected live Storage verification
    remains a release-evidence lane if credentials are unavailable.
  - [ ] Add public DTO tests proving inline changes reflect on the next public load without
    leaking editor-only fields.

- [ ] **Task 7 - Update maintainer documentation and environment examples** (AC: 1, 8)
  - [ ] Update `nextjs-app/docs/venue-data-load.md` with how to enable/use the dev editor,
    the production hard deny, the `SUNNYSEAT_ADMIN=dev` and loopback requirements, display
    coordinate semantics, polygon paste examples, hidden behavior, thumbnail validation, and
    cache staleness/invalidation expectations.
  - [ ] Update `.env.example` / `nextjs-app/.env.example` only if the dev flag or Supabase
    variables are not already documented. Do not commit real secrets.
  - [ ] If adding maintainer scripts under `nextjs-app/scripts/` or root `scripts/`, update
    the matching `.gitignore` allow-list immediately.
  - [ ] Document how direct DB/import maintenance and the dev editor share the same
    geometry/hash/dirty/publish invariants.

- [ ] **Task 8 - Run required gates and transition through the review script** (AC: all)
  - [ ] Run from `nextjs-app/`: `npx tsc --noEmit`, `npx eslint . --quiet`, and
    `npx vitest run`. Use `VITEST_MAX_WORKERS=4` if the Windows suite shows worker
    instability.
  - [ ] Run focused tests for the new editor guard/routes, venue-store display mapping,
    public route hidden matrix, geometry/hash/polygon validation, media validation, query
    invalidation, and editor UI/mutation behavior.
  - [ ] Run Playwright for dev editor flows and any public route/detail/prefetch visibility
    behavior touched by the implementation. Use `CI=1` or isolated `PLAYWRIGHT_PORT` to avoid
    reusing an unrelated localhost server.
  - [ ] Run `a11y` and `a11y-mobile` for affected browser flows. If `a11y-mobile` remains
    blocked by known unrelated contrast debt, mark the exact skipped/fixme scope rather than
    claiming mobile a11y coverage.
  - [ ] Run visual validation for gate-off normal user map/detail screens if the
    implementation changes map/detail DOM, route state forcing, or layout around the map.
    Missing visual-provider credentials do not authorize reference replacement or a manual
    pass unless explicitly allowed and documented.
  - [ ] Move to review only through
    `.\scripts\run-sh.ps1 scripts/story-review.sh 12-5-dev-only-venue-editor-drag-pin-paste-polygon-persisted-hide-show-inline-fields`
    from repository root.

## Current Implementation Facts

- `nextjs-app/lib/supabase/types.ts` already includes `venues.hidden` from Story 12.7, but
  does not include `display_lat` or `display_lng`.
- `nextjs-app/lib/services/venue-store.ts` selects `lat`/`lng`, `thumbnail`,
  `description`, `opening_hours`, `tags`, and server-only seating/elevation fields. It has
  `PUBLIC_VENUE_RESOLVER_SELECT_COLUMNS` with `hidden`, but `getVenues()` still reads the
  unfiltered `VENUE_SELECT_COLUMNS`, so the public list path needs the 12.5 hidden filter.
- `resolvePublicVenueIdentifier(identifier)` exists and returns only canonical
  `hidden === false` rows in Supabase mode. `/api/venues/[slug]`, `/api/reviews`, and
  `/api/venues/[slug]/feedback` already use this shared resolver.
- `fromVenueRow()` currently requires finite legacy `lat`/`lng` and maps them directly to
  `StoredVenue.location`. It does not coalesce display coordinates.
- `coerceSeatingArea()` currently keeps any Polygon with a finite outer ring of at least
  four positions. The editor write validator must be stricter: closed ring, Gothenburg
  bounds, no degenerate footprint, and no write on invalid input.
- `nextjs-app/lib/services/sun-geometry-hash.ts` owns canonical `g1:<sha256>` hashing.
  `nextjs-app/lib/services/sun-geometry-coordinates.ts` owns `seatingCentroidWgs84()` and
  `venueEngineCoordinate()`. Do not duplicate either contract.
- `supabase/migrations/20260718193000_persist_sun_geometry_series_and_weather_snapshots.sql`
  provides `mark_venue_geometry_dirty(...)` and `publish_venue_geometry_generation(...)`.
  Use these semantics for seating/elevation changes.
- `collectSunGeometryPrecomputeTargets({ includeHidden: true })` already selects hidden
  venues for precompute, so hiding a venue must not remove it from geometry freshness.
- `nextjs-app/lib/utils/venue-media.ts` already defines `VENUE_MEDIA_BUCKET`, rendition
  constants, `buildVenueMediaPublicUrl()`, and `normalizeVenueMediaRenditionUrl()`.
  Its current parser rejects doubled/trailing empty path segments, query strings, hash
  fragments, wrong origins, wrong buckets, wrong slug/version, and rendition drift.
- `useVenueSearch()` and `useVenueDetail()` both use centralized query key helpers.
  `queryKeys.venues.all` is the broad invalidation root for editor mutations; detail uses
  `detailAt(slug, planner/location)` and a five-minute stale time.
- Public list/detail routes set `Cache-Control: public, max-age=30, s-maxage=30,
  must-revalidate`. Reviews are `no-store`.
- `MapViewDynamic.tsx` and `useForcedState()` show the existing pattern for dev-only dynamic
  imports and production dead-code elimination.
- No dev editor UI, editor API route, display-coordinate migration, or editor mutation hook
  exists yet.

## Retro And Deferred Work Folded In

- Story 12.3 retro: keep `geometry_input_hash` date-independent; `stockholm_date` remains a
  separate persisted coverage key. Use `CI=1` or isolated ports for Playwright so tests do
  not reuse unrelated localhost servers.
- Story 12.7 retro: the schema drift around `is_hidden`/`visibility`/`deleted_at` is closed
  by canonical `hidden`. Future visibility code must validate real migrations/generated
  types, not rely on mocks or invented vocabularies.
- Story 12.12 retro: exact media URL path validation already caught malformed public-object
  paths; the editor must consume the same helper and add Storage object checks. Do not
  claim protected live Storage verification without credentials/evidence.
- Epic 12 retro: `a11y-mobile` has been a recurring CI gap. This story adds UI, so mobile
  a11y evidence must be explicit or precisely scoped as a known unrelated skip.
- Epic 12 retro: missing visual-provider credentials do not authorize reference replacement,
  manual pass, or sprint transition without the documented allowed mode.
- Epic 12 retro: new scripts under ignored script folders need explicit allow-list changes.
- Deferred overlap: the buildings-cache key had a duplicate centroid implementation in the
  deferred ledger. This story must not add another centroid path; geometry/edit code should
  use Story 12.3's `seatingCentroidWgs84()` seam.
- Deferred overlap: `localizeTag()` can fall back to canonical Swedish text for unmapped
  tags. Because 12.5 edits tags, tests/docs must either warn on unknown tag vocabulary or
  update the English map when adding intended new tags.
- Non-overlap intentionally excluded: rain-radar cache cadence, `applyCloudGate` defaults,
  route overlay distance copy, and edge rate-limiter tradeoffs are not reopened unless this
  implementation directly touches those modules.

## Testing Requirements

- Unit/API:
  - Editor guard production deny, dev flag, loopback host/origin, forwarded-host ambiguity,
    no Supabase access on deny, and no body parsing before production deny.
  - Display-coordinate coalescing, route/native map URL use, distance/radius behavior, and
    engine/weather coordinate isolation from display edits.
  - Polygon parser/validator success and failure matrix with no-write-on-error.
  - Hidden route matrix for list, detail, reviews GET/POST, feedback POST, and detail
    prefetch.
  - Media validator and mocked Storage object checks for card/hero URLs.
  - Tags/description coercion and unknown-tag behavior.
- Database:
  - Migration replay/idempotency for display coordinates, pair check, bounds checks, service
    role update privileges, anon/auth denial, generated type synchronization, dirty/publish
    state transitions, and hidden/update interactions.
- Component/browser:
  - Editor visible only under dev guard, no editor chrome with gate off, draggable display
    pin save/reset, polygon paste errors, hide/show immediate local invalidation, and inline
    field save errors/success.
  - Public screen request-count tests remain stable: same-date scrub zero-fetch, date change
    one list/favourites request, and detail prefetch does not bypass hidden visibility.
- Full gates before review:
  - `cd nextjs-app && npx tsc --noEmit`
  - `cd nextjs-app && npx eslint . --quiet`
  - `cd nextjs-app && npx vitest run`
  - Story-relevant Playwright and visual/a11y gates as described in Task 8
  - Repository root story review wrapper, not direct sprint-status edits.

## Out Of Scope

- Production admin UI, production browser CRUD, authentication/admin roles, public active
  editor routes, browser Supabase writes, service-role secrets in clients, and any payment
  or future-premium flow.
- Uploading or generating venue media renditions. Story 12.12's upload tooling owns files;
  this editor only validates and writes already-hosted rendition URLs.
- Drawing polygons on the map. The editor accepts paste-only seating polygon input.
- Story 12.2 feedback aggregation/cap-bypass retirement, Story 12.8 About page, Story 12.11
  coach marks, and Story 12.14 selected-instant closed-venue filtering.
- Replacing visual references or changing normal user map/detail design with the dev gate
  off.
- Live protected Supabase/GitHub/Storage verification unless credentials are explicitly
  available in the implementation environment; otherwise record the exact evidence gap.

## Expected File Impact

Likely new files:

- `supabase/migrations/<timestamp>_add_venue_display_coordinates.sql`
- `nextjs-app/lib/services/dev-venue-editor-guard.ts`
- `nextjs-app/lib/services/dev-venue-editor-validation.ts`
- `nextjs-app/app/api/dev/venues/route.ts`
- `nextjs-app/app/api/dev/venues/[idOrSlug]/route.ts`
- `nextjs-app/hooks/queries/useDevVenueEditor.ts` and/or focused mutation hooks
- `nextjs-app/components/custom/dev/VenueEditorPanel.tsx` or equivalent dev-only editor UI
- Focused Story 12.5 tests under `nextjs-app/test/unit`, `nextjs-app/test/components`, and
  `nextjs-app/test/e2e`

Likely updates:

- `nextjs-app/lib/services/venue-store.ts`
- `nextjs-app/lib/supabase/types.ts`
- `nextjs-app/lib/types/api.ts` only if comments/contracts need display-coordinate notes
- `nextjs-app/app/api/venues/route.ts`
- `nextjs-app/app/api/venues/[slug]/route.ts` only if tests expose detail/display or cache
  gaps not already covered
- `nextjs-app/lib/services/sun-geometry-precompute.ts` only if display coords affect row
  projection types or live validation
- `nextjs-app/lib/query-keys.ts` only if a typed editor namespace is added; no inline keys
- `nextjs-app/components/custom/map/MapView.tsx` / `MapViewDynamic.tsx`
- `nextjs-app/lib/services/routing.ts` and route-button tests if native map URLs need
  explicit display-coordinate coverage
- `nextjs-app/docs/venue-data-load.md`
- `.env.example` / `nextjs-app/.env.example` if `SUNNYSEAT_ADMIN` is undocumented

Must remain untouched unless a story test proves otherwise:

- Core solar/shadow math beyond consuming existing geometry coordinate helpers
- Weather adapters/snapshots beyond coordinate-isolation tests
- Public sunny predicate/pin presentation from Story 12.6
- Venue photo rendering surfaces from Story 12.12
- Reference PNGs and `REBASELINE-LOG.md` when gate-off surfaces remain unchanged

## Project Structure Notes

- Repository root is `C:\Users\Rasmus\sunnyseat`; the Next.js app root is `nextjs-app/`.
  Run npm/npx commands from `nextjs-app/`.
- Versioned production migrations belong in repository-root `supabase/migrations/`.
- Client components must not import `nextjs-app/lib/solar`, `nextjs-app/lib/weather`,
  `nextjs-app/lib/supabase`, middleware, or building modules. Editor clients use API routes
  and hooks/mutations only.
- Keep component dependency direction:
  `components/custom/ -> components/composed/ -> components/ui/`.
- Use Tailwind v4 project tokens from `docs/design/DESIGN.md`; do not introduce raw colors,
  arbitrary spacing, custom shadows, or copied prototype CSS.
- On Windows/PowerShell, run repository shell scripts through `.\scripts\run-sh.ps1`.

## References

- `AGENTS.md` - repo rules, API boundary, design-token rules, BMAD story workflow, tests,
  Docker/WSL, scripts, and secrets.
- `project-context.md` - production-admin retirement, Story 12.5 exception, one public
  visible-venue guard, Screen ID map, and Epic 12 invariants.
- `_bmad-output/planning-artifacts/epics.md` - Story 12.5 source requirements.
- `_bmad-output/planning-artifacts/prd.md` - production admin retirement, LR4 live venue
  identity, LR5 media, and LR6 maintainer operations.
- `_bmad-output/planning-artifacts/architecture.md` - `E12-AD-03`, `E12-AD-04`,
  `E12-AD-05`, `E12-AD-06`, `E12-AD-10`, `E12-AD-11`, `E12-AD-12`, and persisted data
  contracts.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - map-first principles,
  VenuePhoto contract, detail preload state, and forced visual state rules.
- `_bmad-output/auto-bmad/retro-notes/epic-12.md` - earlier Epic 12 constraints and test
  evidence lessons.
- `_bmad-output/implementation-artifacts/deferred-work.md` - targeted centroid/tag/media
  overlap review.
- `_bmad-output/implementation-artifacts/12-3-day-series-compute-at-real-venue-scale-kill-the-cold-start-freeze.md`
  - geometry hash/publication, dirty-state, and persisted coverage contracts.
- `_bmad-output/implementation-artifacts/12-7-reviews-route-resolves-live-venues-fix-the-404-on-real-venues.md`
  - canonical public resolver and hidden schema contract.
- `_bmad-output/implementation-artifacts/12-12-venue-photos-supabase-storage-hosting-render-fallback-fixes.md`
  - media contract and exact public-object path validation.
- `_bmad-output/implementation-artifacts/12-10-venue-detail-preload-instant-mer-info.md`
  - detail prefetch/shared resolver/query-key/cache behavior.
- `nextjs-app/docs/design/DESIGN.md` - binding design tokens.
- `nextjs-app/docs/venue-data-load.md` - maintainer data-load docs to update.
- `nextjs-app/lib/services/venue-store.ts`
- `nextjs-app/app/api/venues/route.ts`
- `nextjs-app/app/api/venues/[slug]/route.ts`
- `nextjs-app/app/api/reviews/route.ts`
- `nextjs-app/app/api/venues/[slug]/feedback/route.ts`
- `nextjs-app/lib/services/sun-geometry-hash.ts`
- `nextjs-app/lib/services/sun-geometry-coordinates.ts`
- `nextjs-app/lib/services/sun-geometry-precompute.ts`
- `nextjs-app/lib/services/sun-geometry-repository.ts`
- `nextjs-app/lib/utils/venue-media.ts`
- `nextjs-app/lib/query-keys.ts`
- `nextjs-app/hooks/queries/useVenueSearch.ts`
- `nextjs-app/hooks/queries/useVenueDetail.ts`
- `nextjs-app/hooks/queries/venue-detail-query-options.ts`
- `nextjs-app/components/custom/map/MapViewDynamic.tsx`

## Story File Audit

- PASS - Story status is `ready-for-dev`.
- PASS - The open coordinate option is resolved to `E12-AD-06` display coordinates, with
  engine/weather tied to seating centroid and Story 12.3 geometry hash.
- PASS - Acceptance criteria cover production hard deny, dev host/flag checks, service-role
  route boundary, display-coordinate isolation, polygon validation, hidden route matrix,
  cache invalidation/staleness, include-hidden editor read, inline fields/media, and docs.
- PASS - Tasks are dependency-ordered and name likely files without requiring unrelated
  stories or production admin work.
- PASS - Current implementation facts identify hidden/types status, missing display
  coordinates, list-route visibility gap, existing resolver consumers, geometry/media/query
  seams, and absence of editor code.
- PASS - Retro and deferred-work constraints are folded in selectively without copying
  unrelated ledger entries.
- PASS - Test plan includes unit/API/database/component/E2E/a11y/visual gates and the
  canonical story-review wrapper.

## Dev Notes

### ATDD Artifacts

- Planned checklist:
  `_bmad-output/test-artifacts/atdd-checklist-12-5-dev-only-venue-editor-drag-pin-paste-polygon-persisted-hide-show-inline-fields.md`
- Suggested unit/API tests:
  `nextjs-app/test/unit/api/story-12-5-dev-venue-editor-guard.atdd.test.ts`,
  `nextjs-app/test/unit/api/story-12-5-dev-venue-editor-route.atdd.test.ts`,
  `nextjs-app/test/unit/services/story-12-5-venue-display-coordinate.atdd.test.ts`,
  `nextjs-app/test/unit/services/story-12-5-polygon-validation.atdd.test.ts`,
  `nextjs-app/test/unit/services/story-12-5-media-editor-contract.atdd.test.ts`
- Suggested component/E2E tests:
  `nextjs-app/test/components/story-12-5-dev-venue-editor.atdd.test.tsx`,
  `nextjs-app/test/e2e/story-12-5-dev-venue-editor.atdd.spec.ts`

### Dev Agent Record

_To be filled by the dev-story agent._
