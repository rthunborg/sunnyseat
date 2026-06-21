---
baseline_commit: 059994a
drafted_at: 2026-06-21T00:00:00+02:00
drafted_by: Bob/Claude (SM, bmad-create-story)
---

# Story 8.4: Feedback & Review Persistence Enablement

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **Sequencing:** Fourth implementation story of Epic 8 "Wire Real Data" (after 8.1, 8.1.1, 8.2, 8.3 — all `done`). Epic 8 is `in-progress`; this is not the `8-1-*` story so the epic status does not change. Branch: `epic/8-wire-real-data`. Stories 3.2 (feedback) and 3.3 (reviews) already **built and merged** the server-only, env-gated persistence adapters and the manual SQL table contracts; this story **turns the live path on safely** by authoring the RLS policies the contracts deferred, proving the real round-trip, and carrying in the one deferred UX fix (silent review-photo rejection).
>
> **Scope boundary — this is RLS-AUTHORING + ENABLEMENT + one carried-in UX fix, NOT new adapter code.** The persistence adapters are already complete: `persistVenueFeedback` (write-only) in `lib/services/venue-feedback-persistence.ts`, and `persistVenueReview` / `getVenueReviewsFromPersistence` / `getReviewSummaryForVenueFromPersistence` (read + write) in `lib/services/venue-reviews-persistence.ts`. Both are env-gated (`SUNNYSEAT_FEEDBACK_PERSISTENCE=supabase` / `SUNNYSEAT_REVIEW_PERSISTENCE=supabase`), fail-closed on incomplete creds, and the routes **already call the `*FromPersistence` variants**. The flags are already documented in `.env.example`. So 8.4 does **NOT**: rewrite the adapters, add a new env flag, change DTO shapes, build an anon Supabase client, add admin/moderation/upload surfaces, change rate-limit/caching, run the Supabase security advisor, or regenerate `lib/supabase/types.ts` (**Story 8.5** owns the advisor + type regen + production env). 8.4 **DOES**: author the `reviews` + `feedback` RLS policies (the contract SQL files currently have **no** RLS section), carry in the R2-D1 photo-rejection announcement, add/extend boundary-mocked tests, and add a maintainer-run live round-trip check.
>
> **CI must have ZERO live-Supabase dependency.** Exactly like the `SUNNYSEAT_VENUE_STORE` (8.2) and `SUNNYSEAT_SUN_ENGINE` (8.3) adapters, the live persistence path is opt-in via the env flags. **The default (no flag) path keeps the in-memory fixture/seed behaviour byte-identical.** This is non-negotiable: the `feedback` / `review` Playwright specs (which `page.route(...)`-intercept the network) and the Vitest route/service tests (`venue-feedback-route`, `reviews-route`, `venue-feedback-persistence`, `venue-reviews-persistence`) must keep passing with **no live database**. The live cutover (per-environment secrets, advisor, types) is finalized by Story 8.5.

## Story

As a **product owner**,
I want feedback and reviews to persist to Supabase,
So that real user input is captured durably.

## Acceptance Criteria

1. **Existing adapters read/write Supabase behind the flags; in-memory stays the test default.**
   **Given** the `feedback` (Story 3.2) and `reviews` (Story 3.3) contract tables exist with RLS enabled
   **When** `SUNNYSEAT_FEEDBACK_PERSISTENCE=supabase` and `SUNNYSEAT_REVIEW_PERSISTENCE=supabase` are set
   **Then** the existing server-only persistence adapters write to and read from Supabase, and the in-memory fallback remains the default for tests

2. **RLS policies match the access model (Supabase security checklist).**
   **Given** RLS policies must match the access model
   **When** policies are authored
   **Then** `reviews` gets a public read policy (anonymous public content) with writes restricted to the server `service_role`, and `feedback` writes stay server-only (no public/anon write policy); policies follow the Supabase security checklist (no `USING (true)` write policies, explicit `TO` clauses)

3. **Suites stay CI-offline; a separate integration check verifies the real round-trip.**
   **Given** the existing review/feedback E2E and unit suites
   **When** persistence is enabled
   **Then** the suites pass against intercepted/fixture data with no live Supabase dependency in CI, and a separate integration check verifies the real round-trip

**Design Gate Criteria (Epic 8 overall — no new screen, with ONE additive announced state):**
- **Visual:** No new screen and no new visual *reference*. This is a data/infra swap behind the existing UI; the five existing gate states (`map-with-selected-venue`, `venue-detail` mobile/desktop, `feedback`, `review`) + `map-primary` are reused. **Exception (R2-D1):** the `review` screen gains one additive **announced** state — a localized rejection message in the existing always-mounted `role="status"` region when a review photo is refused. This text was previously silently dropped; surfacing it is the fix. It must be validated for a11y (screen-reader announcement) and visual correctness, but it does not introduce a new screen ID.
- **Behaviour:** Every existing screen behaves identically on the **default (flag-off) path** — byte-identical to today (in-memory fixture/seed). Loading/empty/error states already built in Epics 1–3 handle real latency and the `503` persistence-unavailable degrade. The only intended behaviour change is the R2-D1 rejection announcement.
- **Animation:** Not applicable.
- **Visual validation:** Re-run the five existing gate states + `map-primary` via `story-review.sh` / `visual-validate.sh`; expect **no rebaseline** for all except the `review` state, where the new rejection-message announcement may legitimately change the rendered output when a photo is refused. Validate the `review` state's normal layout is unchanged (no rebaseline of the resting state) and verify the new announced state separately (a11y + screenshot of the refusal). Any genuine resting-state visual change requires explicit accept-with-rationale + `REBASELINE-LOG.md` per AGENTS.md.

## Tasks / Subtasks

- [ ] **Task 1: Baseline, context, and confirm the enablement seam** (AC: #1, #2, #3)
  - [ ] 1.1 Confirm branch `epic/8-wire-real-data`. Run `cd nextjs-app && npx.cmd tsc --noEmit`, `cd nextjs-app && npx.cmd eslint . --quiet`, `cd nextjs-app && npx.cmd vitest run` (record the baseline file/test counts — expected **69 files / 583 tests** as of Story 8.3 Round 1) before any change; if anything reports an error outside story scope, stop and surface it.
  - [ ] 1.2 Read: `AGENTS.md` (§API Boundary, §Future Monetization, §Testing Requirements, §Dev-Only Conventions, §Secrets, §BMAD Story Workflow, §Local Docker/WSL), `project-context.md` (Screen ID → Route Map for `feedback`/`review`; `test-venue-sunny`; "no live Supabase in CI"), this story, `_bmad-output/planning-artifacts/epics.md` §"Epic 8 / Story 8.4" (+ §"Story 8.5" for the boundary), `architecture.md` §"Authentication & Security" / §"Admin removal correction" / §"Caching Strategy", the Story 3.2 + 3.3 + 3.4 files, the Story 8.2 + 8.3 files (for the env-gate + RLS-contract precedent), and the source (Dev Notes "Code surface").
  - [ ] 1.3 **Confirm the adapters + routes are already wired (no adapter rewrite needed).** Verify: `app/api/venues/[slug]/feedback/route.ts` POST calls `persistVenueFeedback`; `app/api/reviews/route.ts` GET calls `getVenueReviewsFromPersistence` + `summarizeReviews` and POST calls `persistVenueReview`; `app/api/venues/[slug]/route.ts` GET calls `getReviewSummaryForVenueFromPersistence` (wrapped in try/catch → `reviewSummary` undefined on throw, NOT a 500). If any route is NOT calling the `*FromPersistence` variant, wire it; otherwise record "already wired" and proceed. **Do not change request/response shapes, rate-limit, or caching.**
  - [ ] 1.4 **Confirm the access-model decision (RATIFIED by AC #2 — record, do not re-open):** `reviews` = RLS enabled + **public SELECT** (anonymous public content) + **service_role INSERT** (explicit `TO`, `with check`, never `USING (true)`); `feedback` = RLS enabled + **service_role INSERT only**, **no anon/public policy of any kind** (write-only sink; never publicly readable). The runtime keeps reading/writing via the **service-role client** (which bypasses RLS) — the public-read policy is the access-model contract + enables a future anon read path; **do NOT build an anon Supabase client or switch the runtime read path in this story** (no anon client exists; that is out of scope).

- [ ] **Task 2: Author the RLS policies (the net-new DB work)** (AC: #2)
  - [ ] 2.1 Extend `_bmad-output/implementation-artifacts/3-3-reviews-contract.sql` with an **additive, idempotent** RLS section (mirror the deny-by-default block in `8-2-venues-store-contract.sql` §3 — `enable row level security` → `revoke all … from anon, authenticated, public` → explicit grants): enable RLS; `grant select on public.reviews to anon, authenticated`; `grant select, insert on public.reviews to service_role`; `create policy reviews_public_read for select to anon, authenticated using (true)` (read-only public content — `USING (true)` is acceptable for SELECT); `create policy reviews_service_write for insert to service_role with check (true)` (writes scoped via `TO service_role`, never `USING (true)`). Replace the file's trailing "Public read/RLS policies should be reviewed before enabling" comment with the authored policies. Keep the existing table/index DDL unchanged.
  - [ ] 2.2 Extend `_bmad-output/implementation-artifacts/3-2-feedback-contract.sql` with the **server-only** RLS section: enable RLS; `revoke all … from anon, authenticated, public`; `grant insert on public.feedback to service_role`; `create policy feedback_service_write for insert to service_role with check (true)`. **No anon/public/authenticated policy** — feedback is a write-only sink, never publicly readable.
  - [ ] 2.3 Add end-of-file smoke checks mirroring the `8-2-venues-store-contract.sql` §6 pattern (query `pg_policies` / `information_schema.role_table_grants`) asserting: `reviews` has exactly `reviews_public_read` (select, anon+authenticated) and `reviews_service_write` (insert, service_role) and NO anon/authenticated INSERT/UPDATE/DELETE; `feedback` has only `feedback_service_write` and NO anon/authenticated/public policy. Keep the files header-marked "Not applied automatically" (manual-run contract; the **live apply is deferred to the maintainer / Story 8.5 cutover** — see Task 5.x).
  - [ ] 2.4 Verify the SQL is valid against a local PostGIS instance if convenient (project-local `compose.yaml`/`compose.test.yaml` per AGENTS.md — **do not** make global Docker/WSL changes), OR statically self-review for the Supabase security-checklist rules (no `USING (true)` on any write policy; every policy has an explicit `TO`; no `for all` policies; deny-by-default preserved). Record which verification was done.

- [ ] **Task 3: Confirm live read/write correctness on the opt-in path (no adapter rewrite)** (AC: #1)
  - [ ] 3.1 Confirm the `reviews` adapter live read uses the index-backed `.or('venue_id.eq.{id},venue_slug.eq.{slug}').order('created_at', { ascending: false })` and that the live read **excludes** the fixture seeds (clean swap — fixtures are default-path only). Confirm `persistVenueReview` inserts via `.from('reviews').insert(...).select('id, created_at').single()` and merges the returned id/createdAt. No behaviour change expected — record "confirmed".
  - [ ] 3.2 Confirm `persistVenueFeedback` inserts via `.from('feedback').insert(toFeedbackInsertRow(...)).select('id, created_at').single()` and that the route maps an adapter throw to a `503` ("Feedback persistence unavailable"), and the reviews routes map a throw to `503`, while the venue-detail review summary degrades to `undefined` (not a 500). No change — record "confirmed".
  - [ ] 3.3 Confirm both adapters fail-closed (throw a typed error) when their flag is `supabase` but `hasSupabaseServiceRoleConfig()` is false, and that the default (flag off) path uses the in-memory `memory*` arrays + fixture seeds. No change — record "confirmed".

- [ ] **Task 4: Carry-in R2-D1 — announce a localized review-photo rejection** (AC: #3 design-gate; carried from Story 3.4 code review Round 2)
  - [ ] 4.1 In `nextjs-app/components/composed/feedback/ReviewForm.tsx`, change the photo `<input onChange>` rejection branch (~L187-204): when `isSafeOptionalPhoto(file)` returns false (0-byte, non-`image/*`, >5 MB, blank or >120-char name), instead of silently calling `setPhoto(undefined)` + clearing the input, surface a localized rejection message in the **existing always-mounted `role="status"` region** (~L219-229) so sighted and screen-reader users are told the photo was refused. Keep the input cleared. Do not change the success ("Selected photo: {name}") path.
  - [ ] 4.2 Add a new `next-intl` key `review.form.photoRejected` to **both** `nextjs-app/messages/sv/feedback.json` and `nextjs-app/messages/en/feedback.json` (sv default; matter-of-fact tone, no exclamation/apology per the 3.2 copy convention — e.g. sv: "Fotot kunde inte läggas till. Välj en bildfil under 5 MB."). Extend the `ReviewFormLabels` type (~L20-36) with the new label and thread it through. Keep sv/en parity (pinned by `test/unit/messages-parity.test.ts`).
  - [ ] 4.3 Do not leak geodata/internal details in the copy (3.0.6 rule). Keep the message generic and user-actionable (file type/size guidance), not technical (no MIME strings, no byte counts beyond the human "5 MB").

- [ ] **Task 5: Tests + integration round-trip + docs** (AC: #1, #2, #3)
  - [ ] 5.1 **Default path (unchanged green):** the existing `venue-feedback-route` / `reviews-route` Vitest tests and `feedback` / `review` Playwright specs must stay green **unchanged** (prove the in-memory default is untouched). Do not weaken them.
  - [ ] 5.2 **Live path (flag on, boundary-mocked — no live Supabase):** extend `test/unit/services/venue-reviews-persistence.test.ts` and `venue-feedback-persistence.test.ts` (they already `vi.mock('@/lib/supabase/server', …)`): assert the live insert/select chain shapes, the `or(...).order('created_at', desc)` read, fixture-seed exclusion on the live read, nullable photo-column omission, and the fail-closed throw when creds are incomplete. Mock at the **`@/lib/supabase/server` adapter boundary** (single-call lazy import — reliable; see the [[reference_vitest_dynamic_import_mock_bypass]] note: do not rely on intercepting concurrent dynamic imports).
  - [ ] 5.3 **R2-D1 component test:** add/extend a `ReviewForm` test asserting the `role="status"` region announces the localized `photoRejected` message when a refused photo is picked (oversized / non-image / 0-byte / over-long name) and that `photo` state is cleared. Keep `messages-parity` green (new key in both locales).
  - [ ] 5.4 **Integration round-trip (maintainer-run, OPTIONAL — NOT required for done; deferred to the maintainer):** with `SUNNYSEAT_REVIEW_PERSISTENCE=supabase` + `SUNNYSEAT_FEEDBACK_PERSISTENCE=supabase` + Supabase service-role config set locally against the live project, (a) POST a review and a feedback through the routes; (b) read the review back via `GET /api/reviews` (proves `persistVenueReview` + `getVenueReviewsFromPersistence` round-trip); (c) confirm — using an **anon** key/client outside the app — that `reviews` is anon-SELECTable but `feedback` is **not** anon-readable and neither table is anon-writable (proves the RLS policies). Record the outcome (no secrets/connection strings) in a short run note `_bmad-output/implementation-artifacts/8-4-persistence-enablement-run-<date>.md`. Story `done`-ness does **not** require this run — the offline default-path CI gates satisfy `done`; the live cutover is finalized by Story 8.5.
  - [ ] 5.5 The persistence flags are already documented in `nextjs-app/.env.example` (`SUNNYSEAT_FEEDBACK_PERSISTENCE`, `SUNNYSEAT_REVIEW_PERSISTENCE`). Confirm the wording still matches the enabled behaviour (reviews read+write; feedback write-only); update only if stale. **Do not** add a new env flag.

- [ ] **Task 6: Final verification gate** (AC: all)
  - [ ] 6.1 `cd nextjs-app && npx.cmd tsc --noEmit` (0) ; `cd nextjs-app && npx.cmd eslint . --quiet` (0) ; `cd nextjs-app && npx.cmd vitest run` (≥ baseline 69 files / 583 tests; rises with the new R2-D1 + live-path tests — must not drop; default-path route/service tests stay byte-identical green).
  - [ ] 6.2 `cd nextjs-app && npx.cmd playwright test` — `feedback` + `review` specs (and the broader real-route/mocked specs) pass against the **default in-memory path** with no live Supabase.
  - [ ] 6.3 Visual validation for the five gate states + `map-primary`: expect **no rebaseline** for the resting states. For the `review` state, validate the new photo-rejection announced state separately (a11y: the `role="status"` region announces; screenshot the refusal). If the resting `review`/`feedback` references are unchanged, do not rebaseline; if the rejection state needs a reference, capture it with accept-with-rationale + `REBASELINE-LOG.md` per AGENTS.md.
  - [ ] 6.4 Run the API-boundary scan + MVP monetization quarantine scan (Epic 8 guardrails): zero client→backend boundary hits (no `components/`/`hooks/` import of `lib/supabase`/`lib/services/*persistence`), zero monetization hits. Move the story `in-progress → review` only via `scripts/story-review.sh` (`.\scripts\run-sh.ps1 scripts/story-review.sh 8-4-feedback-review-persistence-enablement`) — never edit sprint-status directly to `review`.

## Dev Notes

### The 3.2/3.3 → 8.4 seam (read this first)
Stories 3.2 and 3.3 shipped the full persistence machinery; 8.4 only turns it on safely. **The adapter code is complete and the routes already call it** — the one true gap is the DB-side RLS, which the contract SQL files explicitly deferred (3-3 trailing comment: *"Public read/RLS policies should be reviewed before enabling Supabase-backed writes in a real environment."*). Do not rebuild adapters or wiring; author policies, fix R2-D1, test, verify.

- **Feedback** (`lib/services/venue-feedback-persistence.ts`): **write-only.** `persistVenueFeedback(feedback)` → memory by default; on `SUNNYSEAT_FEEDBACK_PERSISTENCE=supabase` (+ creds) lazy-imports `@/lib/supabase/server`, `getSupabaseServiceRole().from('feedback').insert(toFeedbackInsertRow(feedback)).select('id, created_at').single()`. Fail-closed throw if flag on + creds incomplete. Test helpers: `clearPersistedVenueFeedbackForTests()`, `getPersistedVenueFeedbackForTests()`. No read-back path (feedback is never displayed).
- **Reviews** (`lib/services/venue-reviews-persistence.ts`): **read + write.** Write: `persistVenueReview(review)` → `.from('reviews').insert(toReviewInsertRow(...)).select('id, created_at').single()`. Read: `getVenueReviewsFromPersistence(venue)` / `getReviewSummaryForVenueFromPersistence(venue)` → `.from('reviews').select('id, venue_id, venue_slug, text, rating, photo_name, photo_type, photo_size, photo_last_modified, created_at').or('venue_id.eq.{id},venue_slug.eq.{slug}').order('created_at', { ascending: false })`. Default path = `fixtureReviewSeeds` (7 hardcoded Swedish seeds keyed by venue id '1'..'7') + in-memory `memoryReviews`. The live read **excludes** the fixture seeds (clean swap). `summarizeReviews(reviews)` → `{ averageRating (1 dp | null), reviewCount }`.
- **Env gate (house style, mirror 8.2/8.3):** `usesSupabaseFeedbackPersistence()` / `usesSupabaseReviewPersistence()` read `process.env.SUNNYSEAT_*_PERSISTENCE === 'supabase'`; `hasSupabaseServiceRoleConfig()` = `Boolean(NEXT_PUBLIC_SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)` (currently duplicated locally in each adapter — leave as-is; centralizing is out of scope).
- **Supabase client** (`lib/supabase/server.ts`): `getSupabaseServiceRole()` builds a memoized `createClient(url, SERVICE_ROLE_KEY, { auth: { autoRefreshToken:false, persistSession:false } })`. **The service-role client bypasses RLS.** There is **no anon/public client** in the app (the `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.example` is unused). → The runtime works regardless of RLS; the policies you author are the access-model contract + future anon path, not what the server uses.

### RLS authoring guide (AC #2 — the net-new DB work)
The live tables already exist with **RLS enabled but no policies** (deny-all to anon/authenticated; service_role bypasses). 8.4 formalizes the policies in the contract SQL artifacts and (optionally, maintainer) applies them live. **There is no existing `create policy` statement in the repo to copy** — every prior contract uses grant/revoke only (because all access is service-role). Mirror the deny-by-default privilege block from `8-2-venues-store-contract.sql` §3, then add the policies. Target shape (adapt names/columns to the contracts):

```sql
-- reviews: anonymous public content (public read, server-only write)
alter table public.reviews enable row level security;
revoke all on table public.reviews from anon, authenticated, public;
grant select on table public.reviews to anon, authenticated;     -- base privilege for the read policy
grant select, insert on table public.reviews to service_role;

create policy reviews_public_read
  on public.reviews for select
  to anon, authenticated
  using (true);                       -- read-only PUBLIC content; USING(true) OK for SELECT

create policy reviews_service_write
  on public.reviews for insert
  to service_role
  with check (true);                  -- write scoped via TO service_role, NOT USING(true)

-- feedback: server-only write sink (never publicly readable)
alter table public.feedback enable row level security;
revoke all on table public.feedback from anon, authenticated, public;
grant insert on table public.feedback to service_role;

create policy feedback_service_write
  on public.feedback for insert
  to service_role
  with check (true);
```

**Security-checklist rules the AC names:** `USING (true)` is acceptable **only** for the `reviews` public **SELECT** policy (it is genuinely public content); every **write/insert** policy must scope via an explicit `TO service_role` + `with check`, never `USING (true)`. No `for all` policies. Deny-by-default preserved (revoke-all first). **Do NOT** author any anon/authenticated INSERT/UPDATE/DELETE policy on either table, and **no** anon/public policy of any kind on `feedback`.

**8.4 vs 8.5 boundary (do not cross):** 8.4 **authors** the `create policy` statements (its AC #2). **Story 8.5** runs/triages the Supabase **security advisor** (confirms the policies are sufficient; documents accepted PostGIS exceptions `spatial_ref_sys` / `postgis`-in-public / `st_estimatedextent`) and **regenerates `lib/supabase/types.ts`** from the live schema (replacing the placeholder). Do **not** run the advisor or regen types here. (Story 8.3's guardrail line "do not author public/anon RLS policies (Story 8.5)" is superseded by this story's AC #2 — authoring belongs to 8.4; advisor/types stay 8.5.)

### R2-D1 carry-in — review-photo rejection announcement (from Story 3.4 code review Round 2)
`nextjs-app/components/composed/feedback/ReviewForm.tsx`:
- `isSafeOptionalPhoto(file)` (~L282-288) accepts only: non-blank name, name ≤120 chars (`PHOTO_NAME_MAX_LENGTH`), `type` starts with `image/`, `size > 0`, `size ≤ 5 MB` (`PHOTO_MAX_BYTES`).
- Current rejection branch (~L187-204): `setPhoto(undefined)` + `event.currentTarget.value = ''` + `return` — **silent.** The user (sighted or screen-reader) is told nothing; the Camera button appears to do nothing.
- The fix surfaces a localized message in the **existing always-mounted `<p role="status">`** (~L219-229; kept always-mounted on purpose — a live region inserted *with* content isn't reliably announced). Today that region renders `formatTemplate(labels.photoSelected, { name })` on success and `null` otherwise; add a rejection branch that renders the new `photoRejected` label.
- i18n: add `review.form.photoRejected` to `messages/sv/feedback.json` + `messages/en/feedback.json` (keys live under `review.form.*`: `photo`, `photoSelected`, …). Extend `ReviewFormLabels` (~L20-36) and thread the label in. Matter-of-fact tone (3.2 convention); generic + actionable (file type/size), no technical/geodata leakage (3.0.6).
- **This entry is removed from `deferred-work.md` as part of drafting this story** (queue-not-archive convention); it remains recorded in `epics.md` under Story 8.4.

### Existing patterns to mirror (do not reinvent)
- **Env-gated adapter + contract SQL** — `8-2-venues-store-contract.sql` (deny-by-default RLS block §3; idempotent `create … if not exists`; end-of-file smoke checks §6) and the 8.2/8.3 story structure (scope-boundary banner, Design Gate block, Test gate, Scope guardrails).
- **Boundary-mock test pattern** — `test/unit/services/venue-reviews-persistence.test.ts` already `vi.mock('@/lib/supabase/server', () => ({ getSupabaseServiceRole: () => ({ from: supabaseMocks.from }) }))` with `vi.unstubAllEnvs()` per test. Mock the adapter boundary, not the dynamic import ([[reference_vitest_dynamic_import_mock_bypass]]).
- **Maintainer-run integration note** — Story 8.3 Task 6.5 (optional, not required for done; record a short run note under `_bmad-output/implementation-artifacts/`, no secrets). 8.1/8.1.1 import-run notes are the artifact shape.
- **Route degrade contracts** — feedback/reviews adapter throw → `503`; venue-detail review summary throw → `undefined` (silent degrade, not 500). Keep these.

### Architecture alignment
- **API boundary (must not be violated):** client components never import `lib/supabase`/`lib/services/*persistence`; access is via `app/api/*` + `hooks/queries|mutations`. Query keys from `lib/query-keys.ts`. [Source: AGENTS.md §API Boundary]
- **Anonymous, zero-PII public content:** reviews are anonymous public consumer content (no user_id/email/name/coordinates/raw IP/moderation/payment). [Source: architecture.md §Authentication & Security; 3-3-reviews-contract.sql trailing comment]
- **Server-only service role bypasses RLS:** reads/writes work under deny-by-default RLS; the public-read policy is the access-model contract. [Source: architecture.md §Admin removal correction; lib/supabase/server.ts]
- **No admin/moderation surface:** retired by the 2026-05-30 product decision; persistence is backend infrastructure, not admin functionality. [Source: architecture.md §Admin removal correction]
- **Caching:** `GET /api/reviews` is `Cache-Control: no-store`; the venue-detail review summary rides the existing detail-route caching. Do not change. [Source: app/api/reviews/route.ts; architecture.md §Caching Strategy]

### Scope guardrails (do NOT)
- Do not rewrite the persistence adapters or change DTO shapes, query keys, request/response bodies, rate-limit, or caching/`no-store` behaviour.
- Do not build an anon Supabase client or switch the runtime read path to anon — the public-read policy is authored for the access model; the runtime keeps using the service-role adapter.
- Do not run/triage the Supabase security advisor or regenerate `lib/supabase/types.ts` (**Story 8.5**).
- Do not add a new env flag (the two persistence flags already exist), add admin/moderation/upload surfaces, or add binary photo Storage (reviews carry photo **metadata** only).
- Do not introduce a live-Supabase dependency into CI/tests; the default path is in-memory/fixture and must stay byte-identical. Do not set `SUNNYSEAT_*_PERSISTENCE=supabase` in any committed test/CI config.
- Do not commit secrets/connection strings; `.env.local` stays gitignored (production env is Story 8.5). Do not make global Docker/WSL/daemon changes (AGENTS.md §Local Docker/WSL).
- Do not change feedback dedupe (client-side `sessionStorage`) or the visual references for resting states.

### Project Structure Notes
- **Modified (SQL contracts):** `_bmad-output/implementation-artifacts/3-3-reviews-contract.sql` (+ RLS section, Task 2.1/2.3), `_bmad-output/implementation-artifacts/3-2-feedback-contract.sql` (+ RLS section, Task 2.2/2.3). Additive + idempotent; header stays "Not applied automatically".
- **Modified (R2-D1 UX):** `nextjs-app/components/composed/feedback/ReviewForm.tsx`, `nextjs-app/messages/sv/feedback.json`, `nextjs-app/messages/en/feedback.json` (+ the `ReviewForm` test).
- **Likely confirm-only (no change expected):** `lib/services/venue-feedback-persistence.ts`, `lib/services/venue-reviews-persistence.ts`, the three routes, `.env.example`.
- **Added (optional, maintainer):** `_bmad-output/implementation-artifacts/8-4-persistence-enablement-run-<date>.md` (integration round-trip note).
- **Untouched:** `lib/supabase/types.ts` (regen is 8.5), the sun engine / venue store (8.2/8.3), `shadow_casters` (8.1/8.1.1), component layers other than `ReviewForm`.

### References
- [Source: CLAUDE.md] → [Source: AGENTS.md] (§API Boundary, §Future Monetization, §Testing Requirements, §Dev-Only Conventions, §Secrets, §BMAD Story Workflow, §Local Docker/WSL)
- [Source: project-context.md] (Screen ID → Route Map: `feedback` `/?venue=test-venue-sunny&_state=feedback`, `review` `/?venue=test-venue-sunny&_state=review`; `test-venue-sunny`; no-live-Supabase-in-CI)
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 8 — Story 8.4: Feedback & Review Persistence Enablement] (the 3 ACs + deferred-items note) and [#Story 8.5] (advisor + types boundary)
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security] / [#Admin removal correction] / [#Caching Strategy]
- [Source: _bmad-output/implementation-artifacts/3-2-sun-accuracy-feedback.md] and [3-2-feedback-contract.sql] (feedback adapter + table)
- [Source: _bmad-output/implementation-artifacts/3-3-venue-reviews.md] and [3-3-reviews-contract.sql] (reviews adapter + table + the deferred RLS comment)
- [Source: _bmad-output/implementation-artifacts/3-4-*.md#Review Findings R2-D1] (the carried-in photo-rejection item)
- [Source: _bmad-output/implementation-artifacts/8-2-venues-store-contract.sql §3, §6] (deny-by-default RLS block + smoke checks to mirror)
- [Source: _bmad-output/implementation-artifacts/8-2-real-venue-store-api.md] and [8-3-real-sun-shadow-weather-computation.md] (Epic-8 env-gate + story structure + Test gate + maintainer-run integration precedent)
- [Source: nextjs-app/lib/services/venue-feedback-persistence.ts] and [venue-reviews-persistence.ts] (the adapters — confirm, don't rewrite)
- [Source: nextjs-app/lib/supabase/server.ts] (service-role client; bypasses RLS; no anon client)
- [Source: nextjs-app/app/api/venues/[slug]/feedback/route.ts], [nextjs-app/app/api/reviews/route.ts], [nextjs-app/app/api/venues/[slug]/route.ts] (already call the `*FromPersistence` adapters)
- [Source: nextjs-app/components/composed/feedback/ReviewForm.tsx] and [nextjs-app/messages/{sv,en}/feedback.json] (R2-D1 fix surface)
- [Source: nextjs-app/lib/types/api.ts] (ReviewDto / ReviewSummaryDto / FeedbackResponse — frozen shapes)
- [Source: nextjs-app/docs/design/DESIGN.md] (scoped to R2-D1: the existing `role="status"` region + status/error text tokens the rejection message reuses — no new visual design is introduced)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] (scoped to R2-D1: the `feedback`/`review` screen, the photo-upload affordance, and the a11y / live-region + Swedish copy conventions the rejection announcement must follow)
- _No new screen or visual reference is introduced._ The only UI delta is the R2-D1 rejection announcement on the existing `review` screen (validate a11y + that the resting layout is unchanged → no rebaseline of resting states).

### Test gate (must pass before `review`)
- `cd nextjs-app && npx.cmd tsc --noEmit` (0 errors)
- `cd nextjs-app && npx.cmd eslint . --quiet` (0 errors)
- `cd nextjs-app && npx.cmd vitest run` (≥ baseline 69 files / 583 tests; rises with new R2-D1 + live-path tests; default-path route/service tests stay byte-identical green)
- `cd nextjs-app && npx.cmd playwright test` (`feedback` + `review` + real-route specs green against the default in-memory path; no live Supabase)
- Visual validation: `map-with-selected-venue` (mobile), `venue-detail` (mobile + desktop), `feedback` (mobile), `review` (mobile), `map-primary` (mobile) — no rebaseline of resting states; validate the new `review` photo-rejection announced state separately (a11y + screenshot)
- `.\scripts\run-sh.ps1 scripts/story-review.sh 8-4-feedback-review-persistence-enablement`
- API-boundary scan + MVP monetization quarantine scan (zero hits)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-06-21 | 0.1 | Story 8.4 drafted by Bob/Claude (SM) via bmad-create-story; backlog → ready-for-dev (epic-8 stays in-progress; not the 8-1-* story). Scope = enable the already-built feedback/review persistence adapters safely: author the `reviews` (public read + service_role write) and `feedback` (server-only write) RLS policies the 3.2/3.3 contracts deferred; carry in R2-D1 (localized review-photo rejection announcement); add boundary-mocked live-path + R2-D1 tests + a maintainer-run integration round-trip; keep the in-memory default byte-identical (zero live-Supabase CI dependency). 8.5 owns the security advisor + types regen + production env. Baseline 69 files / 583 tests (post-8.3 R1). | Bob/Claude (SM) |
