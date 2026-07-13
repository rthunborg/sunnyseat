# Story 12.1: Google Places Opening-Hours Sync (Weekly Scheduled — Replace Hand-Maintained Hours)

Status: ready-for-dev

> **Historical title / controlling implementation:** The title and the retained Epic 12 prose describe the rejected Google-hours design. The approved 2026-07-12 provider-policy research, PRD v3.2, and Architecture Decisions `E12-AD-01`, `E12-AD-12`, and `E12-AD-13` control this story. Implement provider-neutral canonical hours, a one-time provenance remediation, and a weekly staleness/manual-review audit. Do **not** implement Google `regularOpeningHours` ingestion.

## Story

As a **maintainer (and a user relying on venue hours)**,
I want canonical opening hours to carry independently verified provenance and to be checked by an automatic weekly staleness/review workflow,
so that SunnySeat can keep venue-hours claims current and inspectable without persisting policy-ineligible provider content or adding latency to public requests.

## Superseded Epic Text

The following Story 12.1 text is preserved verbatim from `_bmad-output/planning-artifacts/epics.md` for auditability. It is **historical input, not executable acceptance criteria**. The 2026-07-12 sprint-change proposal kept Epic 12 prose unchanged while the completed provider-policy research and adopted architecture replaced this implementation direction. Direct implementation of any Google-hours fetch/cache below is prohibited by `E12-AD-01` and `E12-AD-13`.

### Superseded heading and user story — verbatim

> **Maintainer decision (2026-07-08):** this runs as a **weekly scheduled job**, NOT
> a runtime lookup. The request path (`/api/venues`) makes **zero** Google Places
> calls — it only ever reads the already-synced `venues.opening_hours` column, so the
> sync never adds latency to a user request (it is orthogonal to the Story-12.3 cold
> start; it only touches Places once a week, offline).

As a **maintainer (and a user reading venue hours)**,
I want `venues.opening_hours` refreshed automatically from each venue's Google
Places `regularOpeningHours`,
So that the ÖPPET badge and the derived "Öppet till HH:MM" line reflect the venue's
real, current hours instead of hand-collected values that drift.

### Superseded acceptance criteria — verbatim

**Given** venues carry optional `place_id` / `places_api_url` (2026-07-07: all 42
set; `brasserie-voyage` + `voyage-vasaplatsen` deliberately share one place because
they are two seating areas of the same establishment)
**When** a **scheduled** sync (the PRIMARY deliverable — a weekly automatic job, e.g. a
GitHub Action per `nextjs-app/docs/github-actions-scheduled-jobs.md` or a Vercel cron
route; an on-demand maintainer trigger is an OPTIONAL extra, never the only vehicle —
hours must refresh without anyone remembering to run it) fetches Place Details with a
field mask restricted to `regularOpeningHours`, authenticated by a server-only Google
Maps Platform API key (deployment env var; never `NEXT_PUBLIC_*`, never committed) —
AND the sync TRIGGER itself is authenticated: if the vehicle is HTTP-triggered (a Vercel
cron route, or an Action hitting an endpoint), the endpoint requires the existing
`CRON_SECRET` pattern (`github-actions-scheduled-jobs.md:17-20`) with an
unauthorized-request test + env-var docs updated — an unauthenticated public endpoint that
burns Places quota and rewrites `opening_hours` is not acceptable; a pure-script vehicle
(Action → Supabase directly, no HTTP endpoint) needs no route auth beyond the keys
**Then** each fetched venue's `opening_hours` jsonb is rewritten in the Story 11.9
per-weekday shape — ISO keys `"1"` (Mon) … `"7"` (Sun) mapped from Places
`periods[]` (Places `day` is 0=Sunday…6=Saturday), `"HH:MM"` 24h times, a weekday
with no period stored as `null` (closed), a past-midnight period collapsing to
`close < open` on the OPENING weekday — and venues without a `place_id` are skipped,
keeping their hand-authored hours untouched

**Given** storing and re-serving Google Places content is bound by the **Places API
policies** — as of this review: `place_id` is the explicit caching EXCEPTION (storable
indefinitely), while other Places content (incl. opening hours) carries storage/refresh
restrictions, attribution requirements, and display constraints on non-Google maps — and
SunnySeat renders on **MapLibre**, not a Google map
**When** the story is implemented (this is a GATING precondition, resolved FIRST)
**Then** the CURRENT policy text is verified and the implementation made compliant —
permitted retention window/refresh cadence, required Google attribution wherever synced
hours render, and the non-Google-map display constraint explicitly resolved — OR, if
compliant storage/display cannot be achieved for a MapLibre app, the story PIVOTS ITS
SOURCE (venue-provided/manual hours stay canonical, or an alternative provider whose terms
permit storage) rather than shipping a terms-violating weekly cache; the chosen compliance
posture is recorded in the story file. (The `place_id`/`places_api_url` columns are safe
either way — ids are the caching exception)

**Given** Places can return MULTIPLE `periods[]` for one weekday (e.g. lunch 11–14 +
dinner 17–23), but the Story 11.9 `WeeklyOpeningHours` / `coerceOpeningHours` contract
accepts only ONE `{ open, close }` per weekday key
**When** a weekday has split periods
**Then** 12.1 makes **NO contract change** — split-hours venues are simply **OUT OF SCOPE
for auto-sync**. A venue with ANY split weekday is **SKIPPED WHOLESALE** for the sync and
REPORTED for manual handling (kept on its existing hand-authored hours), never written as
`null`/missing (both = closed in the contract → Story 12.14 would then HIDE a genuinely-open
venue all day) and never collapsed to an outer envelope (11–14 + 17–23 → 11–23 fabricates the
14–17 gap). To avoid a venue that was previously synced CLEANLY later going stale when a day
splits, the sync tracks per-venue sync provenance and FLAGS such a venue for manual review
rather than trusting the old single interval. Truthfully auto-syncing split venues REQUIRES
the multi-interval `WeeklyOpeningHours` extension — a real DTO/formatter/filter **contract
change that is a SEPARATE prerequisite story, explicitly NOT part of 12.1** (which is exactly
why 12.1 can claim "no contract change" below)

**Given** the Places API has quota and per-field-mask billing
**When** the sync runs
**Then** it requests ONLY the opening-hours field (field mask keeps the billed SKU
minimal), runs on a **weekly** schedule (a cron/GitHub Action — hours change rarely;
NEVER on the user request path), handles per-venue fetch failures without aborting
the batch (the venue keeps its last-known hours; never a partial or fabricated write),
validates every write against the same weekday/`HH:MM` contract the store's
`coerceOpeningHours` enforces, and produces a per-venue outcome summary the maintainer
can inspect (42 venues × 1 field, once a week ≈ negligible quota)

**Given** the app derives the ÖPPET badge + "Öppet till HH:MM" line at render time
from `venues.opening_hours` (Story 11.9) and never stores display strings
**When** the sync lands
**Then** there is NO DTO, formatter, or UI change: the per-weekday contract (missing
key/`null` = closed; `close < open` = past-midnight) is unchanged — this holds precisely
BECAUSE split-hours venues are skipped wholesale (above), not represented via a new sentinel
or multi-interval shape (that contract-changing extension is a separate prerequisite story);
and Places `specialHours` / holiday exceptions are explicitly OUT of scope (documented in the
story file; weekly `regularOpeningHours` remain the only synced source)

**Given** `nextjs-app/docs/venue-data-load.md` is the canonical venue-authoring guide
**When** the sync ships
**Then** the doc's `opening_hours` + `place_id` rows are updated to state that hours
auto-sync for venues with a `place_id` (hand-authored hours remain the
fallback/override for venues without one), including how to run and inspect the sync

### Superseded design gate criteria — verbatim

- **Visual:** No visual change — the ÖPPET badge and "Öppet till HH:MM" line keep
  their current treatment; only the underlying data freshens
- **Behaviour:** Synced closed-today (`null`) and past-midnight (`close < open`)
  shapes render exactly as their hand-authored equivalents do today
- **Animation:** None (no UI surface change)
- **Visual validation:** Screenshot comparison of venue detail + quick-info against
  the current baseline passes — a data-only story must not move pixels

## Acceptance Criteria (Controlling Provider-Pivot Contract)

### AC1 — The Google-hours path is prohibited and regression-guarded

**Given** the completed 2026-07-12 policy research concluded that Google `regularOpeningHours` has no permitted durable caching path for SunnySeat's 2026 EEA/MapLibre integration, and official Google terms were rechecked on 2026-07-13
**When** Story 12.1 is implemented
**Then** no request-path, scheduled, test, fixture, queue, log, database, DTO, or UI path requests, stores, normalizes, or exposes Google opening hours, Google-returned URLs/content, provider URLs, or API-key-bearing URLs; only Google Place IDs may remain as server-side identity/reference metadata; user request paths make zero Google calls; and a deterministic static policy guard fails if `regularOpeningHours`, a Google hours field mask, persisted provider URL/content, or a provider credential is introduced later

### AC2 — Schema evolution establishes a Place-ID-only, provider-neutral provenance contract

**Given** `place_id` / `places_api_url` exist only as live-schema drift from the uncommitted `venues_add_google_places_columns` migration, while the generated Supabase types and repository migration authority do not contain them
**When** the database contract is migrated
**Then** versioned idempotent migrations under repository-root `supabase/migrations/` first reconcile the live-only columns, then retain nullable indexed non-unique `venues.place_id`, remove `venues.places_api_url`, add checked provider-neutral provenance/review fields (`hours_source_type`, `hours_source_reference`, `hours_review_status`, `hours_reviewed_at`, `hours_next_review_at`, `hours_notes`), and create service-only `hours_review_runs` / `hours_review_outcomes` with checked statuses/reasons/error classes and 180-day retention; RLS is enabled; `anon`, `authenticated`, and `public` have no table privileges or policies; only the required service-role operations are available; `nextjs-app/lib/supabase/types.ts` is regenerated; old-row compatibility is tested; preview schema verification passes; and the post-apply schema diff is empty

### AC3 — Existing live hours are remediated before weekly automation is enabled

**Given** the live 42-venue set contains hand-collected hours whose independent provenance is not yet encoded
**When** the one-time provenance audit runs
**Then** every venue receives an auditable per-venue outcome: an existing schedule is retained only with independently verified eligible provenance (`venue_confirmed`, `venue_website`, an expressly licensed provider, or approved `manual` evidence); Google-derived or unprovable schedules are deleted/replaced rather than relabelled; an unresolved venue becomes whole-field unknown (`opening_hours = null`, never a set of closed weekdays); `place_id` may remain; and the completion evidence shows zero Google-derived or unprovenanced public schedules before the recurring workflow is enabled

### AC4 — Canonical hours and provider adapters remain lossless and provider-neutral

**Given** the launch `WeeklyOpeningHours` contract supports at most one `{ open, close }` interval per ISO weekday
**When** independently permitted evidence or a future expressly licensed provider is normalized
**Then** the shared validation/adapter contract returns exactly `accepted(schedule, provenance)`, `manual_review(reason, provenance)`, or `failed(errorClass)`; only `accepted` atomically and idempotently writes schedule plus provenance; missing/null weekday means explicitly closed, whole-field absence means unknown, and `close < open` means a past-midnight session; any split, unsupported 24/7, seasonal, or holiday-specific schedule routes the **whole venue** to manual review and never flattens a gap, guesses a sentinel, partially writes days, or overwrites the prior independently verified schedule; OSM remains a non-writing pilot until its 42-venue coverage and ODbL gates are approved, and public Nominatim is never used for scheduled bulk work

### AC5 — A weekly direct GitHub Action produces inspectable staleness/review outcomes

**Given** hours freshness must not depend on a maintainer remembering to run a command
**When** the weekly audit executes
**Then** a dedicated scheduled GitHub Action checks out the repository and runs a repository script directly against Supabase (no `/api/cron/*` route and no public trigger), supports controlled manual dispatch, is restricted to the protected production environment/main branch, uses `SUN_HOURS_AUDIT_ENABLED=false` as an independent fail-closed emergency stop, prevents overlapping runs, isolates per-venue failures, and classifies/reports missing provenance, due, unknown, conflicting, split, failed, and stale venues without changing canonical public hours; run/outcome rows contain no provider payloads and are retained for 180 days; the GitHub summary contains bounded counts plus a run identifier/link rather than source/provider data; repeated runs are idempotent; and one failed venue does not abort the batch

### AC6 — Public rendering stays provider-neutral and visually unchanged

**Given** the list/detail UI already derives localized hours from canonical `venues.opening_hours`
**When** provenance and audit infrastructure lands
**Then** public list/detail DTOs expose only the existing canonical `openingHours` field and never expose provenance, review notes, Place IDs, provider data, or service-only outcomes; a whole-field unknown row omits `openingHours` on both list and detail DTOs and renders no open/closed claim; `formatOpeningHours` and current pixels are unchanged; the not-yet-minute-precise current-weekday behavior remains explicitly owned by Story 12.14; and current `venue-detail` plus selected-venue quick-info screenshot comparisons pass without reference-PNG edits or a `REBASELINE-LOG.md` change

### AC7 — Authoring and operations documentation describes the real workflow

**Given** `nextjs-app/docs/venue-data-load.md`, `nextjs-app/docs/github-actions-scheduled-jobs.md`, and environment docs currently describe the retired Google-sync or documentary `/api/cron/*` assumptions
**When** Story 12.1 ships
**Then** the authoring guide documents Place-ID-only storage, eligible provider-neutral provenance, unknown-vs-closed semantics, unsupported schedule handling, reviewed updates, and how to inspect/run the weekly audit; scheduled-job docs describe the direct script, protected secrets/environment, manual dispatch, emergency disable, outcomes, retention, and troubleshooting; the obsolete scheduled OSM-ingestion trigger is removed; no Google API key is added; and every example contains safe placeholders rather than real credentials or restricted source data

### AC8 — Deterministic evidence proves policy, integrity, security, and no visual regression

**Given** automated tests must not depend on live Google, Met.no, OSM, Supabase production, or any other provider
**When** the story gate runs
**Then** deterministic unit/contract/SQL/static tests cover adapter outcomes; closed-day, past-midnight, whole-field unknown, split, unsupported 24/7, seasonal/holiday, conflict, malformed, and failure cases; no partial/failed overwrite; provenance atomicity and idempotency; per-venue batch isolation; non-overlap; checked outcome counters; 180-day retention; role denial; old-row migration replay; no live-provider calls; no Google-hours/content path; and a real hours-less detail-route fixture/assertion replaces the prior vacuous absent-hours guard; typecheck, lint, the full Vitest suite, the story-specific migration/job tests, and the no-change visual comparisons pass, with any live/preview schema and one-time remediation evidence recorded in the Dev Agent Record rather than simulated in ordinary CI

## Tasks / Subtasks

- [ ] **Task 0 — Lock the provider pivot with red-first contracts** (AC: 1, 6, 8)
  - [ ] Add a story-specific static/contract test that fails on a production or scheduled Google `regularOpeningHours` path, Google/provider URL persistence, Google hours fixtures/log fields, or a provider credential crossing into client/public code; explicitly allow server-side `place_id` metadata and official-policy citations.
  - [ ] Extend the shared no-live-provider test guard so any unexpected `places.googleapis.com` (and any provider host introduced by this story) request hard-fails with a fix hint, mirroring the existing Met.no guard.
  - [ ] Add a story-file supersession assertion that requires this story's `Superseded Epic Text` section and controlling proposal/research/`E12-AD-01`/`E12-AD-13` references.

- [ ] **Task 1 — Establish the canonical migration chain and service-only schema** (AC: 2, 8)
  - [ ] Add the repository-root `supabase/migrations/` authority if absent and commit an idempotent reconciliation migration for the live `place_id` / `places_api_url` drift before the forward migration.
  - [ ] Add the forward Place-ID-only/provenance migration: preserve nullable non-unique indexed `place_id`; drop `places_api_url`; add checked provenance/review fields; ensure `opening_hours` remains nullable jsonb and the existing single-interval shape is not expanded.
  - [ ] Create `hours_review_runs` and `hours_review_outcomes` with FK/index/read-path constraints, checked run/outcome/reason/error values, bounded report fields, RLS, explicit revokes, service-role-only operations, deterministic cleanup of rows older than 180 days, and an atomic non-overlap claim/finish seam.
  - [ ] Regenerate `nextjs-app/lib/supabase/types.ts`; add migration replay and `SET ROLE anon|authenticated` denial tests using the project-local disposable Compose database; record the separately owned preview REST-denial smoke requirement.
  - [ ] Verify additive deploy order and old-row compatibility before dropping `places_api_url`; record preview schema diff before any production apply.

- [ ] **Task 2 — Implement one provider-neutral hours contract** (AC: 3, 4, 8)
  - [ ] Add a server-only Zod contract for provenance, review states, audit reasons/errors, and the provider-neutral adapter result union. Keep these types out of `lib/types/api.ts` and all public DTOs.
  - [ ] Reuse the canonical `WeeklyOpeningHours` / `coerceOpeningHours` semantics; add stricter write-side validation that rejects partial/malformed data and distinguishes whole-field unknown from explicitly closed weekdays.
  - [ ] Implement lossless classification for accepted single intervals, closed days, past-midnight intervals, and whole-field unknown; route split, 24/7, seasonal, and holiday-specific evidence wholesale to `manual_review`; ensure `failed` never mutates canonical hours.
  - [ ] Model duplicate `place_id` rows as distinct SunnySeat seating-area venues: dedupe an optional future IDs-only validity operation only, never merge venue records or provenance/audit outcomes.

- [ ] **Task 3 — Build and execute the one-time live provenance remediation** (AC: 2, 3, 4, 8)
  - [ ] Provide a reviewed, deterministic remediation input/report format that records venue id/slug, eligible source type/reference, review status/timestamps/next review, and outcome without copying restricted provider payloads into the repository or logs.
  - [ ] Audit all 42 live rows. Retain an existing schedule only with approved independent evidence; replace or set `opening_hours = null` when evidence is Google-derived or unprovable; never relabel restricted data as `manual` and never convert unknown to seven closed weekdays.
  - [ ] Apply schedule + provenance atomically per accepted venue, isolate failures, preserve the prior verified schedule on evidence failure, and persist an auditable run/outcome record.
  - [ ] Record live before/after counts showing every row classified and zero Google-derived/unprovenanced public schedules. If the required per-venue independent evidence is unavailable, stop as `needs-human`; do not invent provenance or enable the recurring workflow.

- [ ] **Task 4 — Implement the weekly direct hours-review job** (AC: 1, 5, 8)
  - [ ] Add a repository runner that reads current venue hours/provenance, claims a non-overlapping run, classifies every venue, writes only service-only run/outcome tables, prunes outcomes older than 180 days, and exits non-zero on run-level failure while retaining per-venue isolation.
  - [ ] Add a dedicated weekly GitHub workflow plus `workflow_dispatch`, protected production environment/main-branch restriction, dependency install/cache, concurrency group, bounded timeout, emergency-disable handling, and a GitHub summary with counts + run identifier only.
  - [ ] Do not add an HTTP route, `CRON_SECRET`, Google key, Google/OSM fetch, or request-path integration. Remove the obsolete scheduled OSM-ingestion trigger from the current documentary workflow; leave Story 12.3-owned geometry/weather replacement work scoped to Story 12.3.
  - [ ] Test due/unknown/conflict/split/failed/stale classification, one-record failure isolation, non-overlap, idempotent reruns, disabled-job behavior, retention, log redaction, and no canonical-hours writes from the weekly job.

- [ ] **Task 5 — Make whole-field unknown honest end to end without changing pixels** (AC: 6, 8)
  - [ ] Keep provenance, Place ID, notes, and service outcomes server-only and out of `VENUE_SELECT_COLUMNS`, route responses, public Zod contracts, client hooks, fixtures, and components.
  - [ ] Make `VenueDetailDto.openingHours` optional like the list DTO and change the detail builder to omit the field for `opening_hours = null` instead of serializing `{}`; preserve fixture venues that intentionally carry deterministic hours.
  - [ ] Add a real hours-less detail fixture/route case and assert field omission + no fabricated copy. This intentionally closes the relevant deferred 11.9 vacuous absent-hours route guard.
  - [ ] Preserve `formatOpeningHours`, quick-info/detail treatment, current-weekday behavior, Story 11 request-count keys, and all frontend component files unless a test proves an unavoidable compatibility edit.

- [ ] **Task 6 — Rewrite authoring, scheduled-job, and environment documentation** (AC: 1, 7)
  - [ ] Update `nextjs-app/docs/venue-data-load.md`: remove Google-sync and `places_api_url` authoring claims/example; document Place-ID-only metadata, source/review fields, eligible evidence, single-interval rules, unknown handling, review workflow, and no-id insert convention.
  - [ ] Rewrite `nextjs-app/docs/github-actions-scheduled-jobs.md` around the direct hours audit and clearly label the other historical `/api/cron/*` entries until their Story 12.3 replacement; document manual dispatch, run inspection, disable/rotation, failure handling, and no restricted payloads in summaries.
  - [ ] Update `nextjs-app/.env.example`, environment-variable/deployment docs, and workflow comments with `SUN_HOURS_AUDIT_ENABLED`; do not introduce a Google API key or require `CRON_SECRET` for this direct-script job.
  - [ ] Record the official-policy verification date and links, plus the rule that a future terms change requires a new dated architecture/product decision—not an opportunistic Google path inside this story.

- [ ] **Task 7 — Validate locally, in preview, visually, and against the live remediation gate** (AC: 1–8)
  - [ ] Run focused unit/contract/static tests while implementing, then `npx tsc --noEmit`, `npx eslint . --quiet`, and `npx vitest run` from `nextjs-app/`.
  - [ ] Run the disposable Compose migration/security suite; verify committed migration order, generated types, role denial, old-row replay, and an empty preview schema diff. Do not mutate production from an ordinary automated test.
  - [ ] Run the relevant detail/API/browser regression tests because detail `openingHours` becomes optional. Preserve the Epic 11 scrub=0/date-change=1 invariant; this story must add no public request.
  - [ ] Compare `venue-detail` and `map-with-selected-venue`/quick-info at mobile and desktop against current references. Do not edit reference PNGs or `REBASELINE-LOG.md`; a data-only story must remain pixel-stable.
  - [ ] Apply the canonical migration through the approved protected path, run the one-time provenance remediation, and attach schema/RLS/remediation evidence. Enable the weekly workflow only after the zero-unprovenanced-hours gate passes.
  - [ ] Run `.\scripts\run-sh.ps1 scripts/story-review.sh 12-1` from the repository root only after every deterministic and live/manual acceptance lane is recorded.

## Dev Notes

### ATDD Artifacts

- Checklist: `_bmad-output/test-artifacts/atdd-checklist-12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours.md`
- Red-phase Vitest scaffolds: `nextjs-app/test/unit/story-12-1-hours-policy-and-operations.atdd.test.ts`, `nextjs-app/test/unit/story-12-1-hours-governance-migrations.atdd.test.ts`, `nextjs-app/test/unit/services/opening-hours-governance.atdd.test.ts`, `nextjs-app/test/unit/services/opening-hours-audit.atdd.test.ts`, and `nextjs-app/test/unit/api/venue-detail-hours-unknown.atdd.test.ts`
- E2E scaffold: none; this story adds no UI flow, and existing visual comparisons remain the no-change evidence lane.

### Story Context and Non-Negotiable Constraints

- **The title is historical.** There is no remaining implementation choice between Google and the pivot. The provider pivot is already adopted; re-opening it requires a new dated decision from Rasmus, not developer discretion.
- **Policy verified 2026-07-13:** current official Google EEA terms still allow Place-ID caching but give no `regularOpeningHours` caching permission and prohibit non-ID Places content “With any Map.” The current EEA Places guide defines “With any Map” broadly enough to include content next to, linked to, or visually associated with MapLibre. Attribution cannot cure the prohibited storage/use path.
- **Canonical public hours:** `WeeklyOpeningHours = Partial<Record<string, OpeningInterval | null>>`, ISO keys `"1"`–`"7"`; one interval/day; missing/null weekday = closed; entire field absent/null = unknown; `close < open` = prior-day past-midnight spillover. Do not add a multi-interval or 24/7 sentinel here.
- **No public provider metadata:** `hours_source_*`, review state/notes, Place IDs, audit runs/outcomes, and source references stay server/maintainer-only. `VenueDataDto` exposes canonical `openingHours` only.
- **No runtime lookup:** neither `/api/venues` nor detail/reviews/feedback/favourites may call an hours provider. Story 12.14 later derives selected-instant availability locally from canonical hours; preserve time-scrub = zero requests and date-change = one request.
- **No production admin resurrection:** reviewed updates remain fail-closed direct/import operations until Story 12.5 provides its localhost/dev-only write seam.
- **Migration authority:** new deployable SQL belongs in root `supabase/migrations/`. `_bmad-output` SQL files are historical evidence, not production migration authority. Reconcile the live-only Google-columns migration before moving to the Place-ID-only forward contract.
- **Live DB:** direct host is IPv6-only. Use the approved Supabase CLI/protected workflow or documented IPv4 session-pooler Docker `psql` fallback; never print `.env.local` values. Local/test SQL work uses the project Compose files and scoped project names.
- **No new package unless necessary:** prefer existing Node/`.mjs`, Supabase JS, Zod, and GitHub Actions capabilities. If `package.json` must change, regenerate the lockfile under Linux/npm 10 because the repository's `@swc/helpers` override + CI lockfile constraint is binding.

### Existing Code Seams to Preserve or Change Deliberately

- `nextjs-app/lib/services/venue-store.ts` currently selects/maps `opening_hours` only and correctly omits malformed/null values. Preserve its public projection and do **not** add provenance columns to `VENUE_SELECT_COLUMNS`.
- `nextjs-app/app/api/venues/[slug]/route.ts#buildDetailDto` currently forces absent hours to `{}`. This story should omit the optional detail field so whole-field unknown survives as unknown; callers already render no hours for absence.
- `nextjs-app/lib/types/api.ts` currently makes list `openingHours` optional but detail `openingHours` required. Align detail with the architecture's honest unknown contract; do not add provenance DTOs.
- `nextjs-app/lib/utils/opening-hours.ts` is pure/client-safe and injected-time deterministic. Do not add provider logic, database access, or wall-clock reads. Minute-precise and prior-day selected-instant availability belong to Story 12.14.
- `nextjs-app/lib/supabase/types.ts` does not contain the live-only Google columns. Regenerate it from the migrated preview/live schema rather than hand-maintaining an invented approximation.
- `.github/workflows/scheduled-cron-jobs.yml` calls nonexistent `/api/cron/*` routes and includes prohibited scheduled OSM ingestion. Story 12.1 owns removal of the OSM trigger and a separate direct hours-audit workflow; Story 12.3 owns geometry/weather scheduled replacements.
- `nextjs-app/docs/github-actions-scheduled-jobs.md` is historical/documentary and contradicts current route reality. Rewrite only the Story 12.1-owned hours lane now; clearly mark remaining Story 12.3 work.
- `nextjs-app/docs/venue-data-load.md` currently claims Place IDs are reserved for Google sync and asks authors to persist `places_api_url`. Replace that guidance completely.

### Relevant Deferred Work Folded Into This Story

- **Address now:** the Story 11.9 absent-hours detail-route assertion is vacuous because no detail fixture genuinely lacks hours. The provenance remediation makes whole-field unknown a real state; add a deterministic hours-less detail route case and assert omission/no fabricated copy.
- **Address in scheduled/contract fixtures:** closed-day and past-midnight shapes have only isolated unit coverage today. Exercise them through the provider-neutral validation and local/test audit pipeline, alongside whole-field unknown and unsupported split/24-7 shapes.
- **Do not reopen:** the current formatter lacks a minute-precise is-open-now guard, and MapView can retain a quick-info weekday across an untouched midnight. Both remain conditional/Story 12.14-adjacent behavior and are outside this data-governance story; changing them would violate the no-visual-change scope.

### Epic 12 Retro Constraint

- The Epic 12 test-design phase recorded that `a11y-mobile` is not CI-wired and its current scenarios are `test.fixme`. This story has no UI change, so do not widen scope to enable unrelated accessibility fixtures and do not cite `a11y-mobile` as a passing CI gate. If the optional-detail DTO change triggers a local browser sweep, report this standing limitation accurately; the regular `a11y` gate and pixel-stability checks remain valid evidence.

### Testing Requirements

- Unit: provider-neutral schedule/provenance schemas and adapter results; audit classifier; date/retention boundaries; duplicate Place ID without venue merge; redaction.
- Contract/static: no `regularOpeningHours` field mask/path; no Google content/URL/secret in schema, fixtures, logs, queues, DTOs, UI, or workflow; story supersession section present; no public trigger.
- Migration/SQL: reconciliation + forward replay; checked values; nullable unknown hours; indexes/FKs; RLS and grants; `SET ROLE anon|authenticated` denial; service-role intended operations; non-overlap claim; 180-day cleanup; old-row compatibility.
- Integration: scheduled job over deterministic 42+ venue-shaped data; all outcome categories; one-record failure isolation; idempotent rerun; no canonical-hours writes; disabled run; bounded GitHub summary.
- API: list/detail omit `openingHours` when the whole field is unknown; known hours remain structurally identical; no provenance/Place ID leakage; no fabricated copy.
- Visual: `venue-detail` and selected-venue quick-info mobile + desktop remain pixel-stable. No animation or reference changes.
- Live/manual evidence: preview schema/REST denial; protected production migration; all-42 provenance remediation; zero unprovenanced/Google-derived retained hours; first scheduled/manual-dispatch audit run. CI must not fake these lanes.

### Project Structure / Expected File Impact

**New (expected):**

- `supabase/migrations/<timestamp>_reconcile_venue_place_identity.sql`
- `supabase/migrations/<timestamp>_provider_neutral_hours_governance.sql`
- `.github/workflows/hours-review-audit.yml`
- `nextjs-app/lib/services/opening-hours-governance.ts` (or equivalently named server-only pure contract)
- `nextjs-app/scripts/audit-opening-hours.mjs` (or an equivalently runnable repository script using existing tooling)
- Focused unit/contract/migration/integration tests under `nextjs-app/test/`

**Update (expected):**

- `nextjs-app/lib/supabase/types.ts`
- `nextjs-app/lib/types/api.ts`
- `nextjs-app/app/api/venues/[slug]/route.ts`
- `nextjs-app/test/setup/setup.ts`
- Existing venue-store/detail-route opening-hours tests and deterministic fixtures
- `.github/workflows/scheduled-cron-jobs.yml` (remove scheduled OSM ingestion only; do not pre-implement Story 12.3)
- `nextjs-app/docs/venue-data-load.md`
- `nextjs-app/docs/github-actions-scheduled-jobs.md`
- `nextjs-app/docs/environment-variables.md`
- `nextjs-app/docs/vercel-deployment.md` only where the scheduled-job reality changes
- `nextjs-app/.env.example`
- `nextjs-app/package.json` only if a runner command is needed without adding a dependency; avoid lockfile churn when possible

**Must remain untouched unless a failing compatibility test proves otherwise:**

- `nextjs-app/lib/utils/opening-hours.ts`
- All visual components and translation files
- TanStack query keys/hooks and planner/time code
- `nextjs-app/lib/solar/**`, `nextjs-app/lib/weather/**`, and sun-engine behavior
- Reference PNGs and `nextjs-app/docs/design/references/REBASELINE-LOG.md`

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` § Epic 12 / Story 12.1 — retained historical ACs and design gate]
- [Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-12.md` §§ 2.2 C-12, 2.3, 4.6, 5 — provider decision and story-owned docs]
- [Source: `_bmad-output/planning-artifacts/research/technical-google-places-api-policy-epic-12-research-2026-07-12.md` §§ Research Synthesis, Recommended Epic 12 Replacement Decision, Production Safeguards — controlling provider pivot]
- [Source: `_bmad-output/planning-artifacts/prd.md` §§ Provider-Neutral Canonical Venue Hours and Source Governance, NFR38 — provenance and weekly audit]
- [Source: `_bmad-output/planning-artifacts/architecture.md` §§ E12-AD-01, E12-AD-12, E12-AD-13, Persisted Data Contracts, Dated Validation and Readiness — schema/job/policy contract]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` § Selected-Instant Availability & Hours — canonical hours remain provider-neutral; no source strings]
- [Source: `_bmad-output/qa/epic-12-test-design-2026-07-12.md` §§ Controlling Decisions, R-012/R-018, P1 Provider-Neutral Hours Audit, Evidence Lanes]
- [Source: `project-context.md` §§ Epic 11 Venue Data Model, Epic 12 Pending Decisions and Invariants — shipped hours shape vs planned pivot]
- [Source: `AGENTS.md` §§ API Boundary, BMAD Story Workflow, Testing Requirements, Secrets — repository rules]
- [Source: `nextjs-app/docs/venue-data-load.md` — current authoring contract that must be corrected]
- [Source: `nextjs-app/docs/github-actions-scheduled-jobs.md` and `.github/workflows/scheduled-cron-jobs.yml` — current documentary/dead scheduled-job seam]
- [Source: `nextjs-app/lib/services/venue-store.ts`, `nextjs-app/lib/types/api.ts`, `nextjs-app/lib/utils/opening-hours.ts`, `nextjs-app/app/api/venues/[slug]/route.ts` — current code state]
- [Official policy verified 2026-07-13: `https://cloud.google.com/terms/maps-platform/eea`, `https://cloud.google.com/terms/maps-platform/eea/maps-service-terms` §15, `https://developers.google.com/maps/comms/eea/places`, `https://developers.google.com/maps/documentation/places/web-service/policies`, `https://developers.google.com/maps/documentation/places/web-service/place-id`]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive provider-pivot, schema, operations, policy, and evidence guide created.

### File List
