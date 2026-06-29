---
baseline_commit: b200e1d
drafted_at: 2026-06-21T00:00:00+02:00
drafted_by: Bob/Claude (SM, bmad-create-story)
---

# Story 8.5: Production Config & Security Hardening

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **Sequencing:** Fifth and final implementation story of Epic 8 "Wire Real Data" — the **live cutover** (after 8.1, 8.1.1, 8.2, 8.3, 8.4 — all `done`). Epic 8 stays `in-progress`; this is not the `8-1-*` story so the epic status does not change. Branch: `epic/8-wire-real-data`. Stories 8.2/8.3/8.4 shipped the env-gated real adapters (venue store, sun/shadow/weather engine, feedback/review persistence) and the manual-run SQL contracts but deliberately deferred the production cutover. This story turns the live path on safely: configures per-environment secrets, applies the SQL contracts + RLS policies live, runs and triages the Supabase security advisor, regenerates `lib/supabase/types.ts`, and lands the pre-cutover hardening that 8.2/8.3 carried in.
>
> **Scope boundary — this is CUTOVER CONFIG + SECURITY HARDENING + carried-in pre-cutover hardening, split into a DEV-implementable part and a MAINTAINER-run part.** The dev agent implements the offline-testable hardening + doc/runbook authoring + the live `types.ts` regen; the **maintainer** executes the production-secret config in Vercel, the live SQL apply, and the live round-trips (no production secrets exist in CI/dev). 8.5 **DOES**: (1) configure + document per-environment secrets (`SUPABASE_SERVICE_ROLE_KEY`, Met.no User-Agent, the four `SUNNYSEAT_*` flags) with **no `NEXT_PUBLIC_` secret leakage**; (2) author/apply the RLS policies the live tables still lack (advisor shows 4× `rls_enabled_no_policy`) + run/triage the **Supabase security advisor**, documenting the accepted PostGIS exceptions; (3) **regenerate `lib/supabase/types.ts`** from the live schema (replacing the placeholder); (4) land the carried-in hardening — venue uniqueness-key alignment + query-contract tests (8.2 R2), sun-engine concurrency cap + forecast dedupe + `Promise.allSettled` + weather `validAt` freshness fidelity (8.3 R1), reviews `.or()` filter escaping (8.4 R1); (5) wire the Met.no User-Agent from env (TOS compliance). 8.5 **does NOT**: build a precompute/Cron pipeline (DECISION D ratified compute-on-request for MVP — Cron stays a measured-latency follow-up), add admin/moderation/auth/upload/monetization surfaces, build an anon Supabase client, change DTO shapes or the URL/`_state` contracts, or introduce a new env flag (the four flags already exist; 8.5 flips them on for **production env only**).
>
> **CI must have ZERO live-Supabase / live-Met.no dependency — non-negotiable.** Exactly like 8.2/8.3/8.4, every real path stays opt-in via the env flags, **off by default**, and the default (no-flag) in-memory/seed path stays **byte-identical**. The committed CI/test config must **never** set `SUNNYSEAT_*=supabase`/`=real` or point at a real project. The production flag-flip happens in the Vercel environment only. The offline default-path gates (tsc/eslint/vitest/playwright/visual) satisfy `done`; the live cutover round-trips are maintainer-run and recorded, **not** required for `done`.

## Story

As a **maintainer**,
I want the live data path configured and secured for deployment,
So that SunnySeat can go live safely.

## Acceptance Criteria

> ACs #1–#3 are preserved **verbatim** from `epics.md` (Story 8.5); the bold titles and the `— Verification:` sub-bullets are added implementation detail, not changes to the criteria. ACs #4–#5 are **not invented** — #4 consolidates the two "Carried-in" blocks that `epics.md` attaches to Story 8.5 (8.2 R2 + 8.3 R1, lines 2277/2279) and #5 is the maintainer cutover handoff the 8.4 runbook deferred to this story.

1. **Server-only secrets are set per environment with no client leakage.**
   **Given** the Vercel deployment and Supabase project
   **When** environment is configured
   **Then** server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, Met.no config, persistence flags) are set per environment and never exposed to the client (no `NEXT_PUBLIC_` leakage of secrets)
   — *Verification:* secrets set per environment (Production / Preview / Development); no `NEXT_PUBLIC_` prefix on any secret, confirmed by a build-output/source scan; `.env.local` and secrets stay gitignored (production secrets live only in Vercel env vars).

2. **Application tables have appropriate RLS policies; the advisor is clean except documented PostGIS exceptions.**
   **Given** the Supabase security advisor
   **When** it is run after wiring
   **Then** application tables have appropriate RLS policies and remaining findings are limited to accepted PostGIS platform exceptions (`spatial_ref_sys`, `postgis`-in-public, `st_estimatedextent`), each documented as accepted
   — *Verification:* every application table (`venues`, `reviews`, `feedback`, `shadow_casters`, `shadow_caster_import_batches`) has RLS enabled **and** access-model policies applied so the advisor's four `rls_enabled_no_policy` INFOs clear; the accepted PostGIS exceptions are `spatial_ref_sys` RLS-disabled (`0013`), `postgis`-in-public (`0014`), and `st_estimatedextent` SECURITY DEFINER (`0028`/`0029`), documented in an auditable artifact.

3. **DB types are regenerated from the live schema and the gates pass.**
   **Given** generated DB types
   **When** the schema is stable
   **Then** `lib/supabase/types.ts` is regenerated from the live schema (replacing the placeholder) and the typecheck/lint/test gates pass
   — *Verification:* the regen replaces the `Record<string, never>` placeholder + the stale "Story 6.2" TODO; PostGIS `geometry`/JSONB columns are typed (not left as raw `unknown` at query sites that need them).

4. **(Carried-in from epics.md Story 8.5 — 8.2 R2 + 8.3 R1) The real paths are hardened before the live flip; the default path stays byte-identical.**
   **Given** the carried-in pre-cutover items from the 8.2 and 8.3 reviews
   **When** the live flags are enabled
   **Then** (a) `validateVenueUniqueness` is reconciled with the DB unique keys (`id` + `slug`) — aligned or the rounded-coordinate check relaxed — and the mocked venue-store tests assert the query contract (`.select(VENUE_SELECT_COLUMNS)` columns + `.eq('slug', …)`); (b) the real sun-engine list fan-out has a concurrency cap and/or dedupes Met.no forecasts by rounded coordinates, and uses `Promise.allSettled` (or a defensive per-venue wrapper) so a future adapter throw cannot 500 the list route; (c) weather freshness is fidelity-correct — `WeatherSlice` carries the slice valid-time (`validAt`) used for both `weatherUpdatedAt` and the >2h "approximate"/stale signal (so it can actually fire), or the stale/approximate signal is derived from `isForecast`; (d) the reviews live read escapes the `.or()` filter operands (or uses chained `.eq()`/`.in()`); (e) the Met.no `User-Agent` is sourced from configuration with a valid contact identity (TOS compliance). The default (flag-off) in-memory/seed path remains byte-identical and CI has zero live dependency.

5. **(Maintainer cutover handoff — the live round-trips the 8.4 runbook deferred here) The live cutover round-trips are executed and recorded by the maintainer (not required for `done`).**
   **Given** the live Supabase project + Vercel environment
   **When** the maintainer performs the cutover
   **Then** the deferred live round-trips are run and recorded (no secrets committed): the 8.4 RLS access-model proof (write a review+feedback through the routes; read the review back excluding fixture seeds; prove `reviews` is anon-SELECTable, `feedback` is **not** anon-readable, neither anon-writable) and the 8.3 engine spot-check (a known shadowed downtown spot reads shadowed with coverage caps applied) — captured in `_bmad-output/implementation-artifacts/8-5-cutover-run-<date>.md`. Story `done`-ness does **not** require this run; the offline default-path gates satisfy `done`; this AC is the maintainer cutover handoff.

**Design Gate Criteria (Epic 8 overall — no new screen, data/infrastructure swap):**
- **Visual:** No new screen and no new visual *reference*. This is a config/security/types swap behind the existing UI; the five existing gate states (`map-with-selected-venue`, `venue-detail` mobile/desktop, `feedback`, `review`) + `map-primary` are reused.
- **Behaviour:** Every existing screen behaves identically on the **default (flag-off) path** — byte-identical to today (in-memory fixture/seed). On the live (flag-on) path, loading/empty/error states already built in Epics 1–3 handle real latency and the documented degrades (per-venue sun degrade → safe result, never 500; feedback/review persistence throw → 503; venue-detail summary throw → `undefined`). The only intended *observable* behaviour change is that the weather >2h "approximate" freshness state can now correctly fire (AC#4c) on the live engine path — invisible on the default path.
- **Animation:** Not applicable.
- **Visual validation:** Re-run the five existing gate states + `map-primary` via `story-review.sh` / `visual-validate.sh`; expect **no rebaseline** (the gate states run on the default seed path through `test-venue-sunny`, unchanged). Any genuine resting-state visual change requires explicit accept-with-rationale + `REBASELINE-LOG.md` per AGENTS.md.

## Tasks / Subtasks

- [x] **Task 1: Baseline, context, and confirm the live cutover surface** (AC: all)
  - [x] 1.1 Confirm branch `epic/8-wire-real-data`. Run `cd nextjs-app && npx.cmd tsc --noEmit`, `cd nextjs-app && npx.cmd eslint . --quiet`, `cd nextjs-app && npx.cmd vitest run` (record the baseline — expected **69 files / 590 tests** as of Story 8.4) before any change; if anything reports an error outside story scope, stop and surface it. Tree should be clean (8.4 committed at `b200e1d`).
  - [x] 1.2 Read: `AGENTS.md` (§Secrets, §API Boundary, §Testing Requirements, §Dev-Only Conventions, §Local Docker/WSL, §BMAD Story Workflow, §Future Monetization, §Performance), `project-context.md` (Screen ID → Route Map — confirm 8.5 touches no screen; `test-venue-sunny`; "no live Supabase in CI"), this story, `_bmad-output/planning-artifacts/epics.md` §"Epic 8 / Story 8.5" (+ the two Carried-in blocks), `architecture.md` §"Authentication & Security" / §"Admin removal correction" / §"Caching Strategy" / §"Infrastructure & Deployment", `prd.md` NFR10–21 / NFR28 / NFR33–35, the Story 8.2/8.3/8.4 files (for the env-gate + contract + maintainer-runbook precedent), `nextjs-app/docs/vercel-deployment.md`, and `8-4-persistence-enablement-run-2026-06-21.md` (the deferred RLS-proof runbook).
  - [x] 1.3 **Confirm the live Supabase state (read-only) before planning the apply.** Via the Supabase MCP (read-only) or the maintainer, confirm: `public.reviews`, `public.feedback`, `public.shadow_casters`, `public.shadow_caster_import_batches` **exist with RLS enabled but zero policies**; `public.venues` does **NOT** exist yet; the migration ledger is **empty** (schema applied out-of-band via psql). Record what is live vs. what 8.5 must apply. **Do not** apply anything in this task. (Live project ref is recorded in the 8.1.1/8.2 run notes; do not commit it or any connection string.)
  - [x] 1.4 **Confirm the DEV-vs-MAINTAINER split (record, do not re-open):** the dev agent implements the offline-testable hardening (Tasks 5–6), authors the env/secrets + advisor-triage + cutover runbook docs (Tasks 2–3, 7), and regenerates `types.ts` (Task 4, needs read access to the live schema). The **maintainer** executes the production Vercel env config, the live SQL apply, and the live round-trips (Tasks 2/3/7 "maintainer-run" subtasks). The offline default-path gates satisfy `done`.

- [x] **Task 2: Production environment & secrets configuration (AC: #1)**
  - [x] 2.1 **Audit env contract.** Reconcile `nextjs-app/.env.example` with the live code: it documents `MET_NO_USER_AGENT` but `lib/weather/met-no-service.ts:5` uses a **hardcoded** `USER_AGENT` constant (no contact email — Met.no TOS requires identifying contact info, else 403/block). It also declares `NEXT_PUBLIC_SUPABASE_ANON_KEY` which **no code consumes** (no anon client exists). Fix in Task 5e (wire UA) and here: clarify/remove the unused anon-key doc line, and add any missing prod vars (e.g. confirm `MAPTILER_KEY`/tile-style config status — it appears in the architecture prod env list but not `.env.example`).
  - [x] 2.2 **No-secret-leakage scan.** Add/verify a check that **no `NEXT_PUBLIC_`-prefixed var holds a secret** — only the Supabase URL and (unused) anon key may be public; `SUPABASE_SERVICE_ROLE_KEY`, Met.no contact config, and the `SUNNYSEAT_*` flags stay server-only. Verify the built client bundle does not inline the service-role key (grep the build output / source). `lib/supabase/server.ts` is already correct (reads `SUPABASE_SERVICE_ROLE_KEY` server-side only); confirm no regression.
  - [x] 2.3 **(Maintainer-run) Set per-environment Vercel secrets.** Document + (maintainer) set Production / Preview / Development env vars: `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, the Met.no User-Agent contact string, and flip the four `SUNNYSEAT_*` flags **on for Production only** (`SUNNYSEAT_VENUE_STORE=supabase`, `SUNNYSEAT_SUN_ENGINE=real`, `SUNNYSEAT_FEEDBACK_PERSISTENCE=supabase`, `SUNNYSEAT_REVIEW_PERSISTENCE=supabase`). Mark secrets "Sensitive" in Vercel. **Never** commit these; `.env.local` stays gitignored. Record the config (key names only, no values) in the cutover runbook (Task 7).

- [x] **Task 3: Apply schema + RLS policies live & triage the security advisor (AC: #2)**
  - [x] 3.1 **(Maintainer-run) Apply the manual SQL contracts live + run their smoke checks**, in dependency order: `8-2-venues-store-contract.sql` (creates `public.venues` incl. the additive `seating_area jsonb` column 8.3 added + the unique `idx_venues_slug`; **does not exist live yet** — seed the cutover venue set), then confirm `3-3-reviews-contract.sql` + `3-2-feedback-contract.sql` policies are applied (the tables exist live with RLS on but **zero policies** — apply `reviews_public_read` + `reviews_service_write` and `feedback_service_write`). Run each file's end-of-file `pg_policies` / `role_table_grants` / RLS-enabled smoke checks and confirm they match. (8.4's RLS authoring + the feedback `grant select, insert to service_role` fix at `b200e1d` are the policies to apply.)
  - [x] 3.2 **Author + apply policies for the tables that still lack them.** The live advisor shows `rls_enabled_no_policy` on `shadow_casters`, `shadow_caster_import_batches`, `reviews`, `feedback`. Author the access-model policies into the contract artifacts (mirror the 8-2/8-4 deny-by-default → explicit-grant + `TO service_role`/`with check` pattern): `venues` (service-role read; the runtime reads via service-role which bypasses RLS), `shadow_casters`/`shadow_caster_import_batches` (service-role read — geodata is server-only; no anon read). The runtime works regardless (service-role bypasses RLS); these policies clear the advisor INFOs + define the access model.
  - [x] 3.3 **(Maintainer-run) Run + triage the Supabase security advisor** (`get_advisors` security + performance). Confirm the four `rls_enabled_no_policy` INFOs clear after 3.1/3.2. Document the **accepted PostGIS exceptions** — `spatial_ref_sys` RLS-disabled (`0013`, owned by `supabase_admin`, cannot `ALTER`), `postgis`-in-public (`0014`, moving post-install unsupported), `st_estimatedextent` ×6 SECURITY DEFINER (`0028`/`0029`) — each as accepted, with rationale, in `_bmad-output/implementation-artifacts/8-5-security-advisor-triage-<date>.md`. (Performance advisor showed only `unused_index` INFOs — `reviews_venue_created_at_idx` unused because `reviews` has 0 rows pre-launch; do **not** drop it.)
  - [x] 3.4 **Decide + record the migration-ledger posture.** The live migration history is **empty** (out-of-band psql applies). Either backfill `supabase/migrations/` files for reproducibility OR explicitly accept the out-of-band manual-contract model (the established repo pattern — no `supabase/migrations/` dir exists). Record the decision in the triage artifact. (Recommended: accept the out-of-band model for MVP; the contracts are the source of truth.)

- [x] **Task 4: Regenerate `lib/supabase/types.ts` from the live schema (AC: #3)**
  - [x] 4.1 Regenerate types from the live `public` schema (replace the `export type Database = Record<string, never>` placeholder + the stale "Story 6.2" TODO): `npx supabase gen types typescript --project-id <ref> --schema public > nextjs-app/lib/supabase/types.ts` (CLI ≥ v1.8.1; needs `supabase login`/PAT). Do this **after** Task 3 applies the schema so `venues` (incl. `seating_area`), `reviews`, `feedback`, `shadow_casters`, `shadow_caster_import_batches`, and the `get_buildings_near_point` RPC are all present.
  - [x] 4.2 **Handle PostGIS/JSONB typing.** `shadow_casters` geometry columns (`geometry`, `source_geom_3007`, `bbox_3007`, `centroid_3007`) generate as `unknown`; JSONB columns generate as the `Json` helper. Narrow them where query sites need them (the `MergeDeep`-against-`database-generated.types.ts` pattern, or `.overrideTypes<>()`); do not weaken `strictNullChecks`. Optionally wire `createClient<Database>` in `lib/supabase/server.ts` for end-to-end typing (currently un-parameterized).
  - [x] 4.3 Run the gates: `tsc --noEmit` (0), `eslint . --quiet` (0), `vitest run` (≥ baseline). The regenerated types must not break the typecheck or the adapters' locally-defined Row/Insert types.

- [x] **Task 5: Pre-cutover hardening — sun engine & Met.no (AC: #4b, #4c, #4e)** — carried from Story 8.3 R1
  - [x] 5.1 **Concurrency cap + forecast dedupe.** In `app/api/venues/route.ts:288` (the `Promise.all` over `applyRealSunEngine`) and `lib/services/sun-engine.ts`, add a concurrency cap on the per-venue fan-out and/or dedupe Met.no `getForecast` calls by rounded coordinates across the batch (each `getForecast(lat,lng)` is a distinct fetch-cache key; nearby venues fetch near-duplicates). Target: never exceed Met.no's 20 req/s aggregate limit; truncate coordinates to ≤4 decimals per Met.no TOS. (Precompute/Cron remains a DECISION-D follow-up — not built here.)
  - [x] 5.2 **`Promise.allSettled` invariant.** Convert the list fan-out to `Promise.allSettled` (or a defensive per-venue wrapper) so the "never 500 / per-venue degrade" invariant is structural, not dependent solely on `applyRealSunEngine`'s internal try/catch. A future refactor that lets the adapter throw must not 500 the endpoint.
  - [x] 5.3 **Weather `validAt` freshness fidelity.** Extend `WeatherSlice` (in `lib/solar/types.ts`) with a slice valid-time (`validAt`, from `entry.time`), and in `lib/weather/met-no-service.ts:79` stop reporting fetch-instant `createdAt` as the freshness — carry `validAt` and use it in `sun-engine.ts` for both `weatherUpdatedAt` and the >2h "approximate"/stale signal (`STALE_WEATHER_AGE_MS`), so NFR34's freshness cap can actually fire and future-planner slices are not advertised as fresh "now". (This is the deliberate "re-tune the weather adapter" that 8.3 was forbidden from doing — authorized here.) Keep the default seed path's freshness behaviour unchanged.
  - [x] 5.4 **Met.no User-Agent from config (AC#4e).** Replace the hardcoded `USER_AGENT` in `lib/weather/met-no-service.ts:5` with a value sourced from `MET_NO_USER_AGENT` (with a safe non-secret default), carrying a valid contact identity per Met.no TOS. Keep `next: { revalidate: 300 }` caching; consider `If-Modified-Since`/`Expires` per TOS if cheap.
  - [x] 5.5 **Tests (boundary-mocked, no live Met.no/Supabase).** Add unit tests for: the concurrency cap / forecast dedupe (assert ≤N concurrent and deduped fetch keys), the `Promise.allSettled` degrade (one venue throws → others still return, route does not 500), the `validAt`-driven staleness (a >2h-old slice flags "approximate"; a fresh forecast slice flagged via `isForecast`), and the UA-from-env. Mock at the `@/lib/weather` / `@/lib/supabase/server` boundaries (single-call lazy import — see [[reference_vitest_dynamic_import_mock_bypass]]). Default-path tests stay byte-identical green.

- [x] **Task 6: Pre-cutover hardening — venue store & reviews read (AC: #4a, #4d)** — carried from Story 8.2 R2 + 8.4 R1
  - [x] 6.1 **Uniqueness-key alignment.** Reconcile `validateVenueUniqueness` (`app/api/venues/route.ts:178`) — it dedupes on `id` + rounded coordinates (`COORDINATE_COLLISION_PRECISION=6`) while the DB enforces unique `id` (PK) + `slug` (`idx_venues_slug`). Align the runtime check with the DB keys (add `slug` uniqueness; relax or justify the coordinate check so two legitimately-distinct venues at near-identical coords don't 500 the list route). Verify live venue-data integrity at cutover (Task 7).
  - [x] 6.2 **Query-contract test coverage.** Extend the mocked `venue-store` tests to assert the Supabase query args: the `.select(VENUE_SELECT_COLUMNS)` column list (all 20 incl. `seating_area`) and `.eq('slug', …)`, so a snake_case column/filter typo is caught offline before the live table (carried-in 8.2 R2b). Confirm `VENUE_SELECT_COLUMNS` still matches the applied `venues` contract.
  - [x] 6.3 **Escape the reviews `.or()` filter (AC#4d).** In `lib/services/venue-reviews-persistence.ts:240`, the live read builds `.or(\`venue_id.eq.${venue.id},venue_slug.eq.${venue.slug}\`)` by raw interpolation. The cutover enables the live venue store (arbitrary slugs), which is the trigger condition. Escape the operands or replace with chained `.eq()`/`.in()` filters so a reserved PostgREST token (`,` `.` `(` `)`) in a slug can't corrupt the filter or match unintended rows. Add a test with a slug containing a reserved char.
  - [x] 6.4 **(Conditional) Alternate-slug match.** Only if the applied `venues` schema adds a `venue_slug`/alias/slug-history column: add the alternate-identifier match to `readSupabaseVenueBySlug` (`.eq('slug', …)`). If the live schema keeps a single `slug` column, record "not triggered" and skip (carried-in 8.2 R2, conditional).

- [x] **Task 7: Maintainer-run live cutover round-trips + runbook (AC: #5, #4a)**
  - [x] 7.1 Author `_bmad-output/implementation-artifacts/8-5-cutover-run-<date>.md` (mirror the 8.4 runbook shape): preconditions (Tasks 2–4 done; contracts applied + smoke checks green; env set), the procedure, and an unfilled Outcome section. Mark NOT-YET-RUN. No secrets/connection strings.
  - [x] 7.2 **(Maintainer-run) Execute + record** (not required for `done`): (a) the 8.4 RLS access-model proof — write a review + feedback through the routes with the flags on; read the review back via `GET /api/reviews` (newest-first, fixture seeds `review_fixture_*` absent — clean swap); using an anon key outside the app, confirm `reviews` is anon-SELECTable, `feedback` is **not** anon-readable, neither is anon-writable; (b) the 8.3 engine spot-check — a known shadowed downtown spot reads shadowed with coverage caps applied; (c) live venue-data integrity check (no duplicate-coordinate or duplicate-slug rows that would 500 the list route — Task 6.1). Record outcomes (no secrets).

- [x] **Task 8: Final verification gate (AC: all)**
  - [x] 8.1 `cd nextjs-app && npx.cmd tsc --noEmit` (0) ; `cd nextjs-app && npx.cmd eslint . --quiet` (0) ; `cd nextjs-app && npx.cmd vitest run` (≥ baseline 69 files / 590 tests; rises with the new hardening tests — must not drop; default-path route/service tests stay byte-identical green).
  - [x] 8.2 `cd nextjs-app && npx.cmd playwright test` — the `map-primary` / `visit-loop` / `axe` real-route specs + the `feedback` / `review` mocked specs pass against the **default in-memory/seed path** with no live Supabase/Met.no.
  - [x] 8.3 Visual validation for the five gate states + `map-primary` (via `test-venue-sunny` routes): expect **no rebaseline** (8.5 changes no screen; the gate states run the default seed path). Any genuine change requires accept-with-rationale + `REBASELINE-LOG.md`.
  - [x] 8.4 Run the API-boundary scan + MVP monetization quarantine scan (Epic 8 guardrails): zero client→backend boundary hits (no `components/`/`hooks/` import of `lib/supabase`/`lib/solar`/`lib/weather`/`lib/middleware`/`lib/buildings`/`lib/services/*persistence`/`lib/services/sun-engine`/`lib/services/venue-store`), zero monetization hits. Move the story `in-progress → review` only via `scripts/story-review.sh` (`.\scripts\run-sh.ps1 scripts/story-review.sh 8-5-production-config-security-hardening`) — never edit sprint-status directly to `review`.

## Dev Notes

### Live-state reality check (read this first — the memory note is stale)
A read-only inspection of the live Supabase project (2026-06-21) found the DB is **not** a bare "clean Epic-3 slate":
- **Exists live, RLS enabled, ZERO policies:** `public.reviews` (0 rows), `public.feedback` (0 rows), `public.shadow_casters` (58,731 rows — 8.1/8.1.1 import), `public.shadow_caster_import_batches` (1 row). The advisor flags all four `rls_enabled_no_policy` (INFO) — RLS on but deny-all to anon/authenticated. The runtime works anyway because it uses **only** the service-role client (bypasses RLS).
- **Does NOT exist live:** `public.venues`. Story 8.2 shipped the contract + env-gated code but the live apply was deferred here. The default path uses `venues-fixture.ts`. 8.5 must apply `8-2-venues-store-contract.sql` (incl. the additive `seating_area jsonb`) and seed the cutover venue set.
- **Migration ledger is empty** — schema was applied out-of-band via psql (IPv4 session pooler), not Supabase migrations. Decide backfill-vs-accept (Task 3.4).
- **No FK** from `reviews`/`feedback` (free-text `venue_id`/`venue_slug`) to a venues table — referential integrity is unenforced. MVP-acceptable; note it, don't add an FK without a decision.
- **Live security advisor (already run):** ERROR `rls_disabled_in_public` on `spatial_ref_sys` + WARN `extension_in_public` (postgis) + WARN `st_estimatedextent` ×6 SECURITY DEFINER — **the standard accepted PostGIS exceptions** (AC#2). Plus the four `rls_enabled_no_policy` INFOs (the actionable items). Performance advisor: only `unused_index` INFOs (expected pre-launch; keep `reviews_venue_created_at_idx`).

### Decisions to confirm with the maintainer (flagged — see the end-of-draft questions)
1. **Cutover execution model:** 8.5 = dev-implementable hardening + doc/runbook authoring + `types.ts` regen; the maintainer runs the Vercel config, live SQL apply, and live round-trips. (Assumed; matches the 8.2/8.3/8.4 precedent.)
2. **Venues data source for cutover:** apply `8-2-venues-store-contract.sql` and seed the **known fixture venue set** for the cutover, treating real-Gothenburg production venue sourcing as a separate maintainer data-load (referenced, not blocking `done`). (Assumed.)
3. **Compute-on-request vs precompute/Cron:** accept **compute-on-request for MVP go-live** per DECISION D, with the Task 5 concurrency-cap/dedupe as the spike mitigation; formally defer PRD NFR20/NFR35 + the architecture "daily Vercel Cron" line to a post-MVP follow-up. (Assumed; DECISION D already ratified this.)

### Architecture alignment
- **API boundary (must not be violated):** client components never import `lib/supabase`/`lib/solar`/`lib/weather`/`lib/middleware`/`lib/buildings`/`lib/services/*`; access is via `app/api/*` + `hooks/queries|mutations`; query keys from `lib/query-keys.ts`. [Source: AGENTS.md §API Boundary]
- **Secrets:** no secrets in committed files; `.env.local` stays gitignored; production secrets live only in Vercel env vars. The service-role key is server-only; only the Supabase URL (and the unused anon key) may be `NEXT_PUBLIC_`. [Source: AGENTS.md §Secrets; architecture.md §Infrastructure & Deployment]
- **Server-only service role bypasses RLS:** reads/writes work under the live deny-all RLS; the policies 8.5 applies are the access-model contract + a future anon read path, not what the server uses today. No anon Supabase client exists or is built here. [Source: architecture.md §Admin removal correction; lib/supabase/server.ts]
- **No admin/moderation surface:** wiring the service-role key for the live path is backend infrastructure, NOT an admin surface (retired 2026-05-30). Venue/geometry changes are manual DB work. [Source: architecture.md §Admin removal correction]
- **Caching / freshness:** `GET /api/reviews` is `no-store`; venue list CDN-cached ~30s; Met.no 5-min revalidate; `X-Weather-Updated-At`/`X-Sun-Data-Source` headers carry freshness. Do not change the cache contracts; AC#4c only makes the existing freshness signal accurate. [Source: architecture.md §Caching Strategy; §API & Communication Patterns]
- **Performance / TOS:** Met.no needs an identifying User-Agent with contact + ≤20 req/s aggregate + ≤4-decimal coords + `Expires`/`If-Modified-Since` caching; JS budget ≤600KB gz total. [Source: prd.md NFR28; api.met.no Terms of Service; AGENTS.md §Performance]

### Latest-tech specifics (for the dev agent)
- **Type regen:** `npx supabase gen types typescript --project-id <ref> --schema public > nextjs-app/lib/supabase/types.ts` (CLI ≥ v1.8.1; `supabase login` / PAT first). PostGIS `geometry` → `unknown`, JSONB → `Json`; narrow via `type-fest` `MergeDeep` against `database-generated.types.ts` (keep `strictNullChecks`) or `.overrideTypes<>()`. [Source: supabase.com/docs/guides/api/rest/generating-types]
- **Advisor exceptions:** mark the PostGIS lints (`spatial_ref_sys` 0013, `postgis`-in-public 0014, `st_estimatedextent` 0028/0029) accepted/ignored in Studio (each lint has a `cache_key`) + document; do **not** attempt to `ALTER` `spatial_ref_sys` (insufficient privilege) or move PostGIS out of `public` (unsupported post-install). [Source: supabase.com/docs/guides/database/database-advisors; supabase discussions #19143/#26302]
- **Vercel env:** per-environment scoping (Production/Preview/Development); `NEXT_PUBLIC_` inlines into the client bundle at build → never for secrets; mark secrets "Sensitive" (non-readable after creation); env changes apply only to new deployments. [Source: vercel.com/docs/environment-variables; nextjs.org/docs/app/guides/environment-variables]

### Existing patterns to mirror (do not reinvent)
- **Env-gated adapter + manual contract SQL + maintainer runbook** — the 8.2/8.3/8.4 stories: env flag opt-in (default in-memory/seed byte-identical), contract SQL "Not applied automatically", optional maintainer run note (NOT-YET-RUN, no secrets). 8.5 adds **no** new flag; it flips the four existing flags on for production env only.
- **Deny-by-default RLS block** — `8-2-venues-store-contract.sql §3` + `3-3`/`3-2` (8.4): `enable rls` → `revoke all from anon, authenticated, public` → explicit `grant`s → `USING(true)` only on a genuinely-public SELECT → write policies scoped `TO service_role` + `with check`, never `USING(true)` → `pg_policies`/`role_table_grants` smoke checks. Apply the same shape to the `venues`/`shadow_casters` policies (Task 3.2).
- **Boundary-mock test pattern** — `vi.mock('@/lib/supabase/server', …)` / `vi.mock('@/lib/weather/…')` with `vi.unstubAllEnvs()` + `vi.stubEnv(...)` per test; mock the adapter boundary, not the dynamic import ([[reference_vitest_dynamic_import_mock_bypass]]).
- **Env-gate helper duplication** is intentional (`hasSupabaseServiceRoleConfig` duplicated across 4 adapters; 8.4 declared centralizing out of scope). Leave as-is unless a hardening task naturally touches it.

### Scope guardrails (do NOT)
- Do not build a precompute/Cron pipeline (DECISION D — compute-on-request for MVP; Cron is a measured-latency follow-up). Do not add a new env flag.
- Do not build an anon Supabase client or switch the runtime read path to anon — the public-read policy is the access-model contract; the runtime keeps using the service-role adapter (which bypasses RLS).
- Do not add admin/moderation/auth/upload surfaces or any monetization/premium/paywall/Swish code (quarantine scan must stay clean).
- Do not change DTO shapes, query keys, request/response bodies, rate-limit, or the `no-store`/CDN cache contracts. AC#4c only makes the existing freshness signal accurate — it does not add a new field to the public DTO without confirming the `WeatherSlice`/freshness types stay internal.
- Do not introduce a live-Supabase/live-Met.no dependency into CI/tests; the default path is in-memory/seed and must stay byte-identical. Do not set `SUNNYSEAT_*=supabase`/`=real` in any committed test/CI config.
- Do not commit secrets/connection strings or the live project ref into the story or artifacts; `.env.local` stays gitignored. Do not make global Docker/WSL/daemon changes (AGENTS.md §Local Docker/WSL).
- Do not change the visual references for resting states (no screen change in 8.5).

### Project Structure Notes
- **Modified (code hardening):** `nextjs-app/app/api/venues/route.ts` (concurrency cap/`allSettled` + `validateVenueUniqueness`), `nextjs-app/lib/services/sun-engine.ts` (cap/dedupe + `validAt` freshness), `nextjs-app/lib/weather/met-no-service.ts` (`validAt` on slice + UA from env), `nextjs-app/lib/solar/types.ts` (`WeatherSlice.validAt`), `nextjs-app/lib/services/venue-reviews-persistence.ts` (`.or()` escaping), `nextjs-app/lib/supabase/types.ts` (regen), optionally `nextjs-app/lib/supabase/server.ts` (`createClient<Database>`).
- **Modified (env/docs):** `nextjs-app/.env.example` (UA wiring note, unused anon-key clarification), possibly `nextjs-app/docs/vercel-deployment.md`.
- **Modified (contracts):** the SQL contract artifacts (add `venues`/`shadow_casters` policies — Task 3.2).
- **Added:** `_bmad-output/implementation-artifacts/8-5-security-advisor-triage-<date>.md`, `_bmad-output/implementation-artifacts/8-5-cutover-run-<date>.md` (maintainer runbook).
- **Modified (tests):** `nextjs-app/test/unit/services/venue-store.test.ts` (+query-contract), sun-engine / met-no / venues-route tests (+hardening), venue-reviews-persistence test (+`.or()` escaping).
- **Untouched:** component layers (no UI change), the shadow-caster import pipeline, the DTO type shapes.

### References
- [Source: CLAUDE.md] → [Source: AGENTS.md] (§Secrets line 233, §API Boundary 122-124, §Testing 193-203, §Dev-Only Conventions 217-221, §Local Docker/WSL 33-39, §BMAD Story Workflow 154-162, §Future Monetization 126-128, §Performance 150)
- [Source: project-context.md] (Screen ID → Route Map — confirm 8.5 touches no screen; `test-venue-sunny`; "no live Supabase in CI" rule)
- _Frontend design docs N/A:_ `nextjs-app/docs/design/DESIGN.md` and `_bmad-output/planning-artifacts/ux-design-specification.md` are not referenced because 8.5 introduces no UI/visual change (config/security/types + backend hardening) — confirmed against the epic Design Gate ("no new screens or visual references").
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 8 — Story 8.5] (the 3 ACs + the two Carried-in blocks, lines 2257-2284)
- [Source: _bmad-output/planning-artifacts/architecture.md] (§Authentication & Security 322-346, §Admin removal correction 29/326, §Caching Strategy 316-320, §Infrastructure & Deployment 417-436, §Gap Analysis 1098-1100)
- [Source: _bmad-output/planning-artifacts/prd.md] (NFR10-21 secrets/perf/scale, NFR28 Met.no UA, NFR33-35 freshness)
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] (Target: Story 8.5 items — 8.2 R2 lines 122-123; 8.3 R1 lines 133-135; 8.4 R1 line 143)
- [Source: _bmad-output/implementation-artifacts/8-2-real-venue-store-api.md] + [8-3-real-sun-shadow-weather-computation.md] + [8-4-feedback-review-persistence-enablement.md] (env-gate + contract + maintainer-runbook precedent; the explicit "Story 8.5 owns advisor + types regen + production env" handoffs)
- [Source: _bmad-output/implementation-artifacts/8-4-persistence-enablement-run-2026-06-21.md] (the deferred RLS-proof procedure 8.5 executes)
- [Source: _bmad-output/implementation-artifacts/8-2-venues-store-contract.sql, 3-2-feedback-contract.sql, 3-3-reviews-contract.sql] (the contracts 8.5 applies live)
- [Source: nextjs-app/lib/supabase/server.ts] (service-role client; bypasses RLS; no anon client), [nextjs-app/lib/supabase/types.ts] (placeholder to regen)
- [Source: nextjs-app/app/api/venues/route.ts] (`validateVenueUniqueness:178`, `Promise.all` fan-out :288), [nextjs-app/lib/services/sun-engine.ts] (`applyRealSunEngine`, weather freshness), [nextjs-app/lib/weather/met-no-service.ts] (`createdAt:79`, hardcoded UA :5), [nextjs-app/lib/services/venue-store.ts] (`VENUE_SELECT_COLUMNS`, `.eq('slug')`), [nextjs-app/lib/services/venue-reviews-persistence.ts:240] (`.or()` interpolation)
- [Source: api.met.no Terms of Service] (UA + 20 req/s + ≤4-decimal coords + caching), [supabase.com/docs/guides/api/rest/generating-types] (type regen), [vercel.com/docs/environment-variables] (per-env secrets)
- _No new screen or visual reference is introduced._ 8.5 is config/security/types + backend hardening behind the existing UI.

### Test gate (must pass before `review`)
- `cd nextjs-app && npx.cmd tsc --noEmit` (0 errors)
- `cd nextjs-app && npx.cmd eslint . --quiet` (0 errors)
- `cd nextjs-app && npx.cmd vitest run` (≥ baseline 69 files / 590 tests; rises with new hardening tests; default-path route/service tests stay byte-identical green)
- `cd nextjs-app && npx.cmd playwright test` (`map-primary`/`visit-loop`/`axe` + `feedback`/`review` specs green against the default in-memory/seed path; no live Supabase/Met.no)
- Visual validation: `map-with-selected-venue` (mobile), `venue-detail` (mobile + desktop), `feedback` (mobile), `review` (mobile), `map-primary` (mobile) — no rebaseline (no screen change)
- `.\scripts\run-sh.ps1 scripts/story-review.sh 8-5-production-config-security-hardening`
- API-boundary scan + MVP monetization quarantine scan (zero hits)

## Review Findings

**Round 1 of 3** — bmad-code-review (2026-06-22; Blind Hunter + Edge Case Hunter + Acceptance Auditor, parallel subagents; Opus 4.8 orchestrator). Reviewed the uncommitted 8.5 work vs baseline `b200e1d`.

**Result:** All five ACs (incl. sub-items 4a–4e) **SATISFIED** by concrete diff/contract/artifact evidence (Acceptance Auditor); no scope-guardrail violation; **no `NEXT_PUBLIC_` secret leakage** (verified — only `NEXT_PUBLIC_SUPABASE_URL`/`_APP_URL` are public); default (flag-off) path byte-identical; deleted `client.ts`/`health.ts` confirmed to have **zero importers**; the reviews `.or()` escaping verified **correct** (PostgREST double-quoting + `\`/`"` escaping). **No HIGH/MEDIUM blockers.** Triage: **0 decision-needed · 1 patch · 9 defer · 8 dismissed**.

### Patch (fixable, unambiguous)

- [x] [Review][Patch] Advisor-triage §3 still lists the now-deleted `lib/supabase/health.ts` (as a service-role-key reader) and `lib/supabase/client.ts` (as a "future cleanup candidate"); both were deleted post-gate, so the auditable security artifact contained stale claims [`_bmad-output/implementation-artifacts/8-5-security-advisor-triage-2026-06-22.md` §3] — **FIXED 2026-06-22:** §3 rewritten — only `NEXT_PUBLIC_SUPABASE_URL` is read (anon key dropped with `client.ts`), the service-role reader list drops the deleted `health.ts` (now `server.ts` + the 4 env-gate adapters), and the "Noted" paragraph records the `client.ts`/`health.ts` deletion. Verified live: anon key read in zero modules; service-role key in `server.ts` + 4 adapters only.

### Deferred (real but not actionable now — all low/defensive or pre-existing)

- [x] [Review][Defer] Deduped forecast fetcher never evicts in-flight entries [`nextjs-app/lib/services/sun-engine.ts:140-150`] — deferred, mitigated today (`getForecast` never rejects → caches a resolved `[]`, the correct per-venue degrade; batch-scoped). Optional defensive `.finally(() => inFlight.delete(key))` so a future throwing fetcher can't memoize a rejection across the batch.
- [x] [Review][Defer] `weatherUpdatedAt`/`X-Weather-Updated-At` can carry a FUTURE valid-time for planner-future forecast slices [`nextjs-app/lib/services/sun-engine.ts:204-213,326-333`] — deferred, by ratified design (validAt-as-honest-freshness; the `weather` "approximate" reason still fires via `isForecast`). Verify at the AC#5 cutover round-trip that the freshness header / age display reads sensibly for a future planner time.
- [x] [Review][Defer] `validateVenueUniqueness` skips the duplicate check for a falsy/empty slug (`if (slug)`) [`nextjs-app/app/api/venues/route.ts:200-206`] — deferred, not reachable today (`slug` is a required non-empty `string`; `fromVenueRow` throws on blank). Tighten only if a nullable-slug path ever appears.
- [x] [Review][Defer] `mapWithConcurrency` yields 0 workers (silently unprocessed results) for `NaN`/`0`/negative `concurrency` [`nextjs-app/lib/services/sun-engine.ts:159-176`] — deferred, defensive-only (sole caller passes the constant `6`; exported for tests). Optional input-validation guard.
- [x] [Review][Defer] Unparseable Met.no `entry.time` → Invalid-Date `validAt` (NaN time) silently treated as fresh / mis-selected [`nextjs-app/lib/weather/met-no-service.ts:75`, `nextjs-app/lib/services/sun-engine.ts:380-389`] — deferred, not reachable with a conformant Met.no ISO-8601 response. Optional `Number.isNaN(validAt.getTime())` skip.
- [x] [Review][Defer] Pre-existing `vercel.json` `installCommand` pins `lightningcss@1.31.1` into the repo root with `2>&1 || true`, silently swallowing an install failure (a failed install ships a broken build) [`nextjs-app/vercel.json` — NOT in the 8.5 diff; 8.5 only documents it in `nextjs-app/docs/vercel-deployment.md:154`] — deferred, pre-existing build-infra debt, out of 8.5 scope; track as a build-pipeline follow-up.
- [x] [Review][Defer→RESOLVED] Met.no contact identity baked as `contact@sunnyseat.se` in docs [`nextjs-app/docs/vercel-deployment.md:102`] — **RESOLVED 2026-06-22:** maintainer supplied a real, monitored inbox `rasmus.thunborg@enhancior.se`, now the `DEFAULT_USER_AGENT` fallback in `lib/weather/met-no-service.ts` (fallback is now TOS-compliant) + the documented example in `.env.example`/`docs/environment-variables.md`/`docs/vercel-deployment.md`; default-UA tests updated.
- [x] [Review][Defer] Concurrency unit test asserts `maxActive > 1` via `setTimeout(5ms)` overlap — timing-dependent, can flake under CI contention [`nextjs-app/test/unit/services/sun-engine.test.ts`] — deferred, make the concurrency assertion deterministic (controlled deferred promises rather than timers) when next touched.
- [x] [Review][Defer] Line-ending (LF↔CRLF) churn inflates the diff in `lib/solar/types.ts` + the env/docs files, burying the substantive `validAt` change and hurting `git blame` [`nextjs-app/lib/solar/types.ts`] — deferred, confirm `.gitattributes` normalizes line endings so generated/edited-file diffs stay minimal (same class as the 8.3 R1 churn defer).

### Dismissed (8) — rationale

- `mapWithConcurrency` task-rejection aborts `Promise.all` — by documented contract; the route wraps each task in `try/catch → safeSeedOutcome` (and `applyRealSunEngine` self-catches), so the invariant holds.
- `precip` local removed from `met-no-service.ts` — verified dead code (no `WeatherSlice` precipitation consumer; `api.ts` `precipitationProbability` is a different DTO), documented in the File List.
- RLS `using(true)` SELECT-only "advisor appeasement" — by design (service_role bypasses RLS); matches the ratified server-only access model; deny-by-default preserved via `revoke all` + no anon grant.
- Dead-code deletion "unverifiable from the diff" — verified: zero importers of `client.ts`/`health.ts`.
- `orFilterValue` comment lists chars neutralized via quoting (not replacement) — cosmetic comment imprecision; the escaping behavior is correct.
- `safeSeedOutcome` labels a hard-throw venue `geometry-only` — by-design degrade shape carried from 8.3; not a regression.
- `>2h` staleness uses exclusive `>` boundary — carried pre-existing semantics; a slice exactly 2h old reads fresh, matching prior behavior.
- Reviews `.or()` escaping "insufficient for `,`/`.`/`(`/`)`" — verified CORRECT: PostgREST treats a double-quoted operand as a literal, so reserved tokens inside the quotes do not split the filter; only `\`/`"` need escaping and both are. The real PostgREST round-trip is the AC#5 maintainer step.

## Dev Agent Record

### Agent Model Used

Amelia/Claude (Opus 4.8) via bmad-dev-story.

### Debug Log References

- Baseline gate (Task 1.1): nextjs-app `tsc --noEmit` 0, `eslint . --quiet` 0,
  `vitest run` 69 files / 590 tests — matches the story baseline at `b200e1d`.
- Live read-only inspection (Task 1.3, Supabase MCP): confirmed the story's
  live-state — `venues` absent; reviews/feedback/shadow_casters/import_batches
  RLS-on with ZERO policies; spatial_ref_sys RLS-off; migration ledger empty.
- Post-implementation: `tsc` 0, `eslint` 0, `vitest run` 70 files / 606 tests
  (+16; +1 file `test/unit/weather/met-no-service.test.ts`). API-boundary scan
  clean; monetization quarantine scan clean.
- E2E (Task 8.2): Playwright default-path specs pass (map-primary / visit-loop /
  axe / feedback / review, zero live Supabase/Met.no); 5 page-setup timeouts under
  parallel-worker contention re-ran clean serially (`--workers=1` → 44 passed, 0 failed).
- Final gate (Task 8.4): `story-review.sh` PASSED — lint 0, typecheck 0, vitest 70
  files / 606 tests; visual auto-skipped (no mapped screen ID, no rebaseline);
  in-progress → review via the script.
- Validation artifact: `validation/8-5-production-config-security-hardening-review-20260622-120608.log`.

### Completion Notes List

**Execution model (maintainer-confirmed):** Rasmus chose "I apply via MCP now",
so the dev agent performed the additive live SQL applies + types regen + advisor
run via the Supabase MCP. The production Vercel secret/flag config and the live
feedback/review round-trips remain maintainer-run (documented in the runbook).
The app stays on the seed path until the maintainer flips the `SUNNYSEAT_*` flags
in Vercel, so the live applies are non-disruptive.

- **AC#1 (secrets / no leakage):** Reconciled `.env.example` (clarified the
  currently-unused anon key; documented the now-wired server-only Met.no UA; noted
  no MapTiler/Cron secret needed); reconciled the stale `docs/environment-variables.md`
  + `docs/vercel-deployment.md` (removed OpenWeatherMap + fictional crons + the
  anon-key "required" framing). No-leakage source scan recorded in the triage
  artifact: only `NEXT_PUBLIC_SUPABASE_URL`/`_ANON_KEY` are public; the service-role
  key + Met.no UA + `SUNNYSEAT_*` flags are read only in server-only `lib/` modules,
  zero in `components/`/`hooks/`. Build-output grep is the maintainer step.
- **AC#2 (RLS + advisor):** Authored the access-model policies into the contract
  SQL (`venues_service_read` in 8-2; `shadow_casters`/`shadow_caster_import_batches`
  service-read in 3-0-2 §4b) and applied them + the 8.4 reviews/feedback policies
  live. The four `rls_enabled_no_policy` INFOs cleared; advisor now shows only the
  accepted PostGIS exceptions (spatial_ref_sys 0013, postgis-in-public 0014,
  st_estimatedextent 0028/0029) — documented in
  `8-5-security-advisor-triage-2026-06-22.md`.
- **AC#3 (types regen):** Regenerated `lib/supabase/types.ts` from the live schema
  (replacing the `Record<string, never>` placeholder + the stale "Story 6.2" TODO).
  `venues` fully typed incl. `seating_area`; the `get_buildings_near_point` RPC
  typed. PostGIS geometry → `unknown`, JSONB → `Json`; query sites consume their
  own narrowed local Row types so none is left on raw `unknown`. `server.ts` kept
  un-parameterized (adapters cast their own Row/Insert types). tsc/eslint/vitest pass.
- **AC#4 (pre-cutover hardening):**
  - 4a venue uniqueness aligned to the DB keys (`id` + `slug`); the rounded-coordinate
    check dropped (coords are not a DB unique key → no false 500 for co-located venues).
    Mocked venue-store tests now assert the query contract (`VENUE_SELECT_COLUMNS` 20-col
    select + `.eq('slug', …)`).
  - 4b sun-engine list fan-out gets a concurrency cap (`mapWithConcurrency`, cap 6) +
    Met.no forecast dedupe by rounded ≤4-decimal coords (`createDedupedForecastFetcher`),
    and a structural `Promise.allSettled`-style per-venue degrade (`safeSeedOutcome`) so a
    future adapter throw can never 500 the list route.
  - 4c weather freshness fidelity: `WeatherSlice.validAt` (from Met.no `entry.time`) now
    drives both `weatherUpdatedAt` and the >2h "approximate" staleness signal (forecast
    slices flagged via `isForecast`), so NFR34's cap can actually fire; `createdAt` kept
    for the confidence-calculator. Nearest-slice selection now uses `validAt`.
  - 4d reviews `.or()` operands quoted/escaped (`orFilterValue`) so reserved PostgREST
    tokens in an arbitrary live slug cannot corrupt the filter (test with a comma/quote slug).
  - 4e Met.no `User-Agent` sourced from `MET_NO_USER_AGENT` (non-secret default fallback).
  - Default (flag-off) path stays byte-identical; new boundary-mocked tests (sun-engine
    concurrency/dedupe/validAt, met-no UA + validAt + ≤4-decimal coords, route never-500
    degrade) all green; CI keeps zero live dependency.
- **AC#5 (maintainer cutover):** Authored `8-5-cutover-run-2026-06-22.md` (Vercel
  env table by key-name-only; the procedure for the 8.4 RLS proof + 8.3 engine
  spot-check + 6.1 venue-data integrity; unfilled Outcome; NOT-YET-RUN). Not
  required for `done`.
- **Task 3.4 migration ledger:** accept the out-of-band manual-contract model for
  MVP (ledger stays empty; the `.sql` contracts are the source of truth) — applied
  via `execute_sql` (no ledger entry). Recorded in the triage artifact.
- **Task 6.4 (conditional):** not triggered — the applied `venues` schema keeps a
  single `slug` column (no `venue_slug`/alias/history column), so no alternate-slug
  match is needed in `readSupabaseVenueBySlug`.
- **Dead-code cleanup (post-gate, maintainer-requested):** removed the two
  unused `lib/supabase/` modules — `client.ts` (anon client, no importers) and
  `health.ts` (`createHealthClient`, no callers) — and dropped the now-zero-consumer
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `.env.example` + `docs/environment-variables.md`.
  Also confirmed `NEXT_PUBLIC_MAPTILER_KEY` is unused in code (the map hardcodes the
  keyless OpenFreeMap `positron` style; MapTiler dropped in Story 1.4 D3=B) — a
  dead Vercel var. Gate re-run green (tsc 0, eslint 0, vitest 70 files / 606 tests).
- **Venue elevation capture (post-gate, additive):** Rasmus flagged that rooftop
  bars / hilltop venues are mis-modeled. Confirmed the engine is 2D/ground-level
  (`computeShadowInfo` has no venue-elevation input). Added an additive nullable
  SERVER-ONLY `public.venues.seating_elevation_m` (double precision ≥ 0; metres of
  the seating surface above local ground; null = street level) as **CAPTURE-ONLY**
  (engine does not consume it yet) so venue data can be collected with elevation
  now; applied live + mirrored in the 8-2 contract SQL + `types.ts`. The
  elevation-aware (2.5D) engine follow-up is queued in `deferred-work.md`. Authored
  the canonical venue-data structure doc `nextjs-app/docs/venue-data-load.md`.

### File List

**Code (hardening):**
- `nextjs-app/lib/weather/met-no-service.ts` — UA from `MET_NO_USER_AGENT`; `validAt` on each slice; dropped dead `precip` var
- `nextjs-app/lib/solar/types.ts` — `WeatherSlice.validAt?`
- `nextjs-app/lib/services/sun-engine.ts` — `validAt` freshness/staleness; nearest-by-`validAt` selection; `mapWithConcurrency`, `createDedupedForecastFetcher`, `safeSeedOutcome`, `SUN_ENGINE_LIST_CONCURRENCY`; injectable forecast fetcher
- `nextjs-app/app/api/venues/route.ts` — concurrency-capped + deduped + per-venue-degrading real fan-out; `validateVenueUniqueness` keyed on id+slug (coord check removed)
- `nextjs-app/lib/services/venue-reviews-persistence.ts` — `.or()` operand quoting/escaping (`orFilterValue`)
- `nextjs-app/lib/services/venue-store.ts` — exported `VENUE_SELECT_COLUMNS`
- `nextjs-app/lib/supabase/types.ts` — regenerated from the live schema (replaced placeholder)

**Tests:**
- `nextjs-app/test/unit/weather/met-no-service.test.ts` — NEW (UA from env, ≤4-decimal coords, validAt)
- `nextjs-app/test/unit/services/sun-engine.test.ts` — validAt staleness + concurrency/dedupe
- `nextjs-app/test/unit/api/venues-route-real-engine.test.ts` — never-500 degrade
- `nextjs-app/test/unit/services/venue-store.test.ts` — query-contract assertions
- `nextjs-app/test/unit/api/venues-route.test.ts` — slug-uniqueness + co-located-coords tests
- `nextjs-app/test/unit/services/venue-reviews-persistence.test.ts` — `.or()` escaping (quoted + hostile-slug)

**Contracts (RLS authoring):**
- `_bmad-output/implementation-artifacts/8-2-venues-store-contract.sql` — `venues_service_read` policy + smoke check
- `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql` — §4b geodata RLS policies + import-batch grants + smoke checks

**Env/docs:**
- `nextjs-app/.env.example` — annotated secret-policy reconcile; dropped unused anon key
- `nextjs-app/docs/environment-variables.md` — reconciled (Met.no, flags, no-cron); dropped anon-key row
- `nextjs-app/docs/vercel-deployment.md` — reconciled (Met.no, real vercel.json, secrets)

**Deleted (dead code, maintainer-requested cleanup):**
- `nextjs-app/lib/supabase/client.ts` — unused anon client (no importers)
- `nextjs-app/lib/supabase/health.ts` — unused `createHealthClient` (no callers)

**Added/changed (post-gate, additive — venue elevation capture):**
- `nextjs-app/docs/venue-data-load.md` — NEW canonical venue-data structure + polygon/elevation guide
- `_bmad-output/implementation-artifacts/8-2-venues-store-contract.sql` — additive `seating_elevation_m` column
- `nextjs-app/lib/supabase/types.ts` — `seating_elevation_m` in venues Row/Insert/Update
- `_bmad-output/implementation-artifacts/deferred-work.md` — elevation-aware engine follow-up queued

**Added artifacts:**
- `_bmad-output/implementation-artifacts/8-5-security-advisor-triage-2026-06-22.md`
- `_bmad-output/implementation-artifacts/8-5-cutover-run-2026-06-22.md`

**Live DB (additive, via MCP with maintainer approval):** created+seeded `public.venues`; applied reviews/feedback/venues/shadow_casters/shadow_caster_import_batches RLS policies.

## Change Log

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-06-22 | 1.0 | Story 8.5 implemented (Amelia/Claude, Opus 4.8). DEV-implementable hardening + docs + live types regen + (maintainer-approved) additive live SQL applies. AC#1 secrets/no-leakage (.env.example + docs reconcile + source scan); AC#2 RLS policies authored into the contracts + applied live → advisor clear of rls_enabled_no_policy, only accepted PostGIS exceptions remain (triage artifact); AC#3 lib/supabase/types.ts regenerated from the live schema; AC#4 sun-engine concurrency cap + Met.no forecast dedupe + Promise.allSettled never-500 + weather validAt freshness fidelity + Met.no UA from config + venue uniqueness id/slug alignment + query-contract tests + reviews .or() escaping; AC#5 maintainer cutover runbook authored (NOT-YET-RUN). Migration-ledger: accept out-of-band model. Default (flag-off) path byte-identical; vitest 590→606 (+16, none dropped); tsc 0 / eslint 0; API-boundary + monetization scans clean; CI keeps zero live dependency. | Amelia/Claude (Dev) |
| 2026-06-21 | 0.1 | Story 8.5 drafted by Bob/Claude (SM) via bmad-create-story; backlog → ready-for-dev (epic-8 stays in-progress; not the 8-1-* story). Scope = the Epic-8 live cutover: per-environment secrets with no NEXT_PUBLIC leakage (AC#1); apply schema + RLS policies live & triage the Supabase security advisor, documenting the accepted PostGIS exceptions (AC#2); regenerate lib/supabase/types.ts from the live schema (AC#3); land the carried-in pre-cutover hardening — venue uniqueness-key alignment + query-contract tests (8.2 R2), sun-engine concurrency cap + forecast dedupe + Promise.allSettled + weather validAt freshness fidelity (8.3 R1), reviews .or() escaping (8.4 R1), Met.no UA from config (AC#4); maintainer-run live round-trips recorded in a runbook (AC#5, not required for done). Split into DEV-implementable (hardening + docs + types regen) and MAINTAINER-run (Vercel config + live SQL apply + round-trips). Grounded in a live read-only Supabase inspection: reviews/feedback/shadow_casters exist with RLS-on-zero-policies, venues does not exist yet, migration ledger empty, advisor shows the 4 actionable rls_enabled_no_policy INFOs + the standard PostGIS exceptions. No new env flag; no precompute/Cron (DECISION D); no anon client; default in-memory/seed path byte-identical (zero live CI dependency). Baseline 69 files / 590 tests (post-8.4 at b200e1d). | Bob/Claude (SM) |
