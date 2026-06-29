# Story 8.5 — Supabase Security Advisor Triage & No-Leakage Scan (2026-06-22)

**Project:** SunnySeat live Supabase (central MVP, project ref kept out of the repo).
**Run by:** Amelia/Claude (dev agent) via the Supabase MCP, with maintainer approval to apply the additive cutover SQL live.
**Status:** Advisor clean of all actionable findings; remaining items are the documented, accepted PostGIS platform exceptions.

This artifact satisfies **AC#2** (RLS policies applied; advisor clean except documented PostGIS exceptions) and records the **AC#1** no-`NEXT_PUBLIC_`-secret-leakage scan (Task 2.2) and the migration-ledger decision (Task 3.4).

---

## 1. What was applied live (additive, non-disruptive)

Applied via `execute_sql` (raw SQL, no migration-ledger entry — see §4), all idempotent:

- **`public.venues`** — created from `8-2-venues-store-contract.sql` (schema + `idx_venues_slug` + additive `seating_area jsonb`), seeded byte-identical with the 7 fixture venues, RLS enabled, deny-by-default grants, + **`venues_service_read`** (SELECT, service_role).
- **`public.reviews`** — applied the 8.4 `reviews_public_read` (SELECT, anon+authenticated) + `reviews_service_write` (INSERT, service_role) policies from `3-3-reviews-contract.sql`.
- **`public.feedback`** — applied the 8.4 `feedback_service_write` (INSERT, service_role; no anon/public read) policy from `3-2-feedback-contract.sql`.
- **`public.shadow_casters` / `public.shadow_caster_import_batches`** — added the Story 8.5 `*_service_read` (SELECT, service_role) policies from `3-0-2-shadow-caster-schema-rpc-contract.sql §4b` + the import-batch privileges.

> The app stays on the in-memory/seed path until the maintainer flips the
> `SUNNYSEAT_*` flags + sets `SUPABASE_SERVICE_ROLE_KEY` in Vercel, so these
> applies are non-disruptive to the running production app. `service_role`
> bypasses RLS, so the runtime works regardless; these policies define the
> access model and clear the advisor's `rls_enabled_no_policy` INFOs.

### Post-apply state (verified)

| Table | RLS | Policies |
|---|---|---|
| `venues` | enabled | `venues_service_read` (SELECT, service_role) |
| `reviews` | enabled | `reviews_public_read` (SELECT, anon+authenticated), `reviews_service_write` (INSERT, service_role) |
| `feedback` | enabled | `feedback_service_write` (INSERT, service_role) |
| `shadow_casters` | enabled | `shadow_casters_service_read` (SELECT, service_role) |
| `shadow_caster_import_batches` | enabled | `shadow_caster_import_batches_service_read` (SELECT, service_role) |

The four `rls_enabled_no_policy` INFOs (reviews, feedback, shadow_casters, shadow_caster_import_batches) are **cleared**, and the newly-created `venues` table did not introduce a new one (it shipped with `venues_service_read`).

---

## 2. Security advisor — accepted PostGIS exceptions (post-apply)

`get_advisors({ type: "security" })` after the apply returns **only** the standard PostGIS platform exceptions. Each is accepted with rationale:

| Lint | Object | Level | Accepted because | cache_key |
|---|---|---|---|---|
| `rls_disabled_in_public` (0013) | `public.spatial_ref_sys` | ERROR | PostGIS system table owned by `supabase_admin`; we cannot `ALTER` it to enable RLS (insufficient privilege), and it holds only public SRID reference data. | `rls_disabled_in_public_public_spatial_ref_sys` |
| `extension_in_public` (0014) | `postgis` extension | WARN | PostGIS is installed in `public`; relocating an installed PostGIS extension to another schema is unsupported post-install and would break the existing geometry columns / RPC. | `extension_in_public_postgis` |
| `anon_security_definer_function_executable` (0028) | `st_estimatedextent(text,text)` / `(text,text,text)` / `(text,text,text,boolean)` | WARN ×3 | PostGIS-shipped `SECURITY DEFINER` C functions; we do not own them and they expose only extent estimates over already-server-only geometry. Not in our API surface intentionally. | `..._st_estimatedextent_text, text` / `..._text, text, text` / `..._text, text, text, boolean` |
| `authenticated_security_definer_function_executable` (0029) | `st_estimatedextent(text,text)` / `(text,text,text)` / `(text,text,text,boolean)` | WARN ×3 | Same as 0028, for the `authenticated` role. PostGIS-owned; not our function. | `..._st_estimatedextent_text, text` / `..._text, text, text` / `..._text, text, text, boolean` |

These match the pre-existing/expected PostGIS exception set from the 8.1/8.2/8.4 notes. No application-owned object is flagged.

### Performance advisor

`get_advisors({ type: "performance" })` returns **only** `unused_index` INFOs — expected pre-launch and **kept** (do not drop):

- `idx_shadow_casters_bbox_3007`, `idx_shadow_casters_centroid_3007`, `idx_shadow_casters_caster_class` — geodata helper indexes not yet exercised at runtime.
- `reviews_venue_created_at_idx` — `reviews` has 0 rows pre-launch; the index backs the live read path once reviews exist.

---

## 3. No-`NEXT_PUBLIC_`-secret-leakage scan (AC#1 / Task 2.2)

Source scan over `app/ components/ hooks/ lib/` (excluding tests), reflecting the post-gate dead-code cleanup (see the note below):

- **Only one `NEXT_PUBLIC_` var is read in code:** `NEXT_PUBLIC_SUPABASE_URL` (public project URL). `NEXT_PUBLIC_SUPABASE_ANON_KEY` is **no longer read anywhere** — the only consumer (`lib/supabase/client.ts`) was deleted in the post-gate cleanup and the var was dropped from `.env.example`/`docs`. No secret carries a `NEXT_PUBLIC_` prefix.
- **`SUPABASE_SERVICE_ROLE_KEY`** is read only in server-only `lib/` modules — `lib/supabase/server.ts` and the env-gate helpers in `lib/services/{venue-store,sun-engine,venue-reviews-persistence,venue-feedback-persistence}.ts`. **Zero** references in `components/` or `hooks/`. (The previously-listed `lib/supabase/health.ts` was deleted in the post-gate cleanup and no longer exists.)
- **`MET_NO_USER_AGENT`** is read only in `lib/weather/met-no-service.ts` (server-only); it is a non-secret public identifier, correctly NOT `NEXT_PUBLIC_`.
- **`SUNNYSEAT_*` flags** are read only in the server-only `lib/services/*` adapters. **Zero** in `components/`/`hooks/`.
- The API-boundary scan (Task 8.4) independently enforces that client layers never import `lib/supabase`, so the service-role key cannot reach the client bundle.

**Noted (post-gate dead-code cleanup, maintainer-requested):** the two unused `lib/supabase/` modules were **deleted** — `client.ts` (an anon Supabase client `getSupabase()` / `supabase`, no importers) and `health.ts` (`createHealthClient`, no callers). Verified zero importers before removal; both used the public anon key or were unreferenced, so there was no leakage. The `NEXT_PUBLIC_SUPABASE_ANON_KEY` var was dropped alongside them (now zero consumers).

**Maintainer follow-up (recorded in the cutover runbook):** after setting the production Vercel env, run `next build` and grep the client bundle (`.next/static`) for the service-role key value to confirm it is not inlined. The source scan above already proves no client module reads it.

---

## 4. Migration-ledger posture (Task 3.4 — decision recorded)

**Decision: accept the out-of-band manual-contract model for MVP.** The live migration ledger is empty (`list_migrations` → `[]`); every schema change to date was applied out-of-band (psql / MCP `execute_sql`), and there is no `supabase/migrations/` directory in the repo. The Story 8.5 applies were made via `execute_sql` (no ledger entry) to stay consistent with that established pattern.

- **Source of truth:** the manual-run `.sql` contract artifacts in `_bmad-output/implementation-artifacts/` (`8-2-venues-store-contract.sql`, `3-3-reviews-contract.sql`, `3-2-feedback-contract.sql`, `3-0-2-shadow-caster-schema-rpc-contract.sql`). They now include the Story 8.5 RLS policies and each carries end-of-file smoke checks.
- **Not chosen:** backfilling `supabase/migrations/` files. This can be revisited post-MVP if a CLI-driven migration workflow is adopted; it is not required for `done` and would add a parallel source of truth with no current consumer.

---

## 5. Reproduce / re-verify (read-only)

```sql
-- Every app table RLS-on with >=1 policy:
select c.relname, c.relrowsecurity,
  (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=c.relname)
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in
  ('venues','reviews','feedback','shadow_casters','shadow_caster_import_batches');
```

Then `get_advisors({type:'security'})` → expect only the §2 PostGIS exceptions; `get_advisors({type:'performance'})` → expect only the §2 `unused_index` INFOs.
