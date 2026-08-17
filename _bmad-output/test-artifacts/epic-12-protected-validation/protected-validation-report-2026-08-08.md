# Epic 12 Protected Validation Report

Date: 2026-08-08

Scope: Epic 12 protected P0 closeout lane for Supabase project `hhnbxrhfhlzxgllxukzj`, Vercel project `prj_Y3jvsIxhNaruzSYM2pRwMTyRm7Jw` / team `team_jvgtCLGEU7h6atn0TyGLNncd`, and GitHub repo `rthunborg/sunnyseat`.

No secrets, tokens, key values, or raw credentials are recorded here.

## Current Docs Checked

- Supabase changelog fetched from `https://supabase.com/changelog.md` on 2026-08-08. Relevant entries noted:
  - 2026-07-22 `extension-version-pinning-ignored`
  - 2026-04-28 Data API auto-exposure breaking change: new public tables are not automatically exposed to Data/GraphQL APIs.
- Supabase docs searched via Supabase MCP:
  - Storage access control: `https://supabase.com/docs/guides/storage/security/access-control`
  - Storage schema: `https://supabase.com/docs/guides/storage/schema/design`
  - Storage helper functions: `https://supabase.com/docs/guides/storage/schema/helper-functions`
  - Database migrations: `https://supabase.com/docs/guides/local-development/database-migrations`
  - Migration list CLI reference: `https://supabase.com/docs/reference/cli/supabase-migration-list`

## Target Identity

- Supabase: confirmed project `hhnbxrhfhlzxgllxukzj` is `SunnySeat`, status `ACTIVE_HEALTHY`, region `eu-west-1`, Postgres `17.6`.
- Vercel: confirmed project `sunnyseat`, id `prj_Y3jvsIxhNaruzSYM2pRwMTyRm7Jw`, team/account `team_jvgtCLGEU7h6atn0TyGLNncd`.
- GitHub: repository/environment metadata queried for `rthunborg/sunnyseat`, environment `Production`.

## External Mutations

1. Applied Supabase migration SQL from `supabase/migrations/20260718214954_add_public_venue_visibility.sql` through Supabase MCP `apply_migration`.
   - Remote migration history entry: version `20260808115213`, name `20260718214954_add_public_venue_visibility`.
   - Note: Supabase MCP generated the current timestamp version while preserving the local migration filename as the migration name.
   - Verified `public.venues.hidden` is `boolean`, `NOT NULL`, default `false`.

No other external mutation was completed.

Rollback note for the completed visibility mutation: if rollback is explicitly required before deploying code that depends on `hidden`, drop `public.venues.hidden` and remove/repair the corresponding Supabase migration-history entry through an approved Supabase migration/repair path. Rolling back after deploying current Epic 12 code would break the public resolver/precompute projection.

## Visibility Migration Evidence

Before mutation:

- Remote migration history had no `20260718214954` / `20260719000000` entries.
- `public.venues.hidden` was absent.

After applying `20260718214954_add_public_venue_visibility`:

- `public.venues.hidden` exists with:
  - `data_type`: `boolean`
  - `is_nullable`: `NO`
  - `column_default`: `false`

Projection compatibility is not clean yet. Current local resolver/precompute projections require venue columns that are still absent from protected Supabase:

- `display_lat`: absent
- `display_lng`: absent
- `deleted_at`: absent

Because of those missing columns, I did not claim "no 42703" for current Epic 12 resolver/precompute projections. Route-level visible/hidden id+slug behavior was not safely testable against protected production because current production is stale and the protected database is not schema-compatible with current Epic 12 code.

Supabase type generation:

- Ran `supabase gen types --project-id hhnbxrhfhlzxgllxukzj --schema public --lang typescript`.
- Generated remote types include `hidden: boolean`.
- Checked-in `nextjs-app/lib/supabase/types.ts` already includes `hidden: boolean`.
- Generated remote types do not include current local Epic 12 geometry tables or `display_lat`; checked-in types do. No repo type update was made because replacing local types with the current protected remote schema would regress the current code contract.

## Storage Migration Evidence

Before mutation:

- `storage.buckets` has no `venue-media` bucket.
- No `storage.objects` policies for `venue-media` were present.

Attempted to apply exact SQL from `supabase/migrations/20260719000000_venue_media_storage.sql` through Supabase MCP `apply_migration`.

Result: blocked by the approval reviewer because the migration creates a public storage bucket and public read policy. I did not retry, bypass, or apply the same effect through another path.

Consequences:

- `venue-media` bucket remains absent.
- Protected public rendition reads were not testable.
- Protected service-role create-only upload was not testable.
- Protected anon/auth write denial was not testable.
- No versioned test object was uploaded or cleaned up.

Required human action: explicitly approve applying `20260719000000_venue_media_storage.sql` after acknowledging that it creates a public-read `venue-media` bucket/policy for future venue media. Then rerun storage verification with public reads, service-role create-only upload, anon/auth write denial, and cleanup of the versioned test object.

## Supabase Advisors

Advisors were run after the visibility DDL.

Security advisor highlights:

- INFO: `public.hours_review_outcomes` has RLS enabled with no policies.
- INFO: `public.hours_review_runs` has RLS enabled with no policies.
- ERROR: `public.spatial_ref_sys` has RLS disabled.
- WARN: `postgis` extension is installed in `public`.
- WARN: PostGIS `st_estimatedextent` security-definer functions are executable by `anon` and `authenticated`.

Performance advisor highlights:

- INFO unused-index notices for existing `venues`, `hours_review_runs`, `shadow_casters`, and `reviews` indexes.
- INFO Auth DB connection strategy notice.

These advisor findings pre-existed the visibility-column mutation scope; none is specific to `venues.hidden`.

## Geometry And Weather Service-Only Audit

Expected Story 12.3 protected objects were checked:

- Tables absent:
  - `public.venue_geometry_inputs`
  - `public.venue_sun_geometry_series`
  - `public.geometry_precompute_runs`
  - `public.weather_bucket_snapshots`
- RPCs/functions absent:
  - `public.claim_geometry_precompute_run`
  - `public.heartbeat_geometry_precompute_run`
  - `public.finish_geometry_precompute_run`
  - `public.fail_geometry_precompute_run`
  - `public.publish_venue_geometry_generation`
  - `public.mark_venue_geometry_input_dirty`
- Role grants for those expected tables: none, because the tables do not exist.

This means live service-only posture for Story 12.3 geometry/weather cannot be proven on the protected database yet. Applying only the requested visibility migration is not enough for the Story 12.3 protected p95 lane.

## GitHub Production Environment Audit

Connector search: installed GitHub connector exposes workflow-run/job/artifact tools, but not repository environment secret/variable metadata.

CLI path:

- `gh --version`: `2.89.0`.
- `gh auth status` reports the default `rthunborg` token invalid.
- Escalated `gh api` calls still succeeded for metadata-only endpoints.

GitHub `Production` environment:

- Environment name: `Production`
- Protection rules: `branch_policy`
- Deployment branch policy: custom branch policies enabled, protected branches disabled.
- Branch policies: `main`

Secret names present:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`

Variable names present:

- `SUN_HOURS_AUDIT_ENABLED`

Workflow-required names from local protected workflows:

- `.github/workflows/hours-review-audit.yml`
  - secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - variable: `SUN_HOURS_AUDIT_ENABLED`
- `.github/workflows/sun-geometry-and-weather.yml`
  - geometry secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - geometry variable: `SUN_GEOMETRY_PRECOMPUTE_ENABLED`
  - weather secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - weather variables: `SUN_WEATHER_REFRESH_ENABLED`, `MET_NO_USER_AGENT`

Gap:

- `SUN_GEOMETRY_PRECOMPUTE_ENABLED` is missing from GitHub `Production` variables.
- `SUN_WEATHER_REFRESH_ENABLED` is missing from GitHub `Production` variables.
- `MET_NO_USER_AGENT` is missing from GitHub `Production` variables.

## Vercel Production Deployment Status

Vercel connector confirms latest production deployment:

- Deployment id: `dpl_G58n94K4U5UnW5R8x8k8HMfr8p7x`
- URL: `sunnyseat-cbkkal874-enhancior.vercel.app`
- Ready state: `READY`
- Created: `2026-07-18T10:40:48.199Z`
- GitHub ref: `main`
- GitHub SHA: `0be7c3a092d9682c04220fd8f3e0f52d1e56160f`
- Commit message: Story 12.1 merge

Root coordination supplied that current Epic 12 HEAD is `1c9287c`. Therefore the latest production deployment is stale and does not contain the Epic 12 committed implementation needed for Story 12.3 p95 measurement.

No production deploy was attempted. No p95, central-viewport 42+ venue cold/warm/edge dataset, persisted-read logs, or zero-recompute logs were captured because doing so against stale production would be invalid.

Required next action: coordinate a production deployment from the intended committed Epic 12 code path, after resolving protected Supabase schema gaps and GitHub variables. Then collect the p95/log dataset against that deployment.

## Blockers To Close P0 Rows

1. Storage migration is blocked by approval reviewer. Explicit human approval is required to create the public-read `venue-media` bucket/policy.
2. Protected Supabase is not schema-compatible with current Epic 12 code. At minimum, current resolver/precompute projections still miss `display_lat`, `display_lng`, and `deleted_at`; Story 12.3 geometry/weather tables and RPCs are absent.
3. GitHub `Production` variables for Story 12.3 protected jobs are missing: `SUN_GEOMETRY_PRECOMPUTE_ENABLED`, `SUN_WEATHER_REFRESH_ENABLED`, `MET_NO_USER_AGENT`.
4. Vercel production is stale at Story 12.1 code. Story 12.3 p95/log evidence must wait for a coordinated production deploy from intended current code.

## Read-Only Schema Drift Plan

Added after the read-only follow-up on 2026-08-08. No external state was mutated during this follow-up.

### Complete Local vs Remote Migration State

Remote-only history entries not present in the current local `supabase/migrations/` directory:

| Remote version | Remote name | Note |
| --- | --- | --- |
| `20260629215021` | `create_app_feedback_table` | Existing baseline object history. Keep; do not replay/delete. |
| `20260703151546` | `widen_feedback_predicted_state_check_cloudobscured` | Existing baseline object history. Keep; do not replay/delete. |
| `20260707175809` | `venues_add_google_places_columns` | Existing baseline object history. Keep; do not replay/delete. |

Local migration files compared in filename order:

| Local file | Remote state | Schema state / action |
| --- | --- | --- |
| `20260714073820_reconcile_venue_place_identity.sql` | Applied by exact version/name. | No action. |
| `20260714073831_provider_neutral_hours_governance.sql` | Applied by exact version/name. | No action. |
| `20260714075456_tighten_hours_review_service_grants.sql` | Applied by exact version/name. | No action. |
| `20260714121332_harden_hours_governance_review_fixes.sql` | Applied by exact version/name. | No action. |
| `20260714122048_enforce_verified_public_hours_state.sql` | Applied by exact version/name. | No action. |
| `20260714131540_complete_hours_governance_review_hardening.sql` | Applied by exact version/name. | No action. |
| `20260714184212_serialize_hours_review_persistence.sql` | Applied by exact version/name. | No action. |
| `20260716104129_finalize_hours_governance_review_safety.sql` | Applied by exact version/name. | No action. |
| `20260716121208_close_hours_review_iteration_5.sql` | Applied by exact version/name. | No action. |
| `20260716185235_close_hours_review_iteration_6.sql` | Applied by exact version/name. | No action. |
| `20260717120000_close_hours_review_iteration_8.sql` | Applied by name as remote version `20260717124550`. | Version drift; do not reapply. |
| `20260717143000_close_hours_review_iteration_9.sql` | Applied by name as remote version `20260717150211`. | Version drift; do not reapply. |
| `20260717161000_close_hours_review_iteration_10.sql` | Applied by name as remote version `20260717190030`. | Version drift; do not reapply. |
| `20260718193000_persist_sun_geometry_series_and_weather_snapshots.sql` | Missing. | Required for Story 12.3 geometry/weather compatibility. |
| `20260718214954_add_public_venue_visibility.sql` | Applied by name as remote version `20260808115213`. | Already applied in this validation lane; version drift; do not reapply. |
| `20260719000000_venue_media_storage.sql` | Missing. | Required for Story 12.12 storage compatibility, but currently blocked by human approval. |
| `20260727173000_dev_venue_editor_display_coordinates.sql` | Missing. | Required for current route/store projection compatibility (`display_lat`, `display_lng`) and dev-editor RPC. |
| `20260806190000_feedback_accuracy_loop_evidence.sql` | Missing. | Required for Story 12.2 feedback evidence columns and service-only feedback posture. |

Important migration-history warning:

- A naive `supabase db push` by local timestamp would likely try to apply version-drifted local files that are already applied by name/schema.
- Before any CLI-based push, either repair migration history for the version-drifted local files after schema verification, or apply the remaining exact SQL files one-by-one through an approved Supabase migration mechanism and record the generated remote versions.

### Current Protected Schema Gaps

Confirmed present prerequisites:

- Base tables: `public.venues`, `public.feedback`, `public.shadow_casters`.
- `public.venues.hidden` exists.
- `public.shadow_casters` has the columns used by `get_shadow_caster_hash_records`: `id`, `geometry`, `height_m`, `ground_z_rh2000`, `roof_z_rh2000`, `source_priority`, `shadow_caster_tier`, `filter_decision`, `caster_class`, `source_flags`, `source_object_metadata`, `provenance_metadata`, `import_batch_id`, `updated_at`, `imported_at`, `active`.

Confirmed absent:

- `public.venues.display_lat`
- `public.venues.display_lng`
- `public.venues.deleted_at`
- `public.venue_geometry_inputs`
- `public.venue_sun_geometry_series`
- `public.geometry_precompute_runs`
- `public.weather_bucket_snapshots`
- `public.claim_geometry_precompute_run`
- `public.heartbeat_geometry_precompute_run`
- `public.finish_geometry_precompute_run`
- `public.fail_geometry_precompute_run`
- `public.publish_venue_geometry_generation`
- `public.mark_venue_geometry_dirty`
- `public.apply_dev_venue_editor_patch`
- `public.get_shadow_caster_hash_records`
- `public.is_valid_geometry_input_hash`
- `public.is_valid_sun_geometry_series`
- `storage.buckets` row `venue-media`
- Story 12.2 feedback evidence columns: `sun_exposure_percent`, `public_sun_verdict`, `weather_gated`, `weather_unknown`, `geometry_input_hash`

`deleted_at` trace:

- No local file under `supabase/migrations/` creates `public.venues.deleted_at`.
- Current code references `deleted_at` in `nextjs-app/lib/services/venue-store.ts` and `nextjs-app/lib/services/sun-geometry-precompute.ts`.
- Therefore current Epic 12 compatibility cannot be reached from the checked-in Supabase migrations alone. This needs either a new additive migration for `public.venues.deleted_at` or a code change removing the projection/filter before deployment.

### Proposed Forward-Only Apply Order

Do not execute this order until the root has coordinated deployment/schema ownership and the Storage public-bucket approval is resolved.

1. `20260718193000_persist_sun_geometry_series_and_weather_snapshots.sql`
   - Creates Story 12.3 persisted geometry/weather tables and RPCs.
   - Dependencies: `public.venues`; `public.shadow_casters` with runtime caster columns; PostGIS functions used by the hash-record RPC.
   - Idempotent/replay safety: mostly idempotent for absent objects (`create table if not exists`, `create or replace function`, `create index if not exists`, revokes/grants). Not fully self-healing if partially-created tables exist with wrong shape because `create table if not exists` will not add missing columns/constraints.
   - Destructive DDL/DML: no table drops, no data deletes. Security-affecting revokes on new Story 12.3 tables/functions and service-role-only grants. Creates `SECURITY DEFINER` functions in `public` with execute revoked from public/anon/authenticated.
   - Risk: High, because it introduces privileged public-schema RPCs and service-only persisted runtime tables.
   - Verification query:
     ```sql
     select to_regclass('public.venue_geometry_inputs') is not null as has_inputs,
            to_regclass('public.venue_sun_geometry_series') is not null as has_series,
            to_regclass('public.geometry_precompute_runs') is not null as has_runs,
            to_regclass('public.weather_bucket_snapshots') is not null as has_weather;
     select n.nspname, p.proname
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in (
          'claim_geometry_precompute_run',
          'heartbeat_geometry_precompute_run',
          'finish_geometry_precompute_run',
          'fail_geometry_precompute_run',
          'publish_venue_geometry_generation',
          'mark_venue_geometry_dirty',
          'get_shadow_caster_hash_records'
        )
      order by p.proname;
     select n.nspname as schemaname,
            c.relname as tablename,
            c.relrowsecurity as rowsecurity,
            c.relforcerowsecurity as forcerowsecurity
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in (
          'venue_geometry_inputs',
          'venue_sun_geometry_series',
          'geometry_precompute_runs',
          'weather_bucket_snapshots'
        )
        and c.relkind = 'r';
     select grantee, table_name, privilege_type
       from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name in (
          'venue_geometry_inputs',
          'venue_sun_geometry_series',
          'geometry_precompute_runs',
          'weather_bucket_snapshots'
        )
        and grantee in ('anon','authenticated','service_role')
      order by table_name, grantee, privilege_type;
     ```

2. `20260719000000_venue_media_storage.sql`
   - Creates/configures Story 12.12 `venue-media` Storage bucket and public read policy.
   - Dependencies: Supabase Storage schema.
   - Idempotent/replay safety: idempotent bucket insert/update; drops/recreates the named public-read policy; drops stale public/anon/authenticated write policies that match `venue-media`.
   - Destructive DDL/DML: policy-destructive. It intentionally removes matching public/anon/auth write policies for `venue-media`.
   - Risk: High, because it creates a public-read bucket/policy and was already blocked by approval review.
   - Apply condition: explicit human approval acknowledging public-read bucket/policy risk.
   - Verification query:
     ```sql
     select id, public, allowed_mime_types, file_size_limit
       from storage.buckets
      where id = 'venue-media';
     select policyname, roles, cmd, qual, with_check
       from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and (
          policyname ilike '%venue%media%'
          or coalesce(qual, '') ilike '%venue-media%'
          or coalesce(with_check, '') ilike '%venue-media%'
        )
      order by policyname;
     ```

3. `20260727173000_dev_venue_editor_display_coordinates.sql`
   - Creates `public.venues.display_lat` and `public.venues.display_lng`; creates service-role-only `apply_dev_venue_editor_patch`.
   - Dependencies: `public.venues.hidden` from `20260718214954_add_public_venue_visibility.sql`; `public.mark_venue_geometry_dirty` from `20260718193000_persist_sun_geometry_series_and_weather_snapshots.sql`.
   - Idempotent/replay safety: uses `add column if not exists`, drops/re-adds constraints, creates/replaces RPC, revokes/grants execute. Constraint validation can fail if existing display coordinate data is invalid; protected remote has no display columns today, so first apply should validate nulls.
   - Destructive DDL/DML: drops/recreates display-coordinate constraints if present; replaces function; no data deletion.
   - Risk: Medium. It is additive for columns but introduces a privileged dev-editor mutation RPC.
   - Verification query:
     ```sql
     select column_name, data_type, is_nullable
       from information_schema.columns
      where table_schema = 'public'
        and table_name = 'venues'
        and column_name in ('display_lat','display_lng')
      order by column_name;
     select conname, convalidated
       from pg_constraint
      where conrelid = 'public.venues'::regclass
        and conname in (
          'venues_display_coordinate_pair_check',
          'venues_display_lat_bounds_check',
          'venues_display_lng_bounds_check'
        )
      order by conname;
     select exists (
       select 1
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'apply_dev_venue_editor_patch'
     ) as has_apply_dev_venue_editor_patch;
     ```

4. `20260806190000_feedback_accuracy_loop_evidence.sql`
   - Creates Story 12.2 feedback evidence columns and service-only feedback policy posture.
   - Dependencies: `public.feedback` exists. The migration references geometry hash format but does not require Story 12.3 tables to exist.
   - Idempotent/replay safety: `add column if not exists`, drops/re-adds constraints and service write policy, enables RLS, revokes/grants. Constraint validation can fail only if existing values in already-present evidence columns violate checks; protected remote lacks those columns today.
   - Destructive DDL/DML: drops/recreates feedback constraints and policy; revokes public/anon/authenticated table grants; no data deletion.
   - Risk: Medium/High because it changes direct table access posture for `public.feedback` to service-role-only.
   - Verification query:
     ```sql
     select column_name, data_type, is_nullable
       from information_schema.columns
      where table_schema = 'public'
        and table_name = 'feedback'
        and column_name in (
          'sun_exposure_percent',
          'public_sun_verdict',
          'weather_gated',
          'weather_unknown',
          'geometry_input_hash'
        )
      order by column_name;
     select conname
       from pg_constraint
      where conrelid = 'public.feedback'::regclass
        and conname in (
          'feedback_sun_exposure_percent_check',
          'feedback_public_sun_verdict_check',
          'feedback_weather_gate_flags_check',
          'feedback_geometry_input_hash_check'
        )
      order by conname;
     select grantee, privilege_type
       from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name = 'feedback'
        and lower(grantee) in ('anon','authenticated','public','service_role')
      order by grantee, privilege_type;
     ```

5. New migration or code correction for `public.venues.deleted_at`
   - No checked-in local migration creates this column.
   - Current code requires it in public resolver and precompute projections.
   - Dependency: must be resolved before deploying current code that selects `.is('deleted_at', null)`.
   - Suggested safe schema direction if keeping code: create a new additive nullable `timestamptz` `public.venues.deleted_at` column with default `null`, plus a comment and generated type refresh.
   - Destructive DDL/DML: should be non-destructive if additive nullable.
   - Risk: Low/Medium if additive only; higher if it changes deletion semantics or backfills rows.
   - Verification query:
     ```sql
     select column_name, data_type, is_nullable, column_default
       from information_schema.columns
      where table_schema = 'public'
        and table_name = 'venues'
        and column_name = 'deleted_at';
     select id, slug, hidden, display_lat, display_lng, deleted_at
       from public.venues
      limit 1;
     ```

### Minimal Compatibility Gate Before Deploy

Before any production deployment of current Epic 12 code, verify all of these succeed:

```sql
select id, slug, display_lat, display_lng, hidden, deleted_at
  from public.venues
 limit 1;

select to_regclass('public.venue_geometry_inputs') is not null as has_inputs,
       to_regclass('public.venue_sun_geometry_series') is not null as has_series,
       to_regclass('public.geometry_precompute_runs') is not null as has_runs,
       to_regclass('public.weather_bucket_snapshots') is not null as has_weather;

select exists (
  select 1 from storage.buckets where id = 'venue-media'
) as has_venue_media_bucket;

select column_name
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'feedback'
   and column_name in (
     'sun_exposure_percent',
     'public_sun_verdict',
     'weather_gated',
     'weather_unknown',
     'geometry_input_hash'
   )
 order by column_name;
```

Then rerun Supabase security/performance advisors and regenerate/compare TypeScript types before deploying.

## Protected Batch Attempt - 2026-08-08 14:16 +02:00

Scope: next authorized protected batch for Supabase project `hhnbxrhfhlzxgllxukzj` and GitHub repo `rthunborg/sunnyseat`, with Storage excluded and `deleted_at` excluded by instruction.

Current Supabase docs were rechecked before attempting the batch:

- Database migrations: `https://supabase.com/docs/guides/deployment/database-migrations`
- Database advisors: `https://supabase.com/docs/guides/database/database-advisors`

Pre-apply checks:

- Target re-confirmed as Supabase project `hhnbxrhfhlzxgllxukzj`, name `SunnySeat`, status `ACTIVE_HEALTHY`, region `eu-west-1`, Postgres `17.6.1.084`.
- Remote migration history had no entries matching these requested migration names or local versions:
  - `20260718193000_persist_sun_geometry_series_and_weather_snapshots`
  - `20260727173000_dev_venue_editor_display_coordinates`
  - `20260806190000_feedback_accuracy_loop_evidence`

Requested apply order:

1. `20260718193000_persist_sun_geometry_series_and_weather_snapshots.sql`
2. `20260727173000_dev_venue_editor_display_coordinates.sql`
3. `20260806190000_feedback_accuracy_loop_evidence.sql`

Result:

- The first Supabase migration attempt was blocked by the approval reviewer because it applies a large persistent production-schema migration including RLS, privilege changes, `SECURITY DEFINER` functions, and new constraints.
- I did not retry, bypass, apply through SQL editor/CLI, or attempt migrations 2 or 3 after the block.
- No batch migration version was created for any of the three requested migrations.

Post-block read-only confirmation:

- Migration history still has no entries matching the three requested migration names/local versions.
- Story 12.3 tables remain absent:
  - `public.venue_geometry_inputs`
  - `public.venue_sun_geometry_series`
  - `public.geometry_precompute_runs`
  - `public.weather_bucket_snapshots`
- `public.venues.display_lat`, `public.venues.display_lng`, and `public.venues.deleted_at` remain absent.
- Story 12.2 feedback evidence columns remain absent:
  - `sun_exposure_percent`
  - `public_sun_verdict`
  - `weather_gated`
  - `weather_unknown`
  - `geometry_input_hash`

Rollback note for this batch attempt: no rollback required because the requested batch DDL did not apply.

Supabase advisors were run read-only after the blocked batch attempt. Findings matched the prior protected baseline:

- Security: 10 lints total.
  - INFO: RLS enabled with no policy on `public.hours_review_outcomes`.
  - INFO: RLS enabled with no policy on `public.hours_review_runs`.
  - ERROR: RLS disabled on `public.spatial_ref_sys`.
  - WARN: PostGIS extension installed in `public`.
  - WARN: PostGIS `st_estimatedextent` `SECURITY DEFINER` overloads executable by `anon` and `authenticated`.
- Performance: 15 lints total.
  - INFO: unused-index notices for existing `venues`, `hours_review_runs`, `shadow_casters`, and `reviews` indexes.
  - INFO: Auth DB connection strategy uses a fixed connection count.

GitHub Production environment:

- Read-only metadata access via `gh api` succeeded.
- Production protection rules are still only `branch_policy`.
- Deployment branch policy still allows custom branch policies and lists branch `main`.
- Required reviewer protection is not present in the returned Production environment protection rules.
- Production variable names before and after the blocked mutation attempt: `SUN_HOURS_AUDIT_ENABLED`.
- Attempt to set Production variable `MET_NO_USER_AGENT` to the instructed value was blocked by the approval reviewer. I did not retry or use another endpoint.
- `SUN_GEOMETRY_PRECOMPUTE_ENABLED` and `SUN_WEATHER_REFRESH_ENABLED` were left disabled/absent as instructed.

Follow-up instruction received during this batch:

- A new local migration exists at `supabase/migrations/20260808130000_add_venue_soft_delete_timestamp.sql`.
- Its inspection/application is conditional on the current three-migration batch verifying green.
- Because the first migration in this batch was blocked before apply, I did not inspect or apply the new `deleted_at` migration, did not run the full compatibility query, and did not enable the geometry/weather GitHub Production variables.

## Protected Batch Resume - 2026-08-09

Scope: resumed protected apply lane for Supabase project `hhnbxrhfhlzxgllxukzj` and GitHub repo `rthunborg/sunnyseat` after the user again selected Continue for the exact risk-specific approval list.

Local inputs re-read/confirmed before mutation:

- `AGENTS.md`
- `.agents/skills/auto-bmad/SKILL.md`
- local Supabase skill at `.agents/skills/supabase/SKILL.md`
- this protected validation report
- exact checked-in migration SQL files:
  - `20260718193000_persist_sun_geometry_series_and_weather_snapshots.sql`
  - `20260727173000_dev_venue_editor_display_coordinates.sql`
  - `20260806190000_feedback_accuracy_loop_evidence.sql`
  - `20260808130000_add_venue_soft_delete_timestamp.sql`
  - `20260719000000_venue_media_storage.sql`

Pre-apply protected state:

- Target re-confirmed as Supabase project `hhnbxrhfhlzxgllxukzj`, name `SunnySeat`, status `ACTIVE_HEALTHY`, region `eu-west-1`, Postgres `17.6.1.084`.
- Remote migration history was unchanged from the prior protected baseline. The only Epic 12 visibility entry present was remote version `20260808115213`, name `20260718214954_add_public_venue_visibility`.
- None of the requested core/storage migration names or local versions were present:
  - `20260718193000_persist_sun_geometry_series_and_weather_snapshots`
  - `20260727173000_dev_venue_editor_display_coordinates`
  - `20260806190000_feedback_accuracy_loop_evidence`
  - `20260808130000_add_venue_soft_delete_timestamp`
  - `20260719000000_venue_media_storage`
- Venue baseline: `42` total venues, `42` non-hidden/active rows under the current compatibility check, `0` hidden rows.
- Compatibility objects/columns remained absent before mutation:
  - `public.venue_geometry_inputs`
  - `public.venue_sun_geometry_series`
  - `public.geometry_precompute_runs`
  - `public.weather_bucket_snapshots`
  - `public.venues.display_lat`
  - `public.venues.display_lng`
  - `public.venues.deleted_at`
  - `public.feedback.geometry_input_hash`
  - storage bucket `venue-media`

Protected mutation attempt:

- Attempted to apply `20260718193000_persist_sun_geometry_series_and_weather_snapshots` through Supabase MCP `apply_migration` using the exact checked-in SQL.
- Result: blocked by the platform approval reviewer. Rejection stated that the action applies broad persistent production DDL, including service-only tables, RLS, grants, and `SECURITY DEFINER` functions, without trusted user authorization for this exact project mutation.
- Per the scoped instruction to stop on any platform rejection, no workaround, indirect execution, SQL-editor path, CLI path, or policy circumvention was attempted.
- Because the first core migration was rejected, the remaining Supabase migrations were not attempted:
  - `20260727173000_dev_venue_editor_display_coordinates`
  - `20260806190000_feedback_accuracy_loop_evidence`
  - `20260808130000_add_venue_soft_delete_timestamp`
  - `20260719000000_venue_media_storage`
- No real storage object was uploaded.
- No GitHub Production variables, secrets, protection rules, branch policies, or workflows were mutated.
- No workflow dispatch was attempted.

Post-block verification:

- Remote migration history remained unchanged; no new remote migration version was generated for the rejected attempt.
- Venue count remained unchanged: `42` total, `42` non-hidden/active rows under the current compatibility check, `0` hidden rows.
- Compatibility objects/columns remained absent:
  - `public.venue_geometry_inputs`
  - `public.venue_sun_geometry_series`
  - `public.geometry_precompute_runs`
  - `public.weather_bucket_snapshots`
  - `public.venues.display_lat`
  - `public.venues.display_lng`
  - `public.venues.deleted_at`
  - `public.feedback.geometry_input_hash`
  - storage bucket `venue-media`

Supabase advisors after the blocked attempt:

- Security advisor: unchanged from baseline, `10` lints total.
  - INFO: RLS enabled with no policy on `public.hours_review_outcomes`.
  - INFO: RLS enabled with no policy on `public.hours_review_runs`.
  - ERROR: RLS disabled on `public.spatial_ref_sys`.
  - WARN: `postgis` extension installed in `public`.
  - WARN: PostGIS `st_estimatedextent` `SECURITY DEFINER` overloads executable by `anon` and `authenticated`.
- Performance advisor: unchanged from baseline, `15` lints total.
  - INFO: unused-index notices for existing `venues`, `hours_review_runs`, `shadow_casters`, and `reviews` indexes.
  - INFO: Auth DB connection strategy uses a fixed connection count.

GitHub Production environment read-only state:

- Environment: `Production`.
- Protection rules: `branch_policy` only.
- Admin bypass: enabled.
- Deployment branch policy: protected branches disabled, custom branch policies enabled.
- Deployment branch policies: `main`.
- Required reviewer protection: not present in the returned environment protection rules; not added because the Supabase platform rejection stopped the protected batch before GitHub mutation stage.
- Secret names present:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_URL`
- Variable names present:
  - `SUN_HOURS_AUDIT_ENABLED`
- Required variables still absent/unmodified:
  - `MET_NO_USER_AGENT`
  - `SUN_GEOMETRY_PRECOMPUTE_ENABLED`
  - `SUN_WEATHER_REFRESH_ENABLED`

Blocker:

- The platform approval reviewer rejected the first required Supabase core migration. Human/platform approval must explicitly allow this exact project mutation before any protected apply lane can proceed. No rollback is required because no new protected mutation was applied in this resumed batch.

## Protected Closeout Retry - 2026-08-13

Scope: resumed protected closeout lane for Supabase project `hhnbxrhfhlzxgllxukzj` and GitHub repo `rthunborg/sunnyseat`, after the user explicitly authorized persistent production changes and twice selected Continue after the exact risk list. No source code or git operations were performed.

No secrets, tokens, key values, raw database URLs, or raw credentials are recorded here.

### Inputs And Docs Re-read

- Re-read `AGENTS.md`.
- Re-read `.agents/skills/auto-bmad/SKILL.md`.
- Re-read installed Supabase skill at `C:\Users\Rasmus\.agents\skills\supabase\SKILL.md`. The prior report's project-local `.agents/skills/supabase/SKILL.md` path is absent in this checkout.
- Re-read this protected validation report.
- Re-read exact checked-in migration SQL files:
  - `supabase/migrations/20260718193000_persist_sun_geometry_series_and_weather_snapshots.sql`
  - `supabase/migrations/20260727173000_dev_venue_editor_display_coordinates.sql`
  - `supabase/migrations/20260806190000_feedback_accuracy_loop_evidence.sql`
  - `supabase/migrations/20260808130000_add_venue_soft_delete_timestamp.sql`
  - `supabase/migrations/20260719000000_venue_media_storage.sql`
- Current Supabase docs/changelog checked:
  - Changelog: `https://supabase.com/changelog`
  - Data API grants breaking change: `https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically`
  - Database migrations: `https://supabase.com/docs/guides/deployment/database-migrations`
  - Database advisors: `https://supabase.com/docs/guides/database/database-advisors`
  - Storage access control: `https://supabase.com/docs/guides/storage/security/access-control`

### Tool Versions And Target Identity

- Supabase MCP project list confirmed target project:
  - Project id/ref: `hhnbxrhfhlzxgllxukzj`
  - Name: `SunnySeat`
  - Region: `eu-west-1`
  - Status: `ACTIVE_HEALTHY`
  - Postgres: `17.6.1.084`
- Supabase CLI: `2.109.1`.
- GitHub CLI: `2.89.0`.
- GitHub auth: authenticated as `rthunborg` with `repo` and `workflow` scopes; token value not recorded.

### Pre-apply Protected State

Remote migration history before mutation contained the previous visibility entry only for Epic 12:

- `20260808115213` / `20260718214954_add_public_venue_visibility`

The following requested migrations were absent from remote history before this retry:

- `20260718193000_persist_sun_geometry_series_and_weather_snapshots`
- `20260727173000_dev_venue_editor_display_coordinates`
- `20260806190000_feedback_accuracy_loop_evidence`
- `20260808130000_add_venue_soft_delete_timestamp`
- `20260719000000_venue_media_storage`

Baseline venue counts:

- Total venues: `42`
- Hidden venues: `0`
- Non-hidden active venues under the compatibility check: `42`
- Deleted venues: `0`

Baseline absent objects/columns:

- `public.venue_geometry_inputs`
- `public.venue_sun_geometry_series`
- `public.geometry_precompute_runs`
- `public.weather_bucket_snapshots`
- `public.venues.display_lat`
- `public.venues.display_lng`
- `public.venues.deleted_at`
- `public.feedback.geometry_input_hash`
- Storage bucket `venue-media`

### Supabase Core Mutations Applied

Applied the four requested core migrations sequentially through Supabase MCP `apply_migration`, using the exact checked-in SQL content.

1. `20260718193000_persist_sun_geometry_series_and_weather_snapshots`
   - Remote migration entry: version `20260813135459`, name `20260718193000_persist_sun_geometry_series_and_weather_snapshots`.
   - Verified tables present: `public.venue_geometry_inputs`, `public.venue_sun_geometry_series`, `public.geometry_precompute_runs`, `public.weather_bucket_snapshots`.
   - Verified all four tables have RLS enabled and force RLS enabled.
   - Verified table grants for those four tables are present only for `service_role` among `anon`/`authenticated`/`service_role`.
   - Verified expected functions exist as `SECURITY DEFINER`, owned by `postgres`, and only `service_role` has `EXECUTE` among `anon`/`authenticated`/`service_role`.

2. `20260727173000_dev_venue_editor_display_coordinates`
   - Remote migration entry: version `20260813135734`, name `20260727173000_dev_venue_editor_display_coordinates`.
   - Verified `public.venues.display_lat` and `public.venues.display_lng` exist as nullable `double precision`.
   - Verified display-coordinate constraints exist and are validated:
     - `venues_display_coordinate_pair_check`
     - `venues_display_lat_bounds_check`
     - `venues_display_lng_bounds_check`
   - Verified `public.apply_dev_venue_editor_patch` is executable only by `service_role` among `anon`/`authenticated`/`service_role`.

3. `20260806190000_feedback_accuracy_loop_evidence`
   - Remote migration entry: version `20260813135832`, name `20260806190000_feedback_accuracy_loop_evidence`.
   - Verified `public.feedback` columns:
     - `geometry_input_hash text`
     - `public_sun_verdict text`
     - `sun_exposure_percent integer`
     - `weather_gated boolean`
     - `weather_unknown boolean`
   - Verified feedback constraints exist:
     - `feedback_geometry_input_hash_check`
     - `feedback_public_sun_verdict_check`
     - `feedback_sun_exposure_percent_check`
     - `feedback_weather_gate_flags_check`
   - Verified `anon` and `authenticated` are absent from direct `public.feedback` table grants. `service_role` remains the only listed application role; the role has broader pre-existing table privileges in addition to the migration's intended `select`/`insert`.

4. `20260808130000_add_venue_soft_delete_timestamp`
   - Remote migration entry: version `20260813135909`, name `20260808130000_add_venue_soft_delete_timestamp`.
   - Verified `public.venues.deleted_at` exists as nullable `timestamp with time zone`, with `column_default = null`.

Post-core compatibility:

- Venue count remained unchanged: `42` total, `0` hidden, `42` non-hidden active, `0` deleted.
- Compatibility projection succeeded:
  - `select id, slug, display_lat, display_lng, hidden, deleted_at from public.venues limit 1`
  - Sample returned row: id `9`, slug `mr-p`, `display_lat = null`, `display_lng = null`, `hidden = false`, `deleted_at = null`.
- Compatibility object summary after core migrations:
  - `has_inputs = true`
  - `has_series = true`
  - `has_runs = true`
  - `has_weather = true`
  - `has_display_lat = true`
  - `has_display_lng = true`
  - `has_deleted_at = true`
  - `has_feedback_geometry_input_hash = true`
  - `has_venue_media_bucket = false`

Rollback note for the four applied core migrations: rollback was not attempted. Reversal would require an explicit approved forward rollback migration because these are persistent production schema and privilege changes.

### Storage Migration Attempt

Attempted `20260719000000_venue_media_storage.sql` after core compatibility verified.

Result: not applied.

Evidence:

- Supabase MCP `apply_migration` rejected the exact Storage migration payload with `INVALID_ARGUMENT`.
- Supabase MCP `execute_sql` also rejected the exact Storage SQL with `INVALID_ARGUMENT`.
- Direct CLI DB URL fallback was not usable because the cached project-local pooler URL has no password.
- A temporary Supabase CLI project outside the repo was initialized and linked to `hhnbxrhfhlzxgllxukzj`; linked CLI query `select 1 as ok` succeeded through the official Supabase CLI path.
- Applying the exact checked-in Storage SQL through linked CLI failed with:
  - `LegacyDbQueryUnexpectedStatusError`
  - HTTP status `400`
  - SQL error: `42501: must be owner of table objects`
- The failure occurs on the exact migration's `alter table storage.objects enable row level security` statement. I did not hand-edit the migration, skip that statement, use SQL Editor, invent credentials, or apply an equivalent but non-exact replacement.

Post-attempt Storage state:

- Storage bucket `venue-media`: absent.
- `storage.objects` policies referencing `venue-media`: none.
- Public-read bucket/policy verification could not pass because the bucket remains absent.
- Absence of anon/auth write policies for `venue-media` is verified by absence of any `venue-media` storage policies, but the required public-read policy is also absent.
- No storage object was uploaded.
- No migration-history repair was performed for Storage because the Storage DDL did not apply.

Required human/platform action for Storage: apply the exact `20260719000000_venue_media_storage.sql` through a Supabase role/path that owns or can alter `storage.objects`, or approve a reviewed replacement migration that omits the already-owned-system-table RLS statement after independently confirming the target RLS state. Then rerun bucket/policy verification.

### Supabase Advisors After Core Migrations

Security advisor was run through a temporary linked Supabase CLI project with `--type security --level info --fail-on none --output json`.

Security advisor result: `16` lints total.

- New/expected from the applied service-only geometry/weather tables:
  - INFO `rls_enabled_no_policy` on `public.geometry_precompute_runs`
  - INFO `rls_enabled_no_policy` on `public.venue_geometry_inputs`
  - INFO `rls_enabled_no_policy` on `public.venue_sun_geometry_series`
  - INFO `rls_enabled_no_policy` on `public.weather_bucket_snapshots`
- New from the applied validator functions:
  - WARN `function_search_path_mutable` on `public.is_valid_geometry_input_hash`
  - WARN `function_search_path_mutable` on `public.is_valid_sun_geometry_series`
- Existing baseline findings still present:
  - INFO `rls_enabled_no_policy` on `public.hours_review_outcomes`
  - INFO `rls_enabled_no_policy` on `public.hours_review_runs`
  - ERROR `rls_disabled_in_public` on `public.spatial_ref_sys`
  - WARN `extension_in_public` for `postgis`
  - WARN anon/authenticated executable `SECURITY DEFINER` overloads for `public.st_estimatedextent`

Performance advisor was run through a temporary linked Supabase CLI project with `--type performance --level info --fail-on none --output json`.

Performance advisor result: `17` lints total.

- Existing baseline unused-index notices remain for `venues`, `hours_review_runs`, `shadow_casters`, and `reviews`.
- New unused-index INFO notices appeared for:
  - `public.venue_geometry_inputs` index `venue_geometry_inputs_current_hash_idx`
  - `public.venue_sun_geometry_series` index `venue_sun_geometry_series_lookup_idx`
- Existing Auth DB connection strategy INFO remains.

No advisor remediation mutation was performed in this closeout lane.

### GitHub Production Environment Mutations

GitHub `Production` environment before mutation:

- Protection rules: `branch_policy` only.
- Admin bypass: enabled.
- Deployment branch policy: protected branches disabled, custom branch policies enabled.
- Deployment branch policies: `main`.
- Secret names present:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_URL`
- Variable names before mutation:
  - `SUN_HOURS_AUDIT_ENABLED`

Applied the requested GitHub `Production` variables through authenticated `gh variable set`:

- `MET_NO_USER_AGENT = SunnySeat/1.0 rasmus.thunborg@enhancior.se`
- `SUN_GEOMETRY_PRECOMPUTE_ENABLED = true`
- `SUN_WEATHER_REFRESH_ENABLED = true`

GitHub `Production` verification after mutation:

- Variables:
  - `MET_NO_USER_AGENT = SunnySeat/1.0 rasmus.thunborg@enhancior.se` updated `2026-08-13T14:11:00Z`
  - `SUN_GEOMETRY_PRECOMPUTE_ENABLED = true` updated `2026-08-13T14:11:00Z`
  - `SUN_HOURS_AUDIT_ENABLED = true` unchanged from `2026-07-14T18:46:55Z`
  - `SUN_WEATHER_REFRESH_ENABLED = true` updated `2026-08-13T14:11:00Z`
- Secret names remain:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_URL`
- Protection rules remain `branch_policy` only.
- Deployment branch policy remains custom branch policies enabled and protected branches disabled.
- Deployment branch policies still list only `main`.

Required reviewer protection was not added. GitHub API returned only one direct admin collaborator, `rthunborg`; adding only the active/self collaborator could create a self-review/deployment approval deadlock rather than a usable reviewer gate.

No GitHub Actions workflow was dispatched.

### Final Closeout State

- Supabase core production schema compatibility through `deleted_at`: completed and verified.
- Supabase Storage `venue-media` migration: superseded by the 2026-08-17 owner-compatible retry below, which records the successful migration and verified storage state.
- GitHub `Production` variables for geometry/weather jobs: completed and verified.
- GitHub `Production` secret names and `main` branch policy: verified unchanged.
- Workflow dispatch: not performed.

## Protected Storage Owner-Compatible Retry - 2026-08-17

Scope: resumed Story 12.12 protected storage remediation for Supabase project `hhnbxrhfhlzxgllxukzj`. No secrets, tokens, raw credentials, object bytes, or object URLs are recorded here. No storage objects were uploaded.

### Docs And Source Inputs

- Re-read `AGENTS.md`, `.agents/skills/auto-bmad/SKILL.md`, installed Supabase skill `C:\Users\Rasmus\.agents\skills\supabase\SKILL.md`, and Story 12.12 artifact `_bmad-output/implementation-artifacts/12-12-venue-photos-supabase-storage-hosting-render-fallback-fixes.md`.
- Checked current Supabase docs/changelog:
  - `https://supabase.com/changelog?types=breaking-change`
  - `https://supabase.com/docs/guides/storage/security/access-control`
  - `https://supabase.com/docs/guides/storage/schema/design`
  - `https://supabase.com/docs/guides/storage/buckets/fundamentals`
- Relevant storage interpretation: `storage.objects` is already RLS-managed by Supabase on the protected project; public buckets make object retrieval public, while upload/update/delete remain subject to Storage access controls and RLS policies. Removing the redundant `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY` avoids an owner-only statement against a Supabase-managed table while keeping the explicit bucket configuration and SELECT-only policy contract.

### Local Source Remediation

- Updated `supabase/migrations/20260719000000_venue_media_storage.sql` to delete only:
  - `alter table storage.objects enable row level security;`
- Kept the existing bucket upsert, stale browser-write policy removal loop, named public-read policy drop/recreate, and `SELECT` policy scoped to bucket `venue-media` for `anon, authenticated`.
- Updated the focused contract test `nextjs-app/test/unit/story-12-12-storage-upload-and-policy.atdd.test.ts` only to assert that the redundant owner-only `ALTER` is absent while preserving public-read/no-browser-write checks.

### Local Verification

- Focused test: `npx vitest run test/unit/story-12-12-storage-upload-and-policy.atdd.test.ts`
  - Result: pass; 1 file passed, 10 tests passed.
- Typecheck: `npx tsc --noEmit`
  - Result: pass.
- Lint: `npx eslint . --quiet`
  - Result: pass.

### Protected Supabase Preflight

Target project re-confirmed through Supabase MCP project list:

- Project id/ref: `hhnbxrhfhlzxgllxukzj`
- Name: `SunnySeat`
- Region: `eu-west-1`
- Status: `ACTIVE_HEALTHY`
- Postgres: `17.6.1.084`

Remote migration history before the storage attempt still did not include `20260719000000_venue_media_storage`. Latest Epic 12 entries remained:

- `20260808115213` / `20260718214954_add_public_venue_visibility`
- `20260813135459` / `20260718193000_persist_sun_geometry_series_and_weather_snapshots`
- `20260813135734` / `20260727173000_dev_venue_editor_display_coordinates`
- `20260813135832` / `20260806190000_feedback_accuracy_loop_evidence`
- `20260813135909` / `20260808130000_add_venue_soft_delete_timestamp`

Preflight storage SQL evidence:

- `storage.buckets` rows where id/name is `venue-media`: none.
- `pg_policies` rows on `storage.objects` referencing `venue-media`: none.
- `storage.objects` rows with `bucket_id = 'venue-media'`: `0`.
- `storage.objects` table owner: `supabase_storage_admin`.
- `storage.objects.relrowsecurity`: `true`.
- `storage.objects.relforcerowsecurity`: `false`.

### Protected Storage Migration Apply

Primary protected-lane apply completed after the owner-compatible source remediation.

- Supabase migration applied successfully.
- Remote migration entry:
  - Version: `20260817111301`
  - Name: `venue_media_storage`
- No storage object was uploaded.

### Protected Storage Verification

Verified protected production storage state after the successful migration:

- `storage.buckets` row:
  - `id`: `venue-media`
  - `name`: `venue-media`
  - `public`: `true`
  - `allowed_mime_types`: [`image/webp`]
  - `file_size_limit`: `358400`
- Matching `storage.objects` policies referencing `venue-media`:
  - Exactly one matching policy exists.
  - `policyname`: `venue media public read`
  - `cmd`: `SELECT`
  - `roles`: `anon`, `authenticated`
  - Predicate: `(bucket_id = 'venue-media'::text)`.
  - `with_check`: `null`, as expected for a SELECT-only policy.
- Browser write policy check:
  - No `anon` or `authenticated` `INSERT` policies for `venue-media`.
  - No `anon` or `authenticated` `UPDATE` policies for `venue-media`.
  - No `anon` or `authenticated` `DELETE` policies for `venue-media`.
  - No `anon` or `authenticated` `ALL` policies for `venue-media`.
- Object count:
  - `storage.objects` rows with `bucket_id = 'venue-media'`: `0`.
- Upload posture:
  - No object upload was performed during this protected validation lane.

### Final Storage State

Story 12.12 protected storage compatibility is now verified on production for the requested public-read/no-browser-write contract:

- Public-read `venue-media` bucket exists and is constrained to WebP with a `358400` byte bucket limit.
- Exactly one matching public read policy exists for `anon` and `authenticated` SELECT on `venue-media` objects.
- No browser write policies exist for `venue-media`.
- The bucket is empty; no validation objects were uploaded.

## Protected Final Closeout Evidence - 2026-08-17

Scope: final protected Epic 12 production verification after the geometry hash lookup and
persisted-read batching remediations. This addendum preserves the earlier attempts above and
records only the final verified state. No secrets, tokens, raw credentials, object bytes, or
provider payloads are recorded here.

### Geometry And Weather Protected Jobs

- PR #24 delivered the indexable caster-hash lookup fix in commit `f447907`; it merged as
  `061f8f928b9cb95595bbb2228bd561a7f5b41204`.
- Protected geometry workflow run `32036137520` completed successfully with `210/210`
  venue-date outputs.
- Protected weather workflow run `32036508651` completed successfully with exactly `168`
  snapshot rows.
- The protected visibility smoke established visible/hidden public behavior and restored the
  temporary visibility mutation after verification.
- The generated Supabase types match the protected visibility section exactly. A broader
  whole-file generated-types comparison still contains unrelated generator/schema drift, so
  this evidence is deliberately limited to the visibility contract and does not claim global
  byte-for-byte type-file parity.

### Persisted-Read Batching And Database State

- PR #25 replaced the list route's per-venue persisted-read fan-out with three batched database
  operations: one venue list read, one atomic geometry batch RPC, and one weather snapshot
  batch read. Its implementation commit is `0cb84ce84172f064a64ab06e1486734a5802e69e`;
  it merged to `main` as `a20aac8a4a333a00efa82f4d334eeed033037f46`.
- The protected Supabase project has the batch RPC migration applied under remote version
  `20260817143743`, name `read_current_venue_sun_geometry_batch`.
- Protected catalog verification confirmed the RPC is service-role-only, `STABLE`,
  `SECURITY DEFINER`, and configured with `search_path=pg_catalog,public`. Its exact
  current-date/current-hash query returned `42` valid rows; the database-side function plan
  completed in approximately `2.5 ms`.
- The earlier owner-compatible Storage retry remains valid: migration version
  `20260817111301` is applied; `venue-media` is public-read, WebP-only, capped at `358400`
  bytes, has exactly one `anon`/`authenticated` SELECT policy, has no browser write policy,
  and remained empty after validation.

### Main CI And Exact Production Deployment

- GitHub Actions run `32039760444` completed successfully against exact `main` SHA
  `a20aac8a4a333a00efa82f4d334eeed033037f46`. Build/test, Lighthouse, TypeScript,
  lint, production build, unit/component coverage, bundle/MapLibre checks, Playwright,
  touch-target checks, and desktop/mobile axe jobs all passed.
- Vercel production deployment `dpl_91a1VcSSJpa8JSGCnrvqXecSSAHi` is `READY` and
  promoted from exact SHA `a20aac8a4a333a00efa82f4d334eeed033037f46`.
- Production alias: `https://sunnyseat.vercel.app`.
- Deployment build URL: `https://sunnyseat-gx6h4d6a3-enhancior.vercel.app`.
- The deployment and every non-middleware Lambda, including `/api/venues`, are placed in
  Vercel region `dub1`, colocated with the Supabase `eu-west-1` project rather than the
  previous `iad1` function placement.
- A post-ready error scan extending beyond 60 seconds found no `/api/venues` runtime errors
  and no error/fatal logs for this exact deployment.

### Live Response Correctness And Performance

Every recorded live response assertion used the exact production deployment and SHA above.
The validator required HTTP 200, exactly `42` unique venue ids/slugs, exactly `61` quarter-hour
steps from minute `360` through `1260`, finite `0..100` exposure values, valid sun/gate enums,
`g1:` plus 64-hex geometry hashes, consistent weather source/timestamps, no coverage warning,
the expected cache class, and an ETag.

- Origin-miss dataset: `20/20` unique `_perf` requests returned `x-vercel-cache: MISS` and
  passed every correctness assertion. Client p95 was `2565.530 ms` time to first byte and
  `2672.727 ms` total. Identity transfer size was `360,358` bytes.
- Identity edge dataset: after one prime, `20/20` measured responses returned cache `HIT` and
  passed every correctness assertion. Client p95 was `169.377 ms` time to first byte and
  `267.938 ms` total; identity transfer size was `360,358` bytes.
- Browser-realistic edge dataset: after one prime, `20/20` Brotli responses returned cache
  `HIT` and passed every correctness assertion. Client p95 was `165.474 ms` time to first byte
  and `167.005 ms` total; compressed wire size was `12,609` bytes and decoded size was
  `360,358` bytes.
- The Brotli prime was an uncached `MISS`, transferred `12,650` bytes, and completed in
  `2813.336 ms`, also below the story's approximately five-second route threshold.

### Metrics Limitation At Time Of This Addendum

Vercel's provider-side function-invocation, request-cache, and external-dependency metric
rollups for the tagged probe window were not available when this section was written: the
metrics API returned `INTERNAL_ERROR` for invocation aggregation and `query_timeout` for the
request/external-API aggregations. Therefore:

- the `20` unique origin-miss measurements above are not mislabeled as `20` independently
  proven cold function starts;
- the merged source and local contract coverage establish the three-call route architecture,
  but this addendum does not claim a final live dependency-call count or live zero-provider
  count without the provider-side rollup; and
- a recovered metric rollup may be appended separately without rewriting this historical
  limitation.

The client-observed live dataset, exact-SHA deployment, protected database/job evidence, and
zero-error scan are complete and reproducible. The remaining limitation is evidence
classification/telemetry, not a failed live correctness or latency assertion.

### Independent Live SQL-Call Delta

Because the Vercel aggregate endpoint remained unavailable, a separate protected read-only
`pg_stat_statements` baseline/delta was taken around one unique, uncached production request
(`sunnyseat-e12-20260817-batch-sql-delta-001`) at `2026-08-17T15:09:31Z`. The response was
HTTP `200`, `x-vercel-cache: MISS`, `x-sun-data-source: weather`, and was served by the
`arn1::dub1` path.

- Public venue-list statement: calls `45 -> 46` (`+1`).
- `read_current_venue_sun_geometry_batch` RPC statement: calls `22 -> 23` (`+1`).
- Batched `weather_bucket_snapshots` statement: calls `22 -> 23` (`+1`).
- Both legacy per-venue `venue_geometry_inputs` statements stayed at `976` calls (`+0`).
- The legacy per-venue `venue_sun_geometry_series` statement stayed at `976` calls (`+0`).
- The legacy per-venue weather statement stayed at `976` calls (`+0`).
- `get_buildings_near_point` stayed at `5417` calls (`+0`) and
  `get_shadow_caster_hash_records` stayed at `71` calls (`+0`).

This independently proves an exact three-Supabase-statement live origin invocation and zero
database-observable legacy per-venue or shadow-provider RPC fan-out for that request. It does
not replace Vercel's unavailable function-start classification or external-network metric,
so the provider-telemetry limitation above remains accurate.

### Protected Storage Object Smoke

The earlier statements that no object was uploaded describe the migration-only verification
lanes above. They are superseded for dynamic validation by this bounded 2026-08-17 smoke,
which used generated, non-user WebP fixtures under the temporary prefix
`test-venue-sunny/ve12-probe-20260817-7950324b/` and then removed every object.

- The service-role-only maintainer tool created `card.webp` and `hero.webp` with immutable,
  create-only keys. Repeating the same upload failed with `Venue media version already
  exists`, proving duplicate-version refusal before overwrite.
- Anonymous public GET returned HTTP `200` and `image/webp` for both objects. `card.webp`
  was `90` bytes with matching local/remote SHA-256
  `4d516e77b6063ab1a819d00754dc15dc04d87ea8db56b385e781a1abc69dced4`;
  `hero.webp` was `114` bytes with matching SHA-256
  `1dd4ac1dc92619e23be375e94ef30eaf012686e82aa46bdeb6a853778d0744f6`.
- Anonymous `INSERT` and `UPDATE` both returned `403` with an RLS-policy denial. Anonymous
  `DELETE` returned zero deleted rows and the target remained present, proving the Storage
  API's non-leaking no-op behavior without a delete policy.
- A temporary authenticated user produced the same write boundary: `INSERT` and `UPDATE`
  returned `403`; `DELETE` returned zero rows and the object remained. The temporary auth
  user was deleted during the probe's `finally` cleanup.
- Service-role cleanup removed the two retained rendition objects (`removedRows: 2`). A
  protected SQL verification then returned `remaining_objects: 0` for the temporary prefix,
  and the generated local fixture directory was also removed.

This closes the dynamic Story 12.12 service-write/public-read/browser-write-denial/cleanup
contract without leaving user media, temporary users, or validation objects in production.

### Provider Telemetry Recovery

After the legacy `vercel metrics` aggregate queries above continued to time out, the official
Vercel request-log backend and canonical `/metrics/v1` external-request endpoint produced the
following exact tagged-window evidence for deployment
`dpl_91a1VcSSJpa8JSGCnrvqXecSSAHi`:

- All `41/41` tagged requests had unique user agents and HTTP `200`: `21` cache `MISS` and
  `20` cache `HIT`, all entering through edge region `arn1`.
- The `21` `/api/venues` function invocations were all HTTP `200` in `dub1`: `3` classified
  `cold`, `1` `prewarmed`, and `17` `hot`. The origin-only subset was `3` cold, `1`
  prewarmed, and `16` hot; the edge-cache prime was the remaining hot invocation.
- Vercel function-duration p95 was `1,827 ms` for the three classified cold invocations,
  `575 ms` for hot-origin invocations, `2,146 ms` for the one prewarmed invocation, and
  `1,827 ms` across all `21` invocations. Vercel internal request-duration p95 was
  `2,358 ms` for the `20` measured origin misses and `56 ms` for the `20` measured hits.
- The canonical external-request metric counted exactly `63` outbound calls. Every call was
  HTTP `200` to `hhnbxrhfhlzxgllxukzj.supabase.co`, originated from `/api/venues`, and ran
  from `dub1`; no other external hostname appeared.

The canonical external metric does not expose destination path or deployment ID as grouping
dimensions. Therefore the exact `21 x 3` endpoint split is an explicit inference, not a
provider-emitted path breakdown. It is corroborated by the deployed unconditional three-read
code path, the Supabase API-log sample containing only `/rest/v1/venues`,
`/rest/v1/rpc/read_current_venue_sun_geometry_batch`, and
`/rest/v1/weather_bucket_snapshots`, plus the exact single-request SQL delta above.

This recovery supersedes only the earlier statement that no provider telemetry was available.
The strict `20` classified-cold sample was not achieved: only `3` invocations were cold, so a
gate requiring `n=20` true cold starts remains honestly under-sampled even though every
observed cold invocation and the full origin-miss dataset met the latency threshold.
