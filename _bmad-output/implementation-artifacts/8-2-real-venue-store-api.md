---
baseline_commit: 62f6438
drafted_at: 2026-06-17T00:00:00+02:00
drafted_by: Bob/Claude (SM, bmad-create-story)
---

# Story 8.2: Real Venue Store & API

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **Sequencing:** Second implementation story of Epic 8 "Wire Real Data" (after 8.1 + 8.1.1, both `done`). Epic 8 is `in-progress`; this is not the `8-1-*` story so the epic status does not change. This story stands up the **real venue store** the rest of Epic 8 reads from. Story 8.3 (real sun/shadow/weather computation) builds directly on the records and route seam this story creates. Branch: `epic/8-wire-real-data`.
>
> **Scope boundary — this is a DATA-SOURCE SWAP behind a frozen API contract, not a UI or sun-engine story.** You are replacing the hardcoded venue data source (`nextjs-app/lib/services/venues-fixture.ts` → `VENUE_FIXTURE` / the `DETAIL_FIXTURE` map in `app/api/venues/[slug]/route.ts`) with a real Supabase `venues` table read server-side, **while keeping the `VenueDataDto` / `VenueDetailDto` response shapes and the planner/time query contract byte-identical so zero frontend component changes are required.** Do **NOT**: change the sun/shadow/weather/confidence computation (`currentSunStatus`, `skyCondition`, `confidence`, `sunExposurePercent`, `sunWindow`, `predictionUncertainty` stay carried from seed values — the real engine is **Story 8.3**); author public/anon RLS policies or run the Supabase security advisor triage (**Story 8.5**); regenerate `lib/supabase/types.ts` from the live schema (**Story 8.5**); change feedback/review **persistence** wiring (**Story 8.4**); add admin/upload surfaces; or alter the `_state`/URL contracts, visual references, query-key factory, or the rate-limit/caching/etag behaviour of the routes.
>
> **CI must have ZERO live-Supabase dependency.** The default venue store is an in-memory seed (the existing fixture data), exactly like the `SUNNYSEAT_*_PERSISTENCE` adapters default to in-memory. The Supabase read path is **opt-in via an env flag**. This is non-negotiable: three E2E specs (`map-primary`, `axe`, `visit-loop`) and several Vitest route tests hit the **real** `/api/venues` and `/api/venues/[slug]` handlers with no network mock, and they must keep passing without a live database.

## Story

As a **user**,
I want the map and lists to show real Gothenburg venues,
So that I'm looking at places I can actually visit.

## Acceptance Criteria

1. **Real venue store behind the existing API, no DTO/contract change.**
   **Given** a Supabase `venues` table contract (defined in this story) seeded with the initial Gothenburg launch venues
   **When** `/api/venues` and the venue-detail route are requested
   **Then** they return real venues from Supabase (replacing `lib/services/venues-fixture.ts`), preserving the existing `VenueDataDto`/detail response shapes and the planner/time query contract so no frontend component changes are required

2. **Gate venue stays stable.**
   **Given** the seeded `test-venue-sunny` slug used by visual/E2E gates
   **When** the real data source is wired
   **Then** that slug still resolves to a stable, gate-compatible venue so the five visual references and the Playwright suite keep passing

3. **API boundary preserved.**
   **Given** the API boundary
   **When** the route reads venues
   **Then** access stays server-side via `lib/supabase` service-role infrastructure; **no client component imports backend modules** and query keys still come from `lib/query-keys.ts`

4. **Robust 404 detection (carried deferred item — Story 3.4 code review Round 2, R2-D2).**
   **Given** the venue fetch layer that throws errors like `"Venue detail failed: 404 Not Found"`
   **When** a venue is not found
   **Then** `isVenueNotFoundError` detects the 404 against a numeric `status` carried on the thrown error (not by regex-matching the human-readable message), so a future change to the error-message format cannot silently break the not-found branch — the existing message-regex remains only as a defensive fallback. [`nextjs-app/hooks/queries/venue-query-options.ts`]

**Design Gate Criteria:**
- **Visual:** No new or changed visual reference. This is a data/infrastructure swap behind the existing UI; the five existing gate states + `map-primary` are reused unchanged.
- **Behaviour:** Every existing screen behaves identically with the real store swapped behind the API boundary. With the **default in-memory store** the route output is byte-identical to today; loading/empty/error states already built in Epics 1–3 handle real latency/failures.
- **Animation:** Not applicable.
- **Visual validation:** Re-run the five existing gate states + `map-primary` via `story-review.sh` / `visual-validate.sh`; they must PASS with **no rebaseline** (the default store reproduces the fixture exactly). Any genuine visual change requires explicit accept-with-rationale + `REBASELINE-LOG.md` per AGENTS.md.

## Tasks / Subtasks

- [x] **Task 1: Baseline, context, and `venues` table contract** (AC: #1, #3)
  - [x] 1.1 Confirm branch `epic/8-wire-real-data`. Run `cd nextjs-app && npx.cmd tsc --noEmit` and `cd nextjs-app && npx.cmd eslint . --quiet` before any change; if either reports an error outside story scope, stop and surface it.
  - [x] 1.2 Read: `AGENTS.md` (esp. §API Boundary, §Future Monetization, §Testing Requirements), `project-context.md` (Screen ID → Route Map; the `test-venue-sunny` dev-slug convention), this story, `_bmad-output/planning-artifacts/epics.md` §"Epic 8" / "Story 8.2", `_bmad-output/planning-artifacts/architecture.md` §"Naming Conventions"/§"API Contract"/§"State Management"/§data-layer, and the existing source: `nextjs-app/lib/services/venues-fixture.ts`, `nextjs-app/app/api/venues/route.ts`, `nextjs-app/app/api/venues/[slug]/route.ts`, `nextjs-app/lib/services/venue-reviews-persistence.ts`, `nextjs-app/lib/services/venue-feedback-persistence.ts`, `nextjs-app/lib/types/api.ts`, `nextjs-app/lib/query-keys.ts`. Read the prior SQL contract artifacts `_bmad-output/implementation-artifacts/3-3-reviews-contract.sql`, `3-2-feedback-contract.sql`, `3-0-2-shadow-caster-schema-rpc-contract.sql` (the conventions to mirror).
  - [x] 1.3 Confirm the live target read-only via Supabase MCP (project `hhnbxrhfhlzxgllxukzj`): **no `venues` table exists yet**; `reviews` and `feedback` carry `venue_id text` + `venue_slug text` (string ids matching the fixture `"1"`–`"7"`), so the new `venues.id` must be `text` to stay join-compatible. (Verified 2026-06-17 — see Dev Notes "Live Supabase state".)
  - [x] 1.4 Author the SQL contract artifact `_bmad-output/implementation-artifacts/8-2-venues-store-contract.sql` for `public.venues`, following the **recommended contract in Dev Notes** and the sectioned structure of `3-3-reviews-contract.sql` (diagnostics → `create table if not exists` + indexes → privileges/RLS → seed insert → rollback notes → smoke checks). Manual-run only — do **not** auto-apply migrations and do **not** create a `supabase/migrations/` dir (the project keeps schema as `.sql` contract artifacts). If you deviate from the recommended column set, surface it to Rasmus for ratification before building against it.

- [x] **Task 2: Venue store abstraction (env-gated, in-memory default)** (AC: #1, #2, #3)
  - [x] 2.1 Introduce a venue store service (recommended: `nextjs-app/lib/services/venue-store.ts`) exposing async accessors used by the routes — at minimum `getVenues(): Promise<StoredVenue[]>` and `getVenueBySlug(slug: string): Promise<StoredVenue | null>`. `StoredVenue` = the `VenueDataDto` base fields **plus** the optional detail block (`description`, `address`, `openingHours`, `peakTime`, `shadowWarningMinutes`) so both routes read from one source.
  - [x] 2.2 Default (no flag, tests, CI): an in-memory store seeded from the **existing fixture data** — keep `VENUE_FIXTURE` (and fold the `DETAIL_FIXTURE` detail attributes into the same seed) so the default output is **byte-identical** to today. Opt-in flag `SUNNYSEAT_VENUE_STORE=supabase` switches to a Supabase read via lazy `await import('@/lib/supabase/server')` → `getSupabaseServiceRole().from('venues').select(...)`, mirroring the `venue-reviews-persistence.ts` / `venue-feedback-persistence.ts` pattern (`usesSupabase…()` + `hasSupabaseServiceRoleConfig()` guards, throw on configured-but-missing-credentials). Map snake_case rows → `StoredVenue`.
  - [x] 2.3 Keep `VENUE_FIXTURE` exported as the **canonical in-memory seed** so the sync identity resolvers that already import it — `resolveReviewVenueIdentifier` (`venue-reviews-persistence.ts`) and the feedback route's venue lookup — stay synchronous and zero-dependency. Do **not** make review/feedback venue resolution depend on live Supabase in this story (that is out of scope and would break CI). The seed and the Supabase `venues` rows are the same canonical launch list.
  - [x] 2.4 Preserve `normalizeVenueForResponse` and `validateVenueUniqueness` unchanged (move/re-export if needed). Mapping from a Supabase row must be defensive (tolerate null jsonb sub-fields) and must never change the emitted DTO shape.

- [x] **Task 3: Wire `/api/venues` and `/api/venues/[slug]` to the store** (AC: #1, #2, #3)
  - [x] 3.1 `app/api/venues/route.ts`: replace the `VENUE_FIXTURE` import/usage with `await getVenues()`; run `validateVenueUniqueness` on the store list; feed the records through the **unchanged** pipeline (`normalizeVenueForResponse` → `applyFixtureWeatherAvailability` → `applyPlannerSelectionToVenue` → `distanceMeters`/`greatCircleMeters` → filter/sort/slice). Keep the rate-limit, `q`/`ids`/`radiusKm`/planner parsing, weak-etag/304, and `Cache-Control: public, max-age=30, s-maxage=30, must-revalidate` behaviour exactly as-is. The `GET` is already `async`.
  - [x] 3.2 `app/api/venues/[slug]/route.ts`: replace `VENUE_FIXTURE.find(...)` and the inline `DETAIL_FIXTURE` map with `await getVenueBySlug(decodedSlug)` (match on `slug` **or** `venueSlug`). Build `VenueDetailDto` from the store record's detail fields (same defaults as today: description fallback `\`${venueName} har uteservering i ${neighborhood}.\``, address fallback `neighborhood`, openingHours fallback `{ display: 'Öppettider saknas' }`). Preserve the 404 body shape `{ detail: \`Venue not found: ${decodedSlug}\`, status: 404 }`, the planner/coordinate parsing, the `reviewSummary` try/catch, the timeline projection, and caching/headers.
  - [x] 3.3 Confirm no client component imports `lib/supabase`/`lib/services/venue-store` (server-only). Query keys remain sourced from `lib/query-keys.ts` (no change needed). Task 7.4's API-boundary scan must be clean.

- [x] **Task 4: Robust 404 detection — carry numeric `status` on venue fetch errors** (AC: #4)
  - [x] 4.1 Attach a numeric `status` to the errors thrown by the venue fetch layer when a response is not OK. In `nextjs-app/hooks/queries/useVenueDetail.ts` (`Venue detail failed: …`), `useVenueSearch.ts` (`Venue search failed: …`), and `useFavouriteVenues.ts` (`Favourite venues failed: …`) — and any sibling fetcher using the same `failed: <status>` format — throw an error carrying `status: res.status` (e.g. a small `HttpError extends Error` or `Object.assign(new Error(msg), { status })`). Keep the message text unchanged so existing assertions and the fallback still work.
  - [x] 4.2 Update `nextjs-app/hooks/queries/venue-query-options.ts`: `isVenueNotFoundError` and `isClientHttpError` first read a numeric `status` off the error (404 / 4xx) and only fall back to the existing `/failed:\s404\b/i` and `/failed:\s4\d\d\b/i` regex when no numeric status is present. (Note: the deferred-work line reference `venue-query-options.ts:427` is stale — the helpers are at the current file's lines ~17–23.)
  - [x] 4.3 Add/extend unit tests pinning status-based detection (an error with `status: 404` is treated as not-found; `status: 500` is not) and that the message-regex fallback still works for an error with no `status`.

- [x] **Task 5: Seed parity + (optional, maintainer-run) live round-trip** (AC: #1, #2)
  - [x] 5.1 In `8-2-venues-store-contract.sql`, seed the canonical launch venues with values **byte-identical** to the current fixture (`venues-fixture.ts` `VENUE_FIXTURE` + the `[slug]/route.ts` `DETAIL_FIXTURE`), especially `test-venue-sunny` (id `"1"`, `Kafé Magasinet`, `Inom Vallgraven`, `lat 57.7050 / lng 11.9700`, `isPartner true`, `confidence 92`, `sunExposurePercent 95`, `sunWindow 13:00–18:30`, the detail address/openingHours/peakTime/shadowWarningMinutes). Use an idempotent `insert … on conflict (id) do update` so re-running is safe.
  - [x] 5.2 (Optional, maintainer-run — keep CI dependency-free) Apply the contract + seed to the live project and, with `SUNNYSEAT_VENUE_STORE=supabase` set locally, verify `/api/venues` and `/api/venues/test-venue-sunny` return the seeded venues and the gate slug resolves identically. Record the outcome in a short run note under `_bmad-output/implementation-artifacts/` (do not commit secrets/connection strings). The story's `done`-ness does **not** require the live apply — the default in-memory store satisfies all CI gates; the live apply is the production cutover that 8.5 finalizes.

- [x] **Task 6: Tests + flag documentation** (AC: #1, #2, #3, #4)
  - [x] 6.1 Vitest: add `venue-store` unit tests — default returns the canonical launch list (incl. `test-venue-sunny`) and passes `validateVenueUniqueness`; the Supabase mapping path is unit-tested with a mocked service-role client (snake_case row → `StoredVenue`, null-jsonb tolerance, missing row → `null`). The existing `venues-route` / `venue-detail-route` / `venue-feedback-route` tests must stay green unchanged (they exercise the default store). Add the Task 4 error-status tests.
  - [x] 6.2 Document the new flag in `nextjs-app/.env.example` (`SUNNYSEAT_VENUE_STORE=` — unset/in-memory default; `supabase` to read the live table), alongside the existing Supabase vars. Optionally note the existing `SUNNYSEAT_FEEDBACK_PERSISTENCE` / `SUNNYSEAT_REVIEW_PERSISTENCE` flags if still undocumented there.
  - [x] 6.3 Do **not** regenerate `lib/supabase/types.ts` (that is Story 8.5, after the schema is stable). If a local `venues` Row type helps the mapping, define it inline in `venue-store.ts`; keep the `lib/supabase/types.ts` placeholder + TODO note.

- [x] **Task 7: Final verification gate** (AC: all)
  - [x] 7.1 `cd nextjs-app && npx.cmd tsc --noEmit` (0) ; `cd nextjs-app && npx.cmd eslint . --quiet` (0) ; `cd nextjs-app && npx.cmd vitest run` (baseline **64 files / 527 tests** green pre-change; this story **adds** venue-store + error-status tests, so the count rises — it must not drop).
  - [x] 7.2 `cd nextjs-app && npx.cmd playwright test` — the real-route specs (`map-primary`, `axe`, `visit-loop`) and the mocked specs (`feedback`, `review`) all pass against the default in-memory store with no live Supabase.
  - [x] 7.3 Visual validation for the five gate states + `map-primary` (expect **no rebaseline** — default store is byte-identical): run `.\scripts\run-sh.ps1 scripts/story-review.sh 8-2-real-venue-store-api`. story-review runs lint/typecheck/test; run the screen captures via `.\scripts\run-sh.ps1 scripts/visual-validate.sh <screen-id> <route> [mobile|desktop]` for `map-with-selected-venue` (mobile), `venue-detail` (mobile + desktop), `feedback` (mobile), `review` (mobile), `map-primary` (mobile) using the `test-venue-sunny` routes. If a gate fails because the implementation is wrong, fix it; if it fails because a reference depicts out-of-scope UI, stop and ask Rasmus for accept-with-rationale — do not rebaseline silently.
  - [x] 7.4 Run the established API-boundary scan and MVP monetization quarantine scan (Epic 8 scope guardrails / Epic 3 practice): zero client→backend boundary hits and zero monetization hits. Update `sprint-status.yaml` notes and move the story `in-progress → review` only via `scripts/story-review.sh` (never edit sprint-status directly to `review`).

## Dev Notes

### The 8.2 ↔ 8.3 scope seam (read this first — it prevents the biggest mistake)
`VenueDataDto` carries **two kinds of fields**:
1. **Durable venue attributes** (identity/location/detail) — `id`, `venueId`, `venueName`, `venueSlug`/`slug`, `neighborhood`, `location`, `isPartner`, `thumbnail`, and detail (`description`, `address`, `openingHours`, `peakTime`, `shadowWarningMinutes`). **These are what the `venues` table owns and what this story makes real.**
2. **Sun-engine outputs** — `currentSunStatus`, `skyCondition`, `confidence`, `sunExposurePercent`, `sunWindow`, `predictionUncertainty`. Today these are hardcoded in the fixture. **Story 8.3** replaces them with the real `lib/solar` + `lib/weather` engine.

This story carries the sun-engine fields as **seed values stored on the `venues` row** so the DTO output stays complete and the gate venue is byte-identical. Mark those seed columns clearly as *temporary carriers superseded by Story 8.3* (a SQL comment + a note in the contract artifact). Do **not** compute or change any sun/weather/confidence math here — the route's `normalizeVenueForResponse` → `applyFixtureWeatherAvailability` → `applyPlannerSelectionToVenue` pipeline stays exactly as it is; 8.2 only changes *where the venue records come from*.

### Architecture alignment
- **API boundary (must not be violated):** "Client components must not import from `nextjs-app/lib/solar`, `…/lib/weather`, `…/lib/supabase`, `…/lib/middleware`, or `…/lib/buildings`. All data access flows through `app/api/*` and is wrapped by `hooks/queries`/`hooks/mutations`. Query keys come from `lib/query-keys.ts`." [Source: AGENTS.md §API Boundary] The venue store lives server-side under `lib/services/` and is only imported by the API routes — never by a client component.
- **Server-only Supabase service-role:** read via `getSupabaseServiceRole()` (`lib/supabase/server.ts`), exactly like the reviews/feedback adapters. Service-role bypasses RLS, so server reads work even with deny-by-default RLS on `venues`. [Source: architecture.md §"Admin removal correction"; `lib/supabase/server.ts`]
- **Naming conventions:** tables snake_case plural (`venues`), columns snake_case (`venue_id`, `is_partner`, `created_at`), indexes `idx_table_column`. [Source: architecture.md §"Naming Conventions" lines 469–473]
- **Response shapes (frozen):** list = `{ venues: VenueDataDto[], meta: { count, radiusKm, weatherUpdatedAt?, sunDataSource? }, timestamp, totalCount }`; detail = `{ venue: VenueDetailDto, meta?, timestamp }`. [Source: `lib/types/api.ts` `GetVenuesResponse`/`GetVenueDetailResponse`; architecture.md line 531] Do not change these.
- **Out of scope for this story (explicit):** real sun/shadow/weather (8.3); public/anon RLS policies + Supabase security advisor triage (8.5); `lib/supabase/types.ts` regeneration (8.5); feedback/review persistence enablement (8.4); admin/upload surfaces; URL/`_state`/visual-reference/query-key contracts.

### Live Supabase state (verified read-only, 2026-06-17, project `hhnbxrhfhlzxgllxukzj`)
- **No `venues` table exists.** Existing public tables: `shadow_casters` (58,731 rows), `shadow_caster_import_batches` (1), `reviews` (0), `feedback` (0), plus PostGIS `spatial_ref_sys`. `reviews`/`feedback` have RLS enabled.
- `reviews.venue_id text` + `reviews.venue_slug text`; `feedback.venue_id text` + `feedback.venue_slug text` — string identifiers matching the fixture ids `"1"`–`"7"`. → **`venues.id` must be `text`** to keep these join/lookup-compatible (the `3-2-feedback-contract.sql` comment explicitly says "Reintroduce a typed FK when the real venue table contract is wired"). Adding a FK from `reviews`/`feedback` → `venues` is **optional and out of scope** here (it would couple 8.4); if added later it belongs to 8.4/8.5.
- RLS precedent (`reviews`/`feedback`/`shadow_casters`): enable RLS, deny-by-default, `revoke all … from anon/authenticated/public`, `grant select to service_role`. Follow the same for `venues` (server-only read). No `using (true)` policies; no public/anon policy in this story.

### Recommended `venues` table contract (ratify in Task 1.4; mirror `3-3-reviews-contract.sql` structure)
`public.venues`, manual-run `.sql` artifact `8-2-venues-store-contract.sql`. Recommended columns (jsonb for nested shapes keeps the row compact and matches the project's jsonb usage; scalar columns are acceptable if you prefer — the only hard requirement is that the mapping reproduces the DTO exactly):

| column | type | notes |
|---|---|---|
| `id` | `text primary key` | `"1"`–`"7"`; matches `reviews/feedback.venue_id` |
| `slug` | `text not null unique` | canonical slug, e.g. `test-venue-sunny`; route maps both `slug` and `venueSlug` from this; add `idx_venues_slug` |
| `venue_name` | `text not null` | Swedish venue name |
| `neighborhood` | `text not null` | |
| `lat` | `double precision not null` | → `location.lat` |
| `lng` | `double precision not null` | → `location.lng` |
| `is_partner` | `boolean not null default false` | |
| `thumbnail` | `jsonb` | `{ alt, initials, url? }`, nullable |
| `description` | `text` | detail |
| `address` | `text` | detail |
| `opening_hours` | `jsonb` | detail `{ display, closesAt? }` |
| `peak_time` | `text` | detail `HH:MM` |
| `shadow_warning_minutes` | `integer` | detail, nullable |
| `current_sun_status` | `text not null check (in 'Sunny','Partial','Shaded','NoSun')` | **TEMP seed — superseded by 8.3** |
| `sky_condition` | `text` | **TEMP seed** `clear`/`partly-cloudy`/`overcast`/`unavailable` |
| `confidence` | `integer not null check (0..100)` | **TEMP seed** |
| `sun_exposure_percent` | `integer not null check (0..100)` | **TEMP seed** |
| `sun_window` | `jsonb` | **TEMP seed** `{ start, end }` (`HH:MM`) |
| `prediction_uncertainty` | `jsonb` | **TEMP seed** `{ level, reasons[] }`, nullable |
| `created_at` | `timestamptz not null default now()` | |
| `updated_at` | `timestamptz not null default now()` | |

Privileges/RLS section: `alter table public.venues enable row level security;` then `revoke all on table public.venues from anon; … from authenticated; … from public; grant select on table public.venues to service_role;` (no anon/public policy — server-only reads via service role this story; a public-read policy, if ever wanted, is 8.5). Seed section: idempotent `insert … on conflict (id) do update` with the canonical launch venues byte-identical to the fixture.

### Existing patterns to mirror (do not reinvent)
- **Env-gated persistence adapter** — `lib/services/venue-reviews-persistence.ts:131-181,224-248` and `lib/services/venue-feedback-persistence.ts:22-70`: `usesSupabase…()` reads `process.env.SUNNYSEAT_*` ; `hasSupabaseServiceRoleConfig()` checks `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`; lazy `const { getSupabaseServiceRole } = await import('@/lib/supabase/server')`; `.from(table).select(...)`/`.insert(...)`; throw `\`… failed: ${error.message}\`` on error; **in-memory default** when the flag is off. Use the identical shape for `venue-store.ts` with flag `SUNNYSEAT_VENUE_STORE=supabase`.
- **Route pipeline (keep verbatim, just change the source array)** — `app/api/venues/route.ts:270-308` is the `.map(normalize).map(weather).map(planner).map(distance).filter(...).sort(...).slice(...)` chain; only the input (`VENUE_FIXTURE` → `await getVenues()`) changes.
- **Detail builder** — `app/api/venues/[slug]/route.ts:179-215` `buildDetailDto`; the `DETAIL_FIXTURE` map (lines 51-103) moves into the store's detail fields.
- **SQL contract artifacts** — `3-3-reviews-contract.sql`, `3-2-feedback-contract.sql`, `3-0-2-shadow-caster-schema-rpc-contract.sql` for section layout, snake_case, `create … if not exists`, RLS/grants, and end-of-file smoke checks.

### Gate-critical facts (why AC2 matters and how the gates consume venues)
- `test-venue-sunny` is the fixed dev-seeded slug for venue state-variant screens. [Source: AGENTS.md §Dev-Only Conventions; project-context.md] It is fixture id `"1"` = `Kafé Magasinet`.
- E2E specs that hit the **real** `/api/venues/[slug]` (no network mock — they break if the slug stops resolving or its values drift): `nextjs-app/test/e2e/map-primary.spec.ts`, `test/e2e/axe.spec.ts`, `test/e2e/visit-loop.spec.ts`. Specs that **mock** the network (route-intercept) and only assert the slug in request bodies: `test/e2e/feedback.spec.ts`, `test/e2e/review.spec.ts`.
- Vitest route tests that exercise the real handlers and assert fixture values (must stay green via the default store): `test/unit/api/venues-route.test.ts`, `test/unit/api/venue-detail-route.test.ts` (asserts `venueName: 'Kafé Magasinet'`, `sunWindow {13:00,18:30}`, `shadowWarningMinutes: 45`, etc.), `test/unit/api/venue-feedback-route.test.ts` (asserts slug↔id `'test-venue-sunny'`↔`'1'`).
- The five visual references + `map-primary` live under `nextjs-app/docs/design/references/screens/{mobile,desktop}/` and are driven through `test-venue-sunny` routes; rebaselines are logged in `docs/design/references/REBASELINE-LOG.md`.

### DTO field reference (target shapes — `lib/types/api.ts`)
- `VenueDataDto`: `id, venueId, venueName, venueSlug, slug, neighborhood, location{lat,lng}, currentSunStatus, skyCondition?, isPartner, confidence(0..100 certainty), distanceMeters, sunExposurePercent(0..100 sun), predictionUncertainty?{level,reasons[]}, sunWindow?{start,end}, thumbnail?{alt,initials,url?}, reviewSummary?`. Note `venueId===id` and `venueSlug===slug` in the fixture; reproduce that in the row→DTO mapping. `distanceMeters` is computed per-request (not stored).
- `VenueDetailDto extends VenueDataDto`: `+ description, address, openingHours{display,closesAt?}, timeline{timezone,'range',windows[],peakTime?}, shadowWarningMinutes?`. `timeline` is built in the route from `sunWindow` + `peakTime` (keep that logic; the store supplies `peakTime`).
- `PredictionUncertaintyLevel = 'low'|'medium'|'high'`; reasons are the 9-value union in `lib/types/api.ts:13-22`. `normalizeVenueForResponse` already coerces unknown reasons → `'other'` and drops malformed `sunWindow`/`thumbnail`; keep that normalization in the path.

### Deferred item carried in (AC #4)
From `deferred-work.md` (Story 3.4 code review Round 2, R2-D2 — removed from `deferred-work.md` as part of drafting this story per the queue-not-archive convention): *"`isVenueNotFoundError` couples 404 detection to the error string … robust fix is to carry a numeric `status` on the thrown error and test against it; do this when the real venue API + error contract lands."* The stale path ref in the entry was `venue-query-options.ts:427`; the helpers are actually at `nextjs-app/hooks/queries/venue-query-options.ts:17-23` (`isClientHttpError` regex `/failed:\s4\d\d\b/i`, `isVenueNotFoundError` regex `/failed:\s404\b/i`). Throwing fetchers: `hooks/queries/useVenueDetail.ts` (~line 73), `useVenueSearch.ts` (~line 84), `useFavouriteVenues.ts`.

### Scope guardrails (do NOT)
- Do not change sun/shadow/weather/confidence math, `lib/solar`, `lib/weather`, or the route normalization/planner/weather chain (Story 8.3).
- Do not author public/anon RLS policies or run/triage the Supabase security advisor (Story 8.5).
- Do not regenerate `lib/supabase/types.ts` (Story 8.5).
- Do not change feedback/review persistence wiring or make their venue resolution depend on live Supabase (Story 8.4).
- Do not add admin/upload surfaces, change `_state`/URL contracts, visual references, the query-key factory, or the routes' rate-limit/caching/etag behaviour.
- Do not introduce a live-Supabase dependency into CI/tests; the default store is in-memory.
- Do not commit secrets/connection strings; `.env.local` stays gitignored (production secrets are deployment env vars — Story 8.5).

### Project Structure Notes
- New: `nextjs-app/lib/services/venue-store.ts` (server-only), `_bmad-output/implementation-artifacts/8-2-venues-store-contract.sql`. Modified: `app/api/venues/route.ts`, `app/api/venues/[slug]/route.ts`, `hooks/queries/venue-query-options.ts`, `hooks/queries/useVenueDetail.ts`, `useVenueSearch.ts`, `useFavouriteVenues.ts`, `nextjs-app/.env.example`, new/updated Vitest specs under `test/unit/`. `lib/services/venues-fixture.ts` is retained as the canonical seed (re-exported through the store) — its `VENUE_FIXTURE`/`normalizeVenueForResponse`/`validateVenueUniqueness` exports must keep working for the review/feedback resolvers and route tests.
- No new screen ID or visual reference (data/infra swap behind existing UI). Component layers (`components/custom → composed → ui`) are untouched.

### References
- [Source: CLAUDE.md] (points to AGENTS.md as the canonical repo rulebook) and [Source: AGENTS.md] (§API Boundary, §Future Monetization, §Testing Requirements, §Dev-Only Conventions, §Local Docker/WSL Rules)
- [Source: project-context.md] (Screen ID → Route Map; `test-venue-sunny` dev-slug convention)
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 8 — Story 8.2: Real Venue Store & API]
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Conventions] (snake_case `venues`, `is_partner`, `venue_id`)
- [Source: _bmad-output/planning-artifacts/architecture.md#API Contract] (collection response shape `{ venues, meta }`)
- [Source: AGENTS.md#API Boundary] and [Source: AGENTS.md#Dev-Only Conventions] (`test-venue-sunny`)
- [Source: nextjs-app/lib/types/api.ts] (VenueDataDto / VenueDetailDto / GetVenuesResponse / GetVenueDetailResponse)
- [Source: nextjs-app/lib/services/venues-fixture.ts] (VENUE_FIXTURE + normalizeVenueForResponse — the seed)
- [Source: nextjs-app/app/api/venues/route.ts] and [Source: nextjs-app/app/api/venues/[slug]/route.ts] (routes to rewire; DETAIL_FIXTURE)
- [Source: nextjs-app/lib/services/venue-reviews-persistence.ts] and [Source: nextjs-app/lib/services/venue-feedback-persistence.ts] (env-gated Supabase adapter pattern)
- [Source: nextjs-app/lib/supabase/server.ts] (getSupabaseServiceRole)
- [Source: nextjs-app/lib/query-keys.ts] (queryKeys.venues.* — unchanged)
- [Source: _bmad-output/implementation-artifacts/3-3-reviews-contract.sql] and [Source: …/3-2-feedback-contract.sql] (SQL contract + RLS conventions)
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] (R2-D2, carried into AC #4)
- _Not applicable:_ `nextjs-app/docs/design/DESIGN.md` and `_bmad-output/planning-artifacts/ux-design-specification.md` — this is a data-source swap with no UI/visual/animation change (AC1 explicitly requires zero frontend component changes); design-token/UX-interaction specs do not apply. Visual validation re-uses existing references only.

### Test gate (must pass before `review`)
- `cd nextjs-app && npx.cmd tsc --noEmit` (0 errors)
- `cd nextjs-app && npx.cmd eslint . --quiet` (0 errors)
- `cd nextjs-app && npx.cmd vitest run` (≥ baseline 64 files / 527 tests; rises with new tests)
- `cd nextjs-app && npx.cmd playwright test` (real-route + mocked specs green; no live Supabase)
- Visual validation: `map-with-selected-venue` (mobile), `venue-detail` (mobile + desktop), `feedback` (mobile), `review` (mobile), `map-primary` (mobile) — expect no rebaseline
- `.\scripts\run-sh.ps1 scripts/story-review.sh 8-2-real-venue-store-api`
- API-boundary scan + MVP monetization quarantine scan (zero hits)

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Opus 4.8) — bmad-dev-story workflow (Amelia/Claude)

### Debug Log References

- Baseline (commit 62f6438): `tsc --noEmit` 0, `eslint . --quiet` 0.
- Live Supabase read-only confirm (project `hhnbxrhfhlzxgllxukzj`, 2026-06-17): no `public.venues` table; `reviews`/`feedback` carry `venue_id text` + `venue_slug text` → validated the `venues.id text` decision. (The advisor flags `spatial_ref_sys` RLS-disabled — a PostGIS system table owned by Story 8.5's security triage; out of scope here.)
- Final gate: `tsc` 0; `eslint` 0; `vitest run` 66 files / 549 tests (baseline 64/527; +2 files / +22 tests, none dropped); Playwright real-route (`map-primary`, `axe`, `visit-loop`) + mocked (`feedback`, `review`) 41 passed / 19 skipped against the default in-memory store (no live Supabase); 6 visual validations PASS with no rebaseline; API-boundary scan 0 hits; MVP monetization quarantine scan 0 hits.

### Completion Notes List

- **Data-source swap behind a frozen contract (AC #1, #3).** Introduced `nextjs-app/lib/services/venue-store.ts` (server-only), an env-gated adapter mirroring `venue-reviews-persistence.ts`/`venue-feedback-persistence.ts`: default in-memory seed (built from `VENUE_FIXTURE` + the launch detail block) so CI has zero live-Supabase dependency, and `SUNNYSEAT_VENUE_STORE=supabase` opts into a lazy `getSupabaseServiceRole().from('venues')` read. Both routes now read from the store (`/api/venues` → `getVenues()`; `/api/venues/[slug]` → `getVenueBySlug()`); the rate-limit/parsing/etag/caching/normalize→weather→planner pipeline is unchanged. The 55 route tests stay green unchanged, confirming byte-identical output.
- **List vs detail shape (key correctness decision).** The route pipeline (`normalizeVenueForResponse`, `applyFixtureWeatherAvailability`, `applyPlannerSelectionToVenue`) all spread `...venue`, so folding the detail block into the list source would leak `description`/`address`/`openingHours`/`peakTime`/`shadowWarningMinutes` (esp. `peakTime`, which is not a DTO field) into the `/api/venues` response. Therefore `getVenues()` returns BASE fields only; `getVenueBySlug()` carries the detail block, and the `[slug]` route strips it via `toVenueData()` before the pipeline and re-applies it explicitly via `storedVenueDetail()` + `buildDetailDto()` — exactly reproducing the prior `DETAIL_FIXTURE` behaviour.
- **`venues` SQL contract (AC #1, #2 / Task 1.4, 5.1).** `_bmad-output/implementation-artifacts/8-2-venues-store-contract.sql` — manual-run only (no `supabase/migrations/`), `text` primary key (join-compatible with `reviews`/`feedback`), snake_case, jsonb nested shapes, deny-by-default RLS + single `grant select to service_role`, idempotent `insert … on conflict (id) do update` seeded byte-identical to the fixture (incl. `test-venue-sunny`), end-of-file smoke checks. The recommended column set was followed without deviation (no ratification needed). Sun-engine columns are explicitly marked TEMP seed carriers superseded by Story 8.3.
- **Gate venue stable (AC #2).** `test-venue-sunny` resolves identically through the default store (id `1`, Kafé Magasinet, sunWindow 13:00–18:30, shadowWarningMinutes 45, etc.); all 6 visual references PASS with no rebaseline.
- **Robust 404 detection (AC #4 — carried R2-D2).** Added `HttpError` (carries numeric `status`) to `venue-query-options.ts`; `isVenueNotFoundError`/`isClientHttpError` now read the numeric `status` first and fall back to the `/failed:\s4\d\d\b/i` message regex only when absent. The three fetchers (`useVenueDetail`, `useVenueSearch`, `useFavouriteVenues`) throw `HttpError` with the message text unchanged, so existing assertions and the fallback still hold.
- **Tests (AC all).** New `test/unit/services/venue-store.test.ts` (default list + uniqueness, slug+detail lookup, fail-closed, Supabase mapping via mocked service-role client, null-jsonb tolerance, missing-row → null, projection helpers) and `test/unit/queries/venue-query-options.test.ts` (status-first detection + regex fallback). `.env.example` documents `SUNNYSEAT_VENUE_STORE` alongside the feedback/review persistence flags.
- **Out of scope (untouched, per story):** sun/shadow/weather/confidence math (8.3); public/anon RLS + security-advisor triage (8.5); `lib/supabase/types.ts` regeneration (8.5 — placeholder kept; a local `VenueRow` type is inline in the store); feedback/review persistence wiring (8.4 — `VENUE_FIXTURE` stays the canonical sync seed for the review/feedback resolvers).
- **Task 5.2 (optional live apply) deferred.** The live contract apply + `SUNNYSEAT_VENUE_STORE=supabase` round-trip is the maintainer-run production cutover (keeps CI dependency-free; finalized by Story 8.5). Done-ness does not require it — the default in-memory store satisfies all gates. No secrets/connection strings committed.

### File List

**Created**
- `_bmad-output/implementation-artifacts/8-2-venues-store-contract.sql`
- `nextjs-app/lib/services/venue-store.ts`
- `nextjs-app/test/unit/services/venue-store.test.ts`
- `nextjs-app/test/unit/queries/venue-query-options.test.ts`

**Modified**
- `nextjs-app/app/api/venues/route.ts`
- `nextjs-app/app/api/venues/[slug]/route.ts`
- `nextjs-app/hooks/queries/venue-query-options.ts`
- `nextjs-app/hooks/queries/useVenueDetail.ts`
- `nextjs-app/hooks/queries/useVenueSearch.ts`
- `nextjs-app/hooks/queries/useFavouriteVenues.ts`
- `nextjs-app/.env.example`
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (status flip + dev-start note)
- `nextjs-app/lib/services/venue-store.ts` (R1 fixes P1/P2 — enum coercion + identity/coordinate guards)
- `nextjs-app/hooks/queries/useVenueReviews.ts` (R1 fix P4 — HttpError)
- `nextjs-app/hooks/mutations/useSubmitReview.ts` (R1 fix P4 — HttpError)
- `nextjs-app/hooks/mutations/useSubmitFeedback.ts` (R1 fix P4 — HttpError)

## Change Log

| Date | Change |
|------|--------|
| 2026-06-17 | Story 8.2 implemented (Amelia/Claude, Opus 4.8): env-gated `venue-store.ts` (in-memory default, `SUNNYSEAT_VENUE_STORE=supabase` opt-in) behind the frozen `/api/venues` + `/api/venues/[slug]` contract; authored `8-2-venues-store-contract.sql` (text-id `venues`, RLS deny-by-default, byte-identical seed); robust numeric-`status` 404 detection via `HttpError` (R2-D2). Gates green: tsc 0, eslint 0, vitest 66/549, Playwright real-route+mocked, 6 visual validations PASS (no rebaseline), API-boundary + monetization scans 0 hits. Status in-progress → review. |
| 2026-06-18 | Addressed code review Round 1 findings — 5 items resolved (Amelia/Claude, Opus 4.8): P1 enum coercion (`coerceSunStatus`/`coerceSkyCondition`) + P2 identity/coordinate guards in `fromVenueRow`; P3 by-slug Supabase error-branch test; P4 sibling fetchers (`useVenueReviews`/`useSubmitReview`/`useSubmitFeedback`) migrated to `HttpError`; P5 `httpStatusFromError` narrowed to `instanceof HttpError && Number.isInteger`. +6 unit tests. Gates green: tsc 0, eslint 0, vitest 66/555. No default-store/UI change → no rebaseline. Status in-progress → review. |

## Review Findings

**Round 1 of 3** — bmad-code-review (3 parallel layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor), 2026-06-18, Opus 4.8. Diff vs baseline `62f6438`. All 4 ACs verified satisfied by the Acceptance Auditor; seed byte-identity verified clean field-by-field across all 7 venues by two project-access layers. No blocking (Critical/High-in-CI) findings. All findings below are on the **opt-in `SUNNYSEAT_VENUE_STORE=supabase` path** (off by default, not exercised in CI) unless noted.

_Patch findings (Round 1 — all resolved 2026-06-18):_

- [x] [Review][Patch] Supabase `fromVenueRow` casts `current_sun_status`/`sky_condition` to their unions without validating membership — an out-of-enum DB value leaks into the DTO and makes the list-sort comparator `NaN` (`normalizeVenueForResponse` does not sanitize `currentSunStatus`; `SUN_STATUS_ORDER[invalid]` → `undefined` → `undefined - n = NaN`). Coerce invalid → safe default, mirroring how `normalizeVenueForResponse` coerces other fields. [nextjs-app/lib/services/venue-store.ts:277,282 → nextjs-app/app/api/venues/route.ts:289] (edge+blind) — **Resolved:** added `coerceSunStatus` (out-of-enum/null → `'NoSun'`) and `coerceSkyCondition` (unknown value dropped, mirroring `normalizeVenueForResponse`); unit test pins the coercion. [venue-store.ts]
- [x] [Review][Patch] Supabase `fromVenueRow` silently coerces missing/non-finite `lat`/`lng` to a real `(0,0)` venue and missing `id`/`slug` to `''` — both reach the list route unguarded (two `0,0` rows would also trip `validateVenueUniqueness` → 500 for all results). Treat a row without coordinates/identity as a data error rather than emitting a plausible-but-wrong venue. [nextjs-app/lib/services/venue-store.ts:267-281,305-307] (blind+edge) — **Resolved:** `fromVenueRow` now throws `Venue store failed: …` when `id`/`slug` are missing or `lat`/`lng` are non-finite (consistent with the existing store error prefix); two unit tests pin the throws. [venue-store.ts]
- [x] [Review][Patch] Missing unit test for the `readSupabaseVenueBySlug` error branch (the list-path error branch is tested, the by-slug one is not). Add a `singleResult.error` case asserting `Venue store failed: …`. [nextjs-app/test/unit/services/venue-store.test.ts] (blind) — **Resolved:** added "throws a stable error when the by-slug Supabase read fails" asserting `Venue store failed: boom`. [venue-store.test.ts]
- [x] [Review][Patch] Task 4.1 said "any sibling fetcher using the same `failed: <status>` format" — `useVenueReviews`, `useSubmitReview`, `useSubmitFeedback` still throw plain `Error`. Non-functional today (they don't feed `shouldRetryVenueQuery`/`isVenueNotFoundError`), but migrating them to `HttpError` honors the task wording and future-proofs. [nextjs-app/hooks/queries/useVenueReviews.ts, useSubmitReview.ts, useSubmitFeedback.ts] (auditor) — **Resolved:** the three `!res.ok` branches now throw `HttpError(msg, res.status)` with the message text unchanged. (Actual paths: `hooks/queries/useVenueReviews.ts`, `hooks/mutations/useSubmitReview.ts`, `hooks/mutations/useSubmitFeedback.ts`.)
- [x] [Review][Patch] (low/optional) `httpStatusFromError` treats any object with a finite `status` (incl. non-integer/negative, or a foreign error that happens to carry `status`) as an HTTP status. Narrow to `Number.isInteger` (and/or gate on `instanceof HttpError`). [nextjs-app/hooks/queries/venue-query-options.ts:34-39] (blind+edge) — **Resolved:** narrowed to `error instanceof HttpError && Number.isInteger(error.status)`; foreign-status errors now fall through to the message-regex fallback. Two unit tests pin the gate. [venue-query-options.ts]

_Deferred findings:_ none.

**Round 1 fixes applied** — 2026-06-18 (Amelia/Claude, Opus 4.8). All 5 Patch findings resolved (2 Medium hardening the opt-in Supabase mapping, 3 Low). +6 unit tests added (4 venue-store, 2 venue-query-options). Gate green: `tsc` 0, `eslint` 0, `vitest run` **66 files / 555 tests** (was 549; +6, none dropped). No change to the default in-memory store output (route tests stay byte-identical green), no UI/visual change → no rebaseline. Findings were all on the opt-in `SUNNYSEAT_VENUE_STORE=supabase` path (off in CI) or the non-functional sibling-fetcher migration.

_Verified / dismissed as noise (9, dropped):_ SQL seed "not byte-identical" (Blind — false positive from no-project-access; verified clean by both project layers); `getVenues` in-memory-vs-Supabase shape divergence / double-map (verified no bug, pinned by the "omits detail block" test); Supabase `slug`-only match vs in-memory dual-match (behaviorally equivalent — single `slug` column, no `venue_slug`); `maybeSingle()` duplicate-slug 500 (guarded by the `idx_venues_slug` unique index); null-idiom inconsistency `!= null` vs truthiness (no functional impact for current fields); `toVenueData` manual whitelist (deliberate projection enforcing the no-leak guarantee); `isClientHttpError` regex fallback "still string-coupled" (intentional per AC4); `.env.example` sibling flag names unverifiable (verified correct against the adapters); SQL temp sun-engine columns `NOT NULL` (cosmetic — `DROP COLUMN` in 8.3 is unaffected by `NOT NULL`).
