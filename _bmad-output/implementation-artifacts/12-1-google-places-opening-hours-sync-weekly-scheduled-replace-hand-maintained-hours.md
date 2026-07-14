---
baseline_commit: 5b1cd0a719fa0ee70b7b25171a61a582740675ec
---

# Story 12.1: Google Places Opening-Hours Sync (Weekly Scheduled — Replace Hand-Maintained Hours)

Status: review

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

- [x] **Task 0 — Lock the provider pivot with red-first contracts** (AC: 1, 6, 8)
  - [x] Add a story-specific static/contract test that fails on a production or scheduled Google `regularOpeningHours` path, Google/provider URL persistence, Google hours fixtures/log fields, or a provider credential crossing into client/public code; explicitly allow server-side `place_id` metadata and official-policy citations.
  - [x] Extend the shared no-live-provider test guard so any unexpected `places.googleapis.com` (and any provider host introduced by this story) request hard-fails with a fix hint, mirroring the existing Met.no guard.
  - [x] Add a story-file supersession assertion that requires this story's `Superseded Epic Text` section and controlling proposal/research/`E12-AD-01`/`E12-AD-13` references.

- [x] **Task 1 — Establish the canonical migration chain and service-only schema** (AC: 2, 8)
  - [x] Add the repository-root `supabase/migrations/` authority if absent and commit an idempotent reconciliation migration for the live `place_id` / `places_api_url` drift before the forward migration.
  - [x] Add the forward Place-ID-only/provenance migration: preserve nullable non-unique indexed `place_id`; drop `places_api_url`; add checked provenance/review fields; ensure `opening_hours` remains nullable jsonb and the existing single-interval shape is not expanded.
  - [x] Create `hours_review_runs` and `hours_review_outcomes` with FK/index/read-path constraints, checked run/outcome/reason/error values, bounded report fields, RLS, explicit revokes, service-role-only operations, deterministic cleanup of rows older than 180 days, and an atomic non-overlap claim/finish seam.
  - [x] Regenerate `nextjs-app/lib/supabase/types.ts`; add migration replay and `SET ROLE anon|authenticated` denial tests using the project-local disposable Compose database; record the separately owned preview REST-denial smoke requirement.
  - [x] Verify additive deploy order and old-row compatibility before dropping `places_api_url`; record preview schema diff before any production apply.

- [x] **Task 2 — Implement one provider-neutral hours contract** (AC: 3, 4, 8)
  - [x] Add a server-only Zod contract for provenance, review states, audit reasons/errors, and the provider-neutral adapter result union. Keep these types out of `lib/types/api.ts` and all public DTOs.
  - [x] Reuse the canonical `WeeklyOpeningHours` / `coerceOpeningHours` semantics; add stricter write-side validation that rejects partial/malformed data and distinguishes whole-field unknown from explicitly closed weekdays.
  - [x] Implement lossless classification for accepted single intervals, closed days, past-midnight intervals, and whole-field unknown; route split, 24/7, seasonal, and holiday-specific evidence wholesale to `manual_review`; ensure `failed` never mutates canonical hours.
  - [x] Model duplicate `place_id` rows as distinct SunnySeat seating-area venues: dedupe an optional future IDs-only validity operation only, never merge venue records or provenance/audit outcomes.

- [x] **Task 3 — Build and execute the one-time live provenance remediation** (AC: 2, 3, 4, 8)
  - [x] Provide a reviewed, deterministic remediation input/report format that records venue id/slug, eligible source type/reference, review status/timestamps/next review, and outcome without copying restricted provider payloads into the repository or logs.
  - [x] Audit all 42 live rows. Retain an existing schedule only with approved independent evidence; replace or set `opening_hours = null` when evidence is Google-derived or unprovable; never relabel restricted data as `manual` and never convert unknown to seven closed weekdays.
  - [x] Apply schedule + provenance atomically per accepted venue, isolate failures, preserve the prior verified schedule on evidence failure, and persist an auditable run/outcome record.
  - [x] Record live before/after counts showing every row classified and zero Google-derived/unprovenanced public schedules. If the required per-venue independent evidence is unavailable, stop as `needs-human`; do not invent provenance or enable the recurring workflow.

- [x] **Task 4 — Implement the weekly direct hours-review job** (AC: 1, 5, 8)
  - [x] Add a repository runner that reads current venue hours/provenance, claims a non-overlapping run, classifies every venue, writes only service-only run/outcome tables, prunes outcomes older than 180 days, and exits non-zero on run-level failure while retaining per-venue isolation.
  - [x] Add a dedicated weekly GitHub workflow plus `workflow_dispatch`, protected production environment/main-branch restriction, dependency install/cache, concurrency group, bounded timeout, emergency-disable handling, and a GitHub summary with counts + run identifier only.
  - [x] Do not add an HTTP route, `CRON_SECRET`, Google key, Google/OSM fetch, or request-path integration. Remove the obsolete scheduled OSM-ingestion trigger from the current documentary workflow; leave Story 12.3-owned geometry/weather replacement work scoped to Story 12.3.
  - [x] Test due/unknown/conflict/split/failed/stale classification, one-record failure isolation, non-overlap, idempotent reruns, disabled-job behavior, retention, log redaction, and no canonical-hours writes from the weekly job.

- [x] **Task 5 — Make whole-field unknown honest end to end without changing pixels** (AC: 6, 8)
  - [x] Keep provenance, Place ID, notes, and service outcomes server-only and out of `VENUE_SELECT_COLUMNS`, route responses, public Zod contracts, client hooks, fixtures, and components.
  - [x] Make `VenueDetailDto.openingHours` optional like the list DTO and change the detail builder to omit the field for `opening_hours = null` instead of serializing `{}`; preserve fixture venues that intentionally carry deterministic hours.
  - [x] Add a real hours-less detail fixture/route case and assert field omission + no fabricated copy. This intentionally closes the relevant deferred 11.9 vacuous absent-hours route guard.
  - [x] Preserve `formatOpeningHours`, quick-info/detail treatment, current-weekday behavior, Story 11 request-count keys, and all frontend component files unless a test proves an unavoidable compatibility edit.

- [x] **Task 6 — Rewrite authoring, scheduled-job, and environment documentation** (AC: 1, 7)
  - [x] Update `nextjs-app/docs/venue-data-load.md`: remove Google-sync and `places_api_url` authoring claims/example; document Place-ID-only metadata, source/review fields, eligible evidence, single-interval rules, unknown handling, review workflow, and no-id insert convention.
  - [x] Rewrite `nextjs-app/docs/github-actions-scheduled-jobs.md` around the direct hours audit and clearly label the other historical `/api/cron/*` entries until their Story 12.3 replacement; document manual dispatch, run inspection, disable/rotation, failure handling, and no restricted payloads in summaries.
  - [x] Update `nextjs-app/.env.example`, environment-variable/deployment docs, and workflow comments with `SUN_HOURS_AUDIT_ENABLED`; do not introduce a Google API key or require `CRON_SECRET` for this direct-script job.
  - [x] Record the official-policy verification date and links, plus the rule that a future terms change requires a new dated architecture/product decision—not an opportunistic Google path inside this story.

- [x] **Task 7 — Validate locally, in preview, visually, and against the live remediation gate** (AC: 1–8)
  - [x] Run focused unit/contract/static tests while implementing, then `npx tsc --noEmit`, `npx eslint . --quiet`, and `npx vitest run` from `nextjs-app/`.
  - [x] Run the disposable Compose migration/security suite; verify committed migration order, generated types, role denial, old-row replay, and an empty preview schema diff. Do not mutate production from an ordinary automated test.
  - [x] Run the relevant detail/API/browser regression tests because detail `openingHours` becomes optional. Preserve the Epic 11 scrub=0/date-change=1 invariant; this story must add no public request.
  - [x] Compare `venue-detail` and `map-with-selected-venue`/quick-info at mobile and desktop against current references. Do not edit reference PNGs or `REBASELINE-LOG.md`; a data-only story must remain pixel-stable.
  - [x] Apply the canonical migration through the approved protected path, run the one-time provenance remediation, and attach schema/RLS/remediation evidence. Enable the weekly workflow only after the zero-unprovenanced-hours gate passes.
  - [x] Run `.\scripts\run-sh.ps1 scripts/story-review.sh 12-1` from the repository root only after every deterministic and live/manual acceptance lane is recorded.

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

GPT-5 Codex

### Debug Log References

- 2026-07-13: RED — Story 12.1 policy/operations contract failed because the shared setup did not guard `places.googleapis.com`; a direct test request reached the live host and returned HTTP 403.
- 2026-07-13: GREEN — focused policy plus existing Met.no guard suites passed (17 passed, 5 later-task scaffolds skipped).
- 2026-07-13: RED — all six migration source contracts failed while `supabase/migrations/` was absent.
- 2026-07-13: GREEN — migration source contracts passed (6/6); disposable Compose replay also passed twice with old-row compatibility, real `SET ROLE anon|authenticated` denials, service-only non-overlap/finish operations, and 180-day pruning.
- 2026-07-13: HALT — no preview database/config is available for the required preview schema diff/type regeneration lane, and no independently verified 42-venue provenance evidence is available for the mandatory live remediation. Production credentials were not used and recurring automation was not enabled.
- 2026-07-14: RESUME — Rasmus authorized the unlaunched live project `hhnbxrhfhlzxgllxukzj` as the protected Epic 12 database lane and attested that every existing schedule was manually collected from its venue's official website. No source URL was invented or inferred.
- 2026-07-14: LIVE SCHEMA — applied `20260714073820_reconcile_venue_place_identity`, `20260714073831_provider_neutral_hours_governance`, and `20260714075456_tighten_hours_review_service_grants`; generated `lib/supabase/types.ts` from the migrated live schema. The authenticated pooler migration list aligns for all three Story 12.1 migrations and direct catalog checks found the expected columns, checks, functions, RLS, force-RLS, and grants.
- 2026-07-14: LIVE SECURITY — `anon` and `authenticated` have no table DML or execute privileges and real `SET ROLE` probes fail with `42501`; `service_role` has only the required table/function operations. `public.spatial_ref_sys` and its accepted PostGIS advisory were deliberately left unchanged.
- 2026-07-14: LIVE REMEDIATION — before: 42/42 venues had schedules, Place IDs, and provider URLs. Run `remediation-owner-attestation-2026-07-14` retained 42/42 as `venue_website`, with per-venue owner-attestation references and 90-day reviews; 42 current outcomes persisted, with zero failed, unknown, Google-derived, or unprovenanced public schedules. `places_api_url` is absent after migration.
- 2026-07-14: LIVE AUDIT — direct runner completed `hours-review-live-manual-20260714-1`: 42 current, all other classifications zero, 42 bounded outcomes persisted, no canonical-hours writes.
- 2026-07-14: RED/GREEN — governance began 12/12 RED then 12/12 GREEN; audit began 11/11 RED then 11/11 GREEN; the real hours-less detail assertion began 1/3 RED then the focused API/store lane passed 52/52. Policy/operations and migration contracts pass 17/17 after the runner allow-list audit.
- 2026-07-14: ENVIRONMENT DEVIATION — the separately authorized pre-launch live lane replaced a separate preview project. Supabase linked-history OAuth returned 403, so the protected pooler and direct catalog/RLS probes supplied the post-apply contract evidence. Docker Desktop was unavailable for a fresh replay, while the earlier disposable Compose replay had passed twice; no Docker Desktop, WSL, or global infrastructure setting was changed.
- 2026-07-14: VISUAL/BROWSER — local comparison against mobile `map-with-selected-venue`, mobile `venue-detail`, and desktop `venue-detail` references found no app-chrome/layout regression; references and `REBASELINE-LOG.md` were untouched. Playwright passed 12/12 detail/navigation plus scrub=0/date-change=1 tests and 5/5 targeted quick-info/detail layout tests (5 correct viewport skips).
- 2026-07-14: FINAL LOCAL GATES — `npx tsc --noEmit`, `npx eslint . --quiet`, and the full Vitest suite pass (158 files, 1487 tests). `git diff --check` passes after removing trailing blank lines.
- 2026-07-14: REVIEW GATE — the abbreviated `12-1` invocation stopped before checks because the script's sprint lookup requires the full key; rerunning the canonical wrapper with `12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours` passed lint, typecheck, and 158-file/1487-test Vitest, then transitioned sprint status to `review`. Validation artifact: `_bmad-output/implementation-artifacts/validation/12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours-review-20260714-101706.log`.
- 2026-07-14: REVIEW-FIX RED/GREEN — the new adversarial regression lane began 30/31 RED and finished with 8 focused files / 103 tests GREEN. It covers schedule/provenance coherence, structured review state, run failure/lease recovery, counter/outcome coherence, column grants, pagination, workflow pinning, and destructive-fixture protection.
- 2026-07-14: REVIEW-FIX DATABASE — applied live migrations `20260714121332_harden_hours_governance_review_fixes` and `20260714122048_enforce_verified_public_hours_state`; verified explicit safe-column reads, protected-column `42501` denial, stale-lease recovery, atomic remediation, and 42/42 coherent verified public schedules with zero non-verified schedules. A fresh disposable Compose/PostGIS replay of the fixture, five-migration chain, and executable SQL assertions passed and was torn down with volumes.
- 2026-07-14: REVIEW-FIX ADVISORS — no new Story 12.1 security error was introduced. Intentional service-only RLS/no-policy INFO and pre-launch unused-index INFO remain; PostGIS extension functions and the accepted `public.spatial_ref_sys` advisory were left untouched.
- 2026-07-14: REVIEW-FIX FINAL GATES — typecheck, quiet lint, `git diff --check`, and full Vitest pass (161 files, 1547 tests). The full 152-case Playwright run had one unrelated mobile clearance flake; its immediate isolated rerun passed. Existing onboarding hydration warnings were observed but are outside this database/audit review patch.
- 2026-07-14: REVIEW-FIX CANONICAL GATE — regenerated the ignored Next route-type artifact after the Playwright dev server left a truncated `.next/dev/types/routes.d.ts`, then the canonical story-review wrapper passed lint, typecheck, and 161-file/1547-test Vitest, skipped visual validation because no screen ID is mapped, and transitioned sprint status to `review`. Validation artifact: `_bmad-output/implementation-artifacts/validation/12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours-review-20260714-143430.log`.
- 2026-07-14: REVIEW-FIX ITERATION 2 RED/GREEN — the new adversarial lane began with 24 failures and finished with 7 focused files / 115 tests GREEN. It covers null-safe coherence, validated constraints, child-derived summaries, strict remediation input, per-venue isolation, prior-schedule preservation, terminal fallback failure handling, notes/source policy, lease enforcement and renewal, retry before-state, provenance-state agreement, future evidence rejection, explicit unsupported causes, prune ordering, keyset pagination, all-closed schedules, normalized provider guards, inspectable run links, report-before-finalize, and partial-table/identity convergence.
- 2026-07-14: REVIEW-FIX ITERATION 2 DATABASE — a fresh six-migration disposable PostGIS replay, a second idempotent replay, and a deliberately partial-table/non-identity replay all passed the executable SQL assertions; the scoped Compose project was torn down with volumes after verification. Applied live migration `20260714131540_complete_hours_governance_review_hardening` through the protected pooler in one transaction after local Supabase CLI profile validation blocked `db push`; linked migration history now aligns, regenerated live types exactly match `lib/supabase/types.ts`, and live checks prove 42/42 coherent verified schedules, seven validated governance constraints, retained `ON DELETE CASCADE`, safe public column grants, protected metadata denial, and service-role-only remediation RPC behavior.
- 2026-07-14: REVIEW-FIX ITERATION 2 ADVISORS — no new Story 12.1 security error was introduced. Intentional service-only RLS/no-policy INFO remains; the accepted `public.spatial_ref_sys` and other PostGIS extension advisories were deliberately left unchanged, and unused-index INFO is expected before launch.
- 2026-07-14: REVIEW-FIX ITERATION 2 FINAL GATES — `npx tsc --noEmit`, `npx eslint . --quiet`, `git diff --check`, and the full Vitest suite pass (162 files, 1571 tests). This data-only review patch has no screen mapping or frontend behavior change, so no Playwright or visual-validation rerun was required.
- 2026-07-14: REVIEW-FIX ITERATION 3 RED/GREEN — focused application, policy, API/store, and migration lanes pass (11 files / 174 tests; focused migration subset 47/47). Fixes cover serialized outcome/finalization writes, database-owned clocks, exact venue populations and optimistic snapshots, clean-checkout policy evidence, all-closed vs unknown DTOs, bounded terminal reporting, redirect-safe provider blocking, and restoration of the unrelated legacy OSM schedule.
- 2026-07-14: REVIEW-FIX ITERATION 3 DATABASE — disposable PostGIS verification passed a fresh seven-migration replay, executable SQL assertions, idempotent replay, and a deliberate malformed-hours drift replay with precise convergence inventory. Applied live migration `20260714184212_serialize_hours_review_persistence`; regenerated live Supabase types; verified 42 venues/zero invalid schedules, all target constraints validated, service-only RPC/grants, explicit safe-column reads, protected-column denial, retained `ON DELETE CASCADE`, and transactional claim → outcome → finish → late-write rejection. Security advisors report only intentional service-only RLS/no-policy INFO plus the accepted unchanged PostGIS/`spatial_ref_sys` advisories; performance advisories are expected pre-launch unused-index INFO.
- 2026-07-14: REVIEW-FIX ITERATION 3 OPERATIONS — configured the GitHub `Production` environment with a main-only deployment branch policy, protected `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` secrets, and `SUN_HOURS_AUDIT_ENABLED=true`. The new workflow cannot be dispatched until it exists on the default branch; its missing-variable fallback remains fail-closed, and the first scheduled/manual Action execution is a post-merge operational observation rather than an open code patch.
- 2026-07-14: REVIEW-FIX ITERATION 3 FINAL GATES — typecheck, quiet lint, `git diff --check`, and full Vitest pass (163 files, 1586 tests). Focused Playwright detail/navigation and scrub invariants passed 11/12 initially; the single mobile marker-startup timeout passed immediately in isolated rerun, with the already-known onboarding hydration warning still outside this database/audit patch.
- 2026-07-14: REVIEW-FIX ITERATION 3 CANONICAL GATE — the canonical story-review wrapper passed lint, typecheck, and 163-file/1586-test Vitest, skipped visual validation because no screen ID is mapped, and confirmed the story remains `review`. Validation artifact: `_bmad-output/implementation-artifacts/validation/12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours-review-20260714-210343.log`.

### Implementation Plan

- Activate each ATDD scaffold in task order, prove RED, implement the minimum provider-neutral contract, and keep protected live/preview evidence separate from deterministic CI evidence.
- Establish the migration/schema and pure governance seams before the direct audit runner; preserve public DTO and UI behavior except honest omission of whole-field unknown hours.
- Stop at the explicit live-provenance gate if independently verified evidence for all 42 venues is unavailable.

### Completion Notes List

- Implemented and regression-guarded the provider-neutral pivot: no Google opening-hours, provider URL/content, provider credential, public trigger, or request-path provider call was added; server-side Place IDs remain identity metadata only.
- Established the canonical migration chain, least-privilege service-only review schema, checked audit contracts, non-overlap/retention functions, and live-generated Supabase types. The breaking database change removes `public.venues.places_api_url` and adds provenance/review columns plus `hours_review_runs` and `hours_review_outcomes`.
- Converted Rasmus's official-venue-website evidence into auditable per-venue provenance without fabricating URLs, remediated all 42 live schedules, and proved zero Google-derived or unprovenanced public schedules before exercising the recurring audit.
- Added the weekly fail-closed direct GitHub audit, provider-neutral schedule/governance logic, bounded run/outcome reporting, and operations/authoring/environment documentation. The emergency-stop variable remains independently configurable; the runner never changes canonical hours.
- Made whole-field unknown hours honest by omitting `openingHours` from list/detail DTOs when absent, backed by a real hours-less fixture, with no formatter/component/reference changes.
- Completed deterministic, browser, visual, and protected live evidence. No unresolved acceptance-criteria blocker remains; the accepted PostGIS `spatial_ref_sys` advisory is outside this story and unchanged.
- Resolved all 56 patch findings plus both maintainer decisions: explicit venue column grants protect service metadata; `hours_review_outcomes.venue_id` retains `ON DELETE CASCADE`; schedules and provenance are coherent in Zod/PostgreSQL; remediation is executable, lease-bound, and per-venue isolated; audit runs recover from crashes and paginate by stable keyset; persisted summaries derive from validated child evidence; migrations converge partial tables and live drift; and the production workflow uses pinned actions and local-only bundling.
- Resolved all 18 iteration-3 patches: outcome writes and terminal transitions now serialize on the parent run; database time owns leases, terminal timestamps, and retention; remediation proves the exact live population and rejects stale/off-contract writes; PostgreSQL enforces the canonical schedule shape; public DTOs distinguish `{}` all-closed from SQL-null unknown; failure/reporting paths stay bounded and inspectable; policy tests are clean-checkout-safe and redirect-safe; and protected production configuration is enabled for main while preserving the unrelated legacy OSM schedule.

### File List

- `.github/workflows/hours-review-audit.yml`
- `.github/workflows/scheduled-cron-jobs.yml`
- `.gitignore`
- `_bmad-output/implementation-artifacts/12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/validation/12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours-review-20260714-101706.log`
- `_bmad-output/implementation-artifacts/validation/12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours-review-20260714-143313.log` (failed generated-route-type artifact gate; superseded after `next typegen`)
- `_bmad-output/implementation-artifacts/validation/12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours-review-20260714-143430.log`
- `_bmad-output/implementation-artifacts/validation/12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours-review-20260714-210343.log`
- `nextjs-app/.env.example`
- `nextjs-app/.gitignore`
- `nextjs-app/app/api/venues/[slug]/route.ts`
- `nextjs-app/docs/environment-variables.md`
- `nextjs-app/docs/github-actions-scheduled-jobs.md`
- `nextjs-app/docs/venue-data-load.md`
- `nextjs-app/docs/vercel-deployment.md`
- `nextjs-app/lib/services/opening-hours-audit.ts`
- `nextjs-app/lib/services/opening-hours-governance.ts`
- `nextjs-app/lib/services/venue-store.ts`
- `nextjs-app/lib/supabase/types.ts`
- `nextjs-app/lib/types/api.ts`
- `nextjs-app/scripts/audit-opening-hours.ts`
- `nextjs-app/scripts/remediate-opening-hours.ts`
- `nextjs-app/test/setup/setup.ts`
- `nextjs-app/test/sql/story-12-1-hours-governance.assertions.sql`
- `nextjs-app/test/sql/story-12-1-hours-governance-fixture.sql`
- `nextjs-app/test/unit/api/venue-detail-hours-unknown.atdd.test.ts`
- `nextjs-app/test/unit/api/venue-detail-route.test.ts`
- `nextjs-app/test/unit/services/opening-hours-audit.atdd.test.ts`
- `nextjs-app/test/unit/services/opening-hours-audit.coverage.test.ts`
- `nextjs-app/test/unit/services/opening-hours-governance.atdd.test.ts`
- `nextjs-app/test/unit/services/opening-hours-governance.coverage.test.ts`
- `nextjs-app/test/unit/story-12-1-hours-policy-and-operations.atdd.test.ts`
- `nextjs-app/test/unit/story-12-1-hours-governance-migrations.atdd.test.ts`
- `nextjs-app/test/unit/story-12-1-review-fixes.test.ts`
- `nextjs-app/test/unit/story-12-1-review-fixes-iteration-2.test.ts`
- `nextjs-app/test/unit/story-12-1-review-fixes-iteration-3.test.ts`
- `supabase/migrations/20260714073820_reconcile_venue_place_identity.sql`
- `supabase/migrations/20260714073831_provider_neutral_hours_governance.sql`
- `supabase/migrations/20260714075456_tighten_hours_review_service_grants.sql`
- `supabase/migrations/20260714121332_harden_hours_governance_review_fixes.sql`
- `supabase/migrations/20260714122048_enforce_verified_public_hours_state.sql`
- `supabase/migrations/20260714131540_complete_hours_governance_review_hardening.sql`
- `supabase/migrations/20260714184212_serialize_hours_review_persistence.sql`

### Change Log

- 2026-07-14 — Implemented provider-neutral hours governance, live provenance remediation, weekly direct audit, honest unknown-hours DTO behavior, full evidence, and operational documentation for Story 12.1.
- 2026-07-14 — Resolved adversarial review findings across privilege boundaries, schedule/provenance coherence, crash recovery, audit integrity, remediation execution, migration replay, and supply-chain hardening; retained `ON DELETE CASCADE` per maintainer decision.
- 2026-07-14 — Resolved all iteration-2 review findings across validated database coherence, derived audit summaries, strict remediation parsing, lease-bound and isolated writes, stable pagination, bounded reporting, provider-policy normalization, and fresh/partial/live migration convergence; retained explicit safe-column grants and `ON DELETE CASCADE` per maintainer decisions.
- 2026-07-14 — Resolved all 18 iteration-3 review findings across serialized audit persistence, database-time ownership, population/concurrency guarantees, canonical SQL hours validation, clean-checkout/provider-redirect guards, terminal reporting, public unknown-hours semantics, protected production configuration, and legacy-schedule preservation.

### Review Findings

- [x] [Review][Decision][High] Service-only Place ID and provenance/review fields were added to `public.venues` without an explicit privilege boundary for those columns, so an existing broad table `SELECT` grant could bypass the DTO redaction. Sources: Blind Hunter/primary and Blind Hunter/secondary. Recommended: fix: revoke broad table reads and expose only the existing public venue projection through a safe view or move service-only metadata to a restricted table. [`supabase/migrations/20260714073831_provider_neutral_hours_governance.sql:5`] — accepted by maintainer: public venue reads now use explicit safe-column grants for `anon`/`authenticated`, while Place ID and provenance/review metadata remain service-only.
- [x] [Review][Decision][Med] `hours_review_outcomes.venue_id ON DELETE CASCADE` can erase audit evidence before the required 180-day retention period when a venue is deleted. Source: Blind Hunter/secondary. Recommended: fix: change the FK to `ON DELETE RESTRICT` so venue deletion waits until retained outcomes are pruned. [`supabase/migrations/20260714073831_provider_neutral_hours_governance.sql:100`] — dismissed by maintainer: this is rolling operational history, not compliance evidence; deleting a venue should delete its dependent outcomes rather than block deletion.

- [x] [Review][Patch][Critical] A crash or run-level exception after `claimRun` leaves a permanent `running` row, and the one-active-run index then blocks every later audit; there is no failure finalizer, lease expiry, or stale-claim recovery, and the regex-only lease test does not exercise recovery. Sources: Blind Hunter/primary, Edge Case Hunter/primary, Acceptance Auditor/primary, Blind Hunter/secondary, Edge Case Hunter/secondary, and Acceptance Auditor/secondary. [`nextjs-app/lib/services/opening-hours-audit.ts:151`]
- [x] [Review][Patch][High] `listVenues`, `recordOutcome`, `finishRun`, and `pruneBefore` are optional, allowing a claimed run to report `completed` without auditing venues, recording outcomes, or releasing the database lock. Sources: Blind Hunter/primary and Blind Hunter/secondary. [`nextjs-app/lib/services/opening-hours-audit.ts:113`]
- [x] [Review][Patch][High] When a claim is rejected, failure of the active-run lookup is treated as harmless overlap instead of a database error, producing a false healthy exit. Sources: Edge Case Hunter/primary and Edge Case Hunter/secondary. [`nextjs-app/scripts/audit-opening-hours.ts:46`]
- [x] [Review][Patch][High] If `recordOutcome` fails, only the in-memory failed count changes; no bounded replacement failure outcome identifies the venue, so the parent summary can disagree with the child audit trail. Sources: Blind Hunter/primary and Blind Hunter/secondary. [`nextjs-app/lib/services/opening-hours-audit.ts:170`]
- [x] [Review][Patch][High] The detail route emits `openingHours` only from the optional fixture and does not fall back to the store-backed venue value, so known hours disappear for live venues without a fixture. Source: Blind Hunter/primary. [`nextjs-app/app/api/venues/[slug]/route.ts`]
- [x] [Review][Patch][High] The weekly runner blindly casts database JSON and the classifier never validates the schedule, allowing malformed weekday/time shapes and empty objects to be reported as `current`. Sources: Blind Hunter/primary, Edge Case Hunter/primary, Acceptance Auditor/primary, Blind Hunter/secondary, Edge Case Hunter/secondary, and Acceptance Auditor/secondary. [`nextjs-app/scripts/audit-opening-hours.ts:152`]
- [x] [Review][Patch][High] Explicit `due`, `manual_review`, and `failed` review states fall through to `current` unless exact note sentinels happen to be present. Sources: Blind Hunter/primary, Edge Case Hunter/primary, Acceptance Auditor/primary, Blind Hunter/secondary, Edge Case Hunter/secondary, and Acceptance Auditor/secondary. [`nextjs-app/lib/services/opening-hours-audit.ts:84`]
- [x] [Review][Patch][High] Missing, invalid, or future review timestamps can still classify provenance as `current`, allowing corrupt or fabricated freshness evidence to suppress review. Sources: Blind Hunter/primary, Edge Case Hunter/primary, Blind Hunter/secondary, Edge Case Hunter/secondary, and Acceptance Auditor/primary. [`nextjs-app/lib/services/opening-hours-audit.ts:88`]
- [x] [Review][Patch][High] `hours_notes` is used as both maintainer prose and machine state via exact strings, so ordinary note edits can erase split/conflict/failure classification and the two uses cannot coexist losslessly. Sources: Blind Hunter/primary and Acceptance Auditor/secondary. [`nextjs-app/scripts/audit-opening-hours.ts:156`]
- [x] [Review][Patch][High] A non-null schedule with `unknown`, `due`, `manual_review`, or `failed` provenance is accepted and planned for canonical persistence instead of requiring verified provenance. Sources: Blind Hunter/primary, Acceptance Auditor/primary, Blind Hunter/secondary, Edge Case Hunter/primary, and Edge Case Hunter/secondary. [`nextjs-app/lib/services/opening-hours-governance.ts:159`]
- [x] [Review][Patch][High] A null/unknown schedule can inherit the provenance schema's default `verified` status, producing contradictory persisted state. Source: Blind Hunter/secondary. [`nextjs-app/lib/services/opening-hours-governance.ts:79`]
- [x] [Review][Patch][High] Partially invalid eligible provenance produces no corrective update, so an unverified legacy schedule can remain publicly canonical despite failed evidence validation. Sources: Blind Hunter/primary, Edge Case Hunter/primary, Blind Hunter/secondary, and Acceptance Auditor/primary. [`nextjs-app/lib/services/opening-hours-governance.ts:303`]
- [x] [Review][Patch][High] `manual_review` and `failed` remediation outcomes are not persisted into review state, leaving the weekly audit unable to observe the discovered problem and potentially reporting the old schedule as current. Sources: Blind Hunter/primary, Acceptance Auditor/primary, and Blind Hunter/secondary. [`nextjs-app/lib/services/opening-hours-governance.ts:320`]
- [x] [Review][Patch][High] An omitted whole schedule (`undefined`) is classified as `malformed_schedule` instead of whole-field unknown, contrary to the canonical absence contract. Source: Acceptance Auditor/primary. [`nextjs-app/lib/services/opening-hours-governance.ts:159`]
- [x] [Review][Patch][High] `sourceReference` accepts any non-empty string, including prohibited provider URLs, copied provider content, and API-key-bearing URLs, and the database adds no equivalent source-policy constraint. Sources: Acceptance Auditor/primary, Blind Hunter/secondary, and Edge Case Hunter/secondary. [`nextjs-app/lib/services/opening-hours-governance.ts:79`]
- [x] [Review][Patch][High] The one-time remediation is only an in-memory planner: there is no checked-in executable input/report path or atomic database operation that applies accepted schedule plus provenance and persists every outcome reproducibly. Sources: Blind Hunter/primary, Acceptance Auditor/primary, Blind Hunter/secondary, and Acceptance Auditor/secondary. [`nextjs-app/lib/services/opening-hours-governance.ts:273`]
- [x] [Review][Patch][High] The deterministic policy guard excludes migrations, SQL fixtures, and the test tree, so persisted provider URLs/content or Google-hours fixtures can be introduced while the guard stays green. Sources: Acceptance Auditor/primary and Acceptance Auditor/secondary. [`nextjs-app/test/unit/story-12-1-hours-policy-and-operations.atdd.test.ts:33`]
- [x] [Review][Patch][High] PostgreSQL does not enforce coherence among `opening_hours`, provenance, and review status, permitting verified rows without evidence and unknown/unprovenanced rows with public schedules. Sources: Blind Hunter/primary and Blind Hunter/secondary. [`supabase/migrations/20260714073831_provider_neutral_hours_governance.sql:5`]
- [x] [Review][Patch][High] Run counters are only individually nonnegative; neither the table nor finish RPC requires category counts to sum to `total_count`, so contradictory completed summaries are accepted. Sources: Blind Hunter/primary, Acceptance Auditor/primary, Blind Hunter/secondary, and Acceptance Auditor/secondary. [`supabase/migrations/20260714073831_provider_neutral_hours_governance.sql:83`]
- [x] [Review][Patch][High] Outcome, reason, and error-class checks are independent, allowing contradictory rows such as `current` with `classification_failed` or `failed` without an error class. Sources: Blind Hunter/primary and Blind Hunter/secondary. [`supabase/migrations/20260714073831_provider_neutral_hours_governance.sql:100`]
- [x] [Review][Patch][High] Per-venue outcomes omit prior and resulting review status, so the persisted audit trail cannot show the state transition required by the adopted architecture contract. Source: Acceptance Auditor/secondary. [`supabase/migrations/20260714073831_provider_neutral_hours_governance.sql:100`]
- [x] [Review][Patch][High] The checked-in SQL fixture starts by dropping `public.venues ... CASCADE` without first proving it is connected to a disposable test database, making a misconfigured test command destructive. Sources: Blind Hunter/primary and Blind Hunter/secondary. [`nextjs-app/test/sql/story-12-1-hours-governance-fixture.sql:1`]
- [x] [Review][Patch][High] The reconciliation migration does not remove an existing `NOT NULL` attribute or uniqueness constraint/index from drifted `place_id`, so it does not guarantee the required nullable, non-unique converged schema. Source: Acceptance Auditor/secondary. [`supabase/migrations/20260714073820_reconcile_venue_place_identity.sql:14`]
- [x] [Review][Patch][Med] Provenance references and notes are unconstrained `text` in PostgreSQL, allowing direct writes to bypass the Zod 500/1000-character limits and the bounded-report contract. Sources: Blind Hunter/primary, Edge Case Hunter/primary, and Blind Hunter/secondary. [`supabase/migrations/20260714073831_provider_neutral_hours_governance.sql:7`]
- [x] [Review][Patch][Med] The runner reuses the start timestamp as `finished_at` and retention time, making long audits appear instantaneous and shifting pruning to the wrong boundary. Source: Blind Hunter/primary. [`nextjs-app/lib/services/opening-hours-audit.ts:145`]
- [x] [Review][Patch][Med] The workflow invokes `npx esbuild` without an installed pinned dependency or `--no-install`, so a missing local binary can trigger an unreviewed network download during the production job. Sources: Blind Hunter/primary and Blind Hunter/secondary. [`.github/workflows/hours-review-audit.yml:38`]
- [x] [Review][Patch][Med] `CREATE TABLE IF NOT EXISTS` does not repair pre-existing partial tables, yet later indexes, grants, and functions assume the full shape, so replay against drift can fail midway. Source: Blind Hunter/primary. [`supabase/migrations/20260714073831_provider_neutral_hours_governance.sql:73`]
- [x] [Review][Patch][Med] The write-side schedule schema accepts identical opening and closing times, allowing zero-length or ambiguous 24/7 intervals to be persisted as ordinary intervals. Sources: Edge Case Hunter/primary and Edge Case Hunter/secondary. [`nextjs-app/lib/services/opening-hours-governance.ts:11`]
- [x] [Review][Patch][Med] A schedule whose weekday properties are all explicitly `undefined` can pass validation and serialize to an empty object instead of whole-field unknown. Source: Edge Case Hunter/primary. [`nextjs-app/lib/services/opening-hours-governance.ts:19`]
- [x] [Review][Patch][Med] The shared no-live-provider guard still allows legacy `maps.googleapis.com` and trailing-dot Google hosts, so prohibited live provider requests can escape the test boundary. Source: Edge Case Hunter/primary. [`nextjs-app/test/setup/setup.ts:62`]
- [x] [Review][Patch][Med] `place_id` is unconstrained text after reconciliation, so blank and whitespace-only identifiers can be stored and indexed. Source: Blind Hunter/secondary. [`supabase/migrations/20260714073820_reconcile_venue_place_identity.sql:14`]
- [x] [Review][Patch][Med] The policy test rejects every `/api/cron/*` route rather than only an hours-provider trigger, coupling this story to unrelated current or future scheduled routes. Source: Blind Hunter/secondary. [`nextjs-app/test/unit/story-12-1-hours-policy-and-operations.atdd.test.ts:74`]
- [x] [Review][Patch][Med] The venue audit query is unpaginated, so Supabase row limits can silently omit later venues while the run still reports successful authoritative totals. Source: Blind Hunter/secondary. [`nextjs-app/scripts/audit-opening-hours.ts:109`]
- [x] [Review][Patch][Med] The workflow uses mutable `actions/checkout@v4` and `actions/setup-node@v4` tags before the service-role secret step, allowing a compromised or moved tag to tamper with the bundle that later receives the credential. Source: Security review. [`.github/workflows/hours-review-audit.yml:25`]

- [x] [Review][Patch][Critical] The canonical-hours coherence check is bypassable when `hours_review_status` is `NULL`, because PostgreSQL accepts the resulting `NULL` CHECK expression for a non-null schedule with otherwise complete provenance [`supabase/migrations/20260714122048_enforce_verified_public_hours_state.sql:9`]
- [x] [Review][Patch][High] Venue, run-counter, and outcome coherence constraints remain `NOT VALID` without later validation, so contradictory pre-existing rows survive the migration chain [`supabase/migrations/20260714121332_harden_hours_governance_review_fixes.sql:394`]
- [x] [Review][Patch][High] `finish_hours_review_run` trusts caller-supplied totals without deriving or comparing them to persisted `hours_review_outcomes`, allowing completed summaries to disagree with their evidence rows [`supabase/migrations/20260714121332_harden_hours_governance_review_fixes.sql:512`]
- [x] [Review][Patch][High] Remediation input is only cast after JSON parsing and is not schema-validated, required to be non-empty, or checked for duplicate venue IDs, allowing partial mutations and false run totals [`nextjs-app/scripts/remediate-opening-hours.ts:127`]
- [x] [Review][Patch][High] The remediation runner aborts on the first per-venue RPC error after prior venues have committed, leaving every later venue without a persisted outcome and violating per-venue failure isolation [`nextjs-app/scripts/remediate-opening-hours.ts:43`]
- [x] [Review][Patch][High] Manual-review and failed remediation outcomes clear `opening_hours` even when a prior independently verified schedule should be preserved, and the database constraint prevents representing that required preservation state [`nextjs-app/lib/services/opening-hours-governance.ts:362`]
- [x] [Review][Patch][High] A second failure while writing the bounded fallback audit outcome escapes the venue loop and aborts classification of every later venue [`nextjs-app/lib/services/opening-hours-audit.ts:238`]
- [x] [Review][Patch][High] Remediation notes are length-checked only and can persist prohibited provider payloads, URLs, or credentials through the supported write path [`nextjs-app/lib/services/opening-hours-governance.ts:114`]
- [x] [Review][Patch][High] The database permits whitespace-only `hours_source_reference` values, allowing a nominally verified public schedule to carry no inspectable evidence identifier [`supabase/migrations/20260714121332_harden_hours_governance_review_fixes.sql:73`]
- [x] [Review][Patch][High] `apply_hours_remediation_outcome` accepts completed, failed, non-remediation, or lease-expired run IDs while the runner never renews its fixed lease, permitting stale or overlapping canonical writes [`supabase/migrations/20260714121332_harden_hours_governance_review_fixes.sql:611`]
- [x] [Review][Patch][High] Retrying a venue remediation overwrites `prior_review_status` with the already-mutated state, destroying the true before-state of the idempotent audit outcome [`supabase/migrations/20260714121332_harden_hours_governance_review_fixes.sql:682`]
- [x] [Review][Patch][Med] The TypeScript provenance schema accepts `verified` together with a review reason or error class even though PostgreSQL rejects that state, so application-approved writes can deterministically fail [`nextjs-app/lib/services/opening-hours-governance.ts:105`]
- [x] [Review][Patch][Med] Future-dated `reviewedAt` values can be accepted as verified evidence and keep hours canonical until their later review date [`nextjs-app/lib/services/opening-hours-governance.ts:119`]
- [x] [Review][Patch][Med] A null schedule silently rewrites explicit review states to `unknown` while retaining stale reason/error metadata, and remediation then records the accepted unknown schedule as `current` [`nextjs-app/lib/services/opening-hours-governance.ts:191`]
- [x] [Review][Patch][Med] Unsupported 24/7, seasonal, and holiday-specific manual-review causes are collapsed into generic failed/classification-failed outcomes, losing the actionable operator reason [`nextjs-app/scripts/remediate-opening-hours.ts:150`]
- [x] [Review][Patch][Med] The weekly audit finalizes the database run before retention pruning, so a prune failure makes the workflow fail while the database permanently reports the audit completed [`nextjs-app/lib/services/opening-hours-audit.ts:255`]
- [x] [Review][Patch][Med] Offset pagination can skip or duplicate venues when rows are inserted or deleted between page reads, contradicting the every-venue audit contract [`nextjs-app/scripts/audit-opening-hours.ts:86`]
- [x] [Review][Patch][Med] The canonical schedule validator rejects `{}` even though the controlling partial-record contract defines its seven missing weekdays as explicitly closed, not whole-field unknown [`nextjs-app/lib/services/opening-hours-governance.ts:22`]
- [x] [Review][Patch][Med] The static policy guard misses normalized Google-hours field names and provider credentials not prefixed `GOOGLE` or `PLACES`, leaving the stated regression boundary incomplete [`nextjs-app/test/unit/story-12-1-hours-policy-and-operations.atdd.test.ts:81`]
- [x] [Review][Patch][Med] The GitHub step summary emits only a plain run ID and does not provide the required inspectable run link [`nextjs-app/scripts/audit-opening-hours.ts:172`]
- [x] [Review][Patch][Med] Remediation finalizes the database run before writing its required bounded report, so a filesystem failure leaves an unrecoverable completed run without the report while the command exits failed [`nextjs-app/scripts/remediate-opening-hours.ts:79`]
- [x] [Review][Patch][Med] Partial audit tables can make the initial forward migration fail on dependent indexes or functions before the later repair migration runs, and existing non-identity IDs or drifted constraints are not fully converged [`supabase/migrations/20260714073831_provider_neutral_hours_governance.sql:77`]
- [x] [Review][Patch][High] Outcome persistence is not serialized with run finalization: the weekly runner and remediation fallback can write outcomes without locking and rechecking an active parent, while finalization aggregates children before locking the run, so late or ambiguously committed writes can leave terminal counters inconsistent with their evidence. [`supabase/migrations/20260714131540_complete_hours_governance_review_hardening.sql:334`] [`nextjs-app/scripts/audit-opening-hours.ts:118`] [`nextjs-app/scripts/remediate-opening-hours.ts:80`]
- [x] [Review][Patch][High] Failure finalization is not handled reliably: remediation discards both the RPC error and rejected result, while the weekly audit can replace the triggering exception when its failure finalizer also fails, obscuring the root cause and potentially leaving the active-run slot occupied. [`nextjs-app/scripts/remediate-opening-hours.ts:158`] [`nextjs-app/lib/services/opening-hours-audit.ts:289`]
- [x] [Review][Patch][High] Executable policy tests depend on the local, gitignored BMAD story file, so a clean CI checkout receives an empty fixture and fails even when application behavior is correct. [`nextjs-app/test/unit/story-12-1-hours-policy-and-operations.atdd.test.ts:57`]
- [x] [Review][Patch][High] Lease ownership and retention pruning trust worker-supplied timestamps instead of database time, so clock skew can steal a healthy run, create an already-expired claim, or prune history younger than 180 days. [`supabase/migrations/20260714121332_harden_hours_governance_review_fixes.sql:460`] [`nextjs-app/lib/services/opening-hours-audit.ts:276`]
- [x] [Review][Patch][High] Successful completion does not prove the intended venue population was audited: remediation accepts any non-empty subset of live venues, and the weekly runner reports an empty venue table as a healthy zero-count run. [`nextjs-app/scripts/remediate-opening-hours.ts:18`] [`nextjs-app/lib/services/opening-hours-audit.ts:222`]
- [x] [Review][Patch][High] The public detail boundary still collapses known all-closed schedules and whole-field unknown in opposite directions: store coercion turns `{}` into absence, while a database `null` can serialize as `openingHours: null` instead of being omitted. [`nextjs-app/lib/services/venue-store.ts:565`] [`nextjs-app/app/api/venues/[slug]/route.ts:182`]
- [x] [Review][Patch][High] The documented direct `INSERT ... ON CONFLICT` venue workflow bypasses the canonical Zod schedule contract because PostgreSQL validates provenance coherence but not weekday/interval shape; its instruction to omit `opening_hours` for an existing unknown-hours venue can also retain stale hours unless the update explicitly writes SQL `null`. [`nextjs-app/docs/venue-data-load.md:7`] [`supabase/migrations/20260714131540_complete_hours_governance_review_hardening.sql:189`]
- [x] [Review][Patch][High] The required production weekly audit remains disabled by default and the story records only a direct runner execution, not protected-environment configuration plus a successful `workflow_dispatch`/scheduled Action run, so AC3/AC5/Task 7 are not yet evidenced. [`.github/workflows/hours-review-audit.yml:50`]
- [x] [Review][Patch][High] Story 12.1 removes the unrelated weekly OSM-ingestion schedule, dispatch option, and job, silently disabling an existing production maintenance path without a replacement. [`.github/workflows/scheduled-cron-jobs.yml:10`]
- [x] [Review][Patch][High] GitHub summary output is written only after a successful audit, so claim, read, persistence, pruning, or finalization failures produce no bounded failure status or run identifier; an already-running result can also link another run's ID to the current skipped workflow execution. [`nextjs-app/scripts/audit-opening-hours.ts:176`]
- [x] [Review][Patch][High] The real weekly runner nulls the entire provenance object whenever source fields are absent, so canonical `unknown` and `failed` rows are classified as `missing_provenance` before their explicit review states can be reported. [`nextjs-app/scripts/audit-opening-hours.ts:105`] [`nextjs-app/lib/services/opening-hours-audit.ts:72`]
- [x] [Review][Patch][Med] `finish_hours_review_run` accepts either terminal status independently of derived failed outcomes, allowing a run with failures to be finalized as `completed` or a clean run as `completed_with_failures`. [`supabase/migrations/20260714131540_complete_hours_governance_review_hardening.sql:330`]
- [x] [Review][Patch][Med] `apply_hours_remediation_outcome` trusts caller-supplied slug, review/outcome combinations, and stale offline state without comparing them to the locked venue, so a remediation can misattribute evidence, persist cross-field contradictions, or overwrite a newer legitimate edit. [`supabase/migrations/20260714131540_complete_hours_governance_review_hardening.sql:445`]
- [x] [Review][Patch][Med] The terminal migration validates new venue constraints after repairing only incomplete basic provenance and blank references, so other pre-existing invalid states can abort deployment without the promised precise convergence inventory. [`supabase/migrations/20260714131540_complete_hours_governance_review_hardening.sql:69`]
- [x] [Review][Patch][Med] Migration-chain tests omit the terminal hardening migration and continue asserting the superseded verified-only constraint, so they can pass against behavior that is not the deployed final schema. [`nextjs-app/test/unit/story-12-1-hours-governance-migrations.atdd.test.ts:24`]
- [x] [Review][Patch][Med] The remediation report is written before database finalization and contains no provisional or terminal status, so a rejected finalizer leaves a success-shaped report whose totals were never committed. [`nextjs-app/scripts/remediate-opening-hours.ts:113`]
- [x] [Review][Patch][Med] Provenance validation uses ambient `Date.now()` while the surrounding audit path accepts an injected clock, making remediation classification nondeterministic and vulnerable to ordinary cross-host clock skew. [`nextjs-app/lib/services/opening-hours-governance.ts:119`]
- [x] [Review][Patch][Med] The shared no-live-provider test guard checks only the initial request URL; native redirect following can still issue a real request to a blocked Google Places host before the guard sees it. [`nextjs-app/test/setup/setup.ts:67`]
