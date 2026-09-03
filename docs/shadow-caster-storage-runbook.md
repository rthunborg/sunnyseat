# Shadow-caster storage runbook

## Purpose

Keep the complete shadow-caster dataset while preventing batch provenance and full-replacement imports from consuming excessive Supabase database storage.

The normalized contract is introduced by `supabase/migrations/20260903103516_normalize_shadow_caster_provenance.sql`:

- `shadow_casters.source_object_metadata` contains object-specific attributes only.
- `shadow_caster_import_batches` owns collection, update, provenance, Z-semantics, and shared source-object metadata.
- `get_buildings_near_point` returns lean object metadata and no batch provenance.
- `get_shadow_caster_hash_records` reconstructs the legacy payload for a safe deployment transition.
- `get_shadow_caster_hash_records_v2` exposes only runtime-affecting fields and is the application contract going forward.

## Production remediation record

On 2026-09-03, project `hhnbxrhfhlzxgllxukzj` was normalized and compacted:

| Measurement | Before | After |
| --- | ---: | ---: |
| Entire database | 1,018 MB | 281 MB |
| `shadow_casters` total | 849 MB | 112 MB |
| Table heap | 194 MB | 91 MB |
| TOAST | 621 MB | 2.9 MB |
| Caster indexes | 33 MB | 17 MB |

Postflight retained 58,731 rows and 58,731 distinct `source_footprint_fid` values. The legacy RPC sample at `(57.7089, 11.9746)`, radius 1,500 m retained 2,460 rows and fingerprint `bcd4be431edd2b9e627908cafb373837`.

## Import procedure

1. Generate and validate the artifacts described in `scripts/geodata/README.md`.
2. Confirm the manifest has one complete batch-provenance object and caster JSONL rows contain only object-specific metadata.
3. Run the generated handoff SQL with an approved connection string.
4. Commit the replacement import before any physical compaction. Do not combine a full delete, reinsert, and `VACUUM FULL` in one transaction.
5. Run the post-import checks below.
6. If database size remains unexpectedly high, schedule `VACUUM (FULL, ANALYZE) public.shadow_casters` as one top-level statement during a maintenance window. It takes an exclusive table lock and must not be placed in a transactional migration.

## Post-import checks

```sql
select
  count(*) as caster_count,
  count(distinct source_footprint_fid) as distinct_footprints
from public.shadow_casters;

select
  pg_size_pretty(pg_database_size(current_database())) as database_size,
  pg_size_pretty(pg_total_relation_size('public.shadow_casters')) as caster_total,
  pg_size_pretty(pg_relation_size('public.shadow_casters')) as caster_heap,
  pg_size_pretty(pg_indexes_size('public.shadow_casters')) as caster_indexes;

select import_batch_id, count(*)
from public.shadow_casters
group by import_batch_id
order by import_batch_id;
```

For the central compatibility sample:

```sql
with records as (
  select *
  from public.get_shadow_caster_hash_records(57.7089, 11.9746, 1500)
)
select
  count(*) as row_count,
  md5(coalesce(string_agg(md5(to_jsonb(records)::text), '' order by id), ''))
    as fingerprint
from records;
```

The fingerprint is a regression signal for a fixed dataset, not a permanent constant. Record a new expected value whenever an intentional import changes runtime-affecting data.

## Operational thresholds

- Investigate when `shadow_casters` grows by more than 25% without a corresponding increase in caster count or geometry complexity.
- Investigate when TOAST becomes larger than the heap; normalized object metadata should keep TOAST comparatively small.
- Consider a physical rewrite after a full replacement if database storage remains above the plan limit or the table remains substantially larger than its live payload.
- Review index usage over a representative runtime and maintenance period before dropping indexes. A counter of zero after a statistics reset is not sufficient evidence.

## Rollback and compatibility

Do not restore repeated batch metadata to every caster as a rollback. During the transition, the legacy hash RPC reconstructs its original shape from the batch row, so the previously deployed application remains compatible. If the lean application contract must be rolled back, point application code back to `get_shadow_caster_hash_records`; retain the normalized tables.

If a migration or compaction command times out at the client, inspect `pg_stat_activity` and migration history before retrying. The server operation may still be running. Never launch a duplicate rewrite blindly.
